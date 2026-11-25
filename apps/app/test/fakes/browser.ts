// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/address.md, "Story: Watch a page load"
import type { BrowserBookmarkList, BrowserSavedState, BrowserTabHostPlugin, BrowserTabState } from "@elizaos/os-bridges";
import { type Faked, plugin, rejection } from "./phone.ts";

interface TabEvents {
  stateChanged: BrowserTabState;
  tabOpened: { session: string; id: string; opener?: string; private?: boolean };
  tabClosed: { session: string; id: string };
}

/** One native tab of the fake tab host: its web view's history and what it shows. */
interface Held {
  readonly id: string;
  readonly private: boolean;
  readonly history: string[];
  at: number;
  sequence: number;
  navigation: number;
  loading: boolean;
  committed: boolean;
}

/** What the fake phone's tab host keeps, as `AlphaBrowserPlugin` keeps it: its saved session, bookmarks and the tabs it holds. */
export interface BrowserScene {
  saved: BrowserSavedState;
  bookmarks: { url: string; title?: string }[];
  readonly tabs: Map<string, Held>;
  /** The tab drawn and where, as `present` last placed it. */
  shown: { id: string; x: number; y: number; width: number; height: number } | undefined;
  /** Every call the page made, by method. */
  readonly calls: string[];
}

/** develop's fixture photographs, served beside the fakes. */
const enclaveImage = new URL("./img/enclave.webp", import.meta.url).href;
const newsImage = new URL("./img/news.webp", import.meta.url).href;
const nopaImage = new URL("./img/nopa.webp", import.meta.url).href;

const news = "https://news.example/on-device-agents";
const enclave = "https://enclave.example/keys-in-hardware";
const book = "https://tables.example/nopa";

/** The reference pages of develop's fixtures: what a site there draws, by its address. */
const sites: Record<string, { title: string; draw: () => string }> = {
  [news]: { title: "The case for on-device agents", draw: () => article(newsImage, "The case for on-device agents", "news.example · 6 min", [
    "An assistant that lives on your phone sees everything you do. The question is who else gets to see it. Keeping the model and its memory on the device changes the answer.",
    "When the agent runs next to your data, it can act without sending your inbox or calendar anywhere. It also stays useful with no signal.",
    `${link(enclave, "Hardware-held keys")} make the agent accountable to one person: its owner. Every action it takes can be signed and checked later.`,
    "The interface should get quieter, not louder. Fewer screens, one conversation, and the right card at the right moment.",
    `Try it: ask an agent to ${link(book, "book dinner at Nopa")} and watch it stop before it pays.`,
  ]) },
  [enclave]: { title: "Keys in the chip", draw: () => article(enclaveImage, "Keys that never leave the chip", "enclave.example · 4 min", [
    "A secure enclave is a small, sealed part of the processor. Keys are created inside it and can be used there, but never read out.",
    "When an agent signs an action with one of those keys, anyone can check that it came from your device, and only your device.",
    "That makes the phone the root of trust, not a server you have to believe.",
    `More on why this matters: ${link(news, "the case for on-device agents")}.`,
  ]) },
  [book]: { title: "Nopa · Book a table", draw: () => booking() },
};

const style = (rules: Record<string, string>) => Object.entries(rules).map(([name, value]) => `${name}:${value}`).join(";");
const paragraph = style({ "font-size": "16px", "line-height": "1.6", margin: "16px 0 0" });

function link(href: string, words: string): string {
  return `<a href="${href}" style="${style({ color: "var(--primary)", "text-decoration": "underline", "text-underline-offset": "3px" })}">${words}</a>`;
}

function article(image: string, title: string, byline: string, paragraphs: string[]): string {
  return `<div style="${style({ height: "210px", background: `url(${image}) center / cover no-repeat` })}"></div>
<div style="${style({ padding: "24px 24px 140px" })}">
<h2 style="${style({ margin: "0", "font-family": "var(--font-display)", "font-size": "36px", "line-height": "1.05", "font-weight": "300", "letter-spacing": "-.01em" })}">${title}</h2>
<div style="${style({ color: "var(--muted-foreground)", "margin-top": "12px", "font-size": "13px" })}">${byline}</div>
${paragraphs.map((text, at) => `<p style="${paragraph}${at === 0 ? ";margin-top:22px" : ""}">${text}</p>`).join("\n")}
</div>`;
}

