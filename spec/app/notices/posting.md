# Posting

Alpha's own notices: an approval waiting, a result from the cloud, a source
that needs renewing. Each is one delivery, queued under its identity,
posted once, never after its tap was spent, and acknowledged to whoever
asked for it once. A delivery is one use of the kit's
[attempt](../../kit/attempt.md). Tapping it is a [notice tap](./index.md),
whose spend closes the delivery. A reminder's notification is not one of
these: Android rings it at its time, from the [reminder](./reminders.md)'s
own record. Android's notification permission is the kit's
[permission](../../kit/permission.md), asked for by settings; whether it
and the notice's channel allow posting, and who is signed in, arrive as
event parameters.

## Story: Be told by Alpha's own notices

> As the owner, I want each thing Alpha has to tell me to reach me as one
> notice, never twice, and never after I already acted on it.

### Posting holds each delivery under its identity, and what a restart left to check; a delivery has its attempt, the owner it is for, whether it was closed by its tap being spent or by being withdrawn, whether notifications kept it from showing, and whether its publisher was told

```quint
import attempt as A from "../../kit/attempt"

type Act = Post | CheckPosted | Withdraw | Acknowledge | CannotShow
type Effect = { act: Act, number: int }
type Delivery = { attempt: A::Attempt, owner: int, closed: bool, blocked: bool, acknowledged: bool }
type Posting = { deliveries: int -> Delivery, ids: Set[int], interrupted: Set[int] }
type Posted = { state: Posting, out: List[Effect] }

pure val unqueued: Delivery = { attempt: A::plan(0), owner: 0, closed: false, blocked: false, acknowledged: false }

pure val initial: Posting = { deliveries: Map(), ids: Set(), interrupted: Set() }

pure def held(p: Posting, id: int): Delivery =
  if (not(p.ids.contains(id))) unqueued else if (p.deliveries.keys().contains(id)) p.deliveries.get(id) else unqueued

pure def filed(id: int, p: Posting, d: Delivery): Posting = { ...p, deliveries: p.deliveries.put(id, d) }

pure def told(id: int, p: Posting, d: Delivery, act: Act): Posted = { state: filed(id, p, d), out: List({ act: act, number: id }) }

pure val idValues = Set(1, 2)
pure val signedInValues = Set(1, 2)
pure val weight_post = 3
pure val weight_posted = 3
```

### A delivery is queued once, under its identity, for the owner signed in

A restart never queues it again.

```quint
pure def canQueue(p: Posting, id: int, signedIn: int): bool = not(p.ids.contains(id)) and id > 0 and signedIn > 0

pure def queue(p: Posting, id: int, signedIn: int): Posting =
  { ...filed(id, p, { ...unqueued, attempt: A::record(A::plan(id)), owner: signedIn }), ids: p.ids.union(Set(id)) }
```

### A queued delivery is posted only while Android allows notifications and its channel is on, for its owner signed in, and never after its tap was spent

```quint
pure def canPost(p: Posting, id: int, notifications: bool, channel: bool, signedIn: int): bool =
  A::canDispatch(held(p, id).attempt) and notifications and channel and signedIn == held(p, id).owner and not(held(p, id).closed)
    and not(p.interrupted.contains(id))

pure def post(p: Posting, id: int, notifications: bool, channel: bool, signedIn: int): Posted =
  told(id, p, { ...held(p, id), attempt: A::dispatch(held(p, id).attempt), blocked: false }, Post)

pure def lawPostingNeedsNotificationsAndTheChannel(p: Posting, id: int, signedIn: int): bool =
  not(canPost(p, id, false, true, signedIn)) and not(canPost(p, id, true, false, signedIn))
```

### A queued delivery that notifications or its channel keep from showing is reported to its publisher once, and still posted once they allow it

```quint
pure def canBlock(p: Posting, id: int, notifications: bool, channel: bool): bool =
  A::canDispatch(held(p, id).attempt) and not(held(p, id).closed) and not(held(p, id).blocked) and not(notifications and channel)

pure def block(p: Posting, id: int, notifications: bool, channel: bool): Posted = told(id, p, { ...held(p, id), blocked: true }, CannotShow)
```

### Android answers the post: shown, refused, or unknown when the answer is lost

```quint
pure def canPosted(p: Posting, id: int): bool = A::canConclude(held(p, id).attempt, id)

pure def posted(p: Posting, id: int, shown: bool, known: bool): Posting =
  filed(id, p, { ...held(p, id), attempt: A::conclude(held(p, id).attempt, shown, known) })
```

### A refused post is tried again under the same identity

```quint
pure def canRetry(p: Posting, id: int): bool = held(p, id).attempt.outcome == A::Refused and not(held(p, id).closed)

pure def retry(p: Posting, id: int): Posting = filed(id, p, { ...held(p, id), attempt: A::record(held(p, id).attempt) })
```

### When the owner's tap on it is spent, nothing is posted after that

The spend is the [notice tap](./index.md)'s; this only closes the delivery.

```quint
pure def canSpent(p: Posting, id: int): bool = p.ids.contains(id) and not(held(p, id).closed)

pure def spent(p: Posting, id: int): Posting = filed(id, p, { ...held(p, id), closed: true })
```

