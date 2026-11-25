# Text offered into an email

Text offered into an email, shown to the owner before it goes in: Alpha's
own suggestion for a draft, offered as "Review email suggestion", or text
another part of Alpha hands over with "Use in email", from Notes for
one. It goes into a draft, open in the [composer](./drafts.md) or set
aside, or starts a new reply to the message on screen or a new email. It
is text only: files and photos are [attached](./adding.md) instead. The
owner's [review](../../kit/review.md) of it is bound to the revision of
the draft it was shown against, and the owner chooses whether it adds to
the text or replaces it. Text too long to fit is refused whole, never
cut short. What goes in is an edit of the draft, which then needs its own
review before it is sent, as after any edit.

The shell passes the revision of the draft offered into, as the composer
holds it, whether the text fits, and tells when that draft is discarded
or forgotten; setting it aside keeps the offer.

## Story: Review what is offered into my email

> As the owner, I want to see exactly what Alpha or another part of Alpha
> would put into my email as it is now, choose whether it adds or
> replaces, have it go in once and whole, and nothing Alpha suggests sent
> without me.

### An offer names its text, who offered it, where it goes, and the owner's review of it against the revision of that draft

Text 0 is no offer. A new reply names the message replied to and its
account; a new email its account.

```quint
import review as V from "../../kit/review"
import access.* from "./access"

type Target = ToDraft | NewReply | NewEmail
type Offer = {
  text: int, from: Actor, target: Target, draft: int, account: int, message: int,
  review: V::Review, blocked: bool, used: int,
}

type Effect =
  | Insert({ draft: int, revision: int, text: int, appends: bool })
  | StartWith({ target: Target, account: int, message: int, text: int })
type Offered = { state: Offer, out: List[Effect] }

pure val initial: Offer = {
  text: 0, from: World, target: ToDraft, draft: 0, account: 0, message: 0,
  review: V::unreviewed, blocked: false, used: 0,
}

pure def withdrawn(used: int): Offer = { ...initial, used: used }

pure val textValues = Set(0, 1, 2)
pure val draftValues = Set(0, 1, 2)
pure val accountValues = Set(0, 1)
pure val messageValues = Set(0, 1)
pure val revisionValues = Set(0, 1, 2)
```

### Alpha suggests text only for a draft; the owner hands text over from elsewhere in Alpha into a draft, a new reply or a new email; either replaces an offer not yet used

```quint
pure def aimed(target: Target, draft: int, account: int, message: int): bool =
  if (target == ToDraft) draft != 0 else if (target == NewReply) account != 0 and message != 0 else account != 0

pure def offering(text: int, from: Actor, target: Target, draft: int, account: int, message: int, revision: int, used: int): Offer = {
  ...withdrawn(used), text: text, from: from, target: target,
  draft: if (target == ToDraft) draft else 0, account: if (target == ToDraft) 0 else account,
  message: if (target == NewReply) message else 0,
  review: { showing: false, revision: revision, shown: 0 },
}

pure def canSuggest(s: Offer, text: int, draft: int, by: Actor): bool = by == Agent and text != 0 and draft != 0

pure def suggest(s: Offer, text: int, draft: int, revision: int, by: Actor): Offer =
  offering(text, by, ToDraft, draft, 0, 0, revision, s.used)

pure def canUseInEmail(s: Offer, text: int, target: Target, draft: int, account: int, message: int, showing: bool, by: Actor): bool =
  by == Owner and text != 0 and aimed(target, draft, account, message)

pure def useInEmail(s: Offer, text: int, target: Target, draft: int, account: int, message: int, revision: int, showing: bool, by: Actor): Offer =
  val offered = offering(text, by, target, draft, account, message, revision, s.used)
  if (showing) { ...offered, review: V::present(offered.review) } else offered
```

### Only the owner is shown it, against the draft as it is now; showing it again after the draft changed shows it against the change

A handoff can open its own review in the same owner action.

