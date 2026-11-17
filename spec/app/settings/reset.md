# Reset

Erase all data: everything Alpha keeps on the phone, and its hold on the
owner's account. The phone decides, not Alpha: it shows its own
disclosure, asks for the device credential, records the approved reset,
stops everything that was using the account, revokes the keys Alpha saved
for the cloud, and erases. Alpha starts it, says how it went, and never
says data was erased that the phone did not confirm. The row sits at the
foot of General, on the phone only ([Settings](./index.md)). While a reset
is pending, the startup area shows its recovery screen in place of Alpha.

## Story: Erase all data

> As the owner, I want to erase everything Alpha holds, only after the
> phone has confirmed it is me, and never to be told it is gone when it is
> not.

### A reset holds the phone's review, the record of the approved reset, Alpha's own tries and every try's steps, and what Alpha said

The record, Alpha's own tries and the number of tries made are kept on the
phone and outlive Alpha; the rest does not. A try stops what uses the
account, revokes the cloud keys, then asks the phone to erase, recorded as
one attempt under the try's own number.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import timed as T from "./timed"

type Answer = Approved | Declined | NotYou | NoReset | Expired | AlreadyOpen | NoScreenLock | AuthUnavailable
type Said = Quiet | NotConfirmedItsYou | EraseUnavailable | ReviewExpired | ReviewAlreadyOpen | SetAScreenLock | NoDeviceAuth | MayStillGoAhead | NotErased | CouldNotTell | Erased

type Reset = {
  review: T::Timed, recording: R::Read, pending: bool, mayBeRecorded: bool,
  tries: int, made: int, launchTry: bool,
  stopping: T::Timed, revoking: T::Timed, revokedIn: int, clear: A::Attempt, clearDue: int,
  checking: R::Read, said: Said,
}

type Effect =
  ReviewReset({ review: int })
  | RecordReset({ record: int })
  | StopAccountUsers({ stopping: int })
  | RevokeCloudKeys({ revoking: int })
  | ClearData({ clearing: int })
  | CheckErased({ checking: int })
type Erasing = { state: Reset, out: List[Effect] }

pure val initial: Reset = {
  review: T::unasked, recording: R::unread, pending: false, mayBeRecorded: false,
  tries: 0, made: 0, launchTry: false,
  stopping: T::unasked, revoking: T::unasked, revokedIn: 0, clear: A::plan(0), clearDue: 0,
  checking: R::unread, said: Quiet,
}

pure val automaticTries = 3
pure val reviewLimit = 60
pure val stopLimit = 10
pure val revokeLimit = 8
pure val clearLimit = 30
pure val atValues = Set(0, 4, 20)
pure val nowValues = Set(0, 4, 20, 40, 80)

pure def ended(s: Reset): bool = s.clear.outcome == A::Confirmed

pure def underWay(s: Reset): bool = T::busy(s.stopping) or T::busy(s.revoking) or s.clear.outcome == A::Sent

pure def dropRead(r: R::Read): R::Read = if (r.status == R::Loading) R::answer(r, false) else r

pure def dropTimed(t: T::Timed): T::Timed = if (T::busy(t)) T::answer(t, false) else t
```

### Erase all data, on the phone, asks the phone to show its disclosure and check the device credential, one review at a time

It is not offered while a reset is pending, nor after the phone reported it
could not record one, until Alpha starts again.

```quint
pure def canErase(s: Reset, at: int, onPhone: bool): bool =
  onPhone and not(s.pending) and not(s.mayBeRecorded) and not(T::busy(s.review)) and s.recording.status != R::Loading

pure def erase(s: Reset, at: int, onPhone: bool): Erasing =
  val asking = T::ask(s.review, at, reviewLimit)
  { state: { ...s, review: asking, said: Quiet }, out: List(ReviewReset({ review: asking.read.ticket })) }
```

### Only the phone's answer to the latest review counts; an approval is recorded on the phone before anything else

A review the owner declined needs no word. Otherwise Alpha says, in its own
words, that the credential was not confirmed, that the phone cannot reset,
that the review expired or is already open, that a screen lock must first
be set in Android's settings, or that unlocking with it is unavailable.
Nothing was erased in any of these.

```quint
pure val reviewValues = Set(1, 2)

