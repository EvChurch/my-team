import { prisma } from "@mt/api/db"

export type SourcePersonInput = {
  remoteId: string
  provider: "PCO" | "ROCK"
  email: string | null
  phone: string | null
  fullName: string
  firstName: string
  lastName: string
  image: string | null
}

function normalizeEmail(email: string | null): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}

function normalizePhone(phone: string | null): string | null {
  const normalized = phone?.replace(/[^\d+]/g, "")
  return normalized || null
}

async function findUniquePersonByIdentity(input: SourcePersonInput) {
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)
  if (!email && !phone) return null

  const people = await prisma.person.findMany({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { id: true },
    take: 2,
  })

  return people.length === 1 ? people[0]! : null
}

export async function upsertRockPerson(input: SourcePersonInput) {
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)
  const existingSource = await prisma.sourcePerson.findUnique({
    where: {
      provider_remoteId: {
        provider: input.provider,
        remoteId: input.remoteId,
      },
    },
    select: { personId: true },
  })
  const identityMatch = await findUniquePersonByIdentity(input)
  const matchedPerson = existingSource
    ? { id: existingSource.personId }
    : identityMatch

  const person = matchedPerson
    ? await prisma.person.update({
        where: { id: matchedPerson.id },
        data: {
          displayName: input.fullName,
          fullName: input.fullName,
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phone,
          image: input.image,
          isActive: true,
          archivedAt: null,
        },
        select: { id: true },
      })
    : await prisma.person.create({
        data: {
          displayName: input.fullName,
          fullName: input.fullName,
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phone,
          image: input.image,
        },
        select: { id: true },
      })

  await prisma.sourcePerson.upsert({
    where: {
      provider_remoteId: {
        provider: input.provider,
        remoteId: input.remoteId,
      },
    },
    create: {
      personId: person.id,
      provider: input.provider,
      remoteId: input.remoteId,
      email,
      phone,
      fullName: input.fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      image: input.image,
      isActive: true,
    },
    update: {
      personId: person.id,
      email,
      phone,
      fullName: input.fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      image: input.image,
      isActive: true,
    },
  })

  return person
}

export async function upsertPcoSourcePerson(input: SourcePersonInput) {
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)
  const existingSource = await prisma.sourcePerson.findUnique({
    where: {
      provider_remoteId: {
        provider: input.provider,
        remoteId: input.remoteId,
      },
    },
    select: { personId: true },
  })
  const identityMatch = await findUniquePersonByIdentity(input)
  const matchedPerson = existingSource
    ? { id: existingSource.personId }
    : identityMatch
  if (!matchedPerson) return null

  await prisma.sourcePerson.upsert({
    where: {
      provider_remoteId: {
        provider: input.provider,
        remoteId: input.remoteId,
      },
    },
    create: {
      personId: matchedPerson.id,
      provider: input.provider,
      remoteId: input.remoteId,
      email,
      phone,
      fullName: input.fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      image: input.image,
      isActive: true,
    },
    update: {
      personId: matchedPerson.id,
      email,
      phone,
      fullName: input.fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      image: input.image,
      isActive: true,
    },
  })

  return matchedPerson
}

export async function archivePeopleWithoutActiveSources() {
  const people = await prisma.person.findMany({
    select: {
      id: true,
      sourcePeople: {
        select: { isActive: true },
      },
    },
  })

  const inactivePersonIds = people
    .filter(
      (person) =>
        person.sourcePeople.length > 0 &&
        person.sourcePeople.every((sourcePerson) => !sourcePerson.isActive)
    )
    .map((person) => person.id)

  if (inactivePersonIds.length === 0) return

  await prisma.person.updateMany({
    where: { id: { in: inactivePersonIds } },
    data: { isActive: false, archivedAt: new Date() },
  })
}
