"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type LeaderTeam = {
  id: string;
  name: string;
};

type NewGuideButtonProps = {
  teams: LeaderTeam[];
};

export function NewGuideButton({ teams }: NewGuideButtonProps) {
  const t = useTranslations("Guides");
  const tCommon = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);

  if (teams.length === 0) return null;

  if (teams.length === 1) {
    return (
      <Link href={`/teams/${teams[0].id}/guides/new`} className="shrink-0">
        <Button>{t("newGuide")}</Button>
      </Link>
    );
  }

  return (
    <div className="shrink-0">
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {t("newGuide")}
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-guide-team-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-4 shadow-[var(--shadow-card-strong)]">
            <div className="mb-3 flex items-start justify-between gap-3 text-left">
              <div>
                <h2
                  id="new-guide-team-title"
                  className="text-lg font-semibold text-text-primary"
                >
                  {t("selectTeamToCreateGuide")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
                aria-label={tCommon("cancel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto pr-1">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}/guides/new`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-transparent bg-bg-muted/45 px-3 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-border hover:bg-bg-muted/70"
                >
                  <span className="min-w-0 truncate">{team.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
                </Link>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
          <button
            type="button"
            className="absolute inset-0 -z-10 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label={tCommon("cancel")}
          />
        </div>
      )}
    </div>
  );
}
