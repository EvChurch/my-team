---
title: "feat: Railway Deployment"
type: feat
status: completed
date: 2026-03-28
origin: docs/plans/2026-03-20-009-feat-polish-deploy-plan.md
deepened: 2026-03-28
---

# feat: Railway Deployment

## Overview

Production deployment of the My Team monorepo to Railway with three services: PostgreSQL database, Next.js web app, and pg-boss worker. Fixes stale `@repo` references, migrates from deprecated nixpacks to railpack, adds standalone Next.js output, health check endpoint, pre-deploy migrations, and watch paths.

## Problem Frame

The Railway config files exist from the original plan (009) but were never updated after the `@repo` → `@mt` rename. They also use the deprecated nixpacks builder, lack build commands, watch paths, health checks, and migration hooks. The project cannot deploy successfully in its current state.

## Requirements Trace

- R1. Web service deploys and starts successfully on Railway
- R2. Worker service deploys and starts successfully on Railway
- R3. Database migrations run automatically before each web deployment
- R4. Health check prevents bad deploys from going live
- R5. Watch paths prevent unnecessary cross-service rebuilds
- R6. All environment variables are documented and configured
- R7. Graceful shutdown works for both services (worker already handles SIGTERM)

## Scope Boundaries

- No CI/CD pipeline (Railway auto-deploys from git push)
- No custom domain setup (use Railway's default `*.up.railway.app`)
- No CDN or static asset optimization (standalone server serves static files)
- No production error reporting (Sentry deferred)
- No PR preview environments (can add later)

## Context & Research

### Relevant Code and Patterns

- `apps/web/railway.toml` — existing web config, stale `@repo/web` reference
- `apps/worker/railway.toml` — existing worker config, functional but incomplete
- `apps/worker/tsup.config.ts` — stale `/@repo\/.*/` noExternal pattern
- `apps/web/src/env.ts` — has `SKIP_ENV_VALIDATION` support already
- `apps/worker/src/index.ts` — already has SIGTERM/SIGINT graceful shutdown
- `turbo.json` — `build` depends on `^db:generate`, so `turbo build --filter=...` handles Prisma generation

### Institutional Learnings

- **Worker must be separate Railway service** — pg-boss long-running poll loops are incompatible with serverless (see `docs/solutions/integration-issues/pco-sync-pgboss-porting.md`)
- **Graceful shutdown mandatory** — Railway sends SIGTERM; worker must call `boss.stop({ graceful: true, timeout: 30_000 })`. Already implemented.
- **tsup bundles workspace packages** — `noExternal` pattern must match `/@mt\/.*/` to bundle internal packages into worker dist
- **Prisma generate must run before build** — turbo pipeline handles this via `^db:generate` dependency
- **Two separate PCO credential sets** — OAuth creds for web auth vs API creds for worker sync

### External References

- Railway now defaults to **Railpack** builder (nixpacks deprecated, March 2026)
- Railway `preDeployCommand` runs migrations after build, before start — if it fails, deploy rolls back
- Railway recommends `output: "standalone"` for Next.js — produces minimal `.next/standalone/server.js`
- Railway injects `PORT` env var; standalone Next.js respects it automatically
- `watchPatterns` use gitignore-style patterns from repo root to isolate service rebuilds
- Variable references: `${{Postgres.DATABASE_URL}}` or `${{Postgres.DATABASE_PRIVATE_URL}}` for private networking
- `drainingSeconds` controls time between SIGTERM and SIGKILL (important for worker graceful shutdown)

## Key Technical Decisions

- **Railpack over nixpacks**: Nixpacks is deprecated. Railpack is Railway's default builder with better caching and smaller images.
- **Next.js standalone output**: Produces a self-contained `server.js` with only necessary files, recommended by Railway for self-hosted deployment. Reduces image size significantly.
- **Pre-deploy migrations on web service only**: Both services share the same database. Running migrations on the web service via `preDeployCommand` ensures schema is ready before either service starts. Worker does not run migrations.
- **Private networking for database**: Use `${{Postgres.DATABASE_PRIVATE_URL}}` to keep database traffic on Railway's internal network (lower latency, no egress costs).
- **No standalone start in package.json**: Keep `next start` as the package.json script for local dev. Use `startCommand` in railway.toml for production standalone start.
- **`SKIP_ENV_VALIDATION=1` during build**: Web app's env validation would fail during build phase when runtime secrets aren't available. The flag is already supported in code.
- **Worker `drainingSeconds: 35`**: Give the worker time to finish in-flight jobs after SIGTERM (its handler uses 30s timeout, plus 5s buffer).

## Open Questions

### Resolved During Planning

- **Railpack vs nixpacks?** → Railpack. Nixpacks is deprecated as of March 2026.
- **Standalone mode needed?** → Yes. Railway's Next.js guide recommends it for self-hosted deployment.
- **Where to run migrations?** → Web service `preDeployCommand`. Runs after build, before start. Failed migration = failed deploy (rollback).
- **How does turbo build handle Prisma?** → The `build` task depends on `^db:generate` in turbo.json, so `pnpm turbo build --filter=@mt/web...` generates the Prisma client automatically.
- **Cron service for worker?** → No. pg-boss is a long-running process that polls for jobs. Railway cron is for short-lived tasks that exit.

### Deferred to Implementation

- **Custom domain configuration** — Can add after initial deployment is verified working.
- **PR preview environments** — Railway supports them via `[environments.pr]` in railway.toml; can configure later.
- **Static asset CDN** — Standalone server serves static files directly; CDN optimization deferred.

## Implementation Units

- [ ] **Unit 1: Fix Stale `@repo` References**

  **Goal:** Fix the `@repo` → `@mt` rename that was missed in deployment files.

  **Requirements:** R1, R2

  **Dependencies:** None

  **Files:**
  - Modify: `apps/web/railway.toml`
  - Modify: `apps/worker/tsup.config.ts`

  **Approach:**
  - Fix `@repo/web` → `@mt/web` in web railway.toml startCommand
  - Fix `/@repo\/.*/` → `/@mt\/.*/` in worker tsup.config.ts noExternal pattern

  **Patterns to follow:**
  - The rename was done across the monorepo in commit `3e433da` — these are the remaining missed references

  **Test scenarios:**
  - Happy path: `pnpm build` succeeds (tsup bundles workspace deps correctly with `@mt` pattern)

  **Verification:**
  - `grep -r "@repo" apps/` returns no matches
  - `pnpm turbo build --filter=worker` produces `apps/worker/dist/index.js` that includes bundled workspace code

- [ ] **Unit 2: Next.js Standalone Output**

  **Goal:** Configure Next.js for standalone output mode for production deployment.

  **Requirements:** R1

  **Dependencies:** None (parallel with Unit 1)

  **Files:**
  - Modify: `apps/web/next.config.ts`

  **Approach:**
  - Add `output: "standalone"` to the Next.js config
  - The standalone build produces `.next/standalone/server.js` which is a self-contained Node.js server
  - Railway's startCommand will point to this file
  - Keep `next start` in package.json for local development

  **Patterns to follow:**
  - Next.js standalone mode documentation
  - Existing `next.config.ts` structure

  **Test scenarios:**
  - Happy path: `pnpm turbo build --filter=@mt/web...` produces `apps/web/.next/standalone/server.js`

  **Verification:**
  - Build succeeds and `.next/standalone/server.js` exists in the web app output

- [ ] **Unit 3: Health Check Endpoint**

  **Goal:** Create an API health check route for Railway deployment verification.

  **Requirements:** R4

  **Dependencies:** None (parallel with Units 1-2)

  **Files:**
  - Create: `apps/web/src/app/api/health/route.ts`

  **Approach:**
  - Simple GET handler that returns 200 with "OK"
  - No database check — Railway health checks are for deployment readiness, not deep health monitoring
  - Keep it minimal so it responds quickly

  **Test scenarios:**
  - Happy path: GET `/api/health` returns HTTP 200

  **Verification:**
  - Route exists and returns 200 when the app is running

- [ ] **Unit 4: Update Railway Config Files**

  **Goal:** Complete railway.toml configuration for both services with railpack, build commands, watch paths, health checks, pre-deploy migrations, and graceful shutdown.

  **Requirements:** R1, R2, R3, R4, R5, R7

  **Dependencies:** Units 1-3 (references standalone output and health endpoint)

  **Files:**
  - Modify: `apps/web/railway.toml`
  - Modify: `apps/worker/railway.toml`

  **Approach:**

  Web service (`apps/web/railway.toml`):
  - Builder: `railpack`
  - Build command: `pnpm turbo build --filter=@mt/web...` (the `...` suffix builds the target and all its dependencies, triggering `db:generate`)
  - Watch paths: `apps/web/**`, `packages/api/**`, `packages/auth/**`, `packages/jobs/**`, `package.json`, `pnpm-lock.yaml`, `turbo.json`
  - Pre-deploy: `pnpm --filter @mt/api exec prisma migrate deploy`
  - Start: `node apps/web/.next/standalone/server.js`
  - Health check: `/api/health` with 120s timeout
  - Restart: `on_failure`, max 10 retries

  Worker service (`apps/worker/railway.toml`):
  - Builder: `railpack`
  - Build command: `pnpm turbo build --filter=worker...`
  - Watch paths: `apps/worker/**`, `packages/api/**`, `packages/jobs/**`, `package.json`, `pnpm-lock.yaml`, `turbo.json`
  - Start: `node apps/worker/dist/index.js`
  - `drainingSeconds: 35` (worker graceful shutdown uses 30s timeout + 5s buffer)
  - Restart: `on_failure`, max 10 retries
  - No health check (worker does not serve HTTP)
  - No pre-deploy migrations (web handles it)

  **Patterns to follow:**
  - Railway config-as-code reference
  - Turbo `--filter=package...` syntax for dependency-inclusive builds

  **Test scenarios:**
  - Happy path: Both railway.toml files are valid TOML with all required fields
  - Edge case: Web deploy with pending migration succeeds via preDeployCommand
  - Error path: Failed migration causes deploy rollback (handled by Railway automatically)

  **Verification:**
  - Both config files parse as valid TOML
  - Start commands reference correct paths
  - Watch paths cover all relevant package directories

- [ ] **Unit 5: Root `.env.example` and Documentation**

  **Goal:** Document all required environment variables for Railway setup.

  **Requirements:** R6

  **Dependencies:** None (parallel with Unit 4)

  **Files:**
  - Create: `.env.example`

  **Approach:**
  - Document all env vars needed across both services
  - Include Railway variable reference syntax as comments
  - Note which vars are shared vs service-specific

  **Test scenarios:**
  - Happy path: `.env.example` lists all vars from both `apps/web/src/env.ts` and `apps/worker/src/env.ts`

  **Verification:**
  - Every env var validated in the app's Zod schemas appears in `.env.example`

## System-Wide Impact

- **Interaction graph:** The web service depends on the worker service being deployed separately. Both depend on the PostgreSQL service. Migrations must complete before either service starts serving traffic.
- **Error propagation:** Failed pre-deploy migration rolls back the entire web deployment. Worker deployment is independent — if it fails, the web app continues serving but background sync stops.
- **State lifecycle risks:** If web and worker deploy simultaneously after a schema change, the worker could start with the old schema before the web's pre-deploy migration runs. Railway doesn't guarantee deploy ordering across services from the same push. The worker should tolerate schema drift gracefully (pg-boss handles its own schema separately).
- **API surface parity:** No external API changes. The health endpoint is new but internal to Railway.
- **Unchanged invariants:** Local development (`pnpm dev`) continues to work the same way. The `next start` script in package.json stays as-is for local use.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Worker starts before web migration completes | pg-boss manages its own schema; app tables may briefly be stale but worker sync upserts are idempotent |
| Standalone mode changes static file serving | Standalone server.js serves public/ and .next/static/ when co-located; verify after first deploy |
| Railpack behavior differs from nixpacks | Railpack is the documented default; fallback to nixpacks only if build fails |
| `SKIP_ENV_VALIDATION` not set causes build failure | Document clearly in setup steps; the flag already works in code |
| Turborepo remote cache not configured | Local turbo cache only; builds are fast enough without remote cache for now |

## Railway Setup Steps (Manual, in Dashboard)

These steps are performed in the Railway dashboard, not in code:

1. **Create Railway project** (or use existing)
2. **Add PostgreSQL service** — provisions managed Postgres
3. **Add web service** — connect to GitHub repo, set config file path to `/apps/web/railway.toml`
4. **Add worker service** — connect to same repo, set config file path to `/apps/worker/railway.toml`
5. **Configure shared variables:**
   - `PCO_API_ID`, `PCO_API_SECRET` (shared between both services)
6. **Configure web service variables:**
   - `DATABASE_URL=${{Postgres.DATABASE_PRIVATE_URL}}`
   - `AUTH_SECRET=<generate with: openssl rand -base64 32>`
   - `AUTH_PLANNING_CENTER_ID=<from PCO developer portal>`
   - `AUTH_PLANNING_CENTER_SECRET=<from PCO developer portal>`
   - `PCO_API_ID=${{shared.PCO_API_ID}}`
   - `PCO_API_SECRET=${{shared.PCO_API_SECRET}}`
   - `HOSTNAME=0.0.0.0`
   - `SKIP_ENV_VALIDATION=1` (needed during build phase)
7. **Configure worker service variables:**
   - `DATABASE_URL=${{Postgres.DATABASE_PRIVATE_URL}}`
   - `PCO_API_ID=${{shared.PCO_API_ID}}`
   - `PCO_API_SECRET=${{shared.PCO_API_SECRET}}`
8. **Deploy** — push to main or trigger manual deploy

## Sources & References

- **Origin plan:** [docs/plans/2026-03-20-009-feat-polish-deploy-plan.md](docs/plans/2026-03-20-009-feat-polish-deploy-plan.md)
- Institutional learnings: `docs/solutions/integration-issues/pco-sync-pgboss-porting.md`, `docs/solutions/integration-issues/turborepo-prisma7-monorepo-setup.md`
- Railway config-as-code reference
- Railway monorepo deployment guide
- Railway Next.js deployment guide
- Railway Railpack documentation
- Railway private networking guide
