// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/index.md, "Story: Let the agent open a page"; spec/app/browser/share.md, "Story: Share the page"; spec/app/browser/share.md, "Story: Open the page in another browser"; spec/app/browser/address.md, "Story: Go where I typed"; spec/app/browser/address.md, "Story: Watch a page load"; spec/app/browser/address.md, "Story: Browse privately"
import { Button, BrowserAddressBar, type BrowserAddressChoice, BrowserAddressChoices, BrowserFindBar, BrowserBar, BrowserLibrary, type BrowserMenuItem, BrowserMenu, BrowserNewTab, BrowserQuestion, BrowserReadAloud, BrowserReview, BrowserTabs, ConfirmDialog, Mark, PrivateMark } from "@repo/ui";
import { AudioLines, ChevronLeft, Clock, Download, ExternalLink, Link, ListFilter, Lock, Mail, Monitor, Plus, RotateCw, Search, Share2, Smartphone, Square, Star, Trash2 } from "lucide-react";
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
import { useMachine as useReader } from "../../gen/app__browser__reading.react.ts";
import type { Machine as ReaderMachine } from "../../gen/app__browser__reading.effect.vibe";
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
import { Reviewing, approve, decline } from "./agent.vibe";
import { Pages, type PageRuntime, addressOf, idOf, inputOf, openDownloads, openPasswords, placed, toggleDesktopSite } from "./browser.vibe";
import { LibraryRows, editHistory, markPage, setMark } from "./library.vibe";
import { reviewPage, cancelReading, confirmQuestion, editPageExcerpt, editQuestion, PageReading, readPageExcerpt, sensitiveReadingText, READING_UNSUPPORTED_MESSAGE, SENSITIVE_READING_MESSAGE } from "./reading.vibe";
import { SharePages, cancelExternal, confirmExternal, mailTarget, offerNativeHandoff, offerShare } from "./share.vibe";
import { type SitePage, type SiteRows, clearSiteShown, siteShown } from "./site.vibe";

