# Turn context

What a turn tells the agent about the phone besides the screen the
[conversation](./index.md) tells it: the phone's last known location, the
page open in Browser, what Maps shows, the time zone, the phone actions this
phone can carry out, and whether the owner's words go to a hosted model.
Eliza encodes the turn context (`encodeTurnContext` of
`@elizaos/agent`) and drops what a peer does not declare; no wire
shape is restated here. The location is read through eliza's location
bridge, and the network answer through Alpha's network-location plugin,
only on a phone and only while "Location for Alpha" is on in Settings'
privacy page and Android allows it; Ask Alpha never asks for the
permission itself.

## Story: Let my agent know where I am when I allow it

> As the owner, I want my ordinary chats to carry my last known location
> while Location for Alpha is on, indoors too, so that "near me" and "how
> long to get home" just work without my message waiting for a fix, and I
> want it gone the moment I turn it off.

### The locator holds whether the owner allows it, the time last told, the last GPS fix and the last network answer, each read once under its ticket, and when each may be read again

A turn never waits for the phone's position: it sends what the locator
holds. Times are Alpha's, in milliseconds; a fix or an answer that is none is at -1.
Location for Alpha is on until the owner turns it off.

```quint
import read as R from "../../kit/read"
import extend as X from "./extend"

type Locator = {
  enabled: bool, granted: bool, clock: int,
  gps: R::Read, gpsAt: int, gpsNext: int, network: R::Read, networkAt: int, networkNext: int,
}

pure val initial: Locator = {
  enabled: true, granted: false, clock: 0,
  gps: R::unread, gpsAt: -1, gpsNext: 0, network: R::unread, networkAt: -1, networkNext: 0,
}

pure val reuseMs = 300000
pure val retryMs = 120000
pure val sendableMs = 1800000
pure val networkReuseMs = 900000
pure val networkUnchangedMs = 3600000
pure val networkRetryMs = 120000

pure def allowed(l: Locator): bool = l.enabled and l.granted

pure def gpsCurrent(l: Locator, now: int): bool = l.gpsAt >= 0 and now - l.gpsAt <= sendableMs

pure def networkCurrent(l: Locator, now: int): bool = l.networkAt >= 0 and now - l.networkAt <= networkUnchangedMs

pure def located(l: Locator, now: int): bool = gpsCurrent(l, now) or networkCurrent(l, now)
```

### What the locator needs done outside comes back as an answer naming its ticket

A GPS read, and a lookup of the visible Wi-Fi access points and cell
towers. Only their identities and signal leave the phone, never network
names.

```quint
type Effect = ReadFix({ ticket: int }) | LookUp({ ticket: int })
type Moved = { state: Locator, out: List[Effect] }
```

### What the simulator tries

```quint
pure val nowValues = Set(0, 100000, 400000, 2000000, 4000000)
pure val takenValues = Set(-1, 0, 100000, 350000)
pure val ticketValues = Set(1, 2, 3)
pure val lValues = Set(initial)
  .union(Set({ ...initial, granted: true, clock: 2000000, gpsAt: 0 }))
  .union(Set({ ...initial, granted: true, clock: 100000, gpsAt: 100000, gpsNext: 400000 }))
  .union(Set({ ...initial, granted: true, clock: 4000000, networkAt: 350000 }))
```

### Turning Location for Alpha off, or Android taking the permission away, forgets every fix and answer, and leaves what was being read behind

```quint
pure def forgetting(on: bool, granted: bool, l: Locator): Locator =
  { ...l, enabled: on, granted: granted,
    gps: X::dropped(l.gps), gpsAt: -1, gpsNext: 0, network: X::dropped(l.network), networkAt: -1, networkNext: 0 }

pure def canToggle(l: Locator, on: bool): bool = on != l.enabled

pure def toggle(l: Locator, on: bool): Locator = if (on) { ...l, enabled: true } else forgetting(false, l.granted, l)

pure def canPermit(l: Locator, granted: bool): bool = granted != l.granted

pure def permit(l: Locator, granted: bool): Locator = if (granted) { ...l, granted: true } else forgetting(l.enabled, false, l)
```

### Rough location is enough: a GPS read happens at most every five minutes, and an empty or failed one waits two minutes

