"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefsMap = useRef<Map<Tab, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(
    null,
  );

  const updatePill = useCallback(() => {
    const bar = tabBarRef.current;
    const activeBtn = tabRefsMap.current.get(activeTab);
    if (!bar || !activeBtn) return;
    const barRect = bar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setPill({
      left: btnRect.left - barRect.left,
      width: btnRect.width,
    });
  }, [activeTab]);

  useEffect(() => {
    updatePill();
    const activeBtn = tabRefsMap.current.get(activeTab);
    activeBtn?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab, updatePill]);

  useEffect(() => {
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  // Filter out empty tabs
  const hasNotes = data.notes.length > 0 || data.attachments.length > 0;
  const visibleTabs = tabs.filter((tab) => {
    if (tab.value === "times" && data.planTimes.length === 0) return false;
    if (tab.value === "notes" && !hasNotes) return false;
    return true;
  });

  return (
    <div className="space-y-5 pb-8">
      <PlanHeader
        title={data.plan.title}
        dates={data.plan.dates}
        seriesTitle={data.plan.seriesTitle}
        totalLength={data.plan.totalLength}
        planningCenterUrl={data.plan.planningCenterUrl}
        serviceTypeName={data.plan.serviceTypeName}
      />

      {/* Scrolling segment control tab bar with animated pill */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0">
        <div
          ref={tabBarRef}
          className="relative inline-flex rounded-xl bg-bg-muted p-1"
          role="tablist"
        >
          {/* Animated background pill */}
          {pill && (
            <div
              className="absolute top-1 bottom-1 rounded-[10px] bg-bg-card shadow-[var(--shadow-card-strong)] transition-all duration-300 ease-in-out"
              style={{ left: pill.left, width: pill.width }}
            />
          )}
          {visibleTabs.map((tab) => (
            <button
              key={tab.value}
              ref={(el) => {
                if (el) tabRefsMap.current.set(tab.value, el);
              }}
              role="tab"
              aria-selected={activeTab === tab.value}
              className={`relative z-10 shrink-0 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "order" && (
        <ServiceOrder items={data.serviceOrder} />
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
