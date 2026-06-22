import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";
import { pcoBasicAuth } from "../lib/pco";

const PCO_API = "https://api.planningcenteronline.com";

async function fetchPCOWithServiceCredentials(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<Response> {
  const body = options?.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(`${PCO_API}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Basic ${pcoBasicAuth()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
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
        personId: { in: ctx.personIds },
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
      // Look up the schedule, verify ownership, and get person's PCO remote ID
      const schedule = await prisma.schedule.findUnique({
        where: { id: input.scheduleId },
      });

      if (!schedule || !ctx.personIds.includes(schedule.personId)) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (schedule.provider !== "PCO") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Responding to Rock schedules is not supported yet.",
        });
      }

      const person = await prisma.person.findUnique({
        where: { id: schedule.personId },
        select: { remoteId: true },
      });

      if (!person?.remoteId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Person record is missing PCO remote ID.",
        });
      }

      // Build the PCO API path using the people/schedules endpoint
      const personRemoteId = person.remoteId;
      const scheduleRemoteId = schedule.remoteId;
      const pcoPath = `/services/v2/people/${personRemoteId}/schedules/${scheduleRemoteId}`;

      // Call PCO API
      try {
        if (input.action === "accept") {
          await fetchPCOWithServiceCredentials(`${pcoPath}/accept`, {
            method: "POST",
          });
        } else {
          await fetchPCOWithServiceCredentials(`${pcoPath}/decline`, {
            method: "POST",
            body: {
              data: {
                type: "Schedule",
                attributes: { decline_reason: input.reason ?? "" },
              },
            },
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
              "PCO service credentials could not respond to this schedule.",
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
