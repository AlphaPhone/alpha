# Operations

What the owner changes in Gmail from Inbox: sending a
[draft](./drafts.md), saving it to Gmail's Drafts or replacing the copy
there, deleting that copy, archiving, moving to Trash, and restoring mail
archived or trashed. Each is one kit [attempt](../../kit/attempt.md) on
the account it names: recorded on the phone before its one request goes
out, and ending confirmed, refused or unknown. Each is first
[reviewed](../../kit/review.md); archive and Trash are then held for an
[undo](../../kit/undo.md) window. Marking read or unread is
[its own](./marking.md), and what Alpha may change itself is
[its own](./agent.md).

What is reviewed comes with each event: the draft [as the composer holds
it](./letter.md), or the messages chosen in the [list](./index.md) with
the list's revision. The shell passes the grant of the account an event
names as the list holds it now, which after a restart is none until the
accounts have answered again; whether the composer has written the draft
to the phone; and the time as `now`. It tells the composer when a draft
is handed over and how its operation ended, and the list when messages
changed. The list hides the messages an operation holds.

## Story: Send a draft I reviewed

> As the owner, I want to see the recipients, subject and attachments of
> what will be sent and confirm it, to have exactly that sent once, from
> the account it is written from, and to be told honestly when Alpha
> cannot know whether it went.

### An operation names what it does, in which cloud session, on which account, to which draft or messages, and keeps its review, its attempt and its undo window

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import undo as U from "../../kit/undo"
import draft as D from "../../kit/draft"
import letter as L from "./letter"
import access.* from "./access"

type Kind = Send | SaveDraft | ReplaceDraft | DeleteDraft | Archive | Trash | Unarchive | Untrash
type Operations = {
  session: int, of: int, kind: Kind, account: int, draft: int, messages: Set[int], gmail: int, history: int,
  review: V::Review, warned: bool, addressed: bool, repeat: bool, again: bool, changed: bool,
  attempt: A::Attempt, attempts: int, withdrawn: bool, undo: U::Undo, clock: int, approvedBy: Actor,
  confirmations: int, requests: int, noticed: bool, offered: int,
}

type Effect =
  | Request({ attempt: int, kind: Kind, access: Access, draft: int, messages: Set[int], revision: int, gmail: int, history: int })
  | HandOver({ draft: int, attempt: int, use: L::Use })
  | Cleanup({ draft: int, attempt: int, revision: int })
  | Ended({ draft: int, attempt: int, outcome: A::Outcome, revision: int, gmail: int })
  | Changed({ account: int, known: bool })
  | OpenGoogleAccess({ account: int })
type Done = { state: Operations, out: List[Effect] }

pure val window = 10

pure val initial: Operations = {
  session: 0, of: 0, kind: Send, account: 0, draft: 0, messages: Set(), gmail: 0, history: 0,
  review: V::unreviewed, warned: false, addressed: false, repeat: false, again: false, changed: false,
  attempt: A::plan(0), attempts: 0, withdrawn: false, undo: U::free, clock: 0, approvedBy: World,
  confirmations: 0, requests: 0, noticed: true, offered: 0,
}

pure val accountValues = Set(1, 2)
pure val messagesValues = Set(Set(1), Set(1, 2))
pure val revisionValues = Set(1, 2)
pure val historyValues = Set(0, 1)
pure val nowValues = Set(0, 5, 10, 20)
pure val attemptValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
pure val weight_answered = 3
pure val weight_replyLost = 2
pure val gmailValues = Set(0, 3)
pure val letterValues = Set(
  { ...L::blank, id: 1, account: 1, kind: L::Reply, recipients: 1, revision: 1 },
  { ...L::blank, id: 1, account: 1, kind: L::Reply, recipients: 1, revision: 2, draft: { ...D::blank, sync: D::Edited, edits: 1 } },
  { ...L::blank, id: 2, account: 2, recipients: 1, invalid: 1, revision: 1, sent: 1 },
  { ...L::blank, id: 2, account: 2, recipients: 1, revision: 2, gmail: 3, verified: 2, draft: { ...D::blank, sync: D::Edited, edits: 1, base: 1 } },
  { ...L::blank, id: 3, account: 1, revision: 1, gmail: 3, draft: { ...D::blank, base: 1 } },
)
```

### Sending needs the account's consent to send, and every other operation its consent to change the mailbox

```quint
pure def needs(kind: Kind): Deed = if (kind == Send) Sending else Changing

