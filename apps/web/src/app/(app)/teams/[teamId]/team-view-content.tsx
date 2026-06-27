"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Users,
  BookOpen,
  ClipboardCheck,
  Target,
  MessageSquare,
  MessageSquarePlus,
  BookPlus,
  Mail,
  Pencil,
  Phone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { UpcomingServing } from "@/components/teams/upcoming-serving";
import { LeaderBar } from "@/components/teams/leader-bar";
import { Avatar } from "@/components/ui/avatar";
import { TeamGuideSections } from "@/components/guides/team-guide-sections";
import { TeamTrainingCompliance } from "@/components/training/team-training-compliance";
import { TeamTrainingOverview } from "@/components/training/team-training-overview";
import { TeamTrainingContent } from "./training/team-training-content";
import { useTimezone } from "@/lib/timezone";
import { formatDate, formatTime } from "@/lib/format-date";

type TeamViewContentProps = {
  teamId: string;
};

type Tab =
  | "serving"
  | "members"
  | "goals"
  | "guides"
  | "training"
  | "feedback"
  | "about";

const tabs = [
  "serving",
  "members",
  "goals",
  "guides",
  "training",
  "feedback",
  "about",
] as const;

function isTab(value: string | null): value is Tab {
  return tabs.some((tab) => tab === value);
}

