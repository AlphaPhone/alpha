// spec/telephony/phone.md, "The bar's query filters Recents on the phone, and Alpha's filter returns to Recents"; spec/telephony/phoneInfo.md, "Story: See my SIM, carrier and number on the image"; spec/telephony/callBar.md, "The bar says Calling until the call is active, and only an active call counts a clock from its connect time"; spec/telephony/comms.md, "A subject is briefed once, only with the chat open, and never from fixtures in production"
import type { BarWords } from "../../../gen/telephony__callBar.ts";
import type { CallOutcome, ListQuery } from "../../../gen/telephony__common.ts";
import type { ContactsNotice } from "../../../gen/telephony__contacts.ts";
import type { DeleteNotice } from "../../../gen/telephony__messages.ts";
import type { PhoneNotice } from "../../../gen/telephony__phone.ts";
import type { Holders, Line, Network, VoicemailSetup } from "../../../gen/telephony__phoneInfo.ts";
import type { BriefingFacts } from "../../telephony/comms.vibe";
import type { SendProblem } from "../../telephony/drafts.vibe";

const MINUTE = 60_000;
const DAY = 86_400_000;
const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const monthDayYear = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const full = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "now", "5m", "9:41", "Mon", "Oct 3": the shortest label that still places the time. */
export function shortWhen(at: number, now: number): string {
  if (!Number.isFinite(at) || at <= 0) return "";
  const age = now - at;
  const date = new Date(at);
  if (age >= 0 && age < MINUTE) return "now";
  if (age >= 0 && age < 60 * MINUTE) return `${Math.floor(age / MINUTE)}m`;
  if (date.toDateString() === new Date(now).toDateString()) return time.format(date);
  if (age >= 0 && age < 6 * DAY) return weekday.format(date);
  return (date.getFullYear() === new Date(now).getFullYear() ? monthDay : monthDayYear).format(date);
}

/** The full date and time, for an accessible label. */
export const longWhen = (at: number) => full.format(new Date(at));

