import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { cache } from "react";
import type { Session } from "next-auth";
import { auth } from "@mt/auth";
import { prisma } from "./db";

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "My Team", lastName: "User" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Context available to all tRPC procedures.
 */
export interface TRPCContext {
  session: Session | null;
  profileId: string | null;
  personId: string | null;
  personIds: string[];
  accessToken: string | null;
  headers: Headers;
}

async function linkPeopleByEmail(profileId: string, email: string | null) {
  if (!email) return [];

  const people = await prisma.person.findMany({
    where: { email },
    select: { id: true, provider: true, remoteId: true, email: true },
  });

  for (const person of people) {
    await prisma.profileIdentity.upsert({
      where: {
        provider_remoteId: {
          provider: person.provider,
          remoteId: person.remoteId,
        },
      },
      create: {
        profileId,
        personId: person.id,
        provider: person.provider,
        remoteId: person.remoteId,
        email: person.email,
      },
      update: {
        profileId,
        personId: person.id,
        email: person.email,
      },
    });
  }

  return people;
}

/**
 * Creates the tRPC context for each request.
 * Looks up the Person record by PCO remoteId from session.
 */
export const createTRPCContext = cache(
  async (opts?: { headers?: Headers }): Promise<TRPCContext> => {
    const session = await auth();

    let profileId: string | null = null;
    let personId: string | null = null;
    let personIds: string[] = [];

    if (session?.user?.auth0Id) {
      const authAccount = await prisma.authAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "auth0",
            providerAccountId: session.user.auth0Id,
          },
        },
        select: {
          profileId: true,
          profile: {
            select: {
              identities: {
                select: { personId: true },
              },
            },
          },
        },
      });

      if (authAccount) {
        profileId = authAccount.profileId;
        await linkPeopleByEmail(profileId, session.user.email ?? null);
        const identities = await prisma.profileIdentity.findMany({
          where: { profileId, personId: { not: null } },
          select: { personId: true },
        });
        personIds = identities
          .map((identity) => identity.personId)
          .filter((id): id is string => Boolean(id));
        personId = personIds[0] ?? null;
      } else {
        const email = session.user.email ?? null;
        const people = email
          ? await prisma.person.findMany({
              where: { email },
              select: { id: true, provider: true, remoteId: true, email: true },
            })
          : [];

        const displayName =
          session.user.name ?? session.user.email ?? "My Team User";
        const { firstName, lastName } = splitName(displayName);

        const profile = await prisma.profile.create({
          data: {
            displayName,
            fullName: displayName,
            firstName,
            lastName,
            email,
            image: session.user.image ?? null,
            authAccounts: {
              create: {
                provider: "auth0",
                providerAccountId: session.user.auth0Id,
                email,
              },
            },
            identities: people.length
              ? {
                  create: people.map((person) => ({
                    provider: person.provider,
                    remoteId: person.remoteId,
                    personId: person.id,
                    email: person.email,
                  })),
                }
              : undefined,
          },
          select: { id: true },
        });

        profileId = profile.id;
        personIds = people.map((person) => person.id);
        personId = personIds[0] ?? null;
      }
    }

    return {
      session,
      profileId,
      personId,
      personIds,
      accessToken: null,
      headers: opts?.headers ?? new Headers(),
    };
  },
);

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (base) procedure — no auth required.
 */
export const baseProcedure = t.procedure;

/**
 * Protected procedure — requires authenticated session.
 */
export const protectedProcedure = t.procedure.use(
  async function isAuthed(opts) {
    const { ctx } = opts;
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (!ctx.profileId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Profile record not found.",
      });
    }
    return opts.next({
      ctx: {
        session: ctx.session,
        profileId: ctx.profileId,
        personId: ctx.personId ?? "",
        personIds: ctx.personIds,
        accessToken: ctx.accessToken,
      },
    });
  },
);

/**
 * Leader procedure — requires authenticated session + leader status for the given team.
 * Input must include `teamId`.
 */
export const leaderProcedure = protectedProcedure
  .input(z.object({ teamId: z.string() }))
  .use(async function isLeader(opts) {
    const { ctx, input } = opts;
    if (ctx.personIds.length === 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No linked PCO/Rock person record was found for this profile.",
      });
    }
    const leader = await prisma.leader.findFirst({
      where: {
        teamId: input.teamId,
        personId: { in: ctx.personIds },
      },
    });
    if (!leader) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a team leader to perform this action.",
      });
    }
    return opts.next({
      ctx: {
        ...ctx,
        leaderId: leader.id,
      },
    });
  });
