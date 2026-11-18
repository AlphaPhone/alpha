# Android

The rows that open a page of Android's own settings, from the Settings page
that offers it ([Settings](./index.md)). Android starts the page or says
it could not; Alpha says which.

## Story: Change what only Android can change

> As the owner, I want a row to take me to the right page of Android's
> settings, and to be told when it opened a different page or none.

### Each Android page is offered on the Settings page it belongs to

Android's settings home and accounts and sync are on the first page.
General offers Wi-Fi, Bluetooth, mobile networks, airplane mode, the
screen lock and default apps; Display offers Android's display and
brightness; Sound its sound and Do Not Disturb; Battery the battery saver;
the Phone page default apps. Notifications offers Alpha's alerts, each of
its channels and notification access; the Workflows page its own alerts.
Permissions offers Alpha's permissions and location; the Calendar, Camera,
Maps and Notes pages Alpha's permissions, and the Photos page Alpha's
photo access. About offers Android's About phone, and Developer its
developer options. The password provider is the passwords area's.

```quint
import index as I from "./index"
import read as R from "../../kit/read"
import timed as T from "./timed"

type Target = AndroidHome | AccountsSync | WifiNetworks | BluetoothDevices | MobileNetworks | AirplaneMode | ScreenLock | DefaultApps | DisplaySettings | Brightness | SoundSettings | DoNotDisturb | BatterySaver | AlphaAlerts | AlertChannel | NotificationAccess | WorkflowAlerts | AppPermissions | PhotoPermissions | LocationSettings | AboutPhone | DeveloperOptions

pure def offers(page: I::Page, target: Target): bool =
  if (page == I::Top) target == AndroidHome or target == AccountsSync
  else if (page == I::General)
    target == WifiNetworks or target == BluetoothDevices or target == MobileNetworks or target == AirplaneMode
      or target == ScreenLock or target == DefaultApps
  else if (page == I::Display) target == DisplaySettings or target == Brightness
  else if (page == I::Sound) target == SoundSettings or target == DoNotDisturb
  else if (page == I::Battery) target == BatterySaver
  else if (page == I::PhonePage) target == DefaultApps
  else if (page == I::Notifications) target == AlphaAlerts or target == AlertChannel or target == NotificationAccess
  else if (page == I::WorkflowsApp) target == WorkflowAlerts
  else if (page == I::Permissions) target == AppPermissions or target == LocationSettings
  else if (page == I::CalendarApp or page == I::CameraApp or page == I::MapsApp or page == I::NotesApp) target == AppPermissions
  else if (page == I::PhotosApp) target == PhotoPermissions
  else if (page == I::About) target == AboutPhone
  else if (page == I::Developer) target == DeveloperOptions
  else false
```

### Alpha's alert, permission and photo pages open for Alpha itself, never for another app, and a channel's page names its channel

```quint
type Scope = AlphasOwn | WholePhone

pure def aboutAlpha(target: Target): bool =
  target == AlphaAlerts or target == AlertChannel or target == WorkflowAlerts or target == AppPermissions or target == PhotoPermissions

pure def scopeOf(target: Target): Scope = if (aboutAlpha(target)) AlphasOwn else WholePhone

pure def namesItsChannel(target: Target, channel: int): bool = (target == AlertChannel) == (channel > 0)
```

### Android holds the last start of one of its pages, and what Alpha said about it

Nothing here outlives Alpha.

```quint
type Told = Silent | SaidNearby | SaidUnavailable | SaidNoAnswer
type Android = { start: T::Timed, target: Target, channel: int, told: Told }

type Effect = OpenAndroid({ target: Target, channel: int, scope: Scope, start: int })
type Started = { state: Android, out: List[Effect] }

pure val initial: Android = { start: T::unasked, target: AndroidHome, channel: 0, told: Silent }
```

### One start of an Android page is in flight at a time, from the page that offers it

A start has ten seconds to be answered.

