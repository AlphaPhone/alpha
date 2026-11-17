# Operations

What Inbox changes in Gmail: sending a [draft](./drafts.md), archiving,
moving to Trash, marking read or unread, and deleting a draft saved in
Gmail. Each is one kit [attempt](../../kit/attempt.md): recorded on the
phone before its one request goes out, and ending confirmed, refused or
unknown. Sending and deleting are first [reviewed](../../kit/review.md);
archive and Trash are held for an [undo](../../kit/undo.md) window
instead of a confirmation.

What is reviewed comes with each event as its revision: the draft's count
of edits for a send or a draft deletion, the list's for messages chosen
from it. The grant comes from the [list](./index.md), whether sending is
on from Settings, and the time as `now`.

## Story: Send a draft I reviewed

> As the owner, I want to see the recipients, subject and attachments of
> what will be sent and confirm it, to have it sent once, and to be told
> honestly when Alpha cannot know whether it went.

### An operation names what it does, to which draft or messages, and keeps its review, its attempt and its undo window

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import undo as U from "../../kit/undo"
import access.* from "./access"

type Kind = Send | Archive | Trash | DeleteDraft | MarkRead | MarkUnread
type Operations = {
  kind: Kind, target: int, count: int, review: V::Review, warned: bool, changed: bool,
  attempt: A::Attempt, attempts: int, undo: U::Undo, confirmations: int, requests: int,
}

type Effect =
  | Request({ attempt: int, kind: Kind, target: int, count: int })
  | Cleanup({ draft: int, edits: int })
type Done = { state: Operations, out: List[Effect] }

pure val window = 10

pure val initial: Operations = {
  kind: Send, target: 0, count: 0, review: V::unreviewed, warned: false, changed: false,
  attempt: A::plan(0), attempts: 0, undo: U::free, confirmations: 0, requests: 0,
}

pure val targetValues = Set(0, 1, 2)
pure val countValues = Set(0, 1, 3)
pure val revisionValues = Set(0, 1, 2)
pure val nowValues = Set(0, 5, 10, 20)
pure val attemptValues = Set(1, 2, 3)
pure val messageValues = Set(0, 1)
```

### Sending needs a grant to send, deleting a draft a grant to change drafts, and the rest a grant to change the mailbox

```quint
pure def needs(kind: Kind): Deed =
  if (kind == Send) Sending else if (kind == DeleteDraft) Drafting else Changing

pure def holdable(kind: Kind): bool = kind == Archive or kind == Trash

pure def ongoing(s: Operations): bool =
  s.attempt.outcome == A::Sent or (s.attempt.outcome == A::Recorded and s.undo.holding != U::Undone)
```

### A send or a deletion is shown for review as the draft is, while nothing else is under way

Archive and Trash of chosen messages are shown the same way. A send and a
deletion are of one draft.

```quint
pure def canPrepare(s: Operations, kind: Kind, target: int, count: int, revision: int, grant: Grant): bool =
  not(ongoing(s)) and target != 0 and count >= 1 and kind != MarkRead and kind != MarkUnread
    and ((kind == Send or kind == DeleteDraft) implies count == 1) and allows(grant, needs(kind))

pure def prepare(s: Operations, kind: Kind, target: int, count: int, revision: int, grant: Grant): Operations = {
  ...s, kind: kind, target: target, count: count,
  review: V::present({ showing: false, revision: revision, shown: 0 }), warned: kind == DeleteDraft,
  changed: false, attempt: A::plan(s.attempts + 1), attempts: s.attempts + 1, undo: U::free,
  confirmations: 0, requests: 0,
}
```

### A change to what is under review closes the review and says it must be looked at again

The draft changed: review it again. The emails changed: select them
again.

```quint
pure def canOutdated(s: Operations, revision: int): bool = s.review.showing and revision != s.review.shown

pure def outdated(s: Operations, revision: int): Operations =
  { ...s, review: V::dismiss({ ...s.review, revision: revision }), changed: true }

pure def canReviewAgain(s: Operations, revision: int): bool =
  s.attempt.id != 0 and A::canRecord(s.attempt) and not(s.review.showing)

pure def reviewAgain(s: Operations, revision: int): Operations =
  { ...s, review: V::present({ ...s.review, revision: revision }), changed: false }

