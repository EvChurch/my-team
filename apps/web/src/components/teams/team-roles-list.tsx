import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

type Role = {
  id: string;
  name: string | null;
  memberCount: number;
};

type TeamRolesListProps = {
  teamId: string;
  roles: Role[];
};

export function TeamRolesList({ teamId, roles }: TeamRolesListProps) {
  if (roles.length === 0) return null;

  return (
    <div className="space-y-2">
      {roles.map((role) => (
        <Link key={role.id} href={`/teams/${teamId}/roles/${role.id}`}>
          <Card className="p-3 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {role.name ?? "Unnamed Role"}
              </p>
              <div className="flex items-center gap-1 text-text-tertiary mt-0.5">
                <Users className="w-3 h-3" />
                <span className="text-xs">
                  {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
          </Card>
        </Link>
      ))}
    </div>
  );
}
