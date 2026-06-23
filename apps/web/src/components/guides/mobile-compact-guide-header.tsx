"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import { ArrowLeft } from "lucide-react";

type MobileCompactGuideHeaderProps = {
  backHref: string;
  backLabel: string;
  title: string;
  sentinelRef: RefObject<HTMLElement | null>;
};

export function MobileCompactGuideHeader({
  backHref,
  backLabel,
  title,
  sentinelRef,
}: MobileCompactGuideHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef]);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 border-b border-border bg-bg-page/95 px-4 py-2.5 shadow-sm backdrop-blur transition-transform duration-200 md:hidden ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="space-y-1">
        <Link
          href={backHref}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg py-0.5 pr-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="truncate">{backLabel}</span>
        </Link>
        <p className="truncate text-base font-semibold leading-5 text-text-primary">
          {title}
        </p>
      </div>
    </div>
  );
}
