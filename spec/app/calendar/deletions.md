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

An event is named by its number, and 0 is none. A deletion reaches its
event, the series from this occurrence on, or the whole series, as the
owner chose, at the revision the owner confirmed it from. It also holds
Android's timeout scale, a percentage never under a hundred, whether a
restart paused it, and the event a deletion was dropped or refused for, so
the owner is told it was not deleted. Times are milliseconds, passed in by
the shell.

```quint
import undo as U from "../../kit/undo"

type Reach = OneEvent | FromThisOn | WholeSeries

type Deletions = {
  owner: int, waiting: int, reach: Reach, revision: int, undo: U::Undo, notice: bool, scale: int, paused: bool,
  sending: int, hiding: int, dropped: int, failed: int,
}

type Effect = Release({ id: int, reach: Reach, revision: int })

type Held = { state: Deletions, out: List[Effect] }

pure val initial: Deletions = {
  owner: 0, waiting: 0, reach: OneEvent, revision: 0, undo: U::free, notice: false, scale: 100, paused: false,
  sending: 0, hiding: 0, dropped: 0, failed: 0,
}

pure val undoWindow = 10000

pure val idValues = Set(1, 2)
pure val revisionValues = Set(0, 1)
pure val nowValues = Set(0, 6000, 12000, 25000)
pure val ownerValues = Set(0, 1, 2)
pure val scaleValues = Set(100, 200)

pure def hidden(id: int, s: Deletions): bool = id > 0 and (id == s.waiting or id == s.sending or id == s.hiding)
```

### A deletion hides its event, the series from this occurrence on, or the whole series, and only rows of the same source

```quint
pure def rowHidden(reach: Reach, sameEvent: bool, sameSeries: bool, notBefore: bool, sameSource: bool): bool =
  sameSource and (sameEvent or (sameSeries and (reach == WholeSeries or (reach == FromThisOn and notBefore))))

pure def lawOtherSourcesStayVisible(reach: Reach, sameEvent: bool, sameSeries: bool, notBefore: bool): bool =
  not(rowHidden(reach, sameEvent, sameSeries, notBefore, false))

pure def lawEarlierOccurrencesStayForFromThisOn(sameSource: bool): bool =
  not(rowHidden(FromThisOn, false, true, false, sameSource))
```

### The Undo window is ten seconds, scaled by Android's timeout setting

```quint
pure def canScaleChanged(s: Deletions, scale: int): bool = scale >= 100 and scale != s.scale

pure def scaleChanged(s: Deletions, scale: int): Deletions = { ...s, scale: scale }

pure def windowOf(scale: int): int = undoWindow * scale / 100

pure def lawTheWindowIsNeverShorterThanTenSeconds(scale: int): bool = scale >= 100 implies windowOf(scale) >= undoWindow
```

### Confirming a deletion holds it; a deletion still waiting is sent first, so the only Undo shown is the newest

```quint
pure def canConfirm(s: Deletions, id: int, reach: Reach, revision: int, now: int): bool =
  id > 0 and revision >= 0 and not(hidden(id, s)) and s.sending == 0 and not(s.paused)

pure def confirm(s: Deletions, id: int, reach: Reach, revision: int, now: int): Held =
  val held = { ...s, waiting: id, reach: reach, revision: revision, undo: U::hold(now, windowOf(s.scale)), notice: true, dropped: 0, failed: 0 }
  if (s.waiting != 0) { state: { ...held, sending: s.waiting }, out: List(Release({ id: s.waiting, reach: s.reach, revision: s.revision })) }
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
pure def canNoticeGone(s: Deletions): bool = s.notice and not(s.paused)

pure def noticeGone(s: Deletions): Deletions = { ...s, notice: false }

pure def canUndoShown(s: Deletions): bool = s.waiting != 0 and s.notice and s.undo.holding == U::Held

pure def undoShown(s: Deletions): Deletions = { ...s, waiting: 0, undo: U::undo(s.undo), notice: false, paused: false }

pure def canWindowEnded(s: Deletions, now: int): bool = s.waiting != 0 and U::canRelease(s.undo, now) and not(s.notice) and s.sending == 0 and not(s.paused)

pure def windowEnded(s: Deletions, now: int): Held =
  { state: { ...s, waiting: 0, undo: U::release(s.undo), sending: s.waiting }, out: List(Release({ id: s.waiting, reach: s.reach, revision: s.revision })) }
```

