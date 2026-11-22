// spec/clock/handoff.md, "Clock's answer is shown as it came, and opening Clock is never an alarm result"; spec/clock/reminders.md, "Story: Change a reminder exactly once"; spec/clock/deletions.md, "Story: Undo a reviewed deletion in time"; spec/clock/notifications.md, "Story: Act on exactly the notification I see"
// What Alpha says, in its own words, for each state the clock machines reach.
import type { Handoff, HandoffMessage } from "../../../gen/clock__handoff.ts";
import type { HandoffStatus } from "../../../gen/clock__vocabulary.ts";
import type { Outcome, Precheck, Refusal, DeletionAnswer } from "../../../gen/clock__reminders.ts";
import type { DeletionReport, PendingRow, RowNotice } from "../../../gen/clock__deletions.ts";
import type { NoticeReport } from "../../../gen/clock__notifications.ts";
import type { MirrorReport } from "../../../gen/clock__mirror.ts";

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Repeat days in words: every day, weekdays, weekends or the day names. */
export function describeDays(days: readonly number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (!sorted.length) return "One time";
  if (sorted.length === 7) return "Every day";
  if (sorted.join() === "2,3,4,5,6") return "Weekdays";
  if (sorted.join() === "1,7") return "Weekends";
  return sorted.map((d) => DAY_NAMES[d - 1]).join(", ");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A wall time as HH:mm. */
export const wall = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

/** A duration as h:mm:ss or m:ss. */
export function duration(ms: number, tenths = false): string {
  const total = Math.max(0, Math.floor(ms / 100));
  const s = Math.floor(total / 10);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const body = h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  return tenths ? `${body}.${total % 10}` : body;
}

/** The review sentence for a Clock handoff: what Clock is asked to do, and that the result is unverified. */
export function describeHandoff(h: Handoff, zone: string): string {
  switch (h.handoffAction) {
    case "SetAlarm":
      return `Ask Clock to set ${wall(h.hour, h.minute)} in ${zone}${h.days.length ? `, repeating ${describeDays(h.days).toLowerCase()}` : ""}${h.label.trim() ? ` named “${h.label.trim()}”` : ""}. Review the alarm in Clock; Alpha cannot confirm creation or ringing.`;
    case "ShowAlarms":
      return "Open Clock’s alarms page.";
    case "SnoozeAlarm":
      return `Open Clock so you can choose the intended alarm and snooze it yourself. Select the duration there; ${h.snooze} minutes will not be applied automatically. Completion stays unverified.`;
    case "DismissAlarm":
      return "Open Clock so you can choose the intended alarm and dismiss it yourself. Alpha will not dismiss or disable an alarm automatically. Completion stays unverified.";
  }
}

const CLOCK_REASONS: ReadonlyMap<string, string> = new Map([
  ["No installed Clock app handles this action", "No installed Clock app can do this."],
  ["Phone time zone changed. Review the Clock request again.", "The phone’s time zone changed. Review the Clock request again."],
  ["The Clock app is no longer available", "The Clock app is no longer available."],
  ["Android did not allow this Clock action", "Android didn’t allow this Clock action."],
  ["Clock result is unknown. Check Clock before trying again.", "Alpha can’t tell whether Clock got the request. Check Clock before trying again."],
  ["Review the Clock request before continuing", "Review the Clock request first."],
  ["Open Alpha before continuing to Clock", "Open Alpha, then continue to Clock."],
  ["Unlock the phone before continuing to Clock", "Unlock the phone, then continue to Clock."],
  ["Clock request sent. Check the Clock app; Alpha cannot confirm an alarm was changed.", "Sent to Clock. Check the Clock app; Alpha can’t confirm an alarm changed."],
  ["Choose a Clock action", "Choose a Clock action."],
  ["Repeat days apply only to a new alarm", "Repeat days only apply to a new alarm."],
  ["Choose a valid alarm time", "Choose a valid alarm time."],
  ["Use an alarm label up to 200 characters", "Use an alarm label of up to 200 characters."],
  ["Unexpected Clock options", "This Clock action takes no time, label or snooze."],
  ["Choose 1 to 60 snooze minutes", "Choose a snooze of 1 to 60 minutes."],
  ["Unsupported Clock action", "Clock can’t do that action."],
  ["Choose valid repeat days", "Choose valid repeat days."],
  ["Unexpected Clock option", "The Clock request has an unexpected option. Nothing was sent."],
  ["Invalid Clock time zone", "The Clock request’s time zone is invalid. Nothing was sent."],
  ["Invalid Clock label", "The alarm label is invalid. Nothing was sent."],
  ["Invalid Clock number", "A Clock time or snooze value is invalid. Nothing was sent."],
]);

const CLOCK_STATUS: Readonly<Record<HandoffStatus, string>> = {
  ClockOpened: "Sent to Clock. Check the Clock app; Alpha can’t confirm an alarm changed.",
  ClockUnavailable: "Clock isn’t available for this.",
  ClockDenied: "Android didn’t allow this Clock action.",
  ClockFailed: "Not sent",
  ClockUnknown: "Alpha can’t tell whether Clock got the request. Check Clock before trying again.",
};

/** Alpha's sentence for a handoff message; Clock's own text is never shown. */
export function handoffMessage(m: HandoffMessage): string {
  if (typeof m === "object" && m.tag === "Answered") return CLOCK_REASONS.get(m.reason) ?? CLOCK_STATUS[m.status];
  const tag = typeof m === "object" ? m.tag : m;
  switch (tag) {
    case "NeedsRepeatSupport": return "This phone’s Clock can’t take repeat days yet. Choose one time, or update Alpha.";
    case "ZoneChanged": return "This Clock request used a different time zone. Ask again from this phone.";
    case "NotSent": return "Not sent";
    case "CantReachClock": return "Can’t reach Clock";
    case "Simulated": return "Mock mode: Clock request simulated. No alarm was changed and no app was opened.";
    case "ReviewAgain": return "Review again";
    default: return "";
  }
}

/** The status of the latest handoff, after a restart. */
export const lastHandoff = (status: HandoffStatus) => CLOCK_STATUS[status];

const REFUSALS: Readonly<Record<Refusal, string>> = {
  RefusedPast: "This reminder time has passed. Choose a future time. Nothing was saved.",
  RefusedNotifications: "Notifications are off for Alpha. Enable them in Android settings, then save again. Nothing was saved.",
  RefusedStorageFull: "Reminder storage is full. Complete or delete a reminder, then save again. Nothing was saved.",
  RefusedFailed: "This reminder could not be saved. Check its title and time, then save again. Nothing was saved.",
};

const PRECHECKS: Readonly<Record<Precheck, string>> = {
  PrecheckTimeSkipped: "Time skipped (DST)",
  PrecheckWeekday: "Pick a weekday",
  PrecheckTimePassed: "Time passed",
  PrecheckNoAlert: "Add an alert first",
  PrecheckUpdateRequired: "Update required",
  PrecheckRefreshFirst: "Refresh first",
};

const DELETION_REFUSALS: Readonly<Partial<Record<DeletionAnswer, string>>> = {
  DeletionStale: "This reminder changed. Review it again before deleting.",
  DeletionUnavailable: "Deletion review is unavailable. Open the reminder and try again; nothing changed.",
  DeletionNotStaged: "Deletion was not queued. Nothing changed; review it again if you still want to delete it.",
};

const delivered = (prefix: string, d: string, ok: string) =>
  d === "NoAlert" ? `${prefix} · No alert` : d === "AlertsOff" ? `${prefix} · Alerts off` : d === "AlertNotSet" ? `${prefix} · Alert not set` : ok;

/** What a reminder write's outcome says; nothing for none. */
export function reminderOutcome(o: Outcome, repeats = false): string {
  if (typeof o === "string") return "";
  switch (o.tag) {
    case "Saved": return delivered("Saved", o.delivery, "Reminder scheduled");
    case "Rescheduled": return "Reminder rescheduled";
    case "Updated": return "Updated";
    case "Completed": return delivered("Done", o.delivery, repeats ? "Done · Repeats" : "Done");
    case "Snoozed": return delivered("Saved", o.delivery, "Snoozed 10 minutes");
    case "Reopened": return delivered("Reopened", o.delivery, "Reopened");
    case "AlertUnconfirmed": return "Found · Alert unconfirmed";
    case "AlreadyExists": return "Already exists";
    case "Refused": return REFUSALS[o.refusal];
    case "Unconfirmed": return "Unconfirmed";
    case "Changed": return "Changed";
    case "StillSaving": return "Still saving your last change. Try again in a moment.";
    case "Left": return "";
    case "Prechecked": return PRECHECKS[o.precheck];
    case "DeletionPaused": return "Paused";
    case "DeletionRefused": return DELETION_REFUSALS[o.answer] ?? "Unconfirmed";
    case "TodoSaved": return "Saved";
    case "TodoCompleted": return "To-do completed.";
    case "TodoReopened": return "To-do reopened.";
    case "TodoDeleted": return "To-do deleted.";
    case "RefreshFailed": return "Couldn’t refresh";
    case "OpenFailed": return "Couldn’t open that reminder. Open Reminders to find it.";
    default: return "";
  }
}

const NOTICE_TEXT: Readonly<Record<RowNotice, string>> = {
  NoticePaused: "Deletion paused. Undo to keep it, then review again if you still want to delete.",
  NoticeQueued: "Deletion queued for 10 seconds.",
  NoticeVerifying: "Deletion is being verified.",
  NoticeUncertain: "Deletion outcome needs review and won't be repeated.",
};

/** A pending deletion's row title and message. */
export function deletionRow(row: PendingRow, notice: RowNotice): { title: string; message: string } {
  return { title: row.title || (row.kind === "CalendarDeletion" ? "Selected event" : "Selected reminder"), message: NOTICE_TEXT[notice] };
}

/** What the Undo notice reports after an Undo, a dismissal or a failed read. */
export function deletionReport(r: DeletionReport): string {
  switch (r) {
    case "StatusUnavailable": return "Pending deletion status is unavailable. Refresh before making another change.";
    case "Kept": return "Kept";
    case "UndoTooLate": return "Undo was too late. The deletion already went ahead; check the item before relying on it.";
    case "UndoUnconfirmed": return "Undo could not be confirmed. The deletion may already have gone ahead; refresh and inspect the saved item.";
    case "OutcomeDismissed": return "Outcome dismissed. The receipt is retained; nothing was restored or repeated.";
    case "DismissFailed": return "The outcome could not be dismissed. Refresh the receipt and try again.";
    default: return "";
  }
}

/** What the shade reports after an action. */
export function noticeReport(r: NoticeReport): string {
  switch (r) {
    case "ReportChanged": return "Changed";
    case "ReportOngoing": return "Ongoing";
    case "ReportNoAction": return "No action";
    case "ReportUpdated": return "Updated";
    case "ReportUnavailable": return "Unavailable";
    case "ReportGone": return "Gone";
    case "ReportAlertsFailed": return "Alerts didn’t load";
    default: return "";
  }
}

/** What the mirror settings report. */
export function mirrorReport(r: MirrorReport): string {
  switch (r) {
    case "SettingsChanged": return "Settings changed. Refresh and try again.";
    case "MirrorSaved": return "Saved";
    case "HistoryCleared": return "History cleared";
    case "HistoryNotCleared": return "History couldn’t be cleared";
    case "MirrorUnavailable": return "Unavailable";
    default: return "";
  }
}
