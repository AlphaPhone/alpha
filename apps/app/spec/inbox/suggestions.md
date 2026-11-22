# Agent suggestions in an email

While the Inbox is in front, the owner can take an agent reply from the chat into an email: Use in
email reviews where it goes (the open draft, a shelved reply to the message on screen, a new reply or
a new email) and what happens to text already there, then adds only that text. Files and photos are
never attached this way.

## Story: Put an agent's suggestion into my email, where I can see it goes

> As the owner, I want to add an agent's suggested text to the email I am writing, knowing which
> email it goes into and that nothing is replaced or sent.

### A review is opened only while the Inbox is in front, for the reply as shown, and fits the destination

The destination is the open draft, else the latest shelved reply to the message on screen, else a new
reply to it, else a new email; an unfinished email elsewhere that needs recovery, or a saved one,
blocks it. Text already in the draft is kept and the suggestion goes below it only when the review
says so. A suggestion that would make the draft longer than 64,000 characters is refused.

```quint
type SuggestionNotice = NoSuggestionNotice | SuggestionChanged | DestinationChanged | NotInFront
type SuggestionTarget = { token: str, ready: bool, room: bool, append: bool }
type SuggestionReview = { id: int, token: str, text: str, fits: bool, append: bool }
type Suggestions = { serial: int, review: SuggestionReview, used: List[int], inserted: int, notice: SuggestionNotice }
pure val noReview: SuggestionReview = { id: 0, token: "", text: "", fits: false, append: false }
pure val initial: Suggestions = { serial: 0, review: noReview, used: List(), inserted: 0, notice: NoSuggestionNotice }
pure val bodyLimit: int = 64000
pure def canOpenReview(s: Suggestions, text: str, target: SuggestionTarget, presenting: bool): bool = presenting and text != ""
pure def openReview(s: Suggestions, text: str, target: SuggestionTarget, presenting: bool): Suggestions =
  { ...s, serial: s.serial + 1, notice: NoSuggestionNotice,
    review: { id: s.serial + 1, token: target.token, text: text, fits: target.ready and target.room, append: target.append } }
pure def canCloseReview(s: Suggestions, id: int): bool = s.review.id != 0 and s.review.id == id
pure def closeReview(s: Suggestions, id: int): Suggestions = { ...s, review: noReview }
pure def alwaysAReviewIsNumbered(s: Suggestions): bool = s.review.id >= 0 and s.review.id <= s.serial
pure val textValues = Set("Sounds good, see you at noon.", "")
pure val targetValues = Set({ token: "k1", ready: true, room: true, append: false }, { token: "k1", ready: true, room: false, append: true },
  { token: "k2", ready: true, room: true, append: true })
pure val presentingValues = Set(true, false)
pure val idValues = Set(1, 2, 3)
```

### Confirming adds the text once, and only to the destination that was reviewed

A confirmation is for the review on screen. When the reply changed, it is dismissed; when the chat is
no longer over the Inbox, it is dismissed; when the destination changed or is not ready, the review
is shown again with a new number and must be confirmed again. Otherwise the text is added once, the
review is used up and the chat steps aside.

```quint
pure def canConfirmReview(s: Suggestions, id: int, target: SuggestionTarget, sameText: bool, presenting: bool): bool =
  s.review.id != 0 and s.review.id == id and s.review.fits
pure def confirmReview(s: Suggestions, id: int, target: SuggestionTarget, sameText: bool, presenting: bool): Suggestions =
  if (not(sameText)) { ...s, review: noReview, notice: SuggestionChanged }
  else if (not(presenting)) { ...s, review: noReview, notice: NotInFront }
  else if (target.token != s.review.token or not(target.ready and target.room))
    { ...s, serial: s.serial + 1, notice: DestinationChanged, review: { ...s.review, id: s.serial + 1, token: target.token, fits: target.ready and target.room, append: target.append } }
  else { ...s, review: noReview, used: s.used.append(id), inserted: s.inserted + 1, notice: NoSuggestionNotice }
pure def alwaysAReviewIsUsedOnce(s: Suggestions): bool = s.used.length() == s.inserted and s.used.every(id => s.used.select(o => o == id).length() == 1)
pure def alwaysTheShownReviewIsUnused(s: Suggestions): bool = s.review.id == 0 or not(s.used.includes(s.review.id))
pure def sometimesInserted(s: Suggestions): bool = s.inserted >= 1
pure def sometimesShownAgainForANewDestination(s: Suggestions): bool = s.notice == DestinationChanged and s.review.id >= 2
pure def lawAnOverlongSuggestionNeverFits(token: str, append: bool): bool = not(openReview(initial, "x", { token: token, ready: true, room: false, append: append }, true).review.fits)
pure val tokenValues = Set("k1", "k2")
pure val appendValues = Set(true, false)
```
