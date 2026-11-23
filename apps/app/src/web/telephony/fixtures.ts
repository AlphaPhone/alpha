// States the telephony components reach, for their stories (`*.meta.tsx`) only; production never loads them.
import type { Actions } from "../../../gen/telephony__actions.ts";
import type { Attention } from "../../../gen/telephony__attention.ts";
import type { CallBar } from "../../../gen/telephony__callBar.ts";
import type { Comms } from "../../../gen/telephony__comms.ts";
import type { Contacts, Detail, Editor } from "../../../gen/telephony__contacts.ts";
import type { Slot } from "../../../gen/telephony__drafts.ts";
import type { MessageRow, Messages } from "../../../gen/telephony__messages.ts";
import type { Phone } from "../../../gen/telephony__phone.ts";
import type { PhoneFacts } from "../../../gen/telephony__phoneInfo.ts";
import type { Voicemail } from "../../../gen/telephony__voicemail.ts";
import type { OpenCard } from "../../telephony/comms.vibe";
import type { UndoView } from "../../telephony/undo.vibe";

const at = 1_763_800_000_000;

/** A call connected a minute and a half ago. */
export const activeCall: CallBar = {
  calls: [{ id: "c1", phase: "Active", connectedAt: at - 90_000 }], trusted: true, generation: 3, eligible: true, ending: "",
  shown: true, endedUntil: 0, now: at, reading: { inCall: "KnownYes", emergency: "KnownNo" },
};
/** A call that rings. */
export const ringingCall: CallBar = { ...activeCall, calls: [{ id: "c2", phase: "Ringing", connectedAt: 0 }] };
/** A call that just ended, holding its place. */
export const endedCall: CallBar = { ...activeCall, calls: [], shown: false, endedUntil: at + 1_500 };

/** Recents read, one missed call new. */
export const recents: Phone = {
  shown: true, epoch: 2, reading: false, askAccess: false, session: 1, dialing: false, tab: "RecentsTab", voicemailReady: true,
  recents: [
    { id: "1", number: "4155550100", title: "Maya Chen", kind: "MissedCall", date: at - 300_000, fresh: true, seconds: 0 },
    { id: "2", number: "4155550111", title: "", kind: "OutboundCall", date: at - 86_400_000, fresh: false, seconds: 125 },
  ],
  access: "LogGranted", readAt: at, number: "", prefill: "", notice: { tag: "Quiet" }, listQuery: { tag: "NoQuery" },
};
/** The keypad with a number typed and the dial screen opened instead of a call. */
export const keypad: Phone = { ...recents, tab: "KeypadTab", number: "4155550100", notice: { tag: "Placement", outcome: "DialerOpened" } };
/** Call-log access not granted. */
export const recentsNeedAccess: Phone = { ...recents, recents: [], access: "LogNeeded" };

/** One voicemail open, transcribed on the phone. */
export const voicemail: Voicemail = {
  shown: true, epoch: 2, carrier: "CarrierReady", inCall: false, deleteFailed: false, writeBlocked: false,
  rows: [{ id: "v1", number: "4155550100", title: "Maya Chen", date: at - 600_000, seconds: 24, fresh: false, hasAudio: true, carrierText: "" }],
  opened: { openId: "v1", ticket: 3, audio: "AudioReady", transcript: "TranscriptDone", words: "Call me back when you land.", engine: "DeviceEngine", playback: "Stopped", heard: true, confirming: false, deleting: false },
};

/** The bar over a conversation with the chat closed. */
export const commsThread: Comms = {
  app: "MessagesApp", subject: "ThreadSubject", key: "messages:thread:thread:1", target: "PersonTarget", height: "SheetClosed", voice: false,
  stage: [], callLive: false, emergency: false, ring: "", proposal: { tag: "NoProposal" }, past: [], briefed: "", approved: 0,
};
/** The bar with Alpha addressed over a conversation. */
export const commsAlpha: Comms = { ...commsThread, height: "SheetOpen", target: "AlphaTarget" };
/** The bar during a call, End beside it. */
export const commsCall: Comms = { ...commsThread, app: "PhoneApp", subject: "CallSubject", key: "phone:call:c1", callLive: true };

