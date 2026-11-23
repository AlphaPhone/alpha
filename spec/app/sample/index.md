# Reminders

The reminders the resident agent keeps: read from it when they are shown,
kept up to date by what it pushes while they are, and deleted from it a few
seconds after the owner dismisses one, unless the owner takes it back. It is
the sample every area copies: a read, a feed, an undo window and an attempt
outside, carried out by the shell and taken up again after a restart.

## Story: See and dismiss reminders

> As the owner, I want to see the reminders my agent keeps, current while I
> look at them, and to take back a dismissal I did by mistake, and to be told
> when Alpha cannot know whether one was deleted.

### The list is read under the kit's read, followed by a feed while it shows, and a dismissal is held, then deleted by an attempt

```quint
import read as R from "../../kit/read"
import undo as U from "../../kit/undo"
import attempt as A from "../../kit/attempt"

type Effect = Fetch({ ticket: int }) | Listen({ ticket: int }) | Unlisten | Wake({ at: int }) | Delete({ id: int, title: str })
type Feed = { open: bool, ticket: int }
type Deletion = { title: str, attempt: A::Attempt }
type Reminders = { list: R::Read, titles: List[str], hidden: str, undo: U::Undo, showing: bool, feed: Feed, deletion: Deletion }
type Moved = { state: Reminders, out: List[Effect] }

pure val initial: Reminders = {
  list: R::unread, titles: List(), hidden: "", undo: U::free, showing: false,
  feed: { open: false, ticket: 0 }, deletion: { title: "", attempt: A::plan(0) },
}
pure val holdFor = 5000
pure val nowValues = Set(0, 1, 4999, 5000, 5001, 10000)
pure val titleValues = Set("a", "b")
pure val titlesValues = Set(List(), List("a"), List("a", "b"))
```

### Asking again fetches under the next ticket

```quint
pure def canRefresh(s: Reminders): bool = s.list.status != R::Loading

pure def refresh(s: Reminders): Moved =
  { state: { ...s, list: R::ask(s.list) }, out: List(Fetch({ ticket: s.list.ticket + 1 })) }
```

### Shown, the list is read and its feed opened under the next tickets; hidden, the feed is closed

```quint
pure def canShow(s: Reminders, showing: bool): bool = showing != s.showing

pure def show(s: Reminders, showing: bool): Moved =
  if (showing)
    { state: { ...s, showing: true, list: R::ask(s.list), feed: { open: true, ticket: s.feed.ticket + 1 } },
      out: List(Fetch({ ticket: s.list.ticket + 1 }), Listen({ ticket: s.feed.ticket + 1 })) }
  else { state: { ...s, showing: false, feed: { ...s.feed, open: false } }, out: List(Unlisten) }
```

### Only the newest asking's answer is taken: the titles, or a failure that keeps the titles last read

```quint
pure def canLoaded(s: Reminders, ticket: int): bool = R::canAnswer(s.list, ticket)

pure def loaded(s: Reminders, ticket: int, titles: List[str]): Reminders =
  { ...s, list: R::answer(s.list, true), titles: titles.select(t => t != s.hidden) }

pure def canFailed(s: Reminders, ticket: int): bool = R::canAnswer(s.list, ticket)

pure def failed(s: Reminders, ticket: int): Reminders = { ...s, list: R::answer(s.list, false) }
```

### Only the open feed's pushes are taken, until it drops

```quint
pure def canPushed(s: Reminders, ticket: int): bool = s.feed.open and ticket == s.feed.ticket

pure def pushed(s: Reminders, ticket: int, titles: List[str]): Reminders =
  { ...s, titles: titles.select(t => t != s.hidden) }

pure def canDropped(s: Reminders, ticket: int): bool = s.feed.open and ticket == s.feed.ticket

pure def dropped(s: Reminders, ticket: int): Reminders = { ...s, feed: { ...s.feed, open: false } }
```

### A dismissed reminder leaves the list at once and is held for five seconds, one at a time and never while another is being deleted

