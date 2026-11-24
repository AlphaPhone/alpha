// spec/voice/speech.md, "A spoken reply refuses only a likely password, key or card; everything else it cannot say becomes a pause"; spec/voice/speech.md, "A spoken reply or reading says a written date, clock time, range and percentage in words"; spec/voice/speech.md, "A reading also refuses a link or email address, characters it cannot say and more than 16,000 characters"; spec/voice/speech.md, "Each finished sentence is spoken while the rest is generated, in order, and streamed audio is never kept"; spec/voice/speech.md, "An email draft is said as one line, by whether its card was validated or the action failed; other action replies drop IDs and asides unless I asked for them word for word"
import type { VoiceReplyAction } from "@elizaos/agent/voice";
import { clockWords, meridiemOf, twelveHour } from "../../gen/voice__speech.ts";

/** Why a passage was not spoken: a likely secret, a link or address, a character it cannot say, a length, or a word too long. */
export type SpokenRefusal = "secret" | "link" | "characters" | "length" | "word";

/** A passage planned for speech: the sentence-sized pieces to say in order, or why none is said. */
export type SpokenPlan = { readonly kind: "speak"; readonly pieces: readonly string[] } | { readonly kind: "refused"; readonly reason: SpokenRefusal };

const credentialLike = /`|-----BEGIN|\b(?:csk-|sk[-_]|gh[pousr]_|xox[baprs]-|AKIA|ASIA)[A-Za-z0-9_-]{8,}|\b(?:password|passphrase|api[_ -]?key|access[_ -]?token|secret|recovery[_ -]?(?:code|phrase)|seed phrase)\s*(?::|=|is\b)|\b[A-Za-z0-9_-]{32,}\b|(?:\d[ -]?){13,19}/i;
const linkOrEmail = /(?:https?:\/\/|www\.|mailto:)|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const unsupported = /[^A-Za-z0-9\s'.,!?;:()]/;
const unsupportedAll = /[^A-Za-z0-9\s'.,!?;:()]/g;
const sayable = /[A-Za-z0-9]/;
const currency: Record<string, string> = { $: "dollar", "£": "pound", "€": "euro" };

/** The longest passage a reading accepts. */
export const READING_MAX_CHARS = 16000;
/** The longest piece sent to a synthesizer at once. */
export const PIECE_MAX_CHARS = 300;
/** A sentence boundary closer than this to a piece's start is not used. */
export const FIRST_BOUNDARY_CHARS = 20;

/**
 * Whether the text looks like it holds a password, key, code or card number.
 * @throws {never}
 */
export function looksSecret(text: string): boolean {
  return credentialLike.test(text);
}

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ordinals = [
  "", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth",
  "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh", "twenty-eighth",
  "twenty-ninth", "thirtieth", "thirty-first",
];
const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["", "", "twenty", "thirty", "forty", "fifty"];

function numberWords(n: number): string {
  if (n < 20) return ones[n] ?? String(n);
  return n % 10 === 0 ? tens[n / 10] ?? String(n) : `${tens[Math.floor(n / 10)] ?? ""} ${ones[n % 10] ?? ""}`;
}

/** Each name in full and, when longer, its first three letters; capitalised as written, so the verb "may" stays a word. */
function namesPattern(names: readonly string[]): string {
  return names.flatMap((name) => (name.length > 3 ? [name, name.slice(0, 3)] : [name])).flatMap((name) => [name, name.toUpperCase()]).join("|");
}

// A weekday and month by name with a day of the month; a colon after it ends a heading, but "Nov 22:30" is not a date.
const namedDate = new RegExp(
  String.raw`\b(?:(${namesPattern(weekdays)})\.?,?[ \t]+)?(${namesPattern(months)}|Sept|SEPT)\.?[ \t]+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?![\p{L}\d/-]|[.:]\d)`,
  "gu",
);
const clock = String.raw`(?:0?[1-9]|1[0-2])(?::[0-5]\d)?`;
const bareClock = String.raw`(?:[01]?\d|2[0-3]):[0-5]\d`;
const meridiem = String.raw`[ \t]*[ap]\.?[ \t]*m(?:\.(?=[ \t]*[,;–—−-]|[ \t]+to[ \t]))?`;
const rangeSeparator = String.raw`(?:[ \t]*[-–—−][ \t]*|[ \t]+to[ \t]+)`;
const clockEnd = String.raw`(?![\p{L}\d:/-]|\.\d)`;
// Not after a sign, a letter or another number: "UTC+01:00" and "2026-11-21" keep their digits.
const clockStart = String.raw`(?<![\p{L}\d:+./-])`;
const clockRange = new RegExp(String.raw`${clockStart}(?:(${clock}(?:${meridiem})?)${rangeSeparator}(${clock}${meridiem})|(${bareClock})${rangeSeparator}(${bareClock}))${clockEnd}`, "giu");
const clockWithMeridiem = new RegExp(String.raw`${clockStart}(${clock}${meridiem})${clockEnd}`, "giu");
const bareClockTime = new RegExp(String.raw`${clockStart}${bareClock}${clockEnd}`, "gu");
const signedClock = /(?<=[+−]|[\p{L}\d]-)(\d{1,2}):(\d{2})(?![\d:])/gu;

/** A written clock time in words, as spec/voice/speech.md models it: "three thirty P M", "nine oh five", "seven o'clock", "noon". */
function clockSaid(value: string): string {
  const match = /^(\d{1,2})(?::(\d{2}))?[ \t]*([ap])?/i.exec(value);
  if (match === null) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const written = match[3] === undefined ? "NoMeridiem" : match[3].toLowerCase() === "p" ? "Afternoon" : "Morning";
  const period = meridiemOf(hour, written);
  const suffix = period === "Afternoon" ? " P M" : period === "Morning" ? " A M" : "";
  switch (clockWords(hour, minute, written, match[2] !== undefined)) {
    case "NoonWord": return "noon";
    case "MidnightWord": return "midnight";
    case "HourAndMinutes": return `${numberWords(twelveHour(hour))} ${minute < 10 ? "oh " : ""}${numberWords(minute)}${suffix}`;
    case "HourOClock": return `${numberWords(twelveHour(hour))} o'clock`;
    case "HourAlone": return `${numberWords(twelveHour(hour))}${suffix}`;
  }
}

