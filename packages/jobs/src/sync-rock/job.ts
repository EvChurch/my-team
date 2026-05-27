import { Prisma } from "@mt/api/prisma"
import { prisma } from "@mt/api/db"

import { fetchRockSchedulesSnapshot, fetchRockTeamsSnapshot } from "../rock.js"

export async function SyncRockJob(): Promise<void> {
  console.log("Fetching Rock data...")

  const { people, teams, positions, assignments, leaders } =
    await fetchRockTeamsSnapshot()

  const syncedPeople = new Set(
    people.map((p) => p.where.remoteId_provider!.remoteId)
  )
  const syncedTeams = teams.map((t) => t.where.remoteId_provider!.remoteId)
  const syncedPositions = positions.map(
    (p) => p.where.remoteId_provider!.remoteId
  )
  const syncedAssignments = assignments.map(
    (a) => a.where.remoteId_provider!.remoteId
  )
  const syncedLeaders = leaders.map((l) => l.where.remoteId_provider!.remoteId)

  console.log(`Updating ${people.length} Rock people`)
  for (const person of people) {
    await prisma.person.upsert(person)
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
    try {
      await prisma.leader.upsert(leader)
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
    try {
      await prisma.assignment.upsert(assignment)
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

  console.log("Fetching Rock schedules...")
  try {
    const { people: schedulePeople, schedules } =
      await fetchRockSchedulesSnapshot(syncedTeams)
    const syncedSchedules = schedules.map(
      (s) => s.upsert.where.remoteId_provider!.remoteId
    )

    console.log(`Updating ${schedulePeople.length} Rock schedule people`)
    for (const person of schedulePeople) {
      syncedPeople.add(person.where.remoteId_provider!.remoteId)
      await prisma.person.upsert(person)
    }

    console.log(`Updating ${schedules.length} Rock schedules`)
    for (const { upsert, planTimes } of schedules) {
      let scheduleRecord: { id: string }
      try {
        scheduleRecord = await prisma.schedule.upsert(upsert)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          console.error(
            `Rock schedule ${upsert.where.remoteId_provider?.remoteId} is missing a person or team`
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
    where: { provider: "ROCK", remoteId: { notIn: syncedAssignments } },
  })
  await prisma.leader.deleteMany({
    where: { provider: "ROCK", remoteId: { notIn: syncedLeaders } },
  })
  await prisma.position.deleteMany({
    where: { provider: "ROCK", remoteId: { notIn: syncedPositions } },
  })
  await prisma.team.deleteMany({
    where: { provider: "ROCK", remoteId: { notIn: syncedTeams } },
  })
  await prisma.person.deleteMany({
    where: { provider: "ROCK", remoteId: { notIn: [...syncedPeople] } },
  })

  console.log("Rock data synced successfully")
}
