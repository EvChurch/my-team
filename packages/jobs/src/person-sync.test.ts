import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { reconcilePersonLinks } from "./person-reconciliation"
import { readIdentityRepairPlan } from "./identity-repair-plan"
import { prisma } from "@mt/api/db"
import { upsertPcoSourcePerson, upsertRockPerson, type SourcePersonInput } from "./person-sync"

const verifiedAccounts = vi.hoisted(() => new Map<string, string | null>())
vi.mock("@mt/api/rock-login", () => ({ findRockLoginPerson: async (subject: string) => verifiedAccounts.get(subject) ?? null }))
const noLinks = { pcoToRock: new Map<string, string>(), conflicts: 0 }
const linked = { pcoToRock: new Map([["test-pco", "test-parent"]]), conflicts: 0 }

// Integration tests only run against an explicitly designated disposable DB.
const enabled = Boolean(process.env.IDENTITY_TEST_DATABASE_URL)
if (enabled && (process.env.DATABASE_URL !== process.env.IDENTITY_TEST_DATABASE_URL || !new URL(process.env.IDENTITY_TEST_DATABASE_URL!).pathname.endsWith("_test"))) {
  throw new Error("Identity tests require matching URLs and a database name ending in _test")
}
const person: SourcePersonInput = {
  provider: "ROCK", remoteId: "test-parent", firstName: "Ryan", lastName: "Green",
  fullName: "Ryan Green", email: "ryan@example.com", phone: "0226568306", image: null,
}

