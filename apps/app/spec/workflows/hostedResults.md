# Hosted result notices

A digest result kept on the phone posts one notice, redacted on the lock screen, that opens the
retained result when tapped, or asks Alpha about it. Android posts and keeps the notices
(`AlphaHostedResults`: `publishResult`, `pendingResult`, `consumeResult`, `releaseResultQuestion`,
`withdrawResult`, `setResultsShowing`); the browser build keeps the same ledger in its own store,
only with test mocks. Background delivery is configured on Android only, one attempt at a time
(legacy `NativeHostedResultNotices`, `BrowserHostedResultNotice`, `HostedBackgroundAdmission`,
`HostedNoticeQuestion`; PRD P-75).

## Domain

### Results hold the owner, a notice per retained run, the one captured tap, the question about it, and background delivery

```quint
type ResultPhase = ResultPosted | ResultDenied | ResultOpened | ResultSuperseded | ResultWithdrawn | ResultDismissed
type ResultNotice = { key: str, owner: str, workflowId: str, digest: int, phase: ResultPhase, posts: int, dispatches: int }
type Question = NoQuestion | QuestionReview | QuestionRecheck | QuestionConsume | QuestionDone
type Background = BackgroundIdle | Beginning | Configuring | BackgroundOn | BackgroundOff
type HostedResults = {
  owner: str, enabled: bool, android: bool, showing: bool, notices: List[ResultNotice],
  pending: str, token: int, issued: int, asks: bool, question: Question, consumed: bool, composed: bool, discarded: bool,
  background: Background, retired: bool, configs: int, begins: int
}
pure val initial: HostedResults = {
  owner: "", enabled: true, android: true, showing: false, notices: List(),
  pending: "", token: 0, issued: 0, asks: false, question: NoQuestion, consumed: false, composed: false, discarded: false,
  background: BackgroundIdle, retired: false, configs: 0, begins: 0
}
pure val noNotice: ResultNotice = { key: "", owner: "", workflowId: "", digest: 0, phase: ResultWithdrawn, posts: 0, dispatches: 0 }
pure def noticeOf(h: HostedResults, key: str): ResultNotice = h.notices.select(n => n.key == key).nthOr(0, noNotice)
```

### What the simulator tries

```quint
pure val ownerValues = Set("ann", "ben")
pure val keyValues = Set("k1", "k2", "k3")
pure val workflowIdValues = Set("w1", "w2")
pure val digestValues = Set(1, 2)
pure val tokenValues = Set(1, 2)
```

## Story: Be told when my digest is ready, and open exactly that result

> As the owner, I get one notice for each result my agent kept on my phone, a newer result of the same
> digest replaces the older notice, and tapping it opens that result for my account only.

### Publishing a retained result posts it once; a newer one of the same digest supersedes the older notice

A result already published with the same bytes answers its phase again and posts nothing; a notice
the owner has a tap pending for is never superseded. With notifications off it is recorded as denied.

```quint
pure def canPublish(h: HostedResults, key: str, owner: str, workflowId: str, digest: int): bool =
  h.owner != "" and owner == h.owner and key != "" and workflowId != "" and digest >= 1 and
  (noticeOf(h, key).key == "" or noticeOf(h, key).digest != digest)
pure def publish(h: HostedResults, key: str, owner: str, workflowId: str, digest: int): HostedResults = {
  val prior = noticeOf(h, key)
  val phase = if (h.enabled) ResultPosted else ResultDenied
  val kept = h.notices.select(n => n.key != key).listMap(n =>
    if (n.phase == ResultPosted and n.owner == owner and n.workflowId == workflowId and n.key != h.pending) { ...n, phase: ResultSuperseded } else n)
  { ...h, notices: kept.append({ key: key, owner: owner, workflowId: workflowId, digest: digest, phase: phase,
      posts: prior.posts + (if (phase == ResultPosted) 1 else 0), dispatches: prior.dispatches + 1 }) }
}
pure def alwaysAPostFollowsItsDispatch(h: HostedResults): bool = h.notices.every(n => n.posts <= n.dispatches and n.key != "")
pure def alwaysOneNoticePerResult(h: HostedResults): bool = h.notices.every(n => h.notices.select(o => o.key == n.key).length() == 1)
pure def alwaysOneLiveNoticePerDigest(h: HostedResults): bool =
  h.notices.every(n => n.phase != ResultPosted or h.notices.select(o => o.phase == ResultPosted and o.workflowId == n.workflowId and o.owner == n.owner and o.key != h.pending).length() <= 1)
pure def sometimesSuperseded(h: HostedResults): bool = h.notices.some(n => n.phase == ResultSuperseded)
```

