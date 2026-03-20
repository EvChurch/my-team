---
title: "feat: Read Screens"
type: feat
status: completed
date: 2026-03-20
sequence: 5 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
depends_on: 2026-03-20-005-feat-design-system-layout-plan.md
---

# feat: Read Screens

## Overview

Build all read-only screens: My Teams, Team View, Role View, Settings, and Profile. These pages consume tRPC data via Server Components with prefetching and hydration to client components. Every screen includes responsive layouts and empty states.

## Design Reference

- Screen PNGs: `design/design-exports/screens/`
- Spec: `design/MEGA_PROMPT.md` (Screens 2-4, 8-9)

## Implementation Units

### Unit 1: My Teams Page (`/teams`)

**Goal:** Home screen showing all teams the current user belongs to.

**Files:**
- `apps/web/src/app/(app)/teams/page.tsx` — Server Component with tRPC prefetch
- `apps/web/src/components/teams/team-card.tsx` — team name, service type, member count, role badge

**Approach:**
- Server Component: prefetch `teams.list` via `trpc.teams.list.queryOptions()`
- Hydrate to client with `HydrationBoundary`
- Each card shows: team name, service type name (as campus proxy), member count (derived from assignments), user's role badge
- Cards link to `/teams/[teamId]`
- Empty state: Users icon + "No Teams Yet" + description

**Verification:** Page renders teams for authenticated user. Empty state shows when user has no teams.

### Unit 2: Team View Page (`/teams/[teamId]`)

**Goal:** Full team detail page with leader-conditional actions.

**Files:**
- `apps/web/src/app/(app)/teams/[teamId]/page.tsx`
- `apps/web/src/components/teams/leader-actions.tsx` — Write Feedback, Review Goals, New Guide buttons
- `apps/web/src/components/teams/team-members-list.tsx`
- `apps/web/src/components/teams/team-roles-list.tsx`

**Approach:**
- Header: back button, team name, service type name
- Leader indicator: if user is leader, show "Lead"/"Team Lead" badge + action buttons
  - "Write Feedback" (green solid) → `/teams/[teamId]/feedback/new`
  - "Review Goals (N)" (outlined) → `/teams/[teamId]/goals/review`
  - "New Guide" (outlined) → `/teams/[teamId]/guides/new`
- Sections:
  - **About**: Team description (render markdown from `descriptionMarkdown` computed field)
  - **Team Roles**: role cards with member counts, link to `/teams/[teamId]/roles/[roleId]`
  - **Team Goals**: progress bars for team goals
  - **Leader Feedback**: recent feedback quotes with left border accent
  - **Guides**: guide cards linked to team
  - **Team Members**: avatar + name + role list
- Mobile: scroll fade overlay above tab bar
- Empty state: "No team data"
- **Note:** "My Upcoming Serving" section shows empty state — schedule sync deferred

**Verification:** All sections render with data. Leader-only elements hidden for regular members. Empty state for no data.

### Unit 3: Role View Page (`/teams/[teamId]/roles/[roleId]`)

**Goal:** Role detail with goals, members, and guides filtered by role.

**Files:**
- `apps/web/src/app/(app)/teams/[teamId]/roles/[roleId]/page.tsx`

**Approach:**
- Header: back button, role name, team name
- Sections: Description, Current Goals (progress bars), Historic Goals, Others in This Role, Role Guides
- Empty state: "No role data"

**Verification:** Page renders role details. Guides filtered to this role's ID.

### Unit 4: Settings Page (`/settings`)

**Goal:** Settings with profile card and preferences.

**Files:**
- `apps/web/src/app/(app)/settings/page.tsx`

**Approach:**
- Profile card: avatar, name, email, role
- Preferences card: Notifications toggle (UI only), Appearance, Language, Help & Support (chevron)
- Sign Out button (coral outline) → calls `signOut()`
- Version footer text

**Verification:** Settings render. Sign out works.

### Unit 5: Profile Page (`/profile`)

**Goal:** Full profile view with account info and team list.

**Files:**
- `apps/web/src/app/(app)/profile/page.tsx`

**Approach:**
- Desktop: two columns. Left: profile card (large avatar, name, role, email) + account info (phone, church/organization, member since). Right: teams list + sign out.
- Mobile: single column stack
- Teams list reuses team card component

**Verification:** Profile renders with user data. Responsive layout switches at 768px.

## Acceptance Criteria

- [x] My Teams shows user's teams with correct data
- [x] Team View shows all sections with real or empty data
- [x] Leader badge and action buttons only visible to team leaders
- [x] Role View filters goals and guides by role
- [x] Settings page renders preferences and sign out works
- [x] Profile page shows user info and team list
- [x] All empty states match the spec pattern (icon + title + description)
- [x] All pages responsive at mobile (402px) and desktop (1440px)
- [x] Server-side prefetching works (no loading flash on initial render)

## Scope Boundaries

- No mutation flows (goals, feedback, guides CRUD in later PRs)
- "My Upcoming Serving" shows empty state (schedule sync deferred)
- Notification toggle is UI-only (no backend)
- Language/Appearance settings are UI-only
