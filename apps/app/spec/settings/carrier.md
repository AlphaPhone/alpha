# Carrier & SIM setup

Settings → General → Carrier & SIM setup (PRD AP-12): the facts a carrier asks for when the owner
activates a SIM, on any Android phone. Each modem slot's IMEI and SIM state, read before a SIM is
inserted; each active SIM's carrier, ICCID, operator and data state; the default SMS and phone apps;
the phone's hardware; and, on a separate request, the eSIM's EID. Android decides what the launcher
may read: a fact it withholds shows as denied, unsupported or unavailable, never as a made-up value,
and the page hands off to Android's own About phone, SIM, mobile network and APN screens. The page
changes no plan, SIM, network or APN, and a value it shows does not establish that a carrier
accepts the phone or that calls and data work.

## Domain

### The page holds what the latest read returned, and nothing until the owner asks

`epoch` moves with every read and every forget, so only the latest read answers. A fact is a status
and, only when Android returned it, a value. The native read is `AlphaCarrierSetup.read`; the EID is
`AlphaCarrierSetup.readEid`; both answer only while Alpha is in front on an unlocked phone.

```quint
type FactStatus = Available | Denied | Unsupported | Unreadable | NotRead
type Fact = { status: FactStatus, value: str }
type ModemSlot = { slot: int, imei: Fact, simState: Fact }
type ActiveSim = {
  subscription: int, slot: int, embedded: bool, defaultData: bool, carrier: Fact, simName: Fact, iccid: Fact,
  operator: Fact, operatorCode: Fact, dataEnabled: Fact, dataState: Fact, networkType: Fact, roaming: Fact
}
type Hardware = { manufacturer: Fact, model: Fact, device: Fact, android: Fact, baseband: Fact }
type Reading = {
  aospImage: bool, canChooseSms: bool, smsRole: Fact, dialerRole: Fact, slots: List[ModemSlot],
  sims: FactStatus, active: List[ActiveSim], eid: Fact, hardware: Hardware
}
type CarrierPhase = CarrierIdle | CarrierReading | CarrierShown | CarrierFailed
type CarrierSetup = { epoch: int, phase: CarrierPhase, eidReading: bool, reading: Reading }
pure val notRead: Fact = { status: NotRead, value: "" }
pure val unreadHardware: Hardware = { manufacturer: notRead, model: notRead, device: notRead, android: notRead, baseband: notRead }
pure val nothingRead: Reading = {
  aospImage: false, canChooseSms: false, smsRole: notRead, dialerRole: notRead, slots: List(),
  sims: NotRead, active: List(), eid: notRead, hardware: unreadHardware
}
pure val initial: CarrierSetup = { epoch: 0, phase: CarrierIdle, eidReading: false, reading: nothingRead }
pure def fact(value: str): Fact = { status: Available, value: value }
pure val ticketValues = Set(0, 1, 2, 3)
pure val readingValues = Set(
  { ...nothingRead, smsRole: fact("Alpha Phone is not the default SMS app"), eid: { status: NotRead, value: "" },
    slots: List({ slot: 0, imei: fact("123456789012345"), simState: fact("No SIM") }, { slot: 1, imei: { status: Denied, value: "" }, simState: fact("No SIM") }),
    sims: Available, hardware: { ...unreadHardware, model: fact("Pixel 10a"), baseband: { status: Unreadable, value: "" } } },
  { ...nothingRead, aospImage: true, canChooseSms: true, eid: { status: Unsupported, value: "" },
    slots: List({ slot: 0, imei: fact("123456789012345"), simState: fact("Ready") }), sims: Available,
    active: List({ subscription: 3, slot: 0, embedded: false, defaultData: true, carrier: fact("Carrier"), simName: fact("Carrier"),
      iccid: fact("8901260000000000000"), operator: fact("Carrier"), operatorCode: fact("310260"), dataEnabled: fact("On"),
      dataState: fact("Connected"), networkType: fact("LTE"), roaming: fact("Not roaming") }) },
  { ...nothingRead, sims: Denied, slots: List({ slot: 0, imei: { status: Denied, value: "" }, simState: { status: Denied, value: "" } }) })
pure val eidValues = Set(fact("89012345678901234567890123456789"), { status: Denied, value: "" }, { status: Unreadable, value: "" })
```

## Story: Get my phone ready for a carrier's SIM

> As the owner activating a SIM, I want this phone's IMEI, SIM state and carrier details when I ask
> for them, each one copyable, and forgotten as soon as I leave the page, so that I can give a
> carrier what it needs without Alpha keeping or sharing it.

### Opening the page reads nothing; Show identifiers reads once, and only the latest read answers

Neither opening the page nor returning to Alpha reads: the owner taps Show identifiers, and again
Refresh identifiers. One read runs at a time. A read starts from nothing, so a failed read never
keeps what an earlier one showed, and a read that answers after a newer read began or after the
page forgot changes nothing.

