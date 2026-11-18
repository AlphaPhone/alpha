# Operations

What the owner changes in Gmail from Inbox: sending a
[draft](./drafts.md), archiving, moving to Trash, deleting a draft saved
in Gmail, and marking read or unread. Each but marking is one kit
[attempt](../../kit/attempt.md) on the account it names: recorded on the
phone before its one request goes out, and ending confirmed, refused or
unknown. Sending and deleting are first [reviewed](../../kit/review.md);
archive and Trash are held for an [undo](../../kit/undo.md) window
instead. What Alpha may change itself is [its own](./agent.md).

What is reviewed comes with each event as its revision: the draft's for
a send or a deletion, the [list](./index.md)'s for messages chosen from
it. The shell passes the grant of the account an event names as the list
holds it, tells every change to a grant, to the Settings switch for
sending, and to the cloud session, and passes the time as `now`. It tells
the composer when a draft is handed to a send and when that send went,
and the list when messages are set aside, restored or changed.

## Story: Send a draft I reviewed

> As the owner, I want to see the recipients, subject and attachments of
> what will be sent and confirm it, to have exactly that sent once, from
> the account I chose, and to be told honestly when Alpha cannot know
> whether it went.

### An operation names what it does, on which account, to which draft or messages, and keeps its review, its attempt and its undo window

What Inbox remembers beyond the operation in hand is which drafts were
sent, which sends are unknown, and which messages were marked read on
opening.

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import undo as U from "../../kit/undo"
import read as R from "../../kit/read"
import access.* from "./access"

type Kind = Send | Archive | Trash | DeleteDraft
type Doubt = { attempt: int, account: int, revision: int, gmail: int }
type Operations = {
  kind: Kind, account: int, target: int, count: int, gmail: int, standing: Grant, sendingOn: bool,
  review: V::Review, addressed: bool, again: bool, changed: bool,
  attempt: A::Attempt, attempts: int, undo: U::Undo, clock: int, approvedBy: Actor,
  confirmations: int, requests: int, noticed: bool,
  sentDrafts: Set[int], doubtful: Set[int], doubts: int -> Doubt, checked: Set[int], check: R::Read, checking: int,
  autoRead: Set[int],
}

type Effect =
  | Request({ attempt: int, kind: Kind, account: int, target: int, count: int, revision: int, gmail: int })
  | HandOver({ draft: int, attempt: int })
  | Cleanup({ draft: int, attempt: int, revision: int })
  | ReadSent({ ticket: int, draft: int, account: int, attempt: int })
  | MarkMessage({ account: int, message: int, unread: bool })
type Done = { state: Operations, out: List[Effect] }

pure val window = 10

pure val initial: Operations = {
  kind: Send, account: 0, target: 0, count: 0, gmail: 0, standing: noAccess, sendingOn: false,
  review: V::unreviewed, addressed: false, again: false, changed: false,
  attempt: A::plan(0), attempts: 0, undo: U::free, clock: 0, approvedBy: World,
  confirmations: 0, requests: 0, noticed: true,
  sentDrafts: Set(), doubtful: Set(), doubts: Map(), checked: Set(), check: R::unread, checking: 0,
  autoRead: Set(),
}

pure val targetValues = Set(1, 2)
pure val countValues = Set(1, 3)
pure val revisionValues = Set(0, 1, 2)
pure val nowValues = Set(0, 5, 10, 20)
pure val attemptValues = Set(1, 2, 3, 4, 5, 6)
pure val messageValues = Set(0, 1)
pure val gmailValues = Set(0, 1)
pure val draftValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
```

### Sending needs the account's consent to send, and every other operation its consent to change the mailbox

```quint
pure def needs(kind: Kind): Deed = if (kind == Send) Sending else Changing

pure def holdable(kind: Kind): bool = kind == Archive or kind == Trash

pure def stopped(s: Operations): bool = s.attempt.outcome == A::Recorded and s.undo.holding == U::Undone

pure def ongoing(s: Operations): bool =
  s.attempt.outcome == A::Sent or (s.attempt.outcome == A::Recorded and s.undo.holding != U::Undone)

