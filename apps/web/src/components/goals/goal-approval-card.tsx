"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@repo/api/client";
import { Calendar, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

type GoalApprovalCardProps = {
  id: string;
  title: string;
  description?: string | null;
  progress: number;
  status: string;
  dueDate?: Date | null;
  teamId: string;
  person: {
    id: string;
    fullName: string;
    firstName: string;
    image?: string | null;
  } | null;
  showActions?: boolean;
};

export function GoalApprovalCard({
  id,
  title,
  description,
  progress,
  status,
  dueDate,
  teamId,
  person,
  showActions = false,
}: GoalApprovalCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateStatus = useMutation(trpc.goals.updateStatus.mutationOptions());

  function handleAction(newStatus: "APPROVED" | "DECLINED") {
    updateStatus.mutate(
      { teamId, goalId: id, status: newStatus },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: [["goals"]] });
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
      {/* Member Info */}
      {person && (
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar name={person.fullName} src={person.image} size="sm" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {person.fullName}
            </p>
          </div>
        </div>
      )}

      {/* Goal Info */}
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-text-secondary mb-2 line-clamp-2">
          {description}
        </p>
      )}

      <ProgressBar value={progress} className="mb-2" />

      {formattedDate && (
        <div className="flex items-center gap-1.5 mb-3">
          <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-xs text-text-tertiary">
            Due {formattedDate}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && status === "PENDING" && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="primary"
            className="flex-1 text-xs"
            onClick={() => handleAction("APPROVED")}
            disabled={updateStatus.isPending}
          >
            <Check className="w-4 h-4" />
            Approve
          </Button>
          <button
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-xs font-semibold border-[1.5px] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            style={{
              borderColor: "var(--coral)",
              color: "var(--coral)",
            }}
            onClick={() => handleAction("DECLINED")}
            disabled={updateStatus.isPending}
          >
            <X className="w-4 h-4" />
            Decline
          </button>
        </div>
      )}
    </Card>
  );
}
