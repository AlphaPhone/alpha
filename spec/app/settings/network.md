# Network

Nearby Wi-Fi on a phone, on the Network page under General
([Settings](./index.md)): a scan of the networks around, a join through
Android's "Save this network?" approval, and whether the phone is online.
Android keeps the saved networks and decides each join. Alpha keeps no
network: the passphrase, when one is needed, goes from a masked field
straight to Android's approval and is never kept. Android's Internet panel
and its Wi-Fi page are offered on the page ([Android](./android.md)).

## Story: Join a nearby network

> As the owner, I want to see the networks around me, pick one, have
> Android ask me to save it, and see whether it connected, needs a sign-in
> page, or was already saved.

### Network holds the last scan and how many networks it found, a join in flight and how it ended, and the last connectivity read

A scan needs precise location and Location on; the phone says which is
missing. Nothing here outlives Alpha.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Scan = NotScanned | Found | NeedsLocation | LocationOff | ScanUnavailable
type Security = OpenNet | EnhancedOpen | Wpa2 | Wpa3 | Enterprise | Wep
type Joined = NoJoin | Connected | Portal | Declined | Unverified | NotConnected | WrongPassword | AlreadySaved | JoinRefused
type Online = OnlineUnknown | Offline | Validated | BehindPortal | UnvalidatedOnline
type SecretPassphrase = str

type Network = {
  scanning: T::Timed, scan: Scan, found: int,
  joining: T::Timed, joined: Joined, secured: bool,
  reading: T::Timed, online: Online,
}

type Effect =
  ScanNearby({ scan: int })
  | JoinNetwork({ join: int, name: str, security: Security, passphrase: SecretPassphrase })
  | ReadConnectivity({ reading: int })
type Asked = { state: Network, out: List[Effect] }

pure val initial: Network = {
  scanning: T::unasked, scan: NotScanned, found: 0,
  joining: T::unasked, joined: NoJoin, secured: false,
  reading: T::unasked, online: OnlineUnknown,
}

pure val limit = 10000
pure val joinLimit = 60000
pure val atValues = Set(0, 4000, 20000)
pure val nowValues = Set(0, 4000, 20000, 40000, 80000)
```

### Opening the page scans and reads whether the phone is online, each unless already asked, with ten seconds to answer

```quint
pure def scanAgain(at: int, s: Network): Asked =
  val asking = T::ask(s.scanning, at, limit)
  { state: { ...s, scanning: asking }, out: List(ScanNearby({ scan: asking.read.ticket })) }

pure def readAgain(at: int, s: Network): Asked =
  val asking = T::ask(s.reading, at, limit)
  { state: { ...s, reading: asking }, out: List(ReadConnectivity({ reading: asking.read.ticket })) }

pure def opened(s: Network, at: int): Asked =
  val scanned = if (T::busy(s.scanning)) { state: s, out: List() } else scanAgain(at, s)
  val read = if (T::busy(scanned.state.reading)) { state: scanned.state, out: List() } else readAgain(at, scanned.state)
  { state: read.state, out: scanned.out.concat(read.out) }
```

### The owner scans again once the last scan has ended

```quint
pure def canRescan(s: Network, at: int): bool = not(T::busy(s.scanning))

pure def rescan(s: Network, at: int): Asked = scanAgain(at, s)
```

### Only the newest scan's answer is taken: the networks it found, or why it could not scan

```quint
pure val scanValues = Set(1, 2)
pure val foundValues = Set(-1, 0, 3)

pure def canScanned(s: Network, scan: int, result: Scan, found: int): bool =
  T::canAnswer(s.scanning, scan) and result != NotScanned and (if (result == Found) found >= 0 else found == 0)

pure def scanned(s: Network, scan: int, result: Scan, found: int): Network =
  { ...s, scanning: T::answer(s.scanning, result == Found), scan: result, found: found }
```

### A scan not answered within ten seconds is given up, and the phone could not scan

```quint
pure def canGiveUpOnScan(s: Network, now: int): bool = T::canGiveUp(s.scanning, now)

pure def giveUpOnScan(s: Network, now: int): Network = { ...s, scanning: T::answer(s.scanning, false), scan: ScanUnavailable, found: 0 }
```

### Networks are listed only from a scan that found them

```quint
pure def alwaysNetworksComeFromAScan(s: Network): bool = s.found >= 0 and (s.found > 0 implies s.scan == Found)
```

### A passphrase fits its network before Android is asked: none for an open network, 8 to 63 printable characters for WPA2 and 1 to 63 for WPA3

An enterprise or WEP network is joined in Android's own Wi-Fi page. The
page counts the characters typed and whether each is printable.

```quint
pure def fits(security: Security, characters: int, printable: bool): bool =
  if (security == OpenNet or security == EnhancedOpen) characters == 0
  else if (security == Wpa2) printable and characters >= 8 and characters <= 63
  else if (security == Wpa3) printable and characters >= 1 and characters <= 63
  else false

pure def lawAnEnterpriseNetworkIsJoinedInAndroid(characters: int, printable: bool): bool =
  not(fits(Enterprise, characters, printable)) and not(fits(Wep, characters, printable))
```

### The owner joins one network at a time, and Android shows its own approval, with a minute to answer

```quint
pure val nameValues = Set("", "home")
pure val charactersValues = Set(0, 3, 8)
pure val passphraseValues = Set("", "secret12")

pure def canRequestJoin(s: Network, name: str, security: Security, characters: int, printable: bool, passphrase: SecretPassphrase, at: int): bool =
  not(T::busy(s.joining)) and name != "" and fits(security, characters, printable)

