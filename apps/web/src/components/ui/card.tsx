import type { ComponentProps } from "react";

type CardProps = ComponentProps<"div">;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-bg-card rounded-2xl shadow-[0_2px_12px_rgba(26,25,24,0.03)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
