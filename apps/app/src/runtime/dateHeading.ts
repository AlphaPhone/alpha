/** Days within this many days of today have a heading of their own, as in v121; older items are grouped by month. */
const dayHeadings = 30;
const startOfDay = (at: number) => new Date(at).setHours(0, 0, 0, 0);

/** The heading for a timestamp, grouped by day or month. */
export function headingOf(at: number, now: number, exactDay = false): string {
  const ago = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  const shot = new Date(at);
  if (ago <= 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago < dayHeadings || exactDay) {
    const includeYear = ago >= dayHeadings || shot.getFullYear() !== new Date(now).getFullYear();
    return shot.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(includeYear ? { year: "numeric" } : {}) });
  }
  return shot.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
