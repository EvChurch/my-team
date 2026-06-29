"use client";

import "@blocknote/shadcn/style.css";
import {
  createReactBlockSpec,
  FilePanelController,
  getDefaultReactSlashMenuItems,
  ResizableFileBlockWrapper,
  SuggestionMenuController,
  useCreateBlockNote,
  useBlockNoteEditor,
  useExtension,
  VideoBlock,
  type DefaultReactSuggestionItem,
  type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  BlockNoteSchema,
  createExtension,
  createBlockConfig,
  defaultProps,
  defaultBlockSpecs,
  videoParse,
  type PartialBlock,
} from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { Extension } from "@tiptap/core";
import { CircleHelp, Plus, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createCourseQuestionOption,
  defaultCourseQuestionOptionsJson,
  ensureCourseQuestionOptionMinimum,
  ensureSingleCorrectCourseQuestionOption,
  parseCourseQuestionOptions,
  type CourseQuestionOption,
} from "@mt/api/training/course-content";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { getYouTubeVideoId, normalizeYouTubeUrl } from "@/lib/youtube";
import { YouTubeTrainingPlayer } from "@/components/training/youtube-training-player";

export type CourseEditorBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content: unknown;
  children: CourseEditorBlock[];
};

export type CourseEditorHandle = {
  updateBlock: (blockId: string, update: PartialBlock) => void;
};

type BlockNoteCourseEditorProps = {
  initialContent: PartialBlock[] | CourseEditorBlock[];
  onChange: (blocks: CourseEditorBlock[]) => void;
  onSelectedBlockChange: (block: CourseEditorBlock | null) => void;
};

const createCourseVideoBlockConfig = createBlockConfig(() => ({
  type: "video" as const,
  propSchema: {
    textAlignment: defaultProps.textAlignment,
    backgroundColor: defaultProps.backgroundColor,
    name: { default: "" as const },
    url: { default: "" as const },
    caption: { default: "" as const },
    showPreview: { default: true },
    previewWidth: { default: undefined, type: "number" as const },
    startTime: { default: 0, type: "number" as const },
    endTime: { default: undefined, type: "number" as const },
    duration: { default: undefined, type: "number" as const },
    requiresCompletion: { default: false },
  },
  content: "none" as const,
}));
const courseVideoBlockConfig = createCourseVideoBlockConfig();

const createCourseQuestionBlockConfig = createBlockConfig(() => ({
  type: "question" as const,
  propSchema: {
    textAlignment: defaultProps.textAlignment,
    backgroundColor: defaultProps.backgroundColor,
    prompt: { default: "" as const },
    answerMode: { default: "single" as const },
    progressBehavior: { default: "BLOCK_UNTIL_CORRECT" as const },
    optionsJson: {
      default: defaultCourseQuestionOptionsJson,
    },
  },
  content: "inline" as const,
}));
const courseQuestionBlockConfig = createCourseQuestionBlockConfig();

const YouTubeVideoBlock = (
  props: ReactCustomBlockRenderProps<typeof courseVideoBlockConfig>,
) => {
  const videoId = getYouTubeVideoId(props.block.props.url);

  if (!videoId || !props.block.props.showPreview) {
    return (
      <VideoBlock {...(props as unknown as ComponentProps<typeof VideoBlock>)} />
    );
  }

  const wrapperProps = props as unknown as ComponentProps<
    typeof ResizableFileBlockWrapper
  >;

  return (
    <ResizableFileBlockWrapper
      {...wrapperProps}
      buttonIcon={<Video className="h-5 w-5" />}
    >
      <YouTubeTrainingPlayer
        caption={props.block.props.caption}
        duration={props.block.props.duration}
        endTime={props.block.props.endTime}
        onMetadata={(metadata) => {
          const nextProps: Record<string, unknown> = {};
          if (
            metadata.duration &&
            metadata.duration !== props.block.props.duration
          ) {
            nextProps.duration = metadata.duration;
          }
          if (
            metadata.title &&
            shouldReplaceGeneratedVideoName(
              props.block.props.name,
              props.block.props.url,
              videoId,
            )
          ) {
            nextProps.name = metadata.title;
          }
          if (!props.block.props.endTime && metadata.duration) {
            nextProps.endTime = metadata.duration;
          }
          if (Object.keys(nextProps).length > 0) {
            props.editor.updateBlock(props.block.id, {
              props: { ...props.block.props, ...nextProps },
            });
          }
        }}
        showCaption={false}
        startTime={props.block.props.startTime}
        title={props.block.props.name}
        videoId={videoId}
      />
    </ResizableFileBlockWrapper>
  );
};

