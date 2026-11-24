# Recent files

Recent is the index of the documents the owner opened, newest first, at most 24, on this phone only.
Browse lists no Recents (owner decision F2): the index decides which grants the device keeps, which
picked document Files reopens, and which row asks to be chosen again. A row holds names, types, times
and an opaque selection; it never grants access itself. The device keeps the grant
of each picked document while a row names it or it is open, and the shell gives back every grant the
index stops naming. A folder file's access lasts one Android session: its row then asks to be chosen
again and is never reopened silently. Only a picked document that Recent still remembers is reopened
when Files starts again.

## Domain

### A Recent row and the grants the index holds

`selection` is empty for a row that holds no grant: an exported scan, or a row whose access ended.
`toRelease` holds the grants the shell must give back; it empties once it has.

```quint
type RecentKind = PickedDoc | TreeDoc | ScanPdf
type RecentStatus = Ready | Revoked | Saved
type RecentRow = { key: str, kind: RecentKind, name: str, mimeType: str, openedAt: int, status: RecentStatus, selection: str }
type Recent = { rows: List[RecentRow], opened: str, grants: List[str], toRelease: List[str], restoreOpen: str }
type Recording = { kept: List[RecentRow], dropped: List[RecentRow] }
pure val recentLimit = 24
pure val initial: Recent = { rows: List(), opened: "", grants: List(), toRelease: List(), restoreOpen: "" }
pure def names(rows: List[RecentRow], id: str): bool = id != "" and rows.some(r => r.selection == id)
pure def sameRow(old: RecentRow, row: RecentRow): bool =
  old.key == row.key or (row.kind == TreeDoc and old.kind == TreeDoc and old.status == Revoked and old.name == row.name and old.mimeType == row.mimeType)
pure def recordedWith(rows: List[RecentRow], row: RecentRow, limit: int): Recording = {
  val ordered = List(row).concat(rows.select(old => not(sameRow(old, row))))
  val kept = ordered.foldl(List(), (acc, r) => if (acc.length() < limit) acc.append(r) else acc)
  { kept: kept, dropped: rows.select(old => not(kept.includes(old))) }
}
pure def unnamed(dropped: List[RecentRow], kept: List[RecentRow], keep: str): List[str] =
  dropped.foldl(List(), (ids, old) =>
    if (old.selection != "" and old.selection != keep and not(names(kept, old.selection)) and not(ids.includes(old.selection))) ids.append(old.selection) else ids)
pure def remembered(rows: List[RecentRow], id: str): bool = id != "" and rows.some(r => r.selection == id and r.kind == PickedDoc and r.status == Ready)
pure def without(ids: List[str], gone: List[str]): List[str] = ids.select(i => not(gone.includes(i)))
```

### What the simulator tries

```quint
pure val pickedRow: RecentRow = { key: "picked:s1", kind: PickedDoc, name: "a.pdf", mimeType: "application/pdf", openedAt: 1, status: Ready, selection: "s1" }
pure val treeRow: RecentRow = { key: "tree:t1", kind: TreeDoc, name: "a.pdf", mimeType: "application/pdf", openedAt: 2, status: Revoked, selection: "" }
pure val recentsValues = Set(List(), List(pickedRow), List(pickedRow, treeRow))
pure val entryValues = Set({ ...pickedRow, key: "picked:s2", selection: "s2" }, { ...treeRow, status: Ready, selection: "s3", key: "tree:t2" })
pure val limitValues = Set(1, 2)
pure val selectionValues = Set("s1", "s2", "s3")
pure val keyValues = Set("picked:s1", "tree:t1", "scan:a")
pure val nameValues = Set("a.pdf", "b.txt")
pure val mimeTypeValues = Set("application/pdf")
pure val atValues = Set(1, 2)
```

## Story: Reopen what I opened recently

> As the owner, I want Files to remember the documents I opened, newest first, with two picked files of
> the same name kept apart and a folder file opened again kept once, and to give back each grant it no
> longer needs.

### Recording a row puts it first, replaces only its own row, and keeps at most the limit

A picked document is its own row by its selection; a folder file is keyed by its folder identity and
also replaces a revoked folder row of the same name and type.

