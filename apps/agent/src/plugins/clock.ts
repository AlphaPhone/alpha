// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import { showsApp } from "@elizaos/agent-host";
import {
  type AlphaAppsStore, isValidTimeZone, normalizeSound,
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

function parseDaysMask(input: unknown, fallbackText: string): number {
  if (typeof input === "number" && Number.isFinite(input)) return Math.max(0, Math.min(127, Math.trunc(input)));
  const names = Array.isArray(input) ? input.map((v) => String(v).toLowerCase()).join(" ") : typeof input === "string" ? input.toLowerCase() : fallbackText.toLowerCase();
  if (/\bevery\s*day\b|\bdaily\b/.test(names)) return 127;
  if (/\bweekdays?\b|\bmon\s*-\s*fri\b/.test(names)) return 62;
  if (/\bweekends?\b/.test(names)) return 65;
  const tokens: readonly [RegExp, number][] = [
    [/\bsun(day)?s?\b/, 1], [/\bmon(day)?s?\b/, 2], [/\btue(s|sday)?s?\b/, 4], [/\bwed(nesday)?s?\b/, 8],
    [/\bthu(r|rs|rsday)?s?\b/, 16], [/\bfri(day)?s?\b/, 32], [/\bsat(urday)?s?\b/, 64],
  ];
  let mask = 0;
  for (const [pattern, bit] of tokens) if (pattern.test(names)) mask |= bit;
  return mask;
}

function parseAlarmTime(params: Record<string, unknown>, text: string): { readonly hour: number; readonly minute: number } | undefined {
  const hourParam = readNumber(params, "hour");
  if (hourParam !== undefined) {
    return { hour: Math.max(0, Math.min(23, Math.trunc(hourParam))), minute: Math.max(0, Math.min(59, Math.trunc(readNumber(params, "minute") ?? 0))) };
  }
  const source = readString(params, "time") ?? text;
  const match = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i.exec(source);
  if (match === null) return undefined;
  let hour = Number(match[1]);
  const minute = match[2] !== undefined ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase().replace(/\./g, "");
  if (minute > 59 || hour > 23) return undefined;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (meridiem === undefined && match[2] === undefined) return undefined;
  return { hour, minute };
}

function parseTimerDurationMs(params: Record<string, unknown>, text: string): number | undefined {
  const directMs = readNumber(params, "durationMs");
  if (directMs !== undefined && directMs > 0) return directMs;
  const directSec = readNumber(params, "durationSeconds") ?? readNumber(params, "addSeconds");
  if (directSec !== undefined && directSec > 0) return directSec * 1000;
  const hoursParam = readNumber(params, "hours") ?? 0;
  const minutesParam = readNumber(params, "minutes") ?? 0;
  const secondsParam = readNumber(params, "seconds") ?? 0;
  if (hoursParam + minutesParam + secondsParam > 0) return (hoursParam * 3600 + minutesParam * 60 + secondsParam) * 1000;
  const source = readString(params, "duration") ?? text;
  const re = /(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)\b/gi;
  let total = 0;
  for (let hit = re.exec(source); hit !== null; hit = re.exec(source)) {
    const qty = Number(hit[1]);
    const unit = (hit[2] ?? "").toLowerCase();
    if (unit.startsWith("h")) total += qty * 3_600_000;
    else if (unit.startsWith("m")) total += qty * 60_000;
    else total += qty * 1000;
  }
  return total > 0 ? total : undefined;
}

function findAlarmTarget(alarms: readonly ClockAlarmRecord[], params: Record<string, unknown>, text: string): ClockAlarmRecord | undefined {
  const id = readString(params, "id");
  if (id !== undefined) return alarms.find((entry) => entry.id === id);
  const ringing = alarms.find((entry) => entry.phase === "ringing");
  if (ringing !== undefined) return ringing;
  const label = readString(params, "label")?.toLowerCase();
  if (label !== undefined) {
    const byLabel = alarms.find((entry) => entry.label.toLowerCase().includes(label));
    if (byLabel !== undefined) return byLabel;
  }
  const time = parseAlarmTime(params, text);
  if (time !== undefined) {
    const byTime = alarms.find((entry) => entry.hour === time.hour && entry.minute === time.minute);
    if (byTime !== undefined) return byTime;
  }
  return alarms.length === 1 ? alarms[0] : alarms.find((entry) => entry.enabled);
}

function findTimerTarget(timers: readonly ClockTimerRecord[], params: Record<string, unknown>): ClockTimerRecord | undefined {
  const id = readString(params, "id");
  if (id !== undefined) return timers.find((entry) => entry.id === id);
  const ringing = timers.find((entry) => entry.status === "ringing");
  if (ringing !== undefined) return ringing;
  const label = readString(params, "label")?.toLowerCase();
  if (label !== undefined) {
    const byLabel = timers.find((entry) => entry.label.toLowerCase().includes(label));
    if (byLabel !== undefined) return byLabel;
  }
  return timers.find((entry) => entry.status === "running") ?? timers.find((entry) => entry.status === "paused") ?? timers[0];
}

function inferAlarmOp(params: Record<string, unknown>, text: string): string {
  const explicit = readString(params, "action")?.toLowerCase() ?? readString(params, "op")?.toLowerCase();
  if (explicit !== undefined) return explicit;
  const lower = text.toLowerCase();
  if (/\bsnooze\b/.test(lower)) return "snooze";
  if (/\bdismiss\b|\bstop\b|\bsilence\b/.test(lower)) return "dismiss";
  if (/\bdelete\b|\bremove\b|\bcancel\b/.test(lower)) return "delete";
  if (/\bdisable\b|\bturn off\b|\benable\b|\bturn on\b|\btoggle\b/.test(lower)) return "toggle";
  if (/\blist\b|\bshow\b|\bwhat alarms\b/.test(lower)) return "list";
  return "set";
}

function inferTimerOp(params: Record<string, unknown>, text: string): string {
  const explicit = readString(params, "action")?.toLowerCase() ?? readString(params, "op")?.toLowerCase();
  if (explicit !== undefined) return explicit;
  const lower = text.toLowerCase();
  if (/\bpause\b/.test(lower)) return "pause";
  if (/\bresume\b|\bcontinue\b/.test(lower)) return "resume";
  if (/\badd\b|\bextend\b/.test(lower)) return "add_time";
  if (/\breset\b/.test(lower)) return "reset";
  if (/\bcancel\b|\bdelete\b|\bremove\b/.test(lower)) return "cancel";
  if (/\bdismiss\b|\bstop\b/.test(lower)) return "dismiss";
  if (/\blist\b|\bhow much time\b|\bstatus\b/.test(lower)) return "list";
  return "start";
}

function inferWorldOp(params: Record<string, unknown>, text: string): string {
  const explicit = readString(params, "action")?.toLowerCase() ?? readString(params, "op")?.toLowerCase();
  if (explicit !== undefined) return explicit;
  const lower = text.toLowerCase();
  if (/\badd\b|\bpin\b/.test(lower)) return "add_city";
  if (/\bremove\b|\bdelete\b|\bunpin\b/.test(lower)) return "remove_city";
  if (/\blist\b|\bshow\b|\bworld clocks?\b/.test(lower)) return "list";
  return "time_in";
}

function extractLabel(params: Record<string, unknown>, text: string): string | undefined {
  const direct = readString(params, "label");
  if (direct !== undefined) return direct;
  const match = /(?:labeled|called|named|for)\s+"?([a-z0-9][a-z0-9\s'-]{0,40})"?/i.exec(text);
  return match?.[1]?.trim();
}

function handleClockAlarm(store: AlphaAppsStore, timeZone: string, params: Record<string, unknown>, text: string) {
  const op = inferAlarmOp(params, text);
  const snapshot = store.getClock();
  if (op === "list") {
    const lines = snapshot.alarms.map((a) => `${formatHourMinute(a.hour, a.minute)}${a.label ? ` (${a.label})` : ""} — ${a.enabled ? a.phase : "off"} [${a.id}]`);
    return { success: true, text: lines.length === 0 ? "No alarms set." : `Alarms:\n${lines.join("\n")}`, data: { op, alarms: snapshot.alarms } };
  }
  if (op === "set" || op === "create") {
    const parsed = parseAlarmTime(params, text);
    if (parsed === undefined) return { success: false, text: "Please specify an alarm time (for example, 7:30 AM)." };
    const created = store.createAlarm({
      hour: parsed.hour,
      minute: parsed.minute,
      daysMask: parseDaysMask(params.daysMask ?? params.days, text),
      label: extractLabel(params, text) ?? "",
      sound: normalizeSound(params.sound),
      vibrate: readBoolean(params, "vibrate") ?? true,
      enabled: readBoolean(params, "enabled") ?? true,
      snoozeMinutes: readNumber(params, "snoozeMinutes") ?? 9,
      timeZone,
    });
    return { success: true, text: `Alarm set for ${formatHourMinute(created.hour, created.minute)}${created.label ? ` (${created.label})` : ""}.`, data: { op: "set", alarm: created } };
  }
  const target = findAlarmTarget(snapshot.alarms, params, text);
  if (target === undefined) return { success: false, text: "No matching alarm found." };
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
    const explicitEnabled = readBoolean(params, "enabled");
    const inferredDisable = /\bdisable\b|\bturn off\b/i.test(text);
    const inferredEnable = /\benable\b|\bturn on\b/i.test(text);
    const enabled = explicitEnabled ?? (inferredDisable ? false : inferredEnable ? true : !target.enabled);
    const updated = store.updateAlarm(target.id, { enabled, timeZone });
    return { success: true, text: `Alarm ${formatHourMinute(target.hour, target.minute)} ${enabled ? "enabled" : "disabled"}.`, data: { op, alarm: updated } };
  }
  const parsedTime = parseAlarmTime(params, "");
  const updated = store.updateAlarm(target.id, {
    hour: parsedTime?.hour,
    minute: parsedTime?.minute,
    daysMask: params.daysMask !== undefined || params.days !== undefined ? parseDaysMask(params.daysMask ?? params.days, "") : undefined,
    label: readRawString(params, "label"),
    sound: params.sound === undefined ? undefined : normalizeSound(params.sound, target.sound),
    vibrate: readBoolean(params, "vibrate"),
    enabled: readBoolean(params, "enabled"),
    snoozeMinutes: readNumber(params, "snoozeMinutes"),
    timeZone,
  });
  return { success: true, text: `Updated alarm ${formatHourMinute(updated?.hour ?? target.hour, updated?.minute ?? target.minute)}.`, data: { op: "update", alarm: updated } };
}

