// @vitest-environment happy-dom
// spec/app/assistant/reply.md, "A failure refused before any output replaces the streamed text; any other failure is added after it"; spec/app/assistant/context.md, "A reviewed email or voice-note transcript flag travels in structured turn context, never inside the owner's request text"
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, open, press, underAct, until } from "./alpha.tsx";
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
    world.ask.opened = 1;
    const { alpha } = await open(world, mounts);
    const runtime = assistant.runtime(alpha);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(alpha, runtime, Conversation, (s) => s.ready);
    await restore(alpha, "Ask Alpha");
    await until(alpha, runtime, Composer, (s) => s.binding.conversation === 1 && s.slot === "Open");
    await until(alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    await drawn(() => vi.waitFor(() => expect(bubbles().length).toBeGreaterThan(0)));
    // spec/app/assistant/reply.md, "A failure refused before any output replaces the streamed text; any other failure is added after it": the provisional text of an aborted reply is never drawn; a dropped stream and a reply the runtime ended still say why.
    // spec/app/assistant/context.md, "A reviewed email or voice-note transcript flag travels in structured turn context, never inside the owner's request text": the send of only the email draws no empty bubble.
    const shown = bubbles();
    expect([shown.map((text) => text.includes("The reply did not finish") ? "did not finish" : text), shown.some((text) => text.includes("Once upon a") || text.includes("Then the"))])
      .toEqual([["Tell me a long story", "Shorter please", "did not finish", "The email asks to move lunch to Friday.", "Thanks", "did not finish"], false]);
  });
});
