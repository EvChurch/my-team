import { SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export default function TeamsLoading() {
  return (
    <div>
      <SkeletonText className="w-32 h-8 mb-6" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="h-[100px]" />
        ))}
      </div>
    </div>
  );
}
