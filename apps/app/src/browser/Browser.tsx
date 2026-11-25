// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/address.md, "Story: Go where I typed"; spec/app/browser/address.md, "Story: Watch a page load"; spec/app/browser/address.md, "Story: Browse privately"
import { Button, BrowserAddressBar, type BrowserAddressChoice, BrowserAddressChoices, BrowserFindBar, BrowserBar, BrowserLibrary, type BrowserMenuItem, BrowserMenu, BrowserNewTab, BrowserReview, BrowserTabs, ConfirmDialog, PrivateMark } from "@repo/ui";
import { ChevronLeft, Clock, Download, Link, ListFilter, Plus, RotateCw, Search, Share2, Square, Star, Trash2 } from "lucide-react";
import { Effect, Option } from "effect";
import { useState, useSyncExternalStore } from "react";
import { canAskErase, canCancelErase, canConfirmErase, canOpenTab } from "../../gen/app__browser.ts";
import type { Browser as State } from "../../gen/app__browser.ts";
import { useMachine } from "../../gen/app__browser.react.ts";
import type { Machine } from "../../gen/app__browser.effect.vibe";
import { verdict } from "../../gen/app__browser__address.ts";
import { useMachine as usePage } from "../../gen/app__browser__address.react.ts";
import { Machine as LibraryMachine } from "../../gen/app__browser__library.effect.vibe";
import { useMachine as useLibrary } from "../../gen/app__browser__library.react.ts";
import type { Machine as ShareMachine } from "../../gen/app__browser__share.effect.vibe";
import type { Machine as SiteMachine } from "../../gen/app__browser__site.effect.vibe";
import { useMachine as useShare } from "../../gen/app__browser__share.react.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { TabHost } from "../platform/browser.vibe";
import type { Alpha, Resident } from "../runtime/area.tsx";
import { headingOf } from "../runtime/dateHeading.ts";
import { Time } from "../runtime/time.vibe";
import { AppBack } from "../shell/AppBack.tsx";
import { desktopPreview } from "../shell/canvas.vibe";
import type { ManagedRuntime } from "effect";
import { Pages, type PageRuntime, addressOf, idOf, inputOf, openDownloads, placed } from "./browser.vibe";
import { LibraryRows, editHistory, markPage, setMark } from "./library.vibe";
import { type SharePages, cancelPrivateFrame, confirmPrivateFrame, offerShare } from "./share.vibe";
import { type SiteRows, clearSiteShown, siteShown } from "./site.vibe";

