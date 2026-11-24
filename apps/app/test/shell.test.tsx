// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import type { Event as LayerEvent } from "../gen/app__shell__layers.ts";
import { closeAll, hardware, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const inert = () => document.querySelector("main > div")?.hasAttribute("inert");

describe("the shell", () => {
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
