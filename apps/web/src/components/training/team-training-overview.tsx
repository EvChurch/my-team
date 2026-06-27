"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ClipboardCheck, ListChecks } from "lucide-react";
import { useTRPC } from "@mt/api/client";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { TrainingModuleCard } from "@/components/training/training-module-card";

type TeamTrainingOverviewProps = {
  teamId: string;
};

export function TeamTrainingOverview({ teamId }: TeamTrainingOverviewProps) {
  const trpc = useTRPC();
  const t = useTranslations("Training");
  const { data, isLoading, isError } = useQuery({
    ...trpc.training.myTraining.queryOptions(),
    retry: false,
  });

  const scopedTraining = useMemo(() => {
    if (!data) return null;

    const assignments = data.assignments.filter(
      (assignment) => assignment.teamId === teamId,
    );
    const moduleIds = new Set(
      assignments.flatMap((assignment) => assignment.moduleIds),
    );
    const modules = data.modules.filter((module) => moduleIds.has(module.id));

    return { assignments, modules };
  }, [data, teamId]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-bg-card" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 rounded-2xl bg-bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !scopedTraining) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("trainingUnavailable")}
        description={t("trainingUnavailableDesc")}
        iconVariant="accent"
      />
    );
  }

  if (scopedTraining.assignments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("noTeamAssignments")}
        description={t("noTeamAssignmentsDesc")}
        iconVariant="accent"
      />
    );
  }

  if (scopedTraining.modules.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("noTeamTraining")}
        description={t("noTeamTrainingDesc")}
        iconVariant="accent"
      />
    );
  }

  const completeModules = scopedTraining.modules.filter(
    (module) => module.isComplete,
  ).length;
  const moduleProgress =
    scopedTraining.modules.length === 0
      ? 0
      : Math.round((completeModules / scopedTraining.modules.length) * 100);
  const readyAssignments = scopedTraining.assignments.filter(
    (assignment) => assignment.isReady,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {t("teamProgress")}
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {t("moduleProgress", {
                  complete: completeModules,
                  total: scopedTraining.modules.length,
                })}
              </p>
            </div>
            <ListChecks className="h-5 w-5 text-accent" />
          </div>
          <ProgressBar value={moduleProgress} className="mt-4" />
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            {t("roleReadiness")}
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary">
            {t("assignmentProgress", {
              ready: readyAssignments,
              total: scopedTraining.assignments.length,
            })}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {readyAssignments === scopedTraining.assignments.length
              ? t("allReadyForTeam")
              : t("someBlockedForTeam")}
          </p>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {t("rolesOnThisTeam")}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {scopedTraining.assignments.map((assignment) => (
            <Card key={assignment.assignmentId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-text-primary">
                    {assignment.positionName ?? t("memberRole")}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {t("assignedModuleCount", {
                      count: assignment.moduleIds.length,
                    })}
                  </p>
                </div>
                <Badge variant={assignment.isReady ? "accent" : "warning"}>
                  {assignment.isReady ? t("ready") : t("notReady")}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {t("checklist")}
        </h2>
        <div className="space-y-2">
          {scopedTraining.modules.map((module) => (
            <TrainingModuleCard
              key={module.id}
              id={module.id}
              title={module.title}
              description={module.description}
              state={module.state}
              isBlocking={module.isBlocking}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
