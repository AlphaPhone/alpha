// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Locator } from "../gen/app__assistant__context.effect.vibe";
import { Machine as Reply } from "../gen/app__assistant__reply.effect.vibe";
import { Machine as Search } from "../gen/app__assistant__search.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import * as Prefs from "../gen/app__settings__preferences.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import { untimed } from "../src/runtime/reactor.vibe";
import { button, closeAll, drawn, fill, hardware, later, open, press, pressOnTop, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** Ask Alpha in full, alone at its place: the journeys draw no other screen. */
const mounts: Mount[] = [{ at: "assistant", load: () => import("../src/assistant/index.tsx") }];

const lines = () => [...document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article")].map((line) => line.querySelector("span:not([aria-hidden])")?.textContent);
const rows = (list: string) => document.querySelector(`section[aria-label='${list}'] > div`)?.children.length ?? 0;

/** Write `text` in the composer, as the owner types it. */
function write(text: string) {
  act(() => {
    const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
    if (!box) throw new Error("no composer");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Open the menu of the message that says `text` and choose `item`, as the owner does with the keyboard. */
function onMessage(text: string, item: string) {
  act(() => {
    const found = [...document.querySelectorAll("[role=log] article button")].find((one) => one.textContent === text);
    if (!(found instanceof HTMLButtonElement)) throw new Error(`no message ${text}`);
    found.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  act(() => {
    const chosen = [...document.querySelectorAll("[role=menuitem]")].find((one) => one.textContent === item);
    if (!(chosen instanceof HTMLElement)) throw new Error(`no ${item} for ${text}`);
    chosen.click();
  });
}

/** Choose `item` from the chat actions beside the composer, as the owner does with the keyboard. */
function chatAction(item: string) {
  act(() => {
    const trigger = document.querySelector("button[aria-label='Chat actions']");
    if (!(trigger instanceof HTMLButtonElement)) throw new Error("no chat actions");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  act(() => {
    const chosen = [...document.querySelectorAll("[role=menuitem]")].find((one) => one.textContent === item);
    if (!(chosen instanceof HTMLElement)) throw new Error(`no chat action ${item}`);
    chosen.click();
  });
}

/** Open the list of conversations, from the chat actions. */
const chatsList = () => chatAction("Chat history");

/** Click the row of the list named `list` whose text starts with `text`. */
function row(list: string, text: string) {
  act(() => {
    const found = [...document.querySelectorAll(`section[aria-label='${list}'] button`)].find((one) => one.textContent?.startsWith(text));
    if (!(found instanceof HTMLButtonElement)) throw new Error(`no row ${text} in ${list}`);
    found.click();
  });
}

/** Open Ask Alpha on `world`, waiting for its composer slot to open and optionally for the agent. */
async function openAssistant(world: ReturnType<typeof scene>, ready = true) {
  const { alpha } = await open(world, mounts);
  const runtime = assistant.runtime(alpha);
  await until(alpha, runtime, Composer, (s) => s.slot === "Open");
  if (ready) await until(alpha, runtime, Conversation, (s) => s.ready);
  return { alpha, runtime };
}

/** The location carried on the observation of `metadata`, if any. */
function locationIn(metadata: unknown): { latitude?: number; longitude?: number; accuracyMeters?: number; capturedAt?: number } | undefined {
  return (metadata as { observation?: { location?: { latitude?: number; longitude?: number; accuracyMeters?: number; capturedAt?: number } } } | undefined)?.observation?.location;
}

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"
  it("Ask Alpha something, in a conversation made for it (spec/app/assistant/index.md, \"Story: Ask Alpha something\")", async () => {
    const world = { ...scene(), phone };
    // spec/app/assistant/composer.md, "The slot is opened when the composer is shown, and opened again after it could not be read"
    const { alpha, runtime } = await openAssistant(world);
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded");

    // spec/app/assistant/composer.md, "A message written before its conversation existed moves into the new one, then its old slot is cleared on the exact revision read"
    world.ask.metadata = [];
    write("Hello ");
    await press("Send");
    // spec/app/assistant/index.md, "A reply completes, streamed or all at once, even after the owner asked to stop it"
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    // spec/app/assistant/reply.md, "The settled reply is the whole final answer, shown and spoken, never the acknowledgment"
    await until(alpha, runtime, Reply, (s) => s.status === "Settled" && s.final === "You said: Hello".length);
    // spec/app/assistant/index.md, "The agent is told the view, the time zone, the day only from Calendar, and whether something is selected"
    expect(world.ask.metadata).toMatchObject([{ observation: { view: "home", sensitive: false } }]);
    // spec/app/assistant/context.md, "The locator holds whether the owner allows it, the time last told, the last GPS fix and the last network answer, each read once under its ticket, and when each may be read again": a cold turn never waits for a fix, and starts one read behind it.
    expect(locationIn(world.ask.metadata[0])).toBe(undefined);
    if (phone) await until(alpha, runtime, Locator, (s) => s.gpsAt >= 0);
    await until(alpha, runtime, Composer, (s) => s.away === "Free" && s.clear.outcome === "Confirmed" && s.draft.sync === "Kept");
    expect([lines(), world.ask.said, world.ask.opened]).toEqual([["Hello", "You said: Hello"], ["Hello"], 1]);
    expect(localStorage.getItem("alpha/assistant/slot/0/0@1")).toBe(null);
    expect(JSON.parse(localStorage.getItem("alpha/assistant/slot/0/1@1") ?? "{}")).toMatchObject({ text: "", sending: false });

    // spec/app/assistant/composer.md, "Story: Keep what I am writing": a draft is kept in its conversation's slot.
    write("Not yet");
    await until(alpha, runtime, Composer, (s) => s.draft.sync === "Kept" && s.editor.text);
    expect(JSON.parse(localStorage.getItem("alpha/assistant/slot/0/1@1") ?? "{}")).toMatchObject({ text: "Not yet", sending: false });
    // spec/app/assistant/composer.md, "A message longer than a message may hold is kept as a draft and never sent"
    write("x".repeat(64_001));
    await until(alpha, runtime, Composer, (s) => s.long);
    expect(button("Send")?.disabled).toBe(true);
    // spec/app/assistant/reply.md, "One brief acknowledgment at most, only from the agent's acknowledgment frame, before any tool runs"
    world.ask.acknowledgment = "Let me look";
    write("Again");
    await until(alpha, runtime, Composer, (s) => !s.long && s.draft.sync === "Kept");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 2 && s.turn.reply === "Complete");
    await until(alpha, runtime, Reply, (s) => s.turn === 2 && s.status === "Settled");
    await until(alpha, runtime, Composer, (s) => s.hold === 2 && !s.held.text && s.draft.sync === "Kept");
    const said = await runtime.runPromise(Effect.flatMap(Reply, (machine) => machine.get()));
    expect([said.acks, said.ackUnits, said.final]).toEqual([1, "Let me look".length, "You said: Again".length]);
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "A fork is asked for from a message of the conversation showing"
    onMessage("Hello", "New chat from here");
    await until(alpha, runtime, Chats, (s) => s.origin === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello"]);
    // spec/app/assistant/chats.md, "Back to the original leaves the fork for the conversation it came from"
    await press("Original chat");
    await until(alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "The newest list says which conversations there are, and a conversation no longer listed stops showing"
    chatsList();
    await until(alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    expect(rows("Chats")).toBe(2);

    // spec/app/assistant/index.md, "A sensitive screen is never sent, and no reply is awaited over one": Settings showing carrier identifiers is a sensitive screen (on a phone).
    if (phone) {
      await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Settings" })));
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "General" })));
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "CarrierPage" })));
      await until(alpha, runtime, Conversation, (s) => s.context.sensitive && s.context.showing.tag === "App");
      write("my password is hunter2");
      expect([button("Send")?.disabled, world.ask.said.length]).toEqual([true, 2]);
      // spec/app/assistant/index.md, "A sensitive screen says only that it is sensitive: no selection and no day"
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "goBack" })));
      await until(alpha, runtime, Conversation, (s) => !s.context.sensitive);
      expect(button("Send")?.disabled).toBe(false);
      await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "goBack" })));
      await until(alpha, runtime, Conversation, (s) => s.context.showing.tag === "Home");
    }

    // spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"
    world.ask.refusal = { failureKind: "insufficient_credits", cloudCode: "allowance_exhausted", planAction: "funding" };
    write("Hi");
    await press("Send");
    await until(alpha, runtime, Reply, (s) => s.turn === 3 && s.status === "Interrupted");
    expect([(document.querySelector("section[aria-label='Ask Alpha'] [role=log]")?.textContent ?? "").includes("You’re out of plan allowance and credits, so I couldn’t reply."), Boolean(button("Manage plan"))]).toEqual([true, true]);
    world.ask.refusal = undefined;

    // spec/app/assistant/chats.md, "Older or newer messages are read around a message of the conversation showing"
    await press("Earlier");
    await until(alpha, runtime, Chats, (s) => s.around > 0 && s.page.status === "Loaded");
    expect(lines().slice(0, 2)).toEqual(["Hello", "You said: Hello"]);

    // spec/app/assistant/composer.md, "A quoted message goes with the next send, until the owner removes the quote"
    onMessage("You said: Hello", "Reply");
    await until(alpha, runtime, Composer, (s) => s.editor.quote === 2);
    write("Why?");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 4 && s.turn.reply === "Complete");
    expect([world.ask.metadata?.at(-1), world.ask.said.at(-1)]).toEqual([expect.objectContaining({ replyToMessageId: "m1a" }), "Why?"]);
    // spec/app/assistant/context.md, "A turn carries the location only while the owner allows it, from a screen that is not sensitive, to a peer that declares it, and only a GPS fix at most thirty minutes old or a network answer that still stands": the phone's last fix, read behind an earlier turn, goes with this one.
    const carried = locationIn(world.ask.metadata?.at(-1));
    expect(phone ? { latitude: carried?.latitude, longitude: carried?.longitude, accuracyMeters: carried?.accuracyMeters, timed: typeof carried?.capturedAt === "number" } : carried)
      .toEqual(phone ? { latitude: 43.73, longitude: 7.42, accuracyMeters: 8, timed: true } : undefined);

    if (phone) {
      // spec/app/assistant/context.md, "Turning Location for Alpha off, or Android taking the permission away, forgets every fix and answer, and leaves what was being read behind"
      await alpha.runtime.runPromise(Effect.flatMap(Prefs.Machine, (prefs) => prefs.send({ type: "setShare", share: "AgentLocation", on: false, at: untimed }, "Owner")));
      await until(alpha, alpha.runtime, Prefs.Machine, (s) => !Prefs.allows(s, "AgentLocation"));
      await until(alpha, runtime, Locator, (s) => !s.enabled && s.gpsAt === -1);
      write("Where am I?");
      await press("Send");
      await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 5 && s.turn.reply === "Complete");
      expect(locationIn(world.ask.metadata?.at(-1))).toBe(undefined);

      // spec/app/assistant/context.md, "A turn carries the location only while the owner allows it, from a screen that is not sensitive, to a peer that declares it, and only a GPS fix at most thirty minutes old or a network answer that still stands": a fix older than thirty minutes is never sent.
      await alpha.runtime.runPromise(Effect.flatMap(Prefs.Machine, (prefs) => prefs.send({ type: "setShare", share: "AgentLocation", on: true, at: untimed }, "Owner")));
      await until(alpha, alpha.runtime, Prefs.Machine, (s) => Prefs.allows(s, "AgentLocation"));
      await until(alpha, runtime, Locator, (s) => s.enabled);
      write("Refresh");
      await press("Send");
      await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 6 && s.turn.reply === "Complete");
      await until(alpha, runtime, Locator, (s) => s.gpsAt >= 0);
      world.maps.here = undefined;
      await later(alpha, 1_800_001);
      write("Too old");
      await press("Send");
      await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 7 && s.turn.reply === "Complete");
      expect(locationIn(world.ask.metadata?.at(-1))).toBe(undefined);
    }
  });

  // spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/chats.md, "Story: Open a message that search found"
  it("Search my conversations, and open a hit where it was said (spec/app/assistant/search.md, \"Story: Search my conversations\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [{ id: "m1", role: "user", text: "Lunch on Friday?" }, { id: "m2", role: "assistant", text: "Friday at noon works." }, Object.assign({ id: "m3", role: "assistant" as const, text: "" }, { failureKind: "limit_reached" })] });
    const { alpha, runtime } = await openAssistant(world, false);

    // spec/app/assistant/search.md, "Words are searched from the first hit, and empty words are not searched"
    await chatAction("Search chat");
    await fill("Search chats", "friday");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Loaded" && s.words === "friday");
    expect(rows("Results")).toBe(2);
    // spec/app/assistant/search.md, "Opening a hit closes search and opens its conversation around its message, and another conversation only while the turn and the composer are free"
    row("Results", "Friday at noon");
    await until(alpha, runtime, Chats, (s) => s.chosen > 0 && s.around > 0 && s.page.status === "Loaded");
    expect([lines().slice(0, 2), document.querySelector("section[aria-label='Results']")]).toEqual([["Lunch on Friday?", "Friday at noon works."], null]);
    // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again": a reply read again from history says why it did not finish, and to wait a moment.
    expect(document.querySelector("[role=log]")?.textContent).toContain("Too many requests. Wait a moment, then try again");

    // spec/app/assistant/search.md, "Only the newest asking's hits are shown, a page at a time, after those already shown": a search that fails says so.
    world.ask.searchDown = true;
    await chatAction("Search chat");
    await fill("Search chats", "noon");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Failed");
    expect(document.body.textContent).toContain("Search did not finish");
    // spec/app/assistant/index.md, "Back closes a review, then search, then a quote or an edit, one at a time; with none of them open Back is the shell's"
    await hardware("back");
    await until(alpha, runtime, Search, (s) => !s.open);
  });

  // spec/app/assistant/chats.md, "Story: Find my conversations"
  it("Find the conversation I was in after a restart, or the agent's newest, or a new chat once it has none (spec/app/assistant/chats.md, \"Story: Find my conversations\")", async () => {
    const world = { ...scene(), phone };
    const first = await open(world, mounts);
    let runtime = assistant.runtime(first.alpha);
    await until(first.alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(first.alpha, runtime, Conversation, (s) => s.ready);
    write("Hello before restart");
    await press("Send");
    await until(first.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    await until(first.alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    await first.close();

    // spec/app/assistant/chats.md, "The conversation showing, and the one a fork came from, are remembered through a restart and read again": a read that fails offers Try again.
    world.ask.pagesDown = true;
    const second = await open(world, mounts);
    runtime = assistant.runtime(second.alpha);
    await until(second.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Failed");
    expect(document.body.textContent).toContain("Messages did not load");
    world.ask.pagesDown = false;
    await press("Try again");
    await until(second.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello before restart", "You said: Hello before restart"]);
    await second.close();

    // spec/app/assistant/chats.md, "A read of the latest messages answered 404 asks the agent's list whether the conversation is still there": a conversation the agent still lists is a read that failed, read once and never again by itself.
    world.ask.pagesMissing = true;
    world.ask.pageReads = 0;
    world.ask.listReads = 0;
    const listedYetMissing = await open(world, mounts);
    runtime = assistant.runtime(listedYetMissing.alpha);
    await until(listedYetMissing.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Failed");
    await until(listedYetMissing.alpha, runtime, Conversation, (s) => s.ready);
    expect([document.body.textContent?.includes("Messages did not load"), world.ask.pageReads, world.ask.listReads]).toEqual([true, 1, 1]);
    world.ask.pagesMissing = false;
    await press("Try again");
    await until(listedYetMissing.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect([lines(), world.ask.pageReads]).toEqual([["Hello before restart", "You said: Hello before restart"], 2]);
    await listedYetMissing.close();

    // spec/app/assistant/chats.md, "A conversation the list no longer has is forgotten, and the first it lists, the most recently used, shows in its place, or a new chat when there is none"
    world.ask.kept.clear();
    world.ask.kept.set("c8", { roomId: "r8", title: "Dinner", messages: [{ id: "m8", role: "user", text: "Dinner at eight?" }] });
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [{ id: "m7", role: "user", text: "Lunch on Friday?" }] });
    const third = await open(world, mounts);
    runtime = assistant.runtime(third.alpha);
    await until(third.alpha, runtime, Chats, (s) => s.chosen > 1 && s.ids.length === 2 && s.page.status === "Loaded");
    expect([document.body.textContent?.includes("Messages did not load"), button("Try again"), lines()]).toEqual([false, undefined, ["Dinner at eight?"]]);
    await third.close();

    world.ask.kept.clear();
    const fourth = await open(world, mounts);
    runtime = assistant.runtime(fourth.alpha);
    await until(fourth.alpha, runtime, Chats, (s) => s.chosen === 0 && s.ids.length === 0 && s.page.status === "Idle");
    await until(fourth.alpha, runtime, Composer, (s) => s.binding.conversation === 0 && s.slot === "Open");
    await until(fourth.alpha, runtime, Conversation, (s) => s.ready);
    expect([document.body.textContent?.includes("Messages did not load"), button("Try again"), lines()]).toEqual([false, undefined, []]);
    write("Hello after restart");
    await press("Send");
    await until(fourth.alpha, runtime, Chats, (s) => s.chosen > 0 && s.page.status === "Loaded");
    await until(fourth.alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    expect([lines(), world.ask.said.at(-1), world.ask.opened]).toEqual([["Hello after restart", "You said: Hello after restart"], "Hello after restart", 2]);
    await fourth.close();

    // spec/app/assistant/chats.md, "The newest list says which conversations there are, and a conversation no longer listed stops showing"; spec/app/assistant/chats.md, "A new chat holds no conversation's page": a list without the conversation that lands while its 404 is being checked leaves its page behind, and the new chat settles.
    world.ask.kept.clear();
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [{ id: "m7", role: "user", text: "Lunch on Friday?" }] });
    world.ask.holdLists = true;
    const fifth = await open(world, mounts);
    runtime = assistant.runtime(fifth.alpha);
    await vi.waitFor(() => expect(world.ask.heldLists.length).toBe(1));
    world.ask.holdLists = false;
    chatsList();
    await until(fifth.alpha, runtime, Chats, (s) => s.chosen === 0 && s.list.status === "Loaded" && s.page.status === "Idle");
    expect([document.querySelector("[role=log] [aria-busy]"), document.body.textContent?.includes("Messages did not load")]).toEqual([null, false]);
    for (const release of world.ask.heldLists.splice(0)) release();

    // spec/app/assistant/chats.md, "A list asked before a conversation was made is left behind, so its answer never takes that conversation away": the list read asked before New chat answers after the conversation was made.
    world.ask.holdLists = true;
    chatsList();
    await vi.waitFor(() => expect(world.ask.heldLists.length).toBe(1));
    await pressOnTop("New chat");
    await until(fifth.alpha, runtime, Chats, (s) => s.chosen > 0 && s.make.outcome === "Confirmed" && s.page.status === "Loaded");
    const chats = () => runtime.runPromise(Effect.flatMap(Chats, (machine) => machine.get()));
    const made = (await chats()).chosen;
    world.ask.holdLists = false;
    for (const release of world.ask.heldLists.splice(0)) release();
    await until(fifth.alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    const after = await chats();
    expect([after.chosen, after.ids.includes(made)]).toEqual([made, true]);
  });

  // spec/app/assistant/index.md, "Story: Stop a reply"
  it("Stop a reply, and learn how it ended (spec/app/assistant/index.md, \"Story: Stop a reply\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c1", { roomId: "r1", title: "Ask Alpha", messages: [] });
    world.ask.opened = 1;
    const { alpha, runtime } = await openAssistant(world);
    chatsList();
    await until(alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    row("Chats", "Ask Alpha");
    await until(alpha, runtime, Composer, (s) => s.binding.conversation === 1 && s.slot === "Open");

    // spec/app/assistant/index.md, "Stop reply ends a streaming reply, and takes back a message nothing was heard of"
    world.ask.stalled = true;
    write("Take your time");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Streaming");
    expect(button("Send")).toBe(undefined);
    await press("Stop reply");
    // spec/app/assistant/index.md, "The agent's answer to the abort starts the one read of the conversation"; spec/app/assistant/index.md, "The read says the reply finished anyway, was stopped for sure, was never recorded, or to look later"
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Stopped" && s.check !== "Aborting" && s.recheck.status !== "Loading");
    const { check } = await runtime.runPromise(Effect.flatMap(Conversation, (machine) => machine.get()));
    expect([world.ask.turns.size, lines()[0], check === "StoppedForSure" || check === "LookLater"]).toEqual([0, "Take your time", true]);
  });
});

/** The card in the conversation whose title is `title`, if one is shown. */
const card = (title: string) => [...document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article")].find((one) => one.textContent?.includes(title));

/** Press `name` on the card titled `title`, as the owner taps it. */
const onCard = (title: string, name: string) => drawn(() => {
  const found = [...(card(title)?.querySelectorAll("button") ?? [])].find((one) => one.textContent === name);
  if (!found) throw new Error(`no ${name} on the card ${title}`);
  found.click();
});

// spec/app/approvals/index.md, "Story: One action at a time"; spec/app/messages/sending.md, "Story: Send a message once"
describe("on an Alpha image", () => {
  it("A text Alpha asks to send is shown on its card first, sent once only on the owner's Send, told to the agent, and a draft or a declined one sends nothing (spec/app/messages/sending.md, \"Story: Send a message once\"; spec/app/approvals/proposal.md, \"Story: Decide\"; spec/app/messages/composer.md, \"The agent's draft goes into the open conversation's draft only while it is empty, and never sends\")", async () => {
    const world = { ...scene(), phone: true, image: true };
    const { desk } = world.telephony;
    desk.owner = "owner-1";
    const to = { kind: "number", number: "+14155550133" };
    const offer = (id: string, requestMessageId: string, operation: object) =>
      desk.proposals.push({ id, digest: id.padStart(64, "d"), state: "pending", requestMessageId, operation: { type: "sms_compose", target: to, ...operation } });
    offer("proposal-1", "m1u", { body: "On my way" });
    await openAssistant(world);

    write("Text 415 555 0133 that I'm on my way");
    await press("Send");
    await vi.waitFor(() => expect(card("Send a text to +14155550133")?.textContent).toContain("On my way"));
    expect([desk.capabilities, world.telephony.sent, desk.proposals[0]?.state]).toEqual(["phone.keypad.v1,phone.dial.v1,phone.call.v1,views.telephony.v1,sms.compose.v1,sms.compose.v2", [], "pending"]);

    // spec/app/messages/sending.md, "Story: Send a message once": the owner's Send sends it once, under the proposal's own operation, and the agent hears the phone's record.
    await onCard("Send a text to +14155550133", "Send");
    await vi.waitFor(() => expect(desk.proposals[0]?.state).toBe("done"));
    expect([world.telephony.sent, desk.proposals[0]?.receipt]).toEqual([
      [{ operationId: "proposal-1", recipients: ["+14155550133"], body: "On my way" }],
      { outcome: "applied", operationId: "proposal-1", result: { kind: "sms-compose", status: "sent" } },
    ]);

    // spec/app/approvals/proposal.md, "A card is open only while its proposal is pending": the next turn offers nothing, and nothing is sent again.
    write("Thanks");
    await press("Send");
    await vi.waitFor(() => expect(world.ask.said).toEqual(["Text 415 555 0133 that I'm on my way", "Thanks"]));
    await vi.waitFor(() => expect(lines().at(-1)).toBe("You said: Thanks"));
    expect([card("Send a text to"), world.telephony.sent.length]).toEqual([undefined, 1]);

    // spec/app/approvals/proposal.md, "Only the owner it is for declines a pending proposal, from its card or from the history of phone actions, and the agent is told": a draft is shown too, and a declined one sends nothing.
    offer("proposal-2", "m3u", { body: "Running late", draft: true });
    write("Draft them that I'm running late");
    await press("Send");
    await vi.waitFor(() => expect(card("Draft a text to +14155550133")?.textContent).toContain("Running late"));
    await onCard("Draft a text to +14155550133", "Decline");
    await vi.waitFor(() => expect(desk.proposals[1]?.state).toBe("rejected"));
    expect(world.telephony.sent.length).toBe(1);
  });
});
