---
title: "BlockNote custom blocks with native internal controls"
date: 2026-06-28
category: docs/solutions/design-patterns
module: Training course builder
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "A BlockNote custom block needs internal controls that behave like editor content"
  - "The block stores structured data in course content JSON"
  - "Keyboard navigation must cross between BlockNote text and native inputs"
tags: [blocknote, tiptap, keyboard-navigation, course-builder, training]
---

# BlockNote Custom Blocks With Native Internal Controls

## Context

The Training course builder needed a one-question block that felt like native BlockNote content: authors write a question inline, edit answer options on the block surface, mark correct answers, and use keyboard navigation without jumping to a detached settings panel.

The implementation friction came from mixing two editing models. BlockNote owns the text cursor for the custom block prompt, but the answer options are native form controls rendered inside the custom React node view. BlockNote sees one `question` block, not a series of editor positions for each option.

## Guidance

Use a custom BlockNote block for the durable content shape, but be explicit about the boundary between editor-managed content and native controls.

The question prompt should remain BlockNote inline content so authors can type on the block surface and the saved block content is part of the course document:

```tsx
const createCourseQuestionBlockConfig = createBlockConfig(() => ({
  type: "question" as const,
  propSchema: {
    answerMode: { default: "single" as const },
    progressBehavior: { default: "BLOCK_UNTIL_CORRECT" as const },
    optionsJson: { default: defaultQuestionOptionsJson },
  },
  content: "inline" as const,
}));
```

Render structured option controls inside the block with `contentEditable={false}` so ProseMirror does not try to treat native inputs as editable document content:

```tsx
<div className="space-y-0.5" contentEditable={false}>
  {options.map((option) => (
    <input
      key={option.id}
      data-question-option-input={option.id}
      value={option.text}
      onChange={(event) => updateOption(option.id, event.target.value)}
    />
  ))}
</div>
```

Do not expect BlockNote's built-in cursor movement to understand those inputs. Add narrow keyboard bridges at the boundaries:

- From the BlockNote-managed prompt to the first native option, use a Tiptap keymap extension on `ArrowDown`.
- From the native options to each other, use normal input `onKeyDown` handlers.
- From the final add-option row to the next editor block, call `editor.setTextCursorPosition(nextBlock.id, "start")`.
- From the block after a question back into the question controls, intercept `ArrowUp` only when the previous document block is a question.

This keeps Tab behavior with BlockNote instead of overloading Tab for custom block traversal:

```tsx
const QuestionBlockArrowNavigation = createExtension(({ editor }) => ({
  key: "QuestionBlockArrowNavigation",
  tiptapExtensions: [
    Extension.create({
      name: "QuestionBlockArrowNavigation",
      priority: 1000,
      addKeyboardShortcuts() {
        return {
          ArrowDown: () => {
            const block = editor.getTextCursorPosition().block;
            if (block.type !== "question") return false;

            const firstOption = parseQuestionOptions(block.props.optionsJson)[0];
            if (!firstOption) return false;

            document
              .querySelector<HTMLInputElement>(
                `[data-question-option-input="${firstOption.id}"]`,
              )
              ?.focus();
            return true;
          },
        };
      },
    }),
  ],
}));
```

For "add option", a blank insertion row can feel more editor-native than a visible button label. Keep it a real button for accessibility, but show a caret-like visual on focus and support typing-to-create:

```tsx
<button
  type="button"
  data-question-add-option={block.id}
  onClick={() => addQuestionOption()}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addQuestionOption();
    }
    if (isPrintableQuestionOptionKey(event)) {
      event.preventDefault();
      addQuestionOption(event.key);
    }
  }}
>
  <Plus />
  <span aria-hidden="true" className="group-focus/add-option:animate-pulse" />
  <span className="sr-only">Add option</span>
</button>
```

## Why This Matters

Making every option a separate BlockNote block would give more native cursor behavior, but it would also make the question's domain model depend on document structure: one parent block plus child option blocks, correct-answer metadata spread across children, more complex parsing, and more failure modes when authors reorder, indent, or split content.

Keeping options as structured props makes parsing and server validation simpler. The API can evaluate one `question` block as one course question, and the learner UI can use the same normalized shape. The cost is that keyboard behavior inside the React node view must be designed intentionally.

The failed approaches are useful guardrails:

- A document-level keydown listener can fight BlockNote, but it is too broad and brittle.
- A Tab key guard can stop indentation, but it breaks expected BlockNote Tab behavior.
- React `onKeyDown` on the prompt may run too late because the prompt is editor-managed content.
- Block metadata such as `isolating` does not make a block non-indentable; BlockNote's nesting command checks document position, not a custom `indentable` flag.

## When to Apply

- A custom BlockNote block has one editor-managed inline region plus native controls.
- The internal controls are structured data, not free-form rich text.
- Authors expect keyboard movement through the custom block surface.
- The saved content needs to be parsed by server-side validation or learner rendering.

If the internal rows need rich text, comments, collaborative cursors, drag handles, slash commands, or independent BlockNote formatting, model them as real BlockNote blocks instead. Native inputs inside a node view are best for compact structured controls.

## Examples

Question block authoring uses this pattern:

- The prompt is BlockNote inline content.
- Options are serialized in `optionsJson`.
- `answerMode` and `progressBehavior` are block props.
- `ArrowDown` bridges from prompt to first option.
- Arrow handlers on option inputs move within the native controls.
- The add-option row supports both explicit activation and typing-to-create.

The learner side uses the same normalized course question parser rather than reinterpreting editor UI state. Server completion validation also uses the parser, which prevents the authoring representation from drifting away from completion requirements.

## Related

- `docs/solutions/integration-issues/tiptap3-nextjs-guide-editor.md` covers Tiptap JSON storage and SSR concerns.
- `docs/solutions/integration-issues/nextjs16-turbopack-monorepo-gotchas.md` includes related Tiptap/Next.js integration notes.
- `docs/brainstorms/2026-06-28-course-builder-question-block-requirements.md` captures the product requirements for the question block.
- `docs/plans/2026-06-28-001-feat-course-builder-question-block-plan.md` captures the implementation plan for parsing, authoring, learner feedback, and completion validation.
