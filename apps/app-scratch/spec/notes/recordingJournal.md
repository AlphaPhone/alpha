# Pending recording journal

A recording between its first segment and the voice note that holds it. Every finished segment is
journaled with its duration, and its transcript text once that segment is transcribed, so a crash keeps
the journaled prefix. A stopped recording keeps its bytes until it is claimed once for its note and
committed to that canonical note; only then is it retired. The [recorder](./recorder.md) drives it.

## Story: Keep every finished segment of a recording through a crash

> As the owner, I want a crash, a reload or a closed app to keep every segment I finished recording and
> every word already transcribed.

### Finished segments are journaled as a prefix, with text only for journaled segments

A segment is at most 30 seconds and 4 MiB, and its text at most 64,000 units; a journal holds at most
10,000 segments, each ID once. A recovered journal brings back exactly its journaled prefix and the text
journaled with each segment. A journal that does not read back for this owner and folder needs review
and blocks a new recording until it is resolved.

```quint
type PendingPhase = PendingEmpty | PendingStopped | PendingClaimed | PendingCommitted | PendingDiscarded
type PendingRecording = { phase: PendingPhase, bytes: bool, claims: int, canonicalNote: bool,
  segments: int, durable: int, texts: int, completed: int, recovered: bool }
pure val initial: PendingRecording = { phase: PendingEmpty, bytes: false, claims: 0, canonicalNote: false,
  segments: 0, durable: 0, texts: 0, completed: 0, recovered: false }
pure def canSegmentFinished(s: PendingRecording, journaled: bool): bool = s.phase == PendingEmpty
pure def segmentFinished(s: PendingRecording, journaled: bool): PendingRecording =
  { ...s, segments: s.segments + 1, durable: if (journaled) s.segments + 1 else s.durable, bytes: true }
pure def canTextJournaled(s: PendingRecording): bool = s.texts < s.durable and (s.phase == PendingEmpty or s.phase == PendingStopped)
pure def textJournaled(s: PendingRecording): PendingRecording = { ...s, texts: s.texts + 1 }
pure def canRestarted(s: PendingRecording): bool = s.phase == PendingEmpty or s.phase == PendingStopped
pure def restarted(s: PendingRecording): PendingRecording =
  if (s.durable > 0) { ...s, segments: s.durable, phase: PendingStopped, bytes: true, recovered: true }
  else { ...initial, completed: s.completed }
pure def segmentAdmitted(bytes: int, durationMs: int, textUnits: int, count: int): bool =
  bytes > 0 and bytes <= 4194304 and durationMs > 0 and durationMs <= 30000 and textUnits >= 0 and textUnits <= 64000 and count <= 10000
pure val bytesValues = Set(1, 4194304, 4194305)
pure val durationMsValues = Set(1, 30000, 30001)
pure val textUnitsValues = Set(0, 64001)
pure val countValues = Set(1, 10001)
pure def alwaysDurablePrefix(s: PendingRecording): bool = s.durable >= 0 and s.durable <= s.segments and s.texts >= 0 and s.texts <= s.durable
pure def lawOversizedSegmentIsRefused(durationMs: int, textUnits: int, count: int): bool =
  not(segmentAdmitted(4194305, durationMs, textUnits, count))
pure def sometimesRecoveredAfterCrash(s: PendingRecording): bool = s.recovered and s.phase == PendingStopped and s.texts >= 1
```

## Story: Keep a stopped recording until it is claimed for its note

> As the owner, I want a recording I stopped kept until it is saved to its note, so that a lost reply or
> reload never loses or duplicates it.

### A stopped recording is claimed once and committed only to its canonical note

A stopped recording has its bytes and no claim. Its owner can claim it once, and a claimed recording is
committed only to its canonical note. The owner can discard a recording only while it is still
unclaimed. A lost reply, a retry, a reload, a refused rebind or an aborted transaction keeps the bytes and
the claim, so a claimed create is never replayed. A committed recording is retired.

```quint
pure def canStopPending(s: PendingRecording): bool = s.phase == PendingEmpty and s.segments >= 1
pure def stopPending(s: PendingRecording): PendingRecording = { ...s, phase: PendingStopped, bytes: true, claims: 0 }
pure def canClaimPending(s: PendingRecording, isOwner: bool): bool = s.phase == PendingStopped and isOwner
pure def claimPending(s: PendingRecording, isOwner: bool): PendingRecording = { ...s, phase: PendingClaimed, claims: s.claims + 1 }
pure def canCommitPending(s: PendingRecording, isOwner: bool, canonical: bool): bool = s.phase == PendingClaimed and isOwner and canonical
pure def commitPending(s: PendingRecording, isOwner: bool, canonical: bool): PendingRecording = { ...s, phase: PendingCommitted, canonicalNote: true }
pure def canDiscardPending(s: PendingRecording, isOwner: bool): bool = (s.phase == PendingStopped or s.phase == PendingEmpty) and isOwner
pure def discardPending(s: PendingRecording, isOwner: bool): PendingRecording =
  { ...s, phase: PendingDiscarded, bytes: false, segments: 0, durable: 0, texts: 0, recovered: false }
pure def canRetirePending(s: PendingRecording): bool = s.phase == PendingCommitted or s.phase == PendingDiscarded
pure def retirePending(s: PendingRecording): PendingRecording =
  { ...initial, completed: if (s.phase == PendingCommitted) s.completed + 1 else s.completed }
pure def alwaysClaimedAtMostOnce(s: PendingRecording): bool = s.claims >= 0 and s.claims <= 1
pure def alwaysStoppedHasBytesAndNoClaim(s: PendingRecording): bool = s.phase == PendingStopped implies s.bytes and s.claims == 0
pure def alwaysClaimedHasBytes(s: PendingRecording): bool =
  (s.phase == PendingClaimed or s.phase == PendingCommitted) implies s.bytes and s.claims == 1
pure def alwaysCommittedIffCanonical(s: PendingRecording): bool = s.phase == PendingCommitted iff s.canonicalNote
pure def alwaysDiscardedHasNoBytes(s: PendingRecording): bool = s.phase == PendingDiscarded implies not(s.bytes)
pure def sometimesCommitted(s: PendingRecording): bool = s.completed >= 1
pure def sometimesRecoveredRecordingClaimed(s: PendingRecording): bool = s.phase == PendingClaimed and s.recovered
```
