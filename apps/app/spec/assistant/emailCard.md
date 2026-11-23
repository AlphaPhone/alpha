# Email card

An email the agent drafted for the owner, reviewed and sent inside the
conversation that asked for it (#1390). The draft is staged from the reply's
action results only when the reply's binding is the selected conversation
and session, and kept on the chat's draft shelf
(`inbox-drafts:v1:chat:` and a hash of origin, owner, agent, conversation,
Cloud environment, user and organization), so it stays with the
conversation after a reload or a decline. Every edit is coalesced and saved;
each edited version gets its own Gmail request id, so an edited draft stays
sendable, and Send dispatches once through Inbox's `sendAgentEmail` (#1412):
an unedited card is sent under the request identity of the owner turn that
asked for it, each later version under one derived from the card, its
account and that content, so a retry of the same version reaches the same
receipt instead of a second send. The card is marked sending before the
request is made, and only a card waiting to be sent can change.
A To entry of "self", "me" or "myself" shows the selected account's address
until the owner edits it. Every recipient is listed before Send.

## Story: Send an email my agent drafted, from the chat

> As the owner, I want to edit and send the email my agent drafted right in
> the conversation, see whether Gmail took it, and never send it twice.

### Send is offered for a draft with an account, valid recipients and a body, and dispatches once per version

```quint
type EmailState = DraftEmail | SendingEmail | SentEmail | RejectedEmail | UncertainEmail | DeclinedEmail
type SendAnswer = Unsent | Delivered | GmailRejected | NoAnswer
type EmailCard = { state: EmailState, version: int, dispatchedVersion: int, dispatches: int, account: bool, recipients: bool, body: bool, typing: bool }
pure val initial: EmailCard = { state: DraftEmail, version: 1, dispatchedVersion: 0, dispatches: 0, account: true, recipients: true, body: true, typing: false }
pure def sendable(e: EmailCard): bool = e.state == DraftEmail and e.account and e.recipients and e.body and not(e.typing)
pure def canEditDraft(e: EmailCard, recipients: bool, body: bool): bool = e.state == DraftEmail
pure def editDraft(e: EmailCard, recipients: bool, body: bool): EmailCard = { ...e, version: e.version + 1, recipients: recipients, body: body }
pure def canTypingChanges(e: EmailCard, typing: bool): bool = e.typing != typing
pure def typingChanges(e: EmailCard, typing: bool): EmailCard = { ...e, typing: typing }
pure def canSendEmail(e: EmailCard): bool = sendable(e) and e.dispatchedVersion != e.version
pure def sendEmail(e: EmailCard): EmailCard = { ...e, state: SendingEmail, dispatchedVersion: e.version, dispatches: e.dispatches + 1 }
pure def canAnswer(e: EmailCard, said: SendAnswer): bool = e.state == SendingEmail
pure def answer(e: EmailCard, said: SendAnswer): EmailCard =
  { ...e, state: if (said == Unsent) DraftEmail else if (said == Delivered) SentEmail else if (said == GmailRejected) RejectedEmail else UncertainEmail,
    version: if (said == Unsent) e.version + 1 else e.version }
pure def canDecline(e: EmailCard): bool = e.state == DraftEmail
pure def decline(e: EmailCard): EmailCard = { ...e, state: DeclinedEmail }
pure def alwaysOneDispatchPerVersion(e: EmailCard): bool = e.dispatchedVersion <= e.version and e.dispatches <= e.version
pure def stepAnUncertainSendIsNeverResent(before: EmailCard, via: str, after: EmailCard): bool =
  before.state == UncertainEmail implies after.dispatches == before.dispatches
pure def sometimesSentAfterAnEdit(e: EmailCard): bool = e.state == SentEmail and e.version >= 2
pure def sometimesUnsentBackToDraft(e: EmailCard): bool = e.state == DraftEmail and e.dispatches >= 1
pure def sometimesUncertain(e: EmailCard): bool = e.state == UncertainEmail
```

### A turn offers at most one email card: exactly one valid draft, with one to twenty recipients, a one-line subject and a body

An offer is taken from a turn only when exactly one matching action result
carries a valid draft (one to twenty recipients, a subject on one line, a
body that is not blank); any second or invalid offer means none. A thread
reply, copies, attachments or a scheduled time are left to Inbox. The card
is staged only while the turn's conversation and session are the current
ones, and only once.

```quint
pure val cardRecipientLimit = 20
pure def validDraft(recipients: int, subjectLines: int, bodyBlank: bool): bool =
  recipients >= 1 and recipients <= cardRecipientLimit and subjectLines <= 1 and not(bodyBlank)
pure def offerAccepted(matching: int, valid: bool): bool = matching == 1 and valid
pure def staged(matching: int, valid: bool, inTurn: bool, alreadyStaged: bool): bool = offerAccepted(matching, valid) and inTurn and not(alreadyStaged)
pure def lawAnAmbiguousTurnOffersNoCard(valid: bool): bool = not(offerAccepted(2, valid)) and not(offerAccepted(0, valid))
pure def lawACardIsStagedOnce(matching: int, valid: bool): bool = not(staged(matching, valid, true, true))
pure def lawTooManyRecipientsIsNoDraft(lines: int): bool = not(validDraft(cardRecipientLimit + 1, lines, false))
pure val matchingValues = Set(0, 1, 2)
pure val linesValues = Set(0, 1, 2)
```

### Send needs literal recipients, each listed once, under the account the card was drafted for; a word for me stands for that account until the first edit

A To of "self", "me" or "myself" shows the selected account's address and
is sent as that address only once the owner's first edit made it literal.
Edits show exactly as typed. Sent, rejected and unconfirmed are final; an
unconfirmed send is checked in Inbox, never sent again.

```quint
pure def sendRecipientsOk(count: int, distinct: int, literal: bool, sameAccount: bool): bool =
  literal and sameAccount and count >= 1 and count <= cardRecipientLimit and distinct == count
pure def finalState(s: EmailState): bool = s == SentEmail or s == RejectedEmail or s == UncertainEmail or s == DeclinedEmail
pure def lawARepeatedRecipientBlocksSend(count: int): bool = count >= 2 implies not(sendRecipientsOk(count, count - 1, true, true))
pure def lawAnotherAccountNeverSends(count: int): bool = not(sendRecipientsOk(count, count, true, false))
pure def alwaysAFinalCardIsNeverSendable(e: EmailCard): bool = finalState(e.state) implies not(sendable(e))
pure val countValues = Set(1, 2, 21)
```
