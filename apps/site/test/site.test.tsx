// @vitest-environment happy-dom
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { TestClock } from "effect/testing";
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine, machine } from "../gen/site.effect.vibe";
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
    if (!found || found.disabled || found.getAttribute("aria-disabled") === "true") throw new Error(`no button ${name} to press`);
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

const phone = () => document.querySelector('[role="img"][aria-label^="Alpha Home"]')!;

const swaying = () => !phone().classList.contains("[animation-play-state:paused]");

const chat = () => {
  const screen = phone();
  const text = screen.textContent ?? "";
  return [text.includes("What’s on my calendar today?"), screen.querySelectorAll("i").length === 3, text.includes("Two things this afternoon."), screen.querySelectorAll("time").length];
};

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
    const swayed = [swaying()];
    await later(1_000);
    await press("Pause automatic playback");
    await later(10_000);
    expect([at(await state()), (await state()).left]).toEqual([["Home", 0, false, false], 1_700]);
    swayed.push(swaying());
    await press("Pause automatic playback");
    swayed.push(swaying());
    await later(1_700, (demo) => demo.scene === "Chat");

    shown(false);
    await until((demo) => demo.hidden);
    await later(10_000);
    expect(at(await state())).toEqual(["Chat", 0, false, true]);
    swayed.push(swaying());
    shown(true);
    await later(410, (demo) => demo.beat === 1);
    expect([...swayed, swaying()]).toEqual([true, false, true, false, true]);

    // spec/site/index.md, "A scene the visitor picks is shown from its start, and whole where the demo is not playing or the visitor asks for less motion"
    await press("Show Calendar");
    expect([at(await state()), button("Show Calendar")?.getAttribute("aria-disabled")]).toEqual([["Calendar", 0, false, true], "true"]);
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

  it('shows each part of the chat from its beat, and all but the typing when shown whole (spec/site/index.md, "The chat shows the question, the agent typing, its answer and the two events, each from its beat, and all but the typing when shown whole")', async () => {
    const { later, press } = await open();
    await later(2_700, (demo) => demo.scene === "Chat");
    expect(chat()).toEqual([false, false, false, 0]);
    const seen: unknown[] = [];
    for (const [beat, ms] of [[1, 410], [2, 410], [3, 1_350], [4, 290], [5, 220]]) {
      await later(ms, (demo) => demo.beat === beat);
      seen.push(chat());
    }
    expect(seen).toEqual([[true, false, false, 0], [true, true, false, 0], [true, false, true, 0], [true, false, true, 1], [true, false, true, 2]]);
    await press("Pause automatic playback");
    await press("Show Calendar");
    await press("Show Chat");
    expect(chat()).toEqual([true, false, true, 2]);
  });

  it('draws the page with no controls before the demo starts, so it shows without its script (spec/site/index.md, "When the page opens it plays from Home, unless the visitor asks for less motion")', async () => {
    const page = document.body.appendChild(document.createElement("div"));
    page.innerHTML = renderToString(<Site runtime={ManagedRuntime.make(Layer.provide(demo, browserPage))} />);
    expect([page.querySelector("h1") !== null, page.querySelectorAll("img").length, page.querySelector('[aria-label="Phone demo controls"]')]).toEqual([true, 3, null]);
    const runtime = ManagedRuntime.make(Layer.provideMerge(demo, Layer.merge(browserPage, TestClock.layer())));
    const mismatches: unknown[] = [];
    const root = await act(async () => {
      const hydrated = hydrateRoot(page, <Site runtime={runtime} />, { onRecoverableError: (error) => mismatches.push(error) });
      await runtime.runPromise(Effect.void);
      return hydrated;
    });
    closing.push(async () => {
      act(() => root.unmount());
      await runtime.dispose();
    });
    await act(() => runtime.runPromise(Effect.flatMap(Machine, (machine) => Stream.runHead(Stream.filter(machine.changes, (demo) => demo.started)))));
    expect([mismatches, page.querySelector('[aria-label="Phone demo controls"]') !== null]).toEqual([[], true]);
  });

  it('stays paused when the visitor stops asking for less motion, and plays again when asked (spec/site/index.md, "A visitor who comes to ask for less motion has the demo paused and the scene shown whole")', async () => {
    motion.matches = true;
    const { until, later, state, press } = await open();
    motion.matches = false;
    act(() => {
      motion.dispatchEvent(new Event("change"));
    });
    await until((demo) => !demo.still);
    await later(10_000);
    expect(at(await state())).toEqual(["Home", 0, true, false]);
    await press("Pause automatic playback");
    await later(2_700, (demo) => demo.scene === "Chat");
    expect(at(await state())).toEqual(["Chat", 0, false, true]);
  });

  it('gives a beat told after a stall its full time, never running through beats at once (spec/site/index.md, "A beat moves on only while the demo plays in sight, once its time has come")', async () => {
    const [paced, stalled] = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const told = yield* Machine;
      yield* told.send({ type: "start", now: 0, still: false, hidden: false });
      yield* told.send({ type: "tick", now: 2_800 });
      const first = (yield* told.get()).due;
      yield* told.send({ type: "tick", now: 100_000 });
      return [first, yield* told.get()] as const;
    }).pipe(Effect.provide(machine()))));
    expect([paced, stalled.beat, stalled.due]).toEqual([3_110, 1, 100_410]);
  });
});
