// @vitest-environment happy-dom
import { NOT_DISPATCHED } from "@elizaos/agent";
import { type Context, Effect, type ManagedRuntime, Stream } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Composer } from "../gen/app__messages__composer.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Machine as Toasts } from "../gen/app__notices__toasts.effect.vibe";
import { Machine as Voice } from "../gen/app__voice.effect.vibe";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Page } from "../gen/app__browser__address.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { executeMedia } from "../src/assistant/media-executors.ts";
import { readAgentSms } from "../src/messages/agent-send.vibe";
import { idOf, Pages } from "../src/browser/browser.vibe";
import browser from "../src/browser/index.tsx";
import home from "../src/home/index.tsx";
import messages from "../src/messages/index.tsx";
import { closeAll, drawn, hardware, only, open, press, underAct } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** An Alpha image whose host registers eliza's telephony and contacts plugins and Alpha's call plugins. */
const image = () => ({ ...scene(), phone: true, image: true });
const mounts = only("home", "assistant", "notice", "view:Messages", "view:Browser");
const openImage = (world: ReturnType<typeof image>) => open(world, mounts);

/** Poll real machine readiness without leaving React inside act after a failure. */
async function ready<I, S>(runtime: ManagedRuntime.ManagedRuntime<I, unknown>, key: Context.Key<I, { readonly changes: Stream.Stream<S> }>, label: string, accepted: (state: S) => boolean) {
  await vi.waitFor(async () => {
    const current = await runtime.runPromise(Effect.flatMap(key, (machine) => Stream.runHead(machine.changes)));
    if (current._tag === "None" || !accepted(current.value)) throw new Error(`${label}: ${JSON.stringify(current)}`);
  }, { timeout: 12_000, interval: 50 });
  await drawn(() => undefined);
}

async function openMessages(alpha: Awaited<ReturnType<typeof openImage>>["alpha"]) {
  await ready(alpha.runtime, Shell, "Alpha image admitted", (state) => state.image);
  await ready(home.runtime(alpha), Home, "Home tiles read", (state) => state.tiles.load.status === "Loaded");
  const tile = await vi.waitFor(() => {
    const found = document.querySelector<HTMLButtonElement>('[data-home-tile="view:Messages"]');
    if (!found) throw new Error("Messages tile was not drawn");
    return found;
  });
  await drawn(() => tile.click());
}

async function openUnreadCard() {
  const card = await vi.waitFor(() => {
    const found = [...document.querySelectorAll<HTMLButtonElement>("section[aria-label='Your day'] > button")].find((button) => button.textContent?.startsWith("Messages"));
    if (!found) throw new Error("Messages unread card was not drawn");
    return found;
  });
  await drawn(() => card.click());
}

/** Press `name` in the open confirmation. */
const confirm = (name: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=alertdialog] button")].find((one) => one.textContent === name);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no ${name} in the confirmation`);
  found.click();
});

/** Type into the text box named `name`, as a person does. */
const write = (name: string, text: string) => act(async () => {
  const found = [...document.querySelectorAll("textarea, input")].find((one) => one.getAttribute("aria-label") === name);
  if (!(found instanceof HTMLTextAreaElement || found instanceof HTMLInputElement)) throw new Error(`no field ${name}`);
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(found) as object, "value")?.set?.call(found, text);
  found.dispatchEvent(new Event("input", { bubbles: true }));
});

/** Open the message action menu from the keyboard. */
const bubble = (text: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=log] [data-alpha-message-id]")].find((one) => one.textContent?.includes(text));
  if (!(found instanceof HTMLElement)) throw new Error(`no message ${text}`);
  found.focus();
  found.dispatchEvent(new KeyboardEvent("keydown", { key: "ContextMenu", bubbles: true }));
});

