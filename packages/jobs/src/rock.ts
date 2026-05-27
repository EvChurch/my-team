import { z } from "zod"

import type { Prisma, ScheduleStatus } from "@mt/api/prisma"

const ROCK_PAGE_SIZE = 100

const rockPersonSchema = z
  .object({
    Id: z.number(),
    FirstName: z.string().nullable().optional(),
    NickName: z.string().nullable().optional(),
    LastName: z.string().nullable().optional(),
    FullName: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    PhotoUrl: z.string().nullable().optional(),
  })
  .passthrough()

const rockGroupSchema = z
  .object({
    Id: z.number(),
    Name: z.string(),
    Description: z.string().nullable().optional(),
    GroupTypeId: z.number().nullable().optional(),
  })
  .passthrough()

const rockGroupRoleSchema = z
  .object({
    Id: z.number(),
    Name: z.string().nullable().optional(),
    IsLeader: z.boolean().nullable().optional(),
  })
  .passthrough()

const rockGroupMemberSchema = z
  .object({
    Id: z.number(),
    GroupId: z.number(),
    GroupTypeId: z.number().nullable().optional(),
    PersonId: z.number().nullable().optional(),
    GroupRoleId: z.number().nullable().optional(),
    ScheduleTemplateId: z.number().nullable().optional(),
    ScheduleStartDate: z.string().nullable().optional(),
    Person: rockPersonSchema.nullable().optional(),
    GroupRole: rockGroupRoleSchema.nullable().optional(),
  })
  .passthrough()

const rockGroupMemberAssignmentSchema = z
  .object({
    Id: z.number(),
    GroupId: z.number(),
    GroupMemberId: z.number().nullable().optional(),
    ScheduleId: z.number().nullable().optional(),
    LocationId: z.number().nullable().optional(),
  })
  .passthrough()

const rockPeoplePayloadSchema = z.array(rockPersonSchema)
const rockGroupsPayloadSchema = z.array(rockGroupSchema)
const rockGroupMembersPayloadSchema = z.array(rockGroupMemberSchema)
const rockGroupMemberAssignmentsPayloadSchema = z.array(
  rockGroupMemberAssignmentSchema
)

type RockPerson = z.infer<typeof rockPersonSchema>
type RockGroup = z.infer<typeof rockGroupSchema>
type RockGroupMember = z.infer<typeof rockGroupMemberSchema>
type RockGroupMemberAssignment = z.infer<typeof rockGroupMemberAssignmentSchema>

const rockAttributeSchema = z
  .object({
    Id: z.number(),
    Key: z.string(),
    Name: z.string().nullable().optional(),
  })
  .passthrough()

const rockAttributeValueSchema = z
  .object({
    Id: z.number(),
    AttributeId: z.number(),
    EntityId: z.number(),
    Value: z.string().nullable().optional(),
  })
  .passthrough()

const rockAttributesPayloadSchema = z.array(rockAttributeSchema)
const rockAttributeValuesPayloadSchema = z.array(rockAttributeValueSchema)

const rockAttendanceOccurrenceSchema = z
  .object({
    Id: z.number(),
    GroupId: z.number().nullable().optional(),
    ScheduleId: z.number().nullable().optional(),
    OccurrenceDate: z.string().nullable().optional(),
    SundayDate: z.string().nullable().optional(),
    DidNotOccur: z.boolean().nullable().optional(),
    Name: z.string().nullable().optional(),
  })
  .passthrough()

const rockAttendanceSchema = z
  .object({
    Id: z.number(),
    OccurrenceId: z.number(),
    PersonAliasId: z.number().nullable().optional(),
    StartDateTime: z.string().nullable().optional(),
    EndDateTime: z.string().nullable().optional(),
    RSVP: z.number().nullable().optional(),
    DidAttend: z.boolean().nullable().optional(),
    ScheduledToAttend: z.boolean().nullable().optional(),
    RequestedToAttend: z.boolean().nullable().optional(),
    RSVPDateTime: z.string().nullable().optional(),
    DeclineReasonValueId: z.number().nullable().optional(),
  })
  .passthrough()

