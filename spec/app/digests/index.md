# Digests

Scheduled briefs the agent writes: a morning summary of the calendar and
reminders, an evening one. The agent keeps the schedules and runs them;
Alpha never runs a digest itself. This is the phone's inbox of results,
kept for each owner apart: every result is kept on the phone before the
agent is told the phone has it, a notice is wanted for the newest one, and
the newest brief that ran is kept for Home. On the agent's side the inbox
is eliza's `workflow/hostedDigest` poll, store and acknowledgement, which
also evicts results past the newest 100 and reconciles its cursor.

- [Schedules](./schedules.md): the schedules, their changes and the Run now of a missed digest
- [Sources](./sources.md): the owner's consent for each source a digest reads, its expiry and its renewal

The notices area (`spec/app/notices`) posts each notice, keeps Android's
notification permission, and takes each tap once; whether it may post is
passed in with the event that wants a notice. Who is signed in is a fact of
the account area; what the phone can check in the background is a fact of
the platform, passed in when the panel opens. Home takes the brief as the
parameter of its own brief event.

## Story: See my digests

> As the owner, I want to see the results the agent sent with what ran,
> open one, ask Alpha about it, and switch background checks and
> notifications on or off where my phone can.

### Digests holds the owner, the panel, the inbox round, the results kept for this owner and those kept for others, the notice, the two switches, and the result in focus

Results arrive in order, each numbered one higher than the last. The phone
keeps them up to a number and has told the agent it has them up to
another. A result is a digest that ran (finished or failed), or an
occurrence that did not (missed, skipped, or unavailable because its
source could not be read); the brief is the newest kept that ran.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"

type Stage = Idle | Fetching | Keeping | Acking
type Checks = NoChecks | ResultChecks | BackgroundChecks
type Outcome = Finished | RunFailed | Missed | Skipped | Unavailable
type Brief = { result: int, failed: bool }
type Bucket = { kept: int, results: int, acked: int, posted: int, brief: Brief }
type Switch = { on: bool, wanted: bool, attempt: A::Attempt }
type Effect =
  | FetchResults({ round: int, owner: int, after: int })
  | KeepResults({ round: int, owner: int, upTo: int, count: int })
  | AckResults({ round: int, owner: int, upTo: int })
  | WantNotice({ owner: int, upTo: int, quiet: bool })
  | DropNotice({ owner: int, upTo: int })
  | SetBackground({ id: int, on: bool })
  | SetNotices({ id: int, on: bool })
  | ReadResult({ ticket: int, owner: int, result: int })
  | AskAlpha({ result: int })
type Digests = {
  owner: int, open: bool, checks: Checks,
  stage: Stage, inbox: R::Read, page: int, pageEnd: int, pageRan: Brief,
  bucket: Bucket, others: int -> Bucket, notice: bool,
  background: Switch, notices: Switch,
  focus: int, fromNotice: bool, details: R::Read, ending: Outcome,
}
type Moved = { state: Digests, out: List[Effect] }

pure val shownAtMost = 100
pure val noBrief: Brief = { result: 0, failed: false }
pure val empty: Bucket = { kept: 0, results: 0, acked: 0, posted: 0, brief: noBrief }
pure val off: Switch = { on: false, wanted: false, attempt: A::plan(0) }

pure val initial: Digests = {
  owner: 0, open: false, checks: NoChecks,
  stage: Idle, inbox: R::unread, page: 0, pageEnd: 0, pageRan: noBrief,
  bucket: empty, others: Map(), notice: false,
  background: off, notices: off,
  focus: 0, fromNotice: false, details: R::unread, ending: Finished,
}

pure val ticketValues = Set(1, 2, 3)
pure val roundValues = Set(1, 2, 3, 4, 5)
pure val idValues = Set(1, 2)
pure val countValues = Set(-1, 0, 1, 2)
pure val upToValues = Set(0, 1, 2, 3)
pure val ranValues = Set(0, 1, 2)
pure val resultValues = Set(0, 1, 3)
pure val ownerValues = Set(0, 1, 2)
pure val weight_pull = 3
pure val weight_fetched = 12
pure val weight_pageKept = 6
pure val weight_ackAnswered = 4
pure val weight_noticeOpened = 4
pure val weight_resultRead = 8
pure val weight_setNotices = 3
pure val weight_noticesAnswered = 4
pure val weight_closePanel = 2
```

### Only the newest 100 results are listed, newest first

```quint
pure def listed(d: Digests): int = if (d.bucket.results > shownAtMost) shownAtMost else d.bucket.results

