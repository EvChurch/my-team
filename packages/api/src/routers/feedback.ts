import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, leaderProcedure } from "../init";
import { prisma } from "../db";
import {
  getProfileDisplayMap,
  profileDisplaySelect,
} from "../lib/display-identity";
import { feedbackRecipientVisibilityWhere } from "./feedback-visibility";

const feedbackTypeEnum = z.enum(["ENCOURAGEMENT", "GROWTH_AREA", "GENERAL"]);

async function resolveRecipientPersonId(recipientId: string) {
  const person = await prisma.person.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });
  if (!person) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please select a valid team member.",
    });
  }

  return person.id;
}

export const feedbackRouter = createTRPCRouter({
  /**
   * List feedback. Leaders can see all feedback; members can only see feedback
   * explicitly shared with them.
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
      const isLeader = await prisma.leader.findFirst({
        where: {
          personId: { in: ctx.personIds },
          teamId: input.teamId,
        },
      });

      const feedback = await prisma.feedback.findMany({
        where: {
          teamId: input.teamId,
          ...(input.recipientId && { recipientId: input.recipientId }),
          ...feedbackRecipientVisibilityWhere({
            isLeader: Boolean(isLeader),
            profileId: ctx.profileId,
          }),
        },
        include: {
          author: {
            select: profileDisplaySelect,
          },
          recipient: {
            select: profileDisplaySelect,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const profileDisplayMap = await getProfileDisplayMap(
        [
          ...feedback.map((item) => item.author),
          ...feedback.map((item) => item.recipient),
        ].filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile),
        ),
      );

      return feedback.map((item) => ({
        ...item,
        author: item.author
          ? (profileDisplayMap.get(item.author.id) ?? item.author)
          : null,
        recipient: item.recipient
          ? (profileDisplayMap.get(item.recipient.id) ?? item.recipient)
          : null,
      }));
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
      const recipientPersonId = await resolveRecipientPersonId(
        input.recipientId,
      );

      return prisma.feedback.create({
        data: {
          content: input.content,
          type: input.type,
          authorId: ctx.profileId,
          recipientId: recipientPersonId,
          teamId: input.teamId,
          isShared: input.isShared,
        },
      });
    }),
});
