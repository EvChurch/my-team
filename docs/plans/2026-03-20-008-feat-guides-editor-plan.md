---
title: "feat: Guides + Tiptap Editor"
type: feat
status: completed
date: 2026-03-20
sequence: 7 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
depends_on: 2026-03-20-006-feat-read-screens-plan.md
---

# feat: Guides + Tiptap Editor

## Overview

Build the Guides list, Guide detail view, and Guide editor with Tiptap rich text. Leaders can create, edit, publish, and delete guides. Guides are optionally tied to specific roles and stored as Tiptap JSON for future mobile rendering.

## Design Reference

- Spec: `design/MEGA_PROMPT.md` (Screens 6, 7, 12)
- Screen PNGs: `design/design-exports/screens/`

## Implementation Units

### Unit 1: Guides List (`/guides`)

**Goal:** Guides listing grouped by category with search and role badges.

**Files:**
- `apps/web/src/app/(app)/guides/page.tsx`
- `apps/web/src/components/guides/guide-card.tsx`
- `apps/web/src/components/guides/role-badge.tsx`

**Approach:**
- Header: title, subtitle, "New Guide" / "+" button (leaders only)
- Search bar: client-side text filter on title/description
- Sections: QUICK START (play icon, green accent), STANDARD OPERATING PROCEDURES (file-text icon, muted)
- Guide cards: category icon, title, description, role badge, chevron
- Role badges: `accent-light` bg + accent text for specific roles, `bg-muted` + `text-tertiary` for "All Roles"
- Cards link to `/guides/[guideId]`
- Empty state: "No Guides Yet"

**Verification:** Guides render grouped by category. Search filters correctly. Role badges display.

### Unit 2: Guide Detail (`/guides/[guideId]`)

**Goal:** Render stored Tiptap JSON content as HTML.

**Files:**
- `apps/web/src/app/(app)/guides/[guideId]/page.tsx`
- `apps/web/src/components/guides/guide-renderer.tsx`

**Approach:**
- Server Component fetches guide via `guides.get`
- Render Tiptap JSON content using `@tiptap/static-renderer` (server-side, no browser APIs):
  ```typescript
  import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
  ```
- Pass StarterKit + Image extensions for rendering
- Mobile: card-based sections
- Desktop: sidebar nav for guide sections + main content area
- "Edit" button for leaders → `/guides/[guideId]/edit`

**Verification:** Guide content renders as formatted HTML. Server-rendered (no hydration needed for content).

### Unit 3: Tiptap Editor Component

**Goal:** Rich text editor matching the spec's toolbar.

**Files:**
- `apps/web/src/components/guides/guide-editor.tsx` — `'use client'` editor component
- `apps/web/src/components/guides/editor-toolbar.tsx` — toolbar buttons

**Approach:**
- `useEditor` with `immediatelyRender: false` (required for SSR/Next.js)
- Extensions:
  - `StarterKit` (bundles Bold, Italic, Heading, BulletList, OrderedList, Link, Underline in Tiptap 3)
  - `@tiptap/extension-image` (separate install)
  - Configure StarterKit: `heading: { levels: [1, 2, 3] }`
  - If custom Link config needed: `StarterKit.configure({ link: false })` + separate Link import
- Toolbar buttons: Bold, Italic, Heading dropdown (1-3), Bullet List, Ordered List, Link (prompt URL), Image (prompt URL or upload)
- `onUpdate` callback: `editor.getJSON()` → parent state
- Store content as `Json` column (Tiptap JSON format)

**Tiptap 3.x notes:**
- BubbleMenu/FloatingMenu: import from `@tiptap/react/menus`
- `shouldRerenderOnTransaction` is `false` by default in v3

**Dependencies:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tiptap/extension-image`, `@tiptap/static-renderer`

**Verification:** Editor renders without hydration errors. Toolbar actions work. JSON output is valid.

### Unit 4: Guide Editor Pages

**Goal:** Create and edit guide pages for leaders.

**Files:**
- `apps/web/src/app/(app)/teams/[teamId]/guides/new/page.tsx`
- `apps/web/src/app/(app)/guides/[guideId]/edit/page.tsx`

**Approach:**
- Leader access check — redirect non-leaders
- Guide type chips: Quick Start (Play icon), Troubleshooting (Wrench), SOP (FileText) — pill selectors, active = green
- Role selector: dropdown to assign to specific position or "All Roles"
- Title input: large text field
- Tiptap editor component for content
- Desktop right panel: Guide Details metadata card (status badge, author, team, role, last edited) + Visibility card (team visibility toggle, pin to top toggle)
- Buttons: "Save Draft" → `guides.create/update` with DRAFT status, "Publish" → `guides.publish`
- Edit page: load existing guide data, pre-populate editor with stored JSON

**Verification:** Create guide saves to DB with correct JSON content. Edit loads and saves. Publish changes status.

### Unit 5: Guide Deletion

**Goal:** Leaders can delete guides.

**Files:**
- Update guide detail or edit page with delete action

**Approach:**
- Delete button with confirmation dialog
- Calls `guides.delete` mutation
- Redirect to `/guides` after deletion

**Verification:** Delete removes guide. Redirect works.

## Acceptance Criteria

- [ ] Guides list renders grouped by category (Quick Start, SOP)
- [ ] Search bar filters guides client-side
- [ ] Role badges show correctly (specific role vs "All Roles")
- [ ] Guide detail renders Tiptap JSON as formatted HTML server-side
- [ ] Tiptap editor loads without hydration errors (immediatelyRender: false)
- [ ] Toolbar: bold, italic, heading, lists, link, image all functional
- [ ] Guide creation saves content as JSON
- [ ] Guide editing loads and saves existing content
- [ ] Publish changes status from DRAFT to PUBLISHED
- [ ] Delete removes guide with confirmation
- [ ] All pages responsive at mobile and desktop

## Scope Boundaries

- Image upload: prompt for URL only (no file upload to bucket in this PR)
- No collaborative editing
- No guide versioning
