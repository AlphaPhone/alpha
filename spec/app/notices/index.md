# Notices

Everything that tells the owner something and can be acted on. This spec
follows a notice the owner taps: it is opened exactly once, the newest tap
is never lost to an older one, and "Ask Alpha about this" is one review
whatever kind of notice it is about.

- [Posting](./posting.md): Alpha's own notices, posted once each
- [Collection](./collection.md): other apps' notifications, kept only with consent and authority
- [Toasts](./toasts.md): short messages, how long each stays and where it is shown
- [Deletions](./deletions.md): the notice of the deletions queued, each a [deletion](./deletion.md) with Undo
- [Reminders](./reminders.md): the owner's reminders as Alpha last read them, each a [reminder](./reminder.md) the agent schedules and the owner completes, snoozes and reopens

A tap is on one of Alpha's own notices (a reminder ringing, an approval
waiting), a result from the cloud, a row of the shade, a source that needs
renewing, or a workflow's notice. Where a tap leads belongs to the app that
posted the notice. The workflows area and the digests panel may hand their
taps to this machine as workflow, hosted or renewal taps; whether they do
is theirs. The question itself is reviewed with the kit's
[review](../../kit/review.md), its excerpt read with the kit's
[read](../../kit/read.md), and the draft it becomes is the assistant's. Who
is signed in comes from the account area, and whether taps can be acted on
(the page hidden, the screen protected, the sign-in chooser up, a form
open) and whether the message composer can take a question from the shell:
each arrives as an event parameter.

## Story: Open what I tapped

> As the owner, when I tap a notification I want exactly that thing opened,
> once, and if I tap another one first, I want the newer one.

### Alpha numbers each tap, keeps only the newest waiting, holds at most one in hand, and remembers the tap being spent

A tap is for one owner, and it either opens its notice or asks Alpha about
it, which only a kind of notice Alpha can show an excerpt of allows.

```quint
import review as R from "../../kit/review"
import read as W from "../../kit/read"
import operation as O from "../approvals/operation"

type Source = Own | Hosted | Shade | Renewal | Workflow
type Showed = Seen | Gone | Unreadable | Foreign
type Excerpt = Found | Missing | Unread
type Doing = Open | Spend | Draft | CheckSpend | Closed | NotKept | CannotAsk | ReadExcerpt | Unavailable
type Tap = { token: int, source: Source, asks: bool, reviewable: bool, owner: int }
type Effect = { does: Doing, token: int, source: Source, ticket: int }
type Notices = { issued: int, waiting: Tap, opening: int, spending: Tap, excerpt: W::Read, review: R::Review }
type Told = { state: Notices, out: List[Effect] }

pure val none: Tap = { token: 0, source: Own, asks: false, reviewable: false, owner: 0 }

pure val initial: Notices = { issued: 0, waiting: none, opening: 0, spending: none, excerpt: W::unread, review: R::unreviewed }

pure def about(does: Doing, t: Tap): Effect = { does: does, token: t.token, source: t.source, ticket: 0 }

pure val tokenValues = Set(1, 2, 3)
pure val ownerValues = Set(1, 2)
pure val signedInValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val sourceValues = Set(Own, Shade, Workflow)
```

### A new tap for the owner signed in replaces the one waiting, and closes a question still under review

Nothing was opened or drafted for the older tap, and whoever published
the question is told it closed. A tap for another owner is refused.

```quint
pure val weight_tap = 2

pure def closing(s: Notices): List[Effect] = if (s.review.showing) List(about(Closed, s.waiting)) else List()

pure def canTap(s: Notices, owner: int, signedIn: int, by: O::Actor): bool = by == O::Phone and owner > 0 and owner == signedIn

pure def tap(s: Notices, source: Source, asks: bool, reviewable: bool, owner: int, signedIn: int, by: O::Actor): Told =
  { state: { ...s, issued: s.issued + 1, review: R::dismiss(R::revise(s.review)), excerpt: { ...s.excerpt, status: W::Idle },
      waiting: { token: s.issued + 1, source: source, asks: asks, reviewable: reviewable, owner: owner } },
    out: closing(s) }
```

