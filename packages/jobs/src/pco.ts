import Jsona from "jsona"
import { z } from "zod"

import type { Prisma } from "@repo/api/prisma"

const PCO_API = "https://api.planningcenteronline.com"
const jsonaFormatter = new Jsona()
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

function pcoBasicAuth(): string {
  return Buffer.from(
    `${process.env.PCO_API_ID}:${process.env.PCO_API_SECRET}`,
    "utf8"
  ).toString("base64")
}

async function fetchPCO(path: string): Promise<unknown> {
  const res = await fetch(`${PCO_API}${path}`, {
    headers: { Authorization: `Basic ${pcoBasicAuth()}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PCO API ${res.status}: ${text}`)
  }
  const text = await res.text()
  return jsonaFormatter.deserialize(text)
}

export type TeamsSnapshot = {
  serviceTypes: Prisma.ServiceTypeUpsertArgs[]
  teams: Prisma.TeamUpsertArgs[]
  people: Prisma.PersonUpsertArgs[]
  leaders: Prisma.LeaderUpsertArgs[]
  positions: Prisma.PositionUpsertArgs[]
  assignments: Prisma.AssignmentUpsertArgs[]
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
        people.set(person.id, {
          where: {
            remoteId_provider: { remoteId: person.id, provider: "PCO" },
          },
          create: {
            remoteId: person.id,
            provider: "PCO",
            fullName: person.full_name,
            firstName: person.first_name,
            lastName: person.last_name,
            image: person.photo_thumbnail_url ?? null,
          },
          update: {
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
