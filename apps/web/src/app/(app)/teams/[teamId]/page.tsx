import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@repo/api/server";
import { TeamViewContent } from "./team-view-content";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamViewPage({ params }: Props) {
  const { teamId } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.teams.get.queryOptions({ teamId }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<TeamViewSkeleton />}>
        <TeamViewContent teamId={teamId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function TeamViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-bg-muted rounded w-48" />
      <div className="h-4 bg-bg-muted rounded w-32" />
      <div className="h-32 bg-bg-card rounded-2xl" />
      <div className="h-32 bg-bg-card rounded-2xl" />
    </div>
  );
}
