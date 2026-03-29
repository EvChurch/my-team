---
title: "feat: Add internationalization with 10 locales"
type: feat
status: completed
date: 2026-03-29
origin: docs/brainstorms/2026-03-29-i18n-localization-requirements.md
---

# feat: Add internationalization with 10 locales

## Overview

Add i18n support to the entire UI using next-intl with cookie-based locale detection (no URL prefixes). Support 10 locales with AI-generated translations. Users select language on the Profile page; unauthenticated visitors get locale from Accept-Language header.

## Problem Frame

My Team serves NZ church volunteer communities where Mandarin, Cantonese, Te Reo Māori, Samoan, Hindi, Korean, Tongan, Tagalog, and Japanese are widely spoken. The entire UI is hardcoded English. (see origin: docs/brainstorms/2026-03-29-i18n-localization-requirements.md)

## Requirements Trace

- R1. 10 locales: en, zh-CN, zh-TW, mi, sm, hi, ko, to, tl, ja
- R2. All UI chrome translatable (nav, buttons, labels, headings, empty states, errors, toasts)
- R3. User-generated content stays in original language
- R4. Language picker on Profile page
- R5. Locale persisted in UserPreference model
- R6. Fallback chain: user preference > Accept-Language > English
- R7. Server-side detection — no flash of English
- R8. Language change takes effect immediately
- R9. AI-generated initial translations
- R10. One human-readable JSON file per locale

## Scope Boundaries

- User-generated content is NOT translated (see origin)
- No RTL layout support needed
- No locale-specific date/number formatting this pass
- No URL-based locale routing (e.g., /en/teams)
- Font strategy: accept system font fallback for non-Latin scripts (CJK, Devanagari). Outfit stays as the Latin font. Noto Sans can be added later if visual consistency becomes a priority — it's a large bundle cost for an MVP.

## Context & Research

### Relevant Code and Patterns

- **Theme preference flow**: `UserPreference` model → `preferences.getTheme`/`setTheme` tRPC procedures → `ThemeProvider` client context → localStorage + DB sync. The locale preference will follow the same model + tRPC pattern, but use a cookie instead of localStorage (server needs to read it).
- **Timezone cookie pattern**: `TimezoneProvider` sets `tz` cookie client-side, app layout reads it server-side via `(await cookies()).get("tz")`. Locale cookie will mirror this exact pattern.
- **Root layout** (`apps/web/src/app/layout.tsx`): Hardcodes `<html lang="en">`, loads Outfit font. Must become dynamic.
- **Providers wrapper** (`apps/web/src/app/providers.tsx`): `TRPCReactProvider > ThemeProvider > ToastProvider`. NextIntlClientProvider wraps at root layout level (above this), not inside it.
- **Nav items** (`components/layout/nav-items.ts`): Static array with hardcoded labels. Will change to translation keys resolved at render time.
- **~30 files** with hardcoded English strings across pages, content components, shared components, forms, and toast messages.

### External References

- next-intl 4.x: Purpose-built for Next.js App Router, native server component support via `useTranslations`/`getTranslations`, ~2KB client bundle, supports cookie-based locale without URL routing
- next-intl "no routing" approach: Skip middleware routing entirely; provide locale via `getRequestConfig` reading from a cookie. Existing route structure stays unchanged — no `[locale]` segment needed.
- `NextIntlClientProvider` in root layout passes messages to all client components
- `createNextIntlPlugin` wraps next.config.ts

## Key Technical Decisions

- **Library: next-intl 4.x** — Only mature i18n library with native App Router + server component support. react-intl requires manual wiring; next-i18next doesn't support App Router at all. (see origin: Deferred to Planning Q1)

- **No URL routing, cookie-based locale** — Use next-intl's "no routing" approach (Approach A). Locale is read from a `locale` cookie in `getRequestConfig`. No middleware routing, no `[locale]` folder segment, existing route structure unchanged. A lightweight middleware is added only for Accept-Language detection on first visit when no cookie exists. (see origin: Deferred to Planning Q2)

