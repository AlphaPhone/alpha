import { Effect, Stream } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { say } from "../src/notices/toasts.vibe";
import { closeAll, only, open } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

function centerOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function hitAtCenter(element: Element): Element[] {
  const { x, y } = centerOf(element);
  return document.elementsFromPoint(x, y);
}

function numericZIndex(element: Element | null): number {
  if (element === null) return 0;
  const raw = getComputedStyle(element).zIndex;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

describe("Browser hit-test", () => {
  // spec/app/shell/index.md, "Ask Alpha rises to typing, a sheet or the full screen, never over the drawer"; spec/app/notices/toasts.md, "Story: Read a toast before it goes"
  it("layers Home, Ask Alpha, Attach sheet, and Toast", async () => {
    await page.viewport(390, 844);
    const { alpha } = await open(scene(), only("home", "assistant", "notice", "view:Browser", "view:Settings"));

    const notesTile = page.getByRole("button", { name: "Notes" });
    await expect.element(notesTile).toBeVisible();
    const notesEl = notesTile.element();
    expect(hitAtCenter(notesEl)).toContain(notesEl);

    const openConv = page.getByRole("button", { name: "Open conversation" });
    await expect.element(openConv).toBeVisible();
    expect(hitAtCenter(openConv.element())).toContain(openConv.element());
    await openConv.click();

    await alpha.runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    const assistant = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    expect(assistant?.getAttribute("data-alpha-detent")).toBe("sheet");

    const composer = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(composer).not.toBeNull();
    expect(hitAtCenter(composer!)).toContain(composer!);

    await alpha.runtime.runPromise(say("Saved change"));
    const toast = page.getByText("Saved change");
    await expect.element(toast).toBeVisible();
    const toastEl = toast.element();
    const toastContainer = toastEl.closest("[data-alpha-toast-region]") ?? toastEl.closest("[role=status]") ?? toastEl;
    expect(hitAtCenter(toastEl)).toContain(toastEl);
    expect(numericZIndex(toastContainer) >= numericZIndex(assistant)).toBe(true);

    const actions = page.getByRole("button", { name: "Chat actions" });
    await actions.click();
    const attachItem = page.getByRole("menuitem", { name: "Attach media" });
    await expect.element(attachItem).toBeVisible();
    expect(hitAtCenter(attachItem.element())).toContain(attachItem.element());
    await attachItem.click();

    const attachDialog = document.querySelector<HTMLElement>("[aria-label='Attach files']");
    expect(attachDialog).not.toBeNull();
    const closeAttach = page.getByRole("button", { name: "Close attachments" });
    await expect.element(closeAttach).toBeVisible();
    expect(hitAtCenter(closeAttach.element())).toContain(closeAttach.element());
    await closeAttach.click();

    await page.getByRole("button", { name: "Expand chat" }).click();
    await alpha.runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Full"))));
    expect(assistant?.getAttribute("data-alpha-detent")).toBe("full");
    const shrink = page.getByRole("button", { name: "Shrink chat" });
    await expect.element(shrink).toBeVisible();
    expect(hitAtCenter(shrink.element())).toContain(shrink.element());
  });

  // spec/app/shell/index.md, "Story: Move between Home and the apps"
  it("moves Tab focus across Home and Ask Alpha", async () => {
    await page.viewport(390, 844);
    await open(scene(), only("home", "assistant"));

    await expect.element(page.getByRole("button", { name: "Open conversation" })).toBeVisible();
    const visited = new Set<Element>();
    for (let step = 0; step < 6; step += 1) {
      await userEvent.tab();
      if (document.activeElement && document.activeElement !== document.body) {
        visited.add(document.activeElement);
        const rect = document.activeElement.getBoundingClientRect();
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      }
    }
    expect(visited.size).toBeGreaterThanOrEqual(2);
  });

  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "A press that did not move taps its control once"
  it("expands Ask Alpha via real pointer drag", async () => {
    await page.viewport(390, 844);
    const { alpha } = await open(scene(), only("home", "assistant"));

    const openConv = page.getByRole("button", { name: "Open conversation" });
    await expect.element(openConv).toBeVisible();
    await openConv.click();
    await alpha.runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));

    const grabber = document.querySelector<HTMLElement>("button[aria-label='Resize chat'], [aria-label='Resize chat']");
    expect(grabber).not.toBeNull();
    const start = centerOf(grabber!);
    expect(hitAtCenter(grabber!)).toContain(grabber!);

    grabber!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: start.x, clientY: start.y, pointerId: 7, pointerType: "touch" }));
    for (const dy of [-40, -100, -180, -260]) {
      grabber!.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: start.x, clientY: Math.max(20, start.y + dy), pointerId: 7, pointerType: "touch" }));
    }
    grabber!.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: start.x, clientY: Math.max(20, start.y - 260), pointerId: 7, pointerType: "touch" }));

    await expect.poll(() => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("full");
  });

  // spec/app/maps/index.md, "Story: Find a place on the map"
  it("mounts Maps with hit-testable controls", async () => {
    await page.viewport(390, 844);
    const uncaught: string[] = [];
    const onError = (event: ErrorEvent) => { uncaught.push(event.message); };
    window.addEventListener("error", onError);
    try {
      const world = scene();
      await open(world, only("home", "assistant", "view:Maps"));
      await page.getByRole("button", { name: "Maps" }).click();
      await expect.element(page.getByRole("button", { name: "Back" })).toBeVisible();

      const back = page.getByRole("button", { name: "Back" }).element();
      expect(hitAtCenter(back)).toContain(back);

      const mapSurface = document.querySelector("canvas, [role=region][aria-label*='Map'], [data-alpha-map]");
      expect(mapSurface !== null || document.querySelector("input, [role=searchbox]") !== null).toBe(true);
      expect(uncaught).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
    }
  });
});