function shouldReplaceGeneratedVideoName(
  currentName: string,
  url: string,
  videoId: string,
) {
  const normalizedName = currentName.trim();
  if (!normalizedName) return true;
  if (normalizedName === videoId) return true;
  if (normalizedName === url.trim()) return true;

  const lowerName = normalizedName.toLowerCase();
  return (
    lowerName === `watch?v=${videoId.toLowerCase()}` ||
    lowerName.includes(`v=${videoId.toLowerCase()}`) ||
    lowerName.includes(`youtu.be/${videoId.toLowerCase()}`) ||
    lowerName.includes(`youtube.com/`)
  );
}

const YouTubeVideoBlockSpec = createReactBlockSpec(
  courseVideoBlockConfig,
  {
    meta: {
      fileBlockAccept: ["video/*"],
    },
    render: YouTubeVideoBlock,
    parse: videoParse({}),
    runsBefore: ["file"],
  },
);

const QuestionBlock = ({
  block,
  contentRef,
  editor,
}: ReactCustomBlockRenderProps<typeof courseQuestionBlockConfig>) => {
  const t = useTranslations("TrainingAdmin");
  const tSafe = getTrainingAdminMessage(t);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const options = parseCourseQuestionOptions(block.props.optionsJson, {
    preserveEmpty: true,
    ensureMinimum: true,
  });
  const answerMode =
    block.props.answerMode === "multiple" ? "multiple" : "single";

  function updateQuestionProps(nextProps: Record<string, unknown>) {
    editor.updateBlock(block.id, {
      props: { ...block.props, ...nextProps },
    });
  }

  function updateQuestionOptions(nextOptions: CourseQuestionOption[]) {
    updateQuestionProps({ optionsJson: JSON.stringify(nextOptions) });
  }

  function focusOption(optionId: string) {
    window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLInputElement>(`[data-question-option-input="${optionId}"]`)
        ?.focus();
    });
  }

  function focusAddOptionButton() {
    window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`[data-question-add-option="${block.id}"]`)
        ?.focus();
    });
  }

  function focusQuestionPrompt(placement: "start" | "end" = "end") {
    window.requestAnimationFrame(() => {
      editor.setTextCursorPosition(block.id, placement);
      editor.focus();
    });
  }

  function focusAdjacentEditorBlock(direction: "previous" | "next") {
    const flatBlocks = flattenEditorBlocks(editor.document);
    const blockIndex = flatBlocks.findIndex(
      (documentBlock) => documentBlock.id === block.id,
    );
    const targetBlock =
      direction === "next"
        ? flatBlocks[blockIndex + 1]
        : flatBlocks[blockIndex - 1];
    if (!targetBlock && direction === "next") {
      const nextBlockId = createCourseEditorBlockId("paragraph");
      const blockEditor = editor as unknown as {
        insertBlocks: (
          blocks: PartialBlock[],
          referenceBlock: string,
          placement: "after",
        ) => void;
      };
      blockEditor.insertBlocks(
        [{ id: nextBlockId, type: "paragraph", content: "" }],
        block.id,
        "after",
      );
      window.requestAnimationFrame(() => {
        editor.setTextCursorPosition(nextBlockId, "start");
        editor.focus();
      });
      return true;
    }
    if (!targetBlock) return false;

    window.requestAnimationFrame(() => {
      editor.setTextCursorPosition(
        targetBlock.id,
        direction === "next" ? "start" : "end",
      );
      editor.focus();
    });
    return true;
  }

  function addQuestionOption(text = "") {
    const nextOption = createCourseQuestionOption({ text });
    updateQuestionOptions([...options, nextOption]);
    focusOption(nextOption.id);
  }

  function insertQuestionOptionAfter(optionId: string) {
    const nextOption = createCourseQuestionOption();
    const optionIndex = options.findIndex((option) => option.id === optionId);
    updateQuestionOptions([
      ...options.slice(0, optionIndex + 1),
      nextOption,
      ...options.slice(optionIndex + 1),
    ]);
    focusOption(nextOption.id);
  }

  function removeQuestionOption(optionId: string) {
    const optionIndex = options.findIndex((option) => option.id === optionId);
    const nextOptions =
      answerMode === "single"
        ? ensureSingleCorrectCourseQuestionOption(
            options.filter((option) => option.id !== optionId),
          )
        : ensureCourseQuestionOptionMinimum(
            options.filter((option) => option.id !== optionId),
          );
    const nextFocusId =
      nextOptions[Math.max(0, Math.min(optionIndex - 1, nextOptions.length - 1))]
        ?.id;
    updateQuestionOptions(nextOptions);
    if (nextFocusId) focusOption(nextFocusId);
  }

  return (
    <div ref={rootRef} data-question-block={block.id} className="space-y-1">
      <div className="text-sm font-semibold leading-6 text-text-primary">
        <div
          ref={(element) => {
            contentRef(element);
          }}
          data-placeholder={tSafe(
            "questionPlaceholder",
            "e.g. What should you do before serving in this role?",
          )}
          data-question-prompt
          className="min-h-6 rounded-[6px] px-1 outline-none empty:before:pointer-events-none empty:before:text-text-tertiary empty:before:content-[attr(data-placeholder)] focus-visible:ring-2 focus-visible:ring-accent/25"
        />
      </div>

      <div className="space-y-0.5" contentEditable={false}>
        {options.map((option, optionIndex) => (
          <div
            key={option.id}
            className="group flex min-h-8 items-center gap-2 rounded-[6px] px-1 text-sm hover:bg-bg-muted/70 focus-within:bg-bg-muted/70"
          >
            <label className="flex h-6 w-6 shrink-0 items-center justify-center text-text-secondary">
              <input
                type={answerMode === "multiple" ? "checkbox" : "radio"}
                name={`${block.id}-correct-option`}
                tabIndex={-1}
                checked={option.correct}
                onChange={(event) =>
                  updateQuestionOptions(
                    options.map((existing) => {
                      if (existing.id !== option.id) {
                        return answerMode === "single"
                          ? { ...existing, correct: false }
                          : existing;
                      }
                      return {
                        ...existing,
                        correct:
                          answerMode === "single" ? true : event.target.checked,
                      };
                    }),
                  )
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="sr-only">{tSafe("correctOption", "Correct")}</span>
            </label>
            <input
              data-question-option-input={option.id}
              value={option.text}
              onChange={(event) =>
                updateQuestionOptions(
                  options.map((existing) =>
                    existing.id === option.id
                      ? { ...existing, text: event.target.value }
                      : existing,
                  ),
                )
              }
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  if (optionIndex === 0) {
                    focusQuestionPrompt("end");
                  } else {
                    focusOption(options[optionIndex - 1].id);
                  }
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const nextOption = options[optionIndex + 1];
                  if (nextOption) {
                    focusOption(nextOption.id);
                  } else {
                    focusAddOptionButton();
                  }
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  insertQuestionOptionAfter(option.id);
                }
                if (
                  event.key === "Backspace" &&
                  option.text.length === 0 &&
                  options.length > 2
                ) {
                  event.preventDefault();
                  removeQuestionOption(option.id);
                }
              }}
              placeholder={tSafe("questionOption", `Option ${optionIndex + 1}`, {
                number: optionIndex + 1,
              })}
              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={tSafe("removeOption", "Remove")}
              title={tSafe("removeOption", "Remove")}
              onClick={() => removeQuestionOption(option.id)}
              disabled={options.length <= 2}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-text-tertiary opacity-0 transition-colors hover:bg-error/10 hover:text-error group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0"
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          tabIndex={-1}
          data-question-add-option={block.id}
          onClick={() => addQuestionOption()}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              const previousOption = options[options.length - 1];
              if (previousOption) focusOption(previousOption.id);
            }
            if (event.key === "ArrowDown") {
              if (focusAdjacentEditorBlock("next")) {
                event.preventDefault();
              }
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              addQuestionOption();
            }
            if (isPrintableQuestionOptionKey(event)) {
              event.preventDefault();
              addQuestionOption(event.key);
            }
          }}
          className="group/add-option inline-flex h-8 w-full items-center gap-2 rounded-[6px] px-1 text-sm text-text-tertiary transition-colors hover:bg-bg-muted hover:text-accent focus:bg-bg-muted focus:outline-none"
        >
          <Plus className="h-4 w-4" />
          <span
            aria-hidden="true"
            className="inline-flex items-center text-text-tertiary group-focus/add-option:text-text-secondary"
          >
            <span className="h-5 w-px bg-transparent group-focus/add-option:animate-pulse group-focus/add-option:bg-accent" />
            <span>
              {tSafe("questionOption", `Option ${options.length + 1}`, {
                number: options.length + 1,
              })}
            </span>
          </span>
          <span className="sr-only">{tSafe("addQuestionOption", "Add option")}</span>
        </button>
      </div>
    </div>
  );
};

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

            const options = parseCourseQuestionOptions(block.props.optionsJson, {
              preserveEmpty: true,
              ensureMinimum: true,
            });
            const firstOption = options[0];
            if (!firstOption) return false;

            window.requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>(`[data-question-block="${block.id}"]`)
                ?.querySelector<HTMLInputElement>(
                  `[data-question-option-input="${firstOption.id}"]`,
                )
                ?.focus();
            });
            return true;
          },
          ArrowUp: () => {
            const block = editor.getTextCursorPosition().block;
            const flatBlocks = flattenEditorBlocks(editor.document);
            const blockIndex = flatBlocks.findIndex(
              (documentBlock) => documentBlock.id === block.id,
            );
            const previousBlock = flatBlocks[blockIndex - 1];
            if (!previousBlock || previousBlock.type !== "question") {
              return false;
            }

            window.requestAnimationFrame(() => {
              document
                .querySelector<HTMLButtonElement>(
                  `[data-question-add-option="${previousBlock.id}"]`,
                )
                ?.focus();
            });
            return true;
          },
        };
      },
    }),
  ],
}));

