# Focus

Where keyboard and TalkBack focus goes when what is on screen changes without the owner moving it:
a new screen, a resize that took the focused control away, a modal that closed, a list that
re-rendered its rows. Focus the owner placed is never taken; the shell only fills a gap, and only
for a bounded time. The shell reports every focus change (`focusin`, `focusout`) and each animation
frame it waits; the element ids are the controls' `data-alpha-focus` keys.

```quint
type Target = TargetNone | TargetSelf | TargetSearch | TargetHome | TargetTitle | TargetRegion
type Cause = Idle | ScreenChange | ResizeLoss
type Opener = { modal: str, opener: str }
type Focus = {
  cause: Cause, frames: int, target: Target, active: str, held: str, moves: int, lastMove: Target,
  openers: List[Opener], waiting: str, restores: int, lastRestore: str,
  rowList: str, rowKey: str, rowMoved: bool, lastRow: str
}
pure val initial: Focus = {
  cause: Idle, frames: 0, target: TargetNone, active: "", held: "", moves: 0, lastMove: TargetNone,
  openers: List(), waiting: "", restores: 0, lastRestore: "",
  rowList: "", rowKey: "", rowMoved: false, lastRow: ""
}
pure val WaitFrames = 12
pure val keyValues = Set("", "opener", "field", "row-2")
pure val modalValues = Set("sheet-a", "sheet-b")
pure val openerValues = Set("opener", "tile-notes")
pure val listIdValues = Set("inbox")
pure val rowValues = Set("row-1", "row-2")
```

## Story: Keep my place when the screen changes under me

> As the owner using TalkBack or a keyboard, I want focus to land on the new screen's title, the
> library's search or Home, to come back to the control that opened a sheet once it closes, and
> never to be pulled away from where I put it.

### A new screen is given focus within twelve frames, unless the owner already moved it

After a screen change (an app, Home, the library opening) the shell waits two frames for the
screen to render, then looks each frame for the screen's target: a screen that focuses itself, the
library's search, Home's first control, the app's title, else the app's region. A control that
already holds focus on the new screen keeps it. A resize that removed the focused control asks for
the same, but only while that control is still gone, and never over a screen change in progress.

```quint
pure def canScreenChanged(f: Focus, target: Target): bool = target != TargetNone
pure def screenChanged(f: Focus, target: Target): Focus = { ...f, cause: ScreenChange, frames: WaitFrames, target: target }
pure def canResizeLost(f: Focus, target: Target): bool =
  f.held != "" and f.active != f.held and f.cause != ScreenChange and target != TargetNone
pure def resizeLost(f: Focus, target: Target): Focus = { ...f, cause: ResizeLoss, frames: WaitFrames, target: target }
pure def canFrame(f: Focus, activeShown: bool, targetFound: bool, heldShown: bool): bool = f.cause != Idle
pure def frame(f: Focus, activeShown: bool, targetFound: bool, heldShown: bool): Focus = {
  val stop = { ...f, cause: Idle, frames: 0, target: TargetNone }
  val allowed = f.cause == ScreenChange or not(heldShown)
  if (activeShown and f.active != "") stop
  else if (allowed and targetFound) { ...stop, moves: f.moves + 1, lastMove: f.target }
  else if (f.frames <= 1) stop
  else { ...f, frames: f.frames - 1 }
}
pure def alwaysTheWaitIsBounded(f: Focus): bool =
  f.frames >= 0 and f.frames <= WaitFrames and ((f.cause == Idle) iff (f.frames == 0)) and
  ((f.cause == Idle) iff (f.target == TargetNone))
pure def stepAMoveNeedsAGap(before: Focus, via: str, after: Focus): bool =
  after.moves > before.moves implies (via == "frame" and before.cause != Idle)
pure def sometimesScreenFocused(f: Focus): bool = f.moves > 0 and f.lastMove == TargetTitle
pure val targetValues = Set(TargetSearch, TargetTitle, TargetRegion)
```

