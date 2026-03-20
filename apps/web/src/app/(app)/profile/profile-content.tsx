"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { signOut } from "next-auth/react";
import { LogOut, Mail, Church, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/teams/team-card";

export function ProfileContent() {
  const trpc = useTRPC();
  const { data: person } = useSuspenseQuery(trpc.people.me.queryOptions());
  const { data: teams } = useSuspenseQuery(trpc.teams.list.queryOptions());

  const leaderTeams = person.leaders.map((l) => l.team.name);
  const roleLabel = leaderTeams.length > 0 ? "Team Lead" : "Team Member";

  const memberSince = new Date(person.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="md:grid md:grid-cols-2 md:gap-8 space-y-6 md:space-y-0">
      {/* Left Column: Profile + Account Info */}
      <div className="space-y-4">
        {/* Profile Card */}
        <Card className="p-6 flex flex-col items-center text-center">
          <Avatar name={person.fullName} src={person.image} size="lg" className="w-20 h-20 text-2xl mb-3" />
          <h1 className="text-xl font-bold text-text-primary">
            {person.fullName}
          </h1>
          <Badge variant="accent" className="mt-1.5">
            {roleLabel}
          </Badge>
          {person.email && (
            <p className="text-sm text-text-secondary mt-2">{person.email}</p>
          )}
        </Card>

        {/* Account Info */}
        <Card className="divide-y divide-border">
          {person.email && (
            <div className="flex items-center gap-3 p-4">
              <Mail className="w-5 h-5 text-text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-tertiary">Email</p>
                <p className="text-sm text-text-primary truncate">
                  {person.email}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-4">
            <Church className="w-5 h-5 text-text-secondary shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Organization</p>
              <p className="text-sm text-text-primary">Planning Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Calendar className="w-5 h-5 text-text-secondary shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Member Since</p>
              <p className="text-sm text-text-primary">{memberSince}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column: Teams + Sign Out */}
      <div className="space-y-4">
        <h2 className="text-[15px] font-semibold text-text-primary">
          My Teams
        </h2>
        {teams.length > 0 ? (
          <div className="space-y-3">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                id={team.id}
                name={team.name}
                serviceTypeName={team.serviceType?.name}
                memberCount={team.memberCount}
                userRole={team.userRole}
                isLeader={team.isLeader}
              />
            ))}
          </div>
        ) : (
          <Card className="p-4">
            <p className="text-sm text-text-secondary text-center">
              No teams assigned.
            </p>
          </Card>
        )}

        <Button
          variant="secondary"
          className="w-full border-coral text-coral hover:bg-coral/10"
          style={{
            borderColor: "var(--coral)",
            color: "var(--coral)",
          }}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
