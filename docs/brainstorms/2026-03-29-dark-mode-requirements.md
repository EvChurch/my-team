---
date: 2026-03-29
topic: dark-mode
---

# Dark Mode

## Problem Frame

The app currently supports only a light theme. As part of a broader polish and accessibility pass, users should be able to choose a dark color scheme — reducing eye strain in low-light environments and meeting modern UX expectations. Volunteers often use the app on personal devices across varying conditions (Sunday morning projector glare, late-night prep at home), so respecting OS preference and persisting the choice across devices matters.

## Requirements

**Theme Options & Persistence**
- R1. Users can choose between Light, Dark, and System (follow OS) themes
- R2. Theme preference is stored server-side on the user profile and synced to all devices on login
- R3. localStorage caches the preference for instant application on page load (no flash of wrong theme)
- R4. Default for new users is System

**Dark Palette**
- R5. Dark palette is derived from existing light design tokens — invert backgrounds, lighten text, preserve accent hue identity
- R6. All text/background combinations must meet WCAG 2.1 AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- R7. Accent color (#3D8A5A) may be lightened slightly in dark mode for contrast but should remain recognizably "the same green"
- R8. Dark palette values are defined as CSS custom properties under a `.dark` class on `<html>`, switching the existing `:root` tokens

**Settings UI**
- R9. Theme picker lives in Settings > Appearance, matching the existing spec layout
- R10. Picker shows three options (Light / Dark / System) as a segmented control or radio group
- R11. Switching theme applies immediately without page reload

**No-Flash Loading**
- R12. A blocking inline script in `<head>` reads localStorage and applies the `.dark` class before first paint to prevent flash of incorrect theme

## Success Criteria

- Switching between Light, Dark, and System works without page reload and persists across sessions and devices
- No visible flash of wrong theme on page load
- All screens remain legible and visually coherent in dark mode — no hard-coded colors bypassing the token system
- Dark mode contrast ratios pass WCAG AA

## Scope Boundaries

- No dark variants of the Figma/design exports — dark palette is derived programmatically
- No quick-toggle icon in nav — Settings only
- No per-page or per-component theme overrides
- No high-contrast or custom theme support (just Light/Dark/System)

## Key Decisions

- **Three-way toggle (Light/Dark/System)**: Industry standard, respects user autonomy and OS preference
- **Server + local persistence**: Syncs across devices while avoiding flash via localStorage cache
- **Derived palette**: No custom dark design file; derive from existing tokens to keep maintenance low
- **`.dark` class on `<html>`**: Works with Tailwind v4's CSS custom properties and avoids media-query-only approaches that can't support manual override

## Outstanding Questions

### Deferred to Planning
- [Affects R5][Needs research] Exact dark palette hex values — should be derived during implementation with contrast checking
- [Affects R2][Technical] Schema change for user theme preference — new column on User or a UserPreferences model
- [Affects R12][Technical] Best approach for the blocking `<head>` script in Next.js App Router (inline script in layout vs next/script)
- [Affects R8][Technical] Audit existing components for hard-coded colors that bypass CSS custom properties

## Next Steps

→ `/ce:plan` for structured implementation planning
