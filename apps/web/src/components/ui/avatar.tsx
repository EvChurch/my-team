import Image from "next/image";
import type { ComponentProps } from "react";

type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = Omit<ComponentProps<"div">, "children"> & {
  name: string;
  src?: string | null;
  size?: AvatarSize;
};

const sizeMap: Record<AvatarSize, { className: string; px: number }> = {
  sm: { className: "w-8 h-8 text-xs", px: 32 },
  md: { className: "w-10 h-10 text-sm", px: 40 },
  lg: { className: "w-12 h-12 text-base", px: 48 },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]![0]?.toUpperCase() ?? "";
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Avatar({ name, src, size = "md", className = "", ...props }: AvatarProps) {
  const { className: sizeClass, px } = sizeMap[size];
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-accent text-text-on-accent font-semibold shrink-0 ${sizeClass} ${className}`}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
