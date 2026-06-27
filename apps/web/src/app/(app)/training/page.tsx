import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { getQueryClient, trpc } from "@mt/api/server";
import { TrainingContent } from "./training-content";

export default async function TrainingPage() {
  const t = await getTranslations("Training");
  const queryClient = getQueryClient();

  await queryClient
    .prefetchQuery(trpc.training.myTraining.queryOptions())
    .catch(() => null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">{t("subtitle")}</p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<TrainingPageSkeleton />}>
          <TrainingContent />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}

function TrainingPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-bg-card" />
        ))}
      </div>
      <div className="h-4 w-32 rounded bg-bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-2xl bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
