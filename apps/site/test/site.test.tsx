// @vitest-environment happy-dom
import documents from "@repo/deployment/alpha-legal.json" with { type: "json" };
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { TestClock } from "effect/testing";
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { Machine, machine } from "../gen/site.effect.vibe";
import { type Demo, beats } from "../gen/site.ts";
import { LegalPage, policyAt } from "../src/Legal.tsx";
import { Site } from "../src/Site.tsx";
import { demo } from "../src/demo.vibe";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const closing: (() => Promise<void>)[] = [];

describe(`Read Alpha Cloud policies (spec/site/index.md, "Story: Read Alpha Cloud's policies")`, () => {
  it("reads each document's full text and links at its own address, without JavaScript", () => {
    for (const { path, document: approved, links: external } of [
      { path: "/terms", document: documents.terms, links: ["https://maps.google.com/help/terms_maps/", "https://policies.google.com/privacy"] },
      { path: "/privacy", document: documents.privacy, links: ["https://developers.google.com/terms/api-services-user-data-policy", "https://myaccount.google.com/connections"] },
    ]) {
      const policy = policyAt(path);
      if (!policy) throw new Error(`No public policy at ${path}`);
      const opened = document.createElement("div");
      opened.innerHTML = renderToString(<LegalPage page={policy} />);
      const article = opened.querySelector("article");
      const sections = [...(article?.querySelectorAll("section") ?? [])].map((section) => ({
        title: section.querySelector("h2")?.textContent,
        paragraphs: [...section.querySelectorAll("p")].map((paragraph) => paragraph.textContent),
      }));
      expect({ title: article?.querySelector("h1")?.textContent, revision: article?.querySelector("time")?.dateTime, sections }).toEqual(approved);
      expect([...(article?.querySelectorAll("a") ?? [])].map((link) => link.getAttribute("href"))).toEqual(external);
      expect(opened.querySelector('a[href="/"]')).toBeTruthy();
    }
  });
});

afterEach(async () => {
  for (const close of closing.splice(0)) await close();
});

async function open() {
  const runtime = ManagedRuntime.make(Layer.provideMerge(demo, TestClock.layer()));
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
    await settled();
  };
  const state = () => runtime.runPromise(Effect.flatMap(Machine, (machine) => machine.get()));
  const through = async (scene: Demo["scene"], seen: () => unknown = () => undefined) => {
    const shown: unknown[] = [];
    for (const [beat, ms] of beats(scene).entries()) {
      shown.push(seen());
      await later(ms, (demo) => demo.scene !== scene || demo.beat !== beat);
    }
    return shown;
  };
  return { state, through };
}

const phone = () => document.querySelector('[role="img"][aria-label^="An Alpha phone"]')!;

const says = (text: string) => (phone().textContent ?? "").includes(text);

const has = (mark: string) => phone().querySelector(`[data-${mark}]`) !== null;

const sheet = () => phone().querySelector("[data-sheet]")?.getAttribute("data-sheet");

const on = () => phone().getAttribute("data-screen");

const typed = () => phone().querySelector("[data-draft]")?.textContent ?? "";

const at = (demo: Demo) => [demo.scene, demo.beat];

