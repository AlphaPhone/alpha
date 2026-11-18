# Digests

Scheduled briefs the agent writes: a morning summary of the calendar and
mail, a weekly review. The agent keeps the schedules and runs them; Alpha
never runs a digest itself. It shows the schedules and their results, keeps
every result it receives on the phone before telling the agent it has it,
tells the owner about a new one with a notice, and keeps the newest that
ran for Home.

- [Sources](./sources.md): the owner's consent for each source a digest reads, its expiry and its renewal

Which sources a digest may read is a fact of [Sources](./sources.md). The
Run now of a missed digest is a [Request](../workflows/request.md).

## Story: See my digests

> As the owner, I want to see each schedule the agent keeps, the results it
> sent with what ran, and to switch background checks and notifications on
> or off.

### Digests holds the schedules as last read, the results kept on the phone, the inbox's progress, the result notice, the two switches and one Run now

Results arrive in order, each with a number one higher than the last. The
phone keeps them up to a number, and has told the agent it has them up to
another. A result is a digest that ran, or an occurrence that did not (one
missed or skipped); the brief for Home is the newest kept that ran. One
notice tells of the newest result announced; a newer one replaces it.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "../workflows/request"

type Stage = Idle | Fetching | Keeping | Acking
type Effect =
  | ReadSchedules({ ticket: int })
  | FetchResults({ ticket: int, after: int })
  | KeepResults({ upTo: int, count: int })
  | AckResults({ upTo: int })
  | PostResult({ upTo: int, quiet: bool })
  | WithdrawResult({ upTo: int })
  | RunDigest({ id: int, occurrence: int })
  | SetBackground({ on: bool })
  | SetNotices({ on: bool })
  | AskAlpha({ result: int })
type Digests = {
  open: bool, schedules: R::Read, count: int, missed: int, asked: int,
  stage: Stage, inbox: R::Read, page: int, pageEnd: int, pageRan: int,
  kept: int, results: int, acked: int, posted: int, brief: int, notice: bool,
  background: bool, notices: bool,
  review: V::Review, runNow: Q::Request, occurrence: int,
}
type Moved = { state: Digests, out: List[Effect] }

pure val initial: Digests = {
  open: false, schedules: R::unread, count: 0, missed: 0, asked: 0,
  stage: Idle, inbox: R::unread, page: 0, pageEnd: 0, pageRan: 0,
  kept: 0, results: 0, acked: 0, posted: 0, brief: 0, notice: false,
  background: true, notices: true,
  review: V::unreviewed, runNow: Q::unasked, occurrence: 0,
}

pure val ticketValues = Set(1, 2, 3)
pure val roundValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val idValues = Set(1, 2)
pure val countValues = Set(-1, 0, 1, 2)
pure val upToValues = Set(0, 1, 2, 3, 4)
pure val missedValues = Set(0, 1, 2)
pure val resultValues = Set(0, 1, 3)
pure val ranValues = Set(0, 1, 2, 3)
```

### The panel opens and closes, and opening it reads the schedules and withdraws the result notice, whose result it shows

```quint
pure def withdrawNotice(d: Digests): List[Effect] = if (d.notice) List(WithdrawResult({ upTo: d.posted })) else List()

pure def canOpenPanel(d: Digests): bool = not(d.open)

pure def openPanel(d: Digests): Moved =
  val asked = R::ask(d.schedules)
  { state: { ...d, open: true, schedules: asked, notice: false },
    out: List(ReadSchedules({ ticket: asked.ticket })).concat(withdrawNotice(d)) }

pure def canClosePanel(d: Digests): bool = d.open

pure def closePanel(d: Digests): Digests = { ...d, open: false, review: V::dismiss(d.review) }

pure def canRefresh(d: Digests): bool = d.open and d.schedules.status != R::Loading

pure def refresh(d: Digests): Moved =
  val asked = R::ask(d.schedules)
  { state: { ...d, schedules: asked }, out: List(ReadSchedules({ ticket: asked.ticket })) }
```

### Only the newest reading of the schedules is taken, with the latest missed occurrence, if any

```quint
pure def canSchedulesRead(d: Digests, ticket: int, count: int, missed: int): bool =
  R::canAnswer(d.schedules, ticket) and count >= 0 and missed >= 0 and missed >= d.missed

pure def schedulesRead(d: Digests, ticket: int, ok: bool, count: int, missed: int): Digests =
  if (ok) { ...d, schedules: R::answer(d.schedules, true), count: count, missed: missed }
  else { ...d, schedules: R::answer(d.schedules, false) }
