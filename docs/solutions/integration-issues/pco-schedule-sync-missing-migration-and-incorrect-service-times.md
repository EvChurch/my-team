---
title: PCO Schedule Sync — Missing Migration and Incorrect Service Times
date: 2026-03-28
category: integration-issues
module: pco-sync
problem_type: integration_issue
component: background_job
symptoms:
  - "500 errors in production after merge due to missing Schedule table"
  - "Service times displayed rehearsal start times (e.g., Wednesday 6am) instead of actual Sunday service times"
  - "startsAt was 3 days before sortDate because earliest plan_time was a midweek rehearsal"
root_cause: missing_workflow_step
resolution_type: code_fix
severity: critical
related_components:
  - database
tags:
  - pco
  - planning-center
  - schedule-sync
  - prisma-migration
  - pg-boss
  - plan-times
  - service-times
---

# PCO Schedule Sync — Missing Migration and Incorrect Service Times

## Problem

After merging the PCO service schedule sync feature, two issues surfaced: (1) 500 errors in production because the Prisma migration file was never generated and committed, and (2) the UI displayed rehearsal/call times from days before the service instead of the actual service start time.

## Symptoms

- 500 errors on any page querying the `Schedule` table immediately after deploy
- `prisma migrate status` showed only 1 migration (the initial one) — no migration for the `Schedule` model
- "My Upcoming Serving" card showed `startsAt` as Wednesday 6:00 AM and `endsAt` as Saturday 10:45 PM for a Sunday 10:15 AM service
- `sortDate` was correct (March 29, Sunday) but `startsAt` was March 26 (Wednesday) — a rehearsal time

## What Didn't Work

- **Issue 1**: `prisma generate` was run (producing TypeScript types) but `prisma migrate dev` was not. The types compiled fine, type-check passed, but the database had no `Schedule` table. Railway's `preDeployCommand` (`prisma migrate deploy`) was a no-op since no migration file existed.

- **Issue 2**: The naive min/max approach across all plan_times assumed they were for the same day:
  ```typescript
  // WRONG: picks the earliest time, which is usually a rehearsal
  for (const pt of plan.plan_times) {
    if (pt.starts_at && (!startsAt || pt.starts_at < startsAt)) {
      startsAt = pt.starts_at
    }
  }
  ```
  PCO plans bundle rehearsals (midweek), call times, and service times together. A single plan can span multiple days.

## Solution

### Fix 1: Generate and commit the migration

```bash
pnpm --filter @mt/api exec prisma migrate dev --name add_schedule_model
git add packages/api/prisma/migrations/
git commit -m "feat(schema): add migration for Schedule model"
git push origin main
```

Railway's `preDeployCommand` then applied the migration automatically on the next deploy.

### Fix 2: Use PCO's `time_type` field to identify the service time

Added `name` and `time_type` to the plan_time Zod schema (PCO provides these but they were not being captured) and created a cascading `findServiceTime()` function:

```typescript
function findServiceTime(planTimes, sortDate) {
  // 1. Prefer the PCO-labeled "service" time_type
  const serviceTime = planTimes.find(
    (pt) => pt.time_type?.toLowerCase() === "service"
  )
  if (serviceTime?.starts_at) {
    return { startsAt: serviceTime.starts_at, endsAt: serviceTime.ends_at }
  }

  // 2. Fallback: latest time on the same day as sortDate
  const sortDay = new Date(sortDate).toISOString().slice(0, 10)
  const sameDayTimes = planTimes.filter(
    (pt) => pt.starts_at && new Date(pt.starts_at).toISOString().slice(0, 10) === sortDay
  )
  if (sameDayTimes.length > 0) {
    const latest = sameDayTimes.sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    )[0]
    return { startsAt: latest.starts_at, endsAt: latest.ends_at }
  }

  // 3. Last resort: latest time overall
  const withStarts = planTimes.filter((pt) => pt.starts_at)
  if (withStarts.length > 0) {
    const latest = withStarts.sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    )[0]
    return { startsAt: latest.starts_at, endsAt: latest.ends_at }
  }

  return { startsAt: null, endsAt: null }
}
```

Also added a `PlanTime` Prisma model (has-many on `Schedule`) to persist all plan_times for future call-time display:

```prisma
model PlanTime {
  id         String   @id @default(cuid())
  remoteId   String
  provider   Provider
  scheduleId String
  name       String?
  timeType   String?
  startsAt   DateTime?
  endsAt     DateTime?
  // ...
  schedule Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  @@unique([remoteId, provider, scheduleId])
}
```

## Why This Works

**Issue 1**: `prisma generate` only updates the TypeScript client types — it does not create SQL migration files. `prisma migrate dev` is what generates the migration SQL that `prisma migrate deploy` applies in production. Without the migration file in the repo, the pre-deploy step has nothing to apply and the table never gets created.

**Issue 2**: PCO's `time_type` field explicitly distinguishes `"service"`, `"rehearsal"`, and `"other"` times within a plan. Using this field as the primary selector, with sensible fallbacks for churches that may not label their times, ensures the displayed time matches the actual service — not a midweek rehearsal. The `sortDate` field on the plan is always the canonical service date and serves as a reliable anchor for the same-day fallback.

## Prevention

- **Always run `prisma migrate dev` after any `schema.prisma` change.** `prisma generate` = types, `prisma migrate dev` = SQL. Both are needed. Check that a new file exists under `prisma/migrations/` before committing schema changes.
- **PR review checklist**: If `schema.prisma` is modified, verify a corresponding migration file is included in the diff.
- **When integrating with third-party APIs, inspect the full response shape for semantic fields** (like `time_type`) rather than relying on positional assumptions (earliest/latest). Log a sample API response during development to see all available fields.
- **For PCO plan_times**: A single plan can span multiple days (rehearsals midweek, service on Sunday). The plan's `sort_date` is the canonical service date — use it as an anchor, not `starts_at` from arbitrary plan_times.
- **Store granular source data** (all plan_times via the `PlanTime` model, not just the derived `startsAt`/`endsAt`) so corrections can be made without re-fetching from the API.

## Related Issues

- [docs/solutions/integration-issues/pco-sync-pgboss-porting.md](pco-sync-pgboss-porting.md) — original PCO sync port covering Person, Team, Position, Leader, Assignment. This doc extends that foundation with Schedule sync.
- [docs/solutions/integration-issues/turborepo-prisma7-monorepo-setup.md](turborepo-prisma7-monorepo-setup.md) — covers `prisma generate` in the turbo pipeline; complements this doc's migration lesson.
