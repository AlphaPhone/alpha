import { Effect, Stream } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { closeAllDocks, mountDock } from "./dock-support.tsx";
import "../src/main.css";

afterEach(closeAllDocks);

describe("Ask Alpha dock", () => {
  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("Browser input tap opens Sheet with focus (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
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
    } finally {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("pointerdown", onPointerDown);
    }
    expect([touchDefaultPrevented, pointerDefaultPrevented]).toEqual([false, false]);

    const textarea = page.getByRole("textbox", { name: "Message Alpha" });
    await expect.element(textarea).toBeVisible();
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
    const { runtime } = await mountDock({ view: "Browser" });
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
});