function handleClockTimer(store: AlphaAppsStore, params: Record<string, unknown>, text: string) {
  const op = inferTimerOp(params, text);
  const snapshot = store.getClock();
  if (op === "list") {
    const lines = snapshot.timers.map((t) => `${t.label || "Timer"}: ${formatDuration(t.remainingMs)} (${t.status}) [${t.id}]`);
    return { success: true, text: lines.length === 0 ? "No timers active." : `Timers:\n${lines.join("\n")}`, data: { op, timers: snapshot.timers } };
  }
  if (op === "start" || op === "create") {
    const durationMs = parseTimerDurationMs(params, text);
    if (durationMs === undefined) {
      const existing = findTimerTarget(snapshot.timers, params);
      if (existing !== undefined) {
        const started = store.updateTimer(existing.id, { action: "start" });
        return { success: true, text: `Started timer (${formatDuration(started?.remainingMs ?? existing.remainingMs)}).`, data: { op: "start", timer: started } };
      }
      return { success: false, text: "Please specify a timer duration (for example, 5 minutes)." };
    }
    const created = store.createTimer({ durationMs, label: extractLabel(params, text) ?? "", startImmediately: true });
    return { success: true, text: `Started ${formatDuration(created.durationMs)} timer${created.label ? ` for ${created.label}` : ""}.`, data: { op: "start", timer: created } };
  }
  const target = findTimerTarget(snapshot.timers, params);
  if (target === undefined) return { success: false, text: "No matching timer found." };
  if (op === "cancel" || op === "delete") {
    const removed = store.deleteTimer(target.id);
    return { success: true, text: `Cancelled timer${target.label ? ` (${target.label})` : ""}.`, data: { op: "cancel", timer: removed } };
  }
  if (op === "add_time") {
    const addMs = readNumber(params, "addMs") ?? parseTimerDurationMs(params, text) ?? 60_000;
    const updated = store.updateTimer(target.id, { action: "add_time", addMs });
    return { success: true, text: `Added ${formatDuration(addMs)} to timer (${formatDuration(updated?.remainingMs ?? target.remainingMs)} remaining).`, data: { op, timer: updated } };
  }
  const mapped: "pause" | "resume" | "reset" | "dismiss" = op === "pause" ? "pause" : op === "resume" ? "resume" : op === "reset" ? "reset" : "dismiss";
  const updated = store.updateTimer(target.id, { action: mapped });
  return { success: true, text: `Timer ${mapped === "pause" ? "paused" : mapped === "resume" ? "resumed" : mapped === "reset" ? "reset" : "dismissed"}.`, data: { op: mapped, timer: updated } };
}

