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
it("keeps a page's saved name across hosts while older address-only data remains readable", async () => {
  const key = "alpha/browser/bookmarks";
  const previous = localStorage.getItem(key);
  const first = "https://old.example/";
  const second = "https://named.example/article";
  try {
    localStorage.setItem(key, JSON.stringify([first]));
    const { call } = frameHost();
    await expect(call("bookmarks")).resolves.toEqual({ urls: [first], entries: [{ url: first }] });
    await call("setBookmark", { url: second, saved: true, title: "  Saved\npage  " });
    const reopened = new WebTabHost("reopened");
    const list = { urls: [second, first], entries: [{ url: second, title: "Saved page" }, { url: first }] };
    await expect(reopened.call("bookmarks", { session: "reopened" })).resolves.toEqual(list);
    await expect(reopened.call("setBookmark", { session: "reopened", url: second, saved: true })).resolves.toEqual(list);
    await expect(call("setBookmark", { url: second, saved: true, title: 42 })).rejects.toThrow("A bookmark title must be text.");
    await expect(call("bookmarks")).resolves.toEqual(list);
    await expect(call("setBookmark", { url: second, saved: true, title: " " })).resolves.toEqual({
      urls: [second, first],
      entries: [{ url: second }, { url: first }],
    });
    expect(localStorage.getItem(key)).toBe(JSON.stringify([second, first]));
  } finally {
    if (previous === null) localStorage.removeItem(key);
    else localStorage.setItem(key, previous);
  }
});
