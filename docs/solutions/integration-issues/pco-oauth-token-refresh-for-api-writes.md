---
module: auth
date: 2026-03-28
problem_type: integration_issue
component: authentication
symptoms:
  - "PCO API write operations (accept/decline schedules) needed user-level auth but only app-level PAT was available"
  - "OAuth access tokens stored in JWT expired after ~2 hours, making API calls fail silently for long sessions"
  - "Existing sessions after deploy lacked refresh_token in JWT, causing accept/decline to fail"
root_cause: incomplete_setup
resolution_type: code_fix
severity: medium
related_components:
  - background_job
tags:
  - pco
  - oauth
  - token-refresh
  - auth-js
  - jwt
  - api-writes
  - planning-center
---

# PCO OAuth Token Refresh for API Write Operations

## Problem

The app needed to make PCO API write calls (accept/decline schedule requests) on behalf of individual users, but the auth architecture only stored the OAuth `access_token` in the JWT at login time with no refresh mechanism. Tokens expired after ~2 hours, and the app's server-side Personal Access Token (PAT) was only suitable for read-only sync operations.

## Symptoms

- Accept/decline schedule mutations failed with expired token errors for users who had been logged in for more than ~2 hours
- The `accessToken` field existed in the JWT but was not exposed to the session or tRPC context
- Users who logged in before the change had no `refresh_token` in their JWT at all

## What Didn't Work

- **Using the app's PAT for user actions**: Considered but rejected — PCO's accept/decline endpoints should reflect the individual user's action, not an admin action. Also, some PCO endpoints may enforce per-user auth for schedule responses.

## Solution

Three changes in `packages/auth/src/index.ts`:

1. **Store all OAuth tokens at login**: Store `access_token`, `refresh_token`, and `expires_at` from the OAuth account object in the JWT.

2. **Auto-refresh in the JWT callback**: On each JWT callback invocation (every request), check if the token is within 60 seconds of expiry. If so, call PCO's token endpoint to refresh:

```
POST https://api.planningcenteronline.com/oauth/token
{
  grant_type: "refresh_token",
  refresh_token: token.refreshToken,
  client_id: process.env.AUTH_PLANNING_CENTER_ID,
  client_secret: process.env.AUTH_PLANNING_CENTER_SECRET
}
```

If refresh fails, clear the tokens (user must re-login).

3. **Expose to session and tRPC context**: Pass `token.accessToken` through the session callback to `session.accessToken`, then read it in the tRPC context creation (`packages/api/src/init.ts`) so mutations can access `ctx.accessToken`.

For the tRPC mutation, a lightweight `fetchPCOAsUser(path, accessToken, options?)` helper uses `Bearer` auth (not Basic auth like the sync's PAT).

## Why This Works

Auth.js v5's JWT strategy calls the `jwt` callback on every request, making it the natural place for token rotation. The 60-second buffer before expiry ensures tokens are refreshed proactively rather than failing on the actual API call. PCO's OAuth implementation follows standard OAuth 2.0 refresh token flow.

The separation between PAT-based sync (server-side, org-level) and OAuth-based mutations (user-level) is clean: sync reads use `fetchPCO()` with Basic auth, user actions use `fetchPCOAsUser()` with Bearer auth.

## Prevention

- **When adding API write operations that act on behalf of users, check whether the existing auth tokens are stored and refreshed.** Read-only sync can use app-level tokens, but user-initiated actions typically need user-level tokens.
- **Always store `refresh_token` and `expires_at` from OAuth providers** at login time, even if you don't need them immediately. Adding them later requires all existing users to re-login.
- **Add a 60-second buffer when checking token expiry** to prevent edge cases where the token expires between the check and the API call.
- **Handle missing tokens gracefully**: Users with sessions from before the change won't have `refresh_token`. The mutation should return a clear "please re-login" error rather than a generic 500.

## Related Issues

- [docs/solutions/integration-issues/authjs-v5-pco-oidc-trpc-v11.md](authjs-v5-pco-oidc-trpc-v11.md) — original Auth.js setup, notes that OAuth tokens are not used for API calls (this doc extends that)
- [docs/solutions/integration-issues/pco-schedule-sync-missing-migration-and-incorrect-service-times.md](pco-schedule-sync-missing-migration-and-incorrect-service-times.md) — the schedule sync feature that created the need for user-level PCO API writes
