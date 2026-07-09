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
  /**
   * @deprecated Use personId. Kept as a compatibility alias while older
   * routers are moved off the former Profile model.
   */
  profileId: string | null;
  personId: string | null;
  personIds: string[];
  accessToken: string | null;
  headers: Headers;
}

async function findCanonicalPersonByEmail(email: string | null) {
  if (!email) return null;

  const people = await prisma.person.findMany({
    where: { email },
    select: { id: true },
    take: 2,
  });

  return people.length === 1 ? people[0]! : null;
}

/**
 * Creates the tRPC context for each request.
 * Looks up the Person record by PCO remoteId from session.
 */
export const createTRPCContext = cache(
  async (opts?: { headers?: Headers }): Promise<TRPCContext> => {
    const session = await auth();

    let personId: string | null = null;

    if (session?.user?.auth0Id) {
      const authAccount = await prisma.authAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "auth0",
            providerAccountId: session.user.auth0Id,
          },
        },
        select: {
          personId: true,
        },
      });

      if (authAccount) {
        personId = authAccount.personId;
      } else {
        const email = session.user.email ?? null;
        const person = await findCanonicalPersonByEmail(email);

        if (person) {
          await prisma.authAccount.create({
            data: {
              personId: person.id,
              provider: "auth0",
              providerAccountId: session.user.auth0Id,
              email,
            },
          });
          personId = person.id;
        }
      }
    }

    return {
      session,
      profileId: personId,
      personId,
      personIds: personId ? [personId] : [],
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
        message: "Person record not found.",
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
