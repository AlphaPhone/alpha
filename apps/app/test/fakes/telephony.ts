// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import type { ActionJournalPlugin } from "@elizaos/os/bridges/definitions/action-journal";
import type { AddressBookNativePlugin } from "@elizaos/os/bridges/definitions/contacts";
import type { MessagesNativePlugin } from "@elizaos/os/bridges/definitions/messages";
import type { PhoneNativePlugin } from "@elizaos/os/bridges/definitions/phone";
import { mmsBinding, smsBindingHash } from "@elizaos/os/bridges/messages";
import { type Faked, plugin, rejection } from "./phone.ts";
import type { Route } from "./routes.ts";

/** A call in the phone's log. */
export interface LoggedCall { id: number; number: string; name: string | null; date: number; type: "incoming" | "outgoing" | "missed"; seconds?: number }
/** A voicemail the carrier delivered. */
export interface HeldVoicemail { id: number; number: string; date: number; heard: boolean; deleted: boolean; seconds?: number; name?: string; transcript?: string }
/** A text in the phone's SMS provider: received into the inbox, or sent from it. */
export interface Text { id: number; thread: number; address: string; box: "inbox" | "sent"; date: number; body: string; read: boolean; pictures?: number }
/** A contact in the address book. */
export interface Person { id: string; displayName: string; givenName: string; familyName: string; phoneNumbers: { number: string; type: string }[]; emailAddresses: { address: string; type: string }[]; notes?: string; starred?: boolean; revision: number }
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
  mobileService: boolean | undefined;
  callStateKnown: boolean;
  readonly emergencyNumbers: Set<string>;
  voicemails: HeldVoicemail[];
  /** True while this fake phone's voicemail deletion is still in Android's Undo window. */
  holdVoicemailDeletion: boolean;
  sms: "granted" | "denied";
  texts: Text[];
  /** Leaves the staged SMS deletion open so the owner can Undo. */
  holdMessageDeletion: boolean;
  smsNotice: { threadId: string; token: string } | undefined;
  /** Every text the radio was handed: the operation it was reviewed under, and to whom. */
  sent: { operationId: string; recipients: string[]; body: string }[];
  journal: Map<string, Record<string, unknown>>;
  contacts: boolean;
  /** Whether the phone lets Alpha write contacts, beside reading them. */
  editable: boolean;
  /** While this waits, Android has queued the contact deletion and still holds the contact. */
  holdContactDeletion: Promise<void> | undefined;
  /** The phone's own contact editor, each time it was opened: on a new contact, or on the contact named. */
  editors: string[];
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
  /** Android accepted this MMS and has not reported its carrier outcome. */
  holdMmsSubmission: boolean;
  readonly mmsAttempts: string[];
  readonly mmsQueries: string[];
  /** What the agent's reply drafter answers: one draft, or none; and every thread it was asked about. */
  replyDraft: string | null;
  readonly asked: unknown[];
}

