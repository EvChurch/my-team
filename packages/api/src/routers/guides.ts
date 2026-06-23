import { z } from "zod";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, leaderProcedure } from "../init";
import { prisma } from "../db";
import {
  getProfileDisplayMap,
  profileDisplaySelect,
} from "../lib/display-identity";
import { createPresignedGuideAssetUpload } from "../lib/storage";

const guideCategoryEnum = z.enum(["QUICK_START", "TROUBLESHOOTING", "SOP"]);
const imageContentTypeEnum = z.enum([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const guideAssetContentTypeEnum = z.enum([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maxGuideImageBytes = 10 * 1024 * 1024;
const maxGuideFileBytes = 25 * 1024 * 1024;

function extensionForContentType(
  contentType: z.infer<typeof guideAssetContentTypeEnum>,
) {
  switch (contentType) {
    case "application/pdf":
      return "pdf";
    case "image/gif":
      return "gif";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

export const guidesRouter = createTRPCRouter({
  /**
   * List all guides across teams the user belongs to.
   * Used by the /guides page.
   */
  listAll: protectedProcedure.query(async ({ ctx }) => {
    // Find all team IDs where user is assigned or is a leader
    const [assignments, leaderships] = await Promise.all([
      prisma.assignment.findMany({
        where: { personId: { in: ctx.personIds } },
        select: { position: { select: { teamId: true } } },
      }),
      prisma.leader.findMany({
        where: { personId: { in: ctx.personIds } },
        select: { teamId: true },
      }),
    ]);

    const leaderTeamIds = new Set(leaderships.map((l) => l.teamId));
    const allTeamIds = [
      ...new Set([
        ...assignments.map((a) => a.position.teamId),
        ...leaderTeamIds,
      ]),
    ];

    if (allTeamIds.length === 0) return [];

    const guides = await prisma.guide.findMany({
      where: {
        teamId: { in: allTeamIds },
        OR: [
          // Leaders see all guides for their teams
          { teamId: { in: [...leaderTeamIds] } },
          // Non-leader teams: only visible + published
          {
            isVisibleToTeam: true,
            status: "PUBLISHED",
          },
        ],
      },
      include: {
        author: {
          select: profileDisplaySelect,
        },
        team: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    const profileDisplayMap = await getProfileDisplayMap(
      guides
        .map((guide) => guide.author)
        .filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile),
        ),
    );

    return guides.map((guide) => ({
      ...guide,
      author: guide.author
        ? (profileDisplayMap.get(guide.author.id) ?? guide.author)
        : null,
    }));
  }),

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
      const isLeader = await prisma.leader.findFirst({
        where: {
          personId: { in: ctx.personIds },
          teamId: input.teamId,
        },
      });

      const guides = await prisma.guide.findMany({
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
            select: profileDisplaySelect,
          },
          role: { select: { id: true, name: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      });

      const profileDisplayMap = await getProfileDisplayMap(
        guides
          .map((guide) => guide.author)
          .filter((profile): profile is NonNullable<typeof profile> =>
            Boolean(profile),
          ),
      );

      return guides.map((guide) => ({
        ...guide,
        author: guide.author
          ? (profileDisplayMap.get(guide.author.id) ?? guide.author)
          : null,
      }));
    }),

  /**
   * Get a single guide with full content.
   */
  get: protectedProcedure
    .input(z.object({ guideId: z.string() }))
    .query(async ({ input }) => {
      const guide = await prisma.guide.findUniqueOrThrow({
        where: { id: input.guideId },
        include: {
          author: {
            select: profileDisplaySelect,
          },
          team: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
        },
      });

      const profileDisplayMap = await getProfileDisplayMap(
        guide.author ? [guide.author] : [],
      );

      return {
        ...guide,
        author: guide.author
          ? (profileDisplayMap.get(guide.author.id) ?? guide.author)
          : null,
      };
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
      return prisma.$transaction(async (tx) => {
        await tx.guide.updateMany({
          where: { teamId: input.teamId, sectionId: null },
          data: { sortOrder: { increment: 1 } },
        });

        return tx.guide.create({
          data: {
            title: input.title,
            content: input.content,
            category: input.category,
            status: "PUBLISHED",
            authorId: ctx.profileId,
            teamId: input.teamId,
            roleId: input.roleId,
            sectionId: null,
            sortOrder: 0,
            isVisibleToTeam: input.isVisibleToTeam,
          },
        });
      });
    }),

  /**
   * Create a short-lived S3-compatible upload URL for a guide image.
   */
  createAssetUpload: leaderProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        contentType: guideAssetContentTypeEnum,
        contentLength: z.number().int().positive().max(maxGuideFileBytes),
      }),
    )
    .mutation(async ({ input }) => {
      const extension = extensionForContentType(input.contentType);
      const assetType = imageContentTypeEnum.safeParse(input.contentType).success
        ? "images"
        : "files";
      const key = `guides/${input.teamId}/${assetType}/${randomUUID()}.${extension}`;

      try {
        return await createPresignedGuideAssetUpload({
          key,
          contentType: input.contentType,
          contentLength: input.contentLength,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create image upload URL.",
        });
      }
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
        data: { ...data, status: "PUBLISHED" },
      });
    }),

  createSection: leaderProcedure
    .input(
      z.object({
        title: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ input }) => {
      const lastSection = await prisma.guideSection.findFirst({
        where: { teamId: input.teamId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      return prisma.guideSection.create({
        data: {
          teamId: input.teamId,
          title: input.title.trim(),
          sortOrder: (lastSection?.sortOrder ?? -1) + 1,
        },
      });
    }),

  updateSection: leaderProcedure
    .input(
      z.object({
        sectionId: z.string(),
        title: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.guideSection.updateMany({
        where: { id: input.sectionId, teamId: input.teamId },
        data: { title: input.title.trim() },
      });
    }),

  deleteSection: leaderProcedure
    .input(z.object({ sectionId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.$transaction(async (tx) => {
        const sections = await tx.guideSection.findMany({
          where: { teamId: input.teamId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        const sectionIndex = sections.findIndex(
          (section) => section.id === input.sectionId,
        );
        if (sectionIndex < 0) return;

        const targetSectionId =
          sectionIndex > 0 ? sections[sectionIndex - 1]?.id : null;

        const [targetGuides, deletedSectionGuides] = await Promise.all([
          tx.guide.findMany({
            where: { teamId: input.teamId, sectionId: targetSectionId },
            orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
            select: { id: true },
          }),
          tx.guide.findMany({
            where: { teamId: input.teamId, sectionId: input.sectionId },
            orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
            select: { id: true },
          }),
        ]);

        const nextGuides = [...targetGuides, ...deletedSectionGuides];
        await Promise.all([
          ...nextGuides.map((guide, sortOrder) =>
            tx.guide.updateMany({
              where: { id: guide.id, teamId: input.teamId },
              data: { sectionId: targetSectionId, sortOrder },
            }),
          ),
          tx.guideSection.deleteMany({
            where: { id: input.sectionId, teamId: input.teamId },
          }),
        ]);
      });

      return { ok: true };
    }),

  updateSectionOrder: leaderProcedure
    .input(
      z.object({
        sections: z.array(
          z.object({
            sectionId: z.string(),
            sortOrder: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      await prisma.$transaction(
        input.sections.map((section) =>
          prisma.guideSection.updateMany({
            where: { id: section.sectionId, teamId: input.teamId },
            data: { sortOrder: section.sortOrder },
          }),
        ),
      );

      return { ok: true };
    }),

  updateOrder: leaderProcedure
    .input(
      z.object({
        guides: z.array(
          z.object({
            guideId: z.string(),
            sectionId: z.string().nullable(),
            sortOrder: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const sectionIds = [
        ...new Set(
          input.guides
            .map((guide) => guide.sectionId)
            .filter((sectionId): sectionId is string => Boolean(sectionId)),
        ),
      ];

      if (sectionIds.length > 0) {
        const sectionCount = await prisma.guideSection.count({
          where: { teamId: input.teamId, id: { in: sectionIds } },
        });

        if (sectionCount !== sectionIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more guide sections do not belong to this team.",
          });
        }
      }

      await prisma.$transaction(
        input.guides.map((guide) =>
          prisma.guide.updateMany({
            where: { id: guide.guideId, teamId: input.teamId },
            data: {
              sectionId: guide.sectionId,
              sortOrder: guide.sortOrder,
            },
          }),
        ),
      );

      return { ok: true };
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
