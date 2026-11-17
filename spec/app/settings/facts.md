# Facts

What Settings says about the phone: Wi-Fi, Bluetooth, mobile data, the
battery, sound, Alpha's alerts and their channels, the permissions Alpha
holds, the Home and Assistant roles, and the versions of Alpha and Android.
Alpha cannot change any of them here. It reads them, says what the phone
reported, and hands over to Android's own settings for the rest
([Settings](./index.md)). The one request it makes is Set as Home.

## Story: See what the phone says

> As the owner, I want each row to say what the phone reported the last
> time it was asked, or that it is unavailable, and never a guess.

### Settings keeps whether it is showing, which facts the last answer reported, under the ticket of that asking

One asking reads every fact. The phone reports the ones it could read; who
holds the Home and Assistant roles, and whether this build can be the Home
app, come with the roles.

```quint
import read as R from "../../kit/read"

type Fact = Wifi | Bluetooth | MobileData | Battery | Sound | Alerts | Permissions | Roles | Versions
type Holder = NotAlpha | AnotherApp | Alpha | NoSuchRole

type Facts = {
  showing: bool, read: R::Read, due: int, taken: int, reported: List[Fact],
  home: Holder, assistant: Holder, launcher: bool,
  request: R::Read,
}

type Effect = ReadPhone({ ticket: int }) | RequestHome({ request: int })
type Asked = { state: Facts, out: List[Effect] }

pure val initial: Facts = {
  showing: false, read: R::unread, due: 0, taken: 0, reported: List(),
  home: NotAlpha, assistant: NotAlpha, launcher: false,
  request: R::unread,
}

pure def has(reported: List[Fact], fact: Fact): bool = reported.some(f => f == fact)
```

### Opening Settings, coming back to it and Refresh each read the phone again

Each asking takes the next ticket and has ten seconds to be answered. What
the last answer reported stays on screen until the new one arrives.

```quint
pure val readLimit = 10
pure val atValues = Set(0, 4, 20)

pure def look(at: int, s: Facts): Asked =
  val asking = R::ask(s.read)
  { state: { ...s, read: asking, due: at + readLimit }, out: List(ReadPhone({ ticket: asking.ticket })) }

pure def show(s: Facts, at: int): Asked = look(at, { ...s, showing: true })

pure def canLeaveSettings(s: Facts): bool = s.showing

pure def leaveSettings(s: Facts): Facts = { ...s, showing: false }

pure def canRefresh(s: Facts, at: int): bool = s.showing

pure def refresh(s: Facts, at: int): Asked = look(at, s)
```

### Alpha coming back to the front reads the phone again if Settings is showing

The owner may have changed something in Android's settings meanwhile. If
Settings is not showing, the next opening reads.

```quint
pure def resume(s: Facts, at: int): Asked =
  if (s.showing) look(at, s) else { state: s, out: List() }

pure def stepResumingReadsWhatIsShowing(before: Facts, via: str, after: Facts): bool =
  (via == "resume" and before.showing) implies after.read.ticket == before.read.ticket + 1
```

### The phone is read only while Settings is showing

```quint
pure def stepReadsOnlyWhileShowing(before: Facts, after: Facts): bool =
  after.read.ticket != before.read.ticket implies after.showing
```

### Only the newest asking's answer is taken, and it replaces everything shown

A fact the phone did not report is unavailable, whatever an earlier answer
said. An answer that reports nothing leaves the read failed. Roles the
phone did not report are never shown as held.

```quint
pure val ticketValues = Set(1, 2, 3)
pure val reportedValues = Set(List(), List(Wifi, Battery), List(Roles), List(Wifi, Bluetooth, MobileData, Battery, Sound, Alerts, Permissions, Roles, Versions))

pure def canAnswered(s: Facts, ticket: int): bool = R::canAnswer(s.read, ticket)

pure def answered(s: Facts, ticket: int, reported: List[Fact], home: Holder, assistant: Holder, launcher: bool): Facts =
  val roles = has(reported, Roles)
  {
    ...s, read: R::answer(s.read, reported.length() > 0), taken: ticket, reported: reported,
    home: if (roles) home else NotAlpha, assistant: if (roles) assistant else NotAlpha, launcher: roles and launcher,
  }
```

### A read not answered within ten seconds is abandoned, and every fact is then unavailable

Its answer, if it comes later, is refused.

```quint
pure val nowValues = Set(0, 4, 20, 40)

pure def canAbandon(s: Facts, now: int): bool = s.read.status == R::Loading and now >= s.due

pure def abandon(s: Facts, now: int): Facts =
  { ...s, read: R::answer(s.read, false), taken: s.read.ticket, reported: List(), home: NotAlpha, assistant: NotAlpha, launcher: false }
```

### Every read of the phone ends, answered or abandoned, so no row waits for ever

```quint
pure def leadsToAReadEnds(s: Facts, later: Facts): bool =
  s.read.status == R::Loading implies later.read.status != R::Loading

pure val fair_abandon = "weak"
```

### A row waits before the first answer, then says what the phone reported or that it is unavailable

```quint
type Word = Waiting | Reported | Unavailable

pure def word(s: Facts, fact: Fact): Word =
  if (s.taken == 0) Waiting else if (has(s.reported, fact)) Reported else Unavailable
```

### Nothing is shown as a fact before an answer, or after a read failed

```quint
pure def alwaysOnlyReportedFactsAreShown(s: Facts): bool =
  (s.taken == 0 or s.read.status == R::Failed) implies s.reported.length() == 0
```

