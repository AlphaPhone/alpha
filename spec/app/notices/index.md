# Notices

Everything that tells the owner something and can be acted on. This spec
follows a notice the owner taps: it is opened exactly once, the newest tap
is never lost to an older one, and "Ask Alpha about this" is one review
whatever kind of notice it is about.

- [Collection](./collection.md): other apps' notifications, kept only with consent and authority
- [Toasts](./toasts.md): short messages, how long each stays and where it is shown
- [Deletions](./deletions.md): the notice of a deletion queued for ten seconds, with Undo
- [Reminders](./reminders.md): the records the agent schedules and the owner completes, snoozes and reopens

The question itself is reviewed with the kit's
[review](../../kit/review.md). Where a tap leads belongs to the app that
posted the notice, and the draft a question becomes is the assistant's.

## Story: Open what I tapped

> As the owner, when I tap a notification I want exactly that thing opened,
> once, and if I tap another one first, I want the newer one.

### Alpha numbers each tap, keeps only the newest waiting, and holds at most one in hand

A tap is on one of Alpha's own notices (a reminder, an approval waiting, a
workflow), a result from the cloud, a row of the shade, or a source that
needs renewing. It either opens its notice or asks Alpha about it.

```quint
import review as R from "../../kit/review"

type Source = Own | Hosted | Shade | Renewal
type Showed = Seen | Gone | Unreadable
type Doing = Open | Spend | Draft
type Effect = { does: Doing, token: int, source: Source }
type Notices = {
  issued: int, waiting: int, source: Source, asks: bool,
  opening: int, spending: int, review: R::Review, blocked: bool,
}
type Told = { state: Notices, out: List[Effect] }

pure val initial: Notices = {
  issued: 0, waiting: 0, source: Own, asks: false,
  opening: 0, spending: 0, review: R::unreviewed, blocked: false,
}

pure val tokenValues = Set(1, 2, 3)
```

### A new tap replaces the one waiting, and closes a question still under review

Nothing was opened or drafted for the older tap.

```quint
pure def tap(s: Notices, source: Source, asks: bool): Notices =
  { ...s, issued: s.issued + 1, waiting: s.issued + 1, source: source, asks: asks, review: R::dismiss(R::revise(s.review)) }
```

### The phone says when taps cannot be acted on, and that puts down the one in hand

The page is hidden, the screen is protected, the sign-in chooser is up or a
form is open. A question already being spent runs to its end.

```quint
pure def gate(s: Notices, blocked: bool): Notices =
  if (blocked) { ...s, blocked: true, opening: 0, review: R::dismiss(s.review) } else { ...s, blocked: false }
```

### Only the waiting tap is opened, one at a time, and never while taps are blocked

```quint
pure def canOpen(s: Notices): bool =
  s.waiting != 0 and not(s.asks) and not(s.blocked) and s.opening == 0 and s.spending == 0

pure def open(s: Notices): Told =
  { state: { ...s, opening: s.waiting }, out: List({ does: Open, token: s.waiting, source: s.source }) }
```

### A tap is spent only once its notice is seen or found gone, and only if no newer tap arrived

A notice that could not be read keeps its tap waiting for another try. A
tap that a newer one replaced while it was opening spends nothing.

```quint
pure def canShown(s: Notices, token: int): bool = s.opening != 0 and token == s.opening

pure def shown(s: Notices, token: int, showed: Showed): Told =
  if (token == s.waiting and showed != Unreadable)
    { state: { ...s, opening: 0, waiting: 0 }, out: List({ does: Spend, token: token, source: s.source }) }
  else { state: { ...s, opening: 0 }, out: List() }
```

### Doing something else before the notice is shown puts the tap down, still waiting

```quint
pure def canTurnAway(s: Notices): bool = s.opening != 0

pure def turnAway(s: Notices): Notices = { ...s, opening: 0 }
```

### The waiting tap is always the newest one

```quint
pure def alwaysTheWaitingTapIsTheNewest(s: Notices): bool =
  s.issued >= 0 and (s.waiting == 0 or s.waiting == s.issued)
```

### A tap in hand was issued, is not newer than the one waiting, and only one is in hand

