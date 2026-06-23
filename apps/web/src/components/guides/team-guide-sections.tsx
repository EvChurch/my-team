"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ClipboardCheck,
  GripVertical,
  Plus,
  Rocket,
  Trash2,
  Wrench,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

type TeamGuide = {
  id: string;
  title: string;
  category: "QUICK_START" | "TROUBLESHOOTING" | "SOP";
  sectionId: string | null;
  sortOrder: number;
  role: { name: string | null } | null;
};

type GuideSection = {
  id: string;
  title: string;
  sortOrder: number;
};

type TeamGuideSectionsProps = {
  teamId: string;
  guides: TeamGuide[];
  sections: GuideSection[];
  isLeader: boolean;
  isArranging: boolean;
};

const sectionSortablePrefix = "section:";
const guideSortablePrefix = "guide:";

type GuideListItem =
  | { id: string; type: "section"; section: GuideSection }
  | { id: string; type: "guide"; guide: TeamGuide };

function guideSortableId(guideId: string) {
  return `${guideSortablePrefix}${guideId}`;
}

function sectionSortableId(sectionId: string) {
  return `${sectionSortablePrefix}${sectionId}`;
}

function sectionIdFromSortableId(id: string) {
  return id.startsWith(sectionSortablePrefix)
    ? id.slice(sectionSortablePrefix.length)
    : null;
}

function guideIdFromSortableId(id: string) {
  return id.startsWith(guideSortablePrefix)
    ? id.slice(guideSortablePrefix.length)
    : null;
}

function guideSectionId(guide: TeamGuide) {
  return guide.sectionId ?? null;
}

