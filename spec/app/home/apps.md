# The phone's apps

What [Home](./index.md) last read of the apps installed on the phone: the
read, the apps it listed, whether a change on the phone is still to be
read, and whether the reading on its way was asked after a refused
opening. The launcher says when to read, and what the owner is told.

## Story: Know what is installed

> As the owner, I want Alpha to know what is installed now, read again
> when the phone's apps change, without reading over and over.

### Home holds the read of the phone's apps, the apps it listed, a change still to read, and whether the reading on its way follows a refused opening

An installed app is named by its package, activity and profile.

```quint
import read as R from "../../kit/read"

type Installed = { read: R::Read, apps: Set[str], pending: bool, quiet: bool }

pure val initial: Installed = { read: R::unread, apps: Set(), pending: false, quiet: false }
```

### What the simulator tries

```quint
pure val listedValues = Set(Set(), Set("clock"), Set("clock", "mail"))
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val installedValues = Set(
  initial,
  { ...initial, read: { status: R::Loaded, ticket: 1 }, apps: Set("clock") },
  { ...initial, read: { status: R::Loading, ticket: 2 }, apps: Set("clock") })
```

### Each reading is asked under the next ticket, and covers every change seen before it

```quint
pure def askApps(a: Installed, quiet: bool): Installed = { ...a, read: R::ask(a.read), pending: false, quiet: quiet }

pure def stepEachReadingTakesTheNextTicket(before: Installed, via: str, after: Installed): bool =
  after.read.ticket != before.read.ticket
    implies (after.read.ticket == before.read.ticket + 1 and after.read.status == R::Loading and not(after.pending))
```

### A change seen while Alpha shows is read at once, unless a reading is on its way; seen while Alpha is away, it waits

Nothing is read again before the apps were first read.

```quint
pure def canChanged(a: Installed, visible: bool): bool = a.read.status != R::Idle

pure def changed(a: Installed, visible: bool): Installed =
  if (visible and a.read.status != R::Loading) askApps(a, false) else { ...a, pending: true }

pure def stepAChangeDuringAReadingWaitsForIt(before: Installed, via: str, after: Installed): bool =
  (via == "changed" and before.read.status == R::Loading) implies after.read == before.read
```

### A change seen while Alpha is away is never read while it is away

```quint
pure def lawAChangeWhileAwayWaitsForTheReturn(installed: Installed): bool =
  canChanged(installed, false) implies (changed(installed, false).read == installed.read and changed(installed, false).pending)
```

### When Alpha comes back to the front, a change that waited is read once

```quint
pure def canResumed(a: Installed): bool = a.pending and a.read.status != R::Loading

pure def resumed(a: Installed): Installed = askApps(a, false)
```

### Only the newest reading is taken; a failed one lists nothing, and a change seen meanwhile is read next if Alpha shows

```quint
pure def canAppsRead(a: Installed, ticket: int): bool = R::canAnswer(a.read, ticket)

pure def appsRead(a: Installed, ticket: int, ok: bool, listed: Set[str], visible: bool): Installed =
  val landed = { ...a, read: R::answer(a.read, ok), apps: if (ok) listed else Set(), quiet: false }
  if (ok and a.pending and visible) askApps(landed, false) else landed
```

### A restart forgets the apps and keeps the ticket rising

```quint
pure def restart(a: Installed): Installed = { ...initial, read: { status: R::Idle, ticket: a.read.ticket } }

pure def stepTicketsOnlyRise(before: Installed, via: str, after: Installed): bool = after.read.ticket >= before.read.ticket
```

### No app is listed before a reading, or after one that failed

```quint
pure def alwaysAppsComeOnlyFromAReading(a: Installed): bool =
  (a.read.status == R::Idle or a.read.status == R::Failed) implies a.apps.size() == 0
```

### A quiet reading is one on its way, asked as quiet

```quint
pure def alwaysAQuietReadingIsOnItsWay(a: Installed): bool = a.quiet implies a.read.status == R::Loading

pure def stepOnlyAQuietAskReadsQuietly(before: Installed, via: str, after: Installed): bool =
  (after.quiet and not(before.quiet)) implies via == "askApps"
```

### The phone's apps can be listed, unreadable, none at all, kept up while read again, or changed while Alpha was away

```quint
pure def sometimesAppsAreListed(a: Installed): bool = a.read.status == R::Loaded and a.apps.size() > 1

pure def sometimesAppsAreUnreadable(a: Installed): bool = a.read.status == R::Failed

pure def sometimesNoAppIsInstalled(a: Installed): bool = a.read.status == R::Loaded and a.apps.size() == 0

pure def sometimesAListIsReadAgain(a: Installed): bool = a.read.status == R::Loading and a.apps.size() > 0

pure def sometimesAChangeWaits(a: Installed): bool = a.pending and a.read.status == R::Loaded
```
