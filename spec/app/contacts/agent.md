# Agent requests

What the agent may ask of the phone: a call, or a contact added, changed or
deleted. The agent names a number or a contact by search text; the search
runs on the phone and the agent never receives the address book. The owner
sees the exact number, or the contact before and after, on the phone and
approves each request; nothing happens without that. A call the owner
approves is handed to the phone's dialer, as in [Phone](../phone/); a contact
change is written as in [Contacts](./). The agent is told only how its
request ended.

## Domain

### Who sends an event

The owner, the agent, and the phone answering what Alpha asked of it.

```quint
type Actor = Owner | Agent | Device
```

### What a request holds

One request at a time: what was asked, how far it got, how many contacts
the search found, whether the number is an emergency number, the search,
the review shown to the owner, the action taken and how the request ended.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"

type Ask = Dial | AddContact | ChangeContact | DeleteContact
type Stage = Quiet | Looking | Choosing | Shown | Acting | Ended
type Ending = Done | Declined | Withdrawn | NotFound | Unavailable | EmergencyRefused | NotDone | Unsure
type Request = {
  stage: Stage, ask: Ask, matches: int, emergency: bool,
  lookup: R::Read, review: V::Review, attempt: A::Attempt, ending: Ending,
}

pure val initial: Request = {
  stage: Quiet, ask: Dial, matches: 0, emergency: false,
  lookup: R::unread, review: V::unreviewed, attempt: A::plan(0), ending: Done,
}
```

### What a request asks of the phone and tells the agent

A search of the contacts on the phone, the approved action under its
number (a handoff to the dialer, or one write naming the version of the
contact the owner was shown), and the agent's answer.

```quint
type Effect =
  | Search({ ticket: int })
  | Act({ id: int, ask: Ask })
  | Answer({ ending: Ending })

type Moved = { state: Request, out: List[Effect] }

pure def told(ending: Ending): List[Effect] = List(Answer({ ending: ending }))

pure def acting(id: int, ask: Ask): List[Effect] = List(Act({ id: id, ask: ask }))

pure def acts(out: List[Effect]): bool = out.some(e => match e { | Act(a) => true | _ => false })
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2)
pure val idValues = Set(1, 2, 3)
pure val matchesValues = Set(-1, 0, 1, 2)
pure val weight_found = 3
pure val weight_approve = 3
```

## Story: Let the agent ask for a call or a contact change

> As the owner, I want the agent to ask for a call or a change to my
> contacts by name, have the contact found on my phone, and see exactly
> what it would do.

### Only the agent asks, and only when no other request is open

A call to a number, and a new contact, are shown at once. A call to a
contact, and a change or deletion, first search the contacts on the phone.
A call to an emergency number is refused at once, with the reason.

```quint
pure def open(r: Request): bool = r.stage != Quiet and r.stage != Ended

pure def finish(ending: Ending, r: Request): Moved =
  { state: { ...r, stage: Ended, ending: ending }, out: told(ending) }

pure def anew(v: V::Review): V::Review = V::present(V::revise(v))

pure def canAsked(r: Request, ask: Ask, byName: bool, emergency: bool, by: Actor): bool = by == Agent and not(open(r))

pure def asked(r: Request, ask: Ask, byName: bool, emergency: bool, by: Actor): Moved =
  val fresh = { ...r, ask: ask, matches: 0, emergency: ask == Dial and emergency and not(byName) }
  val lookup = R::ask(r.lookup)
  if (fresh.emergency) finish(EmergencyRefused, fresh)
  else if (ask == AddContact or (ask == Dial and not(byName))) { state: { ...fresh, stage: Shown, matches: 1, review: anew(r.review) }, out: List() }
  else { state: { ...fresh, stage: Looking, lookup: lookup }, out: List(Search({ ticket: lookup.ticket })) }
```

### Only the phone answers the newest search, and the request goes on by how many contacts it found

None ends the request; one is shown; several are offered for the owner to
choose. A call to a found contact whose number is an emergency number is
refused with the reason.

```quint
pure def canFound(r: Request, ticket: int, matches: int, by: Actor): bool =
  by == Device and r.stage == Looking and R::canAnswer(r.lookup, ticket) and matches >= 0

pure def found(r: Request, ticket: int, ok: bool, matches: int, emergency: bool, by: Actor): Moved =
  val searched = { ...r, lookup: R::answer(r.lookup, ok), matches: matches, emergency: ok and r.ask == Dial and emergency and matches == 1 }
  if (not(ok)) finish(Unavailable, searched)
  else if (matches == 0) finish(NotFound, searched)
  else if (searched.emergency) finish(EmergencyRefused, searched)
  else if (matches == 1) { state: { ...searched, stage: Shown, review: anew(r.review) }, out: List() }
  else { state: { ...searched, stage: Choosing }, out: List() }
```

### The owner chooses one of several contacts, and that one is shown

```quint
pure def canChoose(r: Request, emergency: bool, by: Actor): bool = by == Owner and r.stage == Choosing

pure def choose(r: Request, emergency: bool, by: Actor): Moved =
  val chosen = { ...r, emergency: r.ask == Dial and emergency }
  if (chosen.emergency) finish(EmergencyRefused, chosen) else { state: { ...chosen, stage: Shown, matches: 1, review: anew(r.review) }, out: List() }
```

### A request is shown only for exactly one number or contact, and several are only offered

```quint
pure def alwaysOnlyOneIsShown(r: Request): bool =
  ((r.stage == Shown or r.stage == Acting) implies r.matches == 1)
    and (r.stage == Choosing implies r.matches >= 2)
    and ((r.stage == Shown) == r.review.showing)
