// spec/browser/webSurface.md, "Each host navigation gets a fresh frame, and only that frame's first load commits the page"; spec/browser/webSurface.md, "Stop swaps in a blank frame that reports nothing, and closing forgets the tab's history"
import { isSecureWebAddress, isWebAddress } from "@elizaos/os/browser/address";

const MARKS_KEY = "alpha/browser/bookmarks";
const SESSION_KEY = "alpha/browser/session";
const MAX_MARKS = 100;
const MAX_MARK_TITLE = 300;

type Listener = (event: unknown) => void;
type BookmarkEntry = { url: string; title?: string };
interface FrameTab {
  readonly session: string;
  readonly id: string;
  readonly priv: boolean;
  frame: HTMLIFrameElement;
  readonly container: HTMLDivElement;
  readonly link: HTMLAnchorElement;
  history: string[];
  position: number;
  sequence: number;
  navigation: number;
  loading: boolean;
  committed: boolean;
  error: string;
}

function readJson(key: string): unknown {
  const raw = globalThis.localStorage?.getItem(key);
  if (raw === null || raw === undefined) return undefined;
  return JSON.parse(raw);
}

function bookmarkTitle(value: string): string {
  const title = value.replace(/[\x00-\x1f\x7f]/g, " ").replace(/^ +| +$/g, "");
  if (title.length <= MAX_MARK_TITLE) return title;
  const last = title.charCodeAt(MAX_MARK_TITLE - 1);
  const end = last >= 0xd800 && last <= 0xdbff ? MAX_MARK_TITLE - 1 : MAX_MARK_TITLE;
  return title.slice(0, end).replace(/ +$/g, "");
}

function bookmarkEntries(value: unknown): BookmarkEntry[] {
  if (value === undefined) return [];
  const invalid = "Saved bookmarks could not be read. Existing bookmarks were not changed.";
  if (!Array.isArray(value) || value.length > MAX_MARKS) throw new Error(invalid);
  const entries: BookmarkEntry[] = [];
  const seen = new Set<string>();
  for (const row of value as unknown[]) {
    let url: unknown;
    let title = "";
    if (typeof row === "string") url = row;
    else if (row !== null && typeof row === "object" && "url" in row && "title" in row && typeof row.title === "string") {
      url = row.url;
      title = bookmarkTitle(row.title);
    }
    if (typeof url !== "string" || !isSecureWebAddress(url) || seen.has(url)) throw new Error(invalid);
    entries.push(title ? { url, title } : { url });
    seen.add(url);
  }
  return entries;
}

function bookmarkResult(entries: BookmarkEntry[]) {
  return { urls: entries.map((entry) => entry.url), entries };
}

function webOnly(raw: unknown): string {
  if (typeof raw !== "string" || !isWebAddress(raw)) throw new Error("Enter an HTTP or HTTPS address without credentials");
  return raw;
}

/** The browser build's tab host: sandboxed frames with an opaque origin that never receive the host bridge. */
export class WebTabHost {
  private readonly tabs = new Map<string, FrameTab>();
  private readonly listeners = new Map<string, Set<Listener>>();

  /** A host for one session; it opens no frame until asked. @throws {never} */
  constructor(private readonly session: string) {}

  /** Listen to one of the host's events; returns how to stop. `bookmarksChanged` follows another tab's change to the bookmark document. */
  subscribe(name: string, listener: Listener): () => void {
    const set = this.listeners.get(name) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(name, set);
    if (name === "bookmarksChanged" && set.size === 1) globalThis.addEventListener?.("storage", this.storageChanged);
    return () => {
      set.delete(listener);
      if (name === "bookmarksChanged" && set.size === 0) globalThis.removeEventListener?.("storage", this.storageChanged);
    };
  }

  /** Another tab of this browser wrote the bookmark document, or cleared this origin's storage. */
  private readonly storageChanged = (event: StorageEvent) => {
    if (event.key === MARKS_KEY || event.key === null) this.emit("bookmarksChanged", { session: this.session });
  };

  /** One call of the tab-host contract. */
  async call(method: string, args: Record<string, unknown>): Promise<unknown> {
    if (args.session !== this.session) throw new Error("Expired browser session");
    switch (method) {
      case "create": return this.create(String(args.id), args.private === true);
      case "navigate": return this.navigate(this.tab(args.id), webOnly(args.url));
      case "command": return this.command(this.tab(args.id), String(args.command));
      case "present": return this.present(args);
      case "close": return this.close(String(args.id));
      case "bookmarks": return bookmarkResult(bookmarkEntries(readJson(MARKS_KEY)));
      case "setBookmark": return this.setBookmark(webOnly(args.url), args.saved === true, args.title);
      case "browsingState": return readJson(SESSION_KEY) ?? { history: [], tabs: [], cur: "" };
      case "saveBrowsingState": {
        globalThis.localStorage.setItem(SESSION_KEY, JSON.stringify({ history: args.history, tabs: args.tabs, cur: args.cur }));
        return {};
      }
      case "clearBrowsingData": return this.clearBrowsingData();
      case "clearSiteData": throw new Error("Clear website data in your browser settings.");
      case "share": return this.share(this.tab(args.id), String(args.url), String(args.navigation));
      case "downloads": {
        this.emit("showDownloads", { session: this.session });
        return {};
      }
      case "readingSupport": return { available: false };
      case "loginFillStatus": return { available: false, reason: "unsupported" };
      case "cancelReading": case "clearFind": return {};
      default: throw new Error("Browser operation failed");
    }
  }

  private emit(name: string, event: unknown) {
    for (const listener of this.listeners.get(name) ?? []) listener(event);
  }

