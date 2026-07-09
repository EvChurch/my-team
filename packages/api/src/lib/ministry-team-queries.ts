import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../generated/prisma/client/client";
import { prisma } from "../db";
import {
  getPersonDisplayMap,
  getProfileDisplayMap,
  type PersonDisplaySource,
  profileDisplaySelect,
  personDisplaySelect,
} from "./display-identity";

const peopleTeamSelect = {
  id: true,
  remoteId: true,
  leaders: {
    select: {
      id: true,
      source: true,
      person: { select: personDisplaySelect },
    },
  },
  positions: {
    select: {
      id: true,
      name: true,
      source: true,
      assignments: {
        select: {
          id: true,
          source: true,
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
      source: true,
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
const INITIAL_ADMIN_EMAILS = (
  process.env.MINISTRY_INITIAL_ADMIN_EMAILS ?? "tataihono@evchurch.nz"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function displayMemberRoleName(roleName: string | null) {
  const normalized = roleName?.trim().toLowerCase();
  if (!normalized || STRUCTURAL_MEMBER_ROLE_NAMES.has(normalized)) return null;
  return roleName?.trim() ?? null;
}

type DecoratedTeam = Omit<HierarchyTeamRow, "leaders" | "positions"> & {
  leaders: Array<{
    id: string;
    roleName: string | null;
    source: "SYNCED" | "MY_TEAM";
    person: PersonDisplaySource;
  }>;
  members: Array<{
    id: string;
    roleName: string | null;
    source: "SYNCED" | "MY_TEAM";
    person: PersonDisplaySource;
  }>;
  roleOptions: Array<{
    id: string;
    name: string;
  }>;
};
type AdminTreeNode = DecoratedTeam & { children: AdminTreeNode[] };

export async function assertMinistryAdmin(personId: string) {
  const isAdmin = await isMinistryAdmin(personId);
  if (!isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a Ministry administrator to view this page.",
    });
  }
}

export async function isMinistryAdmin(personId: string) {
  const admin = await prisma.ministryAdmin.findUnique({
    where: { personId },
    select: { id: true },
  });
  if (admin) return true;

  const adminCount = await prisma.ministryAdmin.count();
  if (adminCount > 0) return false;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { email: true },
  });
  const email = person?.email?.trim().toLowerCase();
  if (!email || !INITIAL_ADMIN_EMAILS.includes(email)) return false;

  await prisma.ministryAdmin.create({ data: { personId } });
  return true;
}

export async function listMinistryAdmins(personId: string) {
  await assertMinistryAdmin(personId);

  const admins = await prisma.ministryAdmin.findMany({
    select: {
      id: true,
      personId: true,
      note: true,
      createdAt: true,
      person: { select: profileDisplaySelect },
    },
    orderBy: [{ createdAt: "asc" }],
  });
  const displayMap = await getProfileDisplayMap(
    admins.map((admin) => admin.person),
  );

  return admins.map((admin) => ({
    ...admin,
    profileId: admin.personId,
    profile: displayMap.get(admin.person.id) ?? admin.person,
  }));
}

export async function searchMinistryAdminProfiles(
  personId: string,
  search: string,
) {
  await assertMinistryAdmin(personId);

  const query = search.trim();
  if (query.length < 2) return [];

  const profiles = await prisma.person.findMany({
    where: {
      OR: [
        { displayName: { contains: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      ...profileDisplaySelect,
      ministryAdmin: { select: { id: true } },
    },
    orderBy: [{ displayName: "asc" }],
    take: 20,
  });
  const displayMap = await getProfileDisplayMap(profiles);

  return profiles.map((profile) => ({
    ...(displayMap.get(profile.id) ?? profile),
    isAdmin: Boolean(profile.ministryAdmin),
  }));
}

export async function addMinistryAdmin(input: {
  actorProfileId: string;
  profileId: string;
}) {
  await assertMinistryAdmin(input.actorProfileId);

  const person = await prisma.person.findUnique({
    where: { id: input.profileId },
    select: { id: true },
  });
  if (!person) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Person not found.",
    });
  }

  return prisma.ministryAdmin.upsert({
    where: { personId: input.profileId },
    update: {},
    create: { personId: input.profileId },
  });
}

export async function removeMinistryAdmin(input: {
  actorProfileId: string;
  profileId: string;
}) {
  await assertMinistryAdmin(input.actorProfileId);

  const adminCount = await prisma.ministryAdmin.count();
  if (adminCount <= 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one ministry administrator is required.",
    });
  }

  return prisma.ministryAdmin.delete({
    where: { personId: input.profileId },
  });
}

export async function searchMinistryPeople(search: string) {
  const query = search.trim();
  if (query.length < 2) return [];

  const people = await prisma.person.findMany({
    where: {
      isActive: true,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: personDisplaySelect,
    orderBy: [{ fullName: "asc" }],
    take: 20,
  });
  const displayMap = await getPersonDisplayMap(people);

  return people.map((person) => displayMap.get(person.id) ?? person);
}

async function assertTeamExists(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found.",
    });
  }
}

