---
title: "feat: Schedule UI Enhancements — Upcoming Overview, Call Times, Accept/Decline"
type: feat
status: completed
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-schedule-ui-enhancements-requirements.md
---

# feat: Schedule UI Enhancements

## Overview

Three enhancements to the schedule feature: (1) an "Upcoming Serving" section on the My Teams page showing the next 3 schedules across all teams, (2) expandable call times on each schedule row, and (3) accept/decline actions that write back to the PCO API.

## Problem Frame

Volunteers can see upcoming serving dates but the experience is minimal — the main teams screen doesn't surface schedules at a glance, call time details require going to PCO, and responding to schedule requests requires leaving the app entirely. (see origin: docs/brainstorms/2026-03-28-schedule-ui-enhancements-requirements.md)

## Requirements Trace

- R1. "Upcoming Serving" section above team cards on `/teams` page
- R2. Next 3 schedules across all teams, chronological, flat list
- R3. Each entry: date, time, team name, position, status
- R4. "See all" expands to show remaining future schedules
- R5. No empty state — omit section when no schedules
- R6. Schedule rows on team view are expandable
- R7. Expanding reveals associated PlanTime call times
- R8. Call times show name, date, start/end time
- R9. Call times sorted chronologically
- R10. Collapsed by default
- R11. Unconfirmed schedules show accept/decline buttons
- R12. Accept calls PCO API `POST .../schedules/{id}/accept`
- R13. Decline prompts for optional reason, calls PCO API `POST .../schedules/{id}/decline`
- R14. Optimistic UI update, hourly sync reconciles
- R15. Confirmed schedules show status, no action buttons
- R16. Declined schedules show status, no further action
- R17. Accept/decline available on both My Teams and team view

## Scope Boundaries

- No partial acceptance (individual plan times)
- No schedule notifications
- No manual schedule creation
- No leader view of team-wide responses

## Context & Research

### Relevant Code and Patterns

- `packages/api/src/routers/teams.ts` — existing schedule queries in `teams.list()` (nextServingDate) and `teams.get()` (upcoming 5 per team)
- `apps/web/src/components/teams/upcoming-serving.tsx` — existing `UpcomingServing` component with date/time formatting, status display
- `apps/web/src/app/(app)/teams/teams-list-content.tsx` — teams list page, where the new section goes above
- `apps/web/src/app/(app)/teams/page.tsx` — server component with prefetch + HydrationBoundary pattern
- `packages/jobs/src/pco.ts` — `fetchPCO()` helper for PCO API calls with Basic Auth
- `packages/api/prisma/schema.prisma` — Schedule model with PlanTime has-many, ScheduleStatus enum

### Institutional Learnings

- `docs/solutions/integration-issues/pco-schedule-sync-missing-migration-and-incorrect-service-times.md` — PlanTime model already stores `timeType`, `name`, `startsAt`, `endsAt`. Use `timeType` for labeling (service/rehearsal/other). Sort by `sortDate` not `startsAt`.
- `docs/solutions/integration-issues/pco-sync-pgboss-porting.md` — PCO API uses server-side PAT (Basic Auth), not user OAuth tokens. Provider enum is SCREAMING_SNAKE_CASE.
- `docs/solutions/integration-issues/trpc-v11-server-components-hydration.md` — prefetch with `queryClient.prefetchQuery()`, consume with `useSuspenseQuery`, invalidate with `queryOptions().queryKey`.
- `docs/solutions/integration-issues/authjs-v5-pco-oidc-trpc-v11.md` — OAuth scopes already include `services`. User OAuth tokens are NOT stored for API calls.

## Key Technical Decisions

- **Use user's OAuth token for accept/decline with auto-refresh**: The user's `access_token` is already stored in the JWT (set during login). Expose it to the tRPC context via the session, and use it for PCO API calls so actions appear as from the user, not the app. Add refresh token handling in the Auth.js JWT callback to auto-refresh expired tokens (~2hr lifetime). Store `refresh_token` and `expires_at` in the JWT alongside `access_token`.

- **New `schedules` tRPC router for cross-team queries and mutations**: The existing `teams.list()` only returns `nextServingDate` per team. The cross-team "Upcoming Serving" section needs a dedicated query returning full schedule data across all teams. Accept/decline mutations also belong here. Team-scoped schedule data stays in `teams.get()`.

