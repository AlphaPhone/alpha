# Correct a page's edges

The dialog in which the owner moves the corners of one page of the
[scan](./scan.md). The isolated worker first finds the page's edges on its
own, then draws the outline again for each move of a corner; the corrected
page goes back to the scan only as it was last drawn.

## Story: Correct a page's edges

> As the owner, I want the page's edges found for me, to drag its corners
> and see the result before it replaces the page, and to be told when the
> outline could not be drawn.

### The dialog holds the page it corrects, the review of the outline drawn for the corners as they are, and whether the last drawing failed

No page is being corrected when the image is zero. The edges the worker
found, and each move of a corner, are a new revision of the outline.

```quint
import review as V from "../../kit/review"

type Actor = Owner | Phone
type Correction = { image: int, edges: V::Review, failed: bool }
type Effect = Outline({ image: int, revision: int, detect: bool }) | Corrected({ image: int })
type Moved = { state: Correction, out: List[Effect] }

pure val initial: Correction = { image: 0, edges: V::unreviewed, failed: false }
```

### What the simulator tries

```quint
pure val imageValues = Set(1, 2)
pure val revisionValues = Set(1, 2, 3)
```

### Opening a page asks the worker to find its edges, and each move of a corner, or trying again after a failure, is drawn again

```quint
pure def drawing(detect: bool, s: Correction): Moved =
  val edges = V::revise(V::dismiss(s.edges))
  { state: { ...s, edges: edges, failed: false }, out: List(Outline({ image: s.image, revision: edges.revision, detect: detect })) }

pure def canBegin(s: Correction, image: int, by: Actor): bool = by == Owner and s.image == 0 and image > 0

pure def begin(s: Correction, image: int, by: Actor): Moved = drawing(true, { ...s, image: image })

pure def canMoveCorner(s: Correction, by: Actor): bool = by == Owner and s.image != 0

pure def moveCorner(s: Correction, by: Actor): Moved = drawing(false, s)

pure def canTryAgain(s: Correction, by: Actor): bool = by == Owner and s.image != 0 and s.failed

pure def tryAgain(s: Correction, by: Actor): Moved = drawing(false, s)
```

### Only the outline drawn for the corners as they are is shown, and a drawing that failed says so

```quint
pure def canOutlined(s: Correction, revision: int, by: Actor): bool =
  by == Phone and s.image != 0 and not(s.edges.showing) and not(s.failed) and revision == s.edges.revision

pure def outlined(s: Correction, revision: int, ok: bool, by: Actor): Correction =
  if (ok) { ...s, edges: V::present(s.edges) } else { ...s, failed: true }

pure def alwaysTheOutlineIsNotAhead(s: Correction): bool = s.edges.shown <= s.edges.revision

pure def alwaysAFailedDrawingShowsNoOutline(s: Correction): bool = s.failed implies not(s.edges.showing)
```

### Applying hands the page back corrected, only as its outline was shown; cancelling, the scan hiding or a restart closes the dialog

```quint
pure def canUseCorrection(s: Correction, by: Actor): bool = by == Owner and s.image != 0 and V::canConfirm(s.edges)

pure def useCorrection(s: Correction, by: Actor): Moved =
  { state: { image: 0, edges: V::confirm(s.edges), failed: false }, out: List(Corrected({ image: s.image })) }

pure def canCancel(s: Correction, by: Actor): bool = s.image != 0

pure def cancel(s: Correction, by: Actor): Correction = { image: 0, edges: V::dismiss(s.edges), failed: false }

pure def canRestart(s: Correction, by: Actor): bool = by == Phone

pure def restart(s: Correction, by: Actor): Correction = { image: 0, edges: V::dismiss(s.edges), failed: false }
```

### A page goes back corrected only as its outline was shown for the corners as they are

```quint
pure def stepACorrectionIsWhatWasShown(before: Correction, via: str, after: Correction, out: List[Effect]): bool =
  out.every(e => match e {
    | Corrected(x) => V::canConfirm(before.edges) and x.image == before.image and x.image != 0
    | _ => true
  })
```

### The worker finds the edges only when a page opens

```quint
pure def stepEdgesAreFoundOnlyOnOpening(before: Correction, via: str, after: Correction, out: List[Effect]): bool =
  out.every(e => match e { | Outline(x) => x.detect == (via == "begin") and x.image == after.image | _ => true })
```

### A closed dialog shows no outline and no failure

```quint
pure def alwaysAClosedDialogShowsNothing(s: Correction): bool = s.image == 0 implies (not(s.edges.showing) and not(s.failed))
```

### A correction can wait to be applied, a corner can move after the outline was drawn, and a drawing can fail

```quint
pure def sometimesACorrectionAwaitsApproval(s: Correction): bool = V::canConfirm(s.edges) and s.image != 0
pure def sometimesACornerMovedAfterTheOutline(s: Correction): bool = s.image != 0 and s.edges.shown > 0 and not(V::canConfirm(s.edges))
pure def sometimesTheOutlineCouldNotBeDrawn(s: Correction): bool = s.failed
```
