"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-12 px-4 ${className}`}>
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-error/10 mb-4">
        <AlertTriangle className="w-6 h-6 text-error" />
      </div>
      <h3 className="text-[15px] font-semibold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-[13px] text-text-secondary max-w-xs">
        {description}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
