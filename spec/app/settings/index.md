# Settings

What the owner can see and change about Alpha and the phone, and erasing it
all. This spec is the pages and the way back, the handover to Android's own
settings, the links to other areas, and the licences. The rest of the area:

- [Facts](./facts.md): what the phone reports, read fresh and never guessed, and Set as Home
- [Preferences](./preferences.md): appearance, text size, Ask before Alpha acts and loading images in Inbox
- [Activity](./activity.md): the agent's recovery and the phone actions it took or proposed
- [Reset](./reset.md): erasing all data, decided by the phone

Rows of other areas sit on these pages and are theirs: the update rows
(the update area), the listening rows (the voice area), sign-in, the plan
and the AI provider (the account area), and the access
walkthrough (the startup area). Browser and Files on the Apps page
open the app itself, through the [shell](../shell/).

## Story: Find a setting and come back

> As the owner, I want every setting on a page I can reach in a few taps,
> and Back to return me to the row I left.

### Settings is a small tree of pages, each with one parent

General holds Display and Notifications; Privacy holds Permissions; Apps
holds a page for each app with something to set; About holds Agent
activity and the Licences, and a licence opens from their list. Developer
and its Problem log hang from the first page.

```quint
import read as R from "../../kit/read"

type Page = Top | General | Display | Notifications | Privacy | Permissions | Apps | InboxApp | WorkflowsApp | CameraApp | MapsApp | NotesApp | About | Activity | Licences | Licence | Developer | Problems

pure def parent(page: Page): Page =
  if (page == Display or page == Notifications) General
  else if (page == Permissions) Privacy
  else if (page == InboxApp or page == WorkflowsApp or page == CameraApp or page == MapsApp or page == NotesApp) Apps
  else if (page == Activity or page == Licences) About
  else if (page == Licence) Licences
  else if (page == Problems) Developer
  else Top

pure def depth(page: Page): int =
  if (page == Top) 0
  else if (page == General or page == Privacy or page == Apps or page == About or page == Developer) 1
  else if (page == Licence) 3
  else 2

pure def onTheWay(page: Page, target: Page): bool =
  page == target or page == parent(target) or page == parent(parent(target)) or page == Top
```

### Each page is one step below its parent, and none is more than three steps from the first

```quint
pure def lawEachPageIsOneStepBelowItsParent(page: Page): bool =
  depth(Top) == 0 and depth(page) <= 3 and (page != Top implies depth(parent(page)) == depth(page) - 1)
```

### Settings remembers the page showing, the row focused on each page on the way to it, the last start of an Android page, and the licences

The places are the rows focused on the pages from the first to the one
showing, one for each step.

```quint
type Target = AndroidHome | WifiNetworks | BluetoothDevices | MobileNetworks | AirplaneMode | BatterySaver | SoundSettings | DoNotDisturb | DefaultApps | Brightness | AlphaAlerts | WorkflowAlerts | AppPermissions | LocationSettings | DeveloperOptions
type Neighbour = AccessWalkthrough | AccountAndPlan | GoogleAndEmail | Conversations

type Settings = {
  page: Page, places: List[int], development: bool,
  android: R::Read, target: Target, due: int, nearby: bool,
  licences: R::Read, found: int, query: str, licence: int,
}

type Effect = OpenAndroid({ target: Target, start: int }) | LoadLicences({ load: int }) | Handed({ neighbour: Neighbour })
type Moved = { state: Settings, out: List[Effect] }

pure val initial: Settings = {
  page: Top, places: List(0), development: false,
  android: R::unread, target: AndroidHome, due: 0, nearby: false,
  licences: R::unread, found: 0, query: "", licence: 0,
}

pure def row(s: Settings, page: Page): int =
  if (onTheWay(page, s.page)) s.places.nthOr(depth(page), 0) else 0

pure def atTop(page: Page): List[int] =
  if (depth(page) == 0) List(0) else if (depth(page) == 1) List(0, 0) else if (depth(page) == 2) List(0, 0, 0) else List(0, 0, 0, 0)

pure def refocused(places: List[int], focused: int): List[int] =
  places.removeAt(places.length() - 1).append(focused)
```

### The Developer page and its Problem log exist only in a development build

The build says which it is. A page it does not admit closes to the first
page.

