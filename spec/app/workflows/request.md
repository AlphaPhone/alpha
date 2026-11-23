# Request

A change Alpha asks the resident agent to make on the owner's behalf: run a
workflow, turn one on, save one, remove one, run a missed digest. The agent
applies a request's number at most once and keeps a record of what it
applied, so a request whose answer never arrived is settled by reading that
record, never by guessing. On the agent's side the same request is eliza's
workflow intent and its admission (`workflow/intents`, `workflow/admission`);
this is only what the phone keeps of it.

Every machine of Workflows and Digests that asks the agent for a change
holds one Request and moves it only through these steps, so each machine
states its own wrapper and the rules here once. Two areas now use it, so it
belongs in the kit; until it moves, Digests imports it from here.

## Story: Ask the agent once

> As the owner, I want each change I confirmed to reach the agent at most
> once, to be told when Alpha cannot yet tell whether it did, and never to
> be left locked out of the thing I changed.

### A request is an attempt, whether its answer is still awaited, whether it is offered to be sent again, whether it was, and the reading of the agent's record of it

```quint
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"

type Request = { attempt: A::Attempt, live: bool, offered: bool, again: bool, record: R::Read }

pure val unasked: Request = { attempt: A::plan(0), live: false, offered: false, again: false, record: R::unread }

pure def numbered(id: int): Request = { ...unasked, attempt: A::plan(id) }

pure val qValues = Set(
  unasked, file(unasked), send(file(unasked)), lose(send(file(unasked))),
  recover(lose(send(file(unasked))), false, false), resend(recover(lose(send(file(unasked))), false, false)),
  answer(send(file(unasked)), true), check(lose(send(file(unasked)))),
)
```

### A request is kept from the moment it is recorded until its outcome is known

While it is kept, nothing else may be asked about the same thing.

```quint
pure def kept(q: Request): bool =
  q.attempt.outcome == A::Recorded or q.attempt.outcome == A::Sent or q.offered

pure def unsettled(q: Request): bool = q.attempt.outcome == A::Sent and not(q.live)
```

### A new request takes the next number and is recorded before anything is sent

```quint
pure def canFile(q: Request): bool = not(kept(q))

pure def file(q: Request): Request =
  { attempt: A::record(A::plan(q.attempt.id + 1)), live: false, offered: false, again: false,
    record: { ...q.record, status: R::Idle } }
```

### Only a recorded request is sent, and its answer is then awaited

```quint
pure def canSend(q: Request): bool = A::canDispatch(q.attempt)

pure def send(q: Request): Request = { ...q, attempt: A::dispatch(q.attempt), live: true }
```

### The answer to the request still awaited settles it, except a refusal of a request sent twice

A refusal of the second copy says nothing about the first, which may still
arrive, so that request stays kept until the agent's record is read.

```quint
pure def canAnswer(q: Request, id: int): bool = q.live and A::canConclude(q.attempt, id)

pure def answer(q: Request, applied: bool): Request =
  if (not(applied) and q.again) { ...q, live: false }
  else { ...q, attempt: A::conclude(q.attempt, applied, true), live: false }
```

### A request whose answer never arrived stays kept

No answer came, or Alpha restarted before one could.

```quint
pure def lose(q: Request): Request = { ...q, live: false }

pure def restart(q: Request): Request = { ...q, live: false, record: { ...q.record, status: R::Idle } }
```

### A request with no answer is checked by reading the agent's record of it, one reading at a time, and only the newest reading counts

```quint
pure def canCheck(q: Request): bool = unsettled(q) and q.record.status != R::Loading

pure def check(q: Request): Request = { ...q, record: R::ask(q.record) }

pure def canChecked(q: Request, ticket: int): bool = R::canAnswer(q.record, ticket) and unsettled(q)
```

### The agent's record settles a request with no answer: applied, never to apply, or free to send again

A request the agent holds no record of can never apply once the thing it
names has moved on. If the thing has not moved on, the same request may
have been lost, and it is offered to be sent again under its own number. A
reading that failed settles nothing.

```quint
pure def recover(q: Request, found: bool, stale: bool): Request =
  if (found) { ...q, attempt: A::conclude(q.attempt, true, true) }
  else { ...q, attempt: A::conclude(q.attempt, false, true), offered: not(stale) }

pure def checked(q: Request, ok: bool, found: bool, stale: bool): Request =
  val read = { ...q, record: R::answer(q.record, ok) }
  if (ok) recover(read, found, stale) else read
```

### A request offered again is sent again under its own number

