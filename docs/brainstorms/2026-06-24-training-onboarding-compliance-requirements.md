---
title: "Training Onboarding and Compliance"
date: "2026-06-24"
topic: "training-onboarding-compliance"
---

# Training Onboarding and Compliance

## Summary

My Team will add Training for post-placement volunteer onboarding and compliance. Members will see consolidated and per-role training checklists generated from their current synced assignments, while leaders and scope owners configure reusable modules, compulsory requirements, and local onboarding sets.

---

## Problem Frame

Volunteers who appear in My Team have already agreed to serve in a position, but the training they need varies across church-wide expectations, purpose areas, campuses, purpose-campus intersections, teams, and roles. Today that variation risks becoming inconsistent across ministries because shared material can be duplicated, forgotten, or handled from memory.

Leaders need enough flexibility to shape onboarding for their own team and roles, while church, purpose, campus, and purpose-campus owners need a way to enforce compulsory training. Volunteers should not have to understand those organizational layers; they need one clear view of what remains before they are ready to serve.

---

## Key Decisions

- **Training is post-placement.** The feature starts after a person is already in a synced team or role assignment; it does not manage recruiting or prospective volunteer pipelines.
- **Guides remain reference material.** Training can reuse Guides, but Guides should continue to serve SOPs, troubleshooting steps, job descriptions, and other material people may need to look up while serving.
- **Modules are reusable library items.** Training content is authored as modules that can be attached to requirements or onboarding sets, which avoids recreating the same content across scopes.
- **Compliance follows current assignments.** The system derives applicable training from current PCO/Rock team and role assignments instead of introducing manual training assignment lists.
- **Completion belongs to the learner and module.** A valid completion carries across all teams and roles where the same module appears, subject to expiry and content-version rules.

---

## Actors

- A1. **Member** - a volunteer with one or more current synced team or role assignments.
- A2. **Team leader** - a leader for a synced team who can assemble onboarding for that team and its roles.
- A3. **Scope owner** - an administrator responsible for training modules and compulsory requirements at a church-wide, purpose, campus, or purpose-campus scope.
- A4. **System administrator** - a user who can manage training administration access and global training settings.

---

## Requirements

**Training Library and Content**

- R1. Training modules must be reusable library items that can be selected by scope owners and team leaders.
- R2. Central administration must support modules for church-wide, purpose, campus, and purpose-campus use.
- R3. Team leaders must be able to create team-local modules for teams they lead.
- R4. A module may contain text, video, linked resources, activity prompts, quiz content, or reused Guide content.
- R5. A module that reuses a Guide must let the module author decide whether the Guide is the completion target, supporting material, or part of a larger training experience.

**Scope Ownership and Requirements**

- R6. A scope owner must be able to manage both module content and compulsory requirements for the scopes they own.
- R7. Compulsory requirements must be supported at church-wide, purpose, campus, and purpose-campus scopes.
- R8. Compulsory requirements must be included automatically when their scope applies to a member's current assignment.
- R9. Team leaders must be able to define a default team onboarding set for everyone on a team they lead.
- R10. Team leaders must be able to define role-specific onboarding sets for roles within teams they lead.
- R11. Team and role onboarding sets may include central library modules and team-local modules.

**Member Training Experience**

- R12. Members must have a consolidated My Training view that deduplicates modules across all current assignments.
- R13. Members must have per-role or per-team-assignment compliance views that show whether they are ready for each current serving context.
- R14. The member-facing checklist must present one combined path for an assignment, even when the underlying requirements come from multiple scopes.
- R15. Members must be able to retake quizzes without losing an existing valid completion solely because of a later failed voluntary attempt.

**Completion, Expiry, and Readiness**

- R16. Completion must be tracked per member and module so it carries across all appearances of the same module.
- R17. Modules must be able to define whether completion never expires or expires after a configured interval.
- R18. Modules with expiry must define whether an expired completion is blocking or non-blocking.
- R19. A member is ready or compliant for an assignment only when all applicable blocking requirements are complete and valid.
- R20. Non-blocking expired modules must remain visible as renewal needs without preventing readiness.
- R21. When a published module changes, the author must choose whether existing completions remain valid or the module requires re-completion.

**Quizzes and Knowledge Checks**

- R22. Modules with quizzes must support module-level completion rules, including practice-style completion and passing-score completion.
- R23. Learners must be able to retake quizzes themselves without leader or administrator intervention.
- R24. A passing-score module must treat the learner's valid passing attempt as the completion signal until expiry, required re-completion, or another invalidation rule applies.

**Compliance Reporting**

