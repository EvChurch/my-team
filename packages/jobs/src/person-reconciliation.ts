import { prisma } from "@mt/api/db"
import { findRockLoginPerson } from "@mt/api/rock-login"
import type { PersonLinks } from "./rock-person-links.js"

export function identityKey(provider: string, remoteId: string, links: PersonLinks, rockIds: Set<string>): string {
  const rockId = provider === "PCO" ? links.pcoToRock.get(remoteId) : remoteId
  return rockId && rockIds.has(rockId) ? `ROCK:${rockId}` : `${provider}:${remoteId}`
}

/** Called only while holding the complete-sync lock. Account/native ownership is never inferred from display data. */
export async function reconcilePersonLinks(links: PersonLinks) {
  const accounts = await prisma.authAccount.findMany()
  const accountRockIds = new Map<string, string | null>()
  for (const account of accounts) {
    if (account.provider !== "auth0") throw new Error("Unsupported account ownership provider")
    accountRockIds.set(account.providerAccountId, await findRockLoginPerson(account.providerAccountId))
  }
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(724193821)::text`
    const people = await tx.person.findMany({ include: { sourcePeople: true, authAccounts: true, ministryAdmin: true, preferences: true,
      _count: { select: { goalsOwned: true, goalsReviewed: true, feedbackAuthored: true, feedbackReceived: true, guidesAuthored: true,
        trainingModulesAuthored: true, trainingCompletions: true, trainingQuizAttempts: true, trainingScopeOwnerships: true } } } })
    const sources = people.flatMap(p => p.sourcePeople)
    const rockIds = new Set(sources.filter(s => s.provider === "ROCK").map(s => s.remoteId))
    const keyOf = (source: { provider: string; remoteId: string }) => identityKey(source.provider, source.remoteId, links, rockIds)
    const groups = new Map<string, typeof sources>()
    for (const source of sources) groups.set(keyOf(source), [...(groups.get(keyOf(source)) ?? []), source])
    const assignments = await tx.assignment.findMany()
    const leaders = await tx.leader.findMany()
    const schedules = await tx.schedule.findMany()
    const chosen = new Map<string, string>()
    const reserved = new Set<string>()
    // Establish all native owners first, before allocating reusable empty directory IDs.
    for (const person of people) {
      const keys = new Set(person.sourcePeople.map(keyOf))
      if (!keys.size) continue
      const native = person.authAccounts.length || person.ministryAdmin || person.preferences || Object.values(person._count).some(Boolean)
        || assignments.some(a => a.personId === person.id && a.source !== "SYNCED") || leaders.some(l => l.personId === person.id && l.source !== "SYNCED")
      if (!native) continue
      let key: string | undefined
      if (keys.size === 1) key = [...keys][0]
      else if (person.authAccounts.length) {
        const owners = new Set(person.authAccounts.map(a => accountRockIds.get(a.providerAccountId)))
        const id = [...owners][0]
        if (owners.size === 1 && id && keys.has(`ROCK:${id}`)) key = `ROCK:${id}`
      }

      if (!key || (chosen.has(key) && chosen.get(key) !== person.id)) throw new Error("Native person ownership requires authoritative evidence; no changes applied")
      chosen.set(key, person.id)
      reserved.add(person.id)
    }
    for (const [key, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
      if (chosen.has(key)) continue
      const reusable = [...new Set(group.map(s => s.personId))].sort().find(id => !reserved.has(id))
      if (reusable) { chosen.set(key, reusable); reserved.add(reusable) }
    }
    const changedPeople = new Set(sources.filter(s => !chosen.has(keyOf(s)) || chosen.get(keyOf(s)) !== s.personId).map(s => s.personId))
    const refs = [...assignments.filter(a => a.source === "SYNCED"), ...leaders.filter(l => l.source === "SYNCED"), ...schedules]
    const unresolved = refs.filter(r => changedPeople.has(r.personId) && (!r.personRemoteId || !sources.some(s => s.provider === r.provider && s.remoteId === r.personRemoteId)))
    if (unresolved.length) return { movedSources: 0, movedReferences: 0, pendingReferences: unresolved.length, conflicts: links.conflicts }
    let movedSources = 0
    for (const [key, group] of groups) {
      const primary = group.find(s => s.provider === "ROCK" && s.isActive) ?? group.find(s => s.isActive) ?? group[0]!
      const data = { displayName: primary.fullName, fullName: primary.fullName, firstName: primary.firstName, lastName: primary.lastName,
        email: primary.email, phone: primary.phone, image: primary.image, isActive: group.some(s => s.isActive), archivedAt: group.some(s => s.isActive) ? null : new Date() }
      let personId = chosen.get(key)
      if (!personId) {
        personId = (await tx.person.create({ data })).id
        chosen.set(key, personId)
      } else await tx.person.update({ where: { id: personId }, data })
      for (const source of group) if (source.personId !== personId) {
        await tx.sourcePerson.update({ where: { id: source.id }, data: { personId } })
        movedSources++
      }
    }
    const destination = (row: { personRemoteId: string | null; provider: string; personId: string }) => {
      if (!row.personRemoteId) return row.personId
      const id = chosen.get(keyOf({ provider: row.provider, remoteId: row.personRemoteId }))
      if (!id) throw new Error("Synced reference has no source identity")
      return id
    }
    let movedReferences = 0
    // Recreate changed memberships in two phases to avoid transient unique-key collisions during swaps.
    const changedAssignments = assignments.filter(a => a.source === "SYNCED" && destination(a) !== a.personId)
    const changedLeaders = leaders.filter(l => l.source === "SYNCED" && destination(l) !== l.personId)
    await tx.assignment.deleteMany({ where: { id: { in: changedAssignments.map(a => a.id) } } })
    await tx.leader.deleteMany({ where: { id: { in: changedLeaders.map(l => l.id) } } })
    for (const row of changedAssignments) {
      const personId = destination(row)
      const duplicate = await tx.assignment.findUnique({ where: { personId_positionId_source: { personId, positionId: row.positionId, source: row.source } } })
      if (duplicate && (duplicate.provider !== row.provider || duplicate.source !== "SYNCED")) throw new Error("Conflicting membership provenance")
      if (!duplicate) await tx.assignment.create({ data: { ...row, personId } })
      movedReferences++
    }
    for (const row of changedLeaders) {
      const personId = destination(row)
      const duplicate = await tx.leader.findUnique({ where: { personId_teamId_source: { personId, teamId: row.teamId, source: row.source } } })
      if (duplicate && (duplicate.provider !== row.provider || duplicate.source !== "SYNCED")) throw new Error("Conflicting leader provenance")
      if (!duplicate) await tx.leader.create({ data: { ...row, personId } })
      movedReferences++
    }
    for (const row of schedules) if (destination(row) !== row.personId) {
      await tx.schedule.update({ where: { id: row.id }, data: { personId: destination(row) } })
      movedReferences++
    }
    await tx.person.updateMany({ where: { id: { in: people.filter(p => p.sourcePeople.length).map(p => p.id) }, sourcePeople: { none: {} } }, data: { isActive: false, archivedAt: new Date() } })
    return { movedSources, movedReferences, pendingReferences: 0, conflicts: links.conflicts }
  }, { isolationLevel: "Serializable", timeout: 90000, maxWait: 30000 })
}
