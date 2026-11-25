// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/address.md, "Story: Go where I typed"; spec/app/browser/address.md, "Story: Watch a page load"; spec/app/browser/address.md, "Story: Browse privately"
import { Button, BrowserAddressBar, type BrowserAddressChoice, BrowserAddressChoices, BrowserFindBar, BrowserBar, BrowserLibrary, type BrowserMenuItem, BrowserMenu, BrowserNewTab, BrowserTabs, ConfirmDialog, PrivateMark } from "@repo/ui";
import { ChevronLeft, Download, History, Link, Plus, RotateCw, Search, Share2, Square, Star, Trash2 } from "lucide-react";
import { Effect, Option } from "effect";
import { useCallback, useState, useSyncExternalStore } from "react";
import { canAskErase, canCancelErase, canConfirmErase, canOpenTab } from "../../gen/app__browser.ts";
import type { Browser as State } from "../../gen/app__browser.ts";
import { useMachine } from "../../gen/app__browser.react.ts";
import type { Machine } from "../../gen/app__browser.effect.vibe";
import { verdict } from "../../gen/app__browser__address.ts";
import { useMachine as usePage } from "../../gen/app__browser__address.react.ts";
import { Machine as LibraryMachine } from "../../gen/app__browser__library.effect.vibe";
import { useMachine as useLibrary } from "../../gen/app__browser__library.react.ts";
import type { Machine as ShareMachine } from "../../gen/app__browser__share.effect.vibe";
import { useMachine as useShare } from "../../gen/app__browser__share.react.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { TabHost } from "../platform/browser.vibe";
import type { Alpha, Resident } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import { desktopPreview } from "../shell/canvas.vibe";
import type { ManagedRuntime } from "effect";
import { Pages, type PageRuntime, addressOf, idOf, inputOf, openDownloads, placed } from "./browser.vibe";
import { LibraryRows, markPage, setMark } from "./library.vibe";
import { type SharePages, offerShare } from "./share.vibe";

export interface BrowserProps {
  /** Provides the Browser's tabs and each tab's page, `browser` of browser.vibe, over the resident machines and the phone's tab host. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Pages | LibraryMachine | LibraryRows | ShareMachine | SharePages | TabHost | Shell | Resident, unknown>;
  alpha: Alpha;
}

const loadLibrary = (runtime: BrowserProps["runtime"]) => runtime.runPromise(Effect.ignore(
  Effect.flatMap(LibraryMachine, (machine) => machine.send({ type: "askRead" })),
));

/** A page's address as the bar shows it: its host, and the rest after it. */
function addressParts(href: string | undefined): { host: string; path: string } {
  if (href === undefined || href === "") return { host: "", path: "" };
  const url = URL.parse(href);
  if (url === null) return { host: href, path: "" };
  const path = url.pathname === "/" ? url.search : url.pathname + url.search;
  return { host: url.host, path };
}

/**
 * The Browser: the bar over the tab shown, with its address, back and forward, the open tabs and the menu, and the
 * page beneath it, which the phone's tab host draws where the screen marks its place.
 * @model spec/app/browser/index.md
 */
export function Browser({ runtime, alpha }: BrowserProps) {
  const { state } = useMachine(runtime);
  if (!state) return null;
  const page = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.of(state.selected)));
  return <Tab key={state.selected} runtime={runtime} alpha={alpha} tabs={state} page={page} />;
}

function BrowserPagePlace({ runtime }: Pick<BrowserProps, "runtime">) {
  // spec/app/browser/index.md, "Story: Open, pick and close tabs"
  useSyncExternalStore(desktopPreview.subscribe, desktopPreview.snapshot, () => undefined);
  const attach = useCallback((place: HTMLDivElement | null) => {
    if (!place) return;
    const notify = () => { void runtime.runPromise(placed); };
    notify();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(notify);
    observer?.observe(place);
    const viewport = typeof window === "undefined" ? null : window.visualViewport;
    viewport?.addEventListener("resize", notify);
    viewport?.addEventListener("scroll", notify);
    if (typeof window !== "undefined") window.addEventListener("resize", notify);
    return () => {
      observer?.disconnect();
      viewport?.removeEventListener("resize", notify);
      viewport?.removeEventListener("scroll", notify);
      if (typeof window !== "undefined") window.removeEventListener("resize", notify);
    };
  }, [runtime]);
  return <div data-alpha-browser-page="" aria-hidden ref={attach} className="absolute inset-0" />;
}

