# What the agent sees of Maps

While [Maps](./index.md) is in front, the phone tells the agent what it
shows: the place selected, the route planned, or the search. That context
carries no location: an identity and a revision that changes only when what
is shown changes. The viewport is never sent, and a transit route is told as
its destination. The agent reads the exact place or route only after the
owner approves a read card, and only while Maps still shows the selection
the card was for; a search is never readable.

## Story: Let the agent see only what Maps shows now

> As the owner, I want my agent to act on what Maps shows now, and to read a
> place or route only when I approve it.

### The context holds what is shown and its revision, and the read the owner reviews

```quint
type Shown = NothingShown | APlace | ARoute | ASearch
type ReadPhase = NoRead | Reviewing | Running | Journaled | ReadDone
type Outcome = NoOutcome | ReadSucceeded | ReadNotStarted | ReadRefused
type Context = {
  kind: Shown, revision: int, inMaps: bool, sensitive: bool,
  cardRevision: int, phase: ReadPhase, readRevision: int, uploaded: bool, outcome: Outcome,
}

pure val initial: Context = {
  kind: NothingShown, revision: 0, inMaps: true, sensitive: false,
  cardRevision: -1, phase: NoRead, readRevision: -1, uploaded: false, outcome: NoOutcome,
}

pure def readable(kind: Shown): bool = kind == APlace or kind == ARoute

pure def selectionCurrent(s: Context): bool = s.inMaps and not(s.sensitive) and s.kind != NothingShown and s.revision == s.cardRevision

pure val maxReadBytes = 7600
pure val kindValues = Set(NothingShown, APlace, ARoute, ASearch)
pure val weight_review = 3
pure val weight_approveRead = 3
```

### The revision changes exactly when what is shown changes, and the context clears when Maps is not in front

Android's lock screen over Maps counts as sensitive: no context is offered
and no read runs while the phone is locked.

```quint
pure def canPublish(s: Context, kind: Shown, changed: bool): bool = s.inMaps and (changed or kind != s.kind)

pure def publish(s: Context, kind: Shown, changed: bool): Context = { ...s, kind: kind, revision: s.revision + 1 }

pure def canLeaveContext(s: Context): bool = s.inMaps

pure def leaveContext(s: Context): Context = { ...s, inMaps: false, kind: NothingShown, revision: s.revision + 1 }

pure def canEnterContext(s: Context): bool = not(s.inMaps)

pure def enterContext(s: Context): Context = { ...s, inMaps: true }

pure def canProtect(s: Context, on: bool): bool = on != s.sensitive

pure def protect(s: Context, on: bool): Context = { ...s, sensitive: on }

pure def alwaysNothingIsShownOutsideMaps(s: Context): bool = not(s.inMaps) implies s.kind == NothingShown
```

### A read is approved only for the selection its card showed, and its result is sent only while that selection is still shown

A read whose selection changed before it ran is recorded as not started.
The agent names its target by the handle Maps gives the place shown (a
route keeps its destination's) and the revision; the handle names the
selection on this phone only and is never a provider's place identity.

```quint
pure def canReview(s: Context): bool = (s.phase == NoRead or s.phase == ReadDone) and readable(s.kind) and s.inMaps and not(s.sensitive)

pure def review(s: Context): Context = { ...s, phase: Reviewing, cardRevision: s.revision, outcome: NoOutcome, uploaded: false, readRevision: -1 }

pure def canApproveRead(s: Context): bool = s.phase == Reviewing

pure def approveRead(s: Context): Context =
  if (selectionCurrent(s)) { ...s, phase: Running } else { ...s, phase: ReadDone, outcome: ReadRefused }

pure def canRunRead(s: Context): bool = s.phase == Running

pure def runRead(s: Context): Context =
  if (selectionCurrent(s)) { ...s, phase: Journaled, readRevision: s.revision, outcome: ReadSucceeded }
  else { ...s, phase: Journaled, outcome: ReadNotStarted }

pure def canUploadRead(s: Context): bool = s.phase == Journaled

pure def uploadRead(s: Context): Context = { ...s, phase: ReadDone, uploaded: s.outcome == ReadSucceeded and selectionCurrent(s) }

pure def alwaysAReadIsBoundToItsCard(s: Context): bool =
  s.outcome == ReadSucceeded implies (s.readRevision == s.cardRevision and s.readRevision >= 0)

pure def alwaysOnlyASucceededReadIsSent(s: Context): bool = s.uploaded implies s.outcome == ReadSucceeded

pure def stepNoReadWithoutApproval(before: Context, via: str, after: Context): bool =
  (before.phase != Running and after.phase == Running) implies via == "approveRead"

pure def stepASearchIsNeverRead(before: Context, via: str, after: Context): bool = via == "review" implies readable(before.kind)

pure def sometimesAReadSent(s: Context): bool = s.uploaded

pure def sometimesAStaleReadNotStarted(s: Context): bool = s.outcome == ReadNotStarted
```