### Turning notifications off or on changes what is posted next, never a notice already decided

```quint
pure def canSetNotifications(h: HostedResults, on: bool): bool = on != h.enabled
pure def setNotifications(h: HostedResults, on: bool): HostedResults = { ...h, enabled: on }
```

### A tap is captured for a posted notice of the current owner, and consuming it opens exactly that result

The capture is kept until it is consumed, so a tap that arrives before the agent connects opens
nothing and waits (#68688de).

```quint
pure def canCapture(h: HostedResults, key: str, asks: bool): bool =
  noticeOf(h, key).phase == ResultPosted and noticeOf(h, key).owner == h.owner and h.owner != "" and h.issued < 4 and (h.pending != key or h.asks != asks)
pure def capture(h: HostedResults, key: str, asks: bool): HostedResults =
  { ...h, pending: key, token: h.issued + 1, issued: h.issued + 1, asks: asks, question: NoQuestion, discarded: false }
pure def canConsume(h: HostedResults, token: int): bool = h.pending != "" and token == h.token and noticeOf(h, h.pending).owner == h.owner
pure def consume(h: HostedResults, token: int): HostedResults =
  { ...h, notices: h.notices.listMap(n => if (n.key == h.pending) { ...n, phase: ResultOpened } else n), pending: "", token: 0, asks: false, consumed: true }
pure def alwaysAPendingTapHasItsNotice(h: HostedResults): bool =
  if (h.pending == "") h.token == 0 and not(h.asks) else (noticeOf(h, h.pending).key == h.pending and h.token == h.issued and h.token > 0)
pure def stepConsumingOpensOnlyThePendingResult(before: HostedResults, via: str, after: HostedResults): bool =
  via == "consume" implies after.notices.every(n => (n.phase == ResultOpened and noticeOf(before, n.key).phase != ResultOpened) implies n.key == before.pending)
pure def sometimesOpenedFromATap(h: HostedResults): bool = h.consumed and h.notices.some(n => n.phase == ResultOpened)
```

### A result shown in the panel withdraws its notice, and the panel's scope posts silently

```quint
pure def canShownInPanel(h: HostedResults, key: str): bool = noticeOf(h, key).phase == ResultPosted and key != h.pending
pure def shownInPanel(h: HostedResults, key: str): HostedResults = { ...h, notices: h.notices.listMap(n => if (n.key == key) { ...n, phase: ResultOpened } else n) }
pure def canSetShowing(h: HostedResults, on: bool): bool = on != h.showing
pure def setShowing(h: HostedResults, on: bool): HostedResults = { ...h, showing: on }
pure def canDismiss(h: HostedResults, key: str): bool = noticeOf(h, key).phase == ResultPosted and key != h.pending
pure def dismiss(h: HostedResults, key: str): HostedResults = { ...h, notices: h.notices.listMap(n => if (n.key == key) { ...n, phase: ResultDismissed } else n) }
```

### Another owner withdraws every notice that is not theirs, and their pending tap

```quint
pure def canBindOwner(h: HostedResults, owner: str): bool = owner != "" and owner != h.owner
pure def bindOwner(h: HostedResults, owner: str): HostedResults = {
  val foreignTap = h.pending != "" and noticeOf(h, h.pending).owner != owner
  { ...h, owner: owner, notices: h.notices.listMap(n => if (n.owner != owner and n.phase == ResultPosted) { ...n, phase: ResultWithdrawn } else n),
    pending: if (foreignTap) "" else h.pending, token: if (foreignTap) 0 else h.token, asks: if (foreignTap) false else h.asks,
    question: if (foreignTap) QuestionDone else h.question }
}
pure def alwaysALiveNoticeIsTheCurrentOwners(h: HostedResults): bool = h.notices.every(n => n.phase == ResultPosted implies n.owner == h.owner)
pure def alwaysAPendingTapIsTheCurrentOwners(h: HostedResults): bool = h.pending != "" implies noticeOf(h, h.pending).owner == h.owner
```

## Story: Ask Alpha about a result from its notice

> As the owner, I tap Ask on a result notice, review an excerpt, and continue into my conversation
> with a draft; nothing is sent, nothing runs, and cancelling keeps the notice.

### The question is reviewed, rechecked against the exact result, and only then consumed into a draft

A closed review leaves the notice pending; a review interrupted after the consume still consumes
but composes nothing; a recheck that finds another result reports that nothing was added.

```quint
pure def canReviewQuestion(h: HostedResults, sensitive: bool): bool = h.pending != "" and h.asks and h.question == NoQuestion and not(sensitive)
pure def reviewQuestion(h: HostedResults, sensitive: bool): HostedResults = { ...h, question: QuestionReview }
pure def canSubmitQuestion(h: HostedResults, valid: bool): bool = h.question == QuestionReview
pure def submitQuestion(h: HostedResults, valid: bool): HostedResults = if (valid) { ...h, question: QuestionRecheck } else h
pure def canDismissQuestion(h: HostedResults, explicit: bool): bool = h.question == QuestionReview
pure def dismissQuestion(h: HostedResults, explicit: bool): HostedResults = { ...h, question: QuestionDone, discarded: explicit }
pure def canRecheckAnswered(h: HostedResults, exact: bool, canCompose: bool): bool = h.question == QuestionRecheck
pure def recheckAnswered(h: HostedResults, exact: bool, canCompose: bool): HostedResults =
  if (exact and canCompose) { ...h, question: QuestionConsume } else { ...h, question: QuestionDone }
pure def canQuestionConsumed(h: HostedResults, ok: bool, live: bool): bool = h.question == QuestionConsume
pure def questionConsumed(h: HostedResults, ok: bool, live: bool): HostedResults =
  if (ok) { ...h, question: QuestionDone, consumed: true, composed: live,
    notices: h.notices.listMap(n => if (n.key == h.pending) { ...n, phase: ResultOpened } else n), pending: "", token: 0, asks: false }
  else { ...h, question: QuestionDone }
pure def alwaysAComposedDraftWasConsumed(h: HostedResults): bool = h.composed implies h.consumed
pure def alwaysADiscardedQuestionConsumedNothing(h: HostedResults): bool = h.discarded implies h.question != QuestionConsume
pure def sometimesComposed(h: HostedResults): bool = h.composed
```

## Story: Receive my results while Alpha is in the background

> As the owner, I want my phone to keep fetching results in the background for my current account,
> and to stop when I pause it or change accounts.

### Background delivery is configured only on Android, by one attempt that a pause retires

A cancelled reservation is retired before any configuration is admitted.

```quint
pure def canStartBackground(h: HostedResults): bool = h.owner != "" and (h.background == BackgroundIdle or h.background == BackgroundOff) and h.begins < 3
pure def startBackground(h: HostedResults): HostedResults =
  if (not(h.android)) { ...h, background: BackgroundOff } else { ...h, background: Beginning, retired: false, begins: h.begins + 1 }
pure def canBegun(h: HostedResults, ok: bool): bool = h.background == Beginning
pure def begun(h: HostedResults, ok: bool): HostedResults = if (ok and not(h.retired)) { ...h, background: Configuring } else { ...h, background: BackgroundOff }
pure def canConfigured(h: HostedResults, ok: bool): bool = h.background == Configuring
pure def configured(h: HostedResults, ok: bool): HostedResults =
  if (ok and not(h.retired)) { ...h, background: BackgroundOn, configs: h.configs + 1 } else { ...h, background: BackgroundOff }
pure def canPauseBackground(h: HostedResults): bool = h.background != BackgroundIdle
pure def pauseBackground(h: HostedResults): HostedResults =
  { ...h, retired: h.background == Beginning or h.background == Configuring, background: if (h.background == BackgroundOn) BackgroundOff else h.background }
pure def alwaysNoBackgroundOffAndroid(h: HostedResults): bool = not(h.android) implies (h.configs == 0 and h.begins == 0)
pure def alwaysConfiguredOnlyUnretired(h: HostedResults): bool = h.background == BackgroundOn implies not(h.retired)
pure def sometimesBackgroundOn(h: HostedResults): bool = h.background == BackgroundOn
```

### A tap that cannot open says why only once the account is known

Before the digest binding exists the agent is still connecting, so the tap waits silently; a tap
for another account asks to sign in to it; anything else is unavailable.

```quint
type TapNotice = TapWaits | SignInToMatching | ResultUnavailable
pure def tapNotice(bound: bool, otherAccount: bool): TapNotice = if (not(bound)) TapWaits else if (otherAccount) SignInToMatching else ResultUnavailable
pure def lawAnUnboundTapSaysNothing(otherAccount: bool): bool = tapNotice(false, otherAccount) == TapWaits
```
