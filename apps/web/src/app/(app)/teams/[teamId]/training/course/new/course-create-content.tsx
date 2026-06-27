"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  BookOpenCheck,
  FileText,
  GripVertical,
  Plus,
  Video,
} from "lucide-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useTRPC } from "@mt/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { normalizeYouTubeUrl } from "@/lib/youtube";
import {
  BlockNoteCourseEditor,
  type CourseEditorHandle,
  type CourseEditorBlock,
} from "./block-note-course-editor";

type CourseCreateContentProps = {
  teamId: string;
  positionId?: string;
};

type CoursePage = {
  id: string;
  title: string;
  blocks: CourseEditorBlock[];
};

type CourseBuilderDraft = {
  description: string;
  pages: CoursePage[];
  selectedPageId: string;
  settingsTab: "document" | "block";
  title: string;
};

const defaultEditorBlocks = [
  {
    type: "paragraph" as const,
    content: "",
  },
];

export function CourseCreateContent({
  teamId,
  positionId,
}: CourseCreateContentProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useTranslations("TrainingAdmin");
  const tCommon = useTranslations("Common");
  const draftKey = getCourseBuilderDraftKey(teamId, positionId);
  const [initialDraft] = useState(() => readCourseBuilderDraft(draftKey));
  const idCounter = useRef(getNextPageIdSeed(initialDraft?.pages));
  const editorRef = useRef<CourseEditorHandle>(null);
  const pageSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { data } = useSuspenseQuery(
    trpc.training.teamManagement.queryOptions({ teamId }),
  );
  const createModule = useMutation(
    trpc.training.createTeamModule.mutationOptions(),
  );
  const addTeamModule = useMutation(
    trpc.training.addTeamOnboardingModule.mutationOptions(),
  );
  const addRoleModule = useMutation(
    trpc.training.addRoleOnboardingModule.mutationOptions(),
  );

  const selectedPosition =
    data.team.positions.find((position) => position.id === positionId) ?? null;
  const scopeTitle = selectedPosition
    ? (selectedPosition.name ?? t("unnamedRole"))
    : t("defaultTeamScope");
  const backHref = `/teams/${teamId}?tab=training&trainingMode=manage`;
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [description, setDescription] = useState(
    initialDraft?.description ?? "",
  );
  const [selectedPageId, setSelectedPageId] = useState(
    initialDraft?.selectedPageId ?? "page-1",
  );
  const [settingsTab, setSettingsTab] = useState<"document" | "block">(
    initialDraft?.settingsTab ?? "document",
  );
  const [selectedBlock, setSelectedBlock] = useState<CourseEditorBlock | null>(
    null,
  );
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [pages, setPages] = useState<CoursePage[]>(
    initialDraft?.pages.length
      ? initialDraft.pages
      : [
          {
            id: "page-1",
            title: t("firstPageTitle"),
            blocks: [],
          },
        ],
  );
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];
  const selectedBlockForInspector = selectedBlock
    ? (findBlockById(selectedPage.blocks, selectedBlock.id) ?? selectedBlock)
    : null;
  const isSaving =
    createModule.isPending ||
    addTeamModule.isPending ||
    addRoleModule.isPending ||
    isRedirecting;
  const canSave =
    title.trim().length > 0 && pages.some((page) => pageHasContent(page));

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      writeCourseBuilderDraft(draftKey, {
        description,
        pages,
        selectedPageId: selectedPage.id,
        settingsTab,
        title,
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [description, draftKey, pages, selectedPage.id, selectedPageId, settingsTab, title]);

  function nextId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  function addPage() {
    const pageId = nextId("page");
    setPages((current) => [
      ...current,
      {
        id: pageId,
        title: t("newPageTitle", { number: current.length + 1 }),
        blocks: [],
      },
    ]);
    setSelectedBlock(null);
    setSelectedPageId(pageId);
  }

  function updateSelectedPageTitle(value: string) {
    setPages((current) =>
      current.map((page) =>
        page.id === selectedPage.id ? { ...page, title: value } : page,
      ),
    );
  }

  function updateSelectedPageBlocks(blocks: CourseEditorBlock[]) {
    setPages((current) =>
      current.map((page) =>
        page.id === selectedPage.id ? { ...page, blocks } : page,
      ),
    );
  }

  function updateSelectedBlockProps(props: Record<string, unknown>) {
    if (!selectedBlockForInspector) return;

    const nextProps = {
      ...selectedBlockForInspector.props,
      ...props,
    };

    const updatedBlock = {
      ...selectedBlockForInspector,
      props: nextProps,
    };

    setSelectedBlock(updatedBlock);
    editorRef.current?.updateBlock(selectedBlockForInspector.id, {
      props: nextProps,
    });
  }

  function handlePageDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    setPages((current) => {
      const oldIndex = current.findIndex((page) => page.id === activeId);
      const newIndex = current.findIndex((page) => page.id === overId);
      if (oldIndex < 0 || newIndex < 0) return current;

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    if (!canSave || isSaving) return;

    try {
      const createdModule = await createModule.mutateAsync({
        teamId,
        title: title.trim(),
        description: description.trim() || undefined,
        content: {
          type: "blocknoteCourse",
          pages: pages.map((page) => ({
            ...page,
            title: page.title.trim() || t("untitledPage"),
            blocks: page.blocks.length > 0 ? page.blocks : defaultEditorBlocks,
          })),
        },
        completionMode: "ACKNOWLEDGE",
        expiryBehavior: "BLOCKING",
      });

      if (selectedPosition) {
        await addRoleModule.mutateAsync({
          teamId,
          positionId: selectedPosition.id,
          moduleId: createdModule.id,
        });
      } else {
        await addTeamModule.mutateAsync({ teamId, moduleId: createdModule.id });
      }

      setIsRedirecting(true);
      await queryClient.invalidateQueries({
        queryKey: trpc.training.teamManagement.queryOptions({ teamId }).queryKey,
      });
      toast(t("courseCreatedAndAdded"));
      removeCourseBuilderDraft(draftKey);
      router.push(backHref);
    } catch {
      toast(t("courseCreateFailed"), "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-card text-text-primary">
      <header className="shrink-0 border-b border-border bg-bg-card/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
              aria-label={t("backToTeam")}
              title={t("backToTeam")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {t("courseBuilder")}
                </p>
                <Badge variant="accent">{scopeTitle}</Badge>
              </div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("untitledCourse")}
                aria-label={t("courseTitle")}
                className="block w-full min-w-0 bg-transparent text-lg font-semibold text-text-primary outline-none placeholder:text-text-tertiary md:text-xl"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={backHref}>
              <Button type="button" variant="secondary">
                {tCommon("cancel")}
              </Button>
            </Link>
            <Button type="button" onClick={handleSave} disabled={!canSave || isSaving}>
              <BookOpenCheck className="h-4 w-4" />
              {isSaving ? t("publishingCourse") : t("publishCourse")}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 overflow-y-auto border-b border-border bg-bg-page py-4 pl-4 pr-6 lg:border-b-0 lg:border-r lg:pr-7">
          <div className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("coursePages")}
            </h2>
          </div>
          <DndContext
            sensors={pageSensors}
            collisionDetection={closestCenter}
            onDragEnd={handlePageDragEnd}
          >
            <SortableContext
              items={pages.map((page) => page.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {pages.map((page) => (
                  <SortablePageButton
                    key={page.id}
                    page={page}
                    active={page.id === selectedPage.id}
                    title={page.title || t("untitledPage")}
                    onSelect={() => {
                      setSelectedBlock(null);
                      setSelectedPageId(page.id);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={addPage}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-bg-card"
          >
            <Plus className="h-4 w-4" />
            {t("addPage")}
          </button>
        </aside>

        <main className="min-h-0 overflow-y-auto bg-bg-card px-4 py-8 md:px-10">
          <div className="mx-auto max-w-3xl space-y-8">
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {t("pageTitle")}
                  </span>
                  <input
                    value={selectedPage.title}
                    onChange={(event) =>
                      updateSelectedPageTitle(event.target.value)
                    }
                    className="w-full bg-transparent py-1 text-xl font-semibold text-text-primary outline-none placeholder:text-text-tertiary focus:border-b focus:border-accent"
                  />
                </label>
              </div>

              <BlockNoteCourseEditor
                key={selectedPage.id}
                ref={editorRef}
                initialContent={
                  selectedPage.blocks.length > 0
                    ? selectedPage.blocks
                    : defaultEditorBlocks
                }
                onChange={updateSelectedPageBlocks}
                onSelectedBlockChange={setSelectedBlock}
              />
            </section>
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-t border-border bg-bg-page px-4 py-4 lg:border-l lg:border-t-0">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-bg-muted p-1">
            <button
              type="button"
              onClick={() => setSettingsTab("document")}
              className={`rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors ${
                settingsTab === "document"
                  ? "bg-bg-card text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t("documentTab")}
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab("block")}
              className={`rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors ${
                settingsTab === "block"
                  ? "bg-bg-card text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t("blockTab")}
            </button>
          </div>

          {settingsTab === "document" ? (
            <section className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {t("courseTitle")}
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("courseTitlePlaceholder")}
                  className="w-full rounded-xl bg-bg-card px-3 py-2.5 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {t("courseDescription")}
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("courseDescriptionPlaceholder")}
                  rows={4}
                  className="w-full resize-y rounded-xl bg-bg-card px-3 py-2.5 text-sm leading-6 text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
            </section>
          ) : (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {t("blockTab")}
              </h2>
              <BlockInspector
                block={selectedBlockForInspector}
                onUpdateProps={updateSelectedBlockProps}
              />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function SortablePageButton({
  page,
  active,
  title,
  onSelect,
}: {
  page: CoursePage;
  active: boolean;
  title: string;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded-xl border transition-colors ${
        active
          ? "border-border bg-bg-card shadow-[var(--shadow-card)]"
          : "border-transparent hover:border-border hover:bg-bg-muted/30 hover:shadow-md"
      } ${isDragging ? "relative z-20 opacity-50" : ""}`}
    >
      <button
        type="button"
        aria-label={title}
        title={title}
        className="inline-flex h-10 w-8 shrink-0 touch-none items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-muted hover:text-text-primary"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-1 py-3 pr-3 text-left"
      >
        <span className="block truncate text-sm font-semibold">{title}</span>
      </button>
    </div>
  );
}

function BlockInspector({
  block,
  onUpdateProps,
}: {
  block: CourseEditorBlock | null;
  onUpdateProps: (props: Record<string, unknown>) => void;
}) {
  const t = useTranslations("TrainingAdmin");

  if (!block) {
    return (
      <div className="rounded-xl bg-bg-card px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-bg-muted text-text-tertiary">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{t("noSelectedBlock")}</p>
            <p className="text-xs text-text-secondary">
              {t("blockSettingsHint")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isVideoBlock = block.type === "video";
  const blockName =
    typeof block.props.name === "string" ? block.props.name : "";
  const blockUrl = typeof block.props.url === "string" ? block.props.url : "";
  const blockCaption =
    typeof block.props.caption === "string" ? block.props.caption : "";
  const duration =
    typeof block.props.duration === "number" ? block.props.duration : 0;
  const requiresCompletion = block.props.requiresCompletion === true;
  const startTime =
    typeof block.props.startTime === "number" ? block.props.startTime : 0;
  const endTime =
    typeof block.props.endTime === "number" && block.props.endTime > startTime
      ? block.props.endTime
      : duration;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-bg-card px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-bg-muted text-accent">
            {isVideoBlock ? (
              <Video className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {isVideoBlock ? t("videoBlock") : t("selectedBlock")}
            </p>
            <p className="text-xs text-text-secondary">
              {t("selectedBlockType", { type: block.type })}
            </p>
          </div>
        </div>
      </div>

      {isVideoBlock ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("videoTitle")}
            </span>
            <input
              value={blockName}
              onChange={(event) =>
                onUpdateProps({ name: event.target.value, showPreview: true })
              }
              placeholder={t("videoTitlePlaceholder")}
              className="w-full rounded-xl bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("videoUrl")}
            </span>
            <input
              value={blockUrl}
              onChange={(event) =>
                onUpdateProps({ url: event.target.value, showPreview: true })
              }
              onBlur={() => {
                const normalizedUrl = normalizeYouTubeUrl(blockUrl);
                if (normalizedUrl && normalizedUrl !== blockUrl) {
                  onUpdateProps({ url: normalizedUrl, showPreview: true });
                }
              }}
              placeholder={t("videoUrlPlaceholder")}
              className="w-full rounded-xl bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {t("videoCaption")}
            </span>
            <textarea
              value={blockCaption}
              onChange={(event) =>
                onUpdateProps({
                  caption: event.target.value,
                  showPreview: true,
                })
              }
              placeholder={t("videoCaptionPlaceholder")}
              rows={3}
              className="w-full resize-y rounded-xl bg-bg-card px-3 py-2.5 text-sm leading-6 text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <div className="rounded-xl bg-bg-card px-3 py-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {t("videoTrim")}
                </p>
                <p className="text-xs text-text-secondary">
                  {duration > 0
                    ? t("videoTrimHint")
                    : t("videoTrimLoading")}
                </p>
              </div>
              {duration > 0 ? (
                <span className="shrink-0 text-xs font-semibold text-text-tertiary">
                  {formatVideoTime(duration)}
                </span>
              ) : null}
            </div>
            {duration > 0 ? (
              <div className="space-y-3">
                <DualRangeSlider
                  duration={duration}
                  endTime={endTime}
                  startTime={startTime}
                  onChange={(nextStartTime, nextEndTime) =>
                    onUpdateProps({
                      startTime: nextStartTime,
                      endTime: nextEndTime,
                      showPreview: true,
                    })
                  }
                />
                <div className="flex items-center justify-between text-xs font-medium text-text-tertiary">
                  <span>{formatVideoTime(0)}</span>
                  <span>{formatVideoTime(Math.max(endTime - startTime, 0))}</span>
                </div>
              </div>
            ) : null}
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-bg-card px-3 py-3">
            <span>
              <span className="block text-sm font-semibold text-text-primary">
                {t("videoRequiresCompletion")}
              </span>
              <span className="mt-1 block text-xs leading-5 text-text-secondary">
                {t("videoRequiresCompletionHint")}
              </span>
            </span>
            <input
              type="checkbox"
              checked={requiresCompletion}
              onChange={(event) =>
                onUpdateProps({
                  requiresCompletion: event.target.checked,
                  showPreview: true,
                })
              }
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={[
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30",
                requiresCompletion
                  ? "border-accent bg-accent"
                  : "border-text-tertiary/50 bg-bg-page",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full border border-border bg-bg-card shadow-[var(--shadow-card)] transition-transform",
                  requiresCompletion ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </span>
          </label>
        </div>
      ) : (
        <div className="rounded-xl bg-bg-card px-3 py-3 text-sm leading-6 text-text-secondary">
          {t("noBlockSettings")}
        </div>
      )}
    </div>
  );
}

function DualRangeSlider({
  duration,
  endTime,
  onChange,
  startTime,
}: {
  duration: number;
  endTime: number;
  onChange: (startTime: number, endTime: number) => void;
  startTime: number;
}) {
  const safeDuration = Math.max(Math.floor(duration), 1);
  const safeStartTime = Math.min(Math.max(Math.floor(startTime), 0), safeDuration);
  const safeEndTime = Math.min(
    Math.max(Math.floor(endTime), safeStartTime + 1),
    safeDuration,
  );
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeHandle, setActiveHandle] = useState<"start" | "end" | null>(
    null,
  );
  const [draftRange, setDraftRange] = useState({
    end: safeEndTime,
    start: safeStartTime,
  });
  const draftRangeRef = useRef(draftRange);
  const visibleRange = activeHandle
    ? draftRange
    : { end: safeEndTime, start: safeStartTime };
  const draftStartTime = Math.min(
    Math.max(Math.floor(visibleRange.start), 0),
    safeDuration - 1,
  );
  const draftEndTime = Math.min(
    Math.max(Math.floor(visibleRange.end), draftStartTime + 1),
    safeDuration,
  );
  const startPercent = (draftStartTime / safeDuration) * 100;
  const endPercent = (draftEndTime / safeDuration) * 100;

  function getTimeFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;

    const ratio = (event.clientX - rect.left) / rect.width;
    return Math.round(Math.min(Math.max(ratio, 0), 1) * safeDuration);
  }

  function updateDraft(handle: "start" | "end", nextTime: number) {
    setDraftRange((currentRange) => {
      if (handle === "start") {
        const nextRange = {
          ...currentRange,
          start: Math.min(Math.max(nextTime, 0), currentRange.end - 1),
        };
        draftRangeRef.current = nextRange;
        return nextRange;
      }

      const nextRange = {
        ...currentRange,
        end: Math.max(Math.min(nextTime, safeDuration), currentRange.start + 1),
      };
      draftRangeRef.current = nextRange;
      return nextRange;
    });
  }

  function commitRange() {
    const nextStartTime = Math.min(
      Math.max(Math.floor(draftRangeRef.current.start), 0),
      safeDuration - 1,
    );
    const nextEndTime = Math.min(
      Math.max(Math.floor(draftRangeRef.current.end), nextStartTime + 1),
      safeDuration,
    );
    onChange(nextStartTime, nextEndTime);
    setActiveHandle(null);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const nextTime = getTimeFromPointer(event);
    const nextHandle =
      Math.abs(nextTime - draftStartTime) <= Math.abs(nextTime - draftEndTime)
        ? "start"
        : "end";

    event.currentTarget.setPointerCapture(event.pointerId);
    draftRangeRef.current = { end: draftEndTime, start: draftStartTime };
    setDraftRange(draftRangeRef.current);
    setActiveHandle(nextHandle);
    updateDraft(nextHandle, nextTime);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!activeHandle) return;
    updateDraft(activeHandle, getTimeFromPointer(event));
  }

  function handleKeyDown(handle: "start" | "end", key: string) {
    const step = key === "ArrowLeft" || key === "ArrowDown" ? -1 : 1;
    const nextTime =
      handle === "start" ? draftStartTime + step : draftEndTime + step;

    if (handle === "start") {
      const nextStartTime = Math.min(Math.max(nextTime, 0), draftEndTime - 1);
      const nextRange = {
        end: draftEndTime,
        start: nextStartTime,
      };
      draftRangeRef.current = nextRange;
      setDraftRange(nextRange);
      onChange(nextStartTime, draftEndTime);
      return;
    }

    const nextEndTime = Math.max(
      Math.min(nextTime, safeDuration),
      draftStartTime + 1,
    );
    const nextRange = { end: nextEndTime, start: draftStartTime };
    draftRangeRef.current = nextRange;
    setDraftRange(nextRange);
    onChange(draftStartTime, nextEndTime);
  }

  return (
    <div className="space-y-2">
      <div
        ref={trackRef}
        className="relative h-10 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={commitRange}
        onPointerCancel={commitRange}
      >
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-muted" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent"
          style={{
            left: `${startPercent}%`,
            right: `${100 - endPercent}%`,
          }}
        />
        <button
          type="button"
          role="slider"
          aria-label="Video start time"
          aria-valuemin={0}
          aria-valuemax={draftEndTime - 1}
          aria-valuenow={draftStartTime}
          onPointerDown={(event) => {
            event.stopPropagation();
            draftRangeRef.current = { end: draftEndTime, start: draftStartTime };
            setDraftRange(draftRangeRef.current);
            event.currentTarget.parentElement?.setPointerCapture(
              event.pointerId,
            );
            setActiveHandle("start");
          }}
          onKeyDown={(event) => {
            if (
              event.key !== "ArrowLeft" &&
              event.key !== "ArrowRight" &&
              event.key !== "ArrowUp" &&
              event.key !== "ArrowDown"
            ) {
              return;
            }
            event.preventDefault();
            handleKeyDown("start", event.key);
          }}
          className={[
            "absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg-card bg-accent shadow-[var(--shadow-card)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-accent/30",
            activeHandle === "start" ? "scale-125" : "hover:scale-110",
          ].join(" ")}
          style={{ left: `${startPercent}%` }}
        />
        <button
          type="button"
          role="slider"
          aria-label="Video end time"
          aria-valuemin={draftStartTime + 1}
          aria-valuemax={safeDuration}
          aria-valuenow={draftEndTime}
          onPointerDown={(event) => {
            event.stopPropagation();
            draftRangeRef.current = { end: draftEndTime, start: draftStartTime };
            setDraftRange(draftRangeRef.current);
            event.currentTarget.parentElement?.setPointerCapture(
              event.pointerId,
            );
            setActiveHandle("end");
          }}
          onKeyDown={(event) => {
            if (
              event.key !== "ArrowLeft" &&
              event.key !== "ArrowRight" &&
              event.key !== "ArrowUp" &&
              event.key !== "ArrowDown"
            ) {
              return;
            }
            event.preventDefault();
            handleKeyDown("end", event.key);
          }}
          className={[
            "absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg-card bg-accent shadow-[var(--shadow-card)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-accent/30",
            activeHandle === "end" ? "scale-125" : "hover:scale-110",
          ].join(" ")}
          style={{ left: `${endPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{formatVideoTime(draftStartTime)}</span>
        <span>{formatVideoTime(draftEndTime)}</span>
      </div>
    </div>
  );
}

function pageHasContent(page: CoursePage): boolean {
  return page.blocks.some((block) => blockHasContent(block));
}

function findBlockById(
  blocks: CourseEditorBlock[],
  blockId: string,
): CourseEditorBlock | null {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    const childMatch = findBlockById(block.children, blockId);
    if (childMatch) return childMatch;
  }
  return null;
}

function blockHasContent(block: CourseEditorBlock): boolean {
  if (
    typeof block.props.url === "string" &&
    block.props.url.trim().length > 0
  ) {
    return true;
  }
  if (Array.isArray(block.content)) {
    return block.content.some((item) => inlineContentHasText(item));
  }
  return block.children.some((child) => blockHasContent(child));
}

function inlineContentHasText(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  if (
    "type" in content &&
    content.type === "text" &&
    "text" in content &&
    typeof content.text === "string"
  ) {
    return content.text.trim().length > 0;
  }
  if ("content" in content && Array.isArray(content.content)) {
    return content.content.some((item) => inlineContentHasText(item));
  }
  return false;
}

function getCourseBuilderDraftKey(teamId: string, positionId?: string) {
  return `training-course-draft:${teamId}:${positionId ?? "team"}`;
}

function readCourseBuilderDraft(key: string): CourseBuilderDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = window.localStorage.getItem(key);
    if (!rawDraft) return null;

    const parsedDraft: unknown = JSON.parse(rawDraft);
    if (
      !parsedDraft ||
      typeof parsedDraft !== "object" ||
      Array.isArray(parsedDraft)
    ) {
      return null;
    }

    const draft = parsedDraft as Record<string, unknown>;
    const pages = Array.isArray(draft.pages)
      ? draft.pages
          .map((page) => parseCourseBuilderDraftPage(page))
          .filter((page): page is CoursePage => Boolean(page))
      : [];
    if (pages.length === 0) return null;

    const selectedPageId =
      typeof draft.selectedPageId === "string" &&
      pages.some((page) => page.id === draft.selectedPageId)
        ? draft.selectedPageId
        : pages[0].id;
    const settingsTab =
      draft.settingsTab === "block" || draft.settingsTab === "document"
        ? draft.settingsTab
        : "document";

    return {
      description:
        typeof draft.description === "string" ? draft.description : "",
      pages,
      selectedPageId,
      settingsTab,
      title: typeof draft.title === "string" ? draft.title : "",
    };
  } catch {
    return null;
  }
}

function writeCourseBuilderDraft(key: string, draft: CourseBuilderDraft) {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Draft persistence is best-effort and should never interrupt editing.
  }
}

function removeCourseBuilderDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures after publish.
  }
}

function parseCourseBuilderDraftPage(page: unknown): CoursePage | null {
  if (!page || typeof page !== "object" || Array.isArray(page)) return null;

  const draftPage = page as Record<string, unknown>;
  if (typeof draftPage.id !== "string") return null;

  return {
    id: draftPage.id,
    title: typeof draftPage.title === "string" ? draftPage.title : "",
    blocks: Array.isArray(draftPage.blocks)
      ? draftPage.blocks
          .map((block) => parseCourseBuilderDraftBlock(block))
          .filter((block): block is CourseEditorBlock => Boolean(block))
      : [],
  };
}

function parseCourseBuilderDraftBlock(block: unknown): CourseEditorBlock | null {
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;

  const draftBlock = block as Record<string, unknown>;
  if (typeof draftBlock.id !== "string") return null;
  if (typeof draftBlock.type !== "string") return null;

  return {
    id: draftBlock.id,
    type: draftBlock.type,
    props:
      draftBlock.props &&
      typeof draftBlock.props === "object" &&
      !Array.isArray(draftBlock.props)
        ? (draftBlock.props as Record<string, unknown>)
        : {},
    content: draftBlock.content,
    children: Array.isArray(draftBlock.children)
      ? draftBlock.children
          .map((child) => parseCourseBuilderDraftBlock(child))
          .filter((child): child is CourseEditorBlock => Boolean(child))
      : [],
  };
}

function getNextPageIdSeed(pages?: CoursePage[]) {
  if (!pages?.length) return 1;

  return pages.reduce((highestId, page) => {
    const match = /^page-(\d+)$/.exec(page.id);
    if (!match) return highestId;
    return Math.max(highestId, Number(match[1]));
  }, 1);
}

function formatVideoTime(seconds: number) {
  const safeSeconds = Math.max(Math.floor(seconds), 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
