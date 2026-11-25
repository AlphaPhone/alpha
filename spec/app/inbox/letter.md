# One draft

What one draft the owner writes in Inbox holds, whether it is open in the
[composer](./drafts.md) or set aside: how it began, the account it is sent
from, its recipients and attachments, its text as the kit's
[draft](../../kit/draft.md), the revision a review binds to, its copy in
Gmail's Drafts, and what is known of sending it. The composer moves it
only through these, and the [operations](./sending.md) read it as the
composer holds it.

## Story: Begin a draft

> As the owner, I want a reply to go where the message asks replies to go,
> a reply to all to reach everyone on it, and a forward to carry the
> original's attachments where the account can forward them.

### A draft has its own number, the cloud session it was written in, how it began, its From account, recipients and attachments, its text, its revision, its Gmail copy, and its send

Gmail draft 0 is none, and so is account 0, attempt 0 and revision sent 0;
a draft begins at revision 1.
A recipient is counted invalid until its address is one Gmail accepts.
Attachments are counted with their total size in MiB. A draft is handed
to one operation at a time, to be sent, saved to Gmail or deleted from
it; `doubt` names a send whose outcome is unknown, with the revision it
carried.

```quint
import draft as D from "../../kit/draft"

type Kind = Fresh | Reply | ReplyAll | Forward | Saved
type Use = ToSend | ToSave | ToDelete
type Doubt = { attempt: int, revision: int }
type Policy = { files: int, mib: int }
type Letter = {
  id: int, session: int, kind: Kind, account: int, toReplyTo: bool,
  recipients: int, invalid: int, attachments: int, mib: int, textOnly: bool,
  draft: D::Draft, revision: int, gmail: int, unsure: bool, verified: int,
  sending: int, use: Use, sent: int, doubt: Doubt,
}

pure val noDoubt: Doubt = { attempt: 0, revision: 0 }

pure val blank: Letter = {
  id: 0, session: 0, kind: Fresh, account: 0, toReplyTo: false,
  recipients: 0, invalid: 0, attachments: 0, mib: 0, textOnly: false,
  draft: D::blank, revision: 0, gmail: 0, unsure: false, verified: 0,
  sending: 0, use: ToSend, sent: 0, doubt: noDoubt,
}

pure val policyValues = Set({ files: 1, mib: 5 }, { files: 3, mib: 5 })
```

### Attachments stay within what the From account accepts: so many files, and so much in all

The account's limits come from the cloud with its capabilities; an
account that takes one attachment per email has a limit of one file.

```quint
pure def within(attachments: int, mib: int, policy: Policy): bool =
  0 <= attachments and attachments <= policy.files and 0 <= mib and mib <= policy.mib

pure def canAttach(l: Letter, policy: Policy, mib: int): bool =
  mib >= 1 and within(l.attachments + 1, l.mib + mib, policy)

pure def attach(l: Letter, mib: int): Letter = { ...l, attachments: l.attachments + 1, mib: l.mib + mib }

pure def lawAttachingStaysWithinTheLimit(attachments: int, mib: int, policy: Policy, more: int): bool =
  val l = { ...blank, attachments: attachments, mib: mib }
  canAttach(l, policy, more) implies within(attach(l, more).attachments, attach(l, more).mib, policy)
```

### A reply goes to the Reply-To address when the message has one, else to its sender; a reply to all adds everyone else on its To and Cc; a forward carries the original's attachments only where the account may forward them and they fit, and is otherwise text only and says so

A new message starts empty. `others` counts the addresses on To and Cc
other than the owner and the one replied to.

```quint
pure def begin(id: int, session: int, kind: Kind, account: int, others: int, replyTo: bool, files: int, mib: int, forwardable: bool, policy: Policy): Letter =
  val carries = kind == Forward and files > 0 and forwardable and within(files, mib, policy)
  {
    ...blank, id: id, session: session, kind: kind, account: account, revision: 1,
    toReplyTo: replyTo and (kind == Reply or kind == ReplyAll),
    recipients: if (kind == Reply) 1 else if (kind == ReplyAll) 1 + others else 0,
    attachments: if (carries) files else 0, mib: if (carries) mib else 0,
    textOnly: kind == Forward and files > 0 and not(carries),
  }

pure def lawAReplyIsToOneAddress(others: int, replyTo: bool, policy: Policy): bool =
  val l = begin(1, 1, Reply, 1, others, replyTo, 2, 2, true, policy)
  l.recipients == 1 and l.toReplyTo == replyTo and l.attachments == 0

pure def lawAReplyToAllReachesEveryone(others: int, replyTo: bool, policy: Policy): bool =
  others >= 0 implies begin(1, 1, ReplyAll, 1, others, replyTo, 0, 0, true, policy).recipients == others + 1

pure def lawAForwardCarriesWhatItMay(files: int, mib: int, forwardable: bool, policy: Policy): bool =
  val l = begin(1, 1, Forward, 1, 3, true, files, mib, forwardable, policy)
  (policy.files >= 0 and policy.mib >= 0) implies (
    l.recipients == 0 and not(l.toReplyTo) and within(l.attachments, l.mib, policy)
      and (l.attachments == files or (l.attachments == 0 and (files <= 0 or l.textOnly)))
  )
```