describe.skipIf(!enabled)("source person sync integration", () => {
  beforeEach(async () => { await prisma.person.deleteMany(); verifiedAccounts.clear() })
  afterAll(async () => { await prisma.$disconnect() })

  it("keeps two Rock IDs separate when a family shares an email", async () => {
    const parent = await upsertRockPerson(person)
    const child = await upsertRockPerson({ ...person, remoteId: "test-child", firstName: "Owen", fullName: "Owen Green", phone: null })
    expect(child.id).not.toBe(parent.id)
    expect(await prisma.person.count()).toBe(2)
  })

  it("does not merge even identical names and contacts from different Rock IDs", async () => {
    const first = await upsertRockPerson(person)
    const second = await upsertRockPerson({ ...person, remoteId: "test-other-rock" })
    expect(second.id).not.toBe(first.id)
  })

  it("preserves a source link when contact details change and through repeated syncs", async () => {
    const original = await upsertRockPerson(person)
    const updated = await upsertRockPerson({ ...person, email: "new@example.com", phone: null })
    expect(updated.id).toBe(original.id)
    expect((await upsertRockPerson(person)).id).toBe(original.id)
    expect(await prisma.person.count()).toBe(1)
  })

  it("never links PCO through identical names or normalized contact details", async () => {
    const rock = await upsertRockPerson(person)
    const pco = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", phone: "+640226568306" })
    expect(pco.id).not.toBe(rock.id)
  })

  it("does not join a family member to the parent's PCO identity", async () => {
    const child = await upsertRockPerson({ ...person, firstName: "Owen", fullName: "Owen Green" })
    const parent = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco" })
    expect(parent.id).not.toBe(child.id)
    expect(await prisma.sourcePerson.count()).toBe(2)
  })

  it("preserves a standalone PCO record when there is no reliable Rock match", async () => {
    const first = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", email: "na@na.com", phone: null })
    const again = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", email: null, phone: null })
    expect(again.id).toBe(first.id)
    expect(await prisma.person.count()).toBe(1)
  })

  it("refuses equally plausible Rock candidates and preserves their records", async () => {
    await upsertRockPerson(person)
    await upsertRockPerson({ ...person, remoteId: "test-other-rock" })
    await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco" })
    expect(await prisma.person.count()).toBe(3)
  })

  it("handles concurrent imports atomically", async () => {
    const [rock, pco, repeated] = await Promise.all([
      upsertRockPerson(person),
      upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco" }),
      upsertRockPerson(person),
    ])
    expect(rock.id).not.toBe(pco.id)
    expect(repeated.id).toBe(rock.id)
    expect(await prisma.person.count()).toBe(2)
    expect(await prisma.sourcePerson.count()).toBe(2)
  })
  it("does not attach a new PCO account to a historically conflated person", async () => {
    const parent = await upsertRockPerson(person)
    await prisma.sourcePerson.create({ data: { ...person, remoteId: "test-child", personId: parent.id, firstName: "Owen", fullName: "Owen Green" } })
    const pco = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco" })
    expect(pco.id).not.toBe(parent.id)
  })

  it("updates standalone PCO display details without overwriting a linked Rock directory entry", async () => {
    const pco = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco" })
    await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", fullName: "Ryan Updated" })
    expect((await prisma.person.findUniqueOrThrow({ where: { id: pco.id } })).fullName).toBe("Ryan Updated")
    await upsertRockPerson(person)
    await reconcilePersonLinks(linked)
    await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", fullName: "PCO Display" })
    expect((await prisma.person.findUniqueOrThrow({ where: { id: (await prisma.sourcePerson.findUniqueOrThrow({ where: { provider_remoteId: { provider: "ROCK", remoteId: "test-parent" } } })).personId } })).fullName).toBe(person.fullName)
  })

  it("reads a repair plan without changing database records", async () => {
    const parent = await upsertRockPerson(person)
    await prisma.sourcePerson.create({ data: { ...person, remoteId: "test-child", personId: parent.id, firstName: "Owen", fullName: "Owen Green" } })
    const before = await prisma.person.findMany({ include: { sourcePeople: true } })
    const plan = await readIdentityRepairPlan(noLinks)
    expect(plan.summary.groups).toBe(1)
    expect(plan.summary.newPeople).toBe(1)
    expect(await prisma.person.findMany({ include: { sourcePeople: true } })).toEqual(before)
  })

  it("joins existing separate sources solely from the plugin and is idempotent", async () => {
    await upsertRockPerson(person)
    await upsertPcoSourcePerson({ ...person, remoteId: "test-pco", firstName: "Different", email: null, phone: null })
    expect((await reconcilePersonLinks(linked)).movedSources).toBe(1)
    expect(new Set((await prisma.sourcePerson.findMany()).map(s => s.personId)).size).toBe(1)
    expect((await reconcilePersonLinks(linked)).movedSources).toBe(0)
    // Removing the upstream link separates the providers automatically.
    expect((await reconcilePersonLinks(noLinks)).movedSources).toBe(1)
    expect(new Set((await prisma.sourcePerson.findMany()).map(s => s.personId)).size).toBe(2)
  })

  it("keeps the account with their verified Rock owner during a split", async () => {
    const owner = await upsertRockPerson(person)
    await prisma.sourcePerson.create({ data: { ...person, personId: owner.id, remoteId: "test-other" } })
    await prisma.authAccount.create({ data: { personId: owner.id, provider: "auth0", providerAccountId: "subject" } })
    verifiedAccounts.set("subject", "test-parent")
    await reconcilePersonLinks(noLinks)
    const sources = await prisma.sourcePerson.findMany()
    expect(sources.find(s => s.remoteId === "test-parent")?.personId).toBe(owner.id)
    expect(sources.find(s => s.remoteId === "test-other")?.personId).not.toBe(owner.id)
    expect((await prisma.authAccount.findFirstOrThrow()).personId).toBe(owner.id)
  })

  it("aborts atomically if native ownership cannot be proven", async () => {
    const owner = await upsertRockPerson(person)
    await prisma.sourcePerson.create({ data: { ...person, personId: owner.id, remoteId: "test-other" } })
    await prisma.authAccount.create({ data: { personId: owner.id, provider: "auth0", providerAccountId: "subject" } })
    const before = await prisma.sourcePerson.findMany()
    await expect(reconcilePersonLinks(noLinks)).rejects.toThrow("Native person ownership")
    expect(await prisma.sourcePerson.findMany()).toEqual(before)
  })

  it("waits for provenance, then repairs memberships and schedules by upstream identity", async () => {
    const parent = await upsertRockPerson(person)
    await prisma.authAccount.create({ data: { personId: parent.id, provider: "auth0", providerAccountId: "subject" } })
    verifiedAccounts.set("subject", "test-parent")
    await prisma.sourcePerson.create({ data: { ...person, personId: parent.id, remoteId: "test-child", fullName: "Same Name" } })
    const team = await prisma.team.upsert({ where: { remoteId_provider: { remoteId: "fixture-team", provider: "ROCK" } }, create: { remoteId: "fixture-team", provider: "ROCK", name: "Fixture" }, update: {} })
    const position = await prisma.position.upsert({ where: { remoteId_provider: { remoteId: "fixture-role", provider: "ROCK" } }, create: { remoteId: "fixture-role", provider: "ROCK", teamId: team.id }, update: {} })
    const assignment = await prisma.assignment.create({ data: { remoteId: "fixture-assignment", provider: "ROCK", personId: parent.id, positionId: position.id } })
    const schedule = await prisma.schedule.create({ data: { remoteId: "fixture-schedule", provider: "ROCK", personId: parent.id, personRemoteId: "test-child", teamId: team.id, serviceTypeName: "Fixture", status: "CONFIRMED", sortDate: new Date(), dates: "date", planRemoteId: "plan" } })
    expect((await reconcilePersonLinks(noLinks)).pendingReferences).toBe(1)
    expect(new Set((await prisma.sourcePerson.findMany()).map(s => s.personId)).size).toBe(1)
    await prisma.assignment.update({ where: { id: assignment.id }, data: { personRemoteId: "test-child" } })
    expect((await reconcilePersonLinks(noLinks)).movedReferences).toBe(2)
    const child = await prisma.sourcePerson.findUniqueOrThrow({ where: { provider_remoteId: { provider: "ROCK", remoteId: "test-child" } } })
    expect((await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } })).personId).toBe(child.personId)
    expect((await prisma.schedule.findUniqueOrThrow({ where: { id: schedule.id } })).personId).toBe(child.personId)
    expect((await reconcilePersonLinks(noLinks)).movedReferences).toBe(0)
  })

  it("preserves a Rock login owner when its PCO mapping is removed", async () => {
    const rock = await upsertRockPerson(person)
    await prisma.authAccount.create({ data: { personId: rock.id, provider: "auth0", providerAccountId: "subject" } })
    verifiedAccounts.set("subject", "test-parent")
    await upsertPcoSourcePerson({ ...person, remoteId: "test-pco" })
    await reconcilePersonLinks(linked)
    await reconcilePersonLinks(noLinks)
    expect((await prisma.sourcePerson.findUniqueOrThrow({ where: { provider_remoteId: { provider: "ROCK", remoteId: "test-parent" } } })).personId).toBe(rock.id)
    expect((await prisma.sourcePerson.findUniqueOrThrow({ where: { provider_remoteId: { provider: "PCO", remoteId: "test-pco" } } })).personId).not.toBe(rock.id)
  })

})
