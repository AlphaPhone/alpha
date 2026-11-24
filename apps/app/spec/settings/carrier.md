# Carrier & SIM setup

Settings → General → Carrier & SIM setup on the phone (PRD AP-12): what a carrier asks for to
activate a SIM on this phone. Only when the owner taps Show identifiers does Alpha read, through
`AlphaCarrierSetup`, the IMEI and SIM state of each modem slot (with or without a SIM in it), each
active SIM's carrier, ICCID, network operator, MCC/MNC, mobile data and roaming, which apps hold
the SMS and phone roles, and the hardware and baseband. The eSIM's EID is a separate, optional read,
so an eSIM service that never answers cannot hold up a physical SIM's setup. Each value shows what
Android returned or why it did not. Values live only in this page's memory while it is in front on
an unlocked phone: they are never stored, logged, put in a diagnostics report or given to the
agent, and leaving the page, the phone locking or Alpha going to the background forgets them. The
launcher is installed nonprivileged, so Android may deny the IMEI and the ICCID; the page then
hands off to Android's own About phone, SIM, mobile network, APN and default apps pages
([Device facts](./facts.md), "Story: Go to Android's own page"), where Alpha changes nothing.

## Domain

### The page holds its showing, the read in flight, what Android returned of each field, and the last copy

`epoch` moves with every read and every change of showing, so only the latest read answers. A field
is what Android returned, or why it returned nothing: it denied access, it has no value, the phone
does not support it, or it was not read. The SMS and phone roles use the words every Settings page
uses ([Settings vocabulary](./vocabulary.md)): held by Alpha, not held by Alpha, not offered on this
phone, or not read.

```quint
import vocabulary.* from "./vocabulary"

type FieldStatus = Returned | AccessDenied | Missing | Unsupported | NotRead
type Field = { status: FieldStatus, value: str }
type Slot = { slot: int, imei: Field, simState: Field }
type Sim = {
  subscription: int, slot: int, embedded: bool, defaultData: bool, carrier: Field, simName: Field, iccid: Field,
  operator: Field, operatorCode: Field, dataEnabled: Field, dataState: Field, networkType: Field, roaming: Field,
}
type Hardware = { manufacturer: Field, model: Field, device: Field, android: Field, baseband: Field }
type Setup = {
  image: bool, canChooseSms: bool, smsRole: RoleHold, dialerRole: RoleHold, slots: List[Slot],
  simsStatus: FieldStatus, sims: List[Sim], eid: Field, hardware: Hardware,
}
type CarrierPhase = CarrierClosed | CarrierIdle | CarrierReading | CarrierShown | CarrierFailed
type TargetKind = NoTarget | ImeiTarget | IccidTarget | EidTarget
type CopyTarget = { kind: TargetKind, index: int }
type Copy = { target: CopyTarget, copied: bool }
type Carrier = { shown: bool, epoch: int, phase: CarrierPhase, setup: Setup, eidReading: bool, copy: Copy }
pure val notRead: Field = { status: NotRead, value: "" }
pure val noHardware: Hardware = { manufacturer: notRead, model: notRead, device: notRead, android: notRead, baseband: notRead }
pure val noSetup: Setup = {
  image: false, canChooseSms: false, smsRole: RoleUnread, dialerRole: RoleUnread, slots: List(),
  simsStatus: NotRead, sims: List(), eid: notRead, hardware: noHardware,
}
pure val noSlot: Slot = { slot: -1, imei: notRead, simState: notRead }
pure val noSim: Sim = {
  subscription: -1, slot: -1, embedded: false, defaultData: false, carrier: notRead, simName: notRead, iccid: notRead,
  operator: notRead, operatorCode: notRead, dataEnabled: notRead, dataState: notRead, networkType: notRead, roaming: notRead,
}
pure val noTarget: CopyTarget = { kind: NoTarget, index: -1 }
pure val noCopy: Copy = { target: noTarget, copied: false }
pure val initial: Carrier = { shown: false, epoch: 0, phase: CarrierClosed, setup: noSetup, eidReading: false, copy: noCopy }
pure val ticketValues = Set(0, 1, 2, 3)
pure val setupValues = Set(noSetup)
  .union(Set({ ...noSetup, smsRole: NotHeldByAlpha, dialerRole: NotHeldByAlpha, simsStatus: Returned, slots: List(
    { slot: 0, imei: { status: Returned, value: "123456789012345" }, simState: { status: Returned, value: "No SIM" } },
    { slot: 1, imei: { status: AccessDenied, value: "" }, simState: { status: Returned, value: "No SIM" } }) }))
  .union(Set({ ...noSetup, image: true, canChooseSms: true, smsRole: NotHeldByAlpha, dialerRole: HeldByAlpha, simsStatus: Returned,
    slots: List({ slot: 0, imei: { status: Returned, value: "123456789012345" }, simState: { status: Returned, value: "Ready" } }),
    sims: List({ ...noSim, subscription: 1, slot: 0, defaultData: true, carrier: { status: Returned, value: "Carrier" }, iccid: { status: Returned, value: "8901260000000000000" } }) }))
  .union(Set({ ...noSetup, simsStatus: AccessDenied, eid: { status: Unsupported, value: "" } }))
pure val eidValues = Set({ status: Returned, value: "89049032000000000000000000000000" }).union(Set({ status: Missing, value: "" }))
  .union(Set(notRead))
pure val targetValues = Set(noTarget)
  .union(Set({ kind: ImeiTarget, index: 0 })).union(Set({ kind: ImeiTarget, index: 1 }))
  .union(Set({ kind: IccidTarget, index: 1 })).union(Set({ kind: EidTarget, index: -1 }))
```