pure def ofDraft(kind: Kind): bool = kind == Send or kind == SaveDraft or kind == ReplaceDraft or kind == DeleteDraft

pure def holdable(kind: Kind): bool = kind == Archive or kind == Trash

pure def warns(kind: Kind): bool = kind == ReplaceDraft or kind == DeleteDraft

pure def useOf(kind: Kind): L::Use = if (kind == Send) L::ToSend else if (kind == DeleteDraft) L::ToDelete else L::ToSave

pure def live(s: Operations): bool = s.of == s.session

pure def ongoing(s: Operations): bool =
  s.attempt.outcome == A::Sent or (s.attempt.outcome == A::Recorded and not(s.withdrawn))
```

### A draft's operation is reviewed as the draft is, on its From account, once it is wholly kept on the phone, while nothing else is under way and no unknown outcome is unseen

A send of a draft saved in Gmail sends that Gmail draft, and Gmail removes
its copy as it sends it. Saving to Gmail creates a copy where there is
none, and otherwise replaces the copy read unchanged just before; a
replacement and a deletion say they cannot be undone. A send with no
recipient, or with an address Gmail does not accept, is shown asking for
one and cannot be confirmed. A draft already sent, or whose send is
unknown, is shown again only when the owner chose to send it again
knowing it may already have gone.

```quint
pure def fitFor(kind: Kind, letter: L::Letter, again: bool): bool =
  letter.id != 0 and letter.sending == 0 and not(letter.unsure)
    and letter.draft.sync != D::Conflicted and letter.draft.sync != D::Saving
    and (kind == Send implies (not(L::mayHaveGone(letter)) or again))
    and (kind == SaveDraft implies (L::saveable(letter) and letter.gmail == 0))
    and (kind == ReplaceDraft implies (L::saveable(letter) and letter.gmail != 0))
    and (kind == DeleteDraft implies letter.gmail != 0)

pure def free(s: Operations): bool = not(ongoing(s)) and (s.noticed or s.attempt.outcome != A::Unknown)

pure def canPrepare(s: Operations, kind: Kind, access: Access, letter: L::Letter, kept: bool, again: bool, by: Actor): bool =
  by == Owner and ofDraft(kind) and free(s) and kept and fitFor(kind, letter, again)
    and allowsFor(access, letter.account, needs(kind))

pure def prepare(s: Operations, kind: Kind, access: Access, letter: L::Letter, kept: bool, again: bool, by: Actor): Operations = {
  ...s, of: s.session, kind: kind, account: letter.account, draft: letter.id, messages: Set(), gmail: letter.gmail, history: 0,
  review: V::present({ showing: false, revision: letter.revision, shown: 0 }), warned: warns(kind),
  addressed: letter.recipients >= 1 and letter.invalid == 0, repeat: kind == Send and L::mayHaveGone(letter), again: again,
  changed: false, attempt: A::plan(s.attempts + 1), attempts: s.attempts + 1, withdrawn: false, undo: U::free,
  approvedBy: World, confirmations: 0, requests: 0, noticed: true,
}
```

### Archive, Trash and restoring are reviewed for the messages chosen from a list read afresh, as the list's revision has them, on the list's account

A restore names the message's history revision, and Gmail refuses it as
out of date if the message changed since.

```quint
pure def canPrepareChange(s: Operations, kind: Kind, access: Access, account: int, messages: Set[int], revision: int, history: int, fresh: bool, by: Actor): bool =
  by == Owner and not(ofDraft(kind)) and free(s) and fresh and messages.size() >= 1 and not(messages.contains(0))
    and allowsFor(access, account, Changing) and (holdable(kind) or history >= 1)