### The phone says when taps cannot be acted on, and that puts down the tap in hand and closes the question

A question already being spent runs to its end.

```quint
pure def canBlock(s: Notices, by: O::Actor): bool = by == O::Phone and (s.opening != 0 or s.review.showing or s.excerpt.status == W::Loading)

pure def block(s: Notices, by: O::Actor): Told =
  { state: { ...s, opening: 0, review: R::dismiss(s.review), excerpt: { ...s.excerpt, status: W::Idle } }, out: closing(s) }
```

### Only the waiting tap is opened, for its own owner, one at a time, and never while taps are blocked

```quint
pure val weight_open = 3

pure def free(s: Notices): bool = s.opening == 0 and s.spending.token == 0

pure def canOpen(s: Notices, signedIn: int, blocked: bool, by: O::Actor): bool =
  by == O::Phone and s.waiting.token != 0 and not(s.waiting.asks) and not(blocked) and free(s) and signedIn == s.waiting.owner

pure def open(s: Notices, signedIn: int, blocked: bool, by: O::Actor): Told =
  { state: { ...s, opening: s.waiting.token }, out: List(about(Open, s.waiting)) }
```

### A tap is spent once its notice is seen or found gone, and only if no newer tap arrived; a notice of another source is never shown and its tap ends

A notice that could not be read keeps its tap waiting for another try. A
tap that a newer one replaced while it was opening spends nothing.

```quint
pure def canShown(s: Notices, token: int, by: O::Actor): bool = by == O::Phone and s.opening != 0 and token == s.opening

pure def shown(s: Notices, token: int, showed: Showed, by: O::Actor): Told =
  if (token != s.waiting.token or showed == Unreadable) { state: { ...s, opening: 0 }, out: List() }
  else if (showed == Foreign) { state: { ...s, opening: 0, waiting: none }, out: List() }
  else { state: { ...s, opening: 0, waiting: none }, out: List(about(Spend, s.waiting)) }
```

### The owner doing something else before the notice is shown puts the tap down, still waiting

```quint
pure def canTurnAway(s: Notices, by: O::Actor): bool = by == O::Owner and s.opening != 0

pure def turnAway(s: Notices, by: O::Actor): Notices = { ...s, opening: 0 }
```

### A tap in hand was issued, is not newer than the one waiting, and only one is in hand; every tap is for an owner

```quint
pure def alwaysOneTapInHand(s: Notices): bool =
  0 <= s.opening and s.opening <= s.waiting.token and s.waiting.token <= s.issued
    and 0 <= s.spending.token and s.spending.token <= s.issued and (s.opening == 0 or s.spending.token == 0)
    and (s.waiting.token == 0 or s.waiting.owner > 0) and (s.spending.token == 0 or s.spending.owner > 0)
```

### A tap acts only for the owner signed in, and only the owner confirms or closes a question

```quint
pure def lawATapActsOnlyForItsOwner(s: Notices, signedIn: int, blocked: bool, who: O::Actor): bool =
  (signedIn != s.waiting.owner implies
    (not(canOpen(s, signedIn, blocked, who)) and not(canAsk(s, signedIn, blocked, who)) and not(canConfirmQuestion(s, signedIn, blocked, true, who))))
    and (who != O::Owner implies (not(canConfirmQuestion(s, signedIn, blocked, true, who)) and not(canCloseQuestion(s, who))))
```

### A waiting tap leaves only when a newer one arrives or its own end is reached

```quint
pure def stepTheNewestTapSurvives(before: Notices, via: str, after: Notices): bool =
  (before.waiting.token != 0 and after.waiting.token != before.waiting.token) implies
    ((via == "tap" and after.waiting.token > before.waiting.token)
      or (after.waiting.token == 0
        and (via == "shown" or via == "spent" or via == "closeQuestion" or via == "refuse" or via == "excerpted" or via == "switchOwner")))
```

