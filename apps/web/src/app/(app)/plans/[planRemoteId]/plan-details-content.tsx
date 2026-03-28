"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { PlanHeader } from "@/components/plans/plan-header";
import { PlanTimes } from "@/components/plans/plan-times";
import { ServiceOrder } from "@/components/plans/service-order";
import { PlanRoster } from "@/components/plans/plan-roster";
import { PlanNotes } from "@/components/plans/plan-notes";
import { PlanAttachments } from "@/components/plans/plan-attachments";

type PlanDetailsContentProps = {
  planRemoteId: string;
};

export function PlanDetailsContent({ planRemoteId }: PlanDetailsContentProps) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.plans.get.queryOptions({ planRemoteId }),
  );

  return (
    <div className="space-y-6">
      <PlanHeader
        title={data.plan.title}
        dates={data.plan.dates}
        seriesTitle={data.plan.seriesTitle}
        totalLength={data.plan.totalLength}
        planningCenterUrl={data.plan.planningCenterUrl}
        serviceTypeName={data.plan.serviceTypeName}
      />

      <PlanTimes planTimes={data.planTimes} />

      <ServiceOrder items={data.serviceOrder} attachments={data.attachments} />

      <PlanRoster
        roster={data.roster}
        currentUserPcoId={data.currentUserPcoId}
      />

      <PlanNotes notes={data.notes} />

      <PlanAttachments attachments={data.attachments} />
    </div>
  );
}