pure def prepareChange(s: Operations, kind: Kind, access: Access, account: int, messages: Set[int], revision: int, history: int, fresh: bool, by: Actor): Operations = {
  ...s, of: s.session, kind: kind, account: account, draft: 0, messages: messages, gmail: 0,
  history: if (holdable(kind)) 0 else history,
  review: V::present({ showing: false, revision: revision, shown: 0 }), warned: false, addressed: true,
  repeat: false, again: false, changed: false, attempt: A::plan(s.attempts + 1), attempts: s.attempts + 1,
  withdrawn: false, undo: U::free, approvedBy: World, confirmations: 0, requests: 0, noticed: true,
}
```

### A change to what is under review, or to a draft whose operation is recorded and not yet sent, stops it and says it must be looked at again

The draft changed: review it again. The emails changed: select them
again. A draft discarded is told as revision 0. A draft already handed
over is told the operation ended without anything going out.

```quint
pure def stopping(changed: bool, s: Operations): Done =
  val stops = s.attempt.outcome == A::Recorded and not(s.withdrawn)
  {
    state: { ...s, review: V::dismiss(s.review), withdrawn: s.withdrawn or stops, changed: s.changed or changed },
    out:
      if (stops and ofDraft(s.kind) and live(s))
        List(Ended({ draft: s.draft, attempt: s.attempt.id, outcome: A::Refused, revision: s.review.shown, gmail: s.gmail }))
      else List(),
  }

pure def canOutdated(s: Operations, revision: int): bool =
  revision != s.review.shown and live(s) and (
    s.review.showing or (s.attempt.outcome == A::Recorded and not(s.withdrawn) and ofDraft(s.kind))
  )

pure def outdated(s: Operations, revision: int): Done =
  stopping(true, { ...s, review: { ...s.review, revision: revision } })

pure def canReviewAgain(s: Operations, letter: L::Letter, kept: bool): bool =
  ofDraft(s.kind) and s.attempt.id != 0 and A::canRecord(s.attempt) and not(s.review.showing) and not(s.withdrawn)
    and live(s) and kept and letter.id == s.draft and letter.account == s.account and fitFor(s.kind, letter, s.again)

pure def reviewAgain(s: Operations, letter: L::Letter, kept: bool): Operations = {
  ...s, review: V::present({ ...s.review, revision: letter.revision }), gmail: letter.gmail,
  addressed: letter.recipients >= 1 and letter.invalid == 0, changed: false,
}

pure def canCancel(s: Operations): bool = s.review.showing

pure def cancel(s: Operations): Operations = { ...s, review: V::dismiss(s.review) }
```

### Only the owner confirms, only the review of the thing as it is now, while the account's grant allows it and, for a send, it has a valid recipient

Confirming records the operation on the phone and hands a draft to it;
archive and Trash are then held for the undo window.

```quint
pure def canConfirm(s: Operations, revision: int, access: Access, now: int, by: Actor): bool =
  by == Owner and now >= s.clock and live(s) and not(s.withdrawn) and V::canConfirm({ ...s.review, revision: revision })
    and A::canRecord(s.attempt) and allowsFor(access, s.account, needs(s.kind)) and (s.kind == Send implies s.addressed)

pure def confirm(s: Operations, revision: int, access: Access, now: int, by: Actor): Done = {
  state: {
    ...s, review: V::confirm(s.review), attempt: A::record(s.attempt), confirmations: s.confirmations + 1,
    approvedBy: by, clock: now, undo: if (holdable(s.kind)) U::hold(now, window) else U::free,
  },
  out: if (ofDraft(s.kind)) List(HandOver({ draft: s.draft, attempt: s.attempt.id, use: useOf(s.kind) })) else List(),
}
```

### A replacement or a deletion of a Gmail draft is confirmed only from the review that warned it cannot be undone

```quint
pure def alwaysAReplacementOrDeletionIsWarned(s: Operations): bool =
  (warns(s.kind) and s.attempt.id != 0) implies s.warned

