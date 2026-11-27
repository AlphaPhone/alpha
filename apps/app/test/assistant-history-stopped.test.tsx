// @vitest-environment happy-dom
// spec/app/assistant/reply.md, "Read again from history, a reply the owner stopped here before any text settled keeps no bubble, any other stopped or dropped one only says it did not finish, and text that settled before a Stop stays"; spec/app/assistant/context.md, "A reviewed email or voice-note transcript flag travels in structured turn context, never inside the owner's request text"
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Reply } from "../gen/app__assistant__reply.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, open, press, typeInto, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const mounts: Mount[] = [
  { at: "settings/activity", load: () => import("../src/assistant/settingsActivity.tsx") },
  { at: "view:Settings", load: () => import("../src/settings/index.tsx") },
  { at: "assistant", load: () => import("../src/assistant/index.tsx") },
];

/** Each bubble of the conversation, by the words it shows. */
const bubbles = () => Array.from(document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article"), (line) => line.textContent ?? "");

/** Each bubble read from the agent's history, leaving out the reply being written or kept live by a Stop. */
const stored = () => Array.from(document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article"))
  .filter((line) => line.closest("[data-alpha-message-id]")?.getAttribute("data-alpha-message-id") !== "reply").map((line) => line.textContent ?? "");

/** Write `text` in the composer and send it, as the owner does. */
async function send(alpha: Alpha, runtime: ReturnType<typeof assistant.runtime>, text: string) {
  await until(alpha, runtime, Composer, (s) => s.slot === "Open" && s.away === "Free" && !s.unsettled);
  act(() => {
    const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
    if (!box) throw new Error("no composer");
    typeInto(box, text);
  });
  await until(alpha, runtime, Composer, (s) => s.draft.sync === "Kept");
  await press("Send");
}

/** Stop the reply being written, as the owner does, and wait for the check of the stopped reply to end. */
async function stop(alpha: Alpha, runtime: ReturnType<typeof assistant.runtime>) {
  await press("Stop reply");
  await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Stopped" && s.check !== "Aborting" && s.recheck.status !== "Loading");
}

/** Read the conversation showing again from the agent, as its retry does. */
async function readAgain(alpha: Alpha, runtime: ReturnType<typeof assistant.runtime>) {
  const before = await runtime.runPromise(Effect.flatMap(Chats, (chats) => chats.get()));
  await runtime.runPromise(Effect.flatMap(Chats, (chats) => chats.send({ type: "reread" })));
  await until(alpha, runtime, Chats, (s) => s.page.ticket > before.page.ticket && s.page.status === "Loaded");
}

/** Restore the saved conversation titled `title` from Agent activity in Settings, as the owner does. */
async function restore(alpha: Alpha, title: string) {
  await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Settings" })));
  await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "openSection", page: "About" })));
  await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "Activity" })));
  await until(alpha, alpha.runtime, Pages.Machine, (s) => s.page === "Activity");
  await drawn(() => vi.waitFor(() => expect(button(/^Load(ing)? conversations$/)).toBeDefined()));
  await press(/^Load(ing)? conversations$/);
  await drawn(() => vi.waitFor(() => expect(button(`Restore conversation: ${title}`)).toBeDefined()));
  await press(`Restore conversation: ${title}`);
}

async function openRestoredChat(world: ReturnType<typeof scene>) {
  world.ask.opened = 1;
  const { alpha } = await open(world, mounts);
  const runtime = assistant.runtime(alpha);
  await until(alpha, runtime, Composer, (s) => s.slot === "Open");
  await until(alpha, runtime, Conversation, (s) => s.ready);
  await restore(alpha, "Ask Alpha");
  await until(alpha, runtime, Composer, (s) => s.binding.conversation === 1 && s.slot === "Open");
  return { alpha, runtime };
}

