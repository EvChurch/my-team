"use client";

import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, HelpCircle } from "lucide-react";
import { useTRPC } from "@mt/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { YouTubeTrainingPlayer } from "@/components/training/youtube-training-player";
import { getYouTubeVideoId } from "@/lib/youtube";

type TrainingModuleContentProps = {
  moduleId: string;
};

export function TrainingModuleContent({ moduleId }: TrainingModuleContentProps) {
  const trpc = useTRPC();
  const t = useTranslations("Training");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: module } = useSuspenseQuery(
    trpc.training.getModule.queryOptions({ moduleId }),
  );
  const quiz = parseQuiz(module.quiz);
  const course = parseCourse(module.content);
  const [quizAnswerId, setQuizAnswerId] = useState("");
  const [completedVideoBlockIds, setCompletedVideoBlockIds] = useState<
    Record<string, true>
  >({});
  const [selectedCoursePageId, setSelectedCoursePageId] = useState(
    course?.pages[0]?.id ?? "",
  );
  const selectedCoursePage =
    course?.pages.find((page) => page.id === selectedCoursePageId) ??
    course?.pages[0] ??
    null;
  const selectedCoursePageIndex =
    course && selectedCoursePage
      ? course.pages.findIndex((page) => page.id === selectedCoursePage.id)
      : -1;
  const completeModule = useMutation(
    trpc.training.completeModule.mutationOptions(),
  );
  const pageRequiredVideoBlockIds =
    course?.pages.map((page) => collectRequiredVideoBlockIdsIn(page.blocks)) ??
    [];
  const firstIncompletePageIndex = pageRequiredVideoBlockIds.findIndex((ids) =>
    ids.some((blockId) => !completedVideoBlockIds[blockId]),
  );
  const selectedPageRequiredVideoBlockIds =
    selectedCoursePageIndex >= 0
      ? (pageRequiredVideoBlockIds[selectedCoursePageIndex] ?? [])
      : [];
  const incompleteSelectedPageVideoCount =
    selectedPageRequiredVideoBlockIds.filter(
      (blockId) => !completedVideoBlockIds[blockId],
    ).length;
  const hasIncompleteRequiredVideos = firstIncompletePageIndex >= 0;
  const isQuizLocked = Boolean(quiz && hasIncompleteRequiredVideos);
  const isCompleteDisabled =
    completeModule.isPending ||
    Boolean(quiz && !quizAnswerId) ||
    hasIncompleteRequiredVideos;

  function handleVideoComplete(blockId: string) {
    setCompletedVideoBlockIds((currentIds) => ({
      ...currentIds,
      [blockId]: true,
    }));
  }

  function handleComplete() {
    completeModule.mutate(
      { moduleId, quizAnswerId: quiz ? quizAnswerId : undefined },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: trpc.training.myTraining.queryOptions().queryKey,
            }),
            queryClient.invalidateQueries({
              queryKey: trpc.training.getModule.queryOptions({ moduleId })
                .queryKey,
            }),
          ]);
          toast(t("moduleCompleted"));
        },
        onError: (error) => {
          toast(error.message || t("moduleCompleteFailed"), "error");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/training"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToTraining")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary">
            {module.title}
          </h1>
          {module.description ? (
            <p className="mt-1 text-sm text-text-secondary">
              {module.description}
            </p>
          ) : null}
        </div>
        {module.isComplete ? (
          <Badge variant="accent">{t("statusComplete")}</Badge>
        ) : null}
      </div>

      <Card className="p-5">
        {course ? (
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              {course.pages.map((page, index) => {
                const isPageLocked =
                  firstIncompletePageIndex >= 0 &&
                  index > firstIncompletePageIndex;

                return (
                  <button
                    key={page.id}
                    type="button"
                    disabled={isPageLocked}
                    onClick={() => setSelectedCoursePageId(page.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      page.id === selectedCoursePage?.id
                        ? "bg-accent-light text-text-primary"
                        : "bg-bg-muted text-text-secondary hover:text-text-primary disabled:hover:text-text-secondary"
                    }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      {t("pageNumber", { number: index + 1 })}
                    </span>
                    <span className="block truncate font-medium">
                      {page.title}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="min-w-0">
              {selectedCoursePage ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {selectedCoursePage.title}
                  </h2>
                  <BlockNoteCourseContent
                    blocks={selectedCoursePage.blocks}
                    onVideoComplete={handleVideoComplete}
                  />
                  {incompleteSelectedPageVideoCount > 0 ? (
                    <p className="rounded-xl bg-bg-muted px-3 py-2 text-sm font-medium text-text-secondary">
                      {t("requiredVideosRemaining", {
                        count: incompleteSelectedPageVideoCount,
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-text-primary">
            {renderContent(module.content) ?? (
            <p className="text-sm text-text-secondary">
              {t("moduleNoContent")}
            </p>
            )}
          </div>
        )}

        {module.guide ? (
          <Link
            href={`/teams/${module.guide.teamId}/guides/${module.guide.id}`}
            className="mt-5 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-muted"
          >
            <BookOpen className="h-4 w-4 text-accent" />
            {t("openGuide", { title: module.guide.title })}
          </Link>
        ) : null}
      </Card>

      {quiz ? (
        <Card className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light text-accent">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                {t("knowledgeCheck")}
              </h2>
              <p className="text-sm text-text-secondary">{quiz.question}</p>
            </div>
          </div>
          {isQuizLocked ? (
            <p className="mb-3 rounded-xl bg-bg-muted px-3 py-2 text-sm font-medium text-text-secondary">
              {t("requiredVideosRemaining", {
                count: pageRequiredVideoBlockIds
                  .flat()
                  .filter((blockId) => !completedVideoBlockIds[blockId]).length,
              })}
            </p>
          ) : null}
          <div className="space-y-2">
            {quiz.answers.map((answer) => (
              <label
                key={answer.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  quizAnswerId === answer.id
                    ? "border-accent bg-accent-light/40 text-text-primary"
                    : "border-border bg-bg-muted text-text-secondary hover:bg-bg-page"
                } ${isQuizLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="quiz-answer"
                  value={answer.id}
                  checked={quizAnswerId === answer.id}
                  disabled={isQuizLocked}
                  onChange={() => setQuizAnswerId(answer.id)}
                  className="h-4 w-4 accent-accent"
                />
                <span>{answer.text}</span>
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <div className="text-right">
          {hasIncompleteRequiredVideos ? (
            <p className="mb-2 text-xs font-medium text-text-secondary">
              {t("requiredVideosRemaining", {
                count: pageRequiredVideoBlockIds
                  .flat()
                  .filter((blockId) => !completedVideoBlockIds[blockId]).length,
              })}
            </p>
          ) : null}
          <Button
            type="button"
            variant={module.isComplete ? "secondary" : "primary"}
            onClick={handleComplete}
            disabled={isCompleteDisabled}
          >
            <CheckCircle2 className="h-4 w-4" />
            {module.isComplete
              ? t("markCompleteAgain")
              : completeModule.isPending
                ? t("completing")
                : t("markComplete")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderContent(content: unknown) {
  if (!content) return null;

  if (typeof content === "string") {
    return <p>{content}</p>;
  }

  if (
    typeof content === "object" &&
    !Array.isArray(content) &&
    "text" in content &&
    typeof content.text === "string"
  ) {
    return <p>{content.text}</p>;
  }

  return null;
}

type Quiz = {
  question: string;
  answers: Array<{ id: string; text: string }>;
};

function parseQuiz(quiz: unknown): Quiz | null {
  if (!quiz || typeof quiz !== "object" || Array.isArray(quiz)) return null;
  if (!("question" in quiz) || typeof quiz.question !== "string") return null;
  if (!("answers" in quiz) || !Array.isArray(quiz.answers)) return null;

  const answers = quiz.answers
    .map((answer) => {
      if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
        return null;
      }
      if (!("id" in answer) || typeof answer.id !== "string") return null;
      if (!("text" in answer) || typeof answer.text !== "string") return null;
      return { id: answer.id, text: answer.text };
    })
    .filter((answer): answer is Quiz["answers"][number] => Boolean(answer));

  if (answers.length < 2) return null;

  return {
    question: quiz.question,
    answers,
  };
}

type Course = {
  pages: Array<{
    id: string;
    title: string;
    blocks: BlockNoteBlock[];
  }>;
};

type BlockNoteBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content: unknown;
  children: BlockNoteBlock[];
};

function parseCourse(content: unknown): Course | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return null;
  }
  if (!("type" in content) || content.type !== "blocknoteCourse") return null;
  if (!("pages" in content) || !Array.isArray(content.pages)) return null;

  const pages = content.pages
    .map((page): Course["pages"][number] | null => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return null;
      if (!("id" in page) || typeof page.id !== "string") return null;
      if (!("title" in page) || typeof page.title !== "string") return null;
      if (!("blocks" in page) || !Array.isArray(page.blocks)) return null;

      const rawBlocks: unknown[] = page.blocks;
      const blocks = rawBlocks
        .map((block): BlockNoteBlock | null => parseBlockNoteBlock(block))
        .filter((block): block is BlockNoteBlock => Boolean(block));

      return { id: page.id, title: page.title, blocks };
    })
    .filter((page): page is Course["pages"][number] => Boolean(page));

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

function BlockNoteCourseContent({
  blocks,
  onVideoComplete,
}: {
  blocks: BlockNoteBlock[];
  onVideoComplete: (blockId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <BlockNoteBlockView
          key={block.id}
          block={block}
          onVideoComplete={onVideoComplete}
        />
      ))}
    </div>
  );
}

function BlockNoteBlockView({
  block,
  onVideoComplete,
}: {
  block: BlockNoteBlock;
  onVideoComplete: (blockId: string) => void;
}) {
  const text = blockNoteInlineText(block.content);
  const blockUrl =
    typeof block.props.url === "string" ? block.props.url : "";
  const blockCaption =
    typeof block.props.caption === "string" ? block.props.caption : "";
  const children =
    block.children.length > 0 ? (
      <div className="ml-5 mt-2 space-y-2">
        {block.children.map((child) => (
          <BlockNoteBlockView
            key={child.id}
            block={child}
            onVideoComplete={onVideoComplete}
          />
        ))}
      </div>
    ) : null;

  if (block.type === "heading") {
    return (
      <div>
        <h3 className="text-xl font-semibold text-text-primary">{text}</h3>
        {children}
      </div>
    );
  }
  if (block.type === "bulletListItem" || block.type === "checkListItem") {
    return (
      <div>
        <div className="flex gap-2 text-sm leading-6 text-text-primary">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{text}</span>
        </div>
        {children}
      </div>
    );
  }
  if (block.type === "numberedListItem") {
    return (
      <div>
        <div className="text-sm leading-6 text-text-primary">{text}</div>
        {children}
      </div>
    );
  }
  if (block.type === "quote") {
    return (
      <div className="border-l-2 border-accent/40 pl-4 text-sm leading-6 text-text-primary">
        {text}
        {children}
      </div>
    );
  }
  if (block.type === "video") {
    const startTime =
      typeof block.props.startTime === "number" ? block.props.startTime : 0;
    const endTime =
      typeof block.props.endTime === "number" ? block.props.endTime : undefined;
    const duration =
      typeof block.props.duration === "number" ? block.props.duration : undefined;
    const blockName =
      typeof block.props.name === "string" ? block.props.name : "";
    const youtubeVideoId = getYouTubeVideoId(blockUrl);
    if (youtubeVideoId) {
      return (
        <YouTubeTrainingPlayer
          caption={blockCaption}
          duration={duration}
          endTime={endTime}
          onComplete={() => onVideoComplete(block.id)}
          startTime={startTime}
          title={blockName}
          videoId={youtubeVideoId}
        />
      );
    }
    if (blockUrl) {
      return (
        <a
          href={blockUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-border p-4 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-muted"
        >
          {blockCaption || blockUrl}
        </a>
      );
    }
  }
  if (!text && !children) return null;

  return (
    <div>
      {text ? (
        <p className="whitespace-pre-line text-sm leading-6 text-text-primary">
          {text}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function collectRequiredVideoBlockIdsIn(blocks: BlockNoteBlock[]): string[] {
  return blocks.flatMap((block) => {
    const childIds = collectRequiredVideoBlockIdsIn(block.children);
    if (block.type === "video" && block.props.requiresCompletion === true) {
      return [block.id, ...childIds];
    }
    return childIds;
  });
}

function blockNoteInlineText(content: unknown): string {
  if (typeof content === "string") return content;
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
    .join("");
}