/** Dates, clock times and headings by name and in words; what the owner reads is never changed, only what is said. */
function speakDatesAndTimes(text: string): string {
  return text
    .replace(namedDate, (_, day: string | undefined, month: string, date: string) => {
      const fullDay = day === undefined ? undefined : weekdays.find((name) => name.toLowerCase().startsWith(day.toLowerCase()));
      const fullMonth = months.find((name) => name.toLowerCase().startsWith(month.toLowerCase())) ?? month;
      return `${fullDay === undefined ? "" : `${fullDay}, `}${fullMonth} ${ordinals[Number(date)] ?? date}`;
    })
    .replace(clockRange, (_, from?: string, to?: string, fromBare?: string, toBare?: string) => `${clockSaid(from ?? fromBare ?? "")} to ${clockSaid(to ?? toBare ?? "")}`)
    .replace(clockWithMeridiem, clockSaid)
    .replace(bareClockTime, clockSaid)
    // The final "." of "a.m." before a lower-case word ends no sentence, so "5 a.m. coffee" is said as one.
    .replace(/(?<= [AP] M)\.(?=[ \t]+\p{Ll})/gu, "")
    // An offset such as "GMT+5:30", or a clock run into a number as in "10-12:30", keeps the digit groups it was said in before.
    .replace(signedClock, (_, hour: string, minute: string) => `${hour}${minute === "00" ? " o'clock" : minute[0] === "0" ? ` oh ${minute[1]}` : ` ${minute}`}`)
    .replace(/(?<=\d)%(?![\p{L}\d])/gu, " percent")
    .replace(/(?<=\p{L}):(?=[ \t]+\S)/gu, ",")
    .replace(/(?<=\p{L}):(?=$|[ \t]*\r?\n)/gmu, ".");
}

