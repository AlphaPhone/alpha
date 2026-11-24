# Kit extensions

What Ask Alpha needs of the [read](../../kit/read.md) and
[draft](../../kit/draft.md) components that the kit does not offer yet:
leaving an asking behind, and a save that failed. Each is defined here once,
used by every spec of the area, and belongs in the kit when a second area
needs it.

## Story: Leave an asking behind

> As the owner, I want what I left behind never to answer for what I see
> now, and a save that failed to be saved again rather than lost.

### A read left behind takes no answer, and keeps its ticket so that no later asking reuses it

```quint
import read as R from "../../kit/read"
import draft as D from "../../kit/draft"

pure def dropped(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def lawALeftReadTakesNoAnswer(ticket: int, earlier: int): bool =
  val r = dropped(R::ask({ status: R::Loading, ticket: ticket }))
  not(R::canAnswer(r, earlier)) and r.ticket == ticket + 1
```

### A save that failed keeps its edits unsaved, to be saved again on the same revision

```quint
pure def failed(d: D::Draft): D::Draft = { ...d, sync: D::Edited }

pure def lawAFailedSaveIsSavedAgain(edits: int, base: int): bool =
  val d = failed(D::save({ sync: D::Edited, edits: edits, carried: 0, base: base }))
  D::unsaved(d) and D::canSave(d) and d.base == base
```
