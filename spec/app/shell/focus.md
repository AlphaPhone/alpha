# Focus

Where keyboard and TalkBack focus goes when what is on the screen changes
without the owner moving it: a new screen, a resize that took the focused
control away, a layer that closed, a list that drew its rows again. Focus
the owner placed is never taken; the shell only fills a gap, and only for a
bounded time. The shell tells this machine of every focus change and of
each frame it waits; a control is named by its focus key.

## Story: Keep my place when the screen changes under me

> As the owner using TalkBack or a keyboard, I want focus to land on the new
> screen's title or Home, to come back to the control
> that opened a sheet once it closes, and never to be pulled away from where
> I put it.

### Focus holds what it is waiting to move to and for how many frames, the control focused now and the last one, the layers' openers, the opener it waits for, a list row to give focus back to, and whether the owner moves by keyboard

```quint
type Target = NoTarget | ItsOwn | Search | HomeStart | Title | Region
type Cause = Idle | ScreenChange | ResizeLoss
type Opener = { layer: str, opener: str }
type Focus = {
  cause: Cause, frames: int, target: Target, active: str, held: str, moves: int, lastMove: Target,
  openers: List[Opener], waiting: str, restores: int, lastRestore: str,
  rowList: str, rowKey: str, rowMoved: bool, lastRow: str, keyboard: bool,
}

pure val initial: Focus = {
  cause: Idle, frames: 0, target: NoTarget, active: "", held: "", moves: 0, lastMove: NoTarget,
  openers: List(), waiting: "", restores: 0, lastRestore: "",
  rowList: "", rowKey: "", rowMoved: false, lastRow: "", keyboard: false,
}

pure val waitFrames = 12
```

### What the simulator tries

```quint
pure val keyValues = Set("", "opener", "field", "row-2")
pure val layerValues = Set("sheet-a", "sheet-b")
pure val openerValues = Set("opener", "tile-notes")
pure val listValues = Set("inbox")
pure val rowValues = Set("row-1", "row-2")
pure val targetValues = Set(Search, Title, Region)
```

### A new screen is given focus within twelve frames, unless the owner has already moved it there

After a screen changes, an app or Home, the shell looks each
frame for the screen's target: a screen that focuses itself, a search
field, Home's first control, the app's title, or else the app's region. A
control that holds focus on the new screen keeps it. A resize that took
the focused control away asks for the same, only while that control is
still gone, and never over a screen change on its way.

```quint
pure def canScreenChanged(f: Focus, target: Target): bool = target != NoTarget

pure def screenChanged(f: Focus, target: Target): Focus = { ...f, cause: ScreenChange, frames: waitFrames, target: target }

pure def canResizeLost(f: Focus, target: Target): bool =
  f.held != "" and f.active != f.held and f.cause != ScreenChange and target != NoTarget

pure def resizeLost(f: Focus, target: Target): Focus = { ...f, cause: ResizeLoss, frames: waitFrames, target: target }

pure def canFrame(f: Focus, activeShown: bool, targetFound: bool, heldShown: bool): bool = f.cause != Idle

pure def frame(f: Focus, activeShown: bool, targetFound: bool, heldShown: bool): Focus =
  val stop = { ...f, cause: Idle, frames: 0, target: NoTarget }
  val allowed = f.cause == ScreenChange or not(heldShown)
  if (activeShown and f.active != "") stop
  else if (allowed and targetFound) { ...stop, moves: f.moves + 1, lastMove: f.target }
  else if (f.frames <= 1) stop
  else { ...f, frames: f.frames - 1 }
```

### The wait is bounded, and waits for something exactly while it counts frames

```quint
pure def alwaysTheWaitIsBounded(f: Focus): bool =
  f.frames >= 0 and f.frames <= waitFrames and ((f.cause == Idle) iff (f.frames == 0))
    and ((f.cause == Idle) iff (f.target == NoTarget))
```

### Focus moves by itself only into a gap the shell was waiting to fill

```quint
pure def stepAMoveNeedsAGap(before: Focus, via: str, after: Focus): bool =
  after.moves > before.moves implies (via == "frame" and before.cause != Idle)

pure def sometimesAScreenIsFocused(f: Focus): bool = f.moves > 0 and f.lastMove == Title
```

### Focus is told as it moves

```quint
pure def canFocused(f: Focus, key: str): bool = key != ""

pure def focused(f: Focus, key: str): Focus =
  { ...f, active: key, held: key, waiting: "", rowMoved: f.rowMoved or (f.rowKey != "" and key != f.rowKey) }

pure def canBlurred(f: Focus): bool = f.active != ""

pure def blurred(f: Focus): Focus = { ...f, active: "" }
```

