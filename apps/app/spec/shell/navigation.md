# Navigation

One machine holds what the shell shows: the open app (none is Home), the apps Back returns to,
each app's kept place, where the assistant sits, the library over Home and Home's edit mode, the
stand-in shade, voice, and the sheets, menus and dialogs above everything. Android Back, the HOME
intent, an owner's tap and an agent's request all change it here, so Back always closes exactly
what is drawn on top. The machine is kept in the owner's storage, so a phone Android restarted comes
back to the same app and history; layers that belonged to the old page are dropped on boot.

The page publishes `backTaken` to Android as `data-alpha-can-go-back`; Android hands Back to the
page only while it holds. Otherwise the HOME app stays on Home, the launcher flavour moves its task
back and any other activity finishes.

```quint
type Host = Standalone | LauncherApp | HomeApp | AssistantSurface
type Detent = ChatHidden | ChatInput | ChatSheet | ChatFull
type LayerKind = MenuLayer | DialogLayer | SheetLayer
type Layer = { id: str, kind: LayerKind, covers: bool }
type Place = { app: str, route: str, inner: bool }
type Closed = ClosedNothing | ClosedLayer | ClosedMenu | ClosedAdd | ClosedEdit | ClosedShade
  | ClosedAssistant | ClosedVoice | ClosedConversation | ClosedLibrary | ClosedBar | ClosedInner
  | ClosedStack | ClosedApp
type Outcome = NoBack | RendererBack | StayedHome | Backgrounded | Finished
type Claim = NoClaim | ClaimCaptured | ClaimHeld | ClaimCommitted | ClaimDelivered | ClaimUnknown
type Nav = {
  host: Host, admitted: Set[str], app: str, stack: List[str], places: List[Place],
  chat: Detent, voice: bool, shade: bool,
  library: bool, query: str, visible: Set[str], menu: str, editing: bool, adding: bool,
  layers: List[Layer], holds: Set[str], hidden: bool, ended: bool,
  revision: int, claim: Claim, captured: int, destination: str,
  outcome: Outcome, closed: Closed, removed: int, lostLayer: bool
}
pure val initial: Nav = {
  host: Standalone, admitted: Set(), app: "", stack: List(), places: List(),
  chat: ChatInput, voice: false, shade: false,
  library: false, query: "", visible: Set(), menu: "", editing: false, adding: false,
  layers: List(), holds: Set(), hidden: false, ended: false,
  revision: 0, claim: NoClaim, captured: 0, destination: "",
  outcome: NoBack, closed: ClosedNothing, removed: 0, lostLayer: false
}
pure val StackLimit = 6
pure val BarApps = Set("phone", "messages", "contacts")
pure val appValues = Set("calendar", "notes", "phone")
pure val routeValues = Set("", "event-1")
pure val admittedValues = Set(Set("calendar", "notes"), Set("calendar", "notes", "phone"))
pure val idValues = Set("sheet", "menu")
pure val entryValues = Set("org.fixture.clock", "alpha:notes")
pure val entriesValues = Set(Set(), Set("org.fixture.clock"), Set("org.fixture.clock", "alpha:notes"))
pure val queryValues = Set("", "cl")
pure val weight_nativeBack = 6
```

## Story: Open an app and find it where I left it

> As the owner, I want an app I open to show the place I left it in, and Android restarting Alpha
> to bring back the app I was in and the way back from it.

### An app opens only while it is admitted and nothing holds the phone

Opening from Home, the library, a notification or the agent closes the library, the shade and
Home's edit mode and puts the assistant on the app's resting detent: the comms apps rest on their
bar, every other app on the pill, Home on the bar. Push keeps the app being left as the way back,
at most six deep; any other open starts a new history. Opening a different app changes the
revision, which retires an agent's claim made on the screen before.

