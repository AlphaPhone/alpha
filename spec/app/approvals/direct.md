# Direct

What the agent may do without a card while it answers one message: only
what is on the allow-list, at most four times, one at a time, and nothing
once the owner asked to review first, the screen is protected, or one of
them failed. Everything else becomes a [proposal](./index.md).

## Story: Let Alpha show me things without asking each time

> As the owner, I want Alpha to open what I asked for straight away, and
> to stop and ask as soon as it would do more than show me something.

### A message's pass counts what it ran directly, and holds the one running

Each run is a [read](../../kit/read.md): it has a ticket, and only the
newest ticket's answer counts.

```quint
import operation.* from "./operation"
import read as R from "../../kit/read"

type Preference = Direct | ReviewFirst | Unreadable
type Effect = Run({ ticket: int, operation: Operation })
type Pass = { message: int, started: int, open: bool, running: R::Read, wanted: Preference, sensitive: bool }
type Stepped = { state: Pass, out: List[Effect] }

pure val initial: Pass = { message: 0, started: 0, open: false, running: R::unread, wanted: Direct, sensitive: false }
pure val maxDirect = 4
```

### What the simulator tries

```quint
pure val messageValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val sValues =
  Set(initial)
    .union(Set({ ...initial, message: 1, open: true }))
    .union(Set({ ...initial, message: 1, open: true, wanted: Unreadable }))
    .union(Set({ ...initial, message: 1, open: true, sensitive: true }))
    .union(Set({ ...initial, message: 1, open: true, started: 4 }))
    .union(Set({ ...initial, message: 1, open: false, started: 1 }))
```

### Each message from the owner starts a new pass, once nothing is still running

```quint
pure def busy(s: Pass): bool = s.running.status == R::Loading

pure def canHear(s: Pass, message: int, by: Actor): bool = by == Owner and message > s.message and not(busy(s))

pure def hear(s: Pass, message: int, by: Actor): Pass = { ...s, message: message, started: 0, open: true }
```

### The owner chooses whether to review phone actions first, and a choice that cannot be read counts as review first

The agent cannot change the choice. The phone reports only that it could
not read it.

```quint
pure def canPrefer(s: Pass, wanted: Preference, by: Actor): bool =
  if (wanted == Unreadable) by == Phone else by == Owner

pure def prefer(s: Pass, wanted: Preference, by: Actor): Pass = { ...s, wanted: wanted }
```

### The phone says when its screen is protected

```quint
pure def canScreen(s: Pass, by: Actor): bool = by == Phone

pure def screen(s: Pass, sensitive: bool, by: Actor): Pass = { ...s, sensitive: sensitive }
```

### The agent runs directly only what is on the allow-list, one at a time, at most four times a message

Not a step of a workflow, not when the owner asked to review first, not on
a protected screen, and not after a run of this message failed.

```quint
pure def canStart(s: Pass, operation: Operation, automated: bool, by: Actor): bool =
  by == Agent and allowListed(operation) and not(automated) and s.wanted == Direct and not(s.sensitive)
    and s.open and s.started < maxDirect and not(busy(s))

pure def start(s: Pass, operation: Operation, automated: bool, by: Actor): Stepped =
  val running = R::ask(s.running)
  { state: { ...s, started: s.started + 1, running: running }, out: List(Run({ ticket: running.ticket, operation: operation })) }
```

### A run that fails ends the pass: the rest of the message waits for review

```quint
pure def canFinish(s: Pass, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.running, ticket)

pure def finish(s: Pass, ticket: int, ok: bool, by: Actor): Pass =
  { ...s, running: R::answer(s.running, ok), open: s.open and ok }
```

### A message never runs more than four operations directly

```quint
pure def alwaysAtMostFourDirectRunsAMessage(s: Pass): bool = 0 <= s.started and s.started <= maxDirect
```

### Whatever runs directly is on the allow-list, counted, and admitted by the owner's choice on an unprotected screen

```quint
pure def stepOnlyTheAllowListRunsDirectly(before: Pass, via: str, after: Pass, out: List[Effect]): bool =
  (out.length() > 0 implies
      (via == "start" and before.wanted == Direct and not(before.sensitive) and before.open and not(busy(before))
        and after.started == before.started + 1))
    and out.every(e => match e { | Run(r) => allowListed(r.operation) and r.ticket == after.running.ticket })
    and out.length() <= 1
```

### The count of direct runs starts again only with a new message

```quint
pure def stepTheCountRestartsOnlyWithAMessage(before: Pass, via: str, after: Pass): bool =
  (after.started < before.started implies via == "hear")
    and (after.started > before.started implies via == "start")
```

### A pass that ended opens again only with a new message

```quint
pure def stepAnEndedPassStaysEnded(before: Pass, via: str, after: Pass): bool =
  ((after.open and not(before.open)) implies via == "hear")
    and ((via == "finish" and after.running.status == R::Failed) implies not(after.open))
```

### A change, a read of the owner's things, an emergency call and a workflow step never run directly

```quint
pure def lawWhatNeedsReviewNeverRunsDirectly(s: Pass, operation: Operation, automated: bool, who: Actor): bool =
  (not(allowListed(operation)) or automated or who != Agent) implies not(canStart(s, operation, automated, who))
```

### Review first, an unreadable choice, a protected screen and a fifth run each stop the pass

```quint
pure def lawTheOwnersChoiceAndTheScreenBlock(s: Pass, operation: Operation, who: Actor): bool =
  (s.wanted != Direct or s.sensitive or s.started >= maxDirect or not(s.open)) implies not(canStart(s, operation, false, who))
```

### A direct run comes to an end

If the phone answers, a run does not stay running.

```quint
pure def leadsToARunEnds(s: Pass, later: Pass): bool = busy(s) implies not(busy(later))

pure val fair_finish = "weak"
```

### A message can use all four runs, and a pass can end early

```quint
pure def sometimesFourRan(s: Pass): bool = s.started == maxDirect and not(busy(s)) and s.open

pure def sometimesEndedByAFailure(s: Pass): bool = s.message > 0 and not(s.open) and s.started > 0

pure def sometimesWaitingForReview(s: Pass): bool = s.open and s.wanted == ReviewFirst
```
