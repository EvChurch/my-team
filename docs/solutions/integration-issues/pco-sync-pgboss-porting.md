---
title: "Porting pg-boss PCO sync to a Turborepo monorepo"
category: integration-issues
date: 2026-03-20
tags: [pg-boss, pco, sync, monorepo, prisma, worker]
components: [packages/jobs, apps/worker, packages/api]
last_updated: 2026-03-28
severity: low
---

# Porting pg-boss PCO Sync to a Turborepo Monorepo

## Problem

Porting a pg-boss background sync job from a flat Next.js app (EvChurch/changelog) to a Turborepo monorepo with separate worker process.

## Key Decisions

### Separate worker process, not embedded in Next.js

pg-boss uses long-running poll loops incompatible with serverless/edge functions. The worker runs as a standalone Node.js process (`apps/worker`) sharing the same Postgres database as the web app. Railway deploys it as a second service.

### Provider enum casing matters

The original codebase used `provider: "pco"` (lowercase). The new schema uses `Provider.PCO` (SCREAMING_SNAKE_CASE). Every Prisma upsert arg in the sync job must use the new casing — this is easy to miss since it's a string buried in dozens of upsert calls.

### Worker needs tsup for production builds

The worker can't use Turbopack (that's Next.js-only). Use `tsup` to bundle to a single CJS file for production, and `tsx watch` for development. The tsup config should bundle `@mt/*` packages since they export raw `.ts` source. In `railway.toml`, set `drainingSeconds` to exceed the graceful shutdown timeout (e.g., `drainingSeconds = 35` for a 30s shutdown timeout).

### Graceful shutdown is essential for Railway

Railway sends SIGTERM before stopping a service. Without a handler, in-flight sync jobs get killed mid-upsert. Add:

```typescript
process.on("SIGTERM", async () => {
  await boss.stop({ graceful: true, timeout: 30_000 });
  process.exit(0);
});
```

## Prevention

- When porting code between projects, grep for all enum/constant values and update to match the target schema
- Always add graceful shutdown handlers for background workers in containerized deployments
- Use tsup (not tsc) for standalone worker builds — it handles monorepo internal package bundling

## Scope Note

This doc covers the initial sync port: Person, ServiceType, Team, Position, Leader, and Assignment models. Schedule and PlanTime sync was added later as a separate feature — see [PCO Schedule Sync — Missing Migration and Incorrect Service Times](pco-schedule-sync-missing-migration-and-incorrect-service-times.md) for lessons learned from that extension.
