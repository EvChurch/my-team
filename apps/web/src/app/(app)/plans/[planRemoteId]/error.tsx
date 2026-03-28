"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function PlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Plan error:", error);
  }, [error]);

  const isNotFound =
    error.message?.includes("NOT_FOUND") ||
    error.message?.includes("no longer available");

  if (isNotFound) {
    return (
      <ErrorState
        title="Plan not available"
        description="This plan is no longer available. It may have been removed from Planning Center."
      />
    );
  }

  return (
    <ErrorState
      title="Couldn't load plan"
      description="We had trouble loading this plan. Please try again."
      onRetry={reset}
    />
  );
}
