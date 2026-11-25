// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/address.md, "Story: Watch a page load"
import type { BrowserBookmarkList, BrowserPageGuard, BrowserSavedState, BrowserTabHostPlugin, BrowserTabState } from "@elizaos/os-bridges";
import { type Faked, plugin, rejection } from "./phone.ts";

interface TabEvents {
  stateChanged: BrowserTabState;
  tabOpened: { session: string; id: string; opener?: string; private?: boolean };
  tabClosed: { session: string; id: string };
  findResult: { session: string; id: string; navigation?: string; cleared?: boolean; index?: number; count?: number; done?: boolean };
  showDownloads: { session: string };
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
  /** The host's failure sentence for the load, or empty. */
  error: string;
  /** The HTTPS address another browser may reach, set only for a normal tab's https page the network failed. */
  elsewhere: string;
  /** The matches of what is being found, and the one stood on. */
  matches: number;
  match: number;
}

/** What the fake phone's tab host keeps, as `AlphaBrowserPlugin` keeps it: its saved session, bookmarks and the tabs it holds. */
export interface BrowserScene {
  saved: BrowserSavedState;
  beforeSave?: (saved: BrowserSavedState) => Promise<void>;
  bookmarks: { url: string; title?: string }[];
  readonly tabs: Map<string, Held>;
  /** The tab drawn and where, as `present` last placed it. */
  shown: { id: string; x: number; y: number; width: number; height: number } | undefined;
  /** Every call the page made, by method. */
  readonly calls: string[];
  readonly shared: BrowserPageGuard[];
  showInFiles: (() => void) | undefined;
  /** Hosts whose pages fail: `unreachable` as the network fails, `insecure` as a site with no HTTPS connection. */
  readonly failing: Map<string, "unreachable" | "insecure">;
  /** Hosts whose pages keep loading until the page stops them. */
  readonly holding: Set<string>;
  /** The addresses `openFailedPage` opened in another browser. */
  readonly elsewhere: string[];
}

/** develop's fixture photographs, served beside the fakes. */
const enclaveImage = new URL("./img/enclave.webp", import.meta.url).href;
const newsImage = new URL("./img/news.webp", import.meta.url).href;
const nopaImage = new URL("./img/nopa.webp", import.meta.url).href;

const news = "https://news.example/on-device-agents";
const enclave = "https://enclave.example/keys-in-hardware";
const book = "https://tables.example/nopa";

