# Browser session

The renderer's Browser: its tabs and their native WebViews, the selected tab, the covering layers
(address editing, the tab switcher, the menu, the library and the share sheet), find in page, the
history, the cold-start restore, clearing browsing data, and the tabs the agent opens and drives.
Every native call is an effect the shell runs (`CreateNative`, `LoadNative`, `CloseNative`,
`CommandNative`, the find calls), and the shell sends back what the native host answered and
reported (`createSettled`, `loadSettled`, `nativeReport`, `nativeOpened`, `nativeClosed`,
`findResult`). The shell drops every native event of another host session before it gets here,
cleans each title, and computes each address with `page.md`'s facts. The saved session is written by
[the writer](./persistence.md) from `snapshotOf`; bookmarks are [their own machine](./bookmarks.md).

## Domain

### A Browser holds its tabs, the selected tab, its layers, its find bar and its history

A tab's native WebView is `Unborn` until the renderer asks for it, `Creating` while the host builds
it and `Live` once it exists. A restored tab keeps the address it was saved with (`restoreUrl`)
until it is first shown. `savedUrl` is the tab's last committed web address, kept while a later load
is pending or failed. `nav` is the navigation the tab is waiting on; `request` names the agent
request it serves, empty for the owner's own. A new tab the agent or a tapped link opens waits in
`openings` until its WebView exists. `revision` moves with every new document of a tab. `listings`
holds, per close-every-tab proposal, the tabs its review card listed.

```quint
import page.* from "./page"
type TabStage = Unborn | Creating | Live
type TabNav = { url: str, background: bool, selected: str, request: str, restore: bool }
pure val noNav: TabNav = { url: "", background: false, selected: "", request: "", restore: false }
type BrowserTab = {
  id: str, profile: Profile, opener: str, stage: TabStage, page: TabPage, revision: int,
  savedUrl: str, restoreUrl: str, restoreTitle: str, attempts: int, nav: TabNav,
}
type Opening = { id: str, profile: Profile, nav: TabNav, cancelled: bool }
type Visit = { url: str, title: str, at: int }
type Library = NoLibrary | BookmarksList | HistoryList
type Layers = { editing: bool, tabsOpen: bool, menu: bool, library: Library, share: bool }
type FindBar = { tab: str, query: str, count: int, index: int, done: bool }
type Hydration = Unread | Reading | Hydrated | ReadFailed
type HostKind = UnknownHost | NativeHost | WebHost
type ListedTab = { id: str, url: str, title: str, priv: bool }
type Listing = { proposal: str, tabs: List[ListedTab] }
type Session = {
  host: HostKind, tabs: List[BrowserTab], cur: str, openings: List[Opening], agentTab: str,
  visits: List[Visit], hydration: Hydration, clearing: bool, layers: Layers, find: FindBar,
  profileUnsupported: str, listings: List[Listing],
}
pure val noLayers: Layers = { editing: false, tabsOpen: false, menu: false, library: NoLibrary, share: false }
pure val noFind: FindBar = { tab: "", query: "", count: 0, index: 0, done: true }
pure val initial: Session = {
  host: UnknownHost, tabs: List(), cur: "", openings: List(), agentTab: "", visits: List(),
  hydration: Unread, clearing: false, layers: noLayers, find: noFind, profileUnsupported: "",
  listings: List(),
}
pure def freshTab(id: str, profile: Profile): BrowserTab = {
  id: id, profile: profile, opener: "", stage: Unborn, page: blankPage, revision: 0,
  savedUrl: "", restoreUrl: "", restoreTitle: "", attempts: 0, nav: noNav,
}
pure val noTab: BrowserTab = freshTab("", Normal)
pure def isTab(s: Session, id: str): bool = id != "" and s.tabs.some(t => t.id == id)
pure def isOpening(s: Session, id: str): bool = id != "" and s.openings.some(o => o.id == id)
pure def known(s: Session, id: str): bool = isTab(s, id) or isOpening(s, id)
pure def tabOf(s: Session, id: str): BrowserTab = s.tabs.foldl(noTab, (found, t) => if (t.id == id) t else found)
pure def openingOf(s: Session, id: str): Opening =
  s.openings.foldl({ id: "", profile: Normal, nav: noNav, cancelled: true }, (found, o) => if (o.id == id) o else found)
pure def curTab(s: Session): BrowserTab = tabOf(s, s.cur)
pure def firstId(tabs: List[BrowserTab]): str = tabs.foldl("", (first, t) => if (first == "") t.id else first)
pure def untouched(t: BrowserTab): bool = t.stage == Unborn and t.restoreUrl == "" and t.page == blankPage and t.nav == noNav
pure def occupied(s: Session): int = s.tabs.length() + s.openings.select(o => not(o.cancelled)).length()
pure def full(s: Session): bool = occupied(s) >= maxTabs
pure def withTab(t: BrowserTab, s: Session): Session = { ...s, tabs: s.tabs.listMap(x => if (x.id == t.id) t else x) }
pure def isPrivateTab(s: Session, id: str): bool = isTab(s, id) and tabOf(s, id).profile == Private
```

### A started Browser always has a tab, selects one of them, and never holds more than eight

```quint
pure def alwaysAStartedBrowserSelectsAnOpenTab(s: Session): bool =
  s.host != UnknownHost implies (s.tabs.length() >= 1 and isTab(s, s.cur))
pure def alwaysTabsStayWithinTheLimit(s: Session): bool = s.tabs.length() <= maxTabs
pure def alwaysTabIdentitiesAreDistinct(s: Session): bool =
  s.tabs.every(a => a.id != "" and s.tabs.select(b => b.id == a.id).length() == 1 and not(isOpening(s, a.id))) and
  s.openings.every(a => s.openings.select(b => b.id == a.id).length() == 1)
pure def alwaysTheAgentTabIsOpen(s: Session): bool = s.agentTab == "" or isTab(s, s.agentTab)
```

### What the simulator tries

```quint
pure val idValues = Set("t1", "t2", "t3")
pure val fallbackValues = Set("t4", "t5")
pure val openerValues = Set("", "t1")
pure val requestValues = Set("", "r1")
pure val urlValues = Set("https://example.test/", "https://other.test/")
pure val targetValues = Set("", "t1", "t2")
pure val tabValues = Set("t1", "t2")
pure val selectedValues = Set("t1", "t2")
pure val navigationValues = Set("1", "2")
pure val queryValues = Set("", "milk")
pure val observedTabValues = Set("", "t1")
pure val observedRevisionValues = Set(0, 1, 2)
pure val atValues = Set(1, 2)
pure val closedValues: Set[List[str]] = Set(List(), List("t1"))
pure val proposalValues = Set("p1", "p2")
```

## Story: Browse in tabs

> As the owner, I want to open tabs, switch between them, type an address or search words, and
> close tabs, with each tab's page loading in its own WebView.

### Starting the Browser opens one new tab on the host this build has

```quint
pure def canStartBrowser(s: Session, onDevice: bool, id: str): bool = s.host == UnknownHost and id != ""
pure def startBrowser(s: Session, onDevice: bool, id: str): Session =
  { ...s, host: if (onDevice) NativeHost else WebHost, tabs: List(freshTab(id, Normal)), cur: id }
```

### A new tab, normal or private, opens selected with its address field, unless eight are open

New tab and New private tab close the switcher and the menu. At the limit nothing opens and the
owner is told.

