"use client";

import { useState, useRef, useEffect } from "react";
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

type Tab = "order" | "times" | "roster" | "notes";

const tabs: { value: Tab; label: string }[] = [
  { value: "order", label: "Service Order" },
  { value: "times", label: "Times" },
  { value: "roster", label: "Team Roster" },
  { value: "notes", label: "Notes & Files" },
];

export function PlanDetailsContent({ planRemoteId }: PlanDetailsContentProps) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.plans.get.queryOptions({ planRemoteId }),
  );
  const [activeTab, setActiveTab] = useState<Tab>("order");
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view on change
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab]);

  // Filter out empty tabs
  const hasNotes = data.notes.length > 0 || data.attachments.length > 0;
  const visibleTabs = tabs.filter((tab) => {
    if (tab.value === "times" && data.planTimes.length === 0) return false;
    if (tab.value === "notes" && !hasNotes) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PlanHeader
        title={data.plan.title}
        dates={data.plan.dates}
        seriesTitle={data.plan.seriesTitle}
        totalLength={data.plan.totalLength}
        planningCenterUrl={data.plan.planningCenterUrl}
        serviceTypeName={data.plan.serviceTypeName}
      />

      {/* Scrolling tab bar */}
      <div
        ref={tabsRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0"
        role="tablist"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.value}
            ref={activeTab === tab.value ? activeTabRef : null}
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-accent text-text-on-accent"
                : "bg-bg-muted text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "order" && (
        <ServiceOrder items={data.serviceOrder} attachments={data.attachments} />
      )}

      {activeTab === "times" && <PlanTimes planTimes={data.planTimes} />}

      {activeTab === "roster" && (
        <PlanRoster
          roster={data.roster}
          currentUserPcoId={data.currentUserPcoId}
        />
      )}

      {activeTab === "notes" && (
        <div className="space-y-6">
          <PlanNotes notes={data.notes} />
          <PlanAttachments attachments={data.attachments} />
        </div>
      )}
    </div>
  );
}
