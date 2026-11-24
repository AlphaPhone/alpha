# Calendar deletions

A deletion the owner confirmed is held for a moment, with Undo on a notice,
before the [editor](./editor.md) sends it; meanwhile its event is hidden.
The Undo notice belongs to the [notices](../notices/) area; the
[calendar](./index.md) leaves out the events this hides.

## Story: Undo a deletion before it is sent

> As the owner, I want a deletion I confirmed held for a moment with Undo,
> sent once I leave or the moment passes, and never sent for an account I
> am no longer signed in to.

### Deletions hold the owner they are for, the one deletion waiting with its Undo window and whether its notice shows, the one being sent, and the one sent that a read has yet to confirm

An event is named by its number, and 0 is none. A deletion hides its event,
its whole series, or the series from this occurrence on, as the owner
chose, and only rows of the same source. Times are milliseconds, passed in
by the shell.

```quint
import undo as U from "../../kit/undo"

type Deletions = { owner: int, waiting: int, undo: U::Undo, notice: bool, sending: int, hiding: int }

type Effect = Release({ id: int })

type Held = { state: Deletions, out: List[Effect] }

pure val initial: Deletions = { owner: 0, waiting: 0, undo: U::free, notice: false, sending: 0, hiding: 0 }

pure val undoWindow = 5000

pure val idValues = Set(1, 2)
pure val nowValues = Set(0, 3000, 6000)
pure val ownerValues = Set(0, 1, 2)

pure def hidden(id: int, s: Deletions): bool = id > 0 and (id == s.waiting or id == s.sending or id == s.hiding)
```

### Confirming a deletion holds it; a deletion still waiting is sent first, so the only Undo shown is the newest

```quint
pure def canConfirm(s: Deletions, id: int, now: int): bool = id > 0 and not(hidden(id, s)) and s.sending == 0

pure def confirm(s: Deletions, id: int, now: int): Held =
  val held = { ...s, waiting: id, undo: U::hold(now, undoWindow), notice: true }
  if (s.waiting != 0) { state: { ...held, sending: s.waiting }, out: List(Release({ id: s.waiting })) }
  else { state: held, out: List() }
```

### Undo inside the window sends nothing, and shows the event again

```quint
pure def canUndo(s: Deletions, now: int): bool = s.waiting != 0 and U::canUndo(s.undo, now)

pure def undo(s: Deletions, now: int): Deletions = { ...s, waiting: 0, undo: U::undo(s.undo), notice: false }
```

### The window ends only once its Undo notice is no longer shown

The notices area says when the notice goes; a notice still shown keeps
Undo possible past the window.

```quint
pure def canNoticeGone(s: Deletions): bool = s.notice

pure def noticeGone(s: Deletions): Deletions = { ...s, notice: false }

pure def canUndoShown(s: Deletions): bool = s.waiting != 0 and s.notice and s.undo.holding == U::Held

pure def undoShown(s: Deletions): Deletions = { ...s, waiting: 0, undo: U::undo(s.undo), notice: false }

pure def canWindowEnded(s: Deletions, now: int): bool = s.waiting != 0 and U::canRelease(s.undo, now) and not(s.notice) and s.sending == 0

pure def windowEnded(s: Deletions, now: int): Held =
  { state: { ...s, waiting: 0, undo: U::release(s.undo), sending: s.waiting }, out: List(Release({ id: s.waiting })) }
```

### Leaving the app sends a waiting deletion at once

```quint
pure def canLeave(s: Deletions): bool = s.waiting != 0 and s.sending == 0

pure def leave(s: Deletions): Held =
  { state: { ...s, waiting: 0, undo: U::release(s.undo), notice: false, sending: s.waiting }, out: List(Release({ id: s.waiting })) }
```

### Another owner signing in drops a waiting deletion unsent

```quint
pure def canOwnerChanged(s: Deletions, owner: int): bool = owner != s.owner and owner >= 0

pure def ownerChanged(s: Deletions, owner: int): Deletions =
  { ...s, owner: owner, waiting: 0, undo: if (s.waiting != 0) U::undo(s.undo) else s.undo, notice: false, hiding: 0 }
```

### A refused send shows the event again; a sent deletion hides it until a read no longer has it unchanged

```quint
pure def canEnded(s: Deletions, id: int, done: bool): bool = id > 0 and id == s.sending

pure def ended(s: Deletions, id: int, done: bool): Deletions = { ...s, sending: 0, hiding: if (done) id else s.hiding }

pure def canReadShows(s: Deletions, id: int, unchanged: bool): bool = id > 0 and id == s.hiding

pure def readShows(s: Deletions, id: int, unchanged: bool): Deletions = { ...s, hiding: if (unchanged) s.hiding else 0 }
```

### A deletion waits only while its Undo holds, and one is sent at a time

```quint
pure def alwaysAWaitingDeletionIsHeld(s: Deletions): bool =
  (s.waiting != 0 implies s.undo.holding == U::Held) and (s.waiting == 0 or s.waiting != s.sending)
```

### A deletion is sent only when its window ended with its notice gone, when the owner leaves, or when a newer one is confirmed

```quint
pure def stepSentOnlyWhenItMayBe(before: Deletions, via: str, after: Deletions, out: List[Effect]): bool =
  out.every(e => match e {
    | Release(r) => r.id == before.waiting and (via == "windowEnded" or via == "leave" or via == "confirm")
  })
```

### A deletion can be undone, sent after its notice went, sent on leaving, or dropped for another owner

```quint
pure def sometimesUndone(s: Deletions): bool = s.undo.holding == U::Undone and s.waiting == 0 and s.owner == 0

pure def sometimesSentAfterTheNotice(s: Deletions): bool = s.sending != 0 and s.undo.holding == U::Released and not(s.notice)

pure def sometimesHiddenUntilRead(s: Deletions): bool = s.hiding != 0 and s.sending == 0

pure def sometimesDroppedForAnotherOwner(s: Deletions): bool = s.owner == 2 and s.undo.holding == U::Undone
```
