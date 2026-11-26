import { Effect } from "effect";
import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Workflows } from "../gen/app__workflows__list.effect.vibe";
import { at, first as firstScreen, mounts } from "../src/areas.ts";
import files from "../src/files/index.tsx";
import { single } from "../src/runtime/single.ts";
import { home } from "../src/shell/shell.vibe";
import { button, closeAll, later, only, open, seen, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import sample from "./sample/index.tsx";
import "../src/main.css";

afterEach(closeAll);

const withSample = [...mounts, at("view:Notes", () => import("./sample/index.tsx"))];
const trail = (): unknown => (JSON.parse(localStorage.getItem("alpha/app/shell/index@5") ?? "null") as { trail: unknown } | null)?.trail;

// spec/app/shell/index.md, "Story: Move between Home and the apps"
it("Move between Home and the apps, and find the same place after the page is opened again (spec/app/shell/index.md, \"Story: Move between Home and the apps\")", async () => {
  const world = scene();
  const { close } = await open(world, withSample);
  // spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
  await expect.element(page.getByRole("button", { name: "Phone" })).not.toBeInTheDocument();
  await page.getByRole("button", { name: "Notes" }).click();
  await expect.element(page.getByRole("heading", { level: 1, name: "Notes" })).toBeVisible();
  await close();
  await open(world, withSample);
  await expect.element(page.getByRole("heading", { level: 1, name: "Notes" })).toBeVisible();
  // spec/app/shell/index.md, "Back closes one layer: Ask Alpha by a step, then the app on top"
  await page.getByRole("button", { name: "Back" }).click();
  await expect.element(page.getByRole("button", { name: "Notes" })).toBeVisible();
  expect(trail()).toEqual([]);
  expect([await single(), await single()]).toEqual([true, false]);
});

function savedBrowserRecords(records: readonly { id: string; url: string; title: string }[], marks: readonly { url: string; title: string }[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("alpha.browser.documents.v1", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("documents"); };
    request.onerror = () => reject(new Error("Could not open the Browser fixture storage", { cause: request.error }));
    request.onsuccess = () => {
      const db = request.result;
      const write = db.transaction("documents", "readwrite");
      const store = write.objectStore("documents");
      const set = (key: string, value: unknown) => {
        if (value === undefined) store.delete(key);
        else store.put({ revision: "develop-fixture", raw: JSON.stringify({ version: 1, legacy: null, value: JSON.stringify(value) }) }, key);
      };
      set("alpha.browser.session.v1", records.length === 0 ? undefined : { tabs: records, cur: records.at(-1)?.id, history: records.map(({ url }) => url) });
      const addresses = marks.map(({ url }) => url);
      set("alpha.browser.bookmarks.v1", marks.length === 0 ? undefined : addresses);
      set("alpha.browser.bookmark-titles.v1", marks.length === 0 ? undefined : { addresses, titles: marks.map(({ title }) => title) });
      write.oncomplete = () => { db.close(); resolve(); };
      write.onabort = () => { db.close(); reject(new Error("Could not write the Browser fixture storage", { cause: write.error })); };
    };
  });
}

