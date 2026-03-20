import { Card } from "@/components/ui/card";

type FeedbackCardProps = {
  content: string;
  type: string;
  authorName?: string | null;
  recipientName?: string | null;
  createdAt: string | Date;
};

const typeColors: Record<string, string> = {
  ENCOURAGEMENT: "var(--accent)",
  GROWTH_AREA: "var(--coral)",
  GENERAL: "var(--border)",
};

const typeLabels: Record<string, string> = {
  ENCOURAGEMENT: "Encouragement",
  GROWTH_AREA: "Growth Area",
  GENERAL: "General",
};

export function FeedbackCard({
  content,
  type,
  authorName,
  recipientName,
  createdAt,
}: FeedbackCardProps) {
  const borderColor = typeColors[type] ?? "var(--border)";
  const label = typeLabels[type] ?? type;
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card
      className="p-4 border-l-4"
      style={{ borderLeftColor: borderColor }}
    >
      <p className="text-sm text-text-primary italic leading-relaxed">
        &ldquo;{content}&rdquo;
      </p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          {authorName && (
            <span className="text-xs text-text-secondary">
              &mdash; {authorName}
            </span>
          )}
          {recipientName && (
            <span className="text-xs text-text-tertiary">
              to {recipientName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">
            {label}
          </span>
          <span className="text-xs text-text-tertiary">{formattedDate}</span>
        </div>
      </div>
    </Card>
  );
}