```quint
type TabRef = { id: str }
type NativeCreate = { id: str, profile: Profile }
type NativeLoad = { id: str, url: str }
type NativeCommand = { id: str, command: PageCommand, navigation: str }
type FindSearch = { id: str, query: str }
type FindMove = { id: str, forward: bool }
type AgentOutcome = Dispatched | Done | RefusedFull | RefusedChanged | RefusedPrivate | RefusedShowing
  | RefusedNoPage | RefusedUnloaded | RefusedNoHistory | RefusedNotLoading | RefusedNoFind | RefusedCovered
  | RefusedNotShowing | FailedOpen | RefusedListChanged
type AgentSettled = { request: str, tab: str, outcome: AgentOutcome }
type BrowserNotice = TabLimit | InvalidAddress | SavedTabsUnreadable | ClearedData | ClearFailed
  | NoSecureConnection | TabFailed | ProfileUnsupported
type Said = { notice: BrowserNotice }
type SessionEffect = CreateNative(NativeCreate) | LoadNative(NativeLoad) | CloseNative(TabRef)
  | CommandNative(NativeCommand) | SearchFind(FindSearch) | MoveFind(FindMove) | ClearFind(TabRef)
  | Settle(AgentSettled) | Say(Said) | ShowBrowser | BackUnhandled
type SessionChange = { state: Session, out: List[SessionEffect] }
pure def say(notice: BrowserNotice): SessionEffect = Say({ notice: notice })
pure def settleEffects(request: str, tab: str, result: AgentOutcome): List[SessionEffect] =
  if (request == "") List() else List(Settle({ request: request, tab: tab, outcome: result }))
pure def canOpenTab(s: Session, id: str, profile: Profile): bool = s.host != UnknownHost and id != "" and not(known(s, id))
pure def openTab(s: Session, id: str, profile: Profile): SessionChange =
  if (full(s)) { state: s, out: List(say(TabLimit)) }
  else { state: { ...s, tabs: s.tabs.append(freshTab(id, profile)), cur: id, layers: { ...noLayers, editing: true } }, out: List() }
pure def sometimesEightTabsOpen(s: Session): bool = s.tabs.length() == maxTabs
```

### A navigation loads the tab's WebView, creating it first when the tab has none

A WebView being created is reused, and its navigation is the latest one asked for. Every
navigation starts a new document revision.

```quint
pure def beginLoad(id: str, nav: TabNav, s: Session): SessionChange = {
  val t = tabOf(s, id)
  val restoring = t.restoreUrl != ""
  val base = { ...t, nav: nav, restoreUrl: "", restoreTitle: "",
    savedUrl: if (restoring) t.restoreUrl else t.savedUrl,
    page: if (restoring) { ...t.page, title: t.restoreTitle } else t.page }
  if (t.stage == Live)
    { state: withTab({ ...base, revision: t.revision + 1, page: { ...base.page, url: nav.url, loading: true, committed: false, failed: false } }, s),
      out: List(LoadNative({ id: id, url: nav.url })) }
  else if (t.stage == Creating) { state: withTab(base, s), out: List() }
  else { state: withTab({ ...base, stage: Creating }, s), out: List(CreateNative({ id: id, profile: t.profile })) }
}
pure def alwaysAWebViewIsCreatedOnlyForANavigation(s: Session): bool = s.tabs.every(t => t.stage != Creating or t.nav.url != "")
```

### Enter loads what the owner typed in the selected tab, and closes every layer but the find bar

An address the owner typed is no longer the agent's tab. Text `classifyAddress` refuses opens
nothing and says why.

```quint
pure def canSubmitAddress(s: Session, facts: AddressFacts, url: str): bool = s.layers.editing and isTab(s, s.cur)
pure def submitAddress(s: Session, facts: AddressFacts, url: str): SessionChange =
  if (classifyAddress(facts, false) == RefusedAddress or url == "") { state: s, out: List(say(InvalidAddress)) }
  else beginLoad(s.cur, { url: url, background: false, selected: s.cur, request: "", restore: false },
    { ...s, layers: noLayers, profileUnsupported: "", agentTab: if (s.agentTab == s.cur) "" else s.agentTab })
```

### A link the owner taps outside Browser opens in a new tab and is never searched

```quint
pure def canOpenLink(s: Session, id: str, url: str): bool = s.host != UnknownHost and id != "" and url != "" and not(known(s, id))
pure def openLink(s: Session, id: str, url: str): SessionChange =
  if (full(s)) { state: s, out: List(say(TabLimit)) }
  else { state: { ...s, openings: s.openings.append({ id: id, profile: Normal,
      nav: { url: url, background: false, selected: s.cur, request: "", restore: false }, cancelled: false }) },
    out: List(CreateNative({ id: id, profile: Normal })) }
```

### A WebView that was created loads its navigation only if its tab is still there, still selected and still within the limit

A new tab's WebView created after the owner moved to another tab, after its request was cancelled,
or when eight tabs are already open is closed again. An existing tab keeps its WebView but drops
the navigation. A failed creation is reported; a restored tab's background load is instead put back
to wait for the next time it is shown, at most twice, and on a WebView without isolated profiles
the selected tab says so.

```quint
pure def failedLoad(id: str, created: bool, unsupported: bool, s: Session): SessionChange = {
  val t = tabOf(s, id)
  val attempts = t.attempts + 1
  if (t.nav.restore and attempts < maxRestoreAttempts)
    { state: withTab({ ...t, stage: Unborn, nav: noNav, attempts: attempts, restoreUrl: t.nav.url, restoreTitle: t.page.title, page: blankPage }, s),
      out: if (created) List(CloseNative({ id: id })) else List() }
  else
    { state: { ...withTab({ ...t, stage: if (created) t.stage else Unborn, nav: noNav, attempts: 0 }, s),
        profileUnsupported: if (unsupported and id == s.cur) id else s.profileUnsupported },
      out: if (t.nav.request != "") settleEffects(t.nav.request, id, FailedOpen) else List(say(if (unsupported) ProfileUnsupported else TabFailed)) }
}
pure def canCreateSettled(s: Session, id: str, ok: bool, unsupported: bool): bool =
  isOpening(s, id) or (isTab(s, id) and tabOf(s, id).stage == Creating)
pure def createdOpening(id: str, s: Session, ok: bool): SessionChange = {
  val o = openingOf(s, id)
  val rest = { ...s, openings: s.openings.select(x => x.id != id) }
  val withdrawn = o.cancelled or ((not(o.nav.background) or o.nav.request != "") and s.cur != o.nav.selected)
  val tab = { ...freshTab(id, o.profile), stage: Live, nav: o.nav, revision: 1,
    page: { ...blankPage, url: o.nav.url, loading: true } }
  if (not(ok)) { state: rest, out: if (o.nav.request != "") settleEffects(o.nav.request, id, FailedOpen) else List(say(TabFailed)) }
  else if (withdrawn) { state: rest, out: List(CloseNative({ id: id })).concat(settleEffects(o.nav.request, id, RefusedChanged)) }
  else if (rest.tabs.length() >= maxTabs)
    { state: rest, out: List(CloseNative({ id: id })).concat(if (o.nav.request != "") settleEffects(o.nav.request, id, RefusedFull) else List(say(TabLimit))) }
  else
    { state: { ...rest, tabs: rest.tabs.append(tab), cur: if (o.nav.background) s.cur else id,
        layers: if (o.nav.background) s.layers else noLayers },
      out: List(LoadNative({ id: id, url: o.nav.url })) }
}
pure def createdTab(id: str, s: Session, ok: bool, unsupported: bool): SessionChange = {
  val t = tabOf(s, id)
  val live = { ...t, stage: Live }
  if (not(ok)) failedLoad(id, false, unsupported, s)
  else if ((not(t.nav.background) or t.nav.request != "") and s.cur != t.nav.selected)
    { state: withTab({ ...live, nav: noNav }, s), out: settleEffects(t.nav.request, id, RefusedChanged) }
  else
    { state: { ...withTab({ ...live, revision: t.revision + 1, page: { ...t.page, url: t.nav.url, loading: true, committed: false, failed: false } }, s),
        cur: if (t.nav.background) s.cur else id, layers: if (t.nav.background) s.layers else noLayers },
      out: List(LoadNative({ id: id, url: t.nav.url })) }
}
pure def createSettled(s: Session, id: str, ok: bool, unsupported: bool): SessionChange =
  if (isOpening(s, id)) createdOpening(id, s, ok) else createdTab(id, s, ok, unsupported)
pure def alwaysRestoreAttemptsAreBounded(s: Session): bool = s.tabs.every(t => t.attempts >= 0 and t.attempts < maxRestoreAttempts)
```

