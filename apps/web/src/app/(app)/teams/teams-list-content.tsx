"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { Users } from "lucide-react";
import { TeamCard } from "@/components/teams/team-card";
import { EmptyState } from "@/components/ui/empty-state";

export function TeamsListContent() {
  const trpc = useTRPC();
  const { data: teams } = useSuspenseQuery(trpc.teams.list.queryOptions());

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Teams Yet"
        description="You're not assigned to any teams. Teams are synced from Planning Center."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          id={team.id}
          name={team.name}
          serviceTypeName={team.serviceType?.name}
          memberCount={team.memberCount}
          userRole={team.userRole}
          isLeader={team.isLeader}
          nextServingDate={team.nextServingDate}
        />
      ))}
    </div>
  );
}
