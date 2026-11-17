# Drafts

What the owner is writing in Inbox: a new message, a reply, a reply to
all or a forward. The draft is kept on the phone as it is typed, saved to
Gmail's Drafts over the revision it was made on, and never written over
or lost without the owner choosing. It follows the kit's
[draft](../../kit/draft.md); sending it is one of the
[operations](./sending.md), which tells this composer when the draft it
sent may be forgotten.

The grant comes from the [list](./index.md) with each event that saves
to Gmail, whether the phone admits Contacts from the [shell](../shell/),
and the time as `now`.

## Story: Write a message

> As the owner, I want to write a new message, reply, reply to all or
> forward, choose recipients from my contacts where the phone has them,
> and change the account it is sent from.

### The composer holds the draft open, how it began, its From account, recipients and attachments, and its copies on the phone and in Gmail

Each draft started takes the next number. Set-aside drafts wait on a
shelf, kept on the phone.

```quint
import draft as D from "../../kit/draft"
import access.* from "./access"

type Kind = Fresh | Reply | ReplyAll | Forward
type Composer = {
  open: bool, id: int, made: int, kind: Kind, account: int, recipients: int, attachments: int,
  draft: D::Draft, kept: D::Draft, stored: bool, writing: bool, copy: D::Draft,
  pending: bool, burst: int, due: int, saves: int, shelf: int, discarding: bool,
  offered: int, shown: int,
}

type Effect =
  | Keep({ draft: int, edits: int })
  | SaveToGmail({ ticket: int, draft: int, account: int, base: int, edits: int })
  | Forget({ draft: int })
type Written = { state: Composer, out: List[Effect] }

pure val pause = 2
pure val longest = 5

pure val initial: Composer = {
  open: false, id: 0, made: 0, kind: Fresh, account: 0, recipients: 0, attachments: 0,
  draft: D::blank, kept: D::blank, stored: false, writing: false, copy: D::blank,
  pending: false, burst: 0, due: 0, saves: 0, shelf: 0, discarding: false,
  offered: 0, shown: 0,
}

pure val accountValues = Set(0, 1, 2)
pure val everyoneValues = Set(0, 1, 3)
pure val filesValues = Set(0, 2)
pure val nowValues = Set(0, 1, 3, 7)
pure val ticketValues = Set(1, 2, 3)
pure val heldValues = Set(1, 2, 3)
pure val draftValues = Set(1, 2)
pure val editsValues = Set(0, 1, 2, 3)
pure val suggestionValues = Set(0, 1, 2)
```

### A reply is to the sender, a reply to all to everyone on the message, and a forward starts with the original's attachments

A new message starts empty. A draft needs an account to be sent from.

```quint
pure def canCompose(s: Composer, kind: Kind, account: int, everyone: int, files: int): bool =
  not(s.open) and not(s.writing) and account != 0 and everyone >= 1 and files >= 0

pure def compose(s: Composer, kind: Kind, account: int, everyone: int, files: int): Composer = {
  ...s, open: true, id: s.made + 1, made: s.made + 1, kind: kind, account: account,
  recipients: if (kind == Reply) 1 else if (kind == ReplyAll) everyone else 0,
  attachments: if (kind == Forward) files else 0,
  draft: D::blank, kept: D::blank, stored: false, copy: D::blank, pending: false,
  discarding: false, offered: 0, shown: 0,
}
```

### Every change to the text, recipients or attachments is an edit, counted at once

```quint
pure def edited(now: int, s: Composer): Composer =
  val burst = if (s.pending) s.burst else now
  val paused = now + pause
  {
    ...s, draft: D::edit(s.draft), pending: true, burst: burst,
    due: if (paused < burst + longest) paused else burst + longest,
  }

pure def canWrite(s: Composer): bool = s.open and not(s.discarding)

pure def write(s: Composer, now: int): Composer = edited(now, s)

pure def canAttach(s: Composer): bool = canWrite(s)

pure def attach(s: Composer, now: int): Composer = edited(now, { ...s, attachments: s.attachments + 1 })

pure def canDetach(s: Composer): bool = canWrite(s) and s.attachments > 0

pure def detach(s: Composer, now: int): Composer = edited(now, { ...s, attachments: s.attachments - 1 })

pure def canRemoveRecipient(s: Composer): bool = canWrite(s) and s.recipients > 0

pure def removeRecipient(s: Composer, now: int): Composer = edited(now, { ...s, recipients: s.recipients - 1 })
```