/** Alpha's draft waiting, the owner's text kept for Undo. */
export const alphaDraft: Slot = {
  thread: "thread:1", recipients: ["4155550100"], text: "Running late, start without me", author: "ByAlpha",
  undo: { tag: "UndoTo", undoText: "On my", undoAuthor: "ByOwner" }, operation: { tag: "NoOperation" }, outcome: "NotSent", pictures: [], sim: -1,
};

/** A call to a name with two matching numbers, waiting for the owner's choice. */
export const choosing: Actions = {
  ongoing: { tag: "Choosing", runId: "op1", kind: "PlaceCall", candidates: [
    { candidateId: "7:4155550100", title: "Maya Chen", number: "4155550100" },
    { candidateId: "8:4155550111", title: "Maya Ortiz", number: "4155550111" },
  ] },
  ran: ["op1"], dispatches: 0, refusals: 0,
};

/** Home with an unread conversation and a missed call. */
export const attention: Attention = {
  homeShown: true, epoch: 2, readAt: at,
  threadsRead: true, unread: [{ threadId: "thread:1", title: "Maya Chen", snippet: "See you at five", date: at - 60_000 }],
  callsRead: true, missed: [{ callerKey: "4155550111", title: "4155550111", date: at - 120_000 }], voicemailRead: true, fresh: [],
};

/** A voicemail open with its delete waiting for the owner's confirmation. */
export const voicemailConfirming: Voicemail = { ...voicemail, opened: { ...voicemail.opened, confirming: true } };
/** A carrier without visual voicemail: never shown as "no voicemail". */
export const voicemailUnsupported: Voicemail = { ...voicemail, carrier: "CarrierUnsupported", rows: [], opened: { ...voicemail.opened, openId: "", audio: "AudioNone", transcript: "TranscriptNone", words: "", engine: "NoEngine", heard: false } };

/** Two conversations listed, one unread, and one the host would not clip. */
export const threads: Messages = {
  shown: true, epoch: 2, busy: false, access: "SmsGranted", failed: false, roleHeld: true, readAt: at,
  view: { tag: "ThreadList" },
  threads: [
    { id: "thread:1", title: "Maya Chen", addresses: ["4155550100"], snippet: "See you at five", date: at - 60_000, unread: true, complete: true },
    { id: "thread:2", title: "", addresses: [], snippet: "", date: at - 3_600_000, unread: false, complete: false },
  ],
  rows: [], more: true, listQuery: { tag: "NoQuery" }, searching: false, menu: { tag: "NoMenu" }, deleting: false, uncertain: [],
  deleteNotice: { tag: "NoDeleteNotice" }, outgoing: [], picker: { tag: "PickerClosed" }, pickTicket: 0,
};
/** Alpha's filter applied to the list, with its chip. */
export const threadsFiltered: Messages = { ...threads, listQuery: { tag: "AlphaQuery", query: "five", label: "five" } };
/** Messages without SMS read access. */
export const threadsNeedAccess: Messages = { ...threads, access: "SmsNotGranted", threads: [], more: false };
/** A read that failed: never "no messages". */
export const threadsFailed: Messages = { ...threads, failed: true, threads: [], more: false };

/** A received text with a safe link. */
export const receivedText: MessageRow = { id: "sms:1", kind: "SmsKind", threadId: "thread:1", outgoing: false, condition: "Received", date: at - 60_000, body: "See you at five https://example.com/map", pictures: 0, complete: true };
/** An SMS the radio confirmed delivered. */
export const deliveredText: MessageRow = { ...receivedText, id: "sms:2", outgoing: true, condition: "DeliveredOut", body: "On my way" };
/** A picture message the owner sent: an MMS never reads Delivered. */
export const sentPictures: MessageRow = { ...receivedText, id: "mms:3", kind: "MmsKind", outgoing: true, condition: "SentOut", body: "", pictures: 2 };