pure def refusal(reply: Answer): Said =
  if (reply == NotYou) NotConfirmedItsYou
  else if (reply == NoReset) EraseUnavailable
  else if (reply == Expired) ReviewExpired
  else if (reply == AlreadyOpen) ReviewAlreadyOpen
  else if (reply == NoScreenLock) SetAScreenLock
  else if (reply == AuthUnavailable) NoDeviceAuth
  else Quiet

pure def canReviewed(s: Reset, review: int, reply: Answer): bool = T::canAnswer(s.review, review)

pure def reviewed(s: Reset, review: int, reply: Answer): Erasing =
  val asking = R::ask(s.recording)
  if (reply == Approved) { state: { ...s, review: T::answer(s.review, true), recording: asking }, out: List(RecordReset({ record: asking.ticket })) }
  else { state: { ...s, review: T::answer(s.review, false), said: refusal(reply) }, out: List() }
```

### A review not answered within a minute is given up, and Alpha says reset is not available right now

```quint
pure def canGiveUpOnReview(s: Reset, now: int): bool = T::canGiveUp(s.review, now)

pure def giveUpOnReview(s: Reset, now: int): Reset = { ...s, review: T::answer(s.review, false), said: EraseUnavailable }
```

### A recorded reset is pending and its first try starts; a record the phone could not write is not pending, and Alpha says the reset the owner confirmed may still go ahead

A write the phone reports failed may still have landed. Alpha asks the
owner to reopen it before trying again, and finds out when it starts.

```quint
pure val recordValues = Set(1, 2)

pure def startTry(said: Said, at: int, s: Reset): Erasing =
  val number = s.made + 1
  {
    state: { ...s, said: said, made: number, clear: A::record(A::plan(number)), stopping: T::ask(s.stopping, at, stopLimit) },
    out: List(StopAccountUsers({ stopping: number })),
  }

pure def canRecorded(s: Reset, record: int, saved: bool, at: int): bool = R::canAnswer(s.recording, record)

pure def recorded(s: Reset, record: int, saved: bool, at: int): Erasing =
  if (saved) startTry(Quiet, at, { ...s, recording: R::answer(s.recording, true), pending: true })
  else { state: { ...s, recording: R::answer(s.recording, false), mayBeRecorded: true, said: MayStillGoAhead }, out: List() }

pure def alwaysAnUnwrittenRecordIsNotPending(s: Reset): bool =
  s.said == MayStillGoAhead implies (not(s.pending) and s.mayBeRecorded)
```

### A try first stops everything that was using the account; if any of it did not stop in ten seconds, the try fails and nothing is erased

What uses the account is the agent, the listener and every sync.

```quint
pure val stoppingValues = Set(1, 2)

pure def canUsersStopped(s: Reset, stopping: int, stopped: bool, at: int): bool = T::canAnswer(s.stopping, stopping)

pure def usersStopped(s: Reset, stopping: int, stopped: bool, at: int): Erasing =
  val asking = T::ask(s.revoking, at, revokeLimit)
  if (stopped) { state: { ...s, stopping: T::answer(s.stopping, true), revoking: asking, revokedIn: s.made }, out: List(RevokeCloudKeys({ revoking: asking.read.ticket })) }
  else { state: { ...s, stopping: T::answer(s.stopping, false), said: NotErased }, out: List() }

pure def canGiveUpOnStopping(s: Reset, now: int): bool = T::canGiveUp(s.stopping, now)

pure def giveUpOnStopping(s: Reset, now: int): Reset = { ...s, stopping: T::answer(s.stopping, false), said: NotErased }
```

### Then each saved cloud key is revoked, at most once per try, as best it can be; the try goes on to erase when the revocation answers or its eight seconds run out

```quint
pure val revokingValues = Set(1, 2)