pure def doubtOf(s: Operations, draft: int): Doubt =
  if (s.doubts.keys().contains(draft)) s.doubts.get(draft) else { attempt: 0, account: 0, revision: 0, gmail: 0 }
```

### A send or a deletion is shown for review as the draft is, on the account it is from, while nothing else is under way and no unknown outcome is unseen

Archive and Trash of chosen messages are shown the same way. A send and a
deletion are of one draft, shown only once it is wholly kept on the phone,
so that the revision shown names the same text after a restart. A send of
a draft saved in Gmail sends that Gmail draft, and Gmail removes its copy
as it sends it; a deletion names its Gmail draft. A send with
no recipient, or with an address Gmail does not accept, is shown asking
for one and cannot be confirmed. A draft already sent, or whose send is
unknown, is shown again only when the owner chose to send it again
knowing it may already have gone.

```quint
pure def canPrepare(s: Operations, kind: Kind, access: Access, target: int, count: int, gmail: int, kept: bool, again: bool): bool =
  ((kind == Send or kind == DeleteDraft) implies kept) and not(ongoing(s)) and (s.noticed or s.attempt.outcome != A::Unknown) and target != 0 and count >= 1
    and ((kind == Send or kind == DeleteDraft) implies count == 1) and (kind == DeleteDraft implies gmail != 0)
    and allowsFor(access, access.account, needs(kind)) and not(kind == Send and s.checking == target)
    and ((kind == Send and (s.sentDrafts.contains(target) or s.doubtful.contains(target))) implies again)

pure def prepare(s: Operations, kind: Kind, access: Access, target: int, count: int, revision: int, gmail: int, kept: bool, addressed: bool, again: bool): Operations = {
  ...s, kind: kind, account: access.account, target: target, count: count, gmail: gmail, standing: access.grant,
  review: V::present({ showing: false, revision: revision, shown: 0 }), addressed: addressed, again: again,
  changed: false, attempt: A::plan(s.attempts + 1), attempts: s.attempts + 1, undo: U::free,
  approvedBy: World, confirmations: 0, requests: 0, noticed: true,
}
```

### A change to what is under review, or to a send or deletion recorded and not yet sent, stops it and says it must be looked at again

The draft changed: review it again. The emails changed: select them
again.

```quint
pure def canOutdated(s: Operations, revision: int): bool =
  revision != s.review.shown and (
    s.review.showing
      or (s.attempt.outcome == A::Recorded and s.undo.holding != U::Undone and (s.kind == Send or s.kind == DeleteDraft))
  )

pure def outdated(s: Operations, revision: int): Operations = {
  ...s, review: V::dismiss({ ...s.review, revision: revision }), changed: true,
  undo: if (s.attempt.outcome == A::Recorded) U::undo(s.undo) else s.undo,
}

pure def canReviewAgain(s: Operations, revision: int, kept: bool): bool =
  s.attempt.id != 0 and A::canRecord(s.attempt) and not(s.review.showing) and ((s.kind == Send or s.kind == DeleteDraft) implies kept)

pure def reviewAgain(s: Operations, revision: int, kept: bool, addressed: bool): Operations =
  { ...s, review: V::present({ ...s.review, revision: revision }), addressed: addressed, changed: false }

pure def canCancel(s: Operations): bool = s.review.showing

pure def cancel(s: Operations): Operations = { ...s, review: V::dismiss(s.review) }
```

### Only the owner confirms, only the review of the draft as it is now, while the account's grant allows it and, for a send, it has a valid recipient and sending is on in Settings

Confirming records the operation on the phone and hands a send to its
draft; archive and Trash are then held for the undo window.

```quint
pure def canConfirm(s: Operations, revision: int, now: int, by: Actor): bool =
  by == Owner and now >= s.clock and V::canConfirm({ ...s.review, revision: revision }) and A::canRecord(s.attempt)
    and allows(s.standing, needs(s.kind)) and (s.kind == Send implies (s.sendingOn and s.addressed))