### A notice is opened only for the waiting tap with nothing else in hand, and again only after it was put down or could not be read; Android is told a tap is spent only for the newest

```quint
pure def stepATapIsOpenedOnlyWithNothingInHand(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  out.length() <= 2 and out.every(e =>
    if (e.does == Open) via == "open" and e.token == before.waiting.token and free(before)
    else if (e.does == Spend)
      e.token == before.waiting.token and e.token > 0
        and ((via == "shown" and after.waiting.token == 0) or (via == "confirmQuestion" and after.spending.token == e.token))
    else if (e.does == Draft) via == "spent" and e.token == before.spending.token and e.source == before.spending.source
    else if (e.does == CheckSpend) via == "restart" and e.token == before.spending.token and e.token > 0
    else if (e.does == ReadExcerpt) via == "ask" and e.ticket == after.excerpt.ticket and e.token == before.waiting.token
    else true)
```

### A newer tap can wait while an older one is still opening, and every tap can be settled

```quint
pure def sometimesANewerTapWaits(s: Notices): bool = s.opening != 0 and s.waiting.token > s.opening

pure def sometimesEveryTapSettled(s: Notices): bool = s.issued >= 2 and s.waiting.token == 0 and s.spending.token == 0
```

### A waiting tap that opens its notice is taken in hand, and a tap in hand is answered

If the phone opens taps when it can, answers what it opened and Android
answers a spend, a tap does not wait for ever.

```quint
pure def leadsToAWaitingTapIsTakenInHand(s: Notices, later: Notices): bool =
  (s.waiting.token != 0 and not(s.waiting.asks)) implies
    (later.opening == s.waiting.token or later.waiting.token != s.waiting.token)

pure def leadsToATapInHandIsAnswered(s: Notices, later: Notices): bool = s.opening != 0 implies later.opening == 0

pure val fair_open = "weak"
pure val fair_shown = "weak"
pure val fair_spent = "weak"
```

## Story: Ask Alpha about a notice

> As the owner, I want to ask Alpha about any notice, see what will be
> asked before it goes into my message, and change my mind without losing
> the notice.

### For the question about the waiting tap Alpha reads the notice's excerpt, for its own owner, one at a time, when the notice is of a kind it can show, and again when the notice changed under review

```quint
pure val weight_ask = 3

pure def canAsk(s: Notices, signedIn: int, blocked: bool, by: O::Actor): bool =
  by == O::Phone and s.waiting.token != 0 and s.waiting.asks and s.waiting.reviewable and not(blocked) and free(s)
    and s.excerpt.status != W::Loading and (not(s.review.showing) or s.review.shown != s.review.revision)
    and signedIn == s.waiting.owner

pure def ask(s: Notices, signedIn: int, blocked: bool, by: O::Actor): Told =
  val excerpt = W::ask(s.excerpt)
  { state: { ...s, excerpt: excerpt }, out: List({ ...about(ReadExcerpt, s.waiting), ticket: excerpt.ticket }) }
```

### The newest excerpt puts the question up for review as the notice now is; a notice no longer there ends its tap and is reported, and an excerpt that could not be read keeps the tap waiting

```quint
pure def canExcerpted(s: Notices, ticket: int, by: O::Actor): bool = by == O::Phone and W::canAnswer(s.excerpt, ticket)

pure def excerpted(s: Notices, ticket: int, excerpt: Excerpt, by: O::Actor): Told =
  if (excerpt == Found) { state: { ...s, excerpt: W::answer(s.excerpt, true), review: R::present(s.review) }, out: List() }
  else if (excerpt == Missing)
    { state: { ...s, excerpt: W::answer(s.excerpt, true), review: R::dismiss(s.review), waiting: none }, out: List(about(Unavailable, s.waiting)) }
  else { state: { ...s, excerpt: W::answer(s.excerpt, false), review: R::dismiss(s.review) }, out: closing(s) }
```

