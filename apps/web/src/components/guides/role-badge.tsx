"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type RoleBadgeProps = {
  roleName?: string | null;
};

export function RoleBadge({ roleName }: RoleBadgeProps) {
  const tCommon = useTranslations("Common");

  if (!roleName) {
    return <Badge variant="muted">{tCommon("allRoles")}</Badge>;
  }
  return <Badge variant="accent">{roleName}</Badge>;
}
