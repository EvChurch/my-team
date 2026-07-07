"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/error-state";

export default function PlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Plans");

  useEffect(() => {
    console.error("Plan error:", error);
  }, [error]);

  const isNotFound =
    error.message?.includes("NOT_FOUND") ||
    error.message?.includes("no longer available");

  if (isNotFound) {
    return (
      <ErrorState
        title={t("planNotAvailable")}
        description={t("planNotAvailableDesc")}
      />
    );
  }

  return (
    <ErrorState
      title={t("planLoadFailed")}
      description={t("planLoadFailedDesc")}
      onRetry={reset}
    />
  );
}
