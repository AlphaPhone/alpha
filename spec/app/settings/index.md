# Settings

What the owner can see and change about Alpha and the phone, and erasing it
all. This spec is the pages, the way back and the links to other areas.
The rest of the area:

- [Android](./android.md): the hand-over to Android's own settings pages
- [Facts](./facts.md): what the phone reports, read fresh and never guessed, and Set as Home
- [Home role](./roles.md): Alpha taking over Home on an Alpha image, and the access it grants itself
- [Preferences](./preferences.md): appearance, text size, Ask before Alpha acts and loading images in Inbox
- [Activity](./activity.md): the agent's recovery and the phone actions it took or proposed
- [Licences](./licences.md): the licences shipped with Alpha
- [Developer](./developer.md): the Problem log, diagnostics and recovery tools of a development build
- [Reset](./reset.md): erasing all data, decided by the phone
- [Timed read](./timed.md): a read with a time limit, which every asking here uses
- [Network](./network.md): nearby Wi-Fi, a join through Android's approval, and whether the phone is online
- [Carrier & SIM setup](./carrier.md): the identifiers a carrier asks for, read only when the owner asks

Rows of other areas sit on these pages and are theirs: the update rows
on General (the update area); the listening rows and the "Microphone may be on" notice
(the voice area); sign-in, the plan, the AI provider and the agent's
connection, its Cancel and its restart details (the account area); the
access walkthrough and the crash journal (the startup area); collecting
other apps' notifications, their history and recovering notification data
(the notices area); Google Calendar and its saved-event backups (the
calendar area); the password manager and its provider (the passwords
area); the conversations (Ask Alpha); and each phone action's custody (the
approvals area). Browser, Files and Messages on the Apps page open the app itself
through the [shell](../shell/). Messages is listed on an Alpha image.

## Story: Find a setting and come back

> As the owner, I want every setting on a page I can reach in a few taps,
> and Back to return me to the row I left.

### Settings is a small tree of pages, each with one parent

General holds Display, Sound, Notifications, Battery and, on a phone,
Network and Carrier & SIM setup, and on an Alpha image, Phone. Privacy
holds Permissions. Apps holds a page for each app with something to set:
Inbox, Workflows, Calendar, Camera, Photos, Maps and Notes. About holds
Agent activity and the Licences. Developer and its Problem log hang from
the first page.

```quint
import facts as F from "./facts"

type Page = Top | General | Display | Sound | Notifications | Battery | NetworkPage | CarrierPage | PhonePage | Privacy | Permissions | Apps | InboxApp | WorkflowsApp | CalendarApp | CameraApp | PhotosApp | MapsApp | NotesApp | About | Activity | Licences | Developer | Problems

pure def parent(page: Page): Page =
  if (page == Display or page == Sound or page == Notifications or page == Battery or page == NetworkPage or page == CarrierPage or page == PhonePage) General
  else if (page == Permissions) Privacy
  else if (page == InboxApp or page == WorkflowsApp or page == CalendarApp or page == CameraApp or page == PhotosApp or page == MapsApp or page == NotesApp) Apps
  else if (page == Activity or page == Licences) About
  else if (page == Problems) Developer
  else Top

pure def depth(page: Page): int = if (page == Top) 0 else if (parent(page) == Top) 1 else 2

pure def onTheWay(page: Page, target: Page): bool = page == target or page == parent(target) or page == Top
```

### Each page is one step below its parent, and none is more than two steps from the first

```quint
pure def lawEachPageIsOneStepBelowItsParent(page: Page): bool =
  depth(Top) == 0 and depth(page) <= 2 and (page != Top implies depth(parent(page)) == depth(page) - 1)
```

### Settings remembers the page showing, the row focused on each page on the way to it, and what the build and the phone are

The places are the rows focused on the pages from the first to the one
showing, one for each step. Nothing here outlives Alpha: after a restart
Settings opens at its first page.

```quint
type Settings = { page: Page, places: List[int], told: bool, development: bool, phone: bool, image: bool }

pure val initial: Settings = { page: Top, places: List(0), told: false, development: false, phone: false, image: false }

pure def row(s: Settings, page: Page): int =
  if (onTheWay(page, s.page)) s.places.nthOr(depth(page), 0) else 0

pure def atTop(page: Page): List[int] =
  if (depth(page) == 0) List(0) else if (depth(page) == 1) List(0, 0) else List(0, 0, 0)

pure def refocused(places: List[int], focused: int): List[int] =
  places.removeAt(places.length() - 1).append(focused)
```

