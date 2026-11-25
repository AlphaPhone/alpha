// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import { showsApp } from "@elizaos/agent-host";
import {
  type AlphaAppsStore, DEFAULT_SNOOZE_MINUTES, isValidTimeZone, normalizeSound,
} from "./store.ts";
import {
  type AgentAction, type AgentProvider, type AgentRoute, type ClockAlarmRecord, type ClockTimerRecord,
  type WorldCityRecord, asRecord, readBoolean, readNumber, readRawString, readString,
} from "./types.ts";

interface CityEntry {
  readonly city: string;
  readonly region: string;
  readonly timeZone: string;
  readonly aliases?: readonly string[];
}

const WORLD_CITIES: readonly CityEntry[] = [
  { city: "New York", region: "United States", timeZone: "America/New_York", aliases: ["nyc", "manhattan", "est", "edt"] },
  { city: "San Francisco", region: "United States", timeZone: "America/Los_Angeles", aliases: ["sf", "bay area", "pst", "pdt"] },
  { city: "Los Angeles", region: "United States", timeZone: "America/Los_Angeles", aliases: ["la"] },
  { city: "Chicago", region: "United States", timeZone: "America/Chicago", aliases: ["cst", "cdt"] },
  { city: "Denver", region: "United States", timeZone: "America/Denver", aliases: ["mst", "mdt"] },
  { city: "Seattle", region: "United States", timeZone: "America/Los_Angeles" },
  { city: "Honolulu", region: "United States", timeZone: "Pacific/Honolulu", aliases: ["hawaii"] },
  { city: "Anchorage", region: "United States", timeZone: "America/Anchorage", aliases: ["alaska"] },
  { city: "Toronto", region: "Canada", timeZone: "America/Toronto" },
  { city: "Vancouver", region: "Canada", timeZone: "America/Vancouver" },
  { city: "Mexico City", region: "Mexico", timeZone: "America/Mexico_City" },
  { city: "Sao Paulo", region: "Brazil", timeZone: "America/Sao_Paulo", aliases: ["sao paulo", "brazil"] },
  { city: "Buenos Aires", region: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
  { city: "London", region: "United Kingdom", timeZone: "Europe/London", aliases: ["uk", "gmt", "bst"] },
  { city: "Dublin", region: "Ireland", timeZone: "Europe/Dublin" },
  { city: "Lisbon", region: "Portugal", timeZone: "Europe/Lisbon" },
  { city: "Paris", region: "France", timeZone: "Europe/Paris", aliases: ["cet", "cest"] },
  { city: "Berlin", region: "Germany", timeZone: "Europe/Berlin" },
  { city: "Madrid", region: "Spain", timeZone: "Europe/Madrid" },
  { city: "Rome", region: "Italy", timeZone: "Europe/Rome" },
  { city: "Amsterdam", region: "Netherlands", timeZone: "Europe/Amsterdam" },
  { city: "Zurich", region: "Switzerland", timeZone: "Europe/Zurich" },
  { city: "Stockholm", region: "Sweden", timeZone: "Europe/Stockholm" },
  { city: "Athens", region: "Greece", timeZone: "Europe/Athens" },
  { city: "Istanbul", region: "Turkey", timeZone: "Europe/Istanbul" },
  { city: "Cairo", region: "Egypt", timeZone: "Africa/Cairo" },
  { city: "Lagos", region: "Nigeria", timeZone: "Africa/Lagos" },
  { city: "Johannesburg", region: "South Africa", timeZone: "Africa/Johannesburg" },
  { city: "Dubai", region: "United Arab Emirates", timeZone: "Asia/Dubai", aliases: ["uae"] },
  { city: "Riyadh", region: "Saudi Arabia", timeZone: "Asia/Riyadh" },
  { city: "Mumbai", region: "India", timeZone: "Asia/Kolkata", aliases: ["india", "ist"] },
  { city: "New Delhi", region: "India", timeZone: "Asia/Kolkata", aliases: ["delhi"] },
  { city: "Bengaluru", region: "India", timeZone: "Asia/Kolkata", aliases: ["bangalore"] },
  { city: "Bangkok", region: "Thailand", timeZone: "Asia/Bangkok" },
  { city: "Singapore", region: "Singapore", timeZone: "Asia/Singapore", aliases: ["sg"] },
  { city: "Hong Kong", region: "Hong Kong", timeZone: "Asia/Hong_Kong", aliases: ["hk"] },
  { city: "Shanghai", region: "China", timeZone: "Asia/Shanghai", aliases: ["china"] },
  { city: "Beijing", region: "China", timeZone: "Asia/Shanghai" },
  { city: "Taipei", region: "Taiwan", timeZone: "Asia/Taipei" },
  { city: "Tokyo", region: "Japan", timeZone: "Asia/Tokyo", aliases: ["japan", "jst"] },
  { city: "Seoul", region: "South Korea", timeZone: "Asia/Seoul", aliases: ["korea", "kst"] },
  { city: "Sydney", region: "Australia", timeZone: "Australia/Sydney" },
  { city: "Melbourne", region: "Australia", timeZone: "Australia/Melbourne" },
  { city: "Auckland", region: "New Zealand", timeZone: "Pacific/Auckland" },
  { city: "UTC", region: "Coordinated Universal Time", timeZone: "UTC", aliases: ["gmt", "universal"] },
];

/** Resolve a city name, alias, or IANA timezone identifier to a curated city entry. */
export function resolveWorldCity(query: string): { readonly city: string; readonly region: string; readonly timeZone: string } | undefined {
  const cleaned = query.trim();
  if (cleaned === "") return undefined;
  const lower = cleaned.toLowerCase();
  const exact = WORLD_CITIES.find((entry) =>
    entry.city.toLowerCase() === lower
    || entry.timeZone.toLowerCase() === lower
    || (entry.aliases?.some((alias) => alias === lower) ?? false));
  if (exact !== undefined) return { city: exact.city, region: exact.region, timeZone: exact.timeZone };
  const partial = WORLD_CITIES.find((entry) =>
    entry.city.toLowerCase().includes(lower)
    || lower.includes(entry.city.toLowerCase())
    || entry.region.toLowerCase() === lower);
  if (partial !== undefined) return { city: partial.city, region: partial.region, timeZone: partial.timeZone };
  if (isValidTimeZone(cleaned)) {
    const cityPart = cleaned.split("/").pop()?.replace(/_/g, " ") ?? cleaned;
    return { city: cityPart, region: cleaned, timeZone: cleaned };
  }
  return undefined;
}

/** Format an epoch timestamp in a given IANA time zone as a readable clock string. */
export function formatClockTime(nowMs: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
    }).format(new Date(nowMs));
  } catch {
    return new Date(nowMs).toISOString();
  }
}

