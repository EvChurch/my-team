"use client";

import { useRef, useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GuideEditor } from "@/components/guides/guide-editor";
import { GuideCategorySelect } from "@/components/guides/guide-category-select";
import { GuideRoleSelect } from "@/components/guides/guide-role-select";
import { MobileCompactGuideHeader } from "@/components/guides/mobile-compact-guide-header";
import { MobileBottomBarShell } from "@/components/layout/mobile-bottom-bar-shell";
import { useToast } from "@/components/ui/toast";

type GuideEditContentProps = {
  guideId: string;
};

export function GuideEditContent({ guideId }: GuideEditContentProps) {
  const t = useTranslations("Guides");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const headerSentinelRef = useRef<HTMLDivElement>(null);

  const { data: guide } = useSuspenseQuery(
    trpc.guides.get.queryOptions({ guideId }),
  );
  const { data: team } = useSuspenseQuery(
    trpc.teams.get.queryOptions({ teamId: guide.teamId }),
  );

  const [title, setTitle] = useState(guide.title);
  const [category, setCategory] = useState(guide.category);
  const [content, setContent] = useState<unknown>(guide.content);
  const [roleId, setRoleId] = useState<string>(guide.roleId ?? "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const guideHref = `/teams/${guide.teamId}/guides/${guideId}`;
  const teamGuidesHref = `/teams/${guide.teamId}?tab=guides`;

  const publishMutation = useMutation(
    trpc.guides.publish.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.get.queryOptions({ guideId }).queryKey });
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        queryClient.invalidateQueries({ queryKey: trpc.teams.get.queryOptions({ teamId: guide.teamId }).queryKey });
        router.push(guideHref);
      },
      onError: () => {
        toast(t("guidePublishFailed"), "error");
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.guides.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.get.queryOptions({ guideId }).queryKey });
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        queryClient.invalidateQueries({ queryKey: trpc.teams.get.queryOptions({ teamId: guide.teamId }).queryKey });
        toast(t("guideSaved"));
        if (guide.status === "PUBLISHED") {
          router.push(guideHref);
          return;
        }
        publishMutation.mutate({ teamId: guide.teamId, guideId });
      },
      onError: () => {
        toast(t("guideSaveFailed"), "error");
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.guides.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        queryClient.invalidateQueries({ queryKey: trpc.teams.get.queryOptions({ teamId: guide.teamId }).queryKey });
        toast(t("deleted"));
        router.push(teamGuidesHref);
      },
      onError: () => {
        toast(t("deleteFailed"), "error");
      },
    }),
  );

  const handleSave = () => {
    if (!title.trim()) return;
    updateMutation.mutate({
      teamId: guide.teamId,
      guideId,
      title: title.trim(),
      content,
      category,
      roleId: roleId || null,
      isVisibleToTeam: true,
    });
  };

  const isSaving = updateMutation.isPending || publishMutation.isPending;
  const positions = team.positions ?? [];
  const mobileActionLabelClass = "text-[10px] font-semibold uppercase tracking-[0.5px]";
  const mobileActionClass =
    "relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-300";
  const mobileEditActions = (
    <>
      <div
        className="absolute rounded-[26px] bg-accent"
        style={{
          left: "calc(66.6667% + 4px)",
          width: "calc(33.3333% - 8px)",
          top: "50%",
          transform: "translateY(-50%)",
          height: "calc(100% - 10px)",
        }}
      />
      <button
        type="button"
        className={`${mobileActionClass} text-error hover:text-error/80`}
        onClick={() => setShowDeleteConfirm(true)}
      >
        <Trash2 className="h-5 w-5" />
        <span className={mobileActionLabelClass}>{tCommon("delete")}</span>
      </button>
      <Link
        href={guideHref}
        className={`${mobileActionClass} text-text-tab-inactive hover:text-text-primary`}
      >
        <X className="h-5 w-5" />
        <span className={mobileActionLabelClass}>{tCommon("cancel")}</span>
      </Link>
      <button
        type="button"
        className={`${mobileActionClass} text-text-on-accent disabled:pointer-events-none disabled:opacity-50`}
        onClick={handleSave}
        disabled={isSaving || !title.trim()}
      >
        <Check className="h-5 w-5" />
        <span className={mobileActionLabelClass}>
          {isSaving ? t("saving") : tCommon("save")}
        </span>
      </button>
    </>
  );

  return (
    <div className="space-y-5">
      <MobileCompactGuideHeader
        backHref={guideHref}
        backLabel={t("backToGuide")}
        title={title.trim() || t("guideTitlePlaceholder")}
        sentinelRef={headerSentinelRef}
      />

      <div ref={headerSentinelRef}>
        <Link
          href={guideHref}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToGuide")}
        </Link>
        <div className="min-w-0">
          <input
            type="text"
            placeholder={t("guideTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label={t("guideTitlePlaceholder")}
            className="block w-full bg-transparent text-2xl font-bold text-text-primary placeholder:text-text-tertiary outline-none"
          />
          <p className="text-sm text-text-secondary mt-0.5">{team.name}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <GuideCategorySelect value={category} onChange={setCategory} />
        <GuideRoleSelect
          value={roleId}
          onChange={setRoleId}
          positions={positions}
        />
      </div>

      <GuideEditor
        content={guide.content}
        teamId={guide.teamId}
        onChange={setContent}
      />

      <MobileBottomBarShell className="z-[60]">
        {mobileEditActions}
      </MobileBottomBarShell>

      <div className="hidden rounded-xl border border-border bg-bg-page/95 px-4 py-3 shadow-[var(--shadow-card)] md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="danger"
            className="px-3"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Link href={guideHref}>
              <Button type="button" variant="secondary">
                {tCommon("cancel")}
              </Button>
            </Link>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? t("saving") : tCommon("save")}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="p-6 max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              {t("deleteGuide")}
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              {t("deleteConfirm", { title: guide.title })}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate({ teamId: guide.teamId, guideId })
                }
              >
                {deleteMutation.isPending ? t("deleting") : tCommon("delete")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
