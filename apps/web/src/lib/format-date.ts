export function formatDate(dateStr: Date | string, timeZone: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-NZ", { timeZone });

  if (fmt(date) === fmt(now)) return "Today";
  if (fmt(date) === fmt(tomorrow)) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(dateStr: Date | string, timeZone: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeRange(
  startsAt: Date | string | null,
  endsAt: Date | string | null,
  timeZone: string,
): string {
  if (!startsAt) return "";
  const start = formatTime(startsAt, timeZone);
  if (!endsAt) return start;
  return `${start} \u2013 ${formatTime(endsAt, timeZone)}`;
}

export function formatDateTime(dateStr: string, timeZone: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
