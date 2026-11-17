# Capture for Alpha

When Alpha's agent asks for a photo, the owner sees the request over the
[Camera](./index.md) viewfinder and approves it. The shutter then fires at
most once for that request, and only over a ready, uncovered viewfinder that
is not recording and not showing a protected screen. A capture whose
outcome is uncertain is reported as such and never taken again. The shell
closes Ask Alpha so that the owner sees the viewfinder, and says what Camera
is showing when the shutter is about to fire.

## Domain

### Who sends an event

The agent asks or withdraws, the owner approves or declines, and the phone
reports what Camera shows and how the capture ended.

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Agent | Phone
```

### A request and how it ended

A request is asked, approved, shooting, or done; done means taken, uncertain
(the shutter fired and Alpha cannot tell what was saved), declined by the
owner, or failed before any shutter.

```quint
type Stage = Waiting | Asked | Approved | Shooting | Done
type Result = Pending | Taken | Uncertain | Declined | Failed

type Effect = Shoot({ request: int })
```

### The capture

The stage and number of the request, the owner's approval of what was shown,
the shutter as an attempt numbered by the request, how many shutters fired
for it, its result, and the photo given to the agent.

```quint
type Capture = {
  stage: Stage, request: int, approval: V::Review, shot: A::Attempt, shutters: int, result: Result, photo: int,
}

type Fired = { state: Capture, out: List[Effect] }

pure val initial: Capture = {
  stage: Waiting, request: 0, approval: V::unreviewed, shot: A::plan(0), shutters: 0, result: Pending, photo: 0,
}

pure def open(c: Capture): bool = c.stage == Asked or c.stage == Approved

pure def failing(result: Result, c: Capture): Capture =
  { ...c, stage: Done, result: result, approval: V::dismiss(c.approval) }
```

### What the simulator tries

```quint
pure val requestValues = Set(1, 2, 3)
pure val photoValues = Set(0, 5)
```

## Story: Take a photo for Alpha

> As the owner, I want Alpha to take a photo only after I see what it will
> capture and approve it, at most once per request, and to be told honestly
> when it is not sure the photo was taken.

### The agent asks for one photo at a time, and the owner is shown the request over the viewfinder

```quint
pure def canAsk(s: Capture, by: Actor): bool = by == Agent and not(open(s)) and s.stage != Shooting

pure def ask(s: Capture, by: Actor): Capture =
  val n = s.request + 1
  { stage: Asked, request: n, approval: V::present(V::revise(s.approval)), shot: A::plan(n), shutters: 0, result: Pending, photo: 0 }
```

### A change to the viewfinder before approval voids what was shown until it is shown again

The lens flips, the zoom changes or Ask Alpha covers it: the owner approves
only what is on screen.

```quint
pure def canViewChanged(s: Capture, by: Actor): bool = by == Phone and s.stage == Asked

pure def viewChanged(s: Capture, by: Actor): Capture = { ...s, approval: V::revise(s.approval) }

pure def canReshown(s: Capture, by: Actor): bool = by == Phone and s.stage == Asked and not(V::canConfirm(s.approval))

pure def reshown(s: Capture, by: Actor): Capture = { ...s, approval: V::present(s.approval) }
```

### Only the owner approves, and only the viewfinder as shown

```quint
pure def canApprove(s: Capture, by: Actor): bool = by == Owner and s.stage == Asked and V::canConfirm(s.approval)

pure def approve(s: Capture, by: Actor): Capture = { ...s, stage: Approved, approval: V::confirm(s.approval) }

pure def canDecline(s: Capture, by: Actor): bool = by == Owner and s.stage == Asked

pure def decline(s: Capture, by: Actor): Capture = failing(Declined, s)
```

### The agent withdrawing, or Camera being left, ends a request not yet shot, with no photo

```quint
pure def canWithdraw(s: Capture, by: Actor): bool = (by == Agent or by == Phone) and open(s)

pure def withdraw(s: Capture, by: Actor): Capture = failing(Failed, s)
```

### The shutter fires once, after approval, over a ready, uncovered viewfinder, not recording, not a protected screen

Right before it fires, the phone says what Camera shows. The lock screen is a
protected screen.

```quint
pure def clearView(ready: bool, covered: bool, recording: bool, sensitive: bool): bool =
  ready and not(covered) and not(recording) and not(sensitive)

