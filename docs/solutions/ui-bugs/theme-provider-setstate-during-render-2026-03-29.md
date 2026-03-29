---
title: "Theme provider setState during render — render-time reconciliation with guards"
date: 2026-03-29
category: ui-bugs
module: Theme System
problem_type: ui_bug
component: hotwire_turbo
symptoms:
  - "Theme flash on new device — page renders with default theme before useEffect fires to apply server preference"
  - "React warning about setState during render when reconciliation logic runs at render time without proper guards"
root_cause: async_timing
resolution_type: code_fix
severity: low
tags: [react, useeffect, setstate, theme, dark-mode, render-reconciliation, flash]
---

# Theme provider setState during render — render-time reconciliation with guards

## Problem

The theme provider used `useEffect` to reconcile the server-stored theme preference with the client. On a new device (no localStorage), the page rendered with the default theme, painted to screen, then the effect fired and applied the correct theme — causing a visible flash of the wrong theme.

## Symptoms

- Flash of incorrect theme (typically light) before the server-preferred theme is applied on first load from a new device
- Potential React warning about calling setState during render if a naive fix is attempted without a bail-out guard

## What Didn't Work

Using `useEffect` for theme reconciliation. `useEffect` runs **after** the browser paints, so there is always at least one frame of the wrong theme visible. This is inherent to the `useEffect` timing model and cannot be fixed by making the effect "faster."

```tsx
// Before: runs after paint → flash
useEffect(() => {
  if (serverTheme) {
    const mapped = serverTheme.toLowerCase() as Theme;
    const localTheme = localStorage.getItem("theme") as Theme | null;
    if (!localTheme) {
      setThemeState(mapped);
      localStorage.setItem("theme", mapped);
      applyTheme(mapped);
    }
  }
}, [serverTheme]);
```

## Solution

Moved reconciliation to the render body with two critical guards:

```tsx
// After: runs during render → before paint, no flash
if (serverTheme) {
  const mapped = serverTheme.toLowerCase() as Theme;
  const localTheme =
    typeof window !== "undefined"
      ? localStorage.getItem("theme")
      : null;
  if (!localTheme && theme !== mapped) {
    setThemeState(mapped);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", mapped);
      applyTheme(mapped);
    }
  }
}
```

Two guards are critical:
1. **`typeof window !== "undefined"`** — SSR safety. `localStorage` doesn't exist on the server.
2. **`theme !== mapped`** — Infinite loop prevention. Without this, every render would call `setThemeState(mapped)`, triggering another render, forever.

## Why This Works

React allows calling `setState` during render if the call is conditional and the condition becomes false after the update. The `theme !== mapped` guard ensures setState fires exactly once — on the next render `theme` equals `mapped`, so no further updates occur. Because this happens before paint, the user never sees the wrong theme.

This is an officially supported React pattern documented under "Storing information from previous renders."

## Prevention

- **Prefer render-time reconciliation over `useEffect`** for "sync on mount" patterns when the goal is avoiding visual flash
- **Always include a bail-out condition** (`currentState !== newState`) when calling setState during render to prevent infinite loops
- **Guard browser APIs with `typeof window !== "undefined"`** in any component that may execute during SSR
- **Consider this pattern for theme/locale/preference hydration** specifically — these are the classic flash-of-wrong-content scenarios

## Related Issues

- None found in existing docs
