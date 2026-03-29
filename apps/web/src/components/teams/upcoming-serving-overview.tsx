"use client";

import { useState } from "react";
import Link from "next/link";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { Calendar, Check, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

function ScheduleCard({
  schedule,
}: {
  schedule: {
    id: string;
    status: string;
    sortDate: Date | string;
    startsAt: Date | string | null;
    positionName: string | null;
    planRemoteId: string;
    team: { id: string; name: string } | null;
  };
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const respondMutation = useMutation(
    trpc.schedules.respond.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.schedules.upcoming.queryOptions().queryKey,
        });
        if (schedule.team?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.teams.get.queryOptions({ teamId: schedule.team.id })
              .queryKey,
          });
        }
      },
    }),
  );

  const isConfirmed = schedule.status === "CONFIRMED";
  const isUnconfirmed = schedule.status === "UNCONFIRMED";
  const isPending = respondMutation.isPending;

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    respondMutation.mutate({ scheduleId: schedule.id, action: "accept" });
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    respondMutation.mutate({ scheduleId: schedule.id, action: "decline" });
  };

  return (
    <Link href={`/plans/${schedule.planRemoteId}`}>
      <Card className="p-4 hover:shadow-md transition-shadow h-full">
        <div className="flex items-start gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
              isConfirmed ? "bg-accent/10" : "bg-warning/10"
            }`}
          >
            {isConfirmed ? (
              <Check className="w-4 h-4 text-accent" />
            ) : (
              <Clock className="w-4 h-4 text-warning" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-medium text-text-primary"
              suppressHydrationWarning
            >
              {formatDate(schedule.sortDate)}
              {schedule.startsAt && (
                <span
                  className="text-text-secondary font-normal"
                  suppressHydrationWarning
                >
                  {" "}
                  at {formatTime(schedule.startsAt)}
                </span>
              )}
            </p>
            {schedule.team && (
              <p className="text-xs text-text-secondary mt-0.5">
                {schedule.team.name}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              {schedule.positionName && (
                <Badge variant="muted">{schedule.positionName}</Badge>
              )}
              {isConfirmed && <Badge variant="accent">Confirmed</Badge>}
            </div>

            {/* Accept / Decline buttons for unconfirmed */}
            {isUnconfirmed && (
              <div className="mt-2.5">
                {respondMutation.isError ? (
                  <p className="text-xs text-error">
                    Failed — please sign out and back in to refresh your session.
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAccept}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-[10px] bg-accent text-text-on-accent hover:bg-accent-dark transition-colors disabled:opacity-50"
                    >
                      {isPending ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={handleDecline}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-[10px] bg-bg-muted text-text-secondary hover:bg-border transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function UpcomingServingOverview() {
  const trpc = useTRPC();
  const { data: schedules } = useSuspenseQuery(
    trpc.schedules.upcoming.queryOptions(),
  );
  const [showAll, setShowAll] = useState(false);

  // Filter out declined schedules
  const activeSchedules = schedules.filter((s) => s.status !== "DECLINED");

  if (activeSchedules.length === 0) return null;

  const visible = showAll ? activeSchedules : activeSchedules.slice(0, 3);
  const hasMore = activeSchedules.length > 3;

  return (
    <section className="mb-6">
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">
        Upcoming Serving
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((schedule) => (
          <ScheduleCard key={schedule.id} schedule={schedule} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-xs text-accent font-medium mt-3 hover:text-accent-dark transition-colors"
        >
          {showAll ? (
            <>
              Show less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              See all ({activeSchedules.length}){" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
