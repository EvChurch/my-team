import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { cache } from "react";
import type { Session } from "next-auth";
import { auth } from "@mt/auth";
import { prisma } from "./db";
import { findRockLoginPerson, RockLoginUnavailable } from "./lib/rock-login";

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
  identityError?: "unlinked" | "unavailable" | null;
  headers: Headers;
}

/**
 * Creates the tRPC context for each request.
 * Every request requires the live Auth0-to-Rock association and an active synced Rock source.
 */
export const createTRPCContext = cache(
  async (opts?: { headers?: Headers }): Promise<TRPCContext> => {
    const session = await auth();

    let personId: string | null = null;

    let identityError: TRPCContext["identityError"] = null;
    if (session?.user?.auth0Id) {
      const auth0Id = session.user.auth0Id;
      try {
        const remoteId = await findRockLoginPerson(auth0Id);
        if (remoteId) {
          personId = await prisma.$transaction(async (tx) => {
            // Share the sync lock so source ownership cannot change mid-verification.
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(724193821)::text`;
            const source = await tx.sourcePerson.findUnique({
              where: { provider_remoteId: { provider: "ROCK", remoteId } },
              include: { person: { include: { sourcePeople: {
                where: { provider: "ROCK", isActive: true }, select: { remoteId: true },
              } } } },
            });
            if (!source?.isActive || !source.person.isActive || source.person.sourcePeople.length !== 1) return null;
            // PCO sources are optional and do not establish login ownership.
            const existing = await tx.authAccount.findUnique({
              where: { provider_providerAccountId: { provider: "auth0", providerAccountId: auth0Id } },
              select: { personId: true },
            });
            if (existing) return existing.personId === source.personId ? source.personId : null;
            const account = await tx.authAccount.upsert({
              where: { provider_providerAccountId: { provider: "auth0", providerAccountId: auth0Id } },
              update: {},
              create: { personId: source.personId, provider: "auth0", providerAccountId: auth0Id, email: session.user.email ?? null },
            });
            return account.personId === source.personId ? source.personId : null;
          });
        }
        if (!personId) identityError = "unlinked";
      } catch (error) {
        if (!(error instanceof RockLoginUnavailable)) throw error;
        identityError = "unavailable";
      }
    }

    return {
      session,
      identityError,
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
