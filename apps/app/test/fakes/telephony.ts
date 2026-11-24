// spec/app/telephony/common.md, "A provider is read only while its view is in front on an unlocked phone with the grant"
import { createHash } from "node:crypto";
import type { ActionJournalPlugin } from "@elizaos/os/bridges/definitions/action-journal";
import type { AddressBookNativePlugin } from "@elizaos/os/bridges/definitions/contacts";
import type { MessagesNativePlugin } from "@elizaos/os/bridges/definitions/messages";
import type { PhoneNativePlugin } from "@elizaos/os/bridges/definitions/phone";
import { smsBindingHash } from "@elizaos/os/bridges/messages";
import { type Faked, plugin, rejection } from "./phone.ts";

/** A call in the phone's log. */
export interface LoggedCall { id: number; number: string; name: string | null; date: number; type: "incoming" | "outgoing" | "missed" }
/** A voicemail the carrier delivered. */
export interface HeldVoicemail { id: number; number: string; date: number; heard: boolean; deleted: boolean }
/** A text in the phone's SMS provider: received into the inbox, or sent from it. */
export interface Text { id: number; thread: number; address: string; box: "inbox" | "sent"; date: number; body: string; read: boolean }
/** A contact in the address book. */
export interface Person { id: string; displayName: string; givenName: string; familyName: string; phoneNumbers: { number: string; type: string }[]; emailAddresses: { address: string; type: string }[]; notes?: string; revision: number }
/** A call Telecom holds. */
export interface Live { id: string; state: "dialing" | "ringing" | "active" | "held"; connectedAt: number | null }

/**
 * The Alpha image's telephony, faked at the plugins its host registers: nothing here calls, texts or writes anything
 * outside the journey. Each list records what the phone was asked to do, so a journey can see that only the owner's
 * own tap reached it.
 */
export interface TelephonyScene {
  callLog: "granted" | "denied";
  calls: LoggedCall[];
  /** Whether Alpha holds the phone role; without it a call opens the dial screen. */
  dialer: boolean;
  placed: string[];
  dialed: string[];
  carrier: "ready" | "unconfigured" | "unsupported";
  voicemails: HeldVoicemail[];
  sms: "granted" | "denied";
  texts: Text[];
  /** Every text the radio was handed: the operation it was reviewed under, and to whom. */
  sent: { operationId: string; recipients: string[]; body: string }[];
  journal: Map<string, Record<string, unknown>>;
  contacts: boolean;
  people: Person[];
  staged: { id: string; kind: string; target: Record<string, unknown>; phase: string; deadline: { expiresAt: number } }[];
  live: Live[];
  emergency: boolean | null;
  ended: string[];
  /** The calls whose screen the strip's Return brought to the front. */
  returned: string[];
  /** The phone's own report of its calls, pushed as the in-call service does. */
  report: () => void;
  /** The providers' change notice, as the SMS provider's observer sends it. */
  changed: () => void;
  /** Every part of the send under `operationId` delivered, as the radio's delivery reports say, and the observer told. */
  deliver: (operationId: string) => void;
  /** While set, the radio has not answered a send yet. */
  hold: Promise<void> | undefined;
}

const versionOf = (id: string, revision: number) => createHash("sha256").update(`${id}:${revision}`).digest("hex");

/** A fresh image: a call log, two voicemails, one conversation and two contacts. */
export function telephonyScene(): TelephonyScene {
  return {
    callLog: "granted",
    calls: [
      { id: 3, number: "+14155550100", name: "Maya Chen", date: 1_700_000_300_000, type: "missed" },
      { id: 2, number: "+14155550111", name: null, date: 1_700_000_200_000, type: "outgoing" },
    ],
    dialer: true,
    placed: [],
    dialed: [],
    carrier: "ready",
    voicemails: [{ id: 11, number: "+14155550100", date: 1_700_000_100_000, heard: false, deleted: false }],
    sms: "granted",
    texts: [{ id: 1, thread: 1, address: "+14155550100", box: "inbox", date: 1_700_000_050_000, body: "See you at five", read: false }],
    sent: [],
    journal: new Map(),
    contacts: true,
    people: [
      { id: "7", displayName: "Maya Chen", givenName: "Maya", familyName: "Chen", phoneNumbers: [{ number: "+14155550100", type: "mobile" }], emailAddresses: [], notes: "Climbing on Tuesdays", revision: 1 },
      { id: "8", displayName: "Ben Ortiz", givenName: "Ben", familyName: "Ortiz", phoneNumbers: [{ number: "+14155550122", type: "mobile" }], emailAddresses: [], revision: 1 },
    ],
    staged: [],
    live: [],
    emergency: false,
    ended: [],
    returned: [],
    report: () => {},
    changed: () => {},
    deliver: () => {},
    hold: undefined,
  };
}