pure def requestJoin(s: Network, name: str, security: Security, characters: int, printable: bool, passphrase: SecretPassphrase, at: int): Asked =
  val asking = T::ask(s.joining, at, joinLimit)
  {
    state: { ...s, joining: asking, joined: NoJoin, secured: characters > 0 },
    out: List(JoinNetwork({ join: asking.read.ticket, name: name, security: security, passphrase: passphrase })),
  }
```

### Only Android's answer to the newest join settles it, and the phone is then read again; a wrong password is said only of a join that had one

A network Android already saved is selected in its Internet panel.

```quint
pure val joinValues = Set(1, 2)

pure def canJoinAnswered(s: Network, join: int, joined: Joined, at: int): bool =
  T::canAnswer(s.joining, join) and joined != NoJoin and (joined == WrongPassword implies s.secured)

pure def readAfterJoin(at: int, s: Network): Asked = if (T::busy(s.reading)) { state: s, out: List() } else readAgain(at, s)

pure def joinAnswered(s: Network, join: int, joined: Joined, at: int): Asked =
  readAfterJoin(at, { ...s, joining: T::answer(s.joining, joined == Connected or joined == Portal or joined == AlreadySaved), joined: joined })
```

### A join not answered within a minute is given up, and Alpha cannot tell whether it connected

```quint
pure def canGiveUpOnJoin(s: Network, now: int): bool = T::canGiveUp(s.joining, now)

pure def giveUpOnJoin(s: Network, now: int, at: int): Asked =
  readAfterJoin(at, { ...s, joining: T::answer(s.joining, false), joined: Unverified })
```

### A join's outcome is said only once Android answered it or it was given up

```quint
pure def alwaysAJoinEndsBeforeItIsSaid(s: Network): bool =
  (T::busy(s.joining) implies s.joined == NoJoin) and (s.joined == WrongPassword implies s.secured)
```

### Android is asked to join only by the owner, once per join

```quint
pure def isJoin(e: Effect): bool = match e { | JoinNetwork(j) => true | _ => false }

pure def stepOnlyTheOwnerJoins(before: Network, via: str, after: Network, out: List[Effect]): bool =
  out.some(e => isJoin(e)) implies (via == "requestJoin" and not(T::busy(before.joining)) and out.length() == 1)
```

### Every scan and every join ends

```quint
pure def leadsToAScanEnds(s: Network, later: Network): bool = T::busy(s.scanning) implies not(T::busy(later.scanning))

pure def leadsToAJoinEnds(s: Network, later: Network): bool = T::busy(s.joining) implies not(T::busy(later.joining))

pure val fair_giveUpOnScan = "weak"
pure val fair_giveUpOnJoin = "weak"
```

### Networks can be found, and a scan can need Location

```quint
pure def sometimesNetworksFound(s: Network): bool = s.scan == Found and s.found > 0

pure def sometimesLocationNeeded(s: Network): bool = s.scan == NeedsLocation
```

### A join can need a sign-in page, find the network already saved, or have a wrong password

```quint
pure def sometimesBehindAPortal(s: Network): bool = s.joined == Portal

pure def sometimesAlreadySaved(s: Network): bool = s.joined == AlreadySaved

pure def sometimesWrongPassword(s: Network): bool = s.joined == WrongPassword
```

## Story: See whether I am online

> As the owner, I want to see whether the phone reaches the Internet, needs
> a sign-in page, or is offline, as Android reports it.

### Only the newest read is taken: Android's own flags for the active network, or unknown when it could not say

A network behind a sign-in page is said to be so whatever else Android
reports.

```quint
pure val readingValues = Set(1, 2)

pure def onlineOf(answered: bool, online: bool, validated: bool, portal: bool): Online =
  if (not(answered)) OnlineUnknown else if (portal) BehindPortal else if (not(online)) Offline
  else if (validated) Validated else UnvalidatedOnline

pure def canConnectivityRead(s: Network, reading: int, answered: bool, online: bool, validated: bool, portal: bool): bool =
  T::canAnswer(s.reading, reading)

pure def connectivityRead(s: Network, reading: int, answered: bool, online: bool, validated: bool, portal: bool): Network =
  { ...s, reading: T::answer(s.reading, answered), online: onlineOf(answered, online, validated, portal) }

pure def lawAnUnansweredReadIsUnknown(online: bool, validated: bool, portal: bool): bool =
  onlineOf(false, online, validated, portal) == OnlineUnknown
```

### A read not answered within ten seconds is given up as unknown

```quint
pure def canGiveUpOnReading(s: Network, now: int): bool = T::canGiveUp(s.reading, now)

pure def giveUpOnReading(s: Network, now: int): Network = { ...s, reading: T::answer(s.reading, false), online: OnlineUnknown }

pure def leadsToAReadEnds(s: Network, later: Network): bool = T::busy(s.reading) implies not(T::busy(later.reading))

pure val fair_giveUpOnReading = "weak"
```

### Leaving the page retires what it asked and forgets what it found; a join in flight is Android's and goes on

```quint
pure def canLeave(s: Network): bool = T::busy(s.scanning) or T::busy(s.reading) or s.scan != NotScanned

pure def leave(s: Network): Network =
  { ...s, scanning: T::retire(s.scanning), scan: NotScanned, found: 0, reading: T::retire(s.reading), online: OnlineUnknown }
```

### The phone can be behind a sign-in page

```quint
pure def sometimesPortalRead(s: Network): bool = s.online == BehindPortal
```
