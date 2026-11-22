// States the clock machines reach, for the stories (`*.meta.tsx`).
import type { AlarmClock } from "../../../gen/clock__alarms.ts";
import type { Timers } from "../../../gen/clock__timers.ts";
import type { Stopwatch } from "../../../gen/clock__stopwatch.ts";
import type { WorldClock } from "../../../gen/clock__worldClock.ts";
import { initial as handoffInitial, type Handoff } from "../../../gen/clock__handoff.ts";
import { initial as remindersInitial, type ReminderRow, type Reminders } from "../../../gen/clock__reminders.ts";
import type { DeletionNotices } from "../../../gen/clock__deletions.ts";
import { initial as shadeInitial, type Shade } from "../../../gen/clock__notifications.ts";
import type { Ringer } from "../../../gen/clock__ringer.ts";

const NOW = 1_800_000_000_000;

/** A page in front, at a fixed instant. */
export const ringer: Ringer = { now: NOW, allowed: true, asking: false, owns: false, ringing: "", rangAt: 0, sounding: false };

/** A page ringing an alarm. */
export const sounding: Ringer = { ...ringer, owns: true, ringing: "alarm_a:3", rangAt: NOW, sounding: true };

/** Two alarms: weekdays at seven, and a one-time alarm that rings now. */
export const alarms: AlarmClock = {
  alarms: [
    { id: "alarm_a", hour: 7, minute: 0, label: "Work", days: [2, 3, 4, 5, 6], nextAt: NOW + 3_600_000, phase: "AlarmSet", revision: 1 },
    { id: "alarm_b", hour: 6, minute: 30, label: "", days: [], nextAt: NOW - 1000, phase: "AlarmRinging", revision: 3 },
  ],
  snoozeMinutes: 10,
  revisions: 3,
};

/** A running timer, a paused one and one that rings. */
export const timers: Timers = {
  timers: [
    { id: "timer_a", label: "Tea", durationMs: 240_000, endsAt: NOW + 90_000, leftMs: 240_000, phase: "TimerRunning", revision: 1 },
    { id: "timer_b", label: "Pasta", durationMs: 600_000, endsAt: 0, leftMs: 300_000, phase: "TimerPaused", revision: 2 },
    { id: "timer_c", label: "", durationMs: 60_000, endsAt: NOW - 1, leftMs: 0, phase: "TimerRinging", revision: 3 },
  ],
  revisions: 3,
};

/** A running stopwatch with two laps. */
export const stopwatch: Stopwatch = { running: true, startedAt: NOW - 75_000, banked: 0, seen: NOW, laps: [31_200, 62_900] };

/** Two followed cities. */
export const world: WorldClock = { zones: ["Asia/Tokyo", "Europe/Paris"] };

/** A set request under review. */
export const reviewing: Handoff = { ...handoffInitial, phase: "Reviewing", reviewedZone: "Europe/Paris", reviews: 1, label: "Gym", days: [2, 4], repeatSupported: true };

/** After Clock opened. */
export const answered: Handoff = { ...handoffInitial, message: { tag: "Answered", status: "ClockOpened", reason: "" }, reviews: 1, admissions: 1, settled: 1, opens: 1 };

const row: ReminderRow = { id: "r1", occurrence: "o1", revision: "v1", title: "Call the dentist", body: "Ask about Friday", status: "RScheduled", undated: false, dueAt: NOW + 7_200_000, hasAlert: true, alertMinutes: 0, repeats: false, deleting: false };

/** A loaded listing: one upcoming, one overdue, one completed and a to-do. */
export const reminders: Reminders = {
  ...remindersInitial,
  loaded: true,
  issued: 1,
  published: 1,
  timingVersion: 2,
  todoVersion: 1,
  rows: [
    row,
    { ...row, id: "r2", title: "Water plants", status: "RPosted", dueAt: NOW - 600_000 },
    { ...row, id: "r3", title: "Pay rent", status: "RCompleted", dueAt: NOW - 86_400_000 },
    { ...row, id: "t1", title: "Buy stamps", undated: true, status: "RTodo", hasAlert: false, dueAt: 0 },
  ],
};

/** The same listing after a failed refresh. */
export const staleReminders: Reminders = { ...reminders, stale: true, failedBefore: true, outcome: { tag: "RefreshFailed" } };

/** A queued deletion inside its window, and an uncertain one. */
export const pendingDeletions: DeletionNotices = {
  owner: "owner",
  generation: 1,
  knownGeneration: 1,
  busyKey: "",
  report: "NoDeletionReport",
  rows: [
    { key: "reminder:op1", kind: "ReminderDeletion", title: "Call the dentist", phase: "JQueued", window: "JOpen" },
    { key: "calendar:op2", kind: "CalendarDeletion", title: "Standup", phase: "JUnknown", window: "JExpired" },
  ],
};

/** An open shade with an own reminder row and another app's ongoing row. */
export const shade: Shade = {
  ...shadeInitial,
  open: true,
  visit: 1,
  rows: [
    { id: "reminder-1", revision: "v1", source: "OwnNotice", kind: "ReminderKind", appLabel: "Alpha Phone", title: "Call the dentist", text: "Ask about Friday", at: NOW, clearable: true, canOpen: true, redacted: false, opaque: true },
    { id: "mail-1", revision: "v1", source: "ExternalNotice", kind: "OtherKind", appLabel: "Mail", title: "Mail", text: "", at: NOW - 60_000, clearable: false, canOpen: false, redacted: true, opaque: false },
  ],
};