```quint
pure def canReview(s: Offer, by: Actor): bool = by == Owner and s.text != 0

pure def review(s: Offer, revision: int, by: Actor): Offer =
  { ...s, review: V::present({ ...s.review, revision: if (s.target == ToDraft) revision else 0 }), blocked: false }
```

### Only the owner puts it in, once, as it was last shown, into the draft as it still is, adding or replacing as the owner chooses; text that does not fit is refused whole and the offer stays

```quint
pure def canUse(s: Offer, revision: int, by: Actor): bool =
  by == Owner and s.text != 0 and V::canConfirm({ ...s.review, revision: if (s.target == ToDraft) revision else 0 })

pure def use(s: Offer, revision: int, appends: bool, fits: bool, by: Actor): Offered =
  if (not(fits)) { state: { ...s, blocked: true }, out: List() }
  else if (s.target == ToDraft) {
    state: withdrawn(s.used + 1),
    out: List(Insert({ draft: s.draft, revision: s.review.shown, text: s.text, appends: appends })),
  }
  else {
    state: withdrawn(s.used + 1),
    out: List(StartWith({ target: s.target, account: s.account, message: s.message, text: s.text })),
  }

pure def lawAChangedDraftVoidsTheReview(text: int, revision: int): bool =
  val shown = review(suggest(initial, text, 1, revision, Agent), revision, Owner)
  not(canUse(shown, revision + 1, Owner))

pure def lawAnUnseenOfferDoesNotGoIn(text: int, revision: int): bool =
  not(canUse(suggest(initial, text, 1, revision, Agent), revision, Owner))

pure def lawTextThatDoesNotFitIsNeverCut(text: int, revision: int, appends: bool): bool =
  val shown = review(suggest(initial, text, 1, revision, Agent), revision, Owner)
  use(shown, revision, appends, false, Owner).out.length() == 0
```

### What goes in is the text shown, where it was aimed, as the owner confirmed it, once

```quint
pure def stepOnlyTheTextShownGoesIn(before: Offer, via: str, after: Offer, out: List[Effect]): bool =
  out.every(e => match e {
    | Insert(i) =>
      via == "use" and before.target == ToDraft and i.text == before.text and i.text != 0 and i.draft == before.draft
        and i.revision == before.review.shown and after.text == 0 and after.used == before.used + 1
    | StartWith(w) =>
      via == "use" and before.target != ToDraft and w.target == before.target and w.text == before.text and w.text != 0
        and w.account == before.account and w.message == before.message and after.text == 0 and after.used == before.used + 1
  })
```

### An offer is aimed somewhere, and one under review is one made

```quint
pure def alwaysAnOfferIsAimed(s: Offer): bool =
  (s.text != 0 implies aimed(s.target, s.draft, s.account, s.message))
    and (s.review.showing implies s.text != 0) and (s.blocked implies s.text != 0) and s.used >= 0
```

### The owner can put it away, and it goes when its draft is discarded or forgotten, with the session, or with a restart

```quint
pure def canDismiss(s: Offer): bool = s.text != 0

pure def dismiss(s: Offer): Offer = withdrawn(s.used)

pure def draftGone(s: Offer, draft: int): Offer = if (s.target == ToDraft and draft == s.draft) withdrawn(s.used) else s

pure def sessionChanged(s: Offer): Offer = withdrawn(s.used)

pure def restart(s: Offer): Offer = withdrawn(s.used)
```

### Alpha's suggestion can be under review, text from elsewhere can start a reply, text too long can be refused, and an offer can go in

```quint
pure def sometimesASuggestionIsShown(s: Offer): bool = s.review.showing and s.from == Agent

pure def sometimesTextStartsAReply(s: Offer): bool = s.review.showing and s.target == NewReply and s.from == Owner

pure def sometimesTextIsTooLong(s: Offer): bool = s.blocked

pure def sometimesAnOfferWentIn(s: Offer): bool = s.used >= 1 and s.text == 0
```
