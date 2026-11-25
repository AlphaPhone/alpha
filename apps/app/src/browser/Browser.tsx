// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/index.md, "Story: Let the agent open a page"; spec/app/browser/library.md, "Story: Keep bookmarks"; spec/app/browser/library.md, "Story: Look back through history"; spec/app/browser/address.md, "Story: Go where I typed"; spec/app/browser/address.md, "Story: Watch a page load"; spec/app/browser/address.md, "Story: Browse privately"; spec/app/browser/share.md, "Story: Share the page"; spec/app/browser/share.md, "Story: Open the page in another browser"; spec/app/browser/reading.md, "Story: Ask Alpha about the page"; spec/app/browser/reading.md, "Story: Hear the page read aloud"; spec/app/browser/site.md, "Story: Let a site use the camera, microphone or location"
import { Button, BrowserAddressBar, type BrowserAddressChoice, BrowserAddressChoices, BrowserFindBar, BrowserBar, BrowserLibrary, type BrowserMenuItem, BrowserMenu, BrowserNewTab, BrowserTabs, ConfirmDialog, ListRow, PrivateMark, Sheet, SheetContent } from "@repo/ui";
import { ArrowUpRight, ChevronLeft, Clock, Copy, Download, Mail, Plus, RotateCw, Search, Share2, Square, Star, Trash2, Volume2, X } from "lucide-react";
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
import type { Machine as ReadingMachine } from "../../gen/app__browser__reading.effect.vibe";
import { useMachine as useReading } from "../../gen/app__browser__reading.react.ts";
import type { Machine as ShareMachine } from "../../gen/app__browser__share.effect.vibe";
import { useMachine as useShare } from "../../gen/app__browser__share.react.ts";
import type { Machine as SiteMachine } from "../../gen/app__browser__site.effect.vibe";
import { useMachine as useSite } from "../../gen/app__browser__site.react.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { TabHost } from "../platform/browser.vibe";
import type { Alpha, Resident } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import type { ManagedRuntime } from "effect";
import { Pages, type PageRuntime, addressOf, idOf, inputOf, openDownloads, placed } from "./browser.vibe";
import { LibraryRows, markPage, setMark } from "./library.vibe";
import { ReadingBuffer } from "./reading.vibe";

