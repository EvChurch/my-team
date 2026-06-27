"use client";

import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type TrainingModuleCardProps = {
  id: string;
  title: string;
  description: string | null;
  state:
    | "INCOMPLETE"
    | "COMPLETE"
    | "EXPIRED_BLOCKING"
    | "EXPIRED_NON_BLOCKING"
    | "NEEDS_RECOMPLETION";
  isBlocking: boolean;
};

export function TrainingModuleCard({
  id,
  title,
  description,
  state,
  isBlocking,
}: TrainingModuleCardProps) {
  const t = useTranslations("Training");
  const status = statusConfig(state, isBlocking);
  const Icon = status.icon;

  return (
    <Card className="p-4 transition-colors hover:bg-bg-muted/30">
      <Link href={`/training/${id}`} className="block">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${status.iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            <Badge variant={status.badgeVariant}>{t(status.labelKey)}</Badge>
          </div>
          {description ? (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          ) : null}
        </div>
      </div>
      </Link>
    </Card>
  );
}

function statusConfig(
  state: TrainingModuleCardProps["state"],
  isBlocking: boolean,
) {
  if (state === "COMPLETE") {
    return {
      icon: CheckCircle2,
      iconClass: "bg-accent-light text-accent",
      badgeVariant: "accent" as const,
      labelKey: "statusComplete",
    };
  }

  if (state === "EXPIRED_NON_BLOCKING") {
    return {
      icon: RotateCcw,
      iconClass: "bg-warning/15 text-warning",
      badgeVariant: "warning" as const,
      labelKey: "statusRenewalNeeded",
    };
  }

  if (isBlocking) {
    return {
      icon: XCircle,
      iconClass: "bg-error/15 text-error",
      badgeVariant: "warning" as const,
      labelKey:
        state === "NEEDS_RECOMPLETION"
          ? "statusRedoRequired"
          : "statusBlocking",
    };
  }

  return {
    icon: Clock,
    iconClass: "bg-bg-muted text-text-tertiary",
    badgeVariant: "muted" as const,
    labelKey: "statusIncomplete",
  };
}
