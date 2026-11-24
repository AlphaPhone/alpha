# Email card

An email the agent drafted for the owner, reviewed and sent inside the
conversation that asked for it: one [card](./cards.md) of a reply. The
send itself is Inbox's, through Gmail; this spec is what the card offers,
and that each version of it is sent at most once. The card is kept on its
conversation's shelf on the phone, so it stays with the conversation after a
reload or a decline, and never shows in another conversation or account.

## Story: Send an email my agent drafted, from the chat

> As the owner, I want to edit and send the email my agent drafted right in
> the conversation, see whether Gmail took it, and never send it twice.

### A card is drafting, sending, sent, rejected by Gmail, unsure, or declined, at a version, with the send of its last version as an attempt

Every edit makes a new version. The send is an
[attempt](../../kit/attempt.md) under its own number, marked as sending
before it is asked.

```quint
import attempt as A from "../../kit/attempt"

type State = Unstaged | Drafting | Sending | Sent | Rejected | Unsure | Declined
type Email = {
  state: State, version: int, send: A::Attempt, sentVersion: int,
  account: bool, recipients: bool, body: bool, typing: bool,
}

pure val initial: Email = {
  state: Unstaged, version: 1, send: A::plan(0), sentVersion: 0, account: true, recipients: true, body: true, typing: false,
}

pure def final(s: State): bool = s == Sent or s == Rejected or s == Unsure or s == Declined

pure def sendable(e: Email): bool = e.state == Drafting and e.account and e.recipients and e.body and not(e.typing)
```

### What a card needs done outside comes back as an answer naming its ticket

The draft sent through Inbox: an unedited card under the request identity
of the owner's turn that asked for it, each later version under one made
from the card and that version, so that a retry of the same version reaches
the same receipt instead of a second email.

```quint
type Identity = OwnerTurn | OfVersion
type Effect = Dispatch({ attempt: int, version: int, identity: Identity })
type Moved = { state: Email, out: List[Effect] }

pure def identityOf(version: int): Identity = if (version == 1) OwnerTurn else OfVersion
```

### What the simulator tries

```quint
pure val attemptValues = Set(1, 2, 3)
pure val shownValues = Set(1, 2)
pure val matchingValues = Set(0, 1, 2)
pure val weight_answer = 3
```

### A turn offers at most one card: exactly one valid draft, with one to twenty recipients, a one-line subject and a body, staged once while its conversation is the one showing

A thread reply, copies, attachments or a scheduled time are left to
Inbox. A card already on the shelf is shown as it was kept, never staged
again.

```quint
pure val recipientLimit = 20

pure def validDraft(recipients: int, subjectLines: int, blank: bool): bool =
  recipients >= 1 and recipients <= recipientLimit and subjectLines <= 1 and not(blank)

pure def offered(matching: int, valid: bool): bool = matching == 1 and valid

pure def canStage(e: Email, matching: int, valid: bool, current: bool): bool =
  e.state == Unstaged and offered(matching, valid) and current

pure def stage(e: Email, matching: int, valid: bool, current: bool): Email = { ...e, state: Drafting }

pure val recipientsValues = Set(0, 1, 20, 21)
pure val subjectLinesValues = Set(0, 1, 2)

pure def lawAnAmbiguousTurnOffersNoCard(valid: bool): bool = not(offered(2, valid)) and not(offered(0, valid))

pure def lawTooManyRecipientsIsNoDraft(subjectLines: int): bool = not(validDraft(recipientLimit + 1, subjectLines, false))
```

### A card waiting to be sent is edited only at the version it shows, and each edit is a new version

```quint
pure def canEdit(e: Email, shown: int, recipients: bool, body: bool): bool = e.state == Drafting and shown == e.version

pure def edit(e: Email, shown: int, recipients: bool, body: bool): Email =
  { ...e, version: e.version + 1, recipients: recipients, body: body }

pure def canTyped(e: Email, typing: bool): bool = e.typing != typing and e.state == Drafting

pure def typed(e: Email, typing: bool): Email = { ...e, typing: typing }
```

