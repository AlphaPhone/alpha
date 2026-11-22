# What the agent sees of Maps

While Maps is open the phone tells the agent what it shows: the selected
place, the planned route, or the search. That context carries no location: an
identity and a revision that changes only when what is shown changes. The
viewport is never sent. A transit route is published as its destination
place. The agent reads the exact place or route only after the owner approves
a read card, and only while the screen still shows the selection the card was
for; a search is never readable.

## Domain

### The context holds what is shown and its revision, and the read the owner reviews

```quint
type ContextKind = NoContext | MapPlace | MapRoute | MapSearch
type ReadPhase = NoRead | Reviewing | Executing | Journaled | ReadDone
type ReadOutcome = NoOutcome | ReadSucceeded | ReadNotStarted | ReadRefused
type SelectedRead = {
  kind: ContextKind, revision: int, inMaps: bool, sensitive: bool,
  cardRevision: int, phase: ReadPhase, readRevision: int, uploaded: bool, outcome: ReadOutcome,
}
pure val initial: SelectedRead = {
  kind: NoContext, revision: 0, inMaps: true, sensitive: false,
  cardRevision: -1, phase: NoRead, readRevision: -1, uploaded: false, outcome: NoOutcome,
}
pure def readableKind(kind: ContextKind): bool = kind == MapPlace or kind == MapRoute
pure def selectionCurrent(s: SelectedRead): bool = s.inMaps and not(s.sensitive) and s.kind != NoContext and s.revision == s.cardRevision
pure val maxReadBytes = 7600
pure val kindValues = Set(NoContext, MapPlace, MapRoute, MapSearch)
pure val weight_review = 3
pure val weight_approveRead = 3
```

## Story: Let the agent see only what the Maps screen shows now

> As the owner, I want my agent to act on what Maps shows now, and to read a
> place or route only when I approve it.

### The context revision changes exactly when what is shown changes, and clears when Maps is not in front

```quint
pure def canPublish(s: SelectedRead, kind: ContextKind, changed: bool): bool = s.inMaps and (changed or kind != s.kind)
pure def publish(s: SelectedRead, kind: ContextKind, changed: bool): SelectedRead =
  { ...s, kind: kind, revision: s.revision + 1 }
pure def canLeaveContext(s: SelectedRead): bool = s.inMaps
pure def leaveContext(s: SelectedRead): SelectedRead = { ...s, inMaps: false, kind: NoContext, revision: s.revision + 1 }
pure def canEnterContext(s: SelectedRead): bool = not(s.inMaps)
pure def enterContext(s: SelectedRead): SelectedRead = { ...s, inMaps: true }
pure def canProtect(s: SelectedRead, on: bool): bool = on != s.sensitive
pure def protect(s: SelectedRead, on: bool): SelectedRead = { ...s, sensitive: on }
pure def alwaysNothingShownOutsideMaps(s: SelectedRead): bool = not(s.inMaps) implies s.kind == NoContext
```

### A read is approved only for the selection the card showed, and its result is uploaded only while that selection is still shown

A read whose selection changed before it ran is journaled as not started.

```quint
pure def canReview(s: SelectedRead): bool = (s.phase == NoRead or s.phase == ReadDone) and readableKind(s.kind) and s.inMaps and not(s.sensitive)
pure def review(s: SelectedRead): SelectedRead = { ...s, phase: Reviewing, cardRevision: s.revision, outcome: NoOutcome, uploaded: false, readRevision: -1 }
pure def canApproveRead(s: SelectedRead): bool = s.phase == Reviewing
pure def approveRead(s: SelectedRead): SelectedRead =
  if (selectionCurrent(s)) { ...s, phase: Executing } else { ...s, phase: ReadDone, outcome: ReadRefused }
pure def canExecuteRead(s: SelectedRead): bool = s.phase == Executing
pure def executeRead(s: SelectedRead): SelectedRead =
  if (selectionCurrent(s)) { ...s, phase: Journaled, readRevision: s.revision, outcome: ReadSucceeded }
  else { ...s, phase: Journaled, outcome: ReadNotStarted }
pure def canUploadRead(s: SelectedRead): bool = s.phase == Journaled
pure def uploadRead(s: SelectedRead): SelectedRead =
  { ...s, phase: ReadDone, uploaded: s.outcome == ReadSucceeded and selectionCurrent(s) }
pure def alwaysAReadIsBoundToItsCard(s: SelectedRead): bool =
  s.outcome == ReadSucceeded implies s.readRevision == s.cardRevision and s.readRevision >= 0
pure def alwaysUploadsOnlySucceededReads(s: SelectedRead): bool = s.uploaded implies s.outcome == ReadSucceeded
pure def stepNoReadWithoutApproval(before: SelectedRead, via: str, after: SelectedRead): bool =
  (before.phase != Executing and after.phase == Executing) implies via == "approveRead"
pure def stepASearchIsNeverRead(before: SelectedRead, via: str, after: SelectedRead): bool =
  via == "review" implies readableKind(before.kind)
pure def sometimesReadUploaded(s: SelectedRead): bool = s.uploaded
pure def sometimesStaleReadNotStarted(s: SelectedRead): bool = s.outcome == ReadNotStarted
```
