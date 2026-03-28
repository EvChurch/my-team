import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";

export const teamsRouter = createTRPCRouter({
  /**
   * List teams the current user belongs to (via Assignment or Leader).
   * Returns user's role (leader or position name) for badge display.
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
              name: true,
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

    // Build a map with team + user role info
    const teamsMap = new Map<
      string,
      {
        id: string;
        name: string;
        description: unknown;
        serviceType: { name: string } | null;
        _count: { positions: number; leaders: number; goals: number };
        userRole: string;
        isLeader: boolean;
        memberCount: number;
        nextServingDate: string | null;
      }
    >();

    for (const a of assignedTeams) {
      const team = a.position.team;
      teamsMap.set(team.id, {
        ...team,
        userRole: a.position.name ?? "Member",
        isLeader: false,
        memberCount: team._count.positions + team._count.leaders,
        nextServingDate: null,
      });
    }
    for (const l of ledTeams) {
      teamsMap.set(l.team.id, {
        ...l.team,
        userRole: "Team Lead",
        isLeader: true,
        memberCount: l.team._count.positions + l.team._count.leaders,
        nextServingDate: null,
      });
    }

    // Fetch user's next serving date per team
    const teamIds = Array.from(teamsMap.keys());
    if (teamIds.length > 0) {
      const nextSchedules = await prisma.schedule.findMany({
        where: {
          personId,
          teamId: { in: teamIds },
          sortDate: { gte: new Date() },
        },
        orderBy: { sortDate: "asc" },
        select: { teamId: true, sortDate: true },
        distinct: ["teamId"],
      });
      for (const s of nextSchedules) {
        const team = teamsMap.get(s.teamId);
        if (team) {
          team.nextServingDate = s.sortDate.toISOString();
        }
      }
    }

    return Array.from(teamsMap.values());
  }),

  /**
   * Get a single team with all relations needed for team view.
   */
  get: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [team, isLeader, goals, feedback, guides, schedules] =
        await Promise.all([
        prisma.team.findUniqueOrThrow({
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
          },
        }),
        prisma.leader.findUnique({
          where: {
            personId_teamId: {
              personId: ctx.personId,
              teamId: input.teamId,
            },
          },
        }),
        prisma.goal.findMany({
          where: { teamId: input.teamId },
          include: {
            person: {
              select: { id: true, fullName: true, firstName: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.feedback.findMany({
          where: { teamId: input.teamId, isShared: true },
          include: {
            author: {
              select: { id: true, fullName: true, firstName: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.guide.findMany({
          where: { teamId: input.teamId, status: "PUBLISHED" },
          include: {
            author: {
              select: { id: true, fullName: true, firstName: true },
            },
            role: { select: { id: true, name: true } },
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          take: 5,
        }),
        prisma.schedule.findMany({
          where: {
            personId: ctx.personId,
            teamId: input.teamId,
            sortDate: { gte: new Date() },
          },
          select: {
            id: true,
            positionName: true,
            status: true,
            sortDate: true,
            dates: true,
            startsAt: true,
            endsAt: true,
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
          take: 5,
        }),
      ]);

      return {
        ...team,
        isCurrentUserLeader: !!isLeader,
        goals,
        feedback,
        guides,
        schedules,
      };
    }),

  /**
   * Get a single position/role with its members, goals, and guides.
   */
  getPosition: protectedProcedure
    .input(z.object({ teamId: z.string(), positionId: z.string() }))
    .query(async ({ input }) => {
      const [position, goals, guides] = await Promise.all([
        prisma.position.findUniqueOrThrow({
          where: { id: input.positionId },
          include: {
            team: { select: { id: true, name: true } },
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
        }),
        // Goals for people assigned to this position
        prisma.goal.findMany({
          where: {
            teamId: input.teamId,
            person: {
              assignments: {
                some: { positionId: input.positionId },
              },
            },
          },
          include: {
            person: {
              select: { id: true, fullName: true, firstName: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.guide.findMany({
          where: {
            teamId: input.teamId,
            roleId: input.positionId,
            status: "PUBLISHED",
          },
          include: {
            author: {
              select: { id: true, fullName: true, firstName: true },
            },
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        }),
      ]);

      return {
        ...position,
        goals,
        guides,
      };
    }),
});
