# Carrier and SIM setup

## Story: Read carrier activation details only when I ask

> As the owner, I can find my phone's IMEI before activating a physical SIM, check what Android
> reports after activation, and use Android's own settings when it withholds an identifier.

### Each read is bound to the foreground visit that asked for it

General opens this page without reading anything. Show identifiers and Refresh identifiers read
supported modem slots, the active SIMs, the default roles, network state and hardware on the
unlocked phone. A refresh clears any previous results. Leaving, locking or backgrounding always
forgets the results and invalidates pending reads. Returning does not restart them. Values are
kept in the page only and never enter settings snapshots, diagnostics, storage or assistant
observations. Each available identifier can be copied individually to the Android clipboard.

```quint
type CarrierRead = { foreground: bool, generation: int, reading: bool, showsValues: bool }
pure val initial: CarrierRead = { foreground: false, generation: 0, reading: false, showsValues: false }
pure def canEnter(c: CarrierRead): bool = not(c.foreground)
pure def enter(c: CarrierRead): CarrierRead = { ...c, foreground: true }
pure def canRead(c: CarrierRead): bool = c.foreground and not(c.reading)
pure def read(c: CarrierRead): CarrierRead = { ...c, generation: c.generation + 1, reading: true, showsValues: false }
pure def canReply(c: CarrierRead, ticket: int, available: bool): bool = c.foreground and c.reading and ticket == c.generation
pure def reply(c: CarrierRead, ticket: int, available: bool): CarrierRead = { ...c, reading: false, showsValues: available }
pure def canLeave(c: CarrierRead): bool = c.foreground
pure def leave(c: CarrierRead): CarrierRead = { ...initial, generation: c.generation + 1 }
pure def alwaysOnlyForegroundShowsValues(c: CarrierRead): bool = c.showsValues implies (c.foreground and not(c.reading))
pure def sometimesTheVisitShowsValues(c: CarrierRead): bool = c.showsValues
pure val ticketValues = Set(0, 1, 2, 3)
```

### Android reports each field, and activation stays in Android

Denied, unsupported and unavailable results have distinct words. A successful empty SIM list
means Android reported no active subscription. No on-device value is fabricated. EID is a
separate, optional action on eSIM-capable devices so it cannot block checking a physical SIM.
Only fixed Android Settings destinations are available. Reading IMEI or finding a SIM does not
establish carrier compatibility or service, and the page neither activates a SIM nor changes any
network, APN or plan.
