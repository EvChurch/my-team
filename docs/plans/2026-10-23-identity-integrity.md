# Authoritative person identities

My Team uses the association created by Auth0's Rock post-login hook: the exact `AUTH0_` subject username, a confirmed login using Rock's Auth0 authentication provider, and an active, living Rock person. Each authenticated request verifies that chain. A missing or ambiguous Rock association blocks pages and protected APIs. PCO is optional.

## Background sync

Names, email addresses and phone numbers never establish identity. Contact normalization is only directory formatting. A new `(provider, remoteId)` initially receives its own directory identity. After each provider sync, reconciliation uses the existing Rock plugin links to join or separate sources and their synced references.

The 9Embers plugin stores `IdentifierMap` records grouped by `AbstractIdentifierId`. `TranslatorId=RockRMS` uses a **PersonAlias.Id**, not a Person.Id. Resolve each alias to its current PersonId before checking uniqueness. The configured PCO translator uses a PCO person ID. Multiple historical aliases of the same Rock person are acceptable. Conflicting Rock/PCO targets, missing aliases, and absent links leave PCO identities separate; no contacts provide a fallback.

Read these entities using the authenticated `/api/Lava/RenderTemplate` endpoint and its enabled entity commands. SQL commands and additional OAuth applications are unnecessary. Maps are paginated in strictly increasing ID order with validated payloads and bounded page counts. Alias reads are validated and batched within Rock's filter limits. Failed reads abort reconciliation without replacing existing links with an empty result.

The worker requires `ROCK_PCO_ACCOUNT_ID` and `PCO_ORGANIZATION_ID` alongside its existing credentials when Rock is enabled. Verify and pin these non-secret IDs against the plugin account and the PCO PAT organization. Every reconciliation rechecks the account exists and the PAT organization still matches. Group PCOMarker attributes are independently restricted to `Rock.Model.Group`; they cannot collide with numeric person IDs.

## Automatic repair and ownership

Assignment, Leader and Schedule records retain `personRemoteId`, identifying their original upstream owner independently of the canonical Person. Existing rows receive this provenance from fresh upstream snapshots during ordinary sync. Reconciliation waits if a person being split or merged still has unresolved references. Normal provider pruning removes rows no longer present upstream; the repair never invents their owner.

The complete Rock and PCO syncs share a dedicated PostgreSQL session advisory lock (`724193822`), including all reference writes and reconciliation. The atomic reconciliation transaction also takes the same person-link lock as request-time account linking (`724193821`) and uses serializable isolation. Splits/merges update source links, synced memberships and schedules together. Membership moves avoid transient uniqueness collisions; duplicate synced memberships are collapsed only within the same provider and proven destination. Schedules retain their IDs and PlanTime rows.

Existing app-native content and account ownership stay on their Person IDs. A person with only one authoritative partition retains that ownership. Splitting a person with native content requires verified account-to-Rock evidence; conflicting native owners abort rather than guessing. Unowned directory IDs may be reused deterministically, without inspecting display names. Empty former directory identities are archived, not deleted. Removing a plugin mapping separates PCO again while retaining a verified Rock login's Person ID.

Before a production repair, save a private PostgreSQL backup and rehearse the full sync and reconciliation on an isolated restored database. Deploy the additive provenance migration before starting the updated worker. Let both provider snapshots backfill provenance, then reconcile and sync again to restore memberships previously suppressed by canonical uniqueness. Verify zero pending references, source grouping against the plugin, exact reference ownership, unchanged account/native ownership, and idempotence on the final pass.

## Diagnostics and validation

`pnpm --filter worker exec tsx src/identity-repair-plan.ts /absolute/private/path/identity-plan.json` writes a read-only diagnostic report, exclusively creating a mode-0600 file. The planner partitions sources using the plugin map rather than contacts. It does not apply changes; the ordinary sync performs the guarded reconciliation, including merges across previous directory IDs. Keep reports and backups outside Git.

Regression tests cover exact Rock login access, optional PCO, shared contacts, concurrent source creation, alias resolution and conflicts, account scoping, link removal, native ownership protection, provenance backfill, atomic source/reference repair, and repeated reconciliation. Integration tests require matching `DATABASE_URL` and `IDENTITY_TEST_DATABASE_URL` values naming a disposable database ending `_test`.
