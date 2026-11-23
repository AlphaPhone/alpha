import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { Machine as Reminders } from "../gen/app__sample.effect.vibe";
import { at, mounts } from "../src/areas.ts";
import { single } from "../src/runtime/single.ts";
import { closeAll, open, until } from "./alpha.tsx";
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
  // spec/app/shell/index.md, "Back closes one layer: the drawer, then Ask Alpha by a step, then the app on top"
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