```quint
pure def canIdentifiersAsked(c: CarrierSetup): bool = c.phase != CarrierReading
pure def identifiersAsked(c: CarrierSetup): CarrierSetup = { ...initial, epoch: c.epoch + 1, phase: CarrierReading }
pure def canIdentifiersRead(c: CarrierSetup, ticket: int, reading: Reading): bool = c.phase == CarrierReading and ticket == c.epoch
pure def identifiersRead(c: CarrierSetup, ticket: int, reading: Reading): CarrierSetup = { ...c, phase: CarrierShown, eidReading: false, reading: reading }
pure def canIdentifiersFailed(c: CarrierSetup, ticket: int): bool = c.phase == CarrierReading and ticket == c.epoch
pure def identifiersFailed(c: CarrierSetup, ticket: int): CarrierSetup = { ...initial, epoch: c.epoch, phase: CarrierFailed }
pure def alwaysOnlyAShownReadHoldsFacts(c: CarrierSetup): bool = c.phase != CarrierShown implies c.reading == nothingRead
pure def stepOnlyTheLatestReadAnswers(before: CarrierSetup, via: str, after: CarrierSetup): bool =
  (via == "identifiersRead" or via == "identifiersFailed" or via == "eidRead") implies after.epoch == before.epoch
pure def sometimesIdentifiersShown(c: CarrierSetup): bool = c.phase == CarrierShown and c.reading.slots.length() > 1
pure def sometimesTheReadFailed(c: CarrierSetup): bool = c.phase == CarrierFailed and c.epoch > 1
```

### The EID is a separate, optional read that never holds up the IMEI read

The eSIM's EID is not needed for a physical SIM, and Android's eSIM service can stall, so it is
read only when the owner asks after the identifiers are shown, and not at all on a phone without
an eSIM. Refreshing the identifiers while it runs discards its answer.

```quint
pure def canEidAsked(c: CarrierSetup): bool = c.phase == CarrierShown and not(c.eidReading) and c.reading.eid.status != Unsupported
pure def eidAsked(c: CarrierSetup): CarrierSetup = { ...c, eidReading: true }
pure def canEidRead(c: CarrierSetup, ticket: int, eid: Fact): bool = c.phase == CarrierShown and c.eidReading and ticket == c.epoch
pure def eidRead(c: CarrierSetup, ticket: int, eid: Fact): CarrierSetup = { ...c, eidReading: false, reading: { ...c.reading, eid: eid } }
pure def alwaysAnEidReadNeedsShownIdentifiers(c: CarrierSetup): bool = c.eidReading implies c.phase == CarrierShown
pure def sometimesAnEidShown(c: CarrierSetup): bool = c.reading.eid.status == Available
```

### Leaving the page, the app going to the background or losing focus forgets everything read

Back, another page or app, the screen locking, Alpha losing focus and Android pausing the launcher
all forget, and coming back shows Show identifiers again. What was read is held only in this page's
memory: never stored, logged, put in diagnostics or given to the assistant.

```quint
pure def carrierForgotten(c: CarrierSetup): CarrierSetup = { ...initial, epoch: c.epoch + 1 }
pure def stepForgettingKeepsNothing(before: CarrierSetup, via: str, after: CarrierSetup): bool =
  via == "carrierForgotten" implies (after.phase == CarrierIdle and after.reading == nothingRead and after.epoch > before.epoch)
```

### Only a value Android returned can be copied, one identifier at a time

Copy puts exactly that one IMEI, ICCID or EID on Android's clipboard, and only while the page is
in front; nothing is copied for a denied, unsupported or unavailable fact.

```quint
type Copyable = CopyImei({ slot: int }) | CopyIccid({ subscription: int }) | CopyEid
pure def shownValue(f: Fact): str = if (f.status == Available) f.value else ""
pure def copyable(c: CarrierSetup, what: Copyable): str =
  if (c.phase != CarrierShown) ""
  else match what {
    | CopyImei(x) => c.reading.slots.foldl("", (found, s) => if (s.slot == x.slot) shownValue(s.imei) else found)
    | CopyIccid(x) => c.reading.active.foldl("", (found, sim) => if (sim.subscription == x.subscription) shownValue(sim.iccid) else found)
    | CopyEid => shownValue(c.reading.eid)
  }
pure val fValues = Set(fact("123456789012345"), { status: Denied, value: "" }, { status: Unsupported, value: "x" }, notRead)
pure val whatValues = Set(CopyImei({ slot: 0 }), CopyImei({ slot: 1 }), CopyIccid({ subscription: 3 }), CopyEid)
pure def lawAWithheldFactHasNoValue(f: Fact): bool = f.status != Available implies shownValue(f) == ""
pure def lawNothingCopiesBeforeARead(what: Copyable): bool = copyable(initial, what) == ""
```

### Android's own screens are a tap away, at fixed destinations

About phone (IMEI and device identifiers), SIMs, mobile network, access point names and, while
another app is the default SMS app on the Alpha image, default apps. Where a phone lacks the
specific screen, Android's Settings opens and the page says what to look for there.

```quint
type CarrierScreen = ScreenIdentifiers | ScreenSims | ScreenMobile | ScreenApn | ScreenDefaultSms
pure def screenName(s: CarrierScreen): str =
  if (s == ScreenIdentifiers) "identifiers" else if (s == ScreenSims) "sim" else if (s == ScreenMobile) "mobile"
  else if (s == ScreenApn) "apn" else "default-sms"
pure def lawEveryScreenHasItsOwnName(a: CarrierScreen, b: CarrierScreen): bool = a != b implies screenName(a) != screenName(b)
```
