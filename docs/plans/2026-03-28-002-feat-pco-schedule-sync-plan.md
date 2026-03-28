---
title: "feat: Sync PCO Service Schedules & Display in UI"
type: feat
status: completed
date: 2026-03-28
---

# feat: Sync PCO Service Schedules & Display in UI

## Overview

Add service schedule syncing from Planning Center Online and display upcoming serving dates in the UI. The existing team sync is untouched — schedule fetching runs as a separate phase after it, using the per-service-type/plan approach to minimize API calls.

## Problem Frame

The app currently syncs teams, members, positions, and leaders from PCO but not service schedules. The design spec calls for "My Upcoming Serving" on the team view (showing next scheduled dates with role badges) and "next serving date" on team cards. A placeholder empty state currently exists in the team view at `apps/web/src/app/(app)/teams/[teamId]/team-view-content.tsx:102-113`.

## Requirements Trace

- R1. Sync future service plans and team member assignments from PCO into local database
- R2. Display "My Upcoming Serving" card on team view with date, position, and confirmation status
- R3. Display "next serving date" on team cards in the teams list
- R4. Minimal impact on existing sync speed — schedule sync runs as a separate phase
- R5. Follow existing PCO-synced model patterns (remoteId + provider composite key, upsert + prune)
- R6. Prune past schedules and stale records during sync

## Scope Boundaries

- No manual schedule management UI (schedules are read-only from PCO)
- No accept/decline functionality from within the app
- No notification system for upcoming schedules
- No schedule data on the role/position detail view (can add later)

## Context & Research

### Relevant Code and Patterns

- `packages/jobs/src/pco.ts` — PCO API client with `fetchPCO()` helper, Jsona deserialization, paginated fetch loop
- `packages/jobs/src/sync-pco/job.ts` — Sync job pattern: fetch snapshot → upsert in dependency order → prune stale
- `packages/api/prisma/schema.prisma` — All PCO models use `remoteId` + `provider` composite unique, `@default(cuid())` IDs
- `packages/api/src/routers/teams.ts` — tRPC router patterns, `protectedProcedure`, parallel Prisma queries
- `apps/web/src/app/(app)/teams/[teamId]/team-view-content.tsx:102-113` — Existing "My Upcoming Serving" placeholder
- `apps/web/src/components/teams/team-card.tsx` — Team card component, needs next serving date

### External References

- PCO Services API: `GET /services/v2/service_types/{id}/plans?filter=future&include=plan_times` — returns future plans with times
- PCO Services API: `GET /services/v2/service_types/{id}/plans/{id}/team_members?include=person,team` — returns scheduled people per plan
- Rate limit: 100 requests per 20-second window
- `filter=future` parameter limits response to upcoming plans only

## Key Technical Decisions

- **Per-service-type/plan fetch strategy**: For each synced ServiceType, fetch future plans, then fetch team members per plan. This is more efficient than per-person for larger churches (e.g., 3 service types × 5 future plans = 18 API calls vs 100+ per-person calls). Trade-off: two-level nesting is more complex but significantly fewer API calls.

- **Single `Schedule` model with denormalized plan data**: Store each person's plan assignment as a flat record with dates, position name, and status. Avoids a separate `Plan` model and complex joins. The denormalization is acceptable because schedule records are ephemeral (pruned when past) and the data volume is small per person.

- **Separate sync phase, same job**: Schedule sync runs after the existing team/people sync within `SyncPcoJob()`. This ensures Person and Team records exist before schedule records reference them, and keeps a single hourly cron. The existing sync logic is completely unchanged.

- **Enum for schedule status**: Use a `ScheduleStatus` enum (CONFIRMED, UNCONFIRMED, DECLINED) matching PCO's status codes (C/U/D).

- **Prune past schedules**: Delete schedules where `sortDate < now()` during each sync, in addition to the standard stale-record pruning.

## Open Questions

### Resolved During Planning

- **How to link schedule → person/team**: Match `team_member.person.id` against `Person.remoteId` and `team_member.team.id` against `Team.remoteId`. Both are already synced.
- **Rate limit handling**: With ~3-5 service types and ~5-10 future plans each, total calls are 20-60, well within the 100/20s window. No throttling needed for typical churches. Sequential fetching provides natural pacing.

### Deferred to Implementation

- **Exact plan_times handling**: A plan may have multiple plan_times (e.g., rehearsal + service). Implementation should pick the primary service time or store the earliest `starts_at` / latest `ends_at`.
- **Large church edge case**: If a church has 50+ future plans across many service types, may need to add `per_page=100` and limit to next N weeks. Assess during implementation.

## Implementation Units

