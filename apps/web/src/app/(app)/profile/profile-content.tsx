"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { signOut } from "next-auth/react";
import { LogOut, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SegmentControl } from "@/components/ui/segment-control";
import { useTheme } from "@/components/theme-provider";

export function ProfileContent() {
  const trpc = useTRPC();
  const { data: person } = useSuspenseQuery(trpc.people.me.queryOptions());
  const { theme, setTheme } = useTheme();

  const leaderTeams = person.leaders.map((l) => l.team.name);
  const roleLabel =
    leaderTeams.length > 0 ? "Team Lead" : "Team Member";

  return (
    <div className="space-y-4 max-w-lg">
      {/* Profile Card */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={person.fullName} src={person.image} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-text-primary truncate">
              {person.fullName}
            </p>
            <p className="text-[13px] text-text-secondary truncate">
              {person.email}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        {/* Appearance */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-text-secondary" />
            <span className="text-sm text-text-primary">Appearance</span>
          </div>
          <SegmentControl
            segments={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
            activeSegment={theme}
            onSegmentChange={setTheme}
          />
        </div>
      </Card>

      {/* Sign Out */}
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

      {/* Build info */}
      <p className="text-center text-xs text-text-tertiary">
        {process.env.NEXT_PUBLIC_APP_ENV} · {process.env.NEXT_PUBLIC_GIT_SHA}
      </p>
    </div>
  );
}