export interface BrowserProps {
  /** Provides the Browser's tabs and each tab's page, `browser` of browser.vibe, over the resident machines and the phone's tab host. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Pages | LibraryMachine | LibraryRows | ShareMachine | SharePages | SiteMachine | SiteRows | TabHost | Shell | Resident, unknown>;
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
  const path = url.pathname + url.search;
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
  // The desktop canvas can move while this element's logical size stays the same.
  useSyncExternalStore(desktopPreview.subscribe, desktopPreview.snapshot, () => undefined);
  return <div data-alpha-browser-page="" aria-hidden ref={(place) => { if (place) void runtime.runPromise(placed); }} className="absolute inset-0" />;
}

function Tab({ runtime, alpha, tabs, page }: BrowserProps & { tabs: State; page: PageRuntime }) {
  const browser = useMachine(runtime);
  const { state, can, send } = usePage(page);
  const library = useLibrary(runtime);
  const share = useShare(runtime);
  const [typed, setTyped] = useState("");
  const [refusal, setRefusal] = useState<string>();
  const [finding, setFinding] = useState("");
  const [clearingSite, setClearingSite] = useState<string>();
  if (!state) return null;
  const tab = tabs.selected;
  const tabHost = runtime.runSync(TabHost);
  const shown = tabHost.web === undefined ? tabHost.session.info(idOf(tab)) : tabHost.web.info(idOf(tab));
  const shownAddress = shown?.url;
  const { host, path } = addressParts(shownAddress);
  const editing = tabs.layer === "Address";
  const native = Option.isSome(tabHost.plugin);
  const hasLibrary = native || tabHost.web !== undefined;
  const privateTab = state.kind === "Private";
  const readSuggestions = () => hasLibrary ? loadLibrary(runtime) : undefined;
  const cover = (layer: State["layer"]) => (browser.can({ type: "cover", layer }) ? () => void browser.send({ type: "cover", layer }) : undefined);
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
    void runtime.runPromise(Effect.flatMap(Pages, (pages) => pages.aim(tab, addressOf(text, outcome === "Search"))))
      .then(() => send({ type: "submit", i: input }))
      .then(() => browser.send({ type: "uncover" }));
  };
  const tell = (event: Parameters<typeof browser.send>[0]) => (browser.can(event) ? () => void browser.send(event) : undefined);
  const openLibrary = () => void browser.send({ type: "cover", layer: "Library" }).then(() => loadLibrary(runtime));
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
  const canShare = share.can({ type: "openPanel", ready: binding !== undefined });
  const booked = binding !== undefined && runtime.runSync(Effect.flatMap(LibraryRows, (rows) => rows.bookmarks())).some((entry) => entry.url === binding.url);
  const canBookmark = library.can(booked ? { type: "unmark" } : { type: "mark", secure: state.secure, userInfo: false });
  const chooseBookmark = () => {
    if (!binding) {
      void library.send({ type: "mark", secure: false, userInfo: false });
      return;
    }
    void runtime.runPromise(markPage(binding, !booked)).then((sent) => { if (sent) void browser.send({ type: "uncover" }); });
  };
  const menu = () => void browser.send({ type: "cover", layer: "Menu" }).then(() => {
    if (hasLibrary && (tabHost.web !== undefined || library.state?.read.status !== "Loaded")) void loadLibrary(runtime);
  });
  const libraryNotice = library.state?.notice === "NotSecure" ? "HTTPS only"
    : library.state?.notice === "Full" ? "The bookmark list is full."
      : library.state?.notice === "Failed" ? "Could not change the bookmark."
        : library.state?.notice === "HistoryFailed" ? "Could not change Browser history." : undefined;
  const clearable = native && tabs.layer === "Menu" ? runtime.runSync(siteShown()) : undefined;
  const offered: (BrowserMenuItem | false)[] = [
    (native || can({ type: "reload" })) && { label: "Reload", name: "Reload page", icon: <RotateCw />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => can({ type: "reload" }) ? send({ type: "reload" }) : undefined); } },
    can({ type: "stop" }) && { label: "Stop", name: "Stop loading", icon: <Square />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "stop" })); } },
    canOpenTab(tabs, "Normal") && { label: "New tab", icon: <Plus />, onSelect: () => opening("Normal")?.() },
    canOpenTab(tabs, "Private") && { label: "Private tab", name: "New private tab", icon: <PrivateMark aria-hidden />, onSelect: () => opening("Private")?.() },
    hasLibrary && { label: booked ? "Bookmarked" : "Bookmark", icon: <Star fill={booked ? "currentColor" : "none"} />, disabled: !canBookmark, onSelect: chooseBookmark },
    hasLibrary && { label: "Library", name: "Library, bookmarks and history", icon: <Clock />, onSelect: openLibrary },
    hasLibrary && { label: "Downloads", icon: <Download />, onSelect: () => void runtime.runPromise(openDownloads) },
    native && canShare && { label: "Share", icon: <Share2 />, onSelect: () => void runtime.runPromise(offerShare("System")) },
    canShare && binding !== undefined && { label: "Copy link", icon: <Link />, onSelect: () => void runtime.runPromise(offerShare("Copy")) },
    native && can({ type: "openFind" }) && { label: "Find", name: "Find in page", icon: <Search />, onSelect: () => { setFinding(""); void browser.send({ type: "uncover" }).then(() => send({ type: "openFind" })); } },
    clearable !== undefined && { label: "Clear site", name: "Clear site data", icon: <ListFilter />, onSelect: () => { setClearingSite(clearable.host); void browser.send({ type: "uncover" }); } },
    canAskErase(tabs) && { label: "Clear all", name: "Clear all browsing data", icon: <Trash2 />, onSelect: () => void browser.send({ type: "askErase" }) },
  ];
  const stood = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.sought(tab)));
  const seek = (text: string) => {
    setFinding(text);
    void runtime.runPromise(Effect.flatMap(Pages, (pages) => pages.seek(tab, text))).then(() => send({ type: "typeFind", empty: text === "" }));
  };
  const findStatus = finding === "" ? "" : state.find.status === "Loading" ? "Searching…" : state.matches > 0 ? `${Math.max(1, stood.index)} of ${state.matches}` : "No matches";
  const cards = tabs.open.map((one) => {
    const known = tabHost.web === undefined ? tabHost.session.info(idOf(one)) : tabHost.web.info(idOf(one));
    const address = known?.url;
    const privateTab = tabs.privates.includes(one);
    const blank = privateTab ? "New private tab" : "New tab";
    return { id: one, title: known?.title || address || blank, where: `${privateTab ? "Private · " : ""}${address ?? ""}`, current: one === tab, private: privateTab };
  });
  const privateNotice = tabHost.web === undefined ? undefined : "This tab is not saved in Alpha history. Website cookies and sign-ins are managed by your browser.";
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {editing
        ? <BrowserAddressBar leading={leading} value={typed} onValueChange={(value) => { setTyped(value); setRefusal(undefined); }} onSubmit={() => submit(typed)} onCancel={() => void browser.send({ type: "uncover" })} />
        : <BrowserBar
            leading={leading}
            host={host}
            hint={shown === undefined ? undefined : "Search or address"}
            path={path}
            secure={state.secure}
            private={privateTab}
            tabs={tabs.open.length}
            onEdit={cover("Address") && edit}
            onStop={can({ type: "stop" }) ? () => void send({ type: "stop" }) : undefined}
            onBack={can({ type: "goBack" }) ? () => void send({ type: "goBack" }) : undefined}
            onForward={can({ type: "goForward" }) ? () => void send({ type: "goForward" }) : undefined}
            onTabs={cover("Switcher")}
            onMenu={tabs.layer === "Menu" ? () => void browser.send({ type: "uncover" }) : cover("Menu") && menu}
          />}
      {state.phase === "Loading" && <div role="progressbar" aria-label="Loading website" className="h-0.75 shrink-0 overflow-hidden bg-secondary"><div className="h-full w-[35%] bg-alpha motion-safe:animate-page-loading motion-reduce:w-full" /></div>}
      <div inert={tabs.layer !== "Uncovered"} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {state.phase === "Blank"
          ? <BrowserNewTab private={privateTab} privateNotice={privateNotice} onSearch={cover("Address") && edit} />
          : <BrowserPagePlace runtime={runtime} />}
      </div>
      {editing && <AddressChoices runtime={runtime} query={typed} privateTab={privateTab} privateNotice={privateNotice} refusal={state.refused ? refusal : undefined} onOpen={submit} />}
      {state.finding && tabs.layer === "Uncovered" && (
        <BrowserFindBar value={finding} onValueChange={seek} status={findStatus}
          onPrevious={can({ type: "findNext", forward: false }) ? () => void send({ type: "findNext", forward: false }) : undefined}
          onNext={can({ type: "findNext", forward: true }) ? () => void send({ type: "findNext", forward: true }) : undefined}
          onClose={() => void send({ type: "closeFind" })} />
      )}
      {tabs.layer === "Menu" && <BrowserMenu items={offered.filter((item) => item !== false)} onClose={() => void browser.send({ type: "uncover" })} />}
      {tabs.layer === "Library" && <Library runtime={runtime} onBack={() => void browser.send({ type: "uncover" })} onOpen={submit} />}
      {libraryNotice && <p role="status" className="pointer-events-none absolute right-4 bottom-36 left-4 z-50 rounded-full bg-card px-5 py-3 text-center text-base shadow-menu">{libraryNotice}</p>}
      {tabs.layer === "Switcher" && (
        <BrowserTabs
          leading={<Button variant="ghost" size="icon" aria-label="Back to page" onClick={() => void browser.send({ type: "uncover" })}><ChevronLeft /></Button>}
          tabs={cards}
          onPick={(one) => tell(one === tab ? { type: "uncover" } : { type: "pick", tab: one })?.()}
          onClose={(one) => tell({ type: "closeTab", tab: one, instead: one === tab ? (others.at(-1) ?? one) : tab })?.()}
          onNew={opening("Normal")}
          onNewPrivate={opening("Private")}
        />
      )}
      <ConfirmDialog open={share.state?.handoff.showing === true} title="Open private page?" confirmLabel="Open in browser"
        onConfirm={() => void runtime.runPromise(confirmPrivateFrame())}
        onCancel={() => void runtime.runPromise(cancelPrivateFrame())}>
        Your browser will receive this private page.
      </ConfirmDialog>
      <BrowserReview open={clearingSite !== undefined} title={`Clear data for ${clearingSite ?? ""}?`} confirmLabel="Clear data" destructive
        onConfirm={() => { setClearingSite(undefined); void runtime.runPromise(clearSiteShown()); }}
        onCancel={() => setClearingSite(undefined)}>
        {`Signs you out of ${clearingSite ?? ""}.`}
      </BrowserReview>
      <BrowserReview open={tabs.erasing === "Asked"} title="Clear browsing data?" confirmLabel="Clear data" destructive
        onConfirm={() => { if (canConfirmErase(tabs)) void browser.send({ type: "confirmErase" }); }}
        onCancel={() => { if (canCancelErase(tabs)) void browser.send({ type: "cancelErase" }); }}>
        {native ? "Clears history, cookies and tabs." : "Clears Alpha's history and tabs. Your browser manages website cookies."}
      </BrowserReview>
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
  const bookmarks = state === undefined ? [] : runtime.runSync(Effect.flatMap(LibraryRows, (rows) => rows.bookmarks()));
  const history = privateTab ? [] : runtime.runSync(Effect.flatMap(Pages, (pages) => pages.history())).map(({ url }) => url);
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
  const bookmarks = runtime.runSync(Effect.flatMap(LibraryRows, (rows) => rows.bookmarks()));
  const history = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.history()));
  const titles = new Map(bookmarks.map((entry) => [entry.url, entry.title]));
  const now = runtime.runSync(Time.use((time) => time.latest()));
  return <>
    <BrowserLibrary bookmarks={bookmarks} history={history.map(({ url, title, at }) => ({
      url, title: title ?? titles.get(url), section: at === undefined ? "Earlier" : headingOf(at, now),
    }))}
      loading={state === undefined || state.read.status === "Loading" || state.read.status === "Idle"}
      failed={state?.read.status === "Failed"} onBack={onBack} onOpen={onOpen}
      onRemoveBookmark={can({ type: "unmark" }) ? (entry) => void runtime.runPromise(setMark(entry, false)) : undefined}
      onRemoveHistory={can({ type: "removeVisit" }) ? ({ url }) => {
        const exact = history.find((row) => row.url === url);
        if (exact) void runtime.runPromise(editHistory(exact.stamp));
      } : undefined}
      onClearHistory={can({ type: "askClear" }) ? () => void send({ type: "askClear" }) : undefined}
      onRetry={can({ type: "askRead" }) ? () => void send({ type: "askRead" }) : undefined} />
    <ConfirmDialog open={state?.confirming === true} title="Clear history?" confirmLabel="Clear" destructive
      onConfirm={() => { if (can({ type: "confirmClear" })) void runtime.runPromise(editHistory("all")); }}
      onCancel={() => { if (can({ type: "cancelClear" })) void send({ type: "cancelClear" }); }}>
      Clears visited pages from this Browser. Bookmarks and tabs are kept.
    </ConfirmDialog>
  </>;
}