- R25. Team leaders must be able to see which members on their teams are compliant, incomplete, expired, or blocked.
- R26. Scope owners must be able to see compliance gaps for compulsory training within the scopes they own.
- R27. Reporting must emphasize readiness and compliance status rather than broad learning analytics in the first version.

---

## Key Flows

- F1. Member completes current-assignment training
  - **Trigger:** A member opens Training after being synced into one or more team or role assignments.
  - **Actors:** A1
  - **Steps:** The member sees one deduplicated My Training list, opens a module, completes its required content or quiz, and returns to see updated overall and per-assignment readiness.
  - **Covered by:** R12, R13, R14, R15, R16

- F2. Team leader assembles onboarding
  - **Trigger:** A team leader configures onboarding for a team or role they lead.
  - **Actors:** A2
  - **Steps:** The leader selects central modules, adds team-local modules when needed, configures the default team onboarding set, and adds role-specific modules for positions.
  - **Covered by:** R3, R9, R10, R11

- F3. Scope owner enforces compulsory training
  - **Trigger:** A scope owner creates or updates required training for a church-wide, purpose, campus, or purpose-campus scope.
  - **Actors:** A3
  - **Steps:** The owner manages the relevant module and marks it compulsory for the scope so matching current assignments receive it automatically.
  - **Covered by:** R2, R6, R7, R8

- F4. Published module changes
  - **Trigger:** An author edits a published module.
  - **Actors:** A2, A3
  - **Steps:** The author saves the change only after choosing whether existing completions remain valid or everyone must redo the module.
  - **Covered by:** R21

---

## Acceptance Examples

- AE1. **Shared completion carries over**
  - **Covers:** R12, R16, R19
  - **Given:** A member completed a central module for one role.
  - **When:** The same module appears in another current assignment.
  - **Then:** The module is already complete in the second assignment if the completion is still valid.

- AE2. **Expired blocking training affects readiness**
  - **Covers:** R17, R18, R19
  - **Given:** Safe Ministry expires every 12 months and is configured as blocking.
  - **When:** A member's valid completion passes its expiry date.
  - **Then:** The member is no longer compliant for assignments where Safe Ministry applies until they renew it.

- AE3. **Expired non-blocking training stays visible**
  - **Covers:** R18, R20
  - **Given:** A refresher module expires and is configured as non-blocking.
  - **When:** The member's completion expires.
  - **Then:** The module shows as needing renewal without removing the member's ready status.

- AE4. **Voluntary retake does not punish completion**
  - **Covers:** R15, R23, R24
  - **Given:** A member has already passed a quiz module.
  - **When:** They voluntarily retake the quiz and fail.
  - **Then:** Their existing valid completion remains in place.

- AE5. **Major content change requires re-completion**
  - **Covers:** R21
  - **Given:** An author edits a published module and marks the update as requiring re-completion.
  - **When:** Members next view training where that module applies.
  - **Then:** Their previous completion no longer satisfies readiness for that module.

---

## Success Criteria

- Leaders can identify who is compliant, incomplete, expired, or blocked for their teams and roles.
- Volunteers can complete required onboarding and understand what remains without navigating administrative scopes.
- Scope owners can configure layered compulsory requirements without duplicating shared training content.
- Training complements Guides rather than replacing the reference knowledge base.

---

## Scope Boundaries

- Recruiting and pre-placement volunteer onboarding are outside v1.
- Manual assignment of training to people outside current synced assignments is outside v1.
- Deep learning analytics, scoring dashboards, and trend analysis are outside v1.
- Guide deletion or replacement is outside scope; Guides remain a separate reference feature.
- Leader sign-off workflows are outside v1 unless a later planning pass identifies a narrow required case.

---

## Dependencies and Assumptions

- The app continues to treat PCO/Rock-synced teams, positions, leaders, and assignments as the source of truth for membership and current serving context.
- Existing app-native features include Guides, Goals, and Feedback; Training is a new app-native capability.
- The first version must include all three pillars: member completion, leader compliance visibility, and administrative configuration.
- Purpose, campus, and purpose-campus ownership concepts need to exist in product behavior even if planning later determines the exact data source or management surface.

---

## Sources and Research

- `AGENTS.md` - project constraints, app-native versus synced data split, and internationalization requirements.
- `design/MEGA_PROMPT.md` - original My Team product spec for Goals, Feedback, Guides, leader workflows, and PCO-synced data boundaries.
- `packages/api/prisma/schema.prisma` - confirms current app-native models and the absence of an existing Training model.
- `docs/plans/2026-03-20-007-feat-goals-feedback-plan.md` - existing Goals and Feedback behavior.
- `docs/plans/2026-03-20-008-feat-guides-editor-plan.md` - existing Guides and rich content behavior.
