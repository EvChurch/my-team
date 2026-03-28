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
  other: "Other",
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

export function PlanTimes({ planTimes }: PlanTimesProps) {
  if (planTimes.length === 0) return null;

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">
        Times
      </h2>
      <Card className="p-4">
        <div className="space-y-2.5">
          {planTimes.map((pt) => (
            <div key={pt.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-bg-muted shrink-0">
                  <Clock className="w-3.5 h-3.5 text-text-secondary" />
                </div>
                <div>
                  <span className="text-sm text-text-primary">
                    {pt.name ?? ""}
                  </span>
                  {pt.timeType && (
                    <Badge
                      variant="muted"
                      className="ml-2 text-[10px] px-1.5 py-0.5"
                    >
                      {typeLabels[pt.timeType.toLowerCase()] ?? pt.timeType}
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-xs text-text-secondary">
                {pt.startsAt && formatDateTime(pt.startsAt)}{" "}
                {formatTimeRange(pt.startsAt, pt.endsAt)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
