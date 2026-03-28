---
date: 2026-03-28
topic: schedule-ui-enhancements
---

# Schedule UI Enhancements

## Problem Frame

Volunteers can now see their upcoming serving dates, but the experience is minimal — no call times, no way to respond to schedule requests without leaving the app, and the main teams screen doesn't surface upcoming schedules at a glance. These three improvements make the schedule data we're already syncing significantly more useful.

## Requirements

**Upcoming Schedules on My Teams Screen**
- R1. Show a chronological "Upcoming Serving" section above the team cards on the `/teams` page
- R2. Display next 3 upcoming schedules across all teams in a flat list, sorted by date
- R3. Each entry shows: date, time, team name, position name, and confirmation status
- R4. "See all" link/button expands to show all remaining future schedules
- R5. When the user has no upcoming schedules, omit the section entirely (don't show an empty state above the teams)

**Call Times Display**
- R6. On the team view "My Upcoming Serving" card, each schedule row is expandable
- R7. Tapping/clicking a schedule row reveals its associated call times (from PlanTime data) — rehearsals, call times, etc.
- R8. Each call time shows: name (e.g., "Rehearsal", "Call Time"), date, and start/end time
- R9. Call times are sorted chronologically within each schedule
- R10. Collapsed by default — only expand when the user interacts

**Accept/Decline from App**
- R11. Each unconfirmed schedule shows accept and decline action buttons
- R12. Accepting sets the schedule status to CONFIRMED via the PCO API (`POST .../schedules/{id}/accept`)
- R13. Declining prompts for an optional reason, then calls the PCO API (`POST .../schedules/{id}/decline`)
- R14. After accept/decline, update the local schedule record immediately (optimistic UI), then sync from PCO on next cycle
- R15. Already-confirmed schedules show confirmed status but no action buttons
- R16. Declined schedules show declined status; no further action available
- R17. Accept/decline is available on both the My Teams screen and the team view schedule card

## Success Criteria

- Volunteers can see their next serving dates immediately upon opening the app
- Call times are accessible without navigating to PCO
- Volunteers can respond to schedule requests entirely within the app
- PCO reflects the accept/decline action within seconds

## Scope Boundaries

- No partial acceptance (declining individual plan times) — entire schedule only
- No schedule notifications or reminders (separate feature)
- No manual schedule creation or editing
- No leader view of team-wide schedule responses (can add later)

## Key Decisions

- **Single chronological list over grouped-by-team**: Simpler, matches the mental model of "what's next for me" rather than "what's next per team"
- **Next 3 + "See all" over showing all**: Keeps the My Teams page compact while still providing full access
- **Expandable call times over always-visible**: Avoids cluttering the schedule card for users who only care about service times
- **Entire schedule accept/decline over per-plan-time**: Matches PCO's primary UX and avoids complexity of partial acceptance

## Outstanding Questions

### Deferred to Planning

- [Affects R12-R13][Technical] How to authenticate the accept/decline PCO API calls — the current sync uses API key auth (server-side). Accept/decline could use the same server-side approach via a tRPC mutation, or use the user's OAuth token. Server-side API key is simpler and consistent with existing sync.
- [Affects R4][Technical] Whether "See all" should be an in-page expand or navigate to a dedicated schedules page. In-page expand is simpler; a dedicated page allows future features like filtering.
- [Affects R14][Technical] Whether to call `fetchSchedulesSnapshot` after accept/decline to immediately re-sync, or just update the local record optimistically and let the hourly sync reconcile.

## Next Steps

-> `/ce:plan` for structured implementation planning
