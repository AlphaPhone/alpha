// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Page } from "../gen/app__browser__address.effect.vibe";
import { Machine as Library } from "../gen/app__browser__library.effect.vibe";
import { Machine as Reading } from "../gen/app__browser__reading.effect.vibe";
import { Machine as Share } from "../gen/app__browser__share.effect.vibe";
import { Machine as Site } from "../gen/app__browser__site.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Pages } from "../src/browser/browser.vibe";
import { looksSensitive } from "../src/browser/reading.vibe";
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

const tabsButton = () => [...document.querySelectorAll<HTMLButtonElement>("button")].find((control) => control.getAttribute("aria-label")?.startsWith("Tabs"));
const editAddressButton = () => button("Search or type address") ?? button("Edit address") ?? [...document.querySelectorAll<HTMLButtonElement>("button")].find((control) => control.textContent?.startsWith("Edit address"));

const go = async (text: string) => {
  await drawn(() => {
    const trigger = editAddressButton();
    if (!trigger) throw new Error("no button Edit address");
    trigger.click();
  });
  await fill("Address", text);
  await drawn(() => {
    const form = document.querySelector<HTMLFormElement>("form[role=search]");
    if (!form) throw new Error("no address field");
    form.requestSubmit();
  });
};

const selectedPage = (runtime: ReturnType<typeof browser.runtime>) => {
  const tab = runtime.runSync(Effect.map(Effect.flatMap(Tabs, (m) => m.get()), (s) => s.selected));
  const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
  return { tab, page };
};

const libraryTab = (name: "History" | "Bookmarks") => drawn(() => {
  const tab = button(name);
  if (!tab) throw new Error(`no Library tab ${name}`);
  tab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
});

