"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import Link from "next/link";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  FileText,
  Pencil,
  Play,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { GuideContentRenderer } from "@/components/guides/guide-content-renderer";
import { MobileCompactGuideHeader } from "@/components/guides/mobile-compact-guide-header";

type GuideDetailContentProps = {
  guideId: string;
  backToTeam?: boolean;
};

export function GuideDetailContent({
  guideId,
  backToTeam = false,
}: GuideDetailContentProps) {
  const trpc = useTRPC();
  const t = useTranslations("Guides");
  const tCommon = useTranslations("Common");
  const headerSentinelRef = useRef<HTMLDivElement>(null);

  const { data: guide } = useSuspenseQuery(
    trpc.guides.get.queryOptions({ guideId }),
  );
  const { data: teams } = useSuspenseQuery(trpc.teams.list.queryOptions());

  // Check if user is a leader of the guide's team
  const isLeader = teams.some((t) => t.id === guide.teamId && t.isLeader);
  const backHref = backToTeam ? `/teams/${guide.teamId}?tab=guides` : "/guides";
  const backLabel = backToTeam ? (guide.team?.name ?? t("title")) : t("title");
  const categoryMeta = getCategoryMeta(guide.category, t);

  return (
    <div className="space-y-6 relative">
      <MobileCompactGuideHeader
        backHref={backHref}
        backLabel={backLabel}
        title={guide.title}
        sentinelRef={headerSentinelRef}
      />

      {/* Header */}
      <div ref={headerSentinelRef}>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-2xl font-bold text-text-primary">
              {guide.title}
            </h1>
            {isLeader && (
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/guides/${guideId}/edit`}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-accent bg-transparent px-3 text-sm font-semibold text-accent transition-colors hover:bg-accent-light/30"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {tCommon("edit")}
                </Link>
              </div>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailMetaTile
              icon={categoryMeta.icon}
              label={t("guideType")}
              value={categoryMeta.label}
              accent
            />
            <DetailMetaTile
              icon={Users}
              label={tCommon("role")}
              value={guide.role?.name ?? tCommon("allRoles")}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        <GuideContentRenderer content={guide.content} />
      </div>

    </div>
  );
}

function getCategoryMeta(
  category: "QUICK_START" | "TROUBLESHOOTING" | "SOP",
  t: ReturnType<typeof useTranslations<"Guides">>,
) {
  switch (category) {
    case "QUICK_START":
      return { icon: Play, label: t("quickStart") };
    case "TROUBLESHOOTING":
      return { icon: Wrench, label: t("troubleshooting") };
    case "SOP":
      return { icon: FileText, label: t("standardOperatingProcedure") };
  }
}

function DetailMetaTile({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-bg-card px-3 py-2.5 shadow-[var(--shadow-card)]">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          accent ? "bg-accent-light text-accent" : "bg-bg-muted text-text-secondary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase text-text-tertiary">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-text-primary">
          {value}
        </span>
      </span>
    </div>
  );
}