```quint
pure def restOf(app: str): Detent = if (app == "" or BarApps.contains(app)) ChatInput else ChatHidden
pure def placeOf(s: Nav, app: str): Place =
  s.places.select(p => p.app == app).nthOr(0, { app: app, route: "", inner: false })
pure def withPlace(p: Place, places: List[Place]): List[Place] = places.select(q => q.app != p.app).append(p)
pure def running(s: Nav): bool = not(s.ended) and s.outcome != Finished
pure def unblocked(s: Nav): bool = running(s) and not(s.hidden) and s.layers.length() == 0 and s.holds.size() == 0
pure def opened(app: str, route: str, push: bool, s: Nav): Nav = {
  val same = app == s.app
  val kept = placeOf(s, app)
  val place = if (same and route == "") kept else { app: app, route: route, inner: same and kept.inner }
  val history = if (same) s.stack
    else if (push and s.app != "") (if (s.stack.length() < StackLimit) s.stack.append(s.app) else s.stack.tail().append(s.app))
    else List()
  { ...s, app: app, stack: history, places: withPlace(place, s.places), library: false, query: "", menu: "",
    editing: false, adding: false, shade: false, chat: restOf(app),
    revision: if (same) s.revision else s.revision + 1, claim: NoClaim, destination: "",
    outcome: NoBack, closed: ClosedNothing, removed: 0 }
}
pure def canOpenApp(s: Nav, app: str): bool = unblocked(s) and s.admitted.contains(app)
pure def openApp(s: Nav, app: str, route: str, push: bool): Nav = opened(app, route, push, s)
pure def alwaysOpenAppIsAdmitted(s: Nav): bool =
  (s.app == "" or s.admitted.contains(s.app)) and s.stack.every(a => s.admitted.contains(a))
pure def alwaysStackIsBounded(s: Nav): bool =
  s.stack.length() <= StackLimit and (s.app == "" implies s.stack.length() == 0)
pure def sometimesTwoDeep(s: Nav): bool = s.stack.length() >= 2
```

### Each app keeps one place, and an app opened from elsewhere starts on its first page

An app reports the route it shows and whether it is on an inner page of its own; Back closes that
page before leaving the app. Reopening the app in front changes nothing; opening it from elsewhere
shows the route asked for, on its first page. Back to an earlier app restores the page it was left
on.

```quint
pure def innerOf(s: Nav): bool = s.app != "" and placeOf(s, s.app).inner
pure def canOpenInner(s: Nav): bool = running(s) and s.app != ""
pure def openInner(s: Nav): Nav = { ...s, places: withPlace({ ...placeOf(s, s.app), inner: true }, s.places) }
pure def canCloseInner(s: Nav): bool = running(s) and innerOf(s)
pure def closeInner(s: Nav): Nav = { ...s, places: withPlace({ ...placeOf(s, s.app), inner: false }, s.places) }
pure def canSetRoute(s: Nav, route: str): bool = running(s) and s.app != ""
pure def setRoute(s: Nav, route: str): Nav = { ...s, places: withPlace({ ...placeOf(s, s.app), route: route }, s.places) }
pure def alwaysOnePlacePerApp(s: Nav): bool =
  s.places.every(p => s.places.select(q => q.app == p.app).length() == 1)
pure def sometimesInnerPageKept(s: Nav): bool = innerOf(s) and s.stack.length() > 0
```

### Booting brings back the app and its history without the old page's layers

Android may restart Alpha at any time (process death, a renderer recovery, a configuration
change). Boot names the host and the apps admitted now. The app, the Back history, the kept places
and an open conversation stay; an app no longer admitted is left for Home and dropped from the
history. Sheets, menus, holds, voice, the shade and edit mode belonged to the old page and are
gone; the assistant surface never shows the library.