function Tab({ runtime, alpha, tabs, page }: BrowserProps & { tabs: State; page: PageRuntime }) {
  const browser = useMachine(runtime);
  const { state, can, send } = usePage(page);
  const library = useLibrary(runtime);
  const share = useShare(runtime);
  const pages = runtime.runSync(Pages);
  const libraryRows = runtime.runSync(LibraryRows);
  useSyncExternalStore(pages.subscribe, pages.version, pages.version);
  const bookmarks = useSyncExternalStore(libraryRows.subscribe, libraryRows.snapshot, libraryRows.snapshot);
  const [typed, setTyped] = useState("");
  const [refusal, setRefusal] = useState<string>();
  const [finding, setFinding] = useState("");
  if (!state) return null;
  const tab = tabs.selected;
  const tabHost = runtime.runSync(TabHost);
  const shown = tabHost.web === undefined ? tabHost.session.info(idOf(tab)) : tabHost.web.info(idOf(tab));
  const shownAddress = shown?.url;
  const { host, path } = addressParts(shownAddress);
  const editing = tabs.layer === "Address";
  const native = Option.isSome(tabHost.plugin);
  const hasLibrary = native || tabHost.web !== undefined;
  const canCopy = native && state.phase === "Shown" && tabHost.session.pageBinding(idOf(tab)) !== undefined;
  const canShare = native && share.can({ type: "openPanel", ready: canCopy });
  const privateTab = state.kind === "Private";
  const readSuggestions = () => hasLibrary ? loadLibrary(runtime) : undefined;
  const cover = (layer: State["layer"]) => (browser.can({ type: "cover", layer }) ? () => void browser.send({ type: "cover", layer }) : undefined);
  const uncover = () => { if (browser.can({ type: "uncover" })) void browser.send({ type: "uncover" }); };
  const leading = <AppBack alpha={alpha} />;
  const submit = (text: string) => {
    const input = inputOf(text);
    if (!can({ type: "submit", i: input })) return;
    const outcome = verdict(input);
    if (outcome === "Refuse") {
      setRefusal(input.tooLong ? "This address is too long." : input.userInfo ? "Remove the username or password from this address." : "Enter a complete web address.");
      void send({ type: "submit", i: input });
      return;
    }
    void runtime.runPromise(pages.aim(tab, addressOf(text, outcome === "Search")))
      .then(() => send({ type: "submit", i: input }))
      .then(() => { if (browser.can({ type: "uncover" })) return browser.send({ type: "uncover" }); });
  };
  const tell = (event: Parameters<typeof browser.send>[0]) => (browser.can(event) ? () => void browser.send(event) : undefined);
  const openLibrary = () => {
    if (!browser.can({ type: "cover", layer: "Library" })) return;
    void browser.send({ type: "cover", layer: "Library" }).then(() => loadLibrary(runtime));
  };
  const edit = () => {
    setRefusal(undefined);
    setTyped(shownAddress ?? "");
    void browser.send({ type: "cover", layer: "Address" }).then(readSuggestions);
  };
  const others = tabs.open.filter((one) => one !== tab);
  const opening = (kind: "Normal" | "Private") => (canOpenTab(tabs, kind) ? () => {
    void browser.send({ type: "openTab", kind }).then(readSuggestions);
  } : undefined);
  const binding = tabs.layer === "Menu" && state.phase === "Shown"
    ? tabHost.web === undefined ? tabHost.session.pageBinding(idOf(tab)) : tabHost.web.current(idOf(tab), state.load)
    : undefined;
  const booked = binding !== undefined && bookmarks.some((entry) => entry.url === binding.url);
  const canBookmark = library.can(booked ? { type: "unmark" } : { type: "mark", secure: state.secure, userInfo: false });
  const chooseBookmark = () => {
    if (!binding) {
      if (library.can({ type: "mark", secure: false, userInfo: false })) void library.send({ type: "mark", secure: false, userInfo: false });
      return;
    }
    void runtime.runPromise(markPage(binding, !booked)).then((sent) => { if (sent && browser.can({ type: "uncover" })) void browser.send({ type: "uncover" }); });
  };
  const menu = () => void browser.send({ type: "cover", layer: "Menu" }).then(() => {
    if (hasLibrary && (tabHost.web !== undefined || library.state?.read.status !== "Loaded")) void loadLibrary(runtime);
  });
  const bookmarkNotice = library.state?.notice === "NotSecure" ? "HTTPS only"
    : library.state?.notice === "Full" ? "The bookmark list is full."
      : library.state?.notice === "Failed" ? "Could not change the bookmark." : undefined;
  const offered: (BrowserMenuItem | false)[] = [
    can({ type: "reload" }) && { label: "Reload", name: "Reload page", icon: <RotateCw />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "reload" })); } },
    can({ type: "stop" }) && { label: "Stop", name: "Stop loading", icon: <Square />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "stop" })); } },
    canOpenTab(tabs, "Normal") && { label: "New tab", icon: <Plus />, onSelect: () => opening("Normal")?.() },
    canOpenTab(tabs, "Private") && { label: "Private tab", name: "New private tab", icon: <PrivateMark aria-hidden />, onSelect: () => opening("Private")?.() },
    hasLibrary && { label: booked ? "Bookmarked" : "Bookmark", icon: <Star fill={booked ? "currentColor" : "none"} />, disabled: !canBookmark, onSelect: chooseBookmark },
    hasLibrary && browser.can({ type: "cover", layer: "Library" }) && { label: "Library", name: "Library, bookmarks and history", icon: <History />, onSelect: openLibrary },
    hasLibrary && browser.can({ type: "uncover" }) && { label: "Downloads", icon: <Download />, onSelect: () => void runtime.runPromise(openDownloads) },
    canShare && { label: "Share", icon: <Share2 />, onSelect: () => void runtime.runPromise(offerShare("System")) },
    canShare && canCopy && { label: "Copy link", icon: <Link />, onSelect: () => void runtime.runPromise(offerShare("Copy")) },
    native && can({ type: "openFind" }) && { label: "Find", name: "Find in page", icon: <Search />, onSelect: () => { setFinding(""); void browser.send({ type: "uncover" }).then(() => send({ type: "openFind" })); } },
    canAskErase(tabs) && { label: "Clear all", name: "Clear all browsing data", icon: <Trash2 />, onSelect: () => void browser.send({ type: "askErase" }) },
  ];
  const stood = runtime.runSync(pages.sought(tab));
  const seek = (text: string) => {
    setFinding(text);
    void runtime.runPromise(pages.seek(tab, text)).then(() => { if (can({ type: "typeFind", empty: text === "" })) return send({ type: "typeFind", empty: text === "" }); });
  };
  const findStatus = finding === "" ? "" : state.find.status === "Loading" ? "Searching…" : state.matches > 0 ? `${Math.max(1, stood.index)} of ${state.matches}` : "No matches";
  const cards = tabs.open.map((one) => {
    const known = tabHost.web === undefined ? tabHost.session.info(idOf(one)) : tabHost.web.info(idOf(one));
    const address = known?.url;
    const cardPrivate = tabs.privates.includes(one);
    const blank = cardPrivate ? "New private tab" : "New tab";
    return { id: one, title: known?.title || address || blank, where: `${cardPrivate ? "Private · " : ""}${address ?? ""}`, current: one === tab, private: cardPrivate };
  });
  const privateNotice = tabHost.web === undefined ? undefined : "This tab is not saved in Alpha history. Website cookies and sign-ins are managed by your browser.";
  const nativeUnavailable = tabHost.web === undefined && (state.phase === "Failed" || state.phase === "Stopped");
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {editing
        ? <BrowserAddressBar leading={leading} value={typed} onValueChange={(value) => { setTyped(value); setRefusal(undefined); }} onSubmit={() => submit(typed)} onCancel={uncover} />
        : <BrowserBar
            leading={leading}
            host={host}
            path={path}
            secure={state.secure}
            private={privateTab}
            tabs={tabs.open.length}
            onEdit={browser.can({ type: "cover", layer: "Address" }) ? edit : undefined}
            onStop={can({ type: "stop" }) ? () => void send({ type: "stop" }) : undefined}
            onBack={can({ type: "goBack" }) ? () => void send({ type: "goBack" }) : undefined}
            onForward={can({ type: "goForward" }) ? () => void send({ type: "goForward" }) : undefined}
            onTabs={cover("Switcher")}
            onMenu={browser.can({ type: "cover", layer: "Menu" }) ? menu : undefined}
          />}
      {state.phase === "Loading" && <div role="progressbar" aria-label="Loading website" className="h-0.75 shrink-0 overflow-hidden bg-secondary"><div className="h-full w-[35%] bg-alpha motion-safe:animate-page-loading motion-reduce:w-full" /></div>}
      <div inert={tabs.layer !== "Uncovered"} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {state.phase === "Blank"
          ? <BrowserNewTab private={privateTab} privateNotice={privateNotice} onSearch={browser.can({ type: "cover", layer: "Address" }) ? edit : undefined} />
          : nativeUnavailable
            ? <section role="status" className="m-auto flex max-w-sm flex-col items-center gap-3 px-6 text-center">
                <p className="text-base font-medium text-foreground">{state.phase === "Stopped" ? "Loading stopped" : "Page could not load"}</p>
                {shownAddress && <p className="break-all text-sm text-muted-foreground">{shownAddress}</p>}
                {can({ type: "reload" }) && <Button variant="outline" size="sm" onClick={() => void send({ type: "reload" })}>Reload</Button>}
              </section>
            : <BrowserPagePlace runtime={runtime} />}
      </div>
      {editing && <AddressChoices runtime={runtime} query={typed} privateTab={privateTab} privateNotice={privateNotice} refusal={state.refused ? refusal : undefined} onOpen={submit} />}
      {state.finding && tabs.layer === "Uncovered" && (
        <BrowserFindBar value={finding} onValueChange={seek} status={findStatus}
          onPrevious={can({ type: "findNext", forward: false }) ? () => void send({ type: "findNext", forward: false }) : undefined}
          onNext={can({ type: "findNext", forward: true }) ? () => void send({ type: "findNext", forward: true }) : undefined}
          onClose={() => { if (can({ type: "closeFind" })) void send({ type: "closeFind" }); }} />
      )}
      {tabs.layer === "Menu" && <BrowserMenu items={offered.filter((item) => item !== false)} onClose={uncover} />}
      {tabs.layer === "Library" && <Library runtime={runtime} onBack={uncover} onOpen={submit} />}
      {bookmarkNotice && <p role="status" className="pointer-events-none absolute right-4 bottom-36 left-4 z-toast rounded-full bg-card px-5 py-3 text-center text-base shadow-menu">{bookmarkNotice}</p>}
      {tabs.layer === "Switcher" && (
        <BrowserTabs
          leading={<Button variant="ghost" size="icon" aria-label="Back to page" disabled={!browser.can({ type: "uncover" })} onClick={uncover}><ChevronLeft /></Button>}
          tabs={cards}
          onPick={(one) => tell(one === tab ? { type: "uncover" } : { type: "pick", tab: one })?.()}
          onClose={(one) => tell({ type: "closeTab", tab: one, instead: one === tab ? (others.at(-1) ?? one) : tab })?.()}
          onNew={opening("Normal")}
          onNewPrivate={opening("Private")}
        />
      )}
      <ConfirmDialog open={tabs.erasing === "Asked"} title="Clear browsing data?" confirmLabel="Clear" destructive
        onConfirm={() => { if (canConfirmErase(tabs)) void browser.send({ type: "confirmErase" }); }}
        onCancel={() => { if (canCancelErase(tabs)) void browser.send({ type: "cancelErase" }); }}>
        {native ? "Clears history, cookies and tabs." : "Clears Alpha's history and tabs. Your browser manages website cookies."}
      </ConfirmDialog>
    </div>
  );
}

