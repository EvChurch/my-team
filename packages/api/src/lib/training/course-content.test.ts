import { describe, expect, it } from "vitest";
import {
  ensureSingleCorrectCourseQuestionOption,
  evaluateCourseQuestionSubmission,
  parseCourseQuestionOptions,
  parseCourseQuestionPages,
  type CourseQuestionBlock,
} from "./course-content";

const optionsJson = JSON.stringify([
  { id: "option-a", text: "Answer A", correct: true },
  { id: "option-b", text: "Answer B", correct: false },
  { id: "option-c", text: "Answer C", correct: true },
]);

function courseContent(blocks: unknown[]) {
  return {
    type: "blocknoteCourse",
    pages: [{ id: "page-1", title: "Start here", blocks }],
  };
}

function questionBlock(props: Record<string, unknown> = {}) {
  return {
    id: "question-1",
    type: "question",
    props: {
      answerMode: "single",
      optionsJson,
      progressBehavior: "BLOCK_UNTIL_CORRECT",
      prompt: "What should you do?",
      ...props,
    },
    content: undefined,
    children: [],
  };
}

describe("parseCourseQuestionPages", () => {
  it("extracts question blocks from blocknote course content", () => {
    const pages = parseCourseQuestionPages(courseContent([questionBlock()]));

    expect(pages).toHaveLength(1);
    expect(pages[0]?.questions[0]).toMatchObject({
      id: "question-1",
      pageId: "page-1",
      prompt: "What should you do?",
      answerMode: "single",
      progressBehavior: "BLOCK_UNTIL_CORRECT",
    });
  });

  it("uses inline block content as the question prompt", () => {
    const pages = parseCourseQuestionPages(
      courseContent([
        {
          ...questionBlock({ prompt: "" }),
          content: [
            {
              type: "text",
              text: "What is the first step?",
              styles: {},
            },
          ],
        },
      ]),
    );

    expect(pages[0]?.questions[0]?.prompt).toBe("What is the first step?");
  });

  it("preserves malformed question blocks so blocking validation can fail closed", () => {
    const pages = parseCourseQuestionPages(
      courseContent([
        questionBlock({ prompt: "" }),
        questionBlock({ optionsJson: "not json" }),
      ]),
    );

    expect(pages).toHaveLength(1);
    expect(pages[0]?.questions).toHaveLength(2);
  });
});

describe("course question option helpers", () => {
  it("can preserve blank authoring options while ensuring the two-option minimum", () => {
    const options = parseCourseQuestionOptions(undefined, {
      preserveEmpty: true,
      ensureMinimum: true,
    });

    expect(options).toEqual([
      expect.objectContaining({ id: "option-1", text: "", correct: true }),
      expect.objectContaining({ id: "option-2", text: "", correct: false }),
    ]);
  });

  it("falls back to the authoring minimum for malformed option arrays", () => {
    const options = parseCourseQuestionOptions("{}", {
      preserveEmpty: true,
      ensureMinimum: true,
    });

    expect(options).toEqual([
      expect.objectContaining({ id: "option-1", text: "", correct: true }),
      expect.objectContaining({ id: "option-2", text: "", correct: false }),
    ]);
  });

  it("filters blank options for grading", () => {
    const options = parseCourseQuestionOptions(
      JSON.stringify([
        { id: "option-a", text: "Answer A", correct: true },
        { id: "option-b", text: "", correct: false },
      ]),
    );

    expect(options).toEqual([
      expect.objectContaining({ id: "option-a", text: "Answer A" }),
    ]);
  });

  it("normalizes single-answer options to one correct option", () => {
    const options = ensureSingleCorrectCourseQuestionOption([
      { id: "option-a", text: "Answer A", correct: true },
      { id: "option-b", text: "Answer B", correct: true },
    ]);

    expect(options).toEqual([
      expect.objectContaining({ id: "option-a", correct: true }),
      expect.objectContaining({ id: "option-b", correct: false }),
    ]);
  });
});

describe("evaluateCourseQuestionSubmission", () => {
  it("passes a single-answer question only when the selected option is correct", () => {
    const question = parseCourseQuestionPages(courseContent([questionBlock()]))[0]!
      .questions[0]!;

    expect(
      evaluateCourseQuestionSubmission({
        questions: [question],
        submission: { "question-1": "option-a" },
      }),
    ).toMatchObject({ passed: true });

    expect(
      evaluateCourseQuestionSubmission({
        questions: [question],
        submission: { "question-1": "option-b" },
      }),
    ).toMatchObject({ passed: false });
  });

  it("requires exact matches for multi-answer questions", () => {
    const question = parseCourseQuestionPages(
      courseContent([questionBlock({ answerMode: "multiple" })]),
    )[0]!.questions[0]!;

    expect(
      evaluateCourseQuestionSubmission({
        questions: [question],
        submission: { "question-1": ["option-a", "option-c"] },
      }),
    ).toMatchObject({ passed: true });

    expect(
      evaluateCourseQuestionSubmission({
        questions: [question],
        submission: { "question-1": ["option-a", "option-b"] },
      }),
    ).toMatchObject({ passed: false });
  });

  it("returns option-level feedback for multi-answer selections", () => {
    const question = parseCourseQuestionPages(
      courseContent([questionBlock({ answerMode: "multiple" })]),
    )[0]!.questions[0]!;

    const result = evaluateCourseQuestionSubmission({
      questions: [question],
      submission: { "question-1": ["option-a", "option-b"] },
    });

    expect(result.results[0]?.options).toEqual([
      expect.objectContaining({
        id: "option-a",
        correct: true,
        selected: true,
      }),
      expect.objectContaining({
        id: "option-b",
        correct: false,
        selected: true,
      }),
      expect.objectContaining({
        id: "option-c",
        correct: true,
        selected: false,
      }),
    ]);
  });

  it("does not block completion for non-blocking failed questions", () => {
    const question = parseCourseQuestionPages(
      courseContent([questionBlock({ progressBehavior: "ALLOW_CONTINUE" })]),
    )[0]!.questions[0]!;

    expect(
      evaluateCourseQuestionSubmission({
        questions: [question],
        submission: { "question-1": "option-b" },
      }),
    ).toMatchObject({ passed: true });
  });

  it("fails a blocking question with no correct answer", () => {
    const question: CourseQuestionBlock = {
      id: "question-without-answer",
      pageId: "page-1",
      pageTitle: "Start here",
      prompt: "What should you do?",
      answerMode: "single",
      progressBehavior: "BLOCK_UNTIL_CORRECT",
      options: [
        { id: "option-a", text: "Answer A", correct: false },
        { id: "option-b", text: "Answer B", correct: false },
      ],
    };

    expect(
      evaluateCourseQuestionSubmission({
        questions: [question],
        submission: { "question-without-answer": "option-a" },
      }),
    ).toMatchObject({ passed: false });
  });

  it("fails a blocking question with no correct answer when unanswered", () => {
    const question: CourseQuestionBlock = {
      id: "question-without-answer",
      pageId: "page-1",
      pageTitle: "Start here",
      prompt: "What should you do?",
      answerMode: "single",
      progressBehavior: "BLOCK_UNTIL_CORRECT",
      options: [
        { id: "option-a", text: "Answer A", correct: false },
        { id: "option-b", text: "Answer B", correct: false },
      ],
    };

    expect(
      evaluateCourseQuestionSubmission({
        questions: [question],
        submission: {},
      }),
    ).toMatchObject({ passed: false });
  });
});