```quint
pure def boot(s: Nav, host: Host, admitted: Set[str]): Nav = {
  val kept = s.app == "" or admitted.contains(s.app)
  val app = if (kept) s.app else ""
  val conversing = s.chat == ChatSheet or s.chat == ChatFull
  { ...s, host: host, admitted: admitted, app: app,
    stack: if (app == "") List() else s.stack.select(a => admitted.contains(a)),
    chat: if (conversing and kept) s.chat else restOf(app),
    library: s.library and app == "" and host != AssistantSurface,
    query: if (s.library and app == "" and host != AssistantSurface) s.query else "",
    voice: false, shade: false, menu: "", editing: false, adding: false, layers: List(), holds: Set(),
    hidden: false, ended: false, claim: NoClaim, destination: "",
    outcome: NoBack, closed: ClosedNothing, removed: 0, lostLayer: false, revision: s.revision + 1 }
}
pure def stepBootKeepsAnAdmittedApp(before: Nav, via: str, after: Nav): bool =
  (via == "boot" and after.admitted.contains(before.app)) implies after.app == before.app
pure def sometimesRestoredIntoAnApp(s: Nav): bool = s.app != "" and s.revision >= 2 and s.outcome == NoBack
```

## Story: Go back one step at a time

> As the owner, I want each Back to close the one thing drawn on top, and Alpha never to leave
> while something of mine is still open.

### Back closes the topmost layer first, then Home's launcher layers, then the assistant, then the app

The order follows what is drawn: the last sheet, menu or dialog; with nothing above it, a phone
held inert by another surface takes Back and closes nothing. On Home with no voice or conversation
above them, the library's entry menu, the Add sheet and edit mode close innermost first. Then the
stand-in shade, the assistant surface itself, voice, a full conversation to half, a half sheet to
its rest, the library, a raised bar over an app that rests on the pill, an app's inner page, the
previous app, and finally Home. The assistant surface has no Home under its apps: leaving its last
app closes it.

