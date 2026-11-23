# Network

Nearby Wi-Fi, a join through Android's "Save this network?" approval, and whether the phone is
online, on the shared `ElizaWiFi` bridge. Android keeps the saved networks: a network it already saved
is selected in its Internet panel, and the passphrase, when one is needed, goes from a masked field
straight to Android's dialog and never into what Settings keeps.

## Story: Join a nearby network

> As the owner, I see the networks around me, pick one, and Android asks me to save it; I see
> whether it connected, needs a sign-in page, or was already saved.

### A scan needs precise location and Location on, and offers one row per network name

Each row carries the security Android parsed from the scan; a row without one is WPA2 when it is
secured and open otherwise, which is what Android assumes for a join without a security type.

```quint
type Scan = NotScanned | Scanning | Found | NeedsLocation | LocationOff | ScanUnavailable
type Security = OpenNet | EnhancedOpen | Wpa2 | Wpa3 | Enterprise | Wep
type Nearby = { name: str, secured: bool, joinable: bool, strength: int, security: Security }
type JoinPhase = JoinIdle | AwaitingAndroid | Joined | Portal | Declined | Unverified | NotConnected | WrongPassword | AlreadySaved | JoinInvalid | JoinUnsupported
type Online = OnlineUnknown | Offline | Validated | BehindPortal | UnvalidatedOnline
type Network = { scan: Scan, networks: List[Nearby], join: JoinPhase, network: str, secured: bool, online: Online, panel: bool }
pure val initial: Network = { scan: NotScanned, networks: List(), join: JoinIdle, network: "", secured: false, online: OnlineUnknown, panel: false }
pure val networksValues = Set(List()).union(Set(List({ name: "home", secured: true, joinable: true, strength: -50, security: Wpa3 })))
pure def canBeginScan(n: Network): bool = n.scan != Scanning
pure def beginScan(n: Network): Network = { ...n, scan: Scanning }
pure def canScanAnswered(n: Network, scan: Scan, networks: List[Nearby]): bool =
  n.scan == Scanning and scan != Scanning and scan != NotScanned and (scan != Found implies networks.length() == 0)
pure def scanAnswered(n: Network, scan: Scan, networks: List[Nearby]): Network = { ...n, scan: scan, networks: networks }
pure def alwaysNetworksOnlyFromAScan(n: Network): bool = n.networks.length() > 0 implies n.scan == Found
pure def sometimesFound(n: Network): bool = n.scan == Found and n.networks.length() >= 1
```

### A join is one request at a time, and a passphrase fits its security before Android is asked

Open and Enhanced Open take none, WPA2 8 to 63 printable characters and WPA3 1 to 63; enterprise
and WEP networks are joined in Android's settings.

```quint
pure def passphraseFits(security: Security, characters: int, printable: bool): bool =
  if (security == OpenNet or security == EnhancedOpen) characters == 0
  else if (security == Wpa2) printable and characters >= 8 and characters <= 63
  else if (security == Wpa3) printable and characters >= 1 and characters <= 63
  else false
pure def waiting(n: Network): bool = n.join == AwaitingAndroid
pure def canRequestJoin(n: Network, name: str, security: Security, characters: int, printable: bool): bool = not(waiting(n)) and name != ""
pure def requestJoin(n: Network, name: str, security: Security, characters: int, printable: bool): Network =
  if (passphraseFits(security, characters, printable)) { ...n, join: AwaitingAndroid, network: name, secured: characters > 0 }
  else { ...n, join: JoinInvalid, network: name, secured: characters > 0 }
pure def lawAJoinWithoutAFittingPassphraseIsRefused(security: Security): bool = not(passphraseFits(security, 0, true)) or security == OpenNet or security == EnhancedOpen
pure def alwaysAJoinNamesItsNetwork(n: Network): bool = n.join != JoinIdle implies n.network != ""
```

### Only Android's answer for the requested network settles the join

A network Android already saved is selected in its Internet panel.

```quint
pure def canJoinAnswered(n: Network, answer: JoinPhase): bool =
  waiting(n) and answer != JoinIdle and answer != AwaitingAndroid and answer != JoinInvalid
pure def joinAnswered(n: Network, answer: JoinPhase): Network = { ...n, join: answer, panel: answer == AlreadySaved }
pure def stepAWrongPasswordNeedsAPassphrase(before: Network, via: str, after: Network): bool =
  (via == "joinAnswered" and after.join == WrongPassword) implies before.secured
pure def sometimesAlreadySaved(n: Network): bool = n.join == AlreadySaved and n.panel
pure def sometimesBehindAPortal(n: Network): bool = n.join == Portal
```

## Story: See whether I am online

> As the owner, I see whether the phone reaches the Internet, needs a sign-in page, or is offline,
> as Android reports it for the active network.

### A connectivity read shows Android's own flags, and an unanswered read is unknown

```quint
pure def connectivityOf(answered: bool, online: bool, validated: bool, portal: bool): Online =
  if (not(answered)) OnlineUnknown else if (portal) BehindPortal else if (not(online)) Offline
  else if (validated) Validated else UnvalidatedOnline
pure def connectivityRead(n: Network, answered: bool, online: bool, validated: bool, portal: bool): Network =
  { ...n, online: connectivityOf(answered, online, validated, portal) }
pure def lawAnUnansweredReadIsUnknown(online: bool, validated: bool, portal: bool): bool =
  connectivityOf(false, online, validated, portal) == OnlineUnknown
```

### The Internet panel opens on request and reports only that Android took it

```quint
pure def openPanel(n: Network): Network = { ...n, panel: true }
pure def panelClosed(n: Network): Network = { ...n, panel: false }
```