### Whoever asked for the notice is told once that it was shown, acted on, or cannot be known

```quint
pure def ended(d: Delivery): bool = d.closed or d.attempt.outcome == A::Confirmed or d.attempt.outcome == A::Unknown

pure def canAcknowledge(p: Posting, id: int): bool = p.ids.contains(id) and ended(held(p, id)) and not(held(p, id).acknowledged)

pure def acknowledge(p: Posting, id: int): Posted = told(id, p, { ...held(p, id), acknowledged: true }, Acknowledge)
```

### A notice is posted once under its identity, only while queued, and never after its tap was spent; its publisher is told once, and that it cannot show once

```quint
pure def stepPostedOnceUnderItsIdentity(before: Posting, via: str, after: Posting, out: List[Effect]): bool =
  out.length() <= 1
    and out.every(e => after.ids.contains(e.number)
      and (e.act == Post implies (via == "post" and held(before, e.number).attempt.outcome == A::Recorded and not(held(before, e.number).closed)))
      and (e.act == Acknowledge implies not(held(before, e.number).acknowledged))
      and (e.act == CannotShow implies not(held(before, e.number).blocked)))
    and before.ids.forall(i => held(after, i).attempt.id == held(before, i).attempt.id
      and (held(before, i).acknowledged implies held(after, i).acknowledged)
      and (held(before, i).closed implies held(after, i).closed))
```

### A queued delivery has its identity and owner, it is kept from showing only while queued, and its publisher is told only once it ended

```quint
pure def whole(i: int, d: Delivery): bool =
  i > 0 and d.attempt.id == i and d.owner > 0
    and (d.blocked implies (d.attempt.outcome == A::Recorded or d.attempt.outcome == A::Refused))
    and (d.acknowledged implies ended(d))

pure def alwaysADeliveryIsTheOwners(p: Posting): bool =
  p.ids.forall(i => whole(i, held(p, i))) and p.interrupted.forall(i => p.ids.contains(i))
```

### A queued delivery is posted or reported as kept from showing, and a posted one is answered

If the phone posts when it may, reports when it may not, and Android
answers, a delivery does not stay queued or unanswered without its
publisher knowing.

```quint
pure def leadsToAQueuedDeliveryIsPostedOrReported(p: Posting, later: Posting): bool =
  p.ids.forall(i => (held(p, i).attempt.outcome == A::Recorded or held(p, i).attempt.outcome == A::Sent) implies
    ((held(later, i).attempt.outcome != A::Recorded and held(later, i).attempt.outcome != A::Sent) or held(later, i).closed or held(later, i).blocked))

pure val fair_post = "weak"
pure val fair_posted = "weak"
pure val fair_block = "weak"
pure val fair_check = "weak"
```

### A notice can be shown, kept from showing, refused, unknown, acted on before it was posted, and acknowledged

```quint
pure def sometimesShown(p: Posting): bool = p.ids.exists(i => held(p, i).attempt.outcome == A::Confirmed)

pure def sometimesKeptFromShowing(p: Posting): bool = p.ids.exists(i => held(p, i).blocked)

pure def sometimesRefused(p: Posting): bool = p.ids.exists(i => held(p, i).attempt.outcome == A::Refused)

pure def sometimesUnknown(p: Posting): bool = p.ids.exists(i => held(p, i).attempt.outcome == A::Unknown)

pure def sometimesSpentBeforePosting(p: Posting): bool = p.ids.exists(i => held(p, i).closed and held(p, i).attempt.outcome == A::Recorded)

pure def sometimesAcknowledged(p: Posting): bool = p.ids.exists(i => held(p, i).acknowledged)
```

## Story: Change owner or restart with a notice out

> As the owner, I want Alpha's notices to be mine alone, and a restart
> never to post one twice.

### Another owner signing in withdraws each notice shown for the owner before, and closes it

```quint
pure def canConceal(p: Posting, id: int, signedIn: int): bool =
  held(p, id).attempt.outcome == A::Confirmed and signedIn != held(p, id).owner and not(held(p, id).closed)

pure def conceal(p: Posting, id: int, signedIn: int): Posted = told(id, p, { ...held(p, id), closed: true }, Withdraw)
```

### After a restart Alpha asks Android once whether each notice being posted was shown, and posts nothing until it has

The answer comes back as Android's answer to the post does.

```quint
pure def canRestart(p: Posting): bool = p.ids.size() > 0

pure def restart(p: Posting): Posting = { ...p, interrupted: p.ids }

pure def canCheck(p: Posting, id: int): bool = p.interrupted.contains(id)

pure def check(p: Posting, id: int): Posted =
  { state: { ...p, interrupted: p.interrupted.exclude(Set(id)) },
    out: if (held(p, id).attempt.outcome == A::Sent) List({ act: CheckPosted, number: id }) else List() }
```

### Android is asked about a notice only once after each restart

```quint
pure def stepCheckedOnceAfterARestart(before: Posting, via: str, after: Posting, out: List[Effect]): bool =
  (out.some(e => e.act == CheckPosted) implies (via == "check" and after.interrupted.subseteq(before.interrupted) and not(before.interrupted.subseteq(after.interrupted))))
    and (after.interrupted.subseteq(before.interrupted) or via == "restart")
```