  private tab(id: unknown): FrameTab {
    const tab = typeof id === "string" ? this.tabs.get(id) : undefined;
    if (!tab) throw new Error("Browser tab is unavailable");
    return tab;
  }

  private report(tab: FrameTab) {
    const url = tab.history[tab.position] ?? "";
    this.emit("stateChanged", {
      session: tab.session, id: tab.id, private: tab.priv, sequence: ++tab.sequence, navigation: String(tab.navigation),
      url, title: url, loading: tab.loading, committed: tab.committed, error: tab.error,
      canBack: tab.position > 0, canForward: tab.position < tab.history.length - 1,
    });
  }

  private create(id: string, priv: boolean) {
    if (this.tabs.has(id)) return {};
    const host = document.querySelector<HTMLElement>("[data-browser-surfaces]") ?? document.body;
    const container = document.createElement("div");
    container.dataset.browserSurface = id;
    container.hidden = true;
    container.className = "absolute flex flex-col overflow-hidden bg-background";
    const frame = document.createElement("iframe");
    frame.title = "Website";
    frame.referrerPolicy = "no-referrer";
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads");
    frame.className = "min-h-0 w-full flex-1 border-0 bg-background";
    const link = document.createElement("a");
    link.textContent = "Open in browser";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "px-3 py-2 text-right text-xs text-foreground";
    container.append(link, frame);
    host.append(container);
    this.tabs.set(id, { session: this.session, id, priv, frame, container, link, history: [], position: -1, sequence: 0, navigation: 0, loading: false, committed: false, error: "" });
    return {};
  }

  private load(tab: FrameTab) {
    const url = tab.history[tab.position] ?? "about:blank";
    tab.navigation += 1;
    tab.loading = true;
    tab.committed = false;
    tab.error = "";
    tab.link.href = url;
    const frame = tab.frame.cloneNode(false) as HTMLIFrameElement;
    frame.src = url;
    frame.addEventListener("load", () => {
      if (this.tabs.get(tab.id) !== tab || tab.frame !== frame) return;
      if (!tab.loading) {
        tab.navigation += 1;
        tab.committed = false;
        tab.error = "Page blocked";
      } else {
        tab.loading = false;
        tab.committed = true;
      }
      this.report(tab);
    });
    tab.frame.replaceWith(frame);
    tab.frame = frame;
    this.report(tab);
  }

  private navigate(tab: FrameTab, url: string) {
    tab.history = [...tab.history.slice(0, tab.position + 1), url];
    tab.position += 1;
    this.load(tab);
    return {};
  }

  private command(tab: FrameTab, command: string) {
    if (command === "back" && tab.position > 0) {
      tab.position -= 1;
      this.load(tab);
    } else if (command === "forward" && tab.position < tab.history.length - 1) {
      tab.position += 1;
      this.load(tab);
    } else if (command === "reload" && tab.position >= 0) this.load(tab);
    else if (command === "stop" && tab.loading) {
      const blank = tab.frame.cloneNode(false) as HTMLIFrameElement;
      blank.src = "about:blank";
      tab.frame.replaceWith(blank);
      tab.frame = blank;
      tab.navigation += 1;
      tab.loading = false;
      tab.committed = false;
      tab.error = "Stopped";
      this.report(tab);
    }
    return { session: this.session, id: tab.id };
  }

  private present(args: Record<string, unknown>) {
    for (const tab of this.tabs.values()) {
      const shown = tab.id === args.id;
      tab.container.hidden = !shown;
      if (!shown) continue;
      Object.assign(tab.container.style, { left: `${Number(args.x) || 0}px`, top: `${Number(args.y) || 0}px`, width: `${Number(args.width) || 0}px`, height: `${Number(args.height) || 0}px` });
    }
    return {};
  }

  private close(id: string) {
    this.tabs.get(id)?.container.remove();
    this.tabs.delete(id);
    return {};
  }

  private setBookmark(url: string, saved: boolean, requestedTitle: unknown) {
    if (!isSecureWebAddress(url)) throw new Error("Only HTTPS addresses without embedded credentials can be bookmarked.");
    if (requestedTitle != null && typeof requestedTitle !== "string") throw new Error("A bookmark title must be text.");
    const before = bookmarkEntries(readJson(MARKS_KEY));
    const title = requestedTitle == null ? before.find((entry) => entry.url === url)?.title : bookmarkTitle(requestedTitle);
    const entries = before.filter((entry) => entry.url !== url);
    if (saved) entries.unshift(title ? { url, title } : { url });
    if (entries.length > MAX_MARKS) throw new Error("Bookmark could not be saved. The device stores up to 100 bookmarks; existing data was not changed.");
    globalThis.localStorage.setItem(MARKS_KEY, JSON.stringify(entries.map((entry) => entry.title === undefined ? entry.url : entry)));
    return bookmarkResult(entries);
  }

  private clearBrowsingData() {
    const closed: string[] = [];
    for (const [id, tab] of this.tabs) {
      if (tab.priv) continue;
      tab.container.remove();
      this.tabs.delete(id);
      closed.push(id);
    }
    globalThis.localStorage.removeItem(SESSION_KEY);
    return { closed };
  }

  private async share(tab: FrameTab, url: string, navigation: string) {
    if (!tab.committed || tab.loading || tab.error || tab.container.hidden || String(tab.navigation) !== navigation || tab.history[tab.position] !== url) {
      throw new Error("The page changed. Share it again.");
    }
    if (!navigator.share) throw new Error("Sharing is unavailable in this browser. Use Copy text.");
    await navigator.share({ url });
    return {};
  }
}
