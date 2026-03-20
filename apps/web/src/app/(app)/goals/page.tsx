import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@repo/api/server";
import { createTRPCContext } from "@repo/api/init";
import { GoalsContent } from "./goals-content";

export default async function GoalsPage() {
  const queryClient = getQueryClient();
  const ctx = await createTRPCContext();
  const personId = ctx.personId ?? "";

  await Promise.all([
    queryClient.prefetchQuery(trpc.teams.list.queryOptions()),
    queryClient.prefetchQuery(trpc.goals.list.queryOptions({ personId })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<GoalsPageSkeleton />}>
        <GoalsContent personId={personId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function GoalsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-bg-muted rounded w-48" />
      <div className="h-10 bg-bg-muted rounded-xl w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bg-card rounded-2xl p-4 h-[120px]" />
        ))}
      </div>
    </div>
  );
}