pure def confirm(s: Operations, revision: int, now: int, by: Actor): Done = {
  state: {
    ...s, review: V::confirm(s.review), attempt: A::record(s.attempt), confirmations: s.confirmations + 1,
    approvedBy: by, clock: now, undo: if (holdable(s.kind)) U::hold(now, window) else U::free,
  },
  out: if (s.kind == Send) List(HandOver({ draft: s.target, attempt: s.attempt.id })) else List(),
}
```

### A recorded operation sends its one request, for its own account and exactly what was reviewed, while the grant and the Settings switch still allow it; archive and Trash once the undo window has passed

```quint
pure def canDispatchNow(s: Operations, revision: int, now: int): bool =
  A::canDispatch(s.attempt) and s.undo.holding != U::Undone and now >= s.clock
    and allows(s.standing, needs(s.kind)) and (s.kind == Send implies s.sendingOn)
    and ((s.kind == Send or s.kind == DeleteDraft) implies revision == s.review.shown)
    and (holdable(s.kind) implies U::canRelease(s.undo, now))

pure def dispatchNow(s: Operations, revision: int, now: int): Done = {
  state: {
    ...s, attempt: A::dispatch(s.attempt), requests: s.requests + 1, clock: now,
    undo: if (holdable(s.kind)) U::release(s.undo) else s.undo,
  },
  out: List(Request({
    attempt: s.attempt.id, kind: s.kind, account: s.account, target: s.target, count: s.count,
    revision: s.review.shown, gmail: s.gmail,
  })),
}
```

### Each request follows the owner's confirmation of it, and carries the operation as recorded, for its account

```quint
pure def alwaysEachRequestHasItsConfirmation(s: Operations): bool =
  s.requests >= 0 and s.requests + (if (s.attempt.outcome == A::Recorded) 1 else 0) <= s.confirmations
    and (s.confirmations >= 1 implies s.approvedBy == Owner)

pure def stepARequestIsTheOperationRecorded(before: Operations, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | Request(r) =>
      before.attempt.outcome == A::Recorded and after.attempt.outcome == A::Sent and r.attempt == before.attempt.id
        and r.kind == before.kind and r.account == before.account and r.target == before.target
        and r.count == before.count and r.revision == before.review.shown and r.gmail == before.gmail
        and allows(before.standing, needs(r.kind)) and (r.kind == Send implies before.sendingOn)
        and before.approvedBy == Owner
    | _ => true
  })
```

### Changing the account selected in the list never re-targets an operation

```quint
pure def stepAnOperationKeepsItsAccount(before: Operations, after: Operations): bool =
  (after.attempt.id == before.attempt.id) implies (after.account == before.account and after.target == before.target)
```

### A recorded operation still to go has its grant, and for a send, sending on

Losing the grant, switching sending off, or a new session stops it; a
request already sent is never disowned.

```quint
pure def alwaysWhatIsStillToGoIsAllowed(s: Operations): bool =
  (s.attempt.outcome == A::Recorded and s.undo.holding != U::Undone) implies
    (allows(s.standing, needs(s.kind)) and (s.kind == Send implies s.sendingOn))

pure def accessChanged(s: Operations, access: Access): Operations =
  if (access.account != s.account) s
  else if (allows(access.grant, needs(s.kind))) { ...s, standing: access.grant }
  else {
    ...s, standing: access.grant, review: V::dismiss(s.review),
    undo: if (s.attempt.outcome == A::Recorded) U::undo(s.undo) else s.undo,
  }

pure def sendingChanged(s: Operations, allowed: bool): Operations =
  if (allowed or s.kind != Send) { ...s, sendingOn: allowed }
  else {
    ...s, sendingOn: allowed, review: V::dismiss(s.review),
    undo: if (s.attempt.outcome == A::Recorded) U::undo(s.undo) else s.undo,
  }
