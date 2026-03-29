import { Prisma } from "@mt/api/prisma"
import { prisma } from "@mt/api/db"

import { fetchTeamsSnapshot, fetchSchedulesSnapshot } from "../pco.js"

export async function SyncPcoJob(): Promise<void> {
  console.log("Fetching PCO data...")

  const { people, serviceTypes, teams, leaders, positions, assignments } =
    await fetchTeamsSnapshot()

  const syncedPeople = people.map((p) => p.where.remoteId_provider!.remoteId)
  const syncedServiceTypes = serviceTypes.map(
    (s) => s.where.remoteId_provider!.remoteId
  )
  const syncedTeams = teams.map((t) => t.where.remoteId_provider!.remoteId)
  const syncedLeaders = leaders.map((l) => l.where.remoteId_provider!.remoteId)
  const syncedPositions = positions.map(
    (p) => p.where.remoteId_provider!.remoteId
  )
  const syncedAssignments = assignments.map(
    (a) => a.where.remoteId_provider!.remoteId
  )

  console.log("Updating People")

  for (const person of people) {
    await prisma.person.upsert(person)
  }

  console.log("Updating Service Types")

  for (const serviceType of serviceTypes) {
    await prisma.serviceType.upsert(serviceType)
  }

  console.log("Updating Teams")

  for (const team of teams) {
    await prisma.team.upsert(team)
  }

  console.log("Updating Team Positions")

  for (const position of positions) {
    await prisma.position.upsert(position)
  }

  console.log("Updating Team Leaders")

  for (const leader of leaders) {
    try {
      await prisma.leader.upsert(leader)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025" &&
        error.message.includes(
          "An operation failed because it depends on one or more records that were required but not found."
        )
      ) {
        console.error(
          `Leader ${leader.where.remoteId_provider?.remoteId} is missing a person or team`
        )
        continue
      } else {
        throw error
      }
    }
  }

  console.log("Updating Person Team Position Assignments")

  for (const assignment of assignments) {
    try {
      await prisma.assignment.upsert(assignment)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2025")
      ) {
        // Duplicate (personId, positionId) or missing person/position — skip
        continue
      } else {
        throw error
      }
    }
  }

  // --- Schedule sync phase (separate from team sync) ---
  console.log("Fetching PCO schedules...")

  const serviceTypeList = serviceTypes.map((s) => ({
    remoteId: s.where.remoteId_provider!.remoteId,
    name: (s.create as { name: string }).name,
  }))

  try {
    const { schedules } = await fetchSchedulesSnapshot(serviceTypeList)
    const syncedSchedules = schedules.map(
      (s) => s.upsert.where.remoteId_provider!.remoteId
    )

    console.log(`Updating ${schedules.length} Schedules`)

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
            `Schedule ${upsert.where.remoteId_provider?.remoteId} is missing a person or team`
          )
          continue
        } else {
          throw error
        }
      }

      // Sync plan times for this schedule
      const syncedPlanTimeIds: string[] = []
      for (const pt of planTimes) {
        syncedPlanTimeIds.push(pt.remoteId)
        await prisma.planTime.upsert({
          where: {
            remoteId_provider_scheduleId: {
              remoteId: pt.remoteId,
              provider: "PCO",
              scheduleId: scheduleRecord.id,
            },
          },
          create: {
            remoteId: pt.remoteId,
            provider: "PCO",
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

      // Prune stale plan times for this schedule
      if (syncedPlanTimeIds.length > 0) {
        await prisma.planTime.deleteMany({
          where: {
            scheduleId: scheduleRecord.id,
            remoteId: { notIn: syncedPlanTimeIds },
            provider: "PCO",
          },
        })
      }
    }

    // Prune stale schedules (cascade deletes plan times)
    const delStaleSchedules = await prisma.schedule.deleteMany({
      where: { remoteId: { notIn: syncedSchedules }, provider: "PCO" },
    })
    if (delStaleSchedules.count)
      console.log(`Deleted ${delStaleSchedules.count} stale schedules`)

    // Prune past schedules
    const delPastSchedules = await prisma.schedule.deleteMany({
      where: { sortDate: { lt: new Date() }, provider: "PCO" },
    })
    if (delPastSchedules.count)
      console.log(`Deleted ${delPastSchedules.count} past schedules`)
  } catch (error) {
    console.error("Schedule sync failed (team sync data preserved):", error)
  }

  // --- Schedule sync phase (separate from team sync) ---
  console.log("Fetching PCO schedules...")

  const serviceTypeList = serviceTypes.map((s) => ({
    remoteId: s.where.remoteId_provider!.remoteId,
    name: (s.create as { name: string }).name,
  }))

  try {
    const { schedules } = await fetchSchedulesSnapshot(serviceTypeList)
    const syncedSchedules = schedules.map(
      (s) => s.where.remoteId_provider!.remoteId
    )

    console.log(`Updating ${schedules.length} Schedules`)

    for (const schedule of schedules) {
      try {
        await prisma.schedule.upsert(schedule)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          console.error(
            `Schedule ${schedule.where.remoteId_provider?.remoteId} is missing a person or team`
          )
          continue
        } else {
          throw error
        }
      }
    }

    // Prune stale schedules
    const delStaleSchedules = await prisma.schedule.deleteMany({
      where: { remoteId: { notIn: syncedSchedules }, provider: "PCO" },
    })
    if (delStaleSchedules.count)
      console.log(`Deleted ${delStaleSchedules.count} stale schedules`)

    // Prune past schedules
    const delPastSchedules = await prisma.schedule.deleteMany({
      where: { sortDate: { lt: new Date() }, provider: "PCO" },
    })
    if (delPastSchedules.count)
      console.log(`Deleted ${delPastSchedules.count} past schedules`)
  } catch (error) {
    console.error("Schedule sync failed (team sync data preserved):", error)
  }

  console.log("Pruning PCO records no longer in upstream")

  const delAssignments = await prisma.assignment.deleteMany({
    where: { remoteId: { notIn: syncedAssignments }, provider: "PCO" },
  })
  if (delAssignments.count)
    console.log(`Deleted ${delAssignments.count} assignments`)

  const delLeaders = await prisma.leader.deleteMany({
    where: { remoteId: { notIn: syncedLeaders }, provider: "PCO" },
  })
  if (delLeaders.count) console.log(`Deleted ${delLeaders.count} leaders`)

  const delPositions = await prisma.position.deleteMany({
    where: { remoteId: { notIn: syncedPositions }, provider: "PCO" },
  })
  if (delPositions.count) console.log(`Deleted ${delPositions.count} positions`)

  const delTeams = await prisma.team.deleteMany({
    where: { remoteId: { notIn: syncedTeams }, provider: "PCO" },
  })
  if (delTeams.count) console.log(`Deleted ${delTeams.count} teams`)

  const delServiceTypes = await prisma.serviceType.deleteMany({
    where: { remoteId: { notIn: syncedServiceTypes }, provider: "PCO" },
  })
  if (delServiceTypes.count)
    console.log(`Deleted ${delServiceTypes.count} service types`)

  const delPeople = await prisma.person.deleteMany({
    where: { remoteId: { notIn: syncedPeople }, provider: "PCO" },
  })
  if (delPeople.count) console.log(`Deleted ${delPeople.count} people`)

  console.log("PCO data synced successfully")
}
