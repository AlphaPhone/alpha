# Undo a deletion

A confirmed delete of a message, a voicemail or a contact is queued for a short window before the
phone carries it out, with Undo on screen until the window ends (upstream deferred deletion,
`deleteUndoMs` of ten seconds). The row leaves the list at once; Undo within the window asks the
phone to keep it and reads the list again. A token is used once: an undone or lapsed deletion never
acts again, and Undo after the window says the deletion already went ahead.

## Domain

### Undo holds the deletions waiting in their window, newest last

```quint
type DeletionKind = MessageDeletion | VoicemailDeletion | ContactDeletion
type Queued = { token: str, kind: DeletionKind, until: int }
type Undo = { queued: List[Queued], spent: List[str], now: int, tooLate: bool }
pure val initial: Undo = { queued: List(), spent: List(), now: 0, tooLate: false }
pure val undoWindow = 10000
pure val tokenValues = Set("d1", "d2")
pure val atValues = Set(0, 5000, 12000)
```

## Story: Take back a deletion I just confirmed

> As the owner, I want a moment to undo a message, voicemail or contact I deleted, and to be told
> honestly when it is too late.

### A deletion is queued once for its window, and Undo is offered only until the window ends

```quint
pure def canDeletionQueued(u: Undo, token: str): bool = token != "" and not(u.spent.includes(token)) and not(u.queued.some(q => q.token == token))
pure def deletionQueued(u: Undo, token: str, kind: DeletionKind): Undo =
  { ...u, tooLate: false, queued: u.queued.append({ token: token, kind: kind, until: u.now + undoWindow }) }
pure def canUndoAsked(u: Undo, token: str): bool = u.queued.some(q => q.token == token and q.until > u.now)
pure def undoAsked(u: Undo, token: str): Undo = { ...u, queued: u.queued.select(q => q.token != token), spent: u.spent.append(token) }
pure def canUndoRefused(u: Undo, token: str): bool = not(u.spent.includes(token))
pure def undoRefused(u: Undo, token: str): Undo = { ...u, tooLate: true, queued: u.queued.select(q => q.token != token), spent: u.spent.append(token) }
pure def canTicked(u: Undo, at: int): bool = at >= u.now
pure def ticked(u: Undo, at: int): Undo = {
  val lapsed = u.queued.select(q => q.until <= at)
  { ...u, now: at, queued: u.queued.select(q => q.until > at), spent: u.spent.concat(lapsed.listMap(q => q.token)) }
}
pure def alwaysAQueuedTokenIsUnspent(u: Undo): bool = u.queued.every(q => not(u.spent.includes(q.token)))
pure def alwaysTheWindowIsBounded(u: Undo): bool = u.queued.every(q => q.until <= u.now + undoWindow)
pure def stepASpentTokenNeverReturns(before: Undo, after: Undo): bool = before.spent.every(t => after.spent.includes(t))
pure def sometimesUndoOffered(u: Undo): bool = u.queued.length() > 0
pure def sometimesUndone(u: Undo): bool = u.spent.length() > 0 and u.queued.length() == 0 and not(u.tooLate)
pure def sometimesTooLate(u: Undo): bool = u.tooLate
```