```quint
pure def lawRecordingKeepsAtMostTheLimit(recents: List[RecentRow], entry: RecentRow, limit: int): bool =
  recordedWith(recents, entry, limit).kept.length() <= limit
pure def lawRecordingPutsTheRowFirst(recents: List[RecentRow], entry: RecentRow, limit: int): bool =
  recordedWith(recents, entry, limit).kept.nthOr(0, entry) == entry
pure def lawADroppedRowIsNotKept(recents: List[RecentRow], entry: RecentRow, limit: int): bool = {
  val r = recordedWith(recents, entry, limit)
  r.dropped.every(old => not(r.kept.includes(old)))
}
pure def lawAnEvictedGrantNoKeptRowNames(recents: List[RecentRow], entry: RecentRow, limit: int): bool = {
  val r = recordedWith(recents, entry, limit)
  unnamed(r.dropped, r.kept, "").every(id => not(names(r.kept, id)))
}
```

### Opening a document records it and holds its grant; the previous one is closed first

Closing keeps the grant a row still names. A document opened without a row holds its grant only while
it is open.

```quint
pure def canAcceptDocument(s: Recent, kind: RecentKind, selection: str): bool =
  kind != ScanPdf and selection != "" and not(s.grants.includes(selection)) and not(s.toRelease.includes(selection))
pure def acceptDocument(s: Recent, kind: RecentKind, key: str, selection: str, name: str, mimeType: str, at: int, listed: bool): Recent = {
  val closing = if (s.opened != "" and not(names(s.rows, s.opened))) List(s.opened) else List()
  val row = { key: key, kind: kind, name: name, mimeType: mimeType, openedAt: at, status: Ready, selection: selection }
  val r = recordedWith(s.rows, row, recentLimit)
  val gone = if (listed) unnamed(r.dropped, r.kept, selection) else List()
  val rows = if (listed) r.kept else s.rows
  { rows: rows, opened: selection, grants: without(s.grants, closing.concat(gone)).append(selection),
    toRelease: s.toRelease.concat(closing).concat(gone), restoreOpen: if (remembered(rows, s.restoreOpen)) s.restoreOpen else "" }
}
pure def canCloseDocument(s: Recent): bool = s.opened != ""
pure def closeDocument(s: Recent, forget: bool): Recent = {
  val rows = if (forget) s.rows.select(r => r.selection != s.opened) else s.rows
  val release = forget or not(names(s.rows, s.opened))
  { rows: rows, opened: "", grants: if (release) without(s.grants, List(s.opened)) else s.grants,
    toRelease: if (release) s.toRelease.append(s.opened) else s.toRelease,
    restoreOpen: if (remembered(rows, s.restoreOpen)) s.restoreOpen else "" }
}
pure def sometimesTwoPickedRowsShareAName(s: Recent): bool =
  s.rows.length() == 2 and s.rows.every(r => r.kind == PickedDoc) and s.rows.nthOr(0, pickedRow).name == s.rows.nthOr(1, pickedRow).name
```

### Reopening a row shows its own grant, and the document open before it is closed first

```quint
pure def selectionOf(rows: List[RecentRow], key: str): str = rows.foldl("", (found, r) => if (r.key == key) r.selection else found)
pure def canReopenRow(s: Recent, key: str): bool =
  s.rows.some(r => r.key == key and r.status == Ready and r.selection != "" and r.selection != s.opened)
pure def reopenRow(s: Recent, key: str): Recent = {
  val closing = if (s.opened != "" and not(names(s.rows, s.opened))) List(s.opened) else List()
  { ...s, opened: selectionOf(s.rows, key), grants: without(s.grants, closing), toRelease: s.toRelease.concat(closing),
    restoreOpen: if (remembered(s.rows, s.restoreOpen)) s.restoreOpen else "" }
}
pure def stepReopeningOpensTheRowsGrant(before: Recent, via: str, after: Recent): bool =
  via == "reopenRow" implies (after.opened != "" and names(before.rows, after.opened))
pure def sometimesReopened(s: Recent): bool = s.opened != "" and s.rows.length() == 2 and s.toRelease.length() == 0
```

### An exported scan is listed by name and holds no grant

A row it pushes out gives up its grant, unless that document is open: the grant goes when it closes.

```quint
pure def canSavedPdf(s: Recent, key: str): bool = key != ""
pure def savedPdf(s: Recent, key: str, name: str, at: int): Recent = {
  val row = { key: key, kind: ScanPdf, name: name, mimeType: "application/pdf", openedAt: at, status: Saved, selection: "" }
  val r = recordedWith(s.rows, row, recentLimit)
  val gone = unnamed(r.dropped, r.kept, s.opened)
  { ...s, rows: r.kept, grants: without(s.grants, gone), toRelease: s.toRelease.concat(gone),
    restoreOpen: if (remembered(r.kept, s.restoreOpen)) s.restoreOpen else "" }
}
pure def sometimesAScanIsListed(s: Recent): bool = s.rows.some(r => r.kind == ScanPdf and r.status == Saved)
```

