import { ArrowLeft, ExternalLink, Clock } from "lucide-react";
import Link from "next/link";

type PlanHeaderProps = {
  title: string | null;
  dates: string | null;
  seriesTitle: string | null;
  totalLength: number | null;
  planningCenterUrl: string | null;
  serviceTypeName: string;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function PlanHeader({
  title,
  dates,
  seriesTitle,
  totalLength,
  planningCenterUrl,
  serviceTypeName,
}: PlanHeaderProps) {
  return (
    <div>
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-accent uppercase tracking-wide">
            {serviceTypeName}
          </p>
          <h1 className="text-xl font-semibold text-text-primary mt-1">
            {title ?? dates ?? "Service Plan"}
          </h1>
          {dates && title && (
            <p className="text-sm text-text-secondary mt-0.5">{dates}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {seriesTitle && (
              <span className="text-xs text-text-tertiary">
                Series: {seriesTitle}
              </span>
            )}
            {totalLength != null && totalLength > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                <Clock className="w-3 h-3" />
                {formatDuration(totalLength)}
              </span>
            )}
          </div>
        </div>
        {planningCenterUrl && (
          <a
            href={planningCenterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[10px] bg-bg-muted text-text-secondary hover:bg-border transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View in PCO
          </a>
        )}
      </div>
    </div>
  );
}
