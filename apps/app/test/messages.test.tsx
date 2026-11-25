// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Composer } from "../gen/app__messages__composer.effect.vibe";
import { Machine as Toasts } from "../gen/app__notices__toasts.effect.vibe";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Page } from "../gen/app__browser__address.effect.vibe";
import { Pages } from "../src/browser/browser.vibe";
import browser from "../src/browser/index.tsx";
import { closeAll, hardware, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** An Alpha image whose host registers eliza's telephony and contacts plugins and Alpha's call plugins. */
const image = () => ({ ...scene(), phone: true, image: true });

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

describe("Messages on an Alpha image", () => {
  it("See my conversations, read one, and send a message once (spec/app/messages/index.md, \"Story: See my conversations\"; spec/app/messages/composer.md, \"Story: Let Alpha suggest a draft\"; spec/app/messages/index.md, \"Story: Read a conversation\"; spec/app/messages/composer.md, \"Story: Send a message\"; spec/app/messages/sending.md, \"Story: Send a message once\"; spec/app/messages/sending.md, \"Story: Know whether it arrived\")", async () => {
    const world = image();
    world.telephony.live = [];
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/messages/index.md, "Messages reads the conversation list each time it comes to the front"
    await press("Messages");
    await until(alpha, alpha.runtime, Messages, (s) => s.list.status === "Loaded" && s.threads === 1);

    // spec/app/messages/index.md, "Only the newest read of the open conversation is shown, and it marks the shown messages read only where Alpha is the phone's SMS app"
    await press("Maya Chen");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Conversation" && s.page.status === "Loaded" && s.shown.rows === 1);
    await until(alpha, alpha.runtime, Messages, () => world.telephony.texts[0]!.read);

    // spec/app/messages/composer.md, "Typing changes the draft and makes it the owner's; emptying it leaves no draft"
    await until(alpha, alpha.runtime, Composer, (s) => s.thread > 0 && s.recipients === 1);

    // spec/app/messages/composer.md, "Alpha's suggestion is asked for only when the draft is empty, and lands only if it still is"; spec/app/messages/composer.md, "Undo takes Alpha's draft away"
    await press("Let Alpha suggest a reply");
    await until(alpha, alpha.runtime, Composer, (s) => s.slot.author === "AlphaWrote" && s.suggestion.status === "Loaded");
    expect([world.telephony.asked, (document.querySelector("textarea[aria-label=Message]") as HTMLTextAreaElement).value, world.telephony.sent]).toEqual([
      [{ participant: "+14155550100", messages: [{ direction: "in", date: 1_700_000_050_000, body: "See you at five" }], truncated: false }], "Five works, see you there", [],
    ]);
    expect(document.querySelector("[role=group][aria-label='Message draft to Maya Chen · +14155550100']")).not.toBeNull();
    await press("Don't send");
    await until(alpha, alpha.runtime, Composer, (s) => s.slot.author === "Nobody");
    await write("Message", "On my way");
    await until(alpha, alpha.runtime, Composer, (s) => s.slot.author === "OwnerWrote");
    expect(world.telephony.sent).toEqual([]);

    // spec/app/phone/comms.md, "Story: Address the person or Alpha from one bar"
    expect(document.querySelectorAll("[data-alpha-composer]")).toHaveLength(1);
    await press("Open Alpha");
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
    expect(document.querySelectorAll("[data-alpha-composer]")).toHaveLength(1);
    await write("Ask Alpha", "What did I miss?");
    await press("Back to texting Maya Chen");
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Bar");
    expect([document.querySelectorAll("[data-alpha-composer]").length, document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value, world.telephony.sent])
      .toEqual([1, "On my way", []]);

    // spec/app/messages/composer.md, "Only the owner's Send sends: a draft or a picture, with send access, a SIM where there is a choice, and never during a call that may be an emergency call"
    await press("Send");
    await until(alpha, alpha.runtime, Composer, (s) => s.outgoing.op.outcome === "Confirmed" && s.slot.author === "Nobody");
    expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550100"], body: "On my way" }]);
    expect([...document.querySelectorAll("[role=status]")].map((one) => one.textContent)).toContain("Sent to Maya Chen");

    // spec/app/messages/sending.md, "A delivery report counts only for a part reported sent"; spec/app/messages/sending.md, "A finished record is retired by a tombstone"
    world.telephony.deliver(world.telephony.sent[0]!.operationId);
    await until(alpha, alpha.runtime, Composer, (s) => s.outgoing.reported === 1 && s.outgoing.retired === s.outgoing.op.id);

    // spec/app/messages/index.md, "Confirming removes the message under a new number, never during a call that may be an emergency call"
    world.telephony.holdMessageDeletion = true;
    await bubble("See you at five");
    await press("Delete");
    await until(alpha, alpha.runtime, Messages, (s) => s.confirming);
    await confirm("Delete");
    await until(alpha, alpha.runtime, Toasts, (state) => state.showing && state.current.undo);
    await press("Undo");
    await until(alpha, alpha.runtime, Messages, (s) => s.removal.outcome === "Refused" && s.page.status === "Loaded");
    expect(world.telephony.texts.map((one) => one.body)).toEqual(["See you at five", "On my way"]);

    world.telephony.holdMessageDeletion = false;
    await bubble("See you at five");
    await press("Delete");
    await until(alpha, alpha.runtime, Messages, (s) => s.confirming);
    await confirm("Delete");
    await until(alpha, alpha.runtime, Messages, (s) => s.removal.outcome === "Confirmed");
    expect(world.telephony.texts.map((one) => one.body)).toEqual(["On my way"]);

    // spec/app/messages/index.md, "Back returns from a conversation or the picker to the list, and reads it again"
    const read = (await alpha.runtime.runPromise(Messages.use((machine) => machine.get()))).list.ticket;
    await hardware("back");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Threads" && s.list.ticket > read && s.list.status === "Loaded");
  });

  it("See my conversations from Home's unread card (spec/app/messages/index.md, \"Story: See my conversations\")", async () => {
    const world = image();
    world.telephony.texts.push({ id: 2, thread: 2, address: "+14155550122", box: "inbox", date: 1_700_000_060_000, body: "Lunch?", read: false });
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/messages/index.md, "The phone reports how many conversations are unread, for the list and Home"; spec/app/messages/index.md, "One tap on Home's unread card opens the conversation when exactly one is unread, and the list filtered to the unread ones when several are"
    await until(alpha, alpha.runtime, Messages, (s) => s.unread === 2);
    await press("Messages: 2 unread conversations");
    await until(alpha, alpha.runtime, Messages, (s) => s.front && s.pane === "Threads" && s.chip === "UnreadThreads" && s.list.status === "Loaded" && s.threads === 2);

    // spec/app/messages/index.md, "Only the newest read of the open conversation is shown, and it marks the shown messages read only where Alpha is the phone's SMS app"
    await press("Ben Ortiz");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Conversation" && s.page.status === "Loaded");
    await until(alpha, alpha.runtime, Messages, () => world.telephony.texts[1]!.read);
    await hardware("home");
    await until(alpha, alpha.runtime, Messages, (s) => s.unread === 1);
    await press("Messages: 1 unread conversation");
    await until(alpha, alpha.runtime, Messages, (s) => s.front && s.pane === "Conversation" && s.page.status === "Loaded" && s.shown.rows === 1);
    await until(alpha, alpha.runtime, Messages, () => world.telephony.texts[0]!.read);
  });

  it("Start a new message to a number I type (spec/app/messages/index.md, \"Story: Start a new message\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await press("Messages");
    await until(alpha, alpha.runtime, Messages, (s) => s.list.status === "Loaded");

    // spec/app/messages/index.md, "New message opens the picker, which reads the contacts that have a number"
    await press("New message");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Picker" && s.picker.status === "Loaded" && s.choices === 2);

    // spec/app/messages/index.md, "Choosing a contact's number, or typing one, opens that conversation"
    await press("Ben Ortiz");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Conversation" && s.page.status === "Loaded");
    await until(alpha, alpha.runtime, Composer, (s) => s.thread > 0);

    await press("Back");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Threads" && s.list.status === "Loaded");
    await press("New message");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Picker" && s.picker.status === "Loaded");
    await write("To", "+14155550100, +14155550122");
    await press("Text 2 recipients");
    await until(alpha, alpha.runtime, Composer, (s) => s.thread > 0 && s.recipients === 2 && s.sending.grant === "Granted");
    await write("Message", "Meet at five");
    await until(alpha, alpha.runtime, Composer, (s) => s.slot.author === "OwnerWrote");
    await press("Send");
    await until(alpha, alpha.runtime, Composer, (s) => s.outgoing.op.outcome === "Confirmed");
    expect(world.telephony.sent.map(({ operationId, recipients, body }) => ({ kind: world.telephony.journal.get(operationId)?.kind, recipients, body }))).toEqual([
      { kind: "mms-send", recipients: ["+14155550100", "+14155550122"], body: "Meet at five" },
    ]);
  });

  it("Opens the exact notified conversation and follows an owner's safe link tap (spec/app/messages/index.md, \"A message notification opens its exact conversation once access is available\"; spec/app/messages/index.md, \"Story: Read a conversation\")", async () => {
    const world = image();
    world.telephony.texts.push({ id: 2, thread: 23, address: "+14155550122", box: "inbox", date: 1_700_000_060_000, body: "Lunch? http://news.example/lunch or https://example-user@private.example/lunch", read: false });
    world.telephony.smsNotice = { threadId: "thread:23", token: "1" };
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Messages, (state) => state.pane === "Conversation" && state.page.status === "Loaded" && world.telephony.smsNotice === undefined && world.telephony.texts[1]?.read === true);
    expect([world.telephony.texts.map((text) => text.read), world.telephony.sent]).toEqual([[false, true], []]);

    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-alpha-message-body] a")];
    expect([links.map((one) => one.href), world.browser.tabs.size]).toEqual([["http://news.example/lunch"], 0]);
    await act(async () => links[0]?.click());
    await until(alpha, alpha.runtime, Shell, (state) => state.trail.at(-1) === "Browser");
    const runtime = browser.runtime(alpha);
    await until(alpha, runtime, Tabs, (state) => state.selected > 1);
    const tab = runtime.runSync(Effect.map(Tabs.use((machine) => machine.get()), (state) => state.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    await until(alpha, page, Page, (state) => state.phase === "Shown");
    expect([...world.browser.tabs.values()].map((one) => ({ private: one.private, history: one.history })))
      .toEqual([{ private: false, history: ["http://news.example/lunch"] }]);
  });
});
