# Home

Home is the phone's launcher: the tiles the owner keeps on it, the Apps
drawer that lists what is installed, and the way out to Android for an
installed app, its info page and the notification shade. The
[shell](../shell/) says whether Home, the drawer or an app is showing; Home
takes that as given.

- [Cards](./cards.md): the daily overview above the tiles

## Story: See the apps on this phone

> As the owner, I want the Apps drawer to list what is installed now, and to
> say so when it cannot, so that I never tap an app that is not there.

### Home holds the apps last read from the phone, the tiles kept on it and what it is waiting for

Alpha runs in a plain browser, as an ordinary Android app, or as the
phone's launcher. A tile is one of Alpha's own apps or an installed app. An
installed app is named by its package, activity and profile, never by its
label; labels and icons stay with the listing the phone gave.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import shell as S from "../shell"

type Host = InBrowser | AsApp | AsLauncher
type Tile = Own({ view: S::View }) | Installed({ app: str })
type Menu = NoMenu | MenuOf({ app: str })
type Ask = OpenApp({ app: str }) | AppInfo({ app: str }) | Shade
type Why = Gone | TurnedOff | Locked | NotInFront | Unable
type Handoff = { ask: Ask, attempt: A::Attempt, until: int }
type Home = {
  host: Host, inventory: R::Read, apps: Set[str],
  favourites: List[Tile], saved: List[Tile], save: A::Attempt,
  editing: bool, adding: bool, query: str, menu: Menu, handoff: Handoff,
}
type Effect =
  | ReadApps({ ticket: int })
  | AskAndroid({ ask: Ask, ticket: int })
  | SaveHome({ tiles: List[Tile], ticket: int })
  | TellNotOpened({ ask: Ask, why: Why })
  | TellNotSaved
  | TellAppsUnread
type Moved = { state: Home, out: List[Effect] }
```

### A new Home holds every one of Alpha's own apps, in Home order, and has read nothing

```quint
pure val homeOrder: List[S::View] = List(
  S::Phone, S::Messages, S::Inbox, S::Calendar, S::Browser, S::Camera, S::Photos,
  S::Maps, S::Notes, S::Contacts, S::Files, S::Workflows, S::Settings)

pure val defaults: List[Tile] = List(
  Own({ view: S::Phone }), Own({ view: S::Messages }), Own({ view: S::Inbox }), Own({ view: S::Calendar }),
  Own({ view: S::Browser }), Own({ view: S::Camera }), Own({ view: S::Photos }), Own({ view: S::Maps }),
  Own({ view: S::Notes }), Own({ view: S::Contacts }), Own({ view: S::Files }), Own({ view: S::Workflows }),
  Own({ view: S::Settings }))

pure val initial: Home = {
  host: InBrowser, inventory: R::unread, apps: Set(),
  favourites: defaults, saved: defaults, save: A::plan(0),
  editing: false, adding: false, query: "", menu: NoMenu,
  handoff: { ask: Shade, attempt: A::plan(0), until: 0 },
}
```

### What the simulator tries

```quint
pure val appValues = Set("clock", "mail", "maps")
pure val tileValues = Set(
  Own({ view: S::Phone }), Own({ view: S::Inbox }), Own({ view: S::Notes }),
  Installed({ app: "clock" }), Installed({ app: "mail" }))
pure val ontoValues = tileValues
pure val tilesValues = Set(
  List(),
  List(Own({ view: S::Notes }), Installed({ app: "clock" }), Own({ view: S::Inbox })),
  List(Installed({ app: "mail" }), Own({ view: S::Notes })),
  List(Own({ view: S::Inbox }), Own({ view: S::Inbox }), Installed({ app: "clock" })))
pure val foundValues = Set(Set(), Set("clock"), Set("clock", "mail"), Set("mail", "maps"))
pure val queryValues = Set("", "cl", "zz")
pure val nowValues = Set(0, 2000, 6000, 12000)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val shellValues = Set(
  S::initial,
  { ...S::initial, image: true, contacts: true },
  { ...S::initial, drawer: true },
  { ...S::initial, trail: List(S::Notes) })