// spec/app/browser/address.md, "A browser frame can be shown for the latest request, with no secure mark"; spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/index.md, "Story: Keep my tabs through a restart"; spec/app/browser/library.md, "Story: Keep bookmarks"; spec/app/browser/downloads.md, "Story: Download a file"
it("Keeps a browser frame while leaving and reopening Browser", async () => {
  const fixture = new URL("/test/fakes/browser-page.html", location.origin);
  expect((await fetch(fixture)).ok).toBe(true);
  const first = { id: "old-tab-a", title: "Saved first", url: new URL("?tab=first", fixture).href };
  const second = { id: "old-tab-b", title: "Saved second", url: new URL("?tab=second", fixture).href };
  const bookmark = { url: "https://archive.example/reference", title: "Saved reference" };
  await savedBrowserRecords([first, second], [bookmark]);
  try {
    const { alpha } = await open(scene(), [...only("home", "view:Browser", "assistant"), firstScreen("view:Files", files)]);
    await page.getByRole("button", { name: "Browser", exact: true }).click();
    const link = page.getByRole("link", { name: "Open in browser" });
    await expect.element(link).toHaveAttribute("href", second.url);
    const library = async () => {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Library, bookmarks and history" }).click();
    };
    await library();
    await expect.element(page.getByRole("button", { name: /^Saved reference/ })).toBeVisible();
    await page.getByRole("button", { name: "Remove bookmark Saved reference" }).click();
    await expect.element(page.getByRole("status", { name: "No bookmarks" })).toBeVisible();
    await page.getByRole("button", { name: "Back to page" }).click();
    await library();
    await expect.element(page.getByRole("status", { name: "No bookmarks" })).toBeVisible();
    await page.getByRole("button", { name: "Back to page" }).click();
    await page.getByRole("button", { name: /^Tabs\b/ }).click();
    const savedFirst = page.getByRole("button", { name: /^Saved first/ });
    await expect.element(savedFirst).toBeVisible();
    await savedFirst.click();
    await expect.element(link).toHaveAttribute("href", first.url);
    await page.getByRole("button", { name: /^Edit address\b/ }).click();
    const address = page.getByRole("textbox", { name: "Address" });
    await address.fill(fixture.href);
    await userEvent.keyboard("{Enter}");
    await expect.element(link).toHaveAttribute("href", fixture.href);
    const iframe = Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe[title=Website]")).find((frame) => frame.src === fixture.href);
    if (!iframe) throw new Error("the browser frame is missing");
    await expect.poll(() => iframe.contentDocument).toBeNull();

    await alpha.runtime.runPromise(home());
    await expect.element(page.getByRole("button", { name: "Browser", exact: true })).toBeVisible();
    await expect.element(link).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Browser", exact: true }).click();
    await expect.element(link).toBeVisible();
    expect(Array.from(document.querySelectorAll("iframe[title=Website]"))).toContain(iframe);
    await expect.element(page.getByRole("img", { name: "Secure connection" })).not.toBeInTheDocument();

    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("button", { name: "Downloads", exact: true }).click();
    await expect.element(page.getByRole("heading", { name: "Files", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Browser", exact: true }).click();
    await expect.element(link).toBeVisible();
    expect(Array.from(document.querySelectorAll("iframe[title=Website]"))).toContain(iframe);

    await page.getByRole("button", { name: /^Tabs\b/ }).click();
    await page.getByRole("button", { name: `Close ${fixture.href}`, exact: true }).click();
    await expect.poll(() => iframe.isConnected).toBe(false);
  } finally {
    await closeAll();
    await savedBrowserRecords([]);
  }
}, 120_000);

// spec/app/sample/index.md, "Story: See and dismiss reminders"
it("Moves reminder dismissal focus to Undo", async () => {
  await open(scene(), [...only("home"), firstScreen("view:Notes", sample)]);
  await page.getByRole("button", { name: "Notes" }).click();
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


// spec/app/digests/index.md, "Story: Receive results without losing or repeating one"; spec/app/digests/index.md, "Story: Keep digests to their owner and through a restart"
it("Checks for browser briefs only after the owner opts in", async () => {
  await page.viewport(390, 844);
  const world = scene();
  const hosted: NonNullable<typeof world.workflows.hosted> = { entries: [], reads: 0, acknowledgements: [] };
  world.workflows.hosted = hosted;
  const oldConsent = `alpha/workflows/digests/${encodeURIComponent(world.notes.owner)}/visible-checks`;
  localStorage.setItem(oldConsent, "on");
  const { alpha } = await open(world, only("home", "view:Workflows"));
  const home = () => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "goHome" })));
  const listing = () => alpha.runtime.runPromise(Effect.flatMap(Workflows, (workflows) => workflows.get()));
  const scheduled = async () => {
    await page.getByRole("button", { name: "Workflows", exact: true }).click();
    await page.getByRole("button", { name: "Add to Workflows" }).click();
    await page.getByRole("button", { name: "Scheduled digest", exact: true }).click();
  };
  const toggle = () => page.getByRole("switch", { name: "Check for digests while Alpha is visible" });

  await until(alpha, alpha.runtime, Workflows, (state) => state.owner > 0 && state.list.status === "Loaded");
  await later(alpha, 60_001);
  expect([hosted.reads, hosted.acknowledgements]).toEqual([0, []]);
  expect(localStorage.getItem(oldConsent)).toBe("on");

  await scheduled();
  await expect.element(page.getByText("No digest results yet")).toBeVisible();
  await expect.element(toggle()).not.toBeChecked();
  await toggle().click();
  await expect.element(toggle()).toBeChecked();

  const at = "2026-11-24T07:00:00.000Z";
  hosted.entries.push({ cursor: 1, runId: "retained-brief-1", workflowId: "routine-1", workflowVersionId: "version-1",
    templateVersion: "morning", scheduledAt: at, startedAt: at, completedAt: at, source: {}, status: "finished",
    output: "The morning brief is ready.", error: null });
  await home();
  await expect.element(page.getByText("The morning brief is ready.")).toBeVisible();
  expect(hosted.acknowledgements).toEqual(["retained-brief-1"]);

  await scheduled();
  await expect.element(toggle()).toBeChecked();
  await toggle().click();
  await expect.element(toggle()).not.toBeChecked();
  await expect.element(page.getByRole("list", { name: "Digest results" })).toBeVisible();
  await home();
  const disabledReads = hosted.reads;
  await later(alpha, 60_001);
  expect(hosted.reads).toBe(disabledReads);

  await scheduled();
  await expect.element(page.getByRole("list", { name: "Digest results" })).toBeVisible();
  await toggle().click();
  await expect.element(toggle()).toBeChecked();
  await home();
  const oldOwner = (await listing()).owner;
  world.notes.ownerIdentity = "next-browser-owner";
  await seen(false);
  await seen(true);
  await until(alpha, alpha.runtime, Workflows, (state) => state.owner > oldOwner);
  await expect.element(page.getByText("The morning brief is ready.")).not.toBeInTheDocument();
  const switchedReads = hosted.reads;
  await later(alpha, 60_001);
  expect(hosted.reads).toBe(switchedReads);
  await scheduled();
  await expect.element(toggle()).not.toBeChecked();
}, 120_000);