async function assertPersonExists(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true },
  });
  if (!person) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Person not found.",
    });
  }
}

async function validRoleIdsForTeam(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      positions: { select: { id: true } },
      sources: {
        where: { provider: "PCO" },
        select: { remoteId: true },
      },
    },
  });
  if (!team) return new Set<string>();

  const pcoRemoteIds = team.sources.map((source) => source.remoteId);
  const linkedPositions =
    pcoRemoteIds.length > 0
      ? await prisma.position.findMany({
          where: {
            team: {
              provider: "PCO",
              remoteId: { in: pcoRemoteIds },
            },
          },
          select: { id: true },
        })
      : [];

  return new Set([
    ...team.positions.map((position) => position.id),
    ...linkedPositions.map((position) => position.id),
  ]);
}

async function assertValidRoleIds(teamId: string, roleIds: string[]) {
  const uniqueRoleIds = [...new Set(roleIds)];
  if (uniqueRoleIds.length === 0) return uniqueRoleIds;

  const validRoleIds = await validRoleIdsForTeam(teamId);
  const invalidRoleId = uniqueRoleIds.find((roleId) => !validRoleIds.has(roleId));
  if (invalidRoleId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more roles do not belong to this team.",
    });
  }

  return uniqueRoleIds;
}

async function defaultMemberPositionId(teamId: string) {
  const remoteId = `my-team:${teamId}:member`;
  const position = await prisma.position.upsert({
    where: {
      remoteId_provider: {
        remoteId,
        provider: "ROCK",
      },
    },
    create: {
      remoteId,
      provider: "ROCK",
      teamId,
      name: "Member",
      source: "MY_TEAM",
    },
    update: {
      name: "Member",
      source: "MY_TEAM",
      teamId,
    },
    select: { id: true },
  });

  return position.id;
}

export async function addLocalTeamLeader(input: {
  teamId: string;
  personId: string;
  profileId: string;
}) {
  await Promise.all([
    assertTeamExists(input.teamId),
    assertPersonExists(input.personId),
  ]);

  return prisma.leader.upsert({
    where: {
      personId_teamId_source: {
        personId: input.personId,
        teamId: input.teamId,
        source: "MY_TEAM",
      },
    },
    create: {
      remoteId: `my-team:${input.teamId}:${input.personId}:leader`,
      provider: "ROCK",
      teamId: input.teamId,
      personId: input.personId,
      source: "MY_TEAM",
    },
    update: {},
  });
}

export async function removeLocalTeamLeader(input: {
  teamId: string;
  localLeaderId: string;
}) {
  await prisma.leader.delete({
    where: {
      id: input.localLeaderId,
      teamId: input.teamId,
      source: "MY_TEAM",
    },
  });
}

export async function addLocalTeamMember(input: {
  teamId: string;
  personId: string;
  roleIds: string[];
  profileId: string;
}) {
  await Promise.all([
    assertTeamExists(input.teamId),
    assertPersonExists(input.personId),
  ]);
  const roleIds = await assertValidRoleIds(input.teamId, input.roleIds);
  const resolvedRoleIds =
    roleIds.length > 0 ? roleIds : [await defaultMemberPositionId(input.teamId)];

  return prisma.$transaction(async (tx) => {
    const assignments = [];
    for (const positionId of resolvedRoleIds) {
      assignments.push(
        await tx.assignment.upsert({
          where: {
            personId_positionId_source: {
              personId: input.personId,
              positionId,
              source: "MY_TEAM",
            },
          },
          create: {
            remoteId: `my-team:${positionId}:${input.personId}:assignment`,
            provider: "ROCK",
            personId: input.personId,
            positionId,
            source: "MY_TEAM",
          },
          update: {},
        }),
      );
    }

    return assignments[0] ?? null;
  });
}

async function localMemberPersonForAssignment(input: {
  teamId: string;
  assignmentId: string;
}) {
  const validRoleIds = await validRoleIdsForTeam(input.teamId);
  const assignment = await prisma.assignment.findUnique({
    where: {
      id: input.assignmentId,
    },
    select: {
      personId: true,
      positionId: true,
      source: true,
    },
  });
  if (
    !assignment ||
    assignment.source !== "MY_TEAM" ||
    !validRoleIds.has(assignment.positionId)
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Local member not found.",
    });
  }

  return {
    personId: assignment.personId,
    validRoleIds: [...validRoleIds],
  };
}

export async function updateLocalTeamMemberRoles(input: {
  teamId: string;
  localMemberId: string;
  roleIds: string[];
}) {
  const roleIds = await assertValidRoleIds(input.teamId, input.roleIds);
  const localMember = await localMemberPersonForAssignment({
    teamId: input.teamId,
    assignmentId: input.localMemberId,
  });
  const personId = localMember.personId;
  const resolvedRoleIds =
    roleIds.length > 0 ? roleIds : [await defaultMemberPositionId(input.teamId)];

  return prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({
      where: {
        personId,
        source: "MY_TEAM",
        positionId: { in: localMember.validRoleIds },
      },
    });

    const assignments = [];
    for (const positionId of resolvedRoleIds) {
      assignments.push(
        await tx.assignment.upsert({
          where: {
            personId_positionId_source: {
              personId,
              positionId,
              source: "MY_TEAM",
            },
          },
          create: {
            remoteId: `my-team:${positionId}:${personId}:assignment`,
            provider: "ROCK",
            personId,
            positionId,
            source: "MY_TEAM",
          },
          update: { source: "MY_TEAM" },
        }),
      );
    }

    return assignments[0] ?? null;
  });
}

