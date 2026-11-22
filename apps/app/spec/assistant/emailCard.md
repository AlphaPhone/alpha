# Email card

An email the agent drafted for the owner, reviewed and sent inside the
conversation that asked for it (#1390). The draft is staged from the reply's
action results only when the reply's binding is the selected conversation
and session, and kept on the chat's draft shelf
(`inbox-drafts:v1:chat:` and a hash of origin, owner, agent, conversation,
Cloud environment, user and organization), so it stays with the
conversation after a reload or a decline. Every edit is coalesced and saved;
each edited version gets its own Gmail request id, so an edited draft stays
sendable, and Send dispatches once through Inbox's `sendAgentEmail` (#1412).
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
