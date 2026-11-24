// spec/app/calendar/index.md, "The calendar holds its layout, today and the day it is anchored to, what each source last read and whether the phone's read was cut short, the reminders it was told of, an open event and one overlay"
const dayMs = 86_400_000;

/** The phone's civil day of `ms`, counted in days from 1970-01-01, in the phone's own time zone. @throws {never} */
export function civilDay(ms: number): number {
  const at = new Date(ms);
  return Math.round(Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) / dayMs);
}

/** The local date of a civil day, as a Date at its midnight. @throws {never} */
export function dateOf(civil: number): Date {
  const utc = new Date(civil * dayMs);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/** The instant a civil day starts on this phone. @throws {never} */
export function dayStart(civil: number): number {
  return dateOf(civil).getTime();
}

/** The first instant of the civil day after `ms`'s: the next midnight. @throws {never} */
export function nextMidnight(ms: number): number {
  return dayStart(civilDay(ms) + 1);
}

/** The civil day of the first of the month `months` after the month of `civil`. @throws {never} */
export function monthStart(civil: number, months: number): number {
  const date = dateOf(civil);
  return civilDay(new Date(date.getFullYear(), date.getMonth() + months, 1).getTime());
}

/** The Monday that starts the week of a civil day. @throws {never} */
export function weekStart(civil: number): number {
  return civil - ((dateOf(civil).getDay() + 6) % 7);
}

/** An all-day date from a provider, `YYYY-MM-DD…` in UTC, as the same date's midnight on this phone. @throws {never} */
export function localDate(iso: string): number {
  const [year, month, date] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1).getTime();
}

/** The phone's own time zone, which a read of the agent's Calendar names. @throws {never} */
export function zone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Open `url` outside Alpha, where it is a plain HTTPS address without credentials; whether it was handed on. @throws {never} */
export function openLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") return false;
    return globalThis.open?.(parsed.href, "_blank", "noopener") !== undefined;
  } catch {
    return false;
  }
}
