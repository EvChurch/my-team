import { z } from "zod"

import type { Prisma, ScheduleStatus } from "@mt/api/prisma"
import { fetchPCO } from "@mt/api/pco"

const PCO_TEAMS_PAGE_SIZE = 25

const serviceTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .passthrough()

const personSchema = z
  .object({
    id: z.string(),
    full_name: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    photo_thumbnail_url: z.string().nullable().optional(),
  })
  .passthrough()

const emailSchema = z
  .object({
    address: z.string(),
    blocked: z.boolean().nullable().optional(),
    primary: z.boolean().nullable().optional(),
  })
  .passthrough()

const emailsPayloadSchema = z.array(emailSchema)

const teamPositionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    team: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough()

const assignmentSchema = z
  .object({
    id: z.string(),
    person: z.object({ id: z.string() }).passthrough(),
    team_position: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough()

const teamLeaderSchema = z
  .object({
    id: z.string(),
    team: z.object({ id: z.string() }).passthrough(),
    person: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough()

const teamSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    service_type: serviceTypeSchema.nullable(),
    people: z.array(personSchema),
    team_positions: z.array(teamPositionSchema),
    person_team_position_assignments: z.array(assignmentSchema),
    team_leaders: z.array(teamLeaderSchema),
  })
  .passthrough()

const teamsPayloadSchema = z.array(teamSchema)

export type TeamsSnapshot = {
  serviceTypes: Prisma.ServiceTypeUpsertArgs[]
  teams: Prisma.TeamUpsertArgs[]
  people: Prisma.PersonUpsertArgs[]
  leaders: Prisma.LeaderUpsertArgs[]
  positions: Prisma.PositionUpsertArgs[]
  assignments: Prisma.AssignmentUpsertArgs[]
}

async function fetchPrimaryEmail(personId: string): Promise<string | null> {
  try {
    const rawResponse = await fetchPCO(`/people/v2/people/${personId}/emails`)
    const response = emailsPayloadSchema.safeParse(rawResponse)
    if (!response.success) {
      console.error(
        `Invalid emails payload from PCO for person ${personId}: ${response.error.message}`
      )
      return null
    }

    const availableEmails = response.data.filter((email) => !email.blocked)
    return (
      availableEmails.find((email) => email.primary)?.address ??
      availableEmails[0]?.address ??
      null
    )
  } catch (error) {
    console.error(`Failed to fetch PCO email for person ${personId}:`, error)
    return null
  }
}

export async function fetchTeamsSnapshot(): Promise<TeamsSnapshot> {
  const include =
    "people,person_team_position_assignments,service_types,team_leaders,team_positions"
  const serviceTypes = new Map<string, Prisma.ServiceTypeUpsertArgs>()
  const teams = new Map<string, Prisma.TeamUpsertArgs>()
  const people = new Map<string, Prisma.PersonUpsertArgs>()
  const leaders = new Map<string, Prisma.LeaderUpsertArgs>()
  const positions = new Map<string, Prisma.PositionUpsertArgs>()
  const assignments = new Map<string, Prisma.AssignmentUpsertArgs>()
  const personEmails = new Map<string, string | null>()
  let offset = 0

  while (true) {
    console.log(`Fetching teams from PCO... (offset: ${offset})`)

    const params = new URLSearchParams({ include })
    if (offset > 0) params.set("offset", String(offset))
    const rawResponse = await fetchPCO(
      `/services/v2/teams?${params.toString()}`
    )
    const response = teamsPayloadSchema.safeParse(rawResponse)
    if (!response.success) {
      console.error(response.error.message)
      throw new Error(
        `Invalid teams payload from PCO: ${response.error.message}`
      )
    }

    const teamModels = response.data

    if (teamModels.length === 0) break

    for (const team of teamModels) {
      if (team.service_type) {
        serviceTypes.set(team.service_type.id, {
          where: {
            remoteId_provider: {
              remoteId: team.service_type.id,
              provider: "PCO",
            },
          },
          create: {
            name: team.service_type.name,
            remoteId: team.service_type.id,
            provider: "PCO",
          },
          update: {
            name: team.service_type.name,
          },
        })
      }

      teams.set(team.id, {
        where: {
          remoteId_provider: {
            remoteId: team.id,
            provider: "PCO",
          },
        },
        create: {
          remoteId: team.id,
          provider: "PCO",
          name: team.name,
          serviceType: team.service_type
            ? {
                connect: {
                  remoteId_provider: {
                    remoteId: team.service_type.id,
                    provider: "PCO",
                  },
                },
              }
            : undefined,
        },
        update: {
          name: team.name,
          serviceType: team.service_type
            ? {
                connect: {
                  remoteId_provider: {
                    remoteId: team.service_type.id,
                    provider: "PCO",
                  },
                },
              }
            : undefined,
        },
      })

      for (const person of team.people) {
        if (!personEmails.has(person.id)) {
          personEmails.set(person.id, await fetchPrimaryEmail(person.id))
        }
        const email = personEmails.get(person.id) ?? null

        people.set(person.id, {
          where: {
            remoteId_provider: { remoteId: person.id, provider: "PCO" },
          },
          create: {
            remoteId: person.id,
            provider: "PCO",
            email,
            fullName: person.full_name,
            firstName: person.first_name,
            lastName: person.last_name,
            image: person.photo_thumbnail_url ?? null,
          },
          update: {
            email,
            fullName: person.full_name,
            firstName: person.first_name,
            lastName: person.last_name,
            image: person.photo_thumbnail_url ?? null,
          },
        })
      }

      for (const position of team.team_positions) {
        positions.set(position.id, {
          where: {
            remoteId_provider: { remoteId: position.id, provider: "PCO" },
          },
          create: {
            remoteId: position.id,
            provider: "PCO",
            team: {
              connect: {
                remoteId_provider: {
                  remoteId: position.team.id,
                  provider: "PCO",
                },
              },
            },
            name: position.name,
          },
          update: {
            team: {
              connect: {
                remoteId_provider: {
                  remoteId: position.team.id,
                  provider: "PCO",
                },
              },
            },
            name: position.name,
          },
        })
      }

      for (const leader of team.team_leaders) {
        leaders.set(leader.id, {
          where: {
            remoteId_provider: {
              remoteId: leader.id,
              provider: "PCO",
            },
          },
          create: {
            remoteId: leader.id,
            provider: "PCO",
            person: {
              connect: {
                remoteId_provider: {
                  remoteId: leader.person.id,
                  provider: "PCO",
                },
              },
            },
            team: {
              connect: {
                remoteId_provider: {
                  remoteId: leader.team.id,
                  provider: "PCO",
                },
              },
            },
          },
          update: {
            team: {
              connect: {
                remoteId_provider: {
                  remoteId: leader.team.id,
                  provider: "PCO",
                },
              },
            },
            person: {
              connect: {
                remoteId_provider: {
                  remoteId: leader.person.id,
                  provider: "PCO",
                },
              },
            },
          },
        })
      }

      for (const assignment of team.person_team_position_assignments) {
        assignments.set(assignment.id, {
          where: {
            remoteId_provider: {
              remoteId: assignment.id,
              provider: "PCO",
            },
          },
          create: {
            remoteId: assignment.id,
            provider: "PCO",
            person: {
              connect: {
                remoteId_provider: {
                  remoteId: assignment.person.id,
                  provider: "PCO",
                },
              },
            },
            position: {
              connect: {
                remoteId_provider: {
                  remoteId: assignment.team_position.id,
                  provider: "PCO",
                },
              },
            },
          },
          update: {
            person: {
              connect: {
                remoteId_provider: {
                  remoteId: assignment.person.id,
                  provider: "PCO",
                },
              },
            },
            position: {
              connect: {
                remoteId_provider: {
                  remoteId: assignment.team_position.id,
                  provider: "PCO",
                },
              },
            },
          },
        })
      }
    }
    if (teamModels.length < PCO_TEAMS_PAGE_SIZE) break
    offset += PCO_TEAMS_PAGE_SIZE
  }

  return {
    serviceTypes: [...serviceTypes.values()],
    teams: [...teams.values()],
    people: [...people.values()],
    leaders: [...leaders.values()],
    positions: [...positions.values()],
    assignments: [...assignments.values()],
  }
}

// --- Schedule fetching ---

const planTimeSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    time_type: z.string().nullable().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
  })
  .passthrough()

