---
title: "feat: PCO Sync Service"
type: feat
status: active
date: 2026-03-20
sequence: 2 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
depends_on: 2026-03-20-002-feat-monorepo-foundation-plan.md
---

# feat: PCO Sync Service

## Overview

Port the proven PCO sync infrastructure from `EvChurch/changelog` into the monorepo. Creates `packages/jobs` for pg-boss queue definitions and sync logic, plus `apps/worker` as a standalone process for Railway deployment.

## Existing Code to Port

Source: `/tmp/changelog/` (cloned from `github.com/EvChurch/changelog`)

| Source File | Target | Changes Needed |
|-------------|--------|---------------|
| `lib/pco.ts` | `packages/jobs/src/pco.ts` | Update imports to `@repo/api`, `@repo/shared`. Add `image` and `email` to Person fetch. |
| `lib/pg-boss.ts` | `packages/jobs/src/boss.ts` | Update env import to `@repo/shared/env` |
| `lib/jobs/sync-pco/job.ts` | `packages/jobs/src/sync-pco/job.ts` | Update Prisma import to `@repo/api` |
| `lib/jobs/sync-pco/index.ts` | `packages/jobs/src/sync-pco/index.ts` | No significant changes |
| `lib/jobs/index.ts` | `packages/jobs/src/workers.ts` | No significant changes |
| `worker.ts` | `apps/worker/src/index.ts` | Update imports, add graceful shutdown |

## Implementation Units

### Unit 1: packages/jobs

**Goal:** Shared package with PCO API client, pg-boss singleton, and sync job logic.

**Files:**
- `packages/jobs/package.json`
- `packages/jobs/tsconfig.json`
- `packages/jobs/src/pco.ts` — PCO API client (Jsona, Zod, fetchTeamsSnapshot)
- `packages/jobs/src/boss.ts` — pg-boss singleton factory
- `packages/jobs/src/sync-pco/job.ts` — SyncPcoJob handler
- `packages/jobs/src/sync-pco/index.ts` — Queue registration + cron schedule
- `packages/jobs/src/workers.ts` — startWorkers entry point

**Approach:**
- Port each file, updating imports from `@/lib/...` to `@repo/api` and `@repo/shared/env`
- **Enhancement:** Update `personSchema` Zod validation to include `photo_thumbnail_url` (or `photo_url`) and map to `image` field in Person upsert
- **Enhancement:** Add `email` field capture from PCO person data (PCO includes email in person attributes when `people` scope is granted)
- Keep the same sync logic: paginated fetch → Map-based dedup → upsert in dependency order → prune stale records
- pg-boss v12 API: `createQueue`, `work`, `schedule` (same pattern as v10, compatible)

**Dependencies:** `pg-boss`, `jsona`, `zod`

**Verification:** TypeScript compiles. Job handler function signature matches pg-boss `work()` expectations.

### Unit 2: apps/worker

**Goal:** Standalone Node.js entry point for Railway worker service.

**Files:**
- `apps/worker/package.json` — scripts: `build` (tsup), `dev` (tsx watch), `start` (node dist/index.js)
- `apps/worker/tsconfig.json`
- `apps/worker/src/index.ts` — main(), getBoss(), startWorkers(), graceful shutdown

**Approach:**
- Entry point calls `getBoss()` → `startWorkers(boss)`
- Add SIGTERM handler for graceful shutdown: `boss.stop({ graceful: true, timeout: 30000 })`
- Build with `tsup` for production (single CJS bundle)
- Dev with `tsx watch` for hot-reload

**Dependencies:** `tsup` (dev), `tsx` (dev)

**Verification:** `pnpm --filter worker build` produces `dist/index.js`. Worker starts and connects to pg-boss (requires DATABASE_URL).

### Unit 3: Turbo pipeline integration

**Goal:** Worker builds and runs via Turborepo.

**Files:**
- `turbo.json` — add worker tasks
- Root `package.json` — add `worker` script

**Approach:**
- Add `apps/worker/turbo.json` extending root: `build` outputs `dist/**`
- `pnpm dev` should start both web and worker in parallel (turbo handles this via `persistent: true`)

**Verification:** `pnpm dev` starts both web server and worker process.

## Acceptance Criteria

- [ ] `packages/jobs` exports PCO sync logic with updated Prisma/env imports
- [ ] Person sync captures `image` and `email` fields from PCO
- [ ] `apps/worker` builds to standalone JS and starts with `pnpm --filter worker start`
- [ ] Worker connects to pg-boss, creates sync-pco queue, schedules hourly cron
- [ ] `pnpm dev` runs both web and worker simultaneously
- [ ] Sync job upserts and prunes correctly (validated by code review against changelog source)

## Scope Boundaries

- No API endpoints for triggering sync manually (could add later)
- No UI for sync status
- Worker tested against real PCO data only when credentials are available
