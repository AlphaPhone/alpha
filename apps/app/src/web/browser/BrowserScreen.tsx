// spec/browser/session.md, "Story: Browse in tabs"; spec/browser/session.md, "A link the owner taps outside Browser opens in a new tab and is never searched"; spec/browser/session.md, "Story: Keep my place with the Browser's layers and Back"; spec/browser/presentation.md, "Story: See the page only when nothing covers it"; spec/browser/pageContext.md, "A page is read only for a message observed on the page Browser shows now, a settled public HTTPS page of a normal tab, with Browser page for Alpha on and a peer that takes it"
import { Effect } from "effect";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useMachine as useBookmarks } from "../../../gen/browser__bookmarks.react.ts";
import { initial as noBookmarks } from "../../../gen/browser__bookmarks.ts";
import { useMachine as useReading } from "../../../gen/browser__reading.react.ts";
import { initial as noReading } from "../../../gen/browser__reading.ts";
import { useMachine as useReviews } from "../../../gen/browser__reviews.react.ts";
import { initial as noReviews } from "../../../gen/browser__reviews.ts";
import { useMachine as useSession } from "../../../gen/browser__session.react.ts";
import { covered, curTab, initial as noSession, isPrivateTab } from "../../../gen/browser__session.ts";
import { settledSecurely } from "../../../gen/browser__page.ts";
import { pageShareable } from "../../../gen/browser__pageContext.ts";
import { newTabId } from "../../browser/address.ts";
import { pageAddress } from "../../browser/page-context.ts";
import { Foreground, type ForegroundState } from "../../shell/foreground.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Button } from "../components/ui/index.ts";
import { AddressEditor } from "./AddressEditor.tsx";
import { BrowserMenu, type MenuAction } from "./BrowserMenu.tsx";
import { BrowserReview } from "./BrowserReview.tsx";
import { BrowserToolbar } from "./BrowserToolbar.tsx";
import { FindBar } from "./FindBar.tsx";
import { LibrarySheet } from "./LibrarySheet.tsx";
import { HOST_CHROME, hostModalOpen, laidOut, placementOf, watchViewport } from "./measure.ts";
import { PageViewport } from "./PageViewport.tsx";
import { ReadingReview } from "./ReadingReview.tsx";
import { runtime } from "./runtime.ts";
import { run } from "./services.ts";
import { useServiceStream } from "../shell/services.ts";
import { ShareSheet } from "./ShareSheet.tsx";
import { TabSwitcher } from "./TabSwitcher.tsx";

function menuAction(action: MenuAction) {
  switch (action) {
    case "newTab": return run(({ tabs }) => tabs.dispatch({ type: "openTab", id: newTabId(), profile: "Normal" }));
    case "newPrivateTab": return run(({ tabs }) => tabs.dispatch({ type: "openTab", id: newTabId(), profile: "Private" }));
    case "library": return run(({ tabs }) => tabs.dispatch({ type: "openLibrary" }));
    case "find": return run(({ tabs }) => tabs.dispatch({ type: "openFind" }));
    case "bookmark": return run(({ egress }) => egress.toggleBookmark());
    case "share": return run(({ tabs }) => tabs.dispatch({ type: "openShare" }));
    case "readAloud": return run(({ reading }) => reading.readAloud());
    case "askAboutPage": return run(({ reading }) => reading.askAboutPage());
    case "readLocally": return run(({ reading }) => reading.readLocally());
    case "external": return run(({ handoff }) => handoff.openExternal());
    case "downloads": return run(({ tabs }) => tabs.openDownloads());
    case "passwords": return run(({ autofill }) => autofill.openPasswords());
    case "clearSite": return run(({ tabs }) => tabs.clearSiteData());
    case "clearData": return run(({ tabs }) => tabs.clearBrowsingData());
  }
}

/** What the shell gives Browser's screen: its route and how to leave it. */
export type BrowserScreenProps = ScreenProps;

const hidden: ForegroundState = { visible: false, locked: false, screen: "off", view: "", shade: false, chat: "closed", modal: false };

/**
 * Alpha's Browser: the selected tab's page under the find bar and toolbar, with the switcher, menu, library and share sheet over it.
 * @model spec/browser/session.md
 */
