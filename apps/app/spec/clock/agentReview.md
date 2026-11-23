# Agent Clock review

An alarm request the agent proposes (set, show, snooze or dismiss) is reviewed on the phone by the
owner in the native Clock review of the action journal (`AlphaActionJournal`: `reviewClock`,
`confirmClock`, `cancelClock`). The renderer follows one review: it asks for the review, and only a
native approval token lets it confirm, once, while the owner who asked is still the current one.
The journal compares the approved entry; this machine never authorizes an effect by itself. Every
review ends with one cancellation call, which settles whatever is still outstanding natively.

## Story: Let the agent ask Clock only with my approval on the phone

> As the owner, I want an alarm the agent asks for to reach Clock only after I approve it on the
> phone, at most once, and to be reported only as Clock answered, so that the agent never changes an
> alarm on its own and never claims an alarm rang.

### A review starts once for the current owner and ends with one cancellation

```quint
import vocabulary.* from "./vocabulary"
type ReviewPhase = AgentIdle | AgentReviewing | AgentConfirming | AgentSettled | AgentRefused | AgentCancelled
type AgentReview = { phase: ReviewPhase, live: bool, confirms: int, cancels: int, status: HandoffStatus }
pure val initial: AgentReview = { phase: AgentIdle, live: true, confirms: 0, cancels: 0, status: ClockUnknown }
pure def finished(r: AgentReview): bool = r.phase == AgentSettled or r.phase == AgentRefused or r.phase == AgentCancelled
pure def canStartReview(r: AgentReview): bool = r.phase == AgentIdle and r.live
pure def startReview(r: AgentReview): AgentReview = { ...r, phase: AgentReviewing }
pure def canCancelSettled(r: AgentReview): bool = finished(r) and r.cancels == 0
pure def cancelSettled(r: AgentReview): AgentReview = { ...r, cancels: r.cancels + 1 }
pure def alwaysOneCancellation(r: AgentReview): bool = r.cancels <= 1 and (r.cancels == 1 implies finished(r))
```

### Only a native approval token, while the owner is still current, confirms the request, once

A review that answers with a result and no token was refused or could not be shown; that result is
the outcome.

```quint
pure def canReviewAnswered(r: AgentReview, approved: bool, status: HandoffStatus): bool = r.phase == AgentReviewing
pure def reviewAnswered(r: AgentReview, approved: bool, status: HandoffStatus): AgentReview =
  if (approved and r.live) { ...r, phase: AgentConfirming, confirms: r.confirms + 1 }
  else if (approved) { ...r, phase: AgentCancelled }
  else { ...r, phase: AgentRefused, status: status }
pure def alwaysConfirmedAtMostOnce(r: AgentReview): bool = r.confirms <= 1 and (r.phase == AgentConfirming implies r.confirms == 1)
pure def stepConfirmNeedsTheLiveOwner(before: AgentReview, after: AgentReview): bool = after.confirms > before.confirms implies before.live
pure def sometimesRefused(r: AgentReview): bool = r.phase == AgentRefused
```

### The confirmed request is reported only as Clock answered

Opened means applied: Clock received the request, and nothing more is claimed.

```quint
pure def canConfirmAnswered(r: AgentReview, status: HandoffStatus): bool = r.phase == AgentConfirming
pure def confirmAnswered(r: AgentReview, status: HandoffStatus): AgentReview = { ...r, phase: AgentSettled, status: status }
pure def sometimesApplied(r: AgentReview): bool = r.phase == AgentSettled and receiptOf(r.status) == ReceiptApplied and r.cancels == 1
```

### A new owner retires the review: one not yet approved is cancelled, and nothing is confirmed after

```quint
pure def canRetireOwner(r: AgentReview): bool = r.live
pure def retireOwner(r: AgentReview): AgentReview =
  { ...r, live: false, phase: if (r.phase == AgentReviewing or r.phase == AgentIdle) AgentCancelled else r.phase }
pure def sometimesCancelledByRetirement(r: AgentReview): bool = r.phase == AgentCancelled and not(r.live) and r.confirms == 0
```

## Story: Be offered only the Clock and reminder requests this phone can carry out

> As the owner, I want the agent to propose an alarm or a reminder change only where this phone can
> review and carry it out, so that it never offers me a request that can only fail.

### Clock advertises a Clock handoff only with a Clock handler, repeat days only where Clock carries them, and one reminder version only where the phone keeps reminders

Each capability is advertised only when the agent offered it. The Clock handoff (`clock.handoff.v1`)
needs the phone's Clock handler, which the browser build has none of; its repeat-days form
(`clock.handoff.v2`) also needs Clock to carry repeat days (`clockRepeatDaysVersion` 1). Reminder
records (`reminders.local-record.v2`, else `reminders.local-record.v1`, never both) and reminder
creation (`reminders.create.v1`) need the phone's reminder store. Clock never advertises
`clock.alarms.v1`: an alarm is always Android Clock's.

```quint
type ClockOffer = OfferHandoff | OfferRepeatDays | OfferRecordV1 | OfferRecordV2 | OfferCreate
type ClockSupport = { handler: bool, repeatDays: bool, store: bool, recordV2Offered: bool }
pure def advertises(support: ClockSupport, c: ClockOffer, offered: bool): bool =
  offered and (
    if (c == OfferHandoff) support.handler
    else if (c == OfferRepeatDays) support.handler and support.repeatDays
    else if (c == OfferRecordV1) support.store and not(support.recordV2Offered)
    else support.store)
pure def lawNeverBothReminderVersions(support: ClockSupport): bool =
  not(advertises(support, OfferRecordV1, true) and advertises(support, OfferRecordV2, support.recordV2Offered))
pure def lawNoHandlerNoHandoff(support: ClockSupport, offered: bool): bool =
  not(support.handler) implies not(advertises(support, OfferHandoff, offered) or advertises(support, OfferRepeatDays, offered))
pure def lawNoStoreNoReminders(support: ClockSupport, offered: bool): bool =
  not(support.store) implies not(advertises(support, OfferRecordV1, offered) or advertises(support, OfferRecordV2, offered) or advertises(support, OfferCreate, offered))
pure val supportValues = Set({ handler: true, repeatDays: true, store: true, recordV2Offered: true }, { handler: true, repeatDays: false, store: true, recordV2Offered: false },
  { handler: false, repeatDays: true, store: false, recordV2Offered: false }, { handler: false, repeatDays: false, store: true, recordV2Offered: true })
```

### A Clock request is a handoff whose outcome may stay unresolved; a reminder change, a named reminder and a day read are not

A Clock request proves only that Clock opened, so the owner may leave its outcome unresolved in the
history. A reminder change is bound to its journal entry and read back, and a day read is settled by
what it shared, so each is settled as applied or not applied. In the assistant's review a Clock
request and every reminder change are reminder-class writes; reading a reminder or a day's
reminders is a read; all of them always need the owner's review.

```quint
type ClockOperationKind = ClockRequest | ReminderChange | NamedReminder | ReminderRead | DayRead
type ReviewClass = ReminderWrite | ScheduleRead
pure def isHandoff(k: ClockOperationKind): bool = k == ClockRequest
pure def reviewClassOf(k: ClockOperationKind): ReviewClass = if (k == ReminderRead or k == DayRead) ScheduleRead else ReminderWrite
pure def lawAReadIsNeverAHandoff(k: ClockOperationKind): bool = reviewClassOf(k) == ScheduleRead implies not(isHandoff(k))
```
