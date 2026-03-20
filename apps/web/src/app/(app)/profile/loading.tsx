import { SkeletonCard } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-4">
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-32" />
    </div>
  );
}
