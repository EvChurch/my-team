import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { PlanDetailsContent } from "./plan-details-content";
import PlanLoading from "./loading";

type Props = {
  params: Promise<{ planRemoteId: string }>;
};

export default async function PlanDetailsPage({ params }: Props) {
  const { planRemoteId } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.plans.get.queryOptions({ planRemoteId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<PlanLoading />}>
        <PlanDetailsContent planRemoteId={planRemoteId} />
      </Suspense>
    </HydrationBoundary>
  );
}
