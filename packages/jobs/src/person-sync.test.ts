import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { readIdentityRepairPlan } from "./identity-repair-plan"
import { linkVerifiedPcoAccount } from "@mt/api/account-link"
import { prisma } from "@mt/api/db"
import { upsertPcoSourcePerson, upsertRockPerson, type SourcePersonInput } from "./person-sync"

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
  beforeEach(async () => { await prisma.person.deleteMany() })
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

  it("links PCO with corroborating names and normalized phone evidence", async () => {
    const rock = await upsertRockPerson(person)
    const pco = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", phone: "+640226568306" })
    expect(pco.id).toBe(rock.id)
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
    expect(rock.id).toBe(pco.id)
    expect(repeated.id).toBe(rock.id)
    expect(await prisma.person.count()).toBe(1)
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
    await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", fullName: "PCO Display" })
    expect((await prisma.person.findUniqueOrThrow({ where: { id: pco.id } })).fullName).toBe(person.fullName)
  })

  it("uses a proved PCO source ID for shared-email recovery and refuses reassignment", async () => {
    const parent = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco-parent" })
    const child = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco-child", firstName: "Owen", fullName: "Owen Green" })
    expect(await linkVerifiedPcoAccount("auth0|child", "test-pco-child", person.email)).toBe(child.id)
    await expect(linkVerifiedPcoAccount("auth0|child", "test-pco-parent", person.email)).rejects.toThrow("already linked")
    expect((await prisma.authAccount.findFirstOrThrow()).personId).toBe(child.id)
    expect(parent.id).not.toBe(child.id)
  })

  it("refuses recovery onto inactive or historically conflated sources", async () => {
    const parent = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco" })
    await prisma.sourcePerson.updateMany({ data: { isActive: false } })
    await expect(linkVerifiedPcoAccount("auth0|new", "test-pco", person.email)).rejects.toThrow("unavailable")
    await prisma.sourcePerson.updateMany({ data: { isActive: true } })
    await prisma.sourcePerson.create({ data: { ...person, remoteId: "test-rock", personId: parent.id, firstName: "Owen", fullName: "Owen Green" } })
    await expect(linkVerifiedPcoAccount("auth0|new", "test-pco", person.email)).rejects.toThrow("unavailable")
    expect(await prisma.authAccount.count()).toBe(0)
  })

  it("reads a repair plan without changing database records", async () => {
    const parent = await upsertRockPerson(person)
    await prisma.sourcePerson.create({ data: { ...person, remoteId: "test-child", personId: parent.id, firstName: "Owen", fullName: "Owen Green" } })
    const before = await prisma.person.findMany({ include: { sourcePeople: true } })
    const plan = await readIdentityRepairPlan()
    expect(plan.summary.groups).toBe(1)
    expect(plan.summary.newPeople).toBe(1)
    expect(await prisma.person.findMany({ include: { sourcePeople: true } })).toEqual(before)
  })

  it("accepts a proved standalone PCO identity without requiring a surname", async () => {
    const pco = await upsertPcoSourcePerson({ ...person, provider: "PCO", remoteId: "test-pco", lastName: "" })
    expect(await linkVerifiedPcoAccount("auth0|new", "test-pco", person.email)).toBe(pco.id)
  })

})
