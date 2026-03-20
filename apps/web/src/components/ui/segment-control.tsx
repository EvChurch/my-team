"use client";

type SegmentControlProps<T extends string> = {
  segments: { value: T; label: string }[];
  activeSegment: T;
  onSegmentChange: (value: T) => void;
  className?: string;
};

export function SegmentControl<T extends string>({
  segments,
  activeSegment,
  onSegmentChange,
  className = "",
}: SegmentControlProps<T>) {
  return (
    <div
      className={`inline-flex rounded-xl bg-bg-muted p-1 ${className}`}
      role="tablist"
    >
      {segments.map((segment) => (
        <button
          key={segment.value}
          role="tab"
          aria-selected={activeSegment === segment.value}
          className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
            activeSegment === segment.value
              ? "bg-bg-card text-text-primary shadow-[0_1px_3px_rgba(26,25,24,0.06)]"
              : "text-text-secondary hover:text-text-primary"
          }`}
          onClick={() => onSegmentChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
