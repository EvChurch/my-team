import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../generated/prisma/client/client";
import { prisma } from "../db";
import {
  getPersonDisplayMap,
  type PersonDisplaySource,
  personDisplaySelect,
} from "./display-identity";

const peopleTeamSelect = {
  leaders: {
    select: {
      id: true,
      person: { select: personDisplaySelect },
    },
  },
  positions: {
    select: {
      id: true,
      name: true,
      assignments: {
        select: {
          id: true,
          person: { select: personDisplaySelect },
        },
      },
    },
  },
} as const;

const hierarchyTeamSelect = {
  id: true,
  kind: true,
  name: true,
  parentTeamId: true,
  sortOrder: true,
  provider: true,
  remoteId: true,
  sources: {
    select: {
      provider: true,
      remoteId: true,
      parentRemoteId: true,
      sourceGroupTypeId: true,
      sourceName: true,
    },
  },
  leaders: {
    select: {
      id: true,
      person: { select: personDisplaySelect },
    },
  },
  positions: peopleTeamSelect.positions,
} as const;

type HierarchyTeamRow = Prisma.TeamGetPayload<{
  select: typeof hierarchyTeamSelect;
}>;
type PeopleTeamRow = Prisma.TeamGetPayload<{ select: typeof peopleTeamSelect }>;
const STRUCTURAL_MEMBER_ROLE_NAMES = new Set(["leader", "member"]);

function displayMemberRoleName(roleName: string | null) {
  const normalized = roleName?.trim().toLowerCase();
  if (!normalized || STRUCTURAL_MEMBER_ROLE_NAMES.has(normalized)) return null;
  return roleName?.trim() ?? null;
}

type DecoratedTeam = Omit<HierarchyTeamRow, "leaders" | "positions"> & {
  leaders: Array<{
    id: string;
    roleName: string | null;
    person: PersonDisplaySource;
  }>;
  members: Array<{
    id: string;
    roleName: string | null;
    person: PersonDisplaySource;
  }>;
};
type AdminTreeNode = DecoratedTeam & { children: AdminTreeNode[] };

export async function assertMinistryAdmin(profileId: string) {
  const isAdmin = await isMinistryAdmin(profileId);
  if (!isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a Ministry administrator to view this page.",
    });
  }
}

export async function isMinistryAdmin(profileId: string) {
  const admin = await prisma.ministryAdmin.findUnique({
    where: { profileId },
    select: { id: true },
  });
  return Boolean(admin);
}

