import { prisma } from "@mt/api/db";
import type { PersonIdentity } from "@mt/api/person-identity";
import { fetchPersonLinks, type PersonLinks } from "./rock-person-links.js";
import { identityKey } from "./person-reconciliation.js";

export type RepairSource = PersonIdentity & { id: string; provider: string; remoteId: string; fullName: string; isActive: boolean };
export type RepairPerson = {
  id: string; fullName: string; sourcePeople: RepairSource[];
  nativeReferences: Record<string, number>;
  syncedReferences: Array<{ kind: string; id: string; remoteId: string; provider: string }>;
};

/** A proposal only: source IDs are the partition keys; names never merge Rock IDs. */
export function planIdentityRepair(people: RepairPerson[], links: PersonLinks = { pcoToRock: new Map(), conflicts: 0 }) {
  const rockIds = new Set(people.flatMap(p => p.sourcePeople.filter(s => s.provider === "ROCK").map(s => s.remoteId)));
  const groups = people.flatMap((person) => {
    const partitionMap = new Map<string, RepairSource[]>();
    for (const source of person.sourcePeople) {
      const key = identityKey(source.provider, source.remoteId, links, rockIds);
      partitionMap.set(key, [...(partitionMap.get(key) ?? []), source]);
    }
    if (partitionMap.size <= 1) return [];
    const partitions = [...partitionMap].map(([key, sources]) => ({ key, sources }));
    // A directory ID can be reused, but app-native ownership needs separate proof.
    const retainedPartition = [...partitionMap.keys()].sort()[0] ?? null;
    const hasNative = Object.values(person.nativeReferences).some((count) => count > 0);
    return [{
      personId: person.id, currentName: person.fullName,
      status: hasNative ? "needs-ownership-evidence" as const : "ready-for-upstream-reference-resolution" as const,
      retainedPartition,
      newPeople: partitions.length - (retainedPartition ? 1 : 0),
      partitions: partitions.map((partition) => ({
        key: partition.key, retainPersonId: partition.key === retainedPartition ? person.id : null,
        sources: partition.sources.map(({ id, provider, remoteId, fullName, isActive }) => ({ id, provider, remoteId, fullName, isActive })),
      })),
      nativeReferences: person.nativeReferences,
      // Source person IDs were not stored on these rows. Resolve each remote ID
      // from fresh upstream data before moving it; never infer from current names.
      syncedReferences: person.syncedReferences,
    }];
  });
  return {
    mode: "dry-run" as const,
    summary: {
      groups: groups.length,
      newPeople: groups.reduce((sum, group) => sum + group.newPeople, 0),
      needsOwnershipEvidence: groups.filter((group) => group.status === "needs-ownership-evidence").length,
      syncedReferencesToResolve: groups.reduce((sum, group) => sum + group.syncedReferences.length, 0),
    },
    groups,
  };
}

export async function readIdentityRepairPlan(links?: PersonLinks) {
  const authoritativeLinks = links ?? await fetchPersonLinks();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    await tx.$executeRaw`SET LOCAL statement_timeout = '30s'`;
    const people = await tx.person.findMany({
      include: {
        sourcePeople: true,
        ministryAdmin: { select: { id: true } },
        preferences: { select: { id: true } },
        _count: { select: {
          authAccounts: true, goalsOwned: true, goalsReviewed: true, feedbackAuthored: true, feedbackReceived: true,
          guidesAuthored: true, trainingModulesAuthored: true, trainingCompletions: true, trainingQuizAttempts: true,
          trainingScopeOwnerships: true,
        } },
        assignments: { select: { id: true, remoteId: true, provider: true, source: true } },
        leaders: { select: { id: true, remoteId: true, provider: true, source: true } },
        schedules: { select: { id: true, remoteId: true, provider: true } },
      },
    });
    return planIdentityRepair(people.map((person) => ({
      id: person.id, fullName: person.fullName, sourcePeople: person.sourcePeople,
      nativeReferences: { ...person._count,
        ministryAdmin: person.ministryAdmin ? 1 : 0, preferences: person.preferences ? 1 : 0,
        localAssignments: person.assignments.filter((row) => row.source !== "SYNCED").length,
        localLeaders: person.leaders.filter((row) => row.source !== "SYNCED").length,
      },
      syncedReferences: [
        ...person.assignments.filter((row) => row.source === "SYNCED").map((row) => ({ ...row, kind: "Assignment" })),
        ...person.leaders.filter((row) => row.source === "SYNCED").map((row) => ({ ...row, kind: "Leader" })),
        ...person.schedules.map((row) => ({ ...row, kind: "Schedule" })),
      ],
    })), authoritativeLinks);
  }, { isolationLevel: "RepeatableRead", timeout: 60000, maxWait: 30000 });
}
