// @vitest-environment happy-dom
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { TestClock } from "effect/testing";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine } from "../gen/site.effect.vibe";
import type { Demo } from "../gen/site.ts";
import { Site } from "../src/Site.tsx";
import { browserPage, demo } from "../src/demo.vibe";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const motion = Object.assign(new EventTarget(), { matches: false });
vi.stubGlobal("matchMedia", () => motion);

const closing: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closing.splice(0)) await close();
  motion.matches = false;
  shown(true);
});

async function open() {
  const runtime = ManagedRuntime.make(Layer.provideMerge(demo, Layer.merge(browserPage, TestClock.layer())));
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(async () => {
    root.render(<Site runtime={runtime} />);
    await runtime.runPromise(Effect.void);
  });
  closing.push(async () => {
    act(() => root.unmount());
    await runtime.dispose();
  });
  const until = (ok: (demo: Demo) => boolean) => act(() => runtime.runPromise(Effect.flatMap(Machine, (machine) => Stream.runHead(Stream.filter(machine.changes, ok)))));
  const later = async (ms: number, ok: (demo: Demo) => boolean = () => true) => {
    await act(() => runtime.runPromise(TestClock.adjust(ms)));
    await until(ok);
  };
  const state = () => runtime.runPromise(Effect.flatMap(Machine, (machine) => machine.get()));
  const press = (name: string) => act(async () => {
    const found = button(name);
    if (!found || found.disabled) throw new Error(`no button ${name} to press`);
    found.click();
    await runtime.runPromise(Effect.void);
  });
  return { until, later, state, press };
}

const button = (name: string) => [...document.querySelectorAll("button")].find((found) => found.getAttribute("aria-label") === name);


function shown(visible: boolean) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (visible ? "visible" : "hidden") });
  document.dispatchEvent(new Event("visibilitychange"));
}

const at = (demo: Demo) => [demo.scene, demo.beat, demo.whole, demo.playing];

describe('Watch Alpha at work (spec/site/index.md, "Story: Watch Alpha at work")', () => {
  it('plays Home, the staged chat and the Calendar, and starts over (spec/site/index.md, "The phone shows Home, then the chat, then the Calendar, and starts over, each for its own time")', async () => {
    const { later, state } = await open();
    // spec/site/index.md, "When the page opens it plays from Home, unless the visitor asks for less motion"
    expect(at(await state())).toEqual(["Home", 0, false, true]);
    await later(2_700, (demo) => demo.scene === "Chat");
    // spec/site/index.md, "A beat moves on only while the demo plays in sight, once its time has come"
    for (const [beat, ms] of [[1, 410], [2, 410], [3, 1_350], [4, 290], [5, 220]]) await later(ms, (demo) => demo.beat === beat);
    expect(at(await state())).toEqual(["Chat", 5, false, true]);
    await later(4_820, (demo) => demo.scene === "Calendar");
    await later(3_900, (demo) => demo.scene === "Home");
    expect(at(await state())).toEqual(["Home", 0, false, true]);
  });

  it('pauses and goes on, out of sight too, and shows a picked scene (spec/site/index.md, "Pausing keeps the time the beat has left, and playing again goes on from it")', async () => {
    const { later, until, state, press } = await open();
    await later(1_000);
    await press("Pause automatic playback");
    await later(10_000);
    expect([at(await state()), (await state()).left]).toEqual([["Home", 0, false, false], 1_700]);
    await press("Pause automatic playback");
    await later(1_700, (demo) => demo.scene === "Chat");

    shown(false);
    await until((demo) => demo.hidden);
    await later(10_000);
    expect(at(await state())).toEqual(["Chat", 0, false, true]);
    shown(true);
    await later(410, (demo) => demo.beat === 1);

    // spec/site/index.md, "A scene the visitor picks is shown from its start, and whole where the demo is not playing or the visitor asks for less motion"
    await press("Show Calendar");
    expect([at(await state()), button("Show Calendar")?.disabled]).toEqual([["Calendar", 0, false, true], true]);
    await press("Pause automatic playback");
    await press("Show Chat");
    expect(at(await state())).toEqual(["Chat", 0, true, false]);
  });

  it('pauses for a visitor who asks for less motion (spec/site/index.md, "A visitor who comes to ask for less motion has the demo paused and the scene shown whole")', async () => {
    const first = await open();
    await first.later(3_000, (demo) => demo.scene === "Chat");
    motion.matches = true;
    act(() => {
      motion.dispatchEvent(new Event("change"));
    });
    await first.until((demo) => demo.still);
    expect(at(await first.state())).toEqual(["Chat", 0, true, false]);

    const second = await open();
    expect(at(await second.state())).toEqual(["Home", 0, true, false]);
    await second.later(10_000);
    expect(at(await second.state())).toEqual(["Home", 0, true, false]);
  });
});
