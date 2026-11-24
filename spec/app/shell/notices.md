# Notices

What Alpha tells the owner in passing, over every screen at the shell's
`notice` place: one toast at a time, polite for news and assertive for a
failure, and the notices the owner must not miss, kept listed until they
are dismissed. Each area says what happened and whether it offers an Undo;
the shell keeps the toasts' turn and their time. Routine saves, switches
and choices stay quiet.

## Story: Read what just happened, at my own pace

> As the owner, I want a toast to stay until I can read it, an Undo to stay
> its full ten seconds, a failure to be announced, and nothing important to
> disappear behind something trivial.

### The notices hold the toast shown, its number and when its time is up, the toasts waiting, the notices kept, and Android's timeout scale with its read

A toast says its sentence, how long it is, the Undo it offers by name, if
any, and whether it reports a failure; a toast does not both offer an Undo
and report a failure. The scale is a percentage, never under a hundred:
Android's setting for how long to show what asks for action.

```quint
import read as R from "../../kit/read"

type Toast = { message: str, chars: int, undo: str, failure: bool }
type Notices = {
  shown: Toast, seq: int, since: int, until: int, held: bool,
  queued: List[Toast], kept: List[str], scale: int, reading: R::Read,
}

pure val noToast: Toast = { message: "", chars: 0, undo: "", failure: false }

pure val initial: Notices = {
  shown: noToast, seq: 0, since: 0, until: 0, held: false,
  queued: List(), kept: List(), scale: 100, reading: R::unread,
}

pure val queueLimit = 3
pure val shortest = 1900
pure val undoWindow = 10000
pure val longest = 12000
```

### What the simulator tries

```quint
pure val messageValues = Set("Saved", "Couldn't open Clock", "Deleted Lunch")
pure val charsValues = Set(5, 26, 300)
pure val undoValues = Set("", "undo-1")
pure val scaleValues = Set(0, 50, 100, 150, 600)
pure val seqValues = Set(0, 1, 2, 3)
pure val ticketValues = Set(1, 2, 3)
pure val nowValues = Set(0, 1000, 2000, 11000, 30000)
pure val tValues = Set(noToast, { message: "Saved", chars: 5, undo: "", failure: false },
  { message: "Deleted Lunch", chars: 13, undo: "undo-1", failure: false },
  { message: "Couldn't open Clock", chars: 19, undo: "", failure: true })
pure val dialogsValues = Set(List(), List("a"), List("a", "b"))
```

### A toast's time is fixed when it appears, from its length and kind and the scale: an Undo ten seconds at least, any other toast between 1.9 and 12 seconds, at fifty milliseconds a character and half a second more

A later change of the scale changes only later toasts.

```quint
pure def base(t: Toast): int = if (t.undo != "") undoWindow else shortest

pure def reading(t: Toast): int = if (t.chars * 50 + 500 > longest) longest else t.chars * 50 + 500

pure def durationOf(t: Toast, scale: int): int = (if (base(t) > reading(t)) base(t) else reading(t)) * scale / 100

pure def lawAnUndoIsNeverShortened(t: Toast, scale: int): bool =
  (t.undo != "" and scale >= 100) implies durationOf(t, scale) >= undoWindow
```

### A passive toast with another waiting behind it yields after its shortest reading time; an Undo or a failure keeps its whole time

```quint
pure def passive(t: Toast): bool = t.message != "" and t.undo == "" and not(t.failure)

pure def armed(n: Notices): int =
  val whole = durationOf(n.shown, n.scale)
  val leastOf = shortest * n.scale / 100
  if (passive(n.shown) and n.queued.length() > 0 and leastOf < whole) leastOf else whole

pure def presenting(t: Toast, n: Notices, now: int): Notices =
  val shown = { ...n, shown: t, seq: n.seq + 1, since: now, held: false }
  { ...shown, until: now + armed(shown) }
```