## Story: Read what my carrier needs to activate a SIM

> As the owner setting up a carrier, I want Settings to show this phone's IMEI, SIM state, ICCID,
> EID, carrier and network facts when I ask, copy one to give the carrier, and forget them all when
> I leave the page.

### The page reads nothing until the owner taps Show identifiers, and leaving forgets what it read

Opening the page, coming back to Alpha or unlocking the phone reads nothing. A read that answers
after the page left, after Android paused Alpha, or after a newer read began changes nothing. The
IMEI is read for every modem slot Android reports, before and without any SIM.

```quint
pure def canCarrierShown(c: Carrier): bool = not(c.shown)
pure def carrierShown(c: Carrier): Carrier = { ...initial, shown: true, epoch: c.epoch + 1, phase: CarrierIdle }
pure def canCarrierHidden(c: Carrier): bool = c.shown
pure def carrierHidden(c: Carrier): Carrier = { ...initial, epoch: c.epoch + 1 }
pure def canCarrierPaused(c: Carrier): bool = c.shown and c.phase != CarrierIdle
pure def carrierPaused(c: Carrier): Carrier = { ...initial, shown: true, epoch: c.epoch + 1, phase: CarrierIdle }
pure def canReadAsked(c: Carrier): bool = c.shown and c.phase != CarrierReading
pure def readAsked(c: Carrier): Carrier =
  { ...c, epoch: c.epoch + 1, phase: CarrierReading, setup: noSetup, eidReading: false, copy: noCopy }
pure def canReadAnswered(c: Carrier, ticket: int, setup: Setup): bool = c.phase == CarrierReading and ticket == c.epoch
pure def readAnswered(c: Carrier, ticket: int, setup: Setup): Carrier = { ...c, phase: CarrierShown, setup: setup }
pure def canReadFailed(c: Carrier, ticket: int): bool = c.phase == CarrierReading and ticket == c.epoch
pure def readFailed(c: Carrier, ticket: int): Carrier = { ...c, phase: CarrierFailed }
pure def alwaysShownExactlyWhileOpen(c: Carrier): bool = c.shown iff c.phase != CarrierClosed
pure def alwaysOnlyAShownReadHoldsIdentifiers(c: Carrier): bool =
  c.phase != CarrierShown implies (c.setup == noSetup and not(c.eidReading) and c.copy == noCopy)
pure def stepAReadBeginsOnlyWhenTheOwnerAsks(before: Carrier, via: str, after: Carrier): bool =
  (after.phase == CarrierReading and before.phase != CarrierReading) implies via == "readAsked"
pure def stepOnlyTheLatestReadAnswers(before: Carrier, via: str, after: Carrier): bool =
  (via == "readAnswered" or via == "readFailed") implies (before.phase == CarrierReading and after.epoch == before.epoch)
pure def stepLeavingForgetsEverything(before: Carrier, via: str, after: Carrier): bool =
  (via == "carrierHidden" or via == "carrierPaused") implies (after.setup == noSetup and after.copy == noCopy and after.epoch > before.epoch)
pure def sometimesIdentifiersShown(c: Carrier): bool = c.phase == CarrierShown and c.setup.slots.length() > 1
pure def sometimesAnActiveSimShown(c: Carrier): bool = c.phase == CarrierShown and c.setup.sims.length() > 0
pure def sometimesTheReadFailed(c: Carrier): bool = c.phase == CarrierFailed
```