function formatHourMinute(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m${seconds > 0 ? ` ${seconds}s` : ""}`;
  if (minutes > 0) return `${minutes}m${seconds > 0 ? ` ${seconds}s` : ""}`;
  return `${seconds}s`;
}

const dayBits: Readonly<Record<string, number>> = {
  sunday: 1, monday: 2, tuesday: 4, wednesday: 8, thursday: 16, friday: 32, saturday: 64,
  sun: 1, mon: 2, tue: 4, wed: 8, thu: 16, fri: 32, sat: 64,
};

/** The repeat days the model named, as a mask; any day it named that is not a weekday is returned for it to correct. */
function parseDaysMask(input: unknown): { readonly mask: number } | { readonly unknown: readonly string[] } {
  if (typeof input === "number" && Number.isFinite(input)) return { mask: Math.max(0, Math.min(127, Math.trunc(input))) };
  const days = Array.isArray(input) ? input.map(String) : input === undefined || input === null ? [] : [String(input)];
  const unknown = days.filter((day) => dayBits[day.trim().toLowerCase()] === undefined);
  return unknown.length > 0 ? { unknown } : { mask: days.reduce((mask, day) => mask | (dayBits[day.trim().toLowerCase()] ?? 0), 0) };
}

const unknownDays = (unknown: readonly string[]) =>
  ({ success: false, text: `Not a day of the week: ${unknown.join(", ")}. Name each repeat day, sunday to saturday, or leave days out for an alarm that rings once.` });

function parseAlarmTime(params: Record<string, unknown>): { readonly hour: number; readonly minute: number } | undefined {
  const hourParam = readNumber(params, "hour");
  if (hourParam === undefined) return undefined;
  return { hour: Math.max(0, Math.min(23, Math.trunc(hourParam))), minute: Math.max(0, Math.min(59, Math.trunc(readNumber(params, "minute") ?? 0))) };
}

function parseTimerDurationMs(params: Record<string, unknown>): number | undefined {
  const directMs = readNumber(params, "durationMs");
  if (directMs !== undefined && directMs > 0) return directMs;
  const directSec = readNumber(params, "durationSeconds") ?? readNumber(params, "addSeconds");
  if (directSec !== undefined && directSec > 0) return directSec * 1000;
  const total = (readNumber(params, "hours") ?? 0) * 3600 + (readNumber(params, "minutes") ?? 0) * 60 + (readNumber(params, "seconds") ?? 0);
  return total > 0 ? total * 1000 : undefined;
}

/**
 * The one alarm the model named: by id, by label, or by its time; an update names it by id, since its label and time are the new ones.
 * A label that names no single alarm leaves the time to name it. When neither names one, only the sole candidate is acted on:
 * for snooze and dismiss the only alarm ringing, and when the model named nothing at all, the only alarm. Nothing is guessed:
 * a ringing alarm never wins over the one named.
 */
function findAlarmTarget(alarms: readonly ClockAlarmRecord[], params: Record<string, unknown>, op: string): ClockAlarmRecord | undefined {
  const id = readString(params, "id");
  if (id !== undefined) return alarms.find((entry) => entry.id === id);
  if (op === "update") return alarms.length === 1 ? alarms[0] : undefined;
  const label = readString(params, "label")?.toLowerCase();
  const byLabel = label === undefined ? [] : alarms.filter((entry) => entry.label.toLowerCase() === label);
  if (byLabel.length === 1) return byLabel[0];
  const time = parseAlarmTime(params);
  const byTime = time === undefined ? [] : alarms.filter((entry) => entry.hour === time.hour && entry.minute === time.minute);
  if (byTime.length === 1) return byTime[0];
  const ringing = alarms.filter((entry) => entry.phase === "ringing");
  if ((op === "snooze" || op === "dismiss") && ringing.length === 1) return ringing[0];
  return label === undefined && time === undefined && alarms.length === 1 ? alarms[0] : undefined;
}

const liveTimer = (timer: ClockTimerRecord) => timer.status === "running" || timer.status === "paused" || timer.status === "ringing";

/**
 * The one timer the model named, by id or label; a label that names no single timer leaves the ringing check. When the model
 * named none, only the sole candidate: for dismiss the only timer ringing, else the only live one, as the Clock context lists them.
 */
function findTimerTarget(timers: readonly ClockTimerRecord[], params: Record<string, unknown>, op: string): ClockTimerRecord | undefined {
  const id = readString(params, "id");
  if (id !== undefined) return timers.find((entry) => entry.id === id);
  const label = readString(params, "label")?.toLowerCase();
  const byLabel = label === undefined ? [] : timers.filter((entry) => entry.label.toLowerCase() === label);
  if (byLabel.length === 1) return byLabel[0];
  const ringing = timers.filter((entry) => entry.status === "ringing");
  if (op === "dismiss" && ringing.length === 1) return ringing[0];
  const live = timers.filter(liveTimer);
  return label === undefined && live.length === 1 ? live[0] : undefined;
}

function inferAlarmOp(params: Record<string, unknown>): string {
  return readString(params, "action")?.toLowerCase() ?? readString(params, "op")?.toLowerCase() ?? "set";
}

function inferTimerOp(params: Record<string, unknown>): string {
  return readString(params, "action")?.toLowerCase() ?? readString(params, "op")?.toLowerCase() ?? "start";
}

function inferWorldOp(params: Record<string, unknown>): string {
  return readString(params, "action")?.toLowerCase() ?? readString(params, "op")?.toLowerCase() ?? "time_in";
}


function handleClockAlarm(store: AlphaAppsStore, timeZone: string, params: Record<string, unknown>) {
  const op = inferAlarmOp(params);
  const snapshot = store.getClock();
  if (op === "list") {
    const lines = snapshot.alarms.map((a) => `${formatHourMinute(a.hour, a.minute)}${a.label ? ` (${a.label})` : ""} — ${a.enabled ? a.phase : "off"} [${a.id}]`);
    return { success: true, text: lines.length === 0 ? "No alarms set." : `Alarms:\n${lines.join("\n")}`, data: { op, alarms: snapshot.alarms } };
  }
  if (op === "set" || op === "create") {
    const parsed = parseAlarmTime(params);
    if (parsed === undefined) return { success: false, text: "Please specify an alarm time (for example, 7:30 AM)." };
    const days = parseDaysMask(params.daysMask ?? params.days);
    if ("unknown" in days) return unknownDays(days.unknown);
    const created = store.createAlarm({
      hour: parsed.hour,
      minute: parsed.minute,
      daysMask: days.mask,
      label: readString(params, "label") ?? "",
      sound: normalizeSound(params.sound),
      vibrate: readBoolean(params, "vibrate") ?? true,
      enabled: readBoolean(params, "enabled") ?? true,
      snoozeMinutes: readNumber(params, "snoozeMinutes") ?? DEFAULT_SNOOZE_MINUTES,
      timeZone,
    });
    return { success: true, text: `Alarm set for ${formatHourMinute(created.hour, created.minute)}${created.label ? ` (${created.label})` : ""}.`, data: { op: "set", alarm: created } };
  }
  const target = findAlarmTarget(snapshot.alarms, params, op);
  if (target === undefined) return { success: false, text: "No single alarm matches: name it by its id from the Clock context." };
  if (op === "snooze") {
    const updated = store.snoozeAlarm(target.id, readNumber(params, "snoozeMinutes") ?? readNumber(params, "minutes"));
    return { success: true, text: `Snoozed ${formatHourMinute(target.hour, target.minute)} alarm.`, data: { op, alarm: updated } };
  }
  if (op === "dismiss") {
    const updated = store.dismissAlarm(target.id, timeZone);
    return { success: true, text: `Dismissed ${formatHourMinute(target.hour, target.minute)} alarm.`, data: { op, alarm: updated } };
  }
  if (op === "delete") {
    const removed = store.deleteAlarm(target.id);
    return { success: true, text: `Deleted ${formatHourMinute(target.hour, target.minute)} alarm.`, data: { op, alarm: removed } };
  }
  if (op === "toggle") {
    const enabled = readBoolean(params, "enabled") ?? !target.enabled;
    const updated = store.updateAlarm(target.id, { enabled, timeZone });
    return { success: true, text: `Alarm ${formatHourMinute(target.hour, target.minute)} ${enabled ? "enabled" : "disabled"}.`, data: { op, alarm: updated } };
  }
  const parsedTime = parseAlarmTime(params);
  const named = params.daysMask ?? params.days;
  const days = named === undefined || named === null ? undefined : parseDaysMask(named);
  if (days !== undefined && "unknown" in days) return unknownDays(days.unknown);
  const updated = store.updateAlarm(target.id, {
    hour: parsedTime?.hour,
    minute: parsedTime?.minute,
    daysMask: days?.mask,
    label: readRawString(params, "label"),
    sound: params.sound === undefined ? undefined : normalizeSound(params.sound, target.sound),
    vibrate: readBoolean(params, "vibrate"),
    enabled: readBoolean(params, "enabled"),
    snoozeMinutes: readNumber(params, "snoozeMinutes"),
    timeZone,
  });
  return { success: true, text: `Updated alarm ${formatHourMinute(updated?.hour ?? target.hour, updated?.minute ?? target.minute)}.`, data: { op: "update", alarm: updated } };
}

function handleClockTimer(store: AlphaAppsStore, params: Record<string, unknown>) {
  const op = inferTimerOp(params);
  const snapshot = store.getClock();
  if (op === "list") {
    const lines = snapshot.timers.map((t) => `${t.label || "Timer"}: ${formatDuration(t.remainingMs)} (${t.status}) [${t.id}]`);
    return { success: true, text: lines.length === 0 ? "No timers active." : `Timers:\n${lines.join("\n")}`, data: { op, timers: snapshot.timers } };
  }
  if (op === "start" || op === "create") {
    const durationMs = parseTimerDurationMs(params);
    if (durationMs === undefined) return { success: false, text: "A new timer needs its durationSeconds; to run a paused timer again, resume it." };
    const created = store.createTimer({ durationMs, label: readString(params, "label") ?? "", startImmediately: true });
    return { success: true, text: `Started ${formatDuration(created.durationMs)} timer${created.label ? ` for ${created.label}` : ""}.`, data: { op: "start", timer: created } };
  }
  const target = findTimerTarget(snapshot.timers, params, op);
  if (target === undefined) return { success: false, text: "No single timer matches: name it by its id from the Clock context." };
  if (op === "cancel" || op === "delete") {
    const removed = store.deleteTimer(target.id);
    return { success: true, text: `Cancelled timer${target.label ? ` (${target.label})` : ""}.`, data: { op: "cancel", timer: removed } };
  }
  if (op === "add_time") {
    const addMs = readNumber(params, "addMs") ?? parseTimerDurationMs(params) ?? 60_000;
    const updated = store.updateTimer(target.id, { action: "add_time", addMs });
    return { success: true, text: `Added ${formatDuration(addMs)} to timer (${formatDuration(updated?.remainingMs ?? target.remainingMs)} remaining).`, data: { op, timer: updated } };
  }
  const mapped: "pause" | "resume" | "reset" | "dismiss" = op === "pause" ? "pause" : op === "resume" ? "resume" : op === "reset" ? "reset" : "dismiss";
  const updated = store.updateTimer(target.id, { action: mapped });
  return { success: true, text: `Timer ${mapped === "pause" ? "paused" : mapped === "resume" ? "resumed" : mapped === "reset" ? "reset" : "dismissed"}.`, data: { op: mapped, timer: updated } };
}

function handleClockWorld(store: AlphaAppsStore, params: Record<string, unknown>) {
  const op = inferWorldOp(params);
  const nowMs = store.now();
  const snapshot = store.getClock();
  if (op === "list") {
    const lines = snapshot.world.map((c) => `${c.city} (${c.timeZone}): ${formatClockTime(nowMs, c.timeZone)}`);
    return { success: true, text: lines.length === 0 ? "No pinned world cities." : `World clock:\n${lines.join("\n")}`, data: { op, world: snapshot.world } };
  }
  const query = readString(params, "city") ?? readString(params, "timeZone") ?? readString(params, "query") ?? "";
  if (op === "remove_city") {
    const id = readString(params, "id");
    const match = id !== undefined
      ? snapshot.world.find((c) => c.id === id)
      : snapshot.world.find((c) => c.city.toLowerCase() === query.toLowerCase() || c.timeZone.toLowerCase() === query.toLowerCase());
    if (match === undefined) return { success: false, text: `World city "${query || id || ""}" is not pinned.` };
    const removed = store.removeWorldCity(match.id);
    return { success: true, text: `Removed ${match.city} from World Clock.`, data: { op, city: removed } };
  }
  const resolved = resolveWorldCity(query);
  if (resolved === undefined) return { success: false, text: `Could not recognize city or time zone "${query}".` };
  if (op === "add_city") {
    const added = store.addWorldCity(resolved);
    return { success: true, text: `Added ${added.city} (${formatClockTime(nowMs, added.timeZone)}) to World Clock.`, data: { op, city: added } };
  }
  return { success: true, text: `It is ${formatClockTime(nowMs, resolved.timeZone)} in ${resolved.city}.`, data: { op: "time_in", city: resolved, formatted: formatClockTime(nowMs, resolved.timeZone) } };
}

type ClockActionResult = NonNullable<Awaited<ReturnType<AgentAction["handler"]>>>;

type ClockParameters = NonNullable<AgentAction["parameters"]>;

const idParameter = (thing: string): ClockParameters[number] =>
  ({ name: "id", description: `The ${thing}'s id, as the Clock context lists it, to act on one ${thing}.`, required: false, schema: { type: "string" } });
const labelParameter = (thing: string): ClockParameters[number] =>
  ({ name: "label", description: `The ${thing}'s name, only when the owner gave one.`, required: false, schema: { type: "string" } });

function makeClockAction(
  name: string,
  similes: string[],
  description: string,
  parameters: ClockParameters,
  run: (params: Record<string, unknown>) => ClockActionResult,
): AgentAction {
  const action: AgentAction = {
    name,
    similes,
    description,
    parameters,
    validate: () => Promise.resolve(true),
    handler: (_runtime, _message, _state, options) => Promise.resolve(run(asRecord(asRecord(options).parameters ?? asRecord(options)))),
  };
  showsApp(action, "clock");
  return action;
}

/** Alpha Clock actions (`CLOCK_ALARM`, `CLOCK_TIMER`, `CLOCK_WORLD`) bound to the shared store. */
export function clockActions(store: AlphaAppsStore, timeZone: string): AgentAction[] {
  return [
    makeClockAction(
      "CLOCK_ALARM",
      ["SET_ALARM", "MANAGE_ALARM", "SNOOZE_ALARM", "DISMISS_ALARM"],
      "Create, update, toggle, delete, list, snooze, or dismiss alarms in Alpha Clock.",
      [
        { name: "action", description: "What to do with an alarm.", required: true, schema: { type: "string", enum: ["set", "update", "toggle", "snooze", "dismiss", "delete", "list"] } },
        { name: "hour", description: "The alarm's hour on a 24-hour clock, 0 to 23, to set or move it.", required: false, schema: { type: "integer", minimum: 0, maximum: 23 } },
        { name: "minute", description: "The alarm's minute, 0 to 59.", required: false, schema: { type: "integer", minimum: 0, maximum: 59 } },
        { name: "days", description: "The days it repeats on, all seven for every day; leave it out for an alarm that rings once.", required: false, schema: { type: "array", items: { type: "string", enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] } } },
        labelParameter("alarm"),
        { name: "enabled", description: "Whether the alarm is on, to turn it on or off.", required: false, schema: { type: "boolean" } },
        { name: "snoozeMinutes", description: "Minutes to snooze for.", required: false, schema: { type: "integer", minimum: 1 } },
        idParameter("alarm"),
      ],
      (params) => handleClockAlarm(store, timeZone, params),
    ),
    makeClockAction(
      "CLOCK_TIMER",
      ["START_TIMER", "SET_TIMER", "PAUSE_TIMER", "CANCEL_TIMER"],
      "Start, pause, resume, extend (+time), reset, cancel, dismiss, or list countdown timers in Alpha Clock.",
      [
        { name: "action", description: "What to do with a timer.", required: true, schema: { type: "string", enum: ["start", "pause", "resume", "add_time", "reset", "cancel", "dismiss", "list"] } },
        { name: "durationSeconds", description: "The timer's length in seconds to start one, or the time to add in seconds for add_time.", required: false, schema: { type: "integer", minimum: 1 } },
        labelParameter("timer"),
        idParameter("timer"),
      ],
      (params) => handleClockTimer(store, params),
    ),
    makeClockAction(
      "CLOCK_WORLD",
      ["WORLD_CLOCK", "TIME_IN_CITY"],
      "Check current time in a city or manage pinned World Clock cities in Alpha Clock.",
      [
        { name: "action", description: "Tell the time in a city, pin or unpin a city, or list the pinned cities.", required: true, schema: { type: "string", enum: ["time_in", "add_city", "remove_city", "list"] } },
        { name: "city", description: "The city's name.", required: false, schema: { type: "string" } },
        { name: "timeZone", description: "An IANA time zone such as Europe/London, when no city names it.", required: false, schema: { type: "string" } },
        idParameter("pinned city"),
      ],
      (params) => handleClockWorld(store, params),
    ),
  ];
}