```quint
pure def canRead(l: Locator, now: int): bool =
  allowed(l) and now >= l.clock and now >= l.gpsNext and l.gps.status != R::Loading

pure def read(l: Locator, now: int): Moved =
  val gps = R::ask(l.gps)
  { state: { ...l, clock: now, gps: gps, gpsNext: now + retryMs }, out: List(ReadFix({ ticket: gps.ticket })) }

pure def canFixed(l: Locator, ticket: int, ok: bool, taken: int, now: int): bool =
  R::canAnswer(l.gps, ticket) and now >= l.clock and (ok implies (taken >= 0 and taken <= now and now - taken <= reuseMs))

pure def fixed(l: Locator, ticket: int, ok: bool, taken: int, now: int): Locator =
  if (ok) { ...l, clock: now, gps: R::answer(l.gps, true), gpsAt: taken, gpsNext: now + reuseMs }
  else { ...l, clock: now, gps: R::answer(l.gps, false) }
```

### The network is looked up only when GPS has nothing current, and its answer is reused before it is asked again

The resident connection's warm-up, a Maps action or a locate card looks
up, warm, after its GPS read left no current fix. A chat turn never waits
for an answer: only when it has no position at all does it start one
lookup behind it, so the next turn carries the answer. An answer is reused
for fifteen minutes; after that the same visible networks keep it,
confirmed without a request, for up to an hour from when it was resolved; a
failed lookup is not tried again for two minutes. An answer Maps looked up
is the same answer, and a turn carries it too.

```quint
pure def canLookUp(l: Locator, now: int, warm: bool): bool =
  allowed(l) and now >= l.clock and now >= l.networkNext and l.network.status != R::Loading
    and not(gpsCurrent(l, now)) and (warm or not(networkCurrent(l, now)))

pure def lookUp(l: Locator, now: int, warm: bool): Moved =
  val network = R::ask(l.network)
  { state: { ...l, clock: now, network: network, networkNext: now + networkRetryMs }, out: List(LookUp({ ticket: network.ticket })) }

pure def canLooked(l: Locator, ticket: int, ok: bool, taken: int, now: int): bool =
  R::canAnswer(l.network, ticket) and now >= l.clock and (ok implies (taken >= 0 and taken <= now and now - taken <= networkUnchangedMs))

pure def looked(l: Locator, ticket: int, ok: bool, taken: int, now: int): Locator =
  if (ok) { ...l, clock: now, network: R::answer(l.network, true), networkAt: taken, networkNext: now + networkReuseMs }
  else { ...l, clock: now, network: R::answer(l.network, false) }

pure def canConfirm(l: Locator, now: int): bool =
  allowed(l) and now >= l.clock and networkCurrent(l, now) and l.network.status != R::Loading

pure def confirm(l: Locator, now: int): Locator = { ...l, clock: now, networkNext: now + networkReuseMs }
```

### A turn carries the location only while the owner allows it, from a screen that is not sensitive, to a peer that declares it, and only a GPS fix at most thirty minutes old or a network answer that still stands

```quint
pure def sendsLocation(l: Locator, now: int, observed: bool, declares: bool): bool =
  allowed(l) and observed and declares and located(l, now)

pure def lawASensitiveScreenNeverSendsLocation(l: Locator, now: int, declares: bool): bool =
  not(sendsLocation(l, now, false, declares))

pure def lawAnOldFixIsNeverSent(l: Locator, now: int): bool =
  (not(gpsCurrent(l, now)) and not(networkCurrent(l, now))) implies not(sendsLocation(l, now, true, true))
```

### Nothing is kept or read without the owner's leave

```quint
pure def alwaysNothingIsKeptWithoutLeave(l: Locator): bool =
  not(allowed(l)) implies
    (l.gpsAt == -1 and l.networkAt == -1 and l.gps.status != R::Loading and l.network.status != R::Loading)
```

### Reads back off, and what was read is never from the future

```quint
pure def alwaysReadsBackOff(l: Locator): bool =
  l.gpsNext <= l.clock + reuseMs and l.networkNext <= l.clock + networkReuseMs
    and l.gpsAt <= l.clock and l.networkAt <= l.clock and l.gpsAt >= -1 and l.networkAt >= -1
```

### A turn looks up only without a position, and a fresh GPS fix needs no lookup

```quint
pure def lawATurnLooksUpOnlyWithoutAPosition(l: Locator, now: int): bool =
  canLookUp(l, now, false) implies not(located(l, now))

pure def lawAFreshFixNeedsNoLookup(l: Locator, now: int): bool =
  gpsCurrent(l, now) implies not(canLookUp(l, now, true))
```

### Time and tickets never go back