```quint
pure def chatOf(s: Nav): Detent =
  if (s.host == AssistantSurface and s.app == "" and (s.chat == ChatInput or s.chat == ChatHidden)) ChatFull else s.chat
pure def talking(s: Nav): bool = chatOf(s) == ChatSheet or chatOf(s) == ChatFull
pure def one(flag: bool): int = if (flag) 1 else 0
pure def depth(s: Nav): int =
  s.layers.length() + one(s.app != "") + one(s.library) + one(s.menu != "") + one(s.editing) +
  one(s.adding) + one(s.shade) + one(s.voice) + one(talking(s))
pure def backTaken(s: Nav): bool =
  s.layers.length() > 0 or s.holds.size() > 0 or s.app != "" or s.library or s.editing or s.adding or
  s.shade or s.voice or talking(s)
pure def backTarget(s: Nav): Closed = {
  val above = s.voice or talking(s) or s.host == AssistantSurface
  val home = s.app == "" and not(s.shade)
  if (s.layers.length() > 0) ClosedLayer
  else if (s.holds.size() > 0) ClosedNothing
  else if (home and not(above) and s.menu != "") ClosedMenu
  else if (home and not(above) and s.adding) ClosedAdd
  else if (home and not(above) and s.editing and not(s.library)) ClosedEdit
  else if (s.shade) ClosedShade
  else if (s.host == AssistantSurface and s.app == "" and not(s.voice)) ClosedAssistant
  else if (s.voice) ClosedVoice
  else if (talking(s)) ClosedConversation
  else if (s.library and s.app == "") ClosedLibrary
  else if (s.app != "" and s.chat == ChatInput and restOf(s.app) == ChatHidden) ClosedBar
  else if (innerOf(s)) ClosedInner
  else if (s.app != "" and s.stack.length() > 0) ClosedStack
  else if (s.app != "" and s.host == AssistantSurface) ClosedAssistant
  else if (s.app != "") ClosedApp
  else ClosedNothing
}
pure def homed(revision: int, s: Nav): Nav =
  { ...s, app: "", stack: List(), library: false, query: "", menu: "", editing: false, adding: false,
    shade: false, chat: ChatInput, layers: List(), revision: revision, claim: NoClaim, destination: "" }
pure def closing(c: Closed, s: Nav): Nav = {
  val previous = s.stack.nthOr(s.stack.length() - 1, "")
  match c {
    | ClosedLayer => { ...s, layers: s.layers.removeAt(s.layers.length() - 1) }
    | ClosedMenu => { ...s, menu: "" }
    | ClosedAdd => { ...s, adding: false }
    | ClosedEdit => { ...s, editing: false }
    | ClosedShade => { ...s, shade: false }
    | ClosedAssistant => { ...s, ended: true }
    | ClosedVoice => { ...s, voice: false }
    | ClosedConversation => { ...s, chat: if (chatOf(s) == ChatFull) ChatSheet else restOf(s.app) }
    | ClosedLibrary => { ...s, library: false, query: "", menu: "" }
    | ClosedBar => { ...s, chat: ChatHidden }
    | ClosedInner => { ...s, places: withPlace({ ...placeOf(s, s.app), inner: false }, s.places) }
    | ClosedStack => { ...s, app: previous, stack: s.stack.removeAt(s.stack.length() - 1), chat: restOf(previous),
        revision: s.revision + 1, claim: NoClaim, destination: "" }
    | ClosedApp => homed(s.revision + 1, s)
    | ClosedNothing => s
  }
}
pure def canNativeBack(s: Nav): bool = running(s)
pure def nativeBack(s: Nav): Nav = {
  val target = backTarget(s)
  val after = closing(target, s)
  if (backTaken(s)) { ...after, outcome: RendererBack, closed: target, removed: depth(s) - depth(after), lostLayer: false }
  else if (s.host == HomeApp) { ...s, outcome: StayedHome, closed: ClosedNothing, removed: 0, lostLayer: false }
  else { ...s, outcome: if (s.host == LauncherApp) Backgrounded else Finished, closed: ClosedNothing, removed: 0,
    lostLayer: depth(s) > 0 }
}
pure def alwaysLeavingAbandonsNoLayer(s: Nav): bool =
  not(backTaken(s)) implies (backTarget(s) == ClosedNothing and depth(s) == 0)
pure def alwaysBackMakesProgress(s: Nav): bool =
  (backTaken(s) and s.holds.size() == 0) implies backTarget(s) != ClosedNothing
pure def alwaysNoExitOverALayer(s: Nav): bool = not(s.lostLayer)
pure def alwaysTheHomeAppStays(s: Nav): bool =
  s.host == HomeApp implies (s.outcome != Finished and s.outcome != Backgrounded)
pure def alwaysOneLayerPerBack(s: Nav): bool =
  s.removed <= 1 and ((s.outcome == RendererBack and s.closed == ClosedNothing) implies s.removed == 0)
pure def sometimesFinished(s: Nav): bool = s.outcome == Finished
pure def sometimesBackgrounded(s: Nav): bool = s.outcome == Backgrounded
pure def sometimesStackReturnKeepsItsPage(s: Nav): bool = s.closed == ClosedStack and innerOf(s)
pure def sometimesInertPhoneIsNotNavigated(s: Nav): bool =
  s.outcome == RendererBack and s.closed == ClosedNothing and s.app != ""
pure def sometimesAssistantSurfaceClosed(s: Nav): bool = s.ended
```

### HOME returns to Home and dismisses what is open above it

Android's HOME intent while Alpha is Home, a repeated HOME, and an app's own close control all
return to Home: the app, its history, the library, edit mode, the shade, sheets and menus close and
the assistant rests on its bar. A surface that holds the phone (an update in progress, recovery)
keeps it.

```quint
pure def canGoHome(s: Nav): bool = running(s) and s.holds.size() == 0
pure def goHome(s: Nav): Nav =
  { ...homed(if (s.app == "") s.revision else s.revision + 1, s), voice: false, outcome: StayedHome, closed: ClosedNothing, removed: 0 }
pure def stepHomeLeavesNothingOpen(before: Nav, via: str, after: Nav): bool =
  via == "goHome" implies (after.app == "" and after.layers.length() == 0 and not(after.library) and not(after.editing))
```

## Story: Use the library and arrange Home

> As the owner, I want the library over Home with its search and an entry's menu, and an edit mode
> on Home, each closing before what lies under it.

