// States the telephony components reach, for their stories (`*.meta.tsx`) only; production never loads them.
import type { ContactId, ContactVersion } from "@elizaos/os/bridges/contacts";
import type { Actions } from "../../../gen/telephony__actions.ts";
import type { Attention } from "../../../gen/telephony__attention.ts";
import type { CallBar } from "../../../gen/telephony__callBar.ts";
import type { Comms } from "../../../gen/telephony__comms.ts";
import type { Contacts, Detail, Editor } from "../../../gen/telephony__contacts.ts";
import type { Drafts, Slot } from "../../../gen/telephony__drafts.ts";
import type { MessageRow, Messages } from "../../../gen/telephony__messages.ts";
import type { Phone } from "../../../gen/telephony__phone.ts";
import type { PhoneFacts } from "../../../gen/telephony__phoneInfo.ts";
import type { Voicemail } from "../../../gen/telephony__voicemail.ts";
import type { ReviewDetails } from "../../telephony/actions.vibe";
import type { OpenCard } from "../../telephony/comms.vibe";
import type { SimChoice } from "../../telephony/drafts.vibe";
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
/** A contact change choosing its one row, whose fields are `reviewChange`'s. */
export const choosingChange: Actions = {
  ongoing: { tag: "Choosing", runId: "op2", kind: "ContactChange", candidates: [{ candidateId: "7:replace", title: "Maya Chen", number: "7:replace" }] },
  ran: ["op2"], dispatches: 0, refusals: 0,
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
  confirming: false, gate: "WriteIdle", writeKind: "NoWrite", lastWrite: { tag: "NothingWritten" }, chip: "", notice: "NoContactsNotice",
};
/** The open contact's removal waiting for confirmation. */
export const contactConfirming: Contacts = { ...contactOpen, confirming: true };
/** A lost write answer: every write held until an explicit read. */
export const contactUnsettled: Contacts = { ...contactOpen, gate: "WriteUnsettled", notice: "OutcomeUnknown" };
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

/** A text's body, quoted above the numbers to choose from. */
export const reviewBody: ReviewDetails = { body: "Running late, start without me" };
/** More contacts matched than the review lists. */
export const reviewMore: ReviewDetails = { more: 8 };
/** A contact's number replaced: its fields as the phone holds them and as they would be saved. */
export const reviewChange: ReviewDetails = {
  changes: {
    "7:replace": {
      before: {
        id: "7" as ContactId, lookup: "k7", displayName: "Maya Chen", givenName: "Maya", familyName: "Chen", starred: false,
        phoneNumbers: [{ number: "4155550100", type: "mobile" }], emailAddresses: [{ address: "maya@example.com", type: "home" }], version: "a".repeat(64) as ContactVersion,
      },
      after: { displayName: "Maya Chen", phoneNumbers: [{ number: "4155550123", type: "mobile" }], emailAddresses: [{ address: "maya@example.com", type: "home" }] },
    },
  },
};

const PEOPLE = ["Maya Chen", "Sam Okafor", "Priya Natarajan", "Maximiliana Alexandrovna Konstantinopoulou-Whitfield", "Leo Brandt", "Ines Duarte"];
const KINDS = ["MissedCall", "InboundCall", "OutboundCall"] as const;

/** Recents while the first read is in flight. */
export const recentsReading: Phone = { ...recents, reading: true, recents: [], access: "LogUnread" };
/** A call-log read that failed: never "no recent calls". */
export const recentsFailed: Phone = { ...recents, recents: [], notice: { tag: "ReadFailed" } };
/** Call history read and empty. */
export const recentsEmpty: Phone = { ...recents, recents: [] };
/** Fifty calls, the most Recents reads, with unnamed numbers and a very long name. */
export const recentsMany: Phone = {
  ...recents,
  recents: Array.from({ length: 50 }, (_, i) => ({
    id: `r${i}`, number: `41555502${String(i).padStart(2, "0")}`, title: i % 4 === 3 ? "" : PEOPLE[i % PEOPLE.length]!, kind: KINDS[i % 3]!,
    date: at - i * 5_400_000, fresh: i === 0, seconds: i % 3 === 0 ? 0 : 30 + i * 7,
  })),
};
/** Alpha's filter over Recents, with its chip. */
export const recentsFiltered: Phone = { ...recents, listQuery: { tag: "AlphaQuery", query: "Maya", label: "Maya" } };
/** A dial in flight from the keypad: every key and Call locked. */
export const keypadDialing: Phone = { ...keypad, dialing: true, notice: { tag: "Quiet" } };
/** The Voicemail tab in front. */
export const phoneVoicemail: Phone = { ...recents, tab: "VoicemailTab" };