```

### The answer to the request in flight ends it; a reply that does not match it, or none, leaves it unknown

A confirmed send lets the composer forget its draft, if it is still as it
was reviewed. An unknown one is remembered for its draft, and its notice
stays until the owner has seen it.

```quint
pure def ending(ended: A::Attempt, s: Operations): Done =
  val sent = s.kind == Send
  {
    state: {
      ...s, attempt: ended, noticed: ended.outcome != A::Unknown,
      sentDrafts: if (sent and ended.outcome == A::Confirmed) s.sentDrafts.union(Set(s.target)) else s.sentDrafts,
      doubtful: if (sent and ended.outcome == A::Unknown) s.doubtful.union(Set(s.target)) else s.doubtful,
      doubts:
        if (sent and ended.outcome == A::Unknown)
          s.doubts.put(s.target, { attempt: ended.id, account: s.account, revision: s.review.shown, gmail: s.gmail })
        else s.doubts,
    },
    out:
      if (sent and ended.outcome == A::Confirmed) List(Cleanup({ draft: s.target, attempt: ended.id, revision: s.review.shown }))
      else List(),
  }

pure def canAnswered(s: Operations, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def answered(s: Operations, attempt: int, done: bool, matches: bool): Done = ending(A::conclude(s.attempt, done, matches), s)

pure def canReplyLost(s: Operations, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def replyLost(s: Operations, attempt: int): Done = ending(A::conclude(s.attempt, false, false), s)

pure def canDismissOutcome(s: Operations): bool = not(s.noticed)

pure def dismissOutcome(s: Operations): Operations = { ...s, noticed: true }

pure def lawAMismatchedReplyIsUnknown(attempt: int, done: bool): bool =
  answered({ ...initial, attempt: { id: attempt, outcome: A::Sent } }, attempt, done, false).state.attempt.outcome == A::Unknown

pure def leadsToARequestEnds(s: Operations, later: Operations): bool =
  s.attempt.outcome == A::Sent implies later.attempt.outcome != A::Sent

pure val fair_answered = "strong"
pure val fair_replyLost = "strong"
```

### An outcome that is unknown or confirmed is never sent again, and a later operation never hides an unknown one the owner has not seen

A refused send can be reviewed and confirmed again, under its own number.

```quint
pure def stepAnEndedOutcomeStays(before: Operations, after: Operations): bool =
  ((before.attempt.outcome == A::Unknown or before.attempt.outcome == A::Confirmed) and after.attempt.id == before.attempt.id)
    implies after.attempt == before.attempt

pure def stepAnUnknownIsNotHidden(before: Operations, after: Operations): bool =
  (after.attempt.id != before.attempt.id) implies (before.attempt.outcome != A::Unknown or before.noticed)
```

### A draft already sent, or whose send is unknown, is never sent again without the owner choosing to

```quint
pure def alwaysASendAgainIsChosen(s: Operations): bool =
  (s.kind == Send and s.attempt.id != 0 and not(A::ended(s.attempt))
    and (s.sentDrafts.contains(s.target) or s.doubtful.contains(s.target))) implies s.again
```

### The draft is cleared only after a fresh confirmation of its send, or a check that found it sent

```quint
pure def stepCleanupFollowsAFreshSuccess(before: Operations, via: str, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | Cleanup(c) =>
      (before.attempt.outcome == A::Sent and after.attempt.outcome == A::Confirmed and before.kind == Send
        and c.draft == before.target and c.revision == before.review.shown and c.attempt == before.attempt.id)
        or (via == "checkedSent" and before.doubtful.contains(c.draft) and not(after.doubtful.contains(c.draft))
          and c.attempt == doubtOf(before, c.draft).attempt and c.revision == doubtOf(before, c.draft).revision)
    | _ => true
  })
```

### A send can be confirmed, can end unknown, a refused send can be reviewed again, and a send can wait for a recipient

```quint
pure def sometimesASendIsConfirmed(s: Operations): bool = s.kind == Send and s.attempt.outcome == A::Confirmed

pure def sometimesASendIsUnknown(s: Operations): bool = s.kind == Send and s.attempt.outcome == A::Unknown and not(s.noticed)

pure def sometimesARefusedSendIsUnderReviewAgain(s: Operations): bool =
  s.kind == Send and s.attempt.outcome == A::Refused and s.review.showing

pure def sometimesTheDraftChangedUnderReview(s: Operations): bool = s.kind == Send and s.changed and s.attempt.outcome == A::Planned

pure def sometimesARecordedSendIsStopped(s: Operations): bool = s.kind == Send and stopped(s)

pure def sometimesASendWaitsForARecipient(s: Operations): bool = s.kind == Send and s.review.showing and not(s.addressed)

pure def sometimesASentDraftIsSentAgainKnowingly(s: Operations): bool =
  s.kind == Send and s.again and s.review.showing and s.sentDrafts.contains(s.target)
```

## Story: Find out whether a send went

> As the owner, I want to check once whether a send Alpha could not
> confirm reached Gmail, rather than send it twice or never know.

### An unknown send is checked once, by reading Gmail's Sent for it, while its account may be read

Found, it counts as sent and its draft is cleared as after a confirmed
send. Not found, it is known not to have gone. If the check fails, it
stays unknown, and only the owner's choice sends it again.

```quint
pure def canCheck(s: Operations, draft: int, access: Access): bool =
  s.doubtful.contains(draft) and not(s.checked.contains(draft)) and s.check.status != R::Loading
    and allowsFor(access, doubtOf(s, draft).account, Reading)

pure def check(s: Operations, draft: int, access: Access): Done =
  val asked = R::ask(s.check)
  {
    state: { ...s, check: asked, checking: draft, checked: s.checked.union(Set(draft)) },
    out: List(ReadSent({ ticket: asked.ticket, draft: draft, account: doubtOf(s, draft).account, attempt: doubtOf(s, draft).attempt })),
  }

pure def canCheckedSent(s: Operations, ticket: int): bool = R::canAnswer(s.check, ticket)

pure def checkedSent(s: Operations, ticket: int, ok: bool, found: bool): Done =
  val told = { ...s, check: R::answer(s.check, ok), checking: 0 }
  val d = doubtOf(s, s.checking)
  if (not(ok)) { state: told, out: List() }
  else {
    state: {
      ...told, doubtful: s.doubtful.exclude(Set(s.checking)),
      sentDrafts: if (found) s.sentDrafts.union(Set(s.checking)) else s.sentDrafts,
    },
    out: if (found) List(Cleanup({ draft: s.checking, attempt: d.attempt, revision: d.revision })) else List(),
  }
```

### Every unknown send has its record, is checked at most once, and one check runs at a time

```quint
pure def alwaysEachUnknownSendIsRecorded(s: Operations): bool =
  s.doubtful.forall(d => d != 0 and doubtOf(s, d).attempt >= 1 and doubtOf(s, d).attempt <= s.attempts)
    and ((s.check.status == R::Loading) iff (s.checking != 0))
    and (s.checking != 0 implies (s.doubtful.contains(s.checking) and s.checked.contains(s.checking)))

pure def stepAnUnknownSendIsCheckedOnce(before: Operations, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadSent(r) => not(before.checked.contains(r.draft)) and after.checked.contains(r.draft) and before.doubtful.contains(r.draft)
    | _ => true
  })

