---
title: "Course Builder Question Block"
date: "2026-06-28"
topic: "course-builder-question-block"
---

# Course Builder Question Block

## Summary

My Team will add a question block to the course builder so training authors can place one-question knowledge checks inside course pages. Each question block supports single-answer or multi-answer questions, page-level submit behavior, and configurable progress behavior that defaults to blocking progress until correct.

---

## Problem Frame

Training modules already combine page-based course content with required video completion, but knowledge checks need to live in the same content flow as the material they test. A module-level quiz is too coarse for courses that need a checkpoint after a specific explanation, video, or page section.

Authors need a simple block that behaves like the rest of the course builder: composable, repeatable, and close to the relevant learning content. Learners need feedback at the moment they try to move forward, without answers being revealed before they engage with the page.

---

## Key Decisions

- **One question per block.** A question block contains exactly one question; authors create multi-question checks by adding multiple question blocks.
- **Page submit owns grading.** When a page contains question blocks, the forward navigation action becomes Submit and grades the page before navigation.
- **Blocking is the default.** Each question block can define progress behavior, but the default is to block progress until the learner answers correctly.
- **Video gating is page-level.** Quiz interaction can be locked until required videos on the page are complete, without linking a question block to a specific video block.
- **Feedback is instructional.** Multi-answer questions require an exact match to pass, but learners should see which selections were right or wrong after submitting.

---

## Actors

- A1. **Training author** - a team leader or training owner who builds course pages.
- A2. **Learner** - a volunteer completing an assigned training module.

---

## Requirements

**Authoring**

- R1. The course builder must let authors insert a question block into a course page.
- R2. Each question block must contain one question.
- R3. Authors must be able to add multiple question blocks to the same page or across different pages.
- R4. Authors must be able to create at least two answer options for a question block.
- R5. Authors must be able to choose whether a question block accepts one correct answer or multiple correct answers.
- R6. Authors must be able to mark the correct answer option or options for each question block.
- R7. Each question block must support a progress behavior setting, defaulting to block progress until correct.
- R8. The authoring experience must make the default blocking behavior clear without requiring authors to configure every question block.

**Learner Experience**

- R9. A learner must be able to select one answer for single-answer question blocks.
- R10. A learner must be able to select multiple answers for multi-answer question blocks.
- R11. A page with one or more question blocks must use Submit as the forward action before advancing to the next page.
- R12. Submitting a page with question blocks must grade all question blocks on that page together.
- R13. Feedback must appear on the same page after Submit.
- R14. Feedback must identify the correct answer for single-answer question blocks.
- R15. Feedback for multi-answer question blocks must show which learner selections were correct and which were wrong.
- R16. Quiz answers must not be revealed before the learner submits the page.

**Progress and Gating**

- R17. A blocking question block must prevent page advancement until the learner satisfies its pass condition.
- R18. When a page has multiple blocking question blocks, all blocking question blocks on that page must pass before the learner can continue.
- R19. Non-blocking quiz behavior must be configurable per question block.
- R20. Multi-answer question blocks must require an exact match to pass when passing is required.
- R21. A page with required video content may lock question interaction until the page's required videos are complete.
- R22. Locked question blocks must indicate that a question exists without revealing the question details or answers.
- R23. After feedback is shown, the learner must be able to revise answers and submit again when progress is blocked.

---

## Key Flows

- F1. Author adds a single-answer question block
  - **Trigger:** A training author is editing a course page.
  - **Actors:** A1
  - **Steps:** The author inserts a question block, writes one question, adds answer options, chooses single-answer mode, marks the correct answer, and leaves the default blocking behavior in place.
  - **Covered by:** R1, R2, R4, R5, R6, R7, R8

- F2. Author adds a multi-answer question block
  - **Trigger:** A training author needs a question with more than one correct response.
  - **Actors:** A1
  - **Steps:** The author inserts a question block, switches it to multi-answer mode, marks more than one correct option, and keeps or changes the progress behavior.
  - **Covered by:** R1, R2, R4, R5, R6, R7, R19