pure def sendClear(at: int, s: Reset): Erasing =
  val sent = A::dispatch(s.clear)
  { state: { ...s, clear: sent, clearDue: at + clearLimit }, out: List(ClearData({ clearing: sent.id })) }

pure def canKeysRevoked(s: Reset, revoking: int, at: int): bool = T::canAnswer(s.revoking, revoking)

pure def keysRevoked(s: Reset, revoking: int, at: int): Erasing = sendClear(at, { ...s, revoking: T::answer(s.revoking, true) })

pure def canGiveUpOnRevoking(s: Reset, now: int): bool = T::canGiveUp(s.revoking, now)

pure def giveUpOnRevoking(s: Reset, now: int, at: int): Erasing = sendClear(at, { ...s, revoking: T::answer(s.revoking, false) })
```

### The phone confirms the erase, refuses it, or cannot say; an erase not answered in thirty seconds is one Alpha cannot tell about; only a confirmed erase ends Alpha

```quint
pure val clearingValues = Set(1, 2)

pure def told(clear: A::Attempt): Said =
  if (clear.outcome == A::Confirmed) Erased else if (clear.outcome == A::Refused) NotErased else CouldNotTell

pure def canCleared(s: Reset, clearing: int, confirmed: bool, known: bool): bool = A::canConclude(s.clear, clearing)

pure def cleared(s: Reset, clearing: int, confirmed: bool, known: bool): Reset =
  val ending = A::conclude(s.clear, confirmed, known)
  { ...s, clear: ending, said: told(ending) }

pure def canGiveUpOnClearing(s: Reset, now: int): bool = s.clear.outcome == A::Sent and now >= s.clearDue

pure def giveUpOnClearing(s: Reset, now: int): Reset = { ...s, clear: A::conclude(s.clear, false, false), said: CouldNotTell }
```

### Every review, stop, revocation and erase ends

```quint
pure def leadsToAReviewEnds(s: Reset, later: Reset): bool = T::busy(s.review) implies not(T::busy(later.review))

pure def leadsToAStopEnds(s: Reset, later: Reset): bool = T::busy(s.stopping) implies not(T::busy(later.stopping))

pure def leadsToARevocationEnds(s: Reset, later: Reset): bool = T::busy(s.revoking) implies not(T::busy(later.revoking))

pure def leadsToAnEraseEnds(s: Reset, later: Reset): bool = s.clear.outcome == A::Sent implies later.clear.outcome != A::Sent

pure val fair_giveUpOnReview = "weak"
pure val fair_giveUpOnStopping = "weak"
pure val fair_giveUpOnRevoking = "weak"
pure val fair_giveUpOnClearing = "weak"
```

### When Alpha cannot tell whether the phone erased, it asks the phone before any other try

```quint
pure val checkingValues = Set(1, 2)

pure def reconciled(clear: A::Attempt, erased: bool): A::Attempt = { ...clear, outcome: if (erased) A::Confirmed else A::Refused }

pure def canCheckErased(s: Reset): bool = s.pending and s.clear.outcome == A::Unknown and s.checking.status != R::Loading

pure def checkErased(s: Reset): Erasing =
  val asking = R::ask(s.checking)
  { state: { ...s, checking: asking }, out: List(CheckErased({ checking: asking.ticket })) }

pure def canErasedChecked(s: Reset, checking: int, erased: bool, known: bool): bool = R::canAnswer(s.checking, checking)

pure def erasedChecked(s: Reset, checking: int, erased: bool, known: bool): Reset =
  if (known) { ...s, checking: R::answer(s.checking, true), clear: reconciled(s.clear, erased), said: if (erased) Erased else NotErased }
  else { ...s, checking: R::answer(s.checking, false) }
```

### An erase whose outcome is unknown is never tried again

```quint
pure def isStop(e: Effect): bool = match e { | StopAccountUsers(x) => true | _ => false }

pure def stepAnUnknownEraseIsNeverRetried(before: Reset, after: Reset, out: List[Effect]): bool =
  out.some(e => isStop(e)) implies before.clear.outcome != A::Unknown
