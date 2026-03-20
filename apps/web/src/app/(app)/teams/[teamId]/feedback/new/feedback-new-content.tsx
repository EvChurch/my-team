"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FeedbackForm } from "@/components/feedback/feedback-form";

type FeedbackNewContentProps = {
  teamId: string;
};

export function FeedbackNewContent({ teamId }: FeedbackNewContentProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: team } = useSuspenseQuery(
    trpc.teams.get.queryOptions({ teamId }),
  );

  // Redirect non-leaders
  useEffect(() => {
    if (!team.isCurrentUserLeader) {
      router.replace(`/teams/${teamId}`);
    }
  }, [team.isCurrentUserLeader, teamId, router]);

  if (!team.isCurrentUserLeader) {
    return null;
  }

  // Build members list from positions + leaders
  const members = [
    ...team.leaders.map((l) => ({
      id: l.person.id,
      fullName: l.person.fullName,
      image: l.person.image,
      role: "Team Lead",
    })),
    ...team.positions.flatMap((pos) =>
      pos.assignments.map((a) => ({
        id: a.person.id,
        fullName: a.person.fullName,
        image: a.person.image,
        role: pos.name ?? "Member",
      })),
    ),
  ];

  // Deduplicate
  const uniqueMembers = Array.from(
    new Map(members.map((m) => [m.id, m])).values(),
  );

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/teams/${teamId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {team.name}
      </Link>
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        Write Feedback
      </h1>
      <Card className="p-6">
        <FeedbackForm teamId={teamId} members={uniqueMembers} />
      </Card>
    </div>
  );
}
