# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**My Team** is a church volunteer team management app that integrates with Planning Center Online (PCO) for team/member data and adds Goals, Feedback, and Guides features that PCO doesn't provide. The full spec and design reference is in `design/MEGA_PROMPT.md`.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Framework**: Next.js 16 (App Router, Turbopack) with TypeScript
- **API**: tRPC v11 (shared across web + future mobile)
- **Database**: PostgreSQL via Prisma 7 ORM (`@prisma/adapter-pg` driver adapter)
- **Auth**: Auth.js v5 with custom Planning Center OIDC provider
- **Background Jobs**: pg-boss (separate worker process)
- **Styling**: Tailwind CSS v4 with custom design tokens (CSS custom properties)
- **Icons**: Lucide React
- **Font**: Outfit (400, 500, 600, 700) via Google Fonts
- **Rich Text**: Tiptap 3 (guide editor, JSON content storage)
- **Deployment**: Railway (web + worker services + Postgres)

## Monorepo Structure

```
apps/
  web/                    # Next.js 16 app (App Router)
  worker/                 # Standalone pg-boss worker process
packages/
  api/                    # tRPC routers + Prisma schema + db client
  auth/                   # Auth.js v5 + PCO OIDC provider
  jobs/                   # pg-boss queue definitions + PCO sync logic
  shared/                 # Zod schemas, types, env validation
  typescript-config/      # Shared tsconfig bases
  eslint-config/          # Shared ESLint flat configs
```

Internal packages export `.ts` source directly — no build step. Next.js transpiles via Turbopack.

## Package Manager

Uses **pnpm** (not npm/yarn). All commands use `pnpm` or `pnpm exec`.

## Common Commands

```bash
# Node (after fnm setup)
eval "$(fnm env)" && fnm use default

# Monorepo
pnpm install             # Install all workspace deps
pnpm dev                 # Start all dev servers (Turbopack)
pnpm build               # Production build
pnpm lint                # Lint all packages
pnpm type-check          # TypeScript check all packages

# Database (from root)
pnpm --filter @mt/api exec prisma generate    # Generate Prisma client
pnpm --filter @mt/api exec prisma migrate dev # Run migrations
pnpm --filter @mt/api exec prisma db push     # Push schema changes (dev)

# Single package
pnpm --filter @mt/web dev     # Start only web
pnpm --filter worker dev        # Start only worker
```

## Architecture

### Data Model Split
- **PCO-synced (read-only)**: Person, ServiceType, Team, Position, Leader, Assignment. Each has `remoteId` + `provider` composite unique key. Synced via pg-boss hourly cron. Do NOT build team membership management UI.
- **App-native (full CRUD)**: Goal, Feedback, Guide — stored in PostgreSQL, managed via tRPC mutations.

### Prisma 7 Specifics
- Generator provider: `"prisma-client"` (not `"prisma-client-js"`)
- Driver adapter `@prisma/adapter-pg` is mandatory
- Generated client output: `packages/api/generated/prisma/client/`
- Schema: `packages/api/prisma/schema.prisma`
- Computed fields via `$extends`: `descriptionMarkdown` on Team and Position

### Role-Based Access
- **All members**: View teams, their own goals/feedback, guides, settings
- **Team leaders**: Write feedback, approve/decline goals, create/edit/publish guides. Leader status from PCO `Leader` table.

### Responsive Layout
- **Mobile (<768px)**: Full-width content, bottom tab bar (pill-shaped, 62px height, 4 tabs: My Teams, Goals, Guides, Settings)
- **Desktop (>=768px)**: 260px left sidebar + main content area (padding 40px 48px)

### Route Structure (apps/web)
```
(auth)/login           — PCO OAuth login
(app)/teams            — My Teams list
(app)/teams/[teamId]   — Team View (leader actions if applicable)
(app)/teams/[teamId]/roles/[roleId]      — Role View
(app)/teams/[teamId]/feedback/new        — Write Feedback (leader)
(app)/teams/[teamId]/goals/review        — Approve Goals (leader)
(app)/teams/[teamId]/guides/new          — Guide Editor (leader)
(app)/goals            — Goals & Feedback (segment tabs, ?tab=feedback)
(app)/guides           — Guides list
(app)/guides/[guideId] — Guide Detail
(app)/guides/[guideId]/edit              — Guide Editor (leader)
(app)/settings         — Settings
(app)/profile          — Profile
```

## Environment Variables

See `.env.example`. Key vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_PLANNING_CENTER_ID`, `AUTH_PLANNING_CENTER_SECRET`, `PCO_API_ID`, `PCO_API_SECRET`.

## Design Reference

- Full spec: `design/MEGA_PROMPT.md`
- All screens PDF: `design/design-exports/export.pdf`
- Individual screen PNGs: `design/design-exports/screens/`
- Source design file: `design/my-team.pen`
- 36 screens total (18 sections × mobile + desktop), including empty states

### Key Design Tokens
```
--accent: #3D8A5A    --bg-page: #F5F4F1    --text-primary: #1A1918
--accent-dark: #4D9B6A   --bg-card: #FFFFFF    --text-secondary: #6D6C6A
--accent-light: #C8F0D8  --bg-muted: #EDECEA   --coral: #D89575
--border: #E5E4E1        --error: #D08068
```

Cards: 16px radius, subtle shadow. Primary buttons: `--accent` bg, 10-12px radius. Pill badges: 10-12px radius.

## Workflow

Uses the **compound-engineering** Claude Code plugin for workflow management:
- `/ce:brainstorm` — explore requirements and approaches before building
- `/ce:plan` — transform feature descriptions into structured project plans
- `/ce:work` — execute work plans efficiently
- `/ce:review` — multi-agent code review
- `/ce:compound` — document solved problems for team knowledge
- `/simplify` — review changed code for reuse, quality, efficiency

## Implementation Plans

Tracked in `docs/plans/` — 8 sequential PRs from monorepo foundation through deployment.
