export default function PlanLoading() {
  return (
    <div className="space-y-5 pb-8 animate-pulse">
      {/* Back link */}
      <div className="h-4 bg-bg-muted rounded w-14" />

      {/* Header */}
      <div>
        <div className="h-3 bg-bg-muted rounded w-24 mb-2" />
        <div className="h-6 bg-bg-muted rounded w-56 mb-1.5" />
        <div className="h-4 bg-bg-muted rounded w-36 mb-1.5" />
        <div className="h-3 bg-bg-muted rounded w-20" />
      </div>

      {/* Tab bar */}
      <div className="inline-flex rounded-xl bg-bg-muted p-1 gap-1">
        <div className="h-8 w-28 bg-bg-card rounded-[10px]" />
        <div className="h-8 w-16 rounded-[10px]" />
        <div className="h-8 w-24 rounded-[10px]" />
        <div className="h-8 w-24 rounded-[10px]" />
      </div>

      {/* Service order card with items */}
      <div className="bg-bg-card rounded-2xl shadow-[0_1px_3px_rgba(26,25,24,0.04)] overflow-hidden divide-y divide-border">
        {/* Header item */}
        <div className="px-4 py-2.5 bg-bg-muted/50">
          <div className="h-3 bg-bg-muted rounded w-20" />
        </div>

        {/* Song item */}
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-bg-muted rounded w-40" />
            <div className="h-3 bg-bg-muted rounded w-32" />
          </div>
        </div>

        {/* Song item */}
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-bg-muted rounded w-48" />
            <div className="h-3 bg-bg-muted rounded w-28" />
          </div>
        </div>

        {/* Regular item */}
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-bg-muted rounded w-36" />
          </div>
        </div>

        {/* Header item */}
        <div className="px-4 py-2.5 bg-bg-muted/50">
          <div className="h-3 bg-bg-muted rounded w-24" />
        </div>

        {/* Song item */}
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-bg-muted rounded w-44" />
            <div className="h-3 bg-bg-muted rounded w-36" />
          </div>
        </div>

        {/* Song item */}
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-bg-muted rounded w-52" />
            <div className="h-3 bg-bg-muted rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
