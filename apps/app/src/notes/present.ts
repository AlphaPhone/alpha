// spec/app/notes/index.md, "Pinned notes come first, then the rest, narrowed to the chosen folder"
import type { Stored } from "./shown.ts";

/** Seconds as the owner reads a recording's length: 6:48. @throws {never} */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** A note's two-line preview: its body, a checklist's items with their marks, a voice note's length and words, or a link's site. @throws {never} */
export function preview(note: Stored): string {
  const data = note.format?.data;
  const kind = note.format?.kind ?? "text";
  const text = kind === "list"
    ? (data?.items ?? []).map((item) => `${item.done === true ? "☑" : "☐"} ${item.t}`).join("\n")
    : kind === "link"
      ? data?.domain ?? ""
      : note.body.trim() !== "" ? note.body : (data?.lines ?? []).map((line) => line.t).join(" ");
  const said = text.replace(/[ \t]+/g, " ").trim().slice(0, 240);
  const ms = kind === "voice" ? data?.audio?.durationMs : undefined;
  return ms === undefined ? said : `${clock(ms / 1000)}${said === "" ? "" : " · "}${said}`;
}

const sameDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
const year = new Intl.DateTimeFormat("en", { year: "numeric" });

/** When a note last changed, as the list says it: the time today, the weekday within a week, else the date. @throws {never} */
export function dated(note: Stored, now: number): string {
  const at = Date.parse(note.updatedAt);
  if (!Number.isFinite(at)) return "";
  if (sameDay.format(at) === sameDay.format(now)) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(at);
  if (at < now && now - at < 6 * 24 * 60 * 60 * 1000) return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(at);
  return new Intl.DateTimeFormat(undefined, year.format(at) === year.format(now) ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" }).format(at);
}
