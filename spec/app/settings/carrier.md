# Carrier & SIM setup

What a carrier asks for to activate a SIM on this phone, on the Carrier &
SIM setup page under General, on a phone only ([Settings](./index.md)):
the IMEI and SIM state of each modem slot, with or without a SIM in it;
each active SIM's carrier, ICCID, network operator and its code, mobile
data and roaming; which apps hold the SMS and phone roles; the hardware and
the baseband; and, separately, the eSIM's EID. Alpha reads them only when
the owner asks, and each value says what Android returned or why it
returned nothing. They live only while the page shows on an unlocked phone
in front: never kept, logged, put in a diagnostics report or given to the
agent. Android may deny the IMEI and the ICCID to Alpha; the page then
offers Android's own About phone, SIMs, mobile networks, access point names
and default apps pages ([Android](./android.md)), where Alpha changes
nothing.

## Story: Read what my carrier needs to activate a SIM

> As the owner setting up a carrier, I want this phone's IMEI, SIM state,
> ICCID, EID, carrier and network facts shown when I ask, to copy one for
> the carrier, and to have them all forgotten when I leave the page.

### The page holds whether it shows, the read of the identifiers and what each field returned, the separate read of the EID, and the last copy

A field is what Android returned, or why it returned nothing: it denied
access, it has no value, the phone does not support it, or it was not
read. Each field names its slot or SIM by number. A read also reports whether Android could list active SIMs, each active SIM’s type, slot, default data status and current network, and the device hardware facts Android returned.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Status = Returned | AccessDenied | Missing | Unsupported | NotRead
type Kind = Imei | SimState | Iccid | CarrierName | Operator | OperatorCode | MobileData | Roaming | Manufacturer | Model | DeviceName | AndroidVersion | Baseband | SmsRole | PhoneRole | ActiveSims | SimType | SimSlot | SimName | DataState | NetworkType | DefaultData
type Field = { kind: Kind, index: int, status: Status, value: str }
type Copied = NotCopied | CopiedIt | CopyFailed

type Carrier = {
  showing: bool, read: T::Timed, fields: List[Field], esim: bool, smsChoice: bool,
  eidRead: T::Timed, eid: Field, copying: T::Timed, copied: Copied,
}

type Effect = ReadIdentifiers({ reading: int }) | ReadEid({ eidReading: int }) | CopyIdentifier({ copy: int, value: str })
type Asked = { state: Carrier, out: List[Effect] }

pure val noEid: Field = { kind: Imei, index: -1, status: NotRead, value: "" }

pure val initial: Carrier = {
  showing: false, read: T::unasked, fields: List(), esim: false, smsChoice: false,
  eidRead: T::unasked, eid: noEid, copying: T::unasked, copied: NotCopied,
}

pure val limit = 10000
pure val atValues = Set(0, 4000, 20000)
pure val nowValues = Set(0, 4000, 20000, 40000)

pure def forgotten(showing: bool, s: Carrier): Carrier =
  { ...initial, showing: showing, read: T::retire(s.read), eidRead: T::retire(s.eidRead), copying: T::retire(s.copying) }
```

### Opening the page reads nothing; leaving it, the phone locking or Alpha going to the background forgets everything it read, and an answer that comes later is refused

```quint
pure def canShow(s: Carrier): bool = not(s.showing)

pure def show(s: Carrier): Carrier = forgotten(true, s)

pure def canHideCarrier(s: Carrier): bool = s.showing

pure def hideCarrier(s: Carrier): Carrier = forgotten(false, s)
```

### The identifiers are read only when the owner taps Show identifiers, one read at a time, with ten seconds to answer, and a new read forgets the last

```quint
pure def canShowIdentifiers(s: Carrier, at: int): bool = s.showing and not(T::busy(s.read))

pure def showIdentifiers(s: Carrier, at: int): Asked =
  val asking = T::ask(s.read, at, limit)
  {
    state: {
      ...s, read: asking, fields: List(), esim: false, smsChoice: false,
      eidRead: T::retire(s.eidRead), eid: noEid, copying: T::retire(s.copying), copied: NotCopied,
    },
    out: List(ReadIdentifiers({ reading: asking.read.ticket })),
  }
```

### Only the newest read's answer is shown; a read that failed or was not answered in time shows nothing

The IMEI is read for every modem slot Android reports, before and without
any SIM.

```quint
pure val readingValues = Set(1, 2)
pure val identifiersValues = Set(
  List(),
  List({ kind: Imei, index: 0, status: Returned, value: "356938035643809" }, { kind: Imei, index: 1, status: AccessDenied, value: "" }, { kind: SimState, index: 0, status: Returned, value: "absent" }),
  List({ kind: Imei, index: 0, status: Returned, value: "356938035643809" }, { kind: Iccid, index: 1, status: Returned, value: "8901260000000000000" }, { kind: SmsRole, index: 0, status: Returned, value: "another app" }),
)

pure def canIdentifiersRead(s: Carrier, reading: int, ok: bool, identifiers: List[Field], esim: bool, smsChoice: bool): bool =
  T::canAnswer(s.read, reading)

pure def identifiersRead(s: Carrier, reading: int, ok: bool, identifiers: List[Field], esim: bool, smsChoice: bool): Carrier =
  if (ok) { ...s, read: T::answer(s.read, true), fields: identifiers, esim: esim, smsChoice: smsChoice }
  else { ...s, read: T::answer(s.read, false) }

pure def canGiveUpOnRead(s: Carrier, now: int): bool = T::canGiveUp(s.read, now)

