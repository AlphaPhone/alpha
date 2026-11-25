import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { Machine as Reminders } from "../gen/app__sample.effect.vibe";
import { at, mounts } from "../src/areas.ts";
import { single } from "../src/runtime/single.ts";
import { button, closeAll, only, open, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import sample from "./sample/index.tsx";
import "../src/main.css";

afterEach(closeAll);

const withSample = [...mounts, at("view:Notes", () => import("./sample/index.tsx"))];
const trail = (): unknown => (JSON.parse(localStorage.getItem("alpha/app/shell/index@1") ?? "null") as { trail: unknown } | null)?.trail;

// spec/app/shell/index.md, "Story: Move between Home and the apps"
it("Move between Home and the apps, and find the same place after the page is opened again (spec/app/shell/index.md, \"Story: Move between Home and the apps\")", async () => {
  const world = scene();
  const { close } = await open(world, withSample);
  // spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
  await expect.element(page.getByRole("button", { name: "Phone" })).not.toBeInTheDocument();
  await page.getByRole("button", { name: "Notes" }).click();
  await expect.element(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  await close();
  await open(world, withSample);
  await expect.element(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  // spec/app/shell/index.md, "Back closes one layer: Ask Alpha by a step, then the app on top"
  await page.getByRole("button", { name: "Back" }).click();
  await expect.element(page.getByRole("button", { name: "Notes" })).toBeVisible();
  expect(trail()).toEqual([]);
  expect([await single(), await single()]).toEqual([true, false]);
});

// spec/app/sample/index.md, "Story: See and dismiss reminders"
it("See and dismiss reminders: focus moves to Undo while a dismissal is held (spec/app/sample/index.md, \"Story: See and dismiss reminders\")", async () => {
  const { alpha } = await open(scene(), withSample);
  await page.getByRole("button", { name: "Notes" }).click();
  await until(alpha, sample.runtime(alpha), Reminders, (s) => s.list.status === "Loaded");
  // spec/app/sample/index.md, "Undo within the five seconds puts the reminder back"
  await page.getByRole("button", { name: "Dismiss Water the plants" }).click();
  await expect.element(page.getByRole("button", { name: "Undo dismissing “Water the plants”" })).toHaveFocus();
});

// spec/app/shell/index.md, "Ask Alpha rises to typing, a sheet or the full screen"
it("Full Ask Alpha keeps focus off the Home it covers (spec/app/shell/index.md, \"Ask Alpha rises to typing, a sheet or the full screen\")", async () => {
  await page.viewport(844, 390);
  const nativeMatch = window.matchMedia.bind(window);
  const emulatedPointer = nativeMatch("(min-width: 900px)");
  const pointer = vi.spyOn(window, "matchMedia").mockImplementation((query) => query === "(pointer: coarse)" ? emulatedPointer : nativeMatch(query));

  try {
    await open(scene(), only("home", "assistant"));
    await expect.element(page.getByRole("button", { name: "Notes" })).toBeVisible();
    const note = button("Notes");
    expect(note).toBeDefined();

    await page.getByRole("button", { name: "Open conversation" }).click();
    await page.getByRole("button", { name: "Expand chat" }).click();
    await expect.element(page.getByRole("button", { name: "Shrink chat" })).toBeVisible();

    const shrink = button("Shrink chat");
    expect(shrink).toBeDefined();
    shrink?.focus();
    note?.focus();
    expect(document.activeElement).toBe(shrink);

    // The emulated touch pointer puts the same full dock beside Home.
    await page.viewport(1024, 390);
    await expect.poll(() => {
      note?.focus();
      return document.activeElement === note;
    }).toBe(true);
  } finally {
    pointer.mockRestore();
  }
});