### The library, its entry menu and Home's edit mode exist only over Home

The library opens over Home, not in an app or on the assistant surface, and never while Home is
being edited; closing it clears its search and menu. Searching closes an entry's menu. An entry's
menu belongs to an entry the library shows now: one that leaves the list takes its menu with it.
The Add sheet opens only in edit mode.

```quint
pure def canOpenLibrary(s: Nav): bool = unblocked(s) and s.host != AssistantSurface and s.app == "" and not(s.editing)
pure def openLibrary(s: Nav): Nav = { ...s, library: true, menu: "", shade: false }
pure def canCloseLibrary(s: Nav): bool = s.library
pure def closeLibrary(s: Nav): Nav = { ...s, library: false, query: "", menu: "" }
pure def canSearchLibrary(s: Nav, query: str): bool = s.library and query != s.query
pure def searchLibrary(s: Nav, query: str): Nav = { ...s, query: query, menu: "" }
pure def showEntries(s: Nav, entries: Set[str]): Nav =
  { ...s, visible: entries, menu: if (entries.contains(s.menu)) s.menu else "" }
pure def canOpenMenu(s: Nav, entry: str): bool =
  running(s) and not(s.hidden) and s.layers.length() == 0 and s.library and s.app == "" and s.visible.contains(entry)
pure def openMenu(s: Nav, entry: str): Nav = { ...s, menu: entry }
pure def canCloseMenu(s: Nav): bool = s.menu != ""
pure def closeMenu(s: Nav): Nav = { ...s, menu: "" }
pure def canStartEdit(s: Nav): bool = unblocked(s) and s.host != AssistantSurface and s.app == "" and not(s.library)
pure def startEdit(s: Nav): Nav = { ...s, editing: true, adding: false }
pure def canOpenAdd(s: Nav): bool = unblocked(s) and s.editing
pure def openAdd(s: Nav): Nav = { ...s, adding: true }
pure def canCloseAdd(s: Nav): bool = s.adding
pure def closeAdd(s: Nav): Nav = { ...s, adding: false }
pure def canFinishEdit(s: Nav): bool = s.editing
pure def finishEdit(s: Nav): Nav = { ...s, editing: false, adding: false }
pure def alwaysLauncherLayersOnlyOverHome(s: Nav): bool =
  (s.menu != "" implies (s.library and s.visible.contains(s.menu))) and (s.adding implies s.editing) and
  ((s.library or s.editing) implies (s.app == "" and s.host != AssistantSurface)) and not(s.library and s.editing)
pure def sometimesMenuOverLibrary(s: Nav): bool = s.menu != "" and s.query != ""
pure def sometimesAddSheetOpen(s: Nav): bool = s.adding
```

## Story: Keep the assistant within reach

> As the owner, I want the assistant on Home's bar, on an app's pill or bar, as a half sheet or full
> screen, and voice above all of them, with Back lowering one step at a time.

### The assistant moves between its detents, and Home keeps its bar

A drag or flick that would hide the bar on Home settles on the bar instead. Voice runs above the
conversation and stops before it lowers. The assistant does not move while a sheet covers it or the
phone is held.

```quint
pure def canMoveChat(s: Nav, detent: Detent): bool =
  running(s) and not(s.hidden) and not(s.voice) and s.holds.size() == 0 and not(s.layers.some(l => l.covers))
pure def moveChat(s: Nav, detent: Detent): Nav =
  { ...s, chat: if (s.app == "" and detent == ChatHidden) ChatInput else detent, shade: false }
pure def canStartVoice(s: Nav): bool = unblocked(s) and not(s.voice)
pure def startVoice(s: Nav): Nav = { ...s, voice: true, shade: false }
pure def canStopVoice(s: Nav): bool = s.voice
pure def stopVoice(s: Nav): Nav = { ...s, voice: false }
pure def alwaysHomeKeepsItsBar(s: Nav): bool = s.app == "" implies s.chat != ChatHidden
pure def sometimesVoiceOverConversation(s: Nav): bool = s.voice and s.chat == ChatFull
```

