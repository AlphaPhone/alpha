// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import type { Event as LayerEvent } from "../gen/app__shell__layers.ts";
import { Machine as Notices } from "../gen/app__shell__notices.effect.vibe";
import { keep, say } from "../src/shell/notices.vibe";
import { button, closeAll, hardware, later, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const toast = () => document.querySelector("[role=status] button")?.textContent;
const inert = () => document.querySelector("main > div")?.hasAttribute("inert");

describe("the shell", () => {
  // spec/app/shell/notices.md, "Story: Read what just happened, at my own pace"; spec/app/shell/notices.md, "Story: Keep what I must not miss"
  it("Read what just happened, at my own pace (spec/app/shell/notices.md, \"Story: Read what just happened, at my own pace\"; spec/app/shell/notices.md, \"Story: Keep what I must not miss\")", async () => {
    const { alpha } = await open(scene());
    let undone = 0;

    // spec/app/shell/notices.md, "A toast's time is fixed when it appears, from its length and kind and the scale: an Undo ten seconds at least, any other toast between 1.9 and 12 seconds, at fifty milliseconds a character and half a second more"
    await alpha.runtime.runPromise(say("Saved"));
    await until(alpha, alpha.runtime, Notices, (n) => n.shown.message === "Saved");
    expect(toast()).toBe("Saved");

    // spec/app/shell/notices.md, "A toast waits its turn, except that an Undo or a failure takes the place of a passive toast; a passive toast waiting last gives its place to the next passive one, and a toast the same as the last one waiting is not queued again"
    await alpha.runtime.runPromise(say("Deleted Lunch", { undo: Effect.sync(() => { undone += 1; }) }));
    await until(alpha, alpha.runtime, Notices, (n) => n.shown.message === "Deleted Lunch");
    await alpha.runtime.runPromise(say("Couldn't share", { failure: true }));
    await later(alpha, 9_000);
    expect(toast()).toBe("Deleted Lunch");

    // spec/app/shell/notices.md, "A toast leaves when its time is up, when its Undo is taken, or when the owner dismisses it, and the next one takes its place"
    await press("Undo");
    await until(alpha, alpha.runtime, Notices, (n) => n.shown.message === "Couldn't share");
    expect([undone, document.querySelector("[role=status]")?.getAttribute("aria-live")]).toEqual([1, "assertive"]);
    await later(alpha, 2_000);
    await until(alpha, alpha.runtime, Notices, (n) => n.shown.message === "");

    // spec/app/shell/notices.md, "A kept notice is announced once as a failure and listed until it is dismissed; at most three are listed, each once, and a fourth pushes out the oldest"
    await alpha.runtime.runPromise(keep("Your recording was not saved"));
    await until(alpha, alpha.runtime, Notices, (n) => n.kept.length === 1);
    await later(alpha, 12_000);
    await until(alpha, alpha.runtime, Notices, (n) => n.shown.message === "");
    expect(Boolean(button("Dismiss Your recording was not saved"))).toBe(true);
    await press("Dismiss Your recording was not saved");
    await until(alpha, alpha.runtime, Notices, (n) => n.kept.length === 0);
  });

  // spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
  it("Keep a sheet or a dialog above the phone (spec/app/shell/layers.md, \"Story: Keep a sheet or a dialog above the phone\")", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    const send = (event: LayerEvent) => alpha.runtime.runPromise(Layers.use((layers) => layers.send(event)));

    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");

    // spec/app/shell/layers.md, "The page under a layer or a hold takes no touch, and a covering layer or a hold takes none for Ask Alpha either"
    await send({ type: "openLayer", id: "share", kind: "SheetLayer", covers: true });
    await until(alpha, alpha.runtime, Layers, (l) => l.open.length === 1);
    expect(inert()).toBe(true);

    // spec/app/shell/layers.md, "Back closes the layer on top, and nothing under it"
    await hardware("back");
    await until(alpha, alpha.runtime, Layers, (l) => l.open.length === 0);
    expect([inert(), (await alpha.runtime.runPromise(Shell.use((s) => s.get()))).trail]).toEqual([false, ["Notes"]]);

    // spec/app/shell/layers.md, "Back goes first to the layer on top; with no layer, a held phone takes Back and Home and closes nothing; then a screen with a step of its own takes Back; otherwise the shell takes them"
    await send({ type: "hold", id: "update" });
    await hardware("back");
    await hardware("home");
    expect((await alpha.runtime.runPromise(Shell.use((s) => s.get()))).trail).toEqual(["Notes"]);
    await send({ type: "release", id: "update" });

    // spec/app/shell/layers.md, "Home closes every layer, unless the phone is held"
    await send({ type: "openLayer", id: "menu", kind: "MenuLayer", covers: false });
    await hardware("home");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    expect((await alpha.runtime.runPromise(Layers.use((l) => l.get()))).open).toEqual([]);
  });
});