### A question about a notice Alpha cannot show an excerpt of is refused and said so, and its tap ends

```quint
pure def canRefuse(s: Notices, by: O::Actor): bool =
  by == O::Phone and s.waiting.token != 0 and s.waiting.asks and not(s.waiting.reviewable) and free(s)

pure def refuse(s: Notices, by: O::Actor): Told = { state: { ...s, waiting: none }, out: List(about(CannotAsk, s.waiting)) }
```

### The notice can change while its question is under review, and the review then no longer counts until it is read again

```quint
pure def canChange(s: Notices, by: O::Actor): bool = by == O::Phone and s.waiting.token != 0

pure def change(s: Notices, by: O::Actor): Notices = { ...s, review: R::revise(s.review) }
```

### The owner closing the review gives the tap back: nothing is drafted, the notice can be tapped again, and the publisher is told once

```quint
pure def canCloseQuestion(s: Notices, by: O::Actor): bool = by == O::Owner and s.review.showing

pure def closeQuestion(s: Notices, by: O::Actor): Told =
  { state: { ...s, review: R::dismiss(s.review), excerpt: { ...s.excerpt, status: W::Idle }, waiting: none }, out: closing(s) }
```

### The owner confirming the question as shown, while the message composer can take it, asks Android to spend its tap

A composer that cannot take the question leaves the review open and the
tap waiting.

```quint
pure val weight_confirmQuestion = 3

pure def canConfirmQuestion(s: Notices, signedIn: int, blocked: bool, composer: bool, by: O::Actor): bool =
  by == O::Owner and R::canConfirm(s.review) and not(blocked) and composer and signedIn == s.waiting.owner

pure def confirmQuestion(s: Notices, signedIn: int, blocked: bool, composer: bool, by: O::Actor): Told =
  { state: { ...s, review: R::confirm(s.review), spending: s.waiting }, out: List(about(Spend, s.waiting)) }
```

### The question is drafted only once its tap is spent, from the notice that was confirmed, for its owner still signed in; a spent tap that drafts nothing is reported, and one Android would not spend keeps its tap

A newer tap that arrived meanwhile keeps waiting.

```quint
pure def canSpent(s: Notices, token: int, by: O::Actor): bool = by == O::Phone and s.spending.token != 0 and token == s.spending.token

pure def spent(s: Notices, token: int, ok: bool, signedIn: int, composer: bool, by: O::Actor): Told =
  if (not(ok)) { state: { ...s, spending: none }, out: List() }
  else
    { state: { ...s, spending: none, waiting: if (token == s.waiting.token) none else s.waiting },
      out: List(about(if (composer and signedIn == s.spending.owner) Draft else NotKept, s.spending)) }
```

### A question is under review only for the waiting tap, one Alpha can show and read the excerpt of, with nothing else in hand, and nothing can be confirmed while its excerpt is being read

Discovered by the proof: an excerpt is read only with nothing in hand, and
a review never shows a revision newer than the notice's.

```quint
pure def alwaysTheReviewIsOfTheWaitingTap(s: Notices): bool =
  (s.review.showing implies (s.waiting.token != 0 and s.waiting.asks and s.waiting.reviewable and free(s)))
    and (s.excerpt.status == W::Loading implies
      (s.waiting.token != 0 and s.waiting.asks and s.waiting.reviewable and free(s) and not(R::canConfirm(s.review))))
    and s.review.shown <= s.review.revision
```

### A question is put up for review only from the newest excerpt

```quint
pure def stepAQuestionShowsTheNewestExcerpt(before: Notices, via: str, after: Notices): bool =
  ((after.review.showing and (not(before.review.showing) or after.review.shown != before.review.shown))
    implies (via == "excerpted" and before.excerpt.status == W::Loading and after.excerpt.status == W::Loaded))
```