/** Alpha Clock context provider injecting current local time, ringing alerts, upcoming alarms, active timers, and world cities. */
export function clockProvider(store: AlphaAppsStore, timeZone: string): AgentProvider {
  return {
    name: "CLOCK_CONTEXT",
    description: "Current local time, ringing or upcoming alarms, active timers, and pinned world clock cities.",
    dynamic: true,
    get: () => {
      const nowMs = store.now();
      const snapshot = store.getClock();
      const lines: string[] = [`# Alpha Clock (${timeZone})`, `Current local time: ${formatClockTime(nowMs, timeZone)}`];
      const ringingAlarms = snapshot.alarms.filter((a) => a.phase === "ringing");
      const ringingTimers = snapshot.timers.filter((t) => t.status === "ringing");
      if (ringingAlarms.length > 0 || ringingTimers.length > 0) {
        lines.push("## Ringing right now");
        for (const a of ringingAlarms) lines.push(`- Alarm [${a.id}] ${formatHourMinute(a.hour, a.minute)}${a.label ? ` "${a.label}"` : ""}`);
        for (const t of ringingTimers) lines.push(`- Timer [${t.id}] "${t.label || "Timer"}" finished`);
      }
      const upcoming = snapshot.alarms.filter((a) => a.enabled && a.fireAtMs !== null).sort((a, b) => (a.fireAtMs ?? 0) - (b.fireAtMs ?? 0));
      const nextAlarm = upcoming[0];
      if (snapshot.alarms.length > 0) {
        lines.push("Alarms:");
        for (const a of snapshot.alarms) lines.push(`- Alarm [${a.id}] ${formatHourMinute(a.hour, a.minute)}${a.label ? ` "${a.label}"` : ""} ${a.enabled ? a.phase : "off"}`);
      }
      if (nextAlarm !== undefined) {
        lines.push(`Next alarm: ${formatHourMinute(nextAlarm.hour, nextAlarm.minute)}${nextAlarm.label ? ` "${nextAlarm.label}"` : ""} (${nextAlarm.phase}) [${nextAlarm.id}]`);
      }
      const activeTimers = snapshot.timers.filter((t) => t.status === "running" || t.status === "paused");
      if (activeTimers.length > 0) {
        lines.push("Active timers:");
        for (const t of activeTimers) lines.push(`- [${t.id}] ${t.label || "Timer"}: ${formatDuration(t.remainingMs)} (${t.status})`);
      }
      if (snapshot.world.length > 0) {
        lines.push("Pinned world cities:");
        for (const c of snapshot.world) lines.push(`- ${c.city} (${c.timeZone}): ${formatClockTime(nowMs, c.timeZone)}`);
      }
      return Promise.resolve({
        text: lines.join("\n"),
        values: {
          timeZone,
          ringingCount: ringingAlarms.length + ringingTimers.length,
          alarmCount: snapshot.alarms.length,
          activeTimerCount: activeTimers.length,
        },
        data: { snapshot },
      });
    },
  };
}

