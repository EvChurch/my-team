"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title,
  description,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const tCommon = useTranslations("Common");
  const resolvedTitle = title ?? tCommon("somethingWentWrong");
  const resolvedDescription = description ?? tCommon("unexpectedError");

  return (
    <div className={`flex flex-col items-center text-center py-12 px-4 ${className}`}>
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-error/10 mb-4">
        <AlertTriangle className="w-6 h-6 text-error" />
      </div>
      <h3 className="text-[15px] font-semibold text-text-primary mb-1">
        {resolvedTitle}
      </h3>
      <p className="text-[13px] text-text-secondary max-w-xs">
        {resolvedDescription}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      )}
    </div>
  );
}