```

### Alpha learns once that it runs on Android, and then reads the apps if Home has an installed app to show

Until it is told, Alpha behaves as in a plain browser.

```quint
pure def thenReadApps(out: List[Effect], h: Home): Moved =
  val asked = R::ask(h.inventory)
  { state: { ...h, inventory: asked }, out: out.append(ReadApps({ ticket: asked.ticket })) }

pure def isInstalled(tile: Tile): bool = match tile { | Installed(i) => true | _ => false }

pure def canHosted(h: Home, host: Host): bool = h.host == InBrowser and host != InBrowser

pure def hosted(h: Home, host: Host): Moved =
  val told = { ...h, host: host }
  if (told.favourites.some(t => isInstalled(t))) thenReadApps(List(), told) else { state: told, out: List() }
```

### Opening the Apps drawer reads the phone's apps, and there are none to read in a plain browser

```quint
pure def canReadApps(h: Home): bool = h.host != InBrowser

pure def readApps(h: Home): Moved = thenReadApps(List(), h)
```

### When the phone's apps change, or Alpha comes back to the front, they are read again, but never before they were first read

```quint
pure def canAppsChanged(h: Home): bool = h.host != InBrowser and h.inventory.status != R::Idle

pure def appsChanged(h: Home): Moved = thenReadApps(List(), h)
```

### Only the newest reading is taken; a failed one lists nothing, and a menu whose app has gone closes

A failed reading that takes a tile off Home says so; failing again, with
nothing left to take off, says nothing more.

```quint
pure def canAppsRead(h: Home, ticket: int): bool = R::canAnswer(h.inventory, ticket)

pure def onHome(apps: Set[str], tiles: List[Tile]): bool =
  tiles.some(t => match t { | Installed(i) => apps.contains(i.app) | _ => false })

pure def appsRead(h: Home, ticket: int, ok: bool, found: Set[str]): Moved =
  val apps = if (ok) found else Set()
  val menu = h.menu
  val kept = match menu { | MenuOf(m) => if (apps.contains(m.app)) MenuOf({ app: m.app }) else NoMenu | _ => NoMenu }
  { state: { ...h, inventory: R::answer(h.inventory, ok), apps: apps, menu: kept },
    out: if (not(ok) and onHome(h.apps, h.favourites)) List(TellAppsUnread) else List() }
```

### Alpha says the apps could not be read only when that took a tile off Home

```quint
pure def isTellAppsUnread(e: Effect): bool = match e { | TellAppsUnread => true | _ => false }

pure def stepUnreadAppsAreToldOnce(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => not(isTellAppsUnread(e)) or (via == "appsRead" and onHome(before.apps, before.favourites)
    and not(onHome(after.apps, after.favourites))))
```

### No app is listed before a reading, or after one that failed

```quint
pure def alwaysAppsComeOnlyFromAReading(h: Home): bool =
  (h.inventory.status == R::Idle or h.inventory.status == R::Failed) implies h.apps.size() == 0
```

### In a plain browser Alpha reads no apps, edits no Home and asks Android nothing

```quint
pure def alwaysABrowserHasNoPhone(h: Home): bool =
  h.host == InBrowser implies (h.inventory.status == R::Idle and not(h.editing)
    and h.handoff.attempt.outcome == A::Planned and h.save.outcome == A::Planned)
```

### A reading is asked for under a new ticket, and only on Android

```quint
pure def stepReadingsAreTicketed(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadApps(r) => after.host != InBrowser and after.inventory.status == R::Loading
        and r.ticket == after.inventory.ticket and r.ticket == before.inventory.ticket + 1
    | _ => true
  })
```

### The drawer shows a spinner, that the apps could not be read, that there are none, or the apps

While a newer reading is on its way the last list stays up. How many apps
match the search is counted outside, from their labels.

```quint
type Drawer = Spinner | Unreadable | NoApps | Grid

