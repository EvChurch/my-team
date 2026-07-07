"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Database, LogOut, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SegmentControl } from "@/components/ui/segment-control";
import { useTheme } from "@/components/theme-provider";

export function ProfileContent() {
  const trpc = useTRPC();
  const t = useTranslations("Profile");
  const tAuth = useTranslations("Auth");
  const { data: profile } = useSuspenseQuery(
    trpc.people.myTeamProfile.queryOptions(),
  );
  const { theme, setTheme } = useTheme();

  const roleLabel = t("teamMember");
  const sourcePeople = profile.identities.filter((identity) => identity.person);

  return (
    <div className="space-y-4 max-w-lg">
      {/* Profile Card */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={profile.displayName} src={profile.image} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-text-primary truncate">
              {profile.displayName}
            </p>
            <p className="text-[13px] text-text-secondary truncate">
              {profile.email}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 p-4">
          <Database className="w-5 h-5 text-text-secondary" />
          <div>
            <p className="text-sm text-text-primary">{t("sourceIdentities")}</p>
            <p className="text-xs text-text-tertiary">
              {t("sourceIdentitiesDesc")}
            </p>
          </div>
        </div>
        <div className="border-t border-border" />
        {sourcePeople.length > 0 ? (
          sourcePeople.map((identity) => (
            <div
              key={identity.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {identity.person?.fullName}
                </p>
                <p className="text-xs text-text-tertiary truncate">
                  {identity.person?.email ?? identity.remoteId}
                </p>
              </div>
              <span className="rounded-full bg-bg-muted px-2 py-1 text-xs font-semibold text-text-secondary">
                {identity.provider}
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-3 text-sm text-text-tertiary">
            {t("noSourceIdentities")}
          </p>
        )}
      </Card>

      {/* Preferences */}
      <Card>
        {/* Appearance */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-text-secondary" />
            <span className="text-sm text-text-primary">{t("appearance")}</span>
          </div>
          <SegmentControl
            segments={[
              { value: "light", label: t("light") },
              { value: "dark", label: t("dark") },
              { value: "system", label: t("system") },
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
        {tAuth("signOut")}
      </Button>

      {/* Build info */}
      <p className="text-center text-xs text-text-tertiary">
        {process.env.NEXT_PUBLIC_APP_ENV} · {process.env.NEXT_PUBLIC_GIT_SHA}
      </p>
    </div>
  );
}
