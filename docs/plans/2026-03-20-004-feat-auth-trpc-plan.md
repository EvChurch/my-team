---
title: "feat: Auth + tRPC API Layer"
type: feat
status: active
date: 2026-03-20
sequence: 3 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
depends_on: 2026-03-20-002-feat-monorepo-foundation-plan.md
---

# feat: Auth + tRPC API Layer

## Overview

Set up Auth.js v5 with a custom Planning Center OIDC provider and build the complete tRPC v11 API layer with all routers (teams, goals, feedback, guides, people). This PR wires auth into tRPC context so all procedures can check authentication and leader status.

## Implementation Units

### Unit 1: packages/auth

**Goal:** Auth.js v5 configuration with custom PCO OIDC provider.

**Files:**
- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/auth/src/index.ts` — `NextAuth()` export: `{ auth, handlers, signIn, signOut }`
- `packages/auth/src/planning-center.ts` — Custom PCO OIDC provider

**Approach:**

PCO provider using OIDC discovery (PCO supports this since Sept 2025):
```typescript
type: "oidc",
issuer: "https://api.planningcenteronline.com",
clientId: env.AUTH_PLANNING_CENTER_ID,
clientSecret: env.AUTH_PLANNING_CENTER_SECRET,
authorization: { params: { scope: "openid people services" } }
```

Auth config:
- JWT session strategy, 30-day max age
- JWT callback: persist `pcoId` (from `profile.sub`), access token
- Session callback: expose `pcoId` on session user
- Custom sign-in page: `/login`

**Critical Auth.js v5 notes:**
- Use `next-auth@beta` package (v5)
- `auth()` replaces `getServerSession()` — no options parameter needed
- Env var `AUTH_SECRET` replaces `NEXTAUTH_SECRET`
- Next.js 16 uses `proxy.ts` (not `middleware.ts`) for session proxy

**Dependencies:** `next-auth@beta`

**Verification:** TypeScript compiles. Auth exports are correctly typed.

### Unit 2: Auth Route Handlers + Middleware

**Goal:** Wire auth into the Next.js app.

**Files:**
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — `export { GET, POST } from @repo/auth`
- `apps/web/proxy.ts` — session proxy middleware for Next.js 16
- `apps/web/src/lib/auth.ts` — re-export auth utilities for app use

**Approach:**
- Route handler imports `handlers` from `@repo/auth`
- `proxy.ts` exports `auth as middleware` with matcher excluding auth API, static files
- Protect all `(app)` routes, allow `(auth)` routes for unauthenticated users

**Verification:** Unauthenticated requests to `/teams` redirect to `/login`. Auth callback URL works.

### Unit 3: tRPC v11 Initialization

**Goal:** tRPC initialization with auth-aware context and base procedures.

**Files:**
- `packages/api/src/init.ts` — `initTRPC`, `createTRPCContext`, base procedures
- `packages/api/src/trpc/server.ts` — `createTRPCOptionsProxy` for Server Components
- `packages/api/src/trpc/client.ts` — `TRPCProvider` + `useTRPC` hook for client components
- `packages/api/src/trpc/query-client.ts` — shared `makeQueryClient` factory
- `packages/api/package.json` — update exports: `./server`, `./client`, `./init`, `./routers`

**Approach:**

Context creation:
- Call `auth()` from `@repo/auth` to get session
- Look up `Person` by PCO `remoteId` matching session `pcoId`
- Expose `{ session, user, personId }` on context

Procedures:
- `baseProcedure` — public (for login page data if needed)
- `protectedProcedure` — requires authenticated session, throws `UNAUTHORIZED`
- `leaderProcedure` — input includes `teamId`, verifies user is a Leader for that team, throws `FORBIDDEN`

**tRPC v11 critical patterns:**
- Server: `createTRPCOptionsProxy` with `ctx` factory and `queryClient` (replaces `createHydrationHelpers`)
- Client: `createTRPCContext` from `@trpc/tanstack-react-query` → `{ TRPCProvider, useTRPC }` (NOT `createTRPCReact`)
- Client hooks: use native `useSuspenseQuery(trpc.route.queryOptions())` not custom wrappers

**Dependencies:** `@trpc/server`, `@trpc/client`, `@trpc/tanstack-react-query`, `@tanstack/react-query`, `superjson`, `server-only`, `client-only`

**Verification:** tRPC types compile. Context correctly infers session type.

### Unit 4: tRPC Routers

**Goal:** All domain routers with queries and mutations.

**Files:**
- `packages/api/src/routers/_app.ts` — root router merging all sub-routers
- `packages/api/src/routers/teams.ts`
- `packages/api/src/routers/goals.ts`
- `packages/api/src/routers/feedback.ts`
- `packages/api/src/routers/guides.ts`
- `packages/api/src/routers/people.ts`

**Approach:**

**Teams router:**
- `teams.list` (protected) — teams for current user via Assignment/Leader joins
- `teams.get` (protected) — single team with members, positions, leaders, goals count, feedback count, guides

**Goals router:**
- `goals.list` (protected) — filter by teamId, personId, status
- `goals.pending` (leader) — pending goals for team
- `goals.create` (protected) — creates with PENDING status
- `goals.updateStatus` (leader) — approve/decline
- `goals.updateProgress` (protected) — update progress 0-100, owner only

**Feedback router:**
- `feedback.list` (protected) — filter by teamId, recipientId; only shared feedback visible to non-leaders
- `feedback.create` (leader) — create feedback for team member

**Guides router:**
- `guides.list` (protected) — filter by teamId, roleId, category; respect isVisibleToTeam
- `guides.get` (protected) — single guide with full content
- `guides.create` (leader) — create guide
- `guides.update` (leader) — update guide
- `guides.publish` (leader) — set status to PUBLISHED
- `guides.delete` (leader) — delete guide

**People router:**
- `people.me` (protected) — current user's Person with teams, positions, leader status

All inputs validated with Zod schemas. Use `superjson` transformer for Date serialization.

**Verification:** All routers compile. Type inference works end-to-end from router to client.

### Unit 5: API Route Handler

**Goal:** Wire tRPC into Next.js API routes.

**Files:**
- `apps/web/src/app/api/trpc/[trpc]/route.ts`

**Approach:**
- Use `fetchRequestHandler` from `@trpc/server/adapters/fetch`
- Pass `appRouter` and `createTRPCContext` with headers from request

**Verification:** `GET /api/trpc/people.me` returns data (or 401 if unauthenticated).

## Acceptance Criteria

- [ ] PCO OAuth sign-in flow works end-to-end (requires PCO credentials)
- [ ] Unauthenticated users redirected to `/login`
- [ ] `auth()` returns session with `pcoId` for authenticated users
- [ ] All tRPC routers compile with correct input/output types
- [ ] Protected procedures reject unauthenticated requests with UNAUTHORIZED
- [ ] Leader procedures reject non-leaders with FORBIDDEN
- [ ] tRPC server caller works in Server Components
- [ ] tRPC client provider works in client components
- [ ] All TypeScript compilation passes

## Scope Boundaries

- No login UI (next PR — design system needed first)
- No pages consuming tRPC data yet (subsequent PRs)
- OAuth tested only when PCO credentials available
