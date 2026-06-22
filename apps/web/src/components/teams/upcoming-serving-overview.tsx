"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useLocale, useTranslations } from "next-intl";
import { Check, Clock, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTimezone } from "@/lib/timezone";
import { formatDate, formatTime } from "@/lib/format-date";

type ScheduleItem = {
  id: string;
  provider?: "PCO" | "ROCK";
  status: string;
  sortDate: Date | string;
  startsAt: Date | string | null;
  positionName: string | null;
  planRemoteId: string;
  team: { id: string; name: string } | null;
};

type ScheduleGroup = ScheduleItem & {
  scheduleIds: string[];
  positionNames: string[];
  teams: Array<{ id: string; name: string }>;
};

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupSchedulesByService(schedules: ScheduleItem[]): ScheduleGroup[] {
  const groups = new Map<string, ScheduleGroup>();

  for (const schedule of schedules) {
    const serviceKey = [
      schedule.provider ?? "UNKNOWN",
      schedule.planRemoteId || schedule.sortDate.toString(),
      schedule.startsAt?.toString() ?? "",
    ].join(":");
    const existing = groups.get(serviceKey);
    if (!existing) {
      groups.set(serviceKey, {
        ...schedule,
        scheduleIds: [schedule.id],
        positionNames: schedule.positionName ? [schedule.positionName] : [],
        teams: schedule.team ? [schedule.team] : [],
      });
      continue;
    }

    existing.scheduleIds.push(schedule.id);
    if (schedule.positionName) {
      existing.positionNames = uniqueBy(
        [...existing.positionNames, schedule.positionName],
        (name) => name,
      );
    }
    if (schedule.team) {
      existing.teams = uniqueBy([...existing.teams, schedule.team], (team) => team.id);
    }
  }

  return Array.from(groups.values());
}

function getMonthKey(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(new Date(value));
}

function getMonthLabel(value: Date | string, locale: string, timeZone: string) {
  const date = new Date(value);
  const currentYear = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
  }).format(new Date());
  const scheduleYear = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
  }).format(date);

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone,
    ...(scheduleYear !== currentYear ? { year: "numeric" } : {}),
  }).format(date);
}

function groupSchedulesByMonth(
  schedules: ScheduleGroup[],
  locale: string,
  timeZone: string,
) {
  const groups = new Map<
    string,
    { label: string; schedules: ScheduleGroup[] }
  >();

  for (const schedule of schedules) {
    const key = getMonthKey(schedule.sortDate, timeZone);
    const existing = groups.get(key);
    if (existing) {
      existing.schedules.push(schedule);
    } else {
      groups.set(key, {
        label: getMonthLabel(schedule.sortDate, locale, timeZone),
        schedules: [schedule],
      });
    }
  }

  return Array.from(groups.values());
}

function ScheduleCard({
  schedule,
}: {
  schedule: ScheduleGroup;
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
        for (const team of schedule.teams) {
          queryClient.invalidateQueries({
            queryKey: trpc.teams.get.queryOptions({ teamId: team.id })
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

  const respondToSchedules = (action: "accept" | "decline", reason?: string) => {
    const respondableIds = schedule.scheduleIds.filter(() => canRespond);
    void Promise.all(
      respondableIds.map((scheduleId) =>
        respondMutation.mutateAsync({
          scheduleId,
          action,
          reason,
        }),
      ),
    ).then(() => {
      if (action === "decline") {
        setShowDeclineModal(false);
        setDeclineReason("");
      }
    }).catch(() => undefined);
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    respondToSchedules("accept");
  };

  const openDeclineModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeclineModal(true);
  };

  const confirmDecline = () => {
    respondToSchedules("decline", declineReason || undefined);
  };
  const roleLabel = schedule.positionNames.join(", ");

  const card = (
    <Card className="h-full border border-transparent p-4 transition-colors hover:border-border hover:bg-bg-muted/30 hover:shadow-md">
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
          {roleLabel && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-xs text-text-secondary">{roleLabel}</span>
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
  schedules: ScheduleGroup[];
  canToggle: boolean;
  showAll: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Schedules");
  const locale = useLocale();
  const tz = useTimezone();
  const visible = showAll ? schedules : schedules.slice(0, 3);
  const monthGroups = groupSchedulesByMonth(visible, locale, tz);

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-text-primary mb-3">
        {t("upcomingServing")}
      </h2>
      {showAll ? (
        <div className="space-y-4">
          {monthGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {group.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.schedules.map((schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((schedule) => (
            <ScheduleCard key={schedule.id} schedule={schedule} />
          ))}
        </div>
      )}
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
  const locale = useLocale();
  const tz = useTimezone();
  const trpc = useTRPC();
  const { data: schedules = [] } = useQuery({
    ...trpc.schedules.upcoming.queryOptions(),
    refetchOnMount: "always",
    staleTime: 0,
  });
  const [showAll, setShowAll] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);

  // Filter out declined schedules, show pending first
  const activeSchedules = schedules.filter((s) => s.status !== "DECLINED");
  const pendingSchedules = activeSchedules.filter((s) => s.status === "UNCONFIRMED");
  const confirmedSchedules = activeSchedules.filter((s) => s.status !== "UNCONFIRMED");
  const pendingServices = groupSchedulesByService(pendingSchedules);
  const confirmedServices = groupSchedulesByService(confirmedSchedules);

  if (activeSchedules.length === 0) return null;

  const canToggle = confirmedServices.length > 3;
  const canToggleRequests = pendingServices.length > 3;
  const visibleRequests = showAllRequests ? pendingServices : pendingServices.slice(0, 3);
  const requestMonthGroups = groupSchedulesByMonth(visibleRequests, locale, tz);

  return (
    <div className="space-y-6 mb-6">
      {/* Serving Requests */}
      {pendingServices.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-text-primary mb-3">
            {t("servingRequests")}
          </h2>
          {showAllRequests ? (
            <div className="space-y-4">
              {requestMonthGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                    {group.label}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.schedules.map((schedule) => (
                      <ScheduleCard key={schedule.id} schedule={schedule} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRequests.map((schedule, index) => (
                <div
                  key={schedule.id}
                  className={index === 2 ? "hidden lg:block" : undefined}
                >
                  <ScheduleCard schedule={schedule} />
                </div>
              ))}
            </div>
          )}
          {canToggleRequests && (
            <button
              onClick={() => setShowAllRequests(!showAllRequests)}
              className="flex items-center gap-1 text-xs text-accent font-medium mt-3 hover:text-accent-dark transition-colors"
            >
              {showAllRequests ? (
                <>
                  {t("showLess")} <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  {t("seeAll", { count: pendingServices.length })}{" "}
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </section>
      )}

      {/* Upcoming Serving */}
      {confirmedServices.length > 0 && (
        <ConfirmedSection
          schedules={confirmedServices}
          canToggle={canToggle}
          showAll={showAll}
          onToggle={() => setShowAll(!showAll)}
        />
      )}
    </div>
  );
}
