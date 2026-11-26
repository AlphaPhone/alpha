// spec/app/notes/index.md, "Pinned notes come first, then the rest, narrowed to the chosen folder"
import { projectAuthoredNoteContent } from "@elizaos/plugin-notes-client";
import type { StickyNote } from "@elizaos/plugin-notes-client";
import { audioIdOf, moment } from "./content.vibe";

/** The title shown when listing or opening a note. */
export function titleOf(note: StickyNote): string {
  return note.title.trim() || "Untitled";
}

/** Seconds as the owner reads a recording's length. */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The note's two-line preview, using the saved format and language. */
export function preview(note: StickyNote): string {
  const data = note.format?.data;
  const kind = note.format?.kind ?? "text";
  const authored = projectAuthoredNoteContent(note.format);
  const text = kind === "list"
    ? (authored?.items ?? []).map((item) => `${item.done === true ? "☑" : "☐"} ${item.text}`).join("\n")
    : kind === "link"
      ? typeof data?.domain === "string" ? data.domain : ""
      : note.body.trim() !== "" ? note.body : (authored?.lines ?? []).map((line) => line.text).join(" ");
  const said = text.replace(/[ \t]+/g, " ").trim().slice(0, 240);
  const seconds = typeof data?.dur === "number" ? data.dur : undefined;
  if (kind !== "voice" || (seconds === undefined && audioIdOf(note) === "")) return said;
  const audio = data?.audio;
  const ms = typeof data?.durationMs === "number" ? data.durationMs
    : typeof audio === "object" && audio !== null && "durationMs" in audio && typeof audio.durationMs === "number" ? audio.durationMs : undefined;
  const duration = seconds ?? (ms !== undefined ? ms / 1000 : undefined);
  if (duration === undefined || !Number.isFinite(duration) || duration < 0) return said;
  return `${clock(Math.floor(duration))}${said === "" ? "" : ` · ${said}`}`;
}

interface DateFormatters {
  readonly zone: string;
  readonly sameDay: Intl.DateTimeFormat;
  readonly year: Intl.DateTimeFormat;
  readonly time: Intl.DateTimeFormat;
  readonly weekday: Intl.DateTimeFormat;
  readonly recent: Intl.DateTimeFormat;
  readonly older: Intl.DateTimeFormat;
}

let cachedFormatters: DateFormatters | undefined;

function formatters(): DateFormatters {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (cachedFormatters?.zone === zone) return cachedFormatters;
  cachedFormatters = {
    zone,
    sameDay: new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }),
    year: new Intl.DateTimeFormat("en", { year: "numeric" }),
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }),
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }),
    recent: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
    older: new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }),
  };
  return cachedFormatters;
}

/** When a note last changed, in the local calendar. */
export function dated(note: StickyNote, now: number): string {
  const at = moment(note);
  if (!Number.isFinite(at) || at <= 0 || !Number.isFinite(now)) return "";
  const fmt = formatters();
  if (fmt.sameDay.format(at) === fmt.sameDay.format(now)) return fmt.time.format(at);
  if (at < now && now - at < 6 * 24 * 60 * 60 * 1000) return fmt.weekday.format(at);
  return (fmt.year.format(at) === fmt.year.format(now) ? fmt.recent : fmt.older).format(at);
}