```quint
pure def canDismiss(s: Reminders, title: str): bool =
  s.titles.includes(title) and s.undo.holding != U::Held and s.deletion.attempt.outcome != A::Sent

pure def dismiss(s: Reminders, title: str, now: int): Moved =
  { state: { ...s, titles: s.titles.select(t => t != title), hidden: title, undo: U::hold(now, holdFor) },
    out: List(Wake({ at: now + holdFor })) }
```

### Undo within the five seconds puts the reminder back

```quint
pure def canUndoDismiss(s: Reminders, now: int): bool = U::canUndo(s.undo, now)

pure def undoDismiss(s: Reminders, now: int): Reminders =
  { ...s, titles: s.titles.append(s.hidden), hidden: "", undo: U::undo(s.undo) }
```

### Once the five seconds are over the deletion is recorded as sent, and only then asked of the agent

```quint
pure def canExpire(s: Reminders, now: int): bool = U::canRelease(s.undo, now)

pure def expire(s: Reminders, now: int): Moved =
  val id = s.deletion.attempt.id + 1
  { state: { ...s, hidden: "", undo: U::release(s.undo), deletion: { title: s.hidden, attempt: A::dispatch(A::record(A::plan(id))) } },
    out: List(Delete({ id: id, title: s.hidden })) }
```

### The deletion ends as the agent's answer says, or unknown when no answer can be trusted

```quint
pure def canDeleted(s: Reminders, id: int): bool = A::canConclude(s.deletion.attempt, id)

pure def deleted(s: Reminders, id: int, confirmed: bool, known: bool): Reminders =
  { ...s, deletion: { ...s.deletion, attempt: A::conclude(s.deletion.attempt, confirmed, known) } }
```

### When Alpha opens again, a read and a hold under way are taken up again, the feed is closed, and a deletion sent is unknown

A deletion that was sent when Alpha stopped may or may not have reached the
agent, so it is never sent again.

```quint
pure def reopen(s: Reminders): Moved =
  { state: { ...s, showing: false, feed: { ...s.feed, open: false },
             deletion: if (s.deletion.attempt.outcome == A::Sent) { ...s.deletion, attempt: A::conclude(s.deletion.attempt, false, false) } else s.deletion },
    out: (if (s.list.status == R::Loading) List(Fetch({ ticket: s.list.ticket })) else List())
      .concat(if (s.undo.holding == U::Held) List(Wake({ at: s.undo.until })) else List()) }
```

### Reopening asks again for every read and wake under way, and leaves no deletion sent

```quint
pure def stepReopenTakesUpWork(before: Reminders, via: str, after: Reminders, out: List[Effect]): bool =
  via == "reopen" implies (
    (before.list.status == R::Loading implies out.some(e => match e { | Fetch(f) => f.ticket == before.list.ticket | _ => false }))
    and (before.undo.holding == U::Held implies out.some(e => match e { | Wake(w) => w.at == before.undo.until | _ => false }))
    and after.deletion.attempt.outcome != A::Sent)
```

### A reminder is hidden exactly while its dismissal is held

```quint
pure def alwaysHiddenWhileHeld(s: Reminders): bool = (s.hidden != "") implies (s.undo.holding == U::Held)
```

### The feed is open only while the list shows

```quint
pure def alwaysFeedOnlyWhileShowing(s: Reminders): bool = s.feed.open implies s.showing
```

### A dismissal is woken at the end of its window

```quint
pure def stepDismissalWakes(before: Reminders, via: str, after: Reminders, out: List[Effect]): bool =
  via == "dismiss" implies (out.length() == 1 and out.every(e => match e { | Wake(w) => w.at == after.undo.until | _ => false }))
```

### The agent is asked to delete only when a hold is over

```quint
pure def stepDeleteOnlyOnExpire(before: Reminders, via: str, after: Reminders, out: List[Effect]): bool =
  out.some(e => match e { | Delete(d) => true | _ => false }) implies (via == "expire" and after.deletion.attempt.outcome == A::Sent)
```

### The list can be loaded, a dismissal held, and a deletion's outcome unknown

```quint
pure def sometimesLoaded(s: Reminders): bool = s.list.status == R::Loaded and s.titles.length() > 0

pure def sometimesHeld(s: Reminders): bool = s.undo.holding == U::Held

pure def sometimesDeletionUnknown(s: Reminders): bool = s.deletion.attempt.outcome == A::Unknown
```