function MemberRow({
  member,
  lastServed,
  showLastServed,
}: {
  member: {
    id: string;
    fullName: string;
    image?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  lastServed?: string;
  showLastServed: boolean;
}) {
  const t = useTranslations("Teams");
  const phoneHref = member.phone
    ? `tel:${member.phone.replace(/[^\d+]/g, "")}`
    : null;

  function formatLastServedDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("today");
    if (diffDays === 1) return t("yesterday");
    if (diffDays < 7) return t("daysAgo", { count: diffDays });
    if (diffDays < 30) return t("weeksAgo", { count: Math.floor(diffDays / 7) });
    if (diffDays < 365) return t("monthsAgo", { count: Math.floor(diffDays / 30) });
    return t("yearsAgo", { count: Math.floor(diffDays / 365) });
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar name={member.fullName} src={member.image} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{member.fullName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showLastServed && (
          <span className="text-xs text-text-tertiary">
            {lastServed ? formatLastServedDate(lastServed) : t("never")}
          </span>
        )}
        <div className="flex items-center gap-1">
          {phoneHref ? (
            <a
              href={phoneHref}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
              aria-label={t("callPerson", { name: member.fullName })}
              title={t("callPerson", { name: member.fullName })}
            >
              <Phone className="h-4 w-4" />
            </a>
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary/45"
              aria-label={t("callPerson", { name: member.fullName })}
              title={t("callPerson", { name: member.fullName })}
            >
              <Phone className="h-4 w-4" />
            </span>
          )}
          {member.email ? (
            <a
              href={`mailto:${member.email}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
              aria-label={t("emailPerson", { name: member.fullName })}
              title={t("emailPerson", { name: member.fullName })}
            >
              <Mail className="h-4 w-4" />
            </a>
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary/45"
              aria-label={t("emailPerson", { name: member.fullName })}
              title={t("emailPerson", { name: member.fullName })}
            >
              <Mail className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

type TeamSchedulePlan = {
  planRemoteId: string;
  sortDate: string;
  startsAt: string | null;
  people: Array<{
    personId: string;
    personName: string;
    personImage: string | null;
    positionName: string | null;
    status: string;
  }>;
};

function TeamScheduleMatrix({
  plans,
  timezone,
}: {
  plans: TeamSchedulePlan[];
  timezone: string;
}) {
  const t = useTranslations("Teams");
  const roles = Array.from(
    new Set(
      plans.flatMap((plan) =>
        plan.people.map((person) => person.positionName ?? "Unassigned"),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  if (roles.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse"
          style={{ minWidth: `${Math.max(360, 160 + roles.length * 160)}px` }}
        >
          <thead>
            <tr className="border-b border-border bg-bg-muted/60">
              <th
                className="sticky left-0 z-20 w-40 bg-bg-muted px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary shadow-[1px_0_0_var(--border)]"
                scope="col"
              >
                {t("serving")}
              </th>
              {roles.map((role) => (
                <th
                  key={role}
                  className="min-w-32 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary"
                  scope="col"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map((plan) => {
              const peopleByRole = new Map<string, typeof plan.people>();
              for (const person of plan.people) {
                const role = person.positionName ?? "Unassigned";
                const people = peopleByRole.get(role) ?? [];
                people.push(person);
                peopleByRole.set(role, people);
              }

              return (
                <tr key={plan.planRemoteId} className="hover:bg-bg-muted/40">
                  <th
                    className="sticky left-0 z-10 bg-bg-card px-4 py-3 text-left align-top font-normal shadow-[1px_0_0_var(--border)]"
                    scope="row"
                  >
                    <Link
                      href={`/plans/${plan.planRemoteId}`}
                      className="block rounded-lg hover:text-accent"
                    >
                      <span className="block text-sm font-semibold text-text-primary">
                        {formatDate(plan.sortDate, timezone)}
                      </span>
                      {plan.startsAt && (
                        <span className="block text-xs text-text-secondary">
                          {formatTime(plan.startsAt, timezone)}
                        </span>
                      )}
                    </Link>
                  </th>
                  {roles.map((role) => {
                    const people = peopleByRole.get(role) ?? [];

                    return (
                      <td key={role} className="px-3 py-3 align-top">
                        {people.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {people.map((person, index) => {
                              const isConfirmed = person.status === "CONFIRMED";
                              const isDeclined = person.status === "DECLINED";

                              return (
                                <div
                                  key={`${person.personId}-${index}`}
                                  className="relative"
                                  title={person.personName}
                                >
                                  <Avatar
                                    name={person.personName}
                                    src={person.personImage}
                                    size="sm"
                                    className={
                                      isConfirmed
                                        ? "ring-2 ring-accent/30"
                                        : isDeclined
                                          ? "opacity-45 grayscale"
                                          : "ring-2 ring-warning/35"
                                    }
                                  />
                                  {isConfirmed && (
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bg-card ring-1 ring-bg-card">
                                      <Check className="h-3 w-3 text-accent" />
                                    </span>
                                  )}
                                  {!isConfirmed && !isDeclined && (
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bg-card ring-1 ring-bg-card">
                                      <Clock className="h-3 w-3 text-warning" />
                                    </span>
                                  )}
                                  {isDeclined && (
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bg-card ring-1 ring-bg-card">
                                      <span className="text-[10px] font-bold leading-none text-error">
                                        x
                                      </span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-text-tertiary">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function TeamViewContent({ teamId }: TeamViewContentProps) {
  const trpc = useTRPC();
  const t = useTranslations("Teams");
  const tCommon = useTranslations("Common");
  const tz = useTimezone();
  const searchParams = useSearchParams();
  const { data: team } = useSuspenseQuery(
    trpc.teams.get.queryOptions({ teamId }),
  );

  // Derive roles with their members
  const roleGroups = team.positions.map((pos) => ({
    id: pos.id,
    name: pos.name ?? "Member",
    members: pos.assignments.map((a) => ({
      id: a.person.id,
      fullName: a.person.fullName,
      image: a.person.image,
      email: a.person.email,
      phone: a.person.phone,
    })),
  }));

  // Leaders as a special group
  const leaders = team.leaders.map((l) => ({
    id: l.person.id,
    fullName: l.person.fullName,
    image: l.person.image,
    email: l.person.email,
    phone: l.person.phone,
  }));
  const leaderIds = new Set(leaders.map((leader) => leader.id));
  const visibleRoleGroups = roleGroups.filter((role) => {
    const roleName = role.name.trim().toLowerCase();
    const isLeaderRole =
      roleName === "leader" || roleName === "team leader" || roleName === "team lead";
    const onlyContainsTeamLeads =
      role.members.length > 0 &&
      role.members.every((member) => leaderIds.has(member.id));

    return !(leaders.length > 0 && isLeaderRole && onlyContainsTeamLeads);
  });

  const pendingGoalsCount = team.goals.filter(
    (g) => g.status === "PENDING",
  ).length;
  const hasServingTab = team.hasScheduleHistory;

  // Build tabs.
  const allTabs: { value: Tab; label: string }[] = useMemo(
    () => [
      ...(hasServingTab
        ? [{ value: "serving" as Tab, label: t("serving") }]
        : []),
      { value: "members", label: t("membersTab") },
      { value: "goals", label: t("goalsTab") },
      { value: "guides", label: t("guidesTab") },
      { value: "training", label: t("trainingTab") },
      { value: "feedback", label: t("feedbackTab") },
      ...(team.description
        ? [{ value: "about" as Tab, label: t("aboutTab") }]
        : []),
    ],
    [hasServingTab, t, team.description],
  );

  const requestedTab = searchParams.get("tab");
  const requestedTrainingMode = searchParams.get("trainingMode");
  const defaultTab = isTab(requestedTab)
    ? requestedTab
    : hasServingTab
      ? "serving"
      : "members";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [isArrangingGuides, setIsArrangingGuides] = useState(false);
  const [isManagingTraining, setIsManagingTraining] = useState(
    defaultTab === "training" && requestedTrainingMode === "manage",
  );
  const selectedTab = allTabs.some((tab) => tab.value === activeTab)
    ? activeTab
    : (allTabs[0]?.value ?? "members");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefsMap = useRef<Map<Tab, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const updatePill = useCallback(() => {
    const bar = tabBarRef.current;
    const activeBtn = tabRefsMap.current.get(selectedTab);
    if (!bar || !activeBtn) return;
    const barRect = bar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setPill({
      left: btnRect.left - barRect.left,
      width: btnRect.width,
    });
  }, [selectedTab]);

  useEffect(() => {
    updatePill();
    // Also scroll active tab into view
    const activeBtn = tabRefsMap.current.get(selectedTab);
    activeBtn?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedTab, updatePill]);

  useEffect(() => {
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("myTeams")}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {team.name}
            </h1>
            {team.serviceType && (
              <p className="text-sm text-text-secondary mt-0.5">
                {team.serviceType.name}
              </p>
            )}
          </div>
          {team.isCurrentUserLeader && (
            <Badge variant="accent">{t("teamLead")}</Badge>
          )}
        </div>
      </div>

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
          {allTabs.map((tab) => (
            <button
              key={tab.value}
              ref={(el) => {
                if (el) tabRefsMap.current.set(tab.value, el);
              }}
              role="tab"
              aria-selected={selectedTab === tab.value}
              className={`relative z-10 shrink-0 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                selectedTab === tab.value
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
      {hasServingTab && selectedTab === "serving" && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
              {t("mySchedule")}
            </h3>
            {team.schedules.length > 0 ? (
              <UpcomingServing schedules={team.schedules} />
            ) : (
              <EmptyState
                icon={Calendar}
                title={t("noUpcomingSchedules")}
                description={t("noUpcomingSchedulesDesc")}
                className="py-6"
              />
            )}
          </Card>

          {team.isCurrentUserLeader && (team.teamSchedules?.length ?? 0) > 0 && (
            <TeamScheduleMatrix plans={team.teamSchedules ?? []} timezone={tz} />
          )}
        </div>
      )}

      {selectedTab === "members" && (
        <div className="space-y-4">
          {team.isCurrentUserLeader ? (
            <TeamTrainingCompliance teamId={teamId} />
          ) : null}

          {/* Leaders */}
          {leaders.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
                {t("teamLeads")}
              </h3>
              <div className="space-y-2.5">
                {leaders.map((leader) => (
                  <MemberRow
                    key={leader.id}
                    member={leader}
                    lastServed={team.lastServedByPerson?.[leader.id]}
                    showLastServed={team.isCurrentUserLeader}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Role groups */}
          {visibleRoleGroups.map((role) => (
            <Card key={role.id} className="p-4">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
                {role.name}
              </h3>
              {role.members.length > 0 ? (
                <div className="space-y-2.5">
                  {role.members.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      lastServed={team.lastServedByPerson?.[member.id]}
                      showLastServed={team.isCurrentUserLeader}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-tertiary">
                  {t("noMembersInRole")}
                </p>
              )}
            </Card>
          ))}

          {leaders.length === 0 && visibleRoleGroups.length === 0 && (
            <EmptyState
              icon={Users}
              title={t("noMembers")}
              description={t("noMembersDesc")}
              className="py-6"
            />
          )}
        </div>
      )}

      {selectedTab === "goals" && (
        <div className="space-y-3">
          {team.isCurrentUserLeader && (
            <LeaderBar
              href={`/teams/${teamId}/goals/review`}
              icon={Target}
              label={`${t("reviewGoals")}${pendingGoalsCount > 0 ? ` (${pendingGoalsCount})` : ""}`}
            />
          )}
          <Card className="p-4">
            {team.goals.length > 0 ? (
              <div className="space-y-3">
                {team.goals.map((goal) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-text-primary">
                        {goal.title}
                      </p>
                      <Badge
                        variant={
                          goal.status === "APPROVED" ? "accent" : "muted"
                        }
                      >
                        {goal.status.toLowerCase()}
                      </Badge>
                    </div>
                    <ProgressBar value={goal.progress} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title={t("noGoals")}
                description={t("noGoalsDesc")}
                className="py-6"
              />
            )}
          </Card>
        </div>
      )}

      {selectedTab === "guides" && (
        <div className="space-y-3">
          {team.isCurrentUserLeader && (
            <LeaderBar
              href={`/teams/${teamId}/guides/new`}
              icon={BookPlus}
              label={t("newGuide")}
              actionVisible={isArrangingGuides}
            >
              <button
                type="button"
                aria-label={
                  isArrangingGuides ? t("doneEditingGuides") : tCommon("edit")
                }
                title={
                  isArrangingGuides ? t("doneEditingGuides") : tCommon("edit")
                }
                aria-pressed={isArrangingGuides}
                onClick={() => setIsArrangingGuides((arranging) => !arranging)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] border-[1.5px] border-accent text-accent transition-colors hover:bg-accent-light/30 ${
                  isArrangingGuides ? "bg-accent-light/30" : ""
                }`}
              >
                {isArrangingGuides ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
              </button>
            </LeaderBar>
          )}
          {team.guides.length > 0 && (
            <TeamGuideSections
              teamId={teamId}
              guides={team.guides}
              sections={team.guideSections}
              isLeader={team.isCurrentUserLeader}
              isArranging={isArrangingGuides}
            />
          )}
          {team.guides.length === 0 && (
            <Card className="p-4">
              <EmptyState
                icon={BookOpen}
                title={t("noGuides")}
                description={t("noGuidesDesc")}
                className="py-6"
              />
            </Card>
          )}
        </div>
      )}

      {selectedTab === "training" && (
        <div className="space-y-3">
          {team.isCurrentUserLeader && (
            <LeaderBar
              href={`/teams/${teamId}?tab=training`}
              icon={ClipboardCheck}
              label={t("manageTraining")}
              actionVisible={false}
            >
              <button
                type="button"
                aria-label={
                  isManagingTraining
                    ? t("doneEditingTraining")
                    : t("manageTraining")
                }
                title={
                  isManagingTraining
                    ? t("doneEditingTraining")
                    : t("manageTraining")
                }
                aria-pressed={isManagingTraining}
                onClick={() => setIsManagingTraining((managing) => !managing)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] border-[1.5px] border-accent text-accent transition-colors hover:bg-accent-light/30 ${
                  isManagingTraining ? "bg-accent-light/30" : ""
                }`}
              >
                {isManagingTraining ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
              </button>
            </LeaderBar>
          )}
          {isManagingTraining ? (
            <TeamTrainingContent
              teamId={teamId}
              mode="manage"
              showBackLink={false}
              showHeader={false}
            />
          ) : (
            <TeamTrainingOverview teamId={teamId} />
          )}
        </div>
      )}

      {selectedTab === "feedback" && (
        <div className="space-y-3">
          {team.isCurrentUserLeader && (
            <LeaderBar
              href={`/teams/${teamId}/feedback/new`}
              icon={MessageSquarePlus}
              label={t("writeFeedback")}
            />
          )}
          {team.feedback.map((fb) => (
            <Card
              key={fb.id}
              className="p-4 border-l-4"
              style={{ borderLeftColor: "var(--accent)" }}
            >
              <p className="text-sm text-text-primary italic leading-relaxed">
                &ldquo;{fb.content}&rdquo;
              </p>
              {fb.author && (
                <p className="text-xs text-text-secondary mt-2">
                  &mdash; {fb.author.fullName}
                </p>
              )}
            </Card>
          ))}
          {team.feedback.length === 0 && (
            <Card className="p-4">
              <EmptyState
                icon={MessageSquare}
                title={t("noFeedback")}
                description={t("noFeedbackDesc")}
                className="py-6"
              />
            </Card>
          )}
        </div>
      )}

      {selectedTab === "about" && team.description && (
        <Card className="p-4">
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {typeof team.description === "string"
              ? team.description
              : JSON.stringify(team.description)}
          </p>
        </Card>
      )}
    </div>
  );
}
