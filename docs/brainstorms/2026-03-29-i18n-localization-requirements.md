---
date: 2026-03-29
topic: i18n-localization
---

# Internationalization (i18n) & Localization

## Problem Frame

My Team serves church volunteer communities in New Zealand, where Mandarin, Cantonese, Te Reo Māori, Samoan, Hindi, Korean, Tongan, Tagalog, and Japanese are widely spoken alongside English. The entire UI is currently hardcoded in English with no i18n infrastructure. Members who are more comfortable in their native language have no way to use the app in that language.

## Requirements

**Supported Languages**
- R1. Support 10 locales: English (en, default), Simplified Chinese (zh-CN), Traditional Chinese (zh-TW), Te Reo Māori (mi), Samoan (sm), Hindi (hi), Korean (ko), Tongan (to), Tagalog (tl), Japanese (ja)
- R2. All UI chrome (nav, buttons, labels, headings, empty states, error messages) must be translatable across all supported locales
- R3. User-generated content (goals, feedback, guides) remains in its original language — not translated

**Language Selection**
- R4. Users can set their preferred language on the Profile page, alongside the existing Appearance setting
- R5. The language preference is persisted in the UserPreference model
- R6. Locale detection fallback chain: user preference > Accept-Language header > English

**Locale Detection & Routing**
- R7. Locale detection should happen server-side (middleware or layout) so the initial render is in the correct language — no flash of English
- R8. Changing language in Profile takes effect immediately without requiring a full page reload

**Translation Content**
- R9. Initial translations are AI-generated for all non-English locales
- R10. Translation files must be structured so community members can review and correct translations over time (human-readable format, one file per locale)

## Success Criteria

- A user with browser set to zh-CN sees the app in Simplified Chinese on first visit with no account preference set
- A user who sets Hindi in Profile always sees Hindi regardless of browser language
- All visible UI strings are translated — no hardcoded English leaks through
- Switching language in Profile updates the UI immediately

## Scope Boundaries

- User-generated content (goals, feedback, guide body text) is NOT translated
- RTL layout support is not needed (none of the 10 languages are RTL)
- No locale-specific date/number formatting in this pass (dates already use browser-native formatting)
- No URL-based locale routing (e.g., /en/teams, /mi/teams) — locale is a user/session concern, not a URL concern

## Key Decisions

- **No URL-based routing**: Locale is determined by user preference or Accept-Language, not URL path. This keeps routing simple and avoids SEO complexity that doesn't apply to an authenticated app.
- **AI-generated translations as starting point**: Ship with AI translations for all 10 locales. Accuracy is best-effort; community review can improve them over time.
- **One file per locale**: Keeps translations easy to review, edit, and contribute to.

## Dependencies / Assumptions

- The UserPreference model already exists with a `theme` field — adding a `locale` field is straightforward
- Next.js App Router has mature i18n patterns available (next-intl or similar)

## Outstanding Questions

### Resolve Before Planning

(none)

### Deferred to Planning

- [Affects R2][Needs research] Which i18n library best fits Next.js 16 App Router with server components? (next-intl is the likely candidate)
- [Affects R7][Technical] Best approach for middleware-based locale detection — Next.js middleware vs layout-level detection
- [Affects R9][Technical] Strategy for extracting all existing hardcoded strings into translation keys efficiently
- [Affects R10][Technical] Translation file format — JSON vs ICU MessageFormat vs other

## Next Steps

-> `/ce:plan` for structured implementation planning
