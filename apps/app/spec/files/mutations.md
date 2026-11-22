# Files batches

A copy, move, trash, restore or permanent deletion of many rows is one batch, sent to the device in
chunks of at most 50 rows (well within the 500 one device call takes), one chunk at a time and each at
most once. Each row is told by the device's own receipt: a row counts as done only when its answer is
the operation's own result and names the resulting path or Trash ID, and a row the device answered
nothing for is unknown. Leaving Files retires the batch: no new chunk is sent, and the one already
sent still settles. A chunk the device refused stops the batch and keeps what was confirmed before it;
a chunk whose result is unknown, or that left any of its rows unknown, may have taken effect, so nothing of it is claimed, nothing is retried
and the batch stops there. A trash keeps an undo for each row confirmed in Trash.

## Domain

### A batch counts the chunks it sent and the rows the device confirmed

```quint
import storage.* from "./storage"
type BatchOp = CopyFiles | MoveFiles | TrashFiles | RestoreFiles | EraseFiles
type BatchPhase = NoBatch | Running | Finished | Stopped | Uncertain
type ChunkVerdict = ChunkConfirmed | ChunkRefused | ChunkUnknown
type Batch = { phase: BatchPhase, op: BatchOp, total: int, chunks: int, sent: int, inFlight: bool, retired: bool,
  answered: int, done: int, renamed: int, undo: int, serial: int }
pure val initial: Batch = { phase: NoBatch, op: CopyFiles, total: 0, chunks: 0, sent: 0, inFlight: false, retired: false,
  answered: 0, done: 0, renamed: 0, undo: 0, serial: 0 }
pure val chunkMax = 50
pure def chunksFor(total: int): int = if (total <= 0) 0 else (total + chunkMax - 1) / chunkMax
pure def chunkRows(b: Batch): int = if (b.sent < b.chunks) chunkMax else b.total - (b.chunks - 1) * chunkMax
pure def lawAChunkFitsOneDeviceCall(total: int): bool = chunkMax <= batchMax and (total >= 1 implies chunksFor(total) * chunkMax >= total)
```

### What the simulator tries

```quint
pure val totalValues = Set(1, 3, 51)
pure val answeredValues = Set(0, 1, 3, 50)
pure val doneValues = Set(0, 1, 3)
pure val renamedValues = Set(0, 1)
pure val bValues = Set({ ...initial, phase: Running, op: TrashFiles, total: 3, chunks: 1, sent: 1, inFlight: true, serial: 1 },
  { ...initial, phase: Running, op: MoveFiles, total: 51, chunks: 2, sent: 1, inFlight: true, serial: 1 })
```

## Story: Change many files and be told truthfully what changed

> As the owner, I want a move of many files to tell me how many moved and how many were renamed to keep
> both, a partial result to say how many of how many, and an uncertain one never to claim more.

### A batch is sent one chunk at a time, each at most once, and never after it was retired

```quint
pure def canBeginBatch(s: Batch, op: BatchOp, total: int): bool = s.phase != Running and total >= 1
pure def beginBatch(s: Batch, op: BatchOp, total: int): Batch =
  { ...initial, phase: Running, op: op, total: total, chunks: chunksFor(total), serial: s.serial + 1 }
pure def mayDispatch(s: Batch): bool = s.phase == Running and not(s.retired) and not(s.inFlight) and s.sent < s.chunks
pure def canDispatchChunk(s: Batch): bool = mayDispatch(s)
pure def dispatchChunk(s: Batch): Batch = { ...s, inFlight: true, sent: s.sent + 1 }
pure def stepARetiredBatchSendsNothing(before: Batch, via: str, after: Batch): bool =
  via == "dispatchChunk" implies (not(before.retired) and after.sent == before.sent + 1 and not(before.inFlight))
pure def alwaysChunksAreSentInOrderOnce(s: Batch): bool = s.sent >= 0 and s.sent <= s.chunks and (s.inFlight implies s.sent >= 1)
```

### A confirmed chunk adds its receipts; a refused one stops; an unknown one claims nothing and stops

A confirmed chunk that was the last, or that settled after the batch was retired, ends it.