pure def canCancel(s: Operations): bool = s.review.showing

pure def cancel(s: Operations): Operations = { ...s, review: V::dismiss(s.review) }
```

### Only the review of the draft as it is now can be confirmed, while the grant allows it and, for a send, sending is on in Settings

Confirming records the operation on the phone; archive and Trash are then
held for the undo window.

```quint
pure def canConfirm(s: Operations, revision: int, grant: Grant, sendingOn: bool, now: int): bool =
  V::canConfirm({ ...s.review, revision: revision }) and A::canRecord(s.attempt)
    and allows(grant, needs(s.kind)) and (s.kind == Send implies sendingOn)

pure def confirm(s: Operations, revision: int, grant: Grant, sendingOn: bool, now: int): Operations = {
  ...s, review: V::confirm(s.review), attempt: A::record(s.attempt), confirmations: s.confirmations + 1,
  undo: if (holdable(s.kind)) U::hold(now, window) else U::free,
}
```

### Marking read or unread needs no review, and is recorded before it is sent too

```quint
pure def canMark(s: Operations, message: int, unread: bool, grant: Grant): bool =
  not(ongoing(s)) and message != 0 and allows(grant, Changing)

pure def mark(s: Operations, message: int, unread: bool, grant: Grant): Operations = {
  ...s, kind: if (unread) MarkUnread else MarkRead, target: message, count: 1,
  review: V::unreviewed, warned: false, changed: false,
  attempt: A::record(A::plan(s.attempts + 1)), attempts: s.attempts + 1, undo: U::free,
  confirmations: 1, requests: 0,
}
```

### A recorded operation sends its one request while the grant still allows it, archive and Trash once the undo window has passed

```quint
pure def canDispatchNow(s: Operations, grant: Grant, now: int): bool =
  A::canDispatch(s.attempt) and s.undo.holding != U::Undone and allows(grant, needs(s.kind))
    and (holdable(s.kind) implies U::canRelease(s.undo, now))

pure def dispatchNow(s: Operations, grant: Grant, now: int): Done = {
  state: {
    ...s, attempt: A::dispatch(s.attempt), requests: s.requests + 1,
    undo: if (holdable(s.kind)) U::release(s.undo) else s.undo,
  },
  out: List(Request({ attempt: s.attempt.id, kind: s.kind, target: s.target, count: s.count })),
}
```

### Each request follows a confirmation of its own, and only after the operation was recorded

```quint
pure def alwaysEachRequestHasItsConfirmation(s: Operations): bool =
  s.requests >= 0 and s.requests + (if (s.attempt.outcome == A::Recorded) 1 else 0) <= s.confirmations

pure def stepARequestIsTheOperationRecorded(before: Operations, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | Request(r) =>
      before.attempt.outcome == A::Recorded and after.attempt.outcome == A::Sent and r.attempt == before.attempt.id
        and r.kind == before.kind and r.target == before.target and r.count == before.count
    | _ => true
  })
