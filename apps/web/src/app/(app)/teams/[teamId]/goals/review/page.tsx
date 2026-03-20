import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { ReviewContent } from "./review-content";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function ReviewGoalsPage({ params }: Props) {
  const { teamId } = await params;
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.teams.get.queryOptions({ teamId })),
    queryClient.prefetchQuery(trpc.goals.list.queryOptions({ teamId })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ReviewSkeleton />}>
        <ReviewContent teamId={teamId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function ReviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-bg-muted rounded w-24" />
      <div className="h-8 bg-bg-muted rounded w-48" />
      <div className="h-10 bg-bg-muted rounded-xl w-64" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-bg-card rounded-2xl p-4 h-[200px]" />
        ))}
      </div>
    </div>
  );
}
