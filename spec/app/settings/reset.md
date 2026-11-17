# Reset

Erase all data: everything Alpha keeps on the phone, and its hold on the
owner's account. The phone decides, not Alpha: it shows its own
disclosure, asks for the device credential, records the approved reset,
stops everything that was using the account, and erases. Alpha starts it,
says how it went, and never says data was erased that the phone did not
confirm. The row sits at the foot of General ([Settings](./index.md)).

## Story: Erase all data

> As the owner, I want to erase everything Alpha holds, only after the
> phone has confirmed it is me, and never to be told it is gone when it is
> not.

### A reset remembers the phone's review, whether the owner approved it, and the try under way

Each try is recorded before anything is stopped or erased, under its own
number. Alpha tries again by itself after a failed try, at most three
times.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"

type Answer = Approved | Declined | NotYou | NoReset
type Said = Quiet | NotConfirmedItsYou | EraseUnavailable | NotErased | CouldNotTell | Erased

type Reset = { review: R::Read, pending: bool, tries: int, made: int, clear: A::Attempt, said: Said }

type Effect = ReviewReset({ review: int }) | StopAccountUsers({ stopping: int }) | ClearData({ clearing: int })
type Erasing = { state: Reset, out: List[Effect] }

pure val initial: Reset = { review: R::unread, pending: false, tries: 0, made: 0, clear: A::plan(0), said: Quiet }

pure val automaticTries = 3

pure def ended(s: Reset): bool = s.clear.outcome == A::Confirmed

pure def underWay(s: Reset): bool = s.clear.outcome == A::Recorded or s.clear.outcome == A::Sent
```

### Erase all data asks the phone to show its disclosure and check the device credential, once at a time

```quint
pure def canErase(s: Reset): bool = not(s.pending) and s.review.status != R::Loading

pure def erase(s: Reset): Erasing =
  val asking = R::ask(s.review)
  { state: { ...s, review: asking, said: Quiet }, out: List(ReviewReset({ review: asking.ticket })) }
```

### Only the phone's answer to the latest review counts; an approval records the reset and starts the first try

A declined review needs no word. When the credential was not confirmed,
or the phone cannot reset, Alpha says so in its own words.

```quint
pure val reviewValues = Set(1, 2)

pure def startTry(said: Said, s: Reset): Erasing =
  val number = s.made + 1
  {
    state: { ...s, said: said, made: number, tries: if (s.tries < automaticTries) s.tries + 1 else automaticTries, clear: A::record(A::plan(number)) },
    out: List(StopAccountUsers({ stopping: number })),
  }

pure def canReviewed(s: Reset, review: int, reply: Answer): bool = R::canAnswer(s.review, review)

pure def reviewed(s: Reset, review: int, reply: Answer): Erasing =
  if (reply == Approved) startTry(Quiet, { ...s, review: R::answer(s.review, true), pending: true })
  else {
    state: { ...s, review: R::answer(s.review, false), said: if (reply == NotYou) NotConfirmedItsYou else if (reply == NoReset) EraseUnavailable else Quiet },
    out: List(),
  }
```

### A try first stops everything that was using the account; the phone erases only once that has stopped

What uses the account is the agent, the listener and every sync. If any of
it did not stop, the try fails and nothing is erased.

```quint
pure val stoppingValues = Set(1, 2)

pure def canUsersStopped(s: Reset, stopping: int, stopped: bool): bool =
  s.clear.outcome == A::Recorded and stopping == s.clear.id

pure def usersStopped(s: Reset, stopping: int, stopped: bool): Erasing =
  if (stopped) { state: { ...s, clear: A::dispatch(s.clear) }, out: List(ClearData({ clearing: s.clear.id })) }
  else { state: { ...s, clear: A::conclude(s.clear, false, true), said: NotErased }, out: List() }
```

### The phone confirms the erase, refuses it, or cannot say; only a confirmed erase ends Alpha

```quint
pure val clearingValues = Set(1, 2)

pure def canCleared(s: Reset, clearing: int, confirmed: bool, known: bool): bool = A::canConclude(s.clear, clearing)

pure def cleared(s: Reset, clearing: int, confirmed: bool, known: bool): Reset =
  val ending = A::conclude(s.clear, confirmed, known)
  {
    ...s, clear: ending,
    said: if (ending.outcome == A::Confirmed) Erased else if (ending.outcome == A::Refused) NotErased else CouldNotTell,
  }
