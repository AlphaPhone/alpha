// spec/clock/reminders.md, "Story: Change a reminder exactly once"; spec/clock/reminderDrafts.md, "Story: Find my unsaved reminder where I left it"; spec/clock/reminders.md, "The outcome is decided by reading the reminders back, and a reopen counts only as a new open occurrence at the reviewed time"
// A reminder's due instant, alert and recurrence in the phone's time zone, worked out before anything starts.
import type { Delivery, Precheck, ReminderRow, ReminderStatus } from "../../gen/clock__reminders.ts";
import { localDateTime, phoneTimeZone, wallTime } from "./page.ts";

const MINUTE = 60_000;

/** A reminder as the form holds it: the day from today, the minute of the day, the repeat and the alert lead. */
export interface ReminderDraft {
  readonly title: string;
  readonly body: string;
  readonly dayOffset: number;
  readonly minuteOfDay: number;
  readonly repeat: "none" | "daily" | "weekdays" | "weekly";
  readonly alertMinutes: number | null;
}

/** A reminder form as it is kept between visits: the civil day it names, never an offset from a day that has passed. */
export interface KeptForm {
  readonly title: string;
  readonly body: string;
  readonly date: string;
  readonly minuteOfDay: number;
  readonly repeat: ReminderDraft["repeat"];
  readonly alertMinutes: number | null;
}

const DAY = 86_400_000;

function localMidnight(at: number): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * The form to keep for a draft, naming the civil day it was written for.
 * @throws {never}
 */
export function keptFormOf(draft: ReminderDraft, now: number): KeptForm {
  const day = new Date(localMidnight(now));
  day.setDate(day.getDate() + draft.dayOffset);
  return { title: draft.title, body: draft.body, date: localDateTime(day.getTime()).date, minuteOfDay: draft.minuteOfDay, repeat: draft.repeat, alertMinutes: draft.alertMinutes };
}

/**
 * The draft a kept form resumes as today: the same civil day, whatever day it is now.
 * @throws {never}
 */
export function draftOfKept(form: KeptForm, now: number): ReminderDraft {
  const [y, m, d] = form.date.split("-").map(Number);
  const offset = Math.round((new Date(y, m - 1, d).getTime() - localMidnight(now)) / DAY);
  return { title: form.title, body: form.body, dayOffset: offset, minuteOfDay: form.minuteOfDay, repeat: form.repeat, alertMinutes: form.alertMinutes };
}

/** The store's schedule for a dated reminder. */
export interface ReminderSchedule {
  readonly at: number;
  readonly dueAt: number;
  readonly alertMinutes: number | null;
  readonly recurrence: { rule: "daily" | "weekdays" | "weekly"; zone: string; date: string; time: string; leadMinutes: number } | null;
}

/**
 * The schedule a draft asks for, or the reason it is refused before anything starts.
 * @throws {never}
 */
export function scheduleOf(draft: ReminderDraft, now: number): ReminderSchedule | Precheck {
  const dueAt = wallTime(draft.dayOffset, draft.minuteOfDay, now);
  const lead = draft.alertMinutes ?? 0;
  if (!dueAt || !Number.isFinite(lead) || lead < 0) return "PrecheckTimeSkipped";
  const local = localDateTime(dueAt);
  if (draft.repeat === "weekdays" && (local.weekday === 0 || local.weekday === 6)) return "PrecheckWeekday";
  const zone = phoneTimeZone();
  if (draft.repeat !== "none" && !zone) return "PrecheckTimeSkipped";
  return {
    at: dueAt - lead * MINUTE,
    dueAt,
    alertMinutes: draft.alertMinutes,
    recurrence: draft.repeat === "none" ? null : { rule: draft.repeat, zone, date: local.date, time: local.time, leadMinutes: lead },
  };
}

/**
 * The reviewed reopen of a completed one-off reminder: open keeps it open with no alert at its due instant or the next
 * minute, tomorrow alerts at the same local time tomorrow. A missing local time, or an alert already past, refuses.
 * @throws {never}
 */
export function reopenScheduleOf(row: Pick<ReminderRow, "dueAt" | "hasAlert" | "alertMinutes">, mode: "open" | "tomorrow", now: number): ReminderSchedule | Precheck {
  if (mode === "open") {
    const dueAt = Math.max(row.dueAt, Math.ceil((now + MINUTE) / MINUTE) * MINUTE);
    return { at: dueAt, dueAt, alertMinutes: null, recurrence: null };
  }
  const original = new Date(row.dueAt);
  const dueAt = wallTime(1, original.getHours() * 60 + original.getMinutes(), now);
  if (!dueAt) return "PrecheckTimeSkipped";
  const lead = row.hasAlert ? row.alertMinutes : 0;
  if (dueAt - lead * MINUTE <= now) return "PrecheckTimePassed";
  return { at: dueAt - lead * MINUTE, dueAt, alertMinutes: lead, recurrence: null };
}

const STATUS: Readonly<Record<string, ReminderStatus>> = {
  scheduled: "RScheduled",
  pending: "RPending",
  posted: "RPosted",
  "permission-denied": "RPermissionDenied",
  "scheduling-failed": "RSchedulingFailed",
  completed: "RCompleted",
  cancelled: "RCancelled",
  todo: "RTodo",
};

/**
 * A store status as the listing's status.
 * @throws {never}
 */
export function statusOf(status: string): ReminderStatus {
  return STATUS[status] ?? "RPending";
}

/**
 * Whether a saved reminder will alert: no alert, notifications off, or an alert the phone could not arrange.
 * @throws {never}
 */
export function deliveryOf(status: string): Delivery {
  return status === "pending" ? "NoAlert" : status === "permission-denied" ? "AlertsOff" : status === "scheduling-failed" ? "AlertNotSet" : "Alerting";
}

/**
 * Due and not done, oldest first: posted, or still scheduled after its due instant.
 * @throws {never}
 */
export function overdue(rows: readonly ReminderRow[], now: number): ReminderRow[] {
  return rows.filter((r) => !r.undated && r.dueAt < now && (r.status === "RPosted" || r.status === "RScheduled")).sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * Open and completed undated to-dos, open first.
 * @throws {never}
 */
export function todos(rows: readonly ReminderRow[]): ReminderRow[] {
  return rows.filter((r) => r.undated && (r.status === "RTodo" || r.status === "RCompleted")).sort((a, b) => Number(a.status === "RCompleted") - Number(b.status === "RCompleted"));
}

/**
 * Dated reminders still to come or overdue, by due instant.
 * @throws {never}
 */
export function upcoming(rows: readonly ReminderRow[]): ReminderRow[] {
  return rows.filter((r) => !r.undated && r.status !== "RCancelled").sort((a, b) => a.dueAt - b.dueAt);
}