### A folder file's access ends with the Android session, and a row whose access ended asks to be chosen again

```quint
pure def canTreeSessionEnds(s: Recent): bool = s.rows.some(r => r.kind == TreeDoc and r.status == Ready)
pure def treeSessionEnds(s: Recent): Recent = {
  val ended = s.rows.foldl(List(), (ids, r) => if (r.kind == TreeDoc and r.status == Ready and not(ids.includes(r.selection))) ids.append(r.selection) else ids)
  val rows = s.rows.listMap(r => if (r.kind == TreeDoc and r.status == Ready) { ...r, status: Revoked, selection: "" } else r)
  { rows: rows, opened: if (ended.includes(s.opened)) "" else s.opened, grants: without(s.grants, ended),
    toRelease: s.toRelease.concat(ended), restoreOpen: if (remembered(rows, s.restoreOpen)) s.restoreOpen else "" }
}
pure def canRevokeRow(s: Recent, key: str): bool = s.rows.some(r => r.key == key and r.status == Ready)
pure def revokeRow(s: Recent, key: str): Recent = {
  val ended = s.rows.foldl(List(), (ids, r) => if (r.key == key and r.selection != "" and not(ids.includes(r.selection))) ids.append(r.selection) else ids)
  val rows = s.rows.listMap(r => if (r.key == key) { ...r, status: Revoked, selection: "" } else r)
  { rows: rows, opened: if (ended.includes(s.opened)) "" else s.opened, grants: without(s.grants, ended),
    toRelease: s.toRelease.concat(ended), restoreOpen: if (remembered(rows, s.restoreOpen)) s.restoreOpen else "" }
}
pure def canRemoveRow(s: Recent, key: str): bool = s.rows.some(r => r.key == key)
pure def removeRow(s: Recent, key: str): Recent = {
  val rows = s.rows.select(r => r.key != key)
  val gone = unnamed(s.rows.select(r => r.key == key), rows, s.opened)
  { ...s, rows: rows, grants: without(s.grants, gone), toRelease: s.toRelease.concat(gone),
    restoreOpen: if (remembered(rows, s.restoreOpen)) s.restoreOpen else "" }
}
pure def sometimesAFolderRowAsksAgain(s: Recent): bool = s.rows.some(r => r.kind == TreeDoc and r.status == Revoked)
```

### Every grant the index holds is named by a row or open, and every grant it gave up is released

```quint
pure def canReleasedGrants(s: Recent): bool = s.toRelease.length() > 0
pure def releasedGrants(s: Recent): Recent = { ...s, toRelease: List() }
pure def alwaysRecentIsBounded(s: Recent): bool = s.rows.length() <= recentLimit
pure def alwaysRowKeysAreUnique(s: Recent): bool = s.rows.every(r => s.rows.select(o => o.key == r.key).length() == 1)
pure def alwaysAReadyRowHoldsItsGrant(s: Recent): bool = s.rows.every(r => r.status != Ready or (r.selection != "" and s.grants.includes(r.selection)))
pure def alwaysEachGrantNamesOneRow(s: Recent): bool = s.rows.every(r => r.selection == "" or s.rows.select(o => o.selection == r.selection).length() == 1)
pure def alwaysAnUnreadyRowHoldsNoSelection(s: Recent): bool = s.rows.every(r => r.status == Ready or r.selection == "")
pure def alwaysNoGrantIsOrphaned(s: Recent): bool = s.grants.every(id => id == s.opened or names(s.rows, id))
pure def alwaysTheOpenDocumentHoldsItsGrant(s: Recent): bool = s.opened == "" or s.grants.includes(s.opened)
pure def alwaysAReleasedGrantIsNotHeld(s: Recent): bool = s.toRelease.every(id => not(s.grants.includes(id)) and not(names(s.rows, id)) and id != s.opened)
pure def sometimesAGrantIsGivenBack(s: Recent): bool = s.toRelease.length() > 0 and s.rows.length() > 0
```

## Story: Come back to the document I had open

