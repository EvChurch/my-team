import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";
import {
  getPersonDisplayMap,
  getProfileDisplayMap,
  personDisplaySelect,
  profileDisplaySelect,
} from "../lib/display-identity";

export const teamsRouter = createTRPCRouter({
  /**
   * List teams the current user belongs to (via Assignment or Leader).
   * Returns user's role (leader or position name) for badge display.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const personIds = ctx.personIds;

    // Find teams where user is assigned (via position) or is a leader
    const [assignedTeams, ledTeams] = await Promise.all([
      prisma.assignment.findMany({
        where: { personId: { in: personIds } },
        select: {
          position: {
            select: {
              name: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  provider: true,
                  description: true,
                  serviceType: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.leader.findMany({
        where: { personId: { in: personIds } },
        select: {
          team: {
            select: {
              id: true,
              name: true,
              provider: true,
              description: true,
              serviceType: { select: { name: true } },
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
        provider: "PCO" | "ROCK";
        description: unknown;
        serviceType: { name: string } | null;
        userRole: string;
        userRoles: string[];
        isLeader: boolean;
        memberCount: number;
        nextServingDate: string | null;
      }
    >();

    for (const a of assignedTeams) {
      const team = a.position.team;
      const roleName = a.position.name ?? "Member";
      const existing = teamsMap.get(team.id);
      if (existing) {
        if (!existing.userRoles.includes(roleName)) {
          existing.userRoles.push(roleName);
        }
        existing.userRole = existing.userRoles[0] ?? roleName;
      } else {
        teamsMap.set(team.id, {
          ...team,
          userRole: roleName,
          userRoles: [roleName],
          isLeader: false,
          memberCount: 0,
          nextServingDate: null,
        });
      }
    }
    for (const l of ledTeams) {
      const existing = teamsMap.get(l.team.id);
      if (existing) {
        existing.isLeader = true;
      } else {
        teamsMap.set(l.team.id, {
          ...l.team,
          userRole: "Team Lead",
          userRoles: [],
          isLeader: true,
          memberCount: 0,
          nextServingDate: null,
        });
      }
    }

    const teamIds = Array.from(teamsMap.keys());
    if (teamIds.length > 0) {
      const [memberAssignments, teamLeaders, nextSchedules] = await Promise.all([
        prisma.assignment.findMany({
          where: {
            position: { teamId: { in: teamIds } },
          },
          select: {
            personId: true,
            position: {
              select: {
                teamId: true,
              },
            },
          },
        }),
        prisma.leader.findMany({
          where: {
            teamId: { in: teamIds },
          },
          select: {
            personId: true,
            teamId: true,
          },
        }),
        prisma.schedule.findMany({
          where: {
            personId: { in: personIds },
            teamId: { in: teamIds },
            sortDate: { gte: new Date() },
          },
          orderBy: { sortDate: "asc" },
          select: { teamId: true, sortDate: true },
          distinct: ["teamId"],
        }),
      ]);

      const membersByTeam = new Map<string, Set<string>>();
      for (const teamId of teamIds) {
        membersByTeam.set(teamId, new Set());
      }
      for (const assignment of memberAssignments) {
        membersByTeam.get(assignment.position.teamId)?.add(assignment.personId);
      }
      for (const leader of teamLeaders) {
        membersByTeam.get(leader.teamId)?.add(leader.personId);
      }
      for (const [teamId, members] of membersByTeam.entries()) {
        const team = teamsMap.get(teamId);
        if (team) {
          team.memberCount = members.size;
        }
      }

      for (const schedule of nextSchedules) {
        const team = teamsMap.get(schedule.teamId);
        if (team) {
          team.nextServingDate = schedule.sortDate.toISOString();
        }
      }
    }

    return Array.from(teamsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      }),
    );
  }),

  /**
   * Get a single team with all relations needed for team view.
   */
  get: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [team, isLeader, goals, feedback, guides, schedules, scheduleCount] =
        await Promise.all([
          prisma.team.findUniqueOrThrow({
            where: { id: input.teamId },
            include: {
              serviceType: true,
              positions: {
                include: {
                  assignments: {
                    include: {
                      person: { select: personDisplaySelect },
                    },
                  },
                },
              },
              leaders: {
                include: {
                  person: { select: personDisplaySelect },
                },
              },
            },
          }),
          prisma.leader.findFirst({
            where: {
              personId: { in: ctx.personIds },
              teamId: input.teamId,
            },
          }),
          prisma.goal.findMany({
            where: { teamId: input.teamId },
            include: {
              person: { select: profileDisplaySelect },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          prisma.feedback.findMany({
            where: { teamId: input.teamId, isShared: true },
            include: {
              author: { select: profileDisplaySelect },
            },
            orderBy: { createdAt: "desc" },
            take: 3,
          }),
          prisma.guide.findMany({
            where: { teamId: input.teamId, status: "PUBLISHED" },
            include: {
              author: { select: profileDisplaySelect },
              role: { select: { id: true, name: true } },
            },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            take: 5,
          }),
          prisma.schedule.findMany({
            where: {
              personId: { in: ctx.personIds },
              teamId: input.teamId,
              sortDate: { gte: new Date() },
            },
            select: {
              id: true,
              provider: true,
              positionName: true,
              status: true,
              sortDate: true,
              dates: true,
              startsAt: true,
              endsAt: true,
              planRemoteId: true,
              team: { select: { id: true, name: true } },
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
          prisma.schedule.count({
            where: { teamId: input.teamId },
          }),
        ]);

      const teamPersonDisplayMap = await getPersonDisplayMap([
        ...team.leaders.map((leader) => leader.person),
        ...team.positions.flatMap((position) =>
          position.assignments.map((assignment) => assignment.person),
        ),
      ]);
      const profileDisplayMap = await getProfileDisplayMap(
        [
          ...goals.map((goal) => goal.person),
          ...feedback.map((item) => item.author),
          ...guides.map((guide) => guide.author),
        ].filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile),
        ),
      );

      const displayTeam = {
        ...team,
        positions: team.positions.map((position) => ({
          ...position,
          assignments: position.assignments.map((assignment) => ({
            ...assignment,
            person:
              teamPersonDisplayMap.get(assignment.person.id) ??
              assignment.person,
          })),
        })),
        leaders: team.leaders.map((leader) => ({
          ...leader,
          person: teamPersonDisplayMap.get(leader.person.id) ?? leader.person,
        })),
      };
      const displayGoals = goals.map((goal) => ({
        ...goal,
        person: goal.person
          ? (profileDisplayMap.get(goal.person.id) ?? goal.person)
          : null,
      }));
      const displayFeedback = feedback.map((item) => ({
        ...item,
        author: item.author
          ? (profileDisplayMap.get(item.author.id) ?? item.author)
          : null,
      }));
      const displayGuides = guides.map((guide) => ({
        ...guide,
        author: guide.author
          ? (profileDisplayMap.get(guide.author.id) ?? guide.author)
          : null,
      }));

      let teamSchedules: Array<{
        planRemoteId: string;
        sortDate: string;
        dates: string;
        startsAt: string | null;
        people: Array<{
          personId: string;
          personName: string;
          personImage: string | null;
          positionName: string | null;
          status: string;
        }>;
      }> = [];
      if (isLeader) {
        const allTeamSchedules = await prisma.schedule.findMany({
          where: {
            teamId: input.teamId,
            sortDate: { gte: new Date() },
          },
          select: {
            planRemoteId: true,
            sortDate: true,
            dates: true,
            startsAt: true,
            positionName: true,
            status: true,
            person: { select: personDisplaySelect },
          },
          orderBy: { sortDate: "asc" },
        });
        const schedulePersonDisplayMap = await getPersonDisplayMap(
          allTeamSchedules.map((schedule) => schedule.person),
        );

        const planGroups = new Map<string, (typeof teamSchedules)[number]>();
        for (const schedule of allTeamSchedules) {
          const displayPerson =
            schedulePersonDisplayMap.get(schedule.person.id) ??
            schedule.person;
          if (!planGroups.has(schedule.planRemoteId)) {
            planGroups.set(schedule.planRemoteId, {
              planRemoteId: schedule.planRemoteId,
              sortDate: schedule.sortDate.toISOString(),
              dates: schedule.dates,
              startsAt: schedule.startsAt?.toISOString() ?? null,
              people: [],
            });
          }
          planGroups.get(schedule.planRemoteId)!.people.push({
            personId: schedule.person.id,
            personName: displayPerson.fullName,
            personImage: displayPerson.image,
            positionName: schedule.positionName,
            status: schedule.status,
          });
        }
        teamSchedules = Array.from(planGroups.values());
      }

      let lastServedByPerson: Record<string, string> = {};
      if (isLeader) {
        const uniquePersonIds = [
          ...new Set([
            ...displayTeam.leaders.map((leader) => leader.person.id),
            ...displayTeam.positions.flatMap((position) =>
              position.assignments.map((assignment) => assignment.person.id),
            ),
          ]),
        ];

        if (uniquePersonIds.length > 0) {
          const lastSchedules = await prisma.schedule.findMany({
            where: {
              teamId: input.teamId,
              personId: { in: uniquePersonIds },
              sortDate: { lt: new Date() },
            },
            orderBy: { sortDate: "desc" },
            distinct: ["personId"],
            select: { personId: true, sortDate: true },
          });

          lastServedByPerson = Object.fromEntries(
            lastSchedules.map((schedule) => [
              schedule.personId,
              schedule.sortDate.toISOString(),
            ]),
          );
        }
      }

      return {
        ...displayTeam,
        isCurrentUserLeader: !!isLeader,
        goals: displayGoals,
        feedback: displayFeedback,
        guides: displayGuides,
        schedules,
        hasScheduleHistory: scheduleCount > 0 || team.serviceTypeId !== null,
        teamSchedules,
        lastServedByPerson,
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
                person: { select: personDisplaySelect },
              },
            },
          },
        }),
        prisma.goal.findMany({
          where: {
            teamId: input.teamId,
            person: {
              identities: {
                some: {
                  person: {
                    assignments: {
                      some: { positionId: input.positionId },
                    },
                  },
                },
              },
            },
          },
          include: {
            person: { select: profileDisplaySelect },
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
            author: { select: profileDisplaySelect },
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        }),
      ]);

      const positionPersonDisplayMap = await getPersonDisplayMap(
        position.assignments.map((assignment) => assignment.person),
      );
      const positionProfileDisplayMap = await getProfileDisplayMap(
        [
          ...goals.map((goal) => goal.person),
          ...guides.map((guide) => guide.author),
        ].filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile),
        ),
      );

      return {
        ...position,
        assignments: position.assignments.map((assignment) => ({
          ...assignment,
          person:
            positionPersonDisplayMap.get(assignment.person.id) ??
            assignment.person,
        })),
        goals: goals.map((goal) => ({
          ...goal,
          person: goal.person
            ? (positionProfileDisplayMap.get(goal.person.id) ?? goal.person)
            : null,
        })),
        guides: guides.map((guide) => ({
          ...guide,
          author: guide.author
            ? (positionProfileDisplayMap.get(guide.author.id) ?? guide.author)
            : null,
        })),
      };
    }),
});
