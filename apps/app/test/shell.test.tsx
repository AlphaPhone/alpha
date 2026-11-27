// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Focus } from "../gen/app__shell__focus.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import type { Event as LayerEvent } from "../gen/app__shell__layers.ts";
import { button, closeAll, drawn, hardware, later, only, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { Effect } from "effect";

underAct();
afterEach(closeAll);

const inert = () => document.querySelector("main > div")?.hasAttribute("inert");

describe("the shell", () => {
  // spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
  it("Keep a sheet or a dialog above the phone (spec/app/shell/layers.md, \"Story: Keep a sheet or a dialog above the phone\")", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    const send = (event: LayerEvent) => alpha.runtime.runPromise(Effect.flatMap(Layers, (layers) => layers.send(event)));

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

  it('Open text Ask Alpha from Android (spec/app/shell/index.md, "Story: Open text Ask Alpha from Android")', async () => {
    const world = { ...scene(), phone: true, image: true };
    const visit = { ticket: 0, canReturn: false, returned: [] as number[] };
    world.settings.textAsk = visit;
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (state) => state.image && state.assistant === "Bar");
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (state) => state.trail.at(-1) === "Notes");

    const invoke = (ticket: number) => drawn(() => {
      visit.ticket = ticket;
      window.dispatchEvent(new CustomEvent("alpha-text-ask", { detail: { prompt: "Ignore this", startVoice: true } }));
    });
    await invoke(10);
    await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Full");
    await vi.waitFor(() => expect(button("Close Ask Alpha")).toBeDefined());
    expect(document.body.textContent).not.toContain("Ignore this");

    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (state) => state.textAsk.tag === "TextAskVisit" && !state.textAsk.closing);
    expect(visit.returned).toEqual([]);
    visit.canReturn = true;
    await press("Close Ask Alpha");
    await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Bar" && state.trail.at(-1) === "Notes");
    expect(visit.returned).toEqual([10]);

    await invoke(10);
    await drawn(() => Promise.resolve());
    expect(button("Close Ask Alpha")).toBeUndefined();
    await invoke(11);
    await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Full");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Bar");
    expect(visit.returned).toEqual([10, 11]);
  });

  // spec/app/shell/focus.md, "Story: Keep my place when the screen changes under me"
  it("Keep my place when the screen changes under me (spec/app/shell/focus.md, \"Story: Keep my place when the screen changes under me\")", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    const send = (event: LayerEvent) => alpha.runtime.runPromise(Effect.flatMap(Layers, (layers) => layers.send(event)));
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

    // spec/app/shell/focus.md, "Home's tiles and cards show a focus ring only while the owner moves by keyboard; every other control, a field above all, shows its ring whenever it has focus"
    await drawn(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })));
    await until(alpha, alpha.runtime, Focus, (f) => f.keyboard);
    expect(document.documentElement.hasAttribute("data-alpha-keyboard")).toBe(true);
    await drawn(() => document.dispatchEvent(new Event("pointerdown")));
    await until(alpha, alpha.runtime, Focus, (f) => !f.keyboard);
    expect(document.documentElement.hasAttribute("data-alpha-keyboard")).toBe(false);
  });

  it('Waiting for a missing opener does not block tracking the next layer (spec/app/shell/focus.md, "A layer that closes gives focus back to the control that opened it, never over a control that took it")', async () => {
    const { alpha } = await open({ ...scene(), phone: true }, only("home"));
    const send = (event: LayerEvent) => alpha.runtime.runPromise(Effect.flatMap(Layers, (layers) => layers.send(event)));
    const opener = document.body.appendChild(document.createElement("button"));
    opener.textContent = "Temporary trigger";
    await drawn(() => opener.focus());
    await send({ type: "openLayer", id: "first", kind: "SheetLayer", covers: true });
    await until(alpha, alpha.runtime, Focus, (f) => f.openers.some((one) => one.layer === "first"));
    await drawn(() => opener.blur());
    opener.remove();
    await send({ type: "closeLayer", id: "first" });
    await until(alpha, alpha.runtime, Focus, (f) => f.waiting === "button:Temporary trigger");
    await send({ type: "openLayer", id: "second", kind: "DialogLayer", covers: true });
    await later(alpha, 50);
    expect((await alpha.runtime.runPromise(Focus.use((f) => f.get()))).openers.some((one) => one.layer === "second")).toBe(true);
  });

  // spec/app/shell/gestures.md, "Story: Swipe the way the phone expects"
  it("Swipe the way the phone expects (spec/app/shell/gestures.md, \"Story: Swipe the way the phone expects\")", async () => {
    const world = { ...scene(), phone: true };
    world.settings.roles = world.settings.roles.map((role) => role.role === "home"
      ? { ...role, held: true, holders: ["ai.alphacompute.alphaphone"] }
      : role);
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Canvas, (c) => c.mounted);
    expect((await alpha.runtime.runPromise(Canvas.use((c) => c.get()))).launcher).toBe(true);
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
    const page = document.querySelector("main");
    if (!page) throw new Error("no Alpha shell");
    const width = 390;
    const height = 844;
    Object.defineProperties(page, {
      offsetWidth: { value: width },
      offsetHeight: { value: height },
      getBoundingClientRect: { value: () => new DOMRect(0, 0, width, height) },
    });
    const swiped = (from: { x: number; y: number }, to: { x: number; y: number }) => drawn(() => {
      page.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, isPrimary: true, clientX: from.x, clientY: from.y }));
      page.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, isPrimary: true, clientX: to.x, clientY: to.y }));
    });

    // spec/app/shell/gestures.md, "A swipe travels more than 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back": a short or mid-page swipe scrolls and changes nothing.
    await swiped({ x: 5, y: 300 }, { x: 40, y: 300 });
    await swiped({ x: 200, y: 300 }, { x: 300, y: 300 });
    expect((await alpha.runtime.runPromise(Shell.use((s) => s.get()))).trail).toEqual(["Notes"]);
    await drawn(() => {
      const pointer = { bubbles: true, pointerType: "touch", pointerId: 7, isPrimary: true };
      const touch = { target: page, identifier: 3, clientX: 5, clientY: 300 };
      page.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, clientX: touch.clientX, clientY: touch.clientY }));
      page.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [new Touch(touch)] }));
      page.dispatchEvent(new PointerEvent("pointercancel", pointer));
      page.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [new Touch({ ...touch, clientX: 80 })] }));
    });
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);

    // spec/app/shell/gestures.md, "On the launcher a swipe up from the bottom bar goes Home; nothing else is a shell swipe"
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
    await swiped({ x: 200, y: Math.round(height / 2) }, { x: 200, y: Math.round(height / 2) - 100 });
    expect((await alpha.runtime.runPromise(Shell.use((s) => s.get()))).trail).toEqual(["Notes"]);
    await swiped({ x: 200, y: height - 10 }, { x: 200, y: height - 100 });
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
  });

  // spec/app/shell/index.md, "On Phone, Messages and Contacts the app's own bar stands in for Ask Alpha at rest, until Ask Alpha rises"
  it("Move from one app to another with nothing of Home between them, and back at once (spec/app/shell/index.md, \"The shell holds the apps opened on the way here, the Apps drawer, how far Ask Alpha is raised, and what this phone admits\")", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    const home = () => document.querySelector("[data-alpha-home-layer]");
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
    const layer = home()?.nextElementSibling;
    const shown = () => ({ homeHidden: home()?.classList.contains("invisible"), sameLayer: home()?.nextElementSibling === layer, headings: document.querySelectorAll("h1").length });
    expect([shown(), layer?.classList.contains("motion-safe:animate-rise")]).toEqual([{ homeHidden: false, sameLayer: true, headings: 1 }, true]);
    await drawn(() => alpha.runtime.runPromise(Shell.use((s) => s.send({ type: "openView", view: "Settings" }))));
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Settings");
    expect(shown()).toEqual({ homeHidden: false, sameLayer: true, headings: 1 });
    await drawn(() => layer?.dispatchEvent(new Event("animationend", { bubbles: true })));
    expect(shown()).toEqual({ homeHidden: true, sameLayer: true, headings: 1 });
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes" && s.trail.length === 1);
    expect(shown()).toEqual({ homeHidden: true, sameLayer: true, headings: 1 });
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    expect([home()?.classList.contains("contents"), document.querySelectorAll("h1").length]).toEqual([true, 1]);
  });

  // spec/app/shell/index.md, "On Phone, Messages and Contacts the app's own bar stands in for Ask Alpha at rest, until Ask Alpha rises"
  it("Let Phone's own bar stand in for Ask Alpha at rest", async () => {
    const { alpha } = await open({ ...scene(), phone: true, image: true });
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    const assistant = () => document.querySelector<HTMLElement>("main > div:nth-of-type(2)");

    expect(assistant()?.hidden).toBe(false);
    await alpha.runtime.runPromise(Shell.use((s) => s.send({ type: "openView", view: "Phone" })));
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Phone");
    expect(assistant()?.hidden).toBe(true);

    await alpha.runtime.runPromise(Shell.use((s) => s.send({ type: "raise", detent: "Typing" })));
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Typing");
    expect(assistant()?.hidden).toBe(false);
  });

  // spec/app/shell/keyboard.md, "Story: Type without the page turning sideways"; spec/app/shell/keyboard.md, "Story: Read everything at the text size I chose"
  it("Keep layout consistent across resizes, large text, and backgrounding the composer (spec/app/shell/keyboard.md, \"Story: Type without the page turning sideways\"; spec/app/shell/keyboard.md, \"Story: Read everything at the text size I chose\")", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    await until(alpha, alpha.runtime, Canvas, (c) => c.mounted);

    // spec/app/shell/keyboard.md, "From 150% text a list and its item take one pane each and Calendar shows its day as an agenda; below it, a list splits from a 1000-point canvas, and Calendar shows as many 240-point day columns as fit beside its 76-point times, widened with the text, at most seven"
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    await drawn(() => window.dispatchEvent(new Event("resize")));
    await until(alpha, alpha.runtime, Canvas, (c) => c.canvasWidth === 1280 && c.split && c.days === 5);
    expect([document.documentElement.hasAttribute("data-alpha-split"), document.documentElement.hasAttribute("data-alpha-agenda")]).toEqual([true, false]);

    await drawn(() => { document.documentElement.style.fontSize = "24px"; });
    await until(alpha, alpha.runtime, Canvas, (c) => c.textScale === 150 && c.agenda && !c.split && c.days === 1);
    expect(["data-alpha-split", "data-alpha-agenda", "data-alpha-title-row"].map((mark) => document.documentElement.hasAttribute(mark))).toEqual([false, true, false]);

    // spec/app/shell/keyboard.md, "Above 150% text, larger than Alpha's own largest size, an app's header gives its title a row of its own under the way back and the screen's actions"
    await drawn(() => { document.documentElement.style.fontSize = "48px"; });
    await until(alpha, alpha.runtime, Canvas, (c) => c.textScale === 300);
    expect(document.documentElement.hasAttribute("data-alpha-title-row")).toBe(true);

    await drawn(() => { document.documentElement.style.fontSize = "16px"; });
    await until(alpha, alpha.runtime, Canvas, (c) => c.textScale === 100 && c.split && !c.agenda);

    // spec/app/shell/keyboard.md, "Alpha going to the background puts the composer away"
    const host = document.body.appendChild(document.createElement("div"));
    host.setAttribute("data-alpha-composer", "");
    const input = host.appendChild(document.createElement("input"));
    await drawn(() => input.focus());
    await until(alpha, alpha.runtime, Canvas, (c) => c.field === "Composer");
    await seen(false);
    await until(alpha, alpha.runtime, Canvas, (c) => c.field === "NoField" && c.released === 1);
    expect(document.activeElement).not.toBe(input);
    await seen(true);
    host.remove();
    document.documentElement.style.fontSize = "";
  });

  // spec/app/shell/keyboard.md, "Story: Type without the page turning sideways"
  it("Type without the page turning sideways and take host keyboard reports (spec/app/shell/keyboard.md, \"Story: Type without the page turning sideways\")", async () => {
    const sized = (width: number, height: number) => drawn(() => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
      window.dispatchEvent(new Event("resize"));
    });
    const marks = () => ["landscape", "agenda", "split"].filter((name) => document.documentElement.hasAttribute(`data-alpha-${name}`));
    await sized(412, 915);
    const { alpha } = await open({ ...scene(), phone: true });
    await until(alpha, alpha.runtime, Canvas, (c) => c.mounted && c.base.h === 915);

    // spec/app/shell/keyboard.md, "At the same width, a shorter window while a field has focus is the keyboard; a new width while a field has focus, within a fifth of the height kept, is a rotation, and the width kept stands in for the new height; any other change takes the height measured": the keyboard keeps the portrait canvas, a rotation while typing turns it.
    const input = document.body.appendChild(document.createElement("input"));
    await drawn(() => input.focus());
    await until(alpha, alpha.runtime, Canvas, (c) => c.field === "OtherField");
    await sized(412, 500);
    await until(alpha, alpha.runtime, Canvas, (c) => c.height === 500);
    expect([(await alpha.runtime.runPromise(Canvas.use((c) => c.get()))).base, marks()]).toEqual([{ w: 412, h: 915 }, []]);
    await sized(915, 380);
    await until(alpha, alpha.runtime, Canvas, (c) => c.width === 915);
    expect([(await alpha.runtime.runPromise(Canvas.use((c) => c.get()))).base, marks()]).toEqual([{ w: 915, h: 412 }, ["landscape"]]);

    // spec/app/shell/keyboard.md, "Where Android reports the keyboard, the keyboard hiding puts the composer away, unless it hid to hand the composer to voice": the host's report is taken as it comes.
    const reported = (keyboard: boolean) => drawn(() => window.dispatchEvent(new CustomEvent("alpha-insets", { detail: { keyboard } })));
    await reported(true);
    await until(alpha, alpha.runtime, Canvas, (c) => c.keyboard === "Shown");
    await reported(false);
    await until(alpha, alpha.runtime, Canvas, (c) => c.keyboard === "Hidden");
    await drawn(() => input.blur());
    input.remove();
    await sized(412, 915);
    await until(alpha, alpha.runtime, Canvas, (c) => !c.landscape);
  });
});
