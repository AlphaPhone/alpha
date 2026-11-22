# Toasts

One toast at a time, in the shell's live region: polite for news, assertive for a failure. A toast
stays long enough to read, `max(1.9 s, min(12 s, 50 ms per character + 0.5 s))`, and an Undo offer
ten seconds, the same window as the reviewed-deletion notice. Android's "Time to take action"
setting stretches every toast: the shell asks it for a five-second base at start and on every
resume, and the scale is its answer over the base, never below one. Focus or a pointer inside the
toast holds it. Routine saves, toggles and selections stay quiet; errors and Undo are shown. A
notice the owner must not miss (lost work, a privacy state left on) is announced once as a
failure and also stays listed in the notices slot, without a timer, until it is dismissed.

While a modal dialog is open the toast is copied into that dialog's own live region, the
topmost one only, so it is seen and announced above the dialog; its Undo runs the page's Undo.

```quint
type Toast = { message: str, chars: int, action: str, failure: bool }
type LauncherRead = ReadIdle | ReadLoading | ReadReady | ReadFailed
type NoticeSurface = NoticeHome | NoticeLibrary | NoticeApp | NoticeEditing
type Toasts = {
  scale: int, latest: int, pending: Set[int],
  shown: Toast, seq: int, duration: int, readMin: int, held: bool, delay: int,
  queued: List[Toast], notices: List[str],
  seenStatus: LauncherRead, seenError: str, seenReads: int, launchReported: bool, lastSurface: NoticeSurface
}
pure val NoToast: Toast = { message: "", chars: 0, action: "", failure: false }
pure val initial: Toasts = {
  scale: 100, latest: 0, pending: Set(),
  shown: NoToast, seq: 0, duration: 0, readMin: 0, held: false, delay: 0,
  queued: List(), notices: List(),
  seenStatus: ReadReady, seenError: "", seenReads: 0, launchReported: false, lastSurface: NoticeHome
}
pure val QueueLimit = 3
pure val messageValues = Set("Saved", "Couldn't share. Try again.", "Deleted Lunch")
pure val charsValues = Set(5, 26, 191)
pure val actionValues = Set("", "undo-1")
pure val scaleValues = Set(0, 100, 150, 600)
pure val idValues = Set(1, 2, 3)
pure val readsValues = Set(0, 1, 2)
pure val errorValues = Set("", "Notes could not be opened. Try again.")
pure val errorCharsValues = Set(0, 37)
pure val seqValues = Set(0, 1, 2, 3)
```

## Story: Read what just happened, at my own pace

> As the owner, I want a toast to stay until I can read it, an Undo to stay its full ten seconds, a
> failure to be announced, and nothing important to disappear behind something trivial.

### A toast's time is fixed when it appears, from its length, its kind and the timeout scale

A passive toast with another passive one waiting yields after its short reading time; an Undo offer
or a failure keeps its whole time. A later change of the scale changes only later toasts.

```quint
pure def base(t: Toast): int = if (t.action != "") 10000 else 1900
pure def reading(t: Toast): int = if (t.chars * 50 + 500 > 12000) 12000 else t.chars * 50 + 500
pure def durationOf(t: Toast, scale: int): int = (if (base(t) > reading(t)) base(t) else reading(t)) * scale / 100
pure def readMinOf(t: Toast, scale: int): int =
  if (t.action != "" or t.failure) durationOf(t, scale)
  else (if (durationOf(t, scale) < 1900 * scale / 100) durationOf(t, scale) else 1900 * scale / 100)
pure def passive(t: Toast): bool = t.message != "" and t.action == "" and not(t.failure)
pure def armed(s: Toasts): int = if (passive(s.shown) and s.queued.length() > 0) s.readMin else s.duration
pure def presenting(t: Toast, s: Toasts): Toasts = {
  val shown = { ...s, shown: t, seq: s.seq + 1, duration: durationOf(t, s.scale), readMin: readMinOf(t, s.scale) }
  { ...shown, delay: if (s.held) 0 else armed(shown) }
}
pure def alwaysAToastKeepsItsTimer(s: Toasts): bool =
  if (s.shown.message == "") (s.duration == 0 and s.readMin == 0 and s.delay == 0 and not(s.held))
  else (s.readMin <= s.duration and s.readMin >= 0 and s.delay == (if (s.held) 0 else armed(s)))
pure def alwaysTheScaleIsAtLeastOne(s: Toasts): bool = s.scale >= 100 and s.pending.forall(id => id >= 1 and id <= s.latest)
pure val tValues = Set(NoToast, { message: "Saved", chars: 5, action: "", failure: false },
  { message: "Deleted Lunch", chars: 13, action: "undo-1", failure: false })
pure def lawUndoIsNeverShortened(t: Toast, scale: int): bool =
  (t.action != "" and scale >= 100) implies (durationOf(t, scale) >= 10000 and readMinOf(t, scale) == durationOf(t, scale))
```