```quint
pure def canResend(q: Request): bool = q.offered and A::canRecord(q.attempt)

pure def resend(q: Request): Request =
  { ...q, attempt: A::dispatch(A::record(q.attempt)), live: true, offered: false, again: true }
```

### The owner can let go of a request only once its record was checked, and it is then never sent again

Letting go of a request with no answer records its outcome as unknown.
Letting go of an offer leaves the request refused.

```quint
pure def canRelease(q: Request): bool =
  q.offered or (unsettled(q) and (q.record.status == R::Loaded or q.record.status == R::Failed))

pure def release(q: Request): Request =
  if (q.offered) { ...q, offered: false }
  else { ...q, attempt: A::conclude(q.attempt, false, false) }
```

### A request of an owner who signed out is let go: never sent if it was not yet, unknown if it was

```quint
pure def abandon(q: Request): Request =
  if (q.attempt.outcome == A::Recorded) { ...q, attempt: { ...q.attempt, outcome: A::Refused } }
  else if (q.attempt.outcome == A::Sent) { ...q, live: false, attempt: A::conclude(q.attempt, false, false) }
  else { ...q, offered: false }
```

### A request awaits an answer only once sent, and is offered again only once the agent said it had not applied it

Every machine that holds a request keeps this of it.

```quint
pure def sound(q: Request): bool = and {
  q.live implies q.attempt.outcome == A::Sent,
  q.offered implies q.attempt.outcome == A::Refused,
  q.attempt.id >= 0, q.record.ticket >= 0,
}
```

### Only one request is kept at a time

```quint
pure def lawOneRequestIsKeptAtATime(id: int): bool =
  not(canFile(file(numbered(id)))) and not(canFile(send(file(numbered(id)))))
```

### An answer is taken once

```quint
pure def lawAnAnswerIsTakenOnce(id: int, applied: bool): bool =
  val q = answer(send(file(numbered(id))), applied)
  not(canAnswer(q, id + 1)) and not(kept(q)) and not(canSend(q)) and not(canResend(q))
```

### A request with no answer is neither dropped nor sent again unasked, and cannot be let go before its record was checked

```quint
pure def lawAnUnansweredRequestStaysKept(id: int): bool =
  val q = lose(send(file(numbered(id))))
  kept(q) and unsettled(q) and not(canSend(q)) and not(canResend(q)) and not(canAnswer(q, id + 1))
    and not(canRelease(q)) and canRelease(checked(check(q), false, false, false))
```

### The agent's record frees the owner or offers the same request again

```quint
pure def lawTheAgentsRecordSettles(id: int, found: bool, stale: bool): bool =
  val q = recover(lose(send(file(numbered(id)))), found, stale)
  if (found or stale) not(kept(q)) and not(canResend(q)) else kept(q) and canResend(q)
```

### A request sent again keeps its number, and a refusal of it settles nothing

```quint
pure def lawAResendKeepsItsNumber(id: int): bool =
  val q = resend(recover(lose(send(file(numbered(id)))), false, false))
  q.attempt.id == id + 1 and kept(answer(q, false)) and unsettled(answer(q, false)) and not(kept(answer(q, true)))
```

### A request let go or abandoned is never sent again

```quint
pure def lawAReleasedRequestIsNeverSentAgain(id: int): bool =
  val q = release(checked(check(lose(send(file(numbered(id))))), false, false, false))
  val r = release(recover(lose(send(file(numbered(id)))), false, false))
  val s = abandon(file(numbered(id)))
  val t = abandon(send(file(numbered(id))))
  q.attempt.outcome == A::Unknown and not(kept(q)) and not(canSend(q)) and not(canResend(q))
    and not(kept(r)) and not(canSend(r)) and not(canResend(r))
    and not(kept(s)) and not(canSend(s)) and not(canResend(s))
    and t.attempt.outcome == A::Unknown and not(kept(t)) and not(canResend(t))
```

### Every step keeps a request sound

```quint
pure def lawEveryStepKeepsARequestSound(q: Request, id: int, applied: bool, ok: bool, found: bool, stale: bool): bool =
  sound(q) implies and {
    canFile(q) implies sound(file(q)),
    canSend(q) implies sound(send(q)),
    canAnswer(q, id) implies sound(answer(q, applied)),
    sound(lose(q)), sound(restart(q)), sound(abandon(q)),
    canCheck(q) implies sound(check(q)),
    canChecked(q, id) implies sound(checked(q, ok, found, stale)),
    canResend(q) implies sound(resend(q)),
    canRelease(q) implies sound(release(q)),
  }
```
