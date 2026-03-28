"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import Link from "next/link";
import {
  Calendar,
  Check,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PlanTime = {
  id: string;
  name: string | null;
  timeType: string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

type Schedule = {
  id: string;
  positionName: string | null;
  status: "CONFIRMED" | "UNCONFIRMED" | "DECLINED";
  sortDate: Date | string;
  dates: string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  planRemoteId?: string;
  team?: { id: string; name: string };
  planTimes?: PlanTime[];
};

type ScheduleRowProps = {
  schedule: Schedule;
  showTeamName?: boolean;
};

function formatDate(dateStr: Date | string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: Date | string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(
  startsAt: Date | string | null,
  endsAt: Date | string | null,
): string {
  if (!startsAt) return "";
  const start = formatTime(startsAt);
  if (!endsAt) return start;
  return `${start} – ${formatTime(endsAt)}`;
}

const statusConfig = {
  CONFIRMED: {
    icon: Check,
    label: "Confirmed",
    className: "text-accent",
  },
  UNCONFIRMED: {
    icon: Clock,
    label: "Unconfirmed",
    className: "text-text-tertiary",
  },
  DECLINED: {
    icon: X,
    label: "Declined",
    className: "text-error",
  },
} as const;

const typeLabels: Record<string, string> = {
  service: "Service",
  rehearsal: "Rehearsal",
  other: "Other",
};

export function ScheduleRow({ schedule, showTeamName }: ScheduleRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const respondMutation = useMutation(
    trpc.schedules.respond.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.schedules.upcoming.queryOptions().queryKey,
        });
        // Also invalidate team-specific schedule data
        if (schedule.team?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.teams.get.queryOptions({ teamId: schedule.team.id })
              .queryKey,
          });
        }
        setDeclining(false);
        setDeclineReason("");
      },
    }),
  );

  const config = statusConfig[schedule.status];
  const StatusIcon = config.icon;
  const hasPlanTimes =
    schedule.planTimes && schedule.planTimes.length > 0;
  const isUnconfirmed = schedule.status === "UNCONFIRMED";
  const isPending = respondMutation.isPending;

  const handleAccept = () => {
    respondMutation.mutate({
      scheduleId: schedule.id,
      action: "accept",
    });
  };

  const handleDecline = () => {
    if (!declining) {
      setDeclining(true);
      return;
    }
    respondMutation.mutate({
      scheduleId: schedule.id,
      action: "decline",
      reason: declineReason || undefined,
    });
  };

  const planHref = schedule.planRemoteId
    ? `/plans/${schedule.planRemoteId}`
    : null;

  const rowContent = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg-muted shrink-0">
          <Calendar className="w-4 h-4 text-text-secondary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {formatDate(schedule.sortDate)}
            {schedule.startsAt && (
              <span className="text-text-secondary font-normal">
                {" "}
                at {formatTime(schedule.startsAt)}
              </span>
            )}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {showTeamName && schedule.team && (
              <span className="text-xs text-text-secondary">
                {schedule.team.name}
              </span>
            )}
            {schedule.positionName && (
              <Badge variant="muted">{schedule.positionName}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isUnconfirmed && !declining && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAccept();
              }}
              disabled={isPending}
              className="px-2.5 py-1 text-xs font-medium rounded-[10px] bg-accent text-text-on-accent hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {isPending ? "..." : "Accept"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDecline();
              }}
              disabled={isPending}
              className="px-2.5 py-1 text-xs font-medium rounded-[10px] bg-bg-muted text-text-secondary hover:bg-border transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}
        {!isUnconfirmed && (
          <div className="flex items-center gap-1">
            <StatusIcon className={`w-3.5 h-3.5 ${config.className}`} />
            <span className={`text-xs ${config.className}`}>
              {config.label}
            </span>
          </div>
        )}
        {hasPlanTimes && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setExpanded(!expanded);
            }}
            className="text-text-tertiary hover:text-text-secondary transition-colors p-0.5 -m-0.5"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div>
      {planHref ? (
        <Link
          href={planHref}
          className="flex items-center justify-between gap-3 rounded-lg hover:bg-bg-muted -mx-2 px-2 py-1 -my-1 transition-colors"
        >
          {rowContent}
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-3">
          {rowContent}
        </div>
      )}

      {/* Decline reason input */}
      {declining && (
        <div
          className="ml-11 mt-2 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            placeholder="Reason (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleDecline}
            disabled={isPending}
            className="px-2.5 py-1.5 text-xs font-medium rounded-[10px] bg-error text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "..." : "Decline"}
          </button>
          <button
            onClick={() => {
              setDeclining(false);
              setDeclineReason("");
            }}
            className="px-2.5 py-1.5 text-xs font-medium rounded-[10px] bg-bg-muted text-text-secondary hover:bg-border transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Expandable call times */}
      {expanded && schedule.planTimes && (
        <div className="ml-11 mt-2 space-y-1.5 border-l-2 border-border pl-3">
          {schedule.planTimes.map((pt) => (
            <div key={pt.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pt.timeType && (
                  <Badge variant="muted" className="text-[10px] px-1.5 py-0.5">
                    {typeLabels[pt.timeType.toLowerCase()] ?? pt.timeType}
                  </Badge>
                )}
                <span className="text-xs text-text-primary">
                  {pt.name ?? ""}
                </span>
              </div>
              <span className="text-xs text-text-secondary">
                {pt.startsAt && formatDate(pt.startsAt)}
                {pt.startsAt && " "}
                {formatTimeRange(pt.startsAt, pt.endsAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Mutation error */}
      {respondMutation.isError && (
        <p className="ml-11 mt-1 text-xs text-error">
          Failed to respond. Please try again.
        </p>
      )}
    </div>
  );
}
