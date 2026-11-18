# One draft

What one draft the owner writes in Inbox holds, whether it is open in the
[composer](./drafts.md) or set aside: how it began, the account it is sent
from, its recipients and attachments, its text as the kit's
[draft](../../kit/draft.md), the revision a review binds to, its copy in
Gmail's Drafts, and what is known of sending it. The composer moves it
only through these.

## Story: Begin a draft

> As the owner, I want a reply to go where the message asks replies to go,
> a reply to all to reach everyone on it, and a forward to carry the
> original's attachments.

### A draft has its own number, the cloud session it was written in, how it began, its From account, recipients and attachments, its text, its revision, its Gmail copy, and its send

Gmail draft 0 is none, and so is account 0, attempt 0 and revision sent 0.
A recipient is counted invalid until its address is one Gmail accepts.

```quint
import draft as D from "../../kit/draft"

type Kind = Fresh | Reply | ReplyAll | Forward | Saved
type Letter = {
  id: int, session: int, kind: Kind, account: int, toReplyTo: bool,
  recipients: int, invalid: int, attachments: int, draft: D::Draft, revision: int,
  gmail: int, unsure: bool, behind: int, sending: int, sent: int,
}

pure val blank: Letter = {
  id: 0, session: 0, kind: Fresh, account: 0, toReplyTo: false,
  recipients: 0, invalid: 0, attachments: 0, draft: D::blank, revision: 0,
  gmail: 0, unsure: false, behind: 0, sending: 0, sent: 0,
}
```

### A reply goes to the Reply-To address when the message has one, else to its sender; a reply to all adds everyone else on its To and Cc; a forward starts with the original's attachments

A new message starts empty. `others` counts the addresses on To and Cc
other than the owner and the one replied to.

```quint
pure def begin(id: int, session: int, kind: Kind, account: int, others: int, replyTo: bool, files: int): Letter = {
  ...blank, id: id, session: session, kind: kind, account: account,
  toReplyTo: replyTo and (kind == Reply or kind == ReplyAll),
  recipients: if (kind == Reply) 1 else if (kind == ReplyAll) 1 + others else 0,
  attachments: if (kind == Forward) files else 0,
}

pure def lawAReplyIsToOneAddress(others: int, replyTo: bool): bool =
  val l = begin(1, 1, Reply, 1, others, replyTo, 2)
  l.recipients == 1 and l.toReplyTo == replyTo and l.attachments == 0

pure def lawAReplyToAllReachesEveryone(others: int, replyTo: bool): bool =
  others >= 0 implies begin(1, 1, ReplyAll, 1, others, replyTo, 0).recipients == others + 1

pure def lawAForwardCarriesTheAttachments(files: int, replyTo: bool): bool =
  val l = begin(1, 1, Forward, 1, 3, replyTo, files)
  l.attachments == files and l.recipients == 0 and not(l.toReplyTo)
```

### A draft saved in Gmail opens at the revision Gmail holds, with nothing yet to save

```quint
pure def fromGmail(id: int, session: int, account: int, gmail: int, held: int): Letter = {
  ...blank, id: id, session: session, kind: Saved, account: account, gmail: gmail,
  draft: { ...D::blank, base: held },
}
```

## Story: Change a draft

> As the owner, I want every change I make to need a fresh review before
> it is sent, and a change of sender to leave nothing behind unsaid.

### Every change to what would be sent is a new revision

```quint
pure def edited(l: Letter): Letter = { ...l, draft: D::edit(l.draft), revision: l.revision + 1 }

pure def lawEveryEditIsANewRevision(revision: int, edits: int): bool =
  val l = edited({ ...blank, revision: revision, draft: { ...D::blank, edits: edits } })
  l.revision == revision + 1 and l.draft.edits == edits + 1
```

### Changing the From account moves the draft whole: its Gmail copy stays in the old account's Drafts, and it is saved anew in the new one