- **In-page expand for "See all"**: Simpler than a dedicated page. The initial 3 items render, "See all" fetches/reveals the rest. A dedicated schedules page can be added later if needed.

- **Optimistic update for accept/decline**: Update the local Schedule record immediately via Prisma after the PCO API call succeeds. No immediate re-sync — the hourly sync reconciles. This keeps the response fast and avoids rate limit concerns.

- **Reuse and extend `UpcomingServing` component**: The existing component already handles date formatting, status display, and badges. Extend it with expandable rows and action buttons rather than creating parallel components.

## Open Questions

### Resolved During Planning

- **Auth for accept/decline**: Use user's OAuth access_token with auto-refresh via Auth.js JWT callback (see Key Technical Decisions)
- **"See all" behavior**: In-page expand, not a new route
- **Post-action sync**: Optimistic local update, hourly sync reconciles

### Deferred to Implementation

- **PCO accept/decline response format**: The exact response shape from `POST .../schedules/{id}/accept` and `POST .../schedules/{id}/decline` — handle during implementation by inspecting actual responses
- **Decline reason field behavior**: Whether PCO requires a reason or accepts empty — test during implementation

## Implementation Units

- [ ] **Unit 0: Auth — Expose OAuth token to tRPC context with auto-refresh**

  **Goal:** Store `refresh_token` and `expires_at` in the JWT, auto-refresh expired tokens, and expose `accessToken` to the tRPC context so mutations can call the PCO API as the user.

  **Requirements:** R12, R13

  **Dependencies:** None

  **Files:**
  - Modify: `packages/auth/src/index.ts`
  - Modify: `packages/api/src/init.ts` (tRPC context)

  **Approach:**
  - In the Auth.js `jwt` callback: store `account.refresh_token` and `account.expires_at` alongside existing `account.access_token` on initial login
  - On subsequent JWT calls (when `account` is undefined — token refresh cycle): check if `token.expires_at` is in the past. If so, call PCO's token endpoint to refresh using the stored `refresh_token`. Update `accessToken`, `refreshToken`, `expiresAt` in the returned token.
  - In the `session` callback: expose `token.accessToken` to `session.accessToken` (or a nested field)
  - In the tRPC context (`packages/api/src/init.ts`): read `session.accessToken` and include it in the context so `protectedProcedure` handlers can access it
  - PCO's token endpoint: `POST https://api.planningcenteronline.com/oauth/token` with `grant_type=refresh_token`

  **Patterns to follow:**
  - Existing JWT callback in `packages/auth/src/index.ts`
  - Auth.js v5 token rotation docs
  - Existing tRPC context creation in `packages/api/src/init.ts`

  **Test scenarios:**
  - Happy path: After login, JWT contains accessToken, refreshToken, and expiresAt
  - Happy path: Expired token triggers refresh, new accessToken stored in JWT
  - Error path: Refresh fails (revoked token) — session cleared, user must re-login
  - Integration: tRPC context includes accessToken from session

  **Verification:**
  - `ctx.accessToken` available in tRPC handlers. Token auto-refreshes when expired.