- [ ] **Unit 1: Prisma Schema — Add Schedule model**

  **Goal:** Add `ScheduleStatus` enum and `Schedule` model to the Prisma schema.

  **Requirements:** R1, R5

  **Dependencies:** None

  **Files:**
  - Modify: `packages/api/prisma/schema.prisma`

  **Approach:**
  - Add `ScheduleStatus` enum: `CONFIRMED`, `UNCONFIRMED`, `DECLINED`
  - Add `Schedule` model following existing PCO-synced model patterns:
    - `id` (cuid), `remoteId`, `provider` (composite unique)
    - `personId` (FK to Person, cascade delete)
    - `teamId` (FK to Team, cascade delete)
    - `positionName` (String, nullable — from PCO `team_position_name`)
    - `serviceTypeName` (String — from PCO plan context)
    - `status` (ScheduleStatus)
    - `sortDate` (DateTime — plan sort_date for ordering)
    - `dates` (String — human-readable date string from PCO)
    - `startsAt` (DateTime, nullable — from plan_times)
    - `endsAt` (DateTime, nullable — from plan_times)
    - `planRemoteId` (String — PCO plan ID for dedup/reference)
    - `createdAt`, `updatedAt`
  - Add relation to Person model (`schedules Schedule[]`)
  - Add relation to Team model (`schedules Schedule[]`)
  - Indexes: `[personId]`, `[teamId]`, `[personId, teamId]`, `[sortDate]`
  - Run `prisma migrate dev` to generate migration

  **Patterns to follow:**
  - Existing PCO models in schema.prisma (Leader, Assignment) for composite unique key, FK patterns, cascade deletes

  **Test scenarios:**
  - Happy path: Migration runs cleanly, `Schedule` table created with all columns and indexes
  - Happy path: `@@unique([remoteId, provider])` constraint exists
  - Edge case: Foreign keys cascade correctly — deleting a Person or Team cascades to Schedule

  **Verification:**
  - `prisma generate` succeeds. `prisma migrate dev` creates the migration. Schema compiles.

- [ ] **Unit 2: PCO API — Add schedule fetching functions**

  **Goal:** Add functions to fetch future plans and team members from PCO, returning Prisma upsert args.

  **Requirements:** R1, R4

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `packages/jobs/src/pco.ts`

  **Approach:**
  - Add Zod schemas for plan and team_member PCO responses
  - Add `fetchSchedulesSnapshot()` function:
    1. Query all ServiceType remoteIds from the database
    2. For each service type: `GET /services/v2/service_types/{remoteId}/plans?filter=future&include=plan_times&per_page=100&order=sort_date`
    3. For each plan: `GET /services/v2/service_types/{remoteId}/plans/{planId}/team_members?include=person&per_page=100`
    4. Map team members to `Prisma.ScheduleUpsertArgs` using `remoteId` lookups for person/team FKs
  - Use the existing `fetchPCO()` helper for all API calls
  - Use the existing Jsona deserialization pattern
  - Return `{ schedules: Prisma.ScheduleUpsertArgs[] }` (same snapshot pattern as `fetchTeamsSnapshot`)
  - Pass the Prisma client as a parameter so the function can look up Person/Team IDs by remoteId

  **Patterns to follow:**
  - `fetchTeamsSnapshot()` in `packages/jobs/src/pco.ts` — paginated fetch, Zod validation, Map-based dedup, Prisma upsert arg construction

  **Test scenarios:**
  - Happy path: Fetches plans for 2 service types, returns schedule upsert args with correct person/team IDs resolved
  - Edge case: Team member references a person not in our database (skip that schedule record)
  - Edge case: Plan has no plan_times (startsAt/endsAt are null)
  - Edge case: Service type has no future plans (returns empty array for that type)
  - Error path: PCO API returns error for one service type — log and continue with remaining types

  **Verification:**
  - TypeScript compiles. Function signature matches the snapshot pattern. Handles missing person/team gracefully.

- [ ] **Unit 3: Sync Job — Add schedule sync phase**

  **Goal:** Extend `SyncPcoJob` to sync schedules after existing team data, plus prune stale/past records.

  **Requirements:** R1, R4, R5, R6

  **Dependencies:** Unit 2

  **Files:**
  - Modify: `packages/jobs/src/sync-pco/job.ts`

  **Approach:**
  - After existing assignment upserts (and before pruning), call `fetchSchedulesSnapshot()`
  - Upsert all schedule records (same sequential pattern as other models)
  - Prune stale schedules: delete where `remoteId NOT IN syncedSchedules AND provider = PCO`
  - Prune past schedules: delete where `sortDate < now()`
  - Log counts for each operation
  - The existing team/people/position/leader/assignment sync code remains completely unchanged

  **Patterns to follow:**
  - Existing upsert + prune pattern in `packages/jobs/src/sync-pco/job.ts`

  **Test scenarios:**
  - Happy path: Schedule records are upserted after team data, prune removes stale and past records
  - Edge case: No schedules returned (fetchSchedulesSnapshot returns empty array) — sync completes normally
  - Error path: Schedule fetch fails — existing team sync data is preserved (schedule phase is independent)
  - Integration: Person and Team records exist before schedule upserts reference them (ordering dependency)

  **Verification:**
  - Sync job runs end-to-end. Schedule records appear in database. Past schedules are pruned.