The owner is told the old copy remains; deleting it is an
[operation](./sending.md) warned as permanent.

```quint
pure def movedTo(l: Letter, account: int): Letter = {
  ...l, account: account, draft: { ...l.draft, sync: D::Edited, base: 0 }, gmail: 0,
  behind: if (l.gmail != 0) l.account else l.behind, revision: l.revision + 1,
}

pure def lawMovingLeavesTheOldCopyNamed(gmail: int, account: int): bool =
  val l = movedTo({ ...blank, account: 1, gmail: gmail }, account)
  l.gmail == 0 and l.draft.base == 0 and (gmail != 0 implies l.behind == 1)
```

### On a clash, Restore my edits keeps the owner's text to be saved over the latest, and Use latest saved draft takes Gmail's; either is a new revision

```quint
pure def mine(l: Letter): Letter = { ...l, draft: D::keepMine(l.draft), revision: l.revision + 1 }

pure def theirs(l: Letter): Letter = { ...l, draft: D::takeSaved(l.draft), revision: l.revision + 1 }
```

## Story: Save a draft to Gmail

> As the owner, I want a save to Gmail that never makes a second copy of
> my draft, even when its answer is lost.

### A save carries the draft over its revision; one that lands names the Gmail draft, and one that finds another revision saved is a clash

```quint
pure def saveable(l: Letter): bool = D::canSave(l.draft) and not(l.unsure)

pure def saving(l: Letter): Letter = { ...l, draft: D::save(l.draft) }

pure def landed(l: Letter, gmail: int): Letter =
  { ...l, draft: D::land(l.draft), gmail: if (l.gmail == 0) gmail else l.gmail }

pure def clashed(l: Letter, held: int): Letter = { ...l, draft: D::collide(l.draft, held) }
```

### A save whose answer was lost leaves the draft unsure of Gmail's copy, and it is not saved again until Gmail's drafts are read

What the read finds is taken as the save landing; finding nothing means
it did not, and a save may create the copy.

```quint
pure def lost(l: Letter): Letter = { ...l, draft: { ...l.draft, sync: D::Edited }, unsure: true }

pure def found(l: Letter, held: int, gmail: int): Letter = {
  ...l, unsure: false, gmail: if (l.gmail == 0) gmail else l.gmail,
  draft: { ...l.draft, base: held, sync: if (l.draft.edits == l.draft.carried) D::Kept else D::Edited },
}

pure def notFound(l: Letter): Letter = { ...l, unsure: false }

pure def lawALostSaveIsNotRepeated(edits: int, base: int): bool =
  not(saveable(lost(saving({ ...blank, draft: { sync: D::Edited, edits: edits, carried: 0, base: base } }))))
```

### A restart finds a save that was in flight unknown

```quint
pure def recovered(l: Letter): Letter = if (l.draft.sync == D::Saving) lost(l) else l

pure def lawARestartNeverResumesASave(edits: int, base: int): bool =
  val l = recovered(saving({ ...blank, draft: { sync: D::Edited, edits: edits, carried: 0, base: base } }))
  l.unsure and l.draft.sync == D::Edited
```

## Story: Know what was sent

> As the owner, I want a sent draft cleared only when what was sent is what
> I last saw, and otherwise kept and marked as sent.

### A draft remembers the send it was handed to, and the revision a confirmed send carried

A draft marked with the revision it now has reads "Already sent"; one
edited after it reads "Earlier version sent".

```quint
pure def handed(l: Letter, attempt: int): Letter = { ...l, sending: attempt }

pure def markedSent(l: Letter, revision: int): Letter = { ...l, sent: revision }

pure def forgettable(l: Letter, revision: int): bool = l.revision == revision and l.draft.sync != D::Saving

pure def lawAnEditedDraftIsNotForgotten(revision: int): bool =
  not(forgettable(edited({ ...blank, revision: revision }), revision))
```
