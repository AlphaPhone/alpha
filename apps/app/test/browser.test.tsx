// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Page } from "../gen/app__browser__address.effect.vibe";
import { Machine as Library } from "../gen/app__browser__library.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Pages } from "../src/browser/browser.vibe";
import browser from "../src/browser/index.tsx";
import home from "../src/home/index.tsx";
import { button, closeAll, drawn, fill, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** Alpha on an Alpha image with the Browser on screen. */
async function onBrowser(world = { ...scene(), phone: true, image: true }) {
  const running = await open(world, only("home", "view:Browser"));
  await until(running.alpha, home.runtime(running.alpha), Home, (h) => h.tiles.load.status === "Loaded");
  const runtime = browser.runtime(running.alpha);
  await press("Browser");
  return { ...running, world, runtime };
}

const go = (text: string) => drawn(async () => {
  await press(button("Search or type address") ? "Search or type address" : "Edit address");
  await fill("Address", text);
  const form = document.querySelector<HTMLFormElement>("form[role=search]");
  if (!form) throw new Error("no address field");
  form.requestSubmit();
});

const libraryTab = (name: "History" | "Bookmarks") => drawn(() => {
  const tab = button(name);
  if (!tab) throw new Error(`no Library tab ${name}`);
  tab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
});

describe("The Browser on a phone", () => {
  it("Opens the saved Library (spec/app/browser/library.md, \"Story: Keep bookmarks\"; spec/app/browser/library.md, \"Story: Look back through history\")", async () => {
    const world = { ...scene(), phone: true, image: true };
    const { alpha, runtime } = await onBrowser(world);
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    await press("Menu");
    await press("Library, bookmarks and history");
    await until(alpha, runtime, Library, (s) => s.read.status === "Loaded");
    await libraryTab("History");
    expect([...document.querySelectorAll("button")].some((row) => row.textContent?.includes("news.example/on-device-agents"))).toBe(true);
    await libraryTab("Bookmarks");
    const bookmark = [...document.querySelectorAll("button")].find((row) => row.textContent?.includes("Keys in the chip"));
    if (!bookmark) throw new Error("saved bookmark is missing");
    await drawn(() => bookmark.click());
    const tab = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    await until(alpha, page, Page, (s) => s.phase === "Shown");
    expect([...world.browser.tabs.values()].map((one) => one.history[one.at])).toEqual(["https://enclave.example/keys-in-hardware"]);
  });

  it("Open a page and watch it load (spec/app/browser/address.md, \"Story: Go where I typed\"; spec/app/browser/address.md, \"Story: Watch a page load\"; spec/app/browser/address.md, \"Story: Find in page\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    // spec/app/browser/index.md, "A launch reads the saved session, and may ask again after a failed read"
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    expect([world.browser.calls.includes("browsingState"), Boolean(button("Search or type address"))]).toEqual([true, true]);

    // spec/app/browser/address.md, "Submitting text opens it, searches for it or says why not, and blank text is not submitted"
    await go("news.example/on-device-agents");
    const tab = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    // spec/app/browser/address.md, "Only the latest load of the page commits it or fails it"; spec/app/browser/address.md, "The secure mark shows only on a page that committed over HTTPS"
    await until(alpha, page, Page, (p) => p.phase === "Shown" && p.secure);
    expect([...world.browser.tabs.values()].map((one) => one.history)).toEqual([["https://news.example/on-device-agents"]]);
    expect(Boolean(document.querySelector("[aria-label='Secure connection']"))).toBe(true);

    // spec/app/browser/address.md, "Typing searches the page, and clearing the text clears the search"; spec/app/browser/address.md, "Only the answer to the latest search counts"
    await press("Menu");
    await press("Find in page");
    await until(alpha, page, Page, (p) => p.finding);
    await fill("Find in page", "agent");
    await until(alpha, page, Page, (p) => p.find.status === "Loaded" && p.matches > 1);
    await press("Next match");
    // spec/app/browser/address.md, "Closing the find bar clears the search"
    await press("Close find in page");
    await until(alpha, page, Page, (p) => !p.finding && p.matches === 0);

    // spec/app/browser/address.md, "Back and forward move through the tab's own pages"
    await go("enclave.example/keys-in-hardware");
    await until(alpha, page, Page, (p) => p.phase === "Shown" && p.behind === 1);
    await hardware("back");
    await until(alpha, page, Page, (p) => p.phase === "Shown" && p.behind === 0 && p.ahead === 1);
    expect([...world.browser.tabs.values()].map((one) => one.history[one.at])).toEqual(["https://news.example/on-device-agents"]);

    // spec/app/browser/address.md, "Text that is too long, or names a user or a password, is refused; an http or https address opens when it has a host; anything else is a search unless it reads as a host"
    await go("on device agents");
    await until(alpha, page, Page, (p) => p.phase === "Shown" && p.behind === 1);
    expect([...world.browser.tabs.values()].map((one) => one.history.at(-1))).toEqual(["https://www.google.com/search?q=on%20device%20agents"]);
  });

  it("Open, pick and close tabs (spec/app/browser/index.md, \"Story: Open, pick and close tabs\"; spec/app/browser/index.md, \"Story: Clear all browsing data\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    await go("news.example/on-device-agents");
    // spec/app/browser/index.md, "A new tab, normal or private, opens on top while fewer than eight are open"
    await press("Menu");
    await press("New private tab");
    await until(alpha, runtime, Tabs, (s) => s.open.length === 2 && s.privates.length === 1 && s.layer === "Address");
    await drawn(async () => {
      await fill("Address", "enclave.example/keys-in-hardware");
      document.querySelector<HTMLFormElement>("form[role=search]")?.requestSubmit();
    });
    await until(alpha, runtime, Tabs, (s) => s.native.length === 2);
    expect([...world.browser.tabs.values()].map((one) => one.private)).toEqual([false, true]);
    // spec/app/browser/index.md, "Picking another open tab shows it and uncovers the page"
    await press("Tabs");
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    const selected = document.querySelector<HTMLButtonElement>("button[aria-current=true]");
    if (!selected) throw new Error("no active tab card");
    await drawn(() => selected.click());
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered" && s.privates.includes(s.selected));
    await press("Tabs");
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    const original = [...document.querySelectorAll("button")].find((control) => control.textContent?.startsWith("The case for on-device agents"));
    if (!original) throw new Error("no original tab card");
    await drawn(() => original.click());
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered" && s.selected === s.open[0]);
    // spec/app/browser/index.md, "Closing a tab closes its native tab, shows another open tab if it was the one shown, and leaves one new tab when it was the last"
    await press("Tabs");
    await press("Close The case for on-device agents");
    await until(alpha, runtime, Tabs, (s) => s.open.length === 1 && s.selected === s.privates[0]);
    expect(world.browser.tabs.size).toBe(1);
    // spec/app/browser/index.md, "Cleared data takes every normal tab and the saved session with it, and keeps the private tabs"
    await hardware("back");
    await press("Menu");
    await press("Clear all browsing data");
    await until(alpha, runtime, Tabs, (s) => s.erasing === "Asked");
    await press("Clear");
    await until(alpha, runtime, Tabs, (s) => s.erasing === "Kept" && s.privates.length === 1 && s.kept.length === 0);
  });
});