### To, Cc and Bcc are picked from contacts only where the phone admits Contacts

```quint
pure def canAddRecipient(s: Composer, picked: bool, contacts: bool): bool =
  canWrite(s) and (picked implies contacts)

pure def addRecipient(s: Composer, now: int, picked: bool, contacts: bool): Composer =
  edited(now, { ...s, recipients: s.recipients + 1 })
```

### Changing the From account moves the draft whole, to be saved again in the new account

The copy on the phone is written at once. A save in flight, or a
conflict, is settled first.

```quint
pure def canChangeFrom(s: Composer, account: int): bool =
  s.open and not(s.discarding) and not(s.writing) and account != 0 and account != s.account
    and s.draft.sync != D::Saving and s.draft.sync != D::Conflicted

pure def changeFrom(s: Composer, account: int): Written =
  keeping({ ...s.draft, sync: D::Edited, base: 0 }, { ...s, account: account })
```

### Counts of recipients, attachments and drafts are never negative, and an open draft has its own number

```quint
pure def alwaysCountsAreNotNegative(s: Composer): bool =
  s.recipients >= 0 and s.attachments >= 0 and s.shelf >= 0 and s.id <= s.made and 0 <= s.id
    and (s.open implies s.id >= 1 and s.account != 0)
```

### A forward with attachments and a reply to all can be written

```quint
pure def sometimesAForwardCarriesAttachments(s: Composer): bool =
  s.open and s.kind == Forward and s.attachments > 0

pure def sometimesAReplyToAllHasSeveralRecipients(s: Composer): bool =
  s.open and s.kind == ReplyAll and s.recipients > 1
```

## Story: Keep my draft on the phone

> As the owner, I want every draft kept on the phone as I type, written
> once per pause rather than on every key, and still there after Alpha
> restarts.

### Edits are written to the phone once typing pauses, and no later than the longest wait after a burst began

```quint
pure def keeping(copied: D::Draft, s: Composer): Written = {
  state: { ...s, draft: copied, writing: true, copy: copied, pending: false },
  out: List(Keep({ draft: s.id, edits: copied.edits })),
}

pure def canWriteDue(s: Composer, now: int): bool = s.open and s.pending and not(s.writing) and now >= s.due

pure def writeDue(s: Composer, now: int): Written = keeping(s.draft, s)

pure def alwaysAWaitingEditHasItsDeadline(s: Composer): bool =
  s.pending implies (s.open and s.due <= s.burst + longest)
```

### Leaving Alpha writes the waiting edits at once

```quint
pure def canLeave(s: Composer): bool = s.open and s.pending and not(s.writing)

pure def leave(s: Composer): Written = keeping(s.draft, s)
```

### One write to the phone is in flight at a time, carrying the draft as it is

Edits made while it is in flight wait for the next write.

```quint
pure def stepOneWriteAtATime(before: Composer, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Keep(k) => not(before.writing) and after.writing and k.draft == after.id and k.edits == after.draft.edits
    | _ => true
  })
```

### A write that lands becomes the copy kept; one that fails leaves its edits waiting

```quint
pure def canWritten(s: Composer, draft: int): bool = s.writing and draft == s.id

pure def written(s: Composer, draft: int, ok: bool): Composer =
  if (ok) { ...s, writing: false, kept: s.copy, stored: true }
  else { ...s, writing: false, pending: s.open, due: s.burst }
```

### The copy on the phone is never ahead of the draft

```quint
pure def alwaysTheCopyIsNotAheadOfTheDraft(s: Composer): bool =
  s.kept.edits <= s.draft.edits and s.copy.edits <= s.draft.edits
    and (s.writing implies s.copy.edits >= s.kept.edits)
```

### A restart reopens the draft as last kept on the phone, and a save that was in flight is no longer awaited

