// spec/app/phone/index.md, "Each digit, or each digit taken back, is judged by the phone and looked up among the contacts on the phone"; spec/app/messages/index.md, "The filter chip and the search start a new list, and Retry reads it again"
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/phone";
import type { Typed } from "../../gen/app__phone.ts";

/** Numbers every network routes to emergency services, as Android's own list starts. */
const emergencyNumbers = new Set(["911", "112", "999", "000", "110", "119", "118", "08"]);

/** What the keypad's digits are: none, a start of a number, a number the phone can dial, or an emergency number. */
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
