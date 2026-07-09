"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Church, ShieldCheck } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { adminNavItems, navItems } from "./nav-items";

type SidebarProps = {
  userName?: string | null;
  userImage?: string | null;
  showAdminLink?: boolean;
};

export function Sidebar({ userName, userImage, showAdminLink = false }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const tCommon = useTranslations("Common");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const visibleNavItems = isAdminRoute
    ? adminNavItems
    : navItems.filter((item) => item.href !== "/profile");

  return (
    <aside className="hidden md:flex md:flex-col md:w-[260px] md:shrink-0 bg-bg-card border-r border-border md:sticky md:top-0 md:h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 pt-8 pb-6">
        <Church className="w-[22px] h-[22px] text-accent" />
        <span className="text-xl font-semibold text-text-primary">
          {tCommon("appName")}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {visibleNavItems.map((item) => {
          const isActive =
            !item.disabled &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`));

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-tertiary opacity-70"
                aria-disabled="true"
              >
                <item.icon className="h-5 w-5" />
                {t(item.labelKey)}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-text-on-accent"
                  : "text-text-secondary hover:bg-bg-muted"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
        {!isAdminRoute && showAdminLink && (
          <Link
            href="/admin/ministry"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              pathname === "/admin/ministry" ||
              pathname.startsWith("/admin/ministry/")
                ? "bg-accent text-text-on-accent"
                : "text-text-secondary hover:bg-bg-muted"
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            {t("admin")}
          </Link>
        )}
      </nav>

      {/* Profile / Settings button */}
      <div className="px-3 pb-6">
        {isAdminRoute ? (
          <Link
            href="/teams"
            className="flex items-center gap-3 rounded-xl bg-accent-light/40 px-3 py-2.5 text-text-secondary transition-colors hover:bg-accent-light/60 hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="flex-1 truncate text-sm font-medium">
              {t("backToMyTeam")}
            </span>
          </Link>
        ) : (
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              pathname === "/profile" || pathname.startsWith("/profile/")
                ? "bg-accent text-text-on-accent"
                : "bg-accent-light/40 hover:bg-accent-light/60"
            }`}
          >
            <Avatar name={userName ?? tCommon("user")} src={userImage} size="sm" />
            <span className="flex-1 text-sm font-medium truncate">
              {userName ?? tCommon("user")}
            </span>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </Link>
        )}
      </div>
    </aside>
  );
}
