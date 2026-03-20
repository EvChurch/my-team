"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Church,
  Users,
  Target,
  BookOpen,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Avatar } from "../ui/avatar";

const navItems = [
  { href: "/teams", label: "My Teams", icon: Users },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

type SidebarProps = {
  userName?: string | null;
  userImage?: string | null;
};

export function Sidebar({ userName, userImage }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-[260px] md:shrink-0 bg-bg-card border-r border-border h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 pt-8 pb-6">
        <Church className="w-[22px] h-[22px] text-accent" />
        <span className="text-xl font-semibold text-text-primary">
          My Team
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {navItems.map((item) => {
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

      {/* Profile button */}
      <div className="px-3 pb-6">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent-light/40 hover:bg-accent-light/60 transition-colors"
        >
          <Avatar name={userName ?? "User"} src={userImage} size="sm" />
          <span className="flex-1 text-sm font-medium text-text-primary truncate">
            {userName ?? "User"}
          </span>
          <ChevronRight className="w-4 h-4 text-text-tertiary" />
        </Link>
      </div>
    </aside>
  );
}
