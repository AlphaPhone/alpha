# Outside

What the account's machines share about the world beyond the page: a
browser visit whose return is taken once and which never keeps the owner
waiting, a read that stops mattering, and who may start something in the
account. [Sign-in](./signIn.md), [Billing](./billing.md) and
[Google & email](./google.md) each hold a visit; every machine of the
account retires reads with the same rule and takes the same origins. All
three belong in the [kit](../../kit/index.md) once another area needs them.

## Story: Visit the browser and come back

> As the owner, I want Alpha to act on my return from the browser once,
> only for the page it last opened, and never to keep me waiting for a
> return that does not come.

### A visit is closed, open under its number since the time it opened, or orphaned by a restart

```quint
import read as R from "../../kit/read"

type Visit = { open: bool, number: int, orphan: bool, at: int }

pure val novisit: Visit = { open: false, number: 0, orphan: false, at: 0 }

pure def valid(v: Visit): bool = v.number >= 0 and ((v.open or v.orphan) implies v.number > 0) and not(v.open and v.orphan)
```

### Opening a visit gives it the next number and retires every visit before it

```quint
pure def go(v: Visit, now: int): Visit = { open: true, number: v.number + 1, orphan: false, at: now }
```

### Only the open visit's return is taken, and taking it, or no longer waiting for it, closes the visit

```quint
pure def canReturn(v: Visit, number: int): bool = v.open and number == v.number

pure def back(v: Visit): Visit = { ...v, open: false }
```

### An open visit is given up once its time has passed, or when the clock went back

```quint
pure def overdue(v: Visit, now: int, limit: int): bool = v.open and (now < v.at or now - v.at >= limit)

pure def lawAVisitIsGivenUpInTime(number: int, at: int, limit: int): bool =
  val v = { open: true, number: number, orphan: false, at: at }
  limit >= 0 implies (overdue(v, at + limit, limit) and overdue(v, at - 1, limit) and not(overdue(back(v), at + limit, limit)))
```

### A restart orphans the open visit, and only its own return is then taken, once

What an orphaned return may do is for each machine to say; none signs
in or buys anything.

```quint
pure def orphaned(v: Visit): Visit = { ...v, open: false, orphan: v.open or v.orphan }

pure def canReturnCold(v: Visit, number: int): bool = v.orphan and number == v.number

pure def coldBack(v: Visit): Visit = { ...v, orphan: false }

pure def ended(v: Visit): Visit = back(coldBack(v))
```

### A return is taken once, a return from an older visit never, and every visit stays well formed

```quint
pure def lawAReturnIsTakenOnce(number: int, now: int): bool =
  val v = go({ open: false, number: number, orphan: false, at: 0 }, now)
  canReturn(v, number + 1) and not(canReturn(back(v), number + 1)) and not(canReturnCold(coldBack(orphaned(v)), number + 1))
    and not(canReturn(ended(v), number + 1)) and not(canReturnCold(ended(orphaned(v)), number + 1))

pure def lawAnOlderVisitIsNeverReturned(number: int, earlier: int, now: int): bool =
  earlier <= number implies not(canReturn(go({ open: true, number: number, orphan: false, at: 0 }, now), earlier))

pure def lawVisitsStayWellFormed(open: bool, number: int, orphan: bool, now: int): bool =
  val v = { open: open, number: number, orphan: orphan, at: 0 }
  valid(v) implies (valid(go(v, now)) and valid(back(v)) and valid(orphaned(v)) and valid(coldBack(v)) and valid(ended(v)))
```

## Story: Stop waiting for an answer

> As the owner, I want what I see never to change because of an answer
> to a question that no longer matters.

### A read in flight that no longer matters is answered as failed, and takes no answer after

```quint
pure def retire(r: R::Read): R::Read = if (r.status == R::Loading) R::answer(r, false) else r

pure def lawARetiredReadTakesNoAnswer(ticket: int): bool =
  not(R::canAnswer(retire(R::ask({ status: R::Idle, ticket: ticket })), ticket + 1))
    and retire(R::ask({ status: R::Idle, ticket: ticket })).ticket == ticket + 1
```

## Story: Keep the agent out of my account

> As the owner, I want the agent never to sign me in or out, buy
> anything, change a key or connect an account, and a card it shows me
> in the conversation only to open the screen where I do it myself.

### A request comes from the owner, from a card the assistant showed, or from the agent

The assistant shows cards that open the plan, sign-in,
funding and provider screens, and the start of the agent.

```quint
type Origin = ByOwner | ByCard | ByAgent

pure def acts(origin: Origin): bool = origin == ByOwner

pure def opens(origin: Origin): bool = origin == ByOwner or origin == ByCard
```

### The agent starts nothing in the account, and a card only opens the owner's own screen

```quint
pure def lawTheAgentStartsNothingAndACardOnlyOpens(origin: Origin): bool =
  not(acts(ByAgent)) and not(opens(ByAgent)) and opens(ByCard) and not(acts(ByCard))
    and (acts(origin) implies opens(origin))
```
