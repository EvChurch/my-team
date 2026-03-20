import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";

export const teamsRouter = createTRPCRouter({
  /**
   * List teams the current user belongs to (via Assignment or Leader).
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const personId = ctx.personId;

    // Find teams where user is assigned (via position) or is a leader
    const [assignedTeams, ledTeams] = await Promise.all([
      prisma.assignment.findMany({
        where: { personId },
        select: {
          position: {
            select: {
              team: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  serviceType: { select: { name: true } },
                  _count: {
                    select: {
                      positions: true,
                      leaders: true,
                      goals: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.leader.findMany({
        where: { personId },
        select: {
          team: {
            select: {
              id: true,
              name: true,
              description: true,
              serviceType: { select: { name: true } },
              _count: {
                select: {
                  positions: true,
                  leaders: true,
                  goals: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Merge and deduplicate by team ID
    const teamsMap = new Map<string, (typeof assignedTeams)[0]["position"]["team"]>();
    for (const a of assignedTeams) {
      teamsMap.set(a.position.team.id, a.position.team);
    }
    for (const l of ledTeams) {
      teamsMap.set(l.team.id, l.team);
    }

    return Array.from(teamsMap.values());
  }),

  /**
   * Get a single team with all relations.
   */
  get: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ input }) => {
      const team = await prisma.team.findUniqueOrThrow({
        where: { id: input.teamId },
        include: {
          serviceType: true,
          positions: {
            include: {
              assignments: {
                include: {
                  person: {
                    select: {
                      id: true,
                      fullName: true,
                      firstName: true,
                      lastName: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
          leaders: {
            include: {
              person: {
                select: {
                  id: true,
                  fullName: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: {
              goals: true,
              feedback: true,
              guides: true,
            },
          },
        },
      });

      return team;
    }),
});
