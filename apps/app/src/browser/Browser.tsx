// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/index.md, "Story: Let the agent open a page"; spec/app/browser/share.md, "Story: Share the page"; spec/app/browser/share.md, "Story: Open the page in another browser"; spec/app/browser/address.md, "Story: Go where I typed"; spec/app/browser/address.md, "Story: Watch a page load"; spec/app/browser/address.md, "Story: Browse privately"
import { Alert, Banner, Button, BrowserAddressBar, ListRow, Sheet, SheetContent, type BrowserAddressChoice, BrowserAddressChoices, BrowserFindBar, BrowserBar, BrowserLibrary, type BrowserMenuItem, BrowserMenu, BrowserNewTab, BrowserTabs, ConfirmDialog, PrivateMark } from "@repo/ui";
import { ChevronLeft, Download, ExternalLink, History, Plus, RotateCw, Search, Share2, Square, Star, Trash2 } from "lucide-react";
import { Effect, Option } from "effect";
import { useState } from "react";
import { canAskErase, canCancelErase, canConfirmErase, canOpenTab } from "../../gen/app__browser.ts";
import type { Browser as State } from "../../gen/app__browser.ts";
import { useMachine } from "../../gen/app__browser.react.ts";
import type { Machine } from "../../gen/app__browser.effect.vibe";
import { verdict } from "../../gen/app__browser__address.ts";
import { useMachine as usePage } from "../../gen/app__browser__address.react.ts";
import { Machine as LibraryMachine } from "../../gen/app__browser__library.effect.vibe";
import { useMachine as useLibrary } from "../../gen/app__browser__library.react.ts";
import { useMachine as useShare } from "../../gen/app__browser__share.react.ts";
import type { Share as ShareState } from "../../gen/app__browser__share.ts";
import { canConfirm } from "../../gen/kit__review.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { TabHost } from "../platform/browser.vibe";
import { Device } from "../platform/device.vibe";
import type { Alpha, Resident } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import type { ManagedRuntime } from "effect";
import { Pages, type PageRuntime, addressOf, idOf, inputOf, mailTarget, openDownloads, placed } from "./browser.vibe";
import { LibraryRows, markPage, setMark } from "./library.vibe";

/** What the Browser tells the owner about sharing and leaving, drawn under its bar at the top and never near Ask Alpha. */
const notices: Partial<Record<ShareState["notice"], { text: string; warn: boolean }>> = {
  NoPage: { text: "Load the page before sharing it", warn: true },
  Changed: { text: "The page changed, so nothing was shared", warn: false },
  Copied: { text: "Link copied", warn: false },
  ClipboardRefused: { text: "The link could not be copied", warn: true },
  Passkeys: { text: "This page needs another browser for its passkey", warn: false },
  NoBrowser: { text: "No other browser on this phone can open this page", warn: true },
  NotOpened: { text: "The other browser did not open. The page is still here.", warn: true },
};

