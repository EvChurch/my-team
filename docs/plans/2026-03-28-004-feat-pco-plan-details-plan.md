---
title: "feat: PCO Plan Details Page"
type: feat
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-pco-plan-details-requirements.md
deepened: 2026-03-28
---

# feat: PCO Plan Details Page

## Overview

Add a read-only plan details page (`/plans/[planRemoteId]`) that fetches full service plan content from the PCO API on-demand. Volunteers who are scheduled for a plan can view the service order, songs with keys and chord charts, team roster, plan times, notes, and attachments — all without leaving the app.

## Problem Frame

Volunteers see when they're scheduled but must switch to PCO to view plan content (service order, songs, notes, roster). This creates friction during rehearsal and Sunday morning prep. A plan details page consolidates everything in one place. (see origin: docs/brainstorms/2026-03-28-pco-plan-details-requirements.md)

## Requirements Trace

- R1. Schedule items link to plan details page
- R2. Route: `/plans/[planRemoteId]`
- R3. Access restricted to users with a Schedule record matching that planRemoteId
- R5-R6. On-demand PCO API fetch using server-side PAT credentials
- R7. Loading skeleton during fetch
- R8-R12. Service order: items, songs (key, arrangement, chord chart), media, headers
- R13-R15. Team roster grouped by team, current user highlighted
- R16-R17. Plan times sorted chronologically
- R18-R20. Plan-level notes and attachments; song attachments inline
- R21-R22. Plan header with service type, dates, and PCO deep link

## Scope Boundaries

- Read-only — no editing plan data
- No caching or local storage of plan content (fresh fetch each view)
- No plan search or filtering — accessed only via schedule item links
- No offline support
- Accept/decline handled by schedule-ui-enhancements (separate feature)
- Past plans are accessible if the user still has a Schedule record referencing them

## Context & Research

### Relevant Code and Patterns

- **Page pattern**: Server component with `prefetchQuery` + `HydrationBoundary` + `Suspense` → client `useSuspenseQuery` content component. See `apps/web/src/app/(app)/teams/[teamId]/page.tsx`
- **tRPC router**: `protectedProcedure` with Zod input, Prisma queries, `TRPCError` codes. See `packages/api/src/routers/schedules.ts`
- **serviceTypeRemoteId resolution**: `schedules.respond` already resolves `Schedule → Team → ServiceType.remoteId` (line 80-99 in schedules.ts). Reuse this pattern
- **PCO API client**: `fetchPCO()` in `packages/jobs/src/pco.ts` — Basic Auth PAT, `jsona` JSON:API deserializer, Zod validation. Currently in `@mt/jobs` only
- **Schedule row component**: `ScheduleRow` in `apps/web/src/components/teams/schedule-row.tsx` — expandable call times, accept/decline buttons, used by both `UpcomingServing` (team view) and `UpcomingServingOverview` (teams page). Has existing `onClick` handlers for expand/accept/decline that must not conflict with plan navigation links
- **Schedules router**: `packages/api/src/routers/schedules.ts` — `upcoming` query (all user schedules) and `respond` mutation (accept/decline via PCO API). Uses `fetchPCOAsUser` for write operations
- **Error page pattern**: `error.tsx` with `ErrorState` component + `reset` callback. See `apps/web/src/app/(app)/teams/[teamId]/error.tsx`
- **UI components**: `Card`, `Badge`, `Avatar`, `Skeleton*`, `EmptyState`, `ErrorState` in `apps/web/src/components/ui/`

### Institutional Learnings

- **PCO auth separation**: OAuth is identity-only. API calls use PAT (`PCO_API_ID`/`PCO_API_SECRET` with Basic Auth). Never use the user's OAuth token for read operations (see `docs/solutions/integration-issues/authjs-v5-pco-oidc-trpc-v11.md`)
- **plan_time time_type**: Use the `time_type` field to distinguish service vs rehearsal times. Never use naive min/max (see `docs/solutions/integration-issues/pco-schedule-sync-missing-migration-and-incorrect-service-times.md`)
- **Provider enum**: Always use `Provider.PCO` (SCREAMING_SNAKE_CASE) in Prisma operations (see `docs/solutions/integration-issues/pco-sync-pgboss-porting.md`)
- **Prisma migrations**: Always run both `prisma generate` AND `prisma migrate dev` for schema changes (see `docs/solutions/integration-issues/pco-schedule-sync-missing-migration-and-incorrect-service-times.md`)
- **tRPC v11 hydration**: Use `trpc.route.queryOptions()` pattern with `prefetchQuery`/`useSuspenseQuery`, not v10 helpers (see `docs/solutions/integration-issues/trpc-v11-server-components-hydration.md`)

