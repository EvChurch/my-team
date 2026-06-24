import type { ReactNode } from "react";

type MobileBottomBarShellProps = {
  children: ReactNode;
  className?: string;
};

export function MobileBottomBarShell({
  children,
  className = "z-50",
}: MobileBottomBarShellProps) {
  return (
    <nav className={`fixed bottom-4 left-4 right-4 md:hidden ${className}`}>
      <div
        className="relative flex h-[62px] items-center justify-around rounded-[36px] border border-border px-1 shadow-[var(--shadow-card-strong)]"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-card) 35%, transparent)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {children}
      </div>
    </nav>
  );
}