### Leaving Calendar sends a waiting deletion at once

```quint
pure def canLeave(s: Deletions): bool = s.waiting != 0 and s.sending == 0 and not(s.paused)

pure def leave(s: Deletions): Held =
  { state: { ...s, waiting: 0, undo: U::release(s.undo), notice: false, sending: s.waiting }, out: List(Release({ id: s.waiting, reach: s.reach, revision: s.revision })) }
```

### A restart pauses a deletion still in its window; the owner sends it or keeps the event

A deletion that was being sent is hidden until a read shows what happened.

```quint
pure def canRestart(s: Deletions): bool = true

pure def restart(s: Deletions): Deletions =
  { ...s, paused: s.waiting != 0, notice: s.waiting != 0, sending: 0, hiding: if (s.sending != 0) s.sending else s.hiding }

pure def canSendPaused(s: Deletions): bool = s.paused and s.sending == 0

pure def sendPaused(s: Deletions): Held =
  { state: { ...s, waiting: 0, undo: U::release(s.undo), notice: false, paused: false, sending: s.waiting },
    out: List(Release({ id: s.waiting, reach: s.reach, revision: s.revision })) }
```

### Another owner signing in drops a waiting deletion unsent, and says the event was not deleted

```quint
pure def canOwnerChanged(s: Deletions, owner: int): bool = owner != s.owner and owner >= 0

pure def ownerChanged(s: Deletions, owner: int): Deletions =
  { ...s, owner: owner, waiting: 0, undo: if (s.waiting != 0) U::undo(s.undo) else s.undo, notice: false, paused: false, hiding: 0,
    dropped: if (s.waiting != 0) s.waiting else 0, failed: 0 }
```

### A refused send shows the event again and says it was not deleted; a sent deletion hides it until a read no longer has it unchanged

A declined invitation stays in the calendar, changed, so the read that
shows it changed shows it again.

```quint
pure def canEnded(s: Deletions, id: int, done: bool): bool = id > 0 and id == s.sending

pure def ended(s: Deletions, id: int, done: bool): Deletions =
  { ...s, sending: 0, hiding: if (done) id else s.hiding, failed: if (done) 0 else id }

pure def canReadShows(s: Deletions, id: int, unchanged: bool): bool = id > 0 and id == s.hiding

pure def readShows(s: Deletions, id: int, unchanged: bool): Deletions = { ...s, hiding: if (unchanged) s.hiding else 0 }
```

### A deletion waits only while its Undo holds, and one is sent at a time

```quint
pure def alwaysAWaitingDeletionIsHeld(s: Deletions): bool =
  (s.waiting != 0 implies s.undo.holding == U::Held) and (s.waiting == 0 or s.waiting != s.sending) and (s.paused implies s.waiting != 0)
```

### A deletion is sent only when its window ended with its notice gone, when the owner leaves, when a newer one is confirmed, or when the owner sends one a restart paused, at the revision confirmed

```quint
pure def stepSentOnlyWhenItMayBe(before: Deletions, via: str, after: Deletions, out: List[Effect]): bool =
  out.every(e => match e {
    | Release(r) => r.id == before.waiting and r.reach == before.reach and r.revision == before.revision
        and (via == "windowEnded" or via == "leave" or via == "confirm" or via == "sendPaused")
  })
```

### A deletion can be undone, sent after its notice went, sent on leaving, or dropped for another owner

```quint
pure def sometimesUndone(s: Deletions): bool = s.undo.holding == U::Undone and s.waiting == 0 and s.owner == 0

pure def sometimesSentAfterTheNotice(s: Deletions): bool = s.sending != 0 and s.undo.holding == U::Released and not(s.notice)

pure def sometimesHiddenUntilRead(s: Deletions): bool = s.hiding != 0 and s.sending == 0

pure def sometimesDroppedForAnotherOwner(s: Deletions): bool = s.owner == 2 and s.undo.holding == U::Undone and s.dropped != 0

pure def sometimesPausedByARestart(s: Deletions): bool = s.paused

pure def sometimesRefusedSaysNotDeleted(s: Deletions): bool = s.failed != 0 and s.sending == 0

pure def sometimesFromThisOn(s: Deletions): bool = s.sending != 0 and s.reach == FromThisOn

pure def sometimesAScaledWindow(s: Deletions): bool = s.waiting != 0 and s.scale == 200
```
