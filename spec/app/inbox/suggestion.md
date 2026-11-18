# Suggestion

Text Alpha drafts for the draft open in the [composer](./drafts.md),
offered as "Review email suggestion". It is bound to the draft it was
written for, the owner's review of it to the revision of that draft it
was shown against, and whether it adds to the text or replaces it. What
goes in is handed to the composer as an edit, which then needs its own
review before it is sent, as after any edit.

The shell passes the number and revision of the draft open in the
composer with each event, and tells when that draft is closed.

## Story: Review what Alpha suggests

> As the owner, I want to see exactly what Alpha's suggestion would do to
> my draft as it is now, before it goes in, to have it go in once, and
> nothing Alpha suggests to be sent without me.

### An offer names Alpha's text, the draft it is for, whether it adds to the text or replaces it, and the revision it was last shown against

Text 0 is no offer.

```quint
import access.* from "./access"

type Offer = { text: int, draft: int, appends: bool, shown: bool, revision: int, used: int }

type Effect = Insert({ draft: int, text: int, appends: bool })
type Offered = { state: Offer, out: List[Effect] }

pure val initial: Offer = { text: 0, draft: 0, appends: false, shown: false, revision: 0, used: 0 }

pure def withdrawn(used: int): Offer = { ...initial, used: used }

pure val textValues = Set(0, 1, 2)
pure val draftValues = Set(0, 1, 2)
pure val revisionValues = Set(0, 1, 2)
```

### Only Alpha offers a suggestion, for the draft open, replacing one not yet used

```quint
pure def canSuggest(s: Offer, text: int, draft: int, by: Actor): bool =
  by == Agent and text != 0 and draft != 0 and text != s.text

pure def suggest(s: Offer, text: int, draft: int, appends: bool, by: Actor): Offer =
  { ...withdrawn(s.used), text: text, draft: draft, appends: appends }
```

### Only the owner is shown it, against the draft as it is now; showing it again after the draft changed shows it against the change

```quint
pure def canReview(s: Offer, draft: int, by: Actor): bool = by == Owner and s.text != 0 and draft == s.draft

pure def review(s: Offer, draft: int, revision: int, by: Actor): Offer = { ...s, shown: true, revision: revision }
```

### Only the owner puts it in, once, as it was last shown, into the draft it is for, as that draft still is, and only where it fits

Text that does not fit is refused, and the offer stays to be dismissed.

```quint
pure def canUse(s: Offer, draft: int, revision: int, fits: bool, by: Actor): bool =
  by == Owner and s.text != 0 and s.shown and draft == s.draft and revision == s.revision and fits

pure def use(s: Offer, draft: int, revision: int, fits: bool, by: Actor): Offered = {
  state: withdrawn(s.used + 1),
  out: List(Insert({ draft: s.draft, text: s.text, appends: s.appends })),
}

pure def lawAChangedDraftVoidsTheReview(text: int, revision: int): bool =
  val shown = review(suggest(initial, text, 1, true, Agent), 1, revision, Owner)
  not(canUse(shown, 1, revision + 1, true, Owner))

pure def lawAnUnseenSuggestionDoesNotGoIn(text: int, revision: int): bool =
  not(canUse(suggest(initial, text, 1, true, Agent), 1, revision, true, Owner))
```

### What goes in is the text shown, for its draft, once

```quint
pure def stepOnlyTheTextShownGoesIn(before: Offer, via: str, after: Offer, out: List[Effect]): bool =
  out.every(e => match e {
    | Insert(i) =>
      via == "use" and before.shown and i.text == before.text and i.text != 0 and i.draft == before.draft
        and i.appends == before.appends and after.text == 0 and after.used == before.used + 1
  })
```

### An offer shown is one Alpha made for a draft

```quint
pure def alwaysAnOfferIsForADraft(s: Offer): bool =
  (s.text != 0 implies s.draft != 0) and (s.shown implies s.text != 0) and s.used >= 0
```

### The owner can set it aside, and it goes with its draft, the session, or a restart

```quint
pure def canDismiss(s: Offer): bool = s.text != 0

pure def dismiss(s: Offer): Offer = withdrawn(s.used)

pure def draftClosed(s: Offer, draft: int): Offer = if (draft == s.draft) withdrawn(s.used) else s

pure def sessionChanged(s: Offer): Offer = withdrawn(s.used)

pure def restart(s: Offer): Offer = withdrawn(s.used)
```

### A suggestion can be under review, and can go in

```quint
pure def sometimesASuggestionIsShown(s: Offer): bool = s.shown

pure def sometimesASuggestionWentIn(s: Offer): bool = s.used >= 1 and s.text == 0
```