function speakNumbers(text: string): string {
  return text
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/([$£€])\s?(\d+)(?:\.(\d{1,2}))?(?!\d|\.\d)/g, (_, sign: string, whole: string, cents?: string) =>
      `${whole} ${currency[sign]}${whole === "1" ? "" : "s"}${cents && Number(cents) ? ` ${cents.padEnd(2, "0")}` : ""}`)
    // A range of short numbers; clock ranges were said already, and longer runs are phone numbers and ISO dates.
    .replace(/(?<![\d:-])(\d{1,2})-(\d{1,2})(?![\d:-])/g, "$1 to $2")
    .replace(/(\d)-(?=\d)/g, "$1, ");
}

function fold(input: string, conversation: boolean): string {
  const base = conversation
    ? input.normalize("NFD").replace(/\p{M}+/gu, "").replace(/([A-Za-z])\/(?=[A-Za-z])/g, "$1 ").replace(/\b(?:https?:\/\/|mailto:)|\bwww\./gi, "")
    : input;
  // Dates and times are said before dashes become pauses, so "09:05–10:00" is still a range.
  const said = speakDatesAndTimes(base.normalize("NFC")
    .replace(/[‘’]/g, "'").replace(/[“”"]/g, "").replace(/…/g, "...")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^[ \t]*[-*+][ \t]+([A-Za-z0-9*_'"].*?)[ \t]*$/gm, (_, item: string) => (/[.!?;:,]$/.test(item) ? item : `${item}.`))
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/(\*\*|__)([^\n]+?)\1/g, "$2")
    .replace(/(^|[\s(])([*_])([^\n]+?)\2(?=$|[\s).,!?;:])/g, "$1$3"));
  return speakNumbers(said.replace(/[—–]/g, "; ").replace(/−/g, "-"))
    .replace(/(^|[^A-Za-z0-9])-\s*(?=\d)/g, "$1minus ")
    .replace(/([A-Za-z])-([A-Za-z])/g, "$1 $2")
    // A compound such as "30-minute" is one phrase, not a dash.
    .replace(/(\d)-(?=[A-Za-z])/g, "$1 ")
    .replace(/-/g, " dash ")
    .replace(/(\d)\.(?=\d)/g, "$1 point ")
    .replace(/(\d):(?=\d)/g, "$1 colon ")
    .replace(/(\d)\/(?=\d)/g, "$1 slash ")
    .replace(/&/g, " and ").replace(/%/g, " percent ").replace(/\+/g, " plus ").replace(/=/g, " equals ")
    .replace(/\$/g, " dollars ").replace(/£/g, " pounds ").replace(/€/g, " euros ")
    .replace(/\.{2,}/g, ".").replace(/\s+/g, " ").trim();
}

function pieces(text: string, conversation: boolean): SpokenPlan {
  const out: string[] = [];
  let rest = text;
  while (rest) {
    let boundary = -1;
    for (const match of rest.slice(0, PIECE_MAX_CHARS + 1).matchAll(/[.!?;]\s/g)) {
      if ((match.index ?? 0) >= FIRST_BOUNDARY_CHARS) {
        boundary = (match.index ?? 0) + 1;
        break;
      }
    }
    if (boundary < 0) boundary = rest.length <= PIECE_MAX_CHARS ? rest.length : rest.lastIndexOf(" ", PIECE_MAX_CHARS);
    if (boundary < 1) {
      if (!conversation) return { kind: "refused", reason: "word" };
      boundary = PIECE_MAX_CHARS;
    }
    const piece = rest.slice(0, boundary).trim();
    rest = rest.slice(boundary).trim();
    if (!sayable.test(piece)) {
      if (conversation) continue;
      return { kind: "refused", reason: "characters" };
    }
    out.push(piece);
  }
  return { kind: "speak", pieces: out };
}

/**
 * Plan a conversation reply: only a likely secret refuses it, whatever else it cannot say becomes a pause, and nothing left to say is silence.
 * @throws {never}
 */
