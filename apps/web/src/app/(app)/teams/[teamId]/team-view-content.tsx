"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Users,
  BookOpen,
  Target,
  MessageSquarePlus,
  BookPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { UpcomingServing } from "@/components/teams/upcoming-serving";
import { LeaderBar } from "@/components/teams/leader-bar";
import { Avatar } from "@/components/ui/avatar";

type TeamViewContentProps = {
  teamId: string;
};

type Tab = "serving" | "members" | "goals" | "guides" | "feedback" | "about";

function formatServingDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatLastServed(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function MemberRow({
  member,
  lastServed,
  showLastServed,
}: {
  member: { id: string; fullName: string; image?: string | null };
  lastServed?: string;
  showLastServed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={member.fullName} src={member.image} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{member.fullName}</p>
      </div>
      {showLastServed && (
        <span className="text-xs text-text-tertiary shrink-0">
          {lastServed ? formatLastServed(lastServed) : "Never"}
        </span>
      )}
    </div>
  );
}

export function TeamViewContent({ teamId }: TeamViewContentProps) {
  const trpc = useTRPC();
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
    })),
  }));

  // Leaders as a special group
  const leaders = team.leaders.map((l) => ({
    id: l.person.id,
    fullName: l.person.fullName,
    image: l.person.image,
  }));

  const pendingGoalsCount = team.goals.filter(
    (g) => g.status === "PENDING",
  ).length;

  // Build tabs — only show tabs that have content (except serving which always shows)
  const allTabs: { value: Tab; label: string }[] = [
    { value: "serving", label: "Serving" },
    { value: "members", label: "Members" },
    { value: "goals", label: "Goals" },
    ...(team.guides.length > 0 || team.isCurrentUserLeader
      ? [{ value: "guides" as Tab, label: "Guides" }]
      : []),
    ...(team.feedback.length > 0 || team.isCurrentUserLeader
      ? [{ value: "feedback" as Tab, label: "Feedback" }]
      : []),
    ...(team.description
      ? [{ value: "about" as Tab, label: "About" }]
      : []),
  ];

  const [activeTab, setActiveTab] = useState<Tab>("serving");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefsMap = useRef<Map<Tab, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

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
    // Also scroll active tab into view
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

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          My Teams
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
            <Badge variant="accent">Team Lead</Badge>
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
      {activeTab === "serving" && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
              My Schedule
            </h3>
            {team.schedules.length > 0 ? (
              <UpcomingServing schedules={team.schedules} />
            ) : (
              <EmptyState
                icon={Calendar}
                title="No Upcoming Schedules"
                description="You have no upcoming serving dates for this team."
                className="py-6"
              />
            )}
          </Card>

          {/* Leader view: team roster per upcoming plan */}
          {team.isCurrentUserLeader &&
            (team.teamSchedules?.length ?? 0) > 0 &&
              (team.teamSchedules ?? []).map((plan) => {
                  // Group people by position/role
                  const roleGroups = new Map<string, typeof plan.people>();
                  for (const person of plan.people) {
                    const role = person.positionName ?? "Unassigned";
                    if (!roleGroups.has(role))
                      roleGroups.set(role, []);
                    roleGroups.get(role)!.push(person);
                  }

                  const confirmedCount = plan.people.filter(
                    (p) => p.status === "CONFIRMED",
                  ).length;
                  const pendingCount = plan.people.filter(
                    (p) => p.status === "UNCONFIRMED",
                  ).length;

                  return (
                    <Link
                      key={plan.planRemoteId}
                      href={`/plans/${plan.planRemoteId}`}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                        {/* Plan header */}
                        <div className="p-4 pb-3">
                          <h3
                            className="text-sm font-semibold text-text-primary"
                            suppressHydrationWarning
                          >
                            {formatServingDate(plan.sortDate)}
                            {plan.startsAt && (
                              <span
                                className="text-text-secondary font-normal"
                                suppressHydrationWarning
                              >
                                {" "}
                                at{" "}
                                {new Date(
                                  plan.startsAt,
                                ).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-text-tertiary">
                              {plan.people.length}{" "}
                              {plan.people.length === 1
                                ? "person"
                                : "people"}
                            </span>
                            {confirmedCount > 0 && (
                              <span className="text-xs text-accent">
                                {confirmedCount} confirmed
                              </span>
                            )}
                            {pendingCount > 0 && (
                              <span className="text-xs text-warning">
                                {pendingCount} pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Role-grouped roster */}
                        <div className="divide-y divide-border">
                          {Array.from(roleGroups.entries()).map(
                            ([roleName, people]) => (
                              <div key={roleName} className="px-4 py-3">
                                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-2">
                                  {roleName}
                                </p>
                                <div className="space-y-1.5">
                                  {people.map((person) => {
                                    const isConfirmed =
                                      person.status === "CONFIRMED";
                                    const isDeclined =
                                      person.status === "DECLINED";

                                    return (
                                      <div
                                        key={person.personId}
                                        className="flex items-center justify-between gap-2"
                                      >
                                        <p
                                          className={`text-sm truncate ${isDeclined ? "text-text-tertiary line-through" : "text-text-primary"}`}
                                        >
                                          {person.personName}
                                        </p>
                                        {isConfirmed ? (
                                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                                        ) : isDeclined ? (
                                          <span className="text-[10px] text-error shrink-0">
                                            Declined
                                          </span>
                                        ) : (
                                          <Clock className="w-3.5 h-3.5 text-warning shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </Card>
                    </Link>
                  );
                })
            }
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Leaders */}
          {leaders.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
                Team Leads
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
          {roleGroups.map((role) => (
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
                  No members in this role
                </p>
              )}
            </Card>
          ))}

          {leaders.length === 0 && roleGroups.length === 0 && (
            <EmptyState
              icon={Users}
              title="No Members"
              description="No members are assigned to this team."
              className="py-6"
            />
          )}
        </div>
      )}

      {activeTab === "goals" && (
        <div className="space-y-3">
          {team.isCurrentUserLeader && (
            <LeaderBar
              href={`/teams/${teamId}/goals/review`}
              icon={Target}
              label={`Review Goals${pendingGoalsCount > 0 ? ` (${pendingGoalsCount})` : ""}`}
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
                title="No Goals Yet"
                description="No goals have been created for this team."
                className="py-6"
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === "guides" && (
        <div className="space-y-3">
          {team.isCurrentUserLeader && (
            <LeaderBar
              href={`/teams/${teamId}/guides/new`}
              icon={BookPlus}
              label="New Guide"
            />
          )}
          {team.guides.map((guide) => (
            <Link key={guide.id} href={`/guides/${guide.id}`}>
              <Card className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {guide.title}
                    </p>
                    {guide.role && (
                      <p className="text-xs text-text-secondary">
                        {guide.role.name}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="space-y-3">
          {team.isCurrentUserLeader && (
            <LeaderBar
              href={`/teams/${teamId}/feedback/new`}
              icon={MessageSquarePlus}
              label="Write Feedback"
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
        </div>
      )}

      {activeTab === "about" && team.description && (
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