### The build says once whether it is a development build, and the phone whether Alpha runs on a phone and on an Alpha image

The Developer page and its Problem log exist only in a development build,
Network and Carrier & SIM setup only on a phone, which a browser is not,
and the Phone page only on an Alpha image, which is a phone. What the build
and the phone are never changes while Alpha runs. A development build is
the development server or a build that allows test mocks
([platform](../platform/index.md)); a production build, a release or a
debug one, never shows the developer pages or their controls.

```quint
pure def admitted(s: Settings, page: Page): bool =
  if (page == Developer or page == Problems) s.development
  else if (page == NetworkPage or page == CarrierPage) s.phone
  else if (page == PhonePage) s.image
  else true

pure def canAdmit(s: Settings, development: bool, phone: bool, image: bool): bool = not(s.told) and (image implies phone)

pure def admit(s: Settings, development: bool, phone: bool, image: bool): Settings =
  { ...s, told: true, development: development, phone: phone, image: image }

pure def stepTheBuildIsToldOnce(before: Settings, after: Settings): bool =
  before.told implies (after.told and after.development == before.development and after.phone == before.phone and after.image == before.image)
```

### Before the build has said what it is, it admits no page that needs it, and an Alpha image is always a phone

```quint
pure def alwaysNothingIsAdmittedUntold(s: Settings): bool =
  (not(s.told) implies (not(s.development) and not(s.phone) and not(s.image))) and (s.image implies s.phone)
```

### Every page showing is one this build and phone admit

```quint
pure def alwaysEveryPageShownIsAdmitted(s: Settings): bool = admitted(s, s.page)
```

### A row opens only an admitted page that hangs from the page showing, at its top

```quint
pure def canOpen(s: Settings, page: Page): bool = page != Top and parent(page) == s.page and admitted(s, page)

pure def open(s: Settings, page: Page): Settings = { ...s, page: page, places: s.places.append(0) }
```

### A notice or Ask Alpha may open a section directly, at its top, and Back from it goes to its parent

Opening Settings from Home shows the first page. A notice or Ask Alpha may
open General, Display, Sound, Notifications, Battery, Privacy, Permissions,
Apps, the Inbox, Workflows and Calendar pages, or About; the account
section is the account area's. The developer pages, the Phone page,
Network, Carrier & SIM setup, Agent activity and the licences
are never opened this way. Opening a page is all
the agent may do here: what it changes is the owner's to change
([Preferences](./preferences.md)).

```quint
pure def addressable(page: Page): bool =
  page == Top or page == General or page == Display or page == Sound or page == Notifications or page == Battery
    or page == Privacy or page == Permissions or page == Apps or page == InboxApp or page == WorkflowsApp
    or page == CalendarApp or page == About

pure def canOpenSection(s: Settings, page: Page): bool = addressable(page)

pure def openSection(s: Settings, page: Page): Settings = { ...s, page: page, places: atTop(page) }
```

### The owner's place on a page is the row focused there

```quint
pure val focusedValues = Set(-1, 0, 2)

pure def canFocus(s: Settings, focused: int): bool = focused >= 0

pure def focus(s: Settings, focused: int): Settings = { ...s, places: refocused(s.places, focused) }
```

### Back shows the parent and forgets the page it closed

On the first page there is nothing to go back to inside Settings: the
shell's Back leaves the app.

```quint
pure def canGoBack(s: Settings): bool = s.page != Top

pure def goBack(s: Settings): Settings =
  { ...s, page: parent(s.page), places: s.places.removeAt(s.places.length() - 1) }
```

### Whenever a page closes, other than by opening a section directly, its parent shows at the row the owner left

```quint
pure def stepAClosedPageReturnsToTheRowLeft(before: Settings, via: str, after: Settings): bool =
  after.places.length() < before.places.length() implies
    (via == "openSection" or (after.page == parent(before.page) and after.places == before.places.removeAt(before.places.length() - 1)))
```

### Whenever a page opens by a row, it starts at its top and the page behind keeps its row

