# Reminder taps

A tapped reminder notification leaves a token in the phone's reminder store (`pendingReminderTap`,
`consumeReminderTap`, `releaseReminderQuestion`, `dismissReminderTap`, offered when the store
reports `reminderTapVersion` 1). Alpha opens the exact reminder the tap names and consumes the token
only after that reminder's detail is on screen and nothing else happened meanwhile. A tap of the
notification's Ask action opens a review of a question about that reminder; continuing consumes the
token and puts the reviewed question in the composer, and closing the review releases it so the
notification can be tapped again. The store consumes only its current token, so a newer tap is never
consumed by an older check.

## Story: Open the reminder I tapped

> As the owner, I want a tapped reminder notification to open exactly that reminder, and to keep the
> link when I am busy with something else, so that a tap is never lost and never opens the wrong
> reminder.

### One check runs at a time, and an explicit request made meanwhile runs once it ends

A check belongs to what the owner is looking at: any pointer, key, navigation or Back, a hidden
page, the connection chooser, a sensitive context or an open form ends it without consuming.

```quint
type TapStage = TapIdle | TapReading | TapListing | TapConfirming | TapOpened | TapQuestion | TapConsuming
type ReminderTaps = { stage: TapStage, captured: str, question: bool, requested: bool, blocked: bool,
  interaction: int, interactionAt: int, banner: bool, consumes: int, releases: int, composed: int }
pure val initial: ReminderTaps = { stage: TapIdle, captured: "", question: false, requested: false, blocked: false,
  interaction: 0, interactionAt: 0, banner: false, consumes: 0, releases: 0, composed: 0 }
pure def live(t: ReminderTaps): bool = not(t.blocked) and t.interaction == t.interactionAt
pure def ended(again: bool, t: ReminderTaps): ReminderTaps =
  if (again and not(t.blocked)) { ...t, stage: TapReading, requested: false, captured: "", question: false, interactionAt: t.interaction }
  else { ...t, stage: TapIdle, requested: false, captured: "", question: false }
pure def canCheck(t: ReminderTaps, explicit: bool): bool = true
pure def check(t: ReminderTaps, explicit: bool): ReminderTaps =
  if (t.stage != TapIdle) { ...t, requested: t.requested or (explicit and t.stage != TapQuestion) }
  else if (t.blocked) t
  else { ...t, stage: TapReading, interactionAt: t.interaction }
pure def canInteract(t: ReminderTaps): bool = true
pure def interact(t: ReminderTaps): ReminderTaps = { ...t, interaction: t.interaction + 1 }
pure def canSetBlocked(t: ReminderTaps, blocked: bool): bool = blocked != t.blocked
pure def setBlocked(t: ReminderTaps, blocked: bool): ReminderTaps = { ...t, blocked: blocked }
pure def alwaysOneCheck(t: ReminderTaps): bool = (t.captured != "") implies (t.stage != TapIdle and t.stage != TapReading)
pure val tokenValues = Set("", "tap1", "tap2")
```

### The pending tap is read, its reminder listed, and the token read again before anything opens

A reminder that changed since the tap keeps the link without opening a replacement; a newer tap or a
changed target stops the check.

```quint
pure def canPendingRead(t: ReminderTaps, token: str, retained: bool, question: bool): bool = t.stage == TapReading
pure def pendingRead(t: ReminderTaps, token: str, retained: bool, question: bool): ReminderTaps =
  if (not(live(t))) ended(t.requested, t)
  else if (token == "") ended(t.requested, { ...t, banner: false })
  else if (not(retained)) ended(t.requested, { ...t, banner: true })
  else { ...t, stage: TapListing, captured: token, question: question, banner: true }
pure def canTargetListed(t: ReminderTaps, found: bool): bool = t.stage == TapListing
pure def targetListed(t: ReminderTaps, found: bool): ReminderTaps =
  if (live(t) and found) { ...t, stage: TapConfirming } else ended(t.requested, t)
pure def canConfirmed(t: ReminderTaps, token: str, retained: bool): bool = t.stage == TapConfirming
pure def confirmed(t: ReminderTaps, token: str, retained: bool): ReminderTaps =
  if (live(t) and token == t.captured and retained) { ...t, stage: TapOpened } else ended(t.requested, t)
pure def sometimesChangedTargetKept(t: ReminderTaps): bool = t.banner and t.stage == TapIdle and t.consumes == 0 and t.interaction == 0
```

### The token is consumed only after the exact detail is on screen

```quint
pure def canDetailShown(t: ReminderTaps, visible: bool): bool = t.stage == TapOpened
pure def detailShown(t: ReminderTaps, visible: bool): ReminderTaps =
  if (not(visible and live(t))) ended(t.requested, t)
  else if (t.question) { ...t, stage: TapQuestion }
  else { ...t, stage: TapConsuming }
pure def canConsumeSettled(t: ReminderTaps, ok: bool): bool = t.stage == TapConsuming
pure def consumeSettled(t: ReminderTaps, ok: bool): ReminderTaps =
  ended(t.requested, { ...t, consumes: t.consumes + 1, banner: not(ok) and t.banner, composed: if (ok and t.question) t.composed + 1 else t.composed })
pure def stepConsumingFollowsTheDetail(before: ReminderTaps, after: ReminderTaps): bool =
  after.stage == TapConsuming implies (before.stage == TapOpened or before.stage == TapQuestion or before.stage == TapConsuming)
pure def sometimesConsumed(t: ReminderTaps): bool = t.consumes >= 1 and not(t.banner)
```

## Story: Ask about a reminder I tapped

> As the owner, I want the Ask action of a reminder notification to let me review the question before
> it reaches the composer, and to leave the notification usable when I close the review.

### Continuing consumes the token before the question is drafted; closing releases it, never both

The question is drafted only for the reminder still listed unchanged, with the same title and text.

```quint
pure def canQuestionClosed(t: ReminderTaps, compose: bool, unchanged: bool): bool = t.stage == TapQuestion
pure def questionClosed(t: ReminderTaps, compose: bool, unchanged: bool): ReminderTaps =
  if (compose and unchanged) { ...t, stage: TapConsuming }
  else ended(t.requested, { ...t, releases: t.releases + 1 })
pure def alwaysADraftNeedsASpentTap(t: ReminderTaps): bool = t.composed <= t.consumes
pure def sometimesQuestionDrafted(t: ReminderTaps): bool = t.composed >= 1
pure def sometimesReleased(t: ReminderTaps): bool = t.releases >= 1
```

### A link the owner leaves pending can be dismissed from the banner

```quint
pure def canDismissBanner(t: ReminderTaps): bool = t.stage == TapIdle and t.banner
pure def dismissBanner(t: ReminderTaps): ReminderTaps = { ...t, banner: false }
```