/** The reference pages of develop's fixtures: what a site there draws, by its address. */
const sites: Record<string, { title: string; snip: string; draw: () => string }> = {
  [news]: { title: "The case for on-device agents", snip: "An assistant that lives on your phone sees everything you do. The question is who else gets to see it.", draw: () => article(newsImage, "The case for on-device agents", "news.example · 6 min", [
    "An assistant that lives on your phone sees everything you do. The question is who else gets to see it. Keeping the model and its memory on the device changes the answer.",
    "When the agent runs next to your data, it can act without sending your inbox or calendar anywhere. It also stays useful with no signal.",
    `${link(enclave, "Hardware-held keys")} make the agent accountable to one person: its owner. Every action it takes can be signed and checked later.`,
    "The interface should get quieter, not louder. Fewer screens, one conversation, and the right card at the right moment.",
    `Try it: ask an agent to ${link(book, "book dinner at Nopa")} and watch it stop before it pays.`,
  ]) },
  [enclave]: { title: "Keys in the chip", snip: "A secure enclave is a small, sealed part of the processor. Keys are created inside it and never read out.", draw: () => article(enclaveImage, "Keys that never leave the chip", "enclave.example · 4 min", [
    "A secure enclave is a small, sealed part of the processor. Keys are created inside it and can be used there, but never read out.",
    "When an agent signs an action with one of those keys, anyone can check that it came from your device, and only your device.",
    "That makes the phone the root of trust, not a server you have to believe.",
    `More on why this matters: ${link(news, "the case for on-device agents")}.`,
  ]) },
  [book]: { title: "Nopa · Book a table", snip: "Californian, wood-fired. 560 Divisadero St. Tables tonight from 6:00.", draw: () => booking() },
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

/** A 24-unit stroke icon, drawn as develop draws its glyphs. */
const icon = (size: number, paths: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="${style({ width: `${size}px`, height: `${size}px`, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "flex-shrink": "0" })}">${paths}</svg>`;

function booking(): string {
  const chip = (words: string, on = false) => `<button style="${style({ flex: "1", height: "46px", "border-radius": "23px", "font-size": "14.5px", "font-weight": "600", border: "0", background: on ? "var(--primary)" : "var(--secondary)", color: on ? "var(--primary-foreground)" : "var(--foreground)" })}">${words}</button>`;
  const time = (words: string) => `<button aria-label="${words} PM" style="${style({ height: "44px", "border-radius": "22px", "font-size": "14.5px", "font-weight": "600", border: "0", background: "var(--secondary)", color: "var(--foreground)" })}">${words}</button>`;
  const field = (words: string, top: string) => `<input placeholder="${words}" aria-label="${words}" style="${style({ display: "block", width: "100%", "box-sizing": "border-box", height: "50px", "margin-top": top, "border-radius": "16px", border: "0", background: "var(--secondary)", color: "var(--foreground)", padding: "0 16px", "font-size": "16px" })}">`;
  const step = (label: string, paths: string) => `<button aria-label="${label}" style="${style({ width: "44px", height: "44px", display: "flex", "align-items": "center", "justify-content": "center", border: "0", background: "transparent", color: "var(--foreground)" })}">${icon(18, paths)}</button>`;
  return `<div style="${style({ position: "relative", height: "128px", background: `url(${nopaImage}) center / cover no-repeat`, overflow: "hidden" })}">
<div style="${style({ position: "absolute", inset: "0", background: "linear-gradient(to top, rgba(0,0,0,.45), transparent 60%)" })}"></div>
<div style="${style({ position: "absolute", right: "30px", bottom: "22px", "font-family": "var(--font-display)", "font-size": "34px", color: "#fff" })}">nopa</div></div>
<div style="${style({ padding: "18px 22px 140px" })}">
<h2 style="${style({ margin: "0", "font-family": "var(--font-display)", "font-size": "34px", "line-height": "1.05", "font-weight": "300" })}">Nopa</h2>
<div style="${style({ color: "var(--muted-foreground)", "margin-top": "6px", "font-size": "13.5px" })}">Californian · 560 Divisadero St</div>
<div style="${style({ display: "flex", "align-items": "center", "margin-top": "18px" })}"><span style="${style({ "flex-grow": "1", "font-size": "16px", "font-weight": "600" })}">Guests</span>
<div style="${style({ display: "flex", "align-items": "center", gap: "4px", "border-radius": "24px", background: "var(--secondary)", padding: "2px" })}">${step("Fewer guests", `<path d="M5 12h14"/>`)}<span style="${style({ "min-width": "22px", "text-align": "center", "font-size": "17px", "font-weight": "700" })}">2</span>${step("More guests", `<path d="M5 12h14"/><path d="M12 5v14"/>`)}</div></div>
<div style="${style({ display: "flex", gap: "8px", "margin-top": "12px" })}">${chip("Tonight", true)}${chip("Tomorrow")}${chip("Fri")}</div>
<div style="${style({ display: "grid", "grid-template-columns": "repeat(3, minmax(0, 1fr))", gap: "8px", "margin-top": "10px" })}">${["6:00", "6:30", "7:00", "7:30", "8:00", "8:30"].map(time).join("")}</div>
${field("Name", "14px")}${field("Phone", "8px")}
<button disabled aria-label="Book table" style="${style({ width: "100%", height: "52px", "margin-top": "14px", "border-radius": "26px", "font-size": "16px", "font-weight": "600", border: "0", background: "var(--accent)", color: "var(--muted-foreground)" })}">Book table</button>
</div>`;
}

function searched(query: string): string {
  const rows = Object.entries(sites).map(([href, site]) => {
    const url = new URL(href);
    return `<a href="${href}" style="${style({ display: "block", padding: "16px 4px", "border-bottom": "1px solid var(--border)", color: "inherit", "text-decoration": "none" })}">
<div style="${style({ "font-size": "12.5px", color: "var(--muted-foreground)" })}">${url.host}${url.pathname}</div>
<div style="${style({ "font-size": "18px", "font-weight": "600", color: "var(--primary)", "margin-top": "4px" })}">${site.title}</div>
<div style="${style({ "font-size": "14px", color: "var(--muted-foreground)", "line-height": "1.45", "margin-top": "4px" })}">${site.snip}</div></a>`;
  });
  return `<div style="${style({ padding: "10px 20px 140px" })}"><div style="${style({ "font-family": "var(--font-display)", "font-size": "30px", "line-height": "1.15", padding: "0 4px 8px" })}">${query}</div>${rows.join("")}</div>`;
}

function generic(url: URL): string {
  const name = (url.hostname.split(".")[0] ?? "").replace(/-/g, " ");
  const named = name.charAt(0).toUpperCase() + name.slice(1);
  const links = [["about", "About"], ["hours", "Hours & location"], ["contact", "Contact"]].map(([path, label]) => `<a href="https://${url.host}/${path}" aria-label="${label}" style="${style({ display: "flex", "align-items": "center", gap: "12px", "min-height": "56px", "border-bottom": "1px solid var(--border)", "text-decoration": "none" })}"><span style="${style({ "flex-grow": "1", "font-size": "16px", "font-weight": "600", color: "var(--primary)" })}">${label}</span><span style="${style({ display: "flex", color: "var(--muted-foreground)" })}">${icon(16, `<path d="m9 18 6-6-6-6"/>`)}</span></a>`);
  return `<div style="${style({ position: "relative", height: "170px", background: "var(--secondary)", overflow: "hidden" })}"><div style="${style({ position: "absolute", left: "24px", bottom: "-40px", width: "150px", height: "150px", "border-radius": "75px", background: "var(--accent)" })}"></div><div style="${style({ position: "absolute", right: "28px", top: "34px", "font-family": "var(--font-display)", "font-size": "76px", "line-height": "1", color: "var(--muted-foreground)" })}">${named.charAt(0)}</div></div>
<div style="${style({ padding: "22px 24px 140px" })}"><h2 style="${style({ margin: "0", "font-family": "var(--font-display)", "font-size": "34px", "line-height": "1.05", "font-weight": "300" })}">${named}</h2>
<div style="${style({ color: "var(--muted-foreground)", "margin-top": "8px", "font-size": "13px" })}">${url.host}</div>
<div style="${style({ "margin-top": "20px", "border-top": "1px solid var(--border)" })}">${links.join("")}</div></div>`;
}

/** What a page is called, as its document's title says. */
function titleOf(href: string): string {
  const url = URL.parse(href);
  if (url === null) return href;
  if (url.hostname === "www.google.com") return `${url.searchParams.get("q") ?? ""} - Google Search`;
  return sites[href]?.title ?? url.hostname;
}

/** What a page says, without its markup. */
const textOf = (html: string) => html.replace(/<[^>]*>/g, " ");

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
    failing: new Map(),
    holding: new Set(),
    elsewhere: [],
    shared: [],
    showInFiles: undefined,
  };
}

const surface = "data-fake-browser-page";

/**
 * `AlphaBrowserPlugin.java`, the `AlphaBrowser` tab host: native tabs in one session, each a web view that loads,
 * commits and moves through its history, emitting `stateChanged` as it goes. `present` draws the shown tab's page
 * over the place the Browser marks, as Android lays the web view there; here it draws develop's reference pages.
 */
export function alphaBrowser(world: BrowserScene): Faked {
  return plugin<BrowserTabHostPlugin & { openFailedPage(options: BrowserPageGuard): Promise<void>; pageContext(options: BrowserPageGuard): Promise<Record<string, unknown>> }, TabEvents>((emit) => {
    let session = "";
    const stateOf = (tab: Held): BrowserTabState => {
      const url = tab.history[tab.at];
      return {
        session, id: tab.id, sequence: tab.sequence, navigation: String(tab.navigation),
        ...(url === undefined ? {} : { url, title: titleOf(url) }),
        loading: tab.loading, committed: tab.committed, progress: tab.loading ? 30 : 100,
        canBack: tab.at > 0, canForward: tab.at < tab.history.length - 1, private: tab.private, error: tab.error,
        ...(tab.elsewhere === "" ? {} : { elsewhereUrl: tab.elsewhere }),
      };
    };
    const found = (tab: Held) => void Promise.resolve().then(() => emit("findResult", { session, id: tab.id, navigation: String(tab.navigation), index: tab.match, count: tab.matches, done: true }));
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
      const url = tab.history[tab.at] ?? "";
      if (world.holding.has(URL.parse(url)?.host ?? "")) return;
      tab.loading = false;
      const failing = world.failing.get(URL.parse(url)?.host ?? "");
      if (failing !== undefined) {
        tab.error = failing === "insecure" ? "This site has no secure (HTTPS) connection." : "Page could not load.";
        tab.elsewhere = failing === "unreachable" && !tab.private && url.startsWith("https://") ? url : "";
        told(tab);
        return;
      }
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
      tab.error = "";
      tab.elsewhere = "";
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
        const tab: Held = { id, private: privateTab === true, history: [], at: -1, sequence: 0, navigation: 0, loading: false, committed: false, matches: 0, match: 0, error: "", elsewhere: "" };
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
        tab.error = "";
        tab.elsewhere = "";
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
      find: (options) => {
        const tab = held(options);
        const text = textOf(drawn(tab.history[tab.at] ?? "")).toLowerCase();
        const query = options.query.toLowerCase();
        tab.matches = query === "" ? 0 : text.split(query).length - 1;
        tab.match = tab.matches > 0 ? 1 : 0;
        found(tab);
        return Promise.resolve(stateOf(tab));
      },
      findNext: (options) => {
        const tab = held(options);
        if (tab.matches > 0) tab.match = ((tab.match - 1 + (options.forward === false ? -1 : 1) + tab.matches) % tab.matches) + 1;
        found(tab);
        return Promise.resolve(stateOf(tab));
      },
      clearFind: (options) => {
        const tab = held(options);
        tab.matches = 0;
        tab.match = 0;
        emit("findResult", { session, id: tab.id, navigation: String(tab.navigation), cleared: true });
        return Promise.resolve(stateOf(tab));
      },
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
      saveBrowsingState: async ({ session: asked, ...saved }) => {
        world.calls.push("saveBrowsingState");
        session = asked;
        await world.beforeSave?.(saved);
        world.saved = saved;
        return saved;
      },
      clearBrowsingData: () => {
        const closed = [...world.tabs.values()].filter((tab) => !tab.private).map((tab) => tab.id);
        for (const id of closed) world.tabs.delete(id);
        world.saved = { history: [], tabs: [], cur: "" };
        draw();
        return Promise.resolve({ closed });
      },
      clearSiteData: ({ url }) => {
        world.calls.push("clearSiteData");
        return Promise.resolve({ site: new URL(url).host });
      },
      readingSupport: () => Promise.resolve({ available: false }),
      reviewQuestion: () => Promise.reject(rejection("Reading unavailable")),
      reviewReading: () => Promise.reject(rejection("Reading unavailable")),
      cancelReading: () => Promise.resolve(),
      share: (options) => {
        const tab = stateOf(held(options));
        if (!tab.committed || tab.loading || tab.url !== options.url || tab.navigation !== options.navigation) {
          return Promise.reject(rejection("The Browser page changed"));
        }
        world.shared.push(options);
        return Promise.resolve(tab);
      },
      openExternalBrowser: () => Promise.resolve(),
      // `pageContext`: the shown normal tab's committed page as its web view reads it, never a private tab's.
      pageContext: (options) => {
        const tab = held(options);
        const url = tab.history[tab.at] ?? "";
        if (tab.private) return Promise.reject(rejection("Private tabs are never shared"));
        if (url !== options.url || String(tab.navigation) !== options.navigation) return Promise.reject(rejection("Browser page changed"));
        return Promise.resolve({ url, title: sites[url]?.title ?? "", text: textOf(drawn(url)).replace(/\s+/g, " ").trim().slice(0, 6000), truncated: false });
      },
      openFailedPage: (options) => {
        const tab = held(options);
        if (tab.elsewhere === "" || tab.elsewhere !== options.url || String(tab.navigation) !== options.navigation) return Promise.reject(rejection("The page changed. Try again from the page."));
        world.elsewhere.push(options.url);
        return Promise.resolve();
      },
      downloads: ({ session: requested }) => {
        world.calls.push("downloads");
        world.showInFiles = () => {
          world.showInFiles = undefined;
          emit("showDownloads", { session: requested });
        };
        return Promise.resolve();
      },
      loginFillStatus: () => Promise.resolve({ available: false }),
    };
  });
}
