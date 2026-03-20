---
title: "Turborepo + Prisma 7 monorepo: pipeline, env, and cascade pitfalls"
category: integration-issues
date: 2026-03-20
tags: [turborepo, prisma, monorepo, pnpm, env-validation, cascade-deletes]
components: [packages/api, packages/shared, turbo.json]
severity: medium
---

# Turborepo + Prisma 7 Monorepo Setup Pitfalls

## Problem

Setting up a Turborepo monorepo with Prisma 7, shared env validation, and a database schema for an app that syncs external data (PCO) alongside app-native CRUD models. Multiple subtle issues surfaced during multi-agent code review that would have caused failures in CI, worker processes, and data integrity.

## Root Causes (3 distinct issues)

### 1. Fresh clones fail without `prisma generate` in turbo pipeline

Prisma 7 generates its client to `packages/api/generated/` which is gitignored. If `build`, `dev`, or `type-check` run before `prisma generate`, they fail with missing module errors. Turborepo doesn't know about this dependency without explicit configuration.

### 2. `@t3-oss/env-nextjs` in shared packages breaks non-Next.js consumers

Placing `@t3-oss/env-nextjs` in a `packages/shared` utility package couples it to the Next.js runtime. When a standalone worker process (pg-boss) or CLI tool imports from the shared package, it fails because `env-nextjs` expects Next.js-specific `process.env` handling.

### 3. Cascade deletes on synced-data FKs destroy app-native historical data

When external sync (PCO) removes a Person, `onDelete: Cascade` on Goal, Feedback, and Guide foreign keys destroys all historical app-native data created by or about that person. This is correct for join tables (Leader, Assignment) but wrong for content records.

## Solution

### Fix 1: Add `db:generate` to turbo pipeline

```json
// turbo.json
{
  "tasks": {
    "db:generate": {
      "cache": true,
      "inputs": ["prisma/schema.prisma", "prisma.config.ts"],
      "outputs": ["generated/**"]
    },
    "build": {
      "dependsOn": ["^build", "^db:generate"]
    },
    "dev": {
      "dependsOn": ["^db:generate"]
    },
    "type-check": {
      "dependsOn": ["^db:generate"]
    }
  }
}
```

And in `packages/api/package.json`:
```json
{ "scripts": { "db:generate": "prisma generate" } }
```

### Fix 2: Use `@t3-oss/env-core` instead of `env-nextjs`

```typescript
// packages/shared/src/env.ts
import { createEnv } from "@t3-oss/env-core";  // NOT env-nextjs
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),  // .url() validates format, not just non-empty
    // ... other vars
  },
  runtimeEnv: process.env,  // replaces experimental__runtimeEnv
  emptyStringAsUndefined: true,
});
```

The API is nearly identical — drop `client: {}` and `experimental__runtimeEnv: {}`, replace with `runtimeEnv: process.env`.

### Fix 3: Use `SetNull` for app-native content FKs

```prisma
// PCO join tables — Cascade is correct (meaningless without both sides)
model Leader {
  person Person @relation(onDelete: Cascade)
  team   Team   @relation(onDelete: Cascade)
}

// App-native content — SetNull preserves historical data
model Goal {
  personId String?  // nullable to support SetNull
  person   Person?  @relation(onDelete: SetNull)
}

model Feedback {
  authorId    String?
  recipientId String?
  author      Person? @relation(onDelete: SetNull)
  recipient   Person? @relation(onDelete: SetNull)
}

model Guide {
  authorId String?
  author   Person? @relation(onDelete: SetNull)
}
```

## Prevention

1. **Always add code generation steps to the turbo pipeline** when using Prisma, GraphQL codegen, or any tool that generates TypeScript from a schema. Use `inputs` and `outputs` for cache efficiency.
2. **Use `@t3-oss/env-core` in shared packages**, reserve `env-nextjs` for app-level code only.
3. **Default to `SetNull` for FKs from content models to synced/external entities.** Only use `Cascade` when the child record is meaningless without the parent (join tables, assignments).
4. **Add `.url()` to DATABASE_URL validation** — `z.string().min(1)` accepts any non-empty string including malformed connection strings.

## Additional Prisma 7 Notes

- Generator provider is `"prisma-client"` (not `"prisma-client-js"`)
- `@prisma/adapter-pg` driver adapter is mandatory (no more built-in Rust engine)
- Generated client path changed to `generated/prisma/client/` — import from `client.js` not the directory
- Enum values should use SCREAMING_SNAKE_CASE consistently (including `PCO`, not `pco`)
