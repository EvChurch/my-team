"use client";

import Link from "next/link";
import { Users, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTimezone } from "@/lib/timezone";
import { formatDate } from "@/lib/format-date";

type TeamCardProps = {
  id: string;
  name: string;
  serviceTypeName?: string | null;
  memberCount: number;
  userRole: string;
  isLeader: boolean;
  nextServingDate?: string | null;
};

export function TeamCard({
  id,
  name,
  serviceTypeName,
  memberCount,
  userRole,
  isLeader,
  nextServingDate,
}: TeamCardProps) {
  const tz = useTimezone();
  return (
    <Link href={`/teams/${id}`}>
      <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
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
        <div className="flex items-center gap-3 text-text-tertiary mt-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
          </div>
          {nextServingDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">
                {formatDate(nextServingDate, tz)}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
