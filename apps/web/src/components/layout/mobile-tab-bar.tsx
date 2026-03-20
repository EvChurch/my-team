"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { navItems } from "./nav-items";

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="flex items-center justify-around bg-bg-card border border-border rounded-[36px] h-[62px] px-1 shadow-[0_2px_12px_rgba(26,25,24,0.06)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
                  ? "bg-accent rounded-[26px] px-4 py-2 text-text-on-accent"
                  : "px-3 py-2 text-text-tab-inactive"
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
