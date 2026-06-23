import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { getTranslations } from "next-intl/server";
import { NewGuideButton } from "@/components/guides/new-guide-button";
import { GuidesListContent } from "./guides-list-content";

export default async function GuidesPage() {
  const t = await getTranslations("Guides");
  const queryClient = getQueryClient();

  const [, teams] = await Promise.all([
    queryClient.prefetchQuery(trpc.guides.listAll.queryOptions()),
    queryClient.fetchQuery(trpc.teams.list.queryOptions()),
  ]);

  const leaderTeams = teams
    .filter((team) => team.isLeader)
    .map((team) => ({ id: team.id, name: team.name }));
  const isLeader = leaderTeams.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <NewGuideButton teams={leaderTeams} />
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<GuidesListSkeleton />}>
          <GuidesListContent
            isLeader={isLeader}
            leaderTeams={leaderTeams}
          />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}

function GuidesListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-bg-muted rounded-xl" />
      <div className="h-4 bg-bg-muted rounded w-24" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-card rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