```

### Background checks and notifications are switched by the owner, and the agent is told

Turning notifications off withdraws the result notice.

```quint
pure def canSetBackground(d: Digests, on: bool): bool = d.open and on != d.background

pure def setBackground(d: Digests, on: bool): Moved = { state: { ...d, background: on }, out: List(SetBackground({ on: on })) }

pure def canSetNotices(d: Digests, on: bool): bool = d.open and on != d.notices

pure def setNotices(d: Digests, on: bool): Moved =
  { state: { ...d, notices: on, notice: d.notice and on },
    out: List(SetNotices({ on: on })).concat(if (on) List() else withdrawNotice(d)) }
```

### The schedules can be empty or fail to be read

```quint
pure def sometimesThereAreNoSchedules(d: Digests): bool = d.schedules.status == R::Loaded and d.count == 0

pure def sometimesTheSchedulesFailed(d: Digests): bool = d.schedules.status == R::Failed
```

## Story: Receive results without losing or repeating one

> As the owner, I want every result the agent sends kept on my phone, never
> lost because the phone told the agent too early, and never announced to
> me twice.

### Results are fetched one page at a time, from after the last one kept, while the panel is open or background checks are on

```quint
pure def canPull(d: Digests): bool = d.stage == Idle and (d.open or d.background)

pure def pull(d: Digests): Moved =
  val asked = R::ask(d.inbox)
  { state: { ...d, stage: Fetching, inbox: asked }, out: List(FetchResults({ ticket: asked.ticket, after: d.kept })) }
```

### A page of new results is kept on the phone before anything else happens, and a page already kept is acknowledged again

A page names the newest of its results that ran, if any.

```quint
pure def canFetched(d: Digests, round: int, count: int, upTo: int, ran: int): bool =
  d.stage == Fetching and R::canAnswer(d.inbox, round) and count >= 0 and upTo >= 0
    and (upTo > d.kept implies (count >= 1 and count <= upTo - d.kept and (ran == 0 or (d.kept < ran and ran <= upTo))))

pure def fetched(d: Digests, round: int, ok: bool, count: int, upTo: int, ran: int): Moved =
  val answered = { ...d, inbox: R::answer(d.inbox, ok) }
  if (not(ok) or count == 0) { state: { ...answered, stage: Idle }, out: List() }
  else if (upTo <= d.kept) { state: { ...answered, stage: Acking, pageEnd: upTo, page: 0 }, out: List(AckResults({ upTo: upTo })) }
  else { state: { ...answered, stage: Keeping, page: count, pageEnd: upTo, pageRan: ran }, out: List(KeepResults({ upTo: upTo, count: count })) }
```

### Once a page is kept, the agent is told, and the owner is told of the newest result if notifications are on

A page the phone could not keep is not acknowledged; the agent sends it
again. While the panel is open the notice is posted quietly.

```quint
pure def canPageKept(d: Digests): bool = d.stage == Keeping

pure def pageKept(d: Digests, ok: bool): Moved =
  val post = d.notices and d.pageEnd > d.posted
  if (not(ok)) { state: { ...d, stage: Idle, page: 0, pageRan: 0 }, out: List() }
  else {
    state: { ...d, stage: Acking, kept: d.pageEnd, results: d.results + d.page, posted: if (post) d.pageEnd else d.posted,
      brief: if (d.pageRan >= 1) d.pageRan else d.brief, pageRan: 0, notice: d.notice or post },
    out: List(AckResults({ upTo: d.pageEnd })).concat(if (post) List(PostResult({ upTo: d.pageEnd, quiet: d.open })) else List()),
  }
```

### The agent's answer to an acknowledgement ends the round, and a lost one is repeated by the next

```quint
pure def canAckAnswered(d: Digests): bool = d.stage == Acking

pure def ackAnswered(d: Digests, ok: bool): Digests =
  { ...d, stage: Idle, acked: if (ok and d.pageEnd > d.acked) d.pageEnd else d.acked, page: 0 }
