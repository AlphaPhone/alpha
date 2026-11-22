// States the telephony components reach, for their stories (`*.meta.tsx`) only; production never loads them.
import type { Actions } from "../../../gen/telephony__actions.ts";
import type { Attention } from "../../../gen/telephony__attention.ts";
import type { CallBar } from "../../../gen/telephony__callBar.ts";
import type { Comms } from "../../../gen/telephony__comms.ts";
import type { Slot } from "../../../gen/telephony__drafts.ts";
import type { Phone } from "../../../gen/telephony__phone.ts";
import type { Voicemail } from "../../../gen/telephony__voicemail.ts";

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
  run: { tag: "Choosing", runId: "op1", kind: "PlaceCall", candidates: [
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
