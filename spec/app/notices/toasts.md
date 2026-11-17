# Toasts

A toast is a short message at the bottom of the screen: something saved,
something failed, or a change the owner can still undo. This spec says how
long each one stays, which waits for which, and where it is shown. The
deletion an Undo toast offers to take back is the
[deletion notice](./deletions.md)'s; a toast only passes the tap on.

## Story: Read a toast before it goes

> As the owner, I want every toast to stay long enough for me to read it,
> an Undo toast long enough to use it, and longer still when I have asked
> Android for more time.

### The layer shows at most one toast, until a time, with the toasts waiting behind it and how much longer Android asks toasts to stay

Each toast is numbered, has a length in characters, and may offer Undo.
Android's recommended timeout is read as a scale, in percent, through the
kit's [read](../../kit/read.md); the layer starts unscaled, during startup,
with no dialog open.

```quint
import read as R from "../../kit/read"

type Toast = { number: int, chars: int, undo: bool }
type Act = Undone | AskScale
type Effect = { act: Act, number: int }
type Toasts = {
  issued: int, showing: bool, current: Toast, until: int, lasts: int, held: bool,
  queue: List[Toast], scale: int, scaling: R::Read, starting: bool, parked: bool, early: Toast, dialog: int,
}
type Shown = { state: Toasts, out: List[Effect] }

pure val none: Toast = { number: 0, chars: 0, undo: false }
pure val maxQueue = 3

pure val initial: Toasts = {
  issued: 0, showing: false, current: none, until: 0, lasts: 0, held: false,
  queue: List(), scale: 100, scaling: R::unread, starting: true, parked: false, early: none, dialog: 0,
}
```

### What the simulator tries

```quint
pure val charsValues = Set(10, 191, 400)
pure val nowValues = Set(0, 2000, 11000, 30000)
pure val scaleValues = Set(0, 100, 150, 600)
pure val ticketValues = Set(1, 2)
pure val topValues = Set(0, 1, 2)
pure val weight_started = 3
```

### A toast stays 1.9 seconds, an Undo toast 10 seconds, a long one 50 milliseconds a character and half a second more up to 12 seconds, all stretched by Android's scale

The scale a toast is shown with is kept for that toast: a later answer
changes only toasts shown after it.

```quint
pure def duration(chars: int, undo: bool, scale: int): int =
  val base = if (undo) 10000 else 1900
  val reading = chars * 50 + 500
  val capped = if (reading > 12000) 12000 else reading
  val longest = if (capped > base) capped else base
  longest * scale / 100
```

### A toast with Undo never stays less time than one without, nor less than ten seconds

```quint
pure def lawUndoStaysLonger(chars: int, scale: int): bool =
  scale >= 100 implies (duration(chars, true, scale) >= duration(chars, false, scale) and duration(chars, true, scale) >= 10000)
```

### More time asked of Android never shortens a toast

```quint
pure def lawExtendedTimeoutsStayLonger(chars: int, undo: bool, scale: int): bool =
  scale >= 100 implies duration(chars, undo, scale) >= duration(chars, undo, 100)
```

### Alpha asks Android how long toasts should stay, and only the newest answer counts

An answer below 100 percent, or a failed read, keeps the last good scale.

```quint
pure def askScale(s: Toasts): Shown =
  val scaling = R::ask(s.scaling)
  { state: { ...s, scaling: scaling }, out: List({ act: AskScale, number: scaling.ticket }) }

pure def canScaled(s: Toasts, ticket: int): bool = R::canAnswer(s.scaling, ticket)

pure def scaled(s: Toasts, ticket: int, scale: int): Toasts =
  { ...s, scaling: R::answer(s.scaling, scale >= 100), scale: if (scale >= 100) scale else s.scale }
```

### Toasts are never shorter than Android asks

```quint
pure def alwaysTheScaleNeverShortens(s: Toasts): bool = s.scale >= 100
```

### The toast showing stays at least as long as its kind asks

```quint
pure def alwaysAToastStaysItsTime(s: Toasts): bool =
  if (s.showing) s.lasts >= duration(s.current.chars, s.current.undo, 100) and s.current.number > 0
  else s.current == none and s.lasts == 0 and not(s.held)
```

### A toast with Undo can show while Android asks toasts to stay longer than twelve seconds

```quint
pure def sometimesAnExtendedUndo(s: Toasts): bool = s.showing and s.current.undo and s.lasts > 12000
```

## Story: Keep an Undo in reach

> As the owner, when a toast offers Undo I want it to stay until I can use
> it, whatever other toasts arrive meanwhile.

### A toast is shown at once, unless an Undo is showing: then it waits, and a plain toast waiting last gives way to a newer plain one

At most three wait.