```

### Alpha starting again keeps the record and the tries; a try it cut short before the erase was sent erased nothing, and one cut short after is one it cannot tell about

The phone says whether it holds a record of an approved reset: always when
one is pending, and possibly when it reported the record could not be
written. Each start lets Alpha try once by itself.

```quint
pure def canLaunch(s: Reset, found: bool): bool =
  not(ended(s)) and (s.pending implies found) and (found implies (s.pending or s.mayBeRecorded or s.recording.status == R::Loading))

pure def launch(s: Reset, found: bool): Reset =
  val sent = s.clear.outcome == A::Sent
  val cutShort = T::busy(s.stopping) or T::busy(s.revoking)
  {
    ...s,
    review: dropTimed(s.review), recording: dropRead(s.recording), checking: dropRead(s.checking),
    pending: s.pending or found, mayBeRecorded: false, launchTry: true,
    stopping: dropTimed(s.stopping), revoking: dropTimed(s.revoking),
    clear: if (sent) A::conclude(s.clear, false, false) else s.clear,
    said: if (sent) CouldNotTell else if (cutShort) NotErased else if (s.said == MayStillGoAhead) Quiet else s.said,
  }
```

### A pending reset is tried again by Alpha by itself at most three times, once per start, and otherwise only by the owner's Try again

The first try, which the owner's approval starts, and each Try again are
the owner's and are not counted.

```quint
pure def mayStartATry(s: Reset): bool =
  s.pending and not(underWay(s)) and not(ended(s)) and s.clear.outcome != A::Unknown and s.checking.status != R::Loading

pure def canRetryOnLaunch(s: Reset, at: int): bool = mayStartATry(s) and s.launchTry and s.tries < automaticTries

pure def retryOnLaunch(s: Reset, at: int): Erasing = startTry(Quiet, at, { ...s, tries: s.tries + 1, launchTry: false })

pure def canTryAgain(s: Reset, at: int): bool = mayStartATry(s)

pure def tryAgain(s: Reset, at: int): Erasing = startTry(Quiet, at, s)

pure def stepOnlyAlphasOwnRetriesAreCounted(before: Reset, via: str, after: Reset): bool =
  after.tries == before.tries + (if (via == "retryOnLaunch") 1 else 0)

pure def stepAlphaTriesOncePerStart(before: Reset, after: Reset): bool =
  after.tries > before.tries implies (before.launchTry and not(after.launchTry))

pure def alwaysTriesAreCounted(s: Reset): bool =
  0 <= s.tries and s.tries <= automaticTries and s.tries <= s.made and s.clear.id == s.made
    and s.stopping.read.ticket == s.made and 0 <= s.revokedIn and s.revokedIn <= s.made
```

### While a reset is pending, Alpha does not start as usual: the startup area shows what Alpha said and offers Try again when a try may start

```quint
pure def holdsStartup(s: Reset): bool = s.pending and not(ended(s))

pure def offersTryAgain(s: Reset): bool = holdsStartup(s) and mayStartATry(s)
```

### Nothing is stopped or erased unless the owner approved the reset on the phone and the phone recorded it

```quint
pure def alwaysNoTryWithoutApproval(s: Reset): bool =
  (s.made > 0 implies s.pending) and (s.clear.outcome != A::Planned implies s.made > 0)

pure def stepNothingStopsBeforeTheResetIsRecorded(before: Reset, via: str, after: Reset, out: List[Effect]): bool =
  out.some(e => isStop(e)) implies (after.pending and (before.pending or (via == "recorded" and before.recording.status == R::Loading)))
```

### Once a reset is approved, the phone is not asked to review another

Discovered by the proof: without it, nothing ruled out a review still open
after the reset was approved, whose late answer would start a second
approval over a reset already under way or done.

```quint
pure def alwaysNoReviewOnceApproved(s: Reset): bool =
  ((T::busy(s.review) or s.recording.status == R::Loading) implies not(s.pending))
    and not(T::busy(s.review) and s.recording.status == R::Loading)
