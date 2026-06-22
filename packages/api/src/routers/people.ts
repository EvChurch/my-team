import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";
import {
  getPersonDisplayMap,
  getProfileDisplayMap,
} from "../lib/display-identity";

export const peopleRouter = createTRPCRouter({
  /**
   * Get the current user's canonical My Team profile and linked source records.
   */
  myTeamProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await prisma.profile.findUniqueOrThrow({
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

    const displayProfile =
      (await getProfileDisplayMap([profile])).get(profile.id) ?? profile;

    return {
      ...profile,
      displayName: displayProfile.displayName,
      fullName: displayProfile.fullName,
      firstName: displayProfile.firstName,
      lastName: displayProfile.lastName,
      email: displayProfile.email,
      image: displayProfile.image,
    };
  }),

  /**
   * Get the current user's Person record with teams, positions, and leader status.
   * @deprecated Use myTeamProfile for app identity. This remains for older
   * PCO-shaped views until team/schedule queries are converted.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const person = await prisma.person.findUniqueOrThrow({
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

    const displayPerson =
      (await getPersonDisplayMap([person])).get(person.id) ?? person;

    return {
      ...person,
      fullName: displayPerson.fullName,
      firstName: displayPerson.firstName,
      lastName: displayPerson.lastName,
      image: displayPerson.image,
    };
  }),
});
