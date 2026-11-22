# Reset

Erasing Alpha's data is reviewed natively by `AlphaReset`: Android's disclosure and a fresh device
credential decide, and a confirmed reset stops the app instead of answering. The renderer only asks
for the review and words what the native side sends back, which is always that nothing was reset
yet. Settings keeps no backup, import or export of the owner's data.

## Story: Erase Alpha's data on purpose

> As the owner, I tap Erase all data, confirm in Android's own review with my screen lock, and Alpha
> starts fresh; if I cancel or the phone cannot review it, I am told nothing was erased.

### One review is open at a time, and only Android's native review can confirm it

```quint
type Notice = NoNotice | AlreadyOpen | Expired | NeedsScreenLock | NoAuthentication | MayStillProceed | ListenerUnreachable | Unconfirmed
type ResetReview = { open: bool, notice: Notice, reviews: int }
pure val initial: ResetReview = { open: false, notice: NoNotice, reviews: 0 }
pure def canOpenReview(r: ResetReview): bool = not(r.open)
pure def openReview(r: ResetReview): ResetReview = { open: true, notice: NoNotice, reviews: r.reviews + 1 }
pure def canReviewAnswered(r: ResetReview, notice: Notice): bool = r.open
pure def reviewAnswered(r: ResetReview, notice: Notice): ResetReview = { ...r, open: false, notice: notice }
pure def sometimesCancelled(r: ResetReview): bool = r.reviews >= 1 and not(r.open) and r.notice == NoNotice
pure def sometimesRefused(r: ResetReview): bool = r.notice == NeedsScreenLock
```

### The native answer is worded by Alpha, and one Alpha does not know claims nothing

A plain cancel needs no notice. A reset that could not be prepared after the owner confirmed it may
still go ahead, and its notice says so. A rejected call, a malformed answer or an unknown sentence
reads as unconfirmed.

```quint
type NativeStatus = NativeCancelled | NativeUnavailable | NativeOther
type NativeSentence = ClosedNothingReset | NothingReset | CancelledNothingReset | ReviewAlreadyOpen | ReviewExpired
  | SetScreenLock | AuthenticationUnavailable | CouldNotPrepare | ListenerOffOrUnreachable | UnknownSentence
pure def noticeOf(status: NativeStatus, sentence: NativeSentence): Notice =
  if (status == NativeOther or sentence == UnknownSentence) Unconfirmed
  else if (sentence == ClosedNothingReset or sentence == NothingReset or sentence == CancelledNothingReset)
    (if (status == NativeCancelled) NoNotice else Unconfirmed)
  else if (sentence == ReviewAlreadyOpen) AlreadyOpen else if (sentence == ReviewExpired) Expired
  else if (sentence == SetScreenLock) NeedsScreenLock else if (sentence == AuthenticationUnavailable) NoAuthentication
  else if (sentence == CouldNotPrepare) MayStillProceed else ListenerUnreachable
pure def lawAnUnknownAnswerIsUnconfirmed(status: NativeStatus): bool = noticeOf(status, UnknownSentence) == Unconfirmed
pure def lawOnlyANativeCancelIsSilent(status: NativeStatus, sentence: NativeSentence): bool =
  noticeOf(status, sentence) == NoNotice implies status == NativeCancelled
```

### Settings offers no backup, import or export of the owner's data

Reset is the one way to recover from data that cannot be read; passwords leave the vault only
through the vault's own native backup approval.

```quint
type DataAction = EraseAll | Backup | Import | Export
pure def offered(action: DataAction): bool = action == EraseAll
pure def lawOnlyEraseIsOffered(action: DataAction): bool = offered(action) iff action == EraseAll
```
