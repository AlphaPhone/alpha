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

- [Detents](./detents.md): the chat's four heights, where each surface rests it, and how Back lowers it; the shell's navigation uses them too.
- [Dock](./dock.md): the dock's gestures and the one effect of each.
- [Drafts](./draft.md): composer text that survives layout, conversation changes and restarts.
- [Send](./send.md): composer and handed-over sends, the typing indicator and what a failed send restores.
- [First send](./firstSend.md): moving a new chat's draft into the conversation its first send created.
- [Conversation](./conversation.md): the client attachment, epochs, proposals and the consumed set.
- [Attachments](./attachments.md): files, photos and captures, their custody and limits.
- [Search](./search.md): chat search that only answers its live owner.
- [Reply](./reply.md): how a reply renders: text, fences, cards, notices, failures with the owner's fix and wait, and acknowledgments, spoken ones included.
- [Email card](./emailCard.md): an email the agent drafted, reviewed and sent inside the chat.
- [Receipts](./receipts.md): honest attribution of what a turn's actions did, and action history.
- [Approvals](./approvals.md): live and recovered action cards, decline and the card's states.
- [Recovery](./recovery.md): the listing of pending actions, read once per session, history and screen.
- [Review](./review.md): which proposal may produce a device effect, on whose authority, and at most once.
- [Decision](./decision.md): one owner decision on a workflow approval request.
- [Stopped reply](./stoppedReply.md): the single later check after the owner stopped a reply.
- [Turn context](./context.md): what a turn tells the agent about the screen, the phone's location, the open Browser page and hosted inference.
- [Entry](./entry.md): opening the assistant from the system assist gesture, and withdrawing a request.
- [Withdrawal](./withdrawal.md): giving up on a bridge request so that it never reaches the agent later.
- [Suggestion](./suggestion.md): inserting one exact reviewed suggestion into a text field.
- [Notice question](./noticeQuestion.md): asking the assistant about one of Alpha's own notifications.
- [Views](./views.md): the views the agent opens on this phone and the commands it gives inside them, Maps' and Browser's included.

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

### Back closes what the assistant opened before it leaves the assistant

While the assistant is in front, Back first leaves a question review,
then closes chat search, then drops a reply or edit aim; only with none of
them open does Back belong to the shell. A Messages or Phone list-bar
question routed to the assistant is sent as the owner's own message, once
per route, and the asking screen learns whether a turn took it.

```quint
type Opened = { review: bool, search: bool, aim: bool }
pure def consumesBack(o: Opened): bool = o.review or o.search or o.aim
pure def afterBack(o: Opened): Opened =
  if (o.review) { ...o, review: false } else if (o.search) { ...o, search: false } else { ...o, aim: false }
pure def lawBackClosesOneThing(o: Opened): bool =
  consumesBack(o) implies ((if (o.review) 1 else 0) + (if (o.search) 1 else 0) + (if (o.aim) 1 else 0)
    == (if (afterBack(o).review) 1 else 0) + (if (afterBack(o).search) 1 else 0) + (if (afterBack(o).aim) 1 else 0) + 1)
pure def lawNothingOpenIsTheShellsBack(o: Opened): bool = not(o.review or o.search or o.aim) implies not(consumesBack(o))
pure val oValues = Set({ review: true, search: true, aim: false }, { review: false, search: false, aim: true }, { review: false, search: false, aim: false })
```
