import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-text-on-accent hover:bg-accent-dark active:bg-accent-dark",
  secondary:
    "bg-transparent text-accent border-[1.5px] border-accent hover:bg-accent-light/30",
  danger:
    "bg-error text-text-on-accent hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