- F3. Learner submits a page with question blocks
  - **Trigger:** A learner reaches a course page containing question blocks.
  - **Actors:** A2
  - **Steps:** The learner answers the question blocks, uses Submit, sees same-page feedback, corrects missed answers if needed, and advances only when the page's quiz requirements are satisfied.
  - **Covered by:** R9, R10, R11, R12, R13, R17, R18, R23

- F4. Page video requirement gates question interaction
  - **Trigger:** A learner opens a page that has required videos and question blocks.
  - **Actors:** A2
  - **Steps:** The learner sees that a quiz checkpoint exists, completes the required page videos, then gains access to the quiz content and can submit the page.
  - **Covered by:** R21, R22

---

## Acceptance Examples

- AE1. **Single-answer blocking question**
  - **Covers:** R9, R11, R13, R14, R17, R23
  - **Given:** A page has a single-answer question block with block-until-correct behavior.
  - **When:** The learner chooses the wrong answer and clicks Submit.
  - **Then:** The page shows the correct answer, does not advance, and lets the learner try again.

- AE2. **Multiple question blocks on one page**
  - **Covers:** R12, R18
  - **Given:** A page has three blocking question blocks.
  - **When:** The learner submits two correct answers and one incorrect answer.
  - **Then:** The learner stays on the page until all three question blocks pass.

- AE3. **Multi-answer feedback**
  - **Covers:** R10, R15, R20
  - **Given:** A multi-answer question block has two correct answers.
  - **When:** The learner selects one correct answer and one incorrect answer.
  - **Then:** The attempt does not pass, and feedback shows which selected answer was right and which selected answer was wrong.

- AE4. **Required video before quiz**
  - **Covers:** R21, R22
  - **Given:** A course page has a required video and a question block.
  - **When:** The learner has not completed the required video.
  - **Then:** The quiz is visible as a locked checkpoint without revealing the question details or answers.

- AE5. **Practice-style quiz behavior**
  - **Covers:** R19
  - **Given:** An author sets a question block to a non-blocking behavior.
  - **When:** The learner submits an incorrect answer.
  - **Then:** The learner receives feedback according to the question block behavior without being blocked solely by that question block.

---

## Success Criteria

- Authors can add useful quiz checkpoints without building a separate quiz object or managing multi-question quiz forms.
- Learners understand when they are submitting a page for grading and what they need to correct before moving forward.
- Required videos and quizzes work together without per-block video wiring.
- The requirements are specific enough for planning to define persistence, rendering, validation, and completion semantics without inventing product behavior.

---

## Scope Boundaries

- Multi-question question blocks are outside v1; authors use multiple question blocks instead.
- Per-question-block video dependencies are outside v1.
- Partial-credit scoring is outside v1.
- Quiz analytics dashboards are outside v1.
- Broad redesign of the course builder is outside v1.

---

## Dependencies and Assumptions

- Training modules continue to use page-based course content for course builder output.
- Required video completion can be evaluated at the page level before question interaction is unlocked.
- The existing Training completion model remains the source of module completion state.
- The older module-level quiz concept is not the authoring model for course-page quizzes.
- Internationalized UI text is required for authoring controls, learner feedback, locked states, and submit/progress actions.

---

## Sources and Research

- `docs/brainstorms/2026-06-24-training-onboarding-compliance-requirements.md` - training module, quiz, completion, retake, and compliance requirements.
- `apps/web/src/app/(app)/teams/[teamId]/training/course/new/course-create-content.tsx` - current page-based course builder and page navigation authoring context.
- `apps/web/src/app/(app)/teams/[teamId]/training/course/new/block-note-course-editor.tsx` - current BlockNote-based course editor and custom video block context.
- `apps/web/src/app/(app)/training/[moduleId]/training-module-content.tsx` - current learner course page and video completion behavior.
- `packages/api/prisma/schema.prisma` - current Training module, completion, and quiz attempt model context.
- `packages/api/src/routers/training.ts` - current Training completion and quiz handling behavior.
