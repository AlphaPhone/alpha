import { Effect, Stream } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { closeAllDocks, mountDock } from "./dock-support.tsx";
import "../src/main.css";

afterEach(closeAllDocks);

describe("Ask Alpha dock", () => {
  // spec/app/assistant/dock.md, "Focusing the composer on the bar raises it to typing: the bar grows above the keyboard and the page stays in view"; spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("Browser input tap raises the bar to typing with focus (spec/app/assistant/dock.md, \"Focusing the composer on the bar raises it to typing: the bar grows above the keyboard and the page stays in view\")", async () => {
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

    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Typing"))));
    await runtime.runPromise(Effect.flatMap(Canvas, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));

    const afterTextarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(afterTextarea).toBe(beforeTextarea);
    expect(document.activeElement).toBe(beforeTextarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");

    // spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentOpenView", view: "Calendar" })));
    const afterAgentNav = await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentNav.trail.at(-1), afterAgentNav.assistant]).toEqual(["Calendar", "Typing"]);

    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentGoHome" })));
    const afterAgentHome = await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    expect([afterAgentHome.trail, afterAgentHome.assistant]).toEqual([[], "Typing"]);
  });

  // spec/app/assistant/dock.md, "Alpha's mark, a send from the bar, or a tap on the handle opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "A press that did not move taps its control once"
  it("Open control focuses Sheet, and a tap on the open sheet's handle keeps it there (spec/app/assistant/dock.md, \"Alpha's mark, a send from the bar, or a tap on the handle opens Ask Alpha as a sheet\")", async () => {
    await page.viewport(390, 844);
    const { runtime } = await mountDock({ view: "Browser" });

    await page.getByRole("button", { name: "Open conversation" }).click();
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));

    const grabber = document.querySelector<HTMLButtonElement>("button[aria-label='Resize chat']");
    expect(grabber).not.toBeNull();
    grabber?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 500, pointerId: 2, pointerType: "touch" }));
    grabber?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 500, pointerId: 2, pointerType: "touch" }));
    expect((await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant).toBe("Sheet");

    await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar"))));
    expect(document.querySelector("button[aria-label='Resize chat']")?.checkVisibility()).toBe(false);
  });
});
});