pure def drawerView(status: R::Status, listed: int, matching: int): Drawer =
  if (status == R::Failed) Unreadable
  else if (status == R::Idle or (status == R::Loading and listed == 0)) Spinner
  else if (matching <= 0) NoApps
  else Grid

pure def drawer(h: Home, matching: int): Drawer = drawerView(h.inventory.status, h.apps.size(), matching)

pure def lawTheDrawerShowsAppsOnlyFromAReading(status: R::Status, listed: int, matching: int): bool =
  drawerView(status, listed, matching) == Grid implies (status != R::Failed and status != R::Idle and matching > 0)
```

### The phone's apps can be listed

```quint
pure def sometimesAppsAreListed(h: Home): bool = h.inventory.status == R::Loaded and h.apps.size() > 1
```

### The phone's apps can be unreadable

```quint
pure def sometimesAppsAreUnreadable(h: Home): bool = h.inventory.status == R::Failed
```

### A list can stay up while it is read again

```quint
pure def sometimesAListIsReadAgain(h: Home): bool = h.inventory.status == R::Loading and h.apps.size() > 0
```

## Story: Open an installed app

> As the owner, I want a tap to open the app once, and to be told why when
> Android would not open it.

### Alpha asks Android for one thing at a time, and waits five seconds for the answer

An ask is an attempt that is sent as it is made. Android is asked to open
an app, to show an app's info page, or to open its notification shade.

```quint
pure val patience = 5000

pure def waiting(h: Home): bool = h.handoff.attempt.outcome == A::Sent

pure def isShade(ask: Ask): bool = match ask { | Shade => true | _ => false }

pure def asking(ask: Ask, now: int, h: Home): Moved =
  val attempt = A::dispatch(A::record(A::plan(h.handoff.attempt.id + 1)))
  { state: { ...h, handoff: { ask: ask, attempt: attempt, until: now + patience } },
    out: List(AskAndroid({ ask: ask, ticket: attempt.id })) }
```

### Only an app in the last reading is opened, and never while Home is being edited

An app that has gone is never sent to Android.

```quint
pure def canOpenApp(h: Home, app: str): bool = not(waiting(h)) and not(h.editing) and h.apps.contains(app)

pure def openApp(h: Home, app: str, now: int): Moved = asking(OpenApp({ app: app }), now, h)
```

### Android's answer ends the wait; a refusal is told with its reason, and the apps are read again

The reason is Android's: the app has gone, is turned off, its profile is
locked, Alpha is not in front, or Android was unable. An opening that
succeeded is not announced.

```quint
pure def canAnswered(h: Home, ticket: int): bool = A::canConclude(h.handoff.attempt, ticket)

pure def answered(h: Home, ticket: int, opened: bool, why: Why): Moved =
  val ended = { ...h, handoff: { ...h.handoff, attempt: A::conclude(h.handoff.attempt, opened, true) } }
  if (opened) { state: ended, out: List() }
  else if (isShade(h.handoff.ask)) { state: ended, out: List(TellNotOpened({ ask: h.handoff.ask, why: why })) }
  else thenReadApps(List(TellNotOpened({ ask: h.handoff.ask, why: why })), ended)
```

### When Android has not answered in time the wait ends, and Alpha does not say whether the app opened

```quint
pure def canStopWaiting(h: Home, now: int): bool = waiting(h) and now >= h.handoff.until

pure def stopWaiting(h: Home, now: int): Moved =
  { state: { ...h, handoff: { ...h.handoff, attempt: A::conclude(h.handoff.attempt, false, false) } },
    out: if (isShade(h.handoff.ask)) List(TellNotOpened({ ask: Shade, why: Unable })) else List() }
```

### Android is asked about an app only while that app is in the last reading, and for its shade only by the launcher

```quint
pure def mayAsk(ask: Ask, h: Home): bool =
  match ask {
    | OpenApp(o) => h.apps.contains(o.app)
    | AppInfo(i) => h.apps.contains(i.app)
    | Shade => h.host == AsLauncher
  }

