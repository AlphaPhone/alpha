# Agent email drafts

When the agent drafts a new email in a chat turn (a successful message action in local-compose mode
for the Inbox, advertised by the phone as `gmail.local-compose.v1`), the chat shows it as an email
card the owner can edit, send or decline. The card stays with its conversation and account after a
reload or a decline. Sending goes through the reviewed operation journal of the account it was
drafted for. An unedited card is sent under the request identity of the owner turn that asked for it
(upstream `inbox/outgoing`, #39921); each later content version gets its own identity derived from
the card, its account and that content, so an edited card stays sendable and a retry of the same
version reaches the same receipt instead of a second send.

## Story: Send an email the agent drafted for me, after I check it

> As the owner, I want an email the agent drafted to wait in the chat as an editable card, to be
> sent only when I tap Send, once, and to tell me plainly whether it was sent.

### A turn offers at most one email card, staged once for its conversation

An offer is taken from a turn only when exactly one matching action result carries a valid draft
for this request (one to twenty recipients, a subject on one line, a body that is not blank); any
invalid offer means none. A thread reply, copies, attachments or a scheduled time are left to the
Inbox. The card is staged only while the turn's conversation and session are the current ones, and
only once.

```quint
type CardPhase = CardDraft | CardDeclined | CardSending | CardSent | CardRejected | CardUncertain
type EmailCard = {
  messageId: str, conversation: str, grant: str, sender: str, recipients: List[str], literalTo: bool,
  subject: str, body: str, phase: CardPhase, revision: int, version: int
}
type AgentDrafts = { cards: List[EmailCard] }
pure val initial: AgentDrafts = { cards: List() }
pure val cardRecipientLimit: int = 20
pure def offerAccepted(matching: int, valid: bool): bool = matching == 1 and valid
pure def cardOf(s: AgentDrafts, messageId: str): EmailCard =
  s.cards.foldl({ messageId: "", conversation: "", grant: "", sender: "", recipients: List(), literalTo: false, subject: "", body: "", phase: CardDeclined, revision: 0, version: 0 },
    (found, c) => if (c.messageId == messageId) c else found)
pure def hasCard(s: AgentDrafts, messageId: str): bool = s.cards.some(c => c.messageId == messageId)
pure def withCard(c: EmailCard, s: AgentDrafts): AgentDrafts = { cards: s.cards.listMap(o => if (o.messageId == c.messageId) c else o) }
pure def canStage(s: AgentDrafts, card: EmailCard, inTurn: bool): bool =
  inTurn and card.messageId != "" and card.conversation != "" and card.grant != "" and not(hasCard(s, card.messageId))
  and card.phase == CardDraft and card.recipients != List() and card.recipients.length() <= cardRecipientLimit and card.body != ""
pure def stage(s: AgentDrafts, card: EmailCard, inTurn: bool): AgentDrafts = { cards: s.cards.append({ ...card, revision: 1, version: 1 }) }
pure def lawAnAmbiguousTurnOffersNoCard(valid: bool): bool = not(offerAccepted(2, valid)) and not(offerAccepted(0, valid))
pure def alwaysACardIsStagedOnce(s: AgentDrafts): bool = s.cards.every(c => s.cards.select(o => o.messageId == c.messageId).length() == 1)
pure val card1: EmailCard = { messageId: "u1", conversation: "c1", grant: "g1", sender: "me@example.com", recipients: List("ann@example.com"), literalTo: true,
  subject: "Plan", body: "Hi", phase: CardDraft, revision: 1, version: 1 }
pure val cardValues = Set(card1).union(Set({ ...card1, messageId: "u2", recipients: List("me") , literalTo: false }))
pure val inTurnValues = Set(true)
pure val matchingValues = Set(0, 1, 2)
```

### Editing a card makes a new content version, and only a card waiting to be sent can change

The owner's edits show exactly as typed and are kept coalesced. A word for the owner (self, me,
myself) in To stands for the account's address until the first edit.