pure def sometimesACheckFoundTheSend(s: Operations): bool = s.checked.exists(d => s.sentDrafts.contains(d))

pure def sometimesACheckFoundNothing(s: Operations): bool =
  s.checked.exists(d => not(s.sentDrafts.contains(d)) and not(s.doubtful.contains(d)))
```

## Story: Archive or trash mail, with Undo

> As the owner, I want archiving and moving to Trash to wait a moment so
> that I can undo them, and messages I chose to be the ones changed.

### Archive and Trash are held for the undo window, and only the owner's Undo before it ends sends nothing

```quint
pure def canUndo(s: Operations, now: int, by: Actor): bool =
  by == Owner and now >= s.clock and holdable(s.kind) and s.attempt.outcome == A::Recorded and U::canUndo(s.undo, now)

pure def undo(s: Operations, now: int, by: Actor): Operations = { ...s, undo: U::undo(s.undo), clock: now }

pure def alwaysAHeldChangeIsRecorded(s: Operations): bool =
  s.undo.holding == U::Held implies (holdable(s.kind) and s.attempt.outcome == A::Recorded and s.undo.until <= s.clock + window)

pure def alwaysAnUndoneChangeWasNeverSent(s: Operations): bool =
  s.undo.holding == U::Undone implies s.attempt.outcome == A::Recorded