pure def stepAndroidIsAskedOnlyWhatHomeHas(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e { | AskAndroid(a) => mayAsk(a.ask, before) | _ => true })
```

### Each ask goes out alone, under the next number, so a late answer to an earlier one is refused

```quint
pure def stepOneAskAtATime(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAndroid(a) => not(waiting(before)) and waiting(after) and a.ask == after.handoff.ask
        and a.ticket == after.handoff.attempt.id and a.ticket == before.handoff.attempt.id + 1
    | _ => true
  })
```

### Only Android's own answer makes an opening count as done

```quint
pure def stepOnlyAndroidSaysItOpened(before: Home, via: str, after: Home): bool =
  (after.handoff.attempt.outcome == A::Confirmed and after.handoff.attempt != before.handoff.attempt)
    implies via == "answered"
```

### Alpha says something was not opened only when Android refused it or never answered

```quint
pure def stepNotOpenedIsToldOnlyWhenTrue(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e {
    | TellNotOpened(t) => (via == "answered" or via == "stopWaiting") and t.ask == before.handoff.ask
        and (after.handoff.attempt.outcome == A::Refused or after.handoff.attempt.outcome == A::Unknown)
    | _ => true
  })
```

### Every wait ends: Android answers, or the five seconds pass

```quint
pure def leadsToAWaitEnds(h: Home, later: Home): bool =
  waiting(h) implies not(waiting(later) and later.handoff.attempt.id == h.handoff.attempt.id)

pure val fair_stopWaiting = "weak"
pure val fair_answered = "weak"
```

### An app can be opening

```quint
pure def sometimesAnAppIsOpening(h: Home): bool = waiting(h) and not(isShade(h.handoff.ask))
```

### Android can refuse

```quint
pure def sometimesAndroidRefuses(h: Home): bool = h.handoff.attempt.outcome == A::Refused
```

### A wait can run out

```quint
pure def sometimesAWaitRunsOut(h: Home): bool = h.handoff.attempt.outcome == A::Unknown
```

## Story: Keep my apps on Home

> As the owner, I want to choose which apps are on Home and in what order,
> and to find them there after a restart.

### Home shows a tile only while its app is on this phone: admitted, if Alpha's own, or in the last reading, if installed

A tile whose app has gone keeps its place in the saved order and comes
back with the app. The shell says which of Alpha's own apps this phone
admits.

```quint
pure def there(apps: Set[str], shell: S::Shell, tile: Tile): bool =
  match tile { | Own(o) => S::available(shell, o.view) | Installed(i) => apps.contains(i.app) }

pure def tilesShown(h: Home, shell: S::Shell): List[Tile] = h.favourites.select(t => there(h.apps, shell, t))
```

### An app is added to Home once, at the end, and an installed app only from the last reading

Adding from an app's menu in the drawer closes the menu.

```quint
pure def saving(h: Home): bool = h.save.outcome == A::Sent

pure def arranged(tiles: List[Tile], h: Home): Moved =
  val save = A::dispatch(A::record(A::plan(h.save.id + 1)))
  { state: { ...h, favourites: tiles, save: save }, out: List(SaveHome({ tiles: tiles, ticket: save.id })) }

pure def listed(apps: Set[str], tile: Tile): bool =
  match tile { | Installed(i) => apps.contains(i.app) | _ => true }

pure def canAddToHome(h: Home, tile: Tile): bool =
  h.host != InBrowser and not(saving(h)) and not(h.favourites.includes(tile)) and listed(h.apps, tile)

pure def addToHome(h: Home, tile: Tile): Moved = arranged(h.favourites.append(tile), { ...h, menu: NoMenu })
```

### A tile is removed only while Home is being edited

```quint
pure def canRemoveFromHome(h: Home, tile: Tile): bool =
  h.editing and not(saving(h)) and h.favourites.includes(tile)