### A load the native host accepted settles its navigation, and a refused one is reported or retried

```quint
pure def canLoadSettled(s: Session, id: str, ok: bool): bool = isTab(s, id) and tabOf(s, id).stage == Live and tabOf(s, id).nav.url != ""
pure def loadSettled(s: Session, id: str, ok: bool): SessionChange = {
  val t = tabOf(s, id)
  if (ok)
    { state: { ...withTab({ ...t, nav: noNav, attempts: 0 }, s), agentTab: if (t.nav.request != "") id else s.agentTab },
      out: settleEffects(t.nav.request, id, Dispatched) }
  else failedLoad(id, true, false, s)
}
```

### Selecting a tab from the switcher closes it, and closing the selected tab selects the first one left

Closing the last tab leaves one new tab. The switcher stays open while cards close.

```quint
pure def forgetTab(id: str, fallback: str, toOpener: bool, s: Session): Session = {
  val rest = s.tabs.select(t => t.id != id)
  val tabs = if (rest.length() == 0) List(freshTab(fallback, Normal)) else rest
  val opener = curTab(s).opener
  val cur = if (s.cur != id) s.cur else if (toOpener and tabs.some(t => t.id == opener)) opener else firstId(tabs)
  { ...s, tabs: tabs, cur: cur, find: if (s.find.tab == id) noFind else s.find,
    agentTab: if (s.agentTab == id) "" else s.agentTab,
    profileUnsupported: if (s.profileUnsupported == id) "" else s.profileUnsupported }
}
pure def canPickTab(s: Session, id: str): bool = s.layers.tabsOpen and isTab(s, id)
pure def pickTab(s: Session, id: str): Session = { ...s, cur: id, layers: { ...s.layers, tabsOpen: false } }
pure def canCloseTab(s: Session, id: str, fallback: str): bool = isTab(s, id) and fallback != "" and not(known(s, fallback))
pure def closeTab(s: Session, id: str, fallback: str): SessionChange =
  { state: forgetTab(id, fallback, false, s),
    out: if (tabOf(s, id).stage != Unborn) List(CloseNative({ id: id })) else List() }
pure def alwaysTheFindBarBelongsToAnOpenTab(s: Session): bool =
  (s.find.tab == "" or isTab(s, s.find.tab)) and (s.find.tab == "" implies (s.find.count == 0 and s.find.query == ""))
```

### A tab's page is the native host's latest report for it, and a private tab stays private

A report older than the last one accepted changes nothing. A page that failed without HTTPS on the
selected tab says that the site has no secure connection.

```quint
type NativeReport = { id: str, page: TabPage, insecureHttp: bool, at: int }
pure def addVisit(url: str, title: str, at: int, visits: List[Visit]): List[Visit] =
  List({ url: url, title: title, at: at }).concat(visits.select(v => v.url != url))
    .foldl(List(), (kept, v) => if (kept.length() >= maxHistory) kept else kept.append(v))
pure def canNativeReport(s: Session, report: NativeReport): bool =
  isTab(s, report.id) and tabOf(s, report.id).stage == Live and report.page.sequence > tabOf(s, report.id).page.sequence
pure def nativeReport(s: Session, report: NativeReport): SessionChange = {
  val t = tabOf(s, report.id)
  val p = report.page
  val shifted = (p.url != "" and p.url != t.page.url) or (p.loading and not(t.page.loading))
  val visit = isSettled(p) and p.web
  val tab = { ...t, page: if (p.externalOnly) { ...p, committed: false } else p,
    revision: if (shifted) t.revision + 1 else t.revision, savedUrl: if (visit) p.url else t.savedUrl }
  val warn = p.failed and not(t.page.failed) and report.insecureHttp and report.id == s.cur
  { state: { ...withTab(tab, s), visits: if (visit and t.profile == Normal) addVisit(p.url, p.title, report.at, s.visits) else s.visits },
    out: if (warn) List(say(NoSecureConnection)) else List() }
}
pure def stepAProfileNeverChanges(before: Session, after: Session): bool =
  before.tabs.every(a => after.tabs.every(b => a.id != b.id or a.profile == b.profile))
pure def stepReportsOnlyMoveForward(before: Session, after: Session): bool =
  before.tabs.every(a => after.tabs.every(b => a.id != b.id or b.page.sequence >= a.page.sequence or b.stage == Unborn))
pure val reportValues: Set[NativeReport] = List(
  { id: "t1", page: loadedPage, insecureHttp: false, at: 1 },
  { id: "t1", page: { ...loadedPage, sequence: 3, loading: true, committed: false }, insecureHttp: false, at: 1 },
  { id: "t1", page: { ...loadedPage, sequence: 4, failed: true, committed: false, secure: false }, insecureHttp: true, at: 2 },
  { id: "t2", page: { ...loadedPage, url: "https://other.test/", sequence: 2 }, insecureHttp: false, at: 2 },
  { id: "t3", page: { ...loadedPage, url: "https://other.test/", sequence: 2 }, insecureHttp: false, at: 2 },
).foldl(Set(), (acc, r) => acc.union(Set(r)))
pure def sometimesAPrivatePageLoaded(s: Session): bool = s.tabs.some(t => t.profile == Private and isSettled(t.page))
```

### A pop-up the native host opened becomes the selected tab in its opener's profile, unless eight are open

It closes every layer but the find bar. At the limit its WebView is closed again and the owner is
told; a pop-up of a private tab is private.

```quint
pure def canNativeOpened(s: Session, id: str, opener: str, priv: bool): bool = s.host != UnknownHost and id != "" and not(known(s, id))
pure def nativeOpened(s: Session, id: str, opener: str, priv: bool): SessionChange = {
  val profile = if (priv or isPrivateTab(s, opener)) Private else Normal
  val tab = { ...freshTab(id, profile), stage: Live, opener: if (isTab(s, opener)) opener else "" }
  if (s.tabs.length() >= maxTabs) { state: s, out: List(CloseNative({ id: id }), say(TabLimit)) }
  else { state: { ...s, tabs: s.tabs.append(tab), cur: id, layers: noLayers }, out: List() }
}
pure def stepAPopUpOfAPrivateTabIsPrivate(before: Session, via: str, after: Session): bool =
  via == "nativeOpened" implies after.tabs.every(t => before.tabs.some(b => b.id == t.id) or not(isPrivateTab(before, t.opener)) or t.profile == Private)
```

