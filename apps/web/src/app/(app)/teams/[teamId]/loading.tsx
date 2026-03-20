import { SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export default function TeamViewLoading() {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonText className="w-20 h-4 mb-3" />
        <SkeletonText className="w-48 h-8" />
        <SkeletonText className="w-32 h-4 mt-1" />
      </div>
      <SkeletonCard className="h-32" />
      <SkeletonCard className="h-32" />
    </div>
  );
}
