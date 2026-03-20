import { SkeletonCard, SkeletonText, Skeleton } from "@/components/ui/skeleton";

export default function GoalsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonText className="w-48 h-8" />
      <Skeleton className="h-10 rounded-xl w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-[120px]" />
        ))}
      </div>
    </div>
  );
}
