import { Effect, Stream } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import { closeAllDocks, mountDock } from "./dock-support.tsx";
import "../src/main.css";

afterEach(closeAllDocks);

describe("Ask Alpha dock", () => {
  // spec/app/assistant/dock.md, "Focusing the composer on the bar raises Ask Alpha to typing"; spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("Drag the Browser composer (spec/app/assistant/dock.md, \"An empty Browser composer can start a drag without taking focus\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Browser" });

    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const beforeTextarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    expect(section?.hasAttribute("data-host-chrome")).toBe(true);
    expect(document.querySelector("header[data-host-chrome]")).not.toBeNull();
    expect(beforeTextarea).not.toBeNull();

    let touchDefaultPrevented = true;
    let pointerDefaultPrevented = true;
    const onTouchStart = (event: Event) => { touchDefaultPrevented = event.defaultPrevented; };
    const onPointerDown = (event: Event) => { pointerDefaultPrevented = event.defaultPrevented; };
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("pointerdown", onPointerDown);
    try {
      beforeTextarea?.dispatchEvent(new Event("touchstart", { bubbles: true, cancelable: true }));
      beforeTextarea?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "touch", pointerId: 1 }));
      beforeTextarea?.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerType: "touch", pointerId: 1 }));
    } finally {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("pointerdown", onPointerDown);
    }
    expect([touchDefaultPrevented, pointerDefaultPrevented]).toEqual([false, false]);

    const textarea = page.getByRole("textbox", { name: "Message Alpha" });
    await expect.element(textarea).toBeVisible();
    const bounds = textarea.element().getBoundingClientRect();
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: textarea },
      { coords: { x, y: y - 45 } },
      { keys: "[/MouseLeft]", coords: { x, y: y - 180 } },
    ]);
    const assistant = page.getByRole("region", { name: "Ask Alpha" });
    await expect.element(assistant).toHaveAttribute("data-alpha-detent", "sheet");
    await expect.element(textarea).not.toHaveFocus();
    expect(textarea.element()).toBe(beforeTextarea);

    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    await expect.element(assistant).toHaveAttribute("data-alpha-detent", "bar");
    await textarea.click();

    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Typing"))));
    await runtime.runPromise(Effect.flatMap(Canvas, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));

    const afterTextarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(afterTextarea).toBe(beforeTextarea);
    expect(document.activeElement).toBe(beforeTextarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");

    await page.getByRole("button", { name: "Open conversation" }).click();
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));

    // spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentOpenView", view: "Calendar" })));
    const afterAgentNav = await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentNav.trail.at(-1), afterAgentNav.assistant]).toEqual(["Calendar", "Sheet"]);

    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentGoHome" })));
    const afterAgentHome = await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentHome.trail, afterAgentHome.assistant]).toEqual([[], "Sheet"]);
  });

  // spec/app/assistant/dock.md, "A tap of Alpha's mark opens the sheet, and a tap of the open sheet's handle fills the screen"; spec/app/assistant/dock.md, "A press that did not move taps its control once"
  it("The dock mark opens Sheet without the keyboard on click and touch (spec/app/assistant/dock.md, \"A tap of Alpha's mark opens the sheet, and a tap of the open sheet's handle fills the screen\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Browser" });

    await page.getByRole("button", { name: "Open conversation" }).click();
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.activeElement).not.toBe(document.querySelector("textarea[data-alpha-composer]"));

    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar"))));
    (document.activeElement as HTMLElement | null)?.blur();

    const grabber = document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']");
    expect(grabber).not.toBeNull();
    grabber?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 760, pointerId: 2, pointerType: "touch", isPrimary: true }));
    grabber?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 760, pointerId: 2, pointerType: "touch", isPrimary: true }));
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.activeElement).not.toBe(document.querySelector("textarea[data-alpha-composer]"));
  });
  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"; spec/app/assistant/dock.md, "A released drag lands on the bar, a sheet at a height, or the full screen"
  it("Drag Ask Alpha up from anywhere on its resting bar (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Home" });
    const field = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    const finger = (type: string, target: Element | null | undefined, clientY: number) =>
      target?.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY, pointerId: 3, pointerType: "touch", isPrimary: true }));

    // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": a drag that starts on the bar's field carries Ask Alpha to the full screen, though the field lets go of the touch it held as the bar takes it
    finger("pointerdown", field, 800);
    finger("pointermove", field, 790);
    finger("lostpointercapture", field, 790);
    for (const y of [600, 300, 60]) finger("pointermove", field, y);
    finger("pointerup", field, 60);
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Full"))));

    // spec/app/assistant/dock.md, "A gesture asks the shell to raise Ask Alpha, to go back a step or two, or nothing; a press that did not move is a tap on its control": a press on the bar that does not move leaves Ask Alpha on the bar
    for (let step = 0; step < 3 && (await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant !== "Bar"; step++) {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    }
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar"))));
    finger("pointerdown", field, 800);
    finger("pointerup", field, 800);
    const still = await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect(still.assistant).toBe("Bar");
  });
  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"; spec/app/assistant/dock.md, "A released drag lands on the bar, a sheet at a height, or the full screen"; spec/app/assistant/dock.md, "A sheet keeps the share of the screen it was left at"; spec/app/assistant/dock.md, "A drag released asks the shell once for where it landed, and keeps a sheet's height"
  it("Reach every v119 height in order, up and down, by drag and by flick (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Home" });
    const section = () => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const height = () => Math.round(section()?.getBoundingClientRect().height ?? 0);
    const shell = async () => (await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant;
    const reaches = (detent: "Bar" | "Sheet" | "Full") => runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === detent))));
    const pause = (ms: number) => Effect.runPromise(Effect.sleep(`${ms} millis`));
    const finger = (type: string, target: Element | null | undefined, clientY: number) =>
      target?.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientY, pointerId: 11, pointerType: "touch", isPrimary: true }));
    /** A drag of `by` points from the middle of `from`, its moves `gap` ms apart; a slow one is held still before it lifts, so it is not a flick. */
    const swipe = async (from: () => Element | null | undefined, by: number, { flick = false } = {}) => {
      const start = from();
      const box = start?.getBoundingClientRect();
      const y = Math.round((box?.top ?? 0) + (box?.height ?? 0) / 2);
      finger("pointerdown", start, y);
      for (let step = 1; step <= 6; step++) {
        await pause(flick ? 10 : 25);
        finger("pointermove", from() ?? section(), y + Math.round((by * step) / 6));
      }
      if (!flick) await pause(120);
      finger("pointerup", from() ?? section(), y + by);
    };
    const mark = () => document.querySelector("section[aria-label='Ask Alpha'] [aria-label='Open conversation']");
    const handle = () => document.querySelector("section[aria-label='Ask Alpha'] [aria-label='Resize chat']");
    const near = async (target: number) => expect.poll(() => Math.abs(height() - target) <= 3, { timeout: 3000 }).toBe(true);

    // spec/app/assistant/dock.md, "A released drag lands on the bar, a sheet at a height, or the full screen": pulled up from the bar and let go between the zones, the sheet stays at the height it was let go at
    const floor = (document.querySelector<HTMLElement>("[data-alpha-input-bar]")?.clientHeight ?? 62) + 28;
    await swipe(mark, -300);
    await reaches("Sheet");
    await near(floor + 300);
    // spec/app/assistant/dock.md, "A sheet keeps the share of the screen it was left at": dragged down and let go between the zones, it stays lower, and a second drag down takes it lower again
    await swipe(handle, 100);
    await near(floor + 200);
    expect(await shell()).toBe("Sheet");
    await swipe(handle, 60);
    await near(floor + 140);
    expect(await shell()).toBe("Sheet");
    // spec/app/assistant/dock.md, "A released drag lands on the bar, a sheet at a height, or the full screen": near the top it fills the screen, and shrinking it again returns to the height it was left at
    await swipe(handle, -560);
    await reaches("Full");
    await near(844);
    await page.getByRole("button", { name: "Shrink chat" }).click();
    await reaches("Sheet");
    await near(floor + 140);
    // spec/app/assistant/dock.md, "A released drag lands on the bar, a sheet at a height, or the full screen": near the floor it goes to the bar
    await swipe(handle, 120);
    await reaches("Bar");
    await expect.poll(() => section()?.getAttribute("data-alpha-detent")).toBe("bar");

    // spec/app/assistant/dock.md, "A flick of an open sheet goes by its direction alone": flicked up from the bar it opens at its fitted height, flicked up again it fills the screen, and flicked down it rests on the bar
    await swipe(mark, -160, { flick: true });
    await reaches("Sheet");
    await expect.poll(() => section()?.getAttribute("data-alpha-detent")).toBe("sheet");
    await pause(500);
    await swipe(handle, -120, { flick: true });
    await reaches("Full");
    await page.getByRole("button", { name: "Shrink chat" }).click();
    await reaches("Sheet");
    await pause(500);
    await swipe(handle, 120, { flick: true });
    await reaches("Bar");
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": a sheet put away never carries its black Talk onto the bar, whose own Talk is drawn in its own colours from the first frame
  it("Put the sheet away without a black mic on the bar (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Home", speech: { onTalk: () => undefined } });
    const section = () => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    /** How opaque a computed colour is: its alpha, or 1 when it names none. */
    const alphaOf = (color: string) => color === "transparent" ? 0 : Number(/(?:rgba\([^)]*,|\/)\s*([\d.]+)\)$/.exec(color)?.[1] ?? 1);
    await page.getByRole("button", { name: "Open conversation" }).click();
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    await Effect.runPromise(Effect.sleep("600 millis"));
    const sheetTalk = section()?.querySelector("button[aria-label='Talk']");
    expect(alphaOf(getComputedStyle(sheetTalk as Element).backgroundColor)).toBe(1);
    const blackOnTheBar: string[] = [];
    const watch = async () => {
      for (const until = performance.now() + 1200; performance.now() < until; await Effect.runPromise(Effect.sleep("8 millis"))) {
        const shown = section();
        if (shown?.getAttribute("data-alpha-detent") !== "bar") continue;
        for (const talk of shown.querySelectorAll<HTMLElement>("button[aria-label='Talk']")) {
          const color = getComputedStyle(talk).backgroundColor;
          if (alphaOf(color) > 0) blackOnTheBar.push(color);
        }
      }
    };
    const watched = watch();
    await page.getByRole("button", { name: "Minimize chat" }).click();
    await watched;
    expect(section()?.getAttribute("data-alpha-detent")).toBe("bar");
    expect(section()?.querySelector("button[aria-label='Talk']")).not.toBe(sheetTalk);
    expect(blackOnTheBar).toEqual([]);
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": a sheet that grew as a reply arrived is put away from the height it was drawn at, never snapping back first
  it("Put a sheet that grew away from the height it was drawn at (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Home" });
    const section = () => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    await page.getByRole("button", { name: "Open conversation" }).click();
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    await Effect.runPromise(Effect.sleep("600 millis"));
    const fitted = section()?.getBoundingClientRect().height ?? 0;
    section()?.querySelector("[role='log'] > div")?.append(Object.assign(document.createElement("div"), { style: "height: 400px; flex-shrink: 0" }));
    await expect.poll(() => section()?.getBoundingClientRect().height ?? 0).toBeGreaterThan(fitted + 100);
    const grown = section()?.getBoundingClientRect().height ?? 0;
    const closing: number[] = [];
    const watch = async () => {
      for (const until = performance.now() + 600; performance.now() < until; await Effect.runPromise(Effect.sleep("8 millis"))) {
        const copy = document.querySelector<HTMLElement>("[data-alpha-ghost]");
        if (copy) closing.push(Math.round(copy.getBoundingClientRect().height));
      }
    };
    const watched = watch();
    await page.getByRole("button", { name: "Minimize chat" }).click();
    await watched;
    expect(closing.length).toBeGreaterThan(0);
    expect(closing[0]).toBeGreaterThan(grown - 40);
    expect(closing.every((height, at) => at === 0 || height <= (closing[at - 1] ?? height) + 1)).toBe(true);
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": only one field shows words at a time while a sheet is put away, by a tap or by a drag, and the bar's own words show once it has gone
  it("Put the sheet away with one field's words at a time (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Home" });
    const section = () => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const reaches = (detent: "Bar" | "Sheet") => runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === detent))));
    const pause = (ms: number) => Effect.runPromise(Effect.sleep(`${ms} millis`));
    const seen = (element: Element) => {
      let opacity = 1;
      for (let at: Element | null = element; at; at = at.parentElement) opacity *= Number(getComputedStyle(at).opacity);
      return opacity;
    };
    /** The words each drawn field shows, its text or else its placeholder, where it can be seen at all. */
    const worded = () => [...document.querySelectorAll("textarea")]
      .filter((field) => field.getBoundingClientRect().height > 0 && seen(field) > 0.05 && (field.value || field.placeholder))
      .map((field) => field.value || field.placeholder);
    const watch = async (ms: number) => {
      const frames: string[][] = [];
      for (const until = performance.now() + ms; performance.now() < until; await pause(8)) frames.push(worded());
      return frames;
    };
    const open = async () => {
      await page.getByRole("button", { name: "Open conversation" }).click();
      await reaches("Sheet");
      await pause(600);
    };

    await open();
    const tapped = watch(900);
    await page.getByRole("button", { name: "Minimize chat" }).click();
    const tapFrames = await tapped;
    expect(tapFrames.filter((words) => words.length > 1)).toEqual([]);
    expect(tapFrames.at(-1)).toEqual(["Ask Alpha"]);

    await open();
    const handle = section()?.querySelector("[aria-label='Resize chat']");
    const box = handle?.getBoundingClientRect();
    const y = Math.round((box?.top ?? 0) + (box?.height ?? 0) / 2);
    const finger = (type: string, clientY: number) => (handle?.isConnected ? handle : section())?.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientY, pointerId: 12, pointerType: "touch", isPrimary: true }));
    const dragged = watch(1300);
    finger("pointerdown", y);
    for (let step = 1; step <= 8; step++) {
      await pause(25);
      finger("pointermove", y + step * 50);
    }
    await pause(120);
    finger("pointerup", y + 400);
    const dragFrames = await dragged;
    await reaches("Bar");
    expect(dragFrames.filter((words) => words.length > 1)).toEqual([]);
    expect(dragFrames.some((words) => words.length === 0)).toBe(true);
    expect(dragFrames.at(-1)).toEqual(["Ask Alpha"]);
  });

  // spec/app/assistant/dock.md, "A press does one thing: a tap is never also a drag, and a late click never taps"
  it("The resting bar's controls keep their presses and a written field scrolls (spec/app/assistant/dock.md, \"A press does one thing: a tap is never also a drag, and a late click never taps\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Home" });
    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const field = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    const finger = (type: string, target: Element | null | undefined, clientY: number) =>
      target?.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY, pointerId: 4, pointerType: "touch", isPrimary: true }));
    const drag = (target: Element | null | undefined) => {
      finger("pointerdown", target, 800);
      for (const y of [790, 600, 300, 60]) finger("pointermove", target, y);
      finger("pointerup", target, 60);
    };
    const detent = async () => (await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant;

    // spec/app/assistant/dock.md, "A press does one thing: a tap is never also a drag, and a late click never taps"
    const control = [...(section?.querySelectorAll("button") ?? [])].find((button) => !button.closest("[data-alpha-grabber],[data-alpha-input-drag-alpha]"));
    expect(control).toBeDefined();
    drag(control);
    await Effect.runPromise(Effect.sleep("50 millis"));
    expect(await detent()).toBe("Bar");

    // spec/app/assistant/dock.md, "A press does one thing: a tap is never also a drag, and a late click never taps"
    expect(field?.hidden).toBe(false);
    if (field) {
      expect(getComputedStyle(field).touchAction).toBe("none");
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(field, "a long draft");
      field.dispatchEvent(new Event("input", { bubbles: true }));
      await expect.poll(() => getComputedStyle(field).touchAction).toBe("pan-y");
      drag(field);
      await Effect.runPromise(Effect.sleep("50 millis"));
      expect(["Sheet", "Full"]).not.toContain(await detent());
    }
  });

  // spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet": as v119's pill, a swipe up that starts on Type carries the sheet with the finger and opens it without typing; once it is a drag the sheet holds the pointer, so later moves reach the sheet as a captured touch's do
  it("a swipe up from Type on the pill follows the finger and opens Sheet without typing", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Calendar" });
    const type = document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']");
    expect(type).not.toBeNull();
    type?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 780, pointerId: 3, pointerType: "touch", isPrimary: true }));
    type?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 740, pointerId: 3, pointerType: "touch", isPrimary: true }));
    await runtime.runPromise(Effect.flatMap(Dock, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.gesture !== "Idle"))));
    const holder = () => type?.isConnected ? type : document.querySelector("section[aria-label='Ask Alpha']");
    holder()?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 700, pointerId: 3, pointerType: "touch", isPrimary: true }));
    await expect.poll(() => document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("sheet");
    expect((await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant).toBe("Bar");
    holder()?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 700, pointerId: 3, pointerType: "touch", isPrimary: true }));
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("sheet");
  });
});
