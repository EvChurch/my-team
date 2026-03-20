import { SkeletonCard, SkeletonText, Skeleton } from "@/components/ui/skeleton";

export default function GuidesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <SkeletonText className="w-24 h-8" />
          <SkeletonText className="w-48 h-4 mt-1" />
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-10 rounded-xl" />
        <SkeletonText className="w-24 h-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}
