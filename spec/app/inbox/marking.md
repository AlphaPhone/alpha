# Marking

Marking a message read or unread in Gmail, from Inbox: by the owner, or
once when an unread message is opened. Each mark is one kit
[attempt](../../kit/attempt.md), with no review: it is a label Gmail sets
the same however often it is sent, so what matters is that one is in
flight at a time and that an outcome Alpha cannot confirm is not repeated
behind the owner's back.

The shell passes the grant of the message's account as the
[list](./index.md) holds it, and tells when the list was read afresh.

## Story: Mark mail read or unread

> As the owner, I want a message marked read when I open it, once, to mark
> it read or unread myself, and to be told when Gmail did not confirm it.

### Marking holds the mark in flight, what the owner was last told of a mark, the messages marked on opening in this session, and those whose mark is unconfirmed

```quint
import attempt as A from "../../kit/attempt"
import access.* from "./access"

type Told = Quiet | Busy | Marked | NotMarked | Unconfirmed
type Marking = {
  account: int, message: int, unread: bool, automatic: bool, attempt: A::Attempt, attempts: int,
  told: Told, opened: Set[int], doubtful: Set[int],
}

type Effect = MarkMessage({ attempt: int, account: int, message: int, unread: bool })
type Marks = { state: Marking, out: List[Effect] }

pure val initial: Marking = {
  account: 0, message: 0, unread: false, automatic: false, attempt: A::plan(0), attempts: 0,
  told: Quiet, opened: Set(), doubtful: Set(),
}

pure val accountValues = Set(1, 2)
pure val messageValues = Set(0, 1, 2)
pure val attemptValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
pure val weight_marked = 3
pure val weight_markLost = 2
```

### A mark needs the consent to change the mailbox of the message's account, and goes out at once, recorded first, one at a time

```quint
pure def inFlight(s: Marking): bool = s.attempt.outcome == A::Sent

pure def marking(account: int, message: int, unread: bool, automatic: bool, s: Marking): Marks =
  val a = A::dispatch(A::record(A::plan(s.attempts + 1)))
  {
    state: { ...s, account: account, message: message, unread: unread, automatic: automatic, attempt: a, attempts: s.attempts + 1 },
    out: List(MarkMessage({ attempt: a.id, account: account, message: message, unread: unread })),
  }
```

### The owner marks a message read or unread; while another mark is in flight the owner is told it is still in progress, and a message whose last mark was unconfirmed is marked again only after the list was read afresh

```quint
pure def canMark(s: Marking, access: Access, account: int, message: int, by: Actor): bool =
  by == Owner and message != 0 and allowsFor(access, account, Changing) and not(s.doubtful.contains(message))

pure def mark(s: Marking, access: Access, account: int, message: int, unread: bool, by: Actor): Marks =
  if (inFlight(s)) { state: { ...s, told: Busy }, out: List() } else marking(account, message, unread, false, s)
```

### Opening an unread message marks it read once in a session, silently, and never again, even when it is not known to have worked

A mark of another message in flight lets the opening pass unmarked.

```quint
pure def canOpenedUnread(s: Marking, access: Access, account: int, message: int): bool =
  message != 0 and not(s.opened.contains(message)) and not(s.doubtful.contains(message)) and not(inFlight(s))
    and allowsFor(access, account, Changing)

pure def openedUnread(s: Marking, access: Access, account: int, message: int): Marks =
  val m = marking(account, message, false, true, s)
  { state: { ...m.state, opened: s.opened.union(Set(message)) }, out: m.out }
```

### The answer to the mark in flight ends it; a reply that does not match the mark asked, or none, leaves it unconfirmed, and the owner is told to refresh before trying again

An automatic mark tells nothing.

```quint
pure def concluding(ended: A::Attempt, s: Marking): Marking = {
  ...s, attempt: ended,
  told:
    if (s.automatic) Quiet
    else if (ended.outcome == A::Confirmed) Marked
    else if (ended.outcome == A::Refused) NotMarked
    else Unconfirmed,
  doubtful: if (ended.outcome == A::Unknown) s.doubtful.union(Set(s.message)) else s.doubtful,
}

pure def canMarked(s: Marking, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def marked(s: Marking, attempt: int, done: bool, matches: bool): Marking = concluding(A::conclude(s.attempt, done, matches), s)

pure def canMarkLost(s: Marking, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def markLost(s: Marking, attempt: int): Marking = concluding(A::conclude(s.attempt, false, false), s)

pure def leadsToAMarkEnds(s: Marking, later: Marking): bool = inFlight(s) implies not(inFlight(later))

pure val fair_marked = "strong"
pure val fair_markLost = "strong"
```

### A list read afresh lets unconfirmed marks be tried again, and the owner can put the message away

```quint
pure def refreshed(s: Marking): Marking = { ...s, doubtful: Set() }

pure def canDismiss(s: Marking): bool = s.told != Quiet

pure def dismiss(s: Marking): Marking = { ...s, told: Quiet }
```

### A request is one mark, recorded first, while none other is in flight, and never of a message whose mark is unconfirmed

```quint
pure def stepOneMarkAtATime(before: Marking, via: str, after: Marking, out: List[Effect]): bool =
  out.every(e => match e {
    | MarkMessage(m) =>
      not(inFlight(before)) and inFlight(after) and m.attempt == after.attempt.id and m.attempt == before.attempts + 1
        and m.message != 0 and not(before.doubtful.contains(m.message))
        and (via == "openedUnread" implies (not(before.opened.contains(m.message)) and not(m.unread)))
    | _ => true
  })

pure def alwaysAMarkIsNumbered(s: Marking): bool =
  0 <= s.attempt.id and s.attempt.id <= s.attempts and s.attempt.outcome != A::Recorded
    and (inFlight(s) implies s.message != 0)
```

### An automatic mark never tells the owner anything

```quint
pure def stepAnAutomaticMarkIsSilent(before: Marking, after: Marking): bool =
  (before.automatic and inFlight(before) and not(inFlight(after)) and after.attempt.id == before.attempt.id) implies after.told == Quiet
```

### A new cloud session forgets the marks of the one before, and a restart leaves a mark in flight unconfirmed

```quint
pure def sessionChanged(s: Marking): Marking =
  { ...s, told: Quiet, opened: Set(), doubtful: Set(), attempt: if (inFlight(s)) A::conclude(s.attempt, false, false) else s.attempt }

pure def restart(s: Marking): Marking = if (inFlight(s)) concluding(A::conclude(s.attempt, false, false), s) else s
```

### A mark can be confirmed, refused, unconfirmed, asked while another is in flight, or made on opening

```quint
pure def sometimesAMarkIsConfirmed(s: Marking): bool = s.told == Marked and s.unread

pure def sometimesAMarkIsRefused(s: Marking): bool = s.told == NotMarked

pure def sometimesAMarkIsUnconfirmed(s: Marking): bool = s.told == Unconfirmed and s.doubtful.size() > 0

pure def sometimesTheOwnerIsToldToWait(s: Marking): bool = s.told == Busy

pure def sometimesAMessageWasMarkedOnOpening(s: Marking): bool = s.opened.size() > 0 and s.told == Quiet and A::ended(s.attempt)
```
