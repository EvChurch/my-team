import { z } from "zod";
import { createTRPCRouter, protectedProcedure, leaderProcedure } from "../init";
import { prisma } from "../db";

const guideCategoryEnum = z.enum(["QUICK_START", "TROUBLESHOOTING", "SOP"]);

export const guidesRouter = createTRPCRouter({
  /**
   * List guides. Respects isVisibleToTeam for non-leaders.
   * Filter by teamId, roleId, category.
   */
  list: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        roleId: z.string().optional(),
        category: guideCategoryEnum.optional(),
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

      return prisma.guide.findMany({
        where: {
          teamId: input.teamId,
          ...(input.roleId && { roleId: input.roleId }),
          ...(input.category && { category: input.category }),
          // Non-leaders only see visible + published guides
          ...(!isLeader && {
            isVisibleToTeam: true,
            status: "PUBLISHED",
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
          role: { select: { id: true, name: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      });
    }),

  /**
   * Get a single guide with full content.
   */
  get: protectedProcedure
    .input(z.object({ guideId: z.string() }))
    .query(async ({ input }) => {
      return prisma.guide.findUniqueOrThrow({
        where: { id: input.guideId },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              firstName: true,
              image: true,
            },
          },
          team: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
        },
      });
    }),

  /**
   * Create a guide (leader only).
   */
  create: leaderProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.any(), // JSON (Tiptap document)
        category: guideCategoryEnum,
        roleId: z.string().optional(),
        isVisibleToTeam: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.guide.create({
        data: {
          title: input.title,
          content: input.content,
          category: input.category,
          status: "DRAFT",
          authorId: ctx.personId,
          teamId: input.teamId,
          roleId: input.roleId,
          isVisibleToTeam: input.isVisibleToTeam,
        },
      });
    }),

  /**
   * Update a guide (leader only).
   */
  update: leaderProcedure
    .input(
      z.object({
        guideId: z.string(),
        title: z.string().min(1).max(255).optional(),
        content: z.any().optional(), // JSON (Tiptap document)
        category: guideCategoryEnum.optional(),
        roleId: z.string().nullable().optional(),
        isVisibleToTeam: z.boolean().optional(),
        isPinned: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { guideId, teamId: _teamId, ...data } = input;
      return prisma.guide.update({
        where: { id: guideId },
        data,
      });
    }),

  /**
   * Publish a guide (leader only).
   */
  publish: leaderProcedure
    .input(z.object({ guideId: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.guide.update({
        where: { id: input.guideId },
        data: { status: "PUBLISHED" },
      });
    }),

  /**
   * Delete a guide (leader only).
   */
  delete: leaderProcedure
    .input(z.object({ guideId: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.guide.delete({
        where: { id: input.guideId },
      });
    }),
});
