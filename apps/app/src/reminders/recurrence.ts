// spec/app/reminders/recurrence.md, "Story: Repeat reminders cleanly across months and leap years"
import { type CivilDate, type Repeat, daysInMonth, nextOccurrence, validDate } from "../../gen/app__reminders__recurrence.ts";

/** Wire recurrence rule shared between Reminders UI and the resident agent. */
export type ReminderRecurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

const wireToSpec: Readonly<Record<ReminderRecurrence, Repeat>> = {
  none: "NoRepeat",
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** Parse a `YYYY-MM-DD` civil date string into a validated `CivilDate`, or `undefined`. @throws {never} */
export function parseCivilDate(text: string | null | undefined): CivilDate | undefined {
  if (!text) return undefined;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!matched) return undefined;
  const date: CivilDate = { year: Number(matched[1]), month: Number(matched[2]), day: Number(matched[3]) };
  return validDate(date) ? date : undefined;
}

/** Format a `CivilDate` as `YYYY-MM-DD`. @throws {never} */
export function formatCivilDate(date: CivilDate): string {
  return `${String(date.year).padStart(4, "0")}-${pad2(date.month)}-${pad2(date.day)}`;
}

/** Convert an epoch millisecond instant into its local `CivilDate`. @throws {never} */
export function civilDateAt(epochMs: number): CivilDate {
  const value = new Date(epochMs);
  return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
}

/** Convert an epoch millisecond instant into a whole local civil day index. @throws {never} */
export function civilDayNumber(epochMs: number): number {
  const d = civilDateAt(epochMs);
  return Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

/** Convert a `YYYY-MM-DD` string into a whole civil day index, or `undefined`. @throws {never} */
export function civilDayFromString(text: string | null | undefined): number | undefined {
  const parsed = parseCivilDate(text);
  if (!parsed) return undefined;
  return Math.floor(Date.UTC(parsed.year, parsed.month - 1, parsed.day) / 86_400_000);
}

/** Convert a civil date and optional minute-of-day into a local epoch millisecond instant. @throws {never} */
export function dueInstantMs(dueDate: string | null, dueMinute: number | null): number | null {
  const parsed = parseCivilDate(dueDate);
  if (!parsed) return null;
  const minute = dueMinute ?? 9 * 60;
  return new Date(parsed.year, parsed.month - 1, parsed.day, Math.floor(minute / 60), minute % 60, 0, 0).getTime();
}

/** Compute the alert trigger instant in epoch milliseconds, honoring snooze and alert lead time. @throws {never} */
export function alertInstantMs(dueDate: string | null, dueMinute: number | null, alertMinutes: number | null, snoozedUntilMs: number | null): number | null {
  if (snoozedUntilMs !== null) return snoozedUntilMs;
  const due = dueInstantMs(dueDate, dueMinute);
  if (due === null) return null;
  if (alertMinutes === null) return null;
  return due - alertMinutes * 60_000;
}

/** Advance a `YYYY-MM-DD` date by one occurrence of `recurrence` using the verified recurrence spec. @throws {never} */
export function advanceDueDate(dueDate: string, recurrence: ReminderRecurrence): string {
  const parsed = parseCivilDate(dueDate);
  if (!parsed || recurrence === "none") return dueDate;
  const dow = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  return formatCivilDate(nextOccurrence(parsed, dow, wireToSpec[recurrence]));
}

/** Shift a `CivilDate` forward by `offsetDays` days (non-negative). */
export function addDaysToDate(date: CivilDate, offsetDays: number): CivilDate {
  const ms = Date.UTC(date.year, date.month - 1, date.day) + offsetDays * 86_400_000;
  const shifted = new Date(ms);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** Compute quick date presets relative to `nowMs`: today, tomorrow, this weekend (Saturday), and next week (+7d). */
export function quickDatePresets(nowMs: number): { readonly today: string; readonly tomorrow: string; readonly weekend: string; readonly nextWeek: string } {
  const today = civilDateAt(nowMs);
  const dow = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
  const daysToSat = dow === 6 ? 7 : (6 - dow);
  return {
    today: formatCivilDate(today),
    tomorrow: formatCivilDate(addDaysToDate(today, 1)),
    weekend: formatCivilDate(addDaysToDate(today, daysToSat)),
    nextWeek: formatCivilDate(addDaysToDate(today, 7)),
  };
}

/** Compute the snooze target instant for 10m, 1h, or tomorrow 9:00 AM relative to `nowMs`. */
export function snoozeTargetMs(nowMs: number, preset: "10m" | "1h" | "tomorrow"): number {
  if (preset === "10m") return nowMs + 10 * 60_000;
  if (preset === "1h") return nowMs + 60 * 60_000;
  const tomorrow = addDaysToDate(civilDateAt(nowMs), 1);
  return new Date(tomorrow.year, tomorrow.month - 1, tomorrow.day, 9, 0, 0, 0).getTime();
}

/** Format a minute-of-day (`0..1439`) as a 12-hour clock string (e.g. `9:00 AM`). */
export function formatMinuteOfDay(minute: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minute)));
  const hour24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${pad2(mins)} ${period}`;
}

/** Format a minute-of-day as `HH:MM` for time inputs. */
export function minuteToInputTime(minute: number | null): string {
  const clamped = minute === null ? 9 * 60 : Math.max(0, Math.min(1439, Math.floor(minute)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

/** Parse an `HH:MM` string into a minute-of-day (`0..1439`), or `null`. */
export function inputTimeToMinute(value: string): number | null {
  const matched = /^(\d{2}):(\d{2})$/.exec(value);
  if (!matched) return null;
  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Human-readable recurrence label. */
export function formatRecurrence(recurrence: ReminderRecurrence): string {
  switch (recurrence) {
    case "none": return "Never";
    case "daily": return "Daily";
    case "weekdays": return "Every weekday";
    case "weekly": return "Weekly";
    case "monthly": return "Monthly";
    case "yearly": return "Yearly";
  }
}

/** Format a due date and optional time relative to `nowMs`. */
export function formatRelativeDue(dueDate: string | null, dueMinute: number | null, nowMs: number, overdue: boolean): string {
  const parsed = parseCivilDate(dueDate);
  if (!parsed) return "";
  const todayDay = civilDayNumber(nowMs);
  const targetDay = civilDayFromString(dueDate) ?? todayDay;
  const delta = targetDay - todayDay;
  const dateLabel = delta === 0 ? "Today"
    : delta === 1 ? "Tomorrow"
    : delta === -1 ? "Yesterday"
    : `${monthNames[parsed.month - 1]} ${parsed.day}${parsed.year !== civilDateAt(nowMs).year ? `, ${parsed.year}` : ""}`;
  const timePart = dueMinute !== null ? ` ${formatMinuteOfDay(dueMinute)}` : "";
  return overdue ? `Overdue · ${dateLabel}${timePart}` : `${dateLabel}${timePart}`;
}

/** Days in the month of a `YYYY-MM-DD` date, delegating to the verified spec. */
export function monthLength(year: number, month: number): number {
  return daysInMonth(year, month);
}
