import { useTranslations } from "next-intl";
import { Heart, MessageCircle, Sprout } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

type FeedbackCardProps = {
  content: string;
  type: string;
  authorName?: string | null;
  authorImage?: string | null;
  recipientName?: string | null;
  recipientImage?: string | null;
  createdAt: string | Date;
};

const typeColors: Record<string, string> = {
  ENCOURAGEMENT: "var(--accent)",
  GROWTH_AREA: "var(--coral)",
  GENERAL: "var(--text-secondary)",
};

const typeIcons = {
  ENCOURAGEMENT: Heart,
  GROWTH_AREA: Sprout,
  GENERAL: MessageCircle,
};

export function FeedbackCard({
  content,
  type,
  authorName,
  authorImage,
  recipientName,
  recipientImage,
  createdAt,
}: FeedbackCardProps) {
  const t = useTranslations("Feedback");
  const accentColor = typeColors[type] ?? "var(--text-secondary)";
  const typeLabels: Record<string, string> = {
    ENCOURAGEMENT: t("encouragement"),
    GROWTH_AREA: t("growthArea"),
    GENERAL: t("general"),
  };
  const label = typeLabels[type] ?? type;
  const TypeIcon = typeIcons[type as keyof typeof typeIcons] ?? MessageCircle;
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {recipientName && (
            <Avatar name={recipientName} src={recipientImage} size="md" />
          )}
          <div className="min-w-0">
            {recipientName && (
              <p className="truncate text-sm font-semibold text-text-primary">
                {recipientName}
              </p>
            )}
            <p className="text-xs text-text-tertiary">{formattedDate}</p>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            color: accentColor,
            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
          }}
        >
          <TypeIcon className="h-3 w-3" />
          {label}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-primary">
        {content}
      </p>

      {authorName && (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
          <Avatar name={authorName} src={authorImage} size="sm" />
          <span className="text-xs font-medium text-text-secondary">
            {authorName}
          </span>
        </div>
      )}
      {!authorName && !recipientName && (
        <p className="mt-4 text-xs text-text-tertiary">{formattedDate}</p>
      )}
    </Card>
  );
}
