import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { Machine as Reminders } from "../gen/app__sample.effect.vibe";
import { closeAll, open, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

const trail = (): unknown => (JSON.parse(localStorage.getItem("alpha.shell") ?? "null") as { trail: unknown } | null)?.trail;

// spec/app/shell/index.md, "Story: Move between Home and the apps"
it("Move between Home and the apps, and find the same place after the page is opened again", async () => {
  const world = scene();
  const { close } = await open(world);
  // spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
  await expect.element(page.getByRole("button", { name: "Phone" })).not.toBeInTheDocument();
  await page.getByRole("button", { name: "Notes" }).click();
  await expect.element(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  await close();
  await open(world);
  await expect.element(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  // spec/app/shell/index.md, "Back closes one layer: the drawer, then Ask Alpha by a step, then the app on top"
  await page.getByRole("button", { name: "Back" }).click();
  await expect.element(page.getByRole("button", { name: "Notes" })).toBeVisible();
  expect(trail()).toEqual([]);
});

// spec/app/sample/index.md, "Story: See and dismiss reminders"
it("See and dismiss reminders: focus moves to Undo while a dismissal is held (spec/app/sample/index.md, \"Story: See and dismiss reminders\")", async () => {
  const { alpha } = await open(scene());
  await page.getByRole("button", { name: "Notes" }).click();
  await until(alpha.runtime, Reminders, (s) => s.list.status === "Loaded");
  // spec/app/sample/index.md, "Undo within the five seconds puts the reminder back"
  await page.getByRole("button", { name: "Dismiss Water the plants" }).click();
  await expect.element(page.getByRole("button", { name: "Undo dismissing “Water the plants”" })).toHaveFocus();
});