### A WebView the native host closed leaves its tab list, and a closed pop-up returns to its opener

```quint
pure def canNativeClosed(s: Session, id: str, fallback: str): bool =
  isTab(s, id) and tabOf(s, id).stage != Unborn and fallback != "" and not(known(s, fallback))
pure def nativeClosed(s: Session, id: str, fallback: str): Session = forgetTab(id, fallback, true, s)
```

## Story: Keep my place with the Browser's layers and Back

> As the owner, I want the menu, the tab switcher, the library, the share sheet and the find bar to
> open over the page, and Back to close them one at a time before it goes back in the page.

### Opening the menu, the switcher or the library ends address editing, and the menu never covers editing

```quint
pure def startEditing(s: Session): Session = { ...s, layers: { ...s.layers, editing: true, menu: false } }
pure def canStopEditing(s: Session): bool = s.layers.editing
pure def stopEditing(s: Session): Session = { ...s, layers: { ...s.layers, editing: false } }
pure def toggleMenu(s: Session): Session = { ...s, layers: { ...s.layers, menu: not(s.layers.menu), editing: false } }
pure def showTabs(s: Session): Session = { ...s, layers: { ...s.layers, tabsOpen: true, menu: false, editing: false } }
pure def canHideTabs(s: Session): bool = s.layers.tabsOpen
pure def hideTabs(s: Session): Session = { ...s, layers: { ...s.layers, tabsOpen: false } }
pure def openLibrary(s: Session): Session = { ...s, layers: { ...s.layers, library: BookmarksList, menu: false, editing: false } }
pure def canShowLibrary(s: Session, shelf: Library): bool = s.layers.library != NoLibrary and shelf != NoLibrary
pure def showLibrary(s: Session, shelf: Library): Session = { ...s, layers: { ...s.layers, library: shelf } }
pure def canCloseLibrary(s: Session): bool = s.layers.library != NoLibrary
pure def closeLibrary(s: Session): Session = { ...s, layers: { ...s.layers, library: NoLibrary } }
pure def openShare(s: Session): Session = { ...s, layers: { ...s.layers, share: true, menu: false, editing: false } }
pure def canCloseShare(s: Session): bool = s.layers.share
pure def closeShare(s: Session): Session = { ...s, layers: { ...s.layers, share: false } }
pure def canCloseMenu(s: Session): bool = s.layers.menu
pure def closeMenu(s: Session): Session = { ...s, layers: { ...s.layers, menu: false } }
pure def fullscreenChanged(s: Session, active: bool): Session =
  if (active) { ...s, layers: { ...s.layers, menu: false, tabsOpen: false, share: false } } else s
pure def alwaysTheMenuNeverCoversEditing(s: Session): bool = not(s.layers.menu and s.layers.editing)
pure def covered(s: Session): bool =
  s.layers.editing or s.layers.tabsOpen or s.layers.menu or s.layers.library != NoLibrary or s.layers.share
```

### Back closes the find bar, then editing, the switcher, the menu, the library and the share sheet, then goes back in the page, and otherwise is the shell's

```quint
pure def back(s: Session): SessionChange = {
  val t = curTab(s)
  if (s.find.tab != "")
    { state: { ...s, find: noFind }, out: if (tabOf(s, s.find.tab).stage == Live) List(ClearFind({ id: s.find.tab })) else List() }
  else if (s.layers.editing) { state: { ...s, layers: { ...s.layers, editing: false } }, out: List() }
  else if (s.layers.tabsOpen) { state: { ...s, layers: { ...s.layers, tabsOpen: false } }, out: List() }
  else if (s.layers.menu) { state: { ...s, layers: { ...s.layers, menu: false } }, out: List() }
  else if (s.layers.library != NoLibrary) { state: { ...s, layers: { ...s.layers, library: NoLibrary } }, out: List() }
  else if (s.layers.share) { state: { ...s, layers: { ...s.layers, share: false } }, out: List() }
  else if (t.stage == Live and t.page.canBack)
    { state: s, out: List(CommandNative({ id: s.cur, command: GoBack, navigation: t.page.navigation })) }
  else { state: s, out: List(BackUnhandled) }
}
pure def stepBackLeavesThePageOnlyWithNoLayer(before: Session, via: str, after: Session, out: List[SessionEffect]): bool =
  (via == "back" and out.some(e => match e { | CommandNative(c) => true | BackUnhandled => true | _ => false }))
    implies (not(covered(before)) and before.find.tab == "")
pure def sometimesBackIsTheShells(s: Session): bool = isTab(s, s.cur) and not(covered(s)) and not(curTab(s).page.canBack) and s.tabs.length() > 1
```

### The toolbar's back, forward, reload and stop act on the selected tab's page only when it can

```quint
pure def canRunCommand(s: Session, command: PageCommand): bool = curTab(s).stage == Live and commandAllowedOn(curTab(s).page, command)
pure def runCommand(s: Session, command: PageCommand): SessionChange =
  { state: { ...s, layers: { ...s.layers, menu: false } },
    out: List(CommandNative({ id: s.cur, command: command, navigation: curTab(s).page.navigation })) }
```

## Story: Find text in a page

> As the owner, I want to find words in the page I am looking at, step through the matches, and
> have the search end when I close the bar, leave the page or switch tabs.

### Find opens on a committed page of the native host's selected tab and closes the menu

The browser build's page is a sandboxed frame the app cannot search, so it offers no Find.

```quint
pure def findable(s: Session): bool = s.host == NativeHost and curTab(s).stage == Live and curTab(s).page.committed and not(curTab(s).page.failed)
pure def canOpenFind(s: Session): bool = findable(s)
pure def openFind(s: Session): Session = { ...s, find: { ...noFind, tab: s.cur }, layers: { ...s.layers, menu: false } }
```

### Typing changes the query, and a debounced search reaches only the tab that still shows the bar, with the query it still holds

```quint
pure def canTypeFind(s: Session, query: str): bool = s.find.tab != "" and s.find.tab == s.cur
pure def typeFind(s: Session, query: str): Session =
  { ...s, find: { ...s.find, query: query, done: query == "", count: if (query == "") 0 else s.find.count, index: if (query == "") 0 else s.find.index } }
pure def canSearchFind(s: Session, id: str, query: str): bool = s.find.tab != ""
pure def searchFind(s: Session, id: str, query: str): SessionChange =
  if (id == s.cur and id == s.find.tab and query == s.find.query and tabOf(s, id).stage == Live)
    { state: { ...s, find: { ...s.find, done: query == "" } }, out: List(SearchFind({ id: id, query: query })) }
  else { state: s, out: List() }
pure def stepASearchGoesOnlyToTheShownBar(before: Session, via: str, after: Session, out: List[SessionEffect]): bool =
  out.every(e => match e { | SearchFind(f) => f.id == before.cur and f.id == before.find.tab and f.query == before.find.query | _ => true })
```

### Next and previous step through matches only when there are matches, and closing clears the native search

