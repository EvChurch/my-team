---
title: "feat: Add dark mode with three-way theme toggle"
type: feat
status: completed
date: 2026-03-29
origin: docs/brainstorms/2026-03-29-dark-mode-requirements.md
---

# feat: Add dark mode with three-way theme toggle

## Overview

Add dark mode support with a Light/Dark/System toggle in Settings. Theme preference persists server-side (synced across devices) and is cached in localStorage to prevent flash of wrong theme on load. Dark palette is derived from existing CSS custom properties.

## Problem Frame

The app only supports light mode. Volunteers use it across varied lighting conditions — bright church lobbies, dark late-night prep sessions. A dark theme reduces eye strain and meets modern UX expectations. The Settings page already has an Appearance placeholder ready to be wired up. (see origin: docs/brainstorms/2026-03-29-dark-mode-requirements.md)

## Requirements Trace

- R1. Three-way toggle: Light, Dark, System
- R2. Server-side persistence on user profile, synced across devices
- R3. localStorage cache for instant theme application on page load
- R4. Default for new users: System
- R5. Dark palette derived from existing light tokens
- R6. WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large text)
- R7. Accent green adjusted for dark mode contrast but recognizably same hue
- R8. Dark values via `.dark` class on `<html>`, overriding `:root` tokens
- R9. Theme picker in Settings > Appearance
- R10. Segmented control with Light/Dark/System options
- R11. Immediate application without page reload
- R12. Blocking inline script in `<head>` prevents flash

## Scope Boundaries

- No Figma dark variants — derived programmatically
- No quick-toggle icon in nav — Settings only
- No per-page or per-component theme overrides
- No high-contrast or custom theme support
- Card shadow values will use a CSS custom property but do not need a full shadow token system

## Context & Research

### Relevant Code and Patterns

- **CSS tokens**: `apps/web/src/app/globals.css` — 21 `:root` custom properties, mapped to Tailwind via `@theme inline`. Adding `html.dark { }` overrides will cascade through all Tailwind classes automatically.
- **No hardcoded hex colors** in `.tsx` components — the token system is fully adopted.
- **Hardcoded shadows**: `rgba(26,25,24,0.03)` and `rgba(26,25,24,0.06)` in `card.tsx`, `segment-control.tsx`, `mobile-tab-bar.tsx`, `login/page.tsx`, `team-view-content.tsx`, `plan-details-content.tsx`. These need a `--shadow-card` / `--shadow-card-strong` CSS custom property to adapt in dark mode.
- **Root layout**: `apps/web/src/app/layout.tsx` — `<html>` tag renders font class, no `suppressHydrationWarning`, no scripts. Injection point for theme script and dark class.
- **Settings page**: `apps/web/src/app/(app)/settings/settings-content.tsx` — Appearance button exists as no-op placeholder with Moon icon.
- **SegmentControl**: `apps/web/src/components/ui/segment-control.tsx` — generic typed component, perfect for theme picker.
- **Prisma schema**: `packages/api/prisma/schema.prisma` — no User or preferences model. Auth is JWT-only via Auth.js. `Person` model is PCO-synced. Theme preference needs a new `UserPreference` model keyed to `personId`.
- **tRPC routers**: `packages/api/src/routers/_app.ts` — 7 routers. A new `preferences` router fits the pattern.
- **People router**: `packages/api/src/routers/people.ts` — `protectedProcedure` pattern with `ctx.personId`.
- **Mutation pattern**: `useMutation(trpc.router.method.mutationOptions())` with `onSuccess` callback.
- **Providers**: `apps/web/src/app/providers.tsx` — wraps tRPC + Toast. ThemeProvider can be added here.

### Institutional Learnings

- Tailwind v4 design system was intentionally built with `:root` CSS custom properties (see `docs/solutions/ui-bugs/tailwindv4-css-custom-properties-design-system.md`). The original setup explicitly removed `@media (prefers-color-scheme: dark)` because design was light-only. Dark mode reintroduces theme switching via the same token architecture.
- Next.js 16 hydration sensitivity (see `docs/solutions/integration-issues/nextjs16-turbopack-monorepo-gotchas.md`): `suppressHydrationWarning` on `<html>` is required for the blocking theme script pattern.
- tRPC v11 prefetch/hydration pattern (see `docs/solutions/integration-issues/trpc-v11-server-components-hydration.md`): use `queryOptions()` for server prefetch and `invalidateQueries` after mutations.

