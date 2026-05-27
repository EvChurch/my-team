"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { useEffect } from "react";
import { TeamCard } from "@/components/teams/team-card";
import { EmptyState } from "@/components/ui/empty-state";

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

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">{t("title")}</h2>
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
          isLeader={team.isLeader}
          nextServingDate={team.nextServingDate}
        />
      ))}
      </div>
    </div>
  );
}
