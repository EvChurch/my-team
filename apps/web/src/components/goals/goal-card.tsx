"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import { Calendar, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useToast } from "@/components/ui/toast";

type GoalCardProps = {
  id: string;
  title: string;
  description?: string | null;
  progress: number;
  status: string;
  dueDate?: string | Date | null;
  isOwner?: boolean;
};

export function GoalCard({
  id,
  title,
  description,
  progress,
  status,
  dueDate,
  isOwner = false,
}: GoalCardProps) {
  const trpc = useTRPC();
  const t = useTranslations("Goals");
  const tCommon = useTranslations("Common");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusLabels: Record<string, string> = {
    PENDING: t("statusPending"),
    APPROVED: t("statusApproved"),
    DECLINED: t("statusDeclined"),
    COMPLETED: t("statusCompleted"),
  };
  const [editing, setEditing] = useState(false);
  const [progressValue, setProgressValue] = useState(progress);

  const updateProgress = useMutation(
    trpc.goals.updateProgress.mutationOptions(),
  );

  function handleSaveProgress() {
    updateProgress.mutate(
      { goalId: id, progress: progressValue },
      {
        onSuccess: () => {
          setEditing(false);
          void queryClient.invalidateQueries({ queryKey: [["goals"]] });
          toast(t("progressUpdated"));
        },
        onError: () => {
          toast(t("progressUpdateFailed"), "error");
        },
      },
    );
  }

  const formattedDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <Badge variant={status === "APPROVED" ? "accent" : "muted"}>
          {statusLabels[status] ?? status.toLowerCase()}
        </Badge>
      </div>

      {description && (
        <p className="text-xs text-text-secondary mb-3 line-clamp-2">
          {description}
        </p>
      )}

      {editing ? (
        <div className="flex items-center gap-3 mb-2">
          <input
            type="range"
            min={0}
            max={100}
            value={progressValue}
            onChange={(e) => setProgressValue(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
          <span className="text-xs font-medium text-text-secondary w-8 text-right">
            {progressValue}%
          </span>
          <button
            onClick={handleSaveProgress}
            disabled={updateProgress.isPending}
            className="text-xs font-semibold text-accent hover:text-accent-dark disabled:opacity-50"
          >
            {tCommon("save")}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setProgressValue(progress);
            }}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            {tCommon("cancel")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar value={progress} />
          </div>
          {isOwner && status !== "COMPLETED" && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-text-secondary hover:text-accent transition-colors"
              aria-label="Update progress"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {formattedDate && (
        <div className="flex items-center gap-1.5 mt-2">
          <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-xs text-text-tertiary">
            {t("due", { date: formattedDate })}
          </span>
        </div>
      )}
    </Card>
  );
}
