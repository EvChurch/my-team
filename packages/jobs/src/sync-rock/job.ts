import { Prisma } from "@mt/api/prisma"
import { prisma } from "@mt/api/db"

import { fetchRockSchedulesSnapshot, fetchRockTeamsSnapshot } from "../rock.js"
import {
  archivePeopleWithoutActiveSources,
  upsertRockPerson,
} from "../person-sync.js"

export async function SyncRockJob(): Promise<void> {
  console.log("Fetching Rock data...")

  const { people, teams, positions, assignments, leaders, hierarchy } =
    await fetchRockTeamsSnapshot()

  const syncedPeople = new Set(people.map((p) => p.remoteId))
  const syncedTeams = teams.map((t) => t.where.remoteId_provider!.remoteId)
  const syncedPositions = positions.map(
    (p) => p.where.remoteId_provider!.remoteId
  )
  const syncedAssignments = assignments.map((a) => a.remoteId)
  const syncedLeaders = leaders.map((l) => l.remoteId)

  console.log(`Updating ${people.length} Rock people`)
  const personIdsByRemoteId = new Map<string, string>()
  for (const person of people) {
    const canonicalPerson = await upsertRockPerson(person)
    personIdsByRemoteId.set(person.remoteId, canonicalPerson.id)
  }

  console.log(`Updating ${teams.length} Rock teams`)
  for (const team of teams) {
    await prisma.team.upsert(team)
  }

  console.log(`Updating ${positions.length} Rock positions`)
  for (const position of positions) {
    await prisma.position.upsert(position)
  }

  console.log(`Updating ${leaders.length} Rock leaders`)
  for (const leader of leaders) {
    const personId = personIdsByRemoteId.get(leader.personRemoteId)
    if (!personId) continue
    try {
      await prisma.leader.upsert({
        where: {
          remoteId_provider: {
            remoteId: leader.remoteId,
            provider: "ROCK",
          },
        },
        create: {
          remoteId: leader.remoteId,
          provider: "ROCK",
          person: { connect: { id: personId } },
          team: {
            connect: {
              remoteId_provider: {
                remoteId: leader.teamRemoteId,
                provider: "ROCK",
              },
            },
          },
        },
        update: {
          person: { connect: { id: personId } },
          team: {
            connect: {
              remoteId_provider: {
                remoteId: leader.teamRemoteId,
                provider: "ROCK",
              },
            },
          },
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2025")
      ) {
        continue
      }
      throw error
    }
  }

  console.log(`Updating ${assignments.length} Rock assignments`)
  for (const assignment of assignments) {
    const personId = personIdsByRemoteId.get(assignment.personRemoteId)
    if (!personId) continue
    try {
      await prisma.assignment.upsert({
        where: {
          remoteId_provider: {
            remoteId: assignment.remoteId,
            provider: "ROCK",
          },
        },
        create: {
          remoteId: assignment.remoteId,
          provider: "ROCK",
          person: { connect: { id: personId } },
          position: {
            connect: {
              remoteId_provider: {
                remoteId: assignment.positionRemoteId,
                provider: "ROCK",
              },
            },
          },
        },
        update: {
          person: { connect: { id: personId } },
          position: {
            connect: {
              remoteId_provider: {
                remoteId: assignment.positionRemoteId,
                provider: "ROCK",
              },
            },
          },
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2025")
      ) {
        continue
      }
      throw error
    }
  }

  console.log(`Updating ${hierarchy.teams.length} Rock hierarchy teams`)
  const churchTeam = await prisma.team.upsert({
    where: {
      remoteId_provider: {
        remoteId: "church",
        provider: "ROCK",
      },
    },
    create: {
      remoteId: "church",
      provider: "ROCK",
      kind: "CHURCH",
      name: "Church",
      sortOrder: 0,
      isActive: true,
    },
    update: {
      kind: "CHURCH",
      name: "Church",
      isActive: true,
    },
    select: { id: true },
  })
  syncedTeams.push("church")

  const teamIdsByRemoteId = new Map<string, string>()
  const syncedPcoTeamSources = new Set<string>()
  for (const hierarchyTeam of hierarchy.teams) {
    const record = await prisma.team.findUnique({
      where: {
        remoteId_provider: {
          remoteId: hierarchyTeam.remoteId,
          provider: "ROCK",
        },
      },
      select: { id: true },
    })
    if (!record) continue
    teamIdsByRemoteId.set(hierarchyTeam.remoteId, record.id)

    await prisma.teamSource.upsert({
      where: {
        provider_remoteId: {
          provider: "ROCK",
          remoteId: hierarchyTeam.remoteId,
        },
      },
      create: {
        teamId: record.id,
        provider: "ROCK",
        remoteId: hierarchyTeam.remoteId,
        parentRemoteId: hierarchyTeam.parentRemoteId,
        sourceGroupTypeId: hierarchyTeam.sourceGroupTypeId,
        sourceName: hierarchyTeam.name,
        sourceSnapshot: hierarchyTeam.sourceSnapshot,
      },
      update: {
        teamId: record.id,
        parentRemoteId: hierarchyTeam.parentRemoteId,
        sourceGroupTypeId: hierarchyTeam.sourceGroupTypeId,
        sourceName: hierarchyTeam.name,
        sourceSnapshot: hierarchyTeam.sourceSnapshot,
      },
    })

    for (const pcoTeamRemoteId of hierarchyTeam.linkedPcoTeamRemoteIds) {
      syncedPcoTeamSources.add(pcoTeamRemoteId)
      await prisma.teamSource.upsert({
        where: {
          provider_remoteId: {
            provider: "PCO",
            remoteId: pcoTeamRemoteId,
          },
        },
        create: {
          teamId: record.id,
          provider: "PCO",
          remoteId: pcoTeamRemoteId,
          parentRemoteId: null,
          sourceGroupTypeId: null,
          sourceName: hierarchyTeam.name,
          sourceSnapshot: {
            linkedFromRockRemoteId: hierarchyTeam.remoteId,
          },
        },
        update: {
          teamId: record.id,
          parentRemoteId: null,
          sourceGroupTypeId: null,
          sourceName: hierarchyTeam.name,
          sourceSnapshot: {
            linkedFromRockRemoteId: hierarchyTeam.remoteId,
          },
        },
      })
    }
  }

  for (const hierarchyTeam of hierarchy.teams) {
    const teamId = teamIdsByRemoteId.get(hierarchyTeam.remoteId)
    if (!teamId) continue

    await prisma.team.update({
      where: { id: teamId },
      data: {
        parentTeamId: hierarchyTeam.parentRemoteId
          ? (teamIdsByRemoteId.get(hierarchyTeam.parentRemoteId) ??
            churchTeam.id)
          : churchTeam.id,
      },
    })
  }

  console.log("Fetching Rock schedules...")
  try {
    const { people: schedulePeople, schedules } =
      await fetchRockSchedulesSnapshot(syncedTeams)
    const syncedSchedules = schedules.map(
      (s) => s.upsert.where.remoteId_provider!.remoteId
    )

    console.log(`Updating ${schedulePeople.length} Rock schedule people`)
    for (const person of schedulePeople) {
      syncedPeople.add(person.remoteId)
      const canonicalPerson = await upsertRockPerson(person)
      personIdsByRemoteId.set(person.remoteId, canonicalPerson.id)
    }

    console.log(`Updating ${schedules.length} Rock schedules`)
    for (const { upsert, planTimes } of schedules) {
      const remotePersonId = (
        upsert.create as {
          person?: {
            connect?: {
              remoteId_provider?: { remoteId?: string }
            }
          }
        }
      ).person?.connect?.remoteId_provider?.remoteId
      const personId = remotePersonId
        ? personIdsByRemoteId.get(remotePersonId)
        : null
      if (!personId) continue
      const { person: _createPerson, ...createWithoutSourcePerson } =
        upsert.create
      const { person: _updatePerson, ...updateWithoutSourcePerson } =
        upsert.update
      const scheduleUpsert = {
        ...upsert,
        create: {
          ...createWithoutSourcePerson,
          person: { connect: { id: personId } },
        },
        update: {
          ...updateWithoutSourcePerson,
          person: { connect: { id: personId } },
        },
      }
      let scheduleRecord: { id: string }
      try {
        scheduleRecord = await prisma.schedule.upsert(scheduleUpsert)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          console.error(
            `Rock schedule ${scheduleUpsert.where.remoteId_provider?.remoteId} is missing a person or team`
          )
          continue
        }
        throw error
      }

      const syncedPlanTimeIds: string[] = []
      for (const pt of planTimes) {
        syncedPlanTimeIds.push(pt.remoteId)
        await prisma.planTime.upsert({
          where: {
            remoteId_provider_scheduleId: {
              remoteId: pt.remoteId,
              provider: "ROCK",
              scheduleId: scheduleRecord.id,
            },
          },
          create: {
            remoteId: pt.remoteId,
            provider: "ROCK",
            scheduleId: scheduleRecord.id,
            name: pt.name,
            timeType: pt.timeType,
            startsAt: pt.startsAt,
            endsAt: pt.endsAt,
          },
          update: {
            name: pt.name,
            timeType: pt.timeType,
            startsAt: pt.startsAt,
            endsAt: pt.endsAt,
          },
        })
      }

      await prisma.planTime.deleteMany({
        where: {
          scheduleId: scheduleRecord.id,
          provider: "ROCK",
          remoteId: { notIn: syncedPlanTimeIds },
        },
      })
    }

    await prisma.schedule.deleteMany({
      where: { provider: "ROCK", remoteId: { notIn: syncedSchedules } },
    })
    await prisma.schedule.deleteMany({
      where: { provider: "ROCK", sortDate: { lt: new Date() } },
    })
  } catch (error) {
    console.error("Rock schedule sync failed (team sync data preserved):", error)
  }

  console.log("Pruning Rock records no longer in upstream")

  await prisma.assignment.deleteMany({
    where: {
      provider: "ROCK",
      source: "SYNCED",
      remoteId: { notIn: syncedAssignments },
    },
  })
  await prisma.leader.deleteMany({
    where: {
      provider: "ROCK",
      source: "SYNCED",
      remoteId: { notIn: syncedLeaders },
    },
  })
  await prisma.position.deleteMany({
    where: {
      provider: "ROCK",
      source: "SYNCED",
      remoteId: { notIn: syncedPositions },
    },
  })
  await prisma.team.deleteMany({
    where: { provider: "ROCK", remoteId: { notIn: syncedTeams } },
  })
  await prisma.sourcePerson.updateMany({
    where: { provider: "ROCK", remoteId: { notIn: [...syncedPeople] } },
    data: { isActive: false },
  })
  await prisma.teamSource.deleteMany({
    where: {
      provider: "ROCK",
      remoteId: { notIn: hierarchy.teams.map((team) => team.remoteId) },
    },
  })
  await prisma.teamSource.deleteMany({
    where: {
      provider: "PCO",
      remoteId: { notIn: [...syncedPcoTeamSources] },
    },
  })
  await prisma.team.updateMany({
    where: {
      provider: "ROCK",
      kind: { not: "CHURCH" },
      remoteId: { notIn: hierarchy.teams.map((team) => team.remoteId) },
    },
    data: { isActive: false, parentTeamId: null },
  })

  await archivePeopleWithoutActiveSources()

  console.log("Rock data synced successfully")
}
