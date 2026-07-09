import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Network,
  ShieldCheck,
  Target,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/teams", labelKey: "myTeams", icon: Users },
  { href: "/goals", labelKey: "goals", icon: Target },
  { href: "/training", labelKey: "training", icon: ClipboardCheck },
  { href: "/guides", labelKey: "guides", icon: BookOpen },
  { href: "/profile", labelKey: "profile", icon: User },
];

export const adminNavItems: NavItem[] = [
  {
    href: "/admin",
    labelKey: "adminDashboard",
    icon: LayoutDashboard,
    disabled: true,
  },
  { href: "/admin/ministry", labelKey: "adminStructure", icon: Network },
  { href: "/admin/users", labelKey: "adminUsers", icon: ShieldCheck },
];
