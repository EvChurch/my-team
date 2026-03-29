import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { getTranslations } from "next-intl/server";
import { TeamsListContent } from "./teams-list-content";
import { UpcomingServingOverview } from "@/components/teams/upcoming-serving-overview";

export default async function TeamsPage() {
  const t = await getTranslations("Navigation");
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(trpc.teams.list.queryOptions()),
    queryClient.prefetchQuery(trpc.schedules.upcoming.queryOptions()),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t("myTeams")}</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <UpcomingServingOverview />
        </Suspense>
        <Suspense fallback={<TeamsListSkeleton />}>
          <TeamsListContent />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}

function TeamsListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-card rounded-2xl p-4 animate-pulse h-[100px]"
        />
      ))}
    </div>
  );
}