### What is shown came from an asking of Alpha's own, and from the newest one once nothing is in flight

```quint
pure def alwaysShownIsFromTheNewestSettledAsking(s: Facts): bool =
  0 <= s.taken and s.taken <= s.read.ticket
    and (s.read.status == R::Loading implies s.taken < s.read.ticket)
    and ((s.read.status == R::Loaded or s.read.status == R::Failed) implies s.taken == s.read.ticket)
    and (s.read.status == R::Idle implies s.taken == 0)
```

### A newer answer is never replaced by an older one

```quint
pure def stepFactsNeverGoBack(before: Facts, after: Facts): bool = after.taken >= before.taken
```

### Only an answer, or abandoning the read, changes what is shown

Asking again, and asking for the Home role, change nothing on screen.

```quint
pure def sameShown(before: Facts, after: Facts): bool =
  after.taken == before.taken and after.reported == before.reported
    and after.home == before.home and after.assistant == before.assistant and after.launcher == before.launcher

pure def stepOnlyAnAnswerChangesWhatIsShown(before: Facts, via: str, after: Facts): bool =
  (via != "answered" and via != "abandon") implies sameShown(before, after)
```

### Every asking is sent to the phone once, under its own ticket

```quint
pure def isReadPhone(e: Effect): bool = match e { | ReadPhone(r) => true | _ => false }

pure def stepEveryAskingIsSent(before: Facts, after: Facts, out: List[Effect]): bool =
  if (after.read.ticket == before.read.ticket) not(out.some(e => isReadPhone(e)))
  else
    after.read.status == R::Loading and out.length() == 1
      and out.every(e => match e { | ReadPhone(r) => r.ticket == after.read.ticket | _ => false })
```

### A fact can be unavailable beside one that was reported

```quint
pure def sometimesOneFactIsUnavailable(s: Facts): bool =
  word(s, Battery) == Reported and word(s, Roles) == Unavailable
```

### A read can be abandoned while an older answer was on screen

```quint
pure def sometimesAReadWasAbandoned(s: Facts): bool = s.read.status == R::Failed and s.taken > 1
```

## Story: Make Alpha the Home app

> As the owner, I want to make Alpha my Home app from Settings, and to see
> afterwards what Android says, not what Alpha hoped.

### A role is held by Alpha, by another app or not by Alpha, or this phone has no such role

An unread role is unavailable. Android does not always say who else holds
a role, so Alpha never claims that no app does. The Assistant role is
changed in Android's default apps.

```quint
type RoleWord = RoleWaiting | RoleUnavailable | NotOnThisPhone | HeldByAlpha | HeldByAnother | NotHeldByAlpha

pure def roleWord(s: Facts, holder: Holder): RoleWord =
  if (word(s, Roles) == Waiting) RoleWaiting
  else if (word(s, Roles) == Unavailable) RoleUnavailable
  else if (holder == NoSuchRole) NotOnThisPhone
  else if (holder == Alpha) HeldByAlpha
  else if (holder == AnotherApp) HeldByAnother
  else NotHeldByAlpha
```

### A role the phone did not report is never shown as held

```quint
pure def alwaysUnreadRolesAreNotHeld(s: Facts): bool =
  not(has(s.reported, Roles)) implies (s.home == NotAlpha and s.assistant == NotAlpha and not(s.launcher))
```

### Set as Home is offered when the phone reported a Home role that Alpha can take and does not hold, one request at a time

Android shows its own dialog.

```quint
pure def canRequestHome(s: Facts): bool =
  s.showing and s.launcher and (s.home == NotAlpha or s.home == AnotherApp) and s.request.status != R::Loading

pure def requestHome(s: Facts): Asked =
  val asking = R::ask(s.request)
  { state: { ...s, request: asking }, out: List(RequestHome({ request: asking.ticket })) }
```

### When Android's dialog closes, the phone is read again, and the role shown is what that read reports

Alpha never takes the dialog's result as the role. If Settings is no longer
showing, the next opening reads.

```quint
pure val requestValues = Set(1, 2)

pure def canHomeRequestEnded(s: Facts, request: int): bool = R::canAnswer(s.request, request)

pure def homeRequestEnded(s: Facts, request: int, at: int): Asked =
  val ended = { ...s, request: R::answer(s.request, true) }
  if (s.showing) look(at, ended) else { state: ended, out: List() }

pure def stepARoleRequestIsReadBack(before: Facts, via: str, after: Facts): bool =
  (via == "homeRequestEnded" and before.showing) implies (after.read.ticket == before.read.ticket + 1 and sameShown(before, after))
```

### Android is asked for the Home role only by Set as Home, and never twice at once

```quint
pure def isRequestHome(e: Effect): bool = match e { | RequestHome(r) => true | _ => false }

pure def stepOneHomeRequestAtATime(before: Facts, via: str, after: Facts, out: List[Effect]): bool =
  if (out.some(e => isRequestHome(e)))
    via == "requestHome" and before.request.status != R::Loading and out.length() == 1
      and out.every(e => match e { | RequestHome(r) => r.request == after.request.ticket | _ => false })
  else via != "requestHome"
```

### Alpha can become the Home app

```quint
pure def sometimesAlphaIsHome(s: Facts): bool = s.home == Alpha and s.request.status == R::Loaded
```

### Set as Home can be waiting on Android

```quint
pure def sometimesHomeRequestInFlight(s: Facts): bool = s.request.status == R::Loading
```