### Focus is reported as it moves

```quint
pure def canFocused(f: Focus, key: str): bool = key != ""
pure def focused(f: Focus, key: str): Focus =
  { ...f, active: key, held: key, waiting: "", rowMoved: f.rowMoved or (f.rowKey != "" and key != f.rowKey) }
pure def blurred(f: Focus): Focus = { ...f, active: "" }
```

### A closed modal returns focus to its opener, and never over a control that took it

Mounting a modal records the control that opened it. When the modal closes and focus has been left
nowhere, it goes back to that opener; if the opener is away for a moment (its toolbar reloading),
the shell waits for it for one second, and any focus that lands meanwhile ends the wait.

```quint
pure def canModalOpened(f: Focus, modal: str, opener: str): bool = modal != "" and not(f.openers.some(o => o.modal == modal))
pure def modalOpened(f: Focus, modal: str, opener: str): Focus = { ...f, openers: f.openers.append({ modal: modal, opener: opener }) }
pure def canModalClosed(f: Focus, modal: str, openerReady: bool): bool = f.openers.some(o => o.modal == modal)
pure def modalClosed(f: Focus, modal: str, openerReady: bool): Focus = {
  val opener = f.openers.select(o => o.modal == modal).nthOr(0, { modal: modal, opener: "" }).opener
  val rest = { ...f, openers: f.openers.select(o => o.modal != modal) }
  if (f.active != "" or opener == "") rest
  else if (openerReady) { ...rest, active: opener, held: opener, restores: f.restores + 1, lastRestore: opener, waiting: "" }
  else { ...rest, waiting: opener }
}
pure def canOpenerReturned(f: Focus, opener: str): bool = f.waiting == opener and opener != ""
pure def openerReturned(f: Focus, opener: str): Focus =
  if (f.active == "") { ...f, active: opener, held: opener, restores: f.restores + 1, lastRestore: opener, waiting: "" }
  else { ...f, waiting: "" }
pure def canWaitEnds(f: Focus): bool = f.waiting != ""
pure def waitEnds(f: Focus): Focus = { ...f, waiting: "" }
pure def stepARestoreNeverSteals(before: Focus, via: str, after: Focus): bool =
  after.restores > before.restores implies before.active == ""
pure def alwaysAWaitIsForAMissingOpener(f: Focus): bool = f.waiting != "" implies f.active == ""
pure def sometimesDeferredRestore(f: Focus): bool = f.restores > 0 and f.lastRestore == "tile-notes" and f.waiting == ""
```

### A re-rendered list gives focus back to the same row, found by its key

A list captures the focused row's key before it renders again. The new render focuses the row with
that key if exactly one is shown and nothing else took focus, no dialog is open and the page is
visible; a row the owner moved away from is not restored.

```quint
pure def canCaptureRow(f: Focus, listId: str, row: str): bool = f.active == row and row != ""
pure def captureRow(f: Focus, listId: str, row: str): Focus = { ...f, rowList: listId, rowKey: row, rowMoved: false }
pure def canRowRendered(f: Focus, listId: str, found: bool, dialog: bool): bool = f.rowList == listId and f.rowKey != ""
pure def rowRendered(f: Focus, listId: str, found: bool, dialog: bool): Focus = {
  val allowed = found and not(dialog) and not(f.rowMoved) and f.active == ""
  { ...f, rowList: "", rowKey: "", rowMoved: false, lastRow: if (allowed) f.rowKey else "",
    active: if (allowed) f.rowKey else f.active, held: if (allowed) f.rowKey else f.held }
}
pure def stepARowIsTheOneCaptured(before: Focus, via: str, after: Focus): bool =
  (via == "rowRendered" and after.lastRow != "") implies (after.lastRow == before.rowKey and before.active == "")
pure def sometimesRowRestored(f: Focus): bool = f.lastRow != ""
```