```quint
pure def canMoveFind(s: Session, forward: bool): bool = s.find.tab != "" and s.find.tab == s.cur and s.find.query != "" and s.find.count > 0
pure def moveFind(s: Session, forward: bool): SessionChange = { state: s, out: List(MoveFind({ id: s.cur, forward: forward })) }
pure def canCloseFind(s: Session): bool = s.find.tab != ""
pure def closeFind(s: Session): SessionChange =
  { state: { ...s, find: noFind }, out: if (tabOf(s, s.find.tab).stage == Live) List(ClearFind({ id: s.find.tab })) else List() }
```

### A find result counts only for the bar's tab, and a cleared search closes the bar

The native host clears a tab's search when it navigates or stops being shown.

```quint
pure def canFindResult(s: Session, id: str, cleared: bool, count: int, index: int, done: bool): bool = s.find.tab != "" and s.find.tab == id
pure def findResult(s: Session, id: str, cleared: bool, count: int, index: int, done: bool): Session = {
  val total = if (count < 0) 0 else count
  if (cleared) { ...s, find: noFind }
  else { ...s, find: { ...s.find, count: total, index: if (index < 0) 0 else if (index > total) total else index, done: done } }
}
pure def alwaysAMatchIndexIsWithinTheCount(s: Session): bool = s.find.count >= 0 and s.find.index >= 0 and s.find.index <= s.find.count
pure def sometimesMatchesFound(s: Session): bool = s.find.count > 0 and s.find.tab == s.cur
```

## Story: Keep my normal tabs and history across restarts

> As the owner, I want my normal tabs and history back after a restart, without losing a tab I
> opened before they came back, and without private tabs ever being saved.

### Only a normal tab's committed web page enters history, newest first, at most one hundred

```quint
pure def headUrl(visits: List[Visit]): str = visits.foldl("", (first, v) => if (first == "") v.url else first)
pure def stepANewVisitIsANormalTabsCommittedPage(before: Session, via: str, after: Session): bool =
  (via == "nativeReport" and after.visits != before.visits) implies
    after.tabs.some(t => t.profile == Normal and t.savedUrl == headUrl(after.visits) and isSettled(t.page))
pure def alwaysHistoryStaysWithinItsLimit(s: Session): bool = s.visits.length() <= maxHistory
pure def canRemoveVisit(s: Session, url: str): bool = s.visits.some(v => v.url == url)
pure def removeVisit(s: Session, url: str): Session = { ...s, visits: s.visits.select(v => v.url != url) }
pure def canClearHistory(s: Session): bool = s.visits.length() > 0
pure def clearHistory(s: Session): Session = { ...s, visits: List() }
```

### The saved snapshot holds at most eight normal tabs whose address is known, the history and the selected normal tab

A tab's known address is its last committed web page, or the address it was restored with.

```quint
pure def knownUrl(t: BrowserTab): str = if (t.restoreUrl != "") t.restoreUrl else t.savedUrl
pure def knownTitle(t: BrowserTab): str = if (t.restoreUrl != "") t.restoreTitle else t.page.title
pure def snapshotOf(s: Session): SavedSession = {
  val tabs = s.tabs.select(t => t.profile == Normal and knownUrl(t) != "")
    .foldl(List(), (kept, t) => if (kept.length() >= maxTabs) kept else kept.append({ id: t.id, url: knownUrl(t), title: knownTitle(t) }))
  { history: s.visits.listMap(v => v.url), tabs: tabs, cur: if (tabs.some(t => t.id == s.cur)) s.cur else "" }
}
pure def mayPersist(s: Session): bool = s.hydration == Hydrated and not(s.clearing)
pure def alwaysTheSnapshotHoldsNoPrivateTab(s: Session): bool = snapshotOf(s).tabs.every(x => not(isPrivateTab(s, x.id)))
```

### The saved session is read once, and replaces only an untouched single new tab; otherwise its tabs follow the open ones while they fit

Saved tabs load (an ordinary request for their address) only when shown. Saved history is merged
after the open history. A failed read is reported and saving stays off, so the saved record is
never overwritten; a host without the Browser plugin has nothing to report.

```quint
pure def restoredTab(x: SavedTab): BrowserTab = { ...freshTab(x.id, Normal), restoreUrl: x.url, restoreTitle: x.title }
pure def mergeHistory(visits: List[Visit], saved: List[str]): List[Visit] =
  visits.concat(saved.foldl(List(), (fresh, url) => if (visits.some(v => v.url == url) or fresh.some(v => v.url == url)) fresh else fresh.append({ url: url, title: "", at: 0 })))
    .foldl(List(), (kept, v) => if (kept.length() >= maxHistory) kept else kept.append(v))
pure def pristine(s: Session): bool =
  s.tabs.length() == 1 and s.openings.length() == 0 and untouched(curTab(s)) and not(s.layers.editing) and not(s.layers.tabsOpen)
pure def canRestoreStarted(s: Session): bool = s.hydration == Unread and s.host != UnknownHost and not(s.clearing)
pure def restoreStarted(s: Session): Session = { ...s, hydration: Reading }
pure def canRestoreRead(s: Session, saved: SavedSession): bool = s.hydration == Reading and not(s.clearing)
pure def restoreRead(s: Session, saved: SavedSession): Session = {
  val whole = pristine(s)
  val room = if (whole) maxTabs else maxTabs - s.tabs.length()
  val rows = saved.tabs.foldl(List(), (kept, x) =>
    if (kept.length() >= room or x.id == "" or kept.some(y => y.id == x.id) or (not(whole) and known(s, x.id))) kept
    else kept.append(restoredTab(x)))
  val visits = mergeHistory(s.visits, saved.history)
  if (whole and rows.length() > 0)
    { ...s, tabs: rows, cur: if (rows.some(r => r.id == saved.cur)) saved.cur else firstId(rows), visits: visits, hydration: Hydrated, find: noFind }
  else { ...s, tabs: s.tabs.concat(rows), visits: visits, hydration: Hydrated }
}
pure def canRestoreFailed(s: Session, silent: bool): bool = s.hydration == Reading
pure def restoreFailed(s: Session, silent: bool): SessionChange =
  { state: { ...s, hydration: ReadFailed }, out: if (silent) List() else List(say(SavedTabsUnreadable)) }
pure def alwaysARestoredTabWaitsWithoutAWebView(s: Session): bool = s.tabs.every(t => t.restoreUrl == "" or t.stage == Unborn)
pure def stepTheOpenTabsSurviveARestore(before: Session, via: str, after: Session): bool =
  (via == "restoreRead" and not(pristine(before))) implies before.tabs.every(a => after.tabs.some(b => b.id == a.id))
pure def sometimesRestoredTabsWait(s: Session): bool = s.hydration == Hydrated and s.tabs.some(t => t.restoreUrl != "")
```

### A restored tab loads its saved address in the background the first time it is shown

```quint
pure def canShowRestored(s: Session): bool = curTab(s).restoreUrl != "" and curTab(s).stage == Unborn and not(s.clearing)
pure def showRestored(s: Session): SessionChange =
  beginLoad(s.cur, { url: curTab(s).restoreUrl, background: true, selected: s.cur, request: "", restore: true }, s)
```

## Story: Clear my browsing data

> As the owner, I want Clear browsing data to close my normal tabs and empty my history and saved
> session for good, while my private tabs stay open.

### Clearing closes every normal tab, empties history and the saved session, and keeps private tabs

