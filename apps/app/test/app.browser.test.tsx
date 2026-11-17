import { Layer, ManagedRuntime } from "effect";
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../src/App.tsx";
import { browserDevice } from "../src/platform/device.vibe";
import { admitted, shell } from "../src/shell/shell.vibe";
import "../src/main.css";

const opened: { root: Root; dispose: () => Promise<void> }[] = [];
const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
const previousActEnvironment = environment.IS_REACT_ACT_ENVIRONMENT;

/** Alpha opened over the browser's own localStorage, as main.tsx opens it; an earlier opening is closed first. */
async function open() {
  for (const { root, dispose } of opened.splice(0)) { await act(() => Promise.resolve(root.unmount())); await dispose(); }
  const runtime = ManagedRuntime.make(Layer.merge(Layer.provide(shell, KeyValueStore.layerStorage(() => localStorage)), browserDevice));
  await runtime.runPromise(admitted());
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  opened.push({ root, dispose: () => runtime.dispose() });
  await act(() => Promise.resolve(root.render(<App runtime={runtime} />)));
}

beforeAll(() => { environment.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => {
  for (const { root, dispose } of opened.splice(0)) { await act(() => Promise.resolve(root.unmount())); await dispose(); }
  localStorage.clear();
});
afterAll(() => { environment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });

const trail = (): unknown => (JSON.parse(localStorage.getItem("alpha.shell") ?? "null") as { trail: unknown } | null)?.trail;

// spec/app/shell/index.md, "Story: Move between Home and the apps"
it("Move between Home and the apps, and find the same place after the page is opened again", async () => {
  await open();
  // spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
  await expect.element(page.getByRole("button", { name: "Phone" })).not.toBeInTheDocument();
  await page.getByRole("button", { name: "Notes" }).click();
  await expect.element(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  await open();
  await expect.element(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  // spec/app/shell/index.md, "Back closes one layer: the drawer, then Ask Alpha by a step, then the app on top"
  await page.getByRole("button", { name: "Back" }).click();
  await expect.element(page.getByRole("button", { name: "Notes" })).toBeVisible();
  expect(trail()).toEqual([]);
});
