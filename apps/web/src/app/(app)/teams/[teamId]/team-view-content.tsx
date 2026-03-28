"use client";

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
import { ScrollFade } from "@/components/ui/scroll-fade";
import { LeaderActions } from "@/components/teams/leader-actions";
import { TeamMembersList } from "@/components/teams/team-members-list";
import { TeamRolesList } from "@/components/teams/team-roles-list";
import { UpcomingServing } from "@/components/teams/upcoming-serving";

type TeamViewContentProps = {
  teamId: string;
};

export function TeamViewContent({ teamId }: TeamViewContentProps) {
  const trpc = useTRPC();
  const { data: team } = useSuspenseQuery(
    trpc.teams.get.queryOptions({ teamId }),
  );

  // Derive members list from positions + leaders
  const members = [
    ...team.leaders.map((l) => ({
      id: l.person.id,
      fullName: l.person.fullName,
      image: l.person.image,
      role: "Team Lead",
      isLeader: true,
    })),
    ...team.positions.flatMap((pos) =>
      pos.assignments.map((a) => ({
        id: a.person.id,
        fullName: a.person.fullName,
        image: a.person.image,
        role: pos.name ?? "Member",
        isLeader: false,
      })),
    ),
  ];

  // Deduplicate members (a person can be both leader and assigned)
  const uniqueMembers = Array.from(
    new Map(members.map((m) => [m.id, m])).values(),
  );

  // Derive roles from positions
  const roles = team.positions.map((pos) => ({
    id: pos.id,
    name: pos.name,
    memberCount: pos.assignments.length,
  }));

  // Count pending goals for leader
  const pendingGoalsCount = team.goals.filter(
    (g) => g.status === "PENDING",
  ).length;

  return (
    <div className="space-y-6 relative">
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

      {/* My Upcoming Serving */}
      <Card className="p-4">
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          My Upcoming Serving
        </h2>
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

      {/* About */}
      {team.description && (
        <Card className="p-4">
          <h2 className="text-[15px] font-semibold text-text-primary mb-2">
            About
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {typeof team.description === "string"
              ? team.description
              : JSON.stringify(team.description)}
          </p>
        </Card>
      )}

      {/* Team Roles */}
      {roles.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-text-primary mb-3">
            Team Roles
          </h2>
          <TeamRolesList teamId={teamId} roles={roles} />
        </section>
      )}

      {/* Team Goals */}
      <section>
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          Team Goals
        </h2>
        {team.goals.length > 0 ? (
          <Card className="p-4 space-y-3">
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
          </Card>
        ) : (
          <EmptyState
            icon={Target}
            title="No Goals Yet"
            description="No goals have been created for this team."
            className="py-6"
          />
        )}
      </section>

      {/* Leader Feedback */}
      {team.feedback.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-text-primary mb-3">
            Leader Feedback
          </h2>
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
        </section>
      )}

      {/* Guides */}
      {team.guides.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-text-primary mb-3">
            Guides
          </h2>
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
        </section>
      )}

      {/* Team Members */}
      <section>
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          Team Members
        </h2>
        {uniqueMembers.length > 0 ? (
          <Card className="p-4">
            <TeamMembersList members={uniqueMembers} />
          </Card>
        ) : (
          <EmptyState
            icon={Users}
            title="No Members"
            description="No members are assigned to this team."
            className="py-6"
          />
        )}
      </section>

      {/* Mobile scroll fade */}
      <div className="fixed bottom-[62px] left-0 right-0 md:hidden">
        <ScrollFade />
      </div>
    </div>
  );
}