### A layer that closes gives focus back to the control that opened it, never over a control that took it

A layer records its opener as it opens. When it closes and focus was left
nowhere, focus goes back to that opener; if the opener is away for a
moment, the shell waits for it for one second, and any focus that lands
meanwhile ends the wait.

```quint
pure def canLayerOpened(f: Focus, layer: str, opener: str): bool = layer != "" and not(f.openers.some(o => o.layer == layer))

pure def layerOpened(f: Focus, layer: str, opener: str): Focus = { ...f, openers: f.openers.append({ layer: layer, opener: opener }) }

pure def canLayerClosed(f: Focus, layer: str, openerReady: bool): bool = f.openers.some(o => o.layer == layer)

pure def layerClosed(f: Focus, layer: str, openerReady: bool): Focus =
  val opener = f.openers.select(o => o.layer == layer).nthOr(0, { layer: layer, opener: "" }).opener
  val rest = { ...f, openers: f.openers.select(o => o.layer != layer) }
  if (f.active != "" or opener == "") rest
  else if (openerReady) { ...rest, active: opener, held: opener, restores: f.restores + 1, lastRestore: opener, waiting: "" }
  else { ...rest, waiting: opener }

pure def canOpenerReturned(f: Focus, opener: str): bool = f.waiting == opener and opener != ""

pure def openerReturned(f: Focus, opener: str): Focus =
  if (f.active == "") { ...f, active: opener, held: opener, restores: f.restores + 1, lastRestore: opener, waiting: "" }
  else { ...f, waiting: "" }

pure def canWaitEnds(f: Focus): bool = f.waiting != ""

pure def waitEnds(f: Focus): Focus = { ...f, waiting: "" }

pure def stepARestoreNeverSteals(before: Focus, via: str, after: Focus): bool =
  after.restores > before.restores implies before.active == ""

pure def alwaysAWaitIsForAMissingOpener(f: Focus): bool = f.waiting != "" implies f.active == ""

pure def sometimesAnOpenerIsWaitedFor(f: Focus): bool = f.restores > 0 and f.lastRestore == "tile-notes" and f.waiting == ""
```

### A list drawn again gives focus back to the same row, found by its key

A list notes the focused row's key before it draws again. The new rows
focus the row with that key if exactly one is shown, nothing else took
focus, no dialog is open and the page shows; a row the owner moved away
from is not given focus again.

```quint
pure def canNoteRow(f: Focus, list: str, row: str): bool = f.active == row and row != ""

pure def noteRow(f: Focus, list: str, row: str): Focus = { ...f, rowList: list, rowKey: row, rowMoved: false }

pure def canRowsDrawn(f: Focus, list: str, found: bool, dialog: bool): bool = f.rowList == list and f.rowKey != ""

pure def rowsDrawn(f: Focus, list: str, found: bool, dialog: bool): Focus =
  val allowed = found and not(dialog) and not(f.rowMoved) and f.active == ""
  { ...f, rowList: "", rowKey: "", rowMoved: false, lastRow: if (allowed) f.rowKey else "",
    active: if (allowed) f.rowKey else f.active, held: if (allowed) f.rowKey else f.held,
    waiting: if (allowed) "" else f.waiting }

pure def stepARowIsTheOneNoted(before: Focus, via: str, after: Focus): bool =
  (via == "rowsDrawn" and after.lastRow != "") implies (after.lastRow == before.rowKey and before.active == "")

pure def sometimesARowGetsFocusBack(f: Focus): bool = f.lastRow != ""
```

### Home's tiles show a focus ring only while the owner moves by keyboard; every other control, a field above all, shows its ring whenever it has focus

A Tab or an arrow key starts moving by keyboard and a press ends it.

```quint
pure def canKeyed(f: Focus): bool = not(f.keyboard)

pure def keyed(f: Focus): Focus = { ...f, keyboard: true }

pure def canPointed(f: Focus): bool = f.keyboard

pure def pointed(f: Focus): Focus = { ...f, keyboard: false }

pure def launcherRing(keyboard: bool, on: bool): bool = on and keyboard

pure def fieldRing(keyboard: bool, on: bool): bool = on

pure def lawAFieldKeepsItsRing(keyboard: bool): bool = fieldRing(keyboard, true)

pure def lawATapLeavesNoRingOnHome(on: bool): bool = not(launcherRing(false, on))

pure def sometimesTheRingShows(f: Focus): bool = launcherRing(f.keyboard, true) and f.moves > 0
```