pure def stepADeletionFollowsTheOwnersWarnedConfirmation(before: Operations, via: str, after: Operations): bool =
  (via == "confirm" and warns(before.kind)) implies (before.review.showing and before.warned and after.approvedBy == Owner)
```

### A recorded operation sends its one request, for its own account under that account's grant now, exactly as reviewed: a draft while it is at the revision shown and its hand-over is written to the phone, archive and Trash once the undo window has passed

`kept` is the composer's word that the draft, handed to this attempt, is
written to the phone.

```quint
pure def canDispatchNow(s: Operations, access: Access, revision: int, kept: bool, now: int): bool =
  A::canDispatch(s.attempt) and not(s.withdrawn) and live(s) and now >= s.clock
    and allowsFor(access, s.account, needs(s.kind))
    and (ofDraft(s.kind) implies (kept and revision == s.review.shown))
    and (holdable(s.kind) implies U::canRelease(s.undo, now))

pure def dispatchNow(s: Operations, access: Access, revision: int, kept: bool, now: int): Done = {
  state: {
    ...s, attempt: A::dispatch(s.attempt), requests: s.requests + 1, clock: now,
    undo: if (holdable(s.kind)) U::release(s.undo) else s.undo,
  },
  out: List(Request({
    attempt: s.attempt.id, kind: s.kind, access: access, draft: s.draft, messages: s.messages,
    revision: s.review.shown, gmail: s.gmail, history: s.history,
  })),
}
```

### Each request follows the owner's confirmation of it, and carries the operation as recorded, for its account, under a grant that allows it

```quint
pure def alwaysEachRequestHasItsConfirmation(s: Operations): bool =
  s.requests >= 0 and s.requests + (if (s.attempt.outcome == A::Recorded) 1 else 0) <= s.confirmations
    and (s.confirmations >= 1 implies s.approvedBy == Owner)

pure def stepARequestIsTheOperationRecorded(before: Operations, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | Request(r) =>
      before.attempt.outcome == A::Recorded and after.attempt.outcome == A::Sent and r.attempt == before.attempt.id
        and not(before.withdrawn) and live(before) and before.approvedBy == Owner
        and r.kind == before.kind and r.access.account == before.account and allowsFor(r.access, before.account, needs(r.kind))
        and r.draft == before.draft and r.messages.subseteq(before.messages) and before.messages.subseteq(r.messages)
        and r.revision == before.review.shown and r.gmail == before.gmail and r.history == before.history
    | _ => true
  })
```

### Losing the grant stops a review open and an operation recorded and not yet sent; a request already sent is never disowned

```quint
pure def accessChanged(s: Operations, access: Access): Done =
  if (access.account == s.account and not(allows(access.grant, needs(s.kind)))) stopping(false, s)
  else { state: s, out: List() }

pure def stepLosingAGrantKeepsARequestSent(before: Operations, via: str, after: Operations): bool =
  (via == "accessChanged" and before.attempt.outcome == A::Sent) implies after.attempt == before.attempt
```

### While the account's grant lacks consent to send, nothing is sent, and Turn on hands over to Google access in Settings

```quint
pure def canTurnOnSending(s: Operations, access: Access, account: int): bool =
  allowsFor(access, account, Reading) and not(allows(access.grant, Sending))

pure def turnOnSending(s: Operations, access: Access, account: int): Done =
  { state: { ...s, offered: account }, out: List(OpenGoogleAccess({ account: account })) }

pure def lawNothingIsSentWithoutConsent(access: Access, letter: L::Letter): bool =
  not(allows(access.grant, Sending)) implies not(canPrepare(initial, Send, access, letter, true, true, Owner))

