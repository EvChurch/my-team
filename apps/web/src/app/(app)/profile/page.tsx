import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { ProfileContent } from "./profile-content";

export default async function ProfilePage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(trpc.people.me.queryOptions()),
    queryClient.prefetchQuery(trpc.teams.list.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            <div className="h-48 bg-bg-card rounded-2xl" />
            <div className="h-32 bg-bg-card rounded-2xl" />
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </HydrationBoundary>
  );
}
