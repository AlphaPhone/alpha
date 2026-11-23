# Capture for Alpha

When Alpha's agent asks for a photo, the owner sees the request over the
[Camera](./index.md) viewfinder and approves what is shown. The shutter then
fires at most once for that request, only on the view the owner approved; a
change to the view before the shutter sends the request back to the owner.
A capture whose outcome is uncertain is reported as such and never taken
again. Camera holds the request: it says when the viewfinder changes, keeps
one shutter on the camera between the owner and the agent, and fails a
request only for a cause it can name. The Approvals area keeps the agent's
request and its receipt: how long the request may wait before it expires,
and what an approved capture whose outcome was not known becomes after a
restart. This spec keeps what is particular to the camera: the view shown
and approved, and the one shutter.

## Domain

### Who sends an event

The agent asks or withdraws, the owner approves or declines, and the phone
reports what the viewfinder shows and how the capture ended: the senders of
[Who acts on photos](../photos/actor.md), which Camera uses too.

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import actor.* from "../photos/actor"
```

### A request and how it ended

A request is asked, approved, shooting, or over. Over means taken,
uncertain (the shutter fired and Alpha cannot tell what was saved),
declined by the owner, withdrawn by the agent, blocked by a cause Camera
names, or expired.

```quint
type Step = Waiting | Asked | Approved | Shooting | Over
type Result = Pending | Taken | Uncertain | Declined | Withdrawn | Blocked | Expired
```

### The capture

The stage and number of the request, the review of the viewfinder, who
approved it and which view they approved, the shutter as an attempt numbered
by the request, how many shutters fired for it, its result, and the photo
given to the agent.

```quint
type Capture = {
  stage: Step, request: int, approval: V::Review, approvedBy: Actor, view: int,
  shot: A::Attempt, shutters: int, result: Result, photo: int,
}

pure val initial: Capture = {
  stage: Waiting, request: 0, approval: V::unreviewed, approvedBy: Phone, view: 0,
  shot: A::plan(0), shutters: 0, result: Pending, photo: 0,
}

pure def open(c: Capture): bool = c.stage == Asked or c.stage == Approved

pure def finishing(result: Result, c: Capture): Capture =
  { ...c, stage: Over, result: result, approval: V::dismiss(c.approval) }
```

### What the simulator tries

```quint
pure val requestValues = Set(1, 2, 3, 4)
pure val photoValues = Set(0, 5)
```

## Story: Take a photo for Alpha

> As the owner, I want Alpha to take a photo only after I see what it will
> capture and approve it, at most once per request, and to be told honestly
> when it is not sure the photo was taken.

### The agent asks for one photo at a time, and the owner is shown the request over the viewfinder

```quint
pure def canAsk(s: Capture, by: Actor): bool = by == Agent and (s.stage == Waiting or s.stage == Over)

pure def ask(s: Capture, by: Actor): Capture =
  val n = s.request + 1
  {
    stage: Asked, request: n, approval: V::present(V::revise(s.approval)), approvedBy: Phone, view: 0,
    shot: A::plan(n), shutters: 0, result: Pending, photo: 0,
  }
```

### A change to the viewfinder voids what was shown, and an approval not yet shot goes back to the owner

The lens flips, the zoom changes, the preview restarts or Ask Alpha covers
it: the owner approves only what is on screen, and approves again what has
changed.

```quint
pure def canViewChanged(s: Capture, by: Actor): bool = by == Phone and open(s)

pure def viewChanged(s: Capture, by: Actor): Capture =
  { ...s, stage: Asked, approvedBy: Phone, approval: V::revise(V::dismiss(s.approval)) }

pure def canReshown(s: Capture, by: Actor): bool = by == Phone and s.stage == Asked and not(V::canConfirm(s.approval))

pure def reshown(s: Capture, by: Actor): Capture = { ...s, approval: V::present(s.approval) }
```

### Only the owner approves, and only the viewfinder as shown

```quint
pure def canApprove(s: Capture, by: Actor): bool = by == Owner and s.stage == Asked and V::canConfirm(s.approval)

pure def approve(s: Capture, by: Actor): Capture =
  { ...s, stage: Approved, approval: V::confirm(s.approval), approvedBy: by, view: s.approval.revision }

pure def canDecline(s: Capture, by: Actor): bool = by == Owner and open(s)

pure def decline(s: Capture, by: Actor): Capture = finishing(Declined, s)

pure def alwaysApprovedByTheOwner(s: Capture): bool =
  (s.stage == Approved or s.stage == Shooting or s.result == Taken or s.result == Uncertain) implies s.approvedBy == Owner
```

### An approved request waits only on the view the owner approved

```quint
pure def alwaysApprovedViewIsShown(s: Capture): bool =
  (s.stage == Approved implies (s.approval.revision == s.view and not(s.approval.showing)))
    and (s.stage == Asked implies s.approvedBy == Phone)
```

### The agent withdraws a request not yet shot, Camera blocks one for a cause it names, and the Approvals area expires one

```quint
pure def canWithdraw(s: Capture, by: Actor): bool = by == Agent and open(s)

pure def withdraw(s: Capture, by: Actor): Capture = finishing(Withdrawn, s)