const QuestionBlockSpec = createReactBlockSpec(
  courseQuestionBlockConfig,
  {
    meta: {
      isolating: true,
    },
    render: QuestionBlock,
  },
  [QuestionBlockArrowNavigation()],
);

const courseBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    video: YouTubeVideoBlockSpec(),
    question: QuestionBlockSpec(),
  },
});

function isPrintableQuestionOptionKey(
  event: KeyboardEvent<HTMLButtonElement>,
) {
  return (
    event.key.length === 1 &&
    event.key !== " " &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  );
}

function createCourseEditorBlockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function flattenEditorBlocks(
  blocks: ReadonlyArray<{ id: string; type?: string; children?: unknown }>,
): Array<{ id: string; type?: string }> {
  const flatBlocks: Array<{ id: string; type?: string }> = [];

  for (const block of blocks) {
    flatBlocks.push({ id: block.id, type: block.type });
    if (Array.isArray(block.children)) {
      flatBlocks.push(
        ...flattenEditorBlocks(
          block.children as ReadonlyArray<{
            id: string;
            type?: string;
            children?: unknown;
          }>,
        ),
      );
    }
  }

  return flatBlocks;
}

function CourseVideoFilePanel({ blockId }: { blockId: string }) {
  const editor = useBlockNoteEditor();
  const filePanel = useExtension(FilePanelExtension);
  const t = useTranslations("TrainingAdmin");
  const tCommon = useTranslations("Common");
  const block = editor.getBlock(blockId) as CourseEditorBlock | undefined;
  const [url, setUrl] = useState(
    typeof block?.props.url === "string" ? block.props.url : "",
  );

  function handleCancel() {
    filePanel.closeMenu();
    editor.focus();
  }

  function handleSave() {
    const normalizedUrl = normalizeYouTubeUrl(url);
    if (!block || !normalizedUrl) return;

    editor.updateBlock(blockId, {
      props: {
        ...block.props,
        duration: undefined,
        endTime: undefined,
        name: "",
        showPreview: true,
        startTime: 0,
        url: normalizedUrl,
      },
    });
    filePanel.closeMenu();
    editor.focus();
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label={tCommon("cancel")}
        className="absolute inset-0 cursor-default"
        onClick={handleCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-bg-card p-5 shadow-[var(--shadow-card-strong)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              {t("embedVideoDialogTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("embedVideoDialogHint")}
            </p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("videoUrl")}
            </span>
            <input
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t("videoUrlPlaceholder")}
              className="w-full rounded-xl border border-border bg-bg-page px-3 py-2.5 text-sm text-text-primary outline-none transition-shadow placeholder:text-text-tertiary focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-bg-card px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-muted"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tCommon("save")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export const BlockNoteCourseEditor = forwardRef<
  CourseEditorHandle,
  BlockNoteCourseEditorProps
>(function BlockNoteCourseEditor(
  props,
  ref,
) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isMounted) {
    return <div className="course-blocknote-editor min-h-[520px]" />;
  }

  return <BlockNoteCourseEditorInner {...props} ref={ref} />;
});

const BlockNoteCourseEditorInner = forwardRef<
  CourseEditorHandle,
  BlockNoteCourseEditorProps
>(function BlockNoteCourseEditorInner(
  { initialContent, onChange, onSelectedBlockChange },
  ref,
) {
  const editor = useCreateBlockNote({
    schema: courseBlockNoteSchema,
    initialContent: initialContent as PartialBlock[],
  });
  const t = useTranslations("TrainingAdmin");

  const getSelectedBlock = useCallback(() => {
    return (
      editor.getSelection()?.blocks[0] ??
      editor.getTextCursorPosition().block ??
      null
    );
  }, [editor]);

  const syncSelectedBlock = useCallback(() => {
    onSelectedBlockChange(getSelectedBlock() as CourseEditorBlock | null);
  }, [getSelectedBlock, onSelectedBlockChange]);

  useImperativeHandle(
    ref,
    () => ({
      updateBlock(blockId, update) {
        editor.updateBlock(blockId, update);
        onChange(editor.document as CourseEditorBlock[]);
        syncSelectedBlock();
      },
    }),
    [editor, onChange, syncSelectedBlock],
  );

  useEffect(() => {
    syncSelectedBlock();
  }, [syncSelectedBlock]);

  return (
    <div className="course-blocknote-editor min-h-[520px]">
      <BlockNoteView
        editor={editor}
        onChange={() => {
          onChange(editor.document as CourseEditorBlock[]);
          syncSelectedBlock();
        }}
        onSelectionChange={syncSelectedBlock}
        theme="light"
        formattingToolbar={false}
        filePanel={false}
        slashMenu={false}
        portalElements={{ filePanel: null }}
        className="min-h-[520px]"
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(getCourseSlashMenuItems(editor, t), query)
          }
          shouldOpen={(state) =>
            !state.selection.$from.parent.type.isInGroup("tableContent")
          }
        />
        <FilePanelController filePanel={CourseVideoFilePanel} />
      </BlockNoteView>
    </div>
  );
});

function getCourseSlashMenuItems(
  editor: ReturnType<typeof useCreateBlockNote>,
  t: ReturnType<typeof useTranslations<"TrainingAdmin">>,
): DefaultReactSuggestionItem[] {
  const tSafe = getTrainingAdminMessage(t);
  const questionTitle = tSafe("questionBlock", "Question");
  const questionHint = tSafe(
    "questionBlockSlashMenuHint",
    "Ask one question with single or multiple answers.",
  );

  return [
    ...getDefaultReactSlashMenuItems(editor),
    {
      title: questionTitle,
      subtext: questionHint,
      aliases: ["question", "knowledge check"],
      group: t("courseBlocksGroup"),
      icon: <CircleHelp className="h-4 w-4" />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "question",
          content: "",
          props: {
            answerMode: "single",
            optionsJson: defaultCourseQuestionOptionsJson,
            progressBehavior: "BLOCK_UNTIL_CORRECT",
            prompt: "",
          },
        } as unknown as Parameters<typeof insertOrUpdateBlockForSlashMenu>[1]);
      },
    },
  ];
}

function getTrainingAdminMessage(
  t: ReturnType<typeof useTranslations<"TrainingAdmin">>,
) {
  return (
    key: string,
    fallback: string,
    values?: Record<string, string | number | Date>,
  ) => (t.has(key) ? t(key, values) : fallback);
}
