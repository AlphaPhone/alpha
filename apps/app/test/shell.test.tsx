// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Focus } from "../gen/app__shell__focus.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import type { Event as LayerEvent } from "../gen/app__shell__layers.ts";
import { closeAll, drawn, hardware, later, open, press, underAct, until } from "./alpha.tsx";
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

  // spec/app/shell/focus.md, "Story: Keep my place when the screen changes under me"
  it("Keep my place when the screen changes under me (spec/app/shell/focus.md, \"Story: Keep my place when the screen changes under me\")", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    const send = (event: LayerEvent) => alpha.runtime.runPromise(Layers.use((layers) => layers.send(event)));
    const focused = () => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent;
    const frames = async (ok: () => boolean) => {
      for (let frame = 0; frame < 13 && !ok(); frame += 1) await later(alpha, 16);
    };

    // spec/app/shell/focus.md, "A new screen is given focus within twelve frames, unless the owner has already moved it there"
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
    await frames(() => focused() === "Notes");
    expect([document.activeElement?.tagName, focused()]).toEqual(["H1", "Notes"]);

    // spec/app/shell/focus.md, "A layer that closes gives focus back to the control that opened it, never over a control that took it"
    await drawn(() => (document.querySelector("button[aria-label=Back]") as HTMLButtonElement).focus());
    await send({ type: "openLayer", id: "share", kind: "SheetLayer", covers: true });
    await until(alpha, alpha.runtime, Focus, (f) => f.openers.length === 1);
    await drawn(() => (document.activeElement as HTMLElement).blur());
    await hardware("back");
    await until(alpha, alpha.runtime, Focus, (f) => f.restores === 1);
    expect(focused()).toBe("Back");

    // spec/app/shell/focus.md, "Home's tiles and the drawer's apps show a focus ring only while the owner moves by keyboard; every other control, a field above all, shows its ring whenever it has focus"
    await drawn(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })));
    await until(alpha, alpha.runtime, Focus, (f) => f.keyboard);
    expect(document.documentElement.hasAttribute("data-alpha-keyboard")).toBe(true);
    await drawn(() => document.dispatchEvent(new Event("pointerdown")));
    await until(alpha, alpha.runtime, Focus, (f) => !f.keyboard);
    expect(document.documentElement.hasAttribute("data-alpha-keyboard")).toBe(false);
  });
});
