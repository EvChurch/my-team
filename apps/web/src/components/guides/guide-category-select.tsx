"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FileText, Play, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

export type GuideCategory = "QUICK_START" | "TROUBLESHOOTING" | "SOP";

type GuideCategorySelectProps = {
  value: GuideCategory;
  onChange: (value: GuideCategory) => void;
};

const categories = [
  {
    value: "QUICK_START",
    labelKey: "quickStart",
    descriptionKey: "quickStartDescription",
    icon: Play,
  },
  {
    value: "TROUBLESHOOTING",
    labelKey: "troubleshooting",
    descriptionKey: "troubleshootingDescription",
    icon: Wrench,
  },
  {
    value: "SOP",
    labelKey: "standardOperatingProcedure",
    descriptionKey: "standardOperatingProcedureDescription",
    icon: FileText,
  },
] as const;

export function GuideCategorySelect({
  value,
  onChange,
}: GuideCategorySelectProps) {
  const t = useTranslations("Guides");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((category) => category.value === value) ?? categories[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg-card px-3 py-2.5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-bg-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
            <SelectedIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text-primary">
              {t(selected.labelKey)}
            </span>
            <span className="mt-0.5 block truncate text-xs text-text-secondary">
              {t(selected.descriptionKey)}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-bg-card shadow-[var(--shadow-card-strong)]"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = category.value === value;

            return (
              <button
                key={category.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(category.value);
                  setIsOpen(false);
                }}
                className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-bg-muted/50"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-muted text-text-secondary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text-primary">
                    {t(category.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
                    {t(category.descriptionKey)}
                  </span>
                </span>
                {isSelected && (
                  <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
