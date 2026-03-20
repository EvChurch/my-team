---
title: "Tailwind CSS v4 design system with CSS custom properties"
category: ui-bugs
date: 2026-03-20
tags: [tailwind, css, design-system, outfit-font, next-font]
components: [apps/web]
severity: low
---

# Tailwind CSS v4 Design System with CSS Custom Properties

## Problem

Setting up a design system in Tailwind CSS v4 with CSS custom properties as the source of truth for colors, using the Outfit font via next/font/google.

## Key Learnings

### Tailwind v4 uses @theme inline for custom values

```css
@import "tailwindcss";

@theme inline {
  --color-accent: var(--accent);
  --color-accent-dark: var(--accent-dark);
  /* map CSS custom properties to Tailwind color utilities */
}
```

This lets you use `bg-accent`, `text-accent-dark`, etc. in Tailwind classes while the actual values come from CSS custom properties in `:root`.

### next/font/google with Outfit

```typescript
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
});
```

Apply `outfit.variable` to `<html>` className, then reference in CSS:
```css
body { font-family: var(--font-outfit), sans-serif; }
```

### Component patterns that work well with CSS variables

For the card shadow specified in the design (`0 2px 12px rgba(26,25,24,0.03)`), use Tailwind arbitrary values:
```
shadow-[0_2px_12px_rgba(26,25,24,0.03)]
```

For border radius matching the spec (16px cards, 10-12px buttons):
```
rounded-2xl    /* 16px - cards */
rounded-[10px] /* buttons */
rounded-[26px] /* active tab pill */
rounded-[36px] /* tab bar container */
```

### Remove dark mode from create-next-app defaults

The default `globals.css` includes a `@media (prefers-color-scheme: dark)` block. Remove it — the design spec is light-only.

## Prevention

- Define all design tokens as CSS custom properties in `:root` first, then map to Tailwind via `@theme inline`
- Don't use Tailwind's built-in color palette for branded colors — always reference the design tokens
- Strip create-next-app defaults (dark mode, Geist font, demo page) before building the design system
