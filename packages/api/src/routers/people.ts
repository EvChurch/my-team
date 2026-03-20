import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";

export const peopleRouter = createTRPCRouter({
  /**
   * Get the current user's Person record with teams, positions, and leader status.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return prisma.person.findUniqueOrThrow({
      where: { id: ctx.personId },
      include: {
        assignments: {
          include: {
            position: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        leaders: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }),
});
