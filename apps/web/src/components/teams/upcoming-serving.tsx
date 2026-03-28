import { Calendar, Check, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ScheduleItem = {
  id: string;
  positionName: string | null;
  status: "CONFIRMED" | "UNCONFIRMED" | "DECLINED";
  sortDate: Date | string;
  dates: string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

type UpcomingServingProps = {
  schedules: ScheduleItem[];
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

export function UpcomingServing({ schedules }: UpcomingServingProps) {
  return (
    <div className="space-y-3">
      {schedules.map((schedule) => {
        const config = statusConfig[schedule.status];
        const StatusIcon = config.icon;

        return (
          <div
            key={schedule.id}
            className="flex items-center justify-between gap-3"
          >
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
                {schedule.positionName && (
                  <Badge variant="muted" className="mt-1">
                    {schedule.positionName}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <StatusIcon className={`w-3.5 h-3.5 ${config.className}`} />
              <span className={`text-xs ${config.className}`}>
                {config.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
