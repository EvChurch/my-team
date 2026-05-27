---
date: 2026-05-25
topic: rock-pco-unified-my-team
---

# My Team — PCO + Rock Unified Sync

## Problem Frame

My Team currently treats Planning Center Online as both the login provider and
the only source of truth for people, teams, roles, and schedules. EV Church needs
My Team to move login to Auth0, then reconcile data from both Planning Center
Online and Rock RMS into one user-facing profile called **My Team profile**,
while still letting people see which facts came from PCO and which came from
Rock.

The app should continue to support PCO schedules and team data, then add Rock
people, groups/teams, group memberships, serving roles, group schedules, and
attendance/schedule-related data where Rock is the source of truth.

## Current Repo Reality

- `packages/api/prisma/schema.prisma` has a single `Provider` enum with only
  `PCO`.
- `Person`, `Team`, `Position`, `Assignment`, `Leader`, `Schedule`, and
  `PlanTime` are provider-tagged source records, but app-native data such as
  goals, feedback, guides, preferences, and auth currently points directly at
  `Person`.
- Auth is PCO OAuth only. tRPC context resolves `ctx.personId` by matching
  `session.user.pcoId` to `Person(remoteId, provider: PCO)`.
- Schedule responses only know how to write back to PCO with the signed-in
  user's PCO bearer token.
- The worker has one `sync-pco` queue that fetches PCO Services teams and future
  plans, then prunes PCO records.
- There are no current production application users, so this feature can make
  breaking auth and schema changes instead of preserving old PCO-login sessions
  or migrating app-native user data.

## Product Requirements

### Auth0 Login

- R1. Auth0 should become the primary login provider for My Team.
- R2. The Auth0 user should resolve to a canonical My Team profile.
- R3. PCO and Rock identities should be linked source identities, not the primary
  app login identity.
- R4. PCO OAuth may still be needed as an optional connected account if My Team
  needs user-scoped PCO writeback, such as accepting or declining schedules.
- R5. Auth0 login should support the church's preferred identity policy, such as
  email/password, social login, enterprise SSO, or passwordless, based on Auth0
  tenant configuration rather than app-specific login logic.

### Unified Identity

- R6. Create a canonical **My Team profile** that can link one or more upstream
  identities from PCO and Rock.
- R7. Keep upstream source records visible. Users should be able to inspect:
  "PCO data for me", "Rock data for me", and the merged profile.
- R8. Reconciliation must be deterministic, auditable, and overridable. Automatic
  matching should never silently collapse ambiguous people.
- R9. The current signed-in user must resolve to a My Team profile, not directly
  to a provider-specific `Person`.

### Provider Sync

- R10. Keep PCO sync working as-is during the migration.
- R11. Add Rock sync as a parallel provider:
  - People
  - Groups or ministry teams
  - Group members / assignments
  - Leaders or role-based leadership
  - Schedules tied to Rock groups
  - Attendance or RSVP/status data if available in the configured Rock model
- R12. Each provider sync should track last successful run, failures, counts, and
  stale record handling separately.
- R13. Pruning must be provider-scoped and conservative while Rock mapping is
  being validated.

### Team and Schedule Experience

- R14. Team lists should show unified membership across PCO and Rock.
- R15. Team detail pages should expose source badges and source-specific fields
  where data differs.
- R16. Upcoming serving should include schedules from both PCO and Rock.
- R17. Schedule response actions must be provider-aware:
  - PCO: existing accept/decline via PCO user token.
  - Rock: depends on whether Rock exposes an RSVP/attendance workflow or whether
    schedules are read-only in phase one.
- R18. Leaders should see rosters and upcoming serving from both systems, with
  clear source labels.

### Data Ownership

- R19. Goals, feedback, guides, preferences, and future app-native data should
  belong to the My Team profile or canonical team abstractions, not to a single
  provider `Person`.
- R20. Provider data remains read-only unless a provider-specific write path is
  explicitly implemented.
- R21. No destructive merges without a manual review path.

## Proposed Data Model Direction

### Canonical Models

- `Profile`: the My Team profile. Owns app-native user data and represents one
  human in My Team.
- `AuthAccount`: links an Auth0 subject/user ID to a My Team profile. This may
  be folded into `ProfileIdentity` if Auth0 is modeled as another provider, but
  it should be kept semantically separate from ministry-system source records.
