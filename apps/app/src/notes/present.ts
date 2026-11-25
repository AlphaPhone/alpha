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
  const whole = Math.max(0, Math.round(seconds));
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
    : typeof audio === "object" && audio !== null && "durationMs" in audio ? audio.durationMs : undefined;
  const duration = seconds ?? (typeof ms === "number" ? ms / 1000 : undefined);
  if (duration === undefined || !Number.isFinite(duration) || duration < 0) return said;
  return `${clock(Math.floor(duration))}${said === "" ? "" : ` · ${said}`}`;
}

const sameDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
const year = new Intl.DateTimeFormat("en", { year: "numeric" });
const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const recent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const older = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

/** When a note last changed, in the local calendar. */
export function dated(note: StickyNote, now: number): string {
  const at = moment(note);
  if (!Number.isFinite(at)) return "";
  if (sameDay.format(at) === sameDay.format(now)) return time.format(at);
  if (at < now && now - at < 6 * 24 * 60 * 60 * 1000) return weekday.format(at);
  return (year.format(at) === year.format(now) ? recent : older).format(at);
}
