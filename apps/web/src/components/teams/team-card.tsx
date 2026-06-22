"use client";

import Link from "next/link";
import { Users, Calendar, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTimezone } from "@/lib/timezone";
import { formatDate } from "@/lib/format-date";

type TeamCardProps = {
  id: string;
  name: string;
  provider: "PCO" | "ROCK";
  serviceTypeName?: string | null;
  memberCount: number;
  userRole: string;
  userRoles?: string[];
  isLeader: boolean;
  nextServingDate?: string | null;
};

export function TeamCard({
  id,
  name,
  serviceTypeName,
  memberCount,
  userRole,
  userRoles,
  isLeader,
  nextServingDate,
}: TeamCardProps) {
  const tz = useTimezone();
  const roles = userRoles?.length ? userRoles : isLeader ? [] : [userRole];
  const visibleRoles = roles.slice(0, 2);
  const hiddenRoleCount = Math.max(roles.length - visibleRoles.length, 0);
  return (
    <Link href={`/teams/${id}`}>
      <Card className="flex min-h-[92px] flex-col justify-between border border-transparent p-4 transition-colors hover:border-border hover:bg-bg-muted/30 hover:shadow-md cursor-pointer">
        <div className="flex min-w-0 items-start gap-3">
          <h3 className="min-w-0 flex-1 text-[15px] font-semibold text-text-primary truncate">
            {name}
          </h3>
          {roles.length > 0 && (
            <div className="flex min-w-0 max-w-fit flex-shrink flex-wrap justify-end gap-1">
              {visibleRoles.map((role) => (
                <Badge key={role} variant="muted" className="min-w-0">
                  <span className="truncate">{role}</span>
                </Badge>
              ))}
              {hiddenRoleCount > 0 && (
                <Badge variant="muted" className="shrink-0">
                  +{hiddenRoleCount}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-3 text-text-tertiary">
          <div className="flex shrink-0 items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">{memberCount}</span>
          </div>
          {nextServingDate && (
            <div className="flex min-w-0 items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">
                {formatDate(nextServingDate, tz)}
              </span>
            </div>
          )}
          {serviceTypeName && (
            <div className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{serviceTypeName}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
