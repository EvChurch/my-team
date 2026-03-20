---
title: "feat: Design System + Layout"
type: feat
status: active
date: 2026-03-20
sequence: 4 of 8
origin: docs/plans/2026-03-20-001-feat-my-team-full-app-plan.md
depends_on: 2026-03-20-004-feat-auth-trpc-plan.md
---

# feat: Design System + Layout

## Overview

Replace the default Next.js scaffold with the My Team design system — design tokens, Outfit font, Tailwind theme, reusable UI components, responsive layout (sidebar + tab bar), and the login page. After this PR, the app has its visual identity and navigation shell.

## Design Reference

- Full spec: `design/MEGA_PROMPT.md` (Design System / Tokens section)
- Screen PNGs: `design/design-exports/screens/`
- PDF: `design/design-exports/export.pdf`

## Implementation Units

### Unit 1: Design Tokens + Tailwind Theme

**Goal:** CSS custom properties and Tailwind v4 theme configuration.

**Files:**
- `apps/web/src/app/globals.css` — replace entirely with design tokens
- `apps/web/src/app/layout.tsx` — Outfit font via Google Fonts (replace Geist)

**Approach:**
- Define all CSS custom properties from spec in `:root` (accent, bg, text, border, coral, error, success, warning)
- Remove dark mode media query (design is light-only)
- Tailwind v4 `@import "tailwindcss"` + `@theme inline` referencing CSS variables
- Import Outfit font weights 400, 500, 600, 700 from Google Fonts via `next/font/google`

### Unit 2: Base UI Components

**Goal:** Reusable components matching the design spec's component patterns.

**Files:**
- `apps/web/src/components/ui/card.tsx` — white bg, 16px radius, subtle shadow
- `apps/web/src/components/ui/button.tsx` — primary (accent), secondary (outline), danger (coral/error)
- `apps/web/src/components/ui/badge.tsx` — pill badges (accent-light + accent text, or bg-muted + text-tertiary)
- `apps/web/src/components/ui/avatar.tsx` — circular with initials fallback, configurable size
- `apps/web/src/components/ui/progress-bar.tsx` — accent fill with percentage label
- `apps/web/src/components/ui/segment-control.tsx` — tab switcher (Goals/Feedback style)
- `apps/web/src/components/ui/toggle.tsx` — on/off switch for settings
- `apps/web/src/components/ui/empty-state.tsx` — centered icon (in circle) + title + description
- `apps/web/src/components/ui/scroll-fade.tsx` — gradient overlay for mobile content clipping

**Approach:**
- All components use Tailwind classes referencing CSS custom properties
- Typography: section labels 12px/600/uppercase/letter-spacing-1px, body 14-15px, small 12-13px
- Cards: `rounded-2xl shadow-[0_2px_12px_rgba(26,25,24,0.03)]`
- Buttons: `rounded-[10px]` or `rounded-xl`, font-semibold
- Use Lucide React icons throughout

### Unit 3: Layout Shell

**Goal:** Responsive app layout with sidebar (desktop) and bottom tab bar (mobile).

**Files:**
- `apps/web/src/components/layout/sidebar.tsx` — 260px, Church icon + "My Team" logo, nav items, profile button
- `apps/web/src/components/layout/mobile-tab-bar.tsx` — pill-shaped container, 4 tabs, active pill indicator
- `apps/web/src/app/(app)/layout.tsx` — wraps authenticated routes, renders sidebar/tab bar, includes TRPCReactProvider
- `apps/web/src/app/(auth)/layout.tsx` — minimal layout for login

**Approach:**

Sidebar (desktop >=768px):
- Fixed left, 260px wide, white bg, right border
- Logo: Lucide `Church` icon (22px, accent) + "My Team" (Outfit 20px, 600)
- Nav items: My Teams (Users icon), Goals (Target), Guides (BookOpen), Settings (Settings) — stacked, 4px gap
- Active: accent bg, white icon+text. Inactive: text-secondary
- Profile button at bottom: accent-light bg, avatar circle + name + chevron-right

Tab bar (mobile <768px):
- Fixed bottom, pill-shaped (rounded-[36px]), white bg, border, 62px height
- 4 tabs: MY TEAMS, GOALS, GUIDES, SETTINGS
- Active: green pill (accent bg, white icon+text, rounded-[26px])
- Labels: 10px uppercase, letter-spacing 0.5px

Use `usePathname()` for active state detection.

### Unit 4: Login Page

**Goal:** PCO OAuth login page matching the design spec.

**Files:**
- `apps/web/src/app/(auth)/login/page.tsx`

**Approach:**
- Mobile: decorative icon cluster (HeartHandshake, Users, CalendarCheck in green circles) above centered card
- Desktop: split layout — left half with gradient overlay (#3D8A5A → transparent), right half with login card
- Login card: Church icon, "My Team" title, "Serving together, growing together" tagline
- Green "Sign in with Planning Centre" button → calls `signIn("planning-center")`
- Redirect authenticated users to `/teams`

### Unit 5: TRPCReactProvider Integration

**Goal:** Wire the tRPC client provider into the app layout.

**Files:**
- `apps/web/src/app/(app)/layout.tsx` — wrap children with `TRPCReactProvider`
- `apps/web/src/app/providers.tsx` — client component wrapper combining TRPCReactProvider + any other providers

**Approach:**
- Import `TRPCReactProvider` from `@repo/api/client`
- Wrap in a `Providers` client component to keep the layout as a Server Component

## Acceptance Criteria

- [ ] Outfit font loads correctly at weights 400, 500, 600, 700
- [ ] All CSS custom properties match the design spec values
- [ ] UI components render correctly and match spec patterns
- [ ] Desktop (>=768px): left sidebar with active state highlighting
- [ ] Mobile (<768px): bottom tab bar with active pill indicator
- [ ] Login page matches design at both breakpoints
- [ ] "Sign in with Planning Centre" button triggers OAuth flow
- [ ] Authenticated users redirected away from login
- [ ] No dark mode styles remain

## Scope Boundaries

- No content pages yet (just the layout shell + login)
- Login page left-half photo can be a placeholder gradient (no stock photo needed)
- Profile button in sidebar shows current user name but profile page is next PR
