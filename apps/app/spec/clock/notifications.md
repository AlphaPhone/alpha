# Notifications

The current notifications, as the phone lists them (`AlphaNotifications`: `list`, `open`, `dismiss`,
`clear`): Alpha's own reminder, calendar and navigation notices, workflow notices, and the other
apps the owner chose to mirror ([notification mirror](./mirror.md)). Android's shade is the
notification surface on the phone; Alpha's shade sheet shows the same rows in the browser build and
when the agent or the owner inspects them. Each row has an identity (id, revision and source); an
action names the identity the owner saw, and the phone refuses it for a row that changed. A locked
phone or a secret notice hides a row's text natively, and a hidden row never opens.

Each opening of the shade is a visit. A reply that belongs to an earlier visit, or arrives after
the page hid, changes nothing. Pressing one of Alpha's own rows makes it the agent's context for
that visit; other apps' rows and hosted results never are, and their titles and text stay on the
phone.

## Story: Act on exactly the notification I see

> As the owner, I want Open, Dismiss and Clear all to act on exactly the notifications I see, and to
> be told when one changed, so that a stale row never acts and a request is never shown as done
> before the phone confirms it.

### The shade holds the rows of its current visit, and a hidden or closed shade holds none

```quint
type NoticeSource = OwnNotice | ExternalNotice | HostedNotice
type NoticeKind = ReminderKind | CalendarKind | NavigationKind | WorkflowKind | OtherKind
type NoticeRow = { id: str, revision: str, source: NoticeSource, kind: NoticeKind, appLabel: str, title: str, text: str,
  at: int, clearable: bool, canOpen: bool, redacted: bool, opaque: bool }
type NoticeKey = { id: str, revision: str, source: NoticeSource }
type QuestionPhase = NoQuestion | QuestionReview({ id: str, revision: str }) | QuestionChecking({ id: str, revision: str })
type NoticeReport = NoReport | ReportChanged | ReportOngoing | ReportNoAction | ReportUpdated | ReportUnavailable | ReportGone | ReportAlertsFailed
type Shade = { open: bool, visit: int, rows: List[NoticeRow], busy: bool, failed: bool, acting: bool, actingVisit: int,
  selected: str, selectedRevision: str, question: QuestionPhase, report: NoticeReport, staleReplies: int, asks: int, composed: int }
pure val initial: Shade = { open: false, visit: 0, rows: List(), busy: false, failed: false, acting: false, actingVisit: 0,
  selected: "", selectedRevision: "", question: NoQuestion, report: NoReport, staleReplies: 0, asks: 0, composed: 0 }
pure def keyOf(x: NoticeRow): NoticeKey = { id: x.id, revision: x.revision, source: x.source }
pure def listedRow(n: Shade, id: str, revision: str): List[NoticeRow] = n.rows.select(x => x.id == id and x.revision == revision)
pure def clearableKeys(n: Shade): List[NoticeKey] = n.rows.select(x => x.clearable).listMap(x => keyOf(x))
pure val own: NoticeRow = { id: "reminder-1", revision: "v1", source: OwnNotice, kind: ReminderKind, appLabel: "Alpha Phone", title: "Call",
  text: "", at: 1, clearable: true, canOpen: true, redacted: false, opaque: true }
pure val rowsValues = Set(List(), List(own), List(own, { ...own, id: "mail-1", source: ExternalNotice, kind: OtherKind, clearable: false, canOpen: false }),
  List({ ...own, revision: "v2" }))
pure val idValues = Set("reminder-1", "mail-1")
pure val revisionValues = Set("v1", "v2")
pure val visitValues = Set(1, 2, 3)
pure val keysValues = Set(List(), List({ id: "reminder-1", revision: "v1", source: OwnNotice }))
pure def canOpenShade(n: Shade): bool = not(n.open)
pure def openShade(n: Shade): Shade = { ...n, open: true, visit: n.visit + 1, report: NoReport }
pure def canCloseShade(n: Shade): bool = n.open
pure def closeShade(n: Shade): Shade =
  { ...n, open: false, visit: n.visit + 1, rows: List(), selected: "", selectedRevision: "", question: NoQuestion }
pure def alwaysAClosedShadeHoldsNothing(n: Shade): bool =
  not(n.open) implies (n.rows.length() == 0 and n.selected == "" and n.question == NoQuestion)
```