### External References

- PCO Services API v2: Plan has `planning_center_url` attribute (deep link — no URL construction needed)
- Items endpoint: `GET /services/v2/service_types/{id}/plans/{id}/items?include=song,arrangement,key,item_notes,media` — returns full service order with sideloaded data
- Plan notes: `GET /services/v2/service_types/{id}/plans/{id}/notes` — returns `content` and `category_name`
- All attachments: `GET /services/v2/service_types/{id}/plans/{id}/all_attachments` — recursive (plan + item + song attachments)
- Arrangement includes `chord_chart` text inline (ChordPro format), plus attachments sub-endpoint for PDF chord charts/lead sheets
- Item `item_type` values: `"song"`, `"header"`, `"media"`, `"item"`
- Item `service_position` values: `"pre"`, `"during"`, `"post"`

## Key Technical Decisions

- **PAT over user OAuth token for reads**: The local Schedule access check already gates who can view. PAT is simpler (no token refresh), consistent with the sync pipeline, and avoids failure when a user's OAuth token expires. The user token is used only for write operations like accept/decline (see origin: key decision "On-demand fetch over DB sync")
- **PCO API helper in `@mt/api`**: `fetchPCO()` currently lives in `@mt/jobs`. Since `@mt/jobs` already depends on `@mt/api`, the simplest approach is to add `fetchPCO` to `@mt/api/src/lib/pco.ts` and have `@mt/jobs` import it from there. This avoids creating a new package (`@mt/shared` doesn't exist yet and is intended for types/schemas, not HTTP clients) and follows the existing dependency direction. Note: `fetchPCOAsUser` (OAuth Bearer, for write operations) stays in `schedules.ts` — it is a different auth mode and not part of this extraction
- **New `plans` tRPC router over extending `schedules`**: Plan details is a distinct domain (fetching PCO content) vs schedules (local schedule records). A dedicated router keeps concerns separate and the file size manageable
- **3-5 parallel PCO API calls with graceful degradation**: Plan+times, items, and team members are **required** (procedure fails if any error). Notes and attachments are **optional** (return empty arrays on failure). Use `Promise.allSettled` for the optional calls. Add `AbortSignal.timeout(8000)` to each `fetchPCO` call to prevent indefinite hangs on the user-facing request path
- **planRemoteId + personId composite index**: The access check query needs this to avoid sequential scans. Low-cost schema change with clear benefit for a user-facing page load
- **PCO deep link from API response**: The Plan resource returns `planning_center_url` — use it directly rather than constructing URLs manually (see origin: R22)

## Open Questions

### Resolved During Planning

- **Which PCO endpoints for full plan data**: 3-5 calls: (1) plan with plan_times, (2) items with song/arrangement/key/notes/media includes, (3) team_members with person/team includes, (4) notes if plan_notes_count > 0, (5) all_attachments. Run in parallel
- **Access control approach**: Check local `Schedule` record by `planRemoteId + personId`. Fast (indexed), no PCO API call needed. Resolves `serviceTypeRemoteId` through `Team → ServiceType` relation in the same query (same pattern as `schedules.respond`)
- **Song data from PCO API**: `key_name` on Item, `name` on Arrangement, `chord_chart` text on Arrangement. Chord chart PDFs via arrangement attachments or `all_attachments` endpoint
- **Plan notes structure**: `content` (text body) + `category_name` (label). Fetched via plan notes sub-endpoint
- **Deep link URL**: PCO provides `planning_center_url` on Plan resource — no manual URL construction
- **tRPC vs server component fetch**: tRPC query with `prefetchQuery`/`useSuspenseQuery` — matches existing codebase pattern. The tRPC procedure does the PCO API calls server-side

### Deferred to Implementation

- **Attachment URL expiry**: PCO attachment URLs may be time-limited signed URLs. If so during implementation, may need to proxy downloads or fetch fresh URLs. Start with direct links and test
- **Pagination for large plans**: Items and team_members endpoints use `per_page=100`. Most church plans won't exceed this. If needed, add pagination in a follow-up
- **Chord chart rendering**: The `chord_chart` field contains ChordPro-format text. Rendering it nicely (vs plain text) can be deferred — start with preformatted text display

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌─────────────────────────────────────────────────────────────┐
│  /plans/[planRemoteId]                                      │
│  (Server Component)                                         │
│                                                             │
│  1. prefetchQuery(trpc.plans.get({ planRemoteId }))        │
│  2. HydrationBoundary + Suspense → PlanDetailsContent       │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  plans.get tRPC procedure (protectedProcedure)              │
│                                                             │
│  1. Access check:                                           │
│     Schedule.findFirst({                                    │
│       planRemoteId, personId,                               │
│       include: team → serviceType.remoteId                  │
│     })                                                      │
│     → NOT_FOUND if no schedule                              │
│     → INTERNAL_SERVER_ERROR if no serviceType               │
│                                                             │
│  2. Parallel PCO API calls (via shared fetchPCO):           │
│     ┌──────────────┬──────────────┬──────────────┐         │
│     │ Plan+Times   │ Items+Songs  │ TeamMembers  │         │
│     │ +Arrangements│              │              │         │
│     └──────┬───────┴──────┬───────┴──────┬───────┘         │
│            │              │              │                   │
│     ┌──────┴───────┬──────┴───────┐                        │
│     │ Notes (cond) │ Attachments  │                        │
│     └──────────────┴──────────────┘                        │
│                                                             │
│  3. Return typed plan details object                        │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  PlanDetailsContent (Client Component)                      │
│                                                             │
│  ┌─────────────────────────────┐                           │
│  │ Plan Header                 │  service type, dates,     │
│  │ (dates, service type, link) │  PCO deep link            │
│  ├─────────────────────────────┤                           │
│  │ Plan Times                  │  chronological list       │
│  ├─────────────────────────────┤                           │
│  │ Service Order               │  items in sequence        │
│  │  ├─ Header Item             │  section divider          │
│  │  ├─ Song Item               │  key, arrangement, chord  │
│  │  │   └─ Attachments         │  chart, lead sheet links  │
│  │  ├─ Media Item              │  title + link             │
│  │  └─ Regular Item            │  title + description      │
│  ├─────────────────────────────┤                           │
│  │ Team Roster                 │  grouped by team          │
│  │  └─ Members (highlighted)   │  name, position, status   │
│  ├─────────────────────────────┤                           │
│  │ Notes                       │  category + content       │
│  ├─────────────────────────────┤                           │
│  │ Attachments                 │  downloadable links       │
│  └─────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Units

- [ ] **Unit 1: Add PCO API helper to `@mt/api`**

**Goal:** Make `fetchPCO()` and `jsona` deserialization available in `@mt/api` for the plans router, and update `@mt/jobs` to import from `@mt/api` instead of defining locally.

**Requirements:** R5, R6

**Dependencies:** None

**Files:**
- Create: `packages/api/src/lib/pco.ts`
- Modify: `packages/api/package.json` (add `jsona` dependency)
- Modify: `packages/jobs/src/pco.ts` (import `fetchPCO` from `@mt/api` instead of local definition)
- Modify: `packages/jobs/package.json` (remove `jsona` if no longer a direct consumer)

**Approach:**
- Create `packages/api/src/lib/pco.ts` with `fetchPCO()`, `pcoBasicAuth()`, and the `Jsona` formatter setup
- Accept an optional `AbortSignal` parameter on `fetchPCO` for timeout support (used by plans router)
- Export from `@mt/api` package exports
- Update `@mt/jobs/src/pco.ts` to import `fetchPCO` from `@mt/api` instead of defining locally. `@mt/jobs` already depends on `@mt/api`, so no new dependency needed
- Keep all Zod schemas in `@mt/jobs` — they are sync-specific
- Note: `fetchPCOAsUser` (OAuth Bearer token for write operations) stays in `schedules.ts` — different auth mode, not part of this extraction

**Patterns to follow:**
- Raw `.ts` source exports (no build step) per monorepo convention
- `@mt/api` package.json exports field pattern

**Test scenarios:**
- Happy path: `fetchPCO` returns deserialized JSON:API data when given a valid path
- Error path: `fetchPCO` throws with status code when PCO returns non-2xx
- Error path: `fetchPCO` aborts when `AbortSignal` fires (timeout)
- Integration: existing sync job still works after import path change

**Verification:**
- `pnpm type-check` passes for all packages
- `@mt/jobs` sync code compiles and imports `fetchPCO` from `@mt/api`
- No `jsona` or `fetchPCO` local definition remains in `@mt/jobs`

---

- [ ] **Unit 2: Add planRemoteId + personId composite index**

**Goal:** Ensure the access check query for plan details is fast.

**Requirements:** R3

**Dependencies:** None (can be done in parallel with Unit 1)

**Files:**
- Modify: `packages/api/prisma/schema.prisma`
- Create: `packages/api/prisma/migrations/<timestamp>_add_plan_remote_id_person_id_index/migration.sql` (generated)

**Approach:**
- Add `@@index([planRemoteId, personId])` to the `Schedule` model
- Run `prisma migrate dev` to generate the migration file
- Verify the migration SQL creates the expected index

**Patterns to follow:**
- Existing index declarations on Schedule model (`@@index([personId])`, etc.)
- Always run both `prisma generate` and `prisma migrate dev` (per institutional learning)

**Test scenarios:**
- Happy path: migration applies cleanly on a fresh database
- Edge case: migration applies cleanly on a database with existing Schedule data

**Verification:**
- Migration file exists under `prisma/migrations/`
- `pnpm --filter @mt/api exec prisma generate` succeeds
- `pnpm type-check` passes

---

- [ ] **Unit 3: Plans tRPC router — access check + PCO API fetching**

**Goal:** Create a `plans.get` tRPC procedure that verifies access, fetches full plan data from PCO API in parallel, and returns a typed response.

**Requirements:** R2, R3, R5, R6, R8-R22

**Dependencies:** Unit 1 (shared fetchPCO), Unit 2 (index)

**Files:**
- Create: `packages/api/src/routers/plans.ts`
- Modify: `packages/api/src/routers/_app.ts` (register plans router)

**Approach:**
- Input: `z.object({ planRemoteId: z.string() })`
- Access check: `prisma.schedule.findFirst({ where: { planRemoteId, personId: ctx.personId }, include: { team: { select: { serviceType: { select: { remoteId: true } } } } } })`. Throw `NOT_FOUND` if no schedule, `INTERNAL_SERVER_ERROR` if no serviceType
- Resolve `serviceTypeRemoteId` from the schedule's team relation (same pattern as `schedules.respond` lines 80-99)
- Add `AbortSignal.timeout(8000)` to each `fetchPCO` call to prevent user-facing hangs
- **Required calls** (fail the whole procedure if any error) — use `Promise.all`:
  1. Plan + plan_times: `/services/v2/service_types/{stId}/plans/{planId}?include=plan_times`
  2. Items + includes: `/services/v2/service_types/{stId}/plans/{planId}/items?include=song,arrangement,key,item_notes,media&per_page=100`
  3. Team members: `/services/v2/service_types/{stId}/plans/{planId}/team_members?include=person,team&per_page=100`
- **Optional calls** (return empty arrays on failure) — use `Promise.allSettled`:
  4. Notes: `/services/v2/service_types/{stId}/plans/{planId}/notes`
  5. All attachments: `/services/v2/service_types/{stId}/plans/{planId}/all_attachments`
- Define Zod schemas for each PCO response shape (with `.passthrough()`)
- Return a typed object with: plan metadata (title, dates, sort_date, planning_center_url, total_length, series_title), items array (ordered by sequence), team members (grouped by team), plan times, notes, attachments
- Include `ctx.personId`'s PCO remoteId in the response so the client can highlight the current user in the roster (resolve via `prisma.person.findUnique` → `remoteId`)

**Patterns to follow:**
- `schedulesRouter` in `packages/api/src/routers/schedules.ts` for access check + PCO API call pattern
- Zod schemas with `.passthrough()` for PCO responses (from `packages/jobs/src/pco.ts`)
- `protectedProcedure` from `packages/api/src/init.ts`

**Test scenarios:**
- Happy path: user with valid Schedule record gets full plan data returned
- Error path: user with no Schedule record for planRemoteId gets NOT_FOUND
- Error path: schedule exists but team has no serviceType → INTERNAL_SERVER_ERROR
- Error path: PCO API returns 404 (plan deleted) → appropriate error
- Error path: PCO API returns 429 or 5xx → appropriate error
- Edge case: user is on multiple teams for same plan → any matching Schedule grants access
- Edge case: plan has no notes (plan_notes_count = 0) → notes fetch skipped, empty array returned
- Edge case: plan has no items → empty service order returned
- Integration: parallel PCO calls all resolve and data is properly typed

**Verification:**
- `pnpm type-check` passes
- Router is registered in `_app.ts` and accessible via `trpc.plans.get`
- Response shape covers all data needed by the UI (items, roster, times, notes, attachments)

---

- [ ] **Unit 4: Plan details page — server component, loading, and error**

**Goal:** Create the Next.js page route at `/plans/[planRemoteId]` with prefetching, loading skeleton, and error boundary.

**Requirements:** R2, R7

**Dependencies:** Unit 3 (plans router)

**Files:**
- Create: `apps/web/src/app/(app)/plans/[planRemoteId]/page.tsx`
- Create: `apps/web/src/app/(app)/plans/[planRemoteId]/loading.tsx`
- Create: `apps/web/src/app/(app)/plans/[planRemoteId]/error.tsx`

**Approach:**
- `page.tsx`: Server component with `params: Promise<{ planRemoteId: string }>`, prefetchQuery via `trpc.plans.get.queryOptions({ planRemoteId })`, HydrationBoundary + Suspense wrapping `PlanDetailsContent`
- `loading.tsx`: Skeleton with blocks for header, plan times, service order items, roster
- `error.tsx`: `ErrorState` with "Couldn't load plan" message and retry button. For NOT_FOUND, show "This plan is not available" without retry

**Patterns to follow:**
- `apps/web/src/app/(app)/teams/[teamId]/page.tsx` — exact same prefetch/hydrate pattern
- `apps/web/src/app/(app)/teams/[teamId]/error.tsx` — error boundary pattern
- Skeleton components from `apps/web/src/components/ui/skeleton.tsx`

**Test scenarios:**
- Happy path: page renders with prefetched data
- Error path: NOT_FOUND displays "plan not available" message
- Error path: PCO API error displays generic error with retry button
- Edge case: loading state shows skeleton during fetch

**Verification:**
- Route `/plans/[planRemoteId]` resolves and renders
- Loading skeleton appears during data fetch
- Error boundary catches and displays appropriate error state

---

- [ ] **Unit 5: Plan details content — header, plan times, and service order**

**Goal:** Build the main content component showing plan header, times, and the full service order with song details.

**Requirements:** R8-R12, R16-R17, R21-R22

**Dependencies:** Unit 4 (page shell)

**Files:**
- Create: `apps/web/src/app/(app)/plans/[planRemoteId]/plan-details-content.tsx`
- Create: `apps/web/src/components/plans/plan-header.tsx`
- Create: `apps/web/src/components/plans/plan-times.tsx`
- Create: `apps/web/src/components/plans/service-order.tsx`
- Create: `apps/web/src/components/plans/service-order-item.tsx`

**Approach:**
- `plan-details-content.tsx`: "use client" component, `useSuspenseQuery(trpc.plans.get.queryOptions(...))`, renders all sections in a vertical stack
- `plan-header.tsx`: Service type name, plan dates, series title (if present), total length, PCO deep link button (opens in new tab via `planning_center_url`). Back navigation link to previous page
- `plan-times.tsx`: Chronological list of plan times — name, date, start/end time. Use time_type to show badges (Service, Rehearsal, etc.)
- `service-order.tsx`: Maps items array by sequence. Renders each item via `service-order-item.tsx`
- `service-order-item.tsx`: Switches on `item_type`:
  - `"header"` → section divider with bold title
  - `"song"` → title, key (`key_name`), arrangement name, duration, description. Chord chart text displayed in a collapsible preformatted block. Song attachments listed as links
  - `"media"` → title, description, media link
  - `"item"` → title, duration, description/notes

**Patterns to follow:**
- `UpcomingServing` component (`apps/web/src/components/teams/upcoming-serving.tsx`) for date/time formatting and status badges
- `Card` component for section containers
- Tailwind design tokens: `text-text-primary`, `text-text-secondary`, `bg-bg-card`, etc.
- Back navigation pattern: `<Link>` with `ArrowLeft` icon

**Test scenarios:**
- Happy path: all section types render correctly (header, song, media, item)
- Happy path: plan times display chronologically with name and time range
- Happy path: PCO deep link opens in new tab
- Edge case: song with no key_name or arrangement → renders title only
- Edge case: song with chord_chart text → shows collapsible chord chart
- Edge case: item with no description → renders without description block
- Edge case: plan with no plan_times → times section omitted
- Edge case: header item → renders as section divider without duration

**Verification:**
- Service order items display in correct sequence order
- Song items show key, arrangement, and chord chart when available
- Plan header shows service type, dates, and functional PCO link
- Layout works on both mobile (stacked, full-width) and desktop (constrained width)

---

- [ ] **Unit 6: Team roster and notes/attachments sections**

**Goal:** Build the roster (grouped by team, current user highlighted) and notes/attachments sections.

**Requirements:** R13-R15, R18-R20

**Dependencies:** Unit 5 (content component exists to add sections to)

**Files:**
- Create: `apps/web/src/components/plans/plan-roster.tsx`
- Create: `apps/web/src/components/plans/plan-notes.tsx`
- Create: `apps/web/src/components/plans/plan-attachments.tsx`
- Modify: `apps/web/src/app/(app)/plans/[planRemoteId]/plan-details-content.tsx` (add roster, notes, attachments sections)

**Approach:**
- `plan-roster.tsx`: Group team members by team name. Each group: team name header, then member rows with avatar (from PCO `photo_thumbnail`), name, position, status badge (Confirmed/Unconfirmed/Declined using existing `statusConfig` pattern from `UpcomingServing`). Current user highlighted with accent border/background — match by comparing team member's person ID with the pcoRemoteId from the tRPC response
- `plan-notes.tsx`: List of notes with category name as a label and content as body text. Omit section if no notes
- `plan-attachments.tsx`: Plan-level attachments as a list of download/view links with filename, file size, and content type icon. Song/arrangement attachments are rendered inline with their service order items (Unit 5)
- Omit entire sections when data is empty (no empty states needed for sub-sections)

**Patterns to follow:**
- `Avatar` component for member photos with initials fallback
- `Badge` component for status (accent for confirmed, muted for unconfirmed)
- `Card` for section containers
- Status config pattern from `apps/web/src/components/teams/upcoming-serving.tsx`

**Test scenarios:**
- Happy path: roster groups members by team with correct position and status
- Happy path: current user's row is visually highlighted
- Happy path: notes render with category labels
- Happy path: attachments render as downloadable links
- Edge case: team member with no photo → avatar shows initials
- Edge case: team member with no position → position badge omitted
- Edge case: no notes exist → notes section hidden
- Edge case: no plan-level attachments → attachments section hidden
- Edge case: user on multiple teams → highlighted in each team group

**Verification:**
- Roster correctly groups by team
- Current user visually distinct in roster
- Notes and attachments render when present, hidden when absent
- Attachment links are functional

---

- [ ] **Unit 7: Schedule item links to plan details**

**Goal:** Make schedule items throughout the app clickable, navigating to the plan details page.

**Requirements:** R1, R4

**Dependencies:** Unit 4 (plan details page exists to navigate to)

**Files:**
- Modify: `packages/api/src/routers/teams.ts` (add `planRemoteId` to schedule select in `teams.get` query)
- Modify: `packages/api/src/routers/schedules.ts` (add `planRemoteId` to schedule select in `schedules.upcoming` query)
- Modify: `apps/web/src/components/teams/schedule-row.tsx` (add `planRemoteId` to `Schedule` type, wrap row in Link to `/plans/{planRemoteId}`)
- Modify: `apps/web/src/components/teams/upcoming-serving.tsx` (add `planRemoteId` to `ScheduleItem` type)

**Approach:**
- The schedule-ui-enhancements feature has merged. `ScheduleRow` is now the primary schedule component (used by both `UpcomingServing` on team view and `UpcomingServingOverview` on teams page)
- Add `planRemoteId` to the `Schedule` type in `schedule-row.tsx` and wrap the main row div in `<Link href={/plans/${schedule.planRemoteId}}>` (or use `onClick` + `router.push` to avoid interfering with the existing expand/accept/decline click handlers)
- Update both tRPC queries that provide schedule data: `teams.get` schedule select (line 211) and `schedules.upcoming` query, adding `planRemoteId: true` to the select
- The `UpcomingServingOverview` component and `UpcomingServing` component will automatically get `planRemoteId` through `ScheduleRow` once the data flows through
- Care needed: `ScheduleRow` already has `onClick` for expanding call times and `stopPropagation` on accept/decline buttons. The Link wrapper should not conflict with these — use a dedicated "View plan" link/button within the row rather than wrapping the entire row, OR use `router.push` on a non-interactive area

**Patterns to follow:**
- `ScheduleRow` component structure in `apps/web/src/components/teams/schedule-row.tsx`
- `TeamCard` link pattern for navigation styling

**Test scenarios:**
- Happy path: clicking the plan link on a schedule row navigates to `/plans/{planRemoteId}`
- Happy path: planRemoteId is included in the schedule data from both tRPC queries
- Edge case: schedule with missing planRemoteId → link not rendered (defensive)
- Edge case: accept/decline buttons still work without triggering navigation
- Edge case: expand/collapse call times still works without triggering navigation

**Verification:**
- Schedule rows in team view are clickable and navigate to plan details
- Plan details page loads with correct data for the linked plan
- Back navigation from plan details returns to the previous page

## System-Wide Impact

- **Interaction graph:** New `plans` router added to tRPC app router. `fetchPCO` moved to `@mt/api` — any changes to PCO auth or base URL now affect both `@mt/api` routers and `@mt/jobs` sync (single source of truth). `fetchPCOAsUser` (OAuth) remains separate in `schedules.ts`
- **Error propagation:** PCO API errors in the `plans.get` procedure propagate as tRPC errors. 404 → `NOT_FOUND`, other errors → `INTERNAL_SERVER_ERROR`. The error.tsx boundary catches these client-side
- **State lifecycle risks:** No local state mutations — purely read-only from PCO API. No cache invalidation concerns. Schedule records used only for access check, not modified
- **API surface parity:** The `plans` router is read-only. No mutations that need to be reflected elsewhere
- **Integration coverage:** The key cross-layer scenario is: schedule row click → plan details page → tRPC prefetch → PCO API calls → UI render. Unit 7 bridges the schedule UI to the plan details page
- **Unchanged invariants:** Existing schedule sync, team views, and all other routes are unaffected. The `@mt/jobs` sync code continues to work after the `fetchPCO` move (Unit 1 ensures import path change only). `fetchPCOAsUser` in `schedules.ts` is untouched

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| PCO API rate limiting on concurrent per-page fetches (3-5 calls) | Well within 100 req/20s limit. Monitor in production |
| Attachment URLs may require auth or expire | Start with direct links. If broken in testing, add server-side proxy endpoint |
| `fetchPCO` move to `@mt/api` breaks sync worker | Unit 1 verifies sync still compiles. `@mt/jobs` already depends on `@mt/api`, so import path change is the only delta |
| Large plans with >100 items or team members | Use `per_page=100`. Most church plans are much smaller. Add pagination in follow-up if needed |
| PCO plan deleted but local Schedule record persists | Show "plan not available" error. Stale Schedule pruned on next hourly sync |
| Stale access: user removed from plan in PCO but Schedule not yet pruned | Accepted behavior — user can view plan until next hourly sync prunes their Schedule record. Read-only access, low risk |
| PCO API slow or hanging | `AbortSignal.timeout(8000)` on each call. Optional calls (notes, attachments) degrade gracefully |
| `serviceType` null on Team (FK is nullable) | Handle explicitly with INTERNAL_SERVER_ERROR, same as `schedules.respond` |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-28-pco-plan-details-requirements.md](docs/brainstorms/2026-03-28-pco-plan-details-requirements.md)
- Related plan: [docs/plans/2026-03-28-003-feat-schedule-ui-enhancements-plan.md](docs/plans/2026-03-28-003-feat-schedule-ui-enhancements-plan.md) (R1/R4 integration point)
- PCO API pattern: `packages/api/src/routers/schedules.ts` (serviceTypeRemoteId resolution)
- PCO API client: `packages/jobs/src/pco.ts` (fetchPCO, Zod schemas, jsona setup)
- Page pattern: `apps/web/src/app/(app)/teams/[teamId]/page.tsx`
- Schedule component: `apps/web/src/components/teams/upcoming-serving.tsx`
- Institutional learnings: `docs/solutions/integration-issues/` (PCO auth, migrations, tRPC hydration)
