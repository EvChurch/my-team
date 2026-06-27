"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ClipboardCheck, ListChecks } from "lucide-react";
import { useTRPC } from "@mt/api/client";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { TrainingModuleCard } from "@/components/training/training-module-card";

export function TrainingContent() {
  const trpc = useTRPC();
  const t = useTranslations("Training");
  const { data, isLoading, isError } = useQuery({
    ...trpc.training.myTraining.queryOptions(),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-bg-card" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-2xl bg-bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("trainingUnavailable")}
        description={t("trainingUnavailableDesc")}
        iconVariant="accent"
      />
    );
  }

  const totalModules = data.modules.length;
  const completeModules = data.modules.filter((module) => module.isComplete)
    .length;
  const progress = {
    total: totalModules,
    complete: completeModules,
    value: totalModules === 0 ? 0 : Math.round((completeModules / totalModules) * 100),
  };

  const readyAssignments = data.assignments.filter(
    (assignment) => assignment.isReady,
  ).length;

  if (data.assignments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("noAssignments")}
        description={t("noAssignmentsDesc")}
        iconVariant="accent"
      />
    );
  }

  if (data.modules.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("noTraining")}
        description={t("noTrainingDesc")}
        iconVariant="accent"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {t("overallProgress")}
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {t("moduleProgress", {
                  complete: progress.complete,
                  total: progress.total,
                })}
              </p>
            </div>
            <ListChecks className="h-5 w-5 text-accent" />
          </div>
          <ProgressBar value={progress.value} className="mt-4" />
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            {t("roleReadiness")}
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary">
            {t("assignmentProgress", {
              ready: readyAssignments,
              total: data.assignments.length,
            })}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {readyAssignments === data.assignments.length
              ? t("allReady")
              : t("someBlocked")}
          </p>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {t("currentRoles")}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.assignments.map((assignment) => (
            <Card key={assignment.assignmentId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-text-primary">
                    {assignment.teamName}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {assignment.positionName ?? t("memberRole")}
                  </p>
                </div>
                <Badge variant={assignment.isReady ? "accent" : "warning"}>
                  {assignment.isReady ? t("ready") : t("notReady")}
                </Badge>
              </div>
              {!assignment.isReady ? (
                <p className="mt-3 text-sm text-text-secondary">
                  {t("blockedCount", {
                    count: assignment.blockingModuleIds.length,
                  })}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {t("checklist")}
        </h2>
        <div className="space-y-2">
          {data.modules.map((module) => (
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