pure def lawAtMost100AreListed(results: int): bool =
  val d = { ...initial, bucket: { ...empty, results: results } }
  listed(d) <= shownAtMost and (results >= 0 implies listed(d) <= results)
```

### The panel opens with what this phone can check, and opening it drops the result notice, whose result it shows

A phone whose checks are not ready offers no switch; a plain browser
offers result checks while it is open.

```quint
pure def drop(d: Digests): List[Effect] = if (d.notice) List(DropNotice({ owner: d.owner, upTo: d.bucket.posted })) else List()

pure def canOpenPanel(d: Digests, checks: Checks): bool = not(d.open) and d.owner >= 1

pure def openPanel(d: Digests, checks: Checks): Moved =
  { state: { ...d, open: true, checks: checks, notice: false, fromNotice: false }, out: drop(d) }
```

### Closing the panel drops a notice that came while it was open, since its result was seen

```quint
pure def canClosePanel(d: Digests): bool = d.open

pure def closePanel(d: Digests): Moved =
  { state: { ...d, open: false, notice: false, focus: 0, fromNotice: false, details: { ...d.details, status: R::Idle } }, out: drop(d) }
```

### Opening a result reads what ran, when, from which source, and how it ended

```quint
pure def canOpenResult(d: Digests, result: int): bool = d.open and 1 <= result and result <= d.bucket.kept

pure def openResult(d: Digests, result: int): Moved =
  val asked = R::ask(d.details)
  { state: { ...d, focus: result, fromNotice: false, details: asked }, out: List(ReadResult({ ticket: asked.ticket, owner: d.owner, result: result })) }

pure def canResultRead(d: Digests, ticket: int): bool = R::canAnswer(d.details, ticket)

pure def resultRead(d: Digests, ticket: int, ok: bool, ended: Outcome): Digests =
  { ...d, details: R::answer(d.details, ok), ending: if (ok) ended else d.ending }
```

### Opening a result notice opens the panel on that result, for the owner it was for

The notices area takes each tap once; a notice of another owner opens
nothing.

```quint
pure def canNoticeOpened(d: Digests, owner: int, upTo: int, checks: Checks): bool =
  owner == d.owner and owner >= 1 and 1 <= upTo and upTo <= d.bucket.kept

pure def noticeOpened(d: Digests, owner: int, upTo: int, checks: Checks): Moved =
  val asked = R::ask(d.details)
  { state: { ...d, open: true, checks: checks, notice: false, focus: upTo, fromNotice: true, details: asked },
    out: List(ReadResult({ ticket: asked.ticket, owner: owner, result: upTo })) }
```

### Ask Alpha about a result hands that result to Ask Alpha

```quint
pure def canAskAbout(d: Digests, result: int): bool = d.open and 1 <= result and result <= d.bucket.kept

pure def askAbout(d: Digests, result: int): Moved = { state: d, out: List(AskAlpha({ result: result })) }
```

### Background checks and notifications are asked of the agent, one at a time each, and shown as the agent last took them

```quint
pure def canSetBackground(d: Digests, on: bool): bool =
  d.open and d.checks != NoChecks and d.background.attempt.outcome != A::Sent and on != d.background.on

pure def setBackground(d: Digests, on: bool): Moved =
  val sent = A::dispatch(A::record(A::plan(d.background.attempt.id + 1)))
  { state: { ...d, background: { ...d.background, wanted: on, attempt: sent } }, out: List(SetBackground({ id: sent.id, on: on })) }

pure def canBackgroundAnswered(d: Digests, id: int): bool = A::canConclude(d.background.attempt, id)

pure def backgroundAnswered(d: Digests, id: int, applied: bool): Digests =
  { ...d, background: { ...d.background, attempt: A::conclude(d.background.attempt, applied, true),
                        on: if (applied) d.background.wanted else d.background.on } }

pure def canSetNotices(d: Digests, on: bool): bool =
  d.open and d.checks != NoChecks and d.notices.attempt.outcome != A::Sent and on != d.notices.on

