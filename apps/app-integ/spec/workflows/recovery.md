# Request recovery

Outside the phone (the browser build) the saved workflow requests live in the page's own store. When
that store needs recovery, Workflows offers to back up or reset the saved requests, and only the
review that is open, visible and on the same session may act; a late answer of a closed review
changes nothing (legacy `WorkflowRequestRecoveryAdmission`; #c46a702).

## Domain

### Recovery holds whether it may act, the open review, and what each review reached

```quint
type Recovery = { allowed: bool, seen: int, current: int, reading: List[int], loading: List[int], offered: List[int], closed: List[int], captured: List[int], saving: List[int], published: List[int] }
pure val initial: Recovery = { allowed: true, seen: 0, current: 0, reading: List(), loading: List(), offered: List(), closed: List(), captured: List(), saving: List(), published: List() }
pure def retired(allowed: bool, r: Recovery): Recovery =
  { ...r, allowed: allowed, current: 0, closed: if (r.current != 0 and r.offered.includes(r.current) and not(r.closed.includes(r.current))) r.closed.append(r.current) else r.closed }
pure def currentOffer(r: Recovery): bool = r.allowed and r.current != 0 and r.offered.includes(r.current) and not(r.closed.includes(r.current))
pure val idValues = Set(1, 2, 3)
```

## Story: Recover my saved requests without a stale review acting

> As the owner, I back up or reset saved workflow requests from one review, and I want a review I
> closed or left to change nothing.

### Opening a review retires the one before it; leaving, hiding or another session blocks every review

```quint
pure def canOpen(r: Recovery): bool = r.seen < 3 and r.allowed
pure def open(r: Recovery): Recovery = { ...retired(r.allowed, r), seen: r.seen + 1, current: r.seen + 1, reading: r.reading.append(r.seen + 1) }
pure def canBlock(r: Recovery, blocked: bool): bool = blocked == r.allowed
pure def block(r: Recovery, blocked: bool): Recovery = if (blocked) retired(false, r) else { ...r, allowed: true }
```

### Each answer moves only the open review on, and a closed review's answer is dropped

```quint
pure def canRead(r: Recovery, id: int, ok: bool): bool = r.reading.includes(id)
pure def read(r: Recovery, id: int, ok: bool): Recovery = {
  val rest = { ...r, reading: r.reading.select(x => x != id) }
  if (id == r.current and r.allowed and ok) { ...rest, loading: rest.loading.append(id) } else rest
}
pure def canOffer(r: Recovery, id: int, ok: bool): bool = r.loading.includes(id)
pure def offer(r: Recovery, id: int, ok: bool): Recovery = {
  val rest = { ...r, loading: r.loading.select(x => x != id) }
  if (id == r.current and r.allowed and ok) { ...rest, offered: rest.offered.append(id) } else rest
}
pure def canCapture(r: Recovery, id: int): bool = r.offered.includes(id) and not(r.captured.includes(id))
pure def capture(r: Recovery, id: int): Recovery = if (id == r.current and currentOffer(r)) { ...r, captured: r.captured.append(id) } else r
pure def canReset(r: Recovery, id: int): bool = r.offered.includes(id) and not(r.saving.includes(id)) and not(r.published.includes(id))
pure def reset(r: Recovery, id: int): Recovery = if (id == r.current and currentOffer(r)) { ...r, saving: r.saving.append(id) } else r
pure def canSaved(r: Recovery, id: int): bool = r.saving.includes(id)
pure def saved(r: Recovery, id: int): Recovery = {
  val rest = { ...r, saving: r.saving.select(x => x != id) }
  if (id == r.current and currentOffer(r)) { ...rest, published: rest.published.append(id) } else rest
}
pure def alwaysAClosedReviewWasOffered(r: Recovery): bool = r.closed.every(x => r.offered.includes(x))
pure def alwaysTheOpenReviewIsNotClosed(r: Recovery): bool = not(r.closed.includes(r.current)) or r.current == 0
pure def alwaysEveryActionBelongsToAnOfferedReview(r: Recovery): bool =
  r.captured.every(x => r.offered.includes(x)) and r.saving.every(x => r.offered.includes(x)) and r.published.every(x => r.offered.includes(x))
pure def sometimesPublished(r: Recovery): bool = r.published.length() >= 1
```