function AddressChoices({ runtime, query, privateTab, privateNotice, refusal, onOpen }: Pick<BrowserProps, "runtime"> & {
  query: string;
  privateTab: boolean;
  privateNotice?: string;
  refusal?: string;
  onOpen: (url: string) => void;
}) {
  const { state } = useLibrary(runtime);
  const pages = runtime.runSync(Pages);
  const rows = runtime.runSync(LibraryRows);
  useSyncExternalStore(pages.subscribe, pages.version, pages.version);
  const storedBookmarks = useSyncExternalStore(rows.subscribe, rows.snapshot, rows.snapshot);
  const bookmarks = state === undefined ? [] : storedBookmarks;
  const history = privateTab ? [] : runtime.runSync(pages.visits());
  const saved = new Set(bookmarks.map(({ url }) => url));
  const seeking = query.trim().toLocaleLowerCase();
  const choices = [...new Set([...saved, ...history])].filter((url) => url.toLocaleLowerCase().includes(seeking)).slice(0, 8)
    .flatMap((url): BrowserAddressChoice[] => {
      const address = URL.parse(url);
      if (!address) return [];
      return [{ url, kind: saved.has(url) ? "bookmark" : "history", title: address.hostname, detail: address.pathname + address.search + address.hash }];
    });
  return <BrowserAddressChoices choices={choices} privateTab={privateTab} privateNotice={privateNotice} refusal={refusal} onOpen={onOpen} />;
}

function Library({ runtime, onBack, onOpen }: Pick<BrowserProps, "runtime"> & { onBack: () => void; onOpen: (url: string) => void }) {
  const { state, can, send } = useLibrary(runtime);
  const pages = runtime.runSync(Pages);
  const rows = runtime.runSync(LibraryRows);
  useSyncExternalStore(pages.subscribe, pages.version, pages.version);
  const bookmarks = useSyncExternalStore(rows.subscribe, rows.snapshot, rows.snapshot);
  const history = runtime.runSync(pages.visits());
  const titles = new Map(bookmarks.map((entry) => [entry.url, entry.title]));
  return <BrowserLibrary bookmarks={bookmarks} history={history.map((url) => ({ url, title: titles.get(url) }))}
    loading={state === undefined || state.read.status === "Loading" || state.read.status === "Idle"}
    failed={state?.read.status === "Failed"} onBack={onBack} onOpen={onOpen}
    onRemoveBookmark={can({ type: "unmark" }) ? (entry) => void runtime.runPromise(setMark(entry, false)) : undefined}
    onRetry={can({ type: "askRead" }) ? () => void send({ type: "askRead" }) : undefined} />;
}
