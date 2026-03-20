---
title: "feat: Goals & Feedback"
type: feat
status: active
date: 2026-03-20
sequence: 6 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
depends_on: 2026-03-20-006-feat-read-screens-plan.md
---

# feat: Goals & Feedback

## Overview

Build the Goals & Feedback page with segment control tabs, goal creation, the Write Feedback form (leader-only), and the Approve Goals workflow (leader-only). This adds all mutation flows for goals and feedback.

## Design Reference

- Spec: `design/MEGA_PROMPT.md` (Screens 5, 10, 11)
- Screen PNGs: `design/design-exports/screens/`

## Implementation Units

### Unit 1: Goals & Feedback Page (`/goals`)

**Goal:** Main page with segment control switching between Goals and Feedback tabs.

**Files:**
- `apps/web/src/app/(app)/goals/page.tsx`
- `apps/web/src/components/goals/goal-card.tsx` — title, description, progress bar, due date
- `apps/web/src/components/feedback/feedback-card.tsx` — quote with left border accent, author, date

**Approach:**
- URL-driven tabs: `/goals` (default = Goals tab), `/goals?tab=feedback`
- Segment control component switches between tabs
- **Goals tab:**
  - Leader CTA: "Write Feedback" button + "Review (N)" with pending count badge
  - "ACTIVE GOALS" section label
  - Goal cards: title, description, progress bar with percentage, due date
  - "New Goal" button (green, top right on desktop)
- **Feedback tab:**
  - "RECENT FEEDBACK" label
  - Quote cards: left border accent (green for encouragement, coral for growth area), content in quotes, author + role, date
  - Two-column grid on desktop
- Empty states for both tabs

**Verification:** Both tabs render. Segment control switches content. URL updates with tab query param.

### Unit 2: New Goal Form

**Goal:** Modal or inline form for creating a new goal.

**Files:**
- `apps/web/src/components/goals/new-goal-form.tsx`

**Approach:**
- Fields: title (required), description (optional), due date (optional)
- Team selector if user is on multiple teams
- Calls `goals.create` tRPC mutation
- Goal created with `PENDING` status
- Success: close form, invalidate goals query
- Error: show inline error message

**Verification:** Goal creation works. New goal appears in list after creation.

### Unit 3: Write Feedback (`/teams/[teamId]/feedback/new`)

**Goal:** Leader-only feedback form.

**Files:**
- `apps/web/src/app/(app)/teams/[teamId]/feedback/new/page.tsx`
- `apps/web/src/components/feedback/feedback-form.tsx`

**Approach:**
- Leader access check — redirect non-leaders
- Member selector: avatar, name, role (from team members)
- Feedback type: radio group — Encouragement, Growth Area, General
- Content: text area
- Visibility toggle: "Share with team member" (boolean)
- Submit → `feedback.create` mutation
- Success: redirect to `/goals?tab=feedback` or team view
- Desktop: centered form card (~600px max-width)

**Verification:** Only leaders can access. Form submits correctly. Feedback appears in lists.

### Unit 4: Approve Goals (`/teams/[teamId]/goals/review`)

**Goal:** Leader-only goal review workflow.

**Files:**
- `apps/web/src/app/(app)/teams/[teamId]/goals/review/page.tsx`
- `apps/web/src/components/goals/goal-approval-card.tsx`

**Approach:**
- Leader access check — redirect non-leaders
- Segment tabs: Pending (default), Approved, Declined
- Pending count badge in header
- Goal cards: member avatar + name + role, goal title, description, due date
- Action buttons per card: "Approve" (green) + "Decline" (coral outline)
- Approve → `goals.updateStatus(id, APPROVED, reviewerId)` mutation
- Decline → `goals.updateStatus(id, DECLINED, reviewerId)` mutation
- Optimistic updates for fast feedback
- Desktop: card grid layout

**Verification:** Pending goals shown. Approve/decline updates status. Count badge updates.

### Unit 5: Goal Progress Updates

**Goal:** Allow goal owners to update progress.

**Files:**
- Update `apps/web/src/components/goals/goal-card.tsx` — add progress update interaction

**Approach:**
- Click on progress bar or edit button opens progress input (0-100 slider or number input)
- Calls `goals.updateProgress` mutation (owner only)
- When progress reaches 100, optionally set status to COMPLETED

**Verification:** Progress updates reflect immediately. Only goal owner can update.

## Acceptance Criteria

- [ ] Goals & Feedback page renders with segment control tabs
- [ ] Goal cards show title, description, progress bar, due date
- [ ] Feedback cards show styled quotes with accent borders
- [ ] New Goal form creates goals with PENDING status
- [ ] Write Feedback form accessible only to leaders
- [ ] Approve Goals page shows pending/approved/declined tabs
- [ ] Approve/decline buttons update goal status
- [ ] Progress updates work for goal owners
- [ ] All empty states shown
- [ ] Responsive at mobile and desktop

## Scope Boundaries

- No goal editing (only create + progress update + status change)
- No feedback editing or deletion
- No notification when goal is approved/declined