function handleClockWorld(store: AlphaAppsStore, params: Record<string, unknown>, text: string) {
  const op = inferWorldOp(params, text);
  const nowMs = store.now();
  const snapshot = store.getClock();
  if (op === "list") {
    const lines = snapshot.world.map((c) => `${c.city} (${c.timeZone}): ${formatClockTime(nowMs, c.timeZone)}`);
    return { success: true, text: lines.length === 0 ? "No pinned world cities." : `World clock:\n${lines.join("\n")}`, data: { op, world: snapshot.world } };
  }
  const query = readString(params, "city") ?? readString(params, "timeZone") ?? readString(params, "query") ?? text.replace(/.*?\b(?:in|add|pin|remove|delete)\s+/i, "").replace(/[?.!]+$/, "").trim();
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

function makeClockAction(
  name: string,
  similes: string[],
  description: string,
  run: (params: Record<string, unknown>, text: string) => ClockActionResult,
): AgentAction {
  const action: AgentAction = {
    name,
    similes,
    description,
    validate: () => Promise.resolve(true),
    handler: async (_runtime, message, _state, options, callback) => {
      const params = asRecord(asRecord(options).parameters ?? asRecord(options));
      const text = readRawString(asRecord(message.content), "text") ?? "";
      const result = run(params, text);
      if (callback !== undefined && result.text !== undefined) await callback({ text: result.text });
      return result;
    },
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
      (params, text) => handleClockAlarm(store, timeZone, params, text),
    ),
    makeClockAction(
      "CLOCK_TIMER",
      ["START_TIMER", "SET_TIMER", "PAUSE_TIMER", "CANCEL_TIMER"],
      "Start, pause, resume, extend (+time), reset, cancel, dismiss, or list countdown timers in Alpha Clock.",
      (params, text) => handleClockTimer(store, params, text),
    ),
    makeClockAction(
      "CLOCK_WORLD",
      ["WORLD_CLOCK", "TIME_IN_CITY"],
      "Check current time in a city or manage pinned World Clock cities in Alpha Clock.",
      (params, text) => handleClockWorld(store, params, text),
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
          snoozeMinutes: readNumber(body, "snoozeMinutes") ?? 9,
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
