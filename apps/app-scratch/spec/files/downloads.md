# Downloads of selected files

In the browser build Files has no other app to hand a file to: Download saves the selected files
through the browser's own downloads. One file downloads as itself and several as one archive whose
entries hold the bytes read for review, in selection order, named by their position. The selection is
read again after the bytes are prepared, and the download is handed over only while this request is the
newest, its owner is current and the page is visible. Handing it over is a request: the browser never
says where, or whether, the file was saved. On the phone, Android's Downloads holds what the Browser
saved, and Files shows it under Downloads.

## Domain

### One download request at a time, numbered

```quint
import storage.* from "./storage"
type ExportPhase = ExportIdle | ReadingFiles | Encoding | ExportReady | Handed | ExportRefused
type ExportKind = SingleFile | Archive
type Export = { phase: ExportPhase, serial: int, ticket: int, batch: int, count: int, kind: ExportKind, handed: bool }
pure val initial: Export = { phase: ExportIdle, serial: 0, ticket: 0, batch: 0, count: 0, kind: SingleFile, handed: false }
pure def allowedSelection(count: int, unique: bool): bool = count >= 1 and count <= shareMax and unique
pure def exportKind(count: int): ExportKind = if (count == 1) SingleFile else Archive
pure val batchValues = Set(1, 2)
pure val exportIdValues = Set(1, 2, 3)
pure val countValues = Set(0, 1, 2, 100, 101)
```

## Story: Download exactly the files I selected

> As the owner, I want a download to hold the files I selected as they were when I chose them, so I
> never save a file I did not choose or a changed copy of one.

### A download takes one to 100 distinct selected files, read again before it is handed over

```quint
pure def canBeginExport(s: Export, batch: int, count: int, unique: bool, ownerCurrent: bool): bool =
  s.phase != ReadingFiles and s.phase != Encoding and s.phase != ExportReady and batch > 0 and allowedSelection(count, unique) and ownerCurrent
pure def beginExport(s: Export, batch: int, count: int, unique: bool, ownerCurrent: bool): Export =
  { ...initial, serial: s.serial + 1, ticket: s.serial + 1, phase: ReadingFiles, batch: batch, count: count, kind: exportKind(count) }
pure def canFinishReading(s: Export, exportId: int): bool = s.phase == ReadingFiles and exportId == s.ticket
pure def finishReading(s: Export, exportId: int, valid: bool): Export = { ...s, phase: if (valid) Encoding else ExportRefused }
pure def canFinishEncoding(s: Export, exportId: int): bool = s.phase == Encoding and exportId == s.ticket
pure def finishEncoding(s: Export, exportId: int, encoded: bool): Export = { ...s, phase: if (encoded) ExportReady else ExportRefused }
pure def canCheckAndHand(s: Export, exportId: int): bool = s.phase == ExportReady and exportId == s.ticket
pure def checkAndHand(s: Export, exportId: int, batch: int, reread: bool, ownerCurrent: bool, visible: bool): Export = {
  val matching = batch == s.batch and reread and ownerCurrent and visible
  { ...s, phase: if (matching) Handed else ExportRefused, handed: matching }
}
pure def canRetireExport(s: Export): bool = s.phase == ReadingFiles or s.phase == Encoding or s.phase == ExportReady
pure def retireExport(s: Export): Export = { ...s, phase: ExportRefused }
pure def alwaysTheTicketIsTheNewest(s: Export): bool = s.serial >= 0 and s.ticket == s.serial and (s.phase != ExportIdle implies s.ticket > 0)
pure def alwaysABoundedSelection(s: Export): bool = s.phase != ExportIdle implies (s.batch > 0 and allowedSelection(s.count, true) and s.kind == exportKind(s.count))
pure def alwaysHandedMatchesThePhase(s: Export): bool = s.handed == (s.phase == Handed)
pure def stepOnlyAReadyDownloadIsHanded(before: Export, via: str, after: Export): bool =
  (after.handed and not(before.handed)) implies (via == "checkAndHand" and before.phase == ExportReady and after.ticket == before.ticket)
pure def sometimesOneFileHanded(s: Export): bool = s.handed and s.kind == SingleFile
pure def sometimesArchiveHanded(s: Export): bool = s.handed and s.kind == Archive
```

### An archive holds exactly the selected bytes, in selection order, under distinct names

```quint
type SelectedBytes = { source: str, content: str }
type ArchiveEntry = { position: int, source: str, content: str }
type NameWalk = { consecutive: bool, last: int }
pure def archiveEntries(selection: List[SelectedBytes]): List[ArchiveEntry] =
  selection.foldl(List(), (entries, file) => entries.append({ position: entries.length() + 1, source: file.source, content: file.content }))
pure def namesCountFromOne(entries: List[ArchiveEntry]): bool =
  entries.foldl({ consecutive: true, last: 0 }, (walk, entry) => { consecutive: walk.consecutive and entry.position == walk.last + 1, last: entry.position }).consecutive
pure val selectionValues = Set(List(), List({ source: "a", content: "p" }), List({ source: "a", content: "p" }, { source: "b", content: "v" }),
  List({ source: "b", content: "v" }, { source: "a", content: "p" }, { source: "c", content: "p" }))
pure def lawAnArchiveHoldsTheSelectedBytesInOrder(selection: List[SelectedBytes]): bool =
  archiveEntries(selection).listMap(entry => { source: entry.source, content: entry.content }) == selection
pure def lawArchiveNamesCountFromOne(selection: List[SelectedBytes]): bool = namesCountFromOne(archiveEntries(selection))
```
