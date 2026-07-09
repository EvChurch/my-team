import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";

import { AdminUsersContent } from "./users-content";

export default async function AdminUsersPage() {
  const queryClient = getQueryClient();

  await queryClient
    .prefetchQuery(trpc.ministryHierarchy.adminUsers.queryOptions())
    .catch(() => null);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<AdminUsersSkeleton />}>
        <AdminUsersContent />
      </Suspense>
    </HydrationBoundary>
  );
}

function AdminUsersSkeleton() {
  return (
    <div className="space-y-5 pb-8 animate-pulse">
      <div>
        <div className="h-4 w-40 rounded bg-bg-muted" />
        <div className="mt-3 h-8 w-48 rounded bg-bg-muted" />
      </div>
      <div>
        <div className="h-80 rounded-2xl bg-bg-card" />
      </div>
    </div>
  );
}
