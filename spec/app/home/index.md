# Home

Home is the phone's launcher: the tiles the owner keeps on it, the Apps
drawer that lists what is installed, and the way out to Android for an
installed app, its info page and the notification shade. The
[shell](../shell/) says whether Home, the drawer or an app is showing, and
Home asks it to open one of Alpha's own apps or to close the drawer;
startup says how Alpha is presented. Alpha's agent does nothing on Home.

- [The phone's apps](./apps.md): what is installed, read again when it changes
- [Tiles](./tiles.md): the tiles kept on Home, read when Alpha starts and saved after each change
- [Asking Android](./android.md): one ask at a time, its wait and its answer
- [Cards](./cards.md): the daily overview above the tiles
- [Press](./press.md): which finger owns a press or a drag on a tile, and what it becomes

## Story: Start Home

> As the owner, I want Home to come back as I left it after a restart, and
> to show only what this phone can do.

### Home holds how Alpha is presented, the phone's apps as last read, its tiles, what is open on it and the ask Android is answering

Alpha runs in a plain browser, as an ordinary Android app, as the phone's
launcher, or as the assistant alone.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import shell as S from "../shell"
import tiles as T from "./tiles"
import android as N from "./android"
import apps as P from "./apps"

type Host = InBrowser | AsApp | AsLauncher | AssistantOnly
type Actor = Owner | Agent
type Menu = NoMenu | MenuOf({ app: str })
type Why = Gone | TurnedOff | ProfileLocked | NotInFront | Unable
type Home = {
  host: Host, installed: P::Installed,
  tiles: T::Tiles, editing: bool, adding: bool, query: str, menu: Menu, handoff: N::Handoff,
}
type Effect =
  | ReadSaved({ ticket: int })
  | SaveHome({ tiles: List[T::Tile], ticket: int })
  | ReadApps({ ticket: int })
  | AskAndroid({ ask: N::Ask, ticket: int })
  | Go({ view: S::View })
  | CloseDrawer
  | TellNotOpened({ ask: N::Ask, why: Why })
  | TellNoAnswer({ ask: N::Ask })
  | TellUnlockFirst
  | TellNotSaved
  | TellSavedUnreadable
  | TellAppsUnread
type Moved = { state: Home, out: List[Effect] }
```

### A new Home has been told nothing, has read nothing and shows nothing

```quint
pure val initial: Home = {
  host: InBrowser, installed: P::initial,
  tiles: T::initial, editing: false, adding: false, query: "", menu: NoMenu, handoff: N::initial,
}

pure def onPhone(h: Home): bool = h.host == AsApp or h.host == AsLauncher
```

### What the simulator tries

```quint
pure val appValues = Set("clock", "mail", "maps")
pure val tileValues = Set(
  T::Own({ view: S::Phone }), T::Own({ view: S::Inbox }), T::Own({ view: S::Notes }),
  T::Installed({ app: "clock" }), T::Installed({ app: "mail" }))
pure val ontoValues = tileValues
pure val tilesValues = Set(
  List(),
  List(T::Own({ view: S::Notes }), T::Installed({ app: "clock" }), T::Own({ view: S::Inbox })),
  List(T::Installed({ app: "mail" }), T::Installed({ app: "clock" })))
pure val listedValues = Set(Set(), Set("clock"), Set("clock", "mail"), Set("mail", "maps"))
pure val queryValues = Set("", "cl", "zz")
pure val nowValues = Set(0, 2000, 6000, 12000)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val shellValues = Set(
  S::initial,
  { ...S::initial, image: true, contacts: true },
  { ...S::initial, drawer: true },
  { ...S::initial, image: true, drawer: true },
  { ...S::initial, trail: List(S::Notes) })
pure val readHome: Home = {
  ...initial, host: AsLauncher, installed: { ...P::initial, read: { status: R::Loaded, ticket: 1 }, apps: Set("clock", "mail") },
  tiles: { ...T::initial, favourites: T::defaults, saved: T::defaults, load: { status: R::Loaded, ticket: 1 } },
}
pure val homeValues = Set(initial).union(Set(readHome)).union(Set({ ...readHome, editing: true, adding: true }))
  .union(Set({ ...readHome, menu: MenuOf({ app: "clock" }), query: "cl" }))
```

### Startup says once per run how Alpha is presented, and Home then reads its saved tiles

```quint
pure def canPresented(h: Home): bool = T::canBegin(h.tiles)

pure def presented(h: Home, host: Host): Moved =
  val tiles = T::begin(h.tiles)
  { state: { ...h, host: host, tiles: tiles }, out: List(ReadSaved({ ticket: tiles.load.ticket })) }
```

### Until startup has spoken, Home has been told nothing

Discovered by the proof: being told how Alpha is presented is what starts
the read of the saved tiles, so a Home that has not asked for them has not
been told it is on a phone.

```quint
pure def alwaysNothingIsToldBeforeTheStart(h: Home): bool = h.tiles.load.status == R::Idle implies h.host == InBrowser
```

### Once the saved tiles are read, the phone's apps are read if Home holds an installed app, and a record that could not be read is told

```quint
pure def thenReadApps(out: List[Effect], h: Home, quiet: bool): Moved =
  val installed = P::askApps(h.installed, quiet)
  { state: { ...h, installed: installed }, out: out.append(ReadApps({ ticket: installed.read.ticket })) }

pure def canSavedRead(h: Home, ticket: int): bool = T::canSavedRead(h.tiles, ticket)

pure def savedRead(h: Home, ticket: int, found: T::Found, tiles: List[T::Tile]): Moved =
  val read = T::savedRead(h.tiles, ticket, found, tiles)
  val told = if (read.load.status == R::Failed) List(TellSavedUnreadable) else List()
  val loaded = { ...h, tiles: read }
  if (onPhone(h) and h.installed.read.status == R::Idle and read.favourites.some(t => T::isInstalled(t)))
    thenReadApps(told, loaded, false)
  else { state: loaded, out: told }
```

### Alpha is told when it becomes, or stops being, the phone's launcher

```quint
pure def canLauncherChanged(h: Home, launcher: bool): bool = onPhone(h) and launcher != (h.host == AsLauncher)

pure def launcherChanged(h: Home, launcher: bool): Home = { ...h, host: if (launcher) AsLauncher else AsApp }
```

### A restart forgets everything but its numbers, which keep rising, so nothing asked before it can answer after it

The tiles come back from what was saved, once startup says again how
Alpha is presented. The shell starts its numbers past any it used before.

```quint
pure def restart(h: Home): Home =
  { ...initial, installed: P::restart(h.installed), tiles: T::restart(h.tiles), handoff: N::restart(h.handoff) }

pure def stepNumbersOnlyRise(before: Home, via: str, after: Home): bool =
  after.installed.read.ticket >= before.installed.read.ticket and after.handoff.attempt.id >= before.handoff.attempt.id
    and after.tiles.load.ticket >= before.tiles.load.ticket and after.tiles.save.id >= before.tiles.save.id

pure def stepARestartForgetsAllButItsNumbers(before: Home, via: str, after: Home): bool =
  via == "restart" implies (after.installed.read.status == R::Idle and after.installed.read.ticket == before.installed.read.ticket
    and after.installed.apps.size() == 0 and not(after.editing) and not(menuIsOpen(after.menu))
    and after.handoff.attempt.outcome == A::Planned and after.handoff.attempt.id == before.handoff.attempt.id
    and after.tiles == T::restart(before.tiles))
```

### Home's tiles keep their own rules

```quint
pure def alwaysTheTilesKeepTheirRules(h: Home): bool =
  T::alwaysNothingIsShownBeforeTheRead(h.tiles) and T::alwaysNoTileIsOnHomeTwice(h.tiles)
    and T::alwaysHomeHoldsNoMoreThanItsLimit(h.tiles) and T::alwaysHomeShowsWhatIsSaved(h.tiles)
```

### Off the phone Home reads no apps, opens nothing of the drawer, edits nothing and asks Android nothing

In a plain browser and on the assistant alone there is no Apps drawer and
no Home editing.

```quint
pure def alwaysOffThePhoneNothingIsAsked(h: Home): bool =
  not(onPhone(h)) implies (h.installed.read.status == R::Idle and h.installed.apps.size() == 0
    and not(h.installed.pending) and not(h.installed.quiet) and not(h.editing) and not(h.adding) and h.query == "" and not(menuIsOpen(h.menu))
    and h.handoff.attempt.outcome == A::Planned and not(T::saving(h.tiles)))
```

### On the assistant alone Home shows no tile and no card

```quint
pure def showsCards(h: Home): bool = h.host != AssistantOnly
```

### Startup can present the assistant alone

```quint
pure def sometimesOnlyTheAssistantIsPresented(h: Home): bool = h.host == AssistantOnly and T::ready(h.tiles)
```

### Alpha can stop being the launcher while Android is asked for its shade

```quint
pure def sometimesTheLauncherRoleIsLostDuringAPull(h: Home): bool =
  h.host == AsApp and N::waiting(h.handoff) and N::isShade(h.handoff.ask)
```

## Story: See the apps on this phone

> As the owner, I want the Apps drawer to list what is installed now, and to
> say so when it cannot, so that I never tap an app that is not there.

### The phone's apps keep their own rules

```quint
pure def alwaysTheInstalledAppsKeepTheirRules(h: Home): bool =
  P::alwaysAppsComeOnlyFromAReading(h.installed) and P::alwaysAQuietReadingIsOnItsWay(h.installed)

pure def asked(installed: P::Installed, h: Home): List[Effect] =
  if (installed.read.ticket != h.installed.read.ticket) List(ReadApps({ ticket: installed.read.ticket })) else List()
```

### When the phone's apps change, or Alpha comes back to the front after a change, they are read again on the phone

```quint
pure def canAppsChanged(h: Home, visible: bool): bool = onPhone(h) and P::canChanged(h.installed, visible)

pure def appsChanged(h: Home, visible: bool): Moved =
  val installed = P::changed(h.installed, visible)
  { state: { ...h, installed: installed }, out: asked(installed, h) }

pure def canResumed(h: Home): bool = onPhone(h) and P::canResumed(h.installed)

pure def resumed(h: Home): Moved =
  val installed = P::resumed(h.installed)
  { state: { ...h, installed: installed }, out: asked(installed, h) }
```

### A reading's answer closes a menu whose app has gone, and a failed one that takes an installed tile off Home says so

```quint
pure def canAppsRead(h: Home, ticket: int): bool = P::canAppsRead(h.installed, ticket)

pure def onHome(apps: Set[str], tiles: List[T::Tile]): bool = tiles.some(t => T::isInstalled(t) and T::there(apps, S::initial, t))

pure def appsRead(h: Home, ticket: int, ok: bool, listed: Set[str], visible: bool): Moved =
  val installed = P::appsRead(h.installed, ticket, ok, listed, visible)
  val kept = if (installed.apps.contains(menuApp(h.menu))) h.menu else NoMenu
  val told = if (not(ok) and not(h.installed.quiet) and onHome(h.installed.apps, h.tiles.favourites)) List(TellAppsUnread) else List()
  { state: { ...h, installed: installed, menu: kept }, out: told.concat(asked(installed, h)) }
```

### Alpha says the apps could not be read exactly when a failed reading takes an installed tile off Home, and not after a refused opening

A refused opening has already been told, so the reading it asks for adds
no second notice.

```quint
pure def isTellAppsUnread(e: Effect): bool = match e { | TellAppsUnread => true | _ => false }

pure def stepUnreadAppsAreToldOnlyWhenTrue(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.some(e => isTellAppsUnread(e)) iff (via == "appsRead" and after.installed.read.status == R::Failed
    and not(before.installed.quiet) and onHome(before.installed.apps, before.tiles.favourites))

pure def stepAReadingAfterARefusalTellsNothing(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (via == "appsRead" and before.installed.quiet) implies out.every(e => match e { | ReadApps(r) => true | _ => false })
```

### Only a refused opening asks for a reading that tells nothing

```quint
pure def stepOnlyARefusalReadsQuietly(before: Home, via: str, after: Home): bool =
  (after.installed.quiet and not(before.installed.quiet)) implies via == "answered"
```

### A reading is asked for under the next ticket, and only on the phone

```quint
pure def stepReadingsAreTicketed(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadApps(r) => onPhone(after) and after.installed.read.status == R::Loading
        and r.ticket == after.installed.read.ticket and r.ticket == before.installed.read.ticket + 1
    | ReadSaved(r) => after.tiles.load.status == R::Loading
        and r.ticket == after.tiles.load.ticket and r.ticket == before.tiles.load.ticket + 1
    | _ => true
  })
```

### Whether an app matches a search is told from its label and package, ignoring case and accents, and an empty search matches every app

Labels never reach Home's state; the order of the rows, prefix matches
first, and that no two rows read alike, belong to the drawer's component.

```quint
const matches: (str, str) => bool
pure def lawAnEmptySearchMatchesEveryApp(app: str): bool = matches(app, "")
```

### The drawer lists the apps of the last reading that match the search, every one of them when nothing is searched

```quint
pure def listing(h: Home): Set[str] = h.installed.apps.filter(a => matches(a, h.query))

pure def lawTheDrawerListsOnlyReadApps(home: Home): bool =
  listing(home).subseteq(home.installed.apps) and (home.query == "" implies home.installed.apps.subseteq(listing(home)))
```

### Off the phone there is no drawer; on it the drawer shows a spinner, that the apps could not be read, that none are installed, that none match the search, or the apps

While a newer reading is on its way the last list stays up. Home offers
the drawer only on the phone, and never while Home is being edited.

```quint
type Drawer = NotOnPhone | Spinner | CannotRead | NoAppsInstalled | NoMatch | Grid

pure def drawer(h: Home): Drawer =
  val status = h.installed.read.status
  if (not(onPhone(h))) NotOnPhone
  else if (status == R::Failed) CannotRead
  else if (status == R::Idle or (status == R::Loading and h.installed.apps.size() == 0)) Spinner
  else if (h.installed.apps.size() == 0) NoAppsInstalled
  else if (listing(h).size() == 0) NoMatch
  else Grid

pure def offersDrawer(h: Home): bool = onPhone(h) and not(h.editing)
```

### The drawer says nothing matches only when something is searched

```quint
pure def lawNothingMatchesOnlyASearch(home: Home): bool = drawer(home) == NoMatch implies home.query != ""
```

## Story: Open an app

> As the owner, I want a tap to open the app once, and to be told why when
> Android would not open it.

### A tap on one of Alpha's own tiles on bare Home asks the shell to open that app, never while Home is being edited

```quint
pure def tilesShown(h: Home, shell: S::Shell): List[T::Tile] =
  if (h.host == AssistantOnly) List() else h.tiles.favourites.select(t => T::there(h.installed.apps, shell, t))

pure def canOpenTile(h: Home, view: S::View, shell: S::Shell, by: Actor): bool =
  by == Owner and not(h.editing) and S::layers(shell) == 0 and tilesShown(h, shell).some(t => T::shows(t, view))

pure def openTile(h: Home, view: S::View, shell: S::Shell, by: Actor): Moved = { state: h, out: List(Go({ view: view })) }
```

### Only an app in the last reading is opened, never while Home is being edited, and never by the touch that opened its menu

An app that has gone is never sent to Android. The release of the long
press that opened an app's menu does not also open the app.

```quint
pure def asking(ask: N::Ask, now: int, h: Home): Moved =
  val handoff = N::send(h.handoff, ask, now)
  { state: { ...h, handoff: handoff }, out: List(AskAndroid({ ask: ask, ticket: handoff.attempt.id })) }

pure def canOpenApp(h: Home, app: str, by: Actor): bool =
  by == Owner and N::canSend(h.handoff) and not(h.editing) and h.installed.apps.contains(app) and not(menuIsFor(h.menu, app))

pure def openApp(h: Home, app: str, now: int, by: Actor): Moved = asking(N::OpenApp({ app: app }), now, h)

pure def stepTheTouchThatOpensAMenuNeverOpensItsApp(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e { | AskAndroid(a) => not(N::isOpening(a.ask) and menuIsFor(before.menu, N::appOf(a.ask))) | _ => true })
```

### Nothing is opened while Home is being edited

```quint
pure def stepNothingOpensWhileEditing(before: Home, via: str, after: Home, out: List[Effect]): bool =
  before.editing implies out.every(e => match e { | AskAndroid(a) => false | Go(g) => false | _ => true })
```

### Android's answer ends the wait; a refusal is told with its reason, and the apps are read again

The reason is Android's: the app has gone, is turned off, its profile is
locked, Alpha is not in front, or Android was unable. An opening that
succeeded is not announced.

```quint
pure def canAnswered(h: Home, ticket: int): bool = N::canAnswered(h.handoff, ticket)

pure def answered(h: Home, ticket: int, opened: bool, why: Why): Moved =
  val ended = { ...h, handoff: N::answered(h.handoff, ticket, opened) }
  val told = List(TellNotOpened({ ask: h.handoff.ask, why: why }))
  if (opened) { state: ended, out: List() }
  else if (N::isShade(h.handoff.ask)) { state: ended, out: told }
  else thenReadApps(told, ended, true)

pure def stepARefusedOpeningReadsTheAppsAgain(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (via == "answered" and after.handoff.attempt.outcome == A::Refused and not(N::isShade(before.handoff.ask)))
    implies (after.installed.quiet and out.some(e => match e { | ReadApps(r) => true | _ => false }))
```

### When Android has not answered in time the wait ends; Alpha says nothing of an app, and says Android did not answer about the shade

```quint
pure def canStopWaiting(h: Home, now: int): bool = N::canStopWaiting(h.handoff, now)

pure def stopWaiting(h: Home, now: int): Moved =
  { state: { ...h, handoff: N::stopWaiting(h.handoff, now) },
    out: if (N::isShade(h.handoff.ask)) List(TellNoAnswer({ ask: h.handoff.ask })) else List() }
```

### Alpha says something was not opened only when Android refused it, and that Android did not answer only when the shade's wait ran out

```quint
pure def stepNotOpenedIsToldOnlyWhenRefused(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e {
    | TellNotOpened(t) => via == "answered" and t.ask == before.handoff.ask and after.handoff.attempt.outcome == A::Refused
    | TellNoAnswer(t) => via == "stopWaiting" and t.ask == before.handoff.ask and N::isShade(t.ask)
        and after.handoff.attempt.outcome == A::Unknown
    | _ => true
  })
```

### Android is asked about an app only while that app is in the last reading, and for its shade only by the launcher

```quint
pure def mayAsk(ask: N::Ask, h: Home): bool = if (N::isShade(ask)) h.host == AsLauncher else h.installed.apps.contains(N::appOf(ask))

pure def stepAndroidIsAskedOnlyWhatHomeHas(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e { | AskAndroid(a) => mayAsk(a.ask, before) | _ => true })
```

### Each ask goes out alone, under the next number, so a late answer to an earlier one is refused

```quint
pure def stepOneAskAtATime(before: Home, via: str, after: Home, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAndroid(a) => not(N::waiting(before.handoff)) and N::waiting(after.handoff) and a.ask == after.handoff.ask
        and a.ticket == after.handoff.attempt.id and a.ticket == before.handoff.attempt.id + 1
    | _ => true
  })
```

### Every wait ends: Android answers, or the five seconds pass

```quint
pure def leadsToAWaitEnds(h: Home, later: Home): bool =
  N::waiting(h.handoff) implies not(N::waiting(later.handoff) and later.handoff.attempt.id == h.handoff.attempt.id)

pure val fair_stopWaiting = "weak"
pure val fair_answered = "weak"
```

### An app can be opening, Android can refuse it, and a wait can run out

```quint
pure def sometimesAnAppIsOpening(h: Home): bool = N::waiting(h.handoff) and N::isOpening(h.handoff.ask)

pure def sometimesAndroidRefuses(h: Home): bool = h.handoff.attempt.outcome == A::Refused

pure def sometimesAWaitRunsOut(h: Home): bool = h.handoff.attempt.outcome == A::Unknown
```

## Story: Keep my apps on Home

> As the owner, I want to choose which apps are on Home and in what order,
> and to be told when a change could not be saved.

### Home shows a tile only while its app is on this phone; a tile whose app has gone keeps its place and comes back with the app

```quint
pure def sometimesATileWaitsForItsApp(h: Home): bool =
  h.installed.read.status == R::Loaded
    and h.tiles.favourites.some(t => T::isInstalled(t) and not(T::there(h.installed.apps, S::initial, t)))
```

### Add to Home adds one of Alpha's own apps it lists, and an app's menu in the drawer adds that app; adding from the menu closes the drawer

```quint
pure def holdsView(tiles: List[T::Tile], view: S::View): bool = tiles.some(t => T::shows(t, view))

pure def hiddenApps(h: Home, shell: S::Shell): List[S::View] =
  T::homeOrder.select(view => S::available(shell, view) and not(holdsView(h.tiles.favourites, view)))

pure def offered(h: Home, tile: T::Tile, shell: S::Shell): bool =
  (h.adding and hiddenApps(h, shell).some(v => T::shows(tile, v)))
    or (shell.drawer and menuIsOpen(h.menu) and T::installs(tile, menuApp(h.menu)))

pure def canAddToHome(h: Home, tile: T::Tile, shell: S::Shell, by: Actor): bool =
  by == Owner and onPhone(h) and T::canAddTile(h.tiles, tile) and offered(h, tile, shell)

pure def changed(kept: T::Tiles, h: Home): Moved =
  { state: { ...h, tiles: kept }, out: List(SaveHome({ tiles: kept.favourites, ticket: kept.save.id })) }

pure def addToHome(h: Home, tile: T::Tile, shell: S::Shell, by: Actor): Moved =
  val tiles = T::addTile(h.tiles, tile)
  val added = { ...h, tiles: tiles, menu: NoMenu }
  { state: { ...added, adding: h.adding and hiddenApps(added, shell).length() > 0 },
    out: List(SaveHome({ tiles: tiles.favourites, ticket: tiles.save.id }))
      .concat(if (menuIsOpen(h.menu)) List(CloseDrawer) else List()) }

pure def isCloseDrawer(e: Effect): bool = match e { | CloseDrawer => true | _ => false }

pure def stepAddingFromTheMenuClosesTheDrawer(before: Home, via: str, after: Home, out: List[Effect]): bool =
  via == "addToHome" implies (out.some(e => isCloseDrawer(e)) iff menuIsOpen(before.menu))
```

### Add to Home closes once there is nothing left to add

```quint
pure def lawAddToHomeClosesWhenNothingIsLeft(home: Home, tile: T::Tile, shell: S::Shell): bool =
  val added = addToHome(home, tile, shell, Owner)
  (canAddToHome(home, tile, shell, Owner) and hiddenApps(added.state, shell).length() == 0) implies not(added.state.adding)
```

### A tile on Home is removed or moved only while Home is being edited

```quint
pure def canRemoveFromHome(h: Home, tile: T::Tile, shell: S::Shell, by: Actor): bool =
  by == Owner and h.editing and T::canRemoveTile(h.tiles, tile) and T::there(h.installed.apps, shell, tile)

pure def removeFromHome(h: Home, tile: T::Tile, shell: S::Shell, by: Actor): Moved = changed(T::removeTile(h.tiles, tile), h)

pure def canMoveTile(h: Home, tile: T::Tile, onto: T::Tile, shell: S::Shell, by: Actor): bool =
  by == Owner and h.editing and T::canMoveTile(h.tiles, tile, onto)
    and T::there(h.installed.apps, shell, tile) and T::there(h.installed.apps, shell, onto)

pure def moveTile(h: Home, tile: T::Tile, onto: T::Tile, behind: bool, shell: S::Shell, by: Actor): Moved =
  changed(T::moveTile(h.tiles, tile, onto, behind), h)
```

### Every change is sent whole to be saved under its number, and nothing else is ever saved

```quint
pure def isSave(e: Effect): bool = match e { | SaveHome(s) => true | _ => false }

pure def stepEveryChangeIsSentToBeSaved(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (out.some(e => isSave(e)) iff (via == "addToHome" or via == "removeFromHome" or via == "moveTile"))
    and out.every(e => match e {
      | SaveHome(s) => s.tiles == after.tiles.favourites and s.ticket == after.tiles.save.id and T::saving(after.tiles)
      | _ => true
    })
```

### A save that lands becomes what is saved; one that fails puts Home back as it was and says so

```quint
pure def canHomeSaved(h: Home, ticket: int): bool = T::canHomeSaved(h.tiles, ticket)

pure def homeSaved(h: Home, ticket: int, ok: bool): Moved =
  { state: { ...h, tiles: T::homeSaved(h.tiles, ticket, ok) }, out: if (ok) List() else List(TellNotSaved) }
```

### Alpha says a change was not saved exactly when its save failed, and that the saved Home could not be read exactly when that read failed

```quint
pure def stepFailuresAreToldExactly(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (out.some(e => match e { | TellNotSaved => true | _ => false })
      iff (via == "homeSaved" and after.tiles.save.outcome == A::Refused))
    and (out.some(e => match e { | TellSavedUnreadable => true | _ => false })
      iff (via == "savedRead" and after.tiles.load.status == R::Failed))
```

### Every save ends, as long as the phone's storage answers

```quint
pure def leadsToASaveEnds(h: Home, later: Home): bool =
  T::saving(h.tiles) implies not(T::saving(later.tiles) and later.tiles.save.id == h.tiles.save.id)

pure val fair_homeSaved = "weak"
```

### A save can be on its way, and can fail

```quint
pure def sometimesASaveIsOnItsWay(h: Home): bool = T::saving(h.tiles)

pure def sometimesASaveFails(h: Home): bool = h.tiles.save.outcome == A::Refused
```

## Story: Edit Home

> As the owner, I want to long-press a tile to rearrange Home, bring back an
> app I removed, and leave with Done or Back.

### A long press on bare Home starts editing, only on the phone and once the tiles are read

The shell says that nothing is over Home.

```quint
pure def canBeginEditing(h: Home, shell: S::Shell): bool =
  onPhone(h) and T::ready(h.tiles) and not(h.editing) and S::layers(shell) == 0

pure def beginEditing(h: Home, shell: S::Shell): Home = { ...h, editing: true, adding: false, menu: NoMenu, query: "" }
```

### While editing, Add to Home lists Alpha's own apps that this phone admits and Home does not hold, and opens only if there is one

```quint
pure def canShowHidden(h: Home, shell: S::Shell): bool = h.editing and not(h.adding) and hiddenApps(h, shell).length() > 0

pure def showHidden(h: Home, shell: S::Shell): Home = { ...h, adding: true }
```

### Back closes one layer of Home's own: an app's menu, then Add to Home, then editing; Done ends editing

The shell's Back comes after these.

```quint
pure def menuIsOpen(m: Menu): bool = match m { | MenuOf(o) => true | _ => false }

pure def menuApp(m: Menu): str = match m { | MenuOf(o) => o.app | _ => "" }

pure def canBackOut(h: Home): bool = menuIsOpen(h.menu) or h.adding or h.editing

pure def backOut(h: Home): Home =
  if (menuIsOpen(h.menu)) { ...h, menu: NoMenu }
  else if (h.adding) { ...h, adding: false }
  else { ...h, editing: false }

pure def canDone(h: Home): bool = h.editing

pure def done(h: Home): Home = { ...h, editing: false, adding: false }
```

### When the shell moves, what no longer fits closes: anything over Home ends editing, the drawer opening included, and a closed drawer drops its search and menu

The shell tells Home each time it moves. The drawer opening on the phone
reads the apps if they were never read.

```quint
pure def canShellMoved(h: Home, shell: S::Shell): bool =
  (h.editing and S::layers(shell) > 0)
    or (not(shell.drawer) and (menuIsOpen(h.menu) or h.query != ""))
    or (shell.drawer and onPhone(h) and h.installed.read.status == R::Idle)

pure def shellMoved(h: Home, shell: S::Shell): Moved =
  val bare = S::layers(shell) == 0
  val fitted = { ...h, editing: h.editing and bare, adding: h.adding and bare,
    menu: if (shell.drawer) h.menu else NoMenu, query: if (shell.drawer) h.query else "" }
  if (shell.drawer and onPhone(h) and h.installed.read.status == R::Idle) thenReadApps(List(), fitted, false)
  else { state: fitted, out: List() }

pure def lawWhatTheShellLeavesBehindCloses(home: Home, shell: S::Shell): bool =
  val fitted = shellMoved(home, shell)
  canShellMoved(home, shell) implies ((S::layers(shell) > 0 implies not(fitted.state.editing))
    and (not(shell.drawer) implies (not(menuIsOpen(fitted.state.menu)) and fitted.state.query == "")))
```

### Nothing on Home starts under a layer of the shell

```quint
pure def lawNothingStartsUnderALayer(home: Home, shell: S::Shell, view: S::View): bool =
  S::layers(shell) > 0 implies (not(canBeginEditing(home, shell)) and not(canPullDown(home, shell, false, Owner))
    and not(canOpenTile(home, view, shell, Owner)))
```

### Home is edited only once its tiles are read, with Add to Home inside editing, and never with a search or an app's menu open

```quint
pure def alwaysEditingIsAlone(h: Home): bool =
  (h.editing implies (T::ready(h.tiles) and not(menuIsOpen(h.menu)) and h.query == "")) and (h.adding implies h.editing)
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

### A new search in the open drawer replaces the last and closes any open menu

```quint
pure def canSearch(h: Home, query: str, shell: S::Shell): bool =
  onPhone(h) and shell.drawer and not(h.editing) and query != h.query

pure def search(h: Home, query: str, shell: S::Shell): Home = { ...h, query: query, menu: NoMenu }
```

### An app's menu opens in the open drawer, for an app in the last reading, and says Add to Home or On Home

```quint
pure def menuIsFor(m: Menu, app: str): bool = match m { | MenuOf(o) => o.app == app | _ => false }

pure def canOpenMenu(h: Home, app: str, shell: S::Shell): bool =
  shell.drawer and not(h.editing) and h.installed.apps.contains(app) and not(menuIsFor(h.menu, app))

pure def openMenu(h: Home, app: str, shell: S::Shell): Home = { ...h, menu: MenuOf({ app: app }) }

pure def isOnHome(h: Home, app: str): bool = h.tiles.favourites.some(t => T::installs(t, app))
```

### App info hands the menu's app to Android and closes the menu; a refusal is told like any other

```quint
pure def canShowAppInfo(h: Home, app: str, shell: S::Shell, by: Actor): bool =
  by == Owner and shell.drawer and N::canSend(h.handoff) and menuIsFor(h.menu, app)

pure def showAppInfo(h: Home, app: str, shell: S::Shell, now: int, by: Actor): Moved =
  asking(N::AppInfo({ app: app }), now, { ...h, menu: NoMenu })
```

### A search, an app's menu and its App info exist only in the open drawer

```quint
pure def lawTheDrawersControlsNeedTheDrawer(home: Home, shell: S::Shell, app: str, query: str): bool =
  not(shell.drawer) implies (not(canSearch(home, query, shell)) and not(canOpenMenu(home, app, shell))
    and not(canShowAppInfo(home, app, shell, Owner)))
```

### An open menu belongs to an app in the last reading

```quint
pure def alwaysTheMenuIsForAListedApp(h: Home): bool =
  val menu = h.menu
  match menu { | MenuOf(m) => h.installed.apps.contains(m.app) | _ => true }
```

### A menu can be open during a search, a menu can say On Home, and an app's info can be asked for

```quint
pure def sometimesAMenuIsOpenInASearch(h: Home): bool = menuIsOpen(h.menu) and h.query != ""

pure def sometimesAMenuSaysOnHome(h: Home): bool =
  val menu = h.menu
  match menu { | MenuOf(m) => isOnHome(h, m.app) | _ => false }

pure def sometimesAppInfoIsAsked(h: Home): bool =
  N::waiting(h.handoff) and not(N::isShade(h.handoff.ask)) and not(N::isOpening(h.handoff.ask))
```

## Story: Pull down for notifications

> As the owner, I want a pull down on empty Home to open Android's
> notifications, and never to be told they opened when they did not.

### A pull on bare Home asks Android for its shade only when Alpha is the launcher; on a locked phone it asks nothing and says to unlock first

The shell says that nothing is over Home, and the lock screen whether the
phone is locked. A pull while Android is still being asked, or while Home
is being edited, is ignored; as an ordinary app a pull does nothing and
says nothing. Alpha draws no shade of its own.

```quint
pure def canPullDown(h: Home, shell: S::Shell, locked: bool, by: Actor): bool =
  by == Owner and h.host == AsLauncher and S::layers(shell) == 0 and not(h.editing) and N::canSend(h.handoff)

pure def pullDown(h: Home, shell: S::Shell, locked: bool, now: int, by: Actor): Moved =
  if (locked) { state: h, out: List(TellUnlockFirst) } else asking(N::Shade, now, h)

pure def lawALockedPhoneNeverAsksForTheShade(home: Home, shell: S::Shell, now: int): bool =
  val pulled = pullDown(home, shell, true, now, Owner)
  canPullDown(home, shell, true, Owner)
    implies (pulled.out.length() == 1 and pulled.out.every(e => match e { | TellUnlockFirst => true | _ => false })
      and not(N::waiting(pulled.state.handoff)))
```

### Alpha speaks about the shade only to say that Android did not open it or did not answer

A shade that opened is not announced.

```quint
pure def stepTheShadeIsNeverSaidToHaveOpened(before: Home, via: str, after: Home, out: List[Effect]): bool =
  (N::isShade(before.handoff.ask) and N::waiting(before.handoff) and not(N::waiting(after.handoff)) and via != "restart")
    implies ((after.handoff.attempt.outcome == A::Confirmed) iff (out.length() == 0))
```

### The shade can be refused and go unanswered

```quint
pure def sometimesTheShadeIsRefused(h: Home): bool = N::isShade(h.handoff.ask) and h.handoff.attempt.outcome == A::Refused

pure def sometimesTheShadeGoesUnanswered(h: Home): bool = N::isShade(h.handoff.ask) and h.handoff.attempt.outcome == A::Unknown
```

## Story: Hear what went wrong where I am

> As the owner, I want a failure told where I am looking, and never over
> another app.

### A notice shows as a toast on bare Home, inline in the open drawer, and in the edit bar while editing; told while an app or Ask Alpha is up, it is not shown

```quint
type Place = AsToast | InDrawer | InEditBar | Nowhere

pure def noticeAt(h: Home, shell: S::Shell): Place =
  if (shell.trail.length() > 0 or shell.assistant != S::Bar) Nowhere
  else if (shell.drawer) InDrawer
  else if (h.editing) InEditBar
  else AsToast

pure def lawANoticeIsShownOnlyWhereTheOwnerIs(home: Home, shell: S::Shell): bool =
  ((noticeAt(home, shell) == Nowhere) iff (shell.trail.length() > 0 or shell.assistant != S::Bar))
    and (noticeAt(home, shell) == InDrawer implies shell.drawer)
    and (noticeAt(home, shell) == InEditBar implies home.editing)
    and (noticeAt(home, shell) == AsToast implies S::layers(shell) == 0)
```

## Story: What Alpha's agent may do on Home

> As the owner, I want Home to change only at my touch: the agent may not
> open an installed app, ask Android for anything, or change my tiles.

### The agent is refused every touch on Home: opening an app, App info, the shade, and adding, removing or moving a tile

```quint
pure def lawTheAgentChangesNothingOnHome(home: Home, shell: S::Shell, app: str, tile: T::Tile, onto: T::Tile, view: S::View): bool =
  not(canOpenTile(home, view, shell, Agent)) and not(canOpenApp(home, app, Agent))
    and not(canShowAppInfo(home, app, shell, Agent)) and not(canPullDown(home, shell, false, Agent))
    and not(canAddToHome(home, tile, shell, Agent)) and not(canRemoveFromHome(home, tile, shell, Agent))
    and not(canMoveTile(home, tile, onto, shell, Agent))
```
