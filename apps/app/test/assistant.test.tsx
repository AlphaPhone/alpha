// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Reply } from "../gen/app__assistant__reply.effect.vibe";
import { Machine as Search } from "../gen/app__assistant__search.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import { button, closeAll, fill, hardware, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** Ask Alpha in full, alone at its place: the journeys draw no other screen. */
const mounts: Mount[] = [{ at: "assistant", load: () => import("../src/assistant/index.tsx") }];

const lines = () => [...document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article")].map((line) => line.querySelector("span")?.textContent);
const rows = (list: string) => document.querySelector(`section[aria-label='${list}'] > div`)?.children.length ?? 0;

/** Write `text` in the composer, as the owner types it. */
async function write(text: string) {
  const { act } = await import("react");
  await act(async () => {
    const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
    if (!box) throw new Error("no composer");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Open the menu of the message that says `text` and choose `item`, as the owner does with the keyboard. */
async function onMessage(text: string, item: string) {
  const { act } = await import("react");
  await act(async () => {
    const found = [...document.querySelectorAll("[role=log] article button")].find((one) => one.textContent === text);
    if (!(found instanceof HTMLButtonElement)) throw new Error(`no message ${text}`);
    found.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await act(async () => {
    const chosen = [...document.querySelectorAll("[role=menuitem]")].find((one) => one.textContent === item);
    if (!(chosen instanceof HTMLElement)) throw new Error(`no ${item} for ${text}`);
    chosen.click();
  });
}

/** Open the list of conversations, from the conversation's name. */
async function chatsList() {
  const { act } = await import("react");
  await act(async () => {
    const found = [...document.querySelectorAll("button")].find((one) => one.getAttribute("aria-label")?.startsWith("Chats, "));
    if (!(found instanceof HTMLButtonElement)) throw new Error("no chats control");
    found.click();
  });
}

/** Click the row of the list named `list` whose text starts with `text`. */
async function row(list: string, text: string) {
  const { act } = await import("react");
  await act(async () => {
    const found = [...document.querySelectorAll(`section[aria-label='${list}'] button`)].find((one) => one.textContent?.startsWith(text));
    if (!(found instanceof HTMLButtonElement)) throw new Error(`no row ${text} in ${list}`);
    found.click();
  });
}

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"
  it("Ask Alpha something, in a conversation made for it (spec/app/assistant/index.md, \"Story: Ask Alpha something\")", async () => {
    const world = { ...scene(), phone };
    const { alpha } = await open(world, mounts);
    const runtime = assistant.runtime(alpha);
    // spec/app/assistant/composer.md, "The slot is opened when the composer is shown, and opened again after it could not be read"
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(alpha, runtime, Conversation, (s) => s.ready);

    // spec/app/assistant/composer.md, "A message written before its conversation existed moves into the new one, then its old slot is cleared on the exact revision read"
    world.ask.metadata = [];
    await write("Hello");
    await press("Send");
    // spec/app/assistant/index.md, "A reply completes, streamed or all at once, even after the owner asked to stop it"
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    // spec/app/assistant/reply.md, "The settled reply is the whole final answer, shown and spoken, never the acknowledgment"
    await until(alpha, runtime, Reply, (s) => s.status === "Settled" && s.final === "You said: Hello".length);
    // spec/app/assistant/index.md, "The agent is told the view, the time zone, the day only from Calendar, and whether something is selected"
    expect(world.ask.metadata).toMatchObject([{ observation: { view: "home", sensitive: false } }]);
    await until(alpha, runtime, Composer, (s) => s.away === "Free" && s.clear.outcome === "Confirmed" && s.draft.sync === "Kept");
    expect([lines(), world.ask.said, world.ask.opened]).toEqual([["Hello", "You said: Hello"], ["Hello"], 1]);
    expect(localStorage.getItem("alpha/assistant/slot/0/0@1")).toBe(null);
    expect(JSON.parse(localStorage.getItem("alpha/assistant/slot/0/1@1") ?? "{}")).toMatchObject({ text: "", sending: false });

    // spec/app/assistant/composer.md, "Story: Keep what I am writing": a draft is kept in its conversation's slot.
    await write("Not yet");
    await until(alpha, runtime, Composer, (s) => s.draft.sync === "Kept" && s.editor.text);
    expect(JSON.parse(localStorage.getItem("alpha/assistant/slot/0/1@1") ?? "{}")).toMatchObject({ text: "Not yet", sending: false });
    // spec/app/assistant/composer.md, "A message longer than a message may hold is kept as a draft and never sent"
    await write("x".repeat(64_001));
    await until(alpha, runtime, Composer, (s) => s.long);
    expect(button("Send")?.disabled).toBe(true);
    // spec/app/assistant/reply.md, "One brief acknowledgment at most, only from the agent's acknowledgment frame, before any tool runs"
    world.ask.acknowledgment = "Let me look";
    await write("Again");
    await until(alpha, runtime, Composer, (s) => !s.long && s.draft.sync === "Kept");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 2 && s.turn.reply === "Complete");
    await until(alpha, runtime, Reply, (s) => s.turn === 2 && s.status === "Settled");
    const said = await runtime.runPromise(Effect.flatMap(Reply, (machine) => machine.get()));
    expect([said.acks, said.ackUnits, said.final]).toEqual([1, "Let me look".length, "You said: Again".length]);
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "A fork is asked for from a message of the conversation showing"
    await onMessage("Hello", "New chat from here");
    await until(alpha, runtime, Chats, (s) => s.origin === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello"]);
    // spec/app/assistant/chats.md, "Back to the original leaves the fork for the conversation it came from"
    await press("Original chat");
    await until(alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "The newest list says which conversations there are, and a conversation no longer listed stops showing"
    await chatsList();
    await until(alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    expect(rows("Chats")).toBe(2);

    // spec/app/assistant/index.md, "A sensitive screen is never sent, and no reply is awaited over one": Settings showing carrier identifiers is a sensitive screen (on a phone).
    if (phone) {
      await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Settings" })));
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "General" })));
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "CarrierPage" })));
      await until(alpha, runtime, Conversation, (s) => s.context.sensitive && s.context.showing.tag === "App");
      await write("my password is hunter2");
      expect([button("Send")?.disabled, world.ask.said.length]).toEqual([true, 2]);
      // spec/app/assistant/index.md, "A sensitive screen says only that it is sensitive: no selection and no day"
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "goBack" })));
      await until(alpha, runtime, Conversation, (s) => !s.context.sensitive);
      expect(button("Send")?.disabled).toBe(false);
    }

    // spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"
    world.ask.refusal = { failureKind: "insufficient_credits", cloudCode: "allowance_exhausted", planAction: "funding" };
    await write("Hi");
    await press("Send");
    await until(alpha, runtime, Reply, (s) => s.turn === 3 && s.status === "Interrupted");
    expect([(document.querySelector("section[aria-label='Ask Alpha'] [role=log]")?.textContent ?? "").includes("You’re out of plan allowance and credits, so I couldn’t reply."), Boolean(button("Manage plan"))]).toEqual([true, true]);
    world.ask.refusal = undefined;

    // spec/app/assistant/chats.md, "Older or newer messages are read around a message of the conversation showing"
    await press("Earlier");
    await until(alpha, runtime, Chats, (s) => s.around > 0 && s.page.status === "Loaded");
    expect(lines().slice(0, 2)).toEqual(["Hello", "You said: Hello"]);

    // spec/app/assistant/composer.md, "A quoted message goes with the next send, until the owner removes the quote"
    await onMessage("You said: Hello", "Reply");
    await until(alpha, runtime, Composer, (s) => s.editor.quote === 2);
    await write("Why?");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 4 && s.turn.reply === "Complete");
    expect([world.ask.metadata?.at(-1), world.ask.said.at(-1)]).toEqual([expect.objectContaining({ replyToMessageId: "m1a" }), "Why?"]);
  });

  // spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/chats.md, "Story: Open a message that search found"
  it("Search my conversations, and open a hit where it was said (spec/app/assistant/search.md, \"Story: Search my conversations\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [{ id: "m1", role: "user", text: "Lunch on Friday?" }, { id: "m2", role: "assistant", text: "Friday at noon works." }, Object.assign({ id: "m3", role: "assistant" as const, text: "" }, { failureKind: "limit_reached" })] });
    const { alpha } = await open(world, mounts);
    const runtime = assistant.runtime(alpha);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");

    // spec/app/assistant/search.md, "Words are searched from the first hit, and empty words are not searched"
    await press("Search chats");
    await fill("Search chats", "friday");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Loaded" && s.words === "friday");
    expect(rows("Results")).toBe(2);
    // spec/app/assistant/search.md, "Opening a hit closes search and opens its conversation around its message, and another conversation only while the turn and the composer are free"
    await row("Results", "Friday at noon");
    await until(alpha, runtime, Chats, (s) => s.chosen > 0 && s.around > 0 && s.page.status === "Loaded");
    expect([lines().slice(0, 2), document.querySelector("section[aria-label='Results']")]).toEqual([["Lunch on Friday?", "Friday at noon works."], null]);
    // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again": a reply read again from history says why it did not finish, and to wait a moment.
    expect(document.querySelector("[role=log]")?.textContent).toContain("Too many requests. Wait a moment, then try again");

    // spec/app/assistant/search.md, "Only the newest asking's hits are shown, a page at a time, after those already shown": a search that fails says so.
    world.ask.searchDown = true;
    await press("Search chats");
    await fill("Search chats", "noon");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Failed");
    expect(document.body.textContent).toContain("Search did not finish");
    // spec/app/assistant/index.md, "Back closes a review, then search, then a quote or an edit, one at a time; with none of them open Back is the shell's"
    await hardware("back");
    await until(alpha, runtime, Search, (s) => !s.open);
  });

  // spec/app/assistant/index.md, "Story: Stop a reply"
  it("Stop a reply, and learn how it ended (spec/app/assistant/index.md, \"Story: Stop a reply\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c1", { roomId: "r1", title: "Ask Alpha", messages: [] });
    world.ask.opened = 1;
    const { alpha } = await open(world, mounts);
    const runtime = assistant.runtime(alpha);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(alpha, runtime, Conversation, (s) => s.ready);
    await chatsList();
    await until(alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    await row("Chats", "Ask Alpha");
    await until(alpha, runtime, Composer, (s) => s.binding.conversation === 1 && s.slot === "Open");

    // spec/app/assistant/index.md, "Stop reply ends a streaming reply, and takes back a message nothing was heard of"
    world.ask.stalled = true;
    await write("Take your time");
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