```quint
pure def editable(c: EmailCard): bool = c.phase == CardDraft
pure def canEditCard(s: AgentDrafts, messageId: str, revision: int, recipients: List[str], subject: str, body: str): bool =
  hasCard(s, messageId) and editable(cardOf(s, messageId)) and cardOf(s, messageId).revision == revision and recipients.length() <= cardRecipientLimit
pure def editCard(s: AgentDrafts, messageId: str, revision: int, recipients: List[str], subject: str, body: str): AgentDrafts = {
  val c = cardOf(s, messageId)
  withCard({ ...c, recipients: recipients, subject: subject, body: body, literalTo: true, revision: c.revision + 1, version: c.version + 1 }, s)
}
pure def canDecline(s: AgentDrafts, messageId: str): bool = hasCard(s, messageId) and editable(cardOf(s, messageId))
pure def decline(s: AgentDrafts, messageId: str): AgentDrafts = withCard({ ...cardOf(s, messageId), phase: CardDeclined }, s)
pure def stepAnEditIsANewVersion(before: AgentDrafts, via: str, after: AgentDrafts): bool =
  via == "editCard" implies after.cards.some(c => before.cards.some(o => o.messageId == c.messageId and c.version == o.version + 1))
pure val messageIdValues = Set("u1", "u2")
pure val revisionValues = Set(1, 2)
pure val recipientsValues = Set(List("ann@example.com")).union(Set(List()))
pure val subjectValues = Set("Plan", "Plan B")
pure val bodyValues = Set("Hi", "")
pure def sometimesEditedCard(s: AgentDrafts): bool = s.cards.some(c => c.version >= 2 and c.phase == CardDraft)
```

### Send dispatches the card once, and its outcome is final unless nothing was sent

Send needs literal recipients (one to twenty, each once) and a body, under the account the card was
drafted for. The card is marked sending before the request is made. An unsent result returns it to
the draft; sent, rejected and unconfirmed are final, and an unconfirmed send is checked in the Inbox,
never sent again.

```quint
type SendOutcome = OutcomeUnsent | OutcomeSent | OutcomeRejected | OutcomeUncertain
pure def canBeginSend(s: AgentDrafts, messageId: str, revision: int, literalRecipients: bool, sameAccount: bool): bool = {
  val c = cardOf(s, messageId)
  hasCard(s, messageId) and c.phase == CardDraft and c.revision == revision and literalRecipients and sameAccount
  and c.recipients != List() and c.recipients.length() <= cardRecipientLimit and c.body != ""
  and c.recipients.every(r => c.recipients.select(o => o == r).length() == 1)
}
pure def beginSend(s: AgentDrafts, messageId: str, revision: int, literalRecipients: bool, sameAccount: bool): AgentDrafts =
  withCard({ ...cardOf(s, messageId), phase: CardSending }, s)
pure def canSendSettled(s: AgentDrafts, messageId: str, outcome: SendOutcome): bool = hasCard(s, messageId) and cardOf(s, messageId).phase == CardSending
pure def sendSettled(s: AgentDrafts, messageId: str, outcome: SendOutcome): AgentDrafts =
  withCard({ ...cardOf(s, messageId), phase: if (outcome == OutcomeSent) CardSent else if (outcome == OutcomeRejected) CardRejected else if (outcome == OutcomeUncertain) CardUncertain else CardDraft }, s)
pure def stepASettledCardIsNeverSentAgain(before: AgentDrafts, after: AgentDrafts): bool =
  before.cards.every(c => (c.phase == CardSent or c.phase == CardRejected or c.phase == CardUncertain or c.phase == CardDeclined) implies after.cards.includes(c))
pure def sometimesCardSent(s: AgentDrafts): bool = s.cards.some(c => c.phase == CardSent)
pure def sometimesCardUncertain(s: AgentDrafts): bool = s.cards.some(c => c.phase == CardUncertain)
```
