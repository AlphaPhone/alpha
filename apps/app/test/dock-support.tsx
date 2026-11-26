import { Effect, Stream } from "effect";
import { TestClock } from "effect/testing";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { App } from "../src/App.tsx";
import type { AssistantProps } from "../src/assistant/Assistant.tsx";
import assistant from "../src/assistant/index.tsx";
import { boot } from "../src/boot.tsx";
import { say } from "../src/notices/toasts.vibe";
import { only, resetDocument } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";

const closers: (() => Promise<void>)[] = [];

export async function closeAllDocks() {
  for (const close of closers.splice(0)) await close();
  localStorage.clear();
  resetDocument();
}

export async function mountDock({ view = "Browser", withToast = false, flush, speech }: { view?: "Browser" | "Calendar" | "Home" | "Notes" | "Settings"; withToast?: boolean; flush?: (work: () => Promise<void> | void) => Promise<void>; speech?: AssistantProps["speech"] } = {}) {
  const run = flush ?? (async (work: () => Promise<void> | void) => { await work(); });
  const mounts = only("home", "assistant", "notice", "view:Browser", "view:Calendar", "view:Notes", "view:Settings");
  const world = { ...scene(), ...(speech?.onTalk ? { phone: true } : {}) };
  const alpha = boot(fakeWorld(world), mounts);
  const host = document.body.appendChild(document.createElement("div"));
  const reactRoot = createRoot(host);
  await run(async () => {
    await Promise.allSettled(mounts.map((mount) => mount.load()));
    reactRoot.render(<App alpha={alpha} />);
    await alpha.runtime.runPromise(Effect.void);
  });
  closers.push(async () => {
    await run(() => { reactRoot.unmount(); });
    host.remove();
    await alpha.dispose();
  });
  const runtime = assistant.runtime(alpha);
  await run(async () => {
    if (view !== "Home") await alpha.runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "openView", view })));
    if (withToast) await alpha.runtime.runPromise(say("Saved"));
    await runtime.runPromise(Effect.flatMap(Composer, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.slot === "Open"))));
  });
  await vi.waitFor(() => {
    const hasAssistant = document.querySelector("section[aria-label='Ask Alpha']") !== null;
    const hasHeader = view === "Home" || document.querySelector("header[data-host-chrome]") !== null;
    const hasToast = !withToast || document.querySelectorAll("[data-host-chrome]").length >= 3;
    if (!hasAssistant || !hasHeader || !hasToast) throw new Error("dock not painted");
  }, { timeout: 10_000 });
  for (let waited = 0; waited < 2500 && document.querySelector('[role="status"][aria-label="Loading Alpha"]'); waited += 500) {
    await run(() => alpha.runtime.runPromise(TestClock.adjust(500)));
  }
  return { runtime, host };
}