pure def setNotices(d: Digests, on: bool): Moved =
  val sent = A::dispatch(A::record(A::plan(d.notices.attempt.id + 1)))
  { state: { ...d, notices: { ...d.notices, wanted: on, attempt: sent } }, out: List(SetNotices({ id: sent.id, on: on })) }
```

### Notifications turned off by the agent drop the result notice

```quint
pure def canNoticesAnswered(d: Digests, id: int): bool = A::canConclude(d.notices.attempt, id)

pure def noticesAnswered(d: Digests, id: int, applied: bool): Moved =
  val on = if (applied) d.notices.wanted else d.notices.on
  { state: { ...d, notices: { ...d.notices, attempt: A::conclude(d.notices.attempt, applied, true), on: on }, notice: d.notice and on },
    out: if (on) List() else drop(d) }
```

### A switch shows what the agent took, and one whose answer was lost is shown as not confirmed

```quint
pure def switchHonest(s: Switch): bool = s.attempt.outcome != A::Recorded and s.attempt.id >= 0

pure def stepASwitchMovesOnlyByTheAgentsAnswer(before: Digests, via: str, after: Digests): bool = and {
  after.background.on != before.background.on implies (via == "backgroundAnswered" or via == "ownerChanged"),
  after.notices.on != before.notices.on implies (via == "noticesAnswered" or via == "ownerChanged"),
}
```

### Results can be none yet, a switch can be refused or left unconfirmed, the panel can offer no switch, and a result can be opened from its notice

```quint
pure def sometimesThereAreNoResultsYet(d: Digests): bool = d.open and d.bucket.kept == 0 and d.inbox.status == R::Loaded

pure def sometimesASwitchIsRefused(d: Digests): bool = d.background.attempt.outcome == A::Refused and not(d.background.on)

pure def sometimesASwitchIsUnconfirmed(d: Digests): bool = d.notices.attempt.outcome == A::Unknown

pure def sometimesThereIsNoSwitch(d: Digests): bool = d.open and d.checks == NoChecks

pure def sometimesAResultIsOpenedFromItsNotice(d: Digests): bool = d.fromNotice and d.details.status == R::Loaded and d.ending == Unavailable
```

## Story: Receive results without losing or repeating one

> As the owner, I want every result the agent sends kept on my phone, never
> lost because the phone told the agent too early, and never announced to
> me twice.

### Results are fetched one page at a time for the owner signed in, from after the last one kept, while the panel is open or background checks are on

Each fetch begins a round with a new number.

```quint
pure def canPull(d: Digests): bool = d.stage == Idle and d.owner >= 1 and (d.open or d.background.on)

pure def pull(d: Digests): Moved =
  val asked = R::ask(d.inbox)
  { state: { ...d, stage: Fetching, inbox: asked }, out: List(FetchResults({ round: asked.ticket, owner: d.owner, after: d.bucket.kept })) }
```

### A page of the round's owner, numbered on from the last kept, is kept on the phone before anything else happens, and a page already kept is acknowledged again

A page names the newest of its results that ran, if any, and whether that
run failed.

```quint
pure def canFetched(d: Digests, round: int, owner: int, count: int, upTo: int, ran: int): bool =
  d.stage == Fetching and R::canAnswer(d.inbox, round) and owner == d.owner and count >= 0 and upTo >= 0
    and (upTo > d.bucket.kept implies (count == upTo - d.bucket.kept and (ran == 0 or (d.bucket.kept < ran and ran <= upTo))))

pure def fetched(d: Digests, round: int, owner: int, ok: bool, count: int, upTo: int, ran: int, failed: bool): Moved =
  val answered = { ...d, inbox: R::answer(d.inbox, ok) }
  if (not(ok) or count == 0) { state: { ...answered, stage: Idle }, out: List() }
  else if (upTo <= d.bucket.kept) { state: { ...answered, stage: Acking, pageEnd: upTo, page: 0 },
                                    out: List(AckResults({ round: round, owner: owner, upTo: upTo })) }
  else { state: { ...answered, stage: Keeping, page: count, pageEnd: upTo, pageRan: { result: ran, failed: ran >= 1 and failed } },
         out: List(KeepResults({ round: round, owner: owner, upTo: upTo, count: count })) }