```

### Alpha stopping in the middle of a try leaves it unknown, and the reset still pending

```quint
pure def canInterrupted(s: Reset): bool = not(ended(s))

pure def interrupted(s: Reset): Reset =
  {
    ...s,
    review: if (s.review.status == R::Loading) R::answer(s.review, false) else s.review,
    clear: if (underWay(s)) A::conclude(s.clear, false, false) else s.clear,
    said: if (underWay(s)) CouldNotTell else s.said,
  }
```

### A pending reset is tried again by Alpha at most three times, and then only by the owner's Try again

```quint
pure def canRetryOnLaunch(s: Reset): bool =
  s.pending and not(underWay(s)) and not(ended(s)) and s.tries < automaticTries

pure def retryOnLaunch(s: Reset): Erasing = startTry(s.said, s)

pure def canTryAgain(s: Reset): bool = s.pending and not(underWay(s)) and not(ended(s))

pure def tryAgain(s: Reset): Erasing = startTry(Quiet, s)

pure def stepAlphaRetriesByItselfAtMostThreeTimes(before: Reset, via: str, after: Reset): bool =
  via == "retryOnLaunch" implies before.tries < automaticTries

pure def alwaysTriesAreCounted(s: Reset): bool =
  0 <= s.tries and s.tries <= automaticTries and s.tries <= s.made and s.clear.id == s.made
```

### While a reset is pending, Alpha does not start as usual

The startup area asks this before starting the agent.

```quint
pure def holdsStartup(s: Reset): bool = s.pending and not(ended(s))
```

### Nothing is stopped or erased unless the owner approved the reset on the phone

```quint
pure def alwaysNoTryWithoutApproval(s: Reset): bool =
  (s.made > 0 implies s.pending) and (s.clear.outcome != A::Planned implies s.made > 0)
```

### Once a reset is approved, the phone is not asked to review another

Discovered by the proof: without it, nothing ruled out a review still open
after the reset was approved, whose late answer would start a second
approval over a reset already under way or done.

```quint
pure def alwaysNoReviewOnceApproved(s: Reset): bool = s.review.status == R::Loading implies not(s.pending)
```

### An approved reset stays pending until the phone erases

```quint
pure def stepAPendingResetStaysPending(before: Reset, after: Reset): bool = before.pending implies after.pending
```

### Every try stops what uses the account first, under the try's own number

```quint
pure def isStop(e: Effect): bool = match e { | StopAccountUsers(x) => true | _ => false }

pure def stepEveryTryStopsFirst(before: Reset, via: str, after: Reset, out: List[Effect]): bool =
  if (out.some(e => isStop(e)))
    after.pending and after.clear.outcome == A::Recorded and after.made == before.made + 1 and out.length() == 1
      and out.every(e => match e { | StopAccountUsers(x) => x.stopping == after.clear.id | _ => false })
  else after.made == before.made
```

### The phone is asked to erase only once everything using the account has stopped

```quint
pure def isClear(e: Effect): bool = match e { | ClearData(c) => true | _ => false }

pure def stepEraseOnlyOnceStopped(before: Reset, via: str, after: Reset, out: List[Effect]): bool =
  out.some(e => isClear(e)) implies
    (via == "usersStopped" and before.clear.outcome == A::Recorded and after.clear.outcome == A::Sent and out.length() == 1
      and out.every(e => match e { | ClearData(c) => c.clearing == after.clear.id | _ => false }))
```

### Alpha says data was erased only when the phone confirmed it

```quint
pure def alwaysErasedOnlyWhenConfirmed(s: Reset): bool = s.said == Erased implies s.clear.outcome == A::Confirmed
```

### Once the phone has erased, nothing else happens

```quint
pure def stepAnErasedPhoneIsFinal(before: Reset, after: Reset): bool = ended(before) implies after == before
```

### All data can be erased

```quint
pure def sometimesErased(s: Reset): bool = ended(s) and s.said == Erased
```

### The owner can try again after Alpha's own tries ran out

```quint
pure def sometimesTheOwnerTriesAgain(s: Reset): bool = s.tries == automaticTries and s.made > automaticTries and underWay(s)
```

### The phone can refuse the owner's credential

```quint
pure def sometimesNotConfirmedItsYou(s: Reset): bool = s.said == NotConfirmedItsYou
```

### Alpha can be unable to tell whether data was erased

```quint
pure def sometimesCouldNotTell(s: Reset): bool = s.said == CouldNotTell and s.pending
```
