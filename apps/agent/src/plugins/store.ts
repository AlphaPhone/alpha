// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  ClockAlarmPhase, ClockAlarmRecord, ClockSnapshot, ClockSound, ClockTimerRecord, ClockTimerStatus,
  ReminderItemRecord, ReminderListColor, ReminderListIcon, ReminderListRecord, ReminderPriority,
  ReminderRecurrence, RemindersSnapshot, ReminderSubtaskRecord, WorldCityRecord,
} from "./types.ts";

/** Default list identifier always present in Reminders. */
export const DEFAULT_LIST_ID = "default";

const MAX_ALARMS = 64;
const MAX_TIMERS = 16;
const MAX_WORLD_CITIES = 24;
const MAX_TOMBSTONES = 128;
const VALID_SOUNDS = new Set<ClockSound>(["radar", "chime", "pulse", "gentle", "classic"]);
const VALID_ALARM_PHASES = new Set<ClockAlarmPhase>(["idle", "ringing", "snoozed"]);
const VALID_TIMER_STATUSES = new Set<ClockTimerStatus>(["ready", "running", "paused", "ringing"]);
const VALID_LIST_COLORS = new Set<ReminderListColor>(["accent", "blue", "green", "amber", "rose", "violet"]);
const VALID_LIST_ICONS = new Set<ReminderListIcon>(["list", "home", "work", "shopping", "heart", "star", "bookmark", "bolt"]);
const VALID_RECURRENCES = new Set<ReminderRecurrence>(["none", "daily", "weekdays", "weekly", "monthly", "yearly"]);
const VALID_PRIORITIES = new Set<ReminderPriority>(["none", "low", "medium", "high"]);

/** Days in a Gregorian calendar month (month is 1..12). */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** Format a civil date triple as YYYY-MM-DD. */
export function formatCivilDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a YYYY-MM-DD string into validated civil date components. */
export function parseCivilDate(date: string): { readonly year: number; readonly month: number; readonly day: number } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (match === null) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return undefined;
  if (day < 1 || day > daysInMonth(year, month)) return undefined;
  return { year, month, day };
}

/** Today's civil date (YYYY-MM-DD) in the given IANA time zone. */
export function todayCivilDate(nowMs: number, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(nowMs));
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  } catch {
    const d = new Date(nowMs);
    return formatCivilDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
}

/** Add whole days to a civil date string. */
export function addCivilDays(date: string, delta: number): string {
  const parsed = parseCivilDate(date);
  if (parsed === undefined) return date;
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + delta));
  return formatCivilDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** Advance a civil date by one recurrence step with month-end and leap-year clamping. */
export function advanceDueDate(dueDate: string, recurrence: ReminderRecurrence): string | null {
  if (recurrence === "none") return null;
  const parsed = parseCivilDate(dueDate);
  if (parsed === undefined) return null;
  switch (recurrence) {
    case "daily":
      return addCivilDays(dueDate, 1);
    case "weekdays": {
      const dow = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
      const step = dow === 5 ? 3 : dow === 6 ? 2 : 1;
      return addCivilDays(dueDate, step);
    }
    case "weekly":
      return addCivilDays(dueDate, 7);
    case "monthly": {
      const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1;
      const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year;
      const clampedDay = Math.min(parsed.day, daysInMonth(nextYear, nextMonth));
      return formatCivilDate(nextYear, nextMonth, clampedDay);
    }
    case "yearly": {
      const nextYear = parsed.year + 1;
      const clampedDay = Math.min(parsed.day, daysInMonth(nextYear, parsed.month));
      return formatCivilDate(nextYear, parsed.month, clampedDay);
    }
  }
}

/** Convert a civil date and optional minute-of-day into a UTC epoch millisecond timestamp in `timeZone`. */
export function civilToEpochMs(dueDate: string, dueMinute: number | null, timeZone: string): number | null {
  const parsed = parseCivilDate(dueDate);
  if (parsed === undefined) return null;
  const minuteOfDay = dueMinute === null ? 9 * 60 : Math.max(0, Math.min(1439, Math.trunc(dueMinute)));
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const targetUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day, hour, minute, 0, 0);
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    const parts = formatter.formatToParts(new Date(targetUtc));
    const read = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asLocal = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
    const offset = asLocal - targetUtc;
    return targetUtc - offset;
  } catch {
    return targetUtc;
  }
}