```quint
pure def canSettleChunk(s: Batch, answered: int, done: int, renamed: int): bool =
  s.phase == Running and s.inFlight and answered >= 0 and answered <= chunkRows(s) and answered <= s.total - s.answered
    and done >= 0 and done <= answered and renamed >= 0 and renamed <= done
pure def settleChunk(s: Batch, verdict: ChunkVerdict, answered: int, done: int, renamed: int): Batch =
  if (verdict == ChunkConfirmed) {
    val last = s.sent == s.chunks
    { ...s, inFlight: false, answered: s.answered + answered, done: s.done + done, renamed: s.renamed + renamed,
      undo: s.undo + (if (s.op == TrashFiles) done else 0),
      phase: if (last) Finished else if (s.retired) Stopped else Running }
  }
  else if (verdict == ChunkUnknown) { ...s, inFlight: false, phase: Uncertain }
  else { ...s, inFlight: false, phase: Stopped }
pure def alwaysReceiptsAreBounded(s: Batch): bool = 0 <= s.renamed and s.renamed <= s.done and s.done <= s.answered and s.answered <= s.total
pure def alwaysOnlyATrashKeepsAnUndo(s: Batch): bool = s.undo <= s.done and (s.op != TrashFiles implies s.undo == 0)
pure def lawAnUnknownChunkIsNeverConfirmed(b: Batch, answered: int, done: int, renamed: int): bool = {
  val after = settleChunk(b, ChunkUnknown, answered, done, renamed)
  after.done == b.done and after.answered == b.answered and after.phase == Uncertain
}
pure def lawAConfirmedTrashKeepsItsUndo(b: Batch, answered: int, done: int, renamed: int): bool =
  b.op == TrashFiles implies settleChunk(b, ChunkConfirmed, answered, done, renamed).undo == b.undo + done
pure def sometimesPartlyDone(s: Batch): bool = s.phase == Finished and s.done < s.total
pure def sometimesUncertainKeepsWhatWasConfirmed(s: Batch): bool = s.phase == Uncertain and s.done > 0
pure def sometimesTwoChunks(s: Batch): bool = s.phase == Finished and s.chunks == 2
```

### Leaving Files retires the batch; the chunk in flight still settles

```quint
pure def canRetireBatch(s: Batch): bool = s.phase == Running and not(s.retired)
pure def retireBatch(s: Batch): Batch = { ...s, retired: true, phase: if (s.inFlight) Running else Stopped }
pure def canDismissBatch(s: Batch): bool = s.phase == Finished or s.phase == Stopped or s.phase == Uncertain
pure def dismissBatch(s: Batch): Batch = { ...initial, serial: s.serial }
pure def alwaysARetiredBatchIsSettling(s: Batch): bool = (s.retired and s.phase == Running) implies s.inFlight
pure def sometimesStoppedOnLeave(s: Batch): bool = s.phase == Stopped and s.retired and s.done > 0
```

## Story: Trust each row's own receipt

> As the owner, I want a file counted as moved, copied, trashed or restored only when the device says
> so for that file and names where it went.

### A row is done only when its answer is the operation's result and names the result

A move into the folder a file is already in is unchanged; a name already used is kept, never replaced;
a file that changed since review answers `changed`.

```quint
type RowAnswer = RowCopied | RowMoved | RowTrashed | RowRestored | RowExists | RowChanged | RowMissing | RowInvalid | RowUnchanged | RowFailed | RowUnknown
pure def rowDone(op: BatchOp, answer: RowAnswer, named: bool): bool =
  named and (if (op == CopyFiles) answer == RowCopied else if (op == MoveFiles) answer == RowMoved
    else if (op == TrashFiles) answer == RowTrashed else if (op == RestoreFiles) answer == RowRestored else false)
pure def lawADoneRowNamesItsResult(op: BatchOp, answer: RowAnswer, named: bool): bool = rowDone(op, answer, named) implies named
pure def lawASameFolderMoveIsNotDone(named: bool): bool = not(rowDone(MoveFiles, RowUnchanged, named))
pure def lawAChangedFileIsLeftAlone(op: BatchOp, named: bool): bool = not(rowDone(op, RowChanged, named))
pure def lawAnUnknownRowIsNeverDone(op: BatchOp, named: bool): bool = not(rowDone(op, RowUnknown, named))
```
