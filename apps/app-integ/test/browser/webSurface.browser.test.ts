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
