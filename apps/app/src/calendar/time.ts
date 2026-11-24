// spec/app/calendar/index.md, "Crossing midnight keeps the chosen dates"; spec/app/calendar/index.md, "A read of the phone covers the month before through the month after next, and its first instant is never negative"
import type { Layout } from "../../gen/app__calendar.ts";

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

/** The civil day the screen shows: today and the day offset, and in the month view the month offset from that day's month. @throws {never} */
export function shownDay(today: number, layout: Layout, day: number, month: number): number {
  const civil = today + (layout === "ScheduleView" ? 0 : day);
  return layout === "MonthView" && month !== 0 ? monthStart(civil, month) : civil;
}

/** What a read of the screen covers: the month before the shown day's month through the month after next. @throws {never} */
export function readRange(today: number, layout: Layout, day: number, month: number): { begin: number; end: number } {
  const shown = shownDay(today, layout, day, month);
  return { begin: Math.max(0, dayStart(monthStart(shown, -1))), end: dayStart(monthStart(shown, 3)) };
}

/** The Monday that starts the week of a civil day. @throws {never} */
export function weekStart(civil: number): number {
  return civil - ((dateOf(civil).getDay() + 6) % 7);
}

/** The civil days a row covers on this phone: an all-day row its dates, which end before its end. @throws {never} */
export function daysOf(row: { begin: number; end: number; allDay: boolean }): { first: number; last: number } {
  const first = civilDay(row.begin);
  const last = row.end > row.begin ? civilDay(row.end - 1) : first;
  return { first, last: Math.max(first, last) };
}

/** An all-day date from a provider, `YYYY-MM-DD…` in UTC, as the same date's midnight on this phone. @throws {never} */
export function localDate(iso: string): number {
  const [year, month, date] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1).getTime();
}

/** A civil day as the provider's `YYYY-MM-DD` midnight in UTC, for an all-day event. @throws {never} */
export function utcDate(ms: number): string {
  const at = new Date(ms);
  return new Date(Date.UTC(at.getFullYear(), at.getMonth(), at.getDate())).toISOString();
}

/** The phone's own time zone, which a read of the agent's Calendar names. @throws {never} */
export function zone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