pure def sometimesSendingIsOffForTheAccount(s: Operations): bool = s.offered != 0
```

### The answer to the request in flight ends it; a reply that does not match it, or none, leaves it unknown

A confirmed send lets the composer forget its draft, if it is still as it
was reviewed. Every other end of a draft's operation is told to the
draft, and the end of a change to messages to the list. An unknown one's
notice stays until the owner has seen it. An operation of a session
before tells nothing.

```quint
pure def ending(ended: A::Attempt, gmail: int, s: Operations): Done =
  {
    state: { ...s, attempt: ended, noticed: ended.outcome != A::Unknown or not(live(s)) },
    out:
      if (not(live(s))) List()
      else if (s.kind == Send and ended.outcome == A::Confirmed)
        List(Cleanup({ draft: s.draft, attempt: ended.id, revision: s.review.shown }))
      else if (ofDraft(s.kind))
        List(Ended({ draft: s.draft, attempt: ended.id, outcome: ended.outcome, revision: s.review.shown, gmail: gmail }))
      else List(Changed({ account: s.account, known: ended.outcome != A::Unknown })),
  }

pure def canAnswered(s: Operations, attempt: int, done: bool, matches: bool, gmail: int): bool =
  A::canConclude(s.attempt, attempt) and ((s.kind == SaveDraft and done and matches) implies gmail != 0)

pure def answered(s: Operations, attempt: int, done: bool, matches: bool, gmail: int): Done =
  ending(A::conclude(s.attempt, done, matches), if (s.kind == SaveDraft) gmail else s.gmail, s)

