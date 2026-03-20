"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function TeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Team error:", error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load team"
      description="We had trouble loading this team. Please try again."
      onRetry={reset}
    />
  );
}
