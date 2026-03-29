import type { ComponentProps } from "react";

type CardProps = ComponentProps<"div">;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-bg-card rounded-2xl shadow-[var(--shadow-card)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