function booking(): string {
  const chip = (words: string, on = false) => `<button style="${style({ flex: "1", height: "46px", "border-radius": "23px", "font-size": "14.5px", "font-weight": "600", border: "0", background: on ? "var(--primary)" : "var(--secondary)", color: on ? "var(--primary-foreground)" : "var(--foreground)" })}">${words}</button>`;
  const field = (words: string) => `<input placeholder="${words}" aria-label="${words}" style="${style({ display: "block", width: "100%", "box-sizing": "border-box", height: "50px", "margin-top": "8px", "border-radius": "16px", border: "0", background: "var(--secondary)", color: "var(--foreground)", padding: "0 16px", "font-size": "16px" })}">`;
  return `<div style="${style({ position: "relative", height: "128px", background: `url(${nopaImage}) center / cover no-repeat` })}"></div>
<div style="${style({ padding: "18px 22px 140px" })}">
<h2 style="${style({ margin: "0", "font-family": "var(--font-display)", "font-size": "34px", "line-height": "1.05", "font-weight": "300" })}">Nopa</h2>
<div style="${style({ color: "var(--muted-foreground)", "margin-top": "6px", "font-size": "13.5px" })}">Californian · 560 Divisadero St</div>
<div style="${style({ display: "flex", gap: "8px", "margin-top": "18px" })}">${chip("Tonight", true)}${chip("Tomorrow")}${chip("Fri")}</div>
${field("Name")}${field("Phone")}
</div>`;
}

function searched(query: string): string {
  const rows = Object.entries(sites).map(([href, site]) => {
    const url = new URL(href);
    return `<a href="${href}" style="${style({ display: "block", padding: "16px 4px", "border-bottom": "1px solid var(--border)", color: "inherit", "text-decoration": "none" })}">
<div style="${style({ "font-size": "12.5px", color: "var(--muted-foreground)" })}">${url.host}${url.pathname}</div>
<div style="${style({ "font-size": "18px", "font-weight": "600", color: "var(--primary)", "margin-top": "4px" })}">${site.title}</div></a>`;
  });
  return `<div style="${style({ padding: "10px 20px 140px" })}"><div style="${style({ "font-family": "var(--font-display)", "font-size": "30px", "line-height": "1.15", padding: "0 4px 8px" })}">${query}</div>${rows.join("")}</div>`;
}

function generic(url: URL): string {
  const name = (url.hostname.split(".")[0] ?? "").replace(/-/g, " ");
  const named = name.charAt(0).toUpperCase() + name.slice(1);
  return `<div style="${style({ position: "relative", height: "170px", background: "var(--secondary)", overflow: "hidden" })}"><div style="${style({ position: "absolute", right: "28px", top: "34px", "font-family": "var(--font-display)", "font-size": "76px", "line-height": "1", color: "var(--muted-foreground)" })}">${named.charAt(0)}</div></div>
<div style="${style({ padding: "22px 24px 140px" })}"><h2 style="${style({ margin: "0", "font-family": "var(--font-display)", "font-size": "34px", "line-height": "1.05", "font-weight": "300" })}">${named}</h2>
<div style="${style({ color: "var(--muted-foreground)", "margin-top": "8px", "font-size": "13px" })}">${url.host}</div></div>`;
}

/** What a page is called, as its document's title says. */
function titleOf(href: string): string {
  const url = URL.parse(href);
  if (url === null) return href;
  if (url.hostname === "www.google.com") return `${url.searchParams.get("q") ?? ""} - Google Search`;
  return sites[href]?.title ?? url.hostname;
}

function drawn(href: string): string {
  const url = URL.parse(href);
  if (url === null) return "";
  if (url.hostname === "www.google.com") return searched(url.searchParams.get("q") ?? "");
  return sites[href]?.draw() ?? generic(url);
}

export function browserScene(): BrowserScene {
  return {
    saved: { history: [news, enclave, book], tabs: [{ id: "tab1", url: news, title: sites[news]?.title ?? "" }, { id: "tab2", url: enclave, title: sites[enclave]?.title ?? "" }], cur: "tab1" },
    bookmarks: [{ url: enclave, title: sites[enclave]?.title ?? "" }],
    tabs: new Map(),
    shown: undefined,
    calls: [],
  };
}

const surface = "data-fake-browser-page";

/**
 * `AlphaBrowserPlugin.java`, the `AlphaBrowser` tab host: native tabs in one session, each a web view that loads,
 * commits and moves through its history, emitting `stateChanged` as it goes. `present` draws the shown tab's page
 * over the place the Browser marks, as Android lays the web view there; here it draws develop's reference pages.
 */
