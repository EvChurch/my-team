import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { cache } from "react";
import type { Session } from "next-auth";
import { auth } from "@repo/auth";
import { prisma } from "./db.js";

/**
 * Context available to all tRPC procedures.
 */
export interface TRPCContext {
  session: Session | null;
  personId: string | null;
  headers: Headers;
}

/**
 * Creates the tRPC context for each request.
 * Looks up the Person record by PCO remoteId from session.
 */
export const createTRPCContext = cache(
  async (opts?: { headers?: Headers }): Promise<TRPCContext> => {
    const session = await auth();

    let personId: string | null = null;
    if (session?.user?.pcoId) {
      const person = await prisma.person.findUnique({
        where: {
          remoteId_provider: {
            remoteId: session.user.pcoId,
            provider: "PCO",
          },
        },
        select: { id: true },
      });
      personId = person?.id ?? null;
    }

    return {
      session,
      personId,
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
    if (!ctx.personId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Person record not found. PCO sync may be pending.",
      });
    }
    return opts.next({
      ctx: {
        session: ctx.session,
        personId: ctx.personId,
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
    const leader = await prisma.leader.findUnique({
      where: {
        personId_teamId: {
          personId: ctx.personId,
          teamId: input.teamId,
        },
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