/** `ElizaTelephony`: eliza's calls, call log, voicemail and SMS provider, over `world`. */
function telephony(world: TelephonyScene): Faked {
  return plugin<PhoneNativePlugin & MessagesNativePlugin, Record<string, unknown>>((emit) => {
    world.changed = () => emit("messagesChanged", {});
    world.deliver = (operationId) => {
      const record = world.journal.get(operationId);
      if (record === undefined) return;
      world.journal.set(operationId, { ...record, status: "delivered", parts: (record.parts as Record<string, unknown>[]).map((part) => ({ ...part, delivery: "success" })) });
      emit("smsSendUpdated", { operationId });
    };
    const status = () => ({
      version: 2, voiceCapable: true, smsCapable: true,
      permissions: { contacts: "granted", phoneState: "granted", sms: world.sms, sendSms: "granted", callLog: world.callLog },
      sendMode: "direct", mmsSend: true,
      roles: { dialer: { available: true, held: world.dialer, eligible: true }, sms: { available: true, held: true, eligible: true } },
      defaultDialer: world.dialer ? "ai.alphacompute.alphaphone" : "com.android.dialer", defaultSms: "ai.alphacompute.alphaphone",
      subscriptions: [{ id: 1, slot: 0, displayName: "Carrier", carrierName: "Carrier", defaultSms: true, defaultVoice: true }], defaultSmsSubscriptionId: 1,
    });
    const smsGranted = () => {
      if (world.sms !== "granted") throw rejection("SMS access is not granted", "permission-required");
    };
    const thread = (number: number) => {
      const rows = world.texts.filter((one) => one.thread === number).sort((x, y) => y.date - x.date);
      return { id: `thread:${number}`, date: rows[0]!.date, messageCount: rows.length, snippet: rows[0]!.body, unread: rows.some((one) => !one.read), addresses: [rows[0]!.address] };
    };
    const message = (one: Text) => ({
      id: `sms:${one.id}`, kind: "sms", threadId: `thread:${one.thread}`, direction: one.box === "inbox" ? "incoming" : "outgoing",
      status: one.box === "inbox" ? (one.read ? "read" : "received") : "sent", date: one.date, read: one.read, subscriptionId: 1,
      addresses: [one.address], body: one.body, deliveryReport: one.box === "inbox" ? null : "pending", attachments: 0,
    });
    const voicemail = (id: string) => world.voicemails.find((one) => String(one.id) === id && !one.deleted);
    return {
      imageCapability: () => Promise.resolve({ version: 1, image: true, feature: "android.hardware.telephony" }),
      status: () => Promise.resolve(status()),
      requestAccess: ({ access }: { access: string }) => {
        if (access === "callLog") world.callLog = "granted";
        if (access === "sms") world.sms = "granted";
        return Promise.resolve(status());
      },
      requestRole: () => {
        world.dialer = true;
        return Promise.resolve(status());
      },
      listRecentCalls: ({ limit }) => {
        if (world.callLog !== "granted") return Promise.reject(rejection("Call-log access is not granted", "permission-required"));
        const rows = [...world.calls].sort((x, y) => y.date - x.date).slice(0, limit + 1);
        return Promise.resolve({ calls: rows.map((one) => ({ id: String(one.id), number: one.number, cachedName: one.name, date: one.date, durationSeconds: 30, type: one.type, isNew: one.type === "missed" })) });
      },
      dial: ({ number }) => {
        world.dialed.push(number);
        return Promise.resolve({ status: "handed-off", target: "dialer", handler: "com.android.dialer", message: "Your phone app is open with the number." });
      },
      placeCall: ({ number }) => {
        if (!world.dialer) return Promise.reject(rejection("Make this app your phone app to place calls here.", "role-required"));
        world.placed.push(number);
        return Promise.resolve({ status: "placed", message: "Android accepted the call request." });
      },
      phoneInfo: () => Promise.resolve({
        access: { phoneState: true, phoneNumbers: true, deviceIdentifiers: false },
        lines: [{ subscriptionId: 1, slot: 0, displayName: "Carrier", carrierName: "Carrier", number: "+14155550199", countryIso: "us", networkType: "5g", roaming: false, signalLevel: 3, embedded: false, iccid: null, imei: null }],
      }),
      voicemailStatus: () => Promise.resolve({ access: true, state: world.carrier }),
      listVoicemail: ({ limit }) => Promise.resolve({
        state: world.carrier,
        voicemails: world.carrier === "unsupported" ? [] : world.voicemails.filter((one) => !one.deleted).slice(0, limit).map((one) => ({
          id: String(one.id), number: one.number, cachedName: null, date: one.date, durationSeconds: 24, isNew: !one.heard, hasAudio: true, carrierTranscript: null,
        })),
      }),
      fetchVoicemailAudio: () => Promise.resolve({ status: "ready" }),
      voicemailAudio: ({ id }) => (voicemail(id) === undefined ? Promise.reject(rejection("Voicemail not found", "not-found")) : Promise.resolve({ id, mimeType: "audio/amr", size: 3, data: "AAAA" })),
      voicemailPcm: () => Promise.reject(rejection("No recognizer here", "unavailable")),
      markVoicemailHeard: ({ id }) => {
        const one = voicemail(id);
        if (one === undefined) return Promise.resolve({ status: "not-found" });
        one.heard = true;
        return Promise.resolve({ status: "marked" });
      },
      deleteVoicemail: ({ id }) => {
        const one = voicemail(id);
        if (one === undefined) return Promise.resolve({ status: "not-found" });
        one.deleted = true;
        const staged = { id: `staged-${world.staged.length + 1}`, kind: "voicemail", target: { id }, phase: "queued", deadline: { expiresAt: 1_800_000_000_000 } };
        world.staged.push(staged);
        return Promise.resolve({ status: "queued", deletion: staged });
      },
      observeVoicemail: () => Promise.resolve(undefined),
      composeSms: () => Promise.reject(rejection("Send from Messages", "unavailable")),
      listThreads: ({ limit }) => {
        smsGranted();
        const numbers = [...new Set(world.texts.map((one) => one.thread))];
        return Promise.resolve({ threads: numbers.map(thread).sort((x, y) => y.date - x.date).slice(0, limit), next: null });
      },
      listMessages: ({ threadId, limit }) => {
        smsGranted();
        const rows = world.texts.filter((one) => `thread:${one.thread}` === threadId).sort((x, y) => y.date - x.date).slice(0, limit);
        return Promise.resolve({ messages: rows.map(message), next: null });
      },
      latestIncomingSender: () => Promise.resolve({ status: "empty" }),
      markThreadRead: ({ threadId, throughDate }) => {
        const unread = world.texts.filter((one) => `thread:${one.thread}` === threadId && one.box === "inbox" && !one.read && one.date <= throughDate);
        for (const one of unread) one.read = true;
        return Promise.resolve({ defaultSmsApp: true, updated: unread.length });
      },
      deleteMessage: (reference) => {
        const found = world.texts.find((one) => `sms:${one.id}` === reference.id);
        if (found === undefined) return Promise.resolve({ status: "not-found", message: { ...reference } });
        world.texts = world.texts.filter((one) => one !== found);
        const staged = { id: `staged-${world.staged.length + 1}`, kind: "message", target: { ...reference }, phase: "queued", deadline: { expiresAt: 1_800_000_000_000 } };
        world.staged.push(staged);
        return Promise.resolve({ status: "queued", message: { ...reference }, deletion: staged });
      },
      deleteThread: (reference) => Promise.resolve({ status: "not-found", thread: { ...reference } }),
      observeMessages: () => Promise.resolve(undefined),
      async sendSms({ operationId, recipients, body, subscriptionId }) {
        const kept = world.journal.get(operationId);
        if (kept !== undefined) return kept;
        if (world.hold !== undefined) await world.hold;
        const bindingHash = await smsBindingHash({ recipients: recipients as never, body, subscriptionId });
        world.sent.push({ operationId, recipients, body });
        const thread = world.texts.find((one) => one.address === recipients[0])?.thread ?? Math.max(0, ...world.texts.map((one) => one.thread)) + 1;
        world.texts.push({ id: Math.max(0, ...world.texts.map((one) => one.id)) + 1, thread, address: recipients[0]!, box: "sent", date: 1_700_000_400_000 + world.sent.length, body, read: true });
        const record = { kind: "sms-send", operationId, subscriptionId, bindingHash, status: "sent", parts: recipients.map((_number, recipientIndex) => ({ index: recipientIndex, recipientIndex, partIndex: 0, sent: "success", delivery: "unknown" })), createdAt: 1_700_000_400_000 };
        world.journal.set(operationId, record);
        world.changed();
        return record;
      },
      sendMms: () => Promise.reject(rejection("Send pictures from the composer", "not-approved")),
      cancelSmsReview: () => Promise.resolve(undefined),
      smsSendHistory: () => Promise.resolve({ receipts: [...world.journal.values()] }),
      smsSendResult: ({ operationId }) => Promise.resolve(world.journal.get(operationId) ?? Promise.reject(rejection("No send with this operation", "not-found"))),
      mmsSendResult: () => Promise.reject(rejection("No send with this operation", "not-found")),
    };
  });
}

