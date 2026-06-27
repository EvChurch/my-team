"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { useTRPC } from "@mt/api/client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

type TeamTrainingComplianceProps = {
  teamId: string;
};

export function TeamTrainingCompliance({ teamId }: TeamTrainingComplianceProps) {
  const trpc = useTRPC();
  const t = useTranslations("TrainingAdmin");
  const { data, isLoading, isError } = useQuery({
    ...trpc.training.teamManagement.queryOptions({ teamId }),
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-40 rounded bg-bg-muted" />
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 rounded-xl bg-bg-muted" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (isError || !data) return null;

  const readyCount = data.complianceRows.filter((row) => row.isReady).length;
  const notReadyCount = data.complianceRows.length - readyCount;
  const blockingCount = data.complianceRows.reduce(
    (total, row) => total + row.blockingCount,
    0,
  );

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light text-accent">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {t("compliance")}
          </h3>
          <p className="text-sm text-text-secondary">{t("complianceDesc")}</p>
        </div>
      </div>

      {data.complianceRows.length > 0 ? (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <ComplianceStat label={t("readyStat")} value={readyCount} />
            <ComplianceStat label={t("notReadyStat")} value={notReadyCount} />
            <ComplianceStat label={t("blockingStat")} value={blockingCount} />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {data.complianceRows.map((row) => (
              <div
                key={row.assignmentId}
                className="flex items-start gap-3 rounded-xl border border-border p-3"
              >
                <Avatar name={row.personName} src={row.personImage} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {row.personName}
                    </p>
                    <Badge variant={row.isReady ? "accent" : "warning"}>
                      {row.isReady ? t("ready") : t("notReady")}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {row.positionName ?? t("unnamedRole")}
                  </p>
                  {!row.isReady && row.blockingTitles.length > 0 ? (
                    <p className="mt-1 text-xs text-text-secondary">
                      {t("blockedBy", {
                        modules: row.blockingTitles.join(", "),
                      })}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-text-secondary">
                      {t("assignedModuleCount", { count: row.moduleCount })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title={t("noComplianceRows")}
          description={t("noComplianceRowsDesc")}
          className="py-6"
        />
      )}
    </Card>
  );
}

function ComplianceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-bg-muted px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}
