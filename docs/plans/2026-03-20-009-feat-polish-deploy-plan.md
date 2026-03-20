---
title: "feat: Polish + Railway Deployment"
type: feat
status: active
date: 2026-03-20
sequence: 8 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
depends_on: 2026-03-20-007-feat-goals-feedback-plan.md, 2026-03-20-008-feat-guides-editor-plan.md
---

# feat: Polish + Railway Deployment

## Overview

Final polish pass (loading states, scroll fades, error handling) and Railway deployment configuration for production. Two Railway services: web app and pg-boss worker, sharing the same Postgres database.

## Implementation Units

### Unit 1: Loading States

**Goal:** Skeleton loading states for all data-dependent pages.

**Files:**
- `apps/web/src/app/(app)/teams/loading.tsx`
- `apps/web/src/app/(app)/teams/[teamId]/loading.tsx`
- `apps/web/src/app/(app)/goals/loading.tsx`
- `apps/web/src/app/(app)/guides/loading.tsx`
- `apps/web/src/app/(app)/settings/loading.tsx`
- `apps/web/src/app/(app)/profile/loading.tsx`
- `apps/web/src/components/ui/skeleton.tsx` — reusable skeleton shapes

**Approach:**
- Next.js `loading.tsx` convention for automatic Suspense boundaries
- Skeleton components: card-shaped, text-line-shaped, avatar-shaped
- Match the layout of the actual content so there's no layout shift

**Verification:** Loading states appear during data fetch. No layout shift on resolve.

### Unit 2: Error Handling

**Goal:** Error boundaries for graceful failure recovery.

**Files:**
- `apps/web/src/app/(app)/error.tsx` — global error boundary
- `apps/web/src/app/(app)/teams/[teamId]/error.tsx` — team-specific errors
- `apps/web/src/components/ui/error-state.tsx` — error display with retry button

**Approach:**
- Next.js `error.tsx` convention (client components with `reset` function)
- Error state: icon + "Something went wrong" + description + "Try again" button
- Log errors to console (production error reporting deferred)

**Verification:** Throwing in a Server Component shows the error boundary. Retry button works.

### Unit 3: Mobile Scroll Fades

**Goal:** Gradient overlays on mobile screens where content clips behind the tab bar.

**Files:**
- Update pages that need scroll fade: Team View, Role View, Goals, Guides

**Approach:**
- Position ScrollFade component absolutely above the mobile tab bar
- Gradient: transparent → `var(--bg-page)` (bottom 40px)
- Only render on mobile (<768px)

**Verification:** Content scrolls behind the gradient. Tab bar is not obscured.

### Unit 4: Mutation Feedback

**Goal:** Success/error feedback on all mutation actions.

**Files:**
- `apps/web/src/components/ui/toast.tsx` — simple toast notification
- Update all mutation call sites

**Approach:**
- Lightweight toast: slide in from top or bottom, auto-dismiss after 3s
- Success: "Goal created", "Feedback submitted", "Guide published", etc.
- Error: "Something went wrong. Please try again."
- No external toast library — simple CSS animation + state

**Verification:** Toasts appear on successful mutations. Error toasts on failure.

### Unit 5: Railway Deployment Config

**Goal:** Production deployment configuration for Railway.

**Files:**
- `apps/web/railway.toml` — web service config
- `apps/worker/railway.toml` — worker service config
- `.env.example` — update with all required vars
- `apps/web/Dockerfile` (optional — Railway nixpacks may auto-detect)

**Approach:**

Web service (`apps/web/railway.toml`):
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "pnpm --filter @repo/web start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

Worker service (`apps/worker/railway.toml`):
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node apps/worker/dist/index.js"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

Environment variables (both services share):
- `DATABASE_URL` — Railway Postgres connection string
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_PLANNING_CENTER_ID` / `AUTH_PLANNING_CENTER_SECRET`
- `PCO_API_ID` / `PCO_API_SECRET`
- `NEXTAUTH_URL` — production URL

Database migration: `pnpm exec --filter @repo/api prisma migrate deploy`

**Verification:** Railway config files are valid. `.env.example` documents all vars.

### Unit 6: Design Fidelity Audit

**Goal:** Verify all screens match design exports.

**Approach:**
- Compare each of the 12 routes at mobile (402px) and desktop (1440px) against `design/design-exports/screens/`
- Fix spacing, colors, typography, border radius discrepancies
- Verify empty states match the spec pattern

**Verification:** Visual comparison passes for all 12 routes at both breakpoints.

## Acceptance Criteria

- [ ] All pages have loading states (skeleton UI)
- [ ] Error boundaries catch and display errors gracefully with retry
- [ ] Mobile scroll fades work on Team View, Role View, Goals, Guides
- [ ] Toast notifications appear on successful mutations
- [ ] Railway config files exist for web and worker services
- [ ] `.env.example` documents all required environment variables
- [ ] All 12 routes visually match design exports at both breakpoints
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] No lint errors: `pnpm lint`

## Scope Boundaries

- No CI/CD pipeline (Railway auto-deploys from git)
- No production error reporting (Sentry etc. deferred)
- No image upload to bucket (guide images via URL only)
- No automated visual regression testing