The confirmation is [a review](./reviews.md). Saving pauses while clearing; a restore read that
arrives during or after it is dropped. A failed clear is reported and changes nothing.

```quint
pure def canClearStarted(s: Session): bool = not(s.clearing) and s.host != UnknownHost
pure def clearStarted(s: Session): Session = { ...s, clearing: true }
pure def canClearFinished(s: Session, closed: List[str], fallback: str): bool = s.clearing and fallback != "" and not(known(s, fallback))
pure def clearFinished(s: Session, closed: List[str], fallback: str): SessionChange = {
  val rest = s.tabs.select(t => t.profile == Private and not(closed.includes(t.id)))
  val tabs = if (rest.length() == 0) List(freshTab(fallback, Normal)) else rest
  { state: { ...s, tabs: tabs, cur: if (tabs.some(t => t.id == s.cur)) s.cur else firstId(tabs), visits: List(),
      hydration: Hydrated, clearing: false,
      openings: s.openings.listMap(o => if (o.profile == Normal) { ...o, cancelled: true } else o),
      find: if (tabs.some(t => t.id == s.find.tab)) s.find else noFind,
      agentTab: if (tabs.some(t => t.id == s.agentTab)) s.agentTab else "",
      profileUnsupported: "" },
    out: List(say(ClearedData)) }
}
pure def canClearFailed(s: Session): bool = s.clearing
pure def clearFailed(s: Session): SessionChange = { state: { ...s, clearing: false }, out: List(say(ClearFailed)) }
pure def stepClearingKeepsPrivateTabs(before: Session, via: str, after: Session): bool =
  via == "clearFinished" implies (after.visits.length() == 0 and after.tabs.every(t => t.profile == Private or untouched(t)))
pure def sometimesClearedWithAPrivateTabKept(s: Session): bool =
  s.hydration == Hydrated and s.visits.length() == 0 and s.tabs.some(t => t.profile == Private and t.stage != Unborn)
```

## Story: Let the agent open and drive my tabs

> As the owner, I want an approved open to reuse an untouched tab or the agent's own earlier tab,
> stay in the profile I asked from, and never fill the tab limit, and I want the agent's tab
> controls to act only on the tabs and page I could see.

### An approved open reuses the selected untouched tab, else the agent's earlier tab unless a new tab was asked for, else any untouched tab of the same profile

An open asked from a private tab shown in Browser stays private; one asked elsewhere never lands in
a private tab. A page the owner opened is never replaced. Past the limit the open is refused before
anything is created. The open is shown only when the agent later presents it.

```quint
pure def fits(s: Session, id: str, priv: bool): bool = isTab(s, id) and (tabOf(s, id).profile == Private) == priv
pure def reuseTab(s: Session, priv: bool, newTab: bool): str =
  if (fits(s, s.cur, priv) and untouched(curTab(s))) s.cur
  else if (not(newTab) and fits(s, s.agentTab, priv)) s.agentTab
  else s.tabs.foldl("", (found, t) => if (found == "" and fits(s, t.id, priv) and untouched(t)) t.id else found)
pure def fromPrivate(s: Session, inBrowser: bool): bool = inBrowser and isPrivateTab(s, s.cur)
pure def canAgentOpen(s: Session, request: str, id: str, url: str, newTab: bool, inBrowser: bool): bool =
  request != "" and url != "" and id != "" and s.host != UnknownHost and not(known(s, id))
pure def agentOpen(s: Session, request: str, id: str, url: str, newTab: bool, inBrowser: bool): SessionChange = {
  val priv = fromPrivate(s, inBrowser)
  val reuse = reuseTab(s, priv, newTab)
  val nav = { url: url, background: true, selected: s.cur, request: request, restore: false }
  if (reuse != "") beginLoad(reuse, nav, s)
  else if (full(s)) { state: s, out: settleEffects(request, "", RefusedFull) }
  else { state: { ...s, openings: s.openings.append({ id: id, profile: if (priv) Private else Normal, nav: nav, cancelled: false }) },
    out: List(CreateNative({ id: id, profile: if (priv) Private else Normal })) }
}
pure def stepAnAgentOpenStaysInItsProfile(before: Session, via: str, after: Session): bool =
  via == "agentOpen" implies (
    after.openings.every(o => before.openings.some(b => b.id == o.id) or o.profile == Normal or isPrivateTab(before, before.cur))
    and after.tabs.every(t => before.tabs.some(b => b.id == t.id and b.profile == t.profile)))
pure def canAgentCancel(s: Session, request: str): bool = request != ""
pure def agentCancel(s: Session, request: str): Session =
  { ...s, openings: s.openings.listMap(o => if (o.nav.request == request) { ...o, cancelled: true } else o),
    tabs: s.tabs.listMap(t => if (t.nav.request == request and t.stage == Creating) { ...t, nav: { ...t.nav, request: "", selected: "", background: false } } else t) }
pure def sometimesTheAgentHasATab(s: Session): bool = s.agentTab != "" and s.agentTab != s.cur
```

### An agent's tab is shown only after its action settled, and only while the tab the request came from is still selected

```quint
pure def canAgentPresent(s: Session, tab: str, selected: str, edit: bool): bool = isTab(s, tab) and s.cur == selected
pure def agentPresent(s: Session, tab: str, selected: str, edit: bool): SessionChange =
  { state: { ...s, cur: tab, layers: { ...noLayers, editing: edit } }, out: List(ShowBrowser) }
```

### The agent opens a new tab, private only when asked, and is refused at the limit

```quint
pure def canAgentTabNew(s: Session, request: str, id: str, priv: bool): bool = request != "" and id != "" and s.host != UnknownHost and not(known(s, id))
pure def agentTabNew(s: Session, request: str, id: str, priv: bool): SessionChange =
  if (full(s)) { state: s, out: settleEffects(request, "", RefusedFull) }
  else { state: { ...s, tabs: s.tabs.append(freshTab(id, if (priv) Private else Normal)) }, out: settleEffects(request, id, Done) }
```

### The agent switches to or closes a private tab only for a request made from a private tab, never switches to the tab already showing, and closes the showing tab only when it is shown

```quint
pure def canAgentSwitch(s: Session, request: str, target: str, inBrowser: bool): bool = request != ""
pure def agentSwitch(s: Session, request: str, target: str, inBrowser: bool): SessionChange =
  if (not(isTab(s, target))) { state: s, out: settleEffects(request, "", RefusedChanged) }
  else if (isPrivateTab(s, target) and not(fromPrivate(s, inBrowser))) { state: s, out: settleEffects(request, "", RefusedPrivate) }
  else if (inBrowser and target == s.cur) { state: s, out: settleEffects(request, target, RefusedShowing) }
  else { state: s, out: settleEffects(request, target, Done) }
pure def canAgentClose(s: Session, request: str, target: str, inBrowser: bool, fallback: str): bool =
  request != "" and fallback != "" and not(known(s, fallback))
pure def agentClose(s: Session, request: str, target: str, inBrowser: bool, fallback: str): SessionChange = {
  val id = if (target == "") s.cur else target
  if (not(isTab(s, id))) { state: s, out: settleEffects(request, "", RefusedChanged) }
  else if (isPrivateTab(s, id) and not(fromPrivate(s, inBrowser))) { state: s, out: settleEffects(request, "", RefusedPrivate) }
  else if (id != s.cur)
    { state: forgetTab(id, fallback, false, s),
      out: (if (tabOf(s, id).stage != Unborn) List(CloseNative({ id: id })) else List()).concat(settleEffects(request, id, Done)) }
  else { state: s, out: settleEffects(request, id, Done) }
}
pure def canAgentCloseShown(s: Session, tab: str, selected: str, fallback: str): bool =
  isTab(s, tab) and s.cur == selected and selected == tab and fallback != "" and not(known(s, fallback))
pure def agentCloseShown(s: Session, tab: str, selected: str, fallback: str): SessionChange =
  { state: { ...forgetTab(tab, fallback, false, s), layers: noLayers },
    out: (if (tabOf(s, tab).stage != Unborn) List(CloseNative({ id: tab })) else List()).concat(List(ShowBrowser)) }
pure def stepAPrivateTabLeavesOnlyForAPrivateRequest(before: Session, via: str, after: Session): bool =
  (via == "agentClose" or via == "agentSwitch") implies before.tabs.every(t =>
    t.profile == Normal or after.tabs.some(a => a.id == t.id) or isPrivateTab(before, before.cur))
```