### A draft saved in Gmail opens at the revision Gmail holds, with nothing yet to save

```quint
pure def fromGmail(id: int, session: int, account: int, gmail: int, held: int): Letter = {
  ...blank, id: id, session: session, kind: Saved, account: account, gmail: gmail, revision: 1,
  draft: { ...D::blank, base: held },
}
```

## Story: Change a draft

> As the owner, I want every change I make to need a fresh review before
> it is sent, and the sender changed only where nothing is left behind.

### Every change to what would be sent is a new revision

Text put in from elsewhere is a change to the text only: it never adds
or removes an attachment.

```quint
pure def edited(l: Letter): Letter = { ...l, draft: D::edit(l.draft), revision: l.revision + 1 }

pure def lawEveryEditIsANewRevision(revision: int, edits: int): bool =
  val l = edited({ ...blank, revision: revision, draft: { ...D::blank, edits: edits } })
  l.revision == revision + 1 and l.draft.edits == edits + 1

pure def lawTextAddsNoAttachment(attachments: int, mib: int): bool =
  val l = edited({ ...blank, attachments: attachments, mib: mib })
  l.attachments == attachments and l.mib == mib
```

### Only a new message with no copy in Gmail changes its From account; a reply, a forward or a Gmail draft keeps the account it came from

It moves whole, once no save, clash, unsure copy or send is pending.

```quint
pure def canMove(l: Letter): bool =
  l.kind == Fresh and l.gmail == 0 and l.sending == 0 and not(l.unsure)
    and l.draft.sync != D::Saving and l.draft.sync != D::Conflicted

pure def movedTo(l: Letter, account: int): Letter =
  { ...l, account: account, draft: { ...l.draft, sync: D::Edited, base: 0 }, verified: 0, revision: l.revision + 1 }

pure def lawRepliesForwardsAndGmailDraftsKeepTheirAccount(kind: Kind, gmail: int): bool =
  (kind != Fresh or gmail != 0) implies not(canMove({ ...blank, kind: kind, gmail: gmail }))
```

### On a clash, Restore my edits keeps the owner's text to be saved over the latest, and Use latest saved draft takes Gmail's; either is a new revision

```quint
pure def mine(l: Letter): Letter = { ...l, draft: D::keepMine(l.draft), revision: l.revision + 1 }

pure def theirs(l: Letter): Letter = { ...l, draft: D::takeSaved(l.draft), revision: l.revision + 1 }
```

## Story: Save a draft to Gmail

> As the owner, I want a save to Gmail that never makes a second copy of
> my draft or writes over a copy changed elsewhere without my choosing.

### A draft is ready to save when it has edits, is sure of its Gmail copy, and is handed to nothing; replacing a Gmail copy also needs that copy read unchanged at this revision

Gmail has no compare-and-swap: what Alpha can detect is a copy that
changed before the review, read just before it.

```quint
pure def saveable(l: Letter): bool =
  D::canSave(l.draft) and not(l.unsure) and l.sending == 0 and (l.gmail != 0 implies l.verified == l.revision)
```

### A Gmail copy read unchanged since the revision it was made on lets the draft be saved over it; one changed is a clash; one gone is saved anew

```quint
pure def readCopy(l: Letter, found: bool, held: int): Letter =
  if (not(found)) { ...l, gmail: 0, verified: 0, draft: { ...l.draft, base: 0 } }
  else if (held == l.draft.base) { ...l, verified: l.revision }
  else { ...l, draft: D::collide(l.draft, held), verified: 0 }
```

### A draft handed to a save is saving; a save that lands names the Gmail draft and advances the revision, one refused leaves the edits to save, and one whose outcome is unknown leaves the draft unsure of Gmail's copy

```quint
pure def handed(l: Letter, attempt: int, use: Use): Letter =
  { ...l, sending: attempt, use: use, draft: if (use == ToSave) D::save(l.draft) else l.draft }

pure def landed(l: Letter, gmail: int): Letter =
  { ...l, draft: D::land(l.draft), gmail: if (l.gmail == 0) gmail else l.gmail, sending: 0, verified: 0 }

pure def unsent(l: Letter): Letter =
  { ...l, sending: 0, draft: if (l.draft.sync == D::Saving) { ...l.draft, sync: D::Edited } else l.draft }

pure def lost(l: Letter): Letter =
  { ...l, sending: 0, unsure: true, verified: 0, draft: if (l.draft.sync == D::Saving) { ...l.draft, sync: D::Edited } else l.draft }
```