const rockScheduleSchema = z
  .object({
    Id: z.number(),
    Name: z.string().nullable().optional(),
    FriendlyScheduleText: z.string().nullable().optional(),
    AbbreviatedName: z.string().nullable().optional(),
    iCalendarContent: z.string().nullable().optional(),
    EffectiveEndDate: z.string().nullable().optional(),
  })
  .passthrough()

const rockGroupMemberScheduleTemplateSchema = z
  .object({
    Id: z.number(),
    Name: z.string().nullable().optional(),
    ScheduleId: z.number().nullable().optional(),
  })
  .passthrough()

const rockPersonAliasSchema = z
  .object({
    Id: z.number(),
    PersonId: z.number().nullable().optional(),
    Person: rockPersonSchema.nullable().optional(),
  })
  .passthrough()

const rockAttendanceOccurrencesPayloadSchema = z.array(
  rockAttendanceOccurrenceSchema
)
const rockAttendancesPayloadSchema = z.array(rockAttendanceSchema)
const rockSchedulesPayloadSchema = z.array(rockScheduleSchema)
const rockGroupMemberScheduleTemplatesPayloadSchema = z.array(
  rockGroupMemberScheduleTemplateSchema
)
const rockPersonAliasesPayloadSchema = z.array(rockPersonAliasSchema)

type RockAttendanceOccurrence = z.infer<typeof rockAttendanceOccurrenceSchema>
type RockAttendance = z.infer<typeof rockAttendanceSchema>
type RockSchedule = z.infer<typeof rockScheduleSchema>
type RockGroupMemberScheduleTemplate = z.infer<
  typeof rockGroupMemberScheduleTemplateSchema
>
type RockPersonAlias = z.infer<typeof rockPersonAliasSchema>

export type RockTeamsSnapshot = {
  teams: Prisma.TeamUpsertArgs[]
  people: Prisma.PersonUpsertArgs[]
  positions: Prisma.PositionUpsertArgs[]
  assignments: Prisma.AssignmentUpsertArgs[]
  leaders: Prisma.LeaderUpsertArgs[]
}

type RockPlanTimeData = {
  remoteId: string
  name: string | null
  timeType: string | null
  startsAt: Date | null
  endsAt: Date | null
}

export type RockScheduleData = {
  upsert: Prisma.ScheduleUpsertArgs
  planTimes: RockPlanTimeData[]
}

export type RockSchedulesSnapshot = {
  people: Prisma.PersonUpsertArgs[]
  schedules: RockScheduleData[]
}

function rockBaseUrl(): string {
  const baseUrl = process.env.ROCK_BASE_URL
  if (!baseUrl) throw new Error("ROCK_BASE_URL is required for Rock sync")
  return baseUrl.replace(/\/$/, "")
}

function rockRestKey(): string {
  const restKey = process.env.ROCK_REST_KEY ?? process.env.ROCK_API_KEY
  if (!restKey) throw new Error("ROCK_REST_KEY is required for Rock sync")
  return restKey
}

