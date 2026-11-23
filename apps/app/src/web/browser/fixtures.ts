// spec/browser/session.md, "Story: Browse in tabs"; spec/browser/bookmarks.md, "Story: Keep my bookmarks whole"
import type { Bookmarks } from "../../../gen/browser__bookmarks.ts";
import type { TabPage } from "../../../gen/browser__page.ts";
import type { Reading } from "../../../gen/browser__reading.ts";
import { type BrowserTab, type Session, freshTab, initial } from "../../../gen/browser__session.ts";

const page = (url: string, title: string, sequence: number): TabPage => ({
  url, title, navigation: String(sequence), sequence, loading: false, committed: true, failed: false,
  canBack: sequence > 2, canForward: false, externalOnly: false, web: true, secure: url.startsWith("https:"), problem: "",
});

const live = (id: string, url: string, title: string, sequence = 2): BrowserTab => ({ ...freshTab(id, "Normal"), stage: "Live", revision: 1, savedUrl: url, page: page(url, title, sequence) });

/** A started Browser with one untouched new tab. */
export const blankSession: Session = { ...initial, host: "NativeHost", tabs: [freshTab("b1", "Normal")], cur: "b1", hydration: "Hydrated" };

/** Three tabs, the selected one showing a loaded HTTPS page with history behind it. */
export const loadedSession: Session = {
  ...blankSession,
  tabs: [live("b1", "https://example.test/news", "Example News", 4), live("b2", "https://docs.example.test/", "Docs"), { ...live("b3", "https://private.test/", "Private page"), profile: "Private" }],
  cur: "b1",
  visits: [
    { url: "https://example.test/news", title: "Example News", at: Date.UTC(2026, 10, 22, 9) },
    { url: "https://docs.example.test/", title: "Docs", at: Date.UTC(2026, 10, 21, 18) },
  ],
};

/** The selected tab is private. */
export const privateSession: Session = { ...loadedSession, cur: "b3" };

/** The selected page is still loading. */
export const loadingSession: Session = {
  ...loadedSession,
  tabs: loadedSession.tabs.map((t) => (t.id === "b1" ? { ...t, page: { ...t.page, loading: true, committed: false } } : t)),
};

/** The selected page failed to load. */
export const failedSession: Session = {
  ...loadedSession,
  tabs: loadedSession.tabs.map((t) => (t.id === "b1" ? { ...t, page: { ...t.page, committed: false, failed: true, problem: "Page could not load. Check the address and connection, then reload." } } : t)),
};

/** Find in page with matches on the selected page. */
export const findingSession: Session = { ...loadedSession, find: { tab: "b1", query: "milk", count: 4, index: 2, done: true } };

/** The tab switcher is open. */
export const switcherSession: Session = { ...loadedSession, layers: { ...loadedSession.layers, tabsOpen: true } };

/** Eight tabs, the limit, in the open switcher. */
export const fullSwitcherSession: Session = {
  ...switcherSession,
  tabs: [...loadedSession.tabs, ...[4, 5, 6, 7, 8].map((n) => live(`b${n}`, `https://site${n}.test/`, `Site ${n}`))],
};

/** The menu is open. */
export const menuSession: Session = { ...loadedSession, layers: { ...loadedSession.layers, menu: true } };

/** The library shows history. */
export const historySession: Session = { ...loadedSession, layers: { ...loadedSession.layers, library: "HistoryList" } };

/** The address field is being edited. */
export const editingSession: Session = { ...loadedSession, layers: { ...loadedSession.layers, editing: true } };

/** A WebView without isolated profiles could not open the selected tab. */
export const unsupportedSession: Session = { ...blankSession, profileUnsupported: "b1" };

/** Bookmarks read from the store. */
export const someMarks: Bookmarks = {
  queue: [], stage: "Idle", refreshQueued: false, quiet: false, hydrated: true, recovery: false, disposed: false,
  marks: [{ url: "https://example.test/news", title: "Example News" }, { url: "https://recipes.test/bread", title: "Bread" }],
};

/** A damaged saved list waits for recovery. */
export const damagedMarks: Bookmarks = { ...someMarks, hydrated: false, recovery: true, marks: [] };

/** No reading in progress. */
export const idleReading: Reading = {
  support: "Supported", phase: "NotReading", kind: "ReadAloud",
  bound: { tab: "", url: "", navigation: "", revision: 0, shown: false, settled: false, secure: false },
  excerpt: "NoExcerpt", text: "", blocked: false, sourcePending: false, edited: false, generation: 0, speech: 0,
};

/** Ask about page is waiting for the owner to approve an excerpt. */
export const questionReading: Reading = {
  ...idleReading, phase: "Reviewing", kind: "AskAboutPage", excerpt: "PageText", text: "Bread needs flour, water, salt and time.",
  bound: { tab: "b1", url: "https://example.test/news", navigation: "4", revision: 1, shown: true, settled: true, secure: true },
};