```quint
pure def stepOpeningKeepsThePlaceBehind(before: Settings, via: str, after: Settings): bool =
  after.places.length() > before.places.length() implies
    (via == "openSection" or (parent(after.page) == before.page and after.places == before.places.append(0)))
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

### The Problem log can be showing in a development build

```quint
pure def sometimesProblemLogShowing(s: Settings): bool = s.page == Problems
```

### The Phone page can be showing on an Alpha image

```quint
pure def sometimesPhonePageShowing(s: Settings): bool = s.page == PhonePage
```

### Carrier & SIM setup is a sensitive screen, and only on a phone

While it shows, the identifiers stay on the phone: the assistant is told
only that the screen is sensitive, and admits nothing that acts on it
([assistant](../assistant/index.md)). No other page of Settings is
sensitive.

```quint
pure def sensitive(s: Settings): bool = s.page == CarrierPage

pure def alwaysASensitivePageIsOnAPhone(s: Settings): bool = sensitive(s) implies s.phone
```

### Carrier & SIM setup can be showing on a phone that is no Alpha image

```quint
pure def sometimesCarrierOnALauncher(s: Settings): bool = s.page == CarrierPage and not(s.image)
```

## Story: Reach what another area owns

> As the owner, I want Settings to take me to my account, my Google
> accounts, my calendar, my passwords, the apps whose notifications Alpha
> collects, the listener, my conversations and the access walkthrough,
> without keeping a copy of them.

### Each page links to what another area owns there

Account and plan is on the first page. Google and email is on the Inbox
page, Google Calendar and its saved events on the Calendar page, and the
password manager on Apps. Collecting other apps' notifications, with its
history, is on Notifications. The listener is on Privacy, and on the first
page while the voice area reports that it could not confirm the microphone
stopped. The conversations are on Agent activity, and in a development
build the agent's restart details too and, on Developer, the calendar's
backups. Settings hands over and keeps nothing.

```quint
type Neighbour = AccountAndPlan | GoogleAndEmail | CalendarAccount | PasswordManager | NotificationCollection | Listener | Conversations | RestartDetails | CalendarBackups

type Effect = Handed({ neighbour: Neighbour }) | ReviewAccess({ access: F::Access }) | ReviewAllAccess
type Moved = { state: Settings, out: List[Effect] }

pure def links(s: Settings, neighbour: Neighbour, micMayBeOn: bool): bool =
  if (neighbour == AccountAndPlan) s.page == Top
  else if (neighbour == GoogleAndEmail) s.page == InboxApp
  else if (neighbour == CalendarAccount) s.page == CalendarApp
  else if (neighbour == PasswordManager) s.page == Apps
  else if (neighbour == NotificationCollection) s.page == Notifications
  else if (neighbour == Listener) s.page == Privacy or (s.page == Top and micMayBeOn)
  else if (neighbour == Conversations) s.page == Activity
  else if (neighbour == RestartDetails) s.page == Activity and s.development
  else s.page == Developer

pure def canHandOver(s: Settings, neighbour: Neighbour, micMayBeOn: bool): bool = links(s, neighbour, micMayBeOn)

pure def handOver(s: Settings, neighbour: Neighbour, micMayBeOn: bool): Moved = { state: s, out: List(Handed({ neighbour: neighbour })) }
```

### Set up Alpha access opens all permissions in review, and each row on Permissions opens that one access

The startup area owns the walkthrough. Settings never asks it to start
over, so a walkthrough already finished stays finished.

```quint
pure def canReviewAllAccess(s: Settings): bool = s.page == Privacy

pure def reviewAllAccess(s: Settings): Moved = { state: s, out: List(ReviewAllAccess) }

pure def canReviewAccess(s: Settings, access: F::Access): bool = s.page == Permissions

pure def reviewAccess(s: Settings, access: F::Access): Moved = { state: s, out: List(ReviewAccess({ access: access })) }

pure def stepTheWalkthroughOnlyReviewsOneAccess(before: Settings, after: Settings, out: List[Effect]): bool =
  out.every(e => match e {
    | ReviewAccess(r) => out.length() == 1 and before.page == Permissions
    | ReviewAllAccess => out.length() == 1 and before.page == Privacy
    | _ => true
  })
```

### Handing over changes nothing in Settings

```quint
pure def stepHandingOverKeepsSettings(before: Settings, after: Settings, out: List[Effect]): bool =
  out.length() > 0 implies (after == before and out.length() == 1)
```

### A development build can show the agent's restart details

```quint
pure def sometimesRestartDetailsOffered(s: Settings): bool = canHandOver(s, RestartDetails, false)
```
