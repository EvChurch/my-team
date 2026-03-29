"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { navItems } from "./nav-items";

export function MobileTabBar() {
  const pathname = usePathname();

  const activeIndex = navItems.findIndex(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  const tabCount = navItems.length;

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="relative flex items-center justify-around border border-border rounded-[36px] h-[62px] px-1 shadow-[var(--shadow-card-strong)]" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-card) 35%, transparent)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        {/* Sliding bubble — positioned via CSS calc based on active index */}
        {activeIndex >= 0 && (
          <div
            className="absolute bg-accent rounded-[26px] transition-all duration-300 ease-in-out"
            style={{
              left: `calc(${(activeIndex / tabCount) * 100}% + 4px)`,
              width: `calc(${100 / tabCount}% - 8px)`,
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
              className={`relative z-10 flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors duration-300 ${
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
