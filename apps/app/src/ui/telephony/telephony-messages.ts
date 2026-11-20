/**
 * What the Phone and Messages screens say for the shared native telephony bridge's answers.
 * Android's `TelephonyPlugin` (plugin-native-messages, registered as `AlphaTelephony`) answers a
 * call, a dial or SMS-app handoff and a reviewed send with English sentences, and the staged
 * `native-telephony.ts`/`mms-send.ts` client adds its own refusals. Each sentence is worded by
 * Alpha here; the bridge's text is never shown. Agent receipts are worded by
 * `telephony-receipt-text.ts`.
 */
import { refusalText, resultText } from "../utils/native-refusal";

/** Keyed by every sentence `TelephonyPlugin.placeCall` resolves with. */
export const CALL_RESULTS: ReadonlyMap<string, string> = new Map([
  ["The dial screen is open with this number. Place the call there.", "The dial screen is open with this number; place the call there."],
  ["No app on this phone handles this. Nothing was dialed.", "No app on this phone can dial this. Nothing was dialed."],
  ["The dial screen could not be opened. Nothing was dialed.", "The dial screen didn’t open. Nothing was dialed."],
  ["This phone cannot place calls.", "This phone can’t place calls."],
  ["The phone's call state could not be read. Nothing was dialed.", "Alpha couldn’t check whether a call is in progress. Nothing was dialed."],
  ["A call is already in progress. Nothing was dialed.", "A call is already in progress. Nothing was dialed."],
  ["Android accepted the call request. This does not show whether the call connects.", "Android took the call request; Alpha can’t tell whether it connects."],
  ["Android refused the call request. Nothing was dialed.", "Android didn’t accept the call. Nothing was dialed."],
]);

const CALL_STATUS: Readonly<Record<string, string>> = {
  "emergency-handoff": "Place the call from the dial screen.",
  unavailable: "Calls aren’t available right now. Nothing was dialed.",
  busy: "A call is already in progress. Nothing was dialed.",
  failed: "The call didn’t go through. Nothing was dialed.",
};

/** Keyed by every sentence a dial or SMS-app handoff resolves with. */
export const HANDOFF_RESULTS: ReadonlyMap<string, string> = new Map([
  ["No app on this phone handles this.", "No app on this phone can open this."],
  ["The app could not be opened. Nothing was sent or dialed.", "The app didn’t open. Nothing was sent or dialed."],
  [
    "Your phone app is open with the number. Place the call there; this app does not know whether it connects.",
    "Your phone app is open with the number. Place the call there; Alpha can’t tell whether it connects.",
  ],
  ["Text is ready in your messaging app. Nothing has been sent.", "Your message is ready in your messaging app. Nothing has been sent."],
]);