```quint
pure def stepTimeAndTicketsNeverGoBack(before: Locator, via: str, after: Locator): bool =
  after.clock >= before.clock and after.gps.ticket >= before.gps.ticket and after.network.ticket >= before.network.ticket
```

### A location can be sent from a fix or from the network, and turning the setting off forgets it

```quint
pure def sometimesLocationIsSentFromAFix(l: Locator): bool = sendsLocation(l, l.clock, true, true) and gpsCurrent(l, l.clock)

pure def sometimesLocationIsSentFromTheNetwork(l: Locator): bool =
  sendsLocation(l, l.clock, true, true) and not(gpsCurrent(l, l.clock))

pure def sometimesTurnedOffForgetsTheFix(l: Locator): bool = not(l.enabled) and l.gps.ticket >= 1 and l.gpsAt == -1
```

## Story: Tell my agent what my screen shows, and nothing more

> As the owner, I want my agent to know which screen and record I mean, and
> an optional field to go only to an agent that understands it, so that I
> can say "this one" and an older agent still answers; a spoken turn should
> carry what a typed one would.

### The day and the location go only to a peer that takes them, and a sensitive screen sends no optional field

The day on the calendar goes only to the agent that said, on this
connection, that it takes the screen; the location only to one whose turn
observation declares it. A turn retired before it is posted posts nothing,
and the text is sent exactly as written.

```quint
type Peer = { takes: bool, declaresLocation: bool, declaresPage: bool }

pure val peerValues = Set({ takes: true, declaresLocation: true, declaresPage: true },
  { takes: false, declaresLocation: true, declaresPage: false }, { takes: true, declaresLocation: false, declaresPage: false })

pure def sendsDay(observed: bool, onCalendar: bool, peer: Peer): bool = observed and onCalendar and peer.takes

pure def sendsLocationField(observed: bool, peer: Peer): bool = observed and peer.declaresLocation

pure def lawASensitiveScreenSendsNoOptionalField(onCalendar: bool, peer: Peer): bool =
  not(sendsDay(false, onCalendar, peer)) and not(sendsLocationField(false, peer))

pure def lawAPeerThatDoesNotTakeTheScreenGetsNoDay(observed: bool, onCalendar: bool): bool =
  not(sendsDay(observed, onCalendar, { takes: false, declaresLocation: true, declaresPage: true }))
```

### A spoken turn carries what a typed turn sent at that moment would, the view claim included

