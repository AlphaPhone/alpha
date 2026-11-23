# Approval notices

A workflow run that waits for the owner to approve a phone step posts one redacted notice per step,
whoever started the run: a schedule, the agent or the owner. A settled step's notice is withdrawn.
When the account changes the notices of the other owner are suspended, and when that owner returns
each is rechecked against the run before it is posted again, quietly. Tapping a notice opens the
exact run it names; the clock area owns the tap (its workflow notices spec) and
opens the run through Workflows' `WorkflowRuns.open` (upstream `notices.md`: `workflowApprovalNoticeIdentity`, `revalidateWorkflowApprovalNotice`; legacy `WorkflowNoticeDelivery`,
`WorkflowNoticeTaps`; PRD P-75).

## Domain

### Notices hold the current owner, the clock, and one notice per waiting step

```quint
type NoticeRoute = { owner: str, workflowId: str, runId: str, versionId: str, step: str }
type NoticeState = NoticePosted | NoticeQuiet | NoticeSuspended
type Notice = { route: NoticeRoute, state: NoticeState, postedAt: int, expiresAt: int }
type Notices = { owner: str, now: int, notices: List[Notice], waiting: List[str] }
pure val initial: Notices = { owner: "", now: 0, notices: List(), waiting: List() }
pure val maximumApprovalMs = 604800000
pure def sameStep(a: NoticeRoute, b: NoticeRoute): bool = a.runId == b.runId and a.step == b.step and a.owner == b.owner
pure def noticeOf(n: Notices, runId: str, stepId: str): Notice =
  n.notices.select(x => x.route.runId == runId and x.route.step == stepId).nthOr(0,
    { route: { owner: "", workflowId: "", runId: "", versionId: "", step: "" }, state: NoticeSuspended, postedAt: 0, expiresAt: 0 })
```

### What the simulator tries

```quint
pure val ownerValues = Set("ann", "ben")
pure val routeValues = Set({ owner: "ann", workflowId: "w1", runId: "r1", versionId: "v1", step: "s1" }, { owner: "ann", workflowId: "w1", runId: "r1", versionId: "v1", step: "s2" }, { owner: "ben", workflowId: "w2", runId: "r2", versionId: "v1", step: "s1" })
pure val expiresAtValues = Set(5, 100)
pure val nowValues = Set(1, 6)
pure val runIdValues = Set("r1", "r2")
pure val stepIdValues = Set("s1", "s2")
pure val workflowIdValues = Set("w1", "w2")
```

## Story: Be told when a workflow waits for me, and only for my account

> As the owner, I get one notice for each phone step waiting for my approval, it goes away when the
> step settles or expires, and another account never sees mine.

### A waiting step posts one notice for the current owner, lasting at most seven days

```quint
pure def canStepWaiting(n: Notices, route: NoticeRoute, expiresAt: int): bool =
  n.owner != "" and route.owner == n.owner and route.runId != "" and route.step != "" and
  expiresAt > n.now and expiresAt <= n.now + maximumApprovalMs and not(n.notices.some(x => sameStep(x.route, route)))
pure def stepWaiting(n: Notices, route: NoticeRoute, expiresAt: int): Notices =
  { ...n, notices: n.notices.append({ route: route, state: NoticePosted, postedAt: n.now, expiresAt: expiresAt }),
    waiting: if (n.waiting.includes(route.workflowId)) n.waiting else n.waiting.append(route.workflowId) }
pure def alwaysOneNoticePerStep(n: Notices): bool = n.notices.every(x => n.notices.select(o => sameStep(o.route, x.route)).length() == 1)
pure def alwaysANoticeLastsAtMostSevenDays(n: Notices): bool = n.notices.every(x => x.expiresAt > x.postedAt and x.expiresAt <= x.postedAt + maximumApprovalMs)
```

### A settled or expired step's notice is withdrawn

```quint
pure def canStepSettled(n: Notices, runId: str, stepId: str): bool = noticeOf(n, runId, stepId).route.runId == runId and runId != ""
pure def stepSettled(n: Notices, runId: str, stepId: str): Notices =
  { ...n, notices: n.notices.select(x => not(x.route.runId == runId and x.route.step == stepId)) }
pure def canTick(n: Notices, now: int): bool = now > n.now
pure def tick(n: Notices, now: int): Notices = { ...n, now: now, notices: n.notices.select(x => x.expiresAt > now) }
pure def alwaysNoNoticeOutlivesItsExpiry(n: Notices): bool = n.notices.every(x => x.expiresAt > n.now)
```

### Another owner's notices are suspended, and never shown while that owner is away

```quint
pure def canBindOwner(n: Notices, owner: str): bool = owner != "" and owner != n.owner
pure def bindOwner(n: Notices, owner: str): Notices =
  { ...n, owner: owner, waiting: List(), notices: n.notices.listMap(x => if (x.route.owner == owner) x else { ...x, state: NoticeSuspended }) }
pure def alwaysAShownNoticeIsTheCurrentOwners(n: Notices): bool = n.notices.every(x => x.state != NoticeSuspended implies x.route.owner == n.owner)
pure def sometimesSuspended(n: Notices): bool = n.notices.some(x => x.state == NoticeSuspended)
```

### A returning owner's notice is posted again quietly only after its run still waits for that exact step

The recheck compares the workflow revision, the run, the pending proposal and its expiry; it never
makes an approval that was not pending (#429).

```quint
pure def canRechecked(n: Notices, runId: str, stepId: str, stillPending: bool): bool = {
  val x = noticeOf(n, runId, stepId)
  x.route.runId == runId and runId != "" and x.state == NoticeSuspended and x.route.owner == n.owner
}
pure def rechecked(n: Notices, runId: str, stepId: str, stillPending: bool): Notices =
  if (stillPending) { ...n, notices: n.notices.listMap(x => if (x.route.runId == runId and x.route.step == stepId) { ...x, state: NoticeQuiet } else x) }
  else stepSettled(n, runId, stepId)
pure def stepARecheckNeverAddsANotice(before: Notices, via: str, after: Notices): bool =
  via == "rechecked" implies after.notices.length() <= before.notices.length()
pure def sometimesQuietRepost(n: Notices): bool = n.notices.some(x => x.state == NoticeQuiet)
```

### A workflow keeps its last "Waiting for you" when a sweep cannot read its runs

A sweep that read the runs sets or clears the mark; an unreadable one leaves it for the same
session (#b24a12d).

```quint
pure def canSwept(n: Notices, workflowId: str, waits: bool, readable: bool): bool = n.owner != "" and workflowId != ""
pure def swept(n: Notices, workflowId: str, waits: bool, readable: bool): Notices =
  if (not(readable)) n
  else if (waits) { ...n, waiting: if (n.waiting.includes(workflowId)) n.waiting else n.waiting.append(workflowId) }
  else { ...n, waiting: n.waiting.select(w => w != workflowId) }
pure def lawAnUnreadableSweepChangesNothing(workflowId: str, waits: bool): bool =
  swept({ ...initial, owner: "ann", waiting: List("w1") }, workflowId, waits, false).waiting == List("w1")
pure val waitsValues = Set(true, false)
```
