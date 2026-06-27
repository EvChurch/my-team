export default function TrainingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-40 rounded bg-bg-muted" />
        <div className="mt-2 h-4 w-64 rounded bg-bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-bg-card" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-2xl bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