function alarmOrNotFound(store: AlphaAppsStore, alarm: ClockAlarmRecord | undefined) {
  return alarm === undefined
    ? { status: 404, body: { error: "alarm_not_found" } }
    : { status: 200, body: { alarm, snapshot: store.getClock() } };
}

/** HTTP routes under `/api/alpha/clock` for bidirectional sync between Alpha Clock UI and the resident agent. */
export function clockRoutes(store: AlphaAppsStore, timeZone: string): AgentRoute[] {
  return [
    {
      method: "GET",
      path: "/api/alpha/clock",
      handler: () => ({ status: 200, body: store.getClock() }),
    },
    {
      method: "PUT",
      path: "/api/alpha/clock",
      handler: (input) => {
        const body = asRecord(input.body);
        const snapshot = store.syncClock({
          version: readNumber(body, "version"),
          alarms: Array.isArray(body.alarms) ? (body.alarms as ClockAlarmRecord[]) : undefined,
          timers: Array.isArray(body.timers) ? (body.timers as ClockTimerRecord[]) : undefined,
          world: Array.isArray(body.world) ? (body.world as WorldCityRecord[]) : undefined,
          deletedAlarmIds: Array.isArray(body.deletedAlarmIds) ? (body.deletedAlarmIds as string[]) : undefined,
          deletedTimerIds: Array.isArray(body.deletedTimerIds) ? (body.deletedTimerIds as string[]) : undefined,
        });
        return { status: 200, body: snapshot };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/clock/alarms",
      handler: (input) => {
        const body = asRecord(input.body);
        const hour = readNumber(body, "hour");
        const minute = readNumber(body, "minute");
        if (hour === undefined || minute === undefined) return { status: 400, body: { error: "invalid_alarm_time" } };
        const alarm = store.createAlarm({
          id: readString(body, "id"),
          hour,
          minute,
          daysMask: readNumber(body, "daysMask") ?? 0,
          label: readRawString(body, "label") ?? "",
          sound: normalizeSound(body.sound),
          vibrate: readBoolean(body, "vibrate") ?? true,
          enabled: readBoolean(body, "enabled") ?? true,
          snoozeMinutes: readNumber(body, "snoozeMinutes") ?? DEFAULT_SNOOZE_MINUTES,
          timeZone,
        });
        return { status: 201, body: { alarm, snapshot: store.getClock() } };
      },
    },
    {
      method: "PATCH",
      path: "/api/alpha/clock/alarms/{id}",
      handler: (input) => {
        const id = input.parameters.get("id") ?? "";
        const body = asRecord(input.body);
        const updated = store.updateAlarm(id, {
          hour: readNumber(body, "hour"),
          minute: readNumber(body, "minute"),
          daysMask: readNumber(body, "daysMask"),
          label: readRawString(body, "label"),
          sound: body.sound === undefined ? undefined : normalizeSound(body.sound),
          vibrate: readBoolean(body, "vibrate"),
          enabled: readBoolean(body, "enabled"),
          snoozeMinutes: readNumber(body, "snoozeMinutes"),
          missed: readBoolean(body, "missed"),
          timeZone,
        });
        return alarmOrNotFound(store, updated);
      },
    },
    {
      method: "DELETE",
      path: "/api/alpha/clock/alarms/{id}",
      handler: (input) => alarmOrNotFound(store, store.deleteAlarm(input.parameters.get("id") ?? "")),
    },
    {
      method: "POST",
      path: "/api/alpha/clock/alarms/{id}/snooze",
      handler: (input) => {
        const body = asRecord(input.body);
        return alarmOrNotFound(store, store.snoozeAlarm(input.parameters.get("id") ?? "", readNumber(body, "minutes") ?? readNumber(body, "snoozeMinutes")));
      },
    },
    {
      method: "POST",
      path: "/api/alpha/clock/alarms/{id}/dismiss",
      handler: (input) => alarmOrNotFound(store, store.dismissAlarm(input.parameters.get("id") ?? "", timeZone)),
    },
    {
      method: "POST",
      path: "/api/alpha/clock/timers",
      handler: (input) => {
        const body = asRecord(input.body);
        const durationMs = readNumber(body, "durationMs");
        if (durationMs === undefined || durationMs <= 0) return { status: 400, body: { error: "invalid_timer_duration" } };
        const timer = store.createTimer({
          id: readString(body, "id"),
          label: readRawString(body, "label") ?? "",
          durationMs,
          startImmediately: readBoolean(body, "startImmediately") ?? true,
        });
        return { status: 201, body: { timer, snapshot: store.getClock() } };
      },
    },
    {
      method: "PATCH",
      path: "/api/alpha/clock/timers/{id}",
      handler: (input) => {
        const body = asRecord(input.body);
        const action = readString(body, "action") as "start" | "pause" | "resume" | "reset" | "dismiss" | "add_time" | undefined;
        const updated = store.updateTimer(input.parameters.get("id") ?? "", {
          action,
          addMs: readNumber(body, "addMs"),
          label: readRawString(body, "label"),
          status: readString(body, "status") as ClockTimerRecord["status"] | undefined,
          remainingMs: readNumber(body, "remainingMs"),
        });
        if (updated === undefined) return { status: 404, body: { error: "timer_not_found" } };
        return { status: 200, body: { timer: updated, snapshot: store.getClock() } };
      },
    },
    {
      method: "DELETE",
      path: "/api/alpha/clock/timers/{id}",
      handler: (input) => {
        const removed = store.deleteTimer(input.parameters.get("id") ?? "");
        if (removed === undefined) return { status: 404, body: { error: "timer_not_found" } };
        return { status: 200, body: { timer: removed, snapshot: store.getClock() } };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/clock/world",
      handler: (input) => {
        const body = asRecord(input.body);
        const zone = readString(body, "timeZone");
        const city = readString(body, "city");
        const resolved = zone !== undefined && isValidTimeZone(zone)
          ? { city: city ?? zone.split("/").pop()?.replace(/_/g, " ") ?? zone, region: readRawString(body, "region") ?? "", timeZone: zone }
          : resolveWorldCity(city ?? readString(body, "query") ?? "");
        if (resolved === undefined) return { status: 400, body: { error: "invalid_world_city" } };
        const added = store.addWorldCity({ id: readString(body, "id"), ...resolved });
        return { status: 201, body: { city: added, snapshot: store.getClock() } };
      },
    },
    {
      method: "DELETE",
      path: "/api/alpha/clock/world/{id}",
      handler: (input) => {
        const removed = store.removeWorldCity(input.parameters.get("id") ?? "");
        if (removed === undefined) return { status: 404, body: { error: "world_city_not_found" } };
        return { status: 200, body: { city: removed, snapshot: store.getClock() } };
      },
    },
  ];
}
