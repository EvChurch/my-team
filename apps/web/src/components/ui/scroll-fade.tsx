type ScrollFadeProps = {
  position?: "top" | "bottom";
  className?: string;
};

export function ScrollFade({ position = "bottom", className = "" }: ScrollFadeProps) {
  return (
    <div
      className={`pointer-events-none h-8 ${
        position === "bottom"
          ? "bg-gradient-to-t from-bg-page to-transparent"
          : "bg-gradient-to-b from-bg-page to-transparent"
      } ${className}`}
      aria-hidden
    />
  );
}