```quint
pure def collapses(s: Toasts, undo: bool): bool =
  not(undo) and s.queue.length() > 0 and not(s.queue.nthOr(s.queue.length() - 1, none).undo)

pure def admit(toast: Toast, s: Toasts, now: int): Toasts =
  val lasts = duration(toast.chars, toast.undo, s.scale)
  if (not(s.showing and s.current.undo)) { ...s, showing: true, current: toast, lasts: lasts, until: now + lasts }
  else if (collapses(s, toast.undo)) { ...s, queue: s.queue.removeAt(s.queue.length() - 1).append(toast) }
  else { ...s, queue: s.queue.append(toast) }

pure def room(s: Toasts, undo: bool): bool =
  not(s.showing and s.current.undo) or s.queue.length() < maxQueue or collapses(s, undo)
```

### A notice raised during startup is held, the newest one, and shown once startup ends

```quint
pure def canRaise(s: Toasts, chars: int, undo: bool): bool = chars > 0 and room(s, undo)

pure def raise(s: Toasts, chars: int, undo: bool, now: int): Toasts =
  val toast = { number: s.issued + 1, chars: chars, undo: undo }
  val numbered = { ...s, issued: s.issued + 1 }
  if (s.starting) { ...numbered, parked: true, early: toast } else admit(toast, numbered, now)

pure def canStarted(s: Toasts): bool = s.starting

pure def started(s: Toasts, now: int): Toasts =
  val begun = { ...s, starting: false, parked: false, early: none }
  if (s.parked) admit(s.early, begun, now) else begun
```

### A toast the owner is reading is held, and its whole time starts again when they let go

```quint
pure def canHold(s: Toasts): bool = s.showing and not(s.held)

pure def hold(s: Toasts): Toasts = { ...s, held: true }

pure def canLetGo(s: Toasts): bool = s.held

pure def letGo(s: Toasts, now: int): Toasts = { ...s, held: false, until: now + s.lasts }
```

### A toast goes when its time has come and it is not held, and the next waiting one is shown

```quint
pure def following(now: int, s: Toasts): Toasts =
  val cleared = { ...s, showing: false, current: none, lasts: 0, until: 0, held: false }
  if (s.queue.length() > 0) admit(s.queue.nthOr(0, none), { ...cleared, queue: s.queue.tail() }, now)
  else cleared

pure def canExpire(s: Toasts, now: int): bool = s.showing and not(s.held) and now >= s.until

pure def expire(s: Toasts, now: int): Toasts = following(now, s)
```

### Tapping Undo passes the tap on once, for the toast showing, and the next waiting one is shown

```quint
pure def canTapUndo(s: Toasts): bool = s.showing and s.current.undo

pure def tapUndo(s: Toasts, now: int): Shown =
  { state: following(now, s), out: List({ act: Undone, number: s.current.number }) }
```

### Nothing is shown during startup, and toasts wait only behind one that is showing, at most three of them

```quint
pure def alwaysTheQueueIsBounded(s: Toasts): bool =
  s.queue.length() <= maxQueue and (s.queue.length() > 0 implies s.showing)
    and (s.starting implies not(s.showing)) and (s.parked implies (s.starting and s.early.number > 0))
```

### Every toast is numbered when raised

Discovered by the proof: the notice held through startup is one that was
raised. Without it, the toast shown when startup ends could carry a number
never given.

```quint
pure def alwaysToastsAreNumbered(s: Toasts): bool =
  s.issued >= 0 and s.current.number <= s.issued and s.early.number <= s.issued
    and s.queue.every(t => t.number > 0 and t.number <= s.issued)
```

### A toast with Undo leaves only when its time has come or Undo is tapped

```quint
pure def stepAnUndoIsNeverPushedAside(before: Toasts, via: str, after: Toasts): bool =
  (before.showing and before.current.undo and after.current != before.current)
    implies (via == "expire" or via == "tapUndo")
```

### Undo is passed on only by a tap, for the toast that offered it

```quint
pure def stepUndoIsPassedOnOnce(before: Toasts, via: str, after: Toasts, out: List[Effect]): bool =
  out.every(e => if (e.act == Undone) via == "tapUndo" and before.current.undo and e.number == before.current.number
    else via == "askScale" and e.number == after.scaling.ticket)
    and out.length() <= 1
```

### Plain toasts can wait behind an Undo, and a notice can be held through startup

```quint
pure def sometimesPlainWaitsBehindUndo(s: Toasts): bool = s.showing and s.current.undo and s.queue.length() > 1

pure def sometimesHeldThroughStartup(s: Toasts): bool = s.parked
```

## Story: See a toast over a dialog

> As the owner, I want a toast raised while a dialog is open to appear in
> that dialog, not hidden behind it.

### The phone says which dialog is on top, and the toast showing is shown in it

The dialog on top is a fact of the page; 0 is none, and the toast then
shows on the page itself.

```quint
pure def canCover(s: Toasts, top: int): bool = top >= 0 and top != s.dialog

pure def cover(s: Toasts, top: int): Toasts = { ...s, dialog: top }

pure def shownIn(s: Toasts): int = if (s.showing) s.dialog else 0
```

### A toast with Undo can show inside a dialog

```quint
pure def sometimesUndoInADialog(s: Toasts): bool = shownIn(s) != 0 and s.current.undo
```
