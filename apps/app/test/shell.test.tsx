// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Focus } from "../gen/app__shell__focus.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import type { Event as LayerEvent } from "../gen/app__shell__layers.ts";
import { closeAll, drawn, hardware, later, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LandingPage } from "../src/shell/Landing.tsx";
import { land } from "../src/shell/landing.vibe";

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

    // spec/app/shell/focus.md, "Home's tiles show a focus ring only while the owner moves by keyboard; every other control, a field above all, shows its ring whenever it has focus"
    await drawn(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })));
    await until(alpha, alpha.runtime, Focus, (f) => f.keyboard);
    expect(document.documentElement.hasAttribute("data-alpha-keyboard")).toBe(true);
    await drawn(() => document.dispatchEvent(new Event("pointerdown")));
    await until(alpha, alpha.runtime, Focus, (f) => !f.keyboard);
    expect(document.documentElement.hasAttribute("data-alpha-keyboard")).toBe(false);
  });

  // spec/app/shell/gestures.md, "Story: Swipe the way the phone expects"
  it("Swipe the way the phone expects (spec/app/shell/gestures.md, \"Story: Swipe the way the phone expects\")", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    const swiped = (from: { x: number; y: number }, to: { x: number; y: number }) => drawn(() => {
      const page = document.querySelector("main");
      page?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, isPrimary: true, clientX: from.x, clientY: from.y }));
      page?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, isPrimary: true, clientX: to.x, clientY: to.y }));
    });
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");

    // spec/app/shell/gestures.md, "A swipe travels at least 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back": a short or mid-page swipe scrolls and changes nothing.
    await swiped({ x: 5, y: 300 }, { x: 40, y: 300 });
    await swiped({ x: 200, y: 300 }, { x: 300, y: 300 });
    expect((await alpha.runtime.runPromise(Shell.use((s) => s.get()))).trail).toEqual(["Notes"]);
    await swiped({ x: 5, y: 300 }, { x: 80, y: 300 });
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);

    // spec/app/shell/gestures.md, "On the launcher a pull down that Home allows opens Android's shade, and a swipe up from the bottom bar goes Home; nothing else is a swipe"
    await until(alpha, alpha.runtime, Canvas, (c) => c.mounted && c.launcher);
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
    const height = window.innerHeight;
    await swiped({ x: 200, y: Math.round(height / 2) }, { x: 200, y: Math.round(height / 2) - 100 });
    expect((await alpha.runtime.runPromise(Shell.use((s) => s.get()))).trail).toEqual(["Notes"]);
    await swiped({ x: 200, y: height - 10 }, { x: 200, y: height - 100 });
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
  });

  // spec/app/shell/index.md, "On Phone, Messages and Contacts the app's own bar stands in for Ask Alpha at rest, until Ask Alpha rises"
  it("Let Phone's own bar stand in for Ask Alpha at rest (spec/app/shell/index.md, \"On Phone, Messages and Contacts the app's own bar stands in for Ask Alpha at rest, until Ask Alpha rises\")", async () => {
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
    const { alpha } = await open(scene());
    await until(alpha, alpha.runtime, Canvas, (c) => c.mounted);

    // spec/app/shell/keyboard.md, "From 150% text a list and its item take one pane each and Calendar shows its day as an agenda; below it, a list splits from a 1000-point canvas, and Calendar shows as many 240-point day columns as fit beside its 76-point times, widened with the text, at most seven"
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    await drawn(() => window.dispatchEvent(new Event("resize")));
    await until(alpha, alpha.runtime, Canvas, (c) => c.canvasWidth === 1280 && c.split && c.days === 5);
    expect([document.documentElement.hasAttribute("data-alpha-split"), document.documentElement.hasAttribute("data-alpha-agenda")]).toEqual([true, false]);

    await drawn(() => { document.documentElement.style.fontSize = "150%"; });
    await until(alpha, alpha.runtime, Canvas, (c) => c.textScale === 150 && c.agenda && !c.split && c.days === 1);
    expect(["data-alpha-split", "data-alpha-agenda", "data-alpha-title-row"].map((mark) => document.documentElement.hasAttribute(mark))).toEqual([false, true, false]);

    // spec/app/shell/keyboard.md, "Above 150% text, larger than Alpha's own largest size, an app's header gives its title a row of its own under the way back and the screen's actions"
    await drawn(() => { document.documentElement.style.fontSize = "300%"; });
    await until(alpha, alpha.runtime, Canvas, (c) => c.textScale === 300);
    expect(document.documentElement.hasAttribute("data-alpha-title-row")).toBe(true);

    await drawn(() => { document.documentElement.style.fontSize = "100%"; });
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

  // spec/app/shell/landing.md, "Story: Come back to Alpha after authorizing a connection"
  it("Come back to Alpha after authorizing a connection (spec/app/shell/landing.md, \"Story: Come back to Alpha after authorizing a connection\")", () => {
    const state = "a".repeat(43);
    const page = document.body.appendChild(document.createElement("div"));
    const root = createRoot(page);
    const landed = (search: string) => {
      let cleaned = false;
      const { landing, href } = Effect.runSync(land(search, () => { cleaned = true; }));
      act(() => { root.render(<LandingPage message={landing.message} href={href} />); });
      return { cleaned, message: landing.message, link: page.querySelector("a")?.getAttribute("href") ?? undefined };
    };

    // spec/app/shell/landing.md, "The landing reads the return once, and cleans its address before it decides anything"; spec/app/shell/landing.md, "Only a well-formed return with exactly one result is handed back: one state of the right shape, a code or an error but never both, at most one of each, a description only beside an error, and no other key"
    expect(landed(`?state=${state}&code=4%2Fxyz`)).toEqual({ cleaned: true, message: "MessageContinue", link: `alphaphone://cloud-delegation?state=${state}&code=4%2Fxyz` });
    // spec/app/shell/landing.md, "The way back carries a code only for a code, and a denial only for an error without one": the provider's text never crosses.
    expect(landed(`?state=${state}&error=access_denied&error_description=The+user+said+no`)).toEqual({ cleaned: true, message: "MessageCancelled", link: `alphaphone://cloud-delegation?state=${state}&error=access_denied` });
    // spec/app/shell/landing.md, "Only an accepted return is offered a way back, and a rejected one never is"
    expect(landed(`?state=${state}&code=1&error=x`)).toEqual({ cleaned: true, message: "MessageInvalid", link: undefined });
    expect(landed(`?state=${state}&code=&error=access_denied`)).toEqual({ cleaned: true, message: "MessageInvalid", link: undefined });
    expect(landed(`?state=${state}&code=`)).toEqual({ cleaned: true, message: "MessageInvalid", link: undefined });
    expect(landed(`?state=${state}&error=`)).toEqual({ cleaned: true, message: "MessageInvalid", link: undefined });
    expect(landed(`?state=${state}&code=1&code=`)).toEqual({ cleaned: true, message: "MessageInvalid", link: undefined });
    expect(landed(`?state=short&code=1`)).toEqual({ cleaned: true, message: "MessageInvalid", link: undefined });
    expect(landed(`?state=${state}&code=1&next=evil`)).toEqual({ cleaned: true, message: "MessageInvalid", link: undefined });
    expect(landed("")).toEqual({ cleaned: true, message: "MessageReopened", link: undefined });
    act(() => { root.unmount(); });
    page.remove();
  });
});
