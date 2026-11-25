// spec/app/phone/index.md, "Each digit, or each digit taken back, is judged by the phone and looked up among the contacts on the phone"; spec/app/messages/index.md, "The filter chip and the search start a new list, and Retry reads it again"
import { normalizePhoneNumber } from "@elizaos/os-bridges";
import type { Typed } from "../../gen/app__phone.ts";

/** Numbers every network routes to emergency services, as Android's own list starts. */
const emergencyNumbers = new Set(["911", "112", "999", "000", "110", "119", "118", "08"]);

/** What the keypad's digits are: none, a start of a number, a number the phone can dial, or an emergency number. @throws {never} */
export function judge(digits: string): Typed {
  if (digits === "") return "Blank";
  if (emergencyNumbers.has(digits)) return "Emergency";
  return digits.replace(/\D/g, "").length >= 3 && normalizePhoneNumber(digits) !== null ? "Dialable" : "Partial";
}

/** Whether every word of `query` matches: a word with digits the digits of `number`, any other the start of a word of one of `names`. */
export function matches(query: string, names: string, number = ""): boolean {
  const digits = number.replace(/\D/g, "");
  const words = names.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word !== "");
  return query.toLowerCase().split(/\s+/).filter((word) => word !== "").every((word) =>
    /\d/.test(word) ? digits.includes(word.replace(/\D/g, "")) : words.some((name) => name.startsWith(word)));
}

/** When a call, message or voicemail was, short. */
export const when = (date: number) => new Date(date).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

/** Caller name as held by the address book or provider, with a readable fallback for a number. */
export function callerTitle(number: string, name: string | null): string {
  if (number === "") return "Unknown";
  return name || displayNumber(number);
}

/** Show a North American number as it is read out on Phone and keep international numbers intact. */
export function displayNumber(number: string): string {
  const digits = number.replace(/\D/g, "");
  const local = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  return local.length === 10 && !/^\+(?!1)/.test(number.trim()) ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}` : number;
}

/** A caller without a name uses the number mark. */
export function callerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => /^\p{L}/u.test(word));
  const first = words[0];
  const last = words.length > 1 ? words.at(-1) : undefined;
  return first === undefined ? "#" : `${Array.from(first)[0]}${Array.from(last ?? "")[0] ?? ""}`.toUpperCase();
}

/** Local recency as shown in the call log and voicemail. */
export function shortWhen(at: number, now: number): string {
  if (!Number.isFinite(at)) return "";
  const minute = 60_000;
  const age = now - at;
  const date = new Date(at);
  const today = new Date(now);
  if (age >= 0 && age < minute) return "now";
  if (age >= 0 && age < 60 * minute) return `${Math.floor(age / minute)}m`;
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (age >= 0 && age < 6 * 24 * 60 * minute) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

/** Minutes and seconds, rounded down to the current full second. */
export function clockLength(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
