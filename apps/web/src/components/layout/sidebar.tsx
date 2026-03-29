"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Church, ChevronRight } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { navItems } from "./nav-items";

type SidebarProps = {
  userName?: string | null;
  userImage?: string | null;
};

export function Sidebar({ userName, userImage }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-[260px] md:shrink-0 bg-bg-card border-r border-border md:sticky md:top-0 md:h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 pt-8 pb-6">
        <Church className="w-[22px] h-[22px] text-accent" />
        <span className="text-xl font-semibold text-text-primary">
          My Team
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {navItems.filter((item) => item.href !== "/profile").map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Profile / Settings button */}
      <div className="px-3 pb-6">
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            pathname === "/profile" || pathname.startsWith("/profile/")
              ? "bg-accent text-text-on-accent"
              : "bg-accent-light/40 hover:bg-accent-light/60"
          }`}
        >
          <Avatar name={userName ?? "User"} src={userImage} size="sm" />
          <span className="flex-1 text-sm font-medium truncate">
            {userName ?? "User"}
          </span>
          <ChevronRight className="w-4 h-4 opacity-60" />
        </Link>
      </div>
    </aside>
  );
}
