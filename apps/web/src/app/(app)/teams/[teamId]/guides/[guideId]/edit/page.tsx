import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { GuideEditContent } from "../../../../../guides/[guideId]/edit/guide-edit-content";

type Props = {
  params: Promise<{ guideId: string; teamId: string }>;
};

export default async function TeamGuideEditPage({ params }: Props) {
  const { guideId, teamId } = await params;
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.guides.get.queryOptions({ guideId })),
    queryClient.prefetchQuery(trpc.teams.get.queryOptions({ teamId })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<GuideEditSkeleton />}>
        <GuideEditContent guideId={guideId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function GuideEditSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-bg-muted rounded w-20" />
      <div className="h-8 bg-bg-muted rounded w-48" />
      <div className="h-12 bg-bg-muted rounded-xl" />
      <div className="h-64 bg-bg-card rounded-2xl" />
    </div>
  );
}
