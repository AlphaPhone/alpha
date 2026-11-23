# Photo edits and saved copies

The photo editor over one photo: rotate in quarter turns, a look (Original,
Vivid, Warm, Cool, Mono, Fade, Noir), and a crop chosen over the whole
rotated photo. Save copy writes a new photo and keeps the original; Replace
original overwrites exactly the reviewed revision, only when Android allows
it and only after the owner confirms. One operation writes at most once: a
retry cannot turn a copy into a replace, an identity edit writes nothing,
reading an outcome that never committed retires it so a suspended save can
no longer commit, and a source that changed meanwhile fails the save. The
pending copy request that survives a restart is [its own durable
record](./copyIntent.md).

## Domain

### An editor session holds its source revision, the edit, the step it is in and what it wrote

```quint
type Look = Original | Vivid | Warm | Cool | Mono | Fade | Noir
type SaveMode = CopyMode | ReplaceMode
type Status = EditClosed | Editing | SavingEdit | EditUncertain | EditSaved | EditFailed | EditStale | EditUnchanged
type CropArea = { x: int, y: int, width: int, height: int }
type SaveAnswer = SavedCopy | SavedReplace | SaveFailed | SourceStale | NothingChanged | SaveUnconfirmed
type ReadBack = FoundSaved | FoundNothing | ReadFailed
type Edit = {
  status: Status, session: int, source: str, image: str, rotation: int, look: Look, cropped: bool, crop: CropArea, cropping: bool, previewing: bool,
  canReplace: bool, mode: SaveMode, modeChosen: bool, writes: int, replaced: bool,
  sourceRevision: int, seenRevision: int, closeAsked: bool, retired: bool
}
pure val wholePhoto: CropArea = { x: 0, y: 0, width: 1000, height: 1000 }
pure val initial: Edit = {
  status: EditClosed, session: 0, source: "", image: "", rotation: 0, look: Original, cropped: false, crop: wholePhoto, cropping: false, previewing: false,
  canReplace: false, mode: CopyMode, modeChosen: false, writes: 0, replaced: false,
  sourceRevision: 0, seenRevision: 0, closeAsked: false, retired: false
}
pure def changed(e: Edit): bool = e.rotation != 0 or e.cropped or e.look != Original
pure def editable(e: Edit): bool = e.status == Editing and not(e.previewing) and not(e.cropping) and not(e.closeAsked)
pure val lookValues = Set(Original, Vivid, Mono)
pure val modeValues = Set(CopyMode, ReplaceMode)
pure val answerValues = Set(SavedCopy, SavedReplace, SaveFailed, SourceStale, NothingChanged, SaveUnconfirmed)
pure val readValues = Set(FoundSaved, FoundNothing, ReadFailed)
pure val weight_save = 2
pure val weight_saveSettled = 3
```

## Story: Edit a photo and keep the original

> As the owner, I want my edits saved as a copy unless I choose to replace
> the original, exactly once, and to be told when a save could not be
> confirmed, so that a photo is never lost or duplicated.

### An editor opens only on a current photo and never while an earlier copy's outcome is unresolved

```quint
pure def canBegin(e: Edit, source: str, canReplace: bool, unresolved: bool, image: str): bool =
  not(unresolved) and source != "" and image != "" and (e.status == EditClosed or e.status == EditSaved or e.status == EditFailed or e.status == EditStale or e.status == EditUnchanged)
pure def begin(e: Edit, source: str, canReplace: bool, unresolved: bool, image: str): Edit =
  { ...initial, status: Editing, session: e.session + 1, source: source, image: image, canReplace: canReplace,
    sourceRevision: e.sourceRevision, seenRevision: e.sourceRevision }
```

### Rotate turns the photo and its crop a quarter clockwise; a look and the crop are previewed before they count

The crop step shows the whole rotated photo; keeping all of it is no crop.
The owner drags the area to move it within the photo, drags a corner to resize
it against the opposite corner (holding a chosen shape), uses the arrow keys
to the same effect, or resets it to the whole photo or the centred shape.
An area is in thousandths of the rotated photo and keeps at least 5% of each
side.

```quint
pure def quarterTurn(area: CropArea): CropArea = { x: 1000 - (area.y + area.height), y: area.x, width: area.height, height: area.width }
pure def areaInside(area: CropArea): bool =
  area.x >= 0 and area.y >= 0 and area.width >= 50 and area.height >= 50 and area.x + area.width <= 1000 and area.y + area.height <= 1000
pure def whole(area: CropArea): bool = area.x == 0 and area.y == 0 and area.width == 1000 and area.height == 1000
pure def lawQuarterTurnKeepsTheArea(area: CropArea): bool = areaInside(area) implies (areaInside(quarterTurn(area)) and
  quarterTurn(area).width * quarterTurn(area).height == area.width * area.height)
pure val areaValues = Set({ x: 0, y: 0, width: 1000, height: 1000 }, { x: 100, y: 200, width: 500, height: 300 }, { x: 990, y: 0, width: 10, height: 10 })
pure def canRotateEdit(e: Edit): bool = editable(e)
pure def rotateEdit(e: Edit): Edit = { ...e, rotation: (e.rotation + 90) % 360, crop: quarterTurn(e.crop), previewing: true }
pure def canChooseLook(e: Edit, look: Look): bool = editable(e) and look != e.look
pure def chooseLook(e: Edit, look: Look): Edit = { ...e, look: look, previewing: true }
pure def canPreviewSettled(e: Edit, ok: bool, image: str): bool = e.previewing and (ok == (image != ""))
pure def previewSettled(e: Edit, ok: bool, image: str): Edit = { ...e, previewing: false, image: if (ok) image else e.image }
pure val imageValues = Set("", "data:image/jpeg;base64,AA")
pure val sourceValues = Set("", "m:1")
pure def canStartCrop(e: Edit): bool = editable(e)
pure def startCrop(e: Edit): Edit = { ...e, cropping: true }
pure def canApplyCrop(e: Edit, area: CropArea): bool = e.status == Editing and e.cropping and not(e.previewing) and areaInside(area)
pure def applyCrop(e: Edit, area: CropArea): Edit = { ...e, cropping: false, cropped: not(whole(area)), crop: area, previewing: true }
pure def alwaysCropInsideThePhoto(e: Edit): bool = areaInside(e.crop) and (e.cropped iff not(whole(e.crop)))
pure def canCancelCrop(e: Edit): bool = e.cropping and not(e.previewing)
pure def cancelCrop(e: Edit): Edit = { ...e, cropping: false }
pure def alwaysQuarterTurns(e: Edit): bool = e.rotation == 0 or e.rotation == 90 or e.rotation == 180 or e.rotation == 270
```