### A listing is shown only in the visit it was read for, and a failed one is reported once

```quint
pure def canBeginList(n: Shade): bool = n.open and not(n.busy)
pure def beginList(n: Shade): Shade = { ...n, busy: true }
pure def canListedNotices(n: Shade, visit: int, rows: List[NoticeRow], alertsFailed: bool): bool = n.busy
pure def listedNotices(n: Shade, visit: int, rows: List[NoticeRow], alertsFailed: bool): Shade =
  if (visit != n.visit or not(n.open)) { ...n, busy: false, staleReplies: n.staleReplies + 1 }
  else {
    ...n, busy: false, failed: false, rows: rows,
    selected: if (rows.some(x => x.id == n.selected and x.revision == n.selectedRevision and x.source == OwnNotice)) n.selected else "",
    selectedRevision: if (rows.some(x => x.id == n.selected and x.revision == n.selectedRevision and x.source == OwnNotice)) n.selectedRevision else "",
    report: if (alertsFailed) ReportAlertsFailed else n.report
  }
pure def canListFailed(n: Shade, visit: int): bool = n.busy
pure def listFailed(n: Shade, visit: int): Shade =
  if (visit != n.visit or not(n.open)) { ...n, busy: false, staleReplies: n.staleReplies + 1 }
  else { ...n, busy: false, failed: true, rows: List(), selected: "", selectedRevision: "", report: if (n.failed) n.report else ReportUnavailable }
pure def stepAnEarlierVisitChangesNothing(before: Shade, after: Shade): bool =
  after.staleReplies > before.staleReplies implies (after.rows == before.rows and after.selected == before.selected)
pure def sometimesStaleReplyIgnored(n: Shade): bool = n.staleReplies >= 1 and n.open
```

### Open and Dismiss act only on the listed row they name; an ongoing or actionless row says so

```quint
pure def canPress(n: Shade, id: str, revision: str): bool = n.open and not(n.acting)
pure def press(n: Shade, id: str, revision: str): Shade =
  if (listedRow(n, id, revision).length() == 0) { ...n, report: ReportChanged }
  else if (listedRow(n, id, revision).some(x => not(x.canOpen) or x.redacted)) { ...n, report: ReportNoAction }
  else { ...n, acting: true, actingVisit: n.visit }
pure def canSwipe(n: Shade, id: str, revision: str): bool = n.open and not(n.acting)
pure def swipe(n: Shade, id: str, revision: str): Shade =
  if (listedRow(n, id, revision).length() == 0) { ...n, report: ReportChanged }
  else if (listedRow(n, id, revision).some(x => not(x.clearable))) { ...n, report: ReportOngoing }
  else { ...n, acting: true, actingVisit: n.visit }
pure def canActionSettled(n: Shade, ok: bool): bool = n.acting
pure def actionSettled(n: Shade, ok: bool): Shade =
  { ...n, acting: false, report: if (n.actingVisit == n.visit and n.open and not(ok)) ReportChanged else n.report }
pure def stepAnActionNamesAListedRow(before: Shade, via: str, after: Shade): bool =
  (not(before.acting) and after.acting) implies before.rows.length() > 0
pure def sometimesOngoing(n: Shade): bool = n.report == ReportOngoing
pure def sometimesChanged(n: Shade): bool = n.report == ReportChanged and n.rows.length() > 0
```

### Clear all sends exactly the clearable rows of the listing, and each row keeps its own outcome

A row the phone could no longer clear is reported as updated; the others were requested.

```quint
pure def canClearAll(n: Shade, keys: List[NoticeKey]): bool = n.open and not(n.acting) and keys.length() > 0 and keys == clearableKeys(n)
pure def clearAll(n: Shade, keys: List[NoticeKey]): Shade = { ...n, acting: true, actingVisit: n.visit }
pure def canClearSettled(n: Shade, unavailable: bool): bool = n.acting
pure def clearSettled(n: Shade, unavailable: bool): Shade =
  { ...n, acting: false, report: if (n.actingVisit == n.visit and n.open and unavailable) ReportUpdated else n.report }
pure def sometimesPartlyCleared(n: Shade): bool = n.report == ReportUpdated
```

## Story: Ask Alpha about one of its notifications