```

### A try is at one step at a time: stopping, revoking or erasing, each only after the one before

```quint
pure def alwaysOneStepAtATime(s: Reset): bool =
  (T::busy(s.stopping) implies (s.clear.outcome == A::Recorded and not(T::busy(s.revoking)) and s.revokedIn < s.made))
    and (T::busy(s.revoking) implies (s.clear.outcome == A::Recorded and s.stopping.read.status == R::Loaded and s.revokedIn == s.made))
    and (s.clear.outcome == A::Sent implies (s.stopping.read.status == R::Loaded and s.revokedIn == s.made and not(T::busy(s.revoking))))
    and (s.checking.status == R::Loading implies s.clear.outcome == A::Unknown)
```

### An approved reset stays pending until the phone erases

```quint
pure def stepAPendingResetStaysPending(before: Reset, after: Reset): bool = before.pending implies after.pending
```

### Every try stops what uses the account first, under the try's own number

```quint
pure def stepEveryTryStopsFirst(before: Reset, after: Reset, out: List[Effect]): bool =
  if (out.some(e => isStop(e)))
    after.clear.outcome == A::Recorded and after.made == before.made + 1 and out.length() == 1
      and out.every(e => match e { | StopAccountUsers(x) => x.stopping == after.clear.id | _ => false })
  else after.made == before.made
```

### The cloud keys are revoked once per try, only after everything using the account stopped

```quint
pure def isRevoke(e: Effect): bool = match e { | RevokeCloudKeys(x) => true | _ => false }

pure def stepKeysAreRevokedOncePerTry(before: Reset, after: Reset, out: List[Effect]): bool =
  out.some(e => isRevoke(e)) implies
    (before.revokedIn < before.made and after.revokedIn == after.made and T::busy(before.stopping)
      and after.stopping.read.status == R::Loaded and out.length() == 1)
```

### The phone is asked to erase only once everything using the account has stopped and the keys were revoked or given up on

```quint
pure def isClear(e: Effect): bool = match e { | ClearData(c) => true | _ => false }

pure def stepEraseOnlyOnceStopped(before: Reset, after: Reset, out: List[Effect]): bool =
  out.some(e => isClear(e)) implies
    (before.clear.outcome == A::Recorded and before.stopping.read.status == R::Loaded and before.revokedIn == before.made
      and T::busy(before.revoking) and after.clear.outcome == A::Sent and out.length() == 1
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
pure def sometimesTheOwnerTriesAgain(s: Reset): bool =
  s.tries == automaticTries and s.made > automaticTries + 1 and T::busy(s.stopping)
```

### The phone can refuse the owner's credential, or ask for a screen lock first

```quint
pure def sometimesNotConfirmedItsYou(s: Reset): bool = s.said == NotConfirmedItsYou

pure def sometimesSetAScreenLock(s: Reset): bool = s.said == SetAScreenLock
```

### The owner can decline the review

```quint
pure def sometimesDeclined(s: Reset): bool = s.review.read.status == R::Failed and s.said == Quiet and not(s.pending)
```

### The phone can be unable to reset

```quint
pure def sometimesResetUnavailable(s: Reset): bool = s.said == EraseUnavailable
```

### The phone can fail to record the reset, and the record can turn up when Alpha starts again

```quint
pure def sometimesMayStillGoAhead(s: Reset): bool = s.said == MayStillGoAhead

pure def sometimesFoundOnStart(s: Reset): bool = s.pending and s.made == 0 and s.launchTry
```

### A try can fail because something using the account did not stop

```quint
pure def sometimesStopFailed(s: Reset): bool = s.said == NotErased and s.stopping.read.status == R::Failed
```

### The erase can be sent after the revocation ran out of time

```quint
pure def sometimesRevocationGivenUp(s: Reset): bool = s.revoking.read.status == R::Failed and s.clear.outcome == A::Sent
```

### Alpha can be unable to tell whether data was erased, and then learn it was not

```quint
pure def sometimesCouldNotTell(s: Reset): bool = s.said == CouldNotTell and s.pending

pure def sometimesCheckedNotErased(s: Reset): bool = s.checking.status == R::Loaded and s.clear.outcome == A::Refused
```