/** Choose an action from the open conversation's composer menu. */
async function composeAction(name: string) {
  await drawn(() => {
    const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Message actions"]');
    if (!trigger) throw new Error("Message actions are unavailable");
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await drawn(() => {
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((one) => one.textContent === name);
    if (!item) throw new Error(`Message action ${name} was not shown`);
    item.click();
  });
}

describe("Messages on an Alpha image", () => {
  it("Requires a new choice when a SIM is replaced and keeps that choice when rows reorder (spec/app/messages/composer.md, \"Story: Send a message\")", async () => {
    const world = image();
    const first = world.telephony.subscriptions[0]!;
    const second = { id: 2, slot: 1, displayName: "Travel", carrierName: "Travel", defaultSms: false, defaultVoice: false };
    world.telephony.subscriptions = [first, second];
    const { alpha } = await openImage(world);
    await openMessages(alpha);
    await ready(alpha.runtime, Messages, "Messages read", (state) => state.list.status === "Loaded" && state.threads === 1);
    await press("Maya Chen");
    await ready(alpha.runtime, Composer, "Two SIMs loaded", (state) => state.thread > 0 && state.sims === 2 && state.simInfo.grant === "Granted");
    await write("Message", "Use the reviewed line");
    await press("SIM 2");

    const replacement = { ...second, id: 9 };
    world.telephony.subscriptions = [replacement, first];
    await press("Send");
    await ready(alpha.runtime, Composer, "Old SIM refused", (state) => state.outgoing.denied && state.slot.author === "OwnerWrote");
    expect(world.telephony.sent).toEqual([]);

    await press("SIM 2");
    world.telephony.subscriptions = [first, replacement];
    await press("Send");
    await ready(alpha.runtime, Composer, "Replacement SIM sent", (state) => state.outgoing.op.outcome === "Confirmed");
    expect(world.telephony.sent).toHaveLength(1);
    expect(world.telephony.journal.get(world.telephony.sent[0]!.operationId)).toMatchObject({ subscriptionId: 9, status: "sent" });
  });

  it("See my conversations, read one, and send a message once (spec/app/messages/index.md, \"Story: See my conversations\"; spec/app/messages/composer.md, \"Story: Let Alpha suggest a draft\"; spec/app/messages/index.md, \"Story: Read a conversation\"; spec/app/messages/composer.md, \"Story: Send a message\"; spec/app/messages/sending.md, \"Story: Send a message once\"; spec/app/messages/sending.md, \"Story: Know whether it arrived\")", async () => {
    const world = image();
    world.telephony.live = [];
    const { alpha } = await openImage(world);
    // spec/app/messages/index.md, "Messages reads the conversation list each time it comes to the front"
    await openMessages(alpha);
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.list.status === "Loaded" && s.threads === 1);

    // spec/app/messages/index.md, "Only the newest read of the open conversation is shown, and it marks the shown messages read only where Alpha is the phone's SMS app"
    await press("Maya Chen");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.pane === "Conversation" && s.page.status === "Loaded" && s.shown.rows === 1);
    await ready(alpha.runtime, Messages, "Messages state", () => world.telephony.texts[0]!.read);

    // spec/app/messages/composer.md, "Typing changes the draft and makes it the owner's; emptying it leaves no draft"
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.thread > 0 && s.recipients === 1);

    // spec/app/messages/composer.md, "Alpha's suggestion is asked for only when the draft is empty, and lands only if it still is"; spec/app/messages/composer.md, "Undo takes Alpha's draft away"
    await composeAction("Let Alpha suggest a reply");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.slot.author === "AlphaWrote" && s.suggestion.status === "Loaded");
    expect([world.telephony.asked, (document.querySelector("textarea[aria-label=Message]") as HTMLTextAreaElement).value, world.telephony.sent]).toEqual([
      [{ participant: "+14155550100", messages: [{ direction: "in", date: 1_700_000_050_000, body: "See you at five" }], truncated: false }], "Five works, see you there", [],
    ]);
    expect(document.querySelector("[role=group][aria-label='Message draft to Maya Chen · +14155550100']")).not.toBeNull();
    await press("Don't send");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.slot.author === "Nobody");
    await write("Message", "On my way");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.slot.author === "OwnerWrote");
    expect(world.telephony.sent).toEqual([]);

    // spec/app/phone/comms.md, "Story: Address the person or Alpha from one bar"
    expect(document.querySelectorAll("[data-alpha-composer]")).toHaveLength(1);
    await press("Open Alpha");
    await ready(alpha.runtime, Shell, "Ask Alpha sheet", (s) => s.assistant === "Sheet");
    await vi.waitFor(async () => {
      await drawn(() => undefined);
      expect([...document.querySelectorAll("[data-alpha-composer]")].map((field) => field.getAttribute("aria-label"))).toEqual(["Ask Alpha"]);
    }, { timeout: 12_000 });
    await write("Ask Alpha", "What did I miss?");
    await press("Back to texting Maya Chen");
    await ready(alpha.runtime, Shell, "Alpha image admitted", (s) => s.assistant === "Bar");
    expect([document.querySelectorAll("[data-alpha-composer]").length, document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value, world.telephony.sent])
      .toEqual([1, "On my way", []]);

    // spec/app/voice/index.md, "Using the transcript fills the field dictation started in, and dictation never sends"
    const openedChats = world.ask.opened;
    const messageView = messages.runtime(alpha);
    await press("Dictate a text to Maya");
    await ready(messageView, Voice, "Messages recording", (state) => state.recorder.field === "MessagesBar" && state.recorder.stage === "Recording");
    await press("Stop recording");
    await ready(messageView, Voice, "Messages transcript returned", (state) => state.recorder.stage === "Closed");
    const dictated = "On my way Dictated note";
    await vi.waitFor(async () => {
      await drawn(() => undefined);
      expect(document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value).toBe(dictated);
    }, { timeout: 12_000 });
    expect([document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value, world.telephony.sent, world.ask.opened, world.ask.said, world.voice.startLiveCaptureCalls])
      .toEqual([dictated, [], openedChats, [], 0]);

    // spec/app/messages/composer.md, "Only the owner's Send sends: a draft or a picture, with send access, a SIM where there is a choice, and never during a call that may be an emergency call"
    await press("Send");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.outgoing.op.outcome === "Confirmed" && s.slot.author === "Nobody");
    expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550100"], body: dictated }]);
    expect([...document.querySelectorAll("[role=status]")].map((one) => one.textContent)).toContain("Sent to Maya Chen");

    // spec/app/messages/sending.md, "A delivery report counts only for a part reported sent"; spec/app/messages/sending.md, "A finished record is retired by a tombstone"
    world.telephony.deliver(world.telephony.sent[0]!.operationId);
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.outgoing.reported === 1 && s.outgoing.retired === s.outgoing.op.id);

    // spec/app/messages/index.md, "Confirming removes the message under a new number, never during a call that may be an emergency call"
    world.telephony.holdMessageDeletion = true;
    await bubble("See you at five");
    await press("Delete");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.confirming);
    await confirm("Delete");
    await ready(alpha.runtime, Toasts, "Undo toast", (state) => state.showing && state.current.undo);
    await press("Undo");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.removal.outcome === "Refused" && s.page.status === "Loaded");
    expect(world.telephony.texts.map((one) => one.body)).toEqual(["See you at five", dictated]);

    world.telephony.holdMessageDeletion = false;
    await bubble("See you at five");
    await press("Delete");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.confirming);
    await confirm("Delete");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.removal.outcome === "Confirmed");
    expect(world.telephony.texts.map((one) => one.body)).toEqual([dictated]);

    // spec/app/messages/index.md, "Back returns from a conversation or the picker to the list, and reads it again"
    const read = (await alpha.runtime.runPromise(Messages.use((machine) => machine.get()))).list.ticket;
    await hardware("back");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.pane === "Threads" && s.list.ticket > read && s.list.status === "Loaded");
  });

  it("See my conversations from Home's unread card (spec/app/messages/index.md, \"Story: See my conversations\")", async () => {
    const world = image();
    world.telephony.texts.push({ id: 2, thread: 2, address: "+14155550122", box: "inbox", date: 1_700_000_060_000, body: "Lunch?", read: false });
    const { alpha } = await openImage(world);
    await ready(alpha.runtime, Shell, "Alpha image admitted", (s) => s.image);

    // spec/app/messages/index.md, "The phone reports how many conversations are unread, for the list and Home"; spec/app/messages/index.md, "One tap on Home's unread card opens the conversation when exactly one is unread, and the list filtered to the unread ones when several are"
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.unread === 2);
    await openUnreadCard();
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.front && s.pane === "Threads" && s.chip === "UnreadThreads" && s.list.status === "Loaded" && s.threads === 2);

    // spec/app/messages/index.md, "Only the newest read of the open conversation is shown, and it marks the shown messages read only where Alpha is the phone's SMS app"
    await press("Ben Ortiz");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.pane === "Conversation" && s.page.status === "Loaded");
    await ready(alpha.runtime, Messages, "Messages state", () => world.telephony.texts[1]!.read);
    await hardware("home");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.unread === 1);
    await openUnreadCard();
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.front && s.pane === "Conversation" && s.page.status === "Loaded" && s.shown.rows === 1);
    await ready(alpha.runtime, Messages, "Messages state", () => world.telephony.texts[0]!.read);
  });

  it("Start a new message to a number I type (spec/app/messages/index.md, \"Story: Start a new message\")", async () => {
    const world = image();
    const { alpha } = await openImage(world);
    await openMessages(alpha);
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.list.status === "Loaded");

    // spec/app/messages/index.md, "New message opens the picker, which reads the contacts that have a number"
    await press("New message");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.pane === "Picker" && s.picker.status === "Loaded" && s.choices === 2);

    // spec/app/messages/index.md, "Choosing a contact's number, or typing one, opens that conversation"
    await press("Ben Ortiz");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.pane === "Conversation" && s.page.status === "Loaded");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.thread > 0);

    await press("Back");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.pane === "Threads" && s.list.status === "Loaded");
    await press("New message");
    await ready(alpha.runtime, Messages, "Messages state", (s) => s.pane === "Picker" && s.picker.status === "Loaded");
    await write("To", "+14155550100, +14155550122");
    await press("Text 2 recipients");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.thread > 0 && s.recipients === 2 && s.sending.grant === "Granted");
    await write("Message", "Meet at five");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.slot.author === "OwnerWrote");
    await press("Send");
    await ready(alpha.runtime, Composer, "Composer state", (s) => s.outgoing.op.outcome === "Confirmed");
    expect(world.telephony.sent.map(({ operationId, recipients, body }) => ({ kind: world.telephony.journal.get(operationId)?.kind, recipients, body }))).toEqual([
      { kind: "mms-send", recipients: ["+14155550100", "+14155550122"], body: "Meet at five" },
    ]);
  });

  it("Checks the original picture message after a restart (spec/app/messages/composer.md, \"The owner attaches up to five pictures, and removes them one by one\"; spec/app/messages/composer.md, \"A restart closes the conversation and keeps the saved drafts, the send, access and the SIMs the phone has\"; spec/app/messages/sending.md, \"The journal read back settles an unknown outcome: sent, or never sent\")", async () => {
    const world = image();
    world.telephony.holdMmsSubmission = true;
    const first = await openImage(world);
    await openMessages(first.alpha);
    await ready(first.alpha.runtime, Messages, "conversation list", (state) => state.list.status === "Loaded" && state.threads === 1);
    await press("Maya Chen");
    await ready(first.alpha.runtime, Composer, "picture composer", (state) => state.thread > 0 && state.sending.grant === "Granted");
    await composeAction("Add media");
    await drawn(() => {
      const picker = document.querySelector<HTMLInputElement>('input[type="file"][aria-label="Attach a picture"]');
      if (!picker || picker.disabled) throw new Error("No usable picture picker");
      Object.defineProperty(picker, "files", { value: [new File([Uint8Array.from(atob("R0lGODlhAQABAAAAACwAAAAAAQABAAA="), (byte) => byte.charCodeAt(0))], "photo.gif", { type: "image/gif" })] });
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await ready(first.alpha.runtime, Composer, "picture attached", (state) => state.pictures === 1);
    await press("Send");
    await ready(first.alpha.runtime, Composer, "picture send awaiting receipt", (state) => state.outgoing.op.outcome === "Unknown");
    const operation = world.telephony.mmsAttempts[0];
    const receipt = operation && world.telephony.journal.get(operation);
    if (!operation || !receipt) throw new Error("Android did not journal the picture message");
    expect([receipt.status, world.telephony.mmsAttempts]).toEqual(["submitted", [operation]]);
    await first.close();

    world.telephony.journal.set(operation, { ...receipt, status: "sent" });
    const restarted = await openImage(world);
    await ready(restarted.alpha.runtime, Shell, "Messages returns after restart", (state) => state.trail.at(-1) === "Messages");
    await ready(restarted.alpha.runtime, Messages, "conversation list after restart", (state) => state.list.status === "Loaded" && state.threads === 1);
    await press("Maya Chen");
    await ready(restarted.alpha.runtime, Composer, "picture check without saved bytes", (state) => state.thread === state.outgoing.thread && state.pictures === 0 && state.outgoing.op.outcome === "Unknown");
    const priorReads = world.telephony.mmsQueries.length;
    await press("Check send status");
    await ready(restarted.alpha.runtime, Composer, "original picture send confirmed", (state) => state.outgoing.op.outcome === "Confirmed");
    expect([world.telephony.mmsAttempts, world.telephony.mmsQueries.slice(priorReads), world.telephony.sent.map((send) => send.operationId)])
      .toEqual([[operation], [operation], [operation]]);
  });

  it("Shares only the reviewed open conversation (spec/app/contacts/agent.md, \"The agent reads only the conversation, voicemail or contact open on screen, as the phone last read it\")", async () => {
    const world = image();
    world.telephony.texts.push({ id: 2, thread: 2, address: "+14155550122", box: "inbox", date: 1_700_000_060_000, body: "A different conversation", read: false });
    const { alpha } = await openImage(world);
    await openMessages(alpha);
    await ready(alpha.runtime, Messages, "two conversations available", (state) => state.list.status === "Loaded" && state.threads === 2);
    await press("Maya Chen");
    await ready(alpha.runtime, Messages, "Maya conversation loaded", (state) => state.pane === "Conversation" && state.page.status === "Loaded");
    const original = await alpha.runtime.runPromise(Messages.use((machine) => machine.get()));
    const read = (approved = true) => executeMedia(alpha,
      { type: "messages_read_selected" }, { proposalId: "review-sms", operationId: "review-sms", attemptId: 1 },
      { target: { thread: original.thread, ticket: original.page.ticket }, current: () => Promise.resolve(approved) });
    const refusal = { kind: "refused", code: NOT_DISPATCHED };
    expect(await read(false)).toEqual(refusal);
    expect(await read()).toEqual({ kind: "applied", result: { kind: "messages-read", status: "read", participant: "Maya Chen", messages: [{ direction: "in", date: 1_700_000_050_000, body: "See you at five" }], truncated: false } });

    world.telephony.sms = "denied";
    expect(await read()).toEqual(refusal);
    world.telephony.sms = "granted";
    await press("Back");
    await ready(alpha.runtime, Messages, "conversation list restored", (state) => state.pane === "Threads" && state.list.status === "Loaded");
    await press("Ben Ortiz");
    await ready(alpha.runtime, Messages, "another conversation selected", (state) => state.pane === "Conversation" && state.thread !== original.thread && state.page.status === "Loaded");
    expect([await read(), world.telephony.sent]).toEqual([refusal, []]);
  });

  it("Confirms reviewed agent SMS with the exact native operation (spec/app/contacts/agent.md, \"Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call\")", async () => {
    const world = image();
    const { alpha } = await openImage(world);
    await ready(alpha.runtime, Shell, "Alpha image admitted", (state) => state.image);
    await ready(alpha.runtime, Phone, "Known call state", (state) => state.telecom === "NoCall");
    const sms = { type: "sms_send", recipients: ["+14155550100"], body: "Meet at the front door", subscriptionId: 1 } as const;
    const call = { proposalId: "reviewed-sms", operationId: "reviewed-sms", attemptId: 1 };
    const approved = { current: () => Promise.resolve(true) };
    let checks = 0;
    await expect(executeMedia(alpha, sms, call, { current: () => Promise.resolve(++checks === 1) })).resolves.toMatchObject({ kind: "refused" });
    await expect(executeMedia(alpha, { ...sms, subscriptionId: 9 }, call, approved)).resolves.toMatchObject({ kind: "refused" });
    expect(world.telephony.sent).toEqual([]);

    await expect(executeMedia(alpha, sms, call, approved)).resolves.toMatchObject({
      kind: "applied", result: { kind: "sms-send", operationId: call.operationId, subscriptionId: 1 },
    });
    await expect(alpha.runtime.runPromise(readAgentSms({ ...sms, body: "Different text" }, call))).resolves.toBeUndefined();
    await expect(alpha.runtime.runPromise(readAgentSms(sms, call))).resolves.toMatchObject({ kind: "found", result: { operationId: call.operationId } });
    expect(world.telephony.sent.map(({ operationId, recipients, body }) => ({ operationId, recipients, body }))).toEqual([
      { operationId: call.operationId, recipients: [...sms.recipients], body: sms.body },
    ]);
  });

  it("Opens the exact notified conversation and follows an owner's safe link tap (spec/app/messages/index.md, \"A message notification opens its exact conversation once access is available\"; spec/app/messages/index.md, \"Story: Read a conversation\")", async () => {
    const world = image();
    world.telephony.texts.push({ id: 2, thread: 23, address: "+14155550122", box: "inbox", date: 1_700_000_060_000, body: "Lunch? http://news.example/lunch or https://example-user@private.example/lunch", read: false });
    world.telephony.smsNotice = { threadId: "thread:23", token: "1" };
    const { alpha } = await openImage(world);
    await ready(alpha.runtime, Messages, "Messages state", (state) => state.pane === "Conversation" && state.page.status === "Loaded" && world.telephony.smsNotice === undefined && world.telephony.texts[1]?.read === true);
    expect([world.telephony.texts.map((text) => text.read), world.telephony.sent]).toEqual([[false, true], []]);

    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-alpha-message-body] a")];
    expect([links.map((one) => one.href), world.browser.tabs.size]).toEqual([["http://news.example/lunch"], 0]);
    await act(async () => links[0]?.click());
    await ready(alpha.runtime, Shell, "Alpha image admitted", (state) => state.trail.at(-1) === "Browser");
    const runtime = browser.runtime(alpha);
    const linkTab = await vi.waitFor(() => {
      const committed = [...world.browser.tabs.values()].filter((one) => one.committed && !one.private && one.history.at(-1) === "http://news.example/lunch");
      if (committed.length !== 1 || !committed[0]) throw new Error(`Browser host did not commit the tapped URL: ${JSON.stringify(world.browser.calls)}`);
      return committed[0];
    }, { timeout: 12_000 });
    await ready(runtime, Tabs, "selected Browser link tab", (state) => idOf(state.selected) === linkTab.id);
    const tab = runtime.runSync(Effect.map(Tabs.use((machine) => machine.get()), (state) => state.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    await ready(page, Page, "Browser link page", (state) => state.phase === "Shown" && !state.secure);
  });
});