export function planReply(input: string): SpokenPlan {
  if (looksSecret(input)) return { kind: "refused", reason: "secret" };
  const text = fold(input, true).replace(unsupportedAll, " ").replace(/\s+/g, " ").trim();
  if (!sayable.test(text)) return { kind: "speak", pieces: [] };
  if (looksSecret(text)) return { kind: "refused", reason: "secret" };
  return pieces(text, true);
}

/**
 * Plan a reading the owner asked for: a bounded passage with no link, address, secret or character it cannot say.
 * @throws {never}
 */
export function planReading(input: string): SpokenPlan {
  if (!input.trim() || input.length > READING_MAX_CHARS) return { kind: "refused", reason: "length" };
  if (linkOrEmail.test(input)) return { kind: "refused", reason: "link" };
  if (looksSecret(input)) return { kind: "refused", reason: "secret" };
  const text = fold(input, false);
  if (!sayable.test(text) || unsupported.test(text)) return { kind: "refused", reason: "characters" };
  return pieces(text, false);
}

/**
 * What a refused passage tells the owner.
 * @throws {never}
 */
export function refusalMessage(reason: SpokenRefusal, reply: boolean): string {
  switch (reason) {
    case "secret": return reply ? "This reply may contain a password or code, so it wasn't read aloud." : "This message may contain a password or code, so it can't be read aloud.";
    case "link": return "This message has a link or email address, so it can't be read aloud.";
    case "characters": return "This message has characters that can't be read aloud.";
    case "length": return "Listening supports a message up to 16,000 characters. Copy a shorter passage into a note to listen.";
    case "word": return "A word is too long to read aloud. Nothing has been read.";
  }
}

/** What kind of action a reply reports, as the resident labels it. */
export type ReplyAction =
  | { readonly kind: "none" }
  | { readonly kind: "email-draft"; readonly validatedCard: boolean }
  | { readonly kind: "email-failed" }
  | { readonly kind: "other"; readonly verbatimAsked: boolean };

/** The resident's names of the actions that hand an email to the phone's composer. */
export const EMAIL_DRAFT_ACTIONS: ReadonlySet<string> = new Set(["INBOX_COMPOSE_EMAIL"]);

/**
 * The kind of reply a voice turn's action label makes: none without a label, an email draft for an action that hands an email to the composer, another action otherwise.
 * @throws {never}
 */
export function replyActionOf(label: VoiceReplyAction | undefined): ReplyAction {
  if (label === undefined) return { kind: "none" };
  if (EMAIL_DRAFT_ACTIONS.has(label.kind)) return { kind: "email-draft", validatedCard: label.validatedCard };
  return { kind: "other", verbatimAsked: label.verbatimAsked };
}

/** Said for an email draft with a validated card. */
export const EMAIL_DRAFT_READY = "Your email draft is ready to review.";
/** Said for an email suggestion without a validated card. */
export const SUGGESTED_EMAIL = "The suggested email is in the chat.";
/** Said when the email action failed. */
export const EMAIL_FAILED = "The email action failed. The suggested wording is in the chat.";
/** Said when nothing of an action reply is left to say. */
export const DETAILS_IN_CHAT = "The details are in the chat.";

const delimitedId = /(?:\b[\w-]*\s?(?:ID|Id|id)\s*[:=#]\s*["'`<[(]?[\w.:@/-]+["'`>\])]?)|<[^>\n]{1,200}>|\[[^\]\n]{1,200}\]/g;
const aside = /\s*\([^()\n]{0,400}\)/g;

/**
 * The line a voice conversation says for a reply; the written reply in the chat is never changed.
 * @throws {never}
 */
export function spokenLineOf(text: string, action: ReplyAction): string {
  switch (action.kind) {
    case "none": return text;
    case "email-draft": return action.validatedCard ? EMAIL_DRAFT_READY : SUGGESTED_EMAIL;
    case "email-failed": return EMAIL_FAILED;
    case "other": {
      if (action.verbatimAsked) return text;
      const stripped = text.replace(delimitedId, " ").replace(aside, "").replace(/\s+([.,;:!?])/g, "$1").replace(/\s+/g, " ").trim();
      return sayable.test(stripped) ? stripped : DETAILS_IN_CHAT;
    }
  }
}
