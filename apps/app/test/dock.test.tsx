// @vitest-environment happy-dom
import { Effect, Stream } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { closeAllDocks, mountDock } from "./dock-support.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(closeAllDocks);

const underAct = async (work: () => Promise<void> | void) => {
  await act(async () => { await work(); });
};

describe("Ask Alpha dock and shell navigation", () => {
  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"
  it("focusing the composer on the Browser bar opens half-open Sheet without reparenting and marks host chrome (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    const { runtime } = await mountDock({ view: "Browser", withToast: true, flush: underAct });
    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    expect(document.querySelectorAll("[data-host-chrome]").length).toBeGreaterThanOrEqual(3);
    expect(textarea?.placeholder).toBe("Ask about this page");

    await act(async () => {
      textarea?.focus();
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    });
    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Canvas, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));
    });

    expect(document.querySelector("textarea[data-alpha-composer]")).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("sheet");
  });

  // spec/app/shell/index.md, "Ask Alpha rises to typing, a sheet or the full screen, never over the drawer"
  it.each(["Calendar", "Settings"] as const)("opens the wide composer from %s's compact dock without opening the sheet", async (view) => {
    const { runtime } = await mountDock({ view, flush: underAct });
    const dock = document.querySelector("[data-alpha-compact-dock]");
    const field = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(field?.hidden).toBe(true);
    expect(Array.from(dock?.querySelectorAll("button") ?? [], (button) => button.getAttribute("aria-label"))).toEqual(["Open conversation", "Type", "Talk"]);

    await act(async () => {
      dock?.querySelector<HTMLButtonElement>("button[aria-label='Type']")?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.assistant === "Typing"))));
    });

    expect(field).toBe(document.querySelector("textarea[data-alpha-composer]"));
    expect(document.activeElement).toBe(field);
    expect(field?.hidden).toBe(false);
    expect(document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("bar");

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Canvas, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.field === "Composer"))));
      await runtime.runPromise(Effect.flatMap(Canvas, (machine) => machine.send({ type: "keyboardReported", shown: true, voice: false })));
      await runtime.runPromise(Effect.flatMap(Canvas, (machine) => machine.send({ type: "keyboardReported", shown: false, voice: false })));
      await runtime.runPromise(Effect.flatMap(Shell, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.assistant === "Bar"))));
    });
    expect(field?.hidden).toBe(true);

    await act(async () => {
      document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']")?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.assistant === "Sheet"))));
    });

    expect(document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("sheet");
  });

  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "Ask Alpha put away forgets the height its sheet was left at"
  it("tapping Open conversation focuses the composer and Back lowers Sheet to Bar clearing kept height (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    const { runtime } = await mountDock({ view: "Home", withToast: true, flush: underAct });
    const openBtn = document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']");
    expect(openBtn).not.toBeNull();

    await act(async () => {
      openBtn?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    });
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "press", detent: "Sheet", now: 100 })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "drag" })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "release", direction: "Up", flick: false, height: 420, floor: 80, full: 800, now: 200 })));
    });
    expect((await runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()))).kept).toBe(420);

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.kept === 0))));
    });
    expect((await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant).toBe("Bar");
  });

  // spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("agent navigation moves between admitted apps and Home while keeping Ask Alpha raised (spec/app/shell/index.md, \"Agent navigation shows an admitted app or Home without lowering Ask Alpha\")", async () => {
    const { runtime } = await mountDock({ view: "Home", withToast: true, flush: underAct });
    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "raise", detent: "Sheet" })));
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentOpenView", view: "Browser" })));
    });
    expect(await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).toMatchObject({ trail: ["Browser"], assistant: "Sheet" });

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentGoHome" })));
    });
    expect(await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).toMatchObject({ trail: [], assistant: "Sheet" });
  });
});