### The newest timeout reading wins, and a failed reading keeps the last good one

```quint
pure def request(s: Toasts): Toasts = { ...s, latest: s.latest + 1, pending: s.pending.union(Set(s.latest + 1)) }
pure def canReply(s: Toasts, id: int, scale: int): bool = s.pending.contains(id)
pure def reply(s: Toasts, id: int, scale: int): Toasts =
  { ...s, pending: s.pending.exclude(Set(id)),
    scale: if (id == s.latest and scale > 0) (if (scale < 100) 100 else scale) else s.scale }
pure def reset(s: Toasts): Toasts = { ...s, scale: 100, latest: s.latest + 1 }
pure def sometimesScaledToast(s: Toasts): bool = s.scale > 100 and s.shown.message != ""
```

### A toast waits its turn, except that an Undo or a failure takes a passive toast's place

Consecutive passive toasts share the next slot; an Undo or a failure is never collapsed away. A
toast identical to the one it would wait behind is not queued again. At most three wait; on
overflow the oldest of the lowest rank (passive, then Undo, then failure) goes.

```quint
pure def rank(t: Toast): int = if (t.failure) 2 else if (t.action != "") 1 else 0
pure def lowest(q: List[Toast]): int = q.foldl(2, (a, t) => if (rank(t) < a) rank(t) else a)
pure def dropAt(q: List[Toast]): int =
  q.foldl({ at: 0, found: -1 }, (c, t) => { at: c.at + 1, found: if (c.found < 0 and rank(t) == lowest(q)) c.at else c.found }).found
pure def capped(q: List[Toast]): List[Toast] = if (q.length() > QueueLimit) q.removeAt(dropAt(q)) else q
pure def toasted(t: Toast, s: Toasts): Toasts = {
  val shownPassive = passive(s.shown)
  if (s.shown.message != "" and not(shownPassive and rank(t) > 0)) {
    val tail = s.queued.nthOr(s.queued.length() - 1, s.shown)
    val repeated = t.action == "" and tail == t
    val passiveTail = s.queued.length() > 0 and rank(tail) == 0 and rank(t) == 0
    val waiting = { ...s, queued: if (passiveTail) s.queued.removeAt(s.queued.length() - 1).append(t) else capped(s.queued.append(t)) }
    if (repeated) s else { ...waiting, delay: if (s.held or not(shownPassive)) s.delay else armed(waiting) }
  } else presenting(t, s)
}
pure def canShowToast(s: Toasts, message: str, chars: int, action: str, failure: bool): bool =
  message != "" and chars >= 0 and not(action != "" and failure)
pure def showToast(s: Toasts, message: str, chars: int, action: str, failure: bool): Toasts =
  toasted({ message: message, chars: chars, action: action, failure: failure }, s)
pure def alwaysTheQueueIsBounded(s: Toasts): bool =
  s.queued.length() <= QueueLimit and s.queued.every(t => t.message != "" and not(t.action != "" and t.failure)) and
  not(s.shown.action != "" and s.shown.failure)
pure def sometimesQueuedBehindUndo(s: Toasts): bool = s.queued.length() > 0 and s.shown.action != "" and not(s.held)
pure def sometimesQueuedBehindFailure(s: Toasts): bool = s.queued.length() > 0 and s.shown.failure
pure def sometimesFullQueue(s: Toasts): bool = s.queued.length() == QueueLimit
```

### A toast leaves when its time is up or its Undo ran, and the next one takes its place

Expiry belongs to the toast it was set for. A held toast never expires.

