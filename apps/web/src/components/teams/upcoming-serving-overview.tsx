"use client";

import { useState } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
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

export function UpcomingServingOverview() {
  const trpc = useTRPC();
  const { data: schedules } = useSuspenseQuery(
    trpc.schedules.upcoming.queryOptions(),
  );
  const [showAll, setShowAll] = useState(false);

  if (schedules.length === 0) return null;

  const visible = showAll ? schedules : schedules.slice(0, 3);
  const hasMore = schedules.length > 3;

  return (
    <section className="mb-6">
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">
        Upcoming Serving
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((schedule) => {
          const href = schedule.planRemoteId
            ? `/plans/${schedule.planRemoteId}`
            : undefined;

          const content = (
            <Card className="p-4 hover:shadow-md transition-shadow h-full">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 shrink-0">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary" suppressHydrationWarning>
                    {formatDate(schedule.sortDate)}
                    {schedule.startsAt && (
                      <span className="text-text-secondary font-normal" suppressHydrationWarning>
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
                  {schedule.positionName && (
                    <Badge variant="muted" className="mt-1.5">
                      {schedule.positionName}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );

          return href ? (
            <Link key={schedule.id} href={href}>
              {content}
            </Link>
          ) : (
            <div key={schedule.id}>{content}</div>
          );
        })}
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
              See all ({schedules.length}){" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
