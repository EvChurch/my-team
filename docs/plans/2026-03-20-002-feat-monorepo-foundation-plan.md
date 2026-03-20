---
title: "feat: Monorepo Foundation"
type: feat
status: completed
date: 2026-03-20
sequence: 1 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
---

# feat: Monorepo Foundation

## Overview

Convert the flat Next.js project into a Turborepo monorepo with shared packages. Set up Prisma 7 schema with all models (PCO-synced + app-native) and the database client. This is the foundation everything else builds on.

## Implementation Units

### Unit 1: Turborepo Scaffold

**Goal:** Root-level monorepo config with `apps/web` containing the existing Next.js app.

**Files:**
- `pnpm-workspace.yaml`
- `turbo.json`
- `package.json` (root — turbo scripts, `packageManager` field)
- `apps/web/` (move all existing Next.js files here)
- `apps/web/package.json` (update name to `@repo/web`)
- `apps/web/tsconfig.json` (keep `@/*` → `./src/*`)

**Approach:**
1. Create `pnpm-workspace.yaml` with `apps/*` and `packages/*`
2. Create root `package.json` with `turbo` devDependency and scripts (`dev`, `build`, `lint`, `type-check`)
3. Create `turbo.json` using v2.8 `tasks` syntax (not `pipeline`):
   - `build`: `dependsOn: ["^build"]`, outputs: `[".next/**", "!.next/cache/**", "dist/**"]`
   - `dev`: `cache: false`, `persistent: true`
   - `lint`: no deps
   - `type-check`: `dependsOn: ["^build"]`
4. Move `src/`, `public/`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json` into `apps/web/`
5. Move app-level deps from root `package.json` to `apps/web/package.json`
6. Root `package.json` keeps only `turbo` as devDependency

**Verification:** `pnpm install` succeeds, `pnpm dev` starts the Next.js app from root.

### Unit 2: Shared TypeScript Config

**Goal:** Shared tsconfig bases so all packages use consistent compiler settings.

**Files:**
- `packages/typescript-config/package.json`
- `packages/typescript-config/base.json`
- `packages/typescript-config/nextjs.json`
- `packages/typescript-config/library.json`

**Approach:**
- `base.json`: `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `skipLibCheck: true`, `esModuleInterop: true`
- `nextjs.json`: extends base, adds Next.js plugin, `jsx: preserve`, `incremental: true`
- `library.json`: extends base, adds `declaration: true`, `declarationMap: true`, `jsx: react-jsx`
- Update `apps/web/tsconfig.json` to extend `@repo/typescript-config/nextjs.json`

**Verification:** `pnpm type-check` passes for `apps/web`.

### Unit 3: Shared ESLint Config

**Goal:** Shared ESLint flat config for consistency.

**Files:**
- `packages/eslint-config/package.json`
- `packages/eslint-config/base.js`
- `packages/eslint-config/nextjs.js`

**Approach:**
- `base.js`: ESLint flat config with TypeScript parser
- `nextjs.js`: extends base + `eslint-config-next`
- Update `apps/web/eslint.config.mjs` to import from `@repo/eslint-config/nextjs`

**Verification:** `pnpm lint` passes from root.

### Unit 4: Shared Package

**Goal:** `packages/shared` for Zod schemas, types, constants, and env validation.

