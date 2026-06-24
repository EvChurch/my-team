"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { navItems } from "./nav-items";
import { MobileBottomBarShell } from "./mobile-bottom-bar-shell";

export function MobileTabBar() {
  const pathname = usePathname();
  const t = useTranslations("Navigation");

  if (pathname.startsWith("/guides/") && pathname.endsWith("/edit")) {
    return null;
  }

  const activeIndex = navItems.findIndex(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  const tabCount = navItems.length;

  return (
    <MobileBottomBarShell>
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
            className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-300 ${
              isActive ? "text-text-on-accent" : "text-text-tab-inactive"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span
              className="text-[10px] font-semibold uppercase"
              style={{ letterSpacing: "0.5px" }}
            >
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </MobileBottomBarShell>
  );
}
