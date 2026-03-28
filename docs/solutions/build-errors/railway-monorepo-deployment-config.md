---
title: Railway Deployment Config for pnpm + Turborepo Monorepo
date: "2026-03-28"
category: build-errors
module: deployment
problem_type: build_error
component: tooling
symptoms:
  - "Worker build fails to bundle workspace dependencies due to stale @repo scope in tsup noExternal pattern"
  - "Web start command fails with unresolved @repo/web package reference in railway.toml"
  - "Next.js standalone server.js not found at expected path due to monorepo directory mirroring"
  - "Deprecated nixpacks builder warning on Railway deploy"
  - "No deployment health verification or automatic migration on deploy"
root_cause: config_error
resolution_type: config_change
severity: critical
related_components:
  - background_job
  - development_workflow
tags:
  - railway
  - deployment
  - monorepo
  - turborepo
  - nextjs-standalone
  - pnpm-workspaces
  - tsup
  - railpack
---

# Railway Deployment Config for pnpm + Turborepo Monorepo

## Problem

Deploying a pnpm + Turborepo monorepo (Next.js 16 web app + pg-boss worker) to Railway required solving multiple interconnected configuration issues: stale package scope references, a deprecated builder, missing Next.js standalone output with an unexpected monorepo path structure, and incomplete railway.toml settings (no build commands, watch paths, health checks, migrations, or graceful shutdown configuration).

## Symptoms

- `pnpm --filter @repo/web start` fails because the `@repo` scope no longer exists after renaming to `@mt`
- Worker runtime crashes with module-not-found errors because tsup's `noExternal` regex `/@repo\/.*/` no longer matches workspace packages
- StartCommand `node apps/web/.next/standalone/server.js` fails because the file is actually at `apps/web/.next/standalone/apps/web/server.js` in a pnpm monorepo
- Deprecated `nixpacks` builder warning — Railway defaults to Railpack as of March 2026
- Without `watchPatterns`, changes to web files trigger unnecessary worker rebuilds and vice versa
- Without `preDeployCommand`, database migrations don't run on deploy, causing schema mismatch errors

## What Didn't Work

- **Setting startCommand to `node apps/web/.next/standalone/server.js`**: This is the path you'd expect from a single-project Next.js app, but pnpm monorepo standalone output mirrors the full workspace directory structure. The actual path is `apps/web/.next/standalone/apps/web/server.js`. This was only discovered after running `pnpm build` and inspecting the output tree with `find`.

## Solution

### 1. Fix stale scope references after rename

In `apps/web/railway.toml`: change `@repo/web` → `@mt/web`
In `apps/worker/tsup.config.ts`: change `/@repo\/.*/` → `/@mt\/.*/`

### 2. Switch to Railpack builder

In both `railway.toml` files: change `builder = "nixpacks"` → `builder = "railpack"`

### 3. Enable Next.js standalone output

In `apps/web/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ... rest of config
};
```

### 4. Complete web service railway.toml

```toml
[build]
builder = "railpack"
buildCommand = "pnpm turbo build --filter=@mt/web..."
watchPatterns = [
  "/apps/web/**",
  "/packages/api/**",
  "/packages/auth/**",
  "/packages/jobs/**",
  "/package.json",
  "/pnpm-lock.yaml",
  "/turbo.json",
]

[deploy]
preDeployCommand = "pnpm --filter @mt/api exec prisma migrate deploy"
startCommand = "node apps/web/.next/standalone/apps/web/server.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 120
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

### 5. Complete worker service railway.toml

```toml
[build]
builder = "railpack"
buildCommand = "pnpm turbo build --filter=worker..."
watchPatterns = [
  "/apps/worker/**",
  "/packages/api/**",
  "/packages/jobs/**",
  "/package.json",
  "/pnpm-lock.yaml",
  "/turbo.json",
]

[deploy]
startCommand = "node apps/worker/dist/index.js"
drainingSeconds = 35
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

