"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScheduleRow } from "./schedule-row";

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
      <Card className="p-4">
        <div className="space-y-3">
          {visible.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              showTeamName
            />
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
                See all ({schedules.length}) <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </Card>
    </section>
  );
}