export interface BrowserProps {
  /** Provides the Browser's tabs and each tab's page, `browser` of browser.vibe, over the resident machines and the phone's tab host. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Pages | LibraryMachine | LibraryRows | ShareMachine | ReadingMachine | ReadingBuffer | SiteMachine | TabHost | Shell | Resident, unknown>;
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
  const library = useLibrary(runtime);
  const share = useShare(runtime);
  const reading = useReading(runtime);
  const site = useSite(runtime);
  const [typed, setTyped] = useState("");
  const [refusal, setRefusal] = useState<string>();
  const [finding, setFinding] = useState("");
  if (!state) return null;
  const tab = tabs.selected;
  const tabHost = runtime.runSync(TabHost);
  const shown = tabHost.session.info(idOf(tab));
  const { host, path } = addressParts(shown?.url);
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
    setTyped(shown?.url ?? "");
    void browser.send({ type: "cover", layer: "Address" }).then(readSuggestions);
  };
  const others = tabs.open.filter((one) => one !== tab);
  const opening = (kind: "Normal" | "Private") => (canOpenTab(tabs, kind) ? () => {
    void browser.send({ type: "openTab", kind }).then(readSuggestions);
  } : undefined);
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
  const ready = state.phase === "Shown" && Boolean(shown?.url);
  const elsewhere = { type: "openExternally", kind: state.kind, secure: state.secure } as const;
  const readAloud = { type: "request", purpose: "Aloud", secure: state.secure, supported: native } as const;
  const offered: (BrowserMenuItem | false)[] = [
    can({ type: "reload" }) && { label: "Reload", name: "Reload page", icon: <RotateCw />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "reload" })); } },
    can({ type: "stop" }) && { label: "Stop", name: "Stop loading", icon: <Square />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "stop" })); } },
    canOpenTab(tabs, "Normal") && { label: "New tab", icon: <Plus />, onSelect: () => opening("Normal")?.() },
    canOpenTab(tabs, "Private") && { label: "Private tab", name: "New private tab", icon: <PrivateMark aria-hidden />, onSelect: () => opening("Private")?.() },
    native && { label: booked ? "Bookmarked" : "Bookmark", icon: <Star className={booked ? "fill-current" : undefined} />, disabled: !canBookmark, onSelect: chooseBookmark },
    native && { label: "Library", name: "Library, bookmarks and history", icon: <Clock />, onSelect: openLibrary },
    native && { label: "Downloads", icon: <Download />, onSelect: () => void runtime.runPromise(openDownloads) },
    share.can({ type: "openPanel", ready }) && { label: "Share", icon: <Share2 />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => share.send({ type: "openPanel", ready })); } },
    ready && reading.can(readAloud) && { label: "Read aloud", icon: <Volume2 />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => reading.send(readAloud)); } },
    can({ type: "openFind" }) && { label: "Find", name: "Find in page", icon: <Search />, onSelect: () => { setFinding(""); void browser.send({ type: "uncover" }).then(() => send({ type: "openFind" })); } },
    share.can(elsewhere) && { label: "Open externally", name: "Open in another browser", icon: <ArrowUpRight />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => share.send(elsewhere)); } },
    canAskErase(tabs) && { label: "Clear all", name: "Clear all browsing data", icon: <Trash2 />, onSelect: () => void browser.send({ type: "askErase" }) },
  ];
  const stood = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.sought(tab)));
  const seek = (text: string) => {
    setFinding(text);
    void runtime.runPromise(Effect.flatMap(Pages, (pages) => pages.seek(tab, text))).then(() => send({ type: "typeFind", empty: text === "" }));
  };
  const findStatus = finding === "" ? "" : state.find.status === "Loading" ? "Searching…" : state.matches > 0 ? `${Math.max(1, stood.index)} of ${state.matches}` : "No matches";
  const cards = tabs.open.map((one) => {
    const known = tabHost.session.info(idOf(one));
    const privateTab = tabs.privates.includes(one);
    const blank = privateTab ? "New private tab" : "New tab";
    return { id: one, title: known?.title || known?.url || blank, where: `${privateTab ? "Private · " : ""}${known?.url ?? ""}`, current: one === tab, private: privateTab };
  });
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
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
      {state.phase === "Loading" && <div role="progressbar" aria-label="Loading website" className="h-0.75 shrink-0 overflow-hidden bg-secondary"><div className="h-full w-1/3 bg-primary" /></div>}
      {tabs.agent !== 0 && (
        <div role="status" className="mx-3 mt-0.5 mb-2 flex shrink-0 items-center gap-3 rounded-full bg-alpha py-1.5 pr-1.5 pl-4.5 text-alpha-foreground motion-safe:animate-drop">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-alpha-foreground" />
          <span className="grow text-sm font-semibold">Alpha is using a tab</span>
          {browser.can({ type: "takeOver" }) && (
            <button type="button" aria-label="Stop and take over" onClick={() => void browser.send({ type: "takeOver" })}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alpha-foreground text-alpha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alpha-foreground">
              <X aria-hidden className="size-4.5" />
            </button>
          )}
        </div>
      )}
      <div inert={tabs.layer !== "Uncovered"} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {state.phase === "Blank"
          ? <BrowserNewTab private={privateTab} onSearch={cover("Address") && edit} />
          : <div data-alpha-browser-page="" aria-hidden ref={(place) => { if (place) void runtime.runPromise(placed); }} className="absolute inset-0" />}
      </div>
      {editing && <AddressChoices runtime={runtime} query={typed} privateTab={privateTab} refusal={state.refused ? refusal : undefined} onOpen={submit} />}
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
        Clears history, cookies and tabs.
      </ConfirmDialog>
      <Sheet open={share.state?.review.showing === true} onOpenChange={(open) => { if (!open && share.can({ type: "closePanel" })) void share.send({ type: "closePanel" }); }}>
        <SheetContent title="Share page">
          <div className="flex flex-col divide-y divide-border">
            <ListRow leading={<Share2 />} title="Share…" onClick={() => void share.send({ type: "choose", dest: "System", ok: true })} />
            <ListRow leading={<Copy />} title="Copy link" onClick={() => void share.send({ type: "choose", dest: "Copy", ok: true })} />
            <ListRow leading={<Mail />} title="Email link" onClick={() => void share.send({ type: "choose", dest: "Email", ok: true })} />
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog open={share.state?.handoff.showing === true} title="Open private page in another browser?" confirmLabel="Open externally"
        onConfirm={() => { if (share.can({ type: "confirmExternally" })) void share.send({ type: "confirmExternally" }); }}
        onCancel={() => { if (share.can({ type: "cancelExternally" })) void share.send({ type: "cancelExternally" }); }}>
        This private tab will leave Alpha.
      </ConfirmDialog>
      <ConfirmDialog open={reading.state?.phase === "Reviewing"} title={reading.state?.purpose === "Aloud" ? "Read this page aloud?" : "Share excerpt with Ask Alpha?"}
        confirmLabel={reading.state?.purpose === "Aloud" ? "Read aloud" : "Send excerpt"}
        onConfirm={() => { if (reading.can({ type: "confirm" })) void reading.send({ type: "confirm" }); }}
        onCancel={() => { if (reading.can({ type: "cancel" })) void reading.send({ type: "cancel" }); }}>
        {runtime.runSync(Effect.flatMap(ReadingBuffer, (buffer) => buffer.current())).excerpt}
      </ConfirmDialog>
      <ConfirmDialog open={site.state?.prompt === "Asking"} title={`Allow this site to use your ${site.state?.want.toLowerCase() ?? "device"}?`} confirmLabel="Allow"
        onConfirm={() => { if (site.can({ type: "decide", allow: true })) void site.send({ type: "decide", allow: true }); }}
        onCancel={() => { if (site.can({ type: "decide", allow: false })) void site.send({ type: "decide", allow: false }); }}>
        {site.state?.kind === "Private" ? "Private tabs do not remember site permissions." : "Normal tabs remember your choice for this site."}
      </ConfirmDialog>
    </div>
  );
}

function AddressChoices({ runtime, query, privateTab, refusal, onOpen }: Pick<BrowserProps, "runtime"> & {
  query: string;
  privateTab: boolean;
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
  return <BrowserAddressChoices choices={choices} privateTab={privateTab} refusal={refusal} onOpen={onOpen} />;
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
