# Network position

Indoors, or on an image without a network location provider, GPS may never
fix. The phone's `AlphaNetworkLocation` bridge then resolves the Wi-Fi access
points and cell towers it can see to an approximate position, only when Maps
asks for one: a locate or a guidance watch that GPS has left without a fix.
The bridge needs the location permission the launcher already holds and
device location on, never asks for a permission, and sends no network names.
A lookup is shared while one is in flight and its answer is kept, so a phone
that stays put asks at most a few times an hour. Times here are the phone's
clock in milliseconds.

## Domain

### The kept answer, when it was taken, last confirmed, and when a lookup may run again

`fixAt` is when the kept answer stands for the phone's position, `resolvedAt`
when the service last resolved it, and `checkedAt` when it was last resolved
or confirmed. `lookup` names the lookup in flight; forgetting the answer
retires it.

```quint
type NetworkFixes = {
  held: bool, fixAt: int, resolvedAt: int, checkedAt: int, retryAfter: int, pending: bool, lookup: int, lookups: int,
}
pure val initial: NetworkFixes = {
  held: false, fixAt: 0, resolvedAt: 0, checkedAt: 0, retryAfter: 0, pending: false, lookup: 0, lookups: 0,
}
pure val reuseMs = 900000
pure val unchangedMs = 3600000
pure val retryMs = 120000
pure def standing(s: NetworkFixes, now: int): bool = s.held and now >= s.fixAt and now - s.resolvedAt <= unchangedMs
pure def recent(s: NetworkFixes, now: int): bool = standing(s, now) and now - s.checkedAt < reuseMs
pure val nowValues = Set(0, 60000, 120001, 900001, 3600001)
pure val atValues = Set(0, 60000, 900001, 3700000)
pure val accuracyMValues = Set(0, 40, 25000)
pure val lookupValues = Set(1, 2)
```

## Story: Find me by Wi-Fi and cell towers when GPS has no fix

> As the owner, I want Maps to show roughly where I am when GPS cannot fix,
> without asking the network service again and again.

### An answer is reused for 15 minutes, then confirmed without a request while the same networks are visible, for up to an hour

A lookup runs only when no recent answer is kept and no failure is being
waited out, and it is shared while in flight. A lookup with a standing answer
names the networks it came from, and the bridge answers "unchanged" without
asking the service while they are the same; a confirmation moves the answer's
time to now but never keeps it beyond an hour after the service resolved it.

```quint
pure def canBeginLookup(s: NetworkFixes, now: int): bool = not(s.pending) and not(recent(s, now)) and now >= s.retryAfter
pure def beginLookup(s: NetworkFixes, now: int): NetworkFixes = { ...s, pending: true, lookup: s.lookup + 1, lookups: s.lookups + 1 }
pure def canConfirmed(s: NetworkFixes, lookup: int, now: int, same: bool): bool = s.pending and lookup == s.lookup
pure def confirmed(s: NetworkFixes, lookup: int, now: int, same: bool): NetworkFixes =
  if (same and standing(s, now)) { ...s, pending: false, fixAt: now, checkedAt: now }
  else { ...s, pending: false, checkedAt: now }
pure def alwaysAnAnswerHasAResolution(s: NetworkFixes): bool = s.held implies s.resolvedAt <= s.fixAt
pure def stepConfirmationNeverExtendsTheResolution(before: NetworkFixes, via: str, after: NetworkFixes): bool =
  via == "confirmed" implies after.resolvedAt == before.resolvedAt
pure def stepALookupNeedsNoRecentAnswer(before: NetworkFixes, via: str, after: NetworkFixes): bool =
  after.lookups > before.lookups implies via == "beginLookup" and not(before.pending)
pure def sometimesConfirmed(s: NetworkFixes): bool = s.held and s.fixAt > s.resolvedAt
```

### An answer is kept only when it is at most an hour old, not ahead of the phone, and carries a positive accuracy

A city-level answer, when the service knows none of the visible networks and
falls back to the request's address, is kept with its accuracy. An answer
that fails these limits, a refusal or an unusable reply waits two minutes
before the next lookup; the bridge reporting the permission gone or device
location off forgets the kept answer. A reply of a retired lookup changes
nothing.

```quint
pure def usableAnswer(at: int, now: int, accuracyM: int): bool = accuracyM > 0 and at <= now and now - at <= unchangedMs
pure def canResolved(s: NetworkFixes, lookup: int, now: int, at: int, accuracyM: int): bool = s.pending and lookup == s.lookup
pure def resolved(s: NetworkFixes, lookup: int, now: int, at: int, accuracyM: int): NetworkFixes =
  if (usableAnswer(at, now, accuracyM)) { ...s, pending: false, held: true, fixAt: at, resolvedAt: at, checkedAt: now }
  else { ...s, pending: false, checkedAt: now, retryAfter: now + retryMs }
pure def canRefused(s: NetworkFixes, lookup: int, now: int): bool = s.pending and lookup == s.lookup
pure def refused(s: NetworkFixes, lookup: int, now: int): NetworkFixes = { ...s, pending: false, retryAfter: now + retryMs }
pure def forget(s: NetworkFixes): NetworkFixes = { ...initial, lookup: s.lookup + 1, lookups: s.lookups }
pure def lawAStaleAnswerIsNotKept(accuracyM: int): bool = not(usableAnswer(0, unchangedMs + 1, accuracyM))
pure def lawAnAnswerAheadIsNotKept(accuracyM: int): bool = not(usableAnswer(1, 0, accuracyM))
pure def lawAnswersNeedAccuracy(at: int): bool = not(usableAnswer(at, at, 0))
pure def stepARefusalKeepsTheAnswer(before: NetworkFixes, via: str, after: NetworkFixes): bool =
  via == "refused" implies after.held == before.held and after.fixAt == before.fixAt
pure def sometimesKept(s: NetworkFixes): bool = s.held and s.lookups >= 1
pure def sometimesWaitingOutAFailure(s: NetworkFixes): bool = not(s.held) and s.retryAfter > 0
```
