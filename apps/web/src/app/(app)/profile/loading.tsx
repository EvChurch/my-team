import { SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div>
      <SkeletonText className="w-24 h-8 mb-6" />
      <div className="space-y-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-48" />
      </div>
    </div>
  );
}
