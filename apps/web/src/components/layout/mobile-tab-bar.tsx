"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { navItems } from "./nav-items";

export function MobileTabBar() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [bubble, setBubble] = useState<{ left: number; width: number } | null>(
    null
  );

  const activeIndex = navItems.findIndex(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  const updateBubble = useCallback(() => {
    const container = containerRef.current;
    const activeTab = tabRefs.current[activeIndex];
    if (!container || !activeTab || activeIndex < 0) {
      setBubble(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    const left = tabRect.left - containerRect.left;
    const width = tabRect.width;

    setBubble({ left, width });
  }, [activeIndex]);

  useEffect(() => {
    updateBubble();
  }, [updateBubble]);

  useEffect(() => {
    window.addEventListener("resize", updateBubble);
    return () => window.removeEventListener("resize", updateBubble);
  }, [updateBubble]);

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div
        ref={containerRef}
        className="relative flex items-center justify-around bg-bg-card border border-border rounded-[36px] h-[62px] px-1 shadow-[0_2px_12px_rgba(26,25,24,0.06)]"
      >
        {/* Sliding bubble */}
        {bubble && (
          <div
            className="absolute bg-accent rounded-[26px] transition-all duration-300 ease-in-out"
            style={{
              left: bubble.left,
              width: bubble.width,
              top: "50%",
              transform: "translateY(-50%)",
              height: "calc(100% - 10px)",
            }}
          />
        )}
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              className={`relative z-10 flex flex-col items-center justify-center gap-0.5 px-4 py-2 transition-colors duration-300 ${
                isActive ? "text-text-on-accent" : "text-text-tab-inactive"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span
                className="text-[10px] font-semibold uppercase"
                style={{ letterSpacing: "0.5px" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
