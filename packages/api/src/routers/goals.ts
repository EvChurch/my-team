import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  leaderProcedure,
} from "../init";
import { prisma } from "../db";
import {
  getProfileDisplayMap,
  profileDisplaySelect,
} from "../lib/display-identity";

const goalStatusEnum = z.enum(["PENDING", "APPROVED", "DECLINED", "COMPLETED"]);

export const goalsRouter = createTRPCRouter({
  /**
   * List goals, filterable by teamId, personId, status.
   */
  list: protectedProcedure
    .input(
      z.object({
        teamId: z.string().optional(),
        personId: z.string().optional(),
        status: goalStatusEnum.optional(),
      }),
    )
    .query(async ({ input }) => {
      const goals = await prisma.goal.findMany({
        where: {
          ...(input.teamId && { teamId: input.teamId }),
          ...(input.personId && { personId: input.personId }),
          ...(input.status && { status: input.status }),
        },
        include: {
          person: {
            select: profileDisplaySelect,
          },
          team: { select: { id: true, name: true } },
          reviewer: {
            select: profileDisplaySelect,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const profileDisplayMap = await getProfileDisplayMap(
        [
          ...goals.map((goal) => goal.person),
          ...goals.map((goal) => goal.reviewer),
        ].filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile),
        ),
      );

      return goals.map((goal) => ({
        ...goal,
        person: goal.person
          ? (profileDisplayMap.get(goal.person.id) ?? goal.person)
          : null,
        reviewer: goal.reviewer
          ? (profileDisplayMap.get(goal.reviewer.id) ?? goal.reviewer)
          : null,
      }));
    }),

  /**
   * Pending goals for a team (leader only).
   */
  pending: leaderProcedure.query(async ({ input }) => {
    const goals = await prisma.goal.findMany({
      where: {
        teamId: input.teamId,
        status: "PENDING",
      },
      include: {
        person: {
          select: profileDisplaySelect,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const profileDisplayMap = await getProfileDisplayMap(
      goals
        .map((goal) => goal.person)
        .filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile),
        ),
    );

    return goals.map((goal) => ({
      ...goal,
      person: goal.person
        ? (profileDisplayMap.get(goal.person.id) ?? goal.person)
        : null,
    }));
  }),

  /**
   * Create a goal with PENDING status.
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        dueDate: z.date().optional(),
        teamId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.goal.create({
        data: {
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          status: "PENDING",
          progress: 0,
          personId: ctx.profileId,
          teamId: input.teamId,
        },
      });
    }),

  /**
   * Approve or decline a goal (leader only).
   */
  updateStatus: leaderProcedure
    .input(
      z.object({
        goalId: z.string(),
        status: z.enum(["APPROVED", "DECLINED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.goal.update({
        where: { id: input.goalId },
        data: {
          status: input.status,
          reviewedBy: ctx.profileId,
        },
      });
    }),

  /**
   * Update goal progress (owner only).
   */
  updateProgress: protectedProcedure
    .input(
      z.object({
        goalId: z.string(),
        progress: z.number().int().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const goal = await prisma.goal.findUniqueOrThrow({
        where: { id: input.goalId },
      });

      if (goal.personId !== ctx.profileId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the goal owner can update progress.",
        });
      }

      const data: { progress: number; status?: "COMPLETED" } = {
        progress: input.progress,
      };
      if (input.progress === 100) {
        data.status = "COMPLETED";
      }

      return prisma.goal.update({
        where: { id: input.goalId },
        data,
      });
    }),
});