```quint
pure val startLimit = 10
pure val atValues = Set(0, 4, 20)
pure val channelValues = Set(0, 2)

pure def canHandOff(s: Android, page: I::Page, target: Target, channel: int, at: int): bool =
  offers(page, target) and namesItsChannel(target, channel) and not(T::busy(s.start))

pure def handOff(s: Android, page: I::Page, target: Target, channel: int, at: int): Started =
  val asking = T::ask(s.start, at, startLimit)
  {
    state: { ...s, start: asking, target: target, channel: channel, told: Silent },
    out: List(OpenAndroid({ target: target, channel: channel, scope: scopeOf(target), start: asking.read.ticket })),
  }
```

### Android says whether it opened that page, a nearby one, or none

Only mobile networks, airplane mode and Do Not Disturb have a nearby page;
a page Android refused never falls back to its settings home. Alpha says
so when a nearby page opened, and says unavailable when none did.

```quint
type Opened = Exactly | Nearby | NotAtAll

pure val startValues = Set(1, 2, 3)

pure def hasNearby(target: Target): bool = target == MobileNetworks or target == AirplaneMode or target == DoNotDisturb

pure def canAndroidAnswered(s: Android, start: int, opened: Opened): bool =
  T::canAnswer(s.start, start) and (opened == Nearby implies hasNearby(s.target))

pure def androidAnswered(s: Android, start: int, opened: Opened): Android =
  {
    ...s, start: T::answer(s.start, opened != NotAtAll),
    told: if (opened == Nearby) SaidNearby else if (opened == NotAtAll) SaidUnavailable else Silent,
  }
```

### A start not answered within ten seconds is given up, Alpha says Android did not answer, and the owner may try again

Its answer, if it comes later, is refused.

```quint
pure val nowValues = Set(0, 4, 20, 40)

pure def canGiveUpOnAndroid(s: Android, now: int): bool = T::canGiveUp(s.start, now)

pure def giveUpOnAndroid(s: Android, now: int): Android = { ...s, start: T::answer(s.start, false), told: SaidNoAnswer }
```

### Every start of an Android page ends, answered or given up

```quint
pure def leadsToAStartEnds(s: Android, later: Android): bool = T::busy(s.start) implies not(T::busy(later.start))

pure val fair_giveUpOnAndroid = "weak"
```

### Alpha says a nearby page opened only when Android said so, for a page that has one, and unavailable or no answer only for a start that failed

```quint
pure def alwaysAlphaSaysWhatAndroidSaid(s: Android): bool =
  (s.told == SaidNearby implies (s.start.read.status == R::Loaded and hasNearby(s.target)))
    and ((s.told == SaidUnavailable or s.told == SaidNoAnswer) implies s.start.read.status == R::Failed)
    and (T::busy(s.start) implies s.told == Silent)
    and namesItsChannel(s.target, s.channel)
```

### Android is asked to open a page only by its row, alone, for Alpha itself when the page is about Alpha, and never while another start is in flight

```quint
pure def isOpenAndroid(e: Effect): bool = match e { | OpenAndroid(o) => true | _ => false }

pure def stepOneAndroidStartAtATime(before: Android, via: str, after: Android, out: List[Effect]): bool =
  if (out.some(e => isOpenAndroid(e)))
    via == "handOff" and not(T::busy(before.start)) and out.length() == 1
      and out.every(e => match e {
        | OpenAndroid(o) => o.target == after.target and o.start == after.start.read.ticket
            and (aboutAlpha(o.target) implies o.scope == AlphasOwn) and namesItsChannel(o.target, o.channel)
        | _ => false
      })
  else after.start.read.ticket == before.start.read.ticket
```

### Android can open a nearby page

```quint
pure def sometimesANearbyPageOpened(s: Android): bool = s.told == SaidNearby
```

### Android can refuse a page

```quint
pure def sometimesNoPageOpened(s: Android): bool = s.told == SaidUnavailable
```

### A start can go unanswered and be given up

```quint
pure def sometimesAStartGivenUp(s: Android): bool = s.told == SaidNoAnswer
```

### A channel's own page can open

```quint
pure def sometimesAChannelOpened(s: Android): bool = s.target == AlertChannel and s.start.read.status == R::Loaded
```
