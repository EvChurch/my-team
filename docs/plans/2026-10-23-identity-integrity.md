# Source identity integrity and Rock login verification

Distinct upstream person IDs must not collapse because relatives share contact details. Previously the sync looked for a canonical Person by email or phone even when importing another Rock ID. Matching fields could overwrite the first person's directory details and attach another person's memberships. The original source links survive, so a source-based repair can be planned.

## Implemented behavior

- An established `(provider, remoteId)` always retains its canonical Person.
- New IDs never join another source from the same provider. New cross-provider links require compatible given/family names plus a real email or normalized phone match, with no conflicting known phones and exactly one candidate.
- New cross-provider links exclude already conflated source groups. Missing or placeholder contact information cannot prove identity. Unmatched PCO people get their own record instead of being dropped.
- Person creation and source linking happen in one transaction, serialized across workers with PostgreSQL advisory lock `724193821`.
- Every authenticated request verifies the exact `AUTH0_` + Auth0 subject username in Rock UserLogins, restricted to the Auth0 authentication provider and confirmed logins. Exactly one association must exist, pointing to an active, living Rock person.
- Access resolves through the active ROCK SourcePerson for that remote person ID. PCO is optional; matching names, email addresses, or a PCO-only identity cannot substitute for a Rock login association.
- A canonical Person with multiple active Rock sources is blocked. Inactive historical sources do not prevent access. A conflicting existing AuthAccount is blocked rather than reassigned; concurrent first-login creation is also checked.
- Missing Rock associations or synced identities block both page access and protected API calls. `/connect-account` explains the requirement and provides retry/sign-out. An upstream outage displays a temporary verification message and denies access without exposing upstream errors.

## Configuration and verified upstream contract

The web service uses its existing `ROCK_BASE_URL` and `ROCK_API_KEY` to read UserLogins and People. No extra OAuth application or ongoing administrator matching step is required. Requests have an eight-second timeout per upstream read, do not cache results, and reject redirects. Each request checks Rock even when an AuthAccount already exists, so an old local link cannot bypass a removed or inactive Rock association.

Read-only production verification on 23 October 2026 checked all six existing My Team accounts. Each had exactly one confirmed Rock Auth0 login. Four had complete plugin-to-PCO links, verified against active PCO People and Services records; the other two had no plugin PCO mapping and no local PCO source. All existing accounts satisfy the required Rock association.

The plugin's person links live in custom `IdentifierMap` and `AbstractIdentifier` entities, readable with the authenticated Rock Lava entity commands. Its `RockRMS` map uses a **person-alias ID**, which must be resolved to the current PersonId before linking sources. Its PCO map uses the PCO person ID. Group `PCOMarker` attributes are separate and share the PCO account/translator identifier. Do not treat alias IDs as person IDs or infer person links from contacts when using these stored mappings.

This access change does not import or repair plugin person mappings. The sync and repair planner below still use conservative contact-based cross-provider matching; adopting the verified plugin links is follow-up work. No production source/reference repair has been applied.

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
4. Re-sync to rebuild memberships previously suppressed by canonical uniqueness constraints. Verify each source/reference mapping, source counts, existing login links and Rock-based sign-in before resuming normal sync.

No production records were changed by the report. The sync safeguards prevent new conflation; they intentionally preserve established links until the repair is applied.

## Validation

Regression coverage includes required exact Rock login association, optional PCO/email, missing or ambiguous logins, inactive/deceased people, upstream failure, conflicting local account ownership, direct API rejection, shared-contact sync isolation, stable source links, concurrent imports, and repair planning without writes.

CI provisions disposable PostgreSQL 18 and runs the integration tests with matching `DATABASE_URL` / `IDENTITY_TEST_DATABASE_URL` values. The integration suite additionally requires a database name ending `_test`; it deletes fixture people only in that designated database. Turbo passes both variables through and does not cache database tests.
