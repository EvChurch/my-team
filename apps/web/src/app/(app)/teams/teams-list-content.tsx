"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { useEffect } from "react";
import { TeamCard } from "@/components/teams/team-card";
import { EmptyState } from "@/components/ui/empty-state";

function TeamGrid({
  title,
  teams,
}: {
  title: string;
  teams: Array<{
    id: string;
    name: string;
    provider: "PCO" | "ROCK";
    serviceType?: { name: string } | null;
    memberCount: number;
    userRole: string;
    userRoles: string[];
    isLeader: boolean;
    nextServingDate: string | null;
  }>;
}) {
  if (teams.length === 0) return null;

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            id={team.id}
            name={team.name}
            provider={team.provider}
            serviceTypeName={team.serviceType?.name}
            memberCount={team.memberCount}
            userRole={team.userRole}
            userRoles={team.userRoles}
            isLeader={team.isLeader}
            nextServingDate={team.nextServingDate}
          />
        ))}
      </div>
    </section>
  );
}

export function TeamsListContent() {
  const trpc = useTRPC();
  const t = useTranslations("Teams");
  const queryClient = useQueryClient();
  const { data: teams } = useSuspenseQuery(trpc.teams.list.queryOptions());

  useEffect(() => {
    void queryClient.invalidateQueries(trpc.teams.list.queryFilter());
  }, [queryClient, trpc]);

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("noTeams")}
        description={t("noTeamsDescription")}
      />
    );
  }

  const ledTeams = teams.filter((team) => team.isLeader);
  const memberTeams = teams.filter((team) => !team.isLeader);

  return (
    <div className="space-y-6">
      <TeamGrid title={t("teamLead")} teams={ledTeams} />
      <TeamGrid title={t("membersTab")} teams={memberTeams} />
    </div>
  );
}