pure def giveUpOnRead(s: Carrier, now: int): Carrier = { ...s, read: T::answer(s.read, false) }
```

### Each field shows what Android returned, or why it returned nothing, and never a value Android did not return

```quint
pure def shownValue(f: Field): str = if (f.status == Returned) f.value else ""

pure def lawOnlyAReturnedFieldHasAValue(kind: Kind, value: str): bool =
  shownValue({ kind: kind, index: 0, status: AccessDenied, value: value }) == ""
    and shownValue({ kind: kind, index: 0, status: NotRead, value: value }) == ""
```

### Identifiers are held only while the page shows them from a read that answered

```quint
pure def alwaysOnlyAShownReadHoldsIdentifiers(s: Carrier): bool =
  (s.read.read.status != R::Loaded or not(s.showing)) implies
    (s.fields.length() == 0 and not(s.esim) and not(s.smsChoice) and s.eid == noEid and s.copied == NotCopied and not(T::busy(s.eidRead)) and not(T::busy(s.copying)))
```

### The EID is its own read, asked by the owner after the identifiers and only on a phone with an eSIM, so it never delays them

A read Android refused without answering leaves the EID not read, so it can
be asked again.

```quint
pure val eidReadingValues = Set(1, 2)
pure val eidValues = Set(noEid, { kind: Imei, index: 0, status: Returned, value: "89049032000000000000000000000000" })

pure def canAskEid(s: Carrier, at: int): bool = s.showing and s.read.read.status == R::Loaded and s.esim and not(T::busy(s.eidRead))

pure def askEid(s: Carrier, at: int): Asked =
  val asking = T::ask(s.eidRead, at, limit)
  { state: { ...s, eidRead: asking }, out: List(ReadEid({ eidReading: asking.read.ticket })) }

pure def canEidRead(s: Carrier, eidReading: int, eid: Field): bool = T::canAnswer(s.eidRead, eidReading)

pure def eidRead(s: Carrier, eidReading: int, eid: Field): Carrier =
  { ...s, eidRead: T::answer(s.eidRead, eid.status != NotRead), eid: if (eid.status == NotRead) noEid else eid }

pure def canGiveUpOnEid(s: Carrier, now: int): bool = T::canGiveUp(s.eidRead, now)

pure def giveUpOnEid(s: Carrier, now: int): Carrier = { ...s, eidRead: T::answer(s.eidRead, false), eid: noEid }
```

### Copy puts one identifier Android returned on the clipboard, one copy at a time, and the page says whether it was copied

Only an IMEI, an ICCID or the EID the page shows can be copied. Whether it
was copied is announced, as well as shown.

```quint
pure val valueValues = Set("", "356938035643809")
pure val copyValues = Set(1, 2)

pure def copyable(s: Carrier, value: str): bool =
  value != "" and s.read.read.status == R::Loaded and s.showing
    and (s.fields.some(f => (f.kind == Imei or f.kind == Iccid) and shownValue(f) == value) or shownValue(s.eid) == value)

pure def canCopyValue(s: Carrier, value: str, at: int): bool = copyable(s, value) and not(T::busy(s.copying))

pure def copyValue(s: Carrier, value: str, at: int): Asked =
  val asking = T::ask(s.copying, at, limit)
  { state: { ...s, copying: asking, copied: NotCopied }, out: List(CopyIdentifier({ copy: asking.read.ticket, value: value })) }

pure def canCopyAnswered(s: Carrier, copy: int, ok: bool): bool = T::canAnswer(s.copying, copy)

pure def copyAnswered(s: Carrier, copy: int, ok: bool): Carrier =
  { ...s, copying: T::answer(s.copying, ok), copied: if (ok) CopiedIt else CopyFailed }

pure def canGiveUpOnCopy(s: Carrier, now: int): bool = T::canGiveUp(s.copying, now)

pure def giveUpOnCopy(s: Carrier, now: int): Carrier = { ...s, copying: T::answer(s.copying, false), copied: CopyFailed }
```

### Nothing is copied that the page does not show

```quint
pure def isCopy(e: Effect): bool = match e { | CopyIdentifier(c) => true | _ => false }

pure def stepOnlyAShownIdentifierIsCopied(before: Carrier, after: Carrier, out: List[Effect]): bool =
  out.every(e => match e { | CopyIdentifier(c) => copyable(before, c.value) | _ => true })
```

### Every read and copy ends

```quint
pure def leadsToAReadEnds(s: Carrier, later: Carrier): bool = T::busy(s.read) implies not(T::busy(later.read))

pure def leadsToAnEidReadEnds(s: Carrier, later: Carrier): bool = T::busy(s.eidRead) implies not(T::busy(later.eidRead))

pure def leadsToACopyEnds(s: Carrier, later: Carrier): bool = T::busy(s.copying) implies not(T::busy(later.copying))

pure val fair_giveUpOnRead = "weak"
pure val fair_giveUpOnEid = "weak"
pure val fair_giveUpOnCopy = "weak"
```

### The default SMS app is offered only from a read that says Alpha can take the SMS role

```quint
pure def offersSmsChoice(s: Carrier): bool = s.showing and s.read.read.status == R::Loaded and s.smsChoice
```

### The identifiers can be shown with one denied, the EID read, and one copied

```quint
pure def sometimesIdentifiersShown(s: Carrier): bool = s.fields.some(f => f.status == AccessDenied) and s.fields.length() > 1

pure def sometimesTheEidRead(s: Carrier): bool = s.eid.status == Returned

pure def sometimesCopied(s: Carrier): bool = s.copied == CopiedIt
```

### A read can fail

```quint
pure def sometimesTheReadFailed(s: Carrier): bool = s.showing and s.read.read.status == R::Failed
```
