import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { TrainingModuleContent } from "./training-module-content";

type Props = {
  params: Promise<{ moduleId: string }>;
};

export default async function TrainingModulePage({ params }: Props) {
  const { moduleId } = await params;
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(
    trpc.training.getModule.queryOptions({ moduleId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<TrainingModuleSkeleton />}>
        <TrainingModuleContent moduleId={moduleId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function TrainingModuleSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-24 rounded bg-bg-muted" />
      <div className="h-8 w-64 rounded bg-bg-muted" />
      <div className="h-48 rounded-2xl bg-bg-card" />
    </div>
  );
}
