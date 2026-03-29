---
title: next-intl Cookie-Based i18n Without URL Routing
date: 2026-03-29
tags: [next-intl, i18n, next.js, app-router, cookie, middleware]
---

# next-intl Cookie-Based i18n Without URL Routing

## Problem

Adding internationalization to an authenticated Next.js App Router app without URL-based locale routing (no `/en/teams`, `/mi/teams` etc.) — locale should be a user/session concern, not a URL concern.

## Solution

Use next-intl 4.x "no routing" approach with cookie-based locale detection.

### Key Architecture Decisions

1. **No `[locale]` folder segment** — existing route structure stays unchanged
2. **Cookie-based locale** — `getRequestConfig` reads locale from a `locale` cookie
3. **Middleware only sets the cookie** — parses Accept-Language on first visit, does NOT do routing/rewrites
4. **`NextIntlClientProvider` in root layout** — wraps entire app, provides messages to all client components
5. **DB preference synced to cookie** — `LocaleSync` client component in app layout updates cookie from DB on each authenticated page load

### File Structure

```
apps/web/
  src/i18n/config.ts          # Supported locales list + types
  src/i18n/request.ts         # getRequestConfig reads cookie, imports messages
  src/middleware.ts            # Accept-Language → cookie on first visit
  messages/{locale}.json      # One file per locale, namespaced
```

### Translation Pattern

Server components (async):
```tsx
import { getTranslations } from "next-intl/server";
const t = await getTranslations("Namespace");
```

Client components:
```tsx
import { useTranslations } from "next-intl";
const t = useTranslations("Namespace");
```

### Gotchas

- **Curly quotes in JSON**: When generating Chinese translations, AI models often produce `"` `"` (U+201C/201D) which break JSON parsing. Use CJK brackets `「」` or escaped straight quotes instead.
- **TypeScript types**: The `useTranslations` return type is a `Translator<>`, not a plain function. Don't try to pass `t` as a prop with a manual function type — instead call `useTranslations` in each component that needs it.
- **next.config.ts plugin**: Must wrap config with `createNextIntlPlugin('./src/i18n/request.ts')` — this is required for server component support.
- **Root layout must be async**: To call `getLocale()` and `getMessages()` for the provider.
- **Nav items pattern**: Static arrays with labels (like sidebar nav) should export translation keys instead of strings, resolved with `t()` at render time.

## Verification

- `pnpm build` passes with no TypeScript errors
- First visit with Chinese browser → app renders in Simplified Chinese
- Language picker in Profile → immediate UI update via `router.refresh()`
- All 10 locale JSON files valid with identical key structure
