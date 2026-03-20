import { z } from "zod";
import { createTRPCRouter, protectedProcedure, leaderProcedure } from "../init";
import { prisma } from "../db";

const feedbackTypeEnum = z.enum(["ENCOURAGEMENT", "GROWTH_AREA", "GENERAL"]);

export const feedbackRouter = createTRPCRouter({
  /**
   * List feedback. Non-leaders can only see shared feedback.
   * Filter by teamId, recipientId.
   */
  list: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        recipientId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check if user is a leader for this team
      const isLeader = await prisma.leader.findUnique({
        where: {
          personId_teamId: {
            personId: ctx.personId,
            teamId: input.teamId,
          },
        },
      });

      return prisma.feedback.findMany({
        where: {
          teamId: input.teamId,
          ...(input.recipientId && { recipientId: input.recipientId }),
          // Non-leaders can only see shared feedback or feedback they received
          ...(!isLeader && {
            OR: [{ isShared: true }, { recipientId: ctx.personId }],
          }),
        },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              firstName: true,
              image: true,
            },
          },
          recipient: {
            select: {
              id: true,
              fullName: true,
              firstName: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Create feedback for a team member (leader only).
   */
  create: leaderProcedure
    .input(
      z.object({
        content: z.string().min(1),
        type: feedbackTypeEnum,
        recipientId: z.string(),
        isShared: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.feedback.create({
        data: {
          content: input.content,
          type: input.type,
          authorId: ctx.personId,
          recipientId: input.recipientId,
          teamId: input.teamId,
          isShared: input.isShared,
        },
      });
    }),
});
