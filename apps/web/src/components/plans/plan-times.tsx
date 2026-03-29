import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PlanTime = {
  id: string;
  name: string | null;
  timeType: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

type PlanTimesProps = {
  planTimes: PlanTime[];
};

const typeLabels: Record<string, string> = {
  service: "Service",
  rehearsal: "Rehearsal",
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(
  startsAt: string | null,
  endsAt: string | null,
): string {
  if (!startsAt) return "";
  const start = formatTime(startsAt);
  if (!endsAt) return start;
  return `${start} \u2013 ${formatTime(endsAt)}`;
}

function getDisplayName(pt: PlanTime): string {
  // If there's a name like "Setup", "Sound Check", "Pre-Service", use it
  if (pt.name) return pt.name;
  // Otherwise fall back to the time_type label (e.g. "Rehearsal", "Service")
  if (pt.timeType) {
    return typeLabels[pt.timeType.toLowerCase()] ?? pt.timeType;
  }
  return "";
}

export function PlanTimes({ planTimes }: PlanTimesProps) {
  if (planTimes.length === 0) return null;

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {planTimes.map((pt) => {
        const displayName = getDisplayName(pt);
        const timeRange = formatTimeRange(pt.startsAt, pt.endsAt);
        const dateLabel = pt.startsAt ? formatDateTime(pt.startsAt) : "";
        // Show badge only for service/rehearsal types when the name is different from the type
        const showBadge =
          pt.timeType &&
          pt.timeType.toLowerCase() !== "other" &&
          pt.name &&
          typeLabels[pt.timeType.toLowerCase()];

        return (
          <div key={pt.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg-muted shrink-0">
              <Clock className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">
                  {timeRange || dateLabel}
                </p>
                {showBadge && (
                  <Badge
                    variant="muted"
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    {typeLabels[pt.timeType!.toLowerCase()]}
                  </Badge>
                )}
              </div>
              {displayName && (
                <p className="text-xs text-text-secondary mt-0.5">
                  {dateLabel && timeRange ? `${dateLabel} \u00b7 ` : ""}
                  {displayName}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
