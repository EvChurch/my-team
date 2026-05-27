import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";

export const peopleRouter = createTRPCRouter({
  /**
   * Get the current user's canonical My Team profile and linked source records.
   */
  myTeamProfile: protectedProcedure.query(async ({ ctx }) => {
    return prisma.profile.findUniqueOrThrow({
      where: { id: ctx.profileId },
      include: {
        authAccounts: true,
        identities: {
          include: {
            person: {
              select: {
                id: true,
                provider: true,
                remoteId: true,
                email: true,
                fullName: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
          orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  }),

  /**
   * Get the current user's Person record with teams, positions, and leader status.
   * @deprecated Use myTeamProfile for app identity. This remains for older
   * PCO-shaped views until team/schedule queries are converted.
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
