import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { GuideCreateContent } from "./guide-create-content";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function GuideCreatePage({ params }: Props) {
  const { teamId } = await params;
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(
    trpc.teams.get.queryOptions({ teamId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<GuideCreateSkeleton />}>
        <GuideCreateContent teamId={teamId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function GuideCreateSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-bg-muted rounded w-20" />
      <div className="h-8 bg-bg-muted rounded w-48" />
      <div className="h-12 bg-bg-muted rounded-xl" />
      <div className="h-64 bg-bg-card rounded-2xl" />
    </div>
  );
}