/** Compute the next epoch ms an alarm at `hour:minute` with `daysMask` (bit 0 = Sun .. bit 6 = Sat) will fire after `nowMs`. */
export function computeNextAlarmFireAtMs(hour: number, minute: number, daysMask: number, nowMs: number, timeZone: string): number {
  const today = todayCivilDate(nowMs, timeZone);
  const targetMinute = hour * 60 + minute;
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDate = addCivilDays(today, offset);
    const parsed = parseCivilDate(candidateDate);
    if (parsed === undefined) continue;
    const dow = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
    if (daysMask !== 0 && (daysMask & (1 << dow)) === 0) continue;
    const instant = civilToEpochMs(candidateDate, targetMinute, timeZone);
    if (instant !== null && instant > nowMs) return instant;
  }
  return nowMs + 86_400_000;
}

/** Validate an IANA time zone identifier. */
export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

/** Normalize a sound identifier to a supported ClockSound. */
export function normalizeSound(value: unknown, fallback: ClockSound = "radar"): ClockSound {
  return typeof value === "string" && VALID_SOUNDS.has(value as ClockSound) ? (value as ClockSound) : fallback;
}

/** Normalize an alarm phase value. */
export function normalizeAlarmPhase(value: unknown, fallback: ClockAlarmPhase = "idle"): ClockAlarmPhase {
  return typeof value === "string" && VALID_ALARM_PHASES.has(value as ClockAlarmPhase) ? (value as ClockAlarmPhase) : fallback;
}

/** Normalize a timer status value. */
export function normalizeTimerStatus(value: unknown, fallback: ClockTimerStatus = "ready"): ClockTimerStatus {
  return typeof value === "string" && VALID_TIMER_STATUSES.has(value as ClockTimerStatus) ? (value as ClockTimerStatus) : fallback;
}

/** Normalize a reminder list color value. */
export function normalizeListColor(value: unknown, fallback: ReminderListColor = "accent"): ReminderListColor {
  return typeof value === "string" && VALID_LIST_COLORS.has(value as ReminderListColor) ? (value as ReminderListColor) : fallback;
}

/** Normalize a reminder list icon value. */
export function normalizeListIcon(value: unknown, fallback: ReminderListIcon = "list"): ReminderListIcon {
  return typeof value === "string" && VALID_LIST_ICONS.has(value as ReminderListIcon) ? (value as ReminderListIcon) : fallback;
}

/** Normalize a recurrence value. */
export function normalizeRecurrence(value: unknown, fallback: ReminderRecurrence = "none"): ReminderRecurrence {
  return typeof value === "string" && VALID_RECURRENCES.has(value as ReminderRecurrence) ? (value as ReminderRecurrence) : fallback;
}

/** Normalize a priority value. */
export function normalizePriority(value: unknown, fallback: ReminderPriority = "none"): ReminderPriority {
  return typeof value === "string" && VALID_PRIORITIES.has(value as ReminderPriority) ? (value as ReminderPriority) : fallback;
}

function writeAtomic(file: string, data: unknown): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
}

