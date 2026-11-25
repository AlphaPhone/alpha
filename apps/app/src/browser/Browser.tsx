// spec/app/browser/index.md, "Story: Open, pick and close tabs"; spec/app/browser/index.md, "Story: Let the agent open a page"; spec/app/browser/share.md, "Story: Share the page"; spec/app/browser/share.md, "Story: Open the page in another browser"; spec/app/browser/library.md, "Story: Keep bookmarks"; spec/app/browser/library.md, "Story: Look back through history"; spec/app/browser/address.md, "Story: Go where I typed"; spec/app/browser/address.md, "Story: Watch a page load"; spec/app/browser/address.md, "Story: Browse privately"
import { Alert, Banner, Button, BrowserAddressBar, Card, ListRow, Sheet, SheetContent, BrowserFindBar, BrowserBar, type BrowserMenuItem, BrowserMenu, BrowserNewTab, BrowserTabs, ConfirmDialog, PrivateMark } from "@repo/ui";
import { Bookmark, BookmarkMinus, ChevronLeft, ExternalLink, History, Plus, RotateCw, Search, Share2, Square, Trash2 } from "lucide-react";
import { Effect } from "effect";
import { useState, useSyncExternalStore } from "react";
import { canAskErase, canCancelErase, canConfirmErase, canOpenTab } from "../../gen/app__browser.ts";
import type { Browser as State } from "../../gen/app__browser.ts";
import { useMachine } from "../../gen/app__browser.react.ts";
import type { Machine } from "../../gen/app__browser.effect.vibe";
import { verdict } from "../../gen/app__browser__address.ts";
import { useMachine as usePage } from "../../gen/app__browser__address.react.ts";
import type { Machine as LibraryMachine } from "../../gen/app__browser__library.effect.vibe";
import { useMachine as useLibrary } from "../../gen/app__browser__library.react.ts";
import { useMachine as useShare } from "../../gen/app__browser__share.react.ts";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { TabHost } from "../platform/browser.vibe";
import type { Alpha, Resident } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import type { ManagedRuntime } from "effect";
import { Proposed, approve } from "./agent.vibe";
import { Pages, type PageRuntime, addressOf, idOf, inputOf, placed } from "./browser.vibe";
import { Library } from "./Library.tsx";
import { aimMark, listsNow, onLists } from "./library.vibe";

