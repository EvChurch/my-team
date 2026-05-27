"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import { Check, Clock, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTimezone } from "@/lib/timezone";
import { formatDate, formatTime } from "@/lib/format-date";

function ScheduleCard({
  schedule,
}: {
  schedule: {
    id: string;
    provider?: "PCO" | "ROCK";
    status: string;
    sortDate: Date | string;
    startsAt: Date | string | null;
    positionName: string | null;
    planRemoteId: string;
    team: { id: string; name: string } | null;
  };
}) {
  const t = useTranslations("Schedules");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const respondMutation = useMutation(
    trpc.schedules.respond.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.schedules.upcoming.queryOptions().queryKey,
        });
        if (schedule.team?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.teams.get.queryOptions({ teamId: schedule.team.id })
              .queryKey,
          });
        }
      },
    }),
  );

  const tz = useTimezone();
  const isConfirmed = schedule.status === "CONFIRMED";
  const isUnconfirmed = schedule.status === "UNCONFIRMED";
  const canRespond = schedule.provider !== "ROCK";
  const isPending = respondMutation.isPending;
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showDeclineModal) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [showDeclineModal]);

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    respondMutation.mutate({ scheduleId: schedule.id, action: "accept" });
  };

  const openDeclineModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeclineModal(true);
  };

  const confirmDecline = () => {
    respondMutation.mutate(
      {
        scheduleId: schedule.id,
        action: "decline",
        reason: declineReason || undefined,
      },
      {
        onSuccess: () => {
          setShowDeclineModal(false);
          setDeclineReason("");
        },
      },
    );
  };

  const card = (
    <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
            isConfirmed ? "bg-accent/10" : "bg-warning/10"
          }`}
        >
          {isConfirmed ? (
            <Check className="w-4 h-4 text-accent" />
          ) : (
            <Clock className="w-4 h-4 text-warning" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">
            {formatDate(schedule.sortDate, tz)}
            {schedule.startsAt && (
              <span className="text-text-secondary font-normal">
                {" "}
                at {formatTime(schedule.startsAt, tz)}
              </span>
            )}
          </p>
          {(schedule.provider || schedule.positionName || schedule.team) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {schedule.provider && (
                <span className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                  {schedule.provider}
                </span>
              )}
              <span className="text-xs text-text-secondary">
                {[schedule.positionName, schedule.team?.name]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          )}
          {respondMutation.isError && (
            <p className="text-xs text-error mt-1.5">
              {t("failedResponse")}
            </p>
          )}
        </div>

        {isUnconfirmed && canRespond && (
          <div className="flex items-center gap-1.5 shrink-0 self-center">
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-50"
              title={t("accept")}
            >
              <Check className="w-4 h-4 text-accent" />
            </button>
            <button
              onClick={openDeclineModal}
              disabled={isPending}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-error/10 hover:bg-error/20 transition-colors disabled:opacity-50"
              title={tCommon("decline")}
            >
              <X className="w-4 h-4 text-error" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <>
      {schedule.provider === "ROCK" ? (
        card
      ) : (
        <Link href={`/plans/${schedule.planRemoteId}`}>{card}</Link>
      )}

      {/* Decline confirmation modal */}
      {showDeclineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeclineModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-error/10">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  {t("declineSchedule")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {formatDate(schedule.sortDate, tz)}
                  {schedule.team ? ` · ${schedule.team.name}` : ""}
                </p>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              {t("declineConfirm")}
            </p>

            <input
              type="text"
              placeholder={t("reasonPlaceholder")}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-border bg-bg-page text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-[10px] bg-bg-muted text-text-secondary hover:bg-border transition-colors"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={confirmDecline}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-[10px] bg-error text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? t("declining") : tCommon("decline")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ConfirmedSection({
  schedules,
  canToggle,
  showAll,
  onToggle,
}: {
  schedules: Array<{
    id: string;
    provider?: "PCO" | "ROCK";
    status: string;
    sortDate: Date | string;
    startsAt: Date | string | null;
    positionName: string | null;
    planRemoteId: string;
    team: { id: string; name: string } | null;
  }>;
  canToggle: boolean;
  showAll: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Schedules");
  const visible = showAll ? schedules : schedules.slice(0, 3);

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">
        {t("upcomingServing")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((schedule) => (
          <ScheduleCard key={schedule.id} schedule={schedule} />
        ))}
      </div>
      {canToggle && (
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs text-accent font-medium mt-3 hover:text-accent-dark transition-colors"
        >
          {showAll ? (
            <>
              {t("showLess")} <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {t("seeAll", { count: schedules.length })}{" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </section>
  );
}

export function UpcomingServingOverview() {
  const t = useTranslations("Schedules");
  const trpc = useTRPC();
  const { data: schedules } = useSuspenseQuery(
    trpc.schedules.upcoming.queryOptions(),
  );
  const [showAll, setShowAll] = useState(false);

  // Filter out declined schedules, show pending first
  const activeSchedules = schedules.filter((s) => s.status !== "DECLINED");
  const pendingSchedules = activeSchedules.filter((s) => s.status === "UNCONFIRMED");
  const confirmedSchedules = activeSchedules.filter((s) => s.status !== "UNCONFIRMED");

  if (activeSchedules.length === 0) return null;

  const canToggle = confirmedSchedules.length > 3;

  return (
    <div className="space-y-6 mb-6">
      {/* Serving Requests */}
      {pendingSchedules.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-text-primary mb-3">
            {t("servingRequests")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingSchedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Serving */}
      {confirmedSchedules.length > 0 && (
        <ConfirmedSection
          schedules={confirmedSchedules}
          canToggle={canToggle}
          showAll={showAll}
          onToggle={() => setShowAll(!showAll)}
        />
      )}
    </div>
  );
}
