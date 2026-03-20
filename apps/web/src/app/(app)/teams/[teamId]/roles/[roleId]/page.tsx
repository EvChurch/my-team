import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { RoleViewContent } from "./role-view-content";

type Props = {
  params: Promise<{ teamId: string; roleId: string }>;
};

export default async function RoleViewPage({ params }: Props) {
  const { teamId, roleId } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.teams.getPosition.queryOptions({ teamId, positionId: roleId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<RoleViewSkeleton />}>
        <RoleViewContent teamId={teamId} roleId={roleId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function RoleViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-bg-muted rounded w-48" />
      <div className="h-4 bg-bg-muted rounded w-32" />
      <div className="h-32 bg-bg-card rounded-2xl" />
    </div>
  );
}