```

### Results are acknowledged, announced and shown on Home only once kept

```quint
pure def alwaysNothingIsAcknowledgedOrAnnouncedBeforeItIsKept(d: Digests): bool = and {
  0 <= d.acked, d.acked <= d.kept, 0 <= d.posted, d.posted <= d.kept, 0 <= d.results, d.results <= d.kept, d.missed >= 0, 0 <= d.asked, d.asked <= d.occurrence, d.occurrence <= d.missed,
  d.stage == Keeping implies (d.pageEnd > d.kept and d.page >= 1 and d.page <= d.pageEnd - d.kept),
  0 <= d.brief, d.brief <= d.kept,
  d.pageRan != 0 implies (d.stage == Keeping and d.kept < d.pageRan and d.pageRan <= d.pageEnd),
  d.stage == Acking implies d.pageEnd <= d.kept,
}
```

### Every acknowledgement names results kept, and every notice a result kept and never announced before

The notice is recorded as posted in the same step that asks for it, so a
notice is never posted twice for one result.

```quint
pure def stepEachEffectFollowsItsCommit(before: Digests, via: str, after: Digests, out: List[Effect]): bool =
  out.every(e => match e {
    | AckResults(k) => k.upTo <= after.kept and after.stage == Acking
    | PostResult(p) => p.upTo <= after.kept and p.upTo > before.posted and p.upTo == after.posted and after.notices
    | KeepResults(k) => k.upTo > before.kept and after.stage == Keeping
    | FetchResults(f) => f.after == before.kept and f.ticket == after.inbox.ticket
    | _ => true
  })
```

### What is kept is never lost, and nothing kept or announced goes back

```quint
pure def stepHistoryIsDurable(before: Digests, via: str, after: Digests): bool = and {
  after.kept >= before.kept, after.results >= before.results, after.acked >= before.acked, after.posted >= before.posted,
  after.brief >= before.brief,
}
```

### Home shows the newest kept result that ran, through a restart

A missed or skipped occurrence kept after it never replaces it.

```quint
pure def briefForHome(d: Digests): int = d.brief

pure def stepTheBriefIsAResultThatRan(before: Digests, via: str, after: Digests): bool =
  after.brief != before.brief implies (via == "pageKept" and after.brief == before.pageRan and after.brief > before.kept)

pure def sometimesHomeHasABrief(d: Digests): bool = briefForHome(d) >= 2 and d.acked == d.kept and d.stage == Idle and not(d.open)

pure def sometimesANonRunFollowsTheBrief(d: Digests): bool = briefForHome(d) >= 1 and d.kept > briefForHome(d) and d.stage == Idle
```

### A page can fail to be kept, an acknowledgement can be lost and repeated, and a result can arrive with notifications off

```quint
pure def sometimesAPageIsNotKept(d: Digests): bool = d.stage == Idle and d.inbox.status == R::Loaded and d.kept == 0 and d.page == 0 and d.results == 0 and d.pageEnd >= 1

pure def sometimesAnAcknowledgementIsRepeated(d: Digests): bool = d.stage == Acking and d.page == 0 and d.acked < d.kept

pure def sometimesAResultArrivesQuietly(d: Digests): bool = d.kept >= 1 and d.posted == 0 and not(d.notices)
```

## Story: Be told of a new result

> As the owner, I want one notice for the newest result, quiet while I am
> looking at my digests, gone once I have seen the result, and a tap on it
> to open my digests once.

### A tap on the result notice opens the panel, once

The tap withdraws the notice; a second tap, or a tap of a notice already
withdrawn or replaced, opens nothing.

```quint
pure def canResultTapped(d: Digests, upTo: int): bool = d.notice and upTo == d.posted

pure def resultTapped(d: Digests, upTo: int): Moved =
  val asked = R::ask(d.schedules)
  { state: { ...d, open: true, schedules: asked, notice: false },
    out: List(ReadSchedules({ ticket: asked.ticket }), WithdrawResult({ upTo: upTo })) }
```

### A result notice is showing only while notifications are on, for the newest result announced

```quint
pure def alwaysTheNoticeIsForTheNewestAnnounced(d: Digests): bool = d.notice implies (d.notices and d.posted >= 1)
```

### A notice is posted only for a kept result, quietly while the panel is open, and is withdrawn only once it is showing

```quint
pure def stepANoticeIsPostedAndWithdrawnHonestly(before: Digests, via: str, after: Digests, out: List[Effect]): bool = and {
  (after.notice and not(before.notice)) implies via == "pageKept",
  out.every(e => match e {
    | PostResult(p) => p.quiet == before.open and after.notice
    | WithdrawResult(w) => before.notice and not(after.notice) and w.upTo == before.posted
    | _ => true
  }),
}
```

### A notice can be posted quietly while the panel is open

```quint
pure def sometimesANoticeIsQuiet(d: Digests): bool = d.open and d.notice
```

## Story: Run a missed digest, or ask about a result

> As the owner, I want to run a digest the phone missed, once, by asking
> the agent, and to ask Alpha about a result.

### Run now is offered for a missed occurrence not yet run, reviewed, then confirmed

```quint
pure def canReviewRunNow(d: Digests): bool =
  d.open and d.missed > d.asked and Q::canFile(d.runNow) and not(d.review.showing)

