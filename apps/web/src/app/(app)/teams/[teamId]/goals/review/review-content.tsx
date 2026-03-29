"use client";

import { useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Target } from "lucide-react";
import { SegmentControl } from "@/components/ui/segment-control";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GoalApprovalCard } from "@/components/goals/goal-approval-card";

type ReviewContentProps = {
  teamId: string;
};

type ReviewTab = "PENDING" | "APPROVED" | "DECLINED";

export function ReviewContent({ teamId }: ReviewContentProps) {
  const t = useTranslations("Review");
  const trpc = useTRPC();
  const router = useRouter();
  const [tab, setTab] = useState<ReviewTab>("PENDING");

  const { data: team } = useSuspenseQuery(
    trpc.teams.get.queryOptions({ teamId }),
  );

  const { data: goals } = useSuspenseQuery(
    trpc.goals.list.queryOptions({ teamId }),
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

  const filteredGoals = goals.filter((g) => g.status === tab);
  const pendingCount = goals.filter((g) => g.status === "PENDING").length;

  const emptyMessages: Record<ReviewTab, { title: string; desc: string }> = {
    PENDING: {
      title: t("noPending"),
      desc: t("noPendingDesc"),
    },
    APPROVED: {
      title: t("noApproved"),
      desc: t("noApprovedDesc"),
    },
    DECLINED: {
      title: t("noDeclined"),
      desc: t("noDeclinedDesc"),
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {team.name}
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">
            {t("title")}
          </h1>
          {pendingCount > 0 && (
            <Badge variant="accent">{pendingCount} pending</Badge>
          )}
        </div>
      </div>

      <SegmentControl
        segments={[
          { value: "PENDING" as ReviewTab, label: t("pendingTab") },
          { value: "APPROVED" as ReviewTab, label: t("approvedTab") },
          { value: "DECLINED" as ReviewTab, label: t("declinedTab") },
        ]}
        activeSegment={tab}
        onSegmentChange={setTab}
      />

      {filteredGoals.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalApprovalCard
              key={goal.id}
              id={goal.id}
              title={goal.title}
              description={goal.description}
              progress={goal.progress}
              status={goal.status}
              dueDate={goal.dueDate}
              teamId={teamId}
              person={goal.person}
              showActions={tab === "PENDING"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title={emptyMessages[tab].title}
          description={emptyMessages[tab].desc}
          iconVariant="accent"
        />
      )}
    </div>
  );
}