async function fetchRock(path: string): Promise<unknown> {
  const response = await fetch(`${rockBaseUrl()}${path}`, {
    headers: {
      "Authorization-Token": rockRestKey(),
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Rock API ${response.status}: ${text}`)
  }

  return response.json()
}

async function fetchRockPages<T>(
  path: string,
  schema: z.ZodType<T[]>
): Promise<T[]> {
  const all: T[] = []
  let skip = 0

  while (true) {
    const separator = path.includes("?") ? "&" : "?"
    const raw = await fetchRock(
      `${path}${separator}$top=${ROCK_PAGE_SIZE}&$skip=${skip}`
    )
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`Invalid Rock payload for ${path}: ${parsed.error.message}`)
    }

    all.push(...parsed.data)
    if (parsed.data.length < ROCK_PAGE_SIZE) break
    skip += ROCK_PAGE_SIZE
  }

  return all
}

function rockFilterDate(date: Date): string {
  return `DateTime'${date.toISOString().slice(0, 19)}'`
}

function scheduleSyncHorizon(): Date {
  const configuredDays = Number(process.env.ROCK_SCHEDULE_SYNC_DAYS ?? 180)
  const days = Number.isFinite(configuredDays) ? configuredDays : 180
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + days)
  return horizon
}

function configuredGroupTypeIds(): number[] {
  return (process.env.ROCK_TEAM_GROUP_TYPE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
}

async function fetchPcoMarkedGroupIds(): Promise<Set<number>> {
  const attributes = await fetchRockPages(
    "/api/Attributes?$filter=Key eq 'PCOMarker'&$select=Id,Key,Name",
    rockAttributesPayloadSchema
  )
  const pcoMarkerAttributeIds = attributes.map((attribute) => attribute.Id)
  if (pcoMarkerAttributeIds.length === 0) return new Set()

  const values = await Promise.all(
    pcoMarkerAttributeIds.map((attributeId) =>
      fetchRockPages(
        `/api/AttributeValues?$filter=AttributeId eq ${attributeId}&$select=Id,AttributeId,EntityId,Value`,
        rockAttributeValuesPayloadSchema
      )
    )
  )

  return new Set(
    values
      .flat()
      .filter((value) => value.Value?.trim())
      .map((value) => value.EntityId)
  )
}

function rockName(person: RockPerson): {
  fullName: string
  firstName: string
  lastName: string
} {
  const firstName = person.NickName ?? person.FirstName ?? ""
  const lastName = person.LastName ?? ""
  const fullName =
    person.FullName ??
    [firstName, lastName].filter(Boolean).join(" ") ??
    `Rock Person ${person.Id}`

  return {
    fullName: fullName || `Rock Person ${person.Id}`,
    firstName,
    lastName,
  }
}

function personUpsert(person: RockPerson): Prisma.PersonUpsertArgs {
  const remoteId = String(person.Id)
  const name = rockName(person)

  return {
    where: {
      remoteId_provider: {
        remoteId,
        provider: "ROCK",
      },
    },
    create: {
      remoteId,
      provider: "ROCK",
      email: person.Email ?? null,
      fullName: name.fullName,
      firstName: name.firstName,
      lastName: name.lastName,
      image: person.PhotoUrl ?? null,
    },
    update: {
      email: person.Email ?? null,
      fullName: name.fullName,
      firstName: name.firstName,
      lastName: name.lastName,
      image: person.PhotoUrl ?? null,
    },
  }
}

function scheduleStatus(attendance: RockAttendance): ScheduleStatus {
  if (attendance.DeclineReasonValueId || attendance.RSVP === 2) {
    return "DECLINED"
  }

  if (attendance.ScheduledToAttend || attendance.RSVP === 1) {
    return "CONFIRMED"
  }

  return "UNCONFIRMED"
}

function assignmentScheduleStatus(): ScheduleStatus {
  return "CONFIRMED"
}

function unfoldICalendar(content: string): string {
  return content.replace(/\r/g, "").replace(/\n[ \t]/g, "")
}

function calendarValue(content: string, key: string): string | null {
  const match = unfoldICalendar(content).match(
    new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "m")
  )
  return match?.[1]?.trim() ?? null
}

function parseCalendarDate(value: string): Date | null {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/
  )
  if (!match) return null

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  )
}

function sameDayWithTime(day: Date, timeSource: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds()
  )
}

function scheduleStartAndEnd(schedule: RockSchedule): {
  startsAt: Date | null
  endsAt: Date | null
} {
  const startsAt = calendarValue(schedule.iCalendarContent ?? "", "DTSTART")
  const endsAt = calendarValue(schedule.iCalendarContent ?? "", "DTEND")

  return {
    startsAt: startsAt ? parseCalendarDate(startsAt) : null,
    endsAt: endsAt ? parseCalendarDate(endsAt) : null,
  }
}

function scheduleDuration(schedule: RockSchedule): number {
  const { startsAt, endsAt } = scheduleStartAndEnd(schedule)
  if (!startsAt || !endsAt) return 0
  return Math.max(0, endsAt.getTime() - startsAt.getTime())
}

function scheduleOccurrences(
  schedule: RockSchedule,
  from: Date,
  until: Date
): Date[] {
  const content = unfoldICalendar(schedule.iCalendarContent ?? "")
  const occurrences = new Map<string, Date>()
  const effectiveEnd = schedule.EffectiveEndDate
    ? new Date(schedule.EffectiveEndDate)
    : null
  const maxDate = effectiveEnd && effectiveEnd < until ? effectiveEnd : until

  const addOccurrence = (date: Date | null) => {
    if (!date || date < from || date > maxDate) return
    occurrences.set(date.toISOString(), date)
  }

  const rdate = calendarValue(content, "RDATE")
  if (rdate) {
    for (const value of rdate.split(",")) {
      addOccurrence(parseCalendarDate(value.trim()))
    }
  }

  const dtstart = calendarValue(content, "DTSTART")
  const start = dtstart ? parseCalendarDate(dtstart) : null
  const rrule = calendarValue(content, "RRULE")
  if (start && rrule?.includes("FREQ=WEEKLY")) {
    const byDay = rrule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") ?? []
    const dayMap: Record<string, number> = {
      SU: 0,
      MO: 1,
      TU: 2,
      WE: 3,
      TH: 4,
      FR: 5,
      SA: 6,
    }
    const weekdays = byDay
      .map((day) => dayMap[day])
      .filter((day) => day !== undefined)
    const cursor = new Date(Math.max(start.getTime(), from.getTime()))
    cursor.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0)
    cursor.setDate(cursor.getDate() - 7)

    while (cursor <= maxDate) {
      cursor.setDate(cursor.getDate() + 1)
      if (cursor < start) continue
      if (weekdays.length === 0 || weekdays.includes(cursor.getDay())) {
        addOccurrence(new Date(cursor))
      }
    }
  } else {
    addOccurrence(start)
  }

  return [...occurrences.values()].sort((a, b) => a.getTime() - b.getTime())
}

function teamUpsert(group: RockGroup): Prisma.TeamUpsertArgs {
  const remoteId = String(group.Id)

  return {
    where: {
      remoteId_provider: {
        remoteId,
        provider: "ROCK",
      },
    },
    create: {
      remoteId,
      provider: "ROCK",
      name: group.Name,
      description: group.Description
        ? { markdown: group.Description, groupTypeId: group.GroupTypeId ?? null }
        : { groupTypeId: group.GroupTypeId ?? null },
    },
    update: {
      name: group.Name,
      description: group.Description
        ? { markdown: group.Description, groupTypeId: group.GroupTypeId ?? null }
        : { groupTypeId: group.GroupTypeId ?? null },
    },
  }
}

function positionRemoteId(member: RockGroupMember): string {
  return `${member.GroupId}:${member.GroupRoleId ?? "member"}`
}

function positionUpsert(member: RockGroupMember): Prisma.PositionUpsertArgs {
  const remoteId = positionRemoteId(member)

  return {
    where: {
      remoteId_provider: {
        remoteId,
        provider: "ROCK",
      },
    },
    create: {
      remoteId,
      provider: "ROCK",
      name: member.GroupRole?.Name ?? "Member",
      team: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.GroupId),
            provider: "ROCK",
          },
        },
      },
    },
    update: {
      name: member.GroupRole?.Name ?? "Member",
      team: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.GroupId),
            provider: "ROCK",
          },
        },
      },
    },
  }
}

function assignmentUpsert(member: RockGroupMember): Prisma.AssignmentUpsertArgs {
  return {
    where: {
      remoteId_provider: {
        remoteId: String(member.Id),
        provider: "ROCK",
      },
    },
    create: {
      remoteId: String(member.Id),
      provider: "ROCK",
      person: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.Person?.Id ?? member.PersonId),
            provider: "ROCK",
          },
        },
      },
      position: {
        connect: {
          remoteId_provider: {
            remoteId: positionRemoteId(member),
            provider: "ROCK",
          },
        },
      },
    },
    update: {
      person: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.Person?.Id ?? member.PersonId),
            provider: "ROCK",
          },
        },
      },
      position: {
        connect: {
          remoteId_provider: {
            remoteId: positionRemoteId(member),
            provider: "ROCK",
          },
        },
      },
    },
  }
}

function leaderUpsert(member: RockGroupMember): Prisma.LeaderUpsertArgs {
  const remoteId = `group-member:${member.Id}`

  return {
    where: {
      remoteId_provider: {
        remoteId,
        provider: "ROCK",
      },
    },
    create: {
      remoteId,
      provider: "ROCK",
      person: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.Person?.Id ?? member.PersonId),
            provider: "ROCK",
          },
        },
      },
      team: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.GroupId),
            provider: "ROCK",
          },
        },
      },
    },
    update: {
      person: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.Person?.Id ?? member.PersonId),
            provider: "ROCK",
          },
        },
      },
      team: {
        connect: {
          remoteId_provider: {
            remoteId: String(member.GroupId),
            provider: "ROCK",
          },
        },
      },
    },
  }
}

async function fetchTeamGroups(): Promise<RockGroup[]> {
  const pcoMarkedGroupIds = await fetchPcoMarkedGroupIds()
  const groupTypeIds = configuredGroupTypeIds()
  const excludePcoMarked = (groups: RockGroup[]) =>
    groups.filter((group) => !pcoMarkedGroupIds.has(group.Id))
  const assignmentGroups = await fetchAssignmentGroups()

  if (groupTypeIds.length === 0) {
    console.warn(
      "ROCK_TEAM_GROUP_TYPE_IDS is not set. Rock sync will fetch all active groups."
    )
    const groups = await fetchRockPages(
      "/api/Groups?$filter=IsActive eq true",
      rockGroupsPayloadSchema
    )
    return excludePcoMarked([...groups, ...assignmentGroups])
  }

  const configuredGroups = await Promise.all(
    groupTypeIds.map((id) =>
      fetchRockPages(
        `/api/Groups?$filter=IsActive eq true and GroupTypeId eq ${id}`,
        rockGroupsPayloadSchema
      )
    )
  )
  const groups = new Map<string, RockGroup>()
  for (const group of [...configuredGroups.flat(), ...assignmentGroups]) {
    groups.set(String(group.Id), group)
  }

  return excludePcoMarked([...groups.values()])
}

async function fetchGroupMembers(groupId: number): Promise<RockGroupMember[]> {
  return fetchRockPages(
    `/api/GroupMembers?$filter=GroupId eq ${groupId}&$expand=Person,GroupRole`,
    rockGroupMembersPayloadSchema
  )
}

async function fetchGroupMember(memberId: number): Promise<RockGroupMember | null> {
  const members = await fetchRockPages(
    `/api/GroupMembers?$filter=Id eq ${memberId}&$expand=Person,GroupRole`,
    rockGroupMembersPayloadSchema
  )

  return members[0] ?? null
}

async function fetchAssignmentGroups(): Promise<RockGroup[]> {
  const assignments = await fetchRockPages(
    "/api/GroupMemberAssignments?$select=Id,GroupId",
    rockGroupMemberAssignmentsPayloadSchema
  )
  const groupIds = [...new Set(assignments.map((assignment) => assignment.GroupId))]
  const groups: RockGroup[] = []

  for (const groupId of groupIds) {
    const group = await fetchRockPages(
      `/api/Groups?$filter=Id eq ${groupId} and IsActive eq true`,
      rockGroupsPayloadSchema
    )
    if (group[0]) groups.push(group[0])
  }

  return groups
}

async function fetchGroupMemberAssignments(
  groupId: number
): Promise<RockGroupMemberAssignment[]> {
  return fetchRockPages(
    `/api/GroupMemberAssignments?$filter=GroupId eq ${groupId}`,
    rockGroupMemberAssignmentsPayloadSchema
  )
}

async function fetchFutureOccurrences(
  groupId: number
): Promise<RockAttendanceOccurrence[]> {
  return fetchRockPages(
    `/api/AttendanceOccurrences?$filter=GroupId eq ${groupId} and OccurrenceDate ge ${rockFilterDate(
      new Date()
    )}`,
    rockAttendanceOccurrencesPayloadSchema
  )
}

async function fetchAttendances(
  occurrenceId: number
): Promise<RockAttendance[]> {
  return fetchRockPages(
    `/api/Attendances?$filter=OccurrenceId eq ${occurrenceId} and (ScheduledToAttend eq true or RequestedToAttend eq true)`,
    rockAttendancesPayloadSchema
  )
}

async function fetchRockSchedule(
  scheduleId: number
): Promise<RockSchedule | null> {
  const schedules = await fetchRockPages(
    `/api/Schedules?$filter=Id eq ${scheduleId}`,
    rockSchedulesPayloadSchema
  )

  return schedules[0] ?? null
}

async function fetchScheduleTemplate(
  templateId: number
): Promise<RockGroupMemberScheduleTemplate | null> {
  const templates = await fetchRockPages(
    `/api/GroupMemberScheduleTemplates?$filter=Id eq ${templateId}`,
    rockGroupMemberScheduleTemplatesPayloadSchema
  )

  return templates[0] ?? null
}

async function fetchPersonAlias(aliasId: number): Promise<RockPersonAlias | null> {
  const aliases = await fetchRockPages(
    `/api/PersonAlias?$filter=Id eq ${aliasId}&$expand=Person`,
    rockPersonAliasesPayloadSchema
  )

  return aliases[0] ?? null
}

export async function fetchRockTeamsSnapshot(): Promise<RockTeamsSnapshot> {
  const teams = new Map<string, Prisma.TeamUpsertArgs>()
  const people = new Map<string, Prisma.PersonUpsertArgs>()
  const positions = new Map<string, Prisma.PositionUpsertArgs>()
  const assignments = new Map<string, Prisma.AssignmentUpsertArgs>()
  const leaders = new Map<string, Prisma.LeaderUpsertArgs>()

  const groups = await fetchTeamGroups()

  for (const group of groups) {
    teams.set(String(group.Id), teamUpsert(group))

    const members = await fetchGroupMembers(group.Id)
    for (const member of members) {
      const person = member.Person
      const personId = person?.Id ?? member.PersonId
      if (!personId || !person) continue

      people.set(String(personId), personUpsert(person))
      positions.set(positionRemoteId(member), positionUpsert(member))
      assignments.set(String(member.Id), assignmentUpsert(member))

      if (member.GroupRole?.IsLeader) {
        leaders.set(String(member.Id), leaderUpsert(member))
      }
    }
  }

  return {
    teams: [...teams.values()],
    people: [...people.values()],
    positions: [...positions.values()],
    assignments: [...assignments.values()],
    leaders: [...leaders.values()],
  }
}

export async function fetchRockSchedulesSnapshot(
  teamRemoteIds: string[]
): Promise<RockSchedulesSnapshot> {
  const people = new Map<string, Prisma.PersonUpsertArgs>()
  const schedules = new Map<string, RockScheduleData>()
  const personAliases = new Map<number, RockPersonAlias | null>()
  const rockSchedules = new Map<number, RockSchedule | null>()
  const groupMembers = new Map<number, RockGroupMember | null>()
  const scheduleTemplates = new Map<number, RockGroupMemberScheduleTemplate | null>()
  const from = new Date()
  const until = scheduleSyncHorizon()

  for (const teamRemoteId of teamRemoteIds) {
    const groupId = Number(teamRemoteId)
    if (!Number.isInteger(groupId)) continue

    const occurrences = await fetchFutureOccurrences(groupId)
    for (const occurrence of occurrences) {
      if (occurrence.DidNotOccur || !occurrence.GroupId) continue

      const schedule =
        occurrence.ScheduleId === null || occurrence.ScheduleId === undefined
          ? null
          : rockSchedules.get(occurrence.ScheduleId) ??
            (await fetchRockSchedule(occurrence.ScheduleId))

      if (occurrence.ScheduleId !== null && occurrence.ScheduleId !== undefined) {
        rockSchedules.set(occurrence.ScheduleId, schedule)
      }

      const attendances = await fetchAttendances(occurrence.Id)
      for (const attendance of attendances) {
        if (!attendance.PersonAliasId) continue

        const alias =
          personAliases.get(attendance.PersonAliasId) ??
          (await fetchPersonAlias(attendance.PersonAliasId))
        personAliases.set(attendance.PersonAliasId, alias)

        const person = alias?.Person
        const personId = person?.Id ?? alias?.PersonId
        if (!personId || !person) continue

        people.set(String(personId), personUpsert(person))

        const startsAt = attendance.StartDateTime
          ? new Date(attendance.StartDateTime)
          : occurrence.OccurrenceDate
            ? new Date(occurrence.OccurrenceDate)
            : new Date()
        const endsAt = attendance.EndDateTime
          ? new Date(attendance.EndDateTime)
          : null
        const scheduleName =
          schedule?.Name ??
          schedule?.FriendlyScheduleText ??
          occurrence.Name ??
          "Rock service"
        const scheduleRemoteId = String(attendance.Id)
        const planRemoteId = String(occurrence.Id)

        schedules.set(scheduleRemoteId, {
          upsert: {
            where: {
              remoteId_provider: {
                remoteId: scheduleRemoteId,
                provider: "ROCK",
              },
            },
            create: {
              remoteId: scheduleRemoteId,
              provider: "ROCK",
              person: {
                connect: {
                  remoteId_provider: {
                    remoteId: String(personId),
                    provider: "ROCK",
                  },
                },
              },
              team: {
                connect: {
                  remoteId_provider: {
                    remoteId: String(occurrence.GroupId),
                    provider: "ROCK",
                  },
                },
              },
              positionName: null,
              serviceTypeName: scheduleName,
              status: scheduleStatus(attendance),
              sortDate: occurrence.OccurrenceDate
                ? new Date(occurrence.OccurrenceDate)
                : startsAt,
              dates: startsAt.toLocaleDateString("en-NZ", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              startsAt,
              endsAt,
              planRemoteId,
            },
            update: {
              serviceTypeName: scheduleName,
              status: scheduleStatus(attendance),
              sortDate: occurrence.OccurrenceDate
                ? new Date(occurrence.OccurrenceDate)
                : startsAt,
              dates: startsAt.toLocaleDateString("en-NZ", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              startsAt,
              endsAt,
            },
          },
          planTimes: [
            {
              remoteId: `attendance:${attendance.Id}`,
              name:
                schedule?.AbbreviatedName ??
                schedule?.Name ??
                schedule?.FriendlyScheduleText ??
                null,
              timeType: "service",
              startsAt,
              endsAt,
            },
          ],
        })
      }
    }

    const assignments = await fetchGroupMemberAssignments(groupId)
    for (const assignment of assignments) {
      if (!assignment.GroupMemberId || !assignment.ScheduleId) continue

      const member =
        groupMembers.get(assignment.GroupMemberId) ??
        (await fetchGroupMember(assignment.GroupMemberId))
      groupMembers.set(assignment.GroupMemberId, member)

      const person = member?.Person
      const personId = person?.Id ?? member?.PersonId
      if (!member || !person || !personId || !member.ScheduleTemplateId) continue

      const template =
        scheduleTemplates.get(member.ScheduleTemplateId) ??
        (await fetchScheduleTemplate(member.ScheduleTemplateId))
      scheduleTemplates.set(member.ScheduleTemplateId, template)
      if (!template?.ScheduleId) continue

      const assignmentSchedule =
        rockSchedules.get(assignment.ScheduleId) ??
        (await fetchRockSchedule(assignment.ScheduleId))
      rockSchedules.set(assignment.ScheduleId, assignmentSchedule)

      const templateSchedule =
        rockSchedules.get(template.ScheduleId) ??
        (await fetchRockSchedule(template.ScheduleId))
      rockSchedules.set(template.ScheduleId, templateSchedule)
      if (!assignmentSchedule || !templateSchedule) continue

      people.set(String(personId), personUpsert(person))

      const { startsAt: serviceStart } = scheduleStartAndEnd(assignmentSchedule)
      if (!serviceStart) continue

      const duration = scheduleDuration(assignmentSchedule)
      const memberStartDate = member.ScheduleStartDate
        ? new Date(member.ScheduleStartDate)
        : from
      const occurrenceFrom = memberStartDate > from ? memberStartDate : from
      const occurrenceDates = scheduleOccurrences(
        templateSchedule,
        occurrenceFrom,
        until
      )

      for (const occurrenceDate of occurrenceDates) {
        const startsAt = sameDayWithTime(occurrenceDate, serviceStart)
        const endsAt = duration
          ? new Date(startsAt.getTime() + duration)
          : null
        const scheduleRemoteId = `group-member-assignment:${assignment.Id}:${startsAt
          .toISOString()
          .slice(0, 10)}`
        const planRemoteId = `group:${groupId}:${startsAt.toISOString().slice(0, 10)}`
        const serviceTypeName =
          assignmentSchedule.Name ??
          assignmentSchedule.AbbreviatedName ??
          "Rock service"

        schedules.set(scheduleRemoteId, {
          upsert: {
            where: {
              remoteId_provider: {
                remoteId: scheduleRemoteId,
                provider: "ROCK",
              },
            },
            create: {
              remoteId: scheduleRemoteId,
              provider: "ROCK",
              person: {
                connect: {
                  remoteId_provider: {
                    remoteId: String(personId),
                    provider: "ROCK",
                  },
                },
              },
              team: {
                connect: {
                  remoteId_provider: {
                    remoteId: String(groupId),
                    provider: "ROCK",
                  },
                },
              },
              positionName: member.GroupRole?.Name ?? null,
              serviceTypeName,
              status: assignmentScheduleStatus(),
              sortDate: startsAt,
              dates: startsAt.toLocaleDateString("en-NZ", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              startsAt,
              endsAt,
              planRemoteId,
            },
            update: {
              positionName: member.GroupRole?.Name ?? null,
              serviceTypeName,
              status: assignmentScheduleStatus(),
              sortDate: startsAt,
              dates: startsAt.toLocaleDateString("en-NZ", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              startsAt,
              endsAt,
            },
          },
          planTimes: [
            {
              remoteId: `group-member-assignment:${assignment.Id}:service`,
              name:
                assignmentSchedule.AbbreviatedName ??
                assignmentSchedule.Name ??
                assignmentSchedule.FriendlyScheduleText ??
                null,
              timeType: "service",
              startsAt,
              endsAt,
            },
          ],
        })
      }
    }
  }

  return {
    people: [...people.values()],
    schedules: [...schedules.values()],
  }
}