pure def reviewRunNow(d: Digests): Digests = { ...d, review: V::present(d.review), occurrence: d.missed }

pure def canCancelRunNow(d: Digests): bool = d.review.showing

pure def cancelRunNow(d: Digests): Digests = { ...d, review: V::dismiss(d.review) }

pure def canConfirmRunNow(d: Digests): bool = V::canConfirm(d.review) and Q::canFile(d.runNow) and d.occurrence > d.asked

pure def confirmRunNow(d: Digests): Digests =
  { ...d, review: V::confirm(d.review), runNow: Q::file(d.runNow), asked: d.occurrence }
```

### The agent is asked to run it once, naming the occurrence

```quint
pure def canSendRunNow(d: Digests): bool = Q::canSend(d.runNow)

pure def sendRunNow(d: Digests): Moved =
  { state: { ...d, runNow: Q::send(d.runNow) }, out: List(RunDigest({ id: d.runNow.attempt.id, occurrence: d.asked })) }

pure def canRunNowAnswered(d: Digests, id: int): bool = Q::canAnswer(d.runNow, id)

pure def runNowAnswered(d: Digests, id: int, applied: bool): Digests = { ...d, runNow: Q::answer(d.runNow, applied) }

pure def canRunNowUnanswered(d: Digests): bool = d.runNow.live

pure def runNowUnanswered(d: Digests): Digests = { ...d, runNow: Q::lose(d.runNow) }

pure def canLetGo(d: Digests): bool = Q::canRelease(d.runNow)

pure def letGo(d: Digests): Digests = { ...d, runNow: Q::release(d.runNow) }
```

### The phone never runs a digest: it only asks the agent, once per missed occurrence the owner confirmed

```quint
pure def stepAMissedDigestIsAskedForOnce(before: Digests, via: str, after: Digests, out: List[Effect]): bool = and {
  after.asked != before.asked implies (via == "confirmRunNow" and V::canConfirm(before.review) and after.asked > before.asked),
  out.every(e => match e {
    | RunDigest(r) => via == "sendRunNow" and before.runNow.attempt.outcome == A::Recorded and r.occurrence == after.asked and r.id == after.runNow.attempt.id
    | _ => true
  }),
}

pure def alwaysARunNowIsKeptHonestly(d: Digests): bool = Q::sound(d.runNow) and (Q::kept(d.runNow) implies d.asked >= 1)
```

### Ask Alpha about a result hands that result to Ask Alpha

```quint
pure def canAskAbout(d: Digests, result: int): bool = d.open and 1 <= result and result <= d.kept

pure def askAbout(d: Digests, result: int): Moved = { state: d, out: List(AskAlpha({ result: result })) }
```

### A missed digest can be run now, and a Run now can be lost and let go

```quint
pure def sometimesAMissedDigestRuns(d: Digests): bool = d.runNow.attempt.outcome == A::Confirmed and d.asked >= 1

pure def sometimesARunNowIsLetGo(d: Digests): bool = d.runNow.attempt.outcome == A::Unknown
```

## Story: Keep digests through a restart

> As the owner, I want every result kept and the switches as I set them
> after Alpha restarts, and a round in progress begun again.

### A restart closes the panel and ends the round in progress; what was kept and acknowledged stays

```quint
pure def restart(d: Digests): Digests = {
  ...d, open: false, schedules: R::unread, stage: Idle, inbox: R::unread, page: 0, pageRan: 0,
  review: V::dismiss(d.review), runNow: Q::lose(d.runNow),
}
```

### A round in progress always ends

Fetching, keeping and acknowledging are each answered, so the inbox comes
back to rest.

```quint
pure def leadsToARoundEnds(d: Digests, later: Digests): bool = d.stage != Idle implies later.stage == Idle

pure val fair_fetched = "weak"
pure val fair_pageKept = "weak"
pure val fair_ackAnswered = "weak"
```