/** The bar over Recents with the chat closed. */
export const commsRecents: Comms = { ...commsThread, app: "PhoneApp", subject: "RecentsSubject", key: "phone:recents:" };
/** The bar with Alpha addressed over Recents. */
export const commsRecentsAlpha: Comms = { ...commsRecents, height: "SheetOpen", target: "AlphaTarget" };
/** The bar over the keypad. */
export const commsKeypad: Comms = { ...commsRecents, subject: "KeypadSubject" };
/** The bar over the Messages list. */
export const commsMessagesList: Comms = { ...commsThread, subject: "ListSubject", key: "messages:list:" };
/** The bar over the Contacts list. */
export const commsContacts: Comms = { ...commsThread, app: "ContactsApp", subject: "ListSubject", key: "contacts:list:" };
/** The bar over one open contact. */
export const commsContact: Comms = { ...commsContacts, subject: "ContactSubject", key: "contacts:contact:7" };

/** A long request to Alpha, kept in the bar until a turn takes it. */
export const longRequest = "Who called me most this week, and did any of them leave a voicemail I have not listened to yet? If so, read me the transcript.";

/** Contacts listed with none open. */
export const contactsList: Contacts = {
  ...contactOpen,
  openId: "", detail: { tag: "NoDetail" }, detailTicket: 0,
  rows: [
    contactOpen.rows[0]!,
    { id: "8", title: "Maya Ortiz", phones: ["4155550111"], emails: [], complete: true, lookup: "k8", revision: "r1" },
    { id: "9", title: "Sam Okafor", phones: ["4155550122"], emails: ["sam@example.com"], complete: true, lookup: "k9", revision: "r1" },
    { id: "10", title: "", phones: ["4155550133"], emails: [], complete: true, lookup: "k10", revision: "r1" },
    { id: "11", title: "", phones: [], emails: [], complete: false, lookup: "k11", revision: "r1" },
  ],
};
/** The first read in flight. */
export const contactsLoading: Contacts = { ...contactsList, loading: true, readable: false, rows: [] };
/** Contacts access not granted: never "no contacts". */
export const contactsNeedAccess: Contacts = { ...contactsList, readable: false, writable: false, rows: [] };
/** A read that failed. */
export const contactsFailed: Contacts = { ...contactsList, failed: true, rows: [] };
/** Contacts read and empty. */
export const contactsEmpty: Contacts = { ...contactsList, rows: [] };
/** A full first page, letters heading the rows, with more to load. */
export const contactsMany: Contacts = {
  ...contactsList,
  more: true,
  rows: ["Ada", "Ben", "Chloe", "Dev", "Elena", "Farah", "Gus", "Hana", "Ivan", "Jun"]
    .flatMap((first) => ["Abara", "Brooks", "Castillo", "Dunn", "Eriksen"].map((last) => `${first} ${last}`))
    .map((title, i) => ({ id: String(100 + i), title, phones: [`41555503${String(i).padStart(2, "0")}`], emails: [], complete: true, lookup: `k${100 + i}`, revision: "r1" })),
};
/** Alpha's filter over Contacts, with its chip and count. */
export const contactsFiltered: Contacts = { ...contactsList, chip: "Climbing", query: "climbing", rowsQuery: "climbing", rows: contactsList.rows.slice(0, 2) };
/** A lost write answer over the list: Add is held until an explicit read. */
export const contactsUnsettled: Contacts = { ...contactsList, gate: "WriteUnsettled", lastWrite: { tag: "Wrote", outcome: "WriteUnknown" }, notice: "OutcomeUnknown" };
/** The editor open on a contact that changed on the phone since it opened. */
export const contactEditingStale: Contacts = { ...contactOpen, editor: editingStale, notice: "ChangedSinceShown" };