export interface BrowserProps {
  /** Provides the Browser's tabs and each tab's page, `browser` of browser.vibe, over the resident machines and the phone's tab host. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Pages | LibraryMachine | LibraryRows | TabHost | Shell | Resident, unknown>;
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

function Tab({ runtime, alpha, tabs, page }: BrowserProps & { tabs: State; page: PageRuntime }) {
  const browser = useMachine(runtime);
  const { state, can, send } = usePage(page);
  const share = useShare(page);
  const library = useLibrary(runtime);
  const [typed, setTyped] = useState("");
  const [refusal, setRefusal] = useState<string>();
  const [finding, setFinding] = useState("");
  if (!state || !share.state) return null;
  const tab = tabs.selected;
  const tabHost = runtime.runSync(TabHost);
  const shown = tabHost.web === undefined ? tabHost.session.info(idOf(tab)) : tabHost.web.info(idOf(tab));
  const shownAddress = shown?.url;
  const { host, path } = addressParts(shownAddress);
  const editing = tabs.layer === "Address";
  const native = Option.isSome(tabHost.plugin);
  const privateTab = state.kind === "Private";
  const readSuggestions = () => native ? loadLibrary(runtime) : undefined;
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
  const committed = state.phase === "Shown" ? (shown?.url ?? "") : "";
  const ready = state.phase === "Shown";
  const elsewhere = { type: "openExternally", kind: state.kind, secure: state.secure } as const;
  const choose = { type: "choose", dest: "System", ok: true } as const;
  const mailable = runtime.runSync(mailTarget) !== undefined;
  // spec/app/browser/share.md, "Choosing where to send the page sends it once, if it is still the page the panel opened on, and closes the panel": the clipboard answers at once, and a page that changed is not copied.
  const copyLink = () => {
    const url = (tabHost.web === undefined ? tabHost.session.info(idOf(tab)) : tabHost.web.info(idOf(tab)))?.url ?? "";
    if (!canConfirm(share.state!.review) || url !== committed) { void share.send({ type: "choose", dest: "Copy", ok: false }); return; }
    void runtime.runPromise(Effect.flatMap(Device, (device) => device.copyText(url))).then((ok) => share.send({ type: "choose", dest: "Copy", ok }), () => share.send({ type: "choose", dest: "Copy", ok: false }));
  };
  const said = notices[share.state.notice];
  const binding = tabs.layer === "Menu" ? tabHost.session.pageBinding(idOf(tab)) : undefined;
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
    if (native && library.state?.read.status !== "Loaded") void loadLibrary(runtime);
  });
  const bookmarkNotice = library.state?.notice === "NotSecure" ? "HTTPS only"
    : library.state?.notice === "Full" ? "The bookmark list is full."
      : library.state?.notice === "Failed" ? "Could not change the bookmark." : undefined;
  const offered: (BrowserMenuItem | false)[] = [
    can({ type: "reload" }) && { label: "Reload", name: "Reload page", icon: <RotateCw />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "reload" })); } },
    can({ type: "stop" }) && { label: "Stop", name: "Stop loading", icon: <Square />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "stop" })); } },
    canOpenTab(tabs, "Normal") && { label: "New tab", icon: <Plus />, onSelect: () => opening("Normal")?.() },
    canOpenTab(tabs, "Private") && { label: "Private tab", name: "New private tab", icon: <PrivateMark aria-hidden />, onSelect: () => opening("Private")?.() },
    native && { label: booked ? "Bookmarked" : "Bookmark", icon: <Star fill={booked ? "currentColor" : "none"} />, disabled: !canBookmark, onSelect: chooseBookmark },
    native && { label: "Library", name: "Library, bookmarks and history", icon: <History />, onSelect: openLibrary },
    native && { label: "Downloads", icon: <Download />, onSelect: () => void runtime.runPromise(openDownloads) },
    share.can({ type: "openPanel", ready }) && { label: "Share", icon: <Share2 />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => share.send({ type: "openPanel", ready })); } },
    native && can({ type: "openFind" }) && { label: "Find", name: "Find in page", icon: <Search />, onSelect: () => { setFinding(""); void browser.send({ type: "uncover" }).then(() => send({ type: "openFind" })); } },
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
      {tabs.agent !== 0 && (
        <Banner action={browser.can({ type: "takeOver" }) && <Button size="sm" variant="outline" onClick={() => void browser.send({ type: "takeOver" })}>Stop and take over</Button>}>
          Alpha is using a tab
        </Banner>
      )}
      {editing
        ? <BrowserAddressBar leading={leading} value={typed} onValueChange={(value) => { setTyped(value); setRefusal(undefined); }} onSubmit={() => submit(typed)} onCancel={() => void browser.send({ type: "uncover" })} />
        : <BrowserBar
            leading={leading}
            host={host}
            path={path}
            secure={state.secure}
            private={privateTab}
            tabs={tabs.open.length}
            onEdit={cover("Address") && edit}
            onStop={can({ type: "stop" }) ? () => void send({ type: "stop" }) : undefined}
            onBack={can({ type: "goBack" }) ? () => void send({ type: "goBack" }) : undefined}
            onForward={can({ type: "goForward" }) ? () => void send({ type: "goForward" }) : undefined}
            onTabs={cover("Switcher")}
            onMenu={cover("Menu") && menu}
          />}
      {state.phase === "Loading" && <div role="progressbar" aria-label="Loading website" className="h-0.75 shrink-0 overflow-hidden bg-secondary"><div className="h-full w-[35%] bg-alpha motion-safe:animate-page-loading motion-reduce:w-full" /></div>}
      {said !== undefined && <Alert variant={said.warn ? "warn" : "info"} className="mx-4 my-2 shrink-0">{said.text}</Alert>}
      {share.can(elsewhere) && (
        <div className="flex shrink-0 justify-center px-4 py-2">
          <Button variant="outline" onClick={() => void share.send(elsewhere)}>Open in browser<ExternalLink aria-hidden className="size-4" /></Button>
        </div>
      )}
      <div inert={tabs.layer !== "Uncovered"} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {state.phase === "Blank"
          ? <BrowserNewTab private={privateTab} privateNotice={privateNotice} onSearch={cover("Address") && edit} />
          : <div data-alpha-browser-page="" aria-hidden ref={(place) => { if (place) void runtime.runPromise(placed); }} className="absolute inset-0" />}
      </div>
      <Sheet open={share.state.review.showing} onOpenChange={(next) => { if (!next && share.can({ type: "closePanel" })) void share.send({ type: "closePanel" }); }}>
        <SheetContent title="Share this page">
          {share.can(choose) && native && <ListRow title="Share to an app" onClick={() => void share.send(choose)} />}
          {share.can(choose) && committed !== "" && <ListRow title="Copy link" onClick={copyLink} />}
          {share.can(choose) && mailable && <ListRow title="Email" onClick={() => void share.send({ type: "choose", dest: "Email", ok: true })} />}
        </SheetContent>
      </Sheet>
      {editing && <AddressChoices runtime={runtime} query={typed} privateTab={privateTab} privateNotice={privateNotice} refusal={state.refused ? refusal : undefined} onOpen={submit} />}
      {state.finding && tabs.layer === "Uncovered" && (
        <BrowserFindBar value={finding} onValueChange={seek} status={findStatus}
          onPrevious={can({ type: "findNext", forward: false }) ? () => void send({ type: "findNext", forward: false }) : undefined}
          onNext={can({ type: "findNext", forward: true }) ? () => void send({ type: "findNext", forward: true }) : undefined}
          onClose={() => void send({ type: "closeFind" })} />
      )}
      {tabs.layer === "Menu" && <BrowserMenu items={offered.filter((item) => item !== false)} onClose={() => void browser.send({ type: "uncover" })} />}
      {tabs.layer === "Library" && <Library runtime={runtime} onBack={() => void browser.send({ type: "uncover" })} onOpen={submit} />}
      {bookmarkNotice && <p role="status" className="pointer-events-none absolute right-4 bottom-36 left-4 z-50 rounded-full bg-card px-5 py-3 text-center text-base shadow-menu">{bookmarkNotice}</p>}
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
  const bookmarks = state === undefined ? [] : runtime.runSync(Effect.flatMap(LibraryRows, (rows) => rows.bookmarks()));
  const history = privateTab ? [] : runtime.runSync(Effect.flatMap(Pages, (pages) => pages.visits()));
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
  const history = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.visits()));
  const titles = new Map(bookmarks.map((entry) => [entry.url, entry.title]));
  return <BrowserLibrary bookmarks={bookmarks} history={history.map((url) => ({ url, title: titles.get(url) }))}
    loading={state === undefined || state.read.status === "Loading" || state.read.status === "Idle"}
    failed={state?.read.status === "Failed"} onBack={onBack} onOpen={onOpen}
    onRemoveBookmark={can({ type: "unmark" }) ? (entry) => void runtime.runPromise(setMark(entry, false)) : undefined}
    onRetry={can({ type: "askRead" }) ? () => void send({ type: "askRead" }) : undefined} />;
}
