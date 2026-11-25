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
let reading: Demo["scene"] = "Home";
vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
  const passages = [...document.querySelectorAll<HTMLElement>("[data-passage]")];
  return { top: passages.indexOf(this) <= passages.findIndex((passage) => passage.dataset.passage === reading) ? 0 : 10_000 } as DOMRect;
});

afterEach(async () => {
  for (const close of closing.splice(0)) await close();
  motion.matches = false;
  reading = "Home";
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
  const settled = () => act(async () => {
    for (let turn = 0; turn < 8; turn += 1) await runtime.runPromise(Effect.yieldNow);
  });
  await settled();
  const until = (ok: (demo: Demo) => boolean) => act(() => runtime.runPromise(Effect.flatMap(Machine, (machine) => Stream.runHead(Stream.filter(machine.changes, ok)))));
  const later = async (ms: number, ok: (demo: Demo) => boolean = () => true) => {
    await act(() => runtime.runPromise(TestClock.adjust(ms)));
    await until(ok);
  };
  const state = () => runtime.runPromise(Effect.flatMap(Machine, (machine) => machine.get()));
  const scroll = async (scene: Demo["scene"]) => {
    reading = scene;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    await until((demo) => demo.scene === scene);
    await settled();
  };
  return { until, later, state, scroll, settled };
}

const phone = () => document.querySelector('[role="img"][aria-label^="An Alpha phone"]')!;

const says = (text: string) => (phone().textContent ?? "").includes(text);

const at = (demo: Demo) => [demo.scene, demo.beat, demo.whole];

const text = () => [says("Text Priya I’m running 10 minutes late"), phone().querySelector("[data-typing]") !== null, says("Running about 10 minutes late."), says("Cancel"), phone().querySelector("[data-touch]") !== null, says("I’ll tell you when she replies.")];

describe('Walk through what Alpha does (spec/site/index.md, "Story: Walk through what Alpha does")', () => {
  it('opens on Home, asks its four questions in the Ask Alpha bar and starts over (spec/site/index.md, "The phone shows Home, the calendar, a text, a map, the inbox and a spoken note, each staged in beats")', async () => {
    const { later, state } = await open();
    // spec/site/index.md, "When the page opens the phone is on Home, shown whole for a visitor who asks for less motion"
    expect([at(await state()), says("Ask Alpha"), phone().querySelector("[data-sheet]")?.getAttribute("data-sheet")]).toEqual([["Home", 0, false], true, "closed"]);
    const asked: unknown[] = [];
    for (const [beat, ms] of [[1, 1_600], [2, 3_000], [3, 3_000], [4, 3_000]]) {
      await later(ms, (demo) => demo.beat === beat);
      asked.push(phone().querySelector("[data-question]")?.textContent);
    }
    expect(asked).toEqual(["What’s on my calendar today?", "Text Priya I’m running late", "Coffee near lunch?", "What needs me in my inbox?"]);
    // spec/site/index.md, "A beat moves on once its time has come, Home starting over and every other scene resting on its last beat"
    await later(3_000, (demo) => demo.beat === 0);
    expect([at(await state()), says("Ask Alpha")]).toEqual([["Home", 0, false], true]);
  });

  it('shows the scene of the passage the visitor scrolls to, and sends the text only after the touch on Send (spec/site/index.md, "The phone shows the scene of the passage the visitor has reached, from its start")', async () => {
    const { later, state, scroll } = await open();
    await later(1_600, (demo) => demo.beat === 1);
    await scroll("Text");
    expect([at(await state()), phone().querySelector("[data-sheet]")?.getAttribute("data-sheet"), text()]).toEqual([["Text", 0, false], "open", [false, false, false, false, false, false]]);
    const seen: unknown[] = [];
    for (const [beat, ms] of [[1, 730], [2, 650], [3, 1_100], [4, 1_500], [5, 650], [6, 500]]) {
      await later(ms, (demo) => demo.beat === beat);
      seen.push(text());
    }
    expect(seen).toEqual([
      [true, false, false, false, false, false],
      [true, true, false, false, false, false],
      [true, false, true, true, false, false],
      [true, false, true, true, true, false],
      [true, false, true, false, false, false],
      [true, false, true, false, false, true],
    ]);
    // spec/site/index.md, "A beat moves on once its time has come, Home starting over and every other scene resting on its last beat"
    await later(60_000);
    expect(at(await state())).toEqual(["Text", 6, false]);
    await scroll("Calendar");
    expect([at(await state()), says("Running about 10 minutes late.")]).toEqual([["Calendar", 0, false], false]);
    await scroll("Home");
    expect([at(await state()), phone().querySelector("[data-sheet]")?.getAttribute("data-sheet")]).toEqual([["Home", 0, false], "closed"]);
  });

  it('shows each scene whole for a visitor who asks for less motion, and plays it from its start when they stop asking (spec/site/index.md, "A visitor who comes to ask for less motion has the scene shown whole, and one who stops asking sees it play from its start")', async () => {
    const { later, until, state, scroll, settled } = await open();
    await scroll("Text");
    await later(730, (demo) => demo.beat === 1);
    motion.matches = true;
    act(() => {
      motion.dispatchEvent(new Event("change"));
    });
    await until((demo) => demo.still);
    // spec/site/index.md, "A part of a scene shows from its beat on, the typing only during its own, and all but the typing when shown whole"
    expect([at(await state()), text()]).toEqual([["Text", 0, true], [true, false, true, false, false, true]]);
    await later(60_000);
    expect(at(await state())).toEqual(["Text", 0, true]);
    await scroll("Voice");
    expect([at(await state()), says("Take a note. The studio gate code is 4417."), says("Saved to Notes")]).toEqual([["Voice", 0, true], true, true]);
    motion.matches = false;
    act(() => {
      motion.dispatchEvent(new Event("change"));
    });
    await until((demo) => !demo.still);
    await settled();
    expect([at(await state()), says("Take a note."), says("Saved to Notes")]).toEqual([["Voice", 0, false], false, false]);
    await later(880, (demo) => demo.beat === 1);
    expect(says("Take a note.")).toBe(true);
  });

  it('rests on Home, whole, for a visitor who opens the page asking for less motion (spec/site/index.md, "When the page opens the phone is on Home, shown whole for a visitor who asks for less motion")', async () => {
    motion.matches = true;
    const { later, state } = await open();
    expect(at(await state())).toEqual(["Home", 0, true]);
    await later(60_000);
    expect([at(await state()), says("Ask Alpha"), phone().querySelector("[data-question]")]).toEqual([["Home", 0, true], true, null]);
  });

  it('answers the calendar, finds coffee, sums up the inbox and saves a spoken note, each to its last beat (spec/site/index.md, "The phone shows Home, the calendar, a text, a map, the inbox and a spoken note, each staged in beats")', async () => {
    const { later, scroll } = await open();
    const played: unknown[] = [];
    for (const [scene, beats, shown] of [
      ["Calendar", [730, 650, 1_100, 260, 220], ["Two things this afternoon.", "Lunch · Priya", "Video call"]],
      ["Maps", [730, 650, 1_100, 420, 200, 200, 200], ["Three within a five-minute walk.", "Fog & Filter", "Second Sun"]],
      ["Inbox", [730, 650, 1_200, 300, 260, 260, 500], ["Three need you. The other 41 can wait.", "Dana Okafor", "Draft replies"]],
      ["Voice", [880, 450, 450, 450, 450, 900], ["Listening", "is 4417.", "Saved to Notes"]],
    ] as const) {
      await scroll(scene);
      const before = shown.map(says);
      for (const [index, ms] of beats.entries()) await later(ms, (demo) => demo.beat === index + 1);
      played.push([scene, before.slice(1), shown.map(says), phone().querySelector("[data-typing]")]);
    }
    expect(played).toEqual([
      ["Calendar", [false, false], [true, true, true], null],
      ["Maps", [false, false], [true, true, true], null],
      ["Inbox", [false, false], [true, true, true], null],
      ["Voice", [false, false], [true, true, true], null],
    ]);
  });

  it('draws the page whole in its HTML, with Home on the phone and the way to GitHub, so it reads without its script (spec/site/index.md, "Before the page has opened the phone rests on Home")', async () => {
    const page = document.body.appendChild(document.createElement("div"));
    page.innerHTML = renderToString(<Site runtime={ManagedRuntime.make(Layer.provide(demo, browserPage))} />);
    const links = [...page.querySelectorAll("a")].filter((link) => link.textContent.includes("Get Alpha on GitHub")).map((link) => link.getAttribute("href"));
    expect([page.querySelector("h1")?.textContent, page.querySelectorAll("[data-passage]").length, page.querySelector("[data-scene]")?.getAttribute("data-scene"), links, (page.textContent ?? "").includes("Pixel 10a")]).toEqual(["Your phone.Your agent.", 6, "Home", ["https://github.com/eliza-research/alpha", "https://github.com/eliza-research/alpha"], true]);
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
    expect(mismatches).toEqual([]);
  });

  it('gives a beat told after a stall its full time, never running through beats at once (spec/site/index.md, "A beat moves on once its time has come, Home starting over and every other scene resting on its last beat")', async () => {
    const [paced, stalled] = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const told = yield* Machine;
      yield* told.send({ type: "start", now: 0, still: false });
      yield* told.send({ type: "show", scene: "Calendar", now: 0 });
      yield* told.send({ type: "tick", now: 800 });
      const first = (yield* told.get()).due;
      yield* told.send({ type: "tick", now: 100_000 });
      return [first, yield* told.get()] as const;
    }).pipe(Effect.provide(machine()))));
    expect([paced, stalled.beat, stalled.due]).toEqual([1_380, 2, 101_100]);
  });
});
