"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type MobileBottomBarShellProps = {
  children: ReactNode;
  className?: string;
  surface?: "frosted" | "solid";
  portal?: boolean;
};

export function MobileBottomBarShell({
  children,
  className = "z-50",
  surface = "frosted",
  portal = false,
}: MobileBottomBarShellProps) {
  const isHydrated = useSyncExternalStore(
    subscribeAfterHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const isSolid = surface === "solid";

  const shell = (
    <nav className={`fixed bottom-4 left-4 right-4 md:hidden ${className}`}>
      <div
        className="relative flex h-[62px] items-center justify-around rounded-[36px] border border-border px-1 shadow-[var(--shadow-card-strong)]"
        style={{
          backgroundColor: isSolid
            ? "var(--bg-card)"
            : "color-mix(in srgb, var(--bg-card) 35%, transparent)",
          backdropFilter: isSolid ? undefined : "blur(24px)",
          WebkitBackdropFilter: isSolid ? undefined : "blur(24px)",
        }}
      >
        {children}
      </div>
    </nav>
  );

  if (portal && isHydrated) {
    return createPortal(shell, document.body);
  }

  return shell;
}

function subscribeAfterHydration(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}
