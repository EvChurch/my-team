---
title: "Flash of all items when toggling expand/collapse in upcoming serving section"
date: 2026-03-29
category: ui-bugs
module: Upcoming Serving UI
problem_type: ui_bug
component: hotwire_turbo
symptoms:
  - "All schedule cards briefly visible before collapsing to 3 on initial render"
  - "Complex height measurement code with refs and getBoundingClientRect"
  - "Animation depended on DOM measurement which required all items to be rendered first"
root_cause: logic_error
resolution_type: code_fix
severity: low
tags: [animation, expand-collapse, react, flash-of-content, simplification]
---

# Flash of all items when toggling expand/collapse in upcoming serving section

## Problem

The "See all / Show less" toggle for upcoming serving schedule cards showed a flash of all items on initial render. The animation approach required rendering all items in the DOM first so their heights could be measured, causing all cards to be briefly visible before the collapse animation kicked in.

## Symptoms

- Brief flash of all schedule cards on page load before collapsing to show only 3
- ~48 lines of height measurement code using `useRef`, `useEffect`, and `getBoundingClientRect`
- Flicker visible on every page load, not just slow connections

## What Didn't Work

1. **Estimated heights** (`collapsedCount * 112px`): Didn't account for variable card heights across breakpoints and content lengths.
2. **Measured DOM heights via getBoundingClientRect** (commit d003dfb): Accurately measured heights but still caused the flash. All items had to be rendered in the DOM before measurement could occur. The `useEffect` that performed measurement ran after paint, so users saw all items for one frame before the `max-height` constraint applied.

## Solution

Eliminated the animation approach entirely. Replaced ~48 lines of height measurement and animation code with a simple conditional slice:

```tsx
const visible = showAll ? schedules : schedules.slice(0, 3);

return (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {visible.map((schedule) => (
      <ScheduleCard key={schedule.id} schedule={schedule} />
    ))}
  </div>
);
```

No refs, no height measurement, no `max-height` animation, no `useEffect`. The toggle simply changes which items are in the render tree.

## Why This Works

By not rendering hidden items at all, there's nothing to flash. The simpler approach trades smooth height animation for correctness — no flash is better than a glitchy animation. The visual transition is instant, which is perfectly acceptable for a list toggle.

The root cause was fundamental: any approach that requires measuring DOM element heights must first render those elements, creating an unavoidable flash-of-content on the initial render cycle.

## Prevention

- **Prefer conditional rendering over CSS-based show/hide for list truncation** — use `array.slice()` or `array.filter()` to control what enters the React tree
- **Watch for the useEffect-measurement anti-pattern**: code that renders content → measures in useEffect → hides it will always produce at least one visible frame
- **If smooth animation is truly needed**, use CSS `grid-template-rows: 0fr` to `1fr` transitions which don't require pre-rendering hidden content at full size
- **Simpler is usually better**: 6 lines replaced 48 lines and eliminated the bug entirely

## Related Issues

- None found in existing docs