```

### The answer to the request in flight ends it; a reply that does not match it, or none, leaves it unknown

A confirmed send lets the composer forget the draft, if it is still as it
was reviewed.

```quint
pure def canAnswered(s: Operations, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def answered(s: Operations, attempt: int, done: bool, matches: bool): Done =
  val ended = A::conclude(s.attempt, done, matches)
  {
    state: { ...s, attempt: ended },
    out: if (ended.outcome == A::Confirmed and s.kind == Send) List(Cleanup({ draft: s.target, edits: s.review.shown })) else List(),
  }

pure def canReplyLost(s: Operations, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def replyLost(s: Operations, attempt: int): Operations = { ...s, attempt: A::conclude(s.attempt, false, false) }

pure def lawAMismatchedReplyIsUnknown(attempt: int, done: bool): bool =
  answered({ ...initial, attempt: { id: attempt, outcome: A::Sent } }, attempt, done, false).state.attempt.outcome == A::Unknown
```

### The draft is cleared only after a fresh confirmation of its send

```quint
pure def stepCleanupFollowsAFreshSuccess(before: Operations, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | Cleanup(c) =>
      before.attempt.outcome == A::Sent and after.attempt.outcome == A::Confirmed and before.kind == Send
        and c.draft == before.target and c.edits == before.review.shown
    | _ => true
  })
```

### An outcome that is unknown or confirmed is never sent again, and nothing is retried without the owner

A refused send can be reviewed and confirmed again, under its own number.

```quint
pure def stepAnEndedOutcomeStays(before: Operations, after: Operations): bool =
  ((before.attempt.outcome == A::Unknown or before.attempt.outcome == A::Confirmed) and after.attempt.id == before.attempt.id)
    implies after.attempt == before.attempt
```

### A restart forgets the review and leaves a request still in flight unknown

The phone kept the operation, so nothing is sent twice.

```quint
pure def restart(s: Operations): Operations = {
  ...s, review: V::dismiss(s.review),
  attempt: if (s.attempt.outcome == A::Sent) A::conclude(s.attempt, false, false) else s.attempt,
}
```

### Losing a grant closes the review and stops what was not yet sent, but never disowns a request already sent

```quint
pure def accessChanged(s: Operations, grant: Grant): Operations =
  if (allows(grant, needs(s.kind))) s
  else {
    ...s, review: V::dismiss(s.review),
    undo: if (s.attempt.outcome == A::Recorded) U::undo(s.undo) else s.undo,
  }

pure def stepLosingAGrantKeepsARequestSent(before: Operations, via: str, after: Operations): bool =
  via == "accessChanged" implies after.attempt == before.attempt
```

### Each operation takes a new number, and a review open is of an operation not yet recorded

```quint
pure def alwaysEachOperationHasANewNumber(s: Operations): bool = 0 <= s.attempt.id and s.attempt.id <= s.attempts

pure def alwaysAnOpenReviewIsOfAnOperationNotYetRecorded(s: Operations): bool =
  s.review.showing implies (s.attempt.id != 0 and A::canRecord(s.attempt))
```

### A send can be confirmed, can end unknown, and a refused send can be reviewed again

```quint
pure def sometimesASendIsConfirmed(s: Operations): bool = s.kind == Send and s.attempt.outcome == A::Confirmed

pure def sometimesASendIsUnknown(s: Operations): bool = s.kind == Send and s.attempt.outcome == A::Unknown

pure def sometimesARefusedSendIsUnderReviewAgain(s: Operations): bool =
  s.kind == Send and s.attempt.outcome == A::Refused and s.review.showing

pure def sometimesTheDraftChangedUnderReview(s: Operations): bool = s.kind == Send and s.changed
```

## Story: Archive or trash mail, with Undo

> As the owner, I want archiving and moving to Trash to wait a moment so
> that I can undo them, and messages I chose to be the ones changed.

### Archive and Trash are held for the undo window, and Undo before it ends sends nothing

```quint
pure def canUndo(s: Operations, now: int): bool =
  holdable(s.kind) and s.attempt.outcome == A::Recorded and U::canUndo(s.undo, now)

pure def undo(s: Operations, now: int): Operations = { ...s, undo: U::undo(s.undo) }

pure def alwaysAHeldChangeIsRecorded(s: Operations): bool =
  s.undo.holding == U::Held implies (holdable(s.kind) and s.attempt.outcome == A::Recorded)

pure def alwaysAnUndoneChangeWasNeverSent(s: Operations): bool =
  s.undo.holding == U::Undone implies s.attempt.outcome == A::Recorded
```

### Archive and Trash can be undone, and chosen messages can change under review

```quint
pure def sometimesATrashIsUndone(s: Operations): bool = s.kind == Trash and s.undo.holding == U::Undone

pure def sometimesAnArchiveIsConfirmed(s: Operations): bool = s.kind == Archive and s.attempt.outcome == A::Confirmed

pure def sometimesChosenMessagesChanged(s: Operations): bool = s.count > 1 and s.changed

pure def sometimesAMessageIsMarkedUnread(s: Operations): bool = s.kind == MarkUnread and s.attempt.outcome == A::Confirmed
```

## Story: Delete a draft from Gmail knowingly

> As the owner, I want to be warned that deleting a draft saved in Gmail is
> permanent before I confirm it.

### A draft in Gmail is deleted only after a review that warned it is permanent

```quint
pure def alwaysADraftDeletionIsWarned(s: Operations): bool = s.kind == DeleteDraft implies s.warned

pure def sometimesADraftDeletionIsUnderReview(s: Operations): bool = s.kind == DeleteDraft and s.review.showing
```