```quint
pure def closed(queue: List[Toast], s: Toasts): Toasts =
  if (queue.length() == 0) { ...s, shown: NoToast, seq: s.seq + 1, duration: 0, readMin: 0, delay: 0, held: false }
  else presenting(queue.nthOr(0, NoToast), { ...s, queued: queue.tail(), held: false })
pure def canExpire(s: Toasts, seq: int): bool = s.shown.message != "" and not(s.held) and seq == s.seq
pure def expire(s: Toasts, seq: int): Toasts = closed(s.queued, s)
pure def canTakeAction(s: Toasts, seq: int): bool = s.shown.action != "" and seq == s.seq
pure def takeAction(s: Toasts, seq: int): Toasts = closed(s.queued, s)
pure def canHold(s: Toasts): bool = s.shown.message != "" and not(s.held)
pure def hold(s: Toasts): Toasts = { ...s, held: true, delay: 0 }
pure def canResume(s: Toasts): bool = s.held
pure def resume(s: Toasts): Toasts = { ...s, held: false, delay: armed(s) }
pure def stepExpiryOnlyForItsToast(before: Toasts, via: str, after: Toasts): bool =
  (via == "expire" or via == "takeAction") implies (after.seq > before.seq)
pure def sometimesHeldWithQueue(s: Toasts): bool = s.held and s.queued.length() > 0
```

### A persistent notice is listed until dismissed, at most three, each once

```quint
pure def canPersist(s: Toasts, message: str, chars: int): bool = message != "" and chars >= 0
pure def persist(s: Toasts, message: str, chars: int): Toasts = {
  val listed = if (s.notices.includes(message)) s.notices
    else if (s.notices.length() == QueueLimit) s.notices.tail().append(message) else s.notices.append(message)
  toasted({ message: message, chars: chars, action: "", failure: true }, { ...s, notices: listed })
}
pure def canDismiss(s: Toasts, message: str): bool = s.notices.includes(message)
pure def dismiss(s: Toasts, message: str): Toasts = { ...s, notices: s.notices.select(m => m != message) }
pure def alwaysNoticesAreFewAndDistinct(s: Toasts): bool =
  s.notices.length() <= QueueLimit and s.notices.every(m => s.notices.select(n => n == m).length() == 1)
pure def sometimesNoticeOutlivesItsToast(s: Toasts): bool = s.notices.length() > 0 and s.shown.message == ""
```

### Home reports a failed launch once, and a failed inventory only when it removed a favorite

The library, an open app and edit mode report their own errors. On Home a new launch error is
shown once; a failed inventory read is explained once, and only when it hid a favorite, and not as
the follow-up read of a launch error Home already showed. A later recovery allows a new
explanation.

```quint
pure def canReportLauncher(s: Toasts, surface: NoticeSurface, status: LauncherRead, error: str, errorChars: int,
  reads: int, missingFavorite: bool): bool = reads >= s.seenReads and errorChars >= 0
pure def reportLauncher(s: Toasts, surface: NoticeSurface, status: LauncherRead, error: str, errorChars: int,
  reads: int, missingFavorite: bool): Toasts = {
  val read = reads != s.seenReads
  val afterLaunch = s.launchReported and read
  val errorToast = surface == NoticeHome and error != "" and error != s.seenError
  val inventoryToast = surface == NoticeHome and not(errorToast) and status == ReadFailed and s.seenStatus != ReadFailed and
    not(afterLaunch) and missingFavorite
  val seen = { ...s, seenStatus: status, seenError: error, seenReads: reads, lastSurface: surface,
    launchReported: errorToast or (not(read) and s.launchReported) }
  if (errorToast) toasted({ message: error, chars: errorChars, action: "", failure: true }, seen)
  else if (inventoryToast) toasted({ message: "Couldn't load your apps", chars: 23, action: "", failure: true }, seen)
  else seen
}
pure def stepOnlyHomeReportsTheLauncher(before: Toasts, via: str, after: Toasts): bool =
  (via == "reportLauncher" and after.seq != before.seq) implies after.lastSurface == NoticeHome
pure def sometimesInventoryExplained(s: Toasts): bool = s.shown.message == "Couldn't load your apps"
```

### Inside a modal dialog the toast lives in the topmost dialog

```quint
pure def toastHost(dialogs: List[str]): str = dialogs.nthOr(dialogs.length() - 1, "")
pure val dialogsValues = Set(List(), List("a"), List("a", "b"))
pure def lawOnlyTheTopDialogHostsTheToast(dialogs: List[str]): bool =
  (dialogs.length() == 0 implies toastHost(dialogs) == "") and
  (dialogs.length() > 0 implies toastHost(dialogs) == dialogs.nth(dialogs.length() - 1))
```