- **Middleware for Accept-Language only** — Middleware checks: if `locale` cookie exists, pass through. If not, parse Accept-Language, set the cookie, and continue. This covers R6 (fallback chain) and R7 (no flash of English). Middleware does NOT do locale routing — it only sets the cookie. (see origin: Deferred to Planning Q2)

- **JSON translation files** — One `messages/{locale}.json` per locale. Namespaced by component/page area (e.g., `Navigation`, `Profile`, `Goals`, `Common`). Human-readable, easy for community contributors to edit. (see origin: Deferred to Planning Q4)

- **String extraction strategy** — Manual extraction during implementation. The ~30 files are enumerable and each is small. Extract English strings into `messages/en.json` with namespaced keys, then replace hardcoded strings with `t()` calls. (see origin: Deferred to Planning Q3)

- **Login page localized** — The login page has only 3 strings. Middleware sets the locale cookie from Accept-Language before the login page renders, so it gets the correct locale. Login page uses `getTranslations` directly as a server component.

- **Accept-Language: `zh` (no region) maps to `zh-CN`** — More common variant in NZ's Chinese community.

- **Error boundaries: English fallback** — Error boundaries attempt translated strings first, fall back to hardcoded English if the i18n system itself has failed.

- **Font strategy: system fallback for non-Latin** — Outfit remains the Latin font. CJK, Devanagari, Korean text renders in system fonts. This avoids large font bundles. Can revisit with Noto Sans later.

## Open Questions

### Resolved During Planning

- **Which i18n library?** → next-intl 4.x (see Key Technical Decisions)
- **Middleware vs layout detection?** → Lightweight middleware for Accept-Language cookie-setting only; locale resolution happens in `getRequestConfig` from cookie
- **Translation file format?** → JSON, namespaced, one file per locale
- **String extraction strategy?** → Manual extraction during implementation, ~30 files
- **Login page in scope?** → Yes, 3 strings, uses Accept-Language via middleware-set cookie
- **`zh` without region?** → Maps to `zh-CN`

### Deferred to Implementation

- **Exact namespace structure** — Will be determined as strings are extracted; start with obvious groupings (Navigation, Common, Profile, Goals, Teams, Guides, Feedback, Auth) and adjust
- **AI translation quality** — Generate translations after English file is complete; review during implementation
- **`router.refresh()` behavior for layout re-render** — Need to verify that sidebar/shell re-renders correctly when locale cookie changes; may need `revalidatePath` or similar

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Request Flow:
  Browser Request
    → Middleware (if no locale cookie: parse Accept-Language → set locale cookie)
    → Root Layout (read locale from cookie via getRequestConfig)
        → <html lang={locale}>
        → NextIntlClientProvider messages={messages}
          → (app) Layout / (auth) Layout
            → Server Components: useTranslations('Namespace')
            → Client Components: useTranslations('Namespace')

Locale Change Flow (Profile):
  User selects language
    → Set locale cookie (document.cookie)
    → tRPC preferences.setLocale mutation (DB persist)
    → router.refresh() (re-runs server components with new cookie value)
    → All components re-render with new translations

Fallback Chain:
  1. locale cookie (set from DB pref on login, or from Accept-Language on first visit)
  2. Accept-Language header (middleware parses on first visit, sets cookie)
  3. 'en' default