function readJsonFile<T>(file: string): T | undefined {
  try {
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function defaultList(nowMs: number): ReminderListRecord {
  return {
    id: DEFAULT_LIST_ID, name: "Reminders", color: "accent", icon: "list",
    isDefault: true, order: 0, createdAtMs: nowMs, updatedAtMs: nowMs,
  };
}

function ensureDefaultList(lists: readonly ReminderListRecord[], nowMs: number): ReminderListRecord[] {
  const hasDefault = lists.some((list) => list.id === DEFAULT_LIST_ID);
  const next = hasDefault ? [...lists] : [defaultList(nowMs), ...lists];
  return next.map((list, index) => ({ ...list, isDefault: list.id === DEFAULT_LIST_ID, order: index }));
}

function emptyClock(nowMs: number): ClockSnapshot {
  return { version: 0, updatedAtMs: nowMs, alarms: [], timers: [], world: [], deletedAlarmIds: [], deletedTimerIds: [] };
}

function emptyReminders(nowMs: number): RemindersSnapshot {
  return { version: 0, updatedAtMs: nowMs, lists: [defaultList(nowMs)], items: [] };
}

function appendTombstone(existing: readonly string[], id: string): string[] {
  const deduped = existing.filter((entry) => entry !== id);
  deduped.push(id);
  return deduped.slice(-MAX_TOMBSTONES);
}

/** Persistent store for Alpha Clock and Reminders inside the resident agent's state directory. */
export class AlphaAppsStore {
  private readonly clockFile: string | undefined;
  private readonly remindersFile: string | undefined;
  private clock: ClockSnapshot;
  private reminders: RemindersSnapshot;
  private readonly deletedItems = new Map<string, ReminderItemRecord>();
  private readonly clockFn: () => number;

  constructor(options: { readonly stateDirectory?: string; readonly now?: () => number } = {}) {
    this.clockFn = options.now ?? (() => Date.now());
    const nowMs = this.clockFn();
    const dir = options.stateDirectory?.trim() ? path.join(options.stateDirectory, "alpha-apps") : undefined;
    this.clockFile = dir === undefined ? undefined : path.join(dir, "clock.json");
    this.remindersFile = dir === undefined ? undefined : path.join(dir, "reminders.json");
    const loadedClock = this.clockFile === undefined ? undefined : readJsonFile<ClockSnapshot>(this.clockFile);
    this.clock = loadedClock !== undefined && Array.isArray(loadedClock.alarms) ? loadedClock : emptyClock(nowMs);
    const loadedReminders = this.remindersFile === undefined ? undefined : readJsonFile<RemindersSnapshot>(this.remindersFile);
    this.reminders = loadedReminders !== undefined && Array.isArray(loadedReminders.items)
      ? { ...loadedReminders, lists: ensureDefaultList(loadedReminders.lists ?? [], nowMs) }
      : emptyReminders(nowMs);
  }

  now(): number {
    return this.clockFn();
  }

  private saveClock(next: ClockSnapshot): ClockSnapshot {
    this.clock = next;
    if (this.clockFile !== undefined) writeAtomic(this.clockFile, next);
    return next;
  }

  private saveReminders(next: RemindersSnapshot): RemindersSnapshot {
    this.reminders = next;
    if (this.remindersFile !== undefined) writeAtomic(this.remindersFile, next);
    return next;
  }

  /** Current Clock snapshot with live timer countdowns evaluated at `now()`. */
  getClock(): ClockSnapshot {
    const nowMs = this.now();
    let changed = false;
    const timers = this.clock.timers.map((timer) => {
      if (timer.status !== "running" || timer.endAtMs === null) return timer;
      const remaining = Math.max(0, timer.endAtMs - nowMs);
      if (remaining === 0) {
        changed = true;
        return { ...timer, status: "ringing" as const, remainingMs: 0, endAtMs: null, ringStartedAtMs: nowMs, revision: timer.revision + 1, updatedAtMs: nowMs };
      }
      return { ...timer, remainingMs: remaining };
    });
    if (changed) return this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, timers });
    return { ...this.clock, timers };
  }

  /** Merge an incoming Clock snapshot using per-entity revision / updatedAt LWW and tombstones. */
  syncClock(incoming: Partial<ClockSnapshot>): ClockSnapshot {
    const nowMs = this.now();
    const deletedAlarms = new Set([...this.clock.deletedAlarmIds, ...(incoming.deletedAlarmIds ?? [])]);
    const deletedTimers = new Set([...this.clock.deletedTimerIds, ...(incoming.deletedTimerIds ?? [])]);
    const alarmsById = new Map<string, ClockAlarmRecord>();
    for (const alarm of this.clock.alarms) if (!deletedAlarms.has(alarm.id)) alarmsById.set(alarm.id, alarm);
    for (const alarm of incoming.alarms ?? []) {
      if (deletedAlarms.has(alarm.id)) continue;
      const current = alarmsById.get(alarm.id);
      if (current === undefined || alarm.revision > current.revision || (alarm.revision === current.revision && alarm.updatedAtMs >= current.updatedAtMs)) {
        alarmsById.set(alarm.id, alarm);
      }
    }
    const timersById = new Map<string, ClockTimerRecord>();
    for (const timer of this.clock.timers) if (!deletedTimers.has(timer.id)) timersById.set(timer.id, timer);
    for (const timer of incoming.timers ?? []) {
      if (deletedTimers.has(timer.id)) continue;
      const current = timersById.get(timer.id);
      if (current === undefined || timer.revision > current.revision || (timer.revision === current.revision && timer.updatedAtMs >= current.updatedAtMs)) {
        timersById.set(timer.id, timer);
      }
    }
    const world = incoming.world !== undefined ? [...incoming.world].slice(0, MAX_WORLD_CITIES).map((c, idx) => ({ ...c, order: idx })) : this.clock.world;
    return this.saveClock({
      version: Math.max(this.clock.version, incoming.version ?? 0) + 1,
      updatedAtMs: nowMs,
      alarms: [...alarmsById.values()].slice(0, MAX_ALARMS),
      timers: [...timersById.values()].slice(0, MAX_TIMERS),
      world,
      deletedAlarmIds: [...deletedAlarms].slice(-MAX_TOMBSTONES),
      deletedTimerIds: [...deletedTimers].slice(-MAX_TOMBSTONES),
    });
  }

  createAlarm(input: {
    readonly id?: string;
    readonly hour: number;
    readonly minute: number;
    readonly daysMask?: number;
    readonly label?: string;
    readonly sound?: ClockSound;
    readonly vibrate?: boolean;
    readonly enabled?: boolean;
    readonly snoozeMinutes?: number;
    readonly timeZone: string;
  }): ClockAlarmRecord {
    const nowMs = this.now();
    const hour = clampInt(input.hour, 0, 23);
    const minute = clampInt(input.minute, 0, 59);
    const daysMask = clampInt(input.daysMask ?? 0, 0, 127);
    const enabled = input.enabled ?? true;
    const alarm: ClockAlarmRecord = {
      id: input.id?.trim() || `alarm-${randomUUID().slice(0, 8)}`,
      hour, minute, daysMask,
      label: (input.label ?? "").trim().slice(0, 200),
      sound: normalizeSound(input.sound),
      vibrate: input.vibrate ?? true,
      enabled,
      snoozeMinutes: clampInt(input.snoozeMinutes ?? 9, 1, 60),
      phase: "idle",
      fireAtMs: enabled ? computeNextAlarmFireAtMs(hour, minute, daysMask, nowMs, input.timeZone) : null,
      snoozeUntilMs: null,
      missed: false,
      revision: 1,
      updatedAtMs: nowMs,
    };
    const alarms = [...this.clock.alarms.filter((entry) => entry.id !== alarm.id), alarm].slice(0, MAX_ALARMS);
    const deletedAlarmIds = this.clock.deletedAlarmIds.filter((id) => id !== alarm.id);
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, alarms, deletedAlarmIds });
    return alarm;
  }

  private replaceAlarm(id: string, updated: ClockAlarmRecord, nowMs: number): ClockAlarmRecord {
    const alarms = this.clock.alarms.map((entry) => (entry.id === id ? updated : entry));
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, alarms });
    return updated;
  }

  private stashReminder(id: string): { readonly existing: ReminderItemRecord; readonly nowMs: number } | undefined {
    const existing = this.reminders.items.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    this.deletedItems.set(id, existing);
    return { existing, nowMs };
  }

  updateAlarm(id: string, patch: {
    readonly hour?: number;
    readonly minute?: number;
    readonly daysMask?: number;
    readonly label?: string;
    readonly sound?: ClockSound;
    readonly vibrate?: boolean;
    readonly enabled?: boolean;
    readonly snoozeMinutes?: number;
    readonly phase?: ClockAlarmPhase;
    readonly fireAtMs?: number | null;
    readonly snoozeUntilMs?: number | null;
    readonly missed?: boolean;
    readonly timeZone: string;
  }): ClockAlarmRecord | undefined {
    const existing = this.clock.alarms.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const hour = patch.hour === undefined ? existing.hour : clampInt(patch.hour, 0, 23);
    const minute = patch.minute === undefined ? existing.minute : clampInt(patch.minute, 0, 59);
    const daysMask = patch.daysMask === undefined ? existing.daysMask : clampInt(patch.daysMask, 0, 127);
    const enabled = patch.enabled ?? existing.enabled;
    const phase = !enabled ? "idle" : patch.phase === undefined ? existing.phase : normalizeAlarmPhase(patch.phase, existing.phase);
    const fireAtMs = !enabled
      ? null
      : patch.fireAtMs !== undefined
        ? patch.fireAtMs
        : computeNextAlarmFireAtMs(hour, minute, daysMask, nowMs, patch.timeZone);
    const updated: ClockAlarmRecord = {
      ...existing,
      hour, minute, daysMask,
      label: patch.label === undefined ? existing.label : patch.label.trim().slice(0, 200),
      sound: patch.sound === undefined ? existing.sound : normalizeSound(patch.sound, existing.sound),
      vibrate: patch.vibrate ?? existing.vibrate,
      enabled,
      snoozeMinutes: patch.snoozeMinutes === undefined ? existing.snoozeMinutes : clampInt(patch.snoozeMinutes, 1, 60),
      phase,
      fireAtMs,
      snoozeUntilMs: phase === "snoozed" ? (patch.snoozeUntilMs ?? existing.snoozeUntilMs) : null,
      missed: patch.missed ?? (enabled ? existing.missed : false),
      revision: existing.revision + 1,
      updatedAtMs: nowMs,
    };
    return this.replaceAlarm(id, updated, nowMs);
  }

  snoozeAlarm(id: string, minutes?: number): ClockAlarmRecord | undefined {
    const existing = this.clock.alarms.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const snoozeMinutes = clampInt(minutes ?? existing.snoozeMinutes, 1, 60);
    const until = nowMs + snoozeMinutes * 60_000;
    return this.replaceAlarm(id, {
      ...existing, enabled: true, phase: "snoozed", snoozeUntilMs: until, fireAtMs: until, missed: false,
      revision: existing.revision + 1, updatedAtMs: nowMs,
    }, nowMs);
  }

  dismissAlarm(id: string, timeZone: string): ClockAlarmRecord | undefined {
    const existing = this.clock.alarms.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const repeating = existing.daysMask !== 0;
    return this.replaceAlarm(id, {
      ...existing,
      enabled: repeating ? existing.enabled : false,
      phase: "idle",
      snoozeUntilMs: null,
      missed: false,
      fireAtMs: repeating && existing.enabled ? computeNextAlarmFireAtMs(existing.hour, existing.minute, existing.daysMask, nowMs, timeZone) : null,
      revision: existing.revision + 1,
      updatedAtMs: nowMs,
    }, nowMs);
  }

  deleteAlarm(id: string): ClockAlarmRecord | undefined {
    const existing = this.clock.alarms.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const alarms = this.clock.alarms.filter((entry) => entry.id !== id);
    const deletedAlarmIds = appendTombstone(this.clock.deletedAlarmIds, id);
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, alarms, deletedAlarmIds });
    return existing;
  }

  createTimer(input: { readonly id?: string; readonly label?: string; readonly durationMs: number; readonly startImmediately?: boolean }): ClockTimerRecord {
    const nowMs = this.now();
    const durationMs = clampInt(input.durationMs, 1000, 86_400_000);
    const startNow = input.startImmediately ?? true;
    const timer: ClockTimerRecord = {
      id: input.id?.trim() || `timer-${randomUUID().slice(0, 8)}`,
      label: (input.label ?? "").trim().slice(0, 200),
      durationMs,
      remainingMs: durationMs,
      status: startNow ? "running" : "ready",
      startedAtMs: startNow ? nowMs : null,
      endAtMs: startNow ? nowMs + durationMs : null,
      ringStartedAtMs: null,
      revision: 1,
      updatedAtMs: nowMs,
    };
    const timers = [...this.clock.timers.filter((entry) => entry.id !== timer.id), timer].slice(0, MAX_TIMERS);
    const deletedTimerIds = this.clock.deletedTimerIds.filter((id) => id !== timer.id);
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, timers, deletedTimerIds });
    return timer;
  }

  updateTimer(id: string, patch: {
    readonly action?: "start" | "pause" | "resume" | "reset" | "dismiss" | "add_time";
    readonly addMs?: number;
    readonly label?: string;
    readonly status?: ClockTimerStatus;
    readonly remainingMs?: number;
  }): ClockTimerRecord | undefined {
    const currentSnapshot = this.getClock();
    const existing = currentSnapshot.timers.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    let next: ClockTimerRecord = { ...existing, label: patch.label === undefined ? existing.label : patch.label.trim().slice(0, 200) };
    switch (patch.action) {
      case "start":
      case "resume": {
        const remaining = next.remainingMs > 0 ? next.remainingMs : next.durationMs;
        next = { ...next, status: "running", remainingMs: remaining, startedAtMs: nowMs, endAtMs: nowMs + remaining, ringStartedAtMs: null };
        break;
      }
      case "pause": {
        const remaining = next.endAtMs !== null ? Math.max(0, next.endAtMs - nowMs) : next.remainingMs;
        next = { ...next, status: "paused", remainingMs: remaining, startedAtMs: null, endAtMs: null, ringStartedAtMs: null };
        break;
      }
      case "reset":
      case "dismiss":
        next = { ...next, status: "ready", remainingMs: next.durationMs, startedAtMs: null, endAtMs: null, ringStartedAtMs: null };
        break;
      case "add_time": {
        const delta = clampInt(patch.addMs ?? 60_000, 1000, 86_400_000);
        const added = Math.min(86_400_000, next.remainingMs + delta);
        if (next.status === "running" || next.status === "ringing") {
          next = { ...next, status: "running", durationMs: Math.max(next.durationMs, added), remainingMs: added, startedAtMs: nowMs, endAtMs: nowMs + added, ringStartedAtMs: null };
        } else {
          next = { ...next, durationMs: Math.max(next.durationMs, added), remainingMs: added };
        }
        break;
      }
      default: {
        if (patch.status !== undefined) {
          const status = normalizeTimerStatus(patch.status, next.status);
          const remaining = patch.remainingMs === undefined ? next.remainingMs : clampInt(patch.remainingMs, 0, 86_400_000);
          next = {
            ...next, status, remainingMs: remaining,
            startedAtMs: status === "running" ? nowMs : null,
            endAtMs: status === "running" ? nowMs + remaining : null,
            ringStartedAtMs: status === "ringing" ? nowMs : null,
          };
        }
      }
    }
    const updated: ClockTimerRecord = { ...next, revision: existing.revision + 1, updatedAtMs: nowMs };
    const timers = this.clock.timers.map((entry) => (entry.id === id ? updated : entry));
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, timers });
    return updated;
  }

  deleteTimer(id: string): ClockTimerRecord | undefined {
    const existing = this.clock.timers.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const timers = this.clock.timers.filter((entry) => entry.id !== id);
    const deletedTimerIds = appendTombstone(this.clock.deletedTimerIds, id);
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, timers, deletedTimerIds });
    return existing;
  }

  addWorldCity(input: { readonly id?: string; readonly city: string; readonly region?: string; readonly timeZone: string }): WorldCityRecord {
    const nowMs = this.now();
    const existing = this.clock.world.find((entry) => entry.timeZone.toLowerCase() === input.timeZone.toLowerCase());
    if (existing !== undefined) return existing;
    const city: WorldCityRecord = {
      id: input.id?.trim() || input.timeZone.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      city: input.city.trim(),
      region: (input.region ?? "").trim(),
      timeZone: input.timeZone.trim(),
      order: this.clock.world.length,
    };
    const world = [...this.clock.world, city].slice(0, MAX_WORLD_CITIES).map((entry, idx) => ({ ...entry, order: idx }));
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, world });
    return city;
  }

  removeWorldCity(id: string): WorldCityRecord | undefined {
    const existing = this.clock.world.find((entry) => entry.id === id || entry.timeZone.toLowerCase() === id.toLowerCase());
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const world = this.clock.world.filter((entry) => entry.id !== existing.id).map((entry, idx) => ({ ...entry, order: idx }));
    this.saveClock({ ...this.clock, version: this.clock.version + 1, updatedAtMs: nowMs, world });
    return existing;
  }

  /** Current Reminders snapshot. */
  getReminders(): RemindersSnapshot {
    return this.reminders;
  }

  createList(input: { readonly id?: string; readonly name: string; readonly color?: ReminderListColor; readonly icon?: ReminderListIcon }): ReminderListRecord {
    const nowMs = this.now();
    const list: ReminderListRecord = {
      id: input.id?.trim() || `list-${randomUUID().slice(0, 8)}`,
      name: input.name.trim().slice(0, 80),
      color: normalizeListColor(input.color),
      icon: normalizeListIcon(input.icon),
      isDefault: false,
      order: this.reminders.lists.length,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };
    const lists = ensureDefaultList([...this.reminders.lists.filter((entry) => entry.id !== list.id), list], nowMs);
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, lists });
    return list;
  }

  updateList(id: string, patch: { readonly name?: string; readonly color?: ReminderListColor; readonly icon?: ReminderListIcon }): ReminderListRecord | undefined {
    const existing = this.reminders.lists.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const updated: ReminderListRecord = {
      ...existing,
      name: patch.name === undefined ? existing.name : patch.name.trim().slice(0, 80) || existing.name,
      color: patch.color === undefined ? existing.color : normalizeListColor(patch.color, existing.color),
      icon: patch.icon === undefined ? existing.icon : normalizeListIcon(patch.icon, existing.icon),
      updatedAtMs: nowMs,
    };
    const lists = this.reminders.lists.map((entry) => (entry.id === id ? updated : entry));
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, lists });
    return updated;
  }

  deleteList(id: string, mode: "reassign" | "cascade" = "reassign"): ReminderListRecord | undefined {
    if (id === DEFAULT_LIST_ID) return undefined;
    const existing = this.reminders.lists.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const lists = ensureDefaultList(this.reminders.lists.filter((entry) => entry.id !== id), nowMs);
    const items = mode === "cascade"
      ? this.reminders.items.filter((item) => item.listId !== id)
      : this.reminders.items.map((item) => (item.listId === id ? { ...item, listId: DEFAULT_LIST_ID, revision: item.revision + 1, updatedAtMs: nowMs } : item));
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, lists, items });
    return existing;
  }

  createItem(input: {
    readonly id?: string;
    readonly listId?: string;
    readonly title: string;
    readonly notes?: string;
    readonly dueDate?: string | null;
    readonly dueMinute?: number | null;
    readonly alertMinutes?: number | null;
    readonly recurrence?: ReminderRecurrence;
    readonly priority?: ReminderPriority;
    readonly flagged?: boolean;
    readonly subtasks?: readonly ReminderSubtaskRecord[];
    readonly agentTaskId?: string | null;
  }): ReminderItemRecord {
    const nowMs = this.now();
    const requestedList = input.listId?.trim() || DEFAULT_LIST_ID;
    const listId = this.reminders.lists.some((list) => list.id === requestedList) ? requestedList : DEFAULT_LIST_ID;
    const dueDate = input.dueDate && parseCivilDate(input.dueDate) !== undefined ? input.dueDate.trim() : null;
    const dueMinute = dueDate === null || input.dueMinute === null || input.dueMinute === undefined ? null : clampInt(input.dueMinute, 0, 1439);
    const item: ReminderItemRecord = {
      id: input.id?.trim() || `rem-${randomUUID().slice(0, 8)}`,
      listId,
      title: input.title.trim().slice(0, 240),
      notes: (input.notes ?? "").trim().slice(0, 2000),
      dueDate,
      dueMinute,
      alertMinutes: dueDate === null || input.alertMinutes === null || input.alertMinutes === undefined ? null : clampInt(input.alertMinutes, 0, 1440),
      recurrence: dueDate === null ? "none" : normalizeRecurrence(input.recurrence),
      priority: normalizePriority(input.priority),
      flagged: input.flagged ?? false,
      subtasks: (input.subtasks ?? []).map((sub, idx) => ({ id: sub.id || `sub-${idx + 1}`, title: sub.title.trim(), done: Boolean(sub.done) })),
      completed: false,
      completedAtMs: null,
      snoozedUntilMs: null,
      notifiedAtMs: null,
      agentTaskId: input.agentTaskId ?? null,
      revision: 1,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };
    const items = [...this.reminders.items.filter((entry) => entry.id !== item.id), item];
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, items });
    return item;
  }

  updateItem(id: string, patch: Partial<Omit<ReminderItemRecord, "id" | "createdAtMs">>): ReminderItemRecord | undefined {
    const existing = this.reminders.items.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const listId = patch.listId !== undefined && this.reminders.lists.some((list) => list.id === patch.listId) ? patch.listId : existing.listId;
    const dueDate = patch.dueDate === undefined ? existing.dueDate : patch.dueDate !== null && parseCivilDate(patch.dueDate) !== undefined ? patch.dueDate : null;
    const dueMinute = dueDate === null
      ? null
      : patch.dueMinute === undefined
        ? existing.dueMinute
        : patch.dueMinute === null
          ? null
          : clampInt(patch.dueMinute, 0, 1439);
    const updated: ReminderItemRecord = {
      ...existing,
      listId,
      title: patch.title === undefined ? existing.title : patch.title.trim().slice(0, 240) || existing.title,
      notes: patch.notes === undefined ? existing.notes : patch.notes.trim().slice(0, 2000),
      dueDate,
      dueMinute,
      alertMinutes: dueDate === null ? null : patch.alertMinutes === undefined ? existing.alertMinutes : patch.alertMinutes === null ? null : clampInt(patch.alertMinutes, 0, 1440),
      recurrence: dueDate === null ? "none" : patch.recurrence === undefined ? existing.recurrence : normalizeRecurrence(patch.recurrence, existing.recurrence),
      priority: patch.priority === undefined ? existing.priority : normalizePriority(patch.priority, existing.priority),
      flagged: patch.flagged ?? existing.flagged,
      subtasks: patch.subtasks ?? existing.subtasks,
      completed: patch.completed ?? existing.completed,
      completedAtMs: patch.completedAtMs === undefined ? existing.completedAtMs : patch.completedAtMs,
      snoozedUntilMs: patch.snoozedUntilMs === undefined ? existing.snoozedUntilMs : patch.snoozedUntilMs,
      notifiedAtMs: patch.notifiedAtMs === undefined ? existing.notifiedAtMs : patch.notifiedAtMs,
      agentTaskId: patch.agentTaskId === undefined ? existing.agentTaskId : patch.agentTaskId,
      revision: existing.revision + 1,
      updatedAtMs: nowMs,
    };
    const items = this.reminders.items.map((entry) => (entry.id === id ? updated : entry));
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, items });
    return updated;
  }

  completeItem(id: string): { readonly item: ReminderItemRecord; readonly nextItem: ReminderItemRecord | null } | undefined {
    const stashed = this.stashReminder(id);
    if (stashed === undefined) return undefined;
    const { existing, nowMs } = stashed;
    const nextDate = existing.dueDate !== null ? advanceDueDate(existing.dueDate, existing.recurrence) : null;
    if (nextDate !== null) {
      const advanced: ReminderItemRecord = {
        ...existing,
        dueDate: nextDate,
        subtasks: existing.subtasks.map((sub) => ({ ...sub, done: false })),
        completed: false,
        completedAtMs: null,
        snoozedUntilMs: null,
        notifiedAtMs: null,
        revision: existing.revision + 1,
        updatedAtMs: nowMs,
      };
      const items = this.reminders.items.map((entry) => (entry.id === id ? advanced : entry));
      this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, items });
      return { item: advanced, nextItem: advanced };
    }
    const completed: ReminderItemRecord = {
      ...existing, completed: true, completedAtMs: nowMs, snoozedUntilMs: null,
      revision: existing.revision + 1, updatedAtMs: nowMs,
    };
    const items = this.reminders.items.map((entry) => (entry.id === id ? completed : entry));
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, items });
    return { item: completed, nextItem: null };
  }

  reopenItem(id: string): ReminderItemRecord | undefined {
    return this.updateItem(id, { completed: false, completedAtMs: null });
  }

  snoozeItem(id: string, options: { readonly minutes?: number; readonly untilMs?: number }): ReminderItemRecord | undefined {
    const existing = this.reminders.items.find((entry) => entry.id === id);
    if (existing === undefined) return undefined;
    const nowMs = this.now();
    const until = options.untilMs ?? nowMs + clampInt(options.minutes ?? 10, 1, 10_080) * 60_000;
    return this.updateItem(id, { snoozedUntilMs: until, notifiedAtMs: null });
  }

  deleteItem(id: string): ReminderItemRecord | undefined {
    const stashed = this.stashReminder(id);
    if (stashed === undefined) return undefined;
    const { existing, nowMs } = stashed;
    const items = this.reminders.items.filter((entry) => entry.id !== id);
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, items });
    return existing;
  }

  restoreItem(id: string, fallback?: ReminderItemRecord): ReminderItemRecord | undefined {
    const prior = this.deletedItems.get(id) ?? fallback;
    if (prior === undefined) return undefined;
    const nowMs = this.now();
    this.deletedItems.delete(id);
    const restored: ReminderItemRecord = { ...prior, revision: prior.revision + 1, updatedAtMs: nowMs };
    const exists = this.reminders.items.some((entry) => entry.id === id);
    const items = exists
      ? this.reminders.items.map((entry) => (entry.id === id ? restored : entry))
      : [...this.reminders.items, restored];
    this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, items });
    return restored;
  }

  /** Reconcile scheduled tasks created by `OWNER_REMINDERS` into the default Reminders list. */
  reconcileAgentTasks(tasks: readonly {
    readonly taskId: string;
    readonly kind: string;
    readonly promptInstructions: string;
    readonly status: string;
    readonly trigger: { readonly kind: string; readonly atIso?: string; readonly expression?: string };
    readonly metadata: Readonly<Record<string, unknown>>;
  }[], timeZone: string): void {
    const nowMs = this.now();
    let changed = false;
    const items = [...this.reminders.items];
    for (const task of tasks) {
      if (task.kind !== "personal-assistant.reminder") continue;
      if (task.status === "Dismissed") continue;
      const existingIdx = items.findIndex((item) => item.agentTaskId === task.taskId);
      const completed = task.status === "Completed";
      if (existingIdx >= 0) {
        const current = items[existingIdx];
        if (current !== undefined && current.completed !== completed) {
          items[existingIdx] = { ...current, completed, completedAtMs: completed ? nowMs : null, revision: current.revision + 1, updatedAtMs: nowMs };
          changed = true;
        }
        continue;
      }
      const dueMs = task.trigger.kind === "once" && typeof task.trigger.atIso === "string" ? Date.parse(task.trigger.atIso) : Number.NaN;
      let dueDate: string | null = null;
      let dueMinute: number | null = null;
      if (Number.isFinite(dueMs)) {
        dueDate = todayCivilDate(dueMs, timeZone);
        try {
          const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(dueMs));
          dueMinute = Number(parts.find((p) => p.type === "hour")?.value ?? 9) * 60 + Number(parts.find((p) => p.type === "minute")?.value ?? 0);
        } catch {
          dueMinute = 9 * 60;
        }
      }
      const title = (typeof task.metadata["title"] === "string" && task.metadata["title"].trim() !== "" ? task.metadata["title"] : task.promptInstructions).trim().slice(0, 240);
      const notes = typeof task.metadata["body"] === "string" ? task.metadata["body"].trim().slice(0, 2000) : "";
      const priority = task.metadata["priority"] === "high" ? "high" : "none";
      items.push({
        id: `rem-task-${task.taskId.slice(0, 8)}`,
        listId: DEFAULT_LIST_ID,
        title: title || "Reminder",
        notes,
        dueDate,
        dueMinute,
        alertMinutes: dueDate !== null ? 0 : null,
        recurrence: task.trigger.kind === "cron" ? "daily" : "none",
        priority,
        flagged: false,
        subtasks: [],
        completed,
        completedAtMs: completed ? nowMs : null,
        snoozedUntilMs: null,
        notifiedAtMs: null,
        agentTaskId: task.taskId,
        revision: 1,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });
      changed = true;
    }
    if (changed) this.saveReminders({ ...this.reminders, version: this.reminders.version + 1, updatedAtMs: nowMs, items });
  }
}
