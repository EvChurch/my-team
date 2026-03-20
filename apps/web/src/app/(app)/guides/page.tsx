import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuidesListContent } from "./guides-list-content";

export default async function GuidesPage() {
  const queryClient = getQueryClient();

  const [, teams] = await Promise.all([
    queryClient.prefetchQuery(trpc.guides.listAll.queryOptions()),
    queryClient.fetchQuery(trpc.teams.list.queryOptions()),
  ]);

  // Check if user is a leader of any team
  const leaderTeam = teams.find((t) => t.isLeader);
  const isLeader = !!leaderTeam;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Guides</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Resources and how-tos for your team
          </p>
        </div>
        {isLeader && leaderTeam && (
          <>
            {/* Desktop button */}
            <Link href={`/teams/${leaderTeam.id}/guides/new`} className="hidden md:block">
              <Button>New Guide</Button>
            </Link>
            {/* Mobile FAB-style button */}
            <Link href={`/teams/${leaderTeam.id}/guides/new`} className="md:hidden">
              <Button className="w-9 h-9 p-0 rounded-full">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </>
        )}
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<GuidesListSkeleton />}>
          <GuidesListContent
            isLeader={isLeader}
            firstTeamId={leaderTeam?.id}
          />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}

function GuidesListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-bg-muted rounded-xl" />
      <div className="h-4 bg-bg-muted rounded w-24" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-card rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
