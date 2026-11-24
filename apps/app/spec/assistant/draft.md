# Drafts

The composer's text, kept per conversation binding so that it survives a
layout change (the dock's editor moving into the sheet), a conversation
switch, the app going to the background and a restart. A binding is the
opaque key the shell builds from the agent origin, owner, agent and
conversation, with the conversation missing for a new chat; the whole store
is kept under the owner's namespace (`ownerKey(owner, "assistant/drafts")`),
so another owner, agent or account never reads it. Text is held as UTF-16
units, as the reply stream holds it. A row holds only text: restoring a draft
never re-authorizes an approval, a receipt or a source.

A send holds its text while it is in flight (`hold`), then either gives it
back (`release`: it certainly did not reach the agent) or lets it go
(`commit`: it reached the agent, or may have). A held send that a restart or
another window finds is *unsettled*: it may already have been sent, so it is
offered for review and never sent again on its own.

## Story: Keep what I typed

> As the owner, I want what I type to stay in its own conversation whatever
> happens to the screen or the app, so that I never retype a message or
> find it in the wrong chat.

### Each binding keeps its own text, and selecting a binding never overwrites another

```quint
type Slot = { text: List[int], held: List[int], sending: bool, unsettled: bool, revision: int }
type DraftNotice = Quiet | BackInComposer | KeptInOwnConversation | MaySent | SavedLocally | TooLong | StorageUnavailable
type Drafts = { slots: str -> Slot, bindings: List[str], active: str, failed: bool, notice: DraftNotice }
pure val emptySlot: Slot = { text: List(), held: List(), sending: false, unsettled: false, revision: 0 }
pure val newChat = ""
pure val initial: Drafts = { slots: Map(), bindings: List(newChat), active: newChat, failed: false, notice: Quiet }
pure val draftUnitLimit = 64000
pure val newline = 10
pure def slotOf(d: Drafts, binding: str): Slot = if (d.slots.keys().contains(binding)) d.slots.get(binding) else emptySlot
pure def shown(d: Drafts): List[int] = slotOf(d, d.active).text
pure def canSelectDraft(d: Drafts, binding: str): bool = binding != d.active
pure def selectDraft(d: Drafts, binding: str): Drafts =
  { ...d, active: binding, slots: d.slots.put(binding, slotOf(d, binding)),
    bindings: if (d.bindings.includes(binding)) d.bindings else d.bindings.append(binding),
    notice: if (slotOf(d, binding).unsettled) MaySent else Quiet }
pure def canEdit(d: Drafts, text: List[int]): bool = text != shown(d)
pure def edit(d: Drafts, text: List[int]): Drafts = {
  val s = slotOf(d, d.active)
  { ...d, slots: d.slots.put(d.active, { ...s, text: text, revision: s.revision + 1 }),
    notice: if (d.failed) StorageUnavailable else if (text.length() > draftUnitLimit) TooLong else Quiet }
}
pure def alwaysEveryDraftHasItsBinding(d: Drafts): bool = d.bindings.includes(d.active) and d.bindings.every(b => d.bindings.select(c => c == b).length() == 1)
pure def stepSelectingKeepsEveryText(before: Drafts, via: str, after: Drafts): bool =
  via == "selectDraft" implies (slotOf(after, before.active) == slotOf(before, before.active) and shown(after) == slotOf(before, after.active).text)
pure def sometimesTwoConversationsKeepTheirOwnText(d: Drafts): bool =
  d.bindings.some(b => b != d.active and slotOf(d, b).text.length() > 0) and shown(d).length() > 0
```

### Something handed over is placed only into an empty composer

```quint
pure def canHandOver(d: Drafts, text: List[int]): bool = text.length() > 0 and not(d.failed)
pure def handOver(d: Drafts, text: List[int]): Drafts = {
  val s = slotOf(d, d.active)
  if (s.text.length() > 0) d else { ...d, slots: d.slots.put(d.active, { ...s, text: text, revision: s.revision + 1 }), notice: Quiet }
}
pure def stepAHandoverNeverOverwritesTyping(before: Drafts, via: str, after: Drafts): bool =
  (via == "handOver" and shown(before).length() > 0) implies shown(after) == shown(before)
```

### Storage that fails keeps the editor and refuses to hold a send until it is retried

The composer still takes typing, and a send goes ahead without a held copy;
when it does not reach the agent the composer puts its text back itself
(#1265). Only a message that may already have been sent still stops a send.

```quint
pure def canStorageFails(d: Drafts): bool = not(d.failed)
pure def storageFails(d: Drafts): Drafts = { ...d, failed: true, notice: StorageUnavailable }
pure def canRetryStorage(d: Drafts): bool = d.failed
pure def retryStorage(d: Drafts): Drafts = { ...d, failed: false, notice: Quiet }
pure def stepAFailedStoreStillTakesTyping(before: Drafts, via: str, after: Drafts): bool =
  (via == "edit" and before.failed) implies after.notice == StorageUnavailable
pure def sometimesTypedWhileStorageFailed(d: Drafts): bool = d.failed and shown(d).length() > 0
```

## Story: Get my message back when it was not sent

> As the owner, when a send fails before it reaches my agent I want the
> message back in the composer ahead of anything I typed since, and when it
> may have reached the agent I want to be asked before it is sent again.

### A send holds its text, which leaves the composer until the send settles

A send can hold only text within the limit, in storage that works, and
never while a message that may already have been sent waits for review.

```quint
pure def canHold(d: Drafts): bool = {
  val s = slotOf(d, d.active)
  not(d.failed) and not(s.sending) and not(s.unsettled) and s.text.length() > 0 and s.text.length() <= draftUnitLimit
}
pure def hold(d: Drafts): Drafts = {
  val s = slotOf(d, d.active)
  { ...d, slots: d.slots.put(d.active, { ...s, held: s.text, text: List(), sending: true, revision: s.revision + 1 }), notice: Quiet }
}
pure def alwaysHeldTextBelongsToASend(d: Drafts): bool =
  d.bindings.every(b => (slotOf(d, b).held.length() > 0 implies (slotOf(d, b).sending or slotOf(d, b).unsettled))
    and not(slotOf(d, b).sending and slotOf(d, b).unsettled))
pure def stepNoSendIsHeldBesideAnUnsettledMessage(before: Drafts, via: str, after: Drafts): bool =
  via == "hold" implies not(slotOf(before, before.active).unsettled)
```

### A send that did not reach the agent puts its text back ahead of newer typing, in its own conversation

The text typed since joins after a line break. When the owner moved to
another conversation meanwhile, the text stays in the conversation it was
typed in and the open composer is left alone.

```quint
pure def joinAhead(held: List[int], typed: List[int]): List[int] =
  if (typed.length() == 0) held else if (held.length() == 0) typed else held.append(newline).concat(typed)
pure def canRelease(d: Drafts, binding: str): bool = slotOf(d, binding).sending
pure def release(d: Drafts, binding: str): Drafts = {
  val s = slotOf(d, binding)
  { ...d, slots: d.slots.put(binding, { ...s, text: joinAhead(s.held, s.text), held: List(), sending: false, revision: s.revision + 1 }),
    notice: if (binding == d.active) BackInComposer else KeptInOwnConversation }
}
pure def lawNothingTypedIsLostOnRelease(held: List[int], typed: List[int]): bool =
  joinAhead(held, typed).length() >= held.length() + typed.length()
pure def lawReleasedTextComesFirst(held: List[int], typed: List[int]): bool =
  held.length() > 0 implies joinAhead(held, typed).nthOr(0, -1) == held.nthOr(0, -1)
pure def stepReleaseTouchesOnlyItsOwnConversation(before: Drafts, via: str, after: Drafts): bool =
  via == "release" implies before.bindings.every(b => slotOf(before, b).sending or slotOf(after, b) == slotOf(before, b))
pure def sometimesBackAheadOfNewTyping(d: Drafts): bool = d.notice == BackInComposer and shown(d).length() >= 3
pure def sometimesKeptInItsOwnConversation(d: Drafts): bool = d.notice == KeptInOwnConversation
```

### A send that reached the agent, or may have, lets its text go and keeps the newer typing

```quint
pure def canCommit(d: Drafts, binding: str): bool = slotOf(d, binding).sending
pure def commit(d: Drafts, binding: str): Drafts = {
  val s = slotOf(d, binding)
  { ...d, slots: d.slots.put(binding, { ...s, held: List(), sending: false, revision: s.revision + 1 }),
    notice: if (s.text.length() > 0) SavedLocally else Quiet }
}
pure def stepACommitNeverChangesWhatIsTyped(before: Drafts, via: str, after: Drafts): bool =
  via == "commit" implies before.bindings.every(b => slotOf(after, b).text == slotOf(before, b).text)
```

### A held send found by a restart is offered for review and never sent again on its own

The owner reviews it and either puts the text back into the composer or
lets it go; until then nothing can be held in that conversation.

```quint
pure def restart(d: Drafts): Drafts =
  { ...d, slots: d.bindings.foldl(d.slots, (m, b) => if (slotOf(d, b).sending) m.put(b, { ...slotOf(d, b), sending: false, unsettled: true }) else m),
    notice: if (slotOf(d, d.active).sending or slotOf(d, d.active).unsettled) MaySent else d.notice }
pure def canReviewUnsettled(d: Drafts, restore: bool): bool = slotOf(d, d.active).unsettled
pure def reviewUnsettled(d: Drafts, restore: bool): Drafts = {
  val s = slotOf(d, d.active)
  { ...d, slots: d.slots.put(d.active, { ...s, text: if (restore) joinAhead(s.held, s.text) else s.text, held: List(), unsettled: false, revision: s.revision + 1 }),
    notice: Quiet }
}
pure def stepARestartSendsNothing(before: Drafts, via: str, after: Drafts): bool =
  via == "restart" implies before.bindings.every(b => slotOf(after, b).text == slotOf(before, b).text and not(slotOf(after, b).sending))
pure def sometimesUnsettledAfterRestart(d: Drafts): bool = slotOf(d, d.active).unsettled and d.notice == MaySent
pure val textValues = Set(List()).union(Set(List(1))).union(Set(List(2, 3)))
pure val bindingValues = Set("", "a", "b")
```

## Story: Keep the message I was writing before the update

> As the owner, I want the message I was writing in a conversation before Alpha updated to be in
> that conversation's composer afterwards, and one that was being sent to wait for my review
> rather than be sent again.

### A draft the previous Alpha kept for the open conversation is taken once, and never sent

The previous Alpha kept each conversation's draft in its own encrypted slot, named from the same
binding, so only the binding that opens can find its slot. When a conversation opens and its draft
has never been used here, the previous text becomes its draft. A text the previous Alpha marked as
being sent may already have reached the agent: it is held for review as a send a restart found, so
nothing can be sent there until the owner puts it back or lets it go. A draft already used here, a
storage that is failing, and an empty or over-long previous text take nothing. The previous slot is
cleared only once the draft here holds a value (spec/platform/storage.md, "A legacy slot is cleared
only once the secure store holds a value for it"); other conversations' slots wait until they open.

```quint
pure def draftUsed(d: Drafts, binding: str): bool = slotOf(d, binding) != emptySlot
pure def canAdoptPrevious(d: Drafts, text: List[int], wasSending: bool): bool =
  not(draftUsed(d, d.active)) and not(d.failed) and text.length() > 0 and text.length() <= draftUnitLimit
pure def adoptPrevious(d: Drafts, text: List[int], wasSending: bool): Drafts = {
  val s = slotOf(d, d.active)
  val taken = if (wasSending) { ...s, held: text, unsettled: true, revision: s.revision + 1 } else { ...s, text: text, revision: s.revision + 1 }
  { ...d, slots: d.slots.put(d.active, taken), notice: if (wasSending) MaySent else Quiet }
}
pure def stepAPreviousDraftIsNeverSent(before: Drafts, via: str, after: Drafts): bool =
  via == "adoptPrevious" implies (not(slotOf(after, after.active).sending)
    and before.bindings.every(b => b == before.active or slotOf(after, b) == slotOf(before, b)))
pure def stepOnlyAnUnusedDraftTakesThePreviousText(before: Drafts, via: str, after: Drafts): bool =
  via == "adoptPrevious" implies (not(draftUsed(before, before.active)) and draftUsed(after, after.active))
pure def lawAPreviousSendWaitsForReview(text: List[int]): bool =
  text.length() > 0 implies not(canHold(adoptPrevious(initial, text, true)))
pure val wasSendingValues = Set(false, true)
pure def sometimesAPreviousSendWaitsForReview(d: Drafts): bool = slotOf(d, d.active).unsettled and slotOf(d, d.active).revision == 1
```
