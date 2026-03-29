"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Target, MessageSquare, Plus, MessageSquarePlus } from "lucide-react";
import { SegmentControl } from "@/components/ui/segment-control";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollFade } from "@/components/ui/scroll-fade";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GoalCard } from "@/components/goals/goal-card";
import { FeedbackCard } from "@/components/feedback/feedback-card";
import { NewGoalForm } from "@/components/goals/new-goal-form";

type GoalsContentProps = {
  personId: string;
};

export function GoalsContent({ personId }: GoalsContentProps) {
  const trpc = useTRPC();
  const t = useTranslations("Goals");
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "feedback" ? "feedback" : "goals";

  const [showNewGoalForm, setShowNewGoalForm] = useState(false);

  const { data: teams } = useSuspenseQuery(trpc.teams.list.queryOptions());
  const { data: goals } = useSuspenseQuery(
    trpc.goals.list.queryOptions({ personId }),
  );

  // Get feedback across all teams the user belongs to
  const leaderTeams = teams.filter((t) => t.isLeader);
  const allTeamIds = teams.map((t) => t.id);

  // Count pending goals for leader teams
  const pendingGoalsCount = goals.filter(
    (g) => g.status === "PENDING",
  ).length;

  // Collect user's teams for the new goal form
  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }));

  function handleTabChange(value: string) {
    if (value === "feedback") {
      router.push("/goals?tab=feedback");
    } else {
      router.push("/goals");
    }
  }

  // Active goals (non-completed)
  const activeGoals = goals.filter((g) => g.status !== "COMPLETED");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {t("title")}
        </h1>
      </div>

      {/* Segment Control */}
      <SegmentControl
        segments={[
          { value: "goals", label: t("goalsTab") },
          { value: "feedback", label: t("feedbackTab") },
        ]}
        activeSegment={tab}
        onSegmentChange={handleTabChange}
      />

      {/* Mobile scroll fade */}
      <div className="fixed bottom-[62px] left-0 right-0 md:hidden">
        <ScrollFade />
      </div>

      {tab === "goals" ? (
        <GoalsTab
          goals={activeGoals}
          completedGoals={completedGoals}
          leaderTeams={leaderTeams}
          pendingGoalsCount={pendingGoalsCount}
          teamOptions={teamOptions}
          showNewGoalForm={showNewGoalForm}
          onToggleNewGoalForm={() => setShowNewGoalForm((v) => !v)}
          personId={personId}
        />
      ) : (
        <FeedbackTab teamIds={allTeamIds} />
      )}
    </div>
  );
}

// --- Goals Tab ---

type GoalsTabProps = {
  goals: Array<{
    id: string;
    title: string;
    description: string | null;
    progress: number;
    status: string;
    dueDate: Date | null;
    person: { id: string } | null;
  }>;
  completedGoals: Array<{
    id: string;
    title: string;
    description: string | null;
    progress: number;
    status: string;
    dueDate: Date | null;
    person: { id: string } | null;
  }>;
  leaderTeams: Array<{ id: string; name: string; isLeader: boolean }>;
  pendingGoalsCount: number;
  teamOptions: Array<{ id: string; name: string }>;
  showNewGoalForm: boolean;
  onToggleNewGoalForm: () => void;
  personId: string;
};

function GoalsTab({
  goals,
  completedGoals,
  leaderTeams,
  pendingGoalsCount,
  teamOptions,
  showNewGoalForm,
  onToggleNewGoalForm,
  personId,
}: GoalsTabProps) {
  const t = useTranslations("Goals");
  return (
    <div className="space-y-6">
      {/* Leader CTAs */}
      {leaderTeams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {leaderTeams.map((team) => (
            <div key={team.id} className="flex gap-2">
              <Link href={`/teams/${team.id}/feedback/new`}>
                <Button variant="primary" className="text-xs">
                  <MessageSquarePlus className="w-4 h-4" />
                  {t("writeFeedback")}
                </Button>
              </Link>
              <Link href={`/teams/${team.id}/goals/review`}>
                <Button variant="secondary" className="text-xs">
                  <Target className="w-4 h-4" />
                  {t("review")}
                  {pendingGoalsCount > 0 ? ` (${pendingGoalsCount})` : ""}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* New Goal Button + Form */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {t("activeGoals")}
        </h2>
        <Button
          variant="primary"
          className="text-xs"
          onClick={onToggleNewGoalForm}
        >
          <Plus className="w-4 h-4" />
          {t("newGoal")}
        </Button>
      </div>

      {showNewGoalForm && (
        <Card className="p-4">
          <NewGoalForm
            teams={teamOptions}
            onClose={onToggleNewGoalForm}
          />
        </Card>
      )}

      {/* Goal Cards */}
      {goals.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              id={goal.id}
              title={goal.title}
              description={goal.description}
              progress={goal.progress}
              status={goal.status}
              dueDate={goal.dueDate}
              isOwner={goal.person?.id === personId}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title={t("noActiveGoals")}
          description={t("noActiveGoalsDesc")}
          iconVariant="accent"
        />
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {t("completedGoals")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 opacity-70">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                id={goal.id}
                title={goal.title}
                description={goal.description}
                progress={goal.progress}
                status={goal.status}
                dueDate={goal.dueDate}
                isOwner={goal.person?.id === personId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Feedback Tab ---

type FeedbackTabProps = {
  teamIds: string[];
};

function FeedbackTab({ teamIds }: FeedbackTabProps) {
  const trpc = useTRPC();
  const t = useTranslations("Goals");

  // Fetch feedback for the first team (most common scenario)
  // In a multi-team setup, we show the first team's feedback
  const firstTeamId = teamIds[0];

  const { data: feedback } = useSuspenseQuery(
    trpc.feedback.list.queryOptions({ teamId: firstTeamId ?? "" }),
  );

  if (!firstTeamId || feedback.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={t("noFeedback")}
        description={t("noFeedbackDesc")}
        iconVariant="accent"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        {t("recentFeedback")}
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {feedback.map((fb) => (
          <FeedbackCard
            key={fb.id}
            content={fb.content}
            type={fb.type}
            authorName={fb.author?.fullName}
            recipientName={fb.recipient?.fullName}
            createdAt={fb.createdAt}
          />
        ))}
      </div>
    </div>
  );
}
