"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/error-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tCommon = useTranslations("Common");

  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <ErrorState
      title={tCommon("somethingWentWrong")}
      description={tCommon("unexpectedError")}
      onRetry={reset}
    />
  );
}
