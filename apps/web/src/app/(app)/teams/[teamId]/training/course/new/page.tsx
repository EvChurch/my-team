import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { CourseCreateContent } from "./course-create-content";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ positionId?: string }>;
};

export default async function CourseCreatePage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(
    trpc.training.teamManagement.queryOptions({ teamId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<CourseCreateSkeleton />}>
        <CourseCreateContent
          teamId={teamId}
          positionId={(await searchParams).positionId}
        />
      </Suspense>
    </HydrationBoundary>
  );
}

function CourseCreateSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-bg-page p-5">
      <div className="h-full animate-pulse rounded-2xl bg-bg-card" />
    </div>
  );
}