> As the owner, I want to give the agent one of Alpha's own notifications as context, or ask about it
> after reviewing exactly what will be shared, so that nothing from another app, a hosted result or a
> hidden row reaches the conversation.

### Only an own row with an opaque identity becomes the agent's context, for this visit

```quint
pure def canSelect(n: Shade, id: str, revision: str): bool =
  n.open and listedRow(n, id, revision).some(x => x.source == OwnNotice and x.opaque)
pure def select(n: Shade, id: str, revision: str): Shade = { ...n, selected: id, selectedRevision: revision }
pure def alwaysSelectionIsOwn(n: Shade): bool =
  n.selected != "" implies n.rows.some(x => x.id == n.selected and x.revision == n.selectedRevision and x.source == OwnNotice and x.opaque)
pure def sometimesSelected(n: Shade): bool = n.selected != ""
```

### A question is offered only for an own reminder, calendar or navigation row that is not hidden, and drafted only if it is still listed unchanged

Workflow notices, hosted results and digests can carry mail-derived text and are never offered.
The check and the draft are the assistant's [notice question](../assistant/noticeQuestion.md), at
the revision the owner reviewed: it reads Clock's own notices again from the phone, consumes the
notice once and composes the question; Clock records only whether it was drafted.

```quint
pure def reviewable(x: NoticeRow): bool =
  x.source == OwnNotice and x.opaque and not(x.redacted) and (x.kind == ReminderKind or x.kind == CalendarKind or x.kind == NavigationKind)
pure def canAsk(n: Shade, id: str, revision: str): bool = n.open and n.question == NoQuestion and listedRow(n, id, revision).some(x => reviewable(x))
pure def ask(n: Shade, id: str, revision: str): Shade = { ...n, question: QuestionReview({ id: id, revision: revision }), selected: id, selectedRevision: revision, asks: n.asks + 1 }
pure def reviewing(q: QuestionPhase): bool = match q { | QuestionReview(_) => true | _ => false }
pure def checking(q: QuestionPhase): bool = match q { | QuestionChecking(_) => true | _ => false }
pure def canAskContinue(n: Shade): bool = reviewing(n.question)
pure def askContinue(n: Shade): Shade = {
  val q = n.question
  match q { | QuestionReview(x) => { ...n, question: QuestionChecking({ id: x.id, revision: x.revision }) } | _ => n }
}
pure def canAskClosed(n: Shade): bool = reviewing(n.question)
pure def askClosed(n: Shade): Shade = { ...n, question: NoQuestion }
pure def canAskChecked(n: Shade, visit: int, unchanged: bool): bool = checking(n.question)
pure def askChecked(n: Shade, visit: int, unchanged: bool): Shade =
  if (unchanged and visit == n.visit and n.open) { ...n, question: NoQuestion, composed: n.composed + 1 }
  else { ...n, question: NoQuestion, report: ReportGone }
pure def alwaysADraftFollowsAReview(n: Shade): bool = n.composed <= n.asks
pure def sometimesQuestionDrafted(n: Shade): bool = n.composed >= 1
pure def sometimesGone(n: Shade): bool = n.report == ReportGone
```

### The phone consumes a notice once, at the revision asked about; a phone without that call consumes it once for this session

The assistant's question consumes the notice through `AlphaNotifications.consumeOwnNotice` with the
id and revision the owner reviewed. Only `consumed` lets the question join the draft: a notice
already consumed, changed or gone is reported as changed. A phone whose plugin does not offer the
call keeps the notice consumed in Alpha's memory until Alpha restarts.

```quint
type ConsumeAnswer = ConsumedNow | AlreadyConsumed | NoticeChanged | NoticeGone | ConsumeUnavailable | ConsumeUnsupported
pure def consumeAccepted(answer: ConsumeAnswer, seenThisSession: bool): bool =
  answer == ConsumedNow or (answer == ConsumeUnsupported and not(seenThisSession))
pure val seenThisSessionValues = Set(true, false)
pure def lawAChangedNoticeIsNeverConsumed(seenThisSession: bool): bool = not(consumeAccepted(NoticeChanged, seenThisSession))
pure def lawAnUnsupportedPhoneConsumesOncePerSession(seenThisSession: bool): bool = consumeAccepted(ConsumeUnsupported, seenThisSession) iff not(seenThisSession)
```