> As the owner, I want Files to reopen the picked document I had open when it starts again, and no
> other: never a browsed file, a revoked row or a row Recent no longer has.

### Only a remembered, ready picked document is restored

```quint
pure def canRememberOpen(s: Recent): bool = remembered(s.rows, s.opened) and s.restoreOpen != s.opened
pure def rememberOpen(s: Recent): Recent = { ...s, restoreOpen: s.opened }
pure def canForgetOpen(s: Recent): bool = s.restoreOpen != ""
pure def forgetOpen(s: Recent): Recent = { ...s, restoreOpen: "" }
pure def alwaysRestoreNamesARememberedPick(s: Recent): bool = s.restoreOpen == "" or remembered(s.rows, s.restoreOpen)
pure def sometimesRestorable(s: Recent): bool = s.restoreOpen != "" and s.opened == ""
```

### A phone updated from the previous Alpha keeps its Recent and the document it had open

The previous Alpha kept Recent and the picked document showing when it last closed in its own index
on this phone. When this version's Recent is empty, holds no grant and has nothing open or to
restore, it takes that index once, newest first: a picked row stays a picked document with its
selection, an exported scan stays a scan with none, a row whose access had ended asks to be chosen
again, and a row without its key, a second row of the same key or selection, a ready row without a
selection and anything past 24 are skipped. The grants of the rows it keeps are held as before, a
ready row it skips gives its grant back unless a kept row names it, and the document that was open is
restored only when it is a kept, ready picked document. The previous index is removed only after
Recent reads back with what it took; a Recent already in use leaves both as they are.

```quint
pure def asPrevious(r: RecentRow): RecentRow = if (r.status == Ready) r else { ...r, selection: "" }
pure def keepsPrevious(acc: List[RecentRow], r: RecentRow): bool =
  acc.length() < recentLimit and r.key != "" and not(acc.some(o => o.key == r.key))
    and (r.status != Ready or (r.selection != "" and not(names(acc, r.selection))))
pure def canAdoptPrevious(s: Recent, previous: List[RecentRow], wasOpen: str): bool =
  s == initial and previous.length() > 0
pure def adoptPrevious(s: Recent, previous: List[RecentRow], wasOpen: str): Recent = {
  val kept = previous.foldl(List(), (acc, r) => if (keepsPrevious(acc, asPrevious(r))) acc.append(asPrevious(r)) else acc)
  val held = kept.foldl(List(), (ids, r) => if (r.selection != "") ids.append(r.selection) else ids)
  val gone = previous.foldl(List(), (ids, r) =>
    if (r.status == Ready and r.selection != "" and not(names(kept, r.selection)) and not(ids.includes(r.selection))) ids.append(r.selection) else ids)
  { rows: kept, opened: "", grants: held, toRelease: gone, restoreOpen: if (remembered(kept, wasOpen)) wasOpen else "" }
}
pure def stepThePreviousIndexIsTakenOnlyByAnUnusedRecent(before: Recent, via: str, after: Recent): bool =
  via == "adoptPrevious" implies (before == initial and after.opened == "")
pure def lawAPreviousRowWhoseAccessEndedAsksAgain(row: RecentRow): bool =
  row.status == Revoked implies adoptPrevious(initial, List(row), "").rows.every(r => r.selection == "" and r.status == Revoked)
pure def lawOnlyAKeptPickIsRestored(previous: List[RecentRow], wasOpen: str): bool = {
  val r = adoptPrevious(initial, previous, wasOpen)
  r.restoreOpen == "" or remembered(r.rows, r.restoreOpen)
}
pure val previousScan: RecentRow = { key: "scan:a", kind: ScanPdf, name: "a.pdf", mimeType: "application/pdf", openedAt: 3, status: Saved, selection: "" }
pure val previousEnded: RecentRow = { ...pickedRow, key: "picked:s9", selection: "s9", status: Revoked }
pure val previousValues = Set(
  List(pickedRow, { ...pickedRow, key: "picked:s2", selection: "s2" }, previousScan),
  List(previousEnded, pickedRow, { ...pickedRow, key: "picked:s3" }, { ...pickedRow, key: "", selection: "s4" }))
pure val wasOpenValues = Set("", "s1", "s2", "s9")
pure val rowValues = Set(pickedRow, previousEnded, previousScan)
pure def sometimesThePreviousIndexIsTaken(s: Recent): bool = s.rows.length() >= 2 and s.restoreOpen != "" and s.opened == ""
```