### The agent's find, back, forward, reload and stop need the page they name, still the one the turn observed

A restored tab that has not loaded since the restart can only be reloaded, which shows it. Find
needs the native host. The command itself runs when the agent presents it, on the same document.

```quint
pure def observedCurrent(s: Session, observedTab: str, observedRevision: int): bool =
  observedTab == "" or (observedTab == s.cur and observedRevision == curTab(s).revision)
pure def canAgentFind(s: Session, request: str, query: str): bool = request != "" and isTab(s, s.cur)
pure def agentFind(s: Session, request: str, query: str): SessionChange = {
  val t = curTab(s)
  if (s.host != NativeHost) { state: s, out: settleEffects(request, "", RefusedNoFind) }
  else if (t.stage == Unborn and t.restoreUrl != "") { state: s, out: settleEffects(request, s.cur, RefusedUnloaded) }
  else if (not(findable(s))) { state: s, out: settleEffects(request, s.cur, RefusedNoPage) }
  else { state: { ...s, find: { ...noFind, tab: s.cur, query: query, done: query == "" }, layers: { ...s.layers, menu: false } },
    out: settleEffects(request, s.cur, Done) }
}
pure def historyOutcome(s: Session, command: PageCommand, observedTab: str, observedRevision: int): AgentOutcome = {
  val t = curTab(s)
  val observed = observedCurrent(s, observedTab, observedRevision)
  if (t.stage == Unborn and t.restoreUrl != "") (if (not(observed)) RefusedChanged else if (command == Reload) Done else RefusedUnloaded)
  else if (not(observed)) RefusedChanged
  else if (t.stage != Live or (command == Reload and t.page.url == "")) RefusedNoPage
  else if ((command == GoBack and not(t.page.canBack)) or (command == GoForward and not(t.page.canForward))) RefusedNoHistory
  else if (command == StopLoading and not(t.page.loading)) RefusedNotLoading
  else Done
}
pure def canAgentHistory(s: Session, request: str, command: PageCommand, observedTab: str, observedRevision: int): bool = request != "" and isTab(s, s.cur)
pure def agentHistory(s: Session, request: str, command: PageCommand, observedTab: str, observedRevision: int): SessionChange =
  { state: s, out: settleEffects(request, s.cur, historyOutcome(s, command, observedTab, observedRevision)) }
pure def canAgentCommandShown(s: Session, tab: str, command: PageCommand, navigation: str): bool =
  s.cur == tab and isTab(s, tab) and (curTab(s).stage == Unborn or curTab(s).page.navigation == navigation)
pure def agentCommandShown(s: Session, tab: str, command: PageCommand, navigation: str): SessionChange =
  if (curTab(s).stage == Live and commandAllowedOn(curTab(s).page, command))
    { state: { ...s, layers: noLayers }, out: List(ShowBrowser, CommandNative({ id: tab, command: command, navigation: navigation })) }
  else { state: { ...s, layers: noLayers }, out: List(ShowBrowser) }
```

### A command from the agent's view of Browser runs only on the shown, uncovered native page it was admitted for, and is reported dispatched, never finished