export async function removeLocalTeamMember(input: {
  teamId: string;
  localMemberId: string;
}) {
  const localMember = await localMemberPersonForAssignment({
    teamId: input.teamId,
    assignmentId: input.localMemberId,
  });

  await prisma.assignment.deleteMany({
    where: {
      personId: localMember.personId,
      source: "MY_TEAM",
      positionId: { in: localMember.validRoleIds },
    },
  });
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
          select: peopleTeamSelect,
        })
      : [];
  const pcoTeamsByRemoteId = new Map<string, PeopleTeamRow>(
    linkedPcoTeams.map((team) => [team.remoteId, team]),
  );
  const myTeamRowsForTeam = (team: T): PeopleTeamRow => ({
    id: team.id,
    remoteId: team.remoteId,
    leaders: team.leaders.filter((leader) => leader.source === "MY_TEAM"),
    positions: team.positions
      .map((position) => ({
        ...position,
        assignments: position.assignments.filter(
          (assignment) => assignment.source === "MY_TEAM",
        ),
      }))
      .filter(
        (position) =>
          position.source === "MY_TEAM" || position.assignments.length > 0,
      ),
  });
  const peopleTeamsForTeam = (team: T): PeopleTeamRow[] => {
    const linkedTeams = team.sources
      .filter((source) => source.provider === "PCO")
      .map((source) => pcoTeamsByRemoteId.get(source.remoteId))
      .filter((linkedTeam): linkedTeam is PeopleTeamRow => Boolean(linkedTeam));

    if (linkedTeams.length > 0) {
      const myTeamRows = myTeamRowsForTeam(team);
      const hasMyTeamRows =
        myTeamRows.leaders.length > 0 || myTeamRows.positions.length > 0;

      return hasMyTeamRows ? [myTeamRows, ...linkedTeams] : linkedTeams;
    }

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
      source: "SYNCED" | "MY_TEAM";
      person: PersonDisplaySource;
    }>,
  ) => {
    const byPersonId = new Map<
      string,
      {
        id: string;
        roleNames: Set<string>;
        source: "SYNCED" | "MY_TEAM";
        person: PersonDisplaySource;
      }
    >();

    for (const member of members) {
      const existing = byPersonId.get(member.person.id);
      if (existing) {
        if (member.roleName) existing.roleNames.add(member.roleName);
        if (member.source === "MY_TEAM") {
          existing.id = member.id;
          existing.source = "MY_TEAM";
        }
        continue;
      }

      byPersonId.set(member.person.id, {
        id: member.id,
        roleNames: new Set(member.roleName ? [member.roleName] : []),
        source: member.source,
        person: member.person,
      });
    }

    return [...byPersonId.values()].map((member) => ({
      id: member.id,
      roleName: [...member.roleNames].sort().join(", ") || null,
      source: member.source,
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
    const roleOptions = peopleTeams
      .flatMap((peopleTeam) =>
        peopleTeam.positions.map((position) => ({
          id: position.id,
          name: displayMemberRoleName(position.name) ?? position.name ?? "Member",
        })),
      )
      .filter(
        (role, index, roles) =>
          role.name.toLowerCase() !== "member" &&
          roles.findIndex((item) => item.id === role.id) === index,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const leaderRows = uniqueByPerson(
      peopleTeams.flatMap((peopleTeam) =>
        peopleTeam.leaders.map((leader) => ({
          id: leader.id,
          roleName: null,
          source: leader.source,
          person: leader.person,
        })),
      ),
    );
    const fallbackLeaderRows = team.leaders.map((leader) => ({
      id: leader.id,
      roleName: null,
      source: leader.source,
      person: leader.person,
    }));
    const leaders = leaderRows.length > 0 ? leaderRows : fallbackLeaderRows;
    const members = peopleTeams.flatMap((peopleTeam) =>
      peopleTeam.positions.flatMap((position) =>
        position.assignments.map((assignment) => ({
          id: assignment.id,
          roleName: displayMemberRoleName(position.name),
          source: assignment.source,
          person: assignment.person,
        })),
      ),
    );
    const allLeaders = uniqueByPerson(
      [...leaders].sort((a, b) =>
        a.source === b.source ? 0 : a.source === "MY_TEAM" ? -1 : 1,
      ),
    );
    const leaderPersonIds = new Set(allLeaders.map((leader) => leader.person.id));

    return {
      ...teamWithoutPeople,
      roleOptions,
      leaders: allLeaders.map((leader) => ({
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
