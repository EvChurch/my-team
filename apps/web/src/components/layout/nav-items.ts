import { Users, Target, BookOpen, User } from "lucide-react";
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
  { href: "/profile", label: "Profile", icon: User },
];
