import type { ComponentProps } from "react";

type BadgeVariant = "accent" | "muted";

type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  accent: "bg-accent-light text-accent",
  muted: "bg-bg-muted text-text-tertiary",
};

export function Badge({
  variant = "accent",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[10px] px-2.5 py-1 text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
