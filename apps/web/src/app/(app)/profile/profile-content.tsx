"use client";

import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Database, Globe, LogOut, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SegmentControl } from "@/components/ui/segment-control";
import { useTheme } from "@/components/theme-provider";
import { locales, type Locale } from "@/i18n/config";

const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "中文(简体)",
  "zh-TW": "中文(繁體)",
  mi: "Te Reo Māori",
  sm: "Gagana Samoa",
  hi: "हिन्दी",
  ko: "한국어",
  to: "Lea Fakatonga",
  tl: "Tagalog",
  ja: "日本語",
};

export function ProfileContent() {
  const trpc = useTRPC();
  const t = useTranslations("Profile");
  const tAuth = useTranslations("Auth");
  const currentLocale = useLocale();
  const router = useRouter();
  const { data: profile } = useSuspenseQuery(
    trpc.people.myTeamProfile.queryOptions(),
  );
  const { theme, setTheme } = useTheme();

  const setLocaleMutation = useMutation(
    trpc.preferences.setLocale.mutationOptions(),
  );

  function handleLocaleChange(newLocale: Locale) {
    document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setLocaleMutation.mutate({ locale: newLocale });
    router.refresh();
  }

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
            <p className="text-sm text-text-primary">Source identities</p>
            <p className="text-xs text-text-tertiary">
              PCO and Rock records linked to this My Team profile.
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
            No PCO or Rock records are linked yet.
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

        <div className="border-t border-border" />

        {/* Language */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-text-secondary" />
            <span className="text-sm text-text-primary">{t("language")}</span>
          </div>
          <select
            value={currentLocale}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
            className="rounded-[10px] border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {locales.map((loc) => (
              <option key={loc} value={loc}>
                {localeNames[loc]}
              </option>
            ))}
          </select>
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