**Files:**
- `packages/shared/package.json` (exports `./env`, `./types`)
- `packages/shared/src/env.ts` — `@t3-oss/env-nextjs` with Zod validation (port from changelog's `lib/env.ts`, use `experimental__runtimeEnv` for modern Next.js)
- `packages/shared/src/types.ts` — shared type exports
- `packages/shared/src/index.ts` — barrel export
- `packages/shared/tsconfig.json` — extends `@repo/typescript-config/library`

**Approach:**
- Env vars to validate: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_PLANNING_CENTER_ID`, `AUTH_PLANNING_CENTER_SECRET`, `PCO_API_ID`, `PCO_API_SECRET`
- Internal package — export `.ts` source directly, no build step

**Dependencies:** `@t3-oss/env-nextjs`, `zod`

**Verification:** Can import `env` from `@repo/shared/env` in `apps/web`.

### Unit 5: Prisma Schema + Database Client

**Goal:** `packages/api` with full Prisma 7 schema and singleton client.

**Files:**
- `packages/api/package.json`
- `packages/api/tsconfig.json`
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma.config.ts`
- `packages/api/src/db.ts` — singleton Prisma client with `PrismaPg` adapter + `$extends` for computed fields

**Approach:**

Prisma schema includes:

**PCO-synced models** (adapted from changelog `prisma/schema.prisma`):
- `Person` (id, remoteId, provider, email, fullName, firstName, lastName, image, timestamps)
- `ServiceType` (id, remoteId, provider, name, timestamps)
- `Team` (id, remoteId, provider, name, description:Json, serviceTypeId, timestamps)
- `Position` (id, remoteId, provider, teamId, name, description:Json, timestamps)
- `Leader` (id, remoteId, provider, personId, teamId) with `@@unique([personId, teamId])`, `@@unique([remoteId, provider])`
- `Assignment` (id, remoteId, provider, personId, positionId) with `@@unique([personId, positionId])`, `@@unique([remoteId, provider])`
- `Provider` enum: `pco`

**App-native models** (from MEGA_PROMPT spec):
- `Goal` (id, title, description, progress:Int, status:GoalStatus, dueDate, personId, teamId, reviewedBy, timestamps)
- `GoalStatus` enum: `PENDING`, `APPROVED`, `DECLINED`, `COMPLETED`
- `Feedback` (id, content, type:FeedbackType, authorId, recipientId, teamId, isShared:Boolean, createdAt)
- `FeedbackType` enum: `ENCOURAGEMENT`, `GROWTH_AREA`, `GENERAL`
- `Guide` (id, title, content:Json, category:GuideCategory, status:GuideStatus, authorId, teamId, roleId?, isPinned, isVisibleToTeam, timestamps)
- `GuideCategory` enum: `QUICK_START`, `TROUBLESHOOTING`, `SOP`
- `GuideStatus` enum: `DRAFT`, `PUBLISHED`

Prisma 7 specifics:
- Generator provider: `"prisma-client"` (NOT `"prisma-client-js"`)
- Driver adapter: `@prisma/adapter-pg` (mandatory in v7)
- Output: `generated/prisma/client` via `prisma.config.ts`
- Singleton pattern with `globalThis` for dev hot-reload
- `$extends` for `descriptionMarkdown` computed fields on Team and Position

**Dependencies:** `prisma` (dev), `@prisma/client`, `@prisma/adapter-pg`

**Verification:** `pnpm exec prisma generate` succeeds. `pnpm exec prisma db push` works against a local Postgres (if available). TypeScript compilation passes.

### Unit 6: .env.example + .gitignore Updates

**Goal:** Document required env vars and ensure generated files are ignored.

**Files:**
- `.env.example`
- `.gitignore` (update for monorepo)

**Approach:**
- `.env.example` with all required vars (from changelog's `.env.example` + Auth.js v5 changes)
- `.gitignore` additions: `generated/`, `*.tsbuildinfo`, `.turbo/`, `apps/*/node_modules/`, `packages/*/node_modules/`

**Verification:** No generated files tracked by git.

## Acceptance Criteria

- [ ] `pnpm install` from root installs all workspace dependencies
- [ ] `pnpm dev` starts the Next.js dev server
- [ ] `pnpm build` builds the web app
- [ ] `pnpm lint` runs ESLint across all packages
- [ ] `pnpm exec --filter @repo/api prisma generate` produces Prisma client
- [ ] Internal packages (`@repo/shared`, `@repo/api`) are importable from `apps/web`
- [ ] All TypeScript compilation passes with strict mode

## Scope Boundaries

- No tRPC routers yet (next PR)
- No auth setup yet (next PR)
- No PCO sync/pg-boss yet (separate PR)
- No UI changes — the existing default Next.js page is fine
