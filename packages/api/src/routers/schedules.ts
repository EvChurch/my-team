import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";

const PCO_API = "https://api.planningcenteronline.com";

async function fetchPCOAsUser(
  path: string,
  accessToken: string,
  options?: { method?: string; body?: unknown },
): Promise<Response> {
  const res = await fetch(`${PCO_API}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PCO API ${res.status}: ${text}`);
  }
  return res;
}

export const schedulesRouter = createTRPCRouter({
  /**
   * Get all upcoming schedules for the current user across all teams.
   * Includes team name and plan times for each schedule.
   */
  upcoming: protectedProcedure.query(async ({ ctx }) => {
    return prisma.schedule.findMany({
      where: {
        personId: ctx.personId,
        sortDate: { gte: new Date() },
      },
      include: {
        team: { select: { id: true, name: true } },
        planTimes: {
          orderBy: { startsAt: "asc" },
          select: {
            id: true,
            name: true,
            timeType: true,
            startsAt: true,
            endsAt: true,
          },
        },
      },
      orderBy: { sortDate: "asc" },
    });
  }),

  /**
   * Accept or decline a schedule via the PCO API.
   * Updates local record optimistically after PCO confirms.
   */
  respond: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        action: z.enum(["accept", "decline"]),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "PCO access token not available. Please sign out and sign back in.",
        });
      }

      // Look up the schedule and verify ownership
      const schedule = await prisma.schedule.findUnique({
        where: { id: input.scheduleId },
        include: {
          team: {
            select: {
              serviceTypeId: true,
              serviceType: { select: { remoteId: true } },
            },
          },
        },
      });

      if (!schedule || schedule.personId !== ctx.personId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!schedule.team.serviceType?.remoteId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Schedule is missing service type information.",
        });
      }

      // Build the PCO API path
      const serviceTypeId = schedule.team.serviceType.remoteId;
      const planId = schedule.planRemoteId;
      const teamMemberId = schedule.remoteId;
      const pcoPath = `/services/v2/service_types/${serviceTypeId}/plans/${planId}/team_members/${teamMemberId}`;

      // Call PCO API
      try {
        if (input.action === "accept") {
          await fetchPCOAsUser(`${pcoPath}/accept`, ctx.accessToken, {
            method: "POST",
          });
        } else {
          await fetchPCOAsUser(`${pcoPath}/decline`, ctx.accessToken, {
            method: "POST",
            body: input.reason
              ? { data: { attributes: { reason: input.reason } } }
              : undefined,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `PCO respond failed: action=${input.action} path=${pcoPath} error=${message}`,
        );

        // Surface PCO auth errors as UNAUTHORIZED so the client can prompt re-login
        if (message.includes("401") || message.includes("403")) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "PCO access token expired. Please sign out and sign back in.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to ${input.action} schedule: ${message}`,
        });
      }

      // Update local record
      const newStatus =
        input.action === "accept" ? "CONFIRMED" : ("DECLINED" as const);
      return prisma.schedule.update({
        where: { id: input.scheduleId },
        data: { status: newStatus },
      });
    }),
});