### 6. Create health check endpoint

`apps/web/src/app/api/health/route.ts`:

```typescript
export function GET() {
  return new Response("OK", { status: 200 });
}
```

### 7. Document environment variables

Create a root `.env.example` documenting all required vars with Railway variable reference syntax:
- `DATABASE_URL=${{Postgres.DATABASE_PRIVATE_URL}}` (both services)
- `PCO_API_ID=${{shared.PCO_API_ID}}` (both services)
- `AUTH_SECRET`, `AUTH_PLANNING_CENTER_ID`, `AUTH_PLANNING_CENTER_SECRET` (web only)
- `HOSTNAME=0.0.0.0` and `SKIP_ENV_VALIDATION=1` (Railway-specific, web only)

## Why This Works

- **Turbo `--filter=package...` syntax**: The `...` suffix tells Turborepo to build the named package AND all its workspace dependencies. This ensures `db:generate` (Prisma client generation) runs before the web or worker build, since `@mt/api` is a dependency of both.
- **Standalone monorepo path**: Next.js standalone output preserves the monorepo directory structure so that relative imports to workspace packages resolve correctly. In a pnpm workspace where the app lives at `apps/web/`, the server entry point lands at `.next/standalone/apps/web/server.js`, not `.next/standalone/server.js`.
- **`preDeployCommand`**: Runs after the build succeeds but before the new version starts receiving traffic. If the migration fails, the deploy fails and Railway automatically rolls back — zero-downtime migration safety.
- **`watchPatterns`**: Railway only triggers a rebuild for a service when files matching its patterns change, preventing unnecessary cross-service rebuilds.
- **`drainingSeconds = 35`**: The worker's SIGTERM handler uses a 30-second graceful shutdown timeout. The 35-second draining window gives it time to finish in-flight jobs plus a 5-second buffer before Railway force-kills the process.
- **`noExternal` regex fix**: tsup uses this pattern to determine which workspace packages to bundle into the output rather than leaving as external imports. With the wrong scope name, no packages match, and the bundled worker has dangling imports to packages that don't exist in the production filesystem.

## Prevention

- **Post-rename grep sweep**: After any monorepo scope rename, run `grep -r '@oldscope' --include='*.ts' --include='*.toml' --include='*.json'` across the entire repo. Add this as a checklist item in rename PRs.
- **Build verification**: Always run `pnpm build` and verify expected output paths exist before pushing deployment config changes. For standalone Next.js in a monorepo, check `apps/web/.next/standalone/apps/web/server.js` — the path is NOT `apps/web/.next/standalone/server.js`.
- **Railway config review checklist**: When setting up a new Railway service for a monorepo, verify: (1) `buildCommand` uses `--filter=package...` with the `...` suffix, (2) `startCommand` uses the correct monorepo-aware path, (3) `watchPatterns` include all relevant packages, (4) `preDeployCommand` handles migrations, (5) `healthcheckPath` is set with a corresponding endpoint, (6) `drainingSeconds` exceeds the app's SIGTERM timeout.

## Related Issues

- [docs/solutions/integration-issues/pco-sync-pgboss-porting.md](../integration-issues/pco-sync-pgboss-porting.md) — prior art on worker deployment, tsup bundling, and graceful shutdown (note: contains stale `@repo` references that should be updated to `@mt`)
- [docs/solutions/integration-issues/turborepo-prisma7-monorepo-setup.md](../integration-issues/turborepo-prisma7-monorepo-setup.md) — turbo pipeline foundation (`db:generate` dependency) that the deployment builds on
- [docs/plans/2026-03-28-001-feat-railway-deployment-plan.md](../../plans/2026-03-28-001-feat-railway-deployment-plan.md) — implementation plan for this deployment work
- [docs/plans/2026-03-20-009-feat-polish-deploy-plan.md](../../plans/2026-03-20-009-feat-polish-deploy-plan.md) — original plan (Unit 5 superseded by the current deployment config)
