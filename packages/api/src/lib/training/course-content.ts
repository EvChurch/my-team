export type CourseQuestionAnswerMode = "single" | "multiple";
export type CourseQuestionProgressBehavior = "BLOCK_UNTIL_CORRECT" | "ALLOW_CONTINUE";

export type CourseQuestionOption = {
  id: string;
  text: string;
  correct: boolean;
};

export type CourseQuestionBlock = {
  id: string;
  pageId: string;
  pageTitle: string;
  prompt: string;
  answerMode: CourseQuestionAnswerMode;
  progressBehavior: CourseQuestionProgressBehavior;
  options: CourseQuestionOption[];
};

export type CourseQuestionPage = {
  id: string;
  title: string;
  questions: CourseQuestionBlock[];
};

export type CourseQuestionSubmission = Record<string, string[] | string>;

export type CourseQuestionOptionFeedback = {
  id: string;
  text: string;
  correct: boolean;
  selected: boolean;
};

export type CourseQuestionBlockResult = {
  blockId: string;
  prompt: string;
  passed: boolean;
  blocking: boolean;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  options: CourseQuestionOptionFeedback[];
};

export type CourseQuestionEvaluation = {
  passed: boolean;
  results: CourseQuestionBlockResult[];
};

export const defaultCourseQuestionOptionsJson = JSON.stringify([
  { id: "option-1", text: "", correct: true },
  { id: "option-2", text: "", correct: false },
]);

type BlockNoteBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content: unknown;
  children: BlockNoteBlock[];
};

export function parseCourseQuestionPages(content: unknown): CourseQuestionPage[] {
  const course = parseBlockNoteCourse(content);
  if (!course) return [];

  return course.pages
    .map((page) => ({
      id: page.id,
      title: page.title,
      questions: collectQuestionBlocks(page.blocks, page.id, page.title),
    }))
    .filter((page) => page.questions.length > 0);
}

export function evaluateCourseQuestionSubmission({
  questions,
  submission,
}: {
  questions: CourseQuestionBlock[];
  submission: CourseQuestionSubmission;
}): CourseQuestionEvaluation {
  const results = questions.map((question) =>
    evaluateCourseQuestionBlock(question, submission),
  );

  return {
    passed: results.every((result) => result.passed || !result.blocking),
    results,
  };
}

export function getCourseQuestionSubmissionAnswer(
  submission: CourseQuestionSubmission,
  blockId: string,
): string[] {
  const value = submission[blockId];
  if (Array.isArray(value)) {
    return [...new Set(value.filter((item) => typeof item === "string"))];
  }
  if (typeof value === "string" && value) return [value];
  return [];
}

function evaluateCourseQuestionBlock(
  question: CourseQuestionBlock,
  submission: CourseQuestionSubmission,
): CourseQuestionBlockResult {
  const selectedOptionIds = getCourseQuestionSubmissionAnswer(
    submission,
    question.id,
  );
  const correctOptionIds = question.options
    .filter((option) => option.correct)
    .map((option) => option.id);
  const canGrade =
    question.prompt.trim().length > 0 &&
    question.options.length >= 2 &&
    correctOptionIds.length > 0;
  const passed = canGrade && setsEqual(selectedOptionIds, correctOptionIds);

  return {
    blockId: question.id,
    prompt: question.prompt,
    passed,
    blocking: question.progressBehavior === "BLOCK_UNTIL_CORRECT",
    selectedOptionIds,
    correctOptionIds,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      correct: option.correct,
      selected: selectedOptionIds.includes(option.id),
    })),
  };
}

function parseBlockNoteCourse(content: unknown): {
  pages: Array<{ id: string; title: string; blocks: BlockNoteBlock[] }>;
} | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return null;
  }
  if (!("type" in content) || content.type !== "blocknoteCourse") return null;
  if (!("pages" in content) || !Array.isArray(content.pages)) return null;

  const rawPages: unknown[] = content.pages;
  const pages = rawPages
    .map((page): { id: string; title: string; blocks: BlockNoteBlock[] } | null => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return null;
      if (!("id" in page) || typeof page.id !== "string") return null;
      if (!("title" in page) || typeof page.title !== "string") return null;
      if (!("blocks" in page) || !Array.isArray(page.blocks)) return null;

      const rawBlocks: unknown[] = page.blocks;
      const blocks = rawBlocks
        .map((block) => parseBlockNoteBlock(block))
        .filter((block): block is BlockNoteBlock => Boolean(block));

      return { id: page.id, title: page.title, blocks };
    })
    .filter((page): page is { id: string; title: string; blocks: BlockNoteBlock[] } =>
      Boolean(page),
    );

  return pages.length > 0 ? { pages } : null;
}

