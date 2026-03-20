import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.people.me.queryOptions());

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense
          fallback={
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-bg-card rounded-2xl" />
              <div className="h-48 bg-bg-card rounded-2xl" />
            </div>
          }
        >
          <SettingsContent />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
