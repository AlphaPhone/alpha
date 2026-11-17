/**
 * Owner-facing Clock handoff presentation: the review sentence, repeat-day names and the phone
 * form that builds a reviewed request. Capability policy, dispatch validation, time-zone checks
 * and receipts stay in the shared handoff policy.
 */
import {
  type ClockDay,
  type ClockHandoffOperation,
  clockDays,
  clockTimeZone,
} from "@elizaos/plugin-assistant/device-actions/clock-contract";

export const CLOCK_DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/** Ascending AlarmClock.EXTRA_DAYS order (Sunday=1 through Saturday=7). */
function ascending(days: readonly ClockDay[]): ClockDay[] {
  return [...days].sort((a, b) => a - b);
}

/** Days chosen in a phone form: one to seven unique days, returned ascending. */
export function clockHandoffFormDays(value: unknown): ClockDay[] {
  let days: ClockDay[];
  try {
    days = clockDays(value);
  } catch {
    throw Error("Invalid Clock repeat days");
  }
  if (days.length === 0) throw Error("Invalid Clock repeat days");
  return ascending(days);
}

export function describeClockDays(days: readonly ClockDay[]): string {
  const sorted = ascending(days);
  if (sorted.length === 7) return "every day";
  if (sorted.join() === "2,3,4,5,6") return "weekdays";
  if (sorted.join() === "1,7") return "weekends";
  return sorted.map((day) => CLOCK_DAY_NAMES[day - 1]).join(", ");
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Owner-facing review text. It names what Clock will be asked to do and states
 * that the result is unverified; it never promises creation, dismissal,
 * snoozing or ringing. `product` is the brand name shown to the owner.
 */
export function describeClockHandoff(
  operation: ClockHandoffOperation,
  product: string,
): string {
  if (operation.action === "set")
    return `Ask Clock to set ${pad(operation.hour)}:${pad(operation.minute)} in ${operation.timeZone}${operation.days?.length ? `, repeating ${describeClockDays(operation.days)}` : ""}${operation.label ? ` named “${operation.label}”` : ""}. Review the alarm in Clock; ${product} cannot confirm creation or ringing.`;
  if (operation.action === "show") return "Open Clock’s alarms page.";
  if (operation.action === "snooze")
    return `Open Clock so you can choose the intended alarm and snooze it yourself. Select the duration there; ${operation.snoozeMinutes} minutes will not be applied automatically. Completion stays unverified.`;
  return `Open Clock so you can choose the intended alarm and dismiss it yourself. ${product} will not dismiss or disable an alarm automatically. Completion stays unverified.`;
}

/** A request reviewed in a phone form, before it becomes a native dispatch. */
export type ClockHandoffSetRequest = {
  action: "set";
  hour: number;
  minute: number;
  label: string;
  timeZone: string;
  reviewed: true;
  days?: ClockDay[];
};
export type ClockHandoffRequest =
  | ClockHandoffSetRequest
  | { action: "snooze"; snoozeMinutes: number; reviewed: true }
  | { action: "show" | "dismiss"; reviewed: true };

interface ClockHandoffForm {
  action: "set" | "show" | "snooze" | "dismiss";
  /** Local wall time, HH:mm. */
  time: string;
  label: string;
  /** Snooze minutes as typed, 1 to 60. */
  snooze: string;
  /** Repeat days chosen in the form; empty is a one-time alarm. */
  days: readonly number[];
}

/** Pure form builder. An empty repeat is a one-time alarm and carries no days. */
export function buildClockHandoffRequest(
  form: ClockHandoffForm,
  timeZone: string,
): ClockHandoffRequest {
  if (form.action === "set") {
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time) ||
      typeof form.label !== "string" ||
      form.label.length > 200 ||
      form.label.includes("\0")
    )
      throw Error("Choose a valid time and a label up to 200 characters.");
    const [hour, minute] = form.time.split(":").map(Number);
    return {
      action: "set",
      hour,
      minute,
      label: form.label.trim(),
      timeZone: clockTimeZone(timeZone),
      reviewed: true,
      ...(form.days.length ? { days: clockHandoffFormDays(form.days) } : {}),
    };
  }
  if (form.action === "snooze") {
    if (
      !/^\d{1,2}$/.test(form.snooze) ||
      Number(form.snooze) < 1 ||
      Number(form.snooze) > 60
    )
      throw Error("Choose 1 to 60 snooze minutes.");
    return {
      action: "snooze",
      snoozeMinutes: Number(form.snooze),
      reviewed: true,
    };
  }
  if (form.action !== "show" && form.action !== "dismiss")
    throw Error("Invalid Clock action");
  return { action: form.action, reviewed: true };
}