/** Conversations while the first read is in flight. */
export const threadsLoading: Messages = { ...threads, busy: true, access: "SmsUnread", threads: [], more: false };
/** Messages read and empty. */
export const threadsEmpty: Messages = { ...threads, threads: [], more: false };
/** A long list: groups, unnamed numbers, a long snippet and a long name. */
export const threadsMany: Messages = {
  ...threads,
  threads: Array.from({ length: 40 }, (_, i) => ({
    id: `thread:${i + 1}`, title: i % 5 === 4 ? "" : PEOPLE[i % PEOPLE.length]!, addresses: i % 7 === 6 ? ["4155550100", "4155550111", "4155550122"] : [`41555504${String(i).padStart(2, "0")}`],
    snippet: i === 1 ? "Can you pick up the climbing shoes on the way, and the chalk bag from the front desk? I left both by the lockers near the bouldering wall." : "See you at five",
    date: at - i * 3_600_000, unread: i < 3, complete: true,
  })),
};
/** A new message: one recipient added, the contact picker open on a query. */
export const composing: Messages = {
  ...threads,
  view: { tag: "Composing" },
  picker: { tag: "PickerOpen", query: "sa", busy: false, needsAccess: false, more: false, choices: [
    { key: "9:4155550122", title: "Sam Okafor", number: "4155550122" },
    { key: "12:4155550144", title: "Sasha Ivanova", number: "4155550144" },
  ] },
};
/** One conversation open, an earlier delete unconfirmed and its menu open, one send still in flight. */
export const inThread: Messages = {
  ...threads,
  view: { tag: "InThread", threadId: "thread:1", addresses: ["4155550100"] },
  rows: [
    { ...receivedText, id: "sms:0", date: at - 600_000, body: "Are we still on for the gym tonight? I booked the 6pm slot but can move it if the traffic on the bridge is as bad as yesterday." },
    receivedText, deliveredText, sentPictures,
  ],
  more: true,
  menu: { tag: "MenuOpen", rowId: "sms:1", confirm: false },
  uncertain: ["sms:1"],
  deleteNotice: { tag: "DeleteUncertain" },
  outgoing: [{ operationId: "op9", toThread: "thread:1", body: "Bringing the ropes", startedAt: at - 5_000, createdAt: 0, progress: "Sending" }],
};
/** The same conversation with nothing pending. */
export const inThreadQuiet: Messages = { ...inThread, menu: { tag: "NoMenu" }, uncertain: [], deleteNotice: { tag: "NoDeleteNotice" }, outgoing: [] };

/** No drafts and no requests to Alpha. */
export const noDrafts: Drafts = { slots: [], requests: [], ownerSends: 0 };
/** Alpha's draft waiting in the open conversation. */
export const draftsAlpha: Drafts = { ...noDrafts, slots: [alphaDraft] };
/** The new message's slot with one recipient. */
export const draftsComposing: Drafts = { ...noDrafts, slots: [{ ...alphaDraft, thread: "new", recipients: ["4155550111"], text: "", author: "ByOwner", undo: { tag: "NoUndo" } }] };
/** The owner's own text with two pictures attached. */
export const draftsPictures: Drafts = {
  ...noDrafts,
  slots: [{
    ...alphaDraft, text: "Here are the photos from Saturday", author: "ByOwner", undo: { tag: "NoUndo" },
    pictures: [{ pictureName: "IMG_2041.jpg", contentType: "image/jpeg", bytes: 412_000 }, { pictureName: "IMG_2042.jpg", contentType: "image/jpeg", bytes: 388_000 }],
  }],
};
/** Two SIMs to choose from when no default SMS SIM is set. */
export const simChoices: readonly SimChoice[] = [{ id: 1, label: "Personal" }, { id: 2, label: "Work" }];
