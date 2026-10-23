# Source identity integrity and account recovery

Distinct upstream person IDs must not collapse because relatives share contact details. Previously the sync looked for a canonical Person by email or phone even when importing another Rock ID. Matching fields could overwrite the first person's directory details and attach another person's memberships. The original source links survive, so a source-based repair can be planned.

## Implemented behavior

- An established `(provider, remoteId)` always retains its canonical Person.
- New IDs never join another source from the same provider. New cross-provider links require compatible given/family names plus a real email or normalized phone match, with no conflicting known phones and exactly one candidate.
- New cross-provider links exclude already conflated source groups. Missing or placeholder contact information cannot prove identity. Unmatched PCO people get their own record instead of being dropped.
- Person creation and source linking happen in one transaction, serialized across workers with PostgreSQL advisory lock `724193821`.
- Existing AuthAccount links remain authoritative. New email-based login links require an Auth0-verified email, exactly one active canonical person, and an unambiguous active source group. Inactive source aliases cannot establish a new link. Concurrent account creation preserves the winner.
- Signed-in users without a person link see `/connect-account`. A PCO identity-only connection proves the organization and source person ID. Recovery refuses inactive or conflated source groups and never changes an existing account's owner.

The recovery flow uses `openid-client` with authorization code flow, PKCE, state, nonce and ID-token validation. Short-lived flow data is encrypted with Auth.js, bound to the current Auth0 subject, stored in an HTTP-only cookie, and cleared on callback. UserInfo's subject must match the ID token. The organization must match the server's PAT organization. PCO tokens stay in memory for this request and are never logged or saved.

## One-time developer configuration

Locate the former Planning Center OAuth application, or create an OAuth application in the church's Planning Center developer account. The existing `PCO_API_ID` / `PCO_API_SECRET` values are a personal access token and cannot substitute for OAuth credentials.

Set these **web-service** variables privately in Railway:

- `PCO_OAUTH_CLIENT_ID`
- `PCO_OAUTH_CLIENT_SECRET`
- `APP_BASE_URL` (the existing public origin)

Register `${APP_BASE_URL}/api/account-link/pco/callback` as the OAuth redirect URI. For local development the callback is `http://localhost:7500/api/account-link/pco/callback`. Only the `openid` scope is requested; volunteers do not need People administration permissions. Do not paste credentials into chat or commit them. Retain the PAT variables for the independent data sync and organization check.

Until configured, the connection page displays an unavailable message. Do not deploy the stricter first-login behavior as a finished recovery solution before testing a real OAuth connection. The external end-to-end flow cannot be confirmed without this application. There is no recurring church-admin matching queue or management UI.

References: [Planning Center authentication](https://api.planningcenteronline.com/docs/overview/authentication), [Planning Center identity-only access announcement](https://www.planningcenter.com/changelog/integrations-api/new-openid-connect-for-privacy-conscious-authentication), [openid-client OIDC example](https://github.com/panva/openid-client/blob/main/examples/oidc.ts).

## Read-only repair proposal

Run with the intended database in `DATABASE_URL`:

```bash
pnpm --filter worker exec tsx src/identity-repair-plan.ts /absolute/private/path/identity-plan.json
```

This command opens a repeatable-read, read-only transaction. It creates a new mode-0600 report file exclusively, refuses existing paths, and prints only aggregate counts. It has no apply mode. Reports include personal information and must stay outside Git.

The reviewed production scan on 23 October 2026 proposed:

| Result | Count |
| --- | ---: |
| Canonical profiles with conflicting active source identities | 84 |
| New person records proposed, including inactive historical source partitions | 199 |
| Groups with app-native ownership or account links requiring evidence | 0 |
| Existing synced assignments, leaders and schedules requiring upstream resolution | 741 |

The earlier different-name Rock audit identified 65 profiles. This stricter report also includes same-name distinct IDs and conflicting cross-provider identities. A single source without a surname is not a collision. Counts can change as background sync runs.

Each Rock source ID receives its own partition. PCO sources join a partition only on unique corroborating evidence; ambiguous PCO records get independent partitions. The original Person ID is retained only when exactly one partition matches its current full name. Otherwise the original record must remain available for historical ownership, and every source partition gets a new Person.

A repair application is still required. Before applying it:

1. Resolve every listed Assignment, Leader and Schedule remote ID to the original upstream person ID from fresh Rock/PCO reads. These rows do not retain that source person ID locally; current display names and contact details cannot reconstruct ownership safely.
2. Review missing upstream references explicitly. Do not silently delete or assign them to the retained partition. Re-run the native-ownership and account checks immediately before mutation.
3. Take a database backup, pause sync for the repair, verify the reviewed source/reference snapshot, and use the same advisory lock while applying an atomic source/reference move. Abort if the snapshot or native ownership changed.
4. Re-sync to rebuild memberships previously suppressed by canonical uniqueness constraints. Verify each source/reference mapping, source counts, existing login links and shared-email sign-in recovery before resuming normal sync.

No production records were changed by the report. The sync safeguards prevent new conflation; they intentionally preserve established links until the repair is applied.

## Validation

Regression coverage includes shared emails, identical names with distinct Rock IDs, placeholder contacts, international NZ phones, conflicting phone/middle-name evidence, stable source links, concurrent imports, PCO-only people, recovery ownership, inactive/conflated sources, single-name people, cookie expiry/tampering, session switching, OIDC validation inputs, cross-church rejection, and repair planning without writes.

CI provisions disposable PostgreSQL 18 and runs the integration tests with matching `DATABASE_URL` / `IDENTITY_TEST_DATABASE_URL` values. The integration suite additionally requires a database name ending `_test`; it deletes fixture people only in that designated database. Turbo passes both variables through and does not cache database tests.