async function versionOf(id: string, revision: number): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${id}:${revision}`));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
    mobileService: true,
    callStateKnown: true,
    emergencyNumbers: new Set(["911", "112"]),
    voicemails: [{ id: 11, number: "+14155550100", date: 1_700_000_100_000, heard: false, deleted: false }],
    holdVoicemailDeletion: false,
    sms: "granted",
    texts: [{ id: 1, thread: 1, address: "+14155550100", box: "inbox", date: 1_700_000_050_000, body: "See you at five", read: false }],
    holdMessageDeletion: false,
    holdContactDeletion: undefined,
    smsNotice: undefined,
    sent: [],
    journal: new Map(),
    contacts: true,
    editable: true,
    editors: [],
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
    holdMmsSubmission: false,
    mmsAttempts: [],
    mmsQueries: [],
    replyDraft: "Five works, see you there",
    asked: [],
  };
}

/** The resident agent's reply drafter, over `world`: it answers one draft for the open conversation, and sends nothing. */
export function telephonyRoutes(world: TelephonyScene): Route[] {
  return [
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/messages/reply-draft") return undefined;
      return request.json().then((thread: unknown) => {
        world.asked.push(thread);
        return Response.json({ draft: world.replyDraft });
      });
    },
  ];
}

/** `ElizaTelephony`: eliza's calls, call log, voicemail and SMS provider, over `world`. */
function telephony(world: TelephonyScene): Faked {
  return plugin<PhoneNativePlugin & MessagesNativePlugin & {
    classifyDialNumber(input: { number: string }): Promise<unknown>;
    ownerDialScreen(input: { number: string }): Promise<unknown>;
    smsNoticePending(): Promise<unknown>;
    acknowledgeSmsNotice(input: { token: string }): Promise<void>;
  }, Record<string, unknown>>((emit) => {
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
      return { id: `thread:${number}`, date: rows[0].date, messageCount: rows.length, snippet: rows[0].body, unread: rows.some((one) => !one.read), addresses: [rows[0].address] };
    };
    const message = (one: Text) => ({
      id: `sms:${one.id}`, kind: "sms", threadId: `thread:${one.thread}`, direction: one.box === "inbox" ? "incoming" : "outgoing",
      status: one.box === "inbox" ? (one.read ? "read" : "received") : "sent", date: one.date, read: one.read, subscriptionId: 1,
      addresses: [one.address], body: one.body, deliveryReport: one.box === "inbox" ? null : "pending", attachments: one.pictures ?? 0,
    });
    const voicemail = (id: string) => world.voicemails.find((one) => String(one.id) === id && !one.deleted);
    const dial = ({ number }: { number: string }) => {
      world.dialed.push(number);
      return Promise.resolve({ status: "handed-off", target: "dialer", handler: "com.android.dialer", message: "Your phone app is open with the number." });
    };
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
        return Promise.resolve({ calls: rows.map((one) => ({ id: String(one.id), number: one.number, cachedName: one.name, date: one.date, durationSeconds: one.seconds ?? 30, type: one.type, isNew: one.type === "missed" })) });
      },
      dial,
      classifyDialNumber: ({ number }) => Promise.resolve({ kind: world.emergencyNumbers.has(number) ? "emergency" : "ordinary" }),
      ownerDialScreen: (input) => world.callStateKnown && world.live.length > 0 && world.emergency !== false
        ? Promise.reject(rejection("Wait for the possible emergency call to end.", "unavailable"))
        : dial(input),
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
          id: String(one.id), number: one.number, cachedName: one.name ?? null, date: one.date, durationSeconds: one.seconds ?? 24, isNew: !one.heard, hasAudio: true, carrierTranscript: one.transcript ?? null,
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
        one.deleted = !world.holdVoicemailDeletion;
        const staged = { id: `staged-${world.staged.length + 1}`, kind: "voicemail", target: { id }, phase: world.holdVoicemailDeletion ? "queued" : "deleted", deadline: { expiresAt: 1_800_000_000_000 } };
        world.staged.push(staged);
        return Promise.resolve({ status: "queued", deletion: staged });
      },
      observeVoicemail: () => Promise.resolve(undefined),
      smsNoticePending: () => Promise.resolve(world.smsNotice ?? {}),
      acknowledgeSmsNotice: ({ token }) => {
        if (world.smsNotice?.token === token) world.smsNotice = undefined;
        return Promise.resolve();
      },
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
      latestIncomingSender: (options?: { includeAddress: true }) => {
        const newest = world.texts.filter((one) => one.box === "inbox").sort((x, y) => y.date - x.date)[0];
        if (newest === undefined) return Promise.resolve({ status: "empty" });
        return Promise.resolve(options?.includeAddress ? { status: "found", address: newest.address, threadId: `thread:${newest.thread}` } : { status: "found", numberEnding: newest.address.slice(-4) });
      },
      markThreadRead: ({ threadId, throughDate }) => {
        const unread = world.texts.filter((one) => `thread:${one.thread}` === threadId && one.box === "inbox" && !one.read && one.date <= throughDate);
        for (const one of unread) one.read = true;
        return Promise.resolve({ defaultSmsApp: true, updated: unread.length });
      },
      deleteMessage: (reference) => {
        const found = world.texts.find((one) => `sms:${one.id}` === reference.id);
        if (found === undefined) return Promise.resolve({ status: "not-found", message: { ...reference } });
        if (!world.holdMessageDeletion) world.texts = world.texts.filter((one) => one !== found);
        const staged = { id: `staged-${world.staged.length + 1}`, kind: "message", target: { ...reference }, phase: world.holdMessageDeletion ? "queued" : "deleted", deadline: { expiresAt: 1_800_000_000_000 } };
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
        world.texts.push({ id: Math.max(0, ...world.texts.map((one) => one.id)) + 1, thread, address: recipients[0], box: "sent", date: 1_700_000_400_000 + world.sent.length, body, read: true });
        const record = { kind: "sms-send", operationId, subscriptionId, bindingHash, status: "sent", parts: recipients.map((_number, recipientIndex) => ({ index: recipientIndex, recipientIndex, partIndex: 0, sent: "success", delivery: "unknown" })), createdAt: 1_700_000_400_000 };
        world.journal.set(operationId, record);
        world.changed();
        return record;
      },
      async sendMms({ operationId, recipients, body, attachments, subscriptionId }) {
        world.mmsAttempts.push(operationId);
        const kept = world.journal.get(operationId);
        if (kept !== undefined) return kept;
        if (world.hold !== undefined) await world.hold;
        const { hash: bindingHash } = await mmsBinding({
          recipients: recipients as never, body, subscriptionId,
          attachments: attachments.map((one) => ({ name: one.name, contentType: one.contentType, bytes: Uint8Array.from(atob(one.data), (byte) => byte.charCodeAt(0)) })),
        });
        world.sent.push({ operationId, recipients, body });
        const record = { kind: "mms-send", operationId, subscriptionId, bindingHash, status: world.holdMmsSubmission ? "submitted" : "sent", createdAt: 1_700_000_400_000 };
        world.journal.set(operationId, record);
        return record;
      },
      cancelSmsReview: () => Promise.resolve(undefined),
      smsSendHistory: () => Promise.resolve({ receipts: [...world.journal.values()] }),
      smsSendResult: ({ operationId }) => Promise.resolve(world.journal.get(operationId) ?? Promise.reject(rejection("No send with this operation", "not-found"))),
      mmsSendResult: ({ operationId }) => {
        world.mmsQueries.push(operationId);
        return Promise.resolve(world.journal.get(operationId) ?? Promise.reject(rejection("No send with this operation", "not-found")));
      },
    };
  });
}

/** `ElizaContacts`: the address book, over `world`. */
function contacts(world: TelephonyScene, now: () => number): Faked {
  return plugin<AddressBookNativePlugin>(() => {
    const status = () => ({ available: true, readable: world.contacts, writable: world.contacts && world.editable });
    const find = (id: string) => world.people.find((one) => one.id === id);
    return {
      status: () => Promise.resolve(status()),
      requestPermissions: () => {
        world.contacts = true;
        return Promise.resolve(status());
      },
      list: ({ query, limit, cursor }) => {
        const q = query.toLowerCase();
        const digits = query.replace(/[^\d+]/g, "");
        const found = world.people.filter((one) => one.displayName.toLowerCase().includes(q) || (digits !== "" && one.phoneNumbers.some((phone) => phone.number.replace(/[^\d+]/g, "").includes(digits)))).sort((x, y) => Number(x.id) - Number(y.id));
        const offset = cursor === undefined ? 0 : Number(cursor.split(".", 3)[1]);
        const page = found.slice(offset, offset + limit);
        const after = offset + page.length;
        const last = page.at(-1);
        const more = after < found.length;
        return Promise.resolve({
          contacts: page.map((one) => ({ id: one.id, lookup: `lookup-${one.id}`, name: one.displayName, revision: String(one.revision), starred: one.starred ?? false, phones: one.phoneNumbers.map(({ number }) => number), emails: one.emailAddresses.map(({ address }) => address) })),
          more,
          ...(more && last !== undefined ? { next: `v1.${after}.${last.id}.${encodeURIComponent(query)}` } : {}),
        });
      },
      create: () => {
        world.editors.push("new");
        return Promise.resolve({ status: "returned" });
      },
      edit: ({ id }: { id: string }) => {
        world.editors.push(id);
        return Promise.resolve({ status: "returned" });
      },
      get: async ({ id }) => {
        const one = find(id);
        if (one === undefined) throw new Error("Contact not found");
        return {
          id: one.id, lookup: `lookup-${one.id}`, displayName: one.displayName, givenName: one.givenName, familyName: one.familyName,
          ...(one.notes === undefined ? {} : { notes: one.notes }), starred: one.starred ?? false, phoneNumbers: one.phoneNumbers, emailAddresses: one.emailAddresses, version: await versionOf(one.id, one.revision),
        };
      },
      save: async ({ id, version, ...draft }) => {
        const fill = (one: Person) => {
          Object.assign(one, { displayName: draft.displayName, givenName: draft.givenName ?? one.givenName, familyName: draft.familyName ?? one.familyName, phoneNumbers: draft.phoneNumbers, emailAddresses: draft.emailAddresses });
          if (draft.notes !== undefined) one.notes = draft.notes;
        };
        if (id === undefined) {
          const made: Person = { id: String(Math.max(...world.people.map((one) => Number(one.id))) + 1), displayName: "", givenName: "", familyName: "", phoneNumbers: [], emailAddresses: [], revision: 1 };
          fill(made);
          world.people.push(made);
          return { status: "saved", id: made.id, version: await versionOf(made.id, made.revision) };
        }
        const one = find(id);
        if (one === undefined) return { status: "not-found" };
        const revision = one.revision;
        if (await versionOf(id, revision) !== version || find(id) !== one || one.revision !== revision) return { status: "stale" };
        fill(one);
        one.revision += 1;
        return { status: "saved", id: one.id, version: await versionOf(one.id, one.revision) };
      },
      remove: async ({ id, version }) => {
        const one = find(id);
        if (one === undefined) return { status: "not-found" };
        const revision = one.revision;
        if (await versionOf(id, revision) !== version || find(id) !== one || one.revision !== revision) return { status: "stale" };
        const staged = { id: `staged-${world.staged.length + 1}`, kind: "contact", target: { id, version }, phase: "queued", deadline: { expiresAt: now() + 200 } };
        world.staged.push(staged);
        const settle = () => {
          if (staged.phase !== "queued") return;
          if (find(id) !== one || one.revision !== revision) {
            staged.phase = "conflict";
            return;
          }
          world.people = world.people.filter((person) => person !== one);
          staged.phase = "deleted";
        };
        if (world.holdContactDeletion === undefined) settle();
        else void world.holdContactDeletion.then(settle);
        return { status: "queued", deletion: staged };
      },
      resolveNames: ({ numbers }) => Promise.resolve({ names: numbers.map((number) => ({ number, name: world.people.find((one) => one.phoneNumbers.some((phone) => phone.number === number))?.displayName ?? null, photo: null })) }),
    };
  });
}

/** `ElizaActionJournal`: only its deletion window is read here. */
function journal(world: TelephonyScene): Faked {
  return plugin<ActionJournalPlugin & { telephonyDeletionReceipt(key: { kind: string; id: string }): Promise<unknown> }>(() => {
    const unused = () => Promise.reject(rejection("Not a deletion call", "unavailable"));
    return {
      reserve: unused, markApplying: unused, finish: unused, get: unused, list: unused, dismiss: unused,
      pending: () => Promise.resolve({
        pending: world.staged.filter((row) => ["queued", "paused", "unknown", "dispatching"].includes(row.phase)).map((row) => ({ ...row, window: "open" })),
      }),
      telephonyDeletionReceipt: ({ kind, id }) => {
        const row = world.staged.find((one) => one.kind === kind && one.id === id);
        const phase = row?.phase === "dispatching" ? "unknown" : row?.phase;
        return Promise.resolve(phase !== undefined && ["deleted", "undone", "conflict", "unknown"].includes(phase) ? { kind, id, phase } : {});
      },
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
    const reading = () => {
      const inCall = world.callStateKnown ? world.live.length > 0 : null;
      return {
        inCall, emergency: inCall === true ? world.emergency : inCall === false ? false : null,
        emergencyLive: inCall === true && world.emergency !== false, watching: true, carrier: world.mobileService,
      };
    };
    const told = world.report;
    world.report = () => {
      told();
      emit("callState", reading());
    };
    return { callState: () => Promise.resolve(reading()) };
  };
}

/** The telephony plugins an Alpha image's host registers. */
export function telephonyPlugins(world: TelephonyScene, now: () => number): Record<string, Faked> {
  return {
    ElizaTelephony: telephony(world),
    ElizaContacts: contacts(world, now),
    ElizaActionJournal: journal(world),
    AlphaOngoingCall: ongoing(world),
    AlphaCallState: callState(world),
  };
}

/**
 * The image the dev server shows with `ALPHA_FAKES=phone`: the people, calls, voicemail and conversations of develop's
 * fixtures, dated from `now`, so Phone, Messages and Contacts can be laid beside develop's. Journeys use `telephonyScene`.
 */
export function developTelephony(now: number): TelephonyScene {
  const minute = 60_000;
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const today = (minutes: number) => midnight.getTime() + minutes * minute;
  const ago = (minutes: number) => now - minutes * minute;
  const person = (id: number, givenName: string, familyName: string, number: string, email: string, notes: string, starred = false): Person => ({
    id: String(id), displayName: `${givenName} ${familyName}`.trim(), givenName, familyName, phoneNumbers: [{ number, type: "mobile" }],
    emailAddresses: email === "" ? [] : [{ address: email, type: "home" }], notes, starred, revision: 1,
  });
  const people = [
    person(1, "Ana", "Torres", "+14155550171", "ana@torres.example", "Climbing partner"),
    person(2, "Ben", "Adler", "+14155550163", "ben@adler.example", "Accountant"),
    person(3, "Dad", "", "+15035550110", "", "", true),
    person(4, "Jordan", "Park", "+12125550187", "jordan@northpoint.example", "Partner, Northpoint", true),
    person(5, "Kenji", "Sato", "+12065550148", "kenji@sato.example", ""),
    person(6, "Lena", "Ruiz", "+17185550121", "lena@ruiz.example", ""),
    person(7, "Maya", "Chen", "+14155550132", "maya@lumen.example", "Design lead at Lumen", true),
    person(8, "Olivia", "Brooks", "+14155550126", "olivia@brooks.example", "Landlord"),
    person(9, "Priya", "Nair", "+16505550144", "priya@nair.example", "", true),
    person(10, "Sam", "Okafor", "+15105550199", "sam@okafor.example", ""),
  ];
  const number = (name: string) => people.find((one) => one.displayName === name)!.phoneNumbers[0].number;
  const call = (id: number, name: string | null, at: number, type: LoggedCall["type"], seconds: number, raw = ""): LoggedCall =>
    ({ id, number: name === null ? raw : number(name), name, date: ago(at), type, seconds });
  let text = 0;
  const thread = (id: number, name: string, unread: number, rows: ReadonlyArray<readonly [boolean, string | number, number]>): Text[] =>
    rows.map(([mine, body, at], index) => ({
      id: ++text, thread: id, address: number(name), box: mine ? "sent" : "inbox", date: today(at) + index,
      body: typeof body === "string" ? body : "", read: mine || index < rows.length - unread, ...(typeof body === "number" ? { pictures: 1 } : {}),
    }));
  return {
    ...telephonyScene(),
    people,
    calls: [
      call(1, "Maya Chen", 12, "missed", 0),
      call(2, null, 52, "incoming", 24, "+16285550199"),
      call(3, "Jordan Park", 190, "outgoing", 740),
      call(4, "Dad", 1300, "incoming", 1260),
      call(5, "Priya Nair", 1570, "outgoing", 95),
      call(6, "Sam Okafor", 3000, "missed", 0),
      call(7, "Lena Ruiz", 4500, "incoming", 300),
    ],
    voicemails: [
      { id: 11, number: number("Maya Chen"), date: ago(11), heard: false, deleted: false, seconds: 18, transcript: "Hey, it's Maya. Quick one: can we push the review to 3:30? I want to get the prototype on the device first. Call me back." },
      { id: 12, number: number("Dad"), date: ago(1320), heard: true, deleted: false, seconds: 34, transcript: "Hi kiddo, just checking in. Mom wants to know if you're coming up for the weekend. No rush, call when you can." },
      { id: 13, number: "+12125550100", name: "Dr. Patel's office", date: ago(2900), heard: true, deleted: false, seconds: 22, transcript: "This is Dr. Patel's office confirming your appointment Thursday at 10 AM. Please call back to confirm." },
    ],
    texts: [
      ...thread(1, "Maya Chen", 1, [[false, "Pushed the new flows to Figma", -330], [true, "Looks great. Review tomorrow?", -322], [false, "Yes! Put it on the calendar", -321], [true, "Design review is at 3", 750], [false, "Still on for 3? I can bring the prototype.", 844]]),
      ...thread(2, "Priya Nair", 3, [[true, "Saturday was so fun", -600], [false, "Right?? Lunch Tuesday?", -590], [true, "Yes. Tartine at 1", -588], [false, "Sent you the photos from Saturday", 700], [false, 0, 700], [false, 1, 700]]),
      ...thread(3, "Jordan Park", 0, [[false, "Can we do 4:30 instead of 4?", 615], [true, "Works.", 618]]),
      ...thread(4, "Sam Okafor", 0, [[false, "Running 10 min late to standup", 562], [true, "No worries", 563]]),
      ...thread(5, "Dad", 0, [[false, "Did you see the game last night?", -700], [true, "Missed it! Call you Sunday", -650], [false, "Ok. Love you", -640]]),
    ],
  };
}
