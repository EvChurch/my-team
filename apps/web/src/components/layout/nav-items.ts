import { Users, Target, BookOpen, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/teams", label: "My Teams", icon: Users },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];
