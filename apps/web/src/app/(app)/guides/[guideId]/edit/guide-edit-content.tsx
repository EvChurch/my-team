"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Play, Wrench, FileText, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { GuideEditor } from "@/components/guides/guide-editor";
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

  const categories = [
    { value: "QUICK_START" as const, label: t("quickStart"), icon: Play },
    { value: "TROUBLESHOOTING" as const, label: t("troubleshooting"), icon: Wrench },
    { value: "SOP" as const, label: t("sop"), icon: FileText },
  ];

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
  const [isVisibleToTeam, setIsVisibleToTeam] = useState(guide.isVisibleToTeam);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateMutation = useMutation(
    trpc.guides.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.get.queryOptions({ guideId }).queryKey });
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        toast(t("guideSaved"));
      },
      onError: () => {
        toast(t("guideSaveFailed"), "error");
      },
    }),
  );

  const publishMutation = useMutation(
    trpc.guides.publish.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.get.queryOptions({ guideId }).queryKey });
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        toast(t("guidePublished"));
        router.push(`/guides/${guideId}`);
      },
      onError: () => {
        toast(t("guidePublishFailed"), "error");
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.guides.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        toast(t("deleted"));
        router.push("/guides");
      },
      onError: () => {
        toast(t("deleteFailed"), "error");
      },
    }),
  );

  const handleSave = () => {
    if (!title.trim()) return;
    updateMutation.mutate(
      {
        teamId: guide.teamId,
        guideId,
        title: title.trim(),
        content,
        category,
        roleId: roleId || null,
        isVisibleToTeam,
      },
      {
        onSuccess: () => {
          router.push(`/guides/${guideId}`);
        },
      },
    );
  };

  const handlePublish = () => {
    if (!title.trim()) return;
    updateMutation.mutate(
      {
        teamId: guide.teamId,
        guideId,
        title: title.trim(),
        content,
        category,
        roleId: roleId || null,
        isVisibleToTeam,
      },
      {
        onSuccess: () => {
          publishMutation.mutate({ teamId: guide.teamId, guideId });
        },
      },
    );
  };

  const isSaving = updateMutation.isPending || publishMutation.isPending;
  const positions = team.positions ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/guides/${guideId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToGuide")}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t("editGuide")}</h1>
            <p className="text-sm text-text-secondary mt-0.5">{team.name}</p>
          </div>
          <Badge variant={guide.status === "PUBLISHED" ? "accent" : "muted"}>
            {guide.status === "PUBLISHED" ? t("published") : t("draft")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main editor area */}
        <div className="flex-1 space-y-4">
          {/* Category chips */}
          <div className="flex gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-text-on-accent"
                      : "bg-bg-muted text-text-secondary hover:bg-border"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder={t("guideTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-semibold text-text-primary placeholder:text-text-tertiary bg-transparent outline-none"
          />

          {/* Editor */}
          <GuideEditor content={guide.content} onChange={setContent} />
        </div>

        {/* Desktop right panel */}
        <div className="hidden md:block w-72 space-y-4 shrink-0">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              {t("guideDetails")}
            </h3>

            <div>
              <p className="text-xs text-text-secondary">{tCommon("status")}</p>
              <p className="text-sm text-text-primary mt-0.5">
                {guide.status === "PUBLISHED" ? t("published") : t("draft")}
              </p>
            </div>

            {guide.author && (
              <div>
                <p className="text-xs text-text-secondary">{tCommon("author")}</p>
                <p className="text-sm text-text-primary mt-0.5">
                  {guide.author.fullName}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-text-secondary">{tCommon("team")}</p>
              <p className="text-sm text-text-primary mt-0.5">{team.name}</p>
            </div>

            {/* Role selector */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                {tCommon("role")}
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">{tCommon("allRoles")}</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              {t("visibility")}
            </h3>
            <Toggle
              checked={isVisibleToTeam}
              onChange={setIsVisibleToTeam}
              label={tCommon("visibleToTeam")}
            />
          </Card>

          <Card className="p-4">
            <Button
              variant="danger"
              className="w-full gap-1.5"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("deleteGuide")}
            </Button>
          </Card>
        </div>
      </div>

      {/* Mobile metadata */}
      <div className="md:hidden space-y-4">
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All Roles</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>
          <Toggle
            checked={isVisibleToTeam}
            onChange={setIsVisibleToTeam}
            label={tCommon("visibleToTeam")}
          />
        </Card>
        <Button
          variant="danger"
          className="w-full gap-1.5"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Guide
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 sticky bottom-20 md:bottom-4 bg-bg-page py-3">
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
        >
          {updateMutation.isPending ? t("saving") : t("saveDraft")}
        </Button>
        <Button
          onClick={handlePublish}
          disabled={isSaving || !title.trim()}
        >
          {publishMutation.isPending ? t("publishing") : t("publish")}
        </Button>
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
