// @vitest-environment happy-dom
import type { DeviceOperation, ExecutorCall } from "@elizaos/agent";
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Page } from "../gen/app__browser__address.effect.vibe";
import { Machine as Library } from "../gen/app__browser__library.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import assistant from "../src/assistant/index.tsx";
import { executeMedia } from "../src/assistant/media-executors.ts";
import { Pages } from "../src/browser/browser.vibe";
import browser from "../src/browser/index.tsx";
import home from "../src/home/index.tsx";
import { button, closeAll, drawn, fill, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { textReview } from "./fakes/text-review.ts";

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

/** Alpha on an Alpha image with the Browser on screen and Ask Alpha's bar over it. */
async function askingOnBrowser(world = { ...scene(), phone: true, image: true }) {
  const running = await open(world, only("home", "assistant", "notice", "view:Browser"));
  await until(running.alpha, home.runtime(running.alpha), Home, (h) => h.tiles.load.status === "Loaded");
  const runtime = browser.runtime(running.alpha);
  await press("Browser");
  await until(running.alpha, runtime, Tabs, (s) => s.hydrated);
  const asking = assistant.runtime(running.alpha);
  await until(running.alpha, asking, Conversation, (c) => c.ready && c.context.showing.tag === "App");
  return { ...running, world, runtime, asking };
}

/** Ask Alpha from the bar over the Browser, and wait for the reply to end. */
async function ask(running: Awaited<ReturnType<typeof askingOnBrowser>>, text: string) {
  const { alpha, asking, world } = running;
  world.ask.metadata = [];
  await act(async () => {
    const box = [...document.querySelectorAll("textarea")].find((one) => one.getAttribute("aria-label") === "Message Alpha" || one.getAttribute("aria-label") === "Ask about this page");
    if (!box) throw new Error("no composer");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await vi.waitFor(() => expect(button("Send")?.disabled).toBe(false));
  await press("Send");
  await until(alpha, asking, Conversation, (c) => c.turn.reply === "Complete" && (world.ask.metadata?.length ?? 0) > 0);
  return world.ask.metadata?.[0] as { observation?: { view?: string }; browserPage?: { url?: string; text?: string; tabId?: string } } | undefined;
}

const go = (text: string) => drawn(async () => {
  await press(button("Search or type address") ? "Search or type address" : /^Edit address/);
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
    const tab = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
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
    expect(document.querySelector("[aria-label='Address suggestions']")?.textContent).not.toContain("/on-device-agents");
    await drawn(async () => {
      await fill("Address", "enclave.example/keys-in-hardware");
      document.querySelector<HTMLFormElement>("form[role=search]")?.requestSubmit();
    });
    await until(alpha, runtime, Tabs, (s) => s.native.length === 2);
    expect([...world.browser.tabs.values()].map((one) => one.private)).toEqual([false, true]);
    // spec/app/browser/index.md, "Picking another open tab shows it and uncovers the page"
    await press(/^Tabs\b/);
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    const selected = document.querySelector<HTMLButtonElement>("button[aria-current=true]");
    if (!selected) throw new Error("no active tab card");
    await drawn(() => selected.click());
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered" && s.privates.includes(s.selected));
    await press(/^Tabs\b/);
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    const original = [...document.querySelectorAll("button")].find((control) => control.textContent?.startsWith("The case for on-device agents"));
    if (!original) throw new Error("no original tab card");
    await drawn(() => original.click());
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered" && s.selected === s.open[0]);
    // spec/app/browser/index.md, "Closing a tab closes its native tab, shows another open tab if it was the one shown, and leaves one new tab when it was the last"
    await press(/^Tabs\b/);
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

    // spec/app/browser/share.md, "Only an unreachable HTTPS address makes a failed page leave, and only from a normal tab": an http-only site has no way out.
    await go("plain.example");
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab())));
    await until(alpha, page, Page, (p) => p.phase === "Failed");
    expect(button("Open in browser")).toBeUndefined();

    await go("down.example/today");
    await until(alpha, page, Page, (p) => p.phase === "Failed");
    // The button sits under the Browser's own bar, above the page, never near Ask Alpha.
    const offer = button("Open in browser");
    const place = document.querySelector("[data-alpha-browser-page]");
    expect(offer !== undefined && place !== null && (offer.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
    await press("Open in browser");
    await until(alpha, page, Page, () => world.browser.elsewhere.length === 1);
    expect(world.browser.elsewhere).toEqual(["https://down.example/today"]);

    // spec/app/browser/share.md, "The next load of the page ends the offer for a failed page"
    world.browser.failing.clear();
    await go("news.example/on-device-agents");
    await until(alpha, page, Page, (p) => p.phase === "Shown");
    expect(button("Open in browser")).toBeUndefined();
  });

  it("Share the page (spec/app/browser/share.md, \"Story: Share the page\")", async () => {
    const { alpha, runtime, world } = await onBrowser();
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    await go("news.example/on-device-agents");
    const tab = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab)));
    await until(alpha, page, Page, (p) => p.phase === "Shown");

    // spec/app/browser/share.md, "Choosing where to send the page sends it once, if it is still the page the panel opened on, and closes the panel": Copy link, as v121.
    await press("Menu");
    await press("Share");
    await press("Copy link");
    await until(alpha, page, Page, () => document.body.textContent?.includes("Link copied") === true);
    expect(world.settings.copied).toEqual(["https://news.example/on-device-agents"]);

    await press("Menu");
    await press("Share");
    await press("Share to an app");
    await until(alpha, page, Page, () => world.browser.shared.length === 1);
    expect(world.browser.shared).toEqual(["https://news.example/on-device-agents"]);
  });

  it("Let the agent open a page from Ask Alpha's card (spec/app/browser/index.md, \"Story: Let the agent open a page\"; spec/app/approvals/proposal.md, \"Story: Decide\")", async () => {
    const world = { ...scene(), phone: true, image: true };
    const review = textReview(world.notes.owner, "open-a-page", { type: "browser_navigate", url: "https://news.example/on-device-agents" }, "m1u");
    world.telephony.textReview = review;
    const running = await askingOnBrowser(world);
    const { alpha, runtime } = running;
    const owner = runtime.runSync(Tabs.use((m) => m.get())).selected;

    await ask(running, "Open the article about on-device agents");
    await vi.waitFor(() => expect(button("Approve")).toBeDefined());
    expect(document.body.textContent).toContain("Open a page in Browser");
    expect(document.body.textContent).toContain("https://news.example/on-device-agents");
    expect(runtime.runSync(Tabs.use((m) => m.get())).agent).toBe(0);
    await press("Approve");

    // spec/app/browser/index.md, "The agent opens only an HTTPS address with no user name or password in it, in a new normal tab, one at a time"
    await until(alpha, runtime, Tabs, (s) => s.agent !== 0 && s.native.includes(s.agent));
    const agentTab = runtime.runSync(Tabs.use((m) => m.get())).agent;
    expect(agentTab).not.toBe(owner);
    const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(agentTab)));
    await until(alpha, page, Page, (p) => p.phase === "Shown");
    expect(world.browser.tabs.get(`tab${agentTab}`)?.history).toEqual(["https://news.example/on-device-agents"]);
    await vi.waitFor(() => expect(review.receipts).toEqual([expect.objectContaining({ outcome: "applied" })]));
    expect(review.decisions).toEqual([review.proposal.id]);

    // spec/app/browser/index.md, "\"Stop and take over\" stops the agent and gives its tab to the owner"
    await press("Stop and take over");
    await until(alpha, runtime, Tabs, (s) => s.agent === 0);
  });

  it("Declining the agent's page tells the agent and opens nothing (spec/app/approvals/proposal.md, \"Story: Decide\")", async () => {
    const world = { ...scene(), phone: true, image: true };
    const review = textReview(world.notes.owner, "declined-page", { type: "browser_navigate", url: "https://news.example/on-device-agents" }, "m1u");
    world.telephony.textReview = review;
    const running = await askingOnBrowser(world);
    await ask(running, "Open the article about on-device agents");
    await vi.waitFor(() => expect(button("Decline")).toBeDefined());
    await press("Decline");
    await vi.waitFor(() => expect(review.declines).toEqual([review.proposal.id]));
    expect([review.decisions, review.claims, running.runtime.runSync(Tabs.use((m) => m.get())).agent]).toEqual([[], [], 0]);
  });

  it("The tab list opens with no card for the owner's current message (spec/app/approvals/direct.md, \"Story: Let Alpha show me things without asking each time\")", async () => {
    const world = { ...scene(), phone: true, image: true };
    const review = textReview(world.notes.owner, "show-tabs", { type: "browser_tabs_show" }, "m1u");
    world.telephony.textReview = review;
    const running = await askingOnBrowser(world);
    const { alpha, runtime } = running;
    await ask(running, "Show my tabs");
    // spec/app/approvals/direct.md, "The agent runs directly only what is on the allow-list, for the message being answered, at most four times, by the owner's choice and on a screen that is not protected"
    await until(alpha, runtime, Tabs, (s) => s.layer === "Switcher");
    expect(button("Approve")).toBeUndefined();
    await vi.waitFor(() => expect(review.receipts).toEqual([expect.objectContaining({ outcome: "applied" })]));
    await hardware("back");
    await until(alpha, runtime, Tabs, (s) => s.layer === "Uncovered");
  });

  it("The agent's page is refused unless it is HTTPS with no user name, still approved, and the only agent tab (spec/app/browser/index.md, \"The agent opens only an HTTPS address with no user name or password in it, in a new normal tab, one at a time\")", async () => {
    const { alpha, runtime } = await onBrowser();
    await until(alpha, runtime, Tabs, (s) => s.hydrated);
    const approved = (operation: unknown, current = true) => act(async () => executeMedia(alpha, operation as DeviceOperation, {} as ExecutorCall, { current: async () => current }));
    expect(await approved({ type: "browser_navigate", url: "http://news.example/on-device-agents" })).toMatchObject({ kind: "refused" });
    expect(await approved({ type: "browser_navigate", url: "https://me:secret@news.example/on-device-agents" })).toMatchObject({ kind: "refused" });
    expect(await approved({ type: "browser_navigate", url: "https://news.example/on-device-agents" }, false)).toMatchObject({ kind: "refused" });
    expect(runtime.runSync(Tabs.use((m) => m.get())).agent).toBe(0);
    expect(await approved({ type: "browser_navigate", url: "https://news.example/on-device-agents" })).toEqual({ kind: "applied" });
    await until(alpha, runtime, Tabs, (s) => s.agent !== 0);
    expect(await approved({ type: "browser_navigate", url: "https://enclave.example/keys-in-hardware" })).toMatchObject({ kind: "refused" });
    expect(await approved({ type: "browser_tabs_show" }, false)).toMatchObject({ kind: "refused" });
  });

  it("Let my agent read the page I have open in Browser (spec/app/assistant/context.md, \"Story: Let my agent read the page I have open in Browser\")", async () => {
    const running = await askingOnBrowser();
    const { alpha, runtime } = running;
    await go("news.example/on-device-agents");
    const tab = runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    await until(alpha, runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab))), Page, (p) => p.phase === "Shown");

    // spec/app/assistant/context.md, "A turn carries the page Browser hands it for the tab in front, beside the observation, only to a peer that declares it"
    const shown = await ask(running, "Summarize this page");
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
    expect((await ask(running, "Summarize this page"))?.browserPage).toBeUndefined();
  });

  it("History is kept through a restart (spec/app/browser/library.md, \"Story: Look back through history\"; spec/app/browser/index.md, \"Story: Save the session\")", async () => {
    const first = await onBrowser();
    await until(first.alpha, first.runtime, Tabs, (s) => s.hydrated);
    await go("enclave.example/keys-in-hardware");
    const tab = first.runtime.runSync(Effect.map(Tabs.use((m) => m.get()), (s) => s.selected));
    await until(first.alpha, first.runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(tab))), Page, (p) => p.phase === "Shown");
    // spec/app/browser/index.md, "A stale session is written once it has been read, one write at a time, and never while browsing data is being cleared": the session written keeps history.
    await until(first.alpha, first.runtime, Tabs, (s) => !s.stale && first.world.browser.saved.history[0] === "https://enclave.example/keys-in-hardware");
    const kept = [...first.world.browser.saved.history];
    expect(kept.length).toBeGreaterThan(0);

    await closeAll();
    const again = await onBrowser(first.world);
    await until(again.alpha, again.runtime, Tabs, (s) => s.hydrated);
    expect(again.runtime.runSync(Effect.flatMap(Pages, (pages) => pages.visits()))).toEqual(kept);
  });
});
