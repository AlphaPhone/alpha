// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/timers.md, "Story: Run multiple countdown timers"; spec/app/clock/stopwatch.md, "Story: Time laps with the stopwatch"

/** Day abbreviations indexed by bit position 0..6 (Sunday..Saturday). */
export const DAY_SHORT_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Single-letter day labels for compact repeat toggles. */
export const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** Full day names for accessible aria-labels. */
export const DAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Bitmask constants for common alarm repeat presets. */
export const DAYS_MASK_WEEKDAYS = 0b0111110;
export const DAYS_MASK_WEEKENDS = 0b1000001;
export const DAYS_MASK_EVERY_DAY = 0b1111111;

const pad2 = (value: number) => String(Math.max(0, Math.floor(value))).padStart(2, "0");

/** Toggle a day index (0 = Sun .. 6 = Sat) in a 7-bit days mask. */
export function toggleDayBit(daysMask: number, dayIndex: number): number {
  if (dayIndex < 0 || dayIndex > 6) return daysMask;
  return daysMask ^ (1 << dayIndex);
}

/** Check whether a day index (0 = Sun .. 6 = Sat) is active in a 7-bit days mask. */
export function hasDayBit(daysMask: number, dayIndex: number): boolean {
  return (daysMask & (1 << dayIndex)) !== 0;
}

/** Human-readable repeat summary matching Apple and Google Clock conventions. */
export function describeDaysMask(daysMask: number): string {
  const mask = daysMask & DAYS_MASK_EVERY_DAY;
  if (mask === 0) return "One-time";
  if (mask === DAYS_MASK_EVERY_DAY) return "Every day";
  if (mask === DAYS_MASK_WEEKDAYS) return "Weekdays";
  if (mask === DAYS_MASK_WEEKENDS) return "Weekends";
  return DAY_SHORT_LABELS.filter((_label, idx) => (mask & (1 << idx)) !== 0).join(", ");
}

/** Format an alarm wall time as time + optional AM/PM period. */
export function formatAlarmTime(hour: number, minute: number, hour24: boolean): { readonly time: string; readonly period: string } {
  if (hour24) return { time: `${pad2(hour)}:${pad2(minute)}`, period: "" };
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return { time: `${displayHour}:${pad2(minute)}`, period };
}

/**
 * Compute the next UTC epoch millisecond instant an alarm at `hour:minute` with `daysMask` fires strictly after `nowMs`.
 * @throws {never}
 */
export function nextAlarmFireAt(hour: number, minute: number, daysMask: number, nowMs: number): number {
  const base = new Date(nowMs);
  const startYear = base.getFullYear();
  const startMonth = base.getMonth();
  const startDay = base.getDate();
  const mask = daysMask & DAYS_MASK_EVERY_DAY;
  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = new Date(startYear, startMonth, startDay + offset, hour, minute, 0, 0);
    const ts = candidate.getTime();
    if (ts <= nowMs) continue;
    if (mask === 0) return ts;
    if ((mask & (1 << candidate.getDay())) !== 0) return ts;
  }
  return nowMs + 86_400_000;
}

/** Format a relative countdown string until an alarm rings. */
export function formatAlarmCountdown(fireAtMs: number, nowMs: number): string {
  const diff = Math.max(0, fireAtMs - nowMs);
  const totalMinutes = Math.ceil(diff / 60_000);
  if (totalMinutes <= 1) return "Rings in less than a minute";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) parts.push(`${hours} hr`);
  if (mins > 0) parts.push(`${mins} min`);
  return `Rings in ${parts.join(" ")}`;
}

/** Format timer milliseconds as `MM:SS` or `H:MM:SS` (ceiling to seconds for countdowns). */
export function formatTimerDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
}

/** Format stopwatch elapsed milliseconds as `MM:SS.cc` (or `H:MM:SS.cc` over an hour). */
export function formatStopwatch(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const centis = Math.floor((clamped % 1000) / 10);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`
    : `${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
}

/** Format the local hero clock (time, optional period, weekday/date, and timezone name). */
export function formatLocalHero(nowMs: number, hour24: boolean, timeZone: string): {
  readonly time: string;
  readonly period: string;
  readonly date: string;
  readonly zone: string;
} {
  const dateObj = new Date(nowMs);
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: hour24 ? "2-digit" : "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: !hour24,
  }).formatToParts(dateObj);
  const period = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const time = parts.filter((part) => part.type !== "dayPeriod").map((part) => part.value).join("").trim();
  const date = new Intl.DateTimeFormat(undefined, { timeZone, weekday: "long", month: "long", day: "numeric" }).format(dateObj);
  const zoneParts = new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: "short" }).formatToParts(dateObj);
  const zone = zoneParts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  return { time, period, date, zone };
}

/**
 * Detect whether the host locale prefers 24-hour clocks.
 * @throws {never}
 */
export function detectHour24(): boolean {
  try {
    const resolved = Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
    return resolved.hourCycle === "h23" || resolved.hourCycle === "h24" || resolved.hour12 === false;
  } catch {
    return false;
  }
}