Each turn of a voice conversation reads the screen again when it is sent:
the observation with its day, location and selected record, the Browser
page beside it, the direct-request mode of approvals, and, from a screen
that is not sensitive, the claim of a view the agent prepares for it. Voice
opens that view as it opens any screen it is asked for, and a saved note
the owner names aloud opens as one named in writing would ([Notes](../notes/index.md),
"The agent opens the one note the owner named, as the list last read it,
once for the owner's current request, and is told whether it opened").

```quint
type Source = Typed | Spoken
type Part = Observation | Page | DirectMode | ViewClaim

pure def carries(source: Source, part: Part, observed: bool, direct: bool): bool =
  if (part == DirectMode) direct else observed

pure def lawASpokenTurnCarriesWhatATypedTurnDoes(part: Part, observed: bool, direct: bool): bool =
  carries(Spoken, part, observed, direct) == carries(Typed, part, observed, direct)

pure def lawASensitiveScreenSendsNoScreen(source: Source, direct: bool): bool =
  not(carries(source, Observation, false, direct)) and not(carries(source, Page, false, direct))
    and not(carries(source, ViewClaim, false, direct))
```

## Story: Let my agent read the page I have open in Browser

> As the owner, when I ask about the page I have open in Browser, I want my
> agent to see its address, title and visible text, never a private tab and
> never once I turned Browser page for Alpha off, so that "summarize this
> page" just works.

### A turn carries the page Browser hands it for the tab in front, beside the observation, only to a peer that declares it

Browser owns the read: which page may be read, how long it waits, the
bounds of what is read, the forms withheld and the links an open may name.
Ask Alpha asks it once per turn, only when the screen is told and a
Browser tab is in front, which is never a private tab; it sends what
Browser handed it unchanged and stores nothing of it. A turn whose page
Browser did not hand over goes without it.

```quint
pure def asksForPage(observed: bool, onBrowser: bool): bool = observed and onBrowser

pure def sendsPage(observed: bool, onBrowser: bool, handed: bool, peer: Peer): bool =
  asksForPage(observed, onBrowser) and handed and peer.declaresPage

pure def lawASensitiveScreenSendsNoPage(handed: bool, peer: Peer): bool = not(sendsPage(false, true, handed, peer))

pure def lawOffBrowserNoPageIsSent(handed: bool, peer: Peer): bool = not(sendsPage(true, false, handed, peer))

pure def lawAPageBrowserWithheldIsNeverSent(peer: Peer): bool = not(sendsPage(true, true, false, peer))
```

## Story: Let my agent see what Maps shows when I ask about it

> As the owner, when I ask about the place or route Maps shows, I want my
> agent to know which one I mean without seeing it, so that it can ask to
> read exactly that one, and only after I approve.

### A turn names the place, route or search Maps shows as its selected object only while Maps is in front and nothing else is selected

Maps names it by an opaque handle and revision that it keeps while the
same selection stays shown, never a place id. Nothing of the place itself
travels with the turn.

```quint
type MapsShown = Nothing | Place | Route | Search

pure def namesMaps(observed: bool, onMaps: bool, otherSelected: bool, shown: MapsShown): bool =
  observed and onMaps and not(otherSelected) and shown != Nothing

pure def lawOffMapsNothingOfMapsIsNamed(shown: MapsShown): bool = not(namesMaps(true, false, false, shown))

pure def lawASensitiveScreenNamesNothingOfMaps(shown: MapsShown): bool = not(namesMaps(false, true, false, shown))

pure def lawAnotherSelectionWins(shown: MapsShown): bool = not(namesMaps(true, true, true, shown))
```

## Story: Be offered only what this phone can do

> As the owner, I want my agent to propose only phone actions this phone
> can carry out, so that a card never asks me for something that cannot
> happen here.

### Every request of Ask Alpha carries the capabilities this phone runs of those the agent offered, and none when it offered none

The agent offers capabilities when the phone enrolls; each area says what
it runs on this build. Every turn, proposal and view request, and every
voice turn, carries the selection, read again for each request; a name the
agent did not offer is never sent, and an empty selection sends nothing.

```quint
pure def sentNames(offered: Set[str], runs: Set[str]): Set[str] = offered.intersect(runs)

pure def sendsCapabilities(offered: Set[str], runs: Set[str]): bool = sentNames(offered, runs).size() > 0

pure val offeredValues = Set(Set(), Set("maps.selected-read.v1"), Set("maps.selected-read.v1", "files.browser.v1"))
pure val runsValues = Set(Set(), Set("maps.selected-read.v1"))

pure def lawOnlyOfferedNamesAreSent(offered: Set[str], runs: Set[str]): bool = sentNames(offered, runs).subseteq(offered)

pure def lawNothingOfferedSendsNothing(runs: Set[str]): bool = not(sendsCapabilities(Set(), runs))
```

## Story: Keep my agent on my clock

> As the owner, I want my agent to read times in the time zone my phone
> shows, so that "at nine" is nine where I am.

### The time zone told is the one the phone's interface shows, else the one the screen reported, else the one the agent was launched with, else the host's

```quint
pure def zoneOf(ui: str, reported: str, launched: str, host: str): str =
  if (ui != "") ui else if (reported != "") reported else if (launched != "") launched else host

pure val uiValues = Set("", "Europe/Paris")
pure val reportedValues = Set("", "Asia/Tokyo")

pure def lawTheZoneShownWins(ui: str, reported: str): bool =
  ui != "" implies zoneOf(ui, reported, "UTC", "UTC") == ui

pure def lawAZoneIsAlwaysTold(ui: str, reported: str): bool = zoneOf(ui, reported, "", "UTC") != ""
```

## Story: Know when my words leave the phone

> As the owner, I want to see when my assistant's answers come from a
> hosted model, so that I know my prompts, the context I share and my
> location go to that provider.

### A hosted provider is named wherever the owner can send, and on-device inference is never claimed for it

With Alpha Cloud or the owner's own key bound as the provider, the empty
chat and the composer name it ("Prompts and the context you share go to
…"); on-device inference names none.

```quint
type Inference = OnDevice | Cloud | OwnKey

pure def disclosed(i: Inference): bool = i != OnDevice

pure def lawAHostedModelIsDisclosed(i: Inference): bool = (i == Cloud or i == OwnKey) implies disclosed(i)

pure def lawOnDeviceIsNotDisclosed(i: Inference): bool = i == OnDevice implies not(disclosed(i))
```