export function alphaBrowser(world: BrowserScene): Faked {
  return plugin<BrowserTabHostPlugin, TabEvents>((emit) => {
    let session = "";
    const stateOf = (tab: Held): BrowserTabState => {
      const url = tab.history[tab.at];
      return {
        session, id: tab.id, sequence: tab.sequence, navigation: String(tab.navigation),
        ...(url === undefined ? {} : { url, title: titleOf(url) }),
        loading: tab.loading, committed: tab.committed, progress: tab.loading ? 30 : 100,
        canBack: tab.at > 0, canForward: tab.at < tab.history.length - 1, private: tab.private,
      };
    };
    const told = (tab: Held) => {
      tab.sequence += 1;
      emit("stateChanged", stateOf(tab));
    };
    const draw = () => {
      if (typeof document === "undefined") return;
      document.querySelector(`[${surface}]`)?.remove();
      const shown = world.shown;
      const tab = shown === undefined ? undefined : world.tabs.get(shown.id);
      const url = tab?.history[tab.at];
      if (shown === undefined || tab === undefined || url === undefined || !tab.committed) return;
      const page = document.createElement("div");
      page.setAttribute(surface, tab.id);
      page.setAttribute("style", style({ position: "fixed", left: `${shown.x}px`, top: `${shown.y}px`, width: `${shown.width}px`, height: `${shown.height}px`, "overflow-y": "auto", "z-index": "1", background: "var(--background)", color: "var(--foreground)", "font-family": "var(--font-sans)", "line-height": "normal" }));
      page.innerHTML = drawn(url);
      page.addEventListener("click", (event) => {
        const anchor = (event.target as Element | null)?.closest("a");
        if (anchor === null || anchor === undefined) return;
        event.preventDefault();
        go(tab, anchor.href);
      });
      document.body.append(page);
    };
    const commit = (tab: Held, navigation: number) => void Promise.resolve().then(() => {
      if (tab.navigation !== navigation || !world.tabs.has(tab.id)) return;
      tab.loading = false;
      tab.committed = true;
      told(tab);
      draw();
    });
    const go = (tab: Held, url: string) => {
      tab.history.splice(tab.at + 1, Infinity, url);
      tab.at = tab.history.length - 1;
      tab.navigation += 1;
      tab.loading = true;
      tab.committed = false;
      told(tab);
      commit(tab, tab.navigation);
    };
    const held = (options: { session: string; id: string }) => {
      world.calls.push("tab");
      const tab = world.tabs.get(options.id);
      if (options.session !== session || tab === undefined) throw rejection("Unknown browser tab");
      return tab;
    };
    const listed = (): BrowserBookmarkList => ({ urls: world.bookmarks.map((one) => one.url), entries: world.bookmarks });
    return {
      create: ({ session: asked, id, private: privateTab }) => {
        world.calls.push("create");
        session = asked;
        const tab: Held = { id, private: privateTab === true, history: [], at: -1, sequence: 0, navigation: 0, loading: false, committed: false };
        world.tabs.set(id, tab);
        return Promise.resolve(stateOf(tab));
      },
      navigate: (options) => {
        const tab = held(options);
        go(tab, options.url);
        return Promise.resolve(stateOf(tab));
      },
      command: (options) => {
        const tab = held(options);
        if (options.command === "stop") { tab.loading = false; told(tab); return Promise.resolve(stateOf(tab)); }
        const step = options.command === "back" ? -1 : options.command === "forward" ? 1 : 0;
        tab.at = Math.max(0, Math.min(tab.history.length - 1, tab.at + step));
        tab.navigation += 1;
        tab.loading = true;
        tab.committed = false;
        told(tab);
        commit(tab, tab.navigation);
        return Promise.resolve(stateOf(tab));
      },
      present: (options) => {
        world.calls.push("present");
        world.shown = options.id === null ? undefined : { id: options.id, x: options.x, y: options.y, width: options.width, height: options.height };
        draw();
        return Promise.resolve();
      },
      close: (options) => {
        world.calls.push("close");
        world.tabs.delete(options.id);
        if (world.shown?.id === options.id) world.shown = undefined;
        draw();
        return Promise.resolve();
      },
      find: (options) => Promise.resolve(stateOf(held(options))),
      findNext: (options) => Promise.resolve(stateOf(held(options))),
      clearFind: (options) => Promise.resolve(stateOf(held(options))),
      bookmarks: () => Promise.resolve(listed()),
      setBookmark: ({ url, saved, title }) => {
        world.bookmarks = saved ? [{ url, ...(title === undefined ? {} : { title }) }, ...world.bookmarks.filter((one) => one.url !== url)] : world.bookmarks.filter((one) => one.url !== url);
        return Promise.resolve(listed());
      },
      browsingState: ({ session: asked }) => {
        world.calls.push("browsingState");
        session = asked;
        return Promise.resolve(world.saved);
      },
      saveBrowsingState: ({ session: asked, ...saved }) => {
        world.calls.push("saveBrowsingState");
        session = asked;
        world.saved = saved;
        return Promise.resolve(saved);
      },
      clearBrowsingData: () => {
        const closed = [...world.tabs.values()].filter((tab) => !tab.private).map((tab) => tab.id);
        for (const id of closed) world.tabs.delete(id);
        world.saved = { history: [], tabs: [], cur: "" };
        draw();
        return Promise.resolve({ closed });
      },
      clearSiteData: ({ url }) => Promise.resolve({ site: new URL(url).host }),
      readingSupport: () => Promise.resolve({ available: false }),
      reviewQuestion: () => Promise.reject(rejection("Reading unavailable")),
      reviewReading: () => Promise.reject(rejection("Reading unavailable")),
      cancelReading: () => Promise.resolve(),
      share: (options) => Promise.resolve(stateOf(held(options))),
      openExternalBrowser: () => Promise.resolve(),
      downloads: () => Promise.resolve(),
      loginFillStatus: () => Promise.resolve({ available: false }),
    };
  });
}
