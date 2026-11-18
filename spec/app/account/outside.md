# Outside

What the account's machines share about the world beyond the page: a
browser visit whose return is taken once, and a read that stops
mattering. [Sign-in](./signIn.md), [Billing](./billing.md) and
[Google & email](./google.md) each hold a visit; every machine of the
account retires reads with the same rule. Both belong in the
[kit](../../kit/index.md) once another area needs them.

## Story: Visit the browser and come back

> As the owner, I want Alpha to act on my return from the browser once,
> only for the page it last opened, and never to keep me waiting for a
> return that does not come.

### A visit is closed, open under its number, or orphaned by a restart

```quint
import read as R from "../../kit/read"

type Visit = { open: bool, number: int, orphan: bool }

pure val novisit: Visit = { open: false, number: 0, orphan: false }

pure def valid(v: Visit): bool = v.number >= 0 and ((v.open or v.orphan) implies v.number > 0) and not(v.open and v.orphan)
```

### Opening a visit gives it the next number and retires every visit before it

```quint
pure def go(v: Visit): Visit = { open: true, number: v.number + 1, orphan: false }
```

### Only the open visit's return is taken, and taking it, or no longer waiting for it, closes the visit

```quint
pure def canReturn(v: Visit, number: int): bool = v.open and number == v.number

pure def back(v: Visit): Visit = { ...v, open: false }
```

### A restart orphans the open visit, and only its own return is then taken, once

What an orphaned return may do is for each machine to say; none signs
in or buys anything.

```quint
pure def orphaned(v: Visit): Visit = { ...v, open: false, orphan: v.open or v.orphan }

pure def canReturnCold(v: Visit, number: int): bool = v.orphan and number == v.number

pure def coldBack(v: Visit): Visit = { ...v, orphan: false }
```

### A return is taken once, a return from an older visit never, and every visit stays well formed

```quint
pure def lawAReturnIsTakenOnce(number: int): bool =
  val v = go({ open: false, number: number, orphan: false })
  canReturn(v, number + 1) and not(canReturn(back(v), number + 1)) and not(canReturnCold(coldBack(orphaned(v)), number + 1))

pure def lawAnOlderVisitIsNeverReturned(number: int, older: int): bool =
  older <= number implies not(canReturn(go({ open: true, number: number, orphan: false }), older))

pure def lawVisitsStayWellFormed(open: bool, number: int, orphan: bool): bool =
  val v = { open: open, number: number, orphan: orphan }
  valid(v) implies (valid(go(v)) and valid(back(v)) and valid(orphaned(v)) and valid(coldBack(v)))
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