export function BrowserScreen({ route, onClose }: BrowserScreenProps) {
  const { state: session = noSession } = useSession(runtime);
  const foreground = useServiceStream("browser/foreground", Effect.map(Effect.service(Foreground), (f) => f.changes), hidden);
  const [arrived] = useState(() => (node: HTMLElement | null) => {
    if (node !== null && route !== undefined && route !== "") run(({ tabs }) => tabs.openLink(route));
  });
  const { state: bookmarks = noBookmarks } = useBookmarks(runtime);
  const { state: reading = noReading } = useReading(runtime);
  const { state: reviews = noReviews } = useReviews(runtime);
  if (session.host === "UnknownHost") return null;
  const tab = curTab(session);
  const marked = bookmarks.marks.some((m) => m.url === tab.page.url);
  const finding = session.find.tab !== "" && session.find.tab === session.cur;
  const shareable = pageShareable(foreground.visible && !foreground.locked && foreground.view === "browser", isPrivateTab(session, session.cur), tab.stage === "Live" && settledSecurely(tab.page), pageAddress(tab.page.url) !== undefined);
  const measure = (viewport: HTMLElement) => watchViewport(viewport, () => {
    const facts = {
      inBrowser: foreground.visible && foreground.view === "browser", home: foreground.screen === "home" && !foreground.locked,
      layered: covered(session), reviewing: reviews.open.length > 0 || reading.phase === "Reviewing",
      modal: foreground.modal || hostModalOpen(), shade: foreground.shade, viewport: laidOut(viewport), tabLive: tab.stage === "Live",
      underlay: session.host === "NativeHost", underAssistant: foreground.chat !== "closed",
    };
    run(({ presenter, tabs }) => tab.restoreUrl !== "" && !covered(session) ? tabs.dispatch({ type: "showRestored" }) : presenter.offer(facts, placementOf(session.cur, viewport)));
  }, () => run(({ presenter }) => presenter.chromeChanged()));
  return (
    <section ref={arrived} aria-label="Browser" data-page-shareable={shareable ? "true" : "false"} className="relative flex h-full flex-col bg-transparent">
      <div {...{ [HOST_CHROME]: "" }} className="flex items-center bg-background">
        <Button variant="ghost" size="icon" aria-label="Home" onClick={onClose}><ChevronDown aria-hidden /></Button>
        {finding && <div className="flex-1"><FindBar session={session} onQuery={(q) => run(({ tabs }) => tabs.typeFind(q))} onMove={(forward) => run(({ tabs }) => tabs.dispatch({ type: "moveFind", forward }))} onClose={() => run(({ tabs }) => tabs.dispatch({ type: "closeFind" }))} /></div>}
      </div>
      <PageViewport key={session.cur} session={session} measure={measure} onOpenElsewhere={() => run(({ handoff }) => handoff.openFailed())} />
      <BrowserToolbar session={session}
        onCommand={(command) => run(({ tabs }) => tabs.dispatch({ type: "runCommand", command }))}
        onAddress={() => run(({ tabs }) => tabs.dispatch({ type: "startEditing" }))}
        onTabs={() => run(({ tabs }) => tabs.dispatch({ type: "showTabs" }))}
        onMenu={() => run(({ tabs }) => tabs.dispatch({ type: "toggleMenu" }))} />
      {session.layers.editing && <AddressEditor key={`${session.cur}-${tab.revision}`} session={session} marks={bookmarks.marks} onSubmit={(text) => run(({ tabs }) => tabs.enter(text))} onCancel={() => run(({ tabs }) => tabs.dispatch({ type: "stopEditing" }))} />}
      <TabSwitcher session={session}
        onPick={(id) => run(({ tabs }) => tabs.dispatch({ type: "pickTab", id }))}
        onCloseTab={(id) => run(({ tabs }) => tabs.dispatch({ type: "closeTab", id, fallback: newTabId() }))}
        onNewTab={(priv) => run(({ tabs }) => tabs.dispatch({ type: "openTab", id: newTabId(), profile: priv ? "Private" : "Normal" }))}
        onDismiss={() => run(({ tabs }) => tabs.dispatch({ type: "hideTabs" }))} />
      <BrowserMenu session={session} reading={reading} marked={marked} onAction={menuAction} onDismiss={() => run(({ tabs }) => tabs.dispatch({ type: "closeMenu" }))} />
      <LibrarySheet session={session} bookmarks={bookmarks}
        onShelf={(shelf) => run(({ tabs }) => tabs.dispatch({ type: "showLibrary", shelf }))}
        onOpen={(url) => run(({ tabs }) => Effect.andThen(tabs.dispatch({ type: "startEditing" }), tabs.enter(url)))}
        onRemoveMark={(url) => run(({ marks }) => marks.set(url, "", false))}
        onRemoveVisit={(url) => run(({ tabs }) => tabs.dispatch({ type: "removeVisit", url }))}
        onClearHistory={() => run(({ tabs }) => tabs.dispatch({ type: "clearHistory" }))}
        onRecover={() => run(({ marks, tabs }) => Effect.andThen(tabs.dispatch({ type: "closeLibrary" }), marks.recover()))}
        onDismiss={() => run(({ tabs }) => tabs.dispatch({ type: "closeLibrary" }))} />
      <ShareSheet session={session}
        onShare={() => run(({ egress }) => egress.share())}
        onEmail={() => run(({ egress }) => egress.shareByEmail())}
        onCopy={() => run(({ egress }) => egress.copyLink())}
        onDismiss={() => run(({ tabs }) => tabs.dispatch({ type: "closeShare" }))} />
      <BrowserReview reviews={reviews} onApprove={(id) => run(({ reviews: r }) => r.approve(id))} onDismiss={(id) => run(({ reviews: r }) => r.dismiss(id))} />
      <ReadingReview reading={reading}
        onEdit={(text) => run(({ reading: r }) => (reading.kind === "AskAboutPage" ? r.editQuestion(text) : r.editLocal(text)))}
        onApprove={() => run(({ reading: r }) => (reading.kind === "AskAboutPage" ? r.approveQuestion() : r.readLocal()))}
        onStop={() => run(({ reading: r }) => r.stopLocal())}
        onClose={() => run(({ reading: r }) => (reading.kind === "AskAboutPage" ? r.closeQuestion() : r.stop()))} />
    </section>
  );
}