## Story: Keep sheets and dialogs above the phone

> As the owner, I want a sheet, menu or dialog to own the phone while it is open, the assistant to
> stay usable beside one that leaves it free, and the phone to come back only when the last of them
> has closed.

### A layer is listed once, closes with its owner or with Back, and holds the phone while open

The phone under any layer is inert; a covering layer also makes the assistant inert. Another
surface (an update in progress, startup recovery) may hold the phone without a layer of its own;
each holder releases once, and the phone returns only after the last. A press on the assistant
closes a sheet that leaves it usable.

```quint
pure def appInert(s: Nav): bool = s.layers.length() > 0 or s.holds.size() > 0
pure def assistantInert(s: Nav): bool = s.holds.size() > 0 or s.layers.some(l => l.covers)
pure def canOpenLayer(s: Nav, id: str): bool = running(s) and not(s.hidden) and not(s.layers.some(l => l.id == id))
pure def openLayer(s: Nav, id: str, kind: LayerKind, covers: bool): Nav =
  { ...s, layers: s.layers.append({ id: id, kind: kind, covers: covers }), shade: false }
pure def canCloseLayer(s: Nav, id: str): bool = s.layers.some(l => l.id == id)
pure def closeLayer(s: Nav, id: str): Nav = { ...s, layers: s.layers.select(l => l.id != id) }
pure def canPressAssistant(s: Nav): bool =
  s.layers.length() > 0 and not(s.layers.nthOr(s.layers.length() - 1, { id: "", kind: SheetLayer, covers: true }).covers)
pure def pressAssistant(s: Nav): Nav = { ...s, layers: s.layers.removeAt(s.layers.length() - 1) }
pure def canHold(s: Nav, id: str): bool = not(s.holds.contains(id))
pure def hold(s: Nav, id: str): Nav = { ...s, holds: s.holds.union(Set(id)) }
pure def canRelease(s: Nav, id: str): bool = s.holds.contains(id)
pure def release(s: Nav, id: str): Nav = { ...s, holds: s.holds.exclude(Set(id)) }
pure def alwaysLayerIdsAreDistinct(s: Nav): bool = s.layers.every(l => s.layers.select(m => m.id == l.id).length() == 1)
pure def alwaysAHeldPhoneIsInert(s: Nav): bool = (s.holds.size() > 0 or s.layers.length() > 0) implies appInert(s)
pure def sometimesTwoLayersOpen(s: Nav): bool = s.layers.length() >= 2
pure def sometimesHeldWithoutALayer(s: Nav): bool = s.holds.size() > 0 and s.layers.length() == 0
```

### The stand-in shade opens only over Home

A browser build has no Android shade; its development stand-in draws over Home and nowhere else.

```quint
pure def canOpenShade(s: Nav): bool = unblocked(s) and s.app == "" and not(s.library) and not(s.shade)
pure def openShade(s: Nav): Nav = { ...s, shade: true }
pure def canCloseShade(s: Nav): bool = s.shade
pure def closeShade(s: Nav): Nav = { ...s, shade: false }
pure def alwaysShadeOverHome(s: Nav): bool = s.shade implies (s.app == "" and not(s.library))
```

### Hiding the page retires what the owner was in the middle of

Leaving Alpha (another app, the screen off) retires an agent's claim. A render failure of the open
app closes it and returns to Home.

```quint
pure def canHide(s: Nav): bool = not(s.hidden)
pure def hide(s: Nav): Nav = { ...s, hidden: true, claim: NoClaim, destination: "" }
pure def canShow(s: Nav): bool = s.hidden
pure def show(s: Nav): Nav = { ...s, hidden: false }
pure def canAppFailed(s: Nav, app: str): bool = s.app == app and s.app != ""
pure def appFailed(s: Nav, app: str): Nav = homed(s.revision + 1, s)
```

## Story: Let the agent switch my screen only while I am still looking