/** `ElizaContacts`: the address book, over `world`. */
function contacts(world: TelephonyScene): Faked {
  return plugin<AddressBookNativePlugin>(() => {
    const status = () => ({ available: true, readable: world.contacts, writable: world.contacts });
    const find = (id: string) => world.people.find((one) => one.id === id);
    return {
      status: () => Promise.resolve(status()),
      requestPermissions: () => {
        world.contacts = true;
        return Promise.resolve(status());
      },
      list: ({ query, limit }) => {
        const found = world.people.filter((one) => one.displayName.toLowerCase().includes(query.toLowerCase())).sort((x, y) => Number(x.id) - Number(y.id));
        const page = found.slice(0, limit);
        return Promise.resolve({
          contacts: page.map((one) => ({ id: one.id, lookup: `lookup-${one.id}`, name: one.displayName, revision: String(one.revision), starred: false, phones: one.phoneNumbers.map(({ number }) => number), emails: one.emailAddresses.map(({ address }) => address) })),
          more: found.length > limit,
        });
      },
      create: () => Promise.resolve({ status: "returned" }),
      edit: () => Promise.resolve({ status: "returned" }),
      get: ({ id }) => {
        const one = find(id);
        if (one === undefined) return Promise.reject(new Error("Contact not found"));
        return Promise.resolve({
          id: one.id, lookup: `lookup-${one.id}`, displayName: one.displayName, givenName: one.givenName, familyName: one.familyName,
          ...(one.notes === undefined ? {} : { notes: one.notes }), starred: false, phoneNumbers: one.phoneNumbers, emailAddresses: one.emailAddresses, version: versionOf(one.id, one.revision),
        });
      },
      save: ({ id, version, ...draft }) => {
        const fill = (one: Person) => {
          Object.assign(one, { displayName: draft.displayName, givenName: draft.givenName ?? one.givenName, familyName: draft.familyName ?? one.familyName, phoneNumbers: draft.phoneNumbers, emailAddresses: draft.emailAddresses });
          if (draft.notes !== undefined) one.notes = draft.notes;
        };
        if (id === undefined) {
          const made: Person = { id: String(Math.max(...world.people.map((one) => Number(one.id))) + 1), displayName: "", givenName: "", familyName: "", phoneNumbers: [], emailAddresses: [], revision: 1 };
          fill(made);
          world.people.push(made);
          return Promise.resolve({ status: "saved", id: made.id, version: versionOf(made.id, made.revision) });
        }
        const one = find(id);
        if (one === undefined) return Promise.resolve({ status: "not-found" });
        if (versionOf(one.id, one.revision) !== version) return Promise.resolve({ status: "stale" });
        fill(one);
        one.revision += 1;
        return Promise.resolve({ status: "saved", id: one.id, version: versionOf(one.id, one.revision) });
      },
      remove: ({ id, version }) => {
        const one = find(id);
        if (one === undefined) return Promise.resolve({ status: "not-found" });
        if (versionOf(one.id, one.revision) !== version) return Promise.resolve({ status: "stale" });
        world.people = world.people.filter((person) => person !== one);
        const staged = { id: `staged-${world.staged.length + 1}`, kind: "contact", target: { id, version }, phase: "queued", deadline: { expiresAt: 1_800_000_000_000 } };
        world.staged.push(staged);
        return Promise.resolve({ status: "queued", deletion: staged });
      },
      resolveNames: ({ numbers }) => Promise.resolve({ names: numbers.map((number) => ({ number, name: world.people.find((one) => one.phoneNumbers.some((phone) => phone.number === number))?.displayName ?? null, photo: null })) }),
    };
  });
}

