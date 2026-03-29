import { Users, Target, BookOpen, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/teams", labelKey: "myTeams", icon: Users },
  { href: "/goals", labelKey: "goals", icon: Target },
  { href: "/guides", labelKey: "guides", icon: BookOpen },
  { href: "/profile", labelKey: "profile", icon: User },
];
