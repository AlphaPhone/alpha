# Clock handoff history

The phone's record of the latest Clock handoff the owner reviewed, kept across restarts. It is not
an alarm database and not a replay journal: it remembers only which request was last handed to
Clock and what Clock answered, so that after a restart Alpha can say "sent to Clock" or "Clock did
not open" without claiming an alarm exists, changed or rang. It never dispatches anything.

## Story: Know what became of my last Clock request after a restart

> As the owner, I want Alpha to remember whether my last Clock request opened Clock, and to say it
> cannot tell when it was interrupted, so that I check Clock instead of asking twice.

### The record is the latest handoff's id, action, status and time, and a new handoff replaces it

```quint
import vocabulary.* from "./vocabulary"
type HandoffRecord = NoRecord | LastHandoff({ id: str, handoffAction: HandoffAction, answered: bool, status: HandoffStatus, at: int })
type HandoffHistory = { record: HandoffRecord, writes: int }
pure val initial: HandoffHistory = { record: NoRecord, writes: 0 }
pure def idOf(x: HandoffRecord): str = match x { | LastHandoff(r) => r.id | NoRecord => "" }
pure def openingRecord(x: HandoffRecord): bool = match x { | LastHandoff(r) => not(r.answered) | NoRecord => false }
pure def recordId(h: HandoffHistory): str = idOf(h.record)
pure def opening(h: HandoffHistory): bool = openingRecord(h.record)
pure val idValues = Set("h1", "h2", "")
pure val atValues = Set(0, 1000)
pure def canBeginRecord(h: HandoffHistory, id: str, handoffAction: HandoffAction, at: int): bool = id != "" and id != recordId(h) and at >= 0
pure def beginRecord(h: HandoffHistory, id: str, handoffAction: HandoffAction, at: int): HandoffHistory =
  { record: LastHandoff({ id: id, handoffAction: handoffAction, answered: false, status: ClockUnknown, at: at }), writes: h.writes + 1 }
pure def alwaysARecordHasAnIdentity(h: HandoffHistory): bool = (h.record == NoRecord) iff (h.writes == 0)
```

### Only the exact admitted handoff is finished, once, with what Clock answered

```quint
pure def canFinishRecord(h: HandoffHistory, id: str, status: HandoffStatus): bool = opening(h) and recordId(h) == id
pure def finishRecord(h: HandoffHistory, id: str, status: HandoffStatus): HandoffHistory = {
  val last = h.record
  match last {
    | LastHandoff(r) => { record: LastHandoff({ id: r.id, handoffAction: r.handoffAction, answered: true, status: status, at: r.at }), writes: h.writes + 1 }
    | NoRecord => h
  }
}
pure def stepAFinishedRecordStaysFinished(before: HandoffHistory, after: HandoffHistory): bool =
  (not(opening(before)) and recordId(before) != "") implies (recordId(after) != recordId(before) or not(opening(after)))
pure def sometimesAnswered(h: HandoffHistory): bool = h.record != NoRecord and not(opening(h))
```

### A record left opening reads as unknown and is never sent again

The app may have been stopped between opening Clock and saving the answer.

```quint
pure def statusOf(x: HandoffRecord): HandoffStatus = match x { | LastHandoff(r) => if (r.answered) r.status else ClockUnknown | NoRecord => ClockUnknown }
pure def shownStatus(h: HandoffHistory): HandoffStatus = statusOf(h.record)
pure def sometimesLeftOpening(h: HandoffHistory): bool = opening(h) and shownStatus(h) == ClockUnknown
```
