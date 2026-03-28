---
date: 2026-03-28
topic: pco-plan-details
---

# PCO Plan Details Page

## Problem Frame

Volunteers currently see when they're scheduled to serve but have no way to view the full service plan — the service order, songs, notes, team roster, or attachments — without leaving the app and opening PCO. This forces context-switching for every rehearsal or Sunday morning prep. A dedicated plan details page lets volunteers see everything they need in one place.

## Requirements

**Navigation & Access**
- R1. Each schedule item (upcoming serving entry) links to a plan details page for that plan
- R2. Route: `/plans/[planRemoteId]` — uses the PCO plan remote ID since plan data is fetched on-demand, not stored locally
- R3. Only users who are personally scheduled on the plan can view it; others get a 403/not-found
- R4. The plan details page integrates with the schedule-ui-enhancements work (separate brainstorm) as the click-through destination from schedule rows

**Data Fetching**
- R5. Plan data is fetched on-demand from the PCO API when the page is viewed — not synced to the database
- R6. Use the existing server-side PCO API credentials (PAT) for fetching, same as the sync pipeline
- R7. Show a loading skeleton while plan data is being fetched

**Service Order**
- R8. Display the full ordered list of plan items (songs, media, headers, items) in sequence
- R9. Each item shows: title, item type, length/duration (if set), and description/notes
- R10. Song items additionally show: key, arrangement name, and any song-level attachments (chord charts, lead sheets, etc.)
- R11. Header items act as visual section dividers in the service order
- R12. Media items show title and any associated content/links

**Team Roster**
- R13. Display all team members assigned to the plan, grouped by team
- R14. Each team member shows: name, position, and confirmation status (confirmed/unconfirmed/declined)
- R15. The current user's own assignment is visually highlighted in the roster

**Plan Times**
- R16. Show all plan times (rehearsal, service, pre-service, etc.) with name, date, and start/end times
- R17. Plan times are sorted chronologically

**Notes & Attachments**
- R18. Display plan-level notes (if any exist)
- R19. Display plan-level attachments as downloadable/viewable links
- R20. Song attachments (chord charts, lead sheets) are shown inline with their respective song item in the service order

**Plan Header**
- R21. Plan header shows: service type name, plan date(s), and service time
- R22. Include a link to view the plan in PCO (deep link to PCO web app)

## Success Criteria

- Volunteers can view all plan details (service order, roster, notes, attachments) without leaving the app
- Song arrangements and chord charts are accessible directly from the plan page
- Page loads quickly via on-demand PCO API fetch with visible loading state
- Access is scoped to scheduled volunteers only

## Scope Boundaries

- No editing of plan data — read-only view of PCO content
- No caching or local storage of plan content (fresh fetch each view)
- No plan search or filtering — accessed only via schedule item links
- No offline support for plan details
- Accept/decline actions are handled by the schedule-ui-enhancements feature, not duplicated here

## Key Decisions

- **On-demand fetch over DB sync**: Plan content (items, songs, notes, attachments) changes frequently and is large. Fetching live avoids schema bloat and ensures data is always current.
- **PCO remote ID in route over local ID**: Since plan content isn't stored locally, routing by `planRemoteId` (which we already store on Schedule records) is the natural key.
- **Scheduled-only access over team-wide access**: Matches the principle of showing users their own data. Leaders seeing all plans can be added later.
- **Separate feature from schedule-ui-enhancements**: The schedule UI work handles surfacing and responding to schedules; this feature handles deep-diving into plan content. They connect via schedule item links.

## Dependencies / Assumptions

- Depends on `planRemoteId` stored on Schedule records (already exists in schema)
- Depends on schedule-ui-enhancements making schedule rows clickable (R1/R4)
- PCO API endpoints needed: `/services/v2/service_types/{id}/plans/{id}` with includes for items, notes, team_members, attachments, songs
- PCO API rate limit (100 req/20s) is sufficient for on-demand single-plan fetches

## Outstanding Questions

### Deferred to Planning

- [Affects R5-R6][Needs research] Which PCO API endpoints and includes are needed to fetch full plan details (items, songs, notes, attachments) in minimal requests
- [Affects R3][Technical] How to verify the current user is scheduled for a plan — check local Schedule records by planRemoteId + personId, or query PCO API
- [Affects R10][Needs research] What song-level data PCO exposes via API (key, arrangement, chord chart URLs, streaming links)
- [Affects R18-R19][Needs research] How plan notes and attachments are structured in the PCO API response
- [Affects R22][Technical] The correct PCO deep link URL format for plans (likely `https://services.planningcenteronline.com/plans/{id}`)
- [Affects R7][Technical] Whether to use a tRPC query (server-side fetch) or a Next.js server component with direct PCO API call for the on-demand data loading

## Next Steps

-> `/ce:plan` for structured implementation planning
