---
title: "feat: PCO + Rock unified My Team profile sync"
type: feat
status: planned
date: 2026-05-25
sequence: 1
origin: docs/brainstorms/2026-05-25-rock-pco-unified-my-team-requirements.md
---

# feat: PCO + Rock Unified My Team Profile Sync

## Overview

Move primary login to Auth0 and introduce a canonical **My Team profile** layer
that reconciles identities and source data from Planning Center Online and Rock
RMS. PCO remains supported as a ministry data source while Rock is added as a
second provider. The first implementation should favor read-only Rock sync and
auditable reconciliation over risky writeback. Because there are no current
production application users, this can be a breaking migration: remove
PCO-login assumptions directly and avoid compatibility layers for old sessions
or old app-native user ownership.

## Implementation Units

### Unit 1: Auth0 Login Foundation

**Goal:** Make Auth0 the primary app login while preserving the ability to link
PCO and Rock source identities.

**Files:**

- `packages/auth/src/index.ts`
- `packages/auth/src/planning-center.ts`
- New `packages/auth/src/auth0.ts`
- `packages/api/src/init.ts`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/env.ts`
- `apps/web/messages/*.json`
- `.env.example`

**Approach:**

- Add an Auth0 provider to Auth.js/NextAuth.
- Store Auth0 subject, email, name, and picture in the session/JWT.
- Remove PCO as the primary sign-in button.
- Remove PCO-login session fields from the primary auth path.
- Keep PCO OAuth code only if user-scoped PCO writeback remains required later;
  if so, reintroduce it behind a "connect Planning Center" flow instead of
  login.
- Add `AUTH_AUTH0_ID`, `AUTH_AUTH0_SECRET`, and `AUTH_AUTH0_ISSUER`.
- Update tRPC context to resolve the current user by Auth0 account/profile link,
  not by `session.user.pcoId`.

**Acceptance Criteria:**

- Users sign in with Auth0 and land in the app.
- Session contains an Auth0 subject that resolves to a My Team profile.
- PCO background sync still runs with `PCO_API_ID` and `PCO_API_SECRET`.
- PCO schedule accept/decline can be removed or disabled until a separate PCO
  connected-account flow exists.

### Unit 2: Canonical Profile Foundation

**Goal:** Stop treating a provider-specific `Person` as the app's durable user
identity.

**Files:**

- `packages/api/prisma/schema.prisma`
- `packages/api/src/init.ts`
- `packages/api/src/routers/people.ts`
- Existing routers that reference `ctx.personId`

**Approach:**

- Add `ROCK` to `Provider`.
- Add `Profile`, `AuthAccount`, `ProfileIdentity`, `ProfileMergeCandidate`, and
  `ProfileMergeAudit` models.
- Create profiles from Auth0 sign-ins and/or linked provider identities.
- Link Auth0 accounts to profiles by verified email or manual invitation.
- Add `profileId` to app-native models that are about the user:
  `Goal.personId`, `Feedback.authorId`, `Feedback.recipientId`,
  `Guide.authorId`, and `UserPreference.personId` should migrate toward profile
  relations.
- Update tRPC context to resolve `ctx.profileId` from the signed-in Auth0
  account.
- Remove `ctx.personId` as the primary authorization identity. Where provider
  source records are still needed, resolve linked PCO/Rock person IDs from the
  current profile.

**Acceptance Criteria:**

- Auth0-authenticated users with linked profiles see their teams.
- App-native data can be queried by profile.
- A profile can have multiple identities, one per provider/remote ID.

### Unit 3: Sync State and Provider Boundaries

**Goal:** Make sync jobs observable and provider-safe before adding Rock.

**Files:**

- `packages/api/prisma/schema.prisma`
- `packages/jobs/src/sync-pco/job.ts`
- `packages/jobs/src/workers.ts`

**Approach:**

- Add `SyncRun` or `ProviderSyncState` with provider, job name, started/finished
  timestamps, status, counts, and error text.
- Wrap PCO sync phases with sync run records.
- Keep prune queries provider-scoped.
- Add a dry-run or conservative prune flag for Rock's first rollout.

**Acceptance Criteria:**

- Latest PCO sync success/failure is stored in DB.
- Sync counts are visible to future admin UI/API.
- Provider-specific prune behavior cannot delete another provider's records.

### Unit 4: Rock API Client and Snapshot Mapper

**Goal:** Fetch Rock source data and map it to provider-scoped records.

**Files:**

- `packages/api/src/lib/rock.ts`
- `packages/jobs/src/rock.ts`
- `packages/jobs/src/sync-rock/job.ts`
- `packages/jobs/src/sync-rock/index.ts`
- `apps/worker/.env.example`
- `.env.example`

**Approach:**

- Add `ROCK_BASE_URL`, `ROCK_API_KEY`, and optional Rock group type filters.
- Implement a Rock fetch helper with configured base URL, API key auth, timeout,
  pagination, and Zod validation.
- Create snapshot functions for people, groups, group members, leaders/roles,
  and schedules once EV Church confirms the Rock endpoints and group types.
- Upsert Rock records using `(remoteId, provider: ROCK)`.
- Do not enable destructive pruning until sample data is validated.

**Acceptance Criteria:**

- Worker can run `sync-rock` independently of `sync-pco`.
- Rock people and teams/groups appear as provider-scoped source records.
- Failed Rock sync does not affect PCO data.

### Unit 5: Reconciliation Engine

**Goal:** Link Rock and PCO identities into one My Team profile.

**Files:**

- `packages/jobs/src/reconcile-profiles.ts`
- `packages/api/src/routers/people.ts`
- New admin/reconciliation router later

**Approach:**

- Automatic link only on strong signals:
  - Existing manual mapping.
  - Shared external ID.
  - Exact verified email match.
- Create `ProfileMergeCandidate` for medium/weak matches.
- Store match reason, confidence, and source field snapshots.
- Never merge two existing profiles automatically if either has app-native data
  unless the match is strong and deterministic.

**Acceptance Criteria:**

- A user with matching PCO and Rock records sees one My Team profile.
- Ambiguous matches are queued for review instead of silently merged.
- Merge/unmerge decisions are auditable.

### Unit 6: Unified Read APIs

**Goal:** Return merged profile/team/schedule views to the web app.

**Files:**

- `packages/api/src/routers/people.ts`
- `packages/api/src/routers/teams.ts`
- `packages/api/src/routers/schedules.ts`
- `apps/web/src/app/(app)/profile/profile-content.tsx`
- Team and schedule components under `apps/web/src/components/teams`

**Approach:**

- Add `people.myTeamProfile` query returning:
  - canonical profile fields
  - linked PCO source record
  - linked Rock source record
  - reconciliation status
- Update team list/detail queries to gather memberships across all linked
  identities for the current profile.
- Update schedule queries to gather upcoming schedules across all linked
  identities.
- Add source badges for `PCO` and `ROCK`.

**Acceptance Criteria:**

- Profile page shows merged profile plus source-specific PCO/Rock data.
- Teams page includes PCO and Rock teams for the current profile.
- Upcoming serving includes PCO and Rock schedule rows.

### Unit 7: Provider-Aware Schedule Actions

**Goal:** Preserve PCO responses and define Rock behavior.

**Files:**

- `packages/api/src/routers/schedules.ts`
- `apps/web/src/components/teams/schedule-row.tsx`

**Approach:**

- Branch schedule response handling by `schedule.provider`.
- Keep PCO accept/decline as implemented.
- For Rock, start with read-only unless EV Church confirms the intended Rock
  writeback workflow.
- If Rock writeback is required, implement it as a separate provider adapter,
  not as a PCO-shaped endpoint.

**Acceptance Criteria:**

- PCO schedules remain actionable.
- Rock schedules clearly show whether they are read-only or actionable.
- Provider-specific write failures produce provider-specific messages.

## Suggested First Pull Request

Keep the first PR small:

- Add `ROCK` to the provider enum.
- Add Auth0 provider configuration.
- Add `Profile`, `AuthAccount`, and `ProfileIdentity`.
- Add a clean migration that does not preserve PCO-login sessions.
- Resolve `ctx.profileId` from Auth0, then resolve provider person IDs from
  linked identities only when needed.
- Add `people.myTeamProfile` that returns the current profile and source
  identities.
- Add Auth0 and Rock env placeholders.

This creates the foundation without blocking on final Rock endpoint mapping.

## Risks

- Rock group configuration is highly church-specific; wrong group type mapping
  will create noisy or misleading teams.
- Auth0 users may not have an existing PCO/Rock match; the app needs a clear
  pending-link or access-denied state.
- Matching by name alone is unsafe.
- Moving app-native relations from `Person` to `Profile` touches many routers,
  but there is no need to preserve old app-native rows for current users.
- Existing PCO schedule responses depend on a user PCO OAuth token. Auth0 login
  removes that token unless Planning Center is linked separately.
- Schedule semantics may differ: PCO team members on plans are not necessarily
  the same concept as Rock group schedules or attendance.

## Needs Before Rock Sync Implementation

- Auth0 domain/issuer, client ID, and client secret.
- Auth0 allowed callback/logout URLs for local, staging, and production.
- Decision: should Auth0 users auto-provision by verified email, require invite,
  or require a linked PCO/Rock identity before entering the app?
- Rock base URL.
- Rock API key and permission scope/security role.
- Rock group type IDs for serving teams.
- Sample payloads for Person, Group, GroupMember, Schedule, and Attendance.
- Confirmation of the strongest PCO/Rock identity match key.
- Decision: Rock schedule response read-only first, or writeback required.