- `ProfileIdentity`: links a profile to upstream identities. Unique by
  `(provider, remoteId)`.
- `ProfileMergeCandidate`: stores potential matches that need review.
- `TeamSource`: provider-specific source team/group records. Existing `Team`
  may be evolved into this role or split from a new canonical `TeamProfile`.
- `ScheduleSource`: provider-specific schedule records. Existing `Schedule` may
  stay provider-specific, then optionally roll up into a canonical schedule view.

### Provider Enum

Add `ROCK` to `Provider`, but avoid assuming all existing provider-tagged models
are already canonical. Today they behave like source records.

### Reconciliation Inputs

Suggested automatic match signals:

- Strong: Auth0 verified email to PCO/Rock verified email.
- Strong: explicit admin mapping, same verified email, same Rock alias to PCO ID
  if EV Church already stores that relationship.
- Medium: same mobile phone plus compatible name.
- Weak: exact normalized full name only. This should create a review candidate,
  not an automatic merge.

## Rock Integration Assumptions

Rock RMS commonly exposes REST endpoints under the church's own Rock base URL
and API keys are associated with a Rock user/security context. Rock's group model
is central; Rock documentation describes groups as the main way people are
organized, and group schedules/attendance are tied to group configuration. The
exact endpoints and fields need to be confirmed against EV Church's Rock version,
security roles, and any custom group types/workflows.

References checked on 2026-05-25:

- Rock "Rock Your Groups" documentation:
  https://rockrms.dev/Rock/Book/7/129
- Rock Community group/attendance documentation:
  https://community.rockrms.com/documentation/bookcontent/7

## Initial Rollout Plan

### Phase 0 — Discovery

- Identify which Rock group types represent serving teams.
- Identify whether Rock contains PCO IDs, Planning Center URLs, shared emails,
  or another cross-system identifier.
- Confirm Rock API base URL, auth method, API key permissions, and endpoints.
- Pull a small sample of Rock people/groups/schedules in a non-production
  environment.

### Phase 1 — Breaking Auth0 Login + Read-Only Unified Profile

- Replace PCO OAuth login with Auth0 as the primary Auth.js provider.
- Add canonical profile tables and identity links.
- Create profiles from Auth0 sign-ins and/or linked PCO/Rock source records.
- Link Auth0 accounts to profiles by strong match rules or manual invitation.
- Resolve current session to `profileId` from Auth0.
- Remove PCO-login-only session assumptions instead of preserving compatibility
  for old sessions.
- Add a profile page section showing merged profile, PCO source, and Rock source.

### Phase 2 — Rock Sync

- Add Rock API client and schemas.
- Add `sync-rock` worker queue.
- Sync Rock people and group memberships into provider-scoped source records.
- Create or update profile identities using deterministic matching rules.
- Add sync observability records.

### Phase 3 — Unified Teams and Schedules

- Update tRPC queries to return unified team and schedule views.
- Show source badges for PCO and Rock data.
- Keep PCO schedule response writes working.
- Decide whether Rock schedule response is read-only or write-capable.

### Phase 4 — Admin Reconciliation

- Add review UI for ambiguous matches.
- Add manual link/unlink actions.
- Add audit trail for merges.

## Decisions Needed

- Which Rock group types count as "Teams" in My Team?
- Which Auth0 login methods should be enabled for EV Church users?
- Should every signed-in Auth0 user be allowed in, or should access require a
  linked PCO/Rock identity?
- Are Rock schedules the source of actual serving assignments, availability,
  attendance, or all three?
- Should Rock schedule data be read-only in the first release?
- What is the strongest cross-system identity key available today?
- Should canonical teams exist in phase one, or should the app first expose a
  unified view over provider-specific teams?
- Who can approve profile merges and resolve conflicts?

## Needed From EV Church

- Rock base URL for API access.
- Rock REST/API key and the Rock security role it belongs to.
- Auth0 domain, client ID, client secret, issuer, and allowed callback/logout
  URLs.
- Decision on whether Auth0 users are auto-provisioned by email or manually
  invited/linked.
- A staging/sandbox Rock environment if available.
- List of Rock group type IDs that map to serving teams.
- Examples of Rock teams, members, leaders, schedules, and attendance records.
- Confirmation of whether Rock stores PCO person IDs or any other shared ID.
- Policy for conflicting source fields: name, email, photo, leader status, and
  serving role.
