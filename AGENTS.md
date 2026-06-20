# AGENTS.md

This file provides guidance to Codex when working in this repository. `CLAUDE.md`
contains the same project background for Claude Code; keep important workflow
changes mirrored here when they affect both agents.

## Project Overview

**My Team** is a church volunteer team management app that integrates with
Planning Center Online (PCO) for team/member data and adds Goals, Feedback, and
Guides features that PCO does not provide. The full spec and design reference is
in `design/MEGA_PROMPT.md`.

## Tech Stack

- Monorepo: Turborepo with pnpm workspaces
- Framework: Next.js 16 App Router with Turbopack and TypeScript
- API: tRPC v11
- Database: PostgreSQL via Prisma 7 ORM with `@prisma/adapter-pg`
- Auth: Auth.js v5 with Auth0
- Background jobs: pg-boss worker process
- Styling: Tailwind CSS v4 with CSS custom property design tokens
- Icons: Lucide React
- Font: Outfit via Google Fonts
- Rich text: Tiptap 3
- Deployment: Railway

## Package Manager

Use `pnpm`, not npm or yarn.

## Common Commands

```bash
# Monorepo
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm type-check

# Codex worktrees
pnpm setup:codex
pnpm dev:codex
pnpm cleanup:codex
pnpm sync:all

# Database
pnpm --filter @mt/api exec prisma generate
pnpm --filter @mt/api exec prisma migrate dev
pnpm --filter @mt/api exec prisma db push

# Single package
pnpm --filter @mt/web dev
pnpm --filter worker dev
```

## Codex Worktrees

- In a Codex-managed worktree, run `pnpm setup:codex` before app/database work.
- To run the app locally from a Codex worktree, use `pnpm dev:codex`; Auth0
  callbacks require `http://localhost:7000`.
- Do not start the web app on a fallback port.
- The setup script copies env files from the base worktree, clones the sidecar
  `myteam` database into a per-worktree database, runs Prisma
  generation/migrations, and skips API sync by default.
- Use `pnpm sync:all` only when an explicit fresh PCO/Rock sync is needed.
- Use `pnpm cleanup:codex` before discarding a Codex worktree if you need to
  drop its cloned sidecar database.
- Codex does not automatically run repository scripts merely because this file
  exists. Configure the Codex app's Worktree Local Environment setup command to
  run `pnpm setup:codex` for automatic worktree bootstrapping.

## Architecture

### Data Model Split

- PCO/Rock-synced data is read-only from the app perspective: `Person`,
  `ServiceType`, `Team`, `Position`, `Leader`, `Assignment`, schedules, and plan
  times. Synced records use `remoteId` plus `provider`.
- App-native data is full CRUD: `Goal`, `Feedback`, and `Guide`.
- Do not build team membership management UI; membership comes from upstream
  systems.

### Prisma 7

- Generator provider is `"prisma-client"`, not `"prisma-client-js"`.
- Driver adapter `@prisma/adapter-pg` is mandatory.
- Generated client output is `packages/api/generated/prisma/client/`.
- Schema path is `packages/api/prisma/schema.prisma`.
- Computed fields via `$extends`: `descriptionMarkdown` on `Team` and
  `Position`.

### Access Model

- All members can view teams, their own goals/feedback, guides, and settings.
- Team leaders can write feedback, approve/decline goals, and create/edit/publish
  guides. Leader status comes from the synced `Leader` table.

## Internationalization

The app is localized with `next-intl` using cookie-based locale detection.

- Every new or modified UI string must use translation keys from
  `apps/web/messages/en.json`.
- Add matching translations to all locale files: `zh-CN`, `zh-TW`, `mi`, `sm`,
  `hi`, `ko`, `to`, `tl`, and `ja`.
- Server components use `getTranslations` from `next-intl/server`.
- Client components use `useTranslations` from `next-intl`.
- Use ICU MessageFormat for plurals.
- Toasts, errors, form labels, placeholders, and empty states all need
  translations.
- Error boundaries may hardcode English only as a last-resort fallback.

## Design

- Full spec: `design/MEGA_PROMPT.md`
- Exported screens: `design/design-exports/`
- Source design file: `design/my-team.pen`
- Key tokens:
  - `--accent: #3D8A5A`
  - `--bg-page: #F5F4F1`
  - `--text-primary: #1A1918`
  - `--border: #E5E4E1`

Match the existing product UI. Cards use 16px radius and subtle shadows; primary
buttons use the accent background and 10-12px radius.

## Environment

Environment examples live with the services that read them:

- `apps/web/.env.example`
- `apps/worker/.env.example`
- `packages/api/.env.example`

Key vars include `DATABASE_URL`, `AUTH_SECRET`, Auth0 credentials,
`PCO_API_ID`, `PCO_API_SECRET`, and optional Rock credentials.

