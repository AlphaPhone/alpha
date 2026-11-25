import { Effect, Stream } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { closeAllDocks, mountDock } from "./dock-support.tsx";
import "../src/main.css";

afterEach(closeAllDocks);

describe("Ask Alpha dock", () => {
  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
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

    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    await runtime.runPromise(Effect.flatMap(Canvas, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));

    const afterTextarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(afterTextarea).toBe(beforeTextarea);
    expect(document.activeElement).toBe(beforeTextarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("sheet");

    // spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentOpenView", view: "Calendar" })));
    const afterAgentNav = await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentNav.trail.at(-1), afterAgentNav.assistant]).toEqual(["Calendar", "Sheet"]);

    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentGoHome" })));
    const afterAgentHome = await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentHome.trail, afterAgentHome.assistant]).toEqual([[], "Sheet"]);
  });

  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "A press that did not move taps its control once"
  it("The dock mark opens and focuses Sheet on click and touch (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Browser" });

    await page.getByRole("button", { name: "Open conversation" }).click();
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));

    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar"))));
    (document.activeElement as HTMLElement | null)?.blur();

    const grabber = document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']");
    expect(grabber).not.toBeNull();
    grabber?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 760, pointerId: 2, pointerType: "touch" }));
    grabber?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 760, pointerId: 2, pointerType: "touch" }));
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));
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

  // spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet": as v121's pill, a swipe up that starts on Type opens the sheet without typing
  it("a swipe up from Type on the pill opens Sheet without typing (spec/app/assistant/dock.md, \"Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Calendar" });
    const type = document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']");
    expect(type).not.toBeNull();
    type?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 780, pointerId: 3, pointerType: "touch", isPrimary: true }));
    type?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 740, pointerId: 3, pointerType: "touch", isPrimary: true }));
    type?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 700, pointerId: 3, pointerType: "touch", isPrimary: true }));
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("sheet");
  });
});