async function decorateHierarchyTeams<T extends HierarchyTeamRow>(teams: T[]) {
  const pcoTeamRemoteIds = [
    ...new Set(
      teams.flatMap((team) =>
        team.sources
          .filter((source) => source.provider === "PCO")
          .map((source) => source.remoteId),
      ),
    ),
  ];
  const linkedPcoTeams =
    pcoTeamRemoteIds.length > 0
      ? await prisma.team.findMany({
          where: {
            provider: "PCO",
            remoteId: { in: pcoTeamRemoteIds },
          },
          select: {
            remoteId: true,
            ...peopleTeamSelect,
          },
        })
      : [];
  const pcoTeamsByRemoteId = new Map<string, PeopleTeamRow>(
    linkedPcoTeams.map((team) => [team.remoteId, team]),
  );
  const peopleTeamsForTeam = (team: T): PeopleTeamRow[] => {
    const linkedTeams = team.sources
      .filter((source) => source.provider === "PCO")
      .map((source) => pcoTeamsByRemoteId.get(source.remoteId))
      .filter((linkedTeam): linkedTeam is PeopleTeamRow => Boolean(linkedTeam));

    if (linkedTeams.length > 0) return linkedTeams;
    return [team];
  };

  const displayMap = await getPersonDisplayMap(
    teams.flatMap((team) => {
      const peopleTeams = peopleTeamsForTeam(team);
      const leaderPeople =
        peopleTeams.length > 0
          ? peopleTeams.flatMap((peopleTeam) =>
              peopleTeam.leaders.map((leader) => leader.person),
            )
          : team.leaders.map((leader) => leader.person);

      return [
        ...leaderPeople,
        ...peopleTeams.flatMap((peopleTeam) =>
          peopleTeam.positions.flatMap((position) =>
            position.assignments.map((assignment) => assignment.person),
          ),
        ),
      ];
    }),
  );

  const uniqueByPerson = <TItem extends { person: { id: string } }>(
    items: TItem[],
  ) => {
    const seenPeople = new Set<string>();
    return items.filter((item) => {
      if (seenPeople.has(item.person.id)) return false;
      seenPeople.add(item.person.id);
      return true;
    });
  };
  const groupMembersByPerson = (
    members: Array<{
      id: string;
      roleName: string | null;
      person: PersonDisplaySource;
    }>,
  ) => {
    const byPersonId = new Map<
      string,
      {
        id: string;
        roleNames: Set<string>;
        person: PersonDisplaySource;
      }
    >();

    for (const member of members) {
      const existing = byPersonId.get(member.person.id);
      if (existing) {
        if (member.roleName) existing.roleNames.add(member.roleName);
        continue;
      }

      byPersonId.set(member.person.id, {
        id: member.id,
        roleNames: new Set(member.roleName ? [member.roleName] : []),
        person: member.person,
      });
    }

    return [...byPersonId.values()].map((member) => ({
      id: member.id,
      roleName: [...member.roleNames].sort().join(", ") || null,
      person: member.person,
    }));
  };

  return teams.map((team) => {
    const {
      leaders: _rawLeaders,
      positions: _positions,
      ...teamWithoutPeople
    } = team;
    const peopleTeams = peopleTeamsForTeam(team);
    const leaderRows = uniqueByPerson(
      peopleTeams.flatMap((peopleTeam) =>
        peopleTeam.leaders.map((leader) => ({
          id: leader.id,
          roleName: null,
          person: leader.person,
        })),
      ),
    );
    const fallbackLeaderRows = team.leaders.map((leader) => ({
      id: leader.id,
      roleName: null,
      person: leader.person,
    }));
    const leaders = leaderRows.length > 0 ? leaderRows : fallbackLeaderRows;
    const members = peopleTeams.flatMap((peopleTeam) =>
      peopleTeam.positions.flatMap((position) =>
        position.assignments.map((assignment) => ({
          id: assignment.id,
          roleName: displayMemberRoleName(position.name),
          person: assignment.person,
        })),
      ),
    );
    const leaderPersonIds = new Set(leaders.map((leader) => leader.person.id));

    return {
      ...teamWithoutPeople,
      leaders: leaders.map((leader) => ({
        ...leader,
        person: displayMap.get(leader.person.id) ?? leader.person,
      })),
      members: groupMembersByPerson(
        members.map((member) => ({
          ...member,
          person: displayMap.get(member.person.id) ?? member.person,
        })),
      )
        .filter(
          (member) => member.roleName || !leaderPersonIds.has(member.person.id),
        )
        .sort((a, b) => a.person.fullName.localeCompare(b.person.fullName)),
    };
  });
}

async function findCanonicalHierarchyTeamId(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, provider: true, remoteId: true, parentTeamId: true },
  });
  if (!team) return null;
  if (team.parentTeamId) return team.id;

  const source = await prisma.teamSource.findUnique({
    where: {
      provider_remoteId: {
        provider: team.provider,
        remoteId: team.remoteId,
      },
    },
    select: {
      team: {
        select: {
          id: true,
          isActive: true,
          kind: true,
        },
      },
    },
  });

  return source?.team.isActive && source.team.kind === "SERVING_TEAM"
    ? source.team.id
    : null;
}

export async function getTeamMinistryLineage(teamId: string) {
  const hierarchyTeamId = await findCanonicalHierarchyTeamId(teamId);
  if (!hierarchyTeamId) return [];

  const lineage: HierarchyTeamRow[] = [];
  const seen = new Set<string>();
  let currentId: string | null = hierarchyTeamId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const team: HierarchyTeamRow | null = await prisma.team.findUnique({
      where: { id: currentId },
      select: hierarchyTeamSelect,
    });
    if (!team) break;
    lineage.push(team);
    currentId = team.parentTeamId;
  }

  return decorateHierarchyTeams(lineage.reverse());
}

export async function getMinistryAdminTree() {
  const teams = await prisma.team.findMany({
    where: {
      isActive: true,
      OR: [{ kind: "CHURCH" }, { sources: { some: { provider: "ROCK" } } }],
    },
    select: hierarchyTeamSelect,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const decoratedTeams = await decorateHierarchyTeams(teams);
  const byParentId = new Map<string | null, DecoratedTeam[]>();
  for (const team of decoratedTeams) {
    const siblings = byParentId.get(team.parentTeamId) ?? [];
    siblings.push(team);
    byParentId.set(team.parentTeamId, siblings);
  }

  const build = (
    team: DecoratedTeam,
    seen = new Set<string>(),
  ): AdminTreeNode => {
    if (seen.has(team.id)) return { ...team, children: [] };
    const nextSeen = new Set(seen);
    nextSeen.add(team.id);
    return {
      ...team,
      children:
        team.kind === "SERVING_TEAM"
          ? []
          : (byParentId.get(team.id) ?? []).map((child) =>
              build(child, nextSeen),
            ),
    };
  };

  return (byParentId.get(null) ?? []).map((team) => build(team));
}
