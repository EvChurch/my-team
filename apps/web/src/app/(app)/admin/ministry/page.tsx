import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";

import { MinistryAdminContent } from "./ministry-admin-content";

export default async function MinistryAdminPage() {
  const queryClient = getQueryClient();

  await queryClient
    .prefetchQuery(trpc.ministryHierarchy.adminTree.queryOptions())
    .catch(() => null);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<MinistryAdminSkeleton />}>
        <MinistryAdminContent />
      </Suspense>
    </HydrationBoundary>
  );
}

function MinistryAdminSkeleton() {
  return (
    <div className="space-y-5 pb-8 animate-pulse">
      <div>
        <div className="h-4 w-48 rounded bg-bg-muted" />
        <div className="mt-3 h-8 w-64 rounded bg-bg-muted" />
        <div className="mt-2 h-4 w-full max-w-xl rounded bg-bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