```

## Implementation Units

- [ ] **Unit 1: Install next-intl and configure request handler**

  **Goal:** Set up next-intl infrastructure — plugin, request config, English message file

  **Requirements:** R1, R10

  **Dependencies:** None

  **Files:**
  - Create: `apps/web/src/i18n/request.ts`
  - Create: `apps/web/src/i18n/config.ts` (supported locales list, default locale)
  - Create: `apps/web/messages/en.json` (initial structure with namespace stubs)
  - Modify: `apps/web/next.config.ts` (wrap with `createNextIntlPlugin`)
  - Modify: `apps/web/package.json` (add next-intl dependency)

  **Approach:**
  - `config.ts` exports `locales` array and `defaultLocale`
  - `request.ts` uses `getRequestConfig` to read locale from cookie (falling back to `en`), then dynamically imports `messages/{locale}.json`
  - English message file starts with namespace stubs that will be filled in Unit 4
  - `createNextIntlPlugin('./src/i18n/request.ts')` wraps the existing next config

  **Patterns to follow:**
  - `apps/web/next.config.ts` existing config structure

  **Test scenarios:**
  - Happy path: App builds and starts successfully with next-intl plugin configured
  - Happy path: `getRequestConfig` returns English locale and messages when no cookie is set
  - Edge case: `getRequestConfig` returns default `en` for an unrecognized locale cookie value

  **Verification:**
  - `pnpm build` succeeds
  - Dev server starts without errors

- [ ] **Unit 2: Add middleware for Accept-Language detection**

  **Goal:** Create Next.js middleware that sets a `locale` cookie from Accept-Language on first visit

  **Requirements:** R6, R7

  **Dependencies:** Unit 1 (locale config)

  **Files:**
  - Create: `apps/web/src/middleware.ts`
  - Modify: `apps/web/src/i18n/config.ts` (add Accept-Language parsing helper)

  **Approach:**
  - Middleware checks if `locale` cookie exists. If yes, pass through (NextResponse.next())
  - If no cookie: parse `Accept-Language` header, match against supported locales list, set `locale` cookie on the response
  - `zh` without region maps to `zh-CN`
  - Matcher excludes `api`, `_next`, static files
  - Keep middleware minimal — it does NOT do routing or rewrites

  **Patterns to follow:**
  - Existing `tz` cookie pattern in `TimezoneProvider`

  **Test scenarios:**
  - Happy path: First visit with `Accept-Language: zh-CN` sets `locale=zh-CN` cookie
  - Happy path: Request with existing `locale` cookie passes through unchanged
  - Edge case: `Accept-Language: zh` (no region) resolves to `zh-CN`
  - Edge case: `Accept-Language: fil` does not match `tl` (strict matching)
  - Edge case: `Accept-Language: fr-FR` (unsupported) falls back to `en`
  - Edge case: Complex header `zh-CN,zh;q=0.9,en;q=0.8` selects `zh-CN`
  - Edge case: No `Accept-Language` header → defaults to `en`

  **Verification:**
  - First visit in a browser with Chinese language setting shows locale cookie set to `zh-CN`
  - Subsequent requests do not re-parse Accept-Language

- [ ] **Unit 3: Add NextIntlClientProvider to root layout and dynamic lang attribute**

  **Goal:** Wire up the i18n provider so both server and client components can access translations

  **Requirements:** R7

  **Dependencies:** Unit 1 (request config, messages)

  **Files:**
  - Modify: `apps/web/src/app/layout.tsx` (add NextIntlClientProvider, dynamic `lang` attr)

  **Approach:**
  - Root layout becomes async: reads locale via `getLocale()` and messages via `getMessages()` from `next-intl/server`
  - Set `<html lang={locale}>` dynamically
  - Wrap `{children}` in `<NextIntlClientProvider messages={messages}>`
  - This provider sits at the root layout level (above the `Providers` component in app layout), giving all server and client components access to translations
  - Outfit font stays as-is; non-Latin scripts fall back to system fonts

  **Patterns to follow:**
  - Current root layout structure
  - next-intl documentation for App Router root layout setup

  **Test scenarios:**
  - Happy path: `<html lang="ko">` renders when locale cookie is `ko`
  - Happy path: Client components can call `useTranslations()` without error
  - Happy path: Server components can call `useTranslations()` without error
  - Edge case: No locale cookie → renders with `lang="en"`

  **Verification:**
  - Inspect `<html>` element — `lang` attribute matches the cookie value
  - No hydration errors in console

- [ ] **Unit 4: Extract all English strings into message file**

  **Goal:** Move all hardcoded English UI strings into `messages/en.json` with namespaced keys, and replace them with `t()` calls

  **Requirements:** R2

  **Dependencies:** Unit 3 (provider wired up)

  **Files:**
  - Modify: `apps/web/messages/en.json` (populate all namespaces)
  - Modify: ~30 component/page files (replace hardcoded strings with `useTranslations` / `getTranslations` calls)

  Key files to modify (grouped by namespace):
  - **Auth**: `apps/web/src/app/(auth)/login/page.tsx`
  - **Navigation**: `apps/web/src/components/layout/nav-items.ts`, `sidebar.tsx`, `mobile-tab-bar.tsx`
  - **Profile**: `apps/web/src/app/(app)/profile/profile-content.tsx`, `page.tsx`
  - **Teams**: `apps/web/src/app/(app)/teams/page.tsx`, `teams-list-content.tsx`, `team-view-content.tsx`, `team-card.tsx`, `leader-bar.tsx`
  - **Goals**: `apps/web/src/app/(app)/goals/goals-content.tsx`, `goal-card.tsx`, `new-goal-form.tsx`, `goal-approval-card.tsx`
  - **Feedback**: `apps/web/src/app/(app)/goals/goals-content.tsx` (feedback tab), `feedback-card.tsx`, `feedback-form.tsx`, `feedback-new-content.tsx`
  - **Guides**: `apps/web/src/app/(app)/guides/page.tsx`, `guide-detail-content.tsx`, `guide-edit-content.tsx`, `guide-card.tsx`
  - **Common**: `error-state.tsx`, toast messages across components
  - **Metadata**: `apps/web/src/app/layout.tsx` (title, description)

  **Approach:**
  - Server Components (page.tsx files): Use `getTranslations('Namespace')` (async) or `useTranslations('Namespace')` (sync)
  - Client Components (*-content.tsx, forms, cards): Use `useTranslations('Namespace')`
  - Nav items: Change `nav-items.ts` to export translation keys instead of labels (e.g., `labelKey: "myTeams"`), resolve with `t()` at render time in Sidebar and MobileTabBar
  - Toast messages: Use `t()` in the mutation callbacks (client components already have access via NextIntlClientProvider)
  - Use ICU MessageFormat for plurals where needed (e.g., `{count, plural, one {# member} other {# members}}`)
  - Error boundaries: Wrap translation in try/catch, fall back to English strings

  **Test scenarios:**
  - Happy path: Every visible string on Teams page renders from translation keys (no hardcoded English in JSX)
  - Happy path: Toast messages after goal creation render translated text
  - Happy path: Nav labels in sidebar and mobile tab bar render translated text
  - Happy path: Login page renders translated strings
  - Edge case: Error boundary renders English fallback when i18n context is unavailable
  - Edge case: Plural forms render correctly (e.g., "1 member" vs "3 members")
  - Integration: Navigation between pages preserves locale and all strings are translated

  **Verification:**
  - Grep for remaining hardcoded English strings in component files — none should remain (except error boundary fallbacks)
  - All pages render correctly with `en` locale

- [ ] **Unit 5: Add locale field to UserPreference and tRPC procedures**

  **Goal:** Persist locale preference in the database alongside theme

  **Requirements:** R4, R5

  **Dependencies:** Unit 1 (locale config for enum values)

  **Files:**
  - Modify: `packages/api/prisma/schema.prisma` (add `locale` field to UserPreference)
  - Modify: `packages/api/src/routers/preferences.ts` (add `getLocale`/`setLocale` procedures)
  - Create: migration file (via `prisma migrate dev`)

  **Approach:**
  - Add `locale String? @default("en")` to `UserPreference` — use a nullable String rather than an enum, since locale codes are standardized and adding new ones shouldn't require a migration
  - Add `getLocale` query: returns `pref?.locale ?? "en"`
  - Add `setLocale` mutation: validates input against supported locales list from config, upserts
  - Mirror the existing `getTheme`/`setTheme` pattern exactly

  **Patterns to follow:**
  - `packages/api/src/routers/preferences.ts` existing `getTheme`/`setTheme` structure

  **Test scenarios:**
  - Happy path: `setLocale({ locale: "ko" })` persists and `getLocale` returns `"ko"`
  - Happy path: New user with no preference → `getLocale` returns `"en"`
  - Error path: `setLocale({ locale: "fr" })` (unsupported) is rejected by validation
  - Happy path: Upsert works — setting locale for user who already has a theme preference

  **Verification:**
  - Migration runs cleanly
  - tRPC procedures work in dev

- [ ] **Unit 6: Add language picker to Profile page**

  **Goal:** Add a language selector on the Profile page that persists to DB and updates the UI immediately

  **Requirements:** R4, R5, R8

  **Dependencies:** Unit 4 (translated strings), Unit 5 (tRPC procedures)

  **Files:**
  - Modify: `apps/web/src/app/(app)/profile/profile-content.tsx`

  **Approach:**
  - Add a "Language" row below the existing "Appearance" row, same visual style
  - Use a dropdown/select (not a segment control — too many options for segments) showing language names in their native script (e.g., "中文(简体)", "Te Reo Māori", "한국어")
  - On change: set `locale` cookie via `document.cookie`, call `preferences.setLocale` mutation, then `router.refresh()` to re-render all server components with new locale
  - The language picker labels themselves should be in native script (not translated) so users can always find their language regardless of current locale

  **Patterns to follow:**
  - Existing theme `SegmentControl` pattern in the same file for layout/spacing
  - `TimezoneProvider` cookie-setting pattern for the cookie write

  **Test scenarios:**
  - Happy path: Selecting "한국어" sets cookie to `ko`, persists to DB, and page re-renders in Korean
  - Happy path: Language picker shows current locale as selected
  - Happy path: After `router.refresh()`, sidebar and page headings show translated text
  - Edge case: Network failure on tRPC mutation — cookie is still set, so UI updates; DB sync can retry
  - Integration: After changing language, navigating to other pages shows the new locale

  **Verification:**
  - Change language on Profile → all visible text updates without full page reload
  - Refresh the page → language persists (cookie + DB)

- [ ] **Unit 7: Set locale cookie on login from DB preference**

  **Goal:** When a user logs in, set the locale cookie from their saved DB preference so middleware doesn't override it with Accept-Language

  **Requirements:** R6

  **Dependencies:** Unit 5 (locale in DB)

  **Files:**
  - Modify: `apps/web/src/app/(app)/layout.tsx` (read DB preference and set cookie if needed)
  - OR Modify: Auth.js session callback to set locale cookie on sign-in

  **Approach:**
  - The app layout already runs on every authenticated request and reads the session. After fetching person data, also fetch their locale preference. If the `locale` cookie doesn't match the DB value, update it via `cookies().set()` (server action or response header).
  - Alternative: Use the Auth.js `signIn` event or JWT callback to set the cookie. This is more efficient (runs once at login) but Auth.js callbacks have limited cookie access. Prefer the layout approach for simplicity — it's already fetching user data.
  - First login (new user, no DB preference): locale cookie stays as whatever middleware set from Accept-Language. This is correct behavior per R6.

  **Patterns to follow:**
  - App layout's existing pattern of reading `tz` cookie and session data

  **Test scenarios:**
  - Happy path: User with saved locale `hi` logs in → locale cookie is set to `hi` → app renders in Hindi
  - Happy path: User with no saved locale logs in → existing Accept-Language cookie is preserved
  - Edge case: Cookie says `en` but DB says `ko` → cookie is updated to `ko` on next page load
  - Integration: Full flow — first visit (Accept-Language sets `zh-CN` cookie) → login → DB has `hi` saved → cookie updates to `hi` → renders Hindi

  **Verification:**
  - Log in as user with saved locale preference → verify cookie matches DB value

- [ ] **Unit 8: Generate AI translations for all non-English locales**

  **Goal:** Create translation files for all 9 non-English locales with AI-generated content

  **Requirements:** R1, R9, R10

  **Dependencies:** Unit 4 (complete `en.json` with all strings)

  **Files:**
  - Create: `apps/web/messages/zh-CN.json`
  - Create: `apps/web/messages/zh-TW.json`
  - Create: `apps/web/messages/mi.json`
  - Create: `apps/web/messages/sm.json`
  - Create: `apps/web/messages/hi.json`
  - Create: `apps/web/messages/ko.json`
  - Create: `apps/web/messages/to.json`
  - Create: `apps/web/messages/tl.json`
  - Create: `apps/web/messages/ja.json`

  **Approach:**
  - Use the complete `en.json` as the source. For each target locale, translate all values while preserving JSON structure, keys, and ICU MessageFormat syntax (placeholders like `{name}`, plural rules)
  - Te Reo Māori: Preserve macrons (ā, ē, ī, ō, ū) — ensure UTF-8 encoding
  - Tongan: Preserve fakauʻa (glottal stop) character
  - zh-CN and zh-TW must be genuinely different translations, not just script conversion
  - Keep the app name "My Team" untranslated (proper noun) or provide a localized equivalent per locale

  **Test scenarios:**
  - Happy path: Each JSON file is valid JSON with identical key structure to `en.json`
  - Happy path: ICU plural/select syntax is preserved correctly in all locales
  - Happy path: Switching to each locale renders the app without missing translation warnings
  - Edge case: Special characters (macrons, CJK, Devanagari) render correctly

  **Verification:**
  - Validate all JSON files parse without errors
  - Switch to each locale in the app — no missing translation keys in console
  - Spot-check a few strings per locale for reasonable quality

## System-Wide Impact

- **Interaction graph:** Middleware (new) runs before all routes. NextIntlClientProvider wraps the entire app at root layout level. Every component that renders text is affected.
- **Error propagation:** If translation files fail to load, `getRequestConfig` should fall back to English. Error boundaries use hardcoded English as last resort.
- **State lifecycle risks:** Cookie and DB can get out of sync if mutation fails — acceptable since cookie is the source of truth for rendering and DB is for persistence across devices.
- **API surface parity:** tRPC API gets two new procedures (`getLocale`, `setLocale`). No other API surfaces affected.
- **Integration coverage:** Full flow test: first visit → Accept-Language detection → login → DB preference override → language change → page navigation
- **Unchanged invariants:** All existing tRPC routes, auth flow, PCO sync, and data models remain unchanged. Theme preference continues to work independently.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| next-intl 4.x compatibility with Next.js 16.2 | next-intl tracks Next.js releases closely; verify during Unit 1 install |
| `router.refresh()` may not re-render layouts (sidebar, tab bar) | Test during Unit 6; fallback is `window.location.reload()` — slightly worse UX but functionally correct |
| AI translation quality for Te Reo Māori and Tongan | Ship as best-effort; translation files are human-readable JSON for community review |
| Non-Latin font rendering inconsistency | Accept system font fallback for MVP; Noto Sans integration can be a follow-up |
| Large message bundle sent to client via NextIntlClientProvider | next-intl supports namespace-scoped message passing to reduce bundle; optimize if needed |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-29-i18n-localization-requirements.md](docs/brainstorms/2026-03-29-i18n-localization-requirements.md)
- next-intl docs: https://next-intl.dev/
- next-intl "no routing" approach: https://next-intl.dev/docs/usage/configuration
- Existing theme preference pattern: `packages/api/src/routers/preferences.ts`
- Existing timezone cookie pattern: `apps/web/src/lib/timezone.tsx`
