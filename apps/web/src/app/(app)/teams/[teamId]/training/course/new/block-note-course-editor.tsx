"use client";

import "@blocknote/shadcn/style.css";
import {
  createReactBlockSpec,
  FilePanelController,
  ResizableFileBlockWrapper,
  useCreateBlockNote,
  useBlockNoteEditor,
  useExtension,
  VideoBlock,
  type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  BlockNoteSchema,
  createBlockConfig,
  defaultProps,
  defaultBlockSpecs,
  videoParse,
  type PartialBlock,
} from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { Video } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ComponentProps,
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

const courseBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    video: YouTubeVideoBlockSpec(),
  },
});

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
  { initialContent, onChange, onSelectedBlockChange },
  ref,
) {
  const editor = useCreateBlockNote({
    schema: courseBlockNoteSchema,
    initialContent: initialContent as PartialBlock[],
  });

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
        portalElements={{ filePanel: null }}
        className="min-h-[520px]"
      >
        <FilePanelController filePanel={CourseVideoFilePanel} />
      </BlockNoteView>
    </div>
  );
});
