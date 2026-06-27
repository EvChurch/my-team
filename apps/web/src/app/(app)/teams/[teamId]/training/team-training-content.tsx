"use client";

import { useRef, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  ClipboardCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { useTRPC } from "@mt/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

type TeamTrainingContentProps = {
  teamId: string;
  mode?: "overview" | "manage";
  showBackLink?: boolean;
  showHeader?: boolean;
};

export function TeamTrainingContent({
  teamId,
  mode = "manage",
  showBackLink = true,
  showHeader = true,
}: TeamTrainingContentProps) {
  const trpc = useTRPC();
  const t = useTranslations("TrainingAdmin");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data } = useSuspenseQuery(
    trpc.training.teamManagement.queryOptions({ teamId }),
  );
  const [isLibraryWorkspaceOpen, setIsLibraryWorkspaceOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.training.teamManagement.queryOptions({ teamId }).queryKey,
    });

  const addTeamModule = useMutation(
    trpc.training.addTeamOnboardingModule.mutationOptions(),
  );
  const addRoleModule = useMutation(
    trpc.training.addRoleOnboardingModule.mutationOptions(),
  );
  const createModule = useMutation(
    trpc.training.createTeamModule.mutationOptions(),
  );
  const removeRequirement = useMutation(
    trpc.training.removeRequirement.mutationOptions(),
  );

  const isManaging = mode === "manage";
  const [selectedScopeId, setSelectedScopeId] = useState("team");
  const selectedPositionId = selectedScopeId.startsWith("role:")
    ? selectedScopeId.slice("role:".length)
    : null;
  const selectedPosition =
    data.team.positions.find((position) => position.id === selectedPositionId) ??
    null;
  const selectedRequirements = selectedPositionId
    ? data.roleRequirements.filter(
        (requirement) => requirement.positionId === selectedPositionId,
      )
    : data.teamRequirements;
  const selectedAvailableModules = selectedPositionId
    ? (data.availableForRoles[selectedPositionId] ?? [])
    : data.availableForTeam;
  const selectedScopeTitle = selectedPosition
    ? (selectedPosition.name ?? t("unnamedRole"))
    : t("defaultTeamScope");

  function handleAddTeamModule(moduleId: string) {
    addTeamModule.mutate(
      { teamId, moduleId },
      {
        onSuccess: async () => {
          setIsLibraryWorkspaceOpen(false);
          await invalidate();
          toast(t("teamModuleAdded"));
        },
        onError: () => toast(t("moduleAddFailed"), "error"),
      },
    );
  }

  function handleAddRoleModule(positionId: string, moduleId: string) {
    addRoleModule.mutate(
      { teamId, positionId, moduleId },
      {
        onSuccess: async () => {
          setIsLibraryWorkspaceOpen(false);
          await invalidate();
          toast(t("roleModuleAdded"));
        },
        onError: () => toast(t("moduleAddFailed"), "error"),
      },
    );
  }

  function handleRemoveRequirement(requirementId: string) {
    removeRequirement.mutate(
      { teamId, requirementId },
      {
        onSuccess: async () => {
          await invalidate();
          toast(t("requirementRemoved"));
        },
        onError: () => toast(t("requirementRemoveFailed"), "error"),
      },
    );
  }

  function handleAddModule(moduleId: string) {
    if (selectedPositionId) {
      handleAddRoleModule(selectedPositionId, moduleId);
      return;
    }

    handleAddTeamModule(moduleId);
  }

  function handleCreateModule(input: CourseBuilderInput) {
    createModule.mutate(
      {
        teamId,
        title: input.title,
        description: input.description || undefined,
        content: {
          type: "course",
          pages: input.pages,
        },
        completionMode: "ACKNOWLEDGE",
        expiryBehavior: "BLOCKING",
      },
      {
        onSuccess: (module) => handleAddModule(module.id),
        onError: () => toast(t("moduleCreateFailed"), "error"),
      },
    );
  }

  if (isManaging) {
    return (
      <div className="space-y-5">
        {showBackLink ? (
          <Link
            href={`/teams/${teamId}?tab=training`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToTeam")}
          </Link>
        ) : null}

        {showHeader ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-text-primary">
                {t("title", { team: data.team.name })}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                {t("managementSubtitle")}
              </p>
            </div>
            <Badge variant="accent">{t("leaderOnly")}</Badge>
          </div>
        ) : null}

        {isLibraryWorkspaceOpen ? (
          <TrainingLibraryWorkspace
            title={t("addTrainingToScope", { scope: selectedScopeTitle })}
            scopeTitle={selectedScopeTitle}
            createHref={`/teams/${teamId}/training/course/new${
              selectedPositionId ? `?positionId=${selectedPositionId}` : ""
            }`}
            modules={selectedAvailableModules}
            onBack={() => setIsLibraryWorkspaceOpen(false)}
            onAdd={handleAddModule}
            onCreate={handleCreateModule}
            isAdding={
              addTeamModule.isPending ||
              addRoleModule.isPending ||
              createModule.isPending
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="p-3">
              <div className="px-1 pb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {t("trainingScopes")}
                </h2>
              </div>
              <div className="space-y-1.5">
                <TrainingScopeButton
                  active={selectedScopeId === "team"}
                  title={t("defaultTeamScope")}
                  description={t("everyoneOnTeam")}
                  moduleCount={data.teamRequirements.length}
                  onClick={() => setSelectedScopeId("team")}
                />
                {data.team.positions.map((position) => {
                  const requirements = data.roleRequirements.filter(
                    (requirement) => requirement.positionId === position.id,
                  );

                  return (
                    <TrainingScopeButton
                      key={position.id}
                      active={selectedScopeId === `role:${position.id}`}
                      title={position.name ?? t("unnamedRole")}
                      description={t("roleMemberCount", {
                        count: position.assignments.length,
                      })}
                      moduleCount={requirements.length}
                      onClick={() => setSelectedScopeId(`role:${position.id}`)}
                    />
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {selectedScopeTitle}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {selectedPositionId
                      ? t("roleScopeDesc")
                      : t("teamScopeDesc")}
                  </p>
                </div>
                <Badge variant="muted">
                  {t("moduleCount", { count: selectedRequirements.length })}
                </Badge>
              </div>

              {selectedRequirements.length > 0 ? (
                <div className="space-y-2">
                  {selectedRequirements.map((requirement) => (
                    <RequirementRow
                      key={requirement.id}
                      title={requirement.module.title}
                      subtitle={
                        selectedPositionId
                          ? t("roleSpecific")
                          : t("everyoneOnTeam")
                      }
                      blocking={requirement.module.expiryBehavior === "BLOCKING"}
                      onRemove={() => handleRemoveRequirement(requirement.id)}
                      removeLabel={t("removeRequirement")}
                      removing={removeRequirement.isPending}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title={t("noTrainingForScope")}
                  description={t("noTrainingForScopeDesc")}
                  className="py-6"
                />
              )}

              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => setIsLibraryWorkspaceOpen(true)}
                  disabled={addTeamModule.isPending || addRoleModule.isPending}
                >
                  <Plus className="h-4 w-4" />
                  {t("addTraining")}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }


  return null;
}

function RequirementRow({
  title,
  subtitle,
  blocking,
  onRemove,
  removeLabel,
  removing,
}: {
  title: string;
  subtitle: string;
  blocking: boolean;
  onRemove?: () => void;
  removeLabel: string;
  removing: boolean;
}) {
  const t = useTranslations("TrainingAdmin");

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-bg-muted px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={blocking ? "warning" : "muted"}>
          {blocking ? t("blockingBadge") : t("nonBlockingBadge")}
        </Badge>
        {onRemove ? (
          <button
            type="button"
            aria-label={removeLabel}
            title={removeLabel}
            onClick={onRemove}
            disabled={removing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-page hover:text-error disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

type LibraryModule = {
  id: string;
  title: string;
  description: string | null;
  completionMode: "ACKNOWLEDGE" | "QUIZ_ATTEMPT" | "QUIZ_PASS";
  expiryDays: number | null;
};

type CourseBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "callout"; text: string }
  | { id: string; type: "checklist"; items: string[] }
  | { id: string; type: "video"; title: string; url: string }
  | { id: string; type: "resource"; title: string; url: string }
  | {
      id: string;
      type: "quiz";
      questions: QuizQuestion[];
    };

type QuizQuestion = {
  id: string;
  prompt: string;
  mode: "single" | "multiple";
  options: QuizOption[];
};

type QuizOption = {
  id: string;
  text: string;
  correct: boolean;
};

type CoursePage = {
  id: string;
  title: string;
  blocks: CourseBlock[];
};

type CourseBuilderInput = {
  title: string;
  description: string;
  pages: CoursePage[];
};

const blockTypes: CourseBlock["type"][] = [
  "heading",
  "paragraph",
  "callout",
  "checklist",
  "video",
  "resource",
  "quiz",
];

const blockLabelKey: Record<CourseBlock["type"], string> = {
  heading: "headingBlock",
  paragraph: "paragraphBlock",
  callout: "calloutBlock",
  checklist: "checklistBlock",
  video: "videoBlock",
  resource: "resourceBlock",
  quiz: "quizBlock",
};

function blockHasContent(block: CourseBlock) {
  if (
    block.type === "heading" ||
    block.type === "paragraph" ||
    block.type === "callout"
  ) {
    return block.text.trim().length > 0;
  }
  if (block.type === "checklist") {
    return block.items.some((item) => item.trim().length > 0);
  }
  if (block.type === "video" || block.type === "resource") {
    return block.title.trim().length > 0 || block.url.trim().length > 0;
  }
  return block.questions.some(
    (question) =>
      question.prompt.trim().length > 0 ||
      question.options.some((option) => option.text.trim().length > 0),
  );
}

function TrainingLibraryWorkspace({
  title,
  scopeTitle,
  createHref,
  modules,
  onBack,
  onAdd,
  onCreate,
  isAdding,
}: {
  title: string;
  scopeTitle: string;
  createHref: string;
  modules: LibraryModule[];
  onBack: () => void;
  onAdd: (moduleId: string) => void;
  onCreate: (input: CourseBuilderInput) => void;
  isAdding: boolean;
}) {
  const t = useTranslations("TrainingAdmin");
  const [workspaceMode, setWorkspaceMode] = useState<"library" | "create">(
    "library",
  );
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [pages, setPages] = useState<CoursePage[]>([
    {
      id: "page-1",
      title: t("firstPageTitle"),
      blocks: [{ id: "block-1", type: "paragraph", text: "" }],
    },
  ]);
  const [selectedPageId, setSelectedPageId] = useState("page-1");
  const idCounter = useRef(1);
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];

  function nextId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  function createQuizOption(correct = false): QuizOption {
    return { id: nextId("option"), text: "", correct };
  }

  function createQuizQuestion(): QuizQuestion {
    return {
      id: nextId("question"),
      prompt: "",
      mode: "single",
      options: [createQuizOption(true), createQuizOption(false)],
    };
  }

  function updatePageTitle(pageId: string, value: string) {
    setPages((current) =>
      current.map((page) =>
        page.id === pageId ? { ...page, title: value } : page,
      ),
    );
  }

  function updateBlock(
    pageId: string,
    blockId: string,
    updater: (block: CourseBlock) => CourseBlock,
  ) {
    setPages((current) =>
      current.map((page) =>
        page.id === pageId
          ? {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === blockId ? updater(block) : block,
              ),
            }
          : page,
      ),
    );
  }

  function addPage() {
    const pageId = nextId("page");
    setPages((current) => [
      ...current,
      {
        id: pageId,
        title: t("newPageTitle", { number: current.length + 1 }),
        blocks: [{ id: nextId("block"), type: "paragraph", text: "" }],
      },
    ]);
    setSelectedPageId(pageId);
  }

  function createBlock(type: CourseBlock["type"]): CourseBlock {
    const id = nextId("block");
    if (type === "heading") return { id, type, text: "" };
    if (type === "paragraph") return { id, type, text: "" };
    if (type === "callout") return { id, type, text: "" };
    if (type === "checklist") return { id, type, items: [""] };
    if (type === "video") return { id, type, title: "", url: "" };
    if (type === "resource") return { id, type, title: "", url: "" };
    return {
      id,
      type: "quiz",
      questions: [createQuizQuestion()],
    };
  }

  function addBlock(pageId: string, type: CourseBlock["type"]) {
    setPages((current) =>
      current.map((page) =>
        page.id === pageId
          ? {
              ...page,
              blocks: [...page.blocks, createBlock(type)],
            }
          : page,
      ),
    );
  }

  function removeBlock(pageId: string, blockId: string) {
    setPages((current) =>
      current.map((page) =>
        page.id === pageId
          ? {
              ...page,
              blocks:
                page.blocks.length > 1
                  ? page.blocks.filter((block) => block.id !== blockId)
                  : page.blocks,
            }
          : page,
      ),
    );
  }

  function saveCourse() {
    onCreate({
      title: courseTitle.trim(),
      description: courseDescription.trim(),
      pages: pages.map((page) => ({
        ...page,
        title: page.title.trim() || t("untitledPage"),
        blocks: page.blocks.map((block) => ({
          ...block,
          ...(block.type === "heading" ||
          block.type === "paragraph" ||
          block.type === "callout"
            ? { text: block.text.trim() }
            : {}),
          ...(block.type === "checklist"
            ? { items: block.items.map((item) => item.trim()).filter(Boolean) }
            : {}),
          ...(block.type === "video" || block.type === "resource"
            ? { title: block.title.trim(), url: block.url.trim() }
            : {}),
          ...(block.type === "quiz"
            ? {
                questions: block.questions.map((question) => {
                  const options = question.options
                    .map((option) => ({
                      ...option,
                      text: option.text.trim(),
                    }))
                    .filter((option) => option.text.length > 0);
                  const firstCorrectIndex = Math.max(
                    0,
                    options.findIndex((option) => option.correct),
                  );

                  return {
                    ...question,
                    prompt: question.prompt.trim(),
                    options:
                      question.mode === "single"
                        ? options.map((option, index) => ({
                            ...option,
                            correct: index === firstCorrectIndex,
                          }))
                        : options,
                  };
                }),
              }
            : {}),
        })),
      })),
    });
  }

  const canSaveCourse =
    courseTitle.trim().length > 0 &&
    pages.some((page) =>
      page.blocks.some((block) => blockHasContent(block)),
    );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToScope", { scope: scopeTitle })}
      </button>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("libraryChooserDesc")}
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-bg-muted p-1">
            <button
              type="button"
              onClick={() => setWorkspaceMode("library")}
              className={`rounded-[10px] px-3 py-1.5 text-sm font-medium ${
                workspaceMode === "library"
                  ? "bg-bg-card text-text-primary shadow-[var(--shadow-card)]"
                  : "text-text-secondary"
              }`}
            >
              {t("library")}
            </button>
            <Link
              href={createHref}
              className="rounded-[10px] px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              {t("createCourse")}
            </Link>
          </div>
        </div>

        <div className="p-5">
          {workspaceMode === "create" ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {t("courseTitle")}
                  </span>
                  <input
                    value={courseTitle}
                    onChange={(event) => setCourseTitle(event.target.value)}
                    placeholder={t("courseTitlePlaceholder")}
                    className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {t("courseDescription")}
                  </span>
                  <input
                    value={courseDescription}
                    onChange={(event) => setCourseDescription(event.target.value)}
                    placeholder={t("courseDescriptionPlaceholder")}
                    className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="space-y-2">
                  {pages.map((page, index) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setSelectedPageId(page.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        page.id === selectedPage?.id
                          ? "bg-accent-light text-text-primary"
                          : "bg-bg-muted text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        {t("pageNumber", { number: index + 1 })}
                      </span>
                      <span className="block truncate font-medium">
                        {page.title || t("untitledPage")}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addPage}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-light/30"
                  >
                    <Plus className="h-4 w-4" />
                    {t("addPage")}
                  </button>
                </div>

                {selectedPage ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        {t("pageTitle")}
                      </span>
                      <input
                        value={selectedPage.title}
                        onChange={(event) =>
                          updatePageTitle(selectedPage.id, event.target.value)
                        }
                        className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </label>

                    {selectedPage.blocks.map((block) => (
                      <CourseBlockEditor
                        key={block.id}
                        block={block}
                        onChange={(updater) =>
                          updateBlock(selectedPage.id, block.id, updater)
                        }
                        onRemove={() => removeBlock(selectedPage.id, block.id)}
                        createQuizQuestion={createQuizQuestion}
                        createQuizOption={createQuizOption}
                      />
                    ))}

                    <div className="rounded-xl border border-dashed border-border p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        {t("addBlock")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {blockTypes.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => addBlock(selectedPage.id, type)}
                            className="rounded-[10px] border border-border px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-light/30"
                          >
                            {t(blockLabelKey[type])}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={saveCourse}
                  disabled={!canSaveCourse || isAdding}
                >
                  <Plus className="h-4 w-4" />
                  {isAdding ? t("creating") : t("createAndAddCourse")}
                </Button>
              </div>
            </div>
          ) : modules.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="flex min-h-36 flex-col justify-between gap-4 rounded-xl border border-border p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">
                        {module.title}
                      </h3>
                      <Badge variant={module.expiryDays ? "warning" : "muted"}>
                        {module.completionMode === "QUIZ_PASS"
                          ? t("quizRequired")
                          : module.expiryDays
                            ? t("expiresInDays", { days: module.expiryDays })
                            : t("neverExpires")}
                      </Badge>
                    </div>
                    {module.description ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        {module.description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    onClick={() => onAdd(module.id)}
                    disabled={isAdding}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    {isAdding ? t("adding") : t("add")}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpenCheck}
              title={t("noAvailableModules")}
              description={t("noAvailableModulesDesc")}
              className="py-8"
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function TrainingScopeButton({
  active,
  title,
  description,
  moduleCount,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  moduleCount: number;
  onClick: () => void;
}) {
  const t = useTranslations("TrainingAdmin");

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active
          ? "bg-accent-light/60 text-text-primary"
          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-text-secondary">
          {description}
        </span>
      </span>
      <Badge variant={active ? "accent" : "muted"}>
        {t("moduleCount", { count: moduleCount })}
      </Badge>
    </button>
  );
}

function CourseBlockEditor({
  block,
  onChange,
  onRemove,
  createQuizQuestion,
  createQuizOption,
}: {
  block: CourseBlock;
  onChange: (updater: (block: CourseBlock) => CourseBlock) => void;
  onRemove: () => void;
  createQuizQuestion: () => QuizQuestion;
  createQuizOption: (correct?: boolean) => QuizOption;
}) {
  const t = useTranslations("TrainingAdmin");

  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {t(blockLabelKey[block.type])}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-muted hover:text-error"
          aria-label={t("removeBlock")}
          title={t("removeBlock")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {block.type === "heading" ? (
        <input
          value={block.text}
          onChange={(event) =>
            onChange((current) =>
              current.type === "heading"
                ? { ...current, text: event.target.value }
                : current,
            )
          }
          placeholder={t("headingBlockPlaceholder")}
          className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-lg font-semibold text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
        />
      ) : null}

      {block.type === "paragraph" || block.type === "callout" ? (
        <textarea
          value={block.text}
          onChange={(event) =>
            onChange((current) =>
              current.type === block.type
                ? { ...current, text: event.target.value }
                : current,
            )
          }
          placeholder={
            block.type === "callout"
              ? t("calloutBlockPlaceholder")
              : t("paragraphBlockPlaceholder")
          }
          rows={block.type === "callout" ? 3 : 5}
          className="w-full resize-y rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
        />
      ) : null}

      {block.type === "checklist" ? (
        <div className="space-y-2">
          {block.items.map((item, index) => (
            <input
              key={index}
              value={item}
              onChange={(event) =>
                onChange((current) =>
                  current.type === "checklist"
                    ? {
                        ...current,
                        items: current.items.map((existing, itemIndex) =>
                          itemIndex === index ? event.target.value : existing,
                        ),
                      }
                    : current,
                )
              }
              placeholder={t("checklistItemPlaceholder", { number: index + 1 })}
              className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
            />
          ))}
          <button
            type="button"
            onClick={() =>
              onChange((current) =>
                current.type === "checklist"
                  ? { ...current, items: [...current.items, ""] }
                  : current,
              )
            }
            className="rounded-[10px] border border-border px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-light/30"
          >
            {t("addChecklistItem")}
          </button>
        </div>
      ) : null}

      {block.type === "video" || block.type === "resource" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={block.title}
            onChange={(event) =>
              onChange((current) =>
                current.type === block.type
                  ? { ...current, title: event.target.value }
                  : current,
              )
            }
            placeholder={
              block.type === "video" ? t("videoTitle") : t("resourceTitle")
            }
            className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            value={block.url}
            onChange={(event) =>
              onChange((current) =>
                current.type === block.type
                  ? { ...current, url: event.target.value }
                  : current,
              )
            }
            placeholder={block.type === "video" ? t("videoUrl") : t("resourceUrl")}
            className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      ) : null}

      {block.type === "quiz" ? (
        <div className="space-y-3">
          {block.questions.map((question, questionIndex) => (
            <div
              key={question.id}
              className="space-y-3 rounded-xl border border-border bg-bg-page p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {t("quizQuestionNumber", { number: questionIndex + 1 })}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {question.mode === "single"
                      ? t("singleAnswerHint")
                      : t("multipleAnswersHint")}
                  </p>
                </div>
                {block.questions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((current) =>
                        current.type === "quiz"
                          ? {
                              ...current,
                              questions: current.questions.filter(
                                (existing) => existing.id !== question.id,
                              ),
                            }
                          : current,
                      )
                    }
                    className="rounded-[10px] px-2 py-1 text-xs font-semibold text-error hover:bg-error/10"
                  >
                    {t("removeQuestion")}
                  </button>
                ) : null}
              </div>

              <input
                value={question.prompt}
                onChange={(event) =>
                  onChange((current) =>
                    current.type === "quiz"
                      ? {
                          ...current,
                          questions: current.questions.map((existing) =>
                            existing.id === question.id
                              ? { ...existing, prompt: event.target.value }
                              : existing,
                          ),
                        }
                      : current,
                  )
                }
                placeholder={t("quizQuestionPlaceholder")}
                className="w-full rounded-xl bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
              />

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {t("questionType")}
                </span>
                <select
                  value={question.mode}
                  onChange={(event) =>
                    onChange((current) =>
                      current.type === "quiz"
                        ? {
                            ...current,
                            questions: current.questions.map((existing) => {
                              if (existing.id !== question.id) return existing;
                              if (event.target.value === "multiple") {
                                return { ...existing, mode: "multiple" };
                              }
                              const firstCorrectIndex = Math.max(
                                0,
                                existing.options.findIndex(
                                  (option) => option.correct,
                                ),
                              );
                              return {
                                ...existing,
                                mode: "single",
                                options: existing.options.map((option, index) => ({
                                  ...option,
                                  correct: index === firstCorrectIndex,
                                })),
                              };
                            }),
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-xl bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="single">{t("singleAnswer")}</option>
                  <option value="multiple">{t("multipleAnswers")}</option>
                </select>
              </label>

              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <div
                    key={option.id}
                    className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                  >
                    <label className="flex items-center gap-2 rounded-xl bg-bg-card px-3 py-2 text-xs font-semibold text-text-secondary">
                      <input
                        type={question.mode === "single" ? "radio" : "checkbox"}
                        name={`${block.id}-${question.id}`}
                        checked={option.correct}
                        onChange={(event) =>
                          onChange((current) =>
                            current.type === "quiz"
                              ? {
                                  ...current,
                                  questions: current.questions.map(
                                    (existing) => {
                                      if (existing.id !== question.id) {
                                        return existing;
                                      }
                                      return {
                                        ...existing,
                                        options: existing.options.map(
                                          (existingOption) => {
                                            if (
                                              existingOption.id !== option.id
                                            ) {
                                              return question.mode === "single"
                                                ? {
                                                    ...existingOption,
                                                    correct: false,
                                                  }
                                                : existingOption;
                                            }
                                            return {
                                              ...existingOption,
                                              correct:
                                                question.mode === "single"
                                                  ? true
                                                  : event.target.checked,
                                            };
                                          },
                                        ),
                                      };
                                    },
                                  ),
                                }
                              : current,
                          )
                        }
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {t("correctOption")}
                    </label>
                    <input
                      value={option.text}
                      onChange={(event) =>
                        onChange((current) =>
                          current.type === "quiz"
                            ? {
                                ...current,
                                questions: current.questions.map((existing) =>
                                  existing.id === question.id
                                    ? {
                                        ...existing,
                                        options: existing.options.map(
                                          (existingOption) =>
                                            existingOption.id === option.id
                                              ? {
                                                  ...existingOption,
                                                  text: event.target.value,
                                                }
                                              : existingOption,
                                        ),
                                      }
                                    : existing,
                                ),
                              }
                            : current,
                        )
                      }
                      placeholder={t("quizOption", { number: optionIndex + 1 })}
                      className="w-full rounded-xl bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    {question.options.length > 2 ? (
                      <button
                        type="button"
                        onClick={() =>
                          onChange((current) =>
                            current.type === "quiz"
                              ? {
                                  ...current,
                                  questions: current.questions.map((existing) =>
                                    existing.id === question.id
                                      ? {
                                          ...existing,
                                          options: existing.options.filter(
                                            (existingOption) =>
                                              existingOption.id !== option.id,
                                          ),
                                        }
                                      : existing,
                                  ),
                                }
                              : current,
                          )
                        }
                        className="rounded-[10px] px-3 py-2 text-sm font-semibold text-error hover:bg-error/10"
                      >
                        {t("removeOption")}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange((current) =>
                    current.type === "quiz"
                      ? {
                          ...current,
                          questions: current.questions.map((existing) =>
                            existing.id === question.id
                              ? {
                                  ...existing,
                                  options: [
                                    ...existing.options,
                                    createQuizOption(false),
                                  ],
                                }
                              : existing,
                          ),
                        }
                      : current,
                  )
                }
                className="rounded-[10px] border border-border px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-light/30"
              >
                {t("addQuizOption")}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              onChange((current) =>
                current.type === "quiz"
                  ? {
                      ...current,
                      questions: [...current.questions, createQuizQuestion()],
                    }
                  : current,
              )
            }
            className="rounded-[10px] border border-border px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-light/30"
          >
            {t("addQuizQuestion")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
