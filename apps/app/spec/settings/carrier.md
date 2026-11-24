# Carrier & SIM setup

General's Carrier & SIM setup page shows what a carrier asks for when a SIM is activated: each
modem slot's IMEI and SIM state, each subscription's ICCID, carrier and network, and, read
separately, the eSIM EID (PRD AP-12). The identifiers are read by `AlphaCarrierSetup` only when the
owner asks, live only in this page's memory, and are gone the moment the page is left or Alpha goes
to the background. They are never in a snapshot, the diagnostics export, saved shell state or the
assistant's context: the page is a private screen to the assistant (spec/assistant/context.md). Each
available identifier has its own Copy. A field Android did not give says why: access denied,
unavailable or not supported. Android's About phone, SIM, mobile network and access point pages are
one tap away, for what Alpha cannot change.

## Domain

### The page holds whether it is in front, the identifier read and the optional eSIM read, under one generation

`generation` fences replies: every read, refresh and clearing starts a new one, and a reply is taken
only for the generation it was asked under. `eidGeneration` is the generation an eSIM read was asked
under.

```quint
type ReadPhase = NotRead | Reading | ReadShown | ReadFailed
type EidPhase = EidNotRead | EidReading | EidShown
type Carrier = { current: bool, read: ReadPhase, eid: EidPhase, generation: int, eidGeneration: int, reads: int, copies: int, dropped: int }
pure val initial: Carrier = { current: false, read: NotRead, eid: EidNotRead, generation: 0, eidGeneration: 0, reads: 0, copies: 0, dropped: 0 }
pure def forgotten(fresh: int, c: Carrier): Carrier = { ...c, read: NotRead, eid: EidNotRead, generation: fresh }
pure val generationValues = Set(0, 1, 2, 3)
```

## Story: Give my carrier the identifiers it asks for, and keep them nowhere else

> As the owner activating a SIM, I tap Show identifiers to see my IMEIs and SIM numbers, copy the
> one my carrier asks for, and know they leave the screen as soon as I do.

### An identifier read starts only from Show identifiers on the page in front, never on opening or returning

Opening the page, coming back to it or Alpha returning to the foreground reads nothing; only the
owner's Show identifiers (or Refresh identifiers) tap does, one read at a time.

```quint
pure def canEnter(c: Carrier): bool = not(c.current)
pure def enter(c: Carrier): Carrier = { ...c, current: true }
pure def canShow(c: Carrier): bool = c.current and c.read != Reading
pure def show(c: Carrier): Carrier = { ...forgotten(c.generation + 1, c), read: Reading, reads: c.reads + 1 }
pure def canReadSettles(c: Carrier, generation: int, ok: bool): bool = c.read == Reading and generation >= 0
pure def readSettles(c: Carrier, generation: int, ok: bool): Carrier =
  if (generation != c.generation or not(c.current)) { ...c, dropped: c.dropped + 1 }
  else { ...c, read: if (ok) ReadShown else ReadFailed }
pure def stepEnteringReadsNothing(before: Carrier, via: str, after: Carrier): bool = via == "enter" implies after.reads == before.reads
pure def sometimesShown(c: Carrier): bool = c.read == ReadShown
```

### Leaving the page or Alpha going to the background clears every identifier, and a late reply is dropped

A reply to a read asked before the page was left, even if the owner came back, shows nothing.

```quint
pure def canLeave(c: Carrier): bool = c.current
pure def leave(c: Carrier): Carrier = { ...forgotten(c.generation + 1, c), current: false }
pure def alwaysIdentifiersOnlyOnThePageInFront(c: Carrier): bool = (c.read == ReadShown or c.eid == EidShown) implies c.current
pure def sometimesALateReplyDropped(c: Carrier): bool = c.current and c.read == Reading and c.dropped >= 1 and c.reads >= 2
```

### The eSIM EID is a separate, optional read, so an eSIM that cannot answer never holds up the SIM

`Read eSIM EID (optional)` is offered once the identifiers show. Refreshing them while the eSIM read
is pending drops its reply.

```quint
pure def canShowEid(c: Carrier): bool = c.current and c.read == ReadShown and c.eid != EidReading
pure def showEid(c: Carrier): Carrier = { ...c, eid: EidReading, eidGeneration: c.generation }
pure def canEidSettles(c: Carrier, generation: int): bool = c.eid == EidReading and generation >= 0
pure def eidSettles(c: Carrier, generation: int): Carrier =
  if (generation != c.generation or generation != c.eidGeneration or not(c.current) or c.read != ReadShown) { ...c, eid: EidNotRead }
  else { ...c, eid: EidShown }
pure def alwaysAnEidOnlyBesideTheIdentifiers(c: Carrier): bool = c.eid == EidShown implies c.read == ReadShown
pure def sometimesEidShown(c: Carrier): bool = c.eid == EidShown
```

### Each identifier shown has its own Copy, which works only on the page in front

Copy puts exactly that one value on the clipboard; a field with no value has no Copy.

```quint
pure def canCopy(c: Carrier): bool = c.current and c.read == ReadShown
pure def copy(c: Carrier): Carrier = { ...c, copies: c.copies + 1 }
pure def stepCopyingReadsNothing(before: Carrier, via: str, after: Carrier): bool =
  via == "copy" implies (after.reads == before.reads and after.read == before.read)
```

### A field Android did not give says why

```quint
type FieldStatus = Available | PermissionDenied | Unavailable | Unsupported | FieldNotRead
pure def copyOffered(status: FieldStatus, hasValue: bool): bool = status == Available and hasValue
pure def lawOnlyAnAvailableValueIsCopied(status: FieldStatus, hasValue: bool): bool =
  copyOffered(status, hasValue) implies (status == Available and hasValue)
```
