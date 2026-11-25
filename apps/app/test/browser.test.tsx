// @vitest-environment happy-dom
import type { DeviceOperation } from "@elizaos/agent/operations";
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Page } from "../gen/app__browser__address.effect.vibe";
import { Machine as Library } from "../gen/app__browser__library.effect.vibe";
import type { ExecutorCall } from "@elizaos/agent/client";
import { executeMedia } from "../src/assistant/media-executors.ts";
import { type MediaCard, direct } from "../src/assistant/media-review.vibe";
import { Pages } from "../src/browser/browser.vibe";
import browser from "../src/browser/index.tsx";
import { button, closeAll, drawn, fill, hardware, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** Alpha on an Alpha image with the Browser on screen. */
async function onBrowser(world = { ...scene(), phone: true, image: true }) {
  const running = await open(world);
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

describe("The Browser on a phone", () => {
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
    await press("Switch to The case for on-device agents");
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
  it("Open the page in another browser (spec/app/browser/share.md, \"Story: Open the page in another browser\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    world.browser.failing.set("plain.example", "insecure");
    world.browser.failing.set("down.example", "unreachable");
    const tab = () => runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));

    // spec/app/browser/share.md, "A page that could not load or timed out at an HTTPS address may open in another browser; any other failure may not"
    await go("plain.example");
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab())));
    await until(alpha, page, Page, (p) => p.phase === "Failed");
    expect(button("Open in browser")).toBeUndefined();

    await go("down.example/today");
    await until(alpha, page, Page, (p) => p.phase === "Failed");
    await press("Open in browser");
    await until(alpha, page, Page, () => world.browser.elsewhere.length === 1);
    expect(world.browser.elsewhere).toEqual(["https://down.example/today"]);

    // spec/app/browser/share.md, "The next load of the page ends the offer for a failed page"
    world.browser.failing.clear();
    await go("news.example/on-device-agents");
    await until(alpha, page, Page, (p) => p.phase === "Shown");
    expect(button("Open in browser")).toBeUndefined();
  });

  it("Let the agent open a page (spec/app/browser/index.md, \"Story: Let the agent open a page\"; spec/app/approvals/direct.md, \"Story: Let Alpha show me things without asking each time\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    // What Ask Alpha's approval runs once the owner approved the card: the operation, routed by executeMedia to the Browser.
    const approved = (operation: unknown, current = true) => act(async () => executeMedia(alpha, operation as DeviceOperation, {} as ExecutorCall, { current: async () => current }));
    const owner = runtime.runSync(Tabs.use((m) => m.get())).selected;

    // spec/app/browser/index.md, "The agent opens only an HTTPS address with no user name or password in it, in a new normal tab, one at a time"
    expect(await approved({ type: "browser_navigate", url: "http://news.example/on-device-agents" })).toMatchObject({ kind: "refused" });
    expect(await approved({ type: "browser_navigate", url: "https://me:secret@news.example/on-device-agents" })).toMatchObject({ kind: "refused" });
    expect(await approved({ type: "browser_navigate", url: "https://news.example/on-device-agents" }, false)).toMatchObject({ kind: "refused" });
    expect(runtime.runSync(Tabs.use((m) => m.get())).agent).toBe(0);
    expect(await approved({ type: "browser_navigate", url: "https://news.example/on-device-agents" })).toEqual({ kind: "applied" });
    await until(alpha, runtime, Tabs, (s) => s.agent !== 0 && s.selected === owner && s.native.includes(s.agent));
    const agentTab = runtime.runSync(Tabs.use((m) => m.get())).agent;
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(agentTab)));
    await until(alpha, page, Page, (p) => p.phase === "Shown");
    expect(world.browser.tabs.get(`tab${agentTab}`)?.history).toEqual(["https://news.example/on-device-agents"]);
    expect(await approved({ type: "browser_navigate", url: "https://enclave.example/keys-in-hardware" })).toMatchObject({ kind: "refused" });

    // spec/app/browser/index.md, "\"Stop and take over\" stops the agent and gives its tab to the owner"
    await press("Stop and take over");
    await until(alpha, runtime, Tabs, (s) => s.agent === 0);

    // spec/app/browser/index.md, "One layer at a time covers the page, and Back uncovers it": the tabs open with no card for the owner's current message only
    expect(direct({ operation: { type: "browser_tabs_show" } } as MediaCard)).toBe(true);
    expect(direct({ operation: { type: "browser_navigate", url: "https://news.example/" } } as MediaCard)).toBe(false);
    expect(await approved({ type: "browser_tabs_show" }, false)).toMatchObject({ kind: "refused" });
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered");
    expect(await approved({ type: "browser_tabs_show" })).toEqual({ kind: "applied" });
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    await hardware("back");
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered");
  });

  it("Keep bookmarks and look back through history (spec/app/browser/library.md, \"Story: Keep bookmarks\"; spec/app/browser/library.md, \"Story: Look back through history\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    await until(alpha, runtime, Library, (s) => s.read.status === "Loaded" && s.marks === 1);
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    await go("news.example/on-device-agents");
    const tab = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    await until(alpha, page, Page, (p) => p.phase === "Shown");

    // spec/app/browser/library.md, "A page that commits in a normal tab is counted in history, which keeps the newest hundred"
    await until(alpha, runtime, Library, (s) => s.history === 4);

    // spec/app/browser/library.md, "Bookmarking the shown page adds it when it is an HTTPS page without a user name or password and fewer than a hundred are saved, and otherwise says why not"
    await press("Menu");
    await press("Bookmark this page");
    await until(alpha, runtime, Library, (s) => s.marks === 2 && s.job === "Idle");
    expect(world.browser.bookmarks.map((one) => one.url)).toEqual(["https://news.example/on-device-agents", "https://enclave.example/keys-in-hardware"]);

    // spec/app/browser/share.md, "Choosing where to send the page sends it once, if it is still the page the panel opened on, and closes the panel": Copy link, as v121.
    await press("Menu");
    await press("Share");
    await press("Copy link");
    await until(alpha, runtime, Library, () => document.body.textContent?.includes("Link copied") === true);
    expect(world.settings.copied).toEqual(["https://news.example/on-device-agents"]);

    // spec/app/browser/library.md, "Clearing all browsing data empties history at once"
    await press("Menu");
    await press("Clear all browsing data");
    await press("Clear");
    await until(alpha, runtime, Library, (s) => s.history === 0);
  });

  it("Let my agent read the page I have open in Browser (spec/app/assistant/context.md, \"Story: Let my agent read the page I have open in Browser\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    await go("news.example/on-device-agents");
    const tab = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    await until(alpha, page, Page, (p) => p.phase === "Shown");
    const ask = async (text: string) => {
      world.ask.metadata = [];
      act(() => {
        const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
        if (!box) throw new Error("no composer");
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
        box.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await press("Send");
      await until(alpha, runtime, Tabs, () => (world.ask.metadata?.length ?? 0) > 0);
      return world.ask.metadata?.[0] as { observation?: { view?: string }; browserPage?: { url?: string; text?: string; tabId?: string } } | undefined;
    };

    // spec/app/assistant/context.md, "A turn carries the page Browser hands it for the tab in front, beside the observation, only to a peer that declares it"
    const shown = await ask("Summarize this page");
    expect(shown?.observation?.view).toBe("browser");
    expect(shown?.browserPage).toMatchObject({ url: "https://news.example/on-device-agents", tabId: `tab${tab}` });
    expect(shown?.browserPage?.text).toContain("agent");

    // A private tab is never read.
    await press("Menu");
    await press("New private tab");
    await until(alpha, runtime, Tabs, (s) => s.privates.includes(s.selected));
    await go("news.example/on-device-agents");
    const secret = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    await until(alpha, runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(secret))), Page, (p) => p.phase === "Shown");
    expect((await ask("Summarize this page"))?.browserPage).toBeUndefined();
  });

  it("History is kept through a restart (spec/app/browser/library.md, \"Story: Look back through history\"; spec/app/browser/index.md, \"Story: Save the session\")", async () => {
    const first = await onBrowser();
    await until(first.alpha, first.runtime, Library, (s) => s.read.status === "Loaded" && s.history === 3);
    await until(first.alpha, first.runtime, Tabs, (s) => s.hydrated);
    await go("news.example/on-device-agents");
    const tab = first.runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    const page = first.runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    await until(first.alpha, page, Page, (p) => p.phase === "Shown");
    // spec/app/browser/index.md, "A stale session is written once it has been read, one write at a time, and never while browsing data is being cleared": the session written keeps history.
    await until(first.alpha, first.runtime, Tabs, () => first.world.browser.saved.history.length === 4);
    expect(first.world.browser.saved.history.at(-1)).toBe("https://news.example/on-device-agents");

    await closeAll();
    const again = await onBrowser(first.world);
    await until(again.alpha, again.runtime, Library, (s) => s.read.status === "Loaded" && s.history === 4);
  });
});
