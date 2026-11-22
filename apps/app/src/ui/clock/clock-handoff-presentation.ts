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

/** A reviewed Clock request whose time zone no longer matches the phone's. */
export const CLOCK_ZONE_CHANGED =
  "This Clock request used a different time zone. Ask again from this phone.";
/** The phone reports a time zone the shared Clock check cannot use. */
export const CLOCK_ZONE_UNREADABLE =
  "Alpha couldn’t read this phone’s time zone. Check Date & time in Android Settings, then try again.";

/**
 * The shared Clock review's refusals that reach a screen before anything is sent to Clock
 * (`clock-handoff.ts` `assertClockHandoffTimeZone` and the operation check, `clock-contract.ts`
 * `clockTimeZone` through `currentClockTimeZone`), keyed by their reviewed text.
 */
export const CLOCK_REVIEW_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Phone time zone changed. Review the Clock request again.", CLOCK_ZONE_CHANGED],
  ["Invalid Clock time zone", CLOCK_ZONE_UNREADABLE],
  [
    "Invalid Clock handoff operation",
    "This Clock request isn’t one Alpha can open. Ask again. Nothing was sent.",
  ],
]);

/** The phone's time zone through the shared check, refused in Alpha's words. */
export function alphaClockTimeZone(read: () => string): string {
  try {
    return read();
  } catch {
    throw Error(CLOCK_ZONE_UNREADABLE);
  }
}

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
      timeZone: alphaClockTimeZone(() => clockTimeZone(timeZone)),
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

/**
 * Alpha's sentence for each result the phone's Clock handoff answers (the shared
 * `ClockHandoff.launch`/`start` and `ClockDays.strict` in plugin-native-system, launched by
 * Alpha's `DailyAppsPlugin` with the product name "Alpha", plus that plugin's own option checks).
 * The handoff's text is never shown.
 */
export const CLOCK_RESULT_TEXT: ReadonlyMap<string, string> = new Map([
  ["No installed Clock app handles this action", "No installed Clock app can do this."],
  [
    "Phone time zone changed. Review the Clock request again.",
    "The phone’s time zone changed. Review the Clock request again.",
  ],
  ["The Clock app is no longer available", "The Clock app is no longer available."],
  ["Android did not allow this Clock action", "Android didn’t allow this Clock action."],
  [
    "Clock result is unknown. Check Clock before trying again.",
    "Alpha can’t tell whether Clock got the request. Check Clock before trying again.",
  ],
  ["Review the Clock request before continuing", "Review the Clock request first."],
  ["Open Alpha before continuing to Clock", "Open Alpha, then continue to Clock."],
  ["Unlock the phone before continuing to Clock", "Unlock the phone, then continue to Clock."],
  [
    "Clock request sent. Check the Clock app; Alpha cannot confirm an alarm was changed.",
    "Sent to Clock. Check the Clock app; Alpha can’t confirm an alarm changed.",
  ],
  // ClockHandoff.intent refusals.
  ["Choose a Clock action", "Choose a Clock action."],
  ["Repeat days apply only to a new alarm", "Repeat days only apply to a new alarm."],
  ["Choose a valid alarm time", "Choose a valid alarm time."],
  ["Use an alarm label up to 200 characters", "Use an alarm label of up to 200 characters."],
  ["Unexpected Clock options", "This Clock action takes no time, label or snooze."],
  ["Choose 1 to 60 snooze minutes", "Choose a snooze of 1 to 60 minutes."],
  ["Unsupported Clock action", "Clock can’t do that action."],
  // ClockDays.strict.
  ["Choose valid repeat days", "Choose valid repeat days."],
  // DailyAppsPlugin's own option checks.
  ["Unexpected Clock option", "The Clock request has an unexpected option. Nothing was sent."],
  ["Invalid Clock time zone", "The Clock request’s time zone is invalid. Nothing was sent."],
  ["Invalid Clock label", "The alarm label is invalid. Nothing was sent."],
  ["Invalid Clock number", "A Clock time or snooze value is invalid. Nothing was sent."],
]);

const CLOCK_STATUS_TEXT: Readonly<Record<string, string>> = {
  opened: "Sent to Clock. Check the Clock app; Alpha can’t confirm an alarm changed.",
  unavailable: "Clock isn’t available for this.",
  denied: "Android didn’t allow this Clock action.",
  failed: "Not sent",
  unknown: "Alpha can’t tell whether Clock got the request. Check Clock before trying again.",
};

/** Alpha's sentence for a Clock handoff result: its reviewed sentence, else its status. */
export function clockResultText(result: { status?: unknown; message?: unknown }): string {
  const message = typeof result.message === "string" ? result.message.trim() : "";
  const known = CLOCK_RESULT_TEXT.get(message);
  if (known) return known;
  const status = typeof result.status === "string" ? result.status : "";
  return Object.hasOwn(CLOCK_STATUS_TEXT, status) ? CLOCK_STATUS_TEXT[status] : CLOCK_STATUS_TEXT.unknown;
}
