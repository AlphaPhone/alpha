// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeAll, expect, it } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Reply } from "../gen/app__assistant__reply.effect.vibe";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import { button, closeAll, openOver, press, underAct, until } from "./alpha.tsx";
import { owned } from "@repo/eliza-harness";
import { elizaWorld } from "./eliza/world.vibe";

let mine: Awaited<ReturnType<typeof owned>>;

underAct();
beforeAll(async () => {
  // spec/app/assistant/index.md, "Story: Ask Alpha something": sign in against the real eliza harness for production Assistant.
  mine = await owned("assistant");
}, 600_000);
afterEach(closeAll);

/** Production Ask Alpha mounted over real eliza agent and cloud services. */
const mounts: Mount[] = [{ at: "assistant", load: () => import("../src/assistant/index.tsx") }];

const lines = () => [...document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article")]
  .map((line) => line.querySelector("span:not([aria-hidden])")?.textContent);

function write(text: string) {
  act(() => {
    const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
    if (!box) throw new Error("no composer");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/index.md, "Story: Stop a reply"
it("Ask Alpha production assistant talks to eliza's agent and stops a stalled turn (spec/app/assistant/index.md, \"Story: Ask Alpha something\")", async () => {
  const { alpha } = await openOver(elizaWorld(mine), mounts);
  const runtime = assistant.runtime(alpha);
  await until(alpha, runtime, Composer, (s) => s.slot === "Open");
  await until(alpha, runtime, Conversation, (s) => s.ready);

  await mine.script({ kind: "text", parts: ["Hello ", "from ", "Ask Alpha."] });
  write("Say hello.");
  await press("Send");
  await until(alpha, runtime, Chats, (s) => s.chosen > 0 && s.page.status === "Loaded");
  await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
  await until(alpha, runtime, Reply, (s) => s.status === "Settled");
  expect(lines()).toEqual(["Say hello.", "Hello from Ask Alpha."]);
  expect([button("Earlier"), button("Later")]).toEqual([undefined, undefined]);

  await mine.script({ kind: "stall", first: "Thinking" });
  write("Take your time.");
  await press("Send");
  await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Streaming");
  expect(button("Send")).toBeUndefined();
  await press("Stop reply");
  await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Stopped" && s.check !== "Aborting" && s.recheck.status !== "Loading");
  expect(lines()).toContain("Take your time.");
}, 300_000);
