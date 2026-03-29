---
title: "Next.js timezone SSR hydration mismatch — cookie-based timezone propagation"
date: 2026-03-29
category: ui-bugs
module: Date Formatting / SSR Hydration
problem_type: ui_bug
component: hotwire_turbo
symptoms:
  - "Date/time values rendered differently on server vs client causing React hydration mismatch warnings"
  - "suppressHydrationWarning props scattered across components to mask timezone differences"
  - "Users in non-UTC timezones saw brief flash of wrong dates before client hydration"
root_cause: async_timing
resolution_type: code_fix
severity: medium
tags: [ssr, hydration, timezone, nextjs, cookie, date-formatting, suppresshydrationwarning]
---

# Next.js timezone SSR hydration mismatch — cookie-based timezone propagation

## Problem

Dates and times displayed incorrectly during SSR because the Next.js server had no knowledge of the user's timezone. The server rendered dates in UTC while the client rendered in the user's browser timezone, causing React hydration mismatch warnings on every date/time element. These were masked with `suppressHydrationWarning` props rather than fixed.

## Symptoms

- React hydration mismatch warnings in the console for every date/time element
- `suppressHydrationWarning` props scattered across 5+ component files
- Users in non-UTC timezones saw a brief flash of incorrect dates on page load (e.g., "Mon, Mar 30" flashing to "Sun, Mar 29" for NZ timezone users)
- Duplicated date formatting logic across components with varying options

## What Didn't Work

- **`suppressHydrationWarning` everywhere**: Silenced React's warnings but didn't fix the underlying problem. Users still saw the flash. The prop had to be added to every new date element, creating maintenance burden.

## Solution

Cookie-based timezone propagation with centralized formatting:

1. **TimezoneProvider** (`apps/web/src/lib/timezone.tsx`): React context that reads the `tz` cookie on the server and `Intl.DateTimeFormat().resolvedOptions().timeZone` on the client. Sets the cookie on mount:

```tsx
useEffect(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  document.cookie = `tz=${tz};path=/;max-age=31536000;SameSite=Lax`;
}, []);
```

2. **Server-side cookie reading** in the app layout:

```tsx
const cookieStore = await cookies();
const serverTimezone = cookieStore.get("tz")?.value ?? "UTC";
// ...
<TimezoneProvider serverTimezone={serverTimezone}>
```

3. **Centralized format-date.ts** (`apps/web/src/lib/format-date.ts`): Four functions (`formatDate`, `formatTime`, `formatTimeRange`, `formatDateTime`) all requiring an explicit `timeZone` parameter.

4. **Component migration**: All affected components use `useTimezone()` and pass to centralized formatters. All `suppressHydrationWarning` props removed.

## Why This Works

- **First visit**: No `tz` cookie → server falls back to `"UTC"`. Client also starts with `"UTC"` from provider, so hydration matches. After mount, cookie is set for future requests.
- **Subsequent visits**: Server reads cookie and renders with correct timezone. Client detects the same timezone. Identical output — no mismatch.
- **Timezone change**: `useEffect` updates the cookie on next visit, self-correcting on the following navigation.

## Prevention

- **Never use `suppressHydrationWarning` for date/time formatting** — fix the root cause by ensuring server and client have the same timezone information
- **Always pass timezone explicitly** to formatting functions rather than relying on implicit runtime locale
- **Centralize date formatting** in a single module to prevent scattered timezone-unaware formatters
- **Use cookies for client-only information the server needs** — timezone, locale, and similar browser-only values that affect rendered output

## Related Issues

- `docs/solutions/integration-issues/nextjs16-turbopack-monorepo-gotchas.md` — covers other hydration gotchas in this stack (different root causes)