function sortGuides(guides: TeamGuide[]) {
  return [...guides].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

function sortSections(sections: GuideSection[]) {
  return [...sections].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

function buildGuideListItems(
  guides: TeamGuide[],
  sections: GuideSection[],
  isLeader: boolean,
): GuideListItem[] {
  const validSectionIds = new Set(sections.map((section) => section.id));
  const items: GuideListItem[] = sortGuides(
    guides.filter((guide) => {
      const sectionId = guideSectionId(guide);
      return !sectionId || !validSectionIds.has(sectionId);
    }),
  ).map((guide) => ({
    id: guideSortableId(guide.id),
    type: "guide",
    guide,
  }));

  for (const section of sortSections(sections)) {
    const sectionGuides = sortGuides(
      guides.filter((guide) => guideSectionId(guide) === section.id),
    );
    if (isLeader || sectionGuides.length > 0) {
      items.push({
        id: sectionSortableId(section.id),
        type: "section",
        section,
      });
    }
    items.push(
      ...sectionGuides.map((guide) => ({
        id: guideSortableId(guide.id),
        type: "guide" as const,
        guide,
      })),
    );
  }

  return items;
}

function guideOrderUpdates(items: GuideListItem[]) {
  let currentSectionId: string | null = null;
  const sortOrders = new Map<string | null, number>();

  return items.flatMap((item) => {
    if (item.type === "section") {
      currentSectionId = item.section.id;
      return [];
    }

    const sortOrder = sortOrders.get(currentSectionId) ?? 0;
    sortOrders.set(currentSectionId, sortOrder + 1);

    return {
      guideId: item.guide.id,
      sectionId: currentSectionId,
      sortOrder,
    };
  });
}

function sectionOrderUpdates(items: GuideListItem[]) {
  return items
    .filter((item): item is Extract<GuideListItem, { type: "section" }> =>
      item.type === "section"
    )
    .map((item, sortOrder) => ({
      sectionId: item.section.id,
      sortOrder,
    }));
}

function guidesFromItems(items: GuideListItem[]) {
  const updates = guideOrderUpdates(items);
  const updateByGuideId = new Map(
    updates.map((update) => [update.guideId, update]),
  );

  return items.flatMap((item) => {
    if (item.type !== "guide") return [];
    const update = updateByGuideId.get(item.guide.id);
    return {
      ...item.guide,
      sectionId: update?.sectionId ?? null,
      sortOrder: update?.sortOrder ?? item.guide.sortOrder,
    };
  });
}

function sectionsFromItems(items: GuideListItem[]) {
  return sectionOrderUpdates(items).flatMap((update) => {
    const item = items.find(
      (candidate): candidate is Extract<GuideListItem, { type: "section" }> =>
        candidate.type === "section" &&
        candidate.section.id === update.sectionId,
    );
    return item ? { ...item.section, sortOrder: update.sortOrder } : [];
  });
}

export function TeamGuideSections({
  teamId,
  guides,
  sections,
  isLeader,
  isArranging,
}: TeamGuideSectionsProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useTranslations("Teams");
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [localGuides, setLocalGuides] = useState<TeamGuide[] | null>(null);
  const [localSections, setLocalSections] = useState<GuideSection[] | null>(
    null,
  );
  const displayedGuides = localGuides ?? guides;
  const displayedSections = localSections ?? sections;
  const canArrange = isLeader && isArranging;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const invalidateTeam = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.teams.get.queryOptions({ teamId }).queryKey,
    });

  const createSectionMutation = useMutation(
    trpc.guides.createSection.mutationOptions({
      onSuccess: () => {
        toast(t("guideSectionAdded"));
        invalidateTeam();
      },
      onError: () => toast(t("guideSectionSaveFailed"), "error"),
    }),
  );

  const updateSectionMutation = useMutation(
    trpc.guides.updateSection.mutationOptions({
      onSuccess: () => {
        setEditingSectionId(null);
        setEditingTitle("");
        invalidateTeam();
      },
      onError: () => toast(t("guideSectionSaveFailed"), "error"),
    }),
  );

  const deleteSectionMutation = useMutation(
    trpc.guides.deleteSection.mutationOptions({
      onSuccess: () => {
        toast(t("guideSectionDeleted"));
        invalidateTeam();
      },
      onError: () => toast(t("guideSectionSaveFailed"), "error"),
    }),
  );

  const updateSectionOrderMutation = useMutation(
    trpc.guides.updateSectionOrder.mutationOptions({
      onSuccess: async () => {
        await invalidateTeam();
        setLocalSections(null);
      },
      onError: () => {
        setLocalSections(null);
        toast(t("guideSectionSaveFailed"), "error");
      },
    }),
  );

  const updateGuideOrderMutation = useMutation(
    trpc.guides.updateOrder.mutationOptions({
      onSuccess: async () => {
        await invalidateTeam();
        setLocalGuides(null);
      },
      onError: () => {
        setLocalGuides(null);
        toast(t("guideMoveFailed"), "error");
      },
    }),
  );

  const listItems = useMemo(
    () => buildGuideListItems(displayedGuides, displayedSections, isLeader),
    [displayedGuides, displayedSections, isLeader],
  );

  const activeGuide = activeGuideId
    ? displayedGuides.find((guide) => guide.id === activeGuideId)
    : null;
  const activeSection = activeSectionId
    ? displayedSections.find((section) => section.id === activeSectionId)
    : null;

  function handleCreateSection() {
    createSectionMutation.mutate({ teamId, title: t("untitledSection") });
  }

  function startRename(section: GuideSection) {
    setEditingSectionId(section.id);
    setEditingTitle(section.title);
  }

  function handleRename(sectionId: string) {
    const title = editingTitle.trim();
    if (!title) return;
    updateSectionMutation.mutate({ teamId, sectionId, title });
  }

  function handleDeleteSection(section: GuideSection) {
    deleteSectionMutation.mutate({ teamId, sectionId: section.id });
  }

  function handleDragStart(event: DragStartEvent) {
    if (!canArrange) return;
    const activeId = String(event.active.id);
    const sectionId = sectionIdFromSortableId(activeId);

    if (sectionId) {
      setActiveSectionId(sectionId);
      return;
    }

    setActiveGuideId(guideIdFromSortableId(activeId));
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canArrange) return;
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    const activeItem = listItems.find((item) => item.id === activeId);

    setActiveGuideId(null);
    setActiveSectionId(null);

    if (!activeItem || !overId || activeId === overId) {
      return;
    }

    const oldIndex = listItems.findIndex((item) => item.id === activeId);
    const newIndex = listItems.findIndex((item) => item.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextItems = arrayMove(listItems, oldIndex, newIndex);
    const nextGuides = guidesFromItems(nextItems);
    setLocalGuides(nextGuides);

    updateGuideOrderMutation.mutate({
      teamId,
      guides: guideOrderUpdates(nextItems),
    });

    if (activeItem.type === "section") {
      const nextSections = sectionsFromItems(nextItems);
      setLocalSections(nextSections);
      updateSectionOrderMutation.mutate({
        teamId,
        sections: sectionOrderUpdates(nextItems),
      });
    }
  }

  const content = (
    <div className="space-y-3">
      <SortableContext
        items={listItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {listItems.length > 0 ? (
            listItems.map((item) =>
              item.type === "section" ? (
                <SortableSectionDivider
                  key={item.id}
                  section={item.section}
                  editingSectionId={editingSectionId}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  canArrange={canArrange}
                  onStartRename={startRename}
                  onCancelRename={() => {
                    setEditingSectionId(null);
                    setEditingTitle("");
                  }}
                  onRename={handleRename}
                  onDeleteSection={handleDeleteSection}
                />
              ) : (
                <SortableGuideRow
                  key={item.id}
                  guide={item.guide}
                  href={`/teams/${teamId}/guides/${item.guide.id}`}
                  canArrange={canArrange}
                />
              ),
            )
          ) : (
            <div className="flex min-h-[64px] items-center rounded-xl px-3 py-3">
              <span className="text-xs font-medium text-text-tertiary">
                {t("dropGuidesHere")}
              </span>
            </div>
          )}
        </div>
      </SortableContext>

      {isLeader && (
        <div
          className={`pt-1 transition-[opacity,transform] duration-200 ${
            canArrange
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={handleCreateSection}
            disabled={createSectionMutation.isPending}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-accent transition-colors hover:bg-accent-light/25 disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t("addGuideSection")}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => {
        setActiveGuideId(null);
        setActiveSectionId(null);
      }}
      onDragEnd={handleDragEnd}
    >
      {content}
      <DragOverlay>
        {activeGuide ? (
          <div className="rounded-xl border border-border bg-bg-card px-3 py-3 shadow-[var(--shadow-card)]">
            <GuideRowContent guide={activeGuide} showHandle />
          </div>
        ) : activeSection ? (
          <div className="rounded-2xl border border-border bg-bg-card px-3 py-2.5 shadow-[var(--shadow-card)]">
            <SectionTitle title={activeSection.title} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableSectionDivider({
  section,
  canArrange,
  editingSectionId,
  editingTitle,
  setEditingTitle,
  onStartRename,
  onCancelRename,
  onRename,
  onDeleteSection,
}: {
  section: GuideSection;
  canArrange: boolean;
  editingSectionId: string | null;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  onStartRename: (section: GuideSection) => void;
  onCancelRename: () => void;
  onRename: (sectionId: string) => void;
  onDeleteSection: (section: GuideSection) => void;
}) {
  const t = useTranslations("Teams");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionSortableId(section.id),
    data: { type: "section", sectionId: section.id },
    disabled: !canArrange,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex min-h-[44px] items-center border-b border-border/70 px-3 py-1.5 transition-colors hover:bg-bg-muted/30 ${
        canArrange ? "gap-2" : "gap-0"
      } ${
        isDragging ? "relative z-20 opacity-40" : ""
      }`}
    >
      <span
        className={`inline-flex h-8 shrink-0 overflow-hidden transition-all duration-200 ${
          canArrange
            ? "w-8 scale-100 opacity-100"
            : "pointer-events-none w-0 scale-90 opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label={section.title}
          className="inline-flex h-8 w-8 shrink-0 touch-none items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-muted hover:text-text-primary"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </span>
      {canArrange && editingSectionId === section.id ? (
        <input
          value={editingTitle}
          onChange={(event) => setEditingTitle(event.target.value)}
          onBlur={() => {
            const title = editingTitle.trim();
            if (title && title !== section.title) {
              onRename(section.id);
              return;
            }
            onCancelRename();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onRename(section.id);
            if (event.key === "Escape") onCancelRename();
          }}
          className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-text-primary shadow-none outline-none ring-0 focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0"
          autoFocus
        />
      ) : canArrange ? (
        <button
          type="button"
          className="min-w-0 flex-1 cursor-text truncate bg-transparent p-0 text-left text-sm font-semibold text-text-primary outline-none ring-0 focus:outline-none focus:ring-0"
          onClick={() => onStartRename(section)}
        >
          {section.title}
        </button>
      ) : (
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
          {section.title}
        </h3>
      )}
      <div
        className={`flex shrink-0 items-center gap-1 overflow-hidden transition-all duration-200 ${
          canArrange
            ? "w-8 scale-100 opacity-100"
            : "pointer-events-none w-0 scale-90 opacity-0"
        }`}
      >
        <IconButton
          label={t("deleteSection")}
          onClick={() => onDeleteSection(section)}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <GripVertical className="h-4 w-4 shrink-0 text-text-tertiary" />
      <span className="truncate text-sm font-semibold text-text-primary">
        {title}
      </span>
    </div>
  );
}

function SortableGuideRow({
  guide,
  href,
  canArrange,
}: {
  guide: TeamGuide;
  href: string;
  canArrange: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: guideSortableId(guide.id),
    data: { type: "guide", sectionId: guideSectionId(guide) },
    disabled: !canArrange,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex min-h-[64px] items-stretch rounded-xl border border-transparent transition-[background-color,border-color,box-shadow] hover:border-border hover:bg-bg-muted/30 hover:shadow-md ${
        isDragging ? "relative z-20 opacity-40" : ""
      }`}
    >
      <span
        className={`my-3 inline-flex h-8 shrink-0 overflow-hidden transition-[width,opacity,transform] duration-200 ${
          canArrange
            ? "mr-2 w-8 scale-100 opacity-100"
            : "mr-0 w-0 scale-95 opacity-0"
        }`}
      >
        <button
          type="button"
          className="inline-flex h-8 w-8 touch-none items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-muted hover:text-text-primary"
          aria-label={guide.title}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </span>
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center px-3 py-3"
      >
        <GuideRowContent guide={guide} />
      </Link>
    </div>
  );
}

function GuideRowContent({
  guide,
  showHandle = false,
}: {
  guide: TeamGuide;
  showHandle?: boolean;
}) {
  const GuideIcon =
    guide.category === "QUICK_START"
      ? Rocket
      : guide.category === "TROUBLESHOOTING"
        ? Wrench
        : ClipboardCheck;

  return (
    <div className="flex items-center gap-2">
      {showHandle && (
        <GripVertical className="h-4 w-4 shrink-0 text-text-tertiary" />
      )}
      <GuideIcon className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {guide.title}
        </p>
        {guide.role && (
          <p className="text-xs text-text-secondary">{guide.role.name}</p>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