```

### Once a page is kept, the agent is told, and a notice is wanted for the newest result if notifications are on and the phone may post

A page the phone could not keep is not acknowledged; the agent sends it
again. While the panel is open the notice is wanted quietly.

```quint
pure def canPageKept(d: Digests, round: int): bool = d.stage == Keeping and round == d.inbox.ticket

pure def pageKept(d: Digests, round: int, ok: bool, posting: bool): Moved =
  val b = d.bucket
  val wants = d.notices.on and posting and d.pageEnd > b.posted
  if (not(ok)) { state: { ...d, stage: Idle, page: 0, pageRan: noBrief }, out: List() }
  else {
    state: { ...d, stage: Acking, pageRan: noBrief, notice: d.notice or wants,
             bucket: { kept: d.pageEnd, results: b.results + d.page, acked: b.acked, posted: if (wants) d.pageEnd else b.posted,
                       brief: if (d.pageRan.result >= 1) d.pageRan else b.brief } },
    out: List(AckResults({ round: round, owner: d.owner, upTo: d.pageEnd }))
      .concat(if (wants) List(WantNotice({ owner: d.owner, upTo: d.pageEnd, quiet: d.open })) else List()),
  }
```

### The agent's answer to the round's acknowledgement ends the round, and a lost one is repeated by the next

```quint
pure def canAckAnswered(d: Digests, round: int): bool = d.stage == Acking and round == d.inbox.ticket

pure def ackAnswered(d: Digests, round: int, ok: bool): Digests =
  { ...d, stage: Idle, page: 0, bucket: { ...d.bucket, acked: if (ok and d.pageEnd > d.bucket.acked) d.pageEnd else d.bucket.acked } }
```

### Results are acknowledged, announced and shown on Home only once kept, and only for the owner they belong to

```quint
pure def alwaysNothingIsAcknowledgedOrAnnouncedBeforeItIsKept(d: Digests): bool =
  val b = d.bucket
  and {
    0 <= b.acked, b.acked <= b.kept, 0 <= b.posted, b.posted <= b.kept, 0 <= b.results, b.results <= b.kept,
    0 <= b.brief.result, b.brief.result <= b.kept, b.brief.failed implies b.brief.result >= 1,
    d.stage == Keeping implies (d.pageEnd > b.kept and d.page == d.pageEnd - b.kept),
    d.pageRan.result != 0 implies (d.stage == Keeping and b.kept < d.pageRan.result and d.pageRan.result <= d.pageEnd),
    d.pageRan.failed implies d.pageRan.result >= 1,
    d.stage == Acking implies d.pageEnd <= b.kept,
    d.stage != Idle implies (d.owner >= 1 and d.inbox.ticket >= 1),
    d.notice implies (d.owner >= 1 and d.notices.on and b.posted >= 1),
    0 <= d.focus, d.focus <= b.kept,
    switchHonest(d.background), switchHonest(d.notices),
  }
```

### Every acknowledgement and keep names the current round and its owner, and every notice a result kept and never announced before

The notice is recorded as wanted in the same step that asks for it, so a
notice is never wanted twice for one result.

```quint
pure def stepEachEffectFollowsItsCommit(before: Digests, via: str, after: Digests, out: List[Effect]): bool =
  out.every(e => match e {
    | AckResults(k) => k.upTo <= after.bucket.kept and after.stage == Acking and k.round == after.inbox.ticket and k.owner == after.owner
    | WantNotice(p) => p.upTo <= after.bucket.kept and p.upTo > before.bucket.posted and p.upTo == after.bucket.posted
        and after.notices.on and p.quiet == before.open and p.owner == after.owner and via == "pageKept"
    | KeepResults(k) => k.upTo > before.bucket.kept and after.stage == Keeping and k.round == after.inbox.ticket and k.owner == after.owner
    | FetchResults(f) => f.after == before.bucket.kept and f.round == after.inbox.ticket and f.owner == after.owner
    | DropNotice(n) => before.notice and not(after.notice) and n.owner == before.owner and n.upTo == before.bucket.posted
    | _ => true
  })