/** "0:24" for a call or voicemail length; "1:02:03" from an hour. */
export function clockLength(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

/** Up to two initials; "#" for a bare number or an empty name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => /^\p{L}/u.test(word));
  return words.length ? (words[0]![0]! + (words.length > 1 ? words[words.length - 1]![0]! : "")).toUpperCase() : "#";
}

/** "(415) 555-0132" for ten or eleven (leading 1) digits; anything else unchanged. */
export function displayNumber(number: string): string {
  const digits = number.replace(/\D/g, "");
  const local = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  return local.length === 10 && !/^\+(?!1)/.test(number.trim()) ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}` : number;
}

/** A person's name, else their number, else "Unknown". */
export const who = (title: string, number: string) => title.trim() || (number ? displayNumber(number) : "Unknown");

/** One line naming everyone in a conversation. */
export const threadTitle = (title: string, addresses: readonly string[]) => title.trim() || (addresses.length ? addresses.map(displayNumber).join(", ") : "Unknown");

/** The first name a bar addresses, or the whole title for a number or a group. */
export const firstOf = (title: string) => /^[+(\d]/.test(title) || title.includes(",") ? title : title.split(/\s+/)[0] ?? title;

/** Every word of the query matches: a word with digits the number's digits, any other word the start of a word of the name. */
export function matchesCallQuery(row: { title: string; number: string }, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const digits = row.number.replace(/\D/g, "");
  const names = row.title.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
  return words.every((word) => (/\d/.test(word) ? word.replace(/\D/g, "") !== "" && digits.includes(word.replace(/\D/g, "")) : names.some((name) => name.startsWith(word))));
}

/** Whether a conversation matches the list query over its title and snippet. */
export const matchesThread = (title: string, snippet: string, query: string) => !query.trim() || `${title} ${snippet}`.toLowerCase().includes(query.trim().toLowerCase());

/** The query's text and, for Alpha's, its chip label. */
export function queryOf(q: ListQuery): { text: string; chip: string | null } {
  if (q.tag === "OwnerQuery") return { text: q.typed, chip: null };
  if (q.tag === "AlphaQuery") return { text: q.query, chip: q.label || q.query };
  return { text: "", chip: null };
}

/** A typed query that reads as a sentence goes to Alpha on Enter, not into the local filter. */
export function isAskSentence(text: string): boolean {
  const t = text.trim();
  return t !== "" && (/[?]$/.test(t) || t.split(/\s+/).length >= 4);
}

function whenPhrase(at: number, now: number): string {
  const when = shortWhen(at, now);
  if (when === "now") return "just now";
  if (now - at >= 0 && now - at < 60 * MINUTE) return `${Math.floor((now - at) / MINUTE)} min ago`;
  return new Date(at).toDateString() === new Date(now).toDateString() ? `at ${when}` : `on ${when}`;
}

/** The Phone briefing: the newest missed calls and new voicemail, in one or two sentences. */
export function callsBriefing(facts: BriefingFacts, now: number): string | null {
  const missed = [...facts.missed].sort((a, b) => b.date - a.date);
  const latest = missed[0];
  const calls = !latest ? "" : missed.length === 1
    ? `${who(latest.title, latest.number)} called ${whenPhrase(latest.date, now)} and you missed it.`
    : `${missed.length} missed calls, the latest from ${who(latest.title, latest.number)} ${whenPhrase(latest.date, now)}.`;
  const voice = facts.voicemail.length === 0 ? "" : facts.voicemail.length === 1
    ? `One new voicemail, from ${who(facts.voicemail[0]!.title, facts.voicemail[0]!.number)}.`
    : `${facts.voicemail.length} new voicemails.`;
  return [calls, voice].filter(Boolean).join(" ") || null;
}

/** What the call bar says. */
export function barWordsText(words: BarWords): string {
  switch (words.tag) {
    case "Incoming": return "Incoming call";
    case "Calling": return "Calling…";
    case "OnHold": return "On hold";
    case "OnCall": return "On call";
    case "OnCallFor": return `On call · ${clockLength(words.seconds)}`;
    case "CallEnded": return "Call ended";
  }
}

const CALL_OUTCOMES: Record<CallOutcome, string> = {
  CallStarted: "Call started.",
  EmergencyOpened: "Place the call from the dial screen.",
  LineBusy: "A call is already in progress. Nothing was dialed.",
  CallsUnavailable: "Calls aren’t available right now. Nothing was dialed.",
  CallNotStarted: "The call didn’t go through. Nothing was dialed.",
  DialerOpened: "Your phone app is open with the number. Place the call there.",
  NoDialer: "No app on this phone can dial this. Nothing was dialed.",
  DialerFailed: "The dial screen didn’t open. Nothing was dialed.",
  CallUnconfirmed: "Call unconfirmed.",
};

/** What Phone says under the keypad. */
export function phoneNoticeText(notice: PhoneNotice): string {
  switch (notice.tag) {
    case "Quiet": return "";
    case "InvalidNumber": return "Invalid number";
    case "ReadFailed": return "Couldn’t load";
    case "Placement": return CALL_OUTCOMES[notice.outcome];
  }
}

/** What a Send refused before anything was sent says. */
export function sendProblemText(problem: SendProblem): string {
  const words: Record<string, string> = {
    "no-recipient": "Add a number.", "invalid-recipient": "Check the phone numbers.", "too-many-recipients": "Too many people for one message.",
    "empty-body": "Enter a message.", "empty-message": "Enter a message or add a picture.", "body-too-long": "Messages are limited to 1,600 characters.",
    "invalid-body": "The message contains characters that cannot be sent.", "sim-unknown": "No active SIM is available.", "sim-required": "Pick a SIM.",
    "sim-not-selectable": "Pick the SIM in your messaging app.", "too-many-attachments": "An MMS can carry at most five pictures.",
    "attachment-type": "Only JPEG, PNG and GIF pictures can be sent.", "attachment-name": "A picture could not be named for sending.",
    "attachment-empty": "A picture is empty.", "too-large": "The pictures are larger than an MMS allows (1 MB in total).",
    "mms-unavailable": "This phone cannot send picture messages from Alpha.", "status-unread": "Refresh Messages, then try again.",
    "picture-unreadable": "A picture couldn’t be read. Remove it and try again.",
  };
  return words[problem] ?? "Nothing was sent.";
}

/** What a refused or uncertain message delete says. */
export function deleteNoticeText(notice: DeleteNotice): string {
  if (notice.tag === "NoDeleteNotice") return "";
  if (notice.tag === "DeleteUncertain") return "Deletion outcome unknown. The message is kept on screen.";
  return {
    RowMissing: "This message was not found. Refresh Messages.",
    RowChanged: "This message changed. Review it again.",
    RowInSend: "This message is still sending or did not send, so it was not deleted.",
    Removed: "",
    RemovalUnknown: "Deletion outcome unknown. The message is kept on screen.",
  }[notice.reason];
}

/** What Contacts says after a write or a refused draft. */
export function contactsNoticeText(notice: ContactsNotice): string {
  return {
    NoContactsNotice: "",
    ChangedSinceShown: "This contact changed. Close the editor and reopen it to review the latest fields.",
    ContactGone: "That contact is no longer on this phone.",
    NotWritten: "The contact could not be saved.",
    OutcomeUnknown: "Outcome unknown. Refresh Contacts before trying again.",
    DraftRefused: "Add a name, number or email, and check the numbers and addresses.",
    SystemEditorFailed: "Android Contacts could not open. Refresh and try again.",
  }[notice];
}

const PHONE_TYPES: Record<string, string> = {
  home: "Home", mobile: "Mobile", work: "Work", fax_work: "Work fax", fax_home: "Home fax", pager: "Pager", other: "Other", callback: "Callback",
  car: "Car", company_main: "Company main line", isdn: "ISDN", main: "Main", other_fax: "Other fax", radio: "Radio", telex: "Telex",
  tty_tdd: "TTY/TDD", work_mobile: "Work mobile", work_pager: "Work pager", assistant: "Assistant", mms: "MMS",
};
const EMAIL_TYPES: Record<string, string> = { home: "Home", work: "Work", other: "Other", mobile: "Mobile" };

/** A contact field's type label; a custom type shows the owner's own label. */
export function typeLabel(type: string, email: boolean): string {
  if (type.startsWith("custom:")) return type.slice(7).trim() || (email ? "Email" : "Phone");
  return (email ? EMAIL_TYPES : PHONE_TYPES)[type] ?? (email ? "Email" : "Phone");
}

/** A message's text as plain parts and credential-free HTTP(S) links; nothing is rendered as HTML. */
export function messageSegments(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let at = 0;
  for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) {
    const raw = match[0].replace(/[.,!?;:]+$/, "");
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (!url.hostname || url.username || url.password) continue;
    const start = match.index ?? 0;
    if (start > at) parts.push({ text: text.slice(at, start) });
    parts.push({ text: raw, href: url.href });
    at = start + raw.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}

const GSM_BASIC = new Set("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà");
const GSM_EXTENDED = new Set("^{}\\[~]|€\f");

/** How many linked texts Android likely sends: 160 GSM characters in one (153 per part), else 70 UTF-16 units (67). */
export function smsPartEstimate(body: string): number {
  const gsm: number[] = [];
  const unicode: number[] = [];
  let encodable = true;
  for (const char of body) {
    unicode.push(char.length);
    if (GSM_BASIC.has(char)) gsm.push(1);
    else if (GSM_EXTENDED.has(char)) gsm.push(2);
    else encodable = false;
  }
  const costs = encodable ? gsm : unicode;
  const [single, size] = encodable ? [160, 153] : [70, 67];
  if (costs.reduce((a, b) => a + b, 0) <= single) return 1;
  let count = 1;
  let used = 0;
  for (const cost of costs) {
    if (used + cost > size) {
      count++;
      used = 0;
    }
    used += cost;
  }
  return count;
}

/** The lines under a text's body on its approval card: the carrier may charge, and Approve sends at once. */
export function smsSendFacts(recipients: number, body: string, draftsInOpenThread: boolean): string[] {
  const lines: string[] = [];
  if (recipients > 1) lines.push("Each person gets their own text. This isn’t a group message.");
  const count = smsPartEstimate(body);
  if (count > 1) lines.push(`${recipients > 1 ? "Each person likely gets it" : "It likely goes"} as ${count} linked texts.`);
  lines.push(`Approve sends it right away.${draftsInOpenThread ? " If your conversation with them is open in Messages, it goes into its text field instead, and nothing is sent until you tap Send there." : ""} Your carrier may charge for texts.`);
  return lines;
}

/** The approval card's title and detail for a call (AC-20): the name and the number. */
export function callCardText(target: { number: string } | { contact: string }, party: { name: string | null; numbers: readonly string[] } | null): { title: string; detail: string } {
  if ("number" in target) {
    const shown = displayNumber(target.number);
    return { title: `Call ${party?.name || shown}`, detail: party && !party.name ? `${shown} · not in Contacts` : shown };
  }
  const name = party?.name || target.contact;
  const numbers = party?.numbers ?? [];
  return { title: `Call ${name}`, detail: numbers.length === 1 ? displayNumber(numbers[0]!) : numbers.length > 1 ? `${numbers.length} numbers · you choose one before it dials` : "You confirm the number before it dials" };
}

/** One labelled value on Settings → Phone. */
export interface InfoRow { readonly label: string; readonly value: string }

const NETWORK: Record<Network, string> = {
  NoService: "No service", Network2g: "2G", Network3g: "3G", Network4g: "4G", Network5g: "5G", WifiCalling: "Wi-Fi calling", NetworkUnknown: "Unknown",
};
const SIGNAL = ["None", "Poor", "Fair", "Good", "Excellent"];

/** One line's rows: carrier, SIM name, own number, network and roaming, signal, slot or eSIM, and the identifiers only when Android returned them. */
export function lineRows(line: Line): InfoRow[] {
  const rows: InfoRow[] = [];
  if (line.carrier) rows.push({ label: "Carrier", value: line.carrier });
  if (line.simName) rows.push({ label: "SIM name", value: line.simName });
  if (line.number) rows.push({ label: "Number", value: displayNumber(line.number) });
  rows.push({ label: "Network", value: `${NETWORK[line.network]}${line.roaming ? " · Roaming" : ""}` });
  if (line.signal >= 0 && line.network !== "NoService") rows.push({ label: "Signal", value: SIGNAL[line.signal] ?? "Unknown" });
  rows.push({ label: "SIM", value: line.embedded ? "eSIM" : `Slot ${line.slot + 1}` });
  if (line.imei) rows.push({ label: "IMEI", value: line.imei });
  if (line.simSerial) rows.push({ label: "SIM serial", value: line.simSerial });
  return rows;
}

/** A line's caption, only when there is more than one SIM to tell apart. */
export const lineCaption = (line: Line, count: number) => (count > 1 ? `SIM ${line.slot + 1}` : "");

const holder = (app: string, alpha: boolean) => (alpha ? "Alpha" : app || "None");

/** Which apps Android uses for calls and texts, and whether the carrier's voicemail is set up. */
export function holderRows(holders: Holders, voicemail: VoicemailSetup): InfoRow[] {
  const rows: InfoRow[] = [
    { label: "Phone app", value: holder(holders.phoneApp, holders.phoneAlpha) },
    { label: "Messages app", value: holder(holders.smsApp, holders.smsAlpha) },
  ];
  if (voicemail !== "VoicemailUnknown") rows.push({ label: "Voicemail", value: voicemail === "VoicemailOn" ? "On" : voicemail === "VoicemailNotSetUp" ? "Not set up" : "Not available" });
  return rows;
}