### A save serves one mode: Save copy, or Replace original where Android allows it and the edit changed something

An unchanged edit saves nothing.

```quint
pure def canSave(e: Edit, mode: SaveMode): bool =
  editable(e) and (mode == CopyMode or (e.canReplace and changed(e))) and (not(e.modeChosen) or e.mode == mode)
pure def save(e: Edit, mode: SaveMode): Edit =
  if (not(changed(e))) { ...e, status: EditUnchanged, mode: mode, modeChosen: true }
  else { ...e, status: SavingEdit, mode: mode, modeChosen: true }
pure def stepModeNeverChanges(before: Edit, via: str, after: Edit): bool =
  (before.modeChosen and via != "begin") implies after.mode == before.mode
pure def alwaysIdentityEditWritesNothing(e: Edit): bool = e.status == EditUnchanged implies e.writes == 0
```

### A copy is written only by the save that still owns the session, over an unchanged source

```quint
pure def canSaveSettled(e: Edit, answer: SaveAnswer): bool = e.status == SavingEdit and (answer == SavedReplace implies e.mode == ReplaceMode)
pure def saveSettled(e: Edit, answer: SaveAnswer): Edit =
  if ((answer == SavedCopy or answer == SavedReplace) and e.sourceRevision != e.seenRevision) { ...e, status: EditStale }
  else if (answer == SavedCopy or answer == SavedReplace)
    { ...e, status: EditSaved, writes: e.writes + 1, replaced: answer == SavedReplace,
      sourceRevision: if (answer == SavedReplace) e.sourceRevision + 1 else e.sourceRevision }
  else if (answer == SaveFailed) { ...e, status: EditFailed }
  else if (answer == SourceStale) { ...e, status: EditStale }
  else if (answer == NothingChanged) { ...e, status: EditUnchanged }
  else { ...e, status: EditUncertain }
pure def alwaysAtMostOneWritePerSession(e: Edit): bool = e.writes == 0 or e.writes == 1
pure def alwaysSavedHasItsWrite(e: Edit): bool = e.status == EditSaved implies e.writes == 1
pure def alwaysReplaceOnlyWhenChosen(e: Edit): bool = e.replaced implies (e.mode == ReplaceMode and e.canReplace)
pure def sometimesReplacedOriginal(e: Edit): bool = e.replaced and e.status == EditSaved
pure def sometimesChangedSourceFailed(e: Edit): bool = e.status == EditStale and e.sourceRevision != e.seenRevision
```

### An unconfirmed save is resolved only by reading its outcome, and a read that finds nothing retires it

```quint
pure def canRecover(e: Edit, read: ReadBack): bool = e.status == EditUncertain
pure def recover(e: Edit, read: ReadBack): Edit =
  if (read == FoundSaved) { ...e, status: EditSaved, writes: 1, replaced: e.mode == ReplaceMode and e.canReplace }
  else if (read == FoundNothing) { ...e, status: EditFailed, retired: true }
  else e
pure def alwaysRetiredSaveWroteNothing(e: Edit): bool = e.retired implies (e.writes == 0 and e.status != SavingEdit)
pure def sometimesRetiredSuspendedSave(e: Edit): bool = e.retired
```

### Someone else may change the photo while the editor is open

```quint
pure def canSourceEdited(e: Edit): bool = e.status != EditClosed
pure def sourceEdited(e: Edit): Edit = { ...e, sourceRevision: e.sourceRevision + 1 }
```

### Closing a changed or saving editor asks first, and closing never undoes a completed save

```quint
pure def canAskClose(e: Edit): bool = e.status != EditClosed and not(e.closeAsked)
pure def askClose(e: Edit): Edit =
  if (changed(e) or e.status == SavingEdit or e.status == EditUncertain or e.previewing) { ...e, closeAsked: true }
  else { ...e, status: EditClosed, cropping: false }
pure def canKeepEditing(e: Edit): bool = e.closeAsked
pure def keepEditing(e: Edit): Edit = { ...e, closeAsked: false }
pure def canConfirmClose(e: Edit): bool = e.closeAsked
pure def confirmClose(e: Edit): Edit = { ...e, status: EditClosed, closeAsked: false, cropping: false, previewing: false }
pure def stepClosingKeepsWrites(before: Edit, via: str, after: Edit): bool = via == "confirmClose" implies after.writes == before.writes
```