```

### What is kept for an owner is never lost: nothing kept or announced goes back while they are signed in, and their results wait for them while another owner is

```quint
pure def monotone(a: Bucket, b: Bucket): bool =
  b.kept >= a.kept and b.results >= a.results and b.acked >= a.acked and b.posted >= a.posted and b.brief.result >= a.brief.result

pure def stepHistoryIsDurable(before: Digests, via: str, after: Digests): bool =
  if (after.owner == before.owner) monotone(before.bucket, after.bucket)
  else after.others.getOr(before.owner, empty) == before.bucket and after.bucket == before.others.getOr(after.owner, empty)
```

### Home shows the newest kept result of the owner that ran, finished or failed, through a restart; a result that did not run never replaces it, and a page of another owner never reaches it

```quint
pure def briefForHome(d: Digests): Brief = d.bucket.brief

pure def stepTheBriefIsAResultThatRan(before: Digests, via: str, after: Digests): bool =
  (after.bucket.brief != before.bucket.brief and after.owner == before.owner)
    implies (via == "pageKept" and after.bucket.brief == before.pageRan and after.bucket.brief.result > before.bucket.kept)
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

### Home can have a brief, a failed one, and a result that did not run after it; a page can fail to be kept, an acknowledgement be repeated, a notice be wanted quietly, and a result arrive with notifications off

```quint
pure def sometimesHomeHasABrief(d: Digests): bool =
  briefForHome(d).result >= 2 and d.bucket.acked == d.bucket.kept and d.stage == Idle and not(d.open)

pure def sometimesTheBriefFailed(d: Digests): bool = briefForHome(d).failed and d.stage == Idle

pure def sometimesANonRunFollowsTheBrief(d: Digests): bool =
  briefForHome(d).result >= 1 and d.bucket.kept > briefForHome(d).result and d.stage == Idle

pure def sometimesAPageIsNotKept(d: Digests): bool =
  d.stage == Idle and d.inbox.status == R::Loaded and d.bucket.kept == 0 and d.page == 0 and d.pageEnd >= 1

pure def sometimesAnAcknowledgementIsRepeated(d: Digests): bool = d.stage == Acking and d.page == 0 and d.bucket.acked < d.bucket.kept

pure def sometimesANoticeIsWantedQuietly(d: Digests): bool = d.open and d.notice

pure def sometimesAResultArrivesWithNotificationsOff(d: Digests): bool = d.bucket.kept >= 1 and d.bucket.posted == 0 and not(d.notices.on)
```

## Story: Keep digests to their owner and through a restart

> As the owner, I want every result kept and the switches as the agent
> took them after Alpha restarts, a round in progress begun again, and my
> results neither shown to nor lost for whoever signs in next.

### A restart closes the panel and ends the round in progress; what was kept and acknowledged stays, and a switch awaiting its answer is not confirmed

```quint
pure def unconfirmed(s: Switch): Switch =
  if (s.attempt.outcome == A::Sent) { ...s, attempt: A::conclude(s.attempt, false, false) } else s

pure def restart(d: Digests): Digests = {
  ...d, open: false, stage: Idle, inbox: { ...d.inbox, status: R::Idle }, page: 0, pageRan: noBrief,
  focus: 0, fromNotice: false, details: { ...d.details, status: R::Idle },
  background: unconfirmed(d.background), notices: unconfirmed(d.notices),
}
```

### When another owner signs in, the round ends, the previous owner's results are put aside for them and their notice dropped, and the new owner's own results are taken up

```quint
pure def canOwnerChanged(d: Digests, owner: int): bool = owner != d.owner and owner >= 0

pure def ownerChanged(d: Digests, owner: int): Moved =
  { state: { ...d, owner: owner, open: false, stage: Idle, inbox: { ...d.inbox, status: R::Idle }, page: 0, pageRan: noBrief,
             others: d.others.put(d.owner, d.bucket), bucket: d.others.getOr(owner, empty), notice: false,
             focus: 0, fromNotice: false, details: { ...d.details, status: R::Idle },
             background: unconfirmed(d.background), notices: unconfirmed(d.notices) },
    out: drop(d) }
```

### An owner's results can wait for them while another owner is signed in

```quint
pure def sometimesResultsWaitForTheirOwner(d: Digests): bool = d.others.getOr(1, empty).kept >= 1 and d.owner == 2
```
