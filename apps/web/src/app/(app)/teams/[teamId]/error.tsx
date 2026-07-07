"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/error-state";

export default function TeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Teams");

  useEffect(() => {
    console.error("Team error:", error);
  }, [error]);

  return (
    <ErrorState
      title={t("teamLoadFailed")}
      description={t("teamLoadFailedDesc")}
      onRetry={reset}
    />
  );
}
