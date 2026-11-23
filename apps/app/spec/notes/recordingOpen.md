# Opening Notes from the recording notification

While a voice note records, the phone shows an ongoing notification that says "Voice note · Recording"
or "Voice note · Paused". A tap on it leaves a one-use record in the phone's recording service, held for
30 seconds and cleared by HOME. The launcher reads that record over the bridge only while it can show
Notes: the page is visible, nothing is locked, no shade, assistant window or modal sheet covers Home.
A record it reads then opens Notes once, and opening Notes adopts the recording again. The launcher
never polls: it reads once at start, once per tap, and once more after a failed read. Going Home forgets
a tap that was not taken yet and clears the record.

## Story: Return to my recording from its notification

> As the owner, I want a tap on the voice note notification to bring Notes back with that recording,
> once, and never to open Notes on its own.

### A read starts only while Notes can be shown and none is in flight, and opens Notes at most once per tap

A record read while Notes could not be shown is taken without opening. A read whose answer was lost asks
again only after the next tap or the next time Notes can be shown. The launch itself counts as one tap,
because a tap can start Alpha.

```quint
type RecordingOpen = {
  owed: bool, showable: bool, reading: bool, epoch: int, readEpoch: int, revision: int, readRevision: int,
  taps: int, unanswered: int, reads: int, failures: int, opened: int, dropped: int,
}
pure val initial: RecordingOpen = {
  owed: true, showable: false, reading: false, epoch: 0, readEpoch: 0, revision: 0, readRevision: 0,
  taps: 1, unanswered: 1, reads: 0, failures: 0, opened: 0, dropped: 0,
}
pure def readable(s: RecordingOpen): bool = s.owed and s.showable and not(s.reading)
pure def startRead(go: bool, s: RecordingOpen): RecordingOpen =
  if (go and readable(s)) { ...s, reading: true, owed: false, readEpoch: s.epoch, readRevision: s.revision, reads: s.reads + 1 }
  else s
pure def tapRecording(s: RecordingOpen): RecordingOpen =
  startRead(true, { ...s, owed: true, taps: s.taps + 1, unanswered: s.unanswered + 1, revision: s.revision + 1 })
pure def canSetShowable(s: RecordingOpen, on: bool): bool = on != s.showable
pure def setShowable(s: RecordingOpen, on: bool): RecordingOpen = { ...s, showable: on }
pure def canReadRecordingOpen(s: RecordingOpen): bool = readable(s)
pure def readRecordingOpen(s: RecordingOpen): RecordingOpen = startRead(true, s)
pure def canReadSettled(s: RecordingOpen): bool = s.reading
pure def readSettled(s: RecordingOpen, ok: bool, found: bool): RecordingOpen = {
  val current = s.epoch == s.readEpoch
  val sameTap = s.revision == s.readRevision
  val hit = ok and found and current and s.unanswered > 0
  val next: RecordingOpen = {
    ...s, reading: false,
    unanswered: if (hit) (if (sameTap) 0 else s.unanswered - 1) else if (ok and sameTap) 0 else s.unanswered,
    opened: s.opened + (if (hit and s.showable) 1 else 0),
    dropped: s.dropped + (if (hit and not(s.showable)) 1 else 0),
    failures: s.failures + (if (ok) 0 else 1),
    owed: s.owed or (not(ok) and current),
  }
  startRead(next.owed and not(sameTap), next)
}
pure def alwaysOpensNeedTaps(s: RecordingOpen): bool = s.unanswered >= 0 and s.opened + s.dropped + s.unanswered <= s.taps
pure def alwaysReadsAreOwed(s: RecordingOpen): bool = s.reads + (if (s.owed) 1 else 0) <= 1 + s.revision + s.failures
pure def stepOpensOnlyWhenShowable(before: RecordingOpen, after: RecordingOpen): bool =
  after.opened > before.opened implies after.showable
pure def sometimesOpened(s: RecordingOpen): bool = s.opened >= 1
pure def sometimesRetriedAfterFailure(s: RecordingOpen): bool = s.failures >= 1 and s.reads >= 2
pure def sometimesTakenWithoutOpening(s: RecordingOpen): bool = s.dropped >= 1
pure val weight_tapRecording = 3
```

### Going Home forgets a tap that was not taken yet

HOME clears the phone's record too, so a read already in flight that answers afterwards opens nothing.

```quint
pure def goneHome(s: RecordingOpen): RecordingOpen = { ...s, owed: false, unanswered: 0, epoch: s.epoch + 1 }
pure def stepHomeForgetsTheTap(before: RecordingOpen, via: str, after: RecordingOpen): bool =
  via == "goneHome" implies (after.unanswered == 0 and not(after.owed))
pure def sometimesHomeDuringRead(s: RecordingOpen): bool = s.reading and s.epoch != s.readEpoch
```