```quint
pure def admitted(s: Settings, page: Page): bool =
  (page == Developer or page == Problems) implies s.development

pure def admit(s: Settings, development: bool): Settings =
  val told = { ...s, development: development }
  if (admitted(told, s.page)) told else { ...told, page: Top, places: List(0) }

pure def alwaysDeveloperPagesNeedADevelopmentBuild(s: Settings): bool = admitted(s, s.page)
```

### A row opens only a page that hangs from the page showing, at its top

Opening the Licences clears the search, and loads them unless they are
loaded or loading. A licence opens from the list ("A licence opens only
from the loaded list").

```quint
pure def canOpen(s: Settings, page: Page): bool =
  page != Top and page != Licence and parent(page) == s.page and admitted(s, page)

pure def open(s: Settings, page: Page): Moved =
  val shown = { ...s, page: page, places: s.places.append(0) }
  val load = page == Licences and s.licences.status != R::Loading and s.licences.status != R::Loaded
  val asking = R::ask(s.licences)
  if (page != Licences) { state: shown, out: List() }
  else if (load) { state: { ...shown, query: "", licences: asking }, out: List(LoadLicences({ load: asking.ticket })) }
  else { state: { ...shown, query: "" }, out: List() }
```

### A notice or Ask Alpha may open a section directly, at its top, and Back from it goes to its parent

Opening Settings from Home shows the first page. A notice or Ask Alpha may
open General, Display, Notifications, Privacy, Permissions, Apps, the Inbox
and Workflows pages or About. The developer pages, Agent activity and the
licences are never opened this way. Opening a page is all the agent may do
here: what it changes is the owner's to change ([Preferences](./preferences.md)).

```quint
pure def addressable(page: Page): bool =
  page == Top or page == General or page == Display or page == Notifications or page == Privacy or page == Permissions
    or page == Apps or page == InboxApp or page == WorkflowsApp or page == About

pure def canOpenSection(s: Settings, page: Page): bool = addressable(page)

pure def openSection(s: Settings, page: Page): Settings = { ...s, page: page, places: atTop(page), query: "" }
```

### The owner's place on a page is the row focused there

```quint
pure val focusedValues = Set(-1, 0, 2)

pure def canFocus(s: Settings, focused: int): bool = focused >= 0

pure def focus(s: Settings, focused: int): Settings = { ...s, places: refocused(s.places, focused) }
```

### Back shows the parent, at the row the owner left, and forgets the page it closed

On the first page there is nothing to go back to inside Settings: the
shell's Back leaves the app. Leaving the Licences clears the search.

```quint
pure def canGoBack(s: Settings): bool = s.page != Top

pure def goBack(s: Settings): Settings =
  { ...s, page: parent(s.page), places: s.places.removeAt(s.places.length() - 1), query: if (s.page == Licences) "" else s.query }

pure def stepBackReturnsToTheRowLeft(before: Settings, via: str, after: Settings): bool =
  via == "goBack" implies (after.page == parent(before.page) and after.places == before.places.removeAt(before.places.length() - 1))
```

### A page opened by a row starts at its top, and the page behind keeps its row

```quint
pure def stepOpeningKeepsThePlaceBehind(before: Settings, via: str, after: Settings): bool =
  (via == "open" or via == "openLicence") implies
    (parent(after.page) == before.page and after.places == before.places.append(0))
```

### Settings holds one place for each step from the first page to the one showing, and none is negative

So a page opened again starts at its top.

```quint
pure def alwaysOnePlacePerStep(s: Settings): bool =
  s.places.length() == depth(s.page) + 1 and s.places.every(p => p >= 0)
```

### A deep page can be showing with a row remembered behind it

```quint
pure def sometimesDeepWithARowBehind(s: Settings): bool = s.page == Display and row(s, General) == 2
```

### The Problem log can be showing

```quint
pure def sometimesProblemLogShowing(s: Settings): bool = s.page == Problems
```

## Story: Change what only Android can change

> As the owner, I want a row to take me to the right page of Android's
> settings, and to be told when it opened a different page or none.

### Each Android page is offered on the Settings page it belongs to

Android's settings home is on the first page. General offers Wi-Fi,
Bluetooth, mobile networks, airplane mode, battery, sound, Do Not Disturb
and default apps. Display offers brightness, Notifications Alpha's alerts
and channels, the Workflows page its own alerts, Permissions Alpha's
permissions and location, the Camera, Maps and Notes pages Alpha's
permissions, and Developer Android's developer options.

```quint
pure def offers(page: Page, target: Target): bool =
  if (page == Top) target == AndroidHome
  else if (page == General)
    target == WifiNetworks or target == BluetoothDevices or target == MobileNetworks or target == AirplaneMode
      or target == BatterySaver or target == SoundSettings or target == DoNotDisturb or target == DefaultApps
  else if (page == Display) target == Brightness
  else if (page == Notifications) target == AlphaAlerts
  else if (page == WorkflowsApp) target == WorkflowAlerts
  else if (page == Permissions) target == AppPermissions or target == LocationSettings
  else if (page == CameraApp or page == MapsApp or page == NotesApp) target == AppPermissions
  else if (page == Developer) target == DeveloperOptions
  else false
```

### One start of an Android page is in flight at a time, from the page that offers it

A start has ten seconds to be answered.

```quint
pure val startLimit = 10
pure val atValues = Set(0, 4, 20)

pure def canHandOff(s: Settings, target: Target): bool = offers(s.page, target) and s.android.status != R::Loading

pure def handOff(s: Settings, target: Target, at: int): Moved =
  val asking = R::ask(s.android)
  { state: { ...s, android: asking, target: target, due: at + startLimit, nearby: false }, out: List(OpenAndroid({ target: target, start: asking.ticket })) }
```

### Android says whether it opened that page, a nearby one, or none

Only mobile networks, airplane mode and Do Not Disturb have a nearby page;
a page Android refused never falls back to its settings home. Alpha says
so when a nearby page opened, and says unavailable when none did.

```quint
type Opened = Exactly | Nearby | NotAtAll

pure val startValues = Set(1, 2, 3)

pure def hasNearby(target: Target): bool = target == MobileNetworks or target == AirplaneMode or target == DoNotDisturb

pure def canAndroidAnswered(s: Settings, start: int, opened: Opened): bool =
  R::canAnswer(s.android, start) and (opened == Nearby implies hasNearby(s.target))

pure def androidAnswered(s: Settings, start: int, opened: Opened): Settings =
  { ...s, android: R::answer(s.android, opened != NotAtAll), nearby: opened == Nearby }
```

### A start not answered within ten seconds is given up, and the owner may try again

Its answer, if it comes later, is refused.

```quint
pure val nowValues = Set(0, 4, 20, 40)

pure def canGiveUpOnAndroid(s: Settings, now: int): bool = s.android.status == R::Loading and now >= s.due

pure def giveUpOnAndroid(s: Settings, now: int): Settings = { ...s, android: R::answer(s.android, false) }
```

### Every start of an Android page ends, answered or given up

```quint
pure def leadsToAStartEnds(s: Settings, later: Settings): bool =
  s.android.status == R::Loading implies later.android.status != R::Loading

pure val fair_giveUpOnAndroid = "weak"
```

### Alpha says a nearby page opened only when Android said so, for a page that has one

```quint
pure def alwaysNearbyOnlyWhenAndroidSaidSo(s: Settings): bool =
  s.nearby implies (s.android.status == R::Loaded and hasNearby(s.target))
```

### Android is asked to open a page only by its row, alone, and never while another start is in flight

```quint
pure def isOpenAndroid(e: Effect): bool = match e { | OpenAndroid(o) => true | _ => false }

pure def stepOneAndroidStartAtATime(before: Settings, via: str, after: Settings, out: List[Effect]): bool =
  if (out.some(e => isOpenAndroid(e)))
    via == "handOff" and before.android.status != R::Loading and offers(before.page, after.target) and out.length() == 1
      and out.every(e => match e { | OpenAndroid(o) => o.target == after.target and o.start == after.android.ticket | _ => false })
  else after.android.ticket == before.android.ticket
```

### Android can open a nearby page

```quint
pure def sometimesANearbyPageOpened(s: Settings): bool = s.nearby
```

### A start can end with no page opened

```quint
pure def sometimesNoPageOpened(s: Settings): bool = s.android.status == R::Failed
```

## Story: Reach what another area owns

> As the owner, I want Settings to take me to my account, my Google
> accounts, my conversations and the access walkthrough without keeping a
> copy of them.

### Account and plan is on the first page, Set up Alpha access on Privacy, Google and email on the Inbox page, and the conversations on Agent activity

Settings hands over and keeps nothing: the account area owns sign-in, the
plan and Google accounts, the startup area owns the walkthrough that Set up
Alpha access reopens, and Ask Alpha owns the conversations (New, History
and restoring one).

```quint
pure def links(page: Page, neighbour: Neighbour): bool =
  if (neighbour == AccountAndPlan) page == Top
  else if (neighbour == AccessWalkthrough) page == Privacy
  else if (neighbour == GoogleAndEmail) page == InboxApp
  else page == Activity

pure def canHandOver(s: Settings, neighbour: Neighbour): bool = links(s.page, neighbour)

pure def handOver(s: Settings, neighbour: Neighbour): Moved = { state: s, out: List(Handed({ neighbour: neighbour })) }
```

### Handing over changes nothing in Settings

```quint
pure def stepHandingOverKeepsSettings(before: Settings, via: str, after: Settings): bool =
  via == "handOver" implies after == before
```

### The access walkthrough can be reopened from Privacy

```quint
pure def sometimesOnPrivacy(s: Settings): bool = canHandOver(s, AccessWalkthrough)
```

## Story: Read the licences

> As the owner, I want to search the licences of what Alpha is built from
> and read one, and to come back to my search.

### The licences shipped with Alpha load once, and a load that found none is tried again when the page is next opened

```quint
pure val loadValues = Set(1, 2)
pure val foundValues = Set(-1, 0, 3)

pure def canLicencesLoaded(s: Settings, load: int, found: int): bool = R::canAnswer(s.licences, load) and found >= 0

pure def licencesLoaded(s: Settings, load: int, found: int): Settings =
  { ...s, licences: R::answer(s.licences, found > 0), found: found }

pure def isLoadLicences(e: Effect): bool = match e { | LoadLicences(l) => true | _ => false }

pure def stepLicencesLoadOnce(before: Settings, via: str, after: Settings, out: List[Effect]): bool =
  if (out.some(e => isLoadLicences(e)))
    via == "open" and before.licences.status != R::Loading and before.licences.status != R::Loaded and out.length() == 1
      and out.every(e => match e { | LoadLicences(l) => l.load == after.licences.ticket | _ => false })
  else after.licences.ticket == before.licences.ticket
```

### The list counts licences only once they have loaded

```quint
pure def alwaysLicencesAreCountedOnceLoaded(s: Settings): bool =
  if (s.licences.status == R::Loaded) s.found > 0 else (s.found == 0 or s.licences.status == R::Loading)
```

### Searching narrows the list from its top, and only the Licences page has a search

```quint
pure val queryValues = Set("", "mit")

pure def canSearch(s: Settings, query: str): bool = s.page == Licences

pure def search(s: Settings, query: str): Settings = { ...s, query: query, places: refocused(s.places, 0) }

pure def alwaysOnlyTheLicencesAreSearched(s: Settings): bool =
  s.query != "" implies (s.page == Licences or s.page == Licence)
```

### A licence opens only from the loaded list

```quint
pure val licenceValues = Set(0, 2, 3)

pure def canOpenLicence(s: Settings, licence: int): bool =
  s.page == Licences and s.licences.status == R::Loaded and 0 <= licence and licence < s.found

pure def openLicence(s: Settings, licence: int): Settings =
  { ...s, page: Licence, licence: licence, places: s.places.append(0) }

pure def alwaysALicenceShownWasLoaded(s: Settings): bool =
  s.page == Licence implies (s.licences.status == R::Loaded and 0 <= s.licence and s.licence < s.found)
```

### Back from a licence returns to the same search, at the row the owner left

```quint
pure def stepBackFromALicenceKeepsTheSearch(before: Settings, via: str, after: Settings): bool =
  (via == "goBack" and before.page == Licence) implies (after.query == before.query and row(after, Licences) == row(before, Licences))
```

### A licence can be read from a searched list

```quint
pure def sometimesALicenceFromASearch(s: Settings): bool = s.page == Licence and s.query != "" and row(s, Licences) > 0
```

### A load can find no licences

```quint
pure def sometimesNoLicencesFound(s: Settings): bool = s.licences.status == R::Failed
```