pure def canReplyLost(s: Operations, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def replyLost(s: Operations, attempt: int): Done = ending(A::conclude(s.attempt, false, false), s.gmail, s)

pure def canDismissOutcome(s: Operations): bool = not(s.noticed)

pure def dismissOutcome(s: Operations): Operations = { ...s, noticed: true }

pure def lawAMismatchedReplyIsUnknown(attempt: int, done: bool, gmail: int): bool =
  answered({ ...initial, attempt: { id: attempt, outcome: A::Sent } }, attempt, done, false, gmail).state.attempt.outcome == A::Unknown

pure def leadsToARequestEnds(s: Operations, later: Operations): bool =
  s.attempt.outcome == A::Sent implies later.attempt.outcome != A::Sent

pure val fair_answered = "strong"
pure val fair_replyLost = "strong"
```

### An outcome that is unknown or confirmed is never sent again, and a later operation never hides an unknown one the owner has not seen

A refused operation can be reviewed and confirmed again, under its own
number.

```quint
pure def stepAnEndedOutcomeStays(before: Operations, after: Operations): bool =
  ((before.attempt.outcome == A::Unknown or before.attempt.outcome == A::Confirmed) and after.attempt.id == before.attempt.id)
    implies after.attempt == before.attempt

pure def stepAnUnknownIsNotHidden(before: Operations, after: Operations): bool =
  (after.attempt.id != before.attempt.id) implies (before.attempt.outcome != A::Unknown or before.noticed)

pure def alwaysAnUnseenUnknownIsOfThisSession(s: Operations): bool =
  not(s.noticed) implies (live(s) and s.attempt.outcome == A::Unknown)
```

### A draft already sent, or whose send is unknown, is never sent again without the owner choosing to

Discovered by the proof: the owner's choice holds for the whole
operation, through a refusal and a review again.

```quint
pure def alwaysASendAgainIsChosen(s: Operations): bool =
  (s.kind == Send and s.repeat) implies s.again
```

### Only the operation in flight tells how it ended, once: the draft is cleared only after a fresh confirmation of its send, and a stopped operation tells its draft nothing went out

```quint
pure def stepCleanupFollowsAFreshSuccess(before: Operations, after: Operations, out: List[Effect]): bool =
  out.every(e => match e {
    | Cleanup(c) =>
      before.attempt.outcome == A::Sent and after.attempt.outcome == A::Confirmed and before.kind == Send and live(before)
        and c.draft == before.draft and c.revision == before.review.shown and c.attempt == before.attempt.id
    | Ended(n) =>
      ofDraft(before.kind) and live(before) and n.draft == before.draft and n.attempt == before.attempt.id
        and ((before.attempt.outcome == A::Sent and after.attempt.outcome == n.outcome and not(before.kind == Send and n.outcome == A::Confirmed))
          or (n.outcome == A::Refused and before.attempt.outcome == A::Recorded and not(before.withdrawn) and after.withdrawn))
    | Changed(c) =>
      not(ofDraft(before.kind)) and live(before) and before.attempt.outcome == A::Sent and A::ended(after.attempt)
        and c.account == before.account and c.known == (after.attempt.outcome != A::Unknown)
    | _ => true
  })
```

### A send can be confirmed, can end unknown, a refused send can be reviewed again, a send can be stopped by a change or by losing consent to send, or wait for a recipient, and a sent draft can be sent again knowingly

```quint
pure def sometimesASendIsConfirmed(s: Operations): bool = s.kind == Send and s.attempt.outcome == A::Confirmed

pure def sometimesASendIsUnknown(s: Operations): bool = s.kind == Send and s.attempt.outcome == A::Unknown and not(s.noticed)

pure def sometimesARefusedSendIsUnderReviewAgain(s: Operations): bool =
  s.kind == Send and s.attempt.outcome == A::Refused and s.review.showing

pure def sometimesTheDraftChangedUnderReview(s: Operations): bool = s.kind == Send and s.changed and s.attempt.outcome == A::Planned

pure def sometimesARecordedSendIsStopped(s: Operations): bool = s.kind == Send and s.withdrawn and s.attempt.outcome == A::Recorded

pure def sometimesASendIsStoppedForWantOfConsent(s: Operations): bool =
  s.kind == Send and s.withdrawn and not(s.changed) and live(s) and s.attempt.outcome == A::Recorded

pure def sometimesASendWaitsForARecipient(s: Operations): bool = s.kind == Send and s.review.showing and not(s.addressed)

pure def sometimesASentDraftIsSentAgainKnowingly(s: Operations): bool =
  s.kind == Send and s.again and s.repeat and s.review.showing
```

## Story: Save my draft to Gmail, or delete it there, knowingly

> As the owner, I want a save to Gmail reviewed like a send, a
> replacement of Gmail's copy and a deletion from Gmail each warned that
> it cannot be undone, and each done once.

### A save to Gmail can be confirmed, a replacement and a deletion are warned under review, and a deletion can be confirmed

```quint
pure def sometimesASaveIsConfirmed(s: Operations): bool = s.kind == SaveDraft and s.attempt.outcome == A::Confirmed

pure def sometimesAReplacementIsWarned(s: Operations): bool = s.kind == ReplaceDraft and s.review.showing and s.warned

pure def sometimesADeletionIsWarned(s: Operations): bool = s.kind == DeleteDraft and s.review.showing and s.warned

pure def sometimesADraftDeletionIsConfirmed(s: Operations): bool = s.kind == DeleteDraft and s.attempt.outcome == A::Confirmed
```

## Story: Archive or trash mail, with Undo

> As the owner, I want archiving and moving to Trash to wait a moment so
> that I can undo them, the messages I chose to be the ones changed, and
> them kept set aside through a restart.

### Archive and Trash are held for the undo window, and only the owner's Undo before it ends sends nothing

```quint
pure def canUndo(s: Operations, now: int, by: Actor): bool =
  by == Owner and now >= s.clock and live(s) and holdable(s.kind) and s.attempt.outcome == A::Recorded
    and not(s.withdrawn) and U::canUndo(s.undo, now)

pure def undo(s: Operations, now: int, by: Actor): Operations = { ...s, undo: U::undo(s.undo), withdrawn: true, clock: now }

pure def alwaysAHeldChangeIsRecorded(s: Operations): bool =
  s.undo.holding == U::Held implies (holdable(s.kind) and s.attempt.outcome == A::Recorded and s.undo.until <= s.clock + window)

pure def alwaysAnUndoneChangeWasNeverSent(s: Operations): bool =
  s.undo.holding == U::Undone implies (s.attempt.outcome == A::Recorded and s.withdrawn)
```

### The messages an archive or a move to Trash holds or has in flight are set aside in the list, and a restart keeps them so, with Undo, until the change ends

```quint
pure def aside(s: Operations): Set[int] = if (holdable(s.kind) and ongoing(s) and live(s)) s.messages else Set()

pure def stepARestartKeepsWhatIsHeld(before: Operations, via: str, after: Operations): bool =
  (via == "restart" and before.attempt.outcome == A::Recorded) implies (
    after.attempt == before.attempt and after.undo == before.undo and after.withdrawn == before.withdrawn
      and aside(after).subseteq(aside(before)) and aside(before).subseteq(aside(after))
  )
```

### Archive and Trash can be undone, chosen messages can change under review, and an archive can be confirmed or end unknown

```quint
pure def sometimesATrashIsUndone(s: Operations): bool = s.kind == Trash and s.undo.holding == U::Undone and not(s.changed)

pure def sometimesAnArchiveIsConfirmed(s: Operations): bool = s.kind == Archive and s.attempt.outcome == A::Confirmed

pure def sometimesAnArchiveIsUnknown(s: Operations): bool = s.kind == Archive and s.attempt.outcome == A::Unknown

pure def sometimesChosenMessagesChanged(s: Operations): bool = s.messages.size() > 1 and s.changed
```

## Story: Restore mail I archived or trashed

> As the owner, I want to put back in the Inbox mail I archived, and take
> back out of Trash mail I trashed, after the change went out.

### A restore is reviewed for messages chosen in Archived or Trash, or right after the change went out, bound to the message's history revision; Gmail refuses it as out of date when the message changed since

```quint
pure def alwaysARestoreIsBoundToItsHistory(s: Operations): bool =
  (s.attempt.id != 0 and not(ofDraft(s.kind)) and not(holdable(s.kind))) implies s.history >= 1

pure def sometimesAMessageIsRestored(s: Operations): bool = s.kind == Unarchive and s.attempt.outcome == A::Confirmed

pure def sometimesARestoreIsOutOfDate(s: Operations): bool = s.kind == Untrash and s.attempt.outcome == A::Refused
```

## Story: Start over

> As the owner, I want what was under way when Alpha restarted, or when
> someone else signed in, never to go out twice or for the wrong person.

### A restart forgets the review, keeps what was recorded on the phone, and leaves a request in flight unknown

The phone kept the operation, so nothing is sent twice; what was recorded
goes out only under the grant the accounts give after the restart.

```quint
pure def restart(s: Operations): Done =
  val base = { ...s, review: V::dismiss(s.review) }
  if (s.attempt.outcome == A::Sent) ending(A::conclude(s.attempt, false, false), s.gmail, base) else { state: base, out: List() }
```

### A new cloud session closes the review, stops what was recorded and not yet sent, and shows nothing of the session before

A request already sent ends as its answer says, and tells nothing.

```quint
pure def sessionChanged(s: Operations): Operations = {
  ...s, session: s.session + 1, review: V::dismiss(s.review),
  withdrawn: s.withdrawn or s.attempt.outcome == A::Recorded, noticed: true, offered: 0,
}
```

### Each operation takes a new number and names its account and what it acts on, and a review open is of an operation of this session not yet recorded

```quint
pure def alwaysEachOperationHasANewNumber(s: Operations): bool =
  0 <= s.attempt.id and s.attempt.id <= s.attempts and s.of <= s.session
    and (s.attempt.id != 0 implies (
      s.account != 0
        and (if (ofDraft(s.kind)) (s.draft != 0 and s.messages.size() == 0) else (s.draft == 0 and s.messages.size() >= 1))
    ))

pure def alwaysAnOpenReviewIsOfAnOperationNotYetRecorded(s: Operations): bool =
  s.review.showing implies (s.attempt.id != 0 and A::canRecord(s.attempt) and not(s.withdrawn) and live(s))
```