### Each field shows what Android returned, or why it returned nothing

Android may deny the IMEI or ICCID to a nonprivileged launcher, have no value for a field, or not
support it; the page says which, field by field, and never shows a value Android did not return.

```quint
pure def returnedValue(f: Field): str = if (f.status == Returned) f.value else ""
pure def lawOnlyAReturnedFieldHasAValue(f: Field): bool = f.status != Returned implies returnedValue(f) == ""
pure val fValues = Set(notRead).union(Set({ status: Returned, value: "Ready" })).union(Set({ status: AccessDenied, value: "x" }))
  .union(Set({ status: Unsupported, value: "" }))
```

### The EID is its own optional read, after the identifiers, and never delays them

The first read never asks the eSIM service; the owner asks for the EID separately, and a phone
without an eSIM offers no EID read. A read Android refused without answering, such as one asked
while an earlier read is still with the eSIM service, leaves the EID not read, so it is never shown
as unavailable and can be asked again.

```quint
pure def canEidAsked(c: Carrier): bool = c.phase == CarrierShown and not(c.eidReading) and c.setup.eid.status != Unsupported
pure def eidAsked(c: Carrier): Carrier = { ...c, eidReading: true }
pure def canEidAnswered(c: Carrier, ticket: int, eid: Field): bool = c.eidReading and ticket == c.epoch
pure def eidAnswered(c: Carrier, ticket: int, eid: Field): Carrier =
  { ...c, eidReading: false, setup: { ...c.setup, eid: eid }, copy: noCopy }
pure def alwaysTheEidIsReadOnlyWhileShown(c: Carrier): bool = c.eidReading implies c.phase == CarrierShown
pure def stepTheEidChangesOnlyByItsOwnRead(before: Carrier, via: str, after: Carrier): bool =
  (before.phase == CarrierShown and after.phase == CarrierShown and after.setup.eid != before.setup.eid) implies via == "eidAnswered"
pure def sometimesTheEidRead(c: Carrier): bool = c.phase == CarrierShown and c.setup.eid.status == Returned
```

### Copy puts one identifier Android returned on the Android clipboard

Only an IMEI, an ICCID or the EID the page shows can be copied, one at a time, and the page marks
the one copied or says it could not be copied.

```quint
pure def fieldAt(c: Carrier, t: CopyTarget): Field =
  if (t.kind == ImeiTarget) c.setup.slots.select(s => s.slot == t.index).nthOr(0, noSlot).imei
  else if (t.kind == IccidTarget) c.setup.sims.select(s => s.subscription == t.index).nthOr(0, noSim).iccid
  else if (t.kind == EidTarget) c.setup.eid
  else notRead
pure def copyable(c: Carrier, t: CopyTarget): str = if (c.phase == CarrierShown) returnedValue(fieldAt(c, t)) else ""
pure def canCopyAnswered(c: Carrier, ticket: int, target: CopyTarget, copied: bool): bool =
  ticket == c.epoch and copyable(c, target) != ""
pure def copyAnswered(c: Carrier, ticket: int, target: CopyTarget, copied: bool): Carrier = { ...c, copy: { target: target, copied: copied } }
pure def alwaysTheCopyNamesAShownIdentifier(c: Carrier): bool = c.copy != noCopy implies copyable(c, c.copy.target) != ""
pure def lawNothingIsCopyableBeforeARead(target: CopyTarget): bool = copyable(initial, target) == ""
pure def sometimesCopied(c: Carrier): bool = c.copy.copied
```

### General offers the page on the phone only, and the default SMS app choice only where Alpha can take it

A browser has no carrier to read. The choice of default SMS app hands off to Android's default apps
page only when Android reports the SMS role available to Alpha and not held by it, which is on the
Alpha image.

```quint
pure def carrierOffered(onPhone: bool): bool = onPhone
pure def lawNoCarrierPageInABrowser(onPhone: bool): bool = carrierOffered(onPhone) implies onPhone
pure def smsChoiceOffered(c: Carrier): bool = c.phase == CarrierShown and c.setup.canChooseSms
pure def alwaysNoSmsChoiceBeforeARead(c: Carrier): bool = c.phase != CarrierShown implies not(smsChoiceOffered(c))
```
