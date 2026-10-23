import { prisma } from "@mt/api/db"
import {
  normalizeIdentityEmail,
  normalizeIdentityPhone,
} from "@mt/api/person-identity"

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

async function syncPerson(input: SourcePersonInput) {
  return prisma.$transaction(async (tx) => {
    // Serialize person creation + source linking across workers.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(724193821)::text`
    const email = normalizeIdentityEmail(input.email)
    const phone = normalizeIdentityPhone(input.phone)
    const sourceKey = { provider: input.provider, remoteId: input.remoteId }
    const existingSource = await tx.sourcePerson.findUnique({
      where: { provider_remoteId: sourceKey },
      select: { personId: true },
    })

    let personId = existingSource?.personId

    const data = {
      displayName: input.fullName,
      fullName: input.fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone,
      image: input.image,
      isActive: true,
      archivedAt: null,
    }
    if (!personId) {
      personId = (await tx.person.create({ data, select: { id: true } })).id
    } else if (input.provider === "ROCK" || !await tx.sourcePerson.findFirst({ where: { personId, provider: "ROCK", isActive: true } })) {
      await tx.person.update({ where: { id: personId }, data })
    } else {
      // Rock owns the directory display. PCO still reactivates a person when it
      // is their only active source, without replacing Rock contact details.
      await tx.person.update({ where: { id: personId }, data: { isActive: true, archivedAt: null } })
    }

    const sourceData = {
      personId,
      email,
      phone,
      fullName: input.fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      image: input.image,
      isActive: true,
    }
    await tx.sourcePerson.upsert({
      where: { provider_remoteId: sourceKey },
      create: { ...sourceKey, ...sourceData },
      update: sourceData,
    })
    return { id: personId }
  })
}

export async function upsertRockPerson(input: SourcePersonInput) {
  return syncPerson({ ...input, provider: "ROCK" })
}

export async function upsertPcoSourcePerson(input: SourcePersonInput) {
  return syncPerson({ ...input, provider: "PCO" })
}

export async function archivePeopleWithoutActiveSources() {
  await prisma.person.updateMany({
    where: {
      sourcePeople: { some: {}, none: { isActive: true } },
    },
    data: { isActive: false, archivedAt: new Date() },
  })
}