### A toast waits its turn, except that an Undo or a failure takes the place of a passive toast; a passive toast waiting last gives its place to the next passive one, and a toast the same as the last one waiting is not queued again

At most three wait; one more pushes out the oldest of the lowest rank:
passive, then Undo, then failure.

```quint
pure def rank(t: Toast): int = if (t.failure) 2 else if (t.undo != "") 1 else 0

pure def lowest(q: List[Toast]): int = q.foldl(2, (a, t) => if (rank(t) < a) rank(t) else a)

type Cursor = { at: int, found: int }

pure def dropAt(q: List[Toast]): int =
  q.foldl({ at: 0, found: -1 }, (c, t) => { at: c.at + 1, found: if (c.found < 0 and rank(t) == lowest(q)) c.at else c.found }).found

pure def capped(q: List[Toast]): List[Toast] = if (q.length() > queueLimit) q.removeAt(dropAt(q)) else q

pure def toasted(t: Toast, n: Notices, now: int): Notices =
  val behind = n.queued.nthOr(n.queued.length() - 1, n.shown)
  val repeated = t.undo == "" and behind == t
  val passiveLast = n.queued.length() > 0 and rank(behind) == 0 and rank(t) == 0
  val waiting = { ...n, queued: if (passiveLast) n.queued.removeAt(n.queued.length() - 1).append(t) else capped(n.queued.append(t)) }
  if (n.shown.message == "" or (passive(n.shown) and rank(t) > 0)) presenting(t, n, now)
  else if (repeated) n
  else if (passive(n.shown) and not(n.held)) { ...waiting, until: n.since + armed(waiting) }
  else waiting

pure def canShowToast(n: Notices, message: str, chars: int, undo: str, failure: bool, now: int): bool =
  message != "" and chars >= 0 and not(undo != "" and failure) and now >= n.since

pure def showToast(n: Notices, message: str, chars: int, undo: str, failure: bool, now: int): Notices =
  toasted({ message: message, chars: chars, undo: undo, failure: failure }, n, now)
```

### At most three toasts wait, each with a sentence, and none both offers an Undo and reports a failure

```quint
pure def wellFormed(t: Toast): bool = t.message != "" and t.chars >= 0 and not(t.undo != "" and t.failure)

pure def alwaysTheQueueIsBounded(n: Notices): bool =
  n.queued.length() <= queueLimit and n.queued.every(t => wellFormed(t)) and not(n.shown.undo != "" and n.shown.failure)
```

### No toast waits while none is shown

```quint
pure def alwaysNothingWaitsBehindNothing(n: Notices): bool = n.shown.message == "" implies n.queued.length() == 0
```

### A toast leaves when its time is up, when its Undo is taken, or when the owner dismisses it, and the next one takes its place

A held toast's time is never up. A tap on the toast's sentence dismisses it
without running its Undo.

```quint
pure def closed(n: Notices, now: int): Notices =
  if (n.queued.length() == 0) { ...n, shown: noToast, seq: n.seq + 1, since: now, until: now, held: false }
  else presenting(n.queued.nthOr(0, noToast), { ...n, queued: n.queued.tail() }, now)

pure def canExpire(n: Notices, seq: int, now: int): bool =
  n.shown.message != "" and not(n.held) and seq == n.seq and now >= n.until

pure def expire(n: Notices, seq: int, now: int): Notices = closed(n, now)

pure def canTakeUndo(n: Notices, seq: int, now: int): bool = n.shown.undo != "" and seq == n.seq and now >= n.since

pure def takeUndo(n: Notices, seq: int, now: int): Notices = closed(n, now)

pure def canDismissShown(n: Notices, seq: int, now: int): bool = n.shown.message != "" and seq == n.seq and now >= n.since

pure def dismissShown(n: Notices, seq: int, now: int): Notices = closed(n, now)

pure def stepEachEndBelongsToItsToast(before: Notices, via: str, after: Notices): bool =
  (via == "expire" or via == "takeUndo" or via == "dismissShown") implies after.seq > before.seq
```