Only back, forward and reload are view commands (`@elizaos/plugin-browser/native-command`). The
command names the document it was admitted under, and the native host refuses it if that document
changed. A refusal before any effect carries a typed code (`STALE_REF` for a changed page,
`UNAVAILABLE` otherwise). A dispatched back, forward or reload says the command was sent; whether the page
then loaded is for a later read of the page (eliza#40019).

```quint
pure def viewOutcome(s: Session, command: PageCommand, tab: str, navigation: str, shown: bool): AgentOutcome = {
  val t = tabOf(s, tab)
  if (s.host != NativeHost or not(shown)) RefusedNotShowing
  else if (covered(s)) RefusedCovered
  else if (tab == s.cur and t.stage == Unborn and t.restoreUrl != "") RefusedUnloaded
  else if (tab != s.cur or t.stage != Live or t.page.navigation != navigation) RefusedChanged
  else if (command == Reload and t.page.url == "") RefusedNoPage
  else if ((command == GoBack and not(t.page.canBack)) or (command == GoForward and not(t.page.canForward))) RefusedNoHistory
  else if (command == StopLoading and not(t.page.loading)) RefusedNotLoading
  else Dispatched
}
pure def canViewCommand(s: Session, request: str, command: PageCommand, tab: str, navigation: str, shown: bool): bool = request != "" and command != StopLoading
pure def viewCommand(s: Session, request: str, command: PageCommand, tab: str, navigation: str, shown: bool): SessionChange = {
  val result = viewOutcome(s, command, tab, navigation, shown)
  if (result == Dispatched)
    { state: s, out: List(CommandNative({ id: tab, command: command, navigation: navigation })).concat(settleEffects(request, tab, Dispatched)) }
  else { state: s, out: settleEffects(request, tab, result) }
}
pure def stepANativeCommandIsReportedOnlyAsDispatched(before: Session, via: str, after: Session, out: List[SessionEffect]): bool =
  via == "viewCommand" implies out.every(e => match e { | Settle(r) => r.outcome != Done | _ => true })
pure def stepAViewCommandNeedsTheShownUncoveredPage(before: Session, via: str, after: Session, out: List[SessionEffect]): bool =
  via == "viewCommand" implies out.every(e => match e {
    | CommandNative(c) => before.host == NativeHost and not(covered(before)) and c.id == before.cur and c.navigation == curTab(before).page.navigation
    | _ => true })
```

### The observation names only the selected tab's identity and revision, never its address or content, which go only as the Browser page beside it

The page itself is sent only as [the Browser page with a message](./pageContext.md) allows.

```quint
type TabSelection = { tab: str, revision: int }
pure def selectionOf(s: Session): TabSelection =
  if (isTab(s, s.cur) and curTab(s).page.url != "" and not(curTab(s).page.failed)) { tab: s.cur, revision: curTab(s).revision }
  else { tab: "", revision: 0 }
pure def visibleTabs(s: Session, inBrowser: bool): List[BrowserTab] =
  s.tabs.select(t => t.profile == Normal or fromPrivate(s, inBrowser))
pure def alwaysTheSelectionNamesOnlyAnOpenTab(s: Session): bool = selectionOf(s).tab == "" or isTab(s, selectionOf(s).tab)
```

## Story: Close every tab from one listed review

> As the owner, I want "close all my tabs" to show me one card that lists the tabs it will close,
> and to close exactly those tabs, or nothing when Browser's tabs changed after I read the card.

### A close-every-tab card lists the tabs it would close once per proposal, and a listing that no longer matches Browser's tabs is withdrawn

The tabs are every normal tab, and a private tab only for a request made from a private tab shown in
Browser. The first listing binds the proposal; a later listing of the same proposal never redraws
it. The shell names each line by its title, else its address, and counts a private tab without
naming it. The agent never receives the list. At most sixteen proposals keep a listing; the oldest
is forgotten first.

```quint
pure val maxListings = 16
pure def listedOf(t: BrowserTab): ListedTab =
  { id: t.id, url: if (t.page.url != "") t.page.url else t.restoreUrl,
    title: if (t.page.title != "") t.page.title else t.restoreTitle, priv: t.profile == Private }
pure def closableTabs(s: Session, inBrowser: bool): List[ListedTab] = visibleTabs(s, inBrowser).listMap(t => listedOf(t))
pure def isListed(s: Session, proposal: str): bool = proposal != "" and s.listings.some(l => l.proposal == proposal)
pure def listingOf(s: Session, proposal: str): List[ListedTab] =
  s.listings.foldl(List(), (found, l) => if (l.proposal == proposal) l.tabs else found)
pure def listingCurrent(s: Session, proposal: str, inBrowser: bool): bool =
  isListed(s, proposal) and listingOf(s, proposal) == closableTabs(s, inBrowser)
pure def canListClosing(s: Session, proposal: str, inBrowser: bool): bool = proposal != "" and s.host != UnknownHost
pure def listClosing(s: Session, proposal: str, inBrowser: bool): Session = {
  val kept = if (s.listings.length() >= maxListings) s.listings.removeAt(0) else s.listings
  if (isListed(s, proposal)) s else { ...s, listings: kept.append({ proposal: proposal, tabs: closableTabs(s, inBrowser) }) }
}
pure def alwaysListingsAreFewAndOnePerProposal(s: Session): bool =
  s.listings.length() <= maxListings and s.listings.every(a => a.proposal != "" and s.listings.select(b => b.proposal == a.proposal).length() == 1)
pure def stepAListingIsNeverRedrawn(before: Session, after: Session): bool =
  before.listings.every(l => not(isListed(after, l.proposal)) or listingOf(after, l.proposal) == l.tabs)
pure def sometimesAListingNamesSeveralTabs(s: Session): bool = s.listings.some(l => l.tabs.length() > 1)
```

### Closing every tab closes exactly the tabs its proposal's card listed, or nothing once Browser's tabs changed, and one approval closes once

A proposal without a listing, an empty listing, or tabs opened, closed or moved to another page since
the listing refuse before any effect, and the owner is told to ask again. The listing is spent
either way. Every listed tab closes in one state change. Outside Browser all of them close at once;
in Browser the others close at once and the tab showing closes when the action is presented, after
its receipt. A request made outside a private tab never leaves a private tab showing: Browser shows
a new tab instead.

```quint
pure def dropTabs(ids: List[str], fallback: str, hidePrivate: bool, s: Session): Session = {
  val rest = s.tabs.select(t => not(ids.includes(t.id)))
  val kept = if (ids.includes(s.cur)) firstId(rest) else s.cur
  val fresh = kept == "" or (hidePrivate and rest.some(t => t.id == kept and t.profile == Private))
  { ...s, tabs: if (fresh) rest.append(freshTab(fallback, Normal)) else rest, cur: if (fresh) fallback else kept,
    find: if (ids.includes(s.find.tab)) noFind else s.find,
    agentTab: if (ids.includes(s.agentTab)) "" else s.agentTab,
    profileUnsupported: if (ids.includes(s.profileUnsupported)) "" else s.profileUnsupported }
}
pure def closeNatives(s: Session, ids: List[str]): List[SessionEffect] =
  ids.foldl(List(), (acc, id) => if (isTab(s, id) and tabOf(s, id).stage != Unborn) acc.append(CloseNative({ id: id })) else acc)
pure def canAgentCloseAll(s: Session, request: str, proposal: str, inBrowser: bool, fallback: str): bool =
  request != "" and fallback != "" and not(known(s, fallback)) and s.host != UnknownHost
pure def agentCloseAll(s: Session, request: str, proposal: str, inBrowser: bool, fallback: str): SessionChange = {
  val listed = listingOf(s, proposal)
  val spent = { ...s, listings: s.listings.select(l => l.proposal != proposal) }
  val closing = listed.listMap(t => t.id)
  val showing = inBrowser and closing.includes(s.cur)
  val now = if (showing) closing.select(id => id != s.cur) else closing
  if (not(listingCurrent(s, proposal, inBrowser)) or listed.length() == 0) { state: spent, out: settleEffects(request, "", RefusedListChanged) }
  else { state: dropTabs(now, fallback, not(fromPrivate(s, inBrowser)), spent),
    out: closeNatives(s, now).concat(settleEffects(request, if (showing) s.cur else "", Done)) }
}
pure def canAgentCloseAllShown(s: Session, tab: str, selected: str, fallback: str, hidePrivate: bool): bool =
  isTab(s, tab) and s.cur == selected and selected == tab and fallback != "" and not(known(s, fallback))
pure def agentCloseAllShown(s: Session, tab: str, selected: str, fallback: str, hidePrivate: bool): SessionChange =
  { state: { ...dropTabs(List(tab), fallback, hidePrivate, s), layers: noLayers }, out: closeNatives(s, List(tab)).concat(List(ShowBrowser)) }
pure def stepClosingEveryTabClosesOnlyAListedTab(before: Session, via: str, after: Session): bool =
  via == "agentCloseAll" implies before.tabs.every(t =>
    after.tabs.some(a => a.id == t.id) or before.listings.some(l => not(isListed(after, l.proposal)) and l.tabs.some(x => x.id == t.id)))
pure def stepClosingEveryTabSpendsItsListing(before: Session, via: str, after: Session): bool =
  via == "agentCloseAll" implies after.listings.length() <= before.listings.length()
pure def stepClosingEveryTabNeverShowsAPrivateTabItLeft(before: Session, via: str, after: Session): bool =
  via == "agentCloseAll" implies (after.cur == before.cur or not(isPrivateTab(after, after.cur)))
pure def sometimesEveryListedTabClosed(s: Session): bool =
  s.tabs.length() == 1 and untouched(curTab(s)) and s.listings.length() == 0 and s.hydration == Hydrated and s.agentTab == ""
```

### Closing every tab is negotiated only beside Browser tabs, and it never runs without the owner's review

The phone advertises `browser.tabs.close-all.v1` only when the agent offers it together with
`browser.tabs.v1`. "Close this tab" and a named close stay one tab each.

```quint
pure def closeAllNegotiated(agentOffersTabs: bool, agentOffersCloseAll: bool): bool = agentOffersTabs and agentOffersCloseAll
pure def closeAllRunsUnreviewed(boundToMessage: bool, wordsTyped: bool): bool = false
pure def lawClosingEveryTabNeedsTabs(offersCloseAll: bool): bool = not(closeAllNegotiated(false, offersCloseAll))
pure def lawClosingEveryTabAlwaysWaitsForReview(boundToMessage: bool, wordsTyped: bool): bool = not(closeAllRunsUnreviewed(boundToMessage, wordsTyped))
```