export interface BrowserProps {
  /** Provides the Browser's tabs and each tab's page, `browser` of browser.vibe, over the resident machines and the phone's tab host. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Pages | LibraryMachine | LibraryRows | ReaderMachine | PageReading | ShareMachine | SharePages | Reviewing | SiteMachine | SiteRows | TabHost | Shell | Resident, unknown>;
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
  const reader = useReader(runtime);
  const [typed, setTyped] = useState("");
  const [refusal, setRefusal] = useState<string>();
  const [finding, setFinding] = useState("");
  const [clearingSite, setClearingSite] = useState<SitePage>();
  const { review, support } = runtime.runSync(PageReading);
  const cannotRead = useSyncExternalStore(support.subscribe, support.snapshot, support.snapshot) === "unavailable";
  if (!state) return null;
  const tab = tabs.selected;
  const tabHost = runtime.runSync(TabHost);
  const shown = tabHost.web === undefined ? tabHost.session.info(idOf(tab)) : tabHost.web.info(idOf(tab));
  const shownAddress = shown?.url;
  const { host, path } = addressParts(shownAddress);
  const editing = tabs.layer === "Address";
  const native = Option.isSome(tabHost.plugin);
  const hasLibrary = native || tabHost.web !== undefined;
  // spec/app/browser/share.md, "Only an unreachable HTTPS address makes a failed page leave, and only from a normal tab": the offer is drawn under the bar, never near Ask Alpha.
  // A failed page has no secure mark, so only a stranded page is offered here; a committed HTTPS page leaves from the menu's reviewed "Open externally".
  const elsewhere = { type: "openExternally", kind: state.kind, secure: false } as const;
  const offerElsewhere = state.phase === "Failed" && share.can(elsewhere);
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
  const nativePage = binding !== undefined && "navigation" in binding && state.secure ? binding : undefined;
  const canHandoff = nativePage !== undefined && share.can({ type: "openExternally", kind: state.kind, secure: true });
  const reviewed = share.state?.handoff.showing
    ? runtime.runSync(Effect.map(SharePages, ({ external }) => external.page))
    : undefined;
  // spec/app/browser/share.md, "Choosing where to send the page sends it once, if it is still the page the panel opened on, and closes the panel": Email, as v121, only while Inbox can take a new email.
  const nativeReview = reviewed !== undefined && !("load" in reviewed) ? reviewed : undefined;
  const canMail = native && canShare && binding !== undefined && runtime.runSync(mailTarget) !== undefined;
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
  const desktopSite = native && tabs.native.includes(tab) ? runtime.runSync(Effect.flatMap(Pages, (pages) => pages.desktop(tab))) : false;
  const readingPage = review.held;
  const readingNotice = readingPage?.purpose === "Aloud" ? undefined : reader.state?.phase === "Blocked" ? SENSITIVE_READING_MESSAGE : reader.state?.phase === "Unavailable"
    ? cannotRead ? READING_UNSUPPORTED_MESSAGE : readingPage === undefined && reader.state.purpose === "Ask" ? "Load a public HTTPS page before asking about it." : "Page reading unavailable" : undefined;
  const question = reader.state?.phase === "Reviewing" && readingPage?.purpose === "Ask" ? readingPage : undefined;
  const aloud = readingPage?.purpose === "Aloud" && tabs.layer === "ReadingReview" ? readingPage : undefined;
  const speechPurpose = native ? "OnPhone" : "Aloud";
  const offered: (BrowserMenuItem | false)[] = [
    (native || can({ type: "reload" })) && { label: "Reload", name: "Reload page", icon: <RotateCw />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => can({ type: "reload" }) ? send({ type: "reload" }) : undefined); } },
    can({ type: "stop" }) && { label: "Stop", name: "Stop loading", icon: <Square />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "stop" })); } },
    canOpenTab(tabs, "Normal") && { label: "New tab", icon: <Plus />, onSelect: () => opening("Normal")?.() },
    canOpenTab(tabs, "Private") && { label: "Private tab", name: "New private tab", icon: <PrivateMark aria-hidden />, onSelect: () => opening("Private")?.() },
    hasLibrary && { label: booked ? "Bookmarked" : "Bookmark", icon: <Star fill={booked ? "currentColor" : "none"} />, disabled: !canBookmark, onSelect: chooseBookmark },
    hasLibrary && { label: "Library", name: "Library, bookmarks and history", icon: <Clock />, onSelect: openLibrary },
    hasLibrary && { label: "Downloads", icon: <Download />, onSelect: () => void runtime.runPromise(openDownloads) },
    native && canShare && { label: "Share", icon: <Share2 />, onSelect: () => void runtime.runPromise(offerShare("System", binding)) },
    canShare && binding !== undefined && { label: "Copy link", icon: <Link />, onSelect: () => void runtime.runPromise(offerShare("Copy", binding)) },
    canMail && { label: "Email", name: "Email this page", icon: <Mail />, onSelect: () => void runtime.runPromise(offerShare("Email", binding)) },
    (native || binding !== undefined) && reader.can({ type: "request", purpose: "Ask", secure: state.secure, supported: true }) && { label: "Ask", name: "Ask about page", icon: <Mark aria-hidden />, onSelect: () => void runtime.runPromise(reviewPage(tab, "Ask")) },
    (native || binding !== undefined) && reader.can({ type: "request", purpose: speechPurpose, secure: state.secure, supported: true }) && { label: "Read aloud", icon: <AudioLines />, onSelect: () => void runtime.runPromise(reviewPage(tab, speechPurpose)) },
    native && cannotRead && { label: "Read aloud", name: "Page reading unavailable", icon: <AudioLines />, reason: READING_UNSUPPORTED_MESSAGE },
    { label: "Passwords", name: "Password manager", icon: <Lock />, onSelect: () => void runtime.runPromise(openPasswords) },
    canHandoff && { label: "Open externally", name: "Open externally, passkeys unsupported here", icon: <ExternalLink />, onSelect: () => void runtime.runPromise(offerNativeHandoff(nativePage)) },
    native && can({ type: "openFind" }) && { label: "Find", name: "Find in page", icon: <Search />, onSelect: () => { setFinding(""); void browser.send({ type: "uncover" }).then(() => send({ type: "openFind" })); } },
    native && tabs.native.includes(tab) && { label: desktopSite ? "Mobile site" : "Desktop site", name: desktopSite ? "Request mobile site" : "Request desktop site", icon: desktopSite ? <Smartphone /> : <Monitor />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => runtime.runPromise(toggleDesktopSite(tab))); } },
    clearable !== undefined && { label: "Clear site", name: "Clear site data", icon: <ListFilter />, onSelect: () => { setClearingSite(clearable); void browser.send({ type: "uncover" }); } },
    canAskErase(tabs) && { label: "Clear all", name: "Clear all browsing data", icon: <Trash2 />, onSelect: () => void browser.send({ type: "askErase" }) },
  ];
  const seek = (text: string) => {
    setFinding(text);
    void runtime.runPromise(Effect.flatMap(Pages, (pages) => pages.seek(tab, text))).then(() => send({ type: "typeFind", empty: text === "" }));
  };
  const findStatus = finding === "" ? "" : state.find.status === "Loading" ? "Searching…" : state.matches > 0 ? `${state.position} of ${state.matches}` : "No matches";
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
      {offerElsewhere && (
        <div className="flex shrink-0 justify-center px-4 py-2">
          <Button variant="outline" onClick={() => void share.send(elsewhere)}>Open in browser<ExternalLink aria-hidden className="size-4" /></Button>
        </div>
      )}
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
      {libraryNotice && <p role="status" className="pointer-events-none absolute top-16 right-4 left-4 z-50 rounded-full bg-card px-5 py-3 text-center text-base shadow-menu">{libraryNotice}</p>}
      {readingNotice && <p role="status" className="pointer-events-none absolute top-16 right-4 left-4 z-50 rounded-full bg-card px-5 py-3 text-center text-base shadow-menu">{readingNotice}</p>}
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
      <ConfirmDialog open={reviewed !== undefined && "load" in reviewed} title="Open private page?" confirmLabel="Open in browser"
        onConfirm={() => void runtime.runPromise(confirmExternal())}
        onCancel={() => void runtime.runPromise(cancelExternal())}>
        The other browser may save {reviewed ? new URL(reviewed.url).host : "this page"} in its history.
      </ConfirmDialog>
      <BrowserReview open={nativeReview !== undefined} title="Leave private browsing?" confirmLabel="Choose browser"
        onConfirm={() => void runtime.runPromise(confirmExternal())}
        onCancel={() => void runtime.runPromise(cancelExternal())}>
        {nativeReview ? `Open ${new URL(nativeReview.url).hostname} externally?\n${nativeReview.url}` : undefined}
      </BrowserReview>
      <AgentPageCard runtime={runtime} />
      {question && <BrowserQuestion source={question.source} question={question.question} excerpt={question.excerpt}
        ready={reader.can({ type: "confirm", safe: true })}
        status={sensitiveReadingText(question.excerpt) ? "Remove secrets first" : undefined}
        onQuestion={(value) => void runtime.runPromise(editQuestion("question", value))}
        onExcerpt={(value) => void runtime.runPromise(editQuestion("excerpt", value))}
        onConfirm={() => void runtime.runPromise(confirmQuestion())}
        onCancel={() => void runtime.runPromise(cancelReading())} />}
      {aloud && <BrowserReadAloud origin={new URL(aloud.page.url).origin} excerpt={aloud.excerpt}
        pending={reader.state?.phase === "Reading"} reading={reader.state?.phase === "Sent"} blocked={reader.state?.phase === "Blocked"}
        status={reader.state?.phase === "Blocked" ? "Contains secrets" : aloud.status}
        onExcerpt={(value) => void runtime.runPromise(editPageExcerpt(value))}
        onRead={() => void runtime.runPromise(readPageExcerpt())}
        onStop={() => void runtime.runPromise(cancelReading())}
        onClose={() => void runtime.runPromise(cancelReading())} />}
      <BrowserReview open={clearingSite !== undefined} title={`Clear data for ${clearingSite?.host ?? ""}?`} confirmLabel="Clear data" destructive
        onConfirm={() => { if (clearingSite !== undefined) void runtime.runPromise(clearSiteShown(clearingSite)); setClearingSite(undefined); }}
        onCancel={() => setClearingSite(undefined)}>
        {`Signs you out of ${clearingSite?.host ?? ""}.`}
      </BrowserReview>
      <BrowserReview open={tabs.erasing === "Asked"} title="Clear browsing data?" confirmLabel="Clear data" destructive
        onConfirm={() => { if (canConfirmErase(tabs)) void browser.send({ type: "confirmErase" }); }}
        onCancel={() => { if (canCancelErase(tabs)) void browser.send({ type: "cancelErase" }); }}>
        {native ? "Clears history, cookies and tabs." : "Clears history and tabs."}
      </BrowserReview>
    </div>
  );
}

function AgentPageCard({ runtime }: Pick<BrowserProps, "runtime">) {
  const held = runtime.runSync(Reviewing);
  const page = useSyncExternalStore(held.subscribe, held.get, held.get);
  const address = addressParts(page?.operation.url);
  return (
    <BrowserReview open={page !== undefined} title="Open this page?" confirmLabel="Open"
      onConfirm={() => void runtime.runPromise(approve)}
      onCancel={() => void runtime.runPromise(decline)}>
      {address.host}{address.path}
    </BrowserReview>
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
