import { Badge } from "@/components/ui/badge";

type RoleBadgeProps = {
  roleName?: string | null;
};

export function RoleBadge({ roleName }: RoleBadgeProps) {
  if (!roleName) {
    return <Badge variant="muted">All Roles</Badge>;
  }
  return <Badge variant="accent">{roleName}</Badge>;
}
