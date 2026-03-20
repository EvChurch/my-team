import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconVariant?: "accent" | "muted";
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  iconVariant = "muted",
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-12 px-4 ${className}`}>
      <div
        className={`flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
          iconVariant === "accent"
            ? "bg-accent-light"
            : "bg-bg-muted"
        }`}
      >
        <Icon
          className={`w-6 h-6 ${
            iconVariant === "accent" ? "text-accent" : "text-text-tertiary"
          }`}
        />
      </div>
      <h3 className="text-[15px] font-semibold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-[13px] text-text-secondary max-w-xs">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
