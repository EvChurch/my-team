import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCContext } from "../init";

const db = vi.hoisted(() => ({
  findModule: vi.fn(),
  complete: vi.fn(),
  attempt: vi.fn(),
}));
vi.mock("@mt/auth", () => ({ auth: vi.fn() }));
vi.mock("../db", () => ({
  prisma: {
    trainingModule: { findUniqueOrThrow: db.findModule },
    trainingCompletion: { upsert: db.complete },
    trainingQuizAttempt: { create: db.attempt },
  },
}));
import { trainingRouter } from "./training";

const context: TRPCContext = {
  session: { user: { id: "member", auth0Id: "auth0|member" }, expires: "2099-01-01" },
  profileId: "member",
  personId: "member",
  personIds: ["member"],
  accessToken: null,
  headers: new Headers(),
};
const caller = trainingRouter.createCaller(context);
const options = [
  { id: "a", text: "First", correct: true },
  { id: "b", text: "Second", correct: false },
  { id: "c", text: "Third", correct: true },
];
const content = {
  type: "blocknoteCourse",
  pages: [{
    id: "page", title: "Questions", blocks: ["single", "multiple"].map((mode) => ({
      id: mode,
      type: "question",
      props: {
        prompt: "Choose the correct answers",
        answerMode: mode,
        progressBehavior: "BLOCK_UNTIL_CORRECT",
        optionsJson: JSON.stringify(mode === "single" ? options.slice(0, 2) : options),
      },
      children: [],
    })),
  }],
};

beforeEach(() => {
  vi.resetAllMocks();
  db.findModule.mockResolvedValue({
    id: "module", content, version: 3, expiryDays: null,
    status: "PUBLISHED", completionMode: "ACKNOWLEDGE", quiz: null,
  });
  db.complete.mockResolvedValue({ id: "completion" });
});

describe("completeModule answer contract", () => {
  it("grades string and string-array answers and persists completion for the current member", async () => {
    await expect(caller.completeModule({
      moduleId: "module", courseQuestionAnswers: { single: "a", multiple: ["a", "c"] },
    })).resolves.toEqual({ id: "completion" });
    expect(db.complete).toHaveBeenCalledExactlyOnceWith({
      where: { personId_moduleId: { personId: "member", moduleId: "module" } },
      create: {
        personId: "member", moduleId: "module", moduleVersion: 3,
        completedAt: expect.any(Date), expiresAt: null, requiresRedoAt: null,
      },
      update: {
        moduleVersion: 3, completedAt: expect.any(Date), expiresAt: null, requiresRedoAt: null,
      },
    });
    expect(db.attempt).not.toHaveBeenCalled();
  });

  it.each([undefined, {}])("keeps answers optional for modules without questions: %s", async (answers) => {
    db.findModule.mockResolvedValue({
      id: "module", content: null, version: 1, expiryDays: null,
      status: "PUBLISHED", completionMode: "ACKNOWLEDGE", quiz: null,
    });
    const input = answers === undefined ? { moduleId: "module" } : { moduleId: "module", courseQuestionAnswers: answers };
    await expect(caller.completeModule(input)).resolves.toEqual({ id: "completion" });
    expect(db.complete).toHaveBeenCalledOnce();
  });

  it.each<Array<Record<string, string | string[]> | undefined>[number]>([
    undefined, {}, { single: "b", multiple: ["a", "c"] },
    { single: "a", multiple: ["a"] }, { single: "unknown", multiple: ["a", "c"] },
  ])("rejects missing or incorrect required answers without writing: %s", async (answers) => {
    await expect(caller.completeModule({ moduleId: "module", courseQuestionAnswers: answers }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Answer the required course questions before completing this module." });
    expect(db.complete).not.toHaveBeenCalled();
    expect(db.attempt).not.toHaveBeenCalled();
  });

  it.each([null, [], "a", { single: 1 }, { single: true }, { single: null }, { multiple: ["a", 1] }, { single: { answer: "a" } }])(
    "rejects malformed answer shapes before querying or writing: %s", async (answers) => {
      // Model untrusted wire input; the caller's static type normally excludes it.
      await expect(caller.completeModule({ moduleId: "module", courseQuestionAnswers: answers } as unknown as Parameters<typeof caller.completeModule>[0]))
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(db.findModule).not.toHaveBeenCalled();
      expect(db.complete).not.toHaveBeenCalled();
      expect(db.attempt).not.toHaveBeenCalled();
    },
  );

  it("requires an authenticated member before accessing a module", async () => {
    const unauthenticated = trainingRouter.createCaller({ ...context, session: null, profileId: null });
    await expect(unauthenticated.completeModule({ moduleId: "module" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.findModule).not.toHaveBeenCalled();
    expect(db.complete).not.toHaveBeenCalled();
  });
});
