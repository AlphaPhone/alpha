const minute = 60_000;
const day = 24 * 60 * minute;

const time = (at: number): string => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const sameDay = (a: number, b: number): boolean => new Date(a).toDateString() === new Date(b).toDateString();

/** When a card's newest row came, as v121's Home cards said it: "now", "5m", "3:04 PM" today, "Fri" within six days, otherwise "Oct 3", with the year when it is not this year's. */
export function shortWhen(at: number, now: number): string {
  if (!Number.isFinite(at)) return "";
  const age = now - at;
  if (age >= 0 && age < minute) return "now";
  if (age >= 0 && age < 60 * minute) return `${Math.floor(age / minute)}m`;
  if (sameDay(at, now)) return time(at);
  const date = new Date(at);
  if (age >= 0 && age < 6 * day) return date.toLocaleDateString([], { weekday: "short" });
  const otherYear = date.getFullYear() !== new Date(now).getFullYear();
  return date.toLocaleDateString([], otherYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
}

/** When a page was read, as v121's mail card said it: "3:04 PM" today, otherwise "Wed, Oct 8 3:04 PM". */
export function whenLabel(at: number, now: number): string {
  return sameDay(at, now) ? time(at) : `${new Date(at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} ${time(at)}`;
}