```

### A request can be shown, offered as a choice, find nothing, or fail to search

```quint
pure def sometimesChoosing(r: Request): bool = r.stage == Choosing and r.ask == ChangeContact
pure def sometimesShownCall(r: Request): bool = r.stage == Shown and r.ask == Dial and r.lookup.status == R::Loaded
pure def sometimesNotFound(r: Request): bool = r.stage == Ended and r.ending == NotFound
pure def sometimesUnavailable(r: Request): bool = r.stage == Ended and r.ending == Unavailable
```

## Story: Approve what the agent asked

> As the owner, I want nothing to happen until I approve exactly what I was
> shown, and never a call to an emergency number by the agent.

### The contact can change on the phone while it is shown, and then the owner sees it again before approving

```quint
pure def canChanged(r: Request, by: Actor): bool = by == Device and r.stage == Shown

pure def changed(r: Request, by: Actor): Request = { ...r, review: V::revise(r.review) }

pure def canShowAgain(r: Request, by: Actor): bool = by == Owner and r.stage == Shown and not(V::canConfirm(r.review))

pure def showAgain(r: Request, by: Actor): Request = { ...r, review: V::present(r.review) }
```

### Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call

`clear` is Phone's fact that no call which may be an emergency call is
live. Approving acts once, under the next number.

```quint
pure def canApprove(r: Request, clear: bool, by: Actor): bool =
  by == Owner and r.stage == Shown and V::canConfirm(r.review) and clear

pure def approve(r: Request, clear: bool, by: Actor): Moved =
  val attempt = A::dispatch(A::record(A::plan(r.attempt.id + 1)))
  { state: { ...r, stage: Acting, review: V::confirm(r.review), attempt: attempt }, out: acting(attempt.id, r.ask) }
```

### The owner can decline, and a review Alpha stops showing is withdrawn

```quint
pure def canDecline(r: Request, by: Actor): bool = by == Owner and (r.stage == Choosing or r.stage == Shown)

pure def decline(r: Request, by: Actor): Moved = finish(Declined, { ...r, review: V::dismiss(r.review) })

pure def canWithdraw(r: Request, by: Actor): bool = by == Device and (r.stage == Looking or r.stage == Choosing or r.stage == Shown)

pure def withdraw(r: Request, by: Actor): Moved = finish(Withdrawn, { ...r, review: V::dismiss(r.review) })
```

### Nothing is done but what the owner approved, as it was shown, once

```quint
pure def stepOnlyApprovedRequestsAct(before: Request, via: str, after: Request, out: List[Effect]): bool =
  acts(out) implies (via == "approve" and before.stage == Shown and V::canConfirm(before.review)
    and out == acting(before.attempt.id + 1, before.ask))
```

### The agent never calls an emergency number, and is told why

```quint
pure def alwaysNoEmergencyCallByTheAgent(r: Request): bool =
  (r.emergency implies r.ask == Dial) and (r.emergency iff (r.stage == Ended and r.ending == EmergencyRefused))

pure def stepTheRefusalIsExplained(before: Request, via: str, after: Request, out: List[Effect]): bool =
  (after.stage == Ended and before.stage != Ended) implies out == told(after.ending)
```

### An action is in hand only after an approval, and its number is never reused

```quint
pure def alwaysTheActionIsWellFormed(r: Request): bool =
  r.attempt.id >= 0 and r.attempt.outcome != A::Recorded
    and (r.attempt.id == 0 implies r.attempt.outcome == A::Planned)
    and (r.stage == Acting implies r.attempt.outcome == A::Sent)
    and (r.attempt.outcome == A::Sent implies r.stage == Acting)
```

### A request can be approved, declined, refused as an emergency call, or seen again after a change

```quint
pure def sometimesChangedWhileShown(r: Request): bool = r.stage == Shown and not(V::canConfirm(r.review))
pure def sometimesActing(r: Request): bool = r.stage == Acting and r.ask == DeleteContact
pure def sometimesDeclined(r: Request): bool = r.ending == Declined and r.matches >= 2
pure def sometimesEmergencyRefused(r: Request): bool = r.ending == EmergencyRefused and r.lookup.status == R::Loaded
```

## Story: Learn how the request ended

> As the owner, I want the agent told whether what I approved happened, and
> never to have it done twice when Alpha cannot tell.

### Only the phone answers the action, and the request ends as that answer says

A call whose answer was lost, or a write whose answer was lost, ends as
unknown and is never repeated by this request.

```quint
pure def canActed(r: Request, id: int, by: Actor): bool = by == Device and r.stage == Acting and A::canConclude(r.attempt, id)

pure def acted(r: Request, id: int, done: bool, known: bool, by: Actor): Moved =
  val attempt = A::conclude(r.attempt, done, known)
  finish(if (attempt.outcome == A::Confirmed) Done else if (attempt.outcome == A::Refused) NotDone else Unsure, { ...r, attempt: attempt })

pure def canAnswerLost(r: Request, by: Actor): bool = by == Device and r.stage == Acting and r.attempt.outcome == A::Sent

pure def answerLost(r: Request, by: Actor): Moved = acted(r, r.attempt.id, false, false, by)
```

### An approved action ends

It ends with the phone's answer, or as unknown when Alpha stops waiting
for one.

```quint
pure def leadsToAnActionEnds(r: Request, later: Request): bool = r.stage == Acting implies later.stage == Ended

pure val fair_acted = "weak"
pure val fair_answerLost = "weak"
```

### A request can end done, failed or unknown

```quint
pure def sometimesDone(r: Request): bool = r.ending == Done and r.ask == Dial
pure def sometimesUnknown(r: Request): bool = r.ending == Unsure and r.ask == ChangeContact
```
