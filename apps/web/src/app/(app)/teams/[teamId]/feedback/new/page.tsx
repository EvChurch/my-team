import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@repo/api/server";
import { FeedbackNewContent } from "./feedback-new-content";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function WriteFeedbackPage({ params }: Props) {
  const { teamId } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.teams.get.queryOptions({ teamId }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<FeedbackFormSkeleton />}>
        <FeedbackNewContent teamId={teamId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function FeedbackFormSkeleton() {
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 bg-bg-muted rounded w-24" />
      <div className="h-8 bg-bg-muted rounded w-48" />
      <div className="bg-bg-card rounded-2xl p-6 space-y-4">
        <div className="h-4 bg-bg-muted rounded w-32" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-32 bg-bg-muted rounded-[10px]" />
      </div>
    </div>
  );
}