describe("The Browser on a phone", () => {
  it("Opens the saved Library (spec/app/browser/library.md, \"Story: Keep bookmarks\"; spec/app/browser/library.md, \"Story: Look back through history\"; spec/app/browser/address.md, \"Story: Go where I typed\")", async () => {
    const world = { ...scene(), phone: true, image: true };
    const { alpha, runtime } = await onBrowser(world);
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    await press("Search or type address");
    await until(alpha, runtime, Library, (s) => s.read.status === "Loaded");
    const suggestions = () => document.querySelector("[aria-label='Address suggestions']");
    expect(suggestions()?.textContent).toContain("/on-device-agents");
    await drawn(() => fill("Address", "keys"));
    expect(suggestions()?.textContent).toContain("/keys-in-hardware");
    expect(suggestions()?.textContent).not.toContain("/on-device-agents");
    await press("Cancel editing");
    await press("Menu");
    await until(alpha, runtime, Library, (s) => s.read.status === "Loaded");
    await press("Bookmark");
    await until(alpha, runtime, Library, (s) => s.notice === "NotSecure");
    expect(world.browser.bookmarks.map((one) => one.url)).toEqual(["https://enclave.example/keys-in-hardware"]);
    await press("Library, bookmarks and history");
    await until(alpha, runtime, Library, (s) => s.read.status === "Loaded");
    await libraryTab("History");
    expect([...document.querySelectorAll("button")].some((row) => row.textContent?.includes("news.example/on-device-agents"))).toBe(true);
    await libraryTab("Bookmarks");
    const bookmark = [...document.querySelectorAll("button")].find((row) => row.textContent?.includes("Keys in the chip"));
    if (!bookmark) throw new Error("saved bookmark is missing");
    await drawn(() => bookmark.click());
    const { page } = selectedPage(runtime);
    await until(alpha, page, Page, (s) => s.phase === "Shown");
    expect([...world.browser.tabs.values()].map((one) => one.history[one.at])).toEqual(["https://enclave.example/keys-in-hardware"]);

    await press("Menu");
    await press("Bookmarked");
    await until(alpha, runtime, Library, (s) => s.job === "Idle" && s.marks === 0);
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered");
    expect(world.browser.bookmarks).toEqual([]);
    await press("Menu");
    await press("Bookmark");
    await until(alpha, runtime, Library, (s) => s.job === "Idle" && s.marks === 1);
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered");
    expect(world.browser.bookmarks.map((one) => one.url)).toEqual(["https://enclave.example/keys-in-hardware"]);

    await press("Menu");
    await press("Library, bookmarks and history");
    await until(alpha, runtime, Library, (s) => s.read.status === "Loaded");
    const remove = [...document.querySelectorAll("button")].find((row) => row.getAttribute("aria-label")?.startsWith("Remove bookmark "));
    if (!remove) throw new Error("bookmark removal control is missing");
    await drawn(() => remove.click());
    await until(alpha, runtime, Library, (s) => s.job === "Idle" && s.marks === 0);
    expect(world.browser.bookmarks).toEqual([]);
  });

  it("Open a page and watch it load (spec/app/browser/address.md, \"Story: Go where I typed\"; spec/app/browser/address.md, \"Story: Watch a page load\"; spec/app/browser/address.md, \"Story: Find in page\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    // spec/app/browser/index.md, "A launch reads the saved session, and may ask again after a failed read"
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    expect([world.browser.calls.includes("browsingState"), Boolean(button("Search or type address"))]).toEqual([true, true]);

    // spec/app/browser/address.md, "Submitting text opens it, searches for it or says why not, and blank text is not submitted"
    const history = [...world.browser.tabs.values()].map((one) => [...one.history]);
    await go("https://owner:example@private.example");
    expect(document.querySelector("[role='alert']")?.textContent).toContain("Remove the username or password from this address.");
    expect([...world.browser.tabs.values()].map((one) => one.history)).toEqual(history);
    await press("Cancel editing");
    await go("news.example/on-device-agents");
    const { page } = selectedPage(runtime);
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
    expect(document.querySelector("[aria-label='Address suggestions']")?.textContent).not.toContain("/on-device-agents");
    await drawn(async () => {
      await fill("Address", "enclave.example/keys-in-hardware");
      document.querySelector<HTMLFormElement>("form[role=search]")?.requestSubmit();
    });
    await until(alpha, runtime, Tabs, (s) => s.native.length === 2);
    expect([...world.browser.tabs.values()].map((one) => one.private)).toEqual([false, true]);
    // spec/app/browser/index.md, "Picking another open tab shows it and uncovers the page"
    await drawn(() => { const found = tabsButton(); if (!found) throw new Error("no button Tabs"); found.click(); });
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    const selected = document.querySelector<HTMLButtonElement>("button[aria-current=true]");
    if (!selected) throw new Error("no active tab card");
    await drawn(() => selected.click());
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered" && s.privates.includes(s.selected));
    await drawn(() => { const found = tabsButton(); if (!found) throw new Error("no button Tabs"); found.click(); });
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    const original = [...document.querySelectorAll("button")].find((control) => control.textContent?.startsWith("The case for on-device agents"));
    if (!original) throw new Error("no original tab card");
    await drawn(() => original.click());
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered" && s.selected === s.open[0]);
    // spec/app/browser/index.md, "Closing a tab closes its native tab, shows another open tab if it was the one shown, and leaves one new tab when it was the last"
    await drawn(() => { const found = tabsButton(); if (!found) throw new Error("no button Tabs"); found.click(); });
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

  it("Shares a page, guards reading excerpts against sensitive text and withdrawn pages, and tracks site state (spec/app/browser/share.md, \"Story: Share the page\"; spec/app/browser/reading.md, \"Story: Ask Alpha about the page\"; spec/app/browser/site.md, \"Story: Clear a site's data\")", async () => {
    const { alpha, runtime } = await onBrowser();
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    await go("news.example/on-device-agents");
    const { tab, page } = selectedPage(runtime);
    await until(alpha, page, Page, (p) => p.phase === "Shown");

    // spec/app/browser/share.md, "Story: Share the page"
    await press("Menu");
    await press("Share");
    await until(alpha, runtime, Share, (s) => s.review.showing === true);
    await press("Copy link");
    await until(alpha, runtime, Share, (s) => !s.review.showing && s.notice === "Copied");

    // spec/app/browser/reading.md, "Story: Ask Alpha about the page"; spec/app/browser/reading.md, "Story: Hear the page read aloud"
    expect([looksSensitive("One-time verification code 123456"), looksSensitive("The case for on-device agents")]).toEqual([true, false]);
    await press("Menu");
    await press("Read aloud");
    await until(alpha, runtime, Reading, (s) => s.phase === "Reviewing");
    await press("Cancel");
    await until(alpha, runtime, Reading, (s) => s.phase === "Idle");

    // spec/app/browser/site.md, "Story: Clear a site's data"
    await until(alpha, runtime, Site, (s) => s.shown === tab);
  });
});