/** Keyed by every sentence a reviewed SMS or MMS send can be refused with before it is sent. */
export const SEND_REFUSALS: ReadonlyMap<string, string> = new Map([
  // TelephonyPlugin sendSms, sendMms and composeSms.
  ["Choose the SIM in your messaging app", "Your messaging app chooses the SIM. Nothing was sent."],
  ["Invalid message", "This message can’t be sent. Check it and try again."],
  ["Invalid recipient", "A recipient isn’t a valid phone number. Nothing was sent."],
  ["Invalid reviewed message", "This message changed after review. Review it again; nothing was sent."],
  ["This request is too old to read back. Nothing was sent again.", "This send is too old to check. Nothing was sent again."],
  ["This request was already used for a different message. Nothing was sent.", "This send was already used for a different message. Nothing was sent."],
  ["The send record could not be read. Nothing was sent.", "Alpha couldn’t read its send record. Nothing was sent."],
  ["Nothing was sent.", "Nothing was sent."],
  ["Another message is waiting for review", "Another message is waiting for your review. Nothing was sent."],
  [
    "This message is larger than the carrier allows. Remove or shrink an attachment and review again.",
    "This message is larger than your carrier allows. Remove or shrink a picture, then review again.",
  ],
  ["Phone, Contacts and Messages are available only on the Alpha Phone system image.", "Phone, Contacts and Messages are available only on the Alpha Phone system image."],
  // The staged client (native-telephony.ts SmsSendNotAttempted and range checks, mms-send.ts).
  ["Another message is waiting for review. Nothing was sent.", "Another message is waiting for your review. Nothing was sent."],
  ["The review could not be shown. Nothing was sent.", "The review couldn’t be shown. Nothing was sent."],
  ["A native send needs the reviewed SIM", "Choose a SIM, then review the message again. Nothing was sent."],
  ["Too large for a native send", "This message is too large to send from Alpha. Nothing was sent."],
  ["Invalid reviewed MMS", "This message changed after review. Review it again; nothing was sent."],
  ["An MMS needs text or an attachment", "Add text or a picture to send."],
  ["MMS attachment names must be distinct", "Two pictures have the same name. Remove one and try again."],
  ["MMS is too large", "These pictures are too large to send together."],
  ["Invalid MMS attachment", "A picture can’t be sent. Remove it and try again."],
  // Alpha's own Messages composer port (sms-adapter.ts composerClient, AlphaMessagesComposerPort
  // and AlphaTelephonyPlugin.composerGuard). These carry a code, so without a row the code's
  // generic sentence would replace the remedy.
  ["Open the Messages composer to send this draft.", "Open the Messages composer to send this draft. Nothing was sent."],
  ["Invalid Messages draft.", "This draft can’t be sent from the Messages composer. Nothing was sent."],
]);

/** What a refused send says by its code when its sentence is unknown. */
const SEND_CODE: Readonly<Record<string, string>> = {
  "too-long": "This text is too long to send as SMS. Nothing was sent.",
  "too-large": "This message is larger than your carrier allows. Nothing was sent.",
  invalid: "This message can’t be sent. Nothing was sent.",
  busy: "Another message is waiting for your review. Nothing was sent.",
  unavailable: "Messages isn’t available right now. Nothing was sent.",
  expired: "This send is too old to check. Nothing was sent again.",
};

/** Alpha's sentence for a place-call result that did not place a call. */
export function callResultText(result: { status?: unknown; message?: unknown }): string {
  const status = typeof result.status === "string" ? result.status : "";
  return resultText(result.message, CALL_RESULTS, Object.hasOwn(CALL_STATUS, status) ? CALL_STATUS[status] : CALL_STATUS.failed);
}

/** What an opened handoff says by its target when its sentence is unknown. */
const HANDED_OFF: Readonly<Record<string, string>> = {
  dialer: "Your phone app is open with the number. Place the call there; Alpha can’t tell whether it connects.",
  sms: "Your message is ready in your messaging app. Nothing has been sent.",
};

/** Alpha's sentence for a dial or messaging-app handoff result: its sentence, else its status and target. */
export function handoffResultText(result: { status?: unknown; target?: unknown; message?: unknown }): string {
  const target = typeof result.target === "string" ? result.target : "";
  const fallback =
    result.status === "handed-off"
      ? Object.hasOwn(HANDED_OFF, target)
        ? HANDED_OFF[target]
        : "Opened. Finish there; Alpha hasn’t sent or dialed anything."
      : "Couldn’t open. Nothing was sent or dialed.";
  return resultText(result.message, HANDOFF_RESULTS, fallback);
}

/** Alpha's sentence for a send refused before anything was sent, by its sentence, else its code. */
export function sendRefusalText(error: unknown, fallback: string): string {
  const code = (error as { code?: unknown } | null)?.code;
  const byCode = typeof code === "string" && Object.hasOwn(SEND_CODE, code) ? SEND_CODE[code] : fallback;
  return refusalText(error, SEND_REFUSALS, byCode, { ownErrors: typeof code !== "string" });
}

/**
 * Alpha's label for a contact saved without a name, the same one the Contacts list shows. The
 * shared contact lookup (`contactLookupMatches` in `packages/contracts/src/phone-dial.ts`) fills a
 * blank name with its own words, which are never shown: the name is read from the contact row.
 */