### Focus or a finger on the toast holds it; leaving it lets its time run again

```quint
pure def canHold(n: Notices): bool = n.shown.message != "" and not(n.held)

pure def hold(n: Notices): Notices = { ...n, held: true }

pure def canResume(n: Notices, now: int): bool = n.held and now >= n.since

pure def resume(n: Notices, now: int): Notices = { ...n, held: false, until: now + armed(n) }
```

### A toast's time is never up before it appeared

```quint
pure def alwaysATimeIsAfterItsStart(n: Notices): bool = n.until >= n.since and n.seq >= 0
```

### The newest reading of Android's timeout setting is taken; a failed reading, or one that gives none, keeps the last good scale

Alpha reads it when it starts and whenever it comes back to the front.

```quint
pure def askScale(n: Notices): Notices = { ...n, reading: R::ask(n.reading) }

pure def canScaleRead(n: Notices, ticket: int, ok: bool, scale: int): bool = R::canAnswer(n.reading, ticket)

pure def scaleRead(n: Notices, ticket: int, ok: bool, scale: int): Notices =
  val taken = ok and scale > 0
  { ...n, reading: R::answer(n.reading, taken), scale: if (not(taken)) n.scale else if (scale < 100) 100 else scale }

pure def alwaysTheScaleIsAtLeastWhole(n: Notices): bool = n.scale >= 100
```

### A toast can wait behind an Undo or a failure, the queue can fill, a toast can be held, and a slower scale can stretch a toast

```quint
pure def sometimesBehindAnUndo(n: Notices): bool = n.queued.length() > 0 and n.shown.undo != ""

pure def sometimesBehindAFailure(n: Notices): bool = n.queued.length() > 0 and n.shown.failure

pure def sometimesTheQueueIsFull(n: Notices): bool = n.queued.length() == queueLimit

pure def sometimesHeldWithOthersWaiting(n: Notices): bool = n.held and n.queued.length() > 0

pure def sometimesAToastIsStretched(n: Notices): bool = n.scale > 100 and n.shown.message != ""
```

## Story: Keep what I must not miss

> As the owner, I want a notice about lost work or a privacy state left on
> to stay listed until I dismiss it, after it was announced once.

### A kept notice is announced once as a failure and listed until it is dismissed; at most three are listed, each once, and a fourth pushes out the oldest

```quint
pure def canKeep(n: Notices, message: str, chars: int, now: int): bool = message != "" and chars >= 0 and now >= n.since

pure def keep(n: Notices, message: str, chars: int, now: int): Notices =
  val listed = if (n.kept.includes(message)) n.kept
    else if (n.kept.length() >= queueLimit) n.kept.tail().append(message) else n.kept.append(message)
  toasted({ message: message, chars: chars, undo: "", failure: true }, { ...n, kept: listed }, now)

pure def canDismiss(n: Notices, message: str): bool = n.kept.includes(message)

pure def dismiss(n: Notices, message: str): Notices = { ...n, kept: n.kept.select(m => m != message) }

pure def alwaysFewNoticesAreKept(n: Notices): bool = n.kept.length() <= queueLimit
```

### A kept notice can outlive its toast

```quint
pure def sometimesANoticeOutlivesItsToast(n: Notices): bool = n.kept.length() > 0 and n.shown.message == ""
```

## Story: Hear a toast inside a dialog

> As the owner, I want a toast raised while a dialog is open to be shown and
> announced inside that dialog, so I can read it and take its Undo.

### While dialogs are open the toast is drawn in the one on top

```quint
pure def toastHost(dialogs: List[str]): str = dialogs.nthOr(dialogs.length() - 1, "")

pure def lawOnlyTheTopDialogHostsTheToast(dialogs: List[str]): bool =
  (dialogs.length() == 0 implies toastHost(dialogs) == "")
    and (dialogs.length() > 0 implies toastHost(dialogs) == dialogs.nthOr(dialogs.length() - 1, ""))
```
