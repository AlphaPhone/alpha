# Reset

Erase all data: everything Alpha keeps on the phone, and its hold on the
owner's account. The phone decides, not Alpha: Android's native `ElizaReset`
plugin shows its own disclosure, checks the device credential, records the
approved reset, stops account users, revokes cloud keys, and erases. When
the owner confirms, the phone erases and stops Alpha; the page receives an
answer only when nothing was reset (`NativeCancelled`, `NativeUnavailable`,
or `ShellUnavailable`). The row sits at the foot of General, on the phone
only ([Settings](./index.md)).

## Story: Erase all data

> As the owner, I want to erase everything Alpha holds, only after the
> phone has confirmed it is me, and never to be told it is gone when it is
> not.

### A reset holds the phone's review in flight and what Alpha said when nothing was reset

A state an earlier build kept while it also held a recording, tries,
revocations and a clearing is read with only its review and what was said,
and a word it said that Alpha no longer says reads as Quiet, as a fresh
machine starts.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Answer = NativeCancelled | NativeUnavailable | ShellUnavailable
type Said = Quiet | EraseUnavailable

type Reset = { review: T::Timed, said: Said }

type Effect = ReviewReset({ review: int })
type Erasing = { state: Reset, out: List[Effect] }

pure val initial: Reset = { review: T::unasked, said: Quiet }

pure val reviewLimit = 60000
pure val atValues = Set(0, 4000, 20000)
pure val nowValues = Set(0, 4000, 20000, 80000)
```

### Erase all data, on the phone, asks the phone to show its disclosure and check the device credential, one review at a time

```quint
pure def canErase(s: Reset, at: int, onPhone: bool): bool =
  onPhone and not(T::busy(s.review))

pure def erase(s: Reset, at: int, onPhone: bool): Erasing =
  val asking = T::ask(s.review, at, reviewLimit)
  { state: { ...s, review: asking, said: Quiet }, out: List(ReviewReset({ review: asking.read.ticket })) }
```

### Only the phone's answer to the latest review counts; a cancelled review needs no word, and an unavailable reset is told as unavailable

```quint
pure val reviewValues = Set(1, 2)

pure def canReviewed(s: Reset, review: int, reply: Answer): bool = T::canAnswer(s.review, review)

pure def reviewed(s: Reset, review: int, reply: Answer): Reset =
  { ...s, review: T::answer(s.review, false), said: if (reply == NativeCancelled) Quiet else EraseUnavailable }
```

### A review not answered within a minute is given up, and Alpha says reset is not available right now

```quint
pure def canGiveUpOnReview(s: Reset, now: int): bool = T::canGiveUp(s.review, now)

pure def giveUpOnReview(s: Reset, now: int): Reset =
  { ...s, review: T::answer(s.review, false), said: EraseUnavailable }
```

### Every review ends

```quint
pure def leadsToAReviewEnds(s: Reset, later: Reset): bool = T::busy(s.review) implies not(T::busy(later.review))

pure val fair_giveUpOnReview = "weak"
```

### Alpha starting again retires any review left in flight

```quint
pure def launch(s: Reset): Reset = { ...s, review: T::retire(s.review), said: Quiet }
```

### The owner can cancel the review

```quint
pure def sometimesDeclined(s: Reset): bool = s.review.read.status == R::Failed and s.said == Quiet
```

### The phone can be unable to reset

```quint
pure def sometimesResetUnavailable(s: Reset): bool = s.said == EraseUnavailable
```