export interface BrowserProps {
  /** Provides the Browser's tabs and each tab's page, `browser` of browser.vibe, over the resident machines and the phone's tab host. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Pages | TabHost | LibraryMachine | Proposed | Shell | Resident, unknown>;
  alpha: Alpha;
}

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
  const lists = useSyncExternalStore(onLists, listsNow, listsNow);
  const [typed, setTyped] = useState("");
  const [finding, setFinding] = useState("");
  if (!state || !share.state || !library.state) return null;
  const tab = tabs.selected;
  const shown = runtime.runSync(Effect.map(TabHost, (host) => host.session.info(idOf(tab))));
  const { host, path } = addressParts(shown?.url);
  const editing = tabs.layer === "Address";
  const cover = (layer: State["layer"]) => (browser.can({ type: "cover", layer }) ? () => void browser.send({ type: "cover", layer }) : undefined);
  const leading = <AppBack alpha={alpha} />;
  const submit = () => {
    const input = inputOf(typed);
    if (!can({ type: "submit", i: input })) return;
    void runtime.runPromise(Effect.flatMap(Pages, (pages) => pages.aim(tab, addressOf(typed, verdict(input) === "Search"))))
      .then(() => send({ type: "submit", i: input }))
      .then(() => browser.send({ type: "uncover" }));
  };
  const tell = (event: Parameters<typeof browser.send>[0]) => (browser.can(event) ? () => void browser.send(event) : undefined);
  const others = tabs.open.filter((one) => one !== tab);
  const opening = (kind: "Normal" | "Private") => (canOpenTab(tabs, kind) ? () => { setTyped(""); void browser.send({ type: "openTab", kind }); } : undefined);
  const committed = state.phase === "Shown" ? (shown?.url ?? "") : "";
  const marked = committed !== "" && lists.marks.some((one) => one.url === committed);
  const mark = { type: "mark", secure: state.secure, userInfo: committed !== "" && inputOf(committed).userInfo } as const;
  const ready = state.phase === "Shown";
  const elsewhere = { type: "openExternally", kind: state.kind, secure: state.secure } as const;
  const choose = { type: "choose", dest: "System", ok: true } as const;
  const marking = (event: { type: "mark"; secure: boolean; userInfo: boolean } | { type: "unmark" }) => () => {
    aimMark({ url: committed, title: shown?.title ?? "" });
    void browser.send({ type: "uncover" }).then(() => library.send(event));
  };
  const offered: (BrowserMenuItem | false)[] = [
    can({ type: "reload" }) && { label: "Reload", name: "Reload page", icon: <RotateCw />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "reload" })); } },
    can({ type: "stop" }) && { label: "Stop", name: "Stop loading", icon: <Square />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => send({ type: "stop" })); } },
    canOpenTab(tabs, "Normal") && { label: "New tab", icon: <Plus />, onSelect: () => opening("Normal")?.() },
    canOpenTab(tabs, "Private") && { label: "Private tab", name: "New private tab", icon: <PrivateMark aria-hidden />, onSelect: () => opening("Private")?.() },
    can({ type: "openFind" }) && { label: "Find", name: "Find in page", icon: <Search />, onSelect: () => { setFinding(""); void browser.send({ type: "uncover" }).then(() => send({ type: "openFind" })); } },
    committed !== "" && !marked && library.can(mark) && { label: "Bookmark", name: "Bookmark this page", icon: <Bookmark />, onSelect: marking(mark) },
    marked && library.can({ type: "unmark" }) && { label: "Remove bookmark", icon: <BookmarkMinus />, onSelect: marking({ type: "unmark" }) },
    browser.can({ type: "cover", layer: "Library" }) && { label: "History", name: "Bookmarks and history", icon: <History />, onSelect: () => void browser.send({ type: "cover", layer: "Library" }) },
    share.can({ type: "openPanel", ready }) && { label: "Share", icon: <Share2 />, onSelect: () => { void browser.send({ type: "uncover" }).then(() => share.send({ type: "openPanel", ready })); } },
    canAskErase(tabs) && { label: "Clear all", name: "Clear all browsing data", icon: <Trash2 />, onSelect: () => void browser.send({ type: "askErase" }) },
  ];
  const stood = runtime.runSync(Effect.flatMap(Pages, (pages) => pages.sought(tab)));
  const seek = (text: string) => {
    setFinding(text);
    void runtime.runPromise(Effect.flatMap(Pages, (pages) => pages.seek(tab, text))).then(() => send({ type: "typeFind", empty: text === "" }));
  };
  const findStatus = finding === "" ? "" : state.find.status === "Loading" ? "Searching…" : state.matches > 0 ? `${Math.max(1, stood.index)} of ${state.matches}` : "No matches";
  const cards = tabs.open.map((one) => {
    const known = runtime.runSync(Effect.map(TabHost, (host) => host.session.info(idOf(one))));
    const privateTab = tabs.privates.includes(one);
    const blank = privateTab ? "New private tab" : "New tab";
    return { id: one, title: known?.title || known?.url || blank, where: `${privateTab ? "Private · " : ""}${addressParts(known?.url).host || blank}`, current: one === tab, private: privateTab };
  });
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {tabs.agent !== 0 && (
        <Banner action={browser.can({ type: "takeOver" }) && <Button size="sm" variant="outline" onClick={() => void browser.send({ type: "takeOver" })}>Stop and take over</Button>}>
          Alpha is using a tab
        </Banner>
      )}
      {editing
        ? <BrowserAddressBar leading={leading} value={typed} onValueChange={setTyped} onSubmit={submit} onCancel={() => void browser.send({ type: "uncover" })} />
        : <BrowserBar
            leading={leading}
            host={host}
            path={path}
            secure={state.secure}
            private={state.kind === "Private"}
            tabs={tabs.open.length}
            onEdit={cover("Address") && (() => { setTyped(`${host}${path}`); void browser.send({ type: "cover", layer: "Address" }); })}
            onStop={can({ type: "stop" }) ? () => void send({ type: "stop" }) : undefined}
            onBack={can({ type: "goBack" }) ? () => void send({ type: "goBack" }) : undefined}
            onForward={can({ type: "goForward" }) ? () => void send({ type: "goForward" }) : undefined}
            onTabs={cover("Switcher")}
            onMenu={cover("Menu")}
          />}
      {state.phase === "Loading" && <div role="progressbar" aria-label="Loading website" className="h-0.75 shrink-0 overflow-hidden bg-secondary"><div className="h-full w-1/3 bg-primary" /></div>}
      <div inert={tabs.layer !== "Uncovered"} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {state.phase === "Blank"
          ? <BrowserNewTab private={state.kind === "Private"} onSearch={cover("Address") && (() => { setTyped(""); void browser.send({ type: "cover", layer: "Address" }); })} />
          : <div data-alpha-browser-page="" aria-hidden ref={(place) => { if (place) void runtime.runPromise(placed); }} className="absolute inset-0" />}
      </div>
      {share.can(elsewhere) && (
        <div className="flex justify-center px-4 py-2">
          <Button variant="outline" onClick={() => void share.send(elsewhere)}>Open in browser<ExternalLink aria-hidden className="size-4" /></Button>
        </div>
      )}
      {share.state.notice === "NoBrowser" && <Alert variant="warn" className="mx-4">No other browser on this phone can open this page</Alert>}
      {share.state.notice === "NotOpened" && <Alert variant="warn" className="mx-4">The other browser did not open. The page is still here.</Alert>}
      {share.state.notice === "Changed" && <Alert variant="info" className="mx-4">The page changed, so nothing was shared</Alert>}
      <Sheet open={share.state.review.showing} onOpenChange={(next) => { if (!next && share.can({ type: "closePanel" })) void share.send({ type: "closePanel" }); }}>
        <SheetContent title="Share this page">
          {share.can(choose) && <ListRow title="Share to an app" onClick={() => void share.send(choose)} />}
        </SheetContent>
      </Sheet>
      <Library
        runtime={runtime}
        open={tabs.layer === "Library"}
        onClose={() => void browser.send({ type: "uncover" })}
        onOpen={(url) => {
          const input = inputOf(url);
          if (!can({ type: "submit", i: input })) return;
          void runtime.runPromise(Effect.flatMap(Pages, (pages) => pages.aim(tab, addressOf(url, verdict(input) === "Search")))).then(() => send({ type: "submit", i: input }));
        }}
      />
      <Proposal runtime={runtime} />
      {state.finding && tabs.layer === "Uncovered" && (
        <BrowserFindBar value={finding} onValueChange={seek} status={findStatus}
          onPrevious={can({ type: "findNext", forward: false }) ? () => void send({ type: "findNext", forward: false }) : undefined}
          onNext={can({ type: "findNext", forward: true }) ? () => void send({ type: "findNext", forward: true }) : undefined}
          onClose={() => void send({ type: "closeFind" })} />
      )}
      {tabs.layer === "Menu" && <BrowserMenu items={offered.filter((item) => item !== false)} onClose={() => void browser.send({ type: "uncover" })} />}
      {tabs.layer === "Switcher" && (
        <BrowserTabs
          leading={<Button variant="ghost" size="icon" aria-label="Back to page" onClick={() => void browser.send({ type: "uncover" })}><ChevronLeft /></Button>}
          tabs={cards}
          onPick={(one) => tell({ type: "pick", tab: one })?.()}
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
    </div>
  );
}

/**
 * The page the agent asked to open, shown as it will open, for the owner to open in a tab of the agent's or decline.
 * Nothing opens without the owner.
 * @model spec/app/browser/index.md
 */
function Proposal({ runtime }: { runtime: BrowserProps["runtime"] }) {
  const proposed = runtime.runSync(Effect.map(Proposed, (held) => held));
  const held = useSyncExternalStore(proposed.subscribe, proposed.snapshot, proposed.snapshot);
  const browser = useMachine(runtime);
  if (held === undefined || !browser.state) return null;
  const open = { type: "agentOpen", secure: held.secure, userInfo: held.userInfo } as const;
  return (
    <Card role="dialog" data-alpha-review="" aria-label="Open a page" className="fixed inset-x-4 bottom-24 z-40 flex flex-col gap-3 p-4">
      <h2 className="font-semibold">Open this page?</h2>
      <p className="break-all text-sm">{held.url}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => proposed.set(undefined)}>Not now</Button>
        {browser.can(open) && <Button onClick={() => void runtime.runPromise(approve())}>Open</Button>}
      </div>
    </Card>
  );
}
