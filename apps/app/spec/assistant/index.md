# Assistant

The assistant is how the owner talks to the resident agent from anywhere on
the phone: a compact dock that rests on Home and every app, the full sheet it
opens into, and the assistant screen. It holds the owner's conversations, the
composer and its durable drafts, chat attachments, chat search, the reply as
it streams with its cards, and the review of every device action the agent
proposes. The resident agent's own turn, reply stream, device execution and
approval rules are upstream (`@elizaos/agent/client`, `spec/agent/**` of
Eliza); these specs state what Alpha's renderer must do on top of them.

Every area that hands something to the assistant does it through the
`Assistant` service of `src/assistant/layer.vibe`: `openWith(draft)` opens the
sheet with an editable draft that the owner sends, and `attach(item)` adds a
reviewed attachment to the composer. Nothing handed over is ever sent by the
handing area.

- [Dock](./dock.md): the dock's detents and the one effect of each gesture.
- [Drafts](./draft.md): composer text that survives layout, conversation changes and restarts.
- [Send](./send.md): composer and handed-over sends, the typing indicator and what a failed send restores.
- [First send](./firstSend.md): moving a new chat's draft into the conversation its first send created.
- [Conversation](./conversation.md): the client attachment, epochs, proposals and the consumed set.
- [Attachments](./attachments.md): files, photos and captures, their custody and limits.
- [Search](./search.md): chat search that only answers its live owner.
- [Reply](./reply.md): how a reply renders: text, fences, cards, notices, failures and acknowledgments.
- [Email card](./emailCard.md): an email the agent drafted, reviewed and sent inside the chat.
- [Receipts](./receipts.md): honest attribution of what a turn's actions did, and action history.
- [Approvals](./approvals.md): live and recovered action cards, decline and the card's states.
- [Recovery](./recovery.md): the listing of pending actions, read once per session, history and screen.
- [Review](./review.md): which proposal may produce a device effect, on whose authority, and at most once.
- [Decision](./decision.md): one owner decision on a workflow approval request.
- [Stopped reply](./stoppedReply.md): the single later check after the owner stopped a reply.
- [Turn context](./context.md): what a turn tells the agent about the screen, the phone's location and hosted inference.
- [Entry](./entry.md): opening the assistant from the system assist gesture, and withdrawing a request.
- [Withdrawal](./withdrawal.md): giving up on a bridge request so that it never reaches the agent later.
- [Suggestion](./suggestion.md): inserting one exact reviewed suggestion into a text field.
- [Notice question](./noticeQuestion.md): asking the assistant about one of Alpha's own notifications.

## Story: Ask my assistant from anywhere

> As the owner, I want my assistant one tap away on every screen, and I want
> it to see nothing of a private screen, so that I can ask about what I am
> looking at without exposing my passwords or a locked phone.

### The assistant observes the screen only while it is visible, unlocked and not private

A private screen is the passwords view, a password surface in Settings, a
secure or locked screen, a screen that is off, a hidden or suspended page,
and the agent connection dialog. Nothing about such a screen leaves the
phone, and no proposal admitted on another screen may act on it.

```quint
type Exposure = { privateView: bool, locked: bool, hidden: bool, connectionDialog: bool }
pure def observes(e: Exposure): bool = not(e.privateView) and not(e.locked) and not(e.hidden) and not(e.connectionDialog)
pure def lawAPrivateScreenIsNeverObserved(e: Exposure): bool = e.privateView implies not(observes(e))
pure def lawALockedScreenIsNeverObserved(e: Exposure): bool = e.locked implies not(observes(e))
```

### Something handed to the assistant is only ever a draft the owner sends

Another area may open the sheet with a draft or add an attachment; the
assistant sends nothing until the owner presses Send, and a handed-over draft
never replaces text the owner already typed.

```quint
type Handoff = { typed: bool, handed: bool }
pure def keepsTyped(h: Handoff): bool = h.typed
pure def placesHanded(h: Handoff): bool = h.handed and not(h.typed)
pure def lawAHandoffNeverOverwritesTyping(h: Handoff): bool = h.typed implies not(placesHanded(h))
```
