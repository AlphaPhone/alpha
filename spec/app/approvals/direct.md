# Direct

What the agent may run without a card while it answers one message: only
what is on the allow-list, at most four times, one web page at most and
only at an address the owner typed, and nothing once the owner asked to
review first, the screen is protected, or a run of the message failed.
Each run is a [proposal](./proposal.md) the agent requests directly, so it
is written to the journal before it is sent, claimed, sent once, and picked
up after a restart like any other; everything else becomes a card.

The owner's choice to review phone actions first is a setting, and
whether the screen is protected comes from the shell: both arrive as event
parameters.

## Story: Let Alpha show me things without asking each time

> As the owner, I want Alpha to open what I asked for straight away, and
> to stop and ask as soon as it would do more than show me something.

### A message's pass counts what it ran directly, whether it opened a web page, and whether it is still open

```quint
import operation.* from "./operation"

type Pass = { message: int, started: int, open: bool, paged: bool }

pure val initial: Pass = { message: 0, started: 0, open: false, paged: false }
pure val maxDirect = 4

pure val messageValues = Set(1, 2)
pure val sValues =
  Set(initial)
    .union(Set({ ...initial, message: 1, open: true }))
    .union(Set({ ...initial, message: 1, open: true, paged: true, started: 1 }))
    .union(Set({ ...initial, message: 1, open: true, started: 4 }))
    .union(Set({ ...initial, message: 1, open: false, started: 1 }))
```

### Each message from the owner starts a new pass

```quint
pure def canHear(s: Pass, message: int, by: Actor): bool = by == Owner and message > s.message

pure def hear(s: Pass, message: int, by: Actor): Pass = { message: message, started: 0, open: true, paged: false }
```

### The agent runs directly only what is on the allow-list, for the message being answered, at most four times, by the owner's choice and on a screen that is not protected

Not a step of a workflow, and not after a run of this message failed. A
choice that cannot be read counts as review first.

```quint
pure def canAdmit(s: Pass, operation: Operation, message: int, typed: bool, automated: bool, wanted: Preference, protectedScreen: bool, by: Actor): bool =
  by == Agent and allowListed(operation, typed) and not(automated) and wanted == Direct and not(protectedScreen)
    and s.open and message == s.message and s.started < maxDirect and not(operation == OpenPage and s.paged)

pure def admit(s: Pass, operation: Operation, message: int, typed: bool, automated: bool, wanted: Preference, protectedScreen: bool, by: Actor): Pass =
  { ...s, started: s.started + 1, paged: s.paged or operation == OpenPage }
```

### A run of this message that fails ends the pass: the rest of the message waits for review

```quint
pure def canStop(s: Pass, message: int, by: Actor): bool = by == Phone and s.open and message == s.message

pure def stop(s: Pass, message: int, by: Actor): Pass = { ...s, open: false }
```

### A message never runs more than four operations directly, and a web page it opened was one of them

```quint
pure def alwaysAtMostFourDirectRunsAMessage(s: Pass): bool =
  0 <= s.started and s.started <= maxDirect and (s.paged implies s.started > 0)
```

### The count of direct runs starts again only with a new message

```quint
pure def stepTheCountRestartsOnlyWithAMessage(before: Pass, via: str, after: Pass): bool =
  (after.started < before.started implies via == "hear")
    and (after.started > before.started implies (via == "admit" and after.started == before.started + 1 and after.message == before.message))
```

### A pass that ended opens again only with a new message

```quint
pure def stepAnEndedPassStaysEnded(before: Pass, via: str, after: Pass): bool =
  ((after.open and not(before.open)) implies (via == "hear" and after.message > before.message))
    and (via == "stop" implies not(after.open))
```

### A web page is opened without review at most once a message

```quint
pure def stepOneWebPageAMessage(before: Pass, via: str, after: Pass): bool =
  (after.paged and not(before.paged)) implies (via == "admit" and after.started == before.started + 1)

pure def lawASecondWebPageNeedsReview(s: Pass, message: int, wanted: Preference, who: Actor): bool =
  s.paged implies not(canAdmit(s, OpenPage, message, true, false, wanted, false, who))
```

### A change, a read of the owner's things, a note or photo, an emergency call, a page the owner did not type, and a workflow step never run directly

```quint
pure def lawWhatNeedsReviewNeverRunsDirectly(s: Pass, operation: Operation, message: int, typed: bool, automated: bool, who: Actor): bool =
  (not(allowListed(operation, typed)) or automated or who != Agent) implies
    not(canAdmit(s, operation, message, typed, automated, Direct, false, who))
```

### Review first, an unreadable choice, a protected screen, a fifth run and a request for another message each refuse a direct run

```quint
pure def lawTheOwnersChoiceAndTheScreenBlock(s: Pass, operation: Operation, message: int, wanted: Preference, protectedScreen: bool, who: Actor): bool =
  (wanted != Direct or protectedScreen or s.started >= maxDirect or not(s.open) or message != s.message)
    implies not(canAdmit(s, operation, message, true, false, wanted, protectedScreen, who))
```

### A message can use all four runs, open a web page, and end early

```quint
pure def sometimesFourRan(s: Pass): bool = s.started == maxDirect and s.open

pure def sometimesAPageOpened(s: Pass): bool = s.paged and s.open

pure def sometimesEndedByAFailure(s: Pass): bool = s.message > 0 and not(s.open) and s.started > 0
```