### A draft unsure of its Gmail copy is not saved again until Gmail's drafts are read

What the read finds is taken as the save landing; finding nothing means
it did not, and a save may create the copy.

```quint
pure def found(l: Letter, held: int, gmail: int): Letter = {
  ...l, unsure: false, gmail: if (l.gmail == 0) gmail else l.gmail,
  draft: { ...l.draft, base: held, sync: if (l.draft.edits == l.draft.carried) D::Kept else D::Edited },
}

pure def notFound(l: Letter): Letter = { ...l, unsure: false }

pure def lawALostSaveIsNotRepeated(edits: int, base: int): bool =
  not(saveable(lost(handed({ ...blank, draft: { sync: D::Edited, edits: edits, carried: 0, base: base } }, 1, ToSave))))
```

## Story: Know what was sent

> As the owner, I want a sent draft cleared only when what was sent is what
> I last saw, and otherwise kept and marked as sent.

### A confirmed send marks the revision it carried; an unknown one is remembered with its revision; a draft marked with the revision it now has reads "Already sent", one edited after it "Earlier version sent"

A send the earlier Alpha could not confirm is remembered with its
revision and no attempt of this Alpha's.

```quint
pure def markedSent(l: Letter, revision: int): Letter = { ...l, sent: revision, sending: 0, doubt: noDoubt }

pure def doubted(l: Letter, attempt: int, revision: int): Letter =
  { ...l, sending: 0, doubt: { attempt: attempt, revision: revision } }

pure def mayHaveGone(l: Letter): bool = l.sent >= 1 or l.doubt != noDoubt

pure def forgettable(l: Letter, revision: int): bool = l.revision == revision and l.draft.sync != D::Saving

pure def lawAnEditedDraftIsNotForgotten(revision: int): bool =
  not(forgettable(edited({ ...blank, revision: revision }), revision))
```

### A send found in Gmail's Sent counts as sent and is a change to what the draft shows; one not found is known not to have gone

```quint
pure def foundSent(l: Letter): Letter = { ...l, sent: l.doubt.revision, doubt: noDoubt, revision: l.revision + 1 }

pure def notSent(l: Letter): Letter = { ...l, doubt: noDoubt }

pure def lawAFoundSendChangesTheDraft(revision: int, attempt: int): bool =
  val l = foundSent(doubted({ ...blank, revision: revision }, attempt, revision))
  l.revision == revision + 1 and l.sent == revision and l.doubt == noDoubt
```

### A draft the earlier Alpha kept comes over as one not sent, one sent as it is, an earlier version of one sent, or one whose send the earlier Alpha could not confirm, which may have gone

It keeps its account, how it began, its recipients, its attachments and
its Gmail copy, and has edits not yet saved to Gmail. A forward whose
original attachments the earlier Alpha would have fetched from Gmail
comes over as text only. Only one known not to have been sent can be
sent without the owner choosing to send it again.

```quint
type Before = NotSent | SentAsIs | SentEarlier | MaybeSent

pure def earlier(id: int, session: int, kind: Kind, account: int, recipients: int, invalid: int, files: int, megabytes: int, textOnly: bool, copy: int, before: Before): Letter =
  val l = {
    ...blank, id: id, session: session, kind: kind, account: account, recipients: recipients, invalid: invalid,
    attachments: files, mib: megabytes, textOnly: textOnly, gmail: copy, revision: if (before == SentEarlier) 2 else 1,
    draft: { ...D::blank, sync: D::Edited, edits: 1, base: if (copy != 0) 1 else 0 },
  }
  if (before == SentAsIs or before == SentEarlier) { ...l, sent: 1 }
  else if (before == MaybeSent) { ...l, doubt: { attempt: 0, revision: 1 } }
  else l

pure def lawOnlyAnEarlierDraftKnownUnsentIsFreeToSend(kind: Kind, copy: int, before: Before): bool =
  mayHaveGone(earlier(1, 1, kind, 1, 1, 0, 0, 0, false, copy, before)) iff before != NotSent

pure def lawAnEarlierSentVersionIsMarkedAsSuch(before: Before): bool =
  val l = earlier(1, 1, Fresh, 1, 1, 0, 0, 0, false, 0, before)
  (before == SentAsIs implies l.sent == l.revision) and (before == SentEarlier implies (l.sent >= 1 and l.sent < l.revision))
```

### A send found leaves alone the operation the draft was handed to meanwhile

Discovered by the proof: the check can answer after the draft was handed
to a save or a deletion, which is still under way.

```quint
pure def lawAFoundSendLeavesAHandOverAlone(revision: int, attempt: int, use: Use): bool =
  val l = foundSent(handed(doubted({ ...blank, revision: revision }, attempt, revision), attempt + 1, use))
  l.sending == attempt + 1 and l.use == use
```
