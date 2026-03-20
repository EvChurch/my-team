type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-bg-muted rounded ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-bg-card rounded-2xl ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonText({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-bg-muted rounded h-4 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonAvatar({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-bg-muted rounded-full w-9 h-9 shrink-0 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonProgressBar({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-bg-muted rounded-full h-2 w-full ${className}`}
      aria-hidden
    />
  );
}
