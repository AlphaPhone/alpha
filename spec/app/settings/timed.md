# Timed read

A read of Settings that has a time limit: the kit's
[read](../../kit/read.md) with the time by which its answer is due. Every
asking of the area that waits on the phone, the agent or a file is one of
these, so that no row or control waits for ever.

## Story: Wait for an answer, but not for ever

> As the owner, I want every row that waits on the phone to stop waiting
> after a while, and never to take an answer that came too late.

### A timed read is a read and the time its answer is due

```quint
import read as R from "../../kit/read"

type Timed = { read: R::Read, due: int }

pure val unasked: Timed = { read: R::unread, due: 0 }

pure def busy(t: Timed): bool = t.read.status == R::Loading
```

### Asking takes the next ticket and sets the time its answer is due

```quint
pure def ask(t: Timed, at: int, limit: int): Timed = { read: R::ask(t.read), due: at + limit }
```

### Only the newest asking's answer is taken, once

```quint
pure def canAnswer(t: Timed, ticket: int): bool = R::canAnswer(t.read, ticket)

pure def answer(t: Timed, ok: bool): Timed = { ...t, read: R::answer(t.read, ok) }
```

### An asking whose time has come is given up as failed, and its answer is then refused

```quint
pure def canGiveUp(t: Timed, now: int): bool = busy(t) and now >= t.due

pure def lawAnAnswerAfterGivingUpIsRefused(ticket: int, at: int, limit: int, now: int): bool =
  val asked = ask({ read: { status: R::Idle, ticket: ticket }, due: 0 }, at, limit)
  not(canAnswer(answer(asked, false), asked.read.ticket))
```

### Leaving a screen retires its asking: nothing is waited for, and a late answer is refused

```quint
pure def retire(t: Timed): Timed = if (busy(t)) { ...t, read: { ...t.read, status: R::Idle } } else t

pure def lawARetiredAskingTakesNoAnswer(ticket: int, at: int, limit: int): bool =
  val asked = ask({ read: { status: R::Idle, ticket: ticket }, due: 0 }, at, limit)
  not(busy(retire(asked))) and not(canAnswer(retire(asked), asked.read.ticket))
```
