// spec/browser/webSurface.md, "Story: Show a page in a frame I can trust"
import { expect, it } from "vitest";
import { WebTabHost } from "../../src/browser/web-surface.ts";

type Report = { readonly id: string; readonly navigation: string; readonly url: string; readonly loading: boolean; readonly committed: boolean; readonly error: string };

function frameHost() {
  const session = "web-session";
  const host = new WebTabHost(session);
  const reports: Report[] = [];
  host.subscribe("stateChanged", (event) => reports.push(event as Report));
  const call = (method: string, args: Record<string, unknown> = {}) => host.call(method, { ...args, session });
  const frame = (id: string) => document.querySelector<HTMLIFrameElement>(`[data-browser-surface="${id}"] iframe`);
  return { host, reports, call, frame };
}

const page = (path: string) => new URL(path, location.origin).href;

// spec/browser/webSurface.md, "Each host navigation gets a fresh frame, and only that frame's first load commits the page"
it("each navigation gets a fresh frame whose first load commits, a replaced frame reports nothing, and a later load says the site moved on", async () => {
  const { reports, call, frame } = frameHost();
  await call("create", { id: "w1", private: false });
  await call("navigate", { id: "w1", url: page("/alpha-frame-one") });
  expect(reports.at(-1)).toMatchObject({ id: "w1", navigation: "1", loading: true, committed: false });
  await expect.poll(() => reports.at(-1)?.committed).toBe(true);
  const first = frame("w1");
  await call("navigate", { id: "w1", url: page("/alpha-frame-two") });
  const second = frame("w1");
  expect(second).not.toBe(first);
  const before = reports.length;
  first?.dispatchEvent(new Event("load"));
  expect(reports.length).toBe(before);
  await expect.poll(() => reports.at(-1)?.committed).toBe(true);
  second?.dispatchEvent(new Event("load"));
  expect(reports.at(-1)).toMatchObject({ committed: false, error: "Page blocked", navigation: "3" });
  await call("close", { id: "w1" });
});

// spec/browser/webSurface.md, "Stop swaps in a blank frame that reports nothing, and closing forgets the tab's history"
it("Stop swaps in a blank frame, closing forgets the tab, and another session's call is refused", async () => {
  const { reports, call, frame, host } = frameHost();
  await call("create", { id: "w2", private: true });
  await call("navigate", { id: "w2", url: page("/alpha-frame-stop") });
  await call("command", { id: "w2", command: "stop" });
  expect(reports.at(-1)).toMatchObject({ loading: false, committed: false, error: "Stopped" });
  expect(frame("w2")?.getAttribute("src")).toBe("about:blank");
  const stopped = reports.length;
  frame("w2")?.dispatchEvent(new Event("load"));
  expect(reports.length).toBe(stopped);
  await call("close", { id: "w2" });
  expect(frame("w2")).toBeNull();
  await expect(call("command", { id: "w2", command: "back" })).rejects.toThrow("Browser tab is unavailable");
  await expect(host.call("create", { id: "w3", session: "another-session" })).rejects.toThrow("Expired browser session");
});

// spec/browser/bookmarks.md, "A read replaces the marks with the store's list, keeping each saved name, and a failed read is reported, or offered for recovery once when the list is damaged"
it("the browser build's bookmark document keeps each name with its address, and a list from before names reads back untitled", async () => {
  const { call } = frameHost();
  const key = "alpha/browser/bookmarks", old = "https://old.test/", saved = "https://a.test/";
  localStorage.setItem(key, JSON.stringify([old]));
  try {
    expect(await call("bookmarks")).toEqual({ urls: [old], entries: [{ url: old }] });
    expect(await call("setBookmark", { url: saved, saved: true, title: "A page" })).toEqual({ urls: [saved, old], entries: [{ url: saved, title: "A page" }, { url: old }] });
    expect(await call("setBookmark", { url: saved, saved: true })).toEqual({ urls: [saved, old], entries: [{ url: saved, title: "A page" }, { url: old }] });
    expect(JSON.parse(localStorage.getItem(key) ?? "")).toEqual([{ url: saved, title: "A page" }, old]);
    expect(await call("setBookmark", { url: saved, saved: true, title: " " })).toEqual({ urls: [saved, old], entries: [{ url: saved }, { url: old }] });
    expect(JSON.parse(localStorage.getItem(key) ?? "")).toEqual([saved, old]);
  } finally {
    localStorage.removeItem(key);
  }
});

// spec/browser/bookmarks.md, "A read replaces the marks with the store's list, keeping each saved name, and a failed read is reported, or offered for recovery once when the list is damaged"
it("a saved row without a usable name reads as its address, and control characters in a name become spaces", async () => {
  const { call } = frameHost();
  const key = "alpha/browser/bookmarks", a = "https://a.test/", b = "https://b.test/", c = "https://c.test/";
  localStorage.setItem(key, JSON.stringify([{ url: a }, { url: b, title: 7 }, { url: c, title: "C\u0085page" }]));
  try {
    expect(await call("bookmarks")).toEqual({ urls: [a, b, c], entries: [{ url: a }, { url: b }, { url: c, title: "C page" }] });
    localStorage.setItem(key, JSON.stringify([a, { title: "no address" }]));
    await expect(call("bookmarks")).rejects.toThrow("Saved bookmarks could not be read");
  } finally {
    localStorage.removeItem(key);
  }
});
