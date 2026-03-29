import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { ProfileContent } from "./profile-content";

export default async function ProfilePage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.people.me.queryOptions());

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Profile</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense
          fallback={
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-bg-card rounded-2xl" />
              <div className="h-48 bg-bg-card rounded-2xl" />
            </div>
          }
        >
          <ProfileContent />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