/** `ElizaActionJournal`: only its deletion window is read here. */
function journal(world: TelephonyScene): Faked {
  return plugin<ActionJournalPlugin>(() => {
    const unused = () => Promise.reject(rejection("Not a deletion call", "unavailable"));
    return {
      reserve: unused, markApplying: unused, finish: unused, get: unused, list: unused, dismiss: unused,
      pending: () => Promise.resolve({ pending: world.staged.map((row) => ({ ...row, window: "open" })) }),
      undo: ({ kind, id }) => {
        const row = world.staged.find((one) => one.kind === kind && one.id === id);
        if (row !== undefined && row.phase === "queued") row.phase = "undone";
        return Promise.resolve({ phase: row?.phase ?? "unknown" });
      },
    };
  });
}

/** The image's in-call service: `AlphaOngoingCall` with Return and End, and `AlphaCallState`. */
function ongoing(world: TelephonyScene): Faked {
  return (emit) => {
    const snapshot = () => ({ calls: world.live.map((one) => ({ ...one })) });
    const told = world.report;
    world.report = () => {
      told();
      emit("ongoingCall", snapshot());
    };
    return {
      ongoingCall: () => Promise.resolve(snapshot()),
      showCall: ({ id }: { id: string }) => {
        world.returned.push(id);
        return Promise.resolve({ shown: world.live.some((one) => one.id === id) });
      },
      endCall: ({ id }: { id: string }) => {
        world.ended.push(id);
        const found = world.live.some((one) => one.id === id);
        world.live = world.live.filter((one) => one.id !== id);
        return Promise.resolve({ ended: found });
      },
    };
  };
}

/** `AlphaCallState`: whether a call is live and whether it may be an emergency call, read and pushed with each report. */
function callState(world: TelephonyScene): Faked {
  return (emit) => {
    const reading = () => ({ inCall: world.live.length > 0, emergency: world.live.length > 0 ? world.emergency : false, emergencyLive: world.live.length > 0 && world.emergency !== false, watching: true });
    const told = world.report;
    world.report = () => {
      told();
      emit("callState", reading());
    };
    return { callState: () => Promise.resolve(reading()) };
  };
}

/** The telephony plugins an Alpha image's host registers. */
export function telephonyPlugins(world: TelephonyScene): Record<string, Faked> {
  return {
    ElizaTelephony: telephony(world),
    ElizaContacts: contacts(world),
    ElizaActionJournal: journal(world),
    AlphaOngoingCall: ongoing(world),
    AlphaCallState: callState(world),
  };
}
