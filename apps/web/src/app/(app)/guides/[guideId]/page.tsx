import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { GuideDetailContent } from "./guide-detail-content";

type Props = {
  params: Promise<{ guideId: string }>;
};

export default async function GuideDetailPage({ params }: Props) {
  const { guideId } = await params;
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.guides.get.queryOptions({ guideId })),
    queryClient.prefetchQuery(trpc.teams.list.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<GuideDetailSkeleton />}>
        <GuideDetailContent guideId={guideId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function GuideDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-bg-muted rounded w-20" />
      <div className="h-8 bg-bg-muted rounded w-64" />
      <div className="h-4 bg-bg-muted rounded w-32" />
      <div className="h-64 bg-bg-card rounded-2xl" />
    </div>
  );
}
