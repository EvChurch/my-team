import Link from "next/link";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TeamCardProps = {
  id: string;
  name: string;
  serviceTypeName?: string | null;
  memberCount: number;
  userRole: string;
  isLeader: boolean;
};

export function TeamCard({
  id,
  name,
  serviceTypeName,
  memberCount,
  userRole,
  isLeader,
}: TeamCardProps) {
  return (
    <Link href={`/teams/${id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-text-primary truncate">
              {name}
            </h3>
            {serviceTypeName && (
              <p className="text-[13px] text-text-secondary mt-0.5">
                {serviceTypeName}
              </p>
            )}
          </div>
          <Badge variant={isLeader ? "accent" : "muted"}>{userRole}</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-text-tertiary mt-3">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </Card>
    </Link>
  );
}