pure def removeFromHome(h: Home, tile: Tile): Moved = arranged(h.favourites.select(t => t != tile), h)
```

### A tile is moved to just before or just after another, while Home is being edited

```quint
pure def placed(tiles: List[Tile], tile: Tile, onto: Tile, behind: bool): List[Tile] =
  tiles.foldl(List(), (placed, t) => placed.concat(
    if (t == tile) List()
    else if (t == onto) (if (behind) List(t, tile) else List(tile, t))
    else List(t)))

pure def canMoveTile(h: Home, tile: Tile, onto: Tile): bool =
  h.editing and not(saving(h)) and tile != onto and h.favourites.includes(tile) and h.favourites.includes(onto)

pure def moveTile(h: Home, tile: Tile, onto: Tile, behind: bool): Moved =
  arranged(placed(h.favourites, tile, onto, behind), h)
```

### A move leaves every other tile in its order

```quint
pure def lawTheRestKeepTheirOrder(tiles: List[Tile], tile: Tile, onto: Tile, behind: bool): bool =
  placed(tiles, tile, onto, behind).select(t => t != tile) == tiles.select(t => t != tile)
```

### A move keeps exactly the same tiles on Home

```quint
pure def stepAMoveKeepsTheSameTiles(before: Home, via: str, after: Home): bool =
  via == "moveTile" implies (after.favourites.every(t => before.favourites.includes(t))
    and before.favourites.every(t => after.favourites.includes(t)))
```

### No tile is on Home twice

```quint
pure def noTileTwice(tiles: List[Tile]): bool = tiles.every(t => tiles.select(u => u == t).length() == 1)

pure def alwaysNoTileIsOnHomeTwice(h: Home): bool = noTileTwice(h.favourites) and noTileTwice(h.saved)
```

### Every change to Home is sent whole to be saved, one save at a time

```quint
pure def savesExactly(out: List[Effect], tiles: List[Tile], ticket: int): bool =
  out.length() == 1 and out.every(e => match e { | SaveHome(s) => s.tiles == tiles and s.ticket == ticket | _ => false })