function parseBlockNoteBlock(block: unknown): BlockNoteBlock | null {
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  if (!("id" in block) || typeof block.id !== "string") return null;
  if (!("type" in block) || typeof block.type !== "string") return null;

  const props =
    "props" in block && block.props && typeof block.props === "object"
      ? (block.props as Record<string, unknown>)
      : {};
  const rawChildren =
    "children" in block && Array.isArray(block.children) ? block.children : [];

  return {
    id: block.id,
    type: block.type,
    props,
    content: "content" in block ? block.content : undefined,
    children: rawChildren
      .map((child) => parseBlockNoteBlock(child))
      .filter((child): child is BlockNoteBlock => Boolean(child)),
  };
}

function collectQuestionBlocks(
  blocks: BlockNoteBlock[],
  pageId: string,
  pageTitle: string,
): CourseQuestionBlock[] {
  return blocks.flatMap((block) => {
    const childQuestions = collectQuestionBlocks(block.children, pageId, pageTitle);
    if (block.type !== "question") return childQuestions;

    return [parseQuestionBlock(block, pageId, pageTitle), ...childQuestions];
  });
}

function parseQuestionBlock(
  block: BlockNoteBlock,
  pageId: string,
  pageTitle: string,
): CourseQuestionBlock {
  const prompt =
    stringProp(block.props.prompt).trim() || blockNoteInlineText(block.content);
  const options = parseCourseQuestionOptions(block.props.optionsJson);

  return {
    id: block.id,
    pageId,
    pageTitle,
    prompt,
    answerMode:
      block.props.answerMode === "multiple" ? "multiple" : "single",
    progressBehavior:
      block.props.progressBehavior === "ALLOW_CONTINUE"
        ? "ALLOW_CONTINUE"
        : "BLOCK_UNTIL_CORRECT",
    options: normalizeQuestionOptions(options, block.props.answerMode === "multiple"),
  };
}

export function parseCourseQuestionOptions(
  value: unknown,
  { preserveEmpty = false, ensureMinimum = false } = {},
): CourseQuestionOption[] {
  if (typeof value !== "string") {
    return ensureMinimum ? createDefaultCourseQuestionOptions() : [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return ensureMinimum ? createDefaultCourseQuestionOptions() : [];
    }

    const options = parsed
      .map((option): CourseQuestionOption | null => {
        if (!option || typeof option !== "object" || Array.isArray(option)) {
          return null;
        }
        if (!("id" in option) || typeof option.id !== "string") return null;
        if (!("text" in option) || typeof option.text !== "string") return null;
        return {
          id: option.id,
          text: option.text,
          correct: "correct" in option && option.correct === true,
        };
      })
      .filter((option): option is CourseQuestionOption => Boolean(option))
      .filter((option) => preserveEmpty || option.text.trim().length > 0);

    return ensureMinimum ? ensureCourseQuestionOptionMinimum(options) : options;
  } catch {
    return ensureMinimum ? createDefaultCourseQuestionOptions() : [];
  }
}

export function createCourseQuestionOption({
  correct = false,
  text = "",
  id,
}: {
  correct?: boolean;
  text?: string;
  id?: string;
} = {}): CourseQuestionOption {
  return {
    id: id ?? `option-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    correct,
  };
}

export function createDefaultCourseQuestionOptions(): CourseQuestionOption[] {
  return [
    createCourseQuestionOption({ correct: true, id: "option-1" }),
    createCourseQuestionOption({ correct: false, id: "option-2" }),
  ];
}

export function ensureCourseQuestionOptionMinimum(
  options: CourseQuestionOption[],
) {
  const nextOptions = [...options];
  while (nextOptions.length < 2) {
    nextOptions.push(
      createCourseQuestionOption({ correct: nextOptions.length === 0 }),
    );
  }
  return nextOptions;
}

export function ensureSingleCorrectCourseQuestionOption(
  options: CourseQuestionOption[],
) {
  const safeOptions = ensureCourseQuestionOptionMinimum(options);
  const firstCorrectIndex = Math.max(
    0,
    safeOptions.findIndex((option) => option.correct),
  );

  return safeOptions.map((option, index) => ({
    ...option,
    correct: index === firstCorrectIndex,
  }));
}

function normalizeQuestionOptions(
  options: CourseQuestionOption[],
  allowsMultipleCorrect: boolean,
) {
  if (allowsMultipleCorrect) return options;

  let hasCorrect = false;
  return options.map((option) => {
    if (!option.correct) return option;
    if (hasCorrect) return { ...option, correct: false };
    hasCorrect = true;
    return option;
  });
}

function stringProp(value: unknown) {
  return typeof value === "string" ? value : "";
}

function blockNoteInlineText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      if (
        "type" in item &&
        item.type === "text" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        return item.text;
      }
      if ("content" in item) return blockNoteInlineText(item.content);
      return "";
    })
    .join("")
    .trim();
}

function setsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}