```

### Archive and Trash can be undone, and chosen messages can change under review

```quint
pure def sometimesATrashIsUndone(s: Operations): bool = s.kind == Trash and s.undo.holding == U::Undone and not(s.changed)

pure def sometimesAnArchiveIsConfirmed(s: Operations): bool = s.kind == Archive and s.attempt.outcome == A::Confirmed

pure def sometimesChosenMessagesChanged(s: Operations): bool = s.count > 1 and s.changed
```

## Story: Delete a draft from Gmail knowingly

> As the owner, I want to be warned that deleting a draft saved in Gmail is
> permanent before I confirm it.

### A draft in Gmail is deleted only after the owner confirmed the review that says it is permanent

```quint
pure def stepADeletionFollowsTheOwnersConfirmation(before: Operations, via: str, after: Operations): bool =
  (via == "confirm" and before.kind == DeleteDraft) implies (before.review.showing and after.approvedBy == Owner)

pure def sometimesADraftDeletionIsConfirmed(s: Operations): bool = s.kind == DeleteDraft and s.attempt.outcome == A::Confirmed
```

## Story: Mark mail read or unread

> As the owner, I want a message marked read when I open it, once, and to
> mark it read or unread myself, without waiting for anything else.

### Marking needs the account's consent to change the mailbox, and goes out at once, apart from other operations

Marking is a label Gmail sets the same however often it is sent.

```quint
pure def canMark(s: Operations, message: int, access: Access): bool =
  message != 0 and allowsFor(access, access.account, Changing)

pure def mark(s: Operations, message: int, unread: bool, access: Access): Done =
  { state: s, out: List(MarkMessage({ account: access.account, message: message, unread: unread })) }
```

### Opening an unread message marks it read once in a session, and never again, even when it is not known to have worked

```quint
pure def canOpenedUnread(s: Operations, message: int, access: Access): bool =
  message != 0 and not(s.autoRead.contains(message)) and allowsFor(access, access.account, Changing)

pure def openedUnread(s: Operations, message: int, access: Access): Done = {
  state: { ...s, autoRead: s.autoRead.union(Set(message)) },
  out: List(MarkMessage({ account: access.account, message: message, unread: false })),
}

pure def stepAnAutomaticMarkIsSentOnce(before: Operations, via: str, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | MarkMessage(m) =>
      (via == "openedUnread" implies (not(before.autoRead.contains(m.message)) and after.autoRead.contains(m.message)))
        and (via == "openedUnread" or via == "mark")
    | _ => true
  })

pure def sometimesAMessageWasMarkedOnOpening(s: Operations): bool = s.autoRead.size() > 0
```

## Story: Start over

> As the owner, I want what was under way when Alpha restarted, or when
> someone else signed in, never to go out twice or for the wrong person.

### A restart forgets the review, leaves a request still in flight unknown, and stops waiting for a check

The phone kept the operation, so nothing is sent twice. A check that was
out counts as made.

```quint
pure def restart(s: Operations): Operations =
  val base = { ...s, review: V::dismiss(s.review), check: { ...s.check, status: R::Idle }, checking: 0 }
  if (s.attempt.outcome == A::Sent) ending(A::conclude(s.attempt, false, false), base).state else base
```

### A new cloud session closes the review, stops what was recorded and not yet sent, and shows nothing of the session before

A request already sent ends as its answer says.

```quint
pure def sessionChanged(s: Operations): Operations = {
  ...s, review: V::dismiss(s.review), undo: if (s.attempt.outcome == A::Recorded) U::undo(s.undo) else s.undo,
  noticed: true, sentDrafts: Set(), doubtful: Set(), checked: Set(), check: { ...s.check, status: R::Idle },
  checking: 0, autoRead: Set(),
}
```

### Each operation takes a new number, and a review open is of an operation not yet recorded

```quint
pure def alwaysEachOperationHasANewNumber(s: Operations): bool =
  0 <= s.attempt.id and s.attempt.id <= s.attempts and (s.attempt.id != 0 implies (s.target != 0 and s.account != 0))

pure def alwaysAnOpenReviewIsOfAnOperationNotYetRecorded(s: Operations): bool =
  s.review.showing implies (s.attempt.id != 0 and A::canRecord(s.attempt))
```
