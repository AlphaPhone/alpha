// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Page } from "../gen/app__browser__address.effect.vibe";
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
  it("Open a page and watch it load (spec/app/browser/address.md, \"Story: Go where I typed\"; spec/app/browser/address.md, \"Story: Watch a page load\")", async () => {
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
});