```quint
pure def alwaysOneTapInHand(s: Notices): bool =
  0 <= s.opening and s.opening <= s.waiting and 0 <= s.spending and s.spending <= s.issued
    and (s.opening == 0 or s.spending == 0) and (s.opening != 0 implies not(s.blocked))
```

### A waiting tap leaves only when a newer one arrives or its own end is reached

```quint
pure def stepTheNewestTapSurvives(before: Notices, via: str, after: Notices): bool =
  (before.waiting != 0 and after.waiting != before.waiting) implies
    ((via == "tap" and after.waiting > before.waiting)
      or (after.waiting == 0 and (via == "shown" or via == "spent" or via == "closeQuestion")))
```

### A notice is opened once for its tap, and Android is told a tap is spent only for the newest

```quint
pure def stepATapIsOpenedOnce(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  out.every(e =>
    if (e.does == Open) via == "open" and e.token == before.waiting and before.opening == 0 and not(before.blocked)
    else if (e.does == Spend)
      e.token == before.waiting and e.token > 0
        and ((via == "shown" and after.waiting == 0) or (via == "confirmQuestion" and after.spending == e.token))
    else via == "spent" and before.spending == e.token and after.spending == 0)
    and out.length() <= 1
```

### A newer tap can wait while an older one is still opening, and every tap can be settled

```quint
pure def sometimesANewerTapWaits(s: Notices): bool = s.opening != 0 and s.waiting > s.opening

pure def sometimesEveryTapSettled(s: Notices): bool = s.issued >= 2 and s.waiting == 0 and s.spending == 0
```

## Story: Ask Alpha about a notice

> As the owner, I want to ask Alpha about any notice, see what will be
> asked before it goes into my message, and change my mind without losing
> the notice.

### The question about the waiting tap is put up for review, one at a time

```quint
pure def canAsk(s: Notices): bool =
  s.waiting != 0 and s.asks and not(s.blocked) and s.opening == 0 and s.spending == 0 and not(s.review.showing)

pure def ask(s: Notices): Notices = { ...s, review: R::present(s.review) }
```

### The notice can change while its question is under review, and the review then no longer counts

```quint
pure def canChange(s: Notices): bool = s.waiting != 0

pure def change(s: Notices): Notices = { ...s, review: R::revise(s.review) }
```

### Closing the review gives the tap back: nothing is drafted and the notice can be tapped again

```quint
pure def canCloseQuestion(s: Notices): bool = s.review.showing

pure def closeQuestion(s: Notices): Notices = { ...s, review: R::dismiss(s.review), waiting: 0 }
```

### Confirming the question as shown asks Android to spend its tap

```quint
pure def canConfirmQuestion(s: Notices): bool = R::canConfirm(s.review) and not(s.blocked)

pure def confirmQuestion(s: Notices): Told =
  { state: { ...s, review: R::confirm(s.review), spending: s.waiting },
    out: List({ does: Spend, token: s.waiting, source: s.source }) }
```

### The question is drafted only once its tap is spent, and then even if the owner has moved on

A tap Android would not spend drafts nothing. Either way that tap is over,
and a newer tap that arrived meanwhile keeps waiting.

```quint
pure def canSpent(s: Notices, token: int): bool = s.spending != 0 and token == s.spending

pure def spent(s: Notices, token: int, ok: bool): Told =
  { state: { ...s, spending: 0, waiting: if (token == s.waiting) 0 else s.waiting },
    out: if (ok) List({ does: Draft, token: token, source: s.source }) else List() }
```

### A question is under review only for the waiting tap, with nothing else in hand

```quint
pure def alwaysTheReviewIsOfTheWaitingTap(s: Notices): bool =
  s.review.showing implies (s.waiting != 0 and s.asks and not(s.blocked) and s.opening == 0 and s.spending == 0)
```

### A tap is given back or spent, never both

```quint
pure def stepGivingBackSpendsNothing(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  via == "closeQuestion" implies (out.length() == 0 and after.spending == 0 and after.waiting == 0)
```

### A question can be under review of a notice that changed, and a newer tap can wait while one is spent

```quint
pure def sometimesTheReviewedNoticeChanged(s: Notices): bool = s.review.showing and s.review.shown != s.review.revision

pure def sometimesANewerTapWaitsForAQuestion(s: Notices): bool = s.spending != 0 and s.waiting > s.spending
```