pure def canShoot(s: Capture, ready: bool, covered: bool, recording: bool, sensitive: bool, by: Actor): bool =
  by == Phone and s.stage == Approved and s.shutters == 0 and A::canRecord(s.shot) and clearView(ready, covered, recording, sensitive)

pure def shoot(s: Capture, ready: bool, covered: bool, recording: bool, sensitive: bool, by: Actor): Fired =
  { state: { ...s, stage: Shooting, shot: A::dispatch(A::record(s.shot)), shutters: 1 }, out: List(Shoot({ request: s.request })) }
```

### An approved request over a camera that is not clear fails without a shutter

```quint
pure def canBlocked(s: Capture, ready: bool, covered: bool, recording: bool, sensitive: bool, by: Actor): bool =
  by == Phone and s.stage == Approved and not(clearView(ready, covered, recording, sensitive))

pure def blocked(s: Capture, ready: bool, covered: bool, recording: bool, sensitive: bool, by: Actor): Capture = failing(Failed, s)
```

### A capture is taken only when the phone saved a photo it names; any other answer after the shutter is uncertain

```quint
pure def canCaptured(s: Capture, request: int, by: Actor): bool = by == Phone and s.stage == Shooting and A::canConclude(s.shot, request)

pure def captured(s: Capture, request: int, photo: int, by: Actor): Capture =
  val shot = A::conclude(s.shot, true, photo > 0)
  { ...s, stage: Done, shot: shot, result: if (photo > 0) Taken else Uncertain, photo: if (photo > 0) photo else 0 }
```

### At most one shutter fires for a request, and only after the owner approved it

```quint
pure def stepOneShutterPerRequest(before: Capture, via: str, after: Capture, out: List[Effect]): bool =
  after.shutters <= 1
    and out.every(e => match e {
      | Shoot(t) => via == "shoot" and before.stage == Approved and before.shutters == 0 and t.request == before.request
    })
    and ((after.request == before.request and after.shutters > before.shutters) implies via == "shoot")
```

### An approval is the owner's

```quint
pure def stepOnlyTheOwnerApproves(before: Capture, via: str, after: Capture): bool =
  (after.stage == Approved and before.stage != Approved) implies via == "approve"
```

### A failed or declined request fired no shutter; an uncertain one fired exactly one and is never shot again; a taken one names its photo

```quint
pure def alwaysResultsAreHonest(s: Capture): bool =
  s.shutters >= 0 and s.shutters <= 1
    and ((s.result == Failed or s.result == Declined) implies s.shutters == 0)
    and (s.result == Uncertain implies (s.shutters == 1 and s.stage == Done and s.shot.outcome == A::Unknown and s.photo == 0))
    and (s.result == Taken implies (s.shutters == 1 and s.stage == Done and s.shot.outcome == A::Confirmed and s.photo > 0))
    and ((s.stage == Asked or s.stage == Approved) implies (s.shutters == 0 and s.result == Pending and A::canRecord(s.shot)))
    and (s.stage == Shooting implies (s.shutters == 1 and s.shot.outcome == A::Sent and s.shot.id == s.request))
    and (open(s) implies s.shot.id == s.request)
```

### An approved request is shot or fails

If the phone reports what Camera shows, an approved request never waits for
ever.

```quint
pure def leadsToApprovedEnds(s: Capture, later: Capture): bool = s.stage == Approved implies later.stage != Approved

pure val fair_shoot = "weak"
```

### A request can wait for the owner

```quint
pure def sometimesAsked(s: Capture): bool = s.stage == Asked and V::canConfirm(s.approval) and s.request >= 2
```

### A photo can be taken for Alpha

```quint
pure def sometimesTaken(s: Capture): bool = s.result == Taken
```

### A capture can be uncertain

```quint
pure def sometimesUncertain(s: Capture): bool = s.result == Uncertain
```

### An approved request can fail before the shutter

```quint
pure def sometimesBlocked(s: Capture): bool = s.result == Failed and s.shot.outcome == A::Planned and s.request > 0
```

### The owner can decline

```quint
pure def sometimesDeclined(s: Capture): bool = s.result == Declined
```