## Key Technical Decisions

- **New `UserPreference` model** rather than adding a column to `Person`: Person is PCO-synced (read-only from the app's perspective). A separate `UserPreference` model with a unique `personId` foreign key keeps app-native preferences cleanly separated. Uses `upsert` for simplicity — no separate create/update flows.
- **`.dark` class on `<html>`** rather than `data-theme` attribute: Simpler CSS selectors (`html.dark { }`) and more conventional. The existing `className` on `<html>` already combines font variable and utility classes, so adding a theme class is natural.
- **Blocking inline `<script>` in root layout** rather than `next/script`: `next/script` with `strategy="beforeInteractive"` doesn't guarantee execution before first paint in App Router. A raw `<script dangerouslySetInnerHTML>` in the `<head>` of `layout.tsx` is the proven pattern (used by next-themes and similar libraries).
- **localStorage key `theme` + cookie `theme`**: The blocking script reads localStorage. The tRPC mutation writes both server-side (DB) and client-side (localStorage). On login/page load, the server can optionally set a cookie for SSR hints, but the primary no-flash mechanism is the blocking script reading localStorage.
- **Shadow CSS custom properties**: Rather than a full shadow token system, add `--shadow-card` and `--shadow-card-strong` to `:root` and `html.dark`. Replace hardcoded `shadow-[...]` classes with `shadow-[var(--shadow-card)]` etc.
- **ThemeProvider context**: A lightweight React context provides `theme` (the preference) and `setTheme` to the Settings UI. It manages localStorage writes, `<html>` class toggling, and `prefers-color-scheme` media query listener for System mode.

## Open Questions

### Resolved During Planning

- **Schema approach**: New `UserPreference` model keyed to `personId` — keeps Person model PCO-synced and clean.
- **Blocking script approach**: Inline `<script dangerouslySetInnerHTML>` in `layout.tsx` `<head>` — most reliable for pre-paint execution in Next.js App Router.
- **Hard-coded colors audit**: No hex colors in `.tsx` files. Only `rgba()` shadows need tokenization (3 unique shadow values across 6 files).

### Deferred to Implementation

- **Exact dark palette hex values**: Derive during implementation by inverting/adjusting the 21 light tokens and checking WCAG AA contrast ratios. The accent green (#3D8A5A) should be lightened to ~#5AAE78 or similar — verify contrast against dark backgrounds.
- **Shadow values for dark mode**: Likely `0_2px_12px_rgba(0,0,0,0.15)` and `0_1px_3px_rgba(0,0,0,0.2)` — verify visually during implementation.

## Implementation Units

- [ ] **Unit 1: Add shadow CSS custom properties**

  **Goal:** Extract hardcoded `rgba()` shadow values into CSS custom properties so they can be overridden in dark mode.

  **Requirements:** R8 (prerequisite for dark palette definition)

  **Dependencies:** None

  **Files:**
  - Modify: `apps/web/src/app/globals.css`
  - Modify: `apps/web/src/components/ui/card.tsx`
  - Modify: `apps/web/src/components/ui/segment-control.tsx`
  - Modify: `apps/web/src/components/layout/mobile-tab-bar.tsx`
  - Modify: `apps/web/src/app/(auth)/login/page.tsx`
  - Modify: `apps/web/src/app/(app)/teams/[teamId]/team-view-content.tsx`
  - Modify: `apps/web/src/app/(app)/plans/[planRemoteId]/plan-details-content.tsx`

  **Approach:**
  - Add `--shadow-card: 0 2px 12px rgba(26,25,24,0.03)` and `--shadow-card-strong: 0 1px 3px rgba(26,25,24,0.06)` to `:root` in `globals.css`
  - Also add to `@theme inline` as `--shadow-card: var(--shadow-card)` and `--shadow-card-strong: var(--shadow-card-strong)`
  - Replace all `shadow-[0_2px_12px_rgba(26,25,24,0.03)]` with `shadow-[var(--shadow-card)]`
  - Replace all `shadow-[0_1px_3px_rgba(26,25,24,0.06)]` with `shadow-[var(--shadow-card-strong)]`
  - The mobile-tab-bar uses the strong shadow variant

  **Patterns to follow:**
  - Existing `--border` / `--border-strong` naming convention for intensity variants

  **Test scenarios:**
  - Happy path: Cards, segment control, mobile tab bar, and login page all render with visible shadows identical to current appearance (visual regression — no change expected)

  **Verification:**
  - All `rgba(26,25,24,` occurrences removed from `.tsx` files
  - Shadows render identically to before (no visual change)

- [ ] **Unit 2: Define dark palette in CSS**

  **Goal:** Add dark mode CSS custom property overrides that cascade through the entire app.

  **Requirements:** R5, R6, R7, R8

  **Dependencies:** Unit 1 (shadow tokens must exist)

  **Files:**
  - Modify: `apps/web/src/app/globals.css`

  **Approach:**
  - Add `html.dark { }` block after `:root` that redefines all 21 token values plus the 2 shadow tokens
  - Derive dark values: dark backgrounds (#1A1918, #242322, #2C2B29), light text (#F5F4F1, #A8A7A5, #7D7C7A), adjusted accent (#5AAE78 or similar)
  - Verify all text/background pairs meet WCAG AA: 4.5:1 for body text, 3:1 for large text and UI components
  - Keep `--text-on-accent: #FFFFFF` (still works on the adjusted green)
  - Adjust `--coral`, `--error`, `--warning`, `--success` for dark backgrounds — lighten slightly if needed for contrast
  - Dark shadows: increase opacity since shadows are less visible on dark backgrounds

  **Patterns to follow:**
  - Same property names as `:root` — just different values under `html.dark`

  **Test scenarios:**
  - Happy path: When `html` has `.dark` class, all token-based colors switch to dark values
  - Edge case: `--accent` on dark `--bg-card` meets 3:1 contrast for UI components
  - Edge case: `--text-primary` on `--bg-page` meets 4.5:1 contrast in dark mode
  - Edge case: `--text-secondary` on `--bg-card` meets 4.5:1 contrast in dark mode
  - Edge case: `--coral` and `--error` remain legible on dark backgrounds

  **Verification:**
  - Adding `.dark` to `<html>` in dev tools switches the entire app to dark colors
  - All text is legible against its background
  - Accent green is recognizably the same hue

- [ ] **Unit 3: Add UserPreference model and preferences tRPC router**

  **Goal:** Persist theme preference server-side so it syncs across devices.

  **Requirements:** R2, R4

  **Dependencies:** None (can be done in parallel with Units 1-2)

  **Files:**
  - Modify: `packages/api/prisma/schema.prisma`
  - Create: `packages/api/src/routers/preferences.ts`
  - Modify: `packages/api/src/routers/_app.ts`
  - Test: `packages/api/src/routers/__tests__/preferences.test.ts`

  **Approach:**
  - Add `ThemePreference` enum: `LIGHT`, `DARK`, `SYSTEM`
  - Add `UserPreference` model: `id`, `personId` (unique, FK to Person), `theme` (ThemePreference, default SYSTEM), `createdAt`, `updatedAt`
  - Create `preferences` router with:
    - `getTheme` query: returns the user's theme preference (defaults to `SYSTEM` if no record exists)
    - `setTheme` mutation: accepts a `ThemePreference` value, upserts `UserPreference` for `ctx.personId`
  - Register `preferences` router in `_app.ts`
  - Run `prisma migrate dev` to create migration

  **Patterns to follow:**
  - `protectedProcedure` from `packages/api/src/init.ts` for auth
  - `prisma.userPreference.upsert()` pattern
  - Zod validation for the theme enum input

  **Test scenarios:**
  - Happy path: `getTheme` returns `SYSTEM` when no preference record exists
  - Happy path: `setTheme` with `DARK` creates a preference record, subsequent `getTheme` returns `DARK`
  - Happy path: `setTheme` with `LIGHT` updates existing record from `DARK` to `LIGHT`
  - Edge case: `setTheme` with invalid value is rejected by Zod validation
  - Integration: `setTheme` then `getTheme` round-trips correctly through the database

  **Verification:**
  - `prisma migrate dev` succeeds
  - tRPC router responds correctly to get/set theme calls

- [ ] **Unit 4: ThemeProvider and blocking script**

  **Goal:** Client-side theme management with no-flash loading.

  **Requirements:** R1, R3, R4, R11, R12

  **Dependencies:** Unit 2 (dark palette must exist), Unit 3 (server persistence available)

  **Files:**
  - Create: `apps/web/src/components/theme-provider.tsx`
  - Modify: `apps/web/src/app/layout.tsx`
  - Modify: `apps/web/src/app/providers.tsx`
  - Test: `apps/web/src/components/__tests__/theme-provider.test.tsx`

  **Approach:**
  - **Blocking script** in `layout.tsx`:
    - Add `suppressHydrationWarning` to `<html>` element
    - Add inline `<script dangerouslySetInnerHTML>` in `<head>` before any stylesheets
    - Script reads `localStorage.getItem('theme')`, resolves System via `matchMedia('(prefers-color-scheme: dark)')`, and adds/removes `.dark` class on `document.documentElement`
  - **ThemeProvider** context:
    - Exports `ThemeProvider` component and `useTheme()` hook
    - State: `theme` (the user's preference: `'light' | 'dark' | 'system'`)
    - On mount: reads localStorage, falls back to `'system'`
    - `setTheme(value)`: updates state, writes to localStorage, toggles `.dark` class on `<html>`, calls tRPC `preferences.setTheme` mutation
    - Listens to `matchMedia('(prefers-color-scheme: dark)')` change events — when theme is `'system'`, toggles `.dark` class accordingly
    - On login (initial page load after auth): fetches server preference via tRPC `preferences.getTheme`, writes to localStorage, applies
  - Add `<ThemeProvider>` wrapper in `providers.tsx`

  **Patterns to follow:**
  - Provider pattern from `apps/web/src/app/providers.tsx` (TRPCReactProvider, ToastProvider)
  - `useMutation(trpc.preferences.setTheme.mutationOptions())` for server persistence
  - `useSuspenseQuery` or `useQuery` for initial preference fetch

  **Test scenarios:**
  - Happy path: ThemeProvider renders children and provides theme context
  - Happy path: `setTheme('dark')` adds `.dark` class to `<html>` and writes `'dark'` to localStorage
  - Happy path: `setTheme('light')` removes `.dark` class and writes `'light'` to localStorage
  - Happy path: `setTheme('system')` checks OS preference and toggles `.dark` accordingly
  - Edge case: System preference changes while theme is `'system'` — `.dark` class updates reactively
  - Edge case: No localStorage value on first visit — defaults to `'system'`
  - Integration: Blocking script applies `.dark` before React hydrates (no visible flash)

  **Verification:**
  - Toggling theme in React DevTools / calling `setTheme` switches colors instantly
  - Hard refresh with `theme: 'dark'` in localStorage shows dark mode immediately (no flash)
  - Hard refresh with no localStorage and OS dark mode shows dark mode (System default)

- [ ] **Unit 5: Settings Appearance UI**

  **Goal:** Wire the Appearance placeholder in Settings to a functional theme picker.

  **Requirements:** R9, R10, R11

  **Dependencies:** Unit 4 (ThemeProvider must exist)

  **Files:**
  - Modify: `apps/web/src/app/(app)/settings/settings-content.tsx`
  - Test: `apps/web/src/app/(app)/settings/__tests__/settings-content.test.tsx`

  **Approach:**
  - Replace the Appearance `<button>` placeholder with an inline theme picker
  - Use `SegmentControl` component with segments: `[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]`
  - Wire `activeSegment` to `useTheme().theme` and `onSegmentChange` to `useTheme().setTheme`
  - Keep the Moon icon and "Appearance" label in the row, place SegmentControl where the ChevronRight was
  - The change applies immediately (R11) — no save button needed

  **Patterns to follow:**
  - Existing SegmentControl usage in `team-view-content.tsx` and `plan-details-content.tsx`
  - Settings card row layout pattern already in `settings-content.tsx`

  **Test scenarios:**
  - Happy path: Theme picker renders with three segments (Light, Dark, System)
  - Happy path: Active segment reflects current theme from ThemeProvider
  - Happy path: Clicking "Dark" segment calls `setTheme('dark')` and immediately switches colors
  - Happy path: Clicking "System" segment applies OS preference
  - Edge case: Picker state persists after navigating away and returning to Settings

  **Verification:**
  - Settings page shows functional theme picker
  - Selecting each option visually switches the app's color scheme

- [ ] **Unit 6: Visual audit and polish**

  **Goal:** Verify all screens look correct in dark mode and fix any issues.

  **Requirements:** R5, R6 (all screens legible and visually coherent)

  **Dependencies:** Units 1-5 complete

  **Files:**
  - Potentially modify: any component with visual issues discovered during audit

  **Approach:**
  - Walk through every major screen in dark mode: login, teams list, team view, role view, goals, feedback, guides, guide detail, guide editor, settings, profile
  - Check for: invisible text, insufficient contrast, elements that "disappear", borders that are too subtle, focus rings that don't show
  - Verify the login page looks good in dark mode (it's outside the app layout)
  - Check both mobile and desktop breakpoints
  - Fix any issues found — most should be solvable by adjusting dark token values in `globals.css`

  **Test scenarios:**
  - Happy path: All major screens render without visual artifacts in dark mode
  - Edge case: Empty states and loading skeletons are visible in dark mode
  - Edge case: Toast notifications are legible in dark mode
  - Edge case: Focus rings and interactive states are visible in dark mode

  **Verification:**
  - Every screen in the route structure is visually checked in both light and dark mode
  - No text-on-background combination fails WCAG AA contrast

## System-Wide Impact

- **Interaction graph:** The blocking `<head>` script runs before React — it only reads localStorage and sets a class, no side effects. ThemeProvider wraps the entire app via `providers.tsx`, same layer as tRPC and Toast providers.
- **Error propagation:** If the tRPC `setTheme` mutation fails, the theme still applies locally (localStorage + class toggle are synchronous). Server sync is best-effort — the user sees the correct theme regardless. No error toast needed for silent sync failure.
- **State lifecycle risks:** localStorage and server state can diverge if the mutation fails. On next login/page load, the ThemeProvider should fetch the server value and reconcile — server wins for cross-device sync, but the blocking script uses localStorage for immediate no-flash rendering.
- **API surface parity:** Only the web app consumes themes currently. If a mobile app is added later, the `preferences` tRPC router is already available.
- **Unchanged invariants:** All existing Tailwind utility classes (`bg-bg-card`, `text-text-primary`, etc.) continue to work unchanged. The dark mode implementation only changes the underlying CSS custom property values — no component API changes.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Dark palette contrast ratios fail WCAG AA | Derive values methodically; check each text/bg pair with a contrast calculator during Unit 2 |
| Blocking script causes hydration mismatch | `suppressHydrationWarning` on `<html>` — standard pattern used by next-themes |
| localStorage/server preference diverge | ThemeProvider reconciles on mount by fetching server value; server wins for preference, localStorage wins for immediate rendering |
| Shadow tokens break existing shadow appearance | Unit 1 is a pure refactor — verify visual identity before proceeding |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-29-dark-mode-requirements.md](docs/brainstorms/2026-03-29-dark-mode-requirements.md)
- Institutional: `docs/solutions/ui-bugs/tailwindv4-css-custom-properties-design-system.md`
- Institutional: `docs/solutions/integration-issues/nextjs16-turbopack-monorepo-gotchas.md`
- Institutional: `docs/solutions/integration-issues/trpc-v11-server-components-hydration.md`
- Related code: `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/(app)/settings/settings-content.tsx`