const planSchema = z
  .object({
    id: z.string(),
    sort_date: z.string().nullable().optional(),
    dates: z.string().nullable().optional(),
    plan_times: z.array(planTimeSchema).optional().default([]),
  })
  .passthrough()

const plansPayloadSchema = z.array(planSchema)

const teamMemberSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    team_position_name: z.string().nullable().optional(),
    person: z.object({ id: z.string() }).passthrough().nullable().optional(),
    team: z.object({ id: z.string() }).passthrough().nullable().optional(),
  })
  .passthrough()

const teamMembersPayloadSchema = z.array(teamMemberSchema)

const PCO_STATUS_MAP: Record<string, ScheduleStatus> = {
  C: "CONFIRMED",
  Confirmed: "CONFIRMED",
  U: "UNCONFIRMED",
  Unconfirmed: "UNCONFIRMED",
  D: "DECLINED",
  Declined: "DECLINED",
}

type PlanTimeData = {
  remoteId: string
  name: string | null
  timeType: string | null
  startsAt: Date | null
  endsAt: Date | null
}

export type ScheduleData = {
  upsert: Prisma.ScheduleUpsertArgs
  planTimes: PlanTimeData[]
}

export type SchedulesSnapshot = {
  schedules: ScheduleData[]
}

function findServiceTime(
  planTimes: z.infer<typeof planTimeSchema>[],
  sortDate: string
): { startsAt: string | null; endsAt: string | null } {
  // Prefer plan_time with time_type "service" (case-insensitive)
  const serviceTime = planTimes.find(
    (pt) => pt.time_type?.toLowerCase() === "service"
  )
  if (serviceTime?.starts_at) {
    return { startsAt: serviceTime.starts_at, endsAt: serviceTime.ends_at ?? null }
  }

  // Fallback: pick the plan_time closest to sortDate (same day or latest)
  const sortDay = new Date(sortDate).toISOString().slice(0, 10)
  const sameDayTimes = planTimes.filter(
    (pt) => pt.starts_at && new Date(pt.starts_at).toISOString().slice(0, 10) === sortDay
  )
  if (sameDayTimes.length > 0) {
    // Pick the latest start on the sort date day (likely the actual service)
    const latest = sameDayTimes.sort(
      (a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime()
    )[0]!
    return { startsAt: latest.starts_at!, endsAt: latest.ends_at ?? null }
  }

  // Last resort: latest plan_time overall
  const withStarts = planTimes.filter((pt) => pt.starts_at)
  if (withStarts.length > 0) {
    const latest = withStarts.sort(
      (a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime()
    )[0]!
    return { startsAt: latest.starts_at!, endsAt: latest.ends_at ?? null }
  }

  return { startsAt: null, endsAt: null }
}

export async function fetchSchedulesSnapshot(
  serviceTypes: { remoteId: string; name: string }[]
): Promise<SchedulesSnapshot> {
  const schedules = new Map<string, ScheduleData>()

  for (const { remoteId: serviceTypeRemoteId, name: serviceTypeName } of serviceTypes) {
    let plans: z.infer<typeof planSchema>[]
    try {
      const rawPlans = await fetchPCO(
        `/services/v2/service_types/${serviceTypeRemoteId}/plans?filter=future&include=plan_times&per_page=100&order=sort_date`
      )
      const parsed = plansPayloadSchema.safeParse(rawPlans)
      if (!parsed.success) {
        console.error(
          `Invalid plans payload for service type ${serviceTypeRemoteId}: ${parsed.error.message}`
        )
        continue
      }
      plans = parsed.data
    } catch (error) {
      console.error(
        `Failed to fetch plans for service type ${serviceTypeRemoteId}:`,
        error
      )
      continue
    }

    if (plans.length === 0) continue

    for (const plan of plans) {
      if (!plan.sort_date) continue

      const { startsAt, endsAt } = findServiceTime(plan.plan_times, plan.sort_date)

      const planTimesData: PlanTimeData[] = plan.plan_times.map((pt) => ({
        remoteId: pt.id,
        name: pt.name ?? null,
        timeType: pt.time_type ?? null,
        startsAt: pt.starts_at ? new Date(pt.starts_at) : null,
        endsAt: pt.ends_at ? new Date(pt.ends_at) : null,
      }))

      let teamMembers: z.infer<typeof teamMemberSchema>[]
      try {
        const rawMembers = await fetchPCO(
          `/services/v2/service_types/${serviceTypeRemoteId}/plans/${plan.id}/team_members?include=person,team&per_page=100`
        )
        const parsed = teamMembersPayloadSchema.safeParse(rawMembers)
        if (!parsed.success) {
          console.error(
            `Invalid team members payload for plan ${plan.id}: ${parsed.error.message}`
          )
          continue
        }
        teamMembers = parsed.data
      } catch (error) {
        console.error(
          `Failed to fetch team members for plan ${plan.id}:`,
          error
        )
        continue
      }

      for (const member of teamMembers) {
        if (!member.person || !member.team) continue

        const status = PCO_STATUS_MAP[member.status] ?? "UNCONFIRMED"

        schedules.set(member.id, {
          upsert: {
            where: {
              remoteId_provider: {
                remoteId: member.id,
                provider: "PCO",
              },
            },
            create: {
              remoteId: member.id,
              provider: "PCO",
              person: {
                connect: {
                  remoteId_provider: {
                    remoteId: member.person.id,
                    provider: "PCO",
                  },
                },
              },
              team: {
                connect: {
                  remoteId_provider: {
                    remoteId: member.team.id,
                    provider: "PCO",
                  },
                },
              },
              positionName: member.team_position_name ?? null,
              serviceTypeName,
              status,
              sortDate: new Date(plan.sort_date),
              dates: plan.dates ?? "",
              startsAt: startsAt ? new Date(startsAt) : null,
              endsAt: endsAt ? new Date(endsAt) : null,
              planRemoteId: plan.id,
            },
            update: {
              positionName: member.team_position_name ?? null,
              status,
              sortDate: new Date(plan.sort_date),
              dates: plan.dates ?? "",
              startsAt: startsAt ? new Date(startsAt) : null,
              endsAt: endsAt ? new Date(endsAt) : null,
            },
          },
          planTimes: planTimesData,
        })
      }
    }
  }

  return { schedules: [...schedules.values()] }
}
