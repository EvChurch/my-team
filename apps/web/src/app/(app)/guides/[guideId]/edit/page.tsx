import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { GuideEditContent } from "./guide-edit-content";

type Props = {
  params: Promise<{ guideId: string }>;
};

export default async function GuideEditPage({ params }: Props) {
  const { guideId } = await params;
  const queryClient = getQueryClient();

  const guide = await queryClient.fetchQuery(
    trpc.guides.get.queryOptions({ guideId }),
  );

  await queryClient.prefetchQuery(
    trpc.teams.get.queryOptions({ teamId: guide.teamId }),
  );

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
