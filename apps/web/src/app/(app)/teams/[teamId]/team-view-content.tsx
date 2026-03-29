"use client";

import { useState, useRef, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Users,
  BookOpen,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { LeaderActions } from "@/components/teams/leader-actions";
import { UpcomingServing } from "@/components/teams/upcoming-serving";
import { Avatar } from "@/components/ui/avatar";

type TeamViewContentProps = {
  teamId: string;
};

type Tab = "serving" | "members" | "goals" | "guides" | "feedback" | "about";

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
    ...(team.guides.length > 0
      ? [{ value: "guides" as Tab, label: "Guides" }]
      : []),
    ...(team.feedback.length > 0
      ? [{ value: "feedback" as Tab, label: "Feedback" }]
      : []),
    ...(team.description
      ? [{ value: "about" as Tab, label: "About" }]
      : []),
  ];

  const [activeTab, setActiveTab] = useState<Tab>("serving");
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab]);

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

      {/* Leader Actions */}
      {team.isCurrentUserLeader && (
        <LeaderActions teamId={teamId} pendingGoalsCount={pendingGoalsCount} />
      )}

      {/* Scrolling tab bar */}
      <div
        className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0"
        role="tablist"
      >
        {allTabs.map((tab) => (
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
      {activeTab === "serving" && (
        <Card className="p-4">
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
                  <div key={leader.id} className="flex items-center gap-3">
                    <Avatar
                      name={leader.fullName}
                      src={leader.image}
                      size="sm"
                    />
                    <p className="text-sm text-text-primary">
                      {leader.fullName}
                    </p>
                  </div>
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
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar
                        name={member.fullName}
                        src={member.image}
                        size="sm"
                      />
                      <p className="text-sm text-text-primary">
                        {member.fullName}
                      </p>
                    </div>
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
                      variant={goal.status === "APPROVED" ? "accent" : "muted"}
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
      )}

      {activeTab === "guides" && (
        <div className="space-y-2">
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
        <div className="space-y-2">
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