Edits not yet written are the only thing a restart can lose, and leaving
Alpha writes them first.

```quint
pure def recovered(d: D::Draft): D::Draft = { ...d, sync: if (d.sync == D::Saving) D::Edited else d.sync }

pure def restart(s: Composer): Composer =
  val draft = if (s.stored) recovered(s.kept) else D::blank
  {
    ...s, open: s.open and s.stored, draft: draft, kept: draft, copy: draft, writing: false,
    pending: false, discarding: false, offered: 0, shown: 0,
  }
```

### Edits can wait while a write is in flight, and a draft can come back after a restart

```quint
pure def sometimesEditsWaitDuringAWrite(s: Composer): bool = s.writing and s.pending

pure def sometimesAKeptDraftIsOpen(s: Composer): bool = s.open and s.stored and s.kept.edits >= 2
```

## Story: Save my draft to Gmail and recover from a clash

> As the owner, I want my draft saved to Gmail's Drafts, and when it was
> changed elsewhere meanwhile, to choose between my edits and the latest
> saved draft rather than lose either.

### A save to Gmail carries the draft over the revision it was made on, one at a time, while the grant allows drafts

```quint
pure def canSaveToGmail(s: Composer, grant: Grant): bool =
  s.open and not(s.discarding) and D::canSave(s.draft) and allows(grant, Drafting)

pure def saveToGmail(s: Composer, grant: Grant): Written = {
  state: { ...s, draft: D::save(s.draft), saves: s.saves + 1 },
  out: List(SaveToGmail({ ticket: s.saves + 1, draft: s.id, account: s.account, base: s.draft.base, edits: s.draft.edits })),
}

pure def stepASaveIsForTheDraftAsItIs(before: Composer, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | SaveToGmail(g) =>
      g.ticket == after.saves and g.draft == after.id and g.account == after.account
        and g.base == before.draft.base and before.draft.sync == D::Edited and after.draft.sync == D::Saving
    | _ => true
  })
```

### Only the answer to the save in flight is taken: it lands, or finds another revision saved and stops

```quint
pure def canSavedToGmail(s: Composer, ticket: int): bool = s.open and ticket == s.saves and D::canLand(s.draft)

pure def savedToGmail(s: Composer, ticket: int, landed: bool, held: int): Composer =
  { ...s, draft: if (landed) D::land(s.draft) else D::collide(s.draft, held) }
```

### On a clash the owner chooses Restore my edits or Use latest saved draft

Until then nothing is saved over either.

```quint
pure def canRestoreMine(s: Composer): bool = s.open and D::canChoose(s.draft)

pure def restoreMine(s: Composer): Composer = { ...s, draft: D::keepMine(s.draft) }

pure def canUseSaved(s: Composer): bool = s.open and D::canChoose(s.draft)

pure def useSaved(s: Composer): Composer = { ...s, draft: D::takeSaved(s.draft) }
```

### A save in flight belongs to an open draft, and its ticket is the newest

```quint
pure def alwaysASaveInFlightIsTheDraftOpen(s: Composer): bool =
  s.saves >= 0 and (s.draft.sync == D::Saving implies (s.open and s.saves >= 1))
```

### A draft can be saved to Gmail, and a clash can be kept on the phone across a restart

```quint
pure def sometimesSavedToGmail(s: Composer): bool = s.open and s.draft.sync == D::Kept and s.draft.base > 0

pure def sometimesAClashIsKeptOnThePhone(s: Composer): bool = s.open and s.kept.sync == D::Conflicted
```

## Story: Set a draft aside, discard it, or let it go once sent

> As the owner, I want to set a draft aside and come back to it, to be
> asked before a draft is discarded, and to have a sent draft cleared
> only when what was sent is what I last saw.

### A draft is set aside only once it is wholly kept on the phone, and comes back from the shelf

A draft resumed from the shelf is read back from the phone as kept.

