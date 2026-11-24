// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Search } from "../gen/app__assistant__search.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import { button, closeAll, fill, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** Ask Alpha in full, alone at its place: the journeys draw no other screen. */
const mounts: Mount[] = [{ at: "assistant", load: () => import("../src/assistant/index.tsx") }];

const lines = () => [...document.querySelectorAll("section[aria-label='Assistant'] ol[aria-label='Conversation'] li > span")].map((line) => line.textContent);
const alerts = () => [...document.querySelectorAll("section[aria-label='Assistant'] [role=alert]")].map((alert) => alert.textContent);

/** Write `text` in the composer, as the owner types it. */
async function write(text: string) {
  const { act } = await import("react");
  await act(async () => {
    const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message']");
    if (!box) throw new Error("no composer");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Submit the form that holds the field or button named `name`. */
async function submit(name: string) {
  const { act } = await import("react");
  await act(async () => {
    const field = document.querySelector(`[aria-label='${name}']`);
    field?.closest("form")?.requestSubmit();
  });
}

/** Click the row of the list named `list` whose text starts with `text`. */
async function row(list: string, text: string) {
  const { act } = await import("react");
  await act(async () => {
    const found = [...document.querySelectorAll(`[aria-label='${list}'] button`)].find((one) => one.textContent?.startsWith(text));
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
    await write("Hello");
    await press("Send");
    // spec/app/assistant/index.md, "A reply completes, streamed or all at once, even after the owner asked to stop it"
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
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
    expect(button("Send")).toBe(undefined);
    await write("Again");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 2 && s.turn.reply === "Complete");
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "A fork is asked for from a message of the conversation showing"
    await press("Fork from “Hello”");
    await until(alpha, runtime, Chats, (s) => s.origin === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello"]);
    // spec/app/assistant/chats.md, "Back to the original leaves the fork for the conversation it came from"
    await press("Back to the original");
    await until(alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "The newest list says which conversations there are, and a conversation no longer listed stops showing"
    await press("Chats");
    await until(alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    expect([...document.querySelectorAll("nav[aria-label='Chats'] button")].length).toBe(2);
  });

  // spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/chats.md, "Story: Open a message that search found"
  it("Search my conversations, and open a hit where it was said (spec/app/assistant/search.md, \"Story: Search my conversations\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [{ id: "m1", role: "user", text: "Lunch on Friday?" }, { id: "m2", role: "assistant", text: "Friday at noon works." }] });
    const { alpha } = await open(world, mounts);
    const runtime = assistant.runtime(alpha);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");

    // spec/app/assistant/search.md, "Words are searched from the first hit, and empty words are not searched"
    await press("Search chats");
    await fill("Search chats", "friday");
    await submit("Search chats");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Loaded");
    expect([...document.querySelectorAll("ul[aria-label='Hits'] li")].length).toBe(2);
    // spec/app/assistant/search.md, "Opening a hit closes search and opens its conversation around its message, and another conversation only while the turn and the composer are free"
    await row("Hits", "Friday at noon");
    await until(alpha, runtime, Chats, (s) => s.chosen > 0 && s.around > 0 && s.page.status === "Loaded");
    expect([lines(), document.querySelector("ul[aria-label='Hits']")]).toEqual([["Lunch on Friday?", "Friday at noon works."], null]);

    // spec/app/assistant/search.md, "Only the newest asking's hits are shown, a page at a time, after those already shown": a search that fails says so.
    world.ask.searchDown = true;
    await press("Search chats");
    await fill("Search chats", "noon");
    await submit("Search chats");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Failed");
    expect(alerts()).toContain("Search did not answer");
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
    await press("Chats");
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