/** One contact open as the phone holds it now. */
export const contactDetail: Extract<Detail, { tag: "DetailRead" }> = {
  tag: "DetailRead", contactId: "7", version: "a".repeat(64), displayName: "Maya Chen", givenName: "Maya", familyName: "Chen",
  notes: "Climbing on Tuesdays", notesEditable: true,
  phoneFields: [{ number: "4155550100", phoneType: "mobile" }], emailFields: [{ address: "maya@example.com", emailType: "home" }],
};
/** Contacts with one contact open, writable and idle. */
export const contactOpen: Contacts = {
  shown: true, epoch: 3, loading: false, explicitRead: false, readable: true, writable: true, failed: false,
  rows: [{ id: "7", title: "Maya Chen", phones: ["4155550100"], emails: ["maya@example.com"], complete: true, lookup: "k7", revision: "r1" }],
  rowsQuery: "", query: "", searching: false, more: false, limit: 50, openId: "7", detail: contactDetail, detailTicket: 2, editor: { tag: "EditorClosed" },
  confirming: false, gate: "WriteIdle", writeKind: "NoWrite", lastWrite: { tag: "NothingWritten" }, chip: "", notice: { tag: "NoContactsNotice" },
};
/** The open contact's removal waiting for confirmation. */
export const contactConfirming: Contacts = { ...contactOpen, confirming: true };
/** A lost write answer: every write held until an explicit read. */
export const contactUnsettled: Contacts = { ...contactOpen, gate: "WriteUnsettled", notice: { tag: "OutcomeUnknown" } };
/** The in-app editor open on the contact read whole. */
export const editing: Extract<Editor, { tag: "EditorOpen" }> = { tag: "EditorOpen", mode: "Editing", editId: "7", editVersion: "a".repeat(64), dirty: false, stale: false, notesEditable: true };
/** The editor after the contact changed on the phone since it opened. */
export const editingStale: Extract<Editor, { tag: "EditorOpen" }> = { ...editing, dirty: true, stale: true };
/** The editor for a new contact. */
export const creating: Extract<Editor, { tag: "EditorOpen" }> = { ...editing, mode: "Creating", editId: "", editVersion: "" };

/** A message deletion queued in the phone's window, Undo still able to win. */
export const undoQueued: UndoView = {
  notices: [{ key: "message:sms:1", title: "Message deleted", notice: "NoticeQueued", message: "Undo is available for a moment.", canUndo: true, uncertain: false }],
  said: "",
};
/** A deletion whose outcome the phone could not confirm. */
export const undoUncertain: UndoView = {
  notices: [{ key: "voicemail:v1", title: "Voicemail", notice: "NoticeUncertain", message: "The phone could not confirm the delete.", canUndo: false, uncertain: true }],
  said: "",
};
/** What a refused Undo said. */
export const undoRefused: UndoView = { notices: [], said: "It could not be restored." };

/** A call proposal kept from before a restart: shown, never approved. */
export const restoredCard: OpenCard = { proposalId: "p1", live: false, words: { text: "Call Maya back?", title: "Call Maya Chen", detail: "(415) 555-0100" } };
/** A restored proposal whose words were not kept. */
export const restoredWordless: OpenCard = { proposalId: "p2", live: false, words: null };

/** Settings → Phone with one SIM read, Alpha holding both roles and voicemail set up. */
export const phoneFacts: PhoneFacts = {
  shown: true, epoch: 1, phase: "InfoShown", asking: false, phoneState: true,
  lines: [{ slot: 0, carrier: "Carrier", simName: "Personal", number: "4155550100", network: "Network5g", roaming: false, signal: 3, embedded: false, imei: "", simSerial: "" }],
  holders: { phoneApp: "ai.alphacompute.alphaphone", phoneAlpha: true, smsApp: "ai.alphacompute.alphaphone", smsAlpha: true },
  voicemail: "VoicemailOn",
};
/** Two SIMs, one roaming on an eSIM, and another app holding the SMS role. */
export const phoneFactsTwoSims: PhoneFacts = {
  ...phoneFacts,
  lines: [
    phoneFacts.lines[0]!,
    { slot: 1, carrier: "Other", simName: "", number: "", network: "Network4g", roaming: true, signal: 1, embedded: true, imei: "", simSerial: "" },
  ],
  holders: { ...phoneFacts.holders, smsApp: "com.android.messaging", smsAlpha: false },
  voicemail: "VoicemailNotSetUp",
};
/** Phone-state access not granted: the SIM list is unread, not empty. */
export const phoneFactsUnread: PhoneFacts = { ...phoneFacts, phoneState: false, lines: [], voicemail: "VoicemailUnknown" };
/** The read failed. */
export const phoneFactsFailed: PhoneFacts = { ...phoneFacts, phase: "InfoFailed", lines: [], holders: { phoneApp: "", phoneAlpha: false, smsApp: "", smsAlpha: false }, voicemail: "VoicemailUnknown" };
/** The read in flight. */
export const phoneFactsReading: PhoneFacts = { ...phoneFactsFailed, phase: "InfoReading" };