export const UNNAMED_CONTACT = "Unnamed contact";

/** The name a call choice shows for a contact row: its own name, else {@link UNNAMED_CONTACT}. */
export type ContactMatch = {id: string; name: string; number: string};

export function contactChoiceName(displayName: string): string {
  return displayName.trim() || UNNAMED_CONTACT;
}

/**
 * Alpha's label for each phone number type the shared address book reads and writes
 * (`CONTACT_PHONE_TYPES` in `packages/contracts/src/native-address-book.ts`, Android's
 * `ContactsContract.CommonDataKinds.Phone` types in `plugin-native-contacts`). The identifier is
 * never shown; a type the owner named (`custom:<label>`) shows the owner's label.
 */
export const CONTACT_PHONE_TYPE_LABELS: Readonly<Record<string, string>> = {
  home: "Home",
  mobile: "Mobile",
  work: "Work",
  fax_work: "Work fax",
  fax_home: "Home fax",
  pager: "Pager",
  other: "Other",
  callback: "Callback",
  car: "Car",
  company_main: "Company main line",
  isdn: "ISDN",
  main: "Main",
  other_fax: "Other fax",
  radio: "Radio",
  telex: "Telex",
  tty_tdd: "TTY/TDD",
  work_mobile: "Work mobile",
  work_pager: "Work pager",
  assistant: "Assistant",
  mms: "MMS",
};
/** Alpha's label for each email type (`CONTACT_EMAIL_TYPES`). */
export const CONTACT_EMAIL_TYPE_LABELS: Readonly<Record<string, string>> = {
  home: "Home",
  work: "Work",
  other: "Other",
  mobile: "Mobile",
};
const CUSTOM_TYPE = "custom:";

function contactTypeLabel(table: Readonly<Record<string, string>>, type: string): string | null {
  if (type.startsWith(CUSTOM_TYPE)) return type.slice(CUSTOM_TYPE.length).trim() || null;
  return Object.hasOwn(table, type) ? table[type] : null;
}
/** A label's form inside a sentence: an acronym or the owner's own label stays as written. */
const inSentence = (label: string, type: string) =>
  type.startsWith(CUSTOM_TYPE) || /^[A-Z]{2}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);

/** The sub-label and editor label of a contact's phone number; an unknown type reads as "Phone". */
export function contactPhoneLabel(type: string): string {
  return contactTypeLabel(CONTACT_PHONE_TYPE_LABELS, type) ?? "Phone";
}
/** The editor's field label for a phone number, e.g. "Work phone"; an unknown type reads as "Phone". */
export function contactPhoneFieldLabel(type: string): string {
  const label = contactTypeLabel(CONTACT_PHONE_TYPE_LABELS, type);
  return label ? `${label} phone` : "Phone";
}
/** The editor's remove button for a phone number, e.g. "Remove work fax number". */
export function contactPhoneRemoveLabel(type: string): string {
  const label = contactTypeLabel(CONTACT_PHONE_TYPE_LABELS, type);
  return label ? `Remove ${inSentence(label, type)} number` : "Remove phone number";
}
/** The detail sub-label of a contact's email address; an unknown type reads as "Email". */
export function contactEmailLabel(type: string): string {
  return contactTypeLabel(CONTACT_EMAIL_TYPE_LABELS, type) ?? "Email";
}
/** The editor's field label for an email address, e.g. "Work email"; an unknown type reads as "Email". */
export function contactEmailFieldLabel(type: string): string {
  const label = contactTypeLabel(CONTACT_EMAIL_TYPE_LABELS, type);
  return label ? `${label} email` : "Email";
}
/** The editor's remove button for an email address, e.g. "Remove work email". */
export function contactEmailRemoveLabel(type: string): string {
  const label = contactTypeLabel(CONTACT_EMAIL_TYPE_LABELS, type);
  return label ? `Remove ${inSentence(label, type)} email` : "Remove email";
}
