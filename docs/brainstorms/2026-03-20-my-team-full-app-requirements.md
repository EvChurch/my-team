---
date: 2026-03-20
topic: my-team-full-app
---

# My Team — Full App Build

## Problem Frame

Church volunteer team leaders lack tools for setting goals, giving feedback, and sharing guides with their teams. Planning Center Online handles scheduling and team membership but has no goal-tracking, feedback, or knowledge-base features. My Team fills that gap as a companion app that reads PCO data and layers on team development features.

A mobile app is planned to follow the web app, so the architecture must support multiple clients from the start.

## Requirements

### Architecture & Infrastructure

- R1. **Turborepo monorepo** with `apps/web` (Next.js), `packages/api` (tRPC router + Prisma), and `packages/shared` (Zod schemas, types, constants). Mobile app (`apps/mobile`, Expo/React Native) will be added later.
- R2. **tRPC API layer** — all data access goes through tRPC routers in `packages/api`. Both web and future mobile consume the same API. No GraphQL.
- R3. **Prisma ORM with PostgreSQL** — single schema in `packages/api`. Railway Postgres for production.
- R4. **Auth.js v5** with a custom Planning Center OAuth provider. Session strategy must work for both web (cookies) and future mobile (JWT/token).
- R5. **Railway deployment** — web app, Postgres database, and object storage bucket for file uploads (guide images, avatars).

### Data Model

- R6. **PCO-synced models** — Person, ServiceType, Team, Position, Assignment, Leader. Each has `remoteId` + `provider` composite unique key for upsert-based syncing. Schema adapted from the previous `EvChurch/changelog` Prisma schema.
- R7. **App-native models** (Goal, Feedback, Guide) — full CRUD, defined in the MEGA_PROMPT spec. Stored in Postgres, managed via tRPC mutations. The previous app had Feedback and Objective/KeyResult models — the new spec replaces these with Goal (simpler progress-based), Feedback (encouragement/growth/general types), and Guide.
- R8. **PCO sync service** — pg-boss scheduled job (hourly cron) ported from `EvChurch/changelog`. Fetches all teams from PCO Services API with includes (people, team_positions, person_team_position_assignments, service_types, team_leaders), upserts into local DB, then prunes records no longer upstream. Uses PCO Personal Access Token (basic auth with `PCO_API_ID` + `PCO_API_SECRET`), Jsona for JSON:API deserialization, and Zod for response validation.

### Web App (apps/web)

- R9. **All 12 routes from the spec** — Login, My Teams, Team View, Role View, Goals & Feedback (with segment tabs), Guides, Guide Detail, Settings, Profile, Write Feedback, Approve Goals, Guide Editor.
- R10. **Responsive layout** — mobile bottom tab bar (<768px), desktop left sidebar (>=768px), per the spec's design tokens, typography, and component patterns.
- R11. **Role-based access** — leader-only screens (Write Feedback, Approve Goals, Guide Editor) gated by PCO team position data. Leader badge and action buttons shown conditionally.
- R12. **Design fidelity** — Outfit font, all CSS custom properties from the spec's design tokens, card/button/badge/pill patterns as specified. Reference design exports for pixel-level accuracy.
- R13. **Tiptap rich text editor** for Guide creation/editing. Store content as JSON (portable to mobile rendering later).
- R14. **Empty states** for every list/section per spec (centered icon, title, description).

### Styling & UI

- R15. **Tailwind CSS v4** with the spec's design tokens as CSS custom properties.
- R16. **Lucide React** for all icons.

## Scope Boundaries

- **No mobile app in this phase** — monorepo structure supports it, but `apps/mobile` is deferred.
- **No real-time features** — standard request/response. No WebSockets or live updates.
- **No team membership management UI** — PCO is the source of truth for team composition.
- **No notification system** — Settings page shows a toggle but actual push/email notifications are deferred.
- **No i18n** — English only for now despite the Language setting in the UI.

## Success Criteria

- All 12 routes render correctly at mobile (402px) and desktop (1440px) widths, matching the design exports.
- A user can sign in via Planning Center OAuth and see their synced teams.
- Team leaders can create/approve goals, write feedback, and publish guides.
- Regular members can view teams, goals, feedback, and guides scoped to their membership.
- The tRPC API is fully consumable by an external TypeScript client (validated by the monorepo package structure).

## Key Decisions

- **tRPC over GraphQL**: Single consumer language (TypeScript) across web and mobile. tRPC gives end-to-end type safety with zero codegen and less boilerplate.
- **Turborepo monorepo**: Shared API and types across apps, independent deployments, single repo for all code.
- **Auth.js v5 over NextAuth v4**: Built for App Router, better Server Component integration. Custom PCO provider needed either way.
- **Tiptap for rich text**: JSON content model is portable to mobile. Extensible, modern, free core.
- **Railway for hosting**: Postgres + object storage + web app deployment in one platform.
- **Server Components + tRPC hybrid**: Server Components for initial page loads (call tRPC server-side), tRPC client for mutations and interactive data fetching.

## Dependencies / Assumptions

- Planning Center Online API access is available: OAuth app credentials (`PCO_CLIENT_ID`, `PCO_CLIENT_SECRET`) for user auth, plus Personal Access Token (`PCO_API_ID`, `PCO_API_SECRET`) for background sync.
- PCO API provides sufficient data for teams, members, roles, and campus info (confirmed by previous app).
- Railway project will be provisioned separately (not automated in this build).
- pg-boss requires the same Postgres database (it creates its own schema for job management).

## Existing Code to Port

The PCO sync infrastructure from `EvChurch/changelog` (cloned to `/tmp/changelog`) provides:
- **`lib/pco.ts`** — PCO API client with basic auth, JSON:API deserialization (Jsona), Zod schemas for teams/people/positions/assignments/leaders, and `fetchTeamsSnapshot()` that paginates and returns Prisma upsert args.
- **`lib/pg-boss.ts`** — pg-boss singleton with lazy initialization.
- **`lib/jobs/sync-pco/job.ts`** — Sync job: upserts people, service types, teams, positions, leaders, assignments; then prunes records removed upstream.
- **`lib/jobs/sync-pco/index.ts`** — Worker setup: creates queue, registers worker, schedules hourly cron, triggers immediate run.
- **`lib/env.ts`** — Type-safe env validation via `@t3-oss/env-nextjs` + Zod.
- **`prisma/schema.prisma`** — PCO-synced models (Person, ServiceType, Team, Position, Assignment, Leader) with `remoteId`+`provider` composite keys. Also has Feedback, Objective, KeyResult which will be replaced by the new spec's models.

This code needs to be adapted for the monorepo structure (move to `packages/api`) and updated imports, but the sync logic and PCO API interaction are proven and should be reused directly.

## Outstanding Questions

### Resolve Before Planning

(None — all product decisions resolved.)

### Deferred to Planning

- [Affects R4][Needs research] Auth.js v5 session strategy that works for both web (cookies) and future mobile (bearer tokens) — what's the best pattern?
- [Affects R8][Technical] Adapt pg-boss sync job from `EvChurch/changelog` to monorepo package structure. Sync frequency is hourly (already proven).
- [Affects R5][Technical] Railway deployment config — Dockerfile, environment variables, database provisioning steps.
- [Affects R13][Needs research] Tiptap extensions needed for the guide editor toolbar (bold, italic, heading, list, ordered list, link, image).

## Next Steps

-> `/ce:plan` for structured implementation planning