```quint
pure def canSetAside(s: Composer): bool =
  s.open and not(s.discarding) and not(s.writing) and not(s.pending) and s.draft.sync != D::Saving

pure def setAside(s: Composer): Composer = { ...s, open: false, shelf: s.shelf + 1, offered: 0, shown: 0 }

pure def canResume(s: Composer, account: int): bool = not(s.open) and not(s.writing) and s.shelf > 0 and account != 0

pure def resume(s: Composer, account: int): Composer = {
  ...s, open: true, id: s.made + 1, made: s.made + 1, kind: Fresh, account: account,
  draft: D::blank, kept: D::blank, stored: true, copy: D::blank, pending: false, shelf: s.shelf - 1,
}
```

### Discarding asks first, and then forgets the draft on the phone

A copy saved in Gmail's Drafts stays there until it is deleted as an
operation, which warns that it is permanent.

```quint
pure def canAskDiscard(s: Composer): bool = s.open and not(s.discarding)

pure def askDiscard(s: Composer): Composer = { ...s, discarding: true }

pure def canKeepDraft(s: Composer): bool = s.discarding

pure def keepDraft(s: Composer): Composer = { ...s, discarding: false }

pure def canDiscard(s: Composer): bool = s.discarding and not(s.writing) and s.draft.sync != D::Saving

pure def discard(s: Composer): Written = {
  state: { ...s, open: false, discarding: false, stored: false, pending: false, offered: 0, shown: 0 },
  out: List(Forget({ draft: s.id })),
}
```

### After a send, the draft is forgotten only if it was not edited after what was sent

```quint
pure def canSentAway(s: Composer, draft: int, edits: int): bool =
  s.open and not(s.writing) and draft == s.id and edits == s.draft.edits and s.draft.sync != D::Saving

pure def sentAway(s: Composer, draft: int, edits: int): Written = {
  state: { ...s, open: false, discarding: false, stored: false, pending: false, offered: 0, shown: 0 },
  out: List(Forget({ draft: s.id })),
}
```

### A draft is forgotten only when the owner confirmed discarding it, or when it was sent

```quint
pure def stepADraftIsForgottenOnlyWhenDiscardedOrSent(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Forget(f) =>
      f.draft == before.id and not(before.writing) and not(after.open)
        and ((via == "discard" and before.discarding) or via == "sentAway")
    | _ => true
  })
```

### A draft can wait on the shelf

```quint
pure def sometimesADraftIsSetAside(s: Composer): bool = s.shelf > 0 and not(s.open)
```

## Story: Use a suggestion Alpha drafted

> As the owner, I want to see what Alpha suggests for my draft before it
> goes in, and nothing Alpha suggests to be sent without me.

### Alpha offers a suggestion for the open draft, replacing one not yet used

```quint
pure def canSuggest(s: Composer, suggestion: int): bool = s.open and suggestion != 0 and suggestion != s.offered

pure def suggest(s: Composer, suggestion: int): Composer = { ...s, offered: suggestion, shown: 0 }
```

### The owner reviews the suggestion, and puts it in the draft as an edit or sets it aside

The draft then needs its own review before it is sent, as after any edit.

```quint
pure def canReviewSuggestion(s: Composer): bool = s.offered != 0 and s.shown == 0

pure def reviewSuggestion(s: Composer): Composer = { ...s, shown: s.offered }

pure def canUseSuggestion(s: Composer): bool = canWrite(s) and s.shown != 0

pure def useSuggestion(s: Composer, now: int): Composer = edited(now, { ...s, offered: 0, shown: 0 })

pure def canDismissSuggestion(s: Composer): bool = s.offered != 0

pure def dismissSuggestion(s: Composer): Composer = { ...s, offered: 0, shown: 0 }
```

### Only the suggestion the owner was shown goes into the open draft, once

```quint
pure def alwaysTheShownSuggestionIsTheOneOffered(s: Composer): bool =
  (s.offered != 0 implies s.open) and (s.shown != 0 implies s.shown == s.offered)

pure def stepASuggestionIsUsedOnlyAfterReview(before: Composer, via: str, after: Composer): bool =
  via == "useSuggestion" implies
    (before.shown != 0 and before.shown == before.offered and after.offered == 0 and after.draft.edits == before.draft.edits + 1)
```

### A suggestion can be under review

```quint
pure def sometimesASuggestionIsShown(s: Composer): bool = s.shown != 0
```