pure def stepEveryChangeIsSentToBeSaved(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (via == "addToHome" or via == "removeFromHome" or via == "moveTile") implies (not(saving(before)) and saving(after)
    and savesExactly(out, after.favourites, after.save.id) and after.save.id == before.save.id + 1)
```

### A save that lands becomes what is saved; one that fails puts Home back as it was and says so

```quint
pure def canHomeSaved(h: Home, ticket: int): bool = A::canConclude(h.save, ticket)

pure def homeSaved(h: Home, ticket: int, ok: bool): Moved =
  val save = A::conclude(h.save, ok, true)
  if (ok) { state: { ...h, save: save, saved: h.favourites }, out: List() }
  else { state: { ...h, save: save, favourites: h.saved }, out: List(TellNotSaved) }

pure def stepAFailedSaveChangesNothing(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (via == "homeSaved" and after.save.outcome == A::Refused)
    implies (after.favourites == before.saved and after.saved == before.saved
      and out.length() == 1 and out.every(e => match e { | TellNotSaved => true | _ => false }))
```

### Home shows what is saved, except while a save is on its way

```quint
pure def alwaysHomeShowsWhatIsSaved(h: Home): bool = not(saving(h)) implies h.favourites == h.saved
```

### Only the owner's changes, a save's answer and a restart change the tiles on Home

```quint
pure def stepOnlyTheOwnerRearrangesHome(before: Home, via: str, after: Home): bool =
  (after.favourites != before.favourites implies (via == "addToHome" or via == "removeFromHome"
      or via == "moveTile" or via == "homeSaved" or via == "restart"))
    and (after.saved != before.saved implies (via == "homeSaved" or via == "restart"))
```

### A restart keeps what was saved and forgets the rest

A save still on its way at the restart may or may not have landed. The
apps are read again, nothing is being edited, and nothing asked of Android
before the restart can answer after it.

```quint
pure def restart(h: Home, landed: bool): Home =
  val kept = if (saving(h) and landed) h.favourites else h.saved
  { ...initial, favourites: kept, saved: kept }

pure def stepARestartShowsWhatWasSaved(before: Home, via: str, after: Home): bool =
  via == "restart" implies (after.favourites == after.saved
    and (after.saved == before.saved or (saving(before) and after.saved == before.favourites)))
```

### Every save ends, as long as the phone's storage answers

```quint
pure def leadsToASaveEnds(h: Home, later: Home): bool =
  saving(h) implies not(saving(later) and later.save.id == h.save.id)

pure val fair_homeSaved = "weak"
```

### An installed app can be saved on Home

```quint
pure def sometimesAnInstalledAppIsOnHome(h: Home): bool =
  not(saving(h)) and h.saved.some(t => isInstalled(t))
```

### A save can fail

```quint
pure def sometimesASaveFails(h: Home): bool = h.save.outcome == A::Refused
```

### A rearranged Home can come back after a restart

```quint
pure def sometimesARearrangedHomeIsRestored(h: Home): bool =
  h.host == InBrowser and h.saved.length() == defaults.length() and h.saved != defaults
```

### Only Phone, Messages and Inbox carry a badge, and no tile does while Home is being edited

Those apps say whether something waits in them.

```quint
pure val badgeViews: Set[S::View] = Set(S::Phone, S::Messages, S::Inbox)

pure def badged(tile: Tile, something: bool, editing: bool): bool =
  something and not(editing)
    and (match tile { | Own(o) => badgeViews.contains(o.view) | _ => false })

pure def lawOnlyThreeAppsCarryABadge(tile: Tile, something: bool, editing: bool): bool =
  badged(tile, something, editing) implies (something and not(editing) and not(isInstalled(tile))
    and not(holdsView(List(tile), S::Calendar)) and not(holdsView(List(tile), S::Settings)))
```

## Story: Edit Home

> As the owner, I want to long-press a tile to rearrange Home, bring back an
> app I removed, and leave with Done or Back.

### A long press on bare Home starts editing, never in a plain browser

The shell says that nothing is over Home.

```quint
pure def canBeginEditing(h: Home, shell: S::Shell): bool =
  h.host != InBrowser and not(h.editing) and S::layers(shell) == 0

pure def beginEditing(h: Home, shell: S::Shell): Home = { ...h, editing: true, adding: false, menu: NoMenu, query: "" }
```

### While editing, Add to Home lists Alpha's own apps that this phone admits and Home does not hold, and opens only if there is one

```quint
pure def holdsView(tiles: List[Tile], view: S::View): bool =
  tiles.some(t => match t { | Own(o) => o.view == view | _ => false })

pure def hiddenApps(h: Home, shell: S::Shell): List[S::View] =
  homeOrder.select(view => S::available(shell, view) and not(holdsView(h.favourites, view)))

pure def canShowHidden(h: Home, shell: S::Shell): bool =
  h.editing and not(h.adding) and hiddenApps(h, shell).length() > 0

pure def showHidden(h: Home, shell: S::Shell): Home = { ...h, adding: true }
```

### Back closes one layer of Home's own: an app's menu, then Add to Home, then editing

The shell's Back comes after these.

```quint
pure def canBackOut(h: Home): bool = menuIsOpen(h.menu) or h.adding or h.editing

pure def backOut(h: Home): Home =
  if (menuIsOpen(h.menu)) { ...h, menu: NoMenu }
  else if (h.adding) { ...h, adding: false }
  else { ...h, editing: false }
```

### Done, leaving Home or closing the drawer ends editing, the menu and the search at once

```quint
pure def canTidy(h: Home): bool = canBackOut(h) or h.query != ""

pure def tidy(h: Home): Home = { ...h, editing: false, adding: false, menu: NoMenu, query: "" }
```

### Add to Home is open only while Home is being edited

```quint
pure def alwaysAddToHomeIsPartOfEditing(h: Home): bool = h.adding implies h.editing
```

### Home is never edited with a search or an app's menu open

```quint
pure def alwaysEditingAndTheDrawerNeverMix(h: Home): bool = h.editing implies (not(menuIsOpen(h.menu)) and h.query == "")
```

### Back never closes more than one layer

```quint
pure def ownLayers(h: Home): int =
  (if (menuIsOpen(h.menu)) 1 else 0) + (if (h.adding) 1 else 0) + (if (h.editing) 1 else 0)

pure def stepBackClosesOneLayer(before: Home, via: str, after: Home): bool =
  via == "backOut" implies ownLayers(after) == ownLayers(before) - 1
```

### Add to Home can be open

```quint
pure def sometimesAddToHomeIsOpen(h: Home): bool = h.adding
```

## Story: Find an app and see its details

> As the owner, I want to search the drawer, add an app to Home from its
> menu, and open Android's info page for it.

### A new search replaces the last and closes any open menu

```quint
pure def canSearch(h: Home, query: str): bool = h.host != InBrowser and not(h.editing) and query != h.query

pure def search(h: Home, query: str): Home = { ...h, query: query, menu: NoMenu }
```

### An app's menu opens for an app in the last reading

The menu says Add to Home, or On Home when the app is already there.

```quint
pure def menuIsOpen(m: Menu): bool = match m { | MenuOf(o) => true | _ => false }

pure def menuIsFor(m: Menu, app: str): bool = match m { | MenuOf(o) => o.app == app | _ => false }

pure def canOpenMenu(h: Home, app: str): bool =
  not(h.editing) and h.apps.contains(app) and not(menuIsFor(h.menu, app))

pure def openMenu(h: Home, app: str): Home = { ...h, menu: MenuOf({ app: app }) }

pure def isOnHome(h: Home, app: str): bool = h.favourites.some(t => match t { | Installed(i) => i.app == app | _ => false })
```

### App info hands the menu's app to Android and closes the menu

A refusal is told with its reason, like any other ask.

```quint
pure def canShowAppInfo(h: Home, app: str): bool = not(waiting(h)) and menuIsFor(h.menu, app)

pure def showAppInfo(h: Home, app: str, now: int): Moved = asking(AppInfo({ app: app }), now, { ...h, menu: NoMenu })
```

### An open menu belongs to an app in the last reading

```quint
pure def alwaysTheMenuIsForAListedApp(h: Home): bool =
  val menu = h.menu
  match menu { | MenuOf(m) => h.apps.contains(m.app) | _ => true }
```

### A menu can be open during a search

```quint
pure def sometimesAMenuIsOpenInASearch(h: Home): bool = menuIsOpen(h.menu) and h.query != ""
```

### An app's info can be asked for

```quint
pure def sometimesAppInfoIsAsked(h: Home): bool =
  val ask = h.handoff.ask
  waiting(h) and (match ask { | AppInfo(i) => true | _ => false })
```

## Story: Pull down for notifications

> As the owner, I want a pull down on empty Home to open Android's
> notifications, and never to be told they opened when they did not.

### A pull on bare Home asks Android for its shade, only when Alpha is the launcher

The shell says that nothing is over Home. A pull while Android is still
being asked, or while Home is being edited, is ignored. Alpha draws no
shade of its own.

```quint
pure def canPullDown(h: Home, shell: S::Shell): bool =
  h.host == AsLauncher and S::layers(shell) == 0 and not(h.editing) and not(waiting(h))

pure def pullDown(h: Home, shell: S::Shell, now: int): Moved = asking(Shade, now, h)
```

### Alpha speaks about the shade only to say that Android did not open it

A shade that opened is not announced; one that Android refused, or never
answered about, is.

```quint
pure def stepTheShadeIsNeverSaidToHaveOpened(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (isShade(before.handoff.ask) and waiting(before) and not(waiting(after)) and via != "restart")
    implies ((after.handoff.attempt.outcome == A::Confirmed) == (out.length() == 0))
```

### The shade can be asked for and not open

```quint
pure def sometimesTheShadeDoesNotOpen(h: Home): bool =
  isShade(h.handoff.ask) and h.handoff.attempt.outcome == A::Refused
```