pure def canBlock(s: Capture, by: Actor): bool = by == Phone and open(s)

pure def block(s: Capture, by: Actor): Capture = finishing(Blocked, s)

pure def canExpire(s: Capture, by: Actor): bool = by == Phone and open(s)

pure def expire(s: Capture, by: Actor): Capture = finishing(Expired, s)
```

### The shutter fires once, after the owner's approval, on the view approved

```quint
pure def canShoot(s: Capture, by: Actor): bool =
  by == Phone and s.stage == Approved and s.shutters == 0 and A::canRecord(s.shot) and s.approval.revision == s.view

pure def shoot(s: Capture, by: Actor): Capture = { ...s, stage: Shooting, shot: A::dispatch(A::record(s.shot)), shutters: 1 }

pure def stepShootsTheViewApproved(before: Capture, via: str, after: Capture): bool =
  (after.shutters > before.shutters or (after.stage == Shooting and before.stage != Shooting))
    implies (via == "shoot" and before.stage == Approved and before.approvedBy == Owner
      and before.approval.revision == before.view and before.shutters == 0)
```

### A capture is taken only when the phone saved a photo it names; any other answer, or the camera released first, is uncertain

```quint
pure def canCaptured(s: Capture, request: int, by: Actor): bool = by == Phone and s.stage == Shooting and A::canConclude(s.shot, request)

pure def captured(s: Capture, request: int, photo: int, by: Actor): Capture =
  { ...s, stage: Over, shot: A::conclude(s.shot, true, photo > 0), result: if (photo > 0) Taken else Uncertain, photo: if (photo > 0) photo else 0 }

pure def canLost(s: Capture, by: Actor): bool = by == Phone and s.stage == Shooting

pure def lost(s: Capture, by: Actor): Capture = { ...s, stage: Over, shot: A::conclude(s.shot, true, false), result: Uncertain, photo: 0 }
```

### A request ended without a shutter fired none; an uncertain one fired exactly one and is never shot again; a taken one names its photo

Every request asked has a number of its own, from one up.

```quint
pure def alwaysResultsAreHonest(s: Capture): bool =
  s.shutters >= 0 and s.shutters <= 1 and s.request >= 0 and (s.stage != Waiting implies s.request > 0)
    and ((s.result == Declined or s.result == Withdrawn or s.result == Blocked or s.result == Expired) implies (s.shutters == 0 and s.stage == Over))
    and (s.result == Uncertain implies (s.shutters == 1 and s.stage == Over and s.shot.outcome == A::Unknown and s.photo == 0))
    and (s.result == Taken implies (s.shutters == 1 and s.stage == Over and s.shot.outcome == A::Confirmed and s.photo > 0))
    and (open(s) implies (s.shutters == 0 and s.result == Pending and A::canRecord(s.shot) and s.shot.id == s.request))
    and (s.stage == Shooting implies (s.shutters == 1 and s.shot.outcome == A::Sent and s.shot.id == s.request))
```

### At most one shutter fires for a request

```quint
pure def stepOneShutterPerRequest(before: Capture, via: str, after: Capture): bool =
  after.shutters <= 1 and ((after.request == before.request and after.shutters > before.shutters) implies via == "shoot")
```

### A request asked is shown to the owner over a live viewfinder, or ends

If the phone shows it once the viewfinder is live, and the Approvals area
expires a request that waits, no request waits unseen for ever.

```quint
pure def leadsToAskedIsShownOrEnds(s: Capture, later: Capture): bool =
  s.stage == Asked implies (later.stage != Asked or V::canConfirm(later.approval))

pure val fair_reshown = "weak"
pure val fair_expire = "weak"
```

### An approved request is shot, sent back to the owner, or ends

If the phone fires the shutter when the camera is clear, an approved request
never waits for ever.

```quint
pure def leadsToApprovedEnds(s: Capture, later: Capture): bool = s.stage == Approved implies later.stage != Approved

pure val fair_shoot = "weak"
```

### A photo being taken ends

If the phone answers the capture, or releases the camera before answering,
a request being shot comes to an end.

```quint
pure def leadsToShootingEnds(s: Capture, later: Capture): bool = s.stage == Shooting implies later.stage != Shooting

pure val fair_lost = "weak"
```

### A request can wait for the owner

```quint
pure def sometimesAsked(s: Capture): bool = s.stage == Asked and V::canConfirm(s.approval) and s.request >= 2
```

### An approval can be sent back to the owner by a change to the view

```quint
pure def sometimesApprovalVoided(s: Capture): bool = s.stage == Asked and s.view != 0
```

### A photo can be taken for Alpha

```quint
pure def sometimesTaken(s: Capture): bool = s.result == Taken
```

### A capture can be uncertain

```quint
pure def sometimesUncertain(s: Capture): bool = s.result == Uncertain
```

### An approved request can be blocked before the shutter

```quint
pure def sometimesBlocked(s: Capture): bool = s.result == Blocked and s.view != 0
```

### The owner can decline, the agent withdraw, and a request expire

```quint
pure def sometimesDeclined(s: Capture): bool = s.result == Declined

pure def sometimesWithdrawn(s: Capture): bool = s.result == Withdrawn

pure def sometimesExpired(s: Capture): bool = s.result == Expired
```