- [ ] **Unit 1: tRPC — Add schedules router with upcoming query and respond mutation**

  **Goal:** Create a new `schedules` router with a cross-team upcoming query and accept/decline mutation.

  **Requirements:** R1-R3, R5, R11-R14

  **Dependencies:** Unit 0

  **Files:**
  - Create: `packages/api/src/routers/schedules.ts`
  - Modify: `packages/api/src/routers/_app.ts` (register router)

  **Approach:**
  - `schedules.upcoming` query: fetch all future schedules for `ctx.personId` across all teams, ordered by `sortDate`, including team name and planTimes. No limit — the UI controls how many to show.
  - `schedules.respond` mutation: accepts `{ scheduleId, action: "accept" | "decline", reason?: string }`. Looks up the schedule's `remoteId`, calls the PCO API using `ctx.accessToken` (user's OAuth token), updates the local record's status, returns the updated schedule.
  - The PCO accept endpoint: `POST /services/v2/service_types/{serviceTypeId}/plans/{planId}/team_members/{teamMemberId}/accept` — we need `remoteId` (team member ID) and `planRemoteId` from the Schedule record. The service type can be derived from the team's service type relation.
  - Create a simple `fetchPCOAsUser(path, accessToken, options?)` helper in the api package for user-authenticated PCO calls (separate from the sync's PAT-based `fetchPCO`).

  **Patterns to follow:**
  - Existing `teamsRouter` in `packages/api/src/routers/teams.ts` for query/mutation patterns
  - `protectedProcedure` from `packages/api/src/init.ts`
  - `fetchPCO()` pattern from `packages/jobs/src/pco.ts`

  **Test scenarios:**
  - Happy path: `upcoming` returns schedules across 2 teams sorted by sortDate, each with team name and planTimes
  - Happy path: `respond` with action "accept" calls PCO API, updates local status to CONFIRMED
  - Happy path: `respond` with action "decline" and reason calls PCO API, updates local status to DECLINED
  - Edge case: User has no schedules — returns empty array
  - Edge case: Schedule is already confirmed — accept is a no-op (or PCO handles idempotently)
  - Error path: PCO API returns error — mutation throws, local status unchanged
  - Error path: Schedule not found or doesn't belong to user — throws NOT_FOUND

  **Verification:**
  - tRPC queries return schedule data with team names and planTimes. Mutation updates status. TypeScript compiles.

- [ ] **Unit 2: UI — Upcoming Serving section on My Teams page**

  **Goal:** Add a chronological "Upcoming Serving" section above team cards showing next 3 schedules with "See all" expand.

  **Requirements:** R1-R5

  **Dependencies:** Unit 1

  **Files:**
  - Create: `apps/web/src/components/teams/upcoming-serving-overview.tsx`
  - Modify: `apps/web/src/app/(app)/teams/teams-list-content.tsx`
  - Modify: `apps/web/src/app/(app)/teams/page.tsx` (add prefetch)

  **Approach:**
  - New `UpcomingServingOverview` component that fetches `schedules.upcoming` via `useSuspenseQuery`
  - Shows first 3 items. Each row: date, time, team name, position badge, status indicator
  - "See all" button toggles showing all remaining items (simple state toggle, data already loaded)
  - Omit entire section when schedules array is empty (R5)
  - Add `queryClient.prefetchQuery(trpc.schedules.upcoming.queryOptions())` in the page server component
  - Each row includes team name since this is cross-team context (unlike team view where team is implicit)

  **Patterns to follow:**
  - Existing `UpcomingServing` component for date/time formatting and status display
  - `TeamsListContent` for the `useSuspenseQuery` + tRPC pattern
  - `TeamsPage` server component for prefetch pattern

  **Test scenarios:**
  - Happy path: Shows 3 schedules with date, time, team name, position, status across 2 teams
  - Happy path: "See all" reveals remaining 4 schedules
  - Edge case: Exactly 3 or fewer schedules — "See all" button hidden
  - Edge case: No schedules — entire section not rendered
  - Edge case: Schedule with no position name — renders without badge

  **Verification:**
  - Section appears above team cards. Shows 3 items. "See all" reveals the rest. Omitted when empty.

- [ ] **Unit 3: UI — Expandable call times on schedule rows**

  **Goal:** Make schedule rows expandable to reveal PlanTime call times (rehearsals, call times, etc.)

  **Requirements:** R6-R10

  **Dependencies:** Unit 1 (planTimes included in query data)

  **Files:**
  - Modify: `apps/web/src/components/teams/upcoming-serving.tsx`

  **Approach:**
  - Add expand/collapse state per row (local component state)
  - Clicking a row toggles its expanded state (chevron indicator)
  - Expanded section shows a list of PlanTime entries: name (e.g., "Rehearsal"), date, start–end time
  - Use `timeType` to display a label badge (service/rehearsal/other)
  - Sort plan times chronologically by `startsAt`
  - Collapsed by default (R10)
  - Only show expand affordance when planTimes exist and have length > 0

  **Patterns to follow:**
  - Existing `UpcomingServing` component structure
  - `formatDate` and `formatTime` helpers already in the component
  - Badge component for type labels

  **Test scenarios:**
  - Happy path: Clicking a row expands to show 3 plan times (rehearsal Wed, call time Sun, service Sun) sorted chronologically
  - Happy path: Clicking again collapses the row
  - Edge case: Schedule with 0 plan times — no expand affordance shown
  - Edge case: Plan time with no name — shows time without label
  - Edge case: Plan time with no startsAt — shows name only

  **Verification:**
  - Rows expand/collapse on click. Plan times shown with name, date, time. Collapsed by default.

- [ ] **Unit 4: UI — Accept/decline actions on schedule items**

  **Goal:** Add accept/decline buttons to unconfirmed schedules with optimistic UI updates.

  **Requirements:** R11-R17

  **Dependencies:** Unit 1 (respond mutation), Unit 2 + Unit 3 (UI components to extend)

  **Files:**
  - Modify: `apps/web/src/components/teams/upcoming-serving.tsx`
  - Modify: `apps/web/src/components/teams/upcoming-serving-overview.tsx`

  **Approach:**
  - For UNCONFIRMED schedules: show Accept (green) and Decline (muted) buttons alongside status
  - Accept: call `schedules.respond({ scheduleId, action: "accept" })`, optimistically update status to CONFIRMED
  - Decline: show a small inline input/modal for optional reason, then call `schedules.respond({ scheduleId, action: "decline", reason })`, optimistically update to DECLINED
  - Use `useMutation` with `onMutate` for optimistic update and `onError` for rollback
  - Invalidate `schedules.upcoming` and `teams.get` query keys on settlement
  - CONFIRMED: show confirmed status, no buttons (R15)
  - DECLINED: show declined status, no buttons (R16)
  - Buttons appear on both My Teams overview and team view card (R17) — shared logic in the UpcomingServing component

  **Patterns to follow:**
  - tRPC v11 `useMutation` with `mutationOptions()` pattern
  - Optimistic update pattern: `queryClient.setQueryData` in `onMutate`, restore in `onError`
  - `invalidateQueries` with `queryOptions().queryKey` on settlement

  **Test scenarios:**
  - Happy path: Accept button on UNCONFIRMED schedule → status changes to CONFIRMED, buttons disappear
  - Happy path: Decline button → reason prompt → submit → status changes to DECLINED
  - Happy path: Decline with empty reason → still submits successfully
  - Edge case: CONFIRMED schedule — no action buttons shown
  - Edge case: DECLINED schedule — no action buttons shown
  - Error path: PCO API fails → optimistic update rolls back to UNCONFIRMED, error shown
  - Integration: Accept on My Teams overview updates both the overview and team view schedule data

  **Verification:**
  - Buttons appear only on UNCONFIRMED schedules. Accept/decline calls PCO API and updates UI. Errors roll back.

## System-Wide Impact

- **New tRPC router**: `schedules` router added to `_app.ts`. Does not modify existing `teams` router queries.
- **PCO API writes**: First write operation to PCO (all prior interactions were reads). Uses existing PAT auth. Rate limits apply (100 req/20s) — accept/decline is user-initiated so volume is naturally low.
- **Query invalidation**: Accept/decline mutations invalidate `schedules.upcoming` and `teams.get` caches. Both are already used in the app.
- **Unchanged invariants**: Existing team sync, team view schedule display, team card nextServingDate — all unchanged. The new cross-team query and mutations are additive.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| PCO OAuth token refresh may fail silently | Handle refresh errors by clearing the session and redirecting to login. Log refresh failures for monitoring. |
| PCO OAuth token not present in JWT for existing sessions | Users who logged in before this change won't have refresh_token in their JWT. They'll need to re-login once. Accept/decline should gracefully handle missing token. |
| PCO accept/decline endpoint path may differ from documentation | Inspect actual API responses during implementation. The endpoint structure follows PCO's REST conventions. |
| Optimistic UI rollback on error may flash | Keep the loading state on the button until the mutation settles. Only show optimistic status after the API call resolves. |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-28-schedule-ui-enhancements-requirements.md](../brainstorms/2026-03-28-schedule-ui-enhancements-requirements.md)
- PCO Services API: `POST /services/v2/.../team_members/{id}/accept` and `.../decline`
- Related solution: `docs/solutions/integration-issues/pco-schedule-sync-missing-migration-and-incorrect-service-times.md`
- Related plan: `docs/plans/2026-03-28-002-feat-pco-schedule-sync-plan.md`