### Send is offered for a draft with its account, valid recipients and a body, while the owner is not typing, once per version

```quint
pure def canSend(e: Email): bool = sendable(e) and e.sentVersion != e.version

pure def send(e: Email): Moved =
  val sending = A::dispatch(A::record(A::plan(e.send.id + 1)))
  { state: { ...e, state: Sending, send: sending, sentVersion: e.version },
    out: List(Dispatch({ attempt: sending.id, version: e.version, identity: identityOf(e.version) })) }
```

### Inbox's answer ends the send: never sent goes back to drafting under a new version, delivered is sent, rejected is rejected, and no answer is unsure

An unsure card is checked in Inbox, never sent again.

```quint
type Said = NeverSent | Delivered | GmailRefused | NoAnswer

pure def canAnswer(e: Email, attempt: int, said: Said): bool = e.state == Sending and A::canConclude(e.send, attempt)

pure def answer(e: Email, attempt: int, said: Said): Email =
  if (said == NeverSent) { ...e, state: Drafting, version: e.version + 1, send: A::conclude(e.send, false, true) }
  else if (said == Delivered) { ...e, state: Sent, send: A::conclude(e.send, true, true) }
  else if (said == GmailRefused) { ...e, state: Rejected, send: A::conclude(e.send, false, true) }
  else { ...e, state: Unsure, send: A::conclude(e.send, false, false) }
```

### Decline puts the card away without sending

```quint
pure def canDecline(e: Email): bool = e.state == Drafting

pure def decline(e: Email): Email = { ...e, state: Declined }
```

### A reload while a send is under way makes it unsure

```quint
pure def reload(e: Email): Email =
  if (e.state == Sending) { ...e, state: Unsure, send: A::conclude(e.send, false, false) } else e
```

### Each version is sent at most once, and a card is sending exactly while its send is under way

```quint
pure def alwaysOneSendPerVersion(e: Email): bool =
  e.sentVersion >= 0 and e.sentVersion <= e.version and e.send.id >= 0 and e.send.id <= e.sentVersion
    and (e.state == Sending) == (e.send.outcome == A::Sent)
    and (e.send.outcome == A::Planned implies e.send.id == 0)
    and (e.state == Unstaged implies e.send.id == 0)
```

### A card that ended is never sent, and an unsure send is never sent again

```quint
pure def alwaysAnEndedCardIsNeverSendable(e: Email): bool = final(e.state) implies not(sendable(e))

pure def stepAnUnsureSendIsNeverSentAgain(before: Email, via: str, after: Email, out: List[Effect]): bool =
  (final(before.state) implies (after.send == before.send and out == List()))
    and out.every(x => match x { | Dispatch(d) => via == "send" and d.version == before.version and before.sentVersion != before.version })
```

### Send needs literal recipients, each listed once, under the account the card was drafted for

A To of "self", "me" or "myself" shows the account's address and is sent as
that address only once the owner's first edit made it literal.

```quint
pure def recipientsOk(count: int, distinct: int, literal: bool, sameAccount: bool): bool =
  literal and sameAccount and count >= 1 and count <= recipientLimit and distinct == count

pure val countValues = Set(1, 2, 21)

pure def lawARepeatedRecipientBlocksSend(count: int): bool = count >= 2 implies not(recipientsOk(count, count - 1, true, true))

pure def lawAnotherAccountNeverSends(count: int): bool = not(recipientsOk(count, count, true, false))
```

### A card can be sent after an edit, go back to drafting when it never left, and be unsure

```quint
pure def sometimesSentAfterAnEdit(e: Email): bool = e.state == Sent and e.version >= 2

pure def sometimesBackToDrafting(e: Email): bool = e.state == Drafting and e.send.id >= 1

pure def sometimesUnsure(e: Email): bool = e.state == Unsure
```