describe("Ask Alpha read again from history (spec/app/assistant/reply.md, \"Story: Understand why a reply did not finish\")", () => {
  it("keeps no bubble for a reply stopped before any of its text settled, only a notice for a dropped one, and none empty for a send of only a reviewed email", async () => {
    const world = { ...scene(), phone: true };
    world.ask.kept.set("c1", { roomId: "r1", title: "Ask Alpha", messages: [
      { id: "m1", role: "user", text: "Tell me a long story" },
      { id: "m2", role: "assistant", text: "Once upon a", failureKind: "aborted", abortCause: "stop" },
      { id: "m3", role: "user", text: "Shorter please" },
      { id: "m4", role: "assistant", text: "Then the", failureKind: "aborted", abortCause: "client_left" },
      { id: "m5", role: "user", text: "" },
      { id: "m6", role: "assistant", text: "The email asks to move lunch to Friday." },
      { id: "m7", role: "user", text: "Thanks" },
      { id: "m8", role: "assistant", text: "", failureKind: "aborted", abortCause: "runtime" },
    ] });
    const { alpha, runtime } = await openRestoredChat(world);
    await until(alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    await drawn(() => vi.waitFor(() => expect(bubbles().length).toBeGreaterThan(0)));
    // spec/app/assistant/reply.md, "Read again from history, a reply the owner stopped here before any text settled keeps no bubble, any other stopped or dropped one only says it did not finish, and text that settled before a Stop stays": with no Stop pressed here, a reply a Stop reached first and a dropped stream say only that they did not finish, never their stored text, and a reply the runtime ended still says why.
    // spec/app/assistant/context.md, "A reviewed email or voice-note transcript flag travels in structured turn context, never inside the owner's request text": the send of only the email draws no empty bubble.
    const shown = bubbles();
    expect([shown.map((text) => text.includes("The reply did not finish") ? "did not finish" : text), shown.some((text) => text.includes("Once upon a") || text.includes("Then the"))])
      .toEqual([["Tell me a long story", "did not finish", "Shorter please", "did not finish", "The email asks to move lunch to Friday.", "Thanks", "did not finish"], false]);
  });

  it("keeps no bubble for a reply the owner stopped before any of its text settled, and keeps text that settled before a Stop", async () => {
    const world = { ...scene(), phone: true };
    world.ask.kept.set("c1", { roomId: "r1", title: "Ask Alpha", messages: [] });
    const { alpha, runtime } = await openRestoredChat(world);

    world.ask.stalled = true;
    world.ask.nextReplyChunks = ["Once upon a"];
    world.ask.nextReplyProvisional = true;
    await send(alpha, runtime, "Tell me a long story");
    await until(alpha, runtime, Reply, (s) => s.provisional && s.shown === 0);
    world.ask.afterStop = [{ id: "m1a", role: "assistant", text: "Once upon a", failureKind: "aborted", abortCause: "client_left" }];
    await stop(alpha, runtime);

    world.ask.stalled = false;
    const done = Promise.withResolvers<void>();
    world.ask.nextReplyChunks = ["Once upon a time", " there was a cat."];
    world.ask.nextReplyProvisional = true;
    world.ask.holdDoneAfterReady = done.promise;
    try {
      await send(alpha, runtime, "Shorter please");
      await until(alpha, runtime, Reply, (s) => s.status === "Streaming" && !s.provisional && s.shown === "Once upon a time there was a cat.".length);
      await stop(alpha, runtime);
    } finally {
      done.resolve();
    }
    Object.assign(world.ask.kept.get("c1")?.messages.find((one) => one.id === "m2a") ?? {}, { failureKind: "aborted", abortCause: "client_left" });
    await readAgain(alpha, runtime);
    // spec/app/assistant/reply.md, "Read again from history, a reply the owner stopped here before any text settled keeps no bubble, any other stopped or dropped one only says it did not finish, and text that settled before a Stop stays": the first Stop came before any text settled, so its stored provisional text and the notice stay out; the second came after its text settled, and eliza stored that settled text as aborted, so it stays.
    await drawn(() => vi.waitFor(() => expect(stored()).toEqual(["Tell me a long story", "Shorter please", "Once upon a time there was a cat.The reply did not finish"])));
  });
});