- [ ] **Unit 4: tRPC — Add schedule queries**

  **Goal:** Expose schedule data via tRPC for the team view and teams list.

  **Requirements:** R2, R3

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `packages/api/src/routers/teams.ts`

  **Approach:**
  - In `teams.get()`: add a parallel query for the current user's upcoming schedules for this team, ordered by `sortDate`, limited to next 5. Filter `sortDate >= now()` and `personId = ctx.personId`.
  - In `teams.list()`: for each team in the result, include the user's next schedule date. This can be done with a single query: fetch all of the current user's upcoming schedules (next occurrence per team), then merge into the teams map.
  - Return schedule data shaped for the UI: `{ id, positionName, status, sortDate, dates, startsAt, endsAt }`

  **Patterns to follow:**
  - Existing parallel queries in `teams.get()` (`Promise.all`)
  - Existing teams map building in `teams.list()`

  **Test scenarios:**
  - Happy path: `teams.get()` returns upcoming schedules for the current user on that team
  - Happy path: `teams.list()` includes `nextServingDate` for each team
  - Edge case: User has no schedules for a team — returns empty array / null nextServingDate
  - Edge case: User has declined schedules — still returned (UI can show status)

  **Verification:**
  - tRPC queries return schedule data. TypeScript compiles with correct return types.

- [ ] **Unit 5: UI — Team view "My Upcoming Serving" card**

  **Goal:** Replace the placeholder empty state with real schedule data showing upcoming serving dates with position badges and status.

  **Requirements:** R2

  **Dependencies:** Unit 4

  **Files:**
  - Modify: `apps/web/src/app/(app)/teams/[teamId]/team-view-content.tsx`
  - Create: `apps/web/src/components/teams/upcoming-serving.tsx`

  **Approach:**
  - Create `UpcomingServing` component that renders a list of upcoming schedule items
  - Each item shows: date (formatted), position name as a badge, confirmation status indicator
  - Use design tokens: accent badges for confirmed, muted for unconfirmed, coral/error for declined
  - Keep the existing empty state for when there are no upcoming schedules
  - Replace the placeholder in `team-view-content.tsx` with the new component

  **Patterns to follow:**
  - Existing card/badge patterns in `team-view-content.tsx` (goals section, feedback section)
  - Design tokens from CLAUDE.md

  **Test scenarios:**
  - Happy path: Shows 3 upcoming schedules with dates, position badges, and confirmed status
  - Edge case: No schedules — shows existing empty state
  - Edge case: Mix of confirmed/unconfirmed/declined — each renders with correct visual treatment
  - Edge case: Schedule with no position name — renders without badge

  **Verification:**
  - Component renders schedule data from tRPC. Empty state shown when no schedules exist.

- [ ] **Unit 6: UI — Team card "next serving date"**

  **Goal:** Add the user's next serving date to team cards on the teams list.

  **Requirements:** R3

  **Dependencies:** Unit 4

  **Files:**
  - Modify: `apps/web/src/components/teams/team-card.tsx`
  - Modify: `apps/web/src/app/(app)/teams/teams-list-content.tsx`

  **Approach:**
  - Add `nextServingDate` prop (string | null) to `TeamCard`
  - Display below the member count row with a Calendar icon, matching the existing text-tertiary style
  - Format as relative or short date (e.g., "Sun, Apr 5" or "Next Sunday")
  - Pass `nextServingDate` from the teams list content using data from `teams.list()`

  **Patterns to follow:**
  - Existing member count display in `team-card.tsx` (icon + text row)
  - Design spec: "Each team card: Team name, campus, member count, next serving date, role badge"

  **Test scenarios:**
  - Happy path: Team card shows "Next: Sun, Apr 5" with Calendar icon
  - Edge case: No next serving date — row not rendered
  - Edge case: Serving date is today — shows "Today" or similar

  **Verification:**
  - Team cards display next serving date when available. Layout matches existing card style.

## System-Wide Impact

- **Sync pipeline**: Schedule sync adds a new phase after existing team data sync. Existing sync logic is unchanged. Added API calls (~20-60 per sync) are well within PCO rate limits.
- **Database**: One new table (`Schedule`) with foreign keys to `Person` and `Team`. Cascade deletes ensure cleanup when parent records are removed.
- **API surface**: Two existing tRPC queries (`teams.list`, `teams.get`) gain additional schedule data in their return types. No breaking changes — new fields are additive.
- **Unchanged invariants**: All existing PCO-synced models, app-native CRUD, auth, and routing are unaffected.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| PCO rate limits exceeded for large churches | Per-service-type approach minimizes calls. Add `per_page=100` to reduce pagination. Monitor with response headers. |
| Plan has multiple plan_times (rehearsal + service) | Use earliest `starts_at` from plan_times. Can refine later if needed. |
| Team member references person/team not in our database | Skip orphaned records gracefully (log and continue). |
| Schedule data becomes stale between hourly syncs | Acceptable for "upcoming serving" display. Not a real-time feature. |

## Sources & References

- PCO Services API: `GET /services/v2/service_types/{id}/plans` (filter=future, include=plan_times)
- PCO Services API: `GET /services/v2/service_types/{id}/plans/{id}/team_members` (include=person,team)
- Design spec: `design/MEGA_PROMPT.md` — Team View section 3 ("My Upcoming Serving"), Teams List section 2 ("next serving date")
- Existing sync plan: `docs/plans/2026-03-20-003-feat-pco-sync-plan.md`