describe('Walk through what Alpha does (spec/site/index.md, "Story: Walk through what Alpha does")', () => {
  it('opens on Home, types a question in the Ask Alpha bar and opens the conversation on the day (spec/site/index.md, "The phone plays nine scenes, each staged in beats")', async () => {
    const { state, through } = await open();
    // spec/site/index.md, "When the page opens the phone is on Home and starts to play"
    expect([at(await state()), on(), says("Ask Alpha"), sheet()]).toEqual([["Home", 0], "Home", true, "closed"]);
    expect(await through("Home", typed)).toEqual(["", "What’s on today?"]);
    const day = () => [sheet(), typed(), says("What’s on today?"), has("typing"), says("Two things this afternoon."), says("Lunch · Priya"), says("Video call")];
    expect(await through("Day", day)).toEqual([
      ["open", "", true, false, false, false, false],
      ["open", "", true, true, false, false, false],
      ["open", "", true, false, true, false, false],
      ["open", "", true, false, true, true, false],
      ["open", "", true, false, true, true, true],
    ]);
    // spec/site/index.md, "A beat moves on once its time has come, and a scene's last beat leads to the next scene, the spoken note back to Home"
    expect(at(await state())).toEqual(["Coffee", 0]);
  });

  it('finds coffee under the day, opens the place in Maps as the conversation closes, and opens its menu in the Browser from the bar (spec/site/index.md, "Each scene plays on Home, in Maps, in the Browser or in the Inbox")', async () => {
    const { through } = await open();
    await through("Home");
    await through("Day");
    // spec/site/index.md, "The conversation is open for the day, the coffee and the mail, and keeps what was said while it is open and as it closes"
    const coffee = () => [on(), sheet(), typed(), has("typing"), says("Three within a five-minute walk."), says("Second Sun"), has("touch"), says("Two things this afternoon.")];
    expect(await through("Coffee", coffee)).toEqual([
      ["Home", "open", "Coffee near lunch?", false, false, false, false, true],
      ["Home", "open", "", false, false, false, false, true],
      ["Home", "open", "", true, false, false, false, true],
      ["Home", "open", "", false, true, false, false, true],
      ["Home", "open", "", false, true, false, false, true],
      ["Home", "open", "", false, true, false, false, true],
      ["Home", "open", "", false, true, true, false, true],
      ["Home", "open", "", false, true, true, true, true],
    ]);
    const maps = () => [on(), sheet(), says("Directions"), typed(), says("Opening their menu"), says("Three within a five-minute walk.")];
    expect(await through("Maps", maps)).toEqual([
      ["Maps", "closed", false, "", false, true],
      ["Maps", "closed", true, "", false, true],
      ["Maps", "closed", true, "Show me their menu", false, true],
      ["Maps", "closed", true, "", true, true],
    ]);
    const menu = () => [on(), sheet(), says("Opening their menu"), says("Flat white"), says("Opened their menu"), says("Three within a five-minute walk.")];
    expect(await through("Menu", menu)).toEqual([
      ["Menu", "closed", true, false, false, false],
      ["Menu", "closed", false, true, true, false],
    ]);
  });

  it('opens the Inbox from Home, sums it up there, and sends the reply only after the touch on Send (spec/site/index.md, "A part of a scene shows from its beat on, a part of a kept scene whole, and what passes only during its beats")', async () => {
    const { through } = await open();
    for (const scene of ["Home", "Day", "Coffee", "Maps", "Menu"] as const) await through(scene);
    expect(await through("Apps", () => [on(), has("touch")])).toEqual([["Home", false], ["Home", true]]);
    expect(await through("Inbox", () => [on(), sheet(), typed()])).toEqual([["Inbox", "closed", ""], ["Inbox", "closed", ""], ["Inbox", "closed", "What needs me?"]]);
    const mail = () => [sheet(), has("typing"), says("Three need you. The other 41 can wait."), says("Draft replies"), says("Both changes work for me."), says("Cancel"), has("touch"), has("sent")];
    expect(await through("Mail", mail)).toEqual([
      ["open", false, false, false, false, false, false, false],
      ["open", true, false, false, false, false, false, false],
      ["open", false, true, false, false, false, false, false],
      ["open", false, true, false, false, false, false, false],
      ["open", false, true, false, false, false, false, false],
      ["open", false, true, true, false, false, false, false],
      ["open", false, true, true, false, false, true, false],
      ["open", true, true, true, false, false, false, false],
      ["open", false, true, true, true, true, false, false],
      ["open", false, true, true, true, true, true, false],
      ["open", false, true, true, true, false, false, true],
    ]);
  });

  it('saves a spoken note as the conversation closes and comes round to Home with the conversation empty (spec/site/index.md, "A beat moves on once its time has come, and a scene\'s last beat leads to the next scene, the spoken note back to Home")', async () => {
    const { state, through } = await open();
    for (const scene of ["Home", "Day", "Coffee", "Maps", "Menu", "Apps", "Inbox", "Mail"] as const) await through(scene);
    const note = await through("Note", () => [on(), sheet(), has("touch"), says("Listening"), says("is 4417."), says("Saved to Notes"), says("Three need you.")]);
    expect([note[0], note[1], note.at(-1)]).toEqual([
      ["Inbox", "closed", true, false, false, false, true],
      ["Inbox", "closed", false, true, false, false, true],
      ["Inbox", "closed", false, true, true, true, true],
    ]);
    expect([at(await state()), on(), sheet(), says("Ask Alpha"), says("Three need you."), says("Saved to Notes")]).toEqual([["Home", 0], "Home", "closed", true, false, false]);
  });

  it('draws the page whole in its HTML, with Home on the phone and the way to GitHub, so it reads without its script (spec/site/index.md, "Before the page has opened the phone rests on Home")', async () => {
    const page = document.body.appendChild(document.createElement("div"));
    page.innerHTML = renderToString(<Site runtime={ManagedRuntime.make(demo)} />);
    const links = [...page.querySelectorAll("a")].filter((link) => link.textContent.includes("Get Alpha on GitHub")).map((link) => link.getAttribute("href"));
    expect([page.querySelector("h1")?.textContent, page.querySelector("[data-scene]")?.getAttribute("data-scene"), links, (page.textContent ?? "").includes("Pixel 10a")]).toEqual(["Your phone.Your agent.", "Home", ["https://github.com/eliza-research/alpha"], true]);
    const runtime = ManagedRuntime.make(Layer.provideMerge(demo, TestClock.layer()));
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

  it('gives a beat told after a stall its full time, never running through beats at once (spec/site/index.md, "A beat moves on once its time has come, and a scene\'s last beat leads to the next scene, the spoken note back to Home")', async () => {
    const [paced, stalled] = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const told = yield* Machine;
      yield* told.send({ type: "start", now: 0 });
      yield* told.send({ type: "tick", now: 1_500 });
      const first = (yield* told.get()).due;
      yield* told.send({ type: "tick", now: 100_000 });
      return [first, yield* told.get()] as const;
    }).pipe(Effect.provide(machine()))));
    expect([paced, stalled.scene, stalled.beat, stalled.due]).toEqual([2_700, "Day", 0, 100_600]);
  });
});