> As the owner, I want the agent to move me to the app it named only when the screen it saw is
> still the one in front, and to know it switched only once I see it.

### A claim is captured on one screen, committed on it, and confirmed in the app it opened

The agent's navigation (`POST /api/views/:id/navigate`, then claim and result) captures the
revision in front, claims one admitted app on that same revision, and commits it by opening the
app with history; an open conversation stays open. The switch is confirmed once the app it opened
is in front; a lost confirmation leaves it unknown. Any navigation of the owner's, Back, HOME, a
boot or hiding the page retires a claim not yet committed.

```quint
pure def canCaptureClaim(s: Nav): bool =
  running(s) and not(s.hidden) and (s.claim == NoClaim or s.claim == ClaimDelivered or s.claim == ClaimUnknown)
pure def captureClaim(s: Nav): Nav = { ...s, claim: ClaimCaptured, captured: s.revision, destination: "" }
pure def canClaimView(s: Nav, app: str): bool =
  s.claim == ClaimCaptured and s.captured == s.revision and not(s.hidden) and s.admitted.contains(app)
pure def claimView(s: Nav, app: str): Nav = { ...s, claim: ClaimHeld, destination: app }
pure def canCommitClaim(s: Nav, route: str): bool =
  s.claim == ClaimHeld and s.captured == s.revision and not(s.hidden) and s.holds.size() == 0 and
  s.layers.length() == 0 and s.admitted.contains(s.destination)
pure def commitClaim(s: Nav, route: str): Nav = {
  val next = opened(s.destination, route, true, s)
  { ...next, chat: if (talking(s)) s.chat else next.chat, claim: ClaimCommitted, destination: s.destination }
}
pure def canAcknowledge(s: Nav): bool = s.claim == ClaimCommitted and s.destination == s.app and not(s.hidden)
pure def acknowledge(s: Nav): Nav = { ...s, claim: ClaimDelivered }
pure def canLoseAcknowledgement(s: Nav): bool = s.claim == ClaimCommitted
pure def loseAcknowledgement(s: Nav): Nav = { ...s, claim: ClaimUnknown }
pure def alwaysClaimIsCurrent(s: Nav): bool =
  (s.claim == ClaimHeld implies (s.captured == s.revision and s.admitted.contains(s.destination) and not(s.hidden))) and
  ((s.claim == ClaimCommitted or s.claim == ClaimDelivered or s.claim == ClaimUnknown) implies
    (s.destination == s.app and not(s.hidden)))
pure def sometimesSwitchConfirmed(s: Nav): bool = s.claim == ClaimDelivered
pure def sometimesSwitchUnknown(s: Nav): bool = s.claim == ClaimUnknown
```

## Story: Leave an app Alpha may no longer show

> As the owner, I want an app the image stopped admitting to close the way any app closes, and not
> to come back by itself when it is admitted again.

### A withdrawn app is left for Home and dropped from the history

The shell reads what the image admits at start and on every return to the foreground. An open app
no longer admitted goes Home; the Back history keeps only admitted apps.

```quint
pure def refreshAdmission(s: Nav, admitted: Set[str]): Nav = {
  val leaving = s.app != "" and not(admitted.contains(s.app))
  val left = if (leaving) homed(s.revision + 1, s) else s
  { ...left, admitted: admitted, stack: left.stack.select(a => admitted.contains(a)),
    claim: if (left.destination == "" or admitted.contains(left.destination)) left.claim else NoClaim,
    destination: if (left.destination == "" or admitted.contains(left.destination)) left.destination else "" }
}
pure def stepAppChangesOnlyByNavigation(before: Nav, via: str, after: Nav): bool =
  before.app != after.app implies (via == "openApp" or via == "nativeBack" or via == "goHome" or via == "boot" or
    via == "refreshAdmission" or via == "appFailed" or via == "commitClaim")
pure def sometimesWithdrawnAppLeft(s: Nav): bool =
  s.app == "" and s.places.some(p => p.app == "phone") and not(s.admitted.contains("phone")) and s.admitted.size() > 0
```
