# Browser confirmations

Browser asks the owner before an effect they might regret: clearing browsing data, clearing a
site's data, leaving a private tab for another browser, and a reviewed Browser control the agent
proposed. A link to another app tapped in a private tab is asked about by the native host's own
dialog ([handoff](./handoff.md)). Each review has an identity; one
of each is open at a time, it is approved only by a tap while Alpha is shown and the phone is
unlocked, and every request is answered exactly once.

## Story: Confirm only what I can see

> As the owner, I want a Browser confirmation to count only when I tap it on my unlocked phone,
> and to end as not confirmed when Alpha is hidden or the phone locks.

### Reviews are open dialogs, one per identity, each of a kind

`detail` is what the dialog names: the site, the address, or the proposed control.

```quint
type ReviewKind = ClearBrowsingData | ClearSiteData | LeavePrivate | BrowserControl
type OpenReview = { id: str, kind: ReviewKind, detail: str }
type Reviews = { foreground: bool, locked: bool, open: List[OpenReview] }
pure val initial: Reviews = { foreground: true, locked: false, open: List() }
type ReviewAnswer = Approved | Denied | Refused
type Verdict = { id: str, kind: ReviewKind, answer: ReviewAnswer }
type ReviewEffect = Answer(Verdict)
type ReviewsChange = { state: Reviews, out: List[ReviewEffect] }
pure def shown(r: Reviews): bool = r.foreground and not(r.locked)
pure def isOpen(r: Reviews, id: str): bool = r.open.some(x => x.id == id)
pure def kindOf(r: Reviews, id: str): ReviewKind = r.open.foldl(BrowserControl, (found, x) => if (x.id == id) x.kind else found)
pure def alwaysOneOpenReviewPerIdentity(r: Reviews): bool = r.open.every(a => r.open.select(b => b.id == a.id).length() == 1)
pure val idValues = Set("clear-data", "external-browser")
pure val detailValues = Set("", "example.test")
```

### A request while the same review is open, or while Alpha is hidden or the phone is locked, is refused at once and opens nothing

```quint
pure def canAsk(r: Reviews, id: str, kind: ReviewKind, detail: str): bool = id != ""
pure def ask(r: Reviews, id: str, kind: ReviewKind, detail: str): ReviewsChange =
  if (isOpen(r, id) or not(shown(r))) { state: r, out: List(Answer({ id: id, kind: kind, answer: Refused })) }
  else { state: { ...r, open: r.open.append({ id: id, kind: kind, detail: detail }) }, out: List() }
pure def alwaysAnOpenReviewIsShown(r: Reviews): bool = r.open.length() > 0 implies shown(r)
pure def sometimesTwoReviewsOpen(r: Reviews): bool = r.open.length() == 2
```

### Approval counts only while Alpha is shown and unlocked at the moment of the tap; Cancel, Back and Escape deny

```quint
pure def canApprove(r: Reviews, id: str): bool = isOpen(r, id)
pure def approve(r: Reviews, id: str): ReviewsChange =
  { state: { ...r, open: r.open.select(x => x.id != id) },
    out: List(Answer({ id: id, kind: kindOf(r, id), answer: if (shown(r)) Approved else Denied })) }
pure def canDismiss(r: Reviews, id: str): bool = isOpen(r, id)
pure def dismiss(r: Reviews, id: str): ReviewsChange =
  { state: { ...r, open: r.open.select(x => x.id != id) }, out: List(Answer({ id: id, kind: kindOf(r, id), answer: Denied })) }
pure def stepApprovalOnlyWhileShown(before: Reviews, via: str, after: Reviews, out: List[ReviewEffect]): bool =
  out.every(e => match e { | Answer(v) => v.answer != Approved or shown(before) })
pure def sometimesApproved(r: Reviews): bool = r.open.length() == 0 and shown(r) and r.foreground
```

### Back denies the newest open review first, and is Browser's to pass on only when no review is open

The newest review is the dialog on top.

```quint
pure def newest(r: Reviews): str = r.open.foldl("", (last, x) => x.id)
pure def canBack(r: Reviews): bool = r.open.length() > 0
pure def back(r: Reviews): ReviewsChange = dismiss(r, newest(r))
pure def stepBackDeniesOnlyTheNewest(before: Reviews, via: str, after: Reviews): bool =
  via == "back" implies (after.open.length() == before.open.length() - 1 and not(isOpen(after, newest(before))))
```

### Hiding Alpha or locking the phone ends every open review as not confirmed

A reviewed Browser control the agent proposed is therefore never approved on a locked phone.

```quint
pure def denied(r: Reviews): List[ReviewEffect] = r.open.listMap(x => Answer({ id: x.id, kind: x.kind, answer: Denied }))
pure def foregroundChanged(r: Reviews, foreground: bool): ReviewsChange =
  if (foreground) { state: { ...r, foreground: true }, out: List() }
  else { state: { ...r, foreground: false, open: List() }, out: denied(r) }
pure def lockChanged(r: Reviews, locked: bool): ReviewsChange =
  if (locked) { state: { ...r, locked: true, open: List() }, out: denied(r) }
  else { state: { ...r, locked: false }, out: List() }
pure def stepEveryRequestIsAnsweredOnce(before: Reviews, via: str, after: Reviews, out: List[ReviewEffect]): bool =
  out.every(e => match e { | Answer(v) => not(isOpen(after, v.id)) or (via == "ask" and isOpen(before, v.id)) }) and
  before.open.every(x => isOpen(after, x.id) or out.some(e => match e { | Answer(v) => v.id == x.id }))
pure def lawALockedPhoneApprovesNothing(foreground: bool): bool = not(shown({ foreground: foreground, locked: true, open: List() }))
pure def sometimesRefusedWhileLocked(r: Reviews): bool = r.locked and r.open.length() == 0
```