### A tap is given back, spent, or kept when Android would not spend it, and a spent tap is drafted or reported

```quint
pure def stepEveryTapEndsVisibly(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  (via == "closeQuestion" implies (after.spending.token == 0 and after.waiting.token == 0 and out.every(e => e.does == Closed)))
    and ((via == "spent" and out.length() == 0) implies after.waiting == before.waiting)
    and ((via == "spent" and after.waiting != before.waiting) implies out.some(e => e.does == Draft or e.does == NotKept))
    and ((via == "excerpted" and after.waiting.token == 0) implies out.some(e => e.does == Unavailable))
```

### The publisher is told a question closed exactly when its review closes without being confirmed or found gone

```quint
pure def stepTheReviewIsClosedOnce(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  ((before.review.showing and not(after.review.showing)) implies
      (via == "confirmQuestion" or out.some(e => e.does == Closed or e.does == Unavailable)))
    and (out.some(e => e.does == Closed) implies before.review.showing)
```

### A question can be shown again after its notice changed, its notice can be gone, its excerpt can fail, a newer tap can wait while one is spent, and a question can be refused

```quint
pure def sometimesShownAgainAfterAChange(s: Notices): bool = s.review.showing and s.review.shown > 0 and s.review.shown == s.review.revision

pure def sometimesTheReviewedNoticeChanged(s: Notices): bool = s.review.showing and s.review.shown != s.review.revision

pure def sometimesTheExcerptFailed(s: Notices): bool = s.excerpt.status == W::Failed and s.waiting.token != 0

pure def sometimesANewerTapWaitsForAQuestion(s: Notices): bool = s.spending.token != 0 and s.waiting.token > s.spending.token

pure def sometimesAKeptTapAfterARefusedSpend(s: Notices): bool =
  s.waiting.asks and s.waiting.token != 0 and s.spending.token == 0 and s.review.shown > 0 and not(s.review.showing)
```

## Story: Change owner or restart with a tap in hand

> As the owner, I want a tap meant for me never to act for someone else,
> and a restart never to lose my newest tap or open a spent one again.

### Changing owner drops the tap waiting for someone else, puts down the tap in hand and closes the question

A spend already asked of Android runs to its end, and drafts nothing for
another owner.

```quint
pure def canSwitchOwner(s: Notices, signedIn: int, by: O::Actor): bool = by == O::Phone

pure def switchOwner(s: Notices, signedIn: int, by: O::Actor): Told =
  { state: { ...s, opening: 0, review: R::dismiss(s.review), excerpt: { ...s.excerpt, status: W::Idle },
      waiting: if (s.waiting.owner == signedIn) s.waiting else none },
    out: closing(s) }

pure def stepChangingOwnerDropsWhatIsInHand(before: Notices, via: str, after: Notices): bool =
  via == "switchOwner" implies (after.opening == 0 and not(after.review.showing) and after.excerpt.status != W::Loading)
```

### A restart keeps the newest tap waiting, puts down what was in hand, and asks Android whether the tap being spent was spent

The answer comes back as Android's answer to the spend does, so a tap spent
before a restart is never opened again.

```quint
pure def canRestart(s: Notices, by: O::Actor): bool = by == O::Phone

pure def restart(s: Notices, by: O::Actor): Told =
  { state: { ...s, opening: 0, review: R::dismiss(s.review), excerpt: { ...s.excerpt, status: W::Idle } },
    out: closing(s).concat(if (s.spending.token != 0) List(about(CheckSpend, s.spending)) else List()) }

pure def stepARestartKeepsTheNewestTap(before: Notices, via: str, after: Notices): bool =
  via == "restart" implies (after.waiting == before.waiting and after.spending == before.spending and after.opening == 0)
```

### A spend can be checked after a restart

```quint
pure def sometimesASpendInFlight(s: Notices): bool = s.spending.token != 0 and s.opening == 0 and not(s.review.showing)
```
