"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@repo/api/client";
import Link from "next/link";
import { ArrowLeft, Target, BookOpen, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollFade } from "@/components/ui/scroll-fade";

type RoleViewContentProps = {
  teamId: string;
  roleId: string;
};

export function RoleViewContent({ teamId, roleId }: RoleViewContentProps) {
  const trpc = useTRPC();
  const { data: position } = useSuspenseQuery(
    trpc.teams.getPosition.queryOptions({ teamId, positionId: roleId }),
  );

  const currentGoals = position.goals.filter(
    (g) => g.status !== "COMPLETED",
  );
  const historicGoals = position.goals.filter(
    (g) => g.status === "COMPLETED",
  );

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div>
        <Link
          href={`/teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {position.team.name}
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">
          {position.name ?? "Unnamed Role"}
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {position.team.name}
        </p>
      </div>

      {/* Description */}
      {position.description && (
        <Card className="p-4">
          <h2 className="text-[15px] font-semibold text-text-primary mb-2">
            Description
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {typeof position.description === "string"
              ? position.description
              : JSON.stringify(position.description)}
          </p>
        </Card>
      )}

      {/* Current Goals */}
      <section>
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          Current Goals
        </h2>
        {currentGoals.length > 0 ? (
          <Card className="p-4 space-y-3">
            {currentGoals.map((goal) => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {goal.person && (
                      <Avatar
                        name={goal.person.fullName}
                        src={goal.person.image}
                        size="sm"
                      />
                    )}
                    <p className="text-sm font-medium text-text-primary truncate">
                      {goal.title}
                    </p>
                  </div>
                  <Badge
                    variant={goal.status === "APPROVED" ? "accent" : "muted"}
                  >
                    {goal.status.toLowerCase()}
                  </Badge>
                </div>
                <ProgressBar value={goal.progress} className="ml-10" />
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={Target}
            title="No Current Goals"
            description="No active goals for this role."
            className="py-6"
          />
        )}
      </section>

      {/* Historic Goals */}
      {historicGoals.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-text-primary mb-3">
            Historic Goals
          </h2>
          <Card className="p-4 space-y-3">
            {historicGoals.map((goal) => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {goal.person && (
                      <Avatar
                        name={goal.person.fullName}
                        src={goal.person.image}
                        size="sm"
                      />
                    )}
                    <p className="text-sm font-medium text-text-primary truncate">
                      {goal.title}
                    </p>
                  </div>
                  <Badge variant="muted">completed</Badge>
                </div>
                <ProgressBar value={100} className="ml-10" />
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Others in This Role */}
      <section>
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          Others in This Role
        </h2>
        {position.assignments.length > 0 ? (
          <Card className="p-4 space-y-3">
            {position.assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center gap-3">
                <Avatar
                  name={assignment.person.fullName}
                  src={assignment.person.image}
                  size="sm"
                />
                <p className="text-sm font-medium text-text-primary">
                  {assignment.person.fullName}
                </p>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={Users}
            title="No Members"
            description="No one is currently assigned to this role."
            className="py-6"
          />
        )}
      </section>

      {/* Role Guides */}
      <section>
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          Role Guides
        </h2>
        {position.guides.length > 0 ? (
          <div className="space-y-2">
            {position.guides.map((guide) => (
              <Link key={guide.id} href={`/guides/${guide.id}`}>
                <Card className="p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent shrink-0" />
                    <p className="text-sm font-medium text-text-primary truncate">
                      {guide.title}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No Guides"
            description="No guides have been created for this role."
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
