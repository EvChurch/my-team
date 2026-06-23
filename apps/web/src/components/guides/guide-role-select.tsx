"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import { useTranslations } from "next-intl";

type GuideRoleSelectProps = {
  value: string;
  onChange: (value: string) => void;
  positions: Array<{ id: string; name: string | null }>;
};

export function GuideRoleSelect({
  value,
  onChange,
  positions,
}: GuideRoleSelectProps) {
  const tCommon = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRole = positions.find((position) => position.id === value);
  const selectedLabel = selectedRole?.name || tCommon("allRoles");

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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-muted text-text-secondary">
            <Users className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase text-text-tertiary">
              {tCommon("role")}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-text-primary">
              {selectedLabel}
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
          className="absolute z-30 mt-2 max-h-[min(22rem,55vh)] w-full overflow-y-auto rounded-xl border border-border bg-bg-card shadow-[var(--shadow-card-strong)]"
        >
          <RoleOption
            label={tCommon("allRoles")}
            isSelected={!value}
            onSelect={() => {
              onChange("");
              setIsOpen(false);
            }}
          />
          {positions.map((position) => (
            <RoleOption
              key={position.id}
              label={position.name || tCommon("role")}
              isSelected={position.id === value}
              onSelect={() => {
                onChange(position.id);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoleOption({
  label,
  isSelected,
  onSelect,
}: {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-bg-muted/50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-muted text-text-secondary">
        <Users className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
        {label}
      </span>
      {isSelected && <Check className="h-4 w-4 shrink-0 text-accent" />}
    </button>
  );
}
