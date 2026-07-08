export type MinistryTeamKind =
  | "CHURCH"
  | "PURPOSE"
  | "CAMPUS"
  | "AREA"
  | "SERVING_TEAM";

export type RockHierarchyGroup = {
  id: number;
  name: string;
  groupTypeId: number | null;
  parentGroupId: number | null;
  order?: number | null;
  description?: string | null;
  pcoMarker?: string | null;
};

export type MinistryTeamCandidate = {
  remoteId: string;
  name: string;
  kind: MinistryTeamKind;
  parentRemoteId: string | null;
  teamProvider: "PCO" | "ROCK" | null;
  teamRemoteId: string | null;
  linkedPcoTeamRemoteIds: string[];
  sourceGroupTypeId: number | null;
  sourceSnapshot: Record<string, unknown>;
  sortOrder: number;
};

export const ROCK_GROUP_TYPES = {
  department: 38,
  locale: 39,
  area: 40,
  servingTeam: 23,
} as const;

const FOLDED_CAMPUS_LABELS = new Set([
  "central",
  "city",
  "east",
  "north",
  "south",
  "unichurch",
  "west",
]);

const CAMPUS_PREFIX_NAMES: Record<string, string> = {
  CT: "Central",
  HQ: "HQ",
  NS: "North Shore",
  UC: "Unichurch",
};

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ministryTeamSlug(kind: MinistryTeamKind, remoteId: string) {
  return `rock-${kind.toLowerCase().replace(/_/g, "-")}-${slugPart(remoteId)}`;
}

function displayNameForScope(
  group: RockHierarchyGroup,
  kind: MinistryTeamKind
): string {
  if (kind !== "CAMPUS") return group.name;

  const campusPrefix = group.name.trim().match(/^~?(CT|HQ|NS|UC)\b/i)?.[1];
  if (!campusPrefix) return group.name;

  return CAMPUS_PREFIX_NAMES[campusPrefix.toUpperCase()] ?? group.name;
}

function isCampusPurposeServingTeam(
  group: RockHierarchyGroup,
  parent: RockHierarchyGroup | undefined
) {
  return (
    group.groupTypeId === ROCK_GROUP_TYPES.servingTeam &&
    parent?.groupTypeId === ROCK_GROUP_TYPES.department &&
    /^(CT|NS|UC)\s+/i.test(group.name)
  );
}

