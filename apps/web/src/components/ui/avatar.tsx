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

const initialsPalette = [
  "#3D8A5A",
  "#287D8E",
  "#7A5EA8",
  "#B35C7A",
  "#B46A3C",
  "#5F7D3A",
  "#436FB0",
  "#8B6F28",
  "#A34E45",
  "#4D7C72",
  "#7A684E",
  "#6E6A9E",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]![0]?.toUpperCase() ?? "";
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function getInitialsColor(name: string): string {
  const seed = getInitials(name) || name;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return initialsPalette[hash % initialsPalette.length]!;
}

function isGeneratedInitialsImage(src: string): boolean {
  return src.includes("avatars.planningcenteronline.com/uploads/initials/");
}

export function Avatar({
  name,
  src,
  size = "md",
  className = "",
  style,
  ...props
}: AvatarProps) {
  const { className: sizeClass, px } = sizeMap[size];
  const imageSrc = src && !isGeneratedInitialsImage(src) ? src : null;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full text-text-on-accent font-semibold shrink-0 ${sizeClass} ${className}`}
      style={{
        backgroundColor: imageSrc ? undefined : getInitialsColor(name),
        ...style,
      }}
      {...props}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
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