function pcoMarkerType(marker: string | null | undefined): string | null {
  if (!marker?.trim()) return null;
  try {
    const parsed = JSON.parse(marker) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const type = (parsed as Record<string, unknown>).type;
    return typeof type === "string" ? type.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

function isPcoRoleArtifact(group: RockHierarchyGroup) {
  const type = pcoMarkerType(group.pcoMarker);
  return type === "team_leader" || type === "team_position";
}

function isFoldedCampusLabel(
  group: RockHierarchyGroup,
  parentKind: MinistryTeamKind | null
) {
  return (
    group.groupTypeId === ROCK_GROUP_TYPES.servingTeam &&
    parentKind === "CAMPUS" &&
    FOLDED_CAMPUS_LABELS.has(group.name.trim().toLowerCase())
  );
}

function classifyGroup(
  group: RockHierarchyGroup,
  groupsById: Map<number, RockHierarchyGroup>,
  childrenByParentId: Map<number, RockHierarchyGroup[]>,
  visibleKindById: Map<number, MinistryTeamKind | null>
): MinistryTeamKind | null {
  if (visibleKindById.has(group.id)) {
    return visibleKindById.get(group.id) ?? null;
  }

  const parent = group.parentGroupId
    ? groupsById.get(group.parentGroupId)
    : undefined;
  const parentKind = parent
    ? classifyGroup(parent, groupsById, childrenByParentId, visibleKindById)
    : null;
  const children = childrenByParentId.get(group.id) ?? [];

  let kind: MinistryTeamKind | null = null;
  if (isPcoRoleArtifact(group)) {
    kind = null;
  } else if (group.groupTypeId === ROCK_GROUP_TYPES.department) {
    kind = "PURPOSE";
  } else if (group.groupTypeId === ROCK_GROUP_TYPES.locale) {
    kind = "CAMPUS";
  } else if (group.groupTypeId === ROCK_GROUP_TYPES.area) {
    kind = "AREA";
  } else if (isCampusPurposeServingTeam(group, parent)) {
    kind = "CAMPUS";
  } else if (isFoldedCampusLabel(group, parentKind)) {
    kind = null;
  } else if (
    group.groupTypeId === ROCK_GROUP_TYPES.servingTeam &&
    parentKind === "AREA" &&
    children.some((child) => child.groupTypeId === ROCK_GROUP_TYPES.servingTeam)
  ) {
    kind = "AREA";
  } else if (
    group.groupTypeId === ROCK_GROUP_TYPES.servingTeam &&
    parentKind === "SERVING_TEAM"
  ) {
    kind = null;
  } else if (group.groupTypeId === ROCK_GROUP_TYPES.servingTeam) {
    kind = "SERVING_TEAM";
  }

  visibleKindById.set(group.id, kind);
  return kind;
}

function visibleParentRemoteId(
  group: RockHierarchyGroup,
  groupsById: Map<number, RockHierarchyGroup>,
  visibleKindById: Map<number, MinistryTeamKind | null>
): string | null {
  let parentId = group.parentGroupId;
  while (parentId) {
    const parent = groupsById.get(parentId);
    if (!parent) return null;
    if (visibleKindById.get(parent.id)) return String(parent.id);
    parentId = parent.parentGroupId;
  }
  return null;
}

function visibleOwnerRemoteId(
  group: RockHierarchyGroup,
  groupsById: Map<number, RockHierarchyGroup>,
  visibleKindById: Map<number, MinistryTeamKind | null>
): string | null {
  let currentId: number | null = group.id;
  while (currentId) {
    if (visibleKindById.get(currentId)) return String(currentId);
    const current = groupsById.get(currentId);
    currentId = current?.parentGroupId ?? null;
  }
  return null;
}

function pcoTeamRemoteId(marker: string | null | undefined): string | null {
  if (!marker?.trim()) return null;
  try {
    const parsed = JSON.parse(marker) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const directValue =
      record.teamId ??
      record.team_id ??
      record.TeamId ??
      record.pcoTeamId ??
      record.pco_team_id ??
      record.PcoTeamId ??
      record.teamid;

    if (typeof directValue === "string" && directValue.trim()) {
      return directValue.trim();
    }
    if (typeof directValue === "number" && Number.isInteger(directValue)) {
      return String(directValue);
    }
  } catch {
    return null;
  }
  return null;
}

export function buildMinistryTeamCandidates(
  groups: RockHierarchyGroup[]
): MinistryTeamCandidate[] {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const childrenByParentId = new Map<number, RockHierarchyGroup[]>();
  for (const group of groups) {
    if (!group.parentGroupId) continue;
    const children = childrenByParentId.get(group.parentGroupId) ?? [];
    children.push(group);
    childrenByParentId.set(group.parentGroupId, children);
  }

  const visibleKindById = new Map<number, MinistryTeamKind | null>();
  for (const group of groups) {
    classifyGroup(group, groupsById, childrenByParentId, visibleKindById);
  }

  const linkedPcoByScopeRemoteId = new Map<string, Set<string>>();
  for (const group of groups) {
    const pcoRemoteId = pcoTeamRemoteId(group.pcoMarker);
    if (!pcoRemoteId) continue;

    const ownerRemoteId = visibleOwnerRemoteId(
      group,
      groupsById,
      visibleKindById
    );
    if (!ownerRemoteId) continue;

    const linked = linkedPcoByScopeRemoteId.get(ownerRemoteId) ?? new Set();
    linked.add(pcoRemoteId);
    linkedPcoByScopeRemoteId.set(ownerRemoteId, linked);
  }

  return groups
    .map((group) => {
      const kind = visibleKindById.get(group.id);
      if (!kind) return null;

      const pcoRemoteId = pcoTeamRemoteId(group.pcoMarker);

      return {
        remoteId: String(group.id),
        name: displayNameForScope(group, kind),
        kind,
        parentRemoteId: visibleParentRemoteId(
          group,
          groupsById,
          visibleKindById
        ),
        teamProvider: "ROCK",
        teamRemoteId: String(group.id),
        linkedPcoTeamRemoteIds: [
          ...(linkedPcoByScopeRemoteId.get(String(group.id)) ?? []),
        ].sort(),
        sourceGroupTypeId: group.groupTypeId,
        sourceSnapshot: {
          id: group.id,
          name: group.name,
          groupTypeId: group.groupTypeId,
          parentGroupId: group.parentGroupId,
          pcoMarker: group.pcoMarker,
          pcoTeamRemoteId: pcoRemoteId,
          linkedPcoTeamRemoteIds: [
            ...(linkedPcoByScopeRemoteId.get(String(group.id)) ?? []),
          ].sort(),
        },
        sortOrder: group.order ?? 0,
      } satisfies MinistryTeamCandidate;
    })
    .filter((candidate): candidate is MinistryTeamCandidate =>
      Boolean(candidate)
    );
}
