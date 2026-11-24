# Phone

Phone on an Alpha image: Recents, the keypad and [Voicemail](./voicemail.md),
with Contacts beside them. Recents are a bounded call-log read (at most 50
calls, newest first) made only while Phone is in front, kept in memory for
that showing and never in stored state or the agent's context. A call is
placed only by the owner's own tap here; Android's call screen takes over the
call. The keypad and a recent row never dial by themselves.

## Story: Read my recent calls while Phone is open

> As the owner, I want Phone to show my recent calls whenever I open it, and
> to forget them when I leave, so that my call log never lingers where I did
> not look.

### Phone holds whether it shows, its read of Recents and the call-log access, the owner's call, the tab, the rows and the keypad field

The read and the call are the kit's: a read under its ticket, a call as one
attempt under its number. The keypad number is the owner's string; the
screen checks that it is dialable before Dial.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import permission as P from "../../kit/permission"
import common.* from "./common"

type PhoneTab = RecentsTab | KeypadTab | VoicemailTab
type RecentKind = InboundCall | OutboundCall | MissedCall
type Recent = { id: str, number: str, title: str, kind: RecentKind, date: int, fresh: bool, seconds: int }
type RecentsAnswer = RecentsRead({ calls: List[Recent] }) | RecentsNotGranted | RecentsNotDeclared | RecentsUnreadable
type PhoneNotice = Quiet | InvalidNumber | ReadFailed | Placement({ outcome: CallOutcome })
type Effect = ReadRecents({ ticket: int }) | AskCallLog({ ticket: int }) | Place({ id: int, number: str })
type Phone = {
  shown: bool, recents: R::Read, callLog: P::Permission, declared: bool, call: A::Attempt,
  tab: PhoneTab, voicemailReady: bool, rows: List[Recent], readAt: int,
  number: str, prefill: str, notice: PhoneNotice, listQuery: ListQuery
}
type Moved = { state: Phone, out: List[Effect] }

pure val initial: Phone = {
  shown: false, recents: R::unread, callLog: P::unasked, declared: true, call: A::plan(0),
  tab: RecentsTab, voicemailReady: false, rows: List(), readAt: 0,
  number: "", prefill: "", notice: Quiet, listQuery: NoQuery
}
pure val ticketValues = Set(0, 1, 2, 3)
pure val idValues = Set(0, 1, 2)
pure val atValues = Set(0, 60000)
pure val numberValues = Set("", "4155550100")
pure val queryValues = Set("", "ann")
pure val labelValues = Set("Ann")
pure val answerValues = Set(RecentsNotGranted, RecentsNotDeclared, RecentsUnreadable, RecentsRead({ calls: List() }))
  .union(Set(RecentsRead({ calls: List({ id: "1", number: "4155550100", title: "Ann", kind: MissedCall, date: 50000, fresh: true, seconds: 0 }) })))

pure def busy(p: Phone): bool = p.recents.status == R::Loading or p.call.outcome == A::Sent
```

### Showing Phone starts a read, and leaving it forgets the rows, the field and the notice

A read that answers after Phone left changes nothing, and a call's answer
from an earlier showing is not shown. Leaving also closes the Voicemail tab,
since an unread voicemail store is never "no voicemail".

```quint
pure def canShow(p: Phone, showing: bool): bool = showing != p.shown

pure def show(p: Phone, showing: bool): Moved =
  if (showing)
    { state: { ...p, shown: true, recents: R::ask(p.recents) }, out: List(ReadRecents({ ticket: p.recents.ticket + 1 })) }
  else
    { state: { ...initial, recents: if (p.recents.status == R::Loading) R::answer(p.recents, false) else p.recents, callLog: p.callLog, declared: p.declared,
               call: A::plan(p.call.id), tab: if (p.tab == VoicemailTab) RecentsTab else p.tab },
      out: List() }

pure def alwaysRecentsOnlyWhileShownWithAccess(p: Phone): bool = p.rows.length() > 0 implies (p.shown and P::allows(p.callLog))

pure def alwaysTheFieldOnlyWhileShown(p: Phone): bool = (p.number != "" or p.notice != Quiet) implies p.shown

pure def alwaysWorkOnlyWhileShown(p: Phone): bool = busy(p) implies p.shown

pure def sometimesRecentsShown(p: Phone): bool = p.rows.length() > 0
```

### Only the latest read publishes, and rows already shown stay until it answers

Refresh, the owner's Allow and a return to the app each start a read that
supersedes the one in flight. Android is asked for call-log access only from
Allow, never when Phone opens, and only once (the kit's permission); after
that the owner is sent to Android's settings. A host that does not declare
call-log access says there are no recents, which is not "access needed"; a
failed read shows no rows and says it could not load.

```quint
pure def canRefresh(p: Phone): bool = p.shown and p.call.outcome != A::Sent

pure def refresh(p: Phone): Moved = { state: { ...p, recents: R::ask(p.recents) }, out: List(ReadRecents({ ticket: p.recents.ticket + 1 })) }

pure def canAllow(p: Phone): bool = p.shown and p.declared and P::canAsk(p.callLog) and p.call.outcome != A::Sent

pure def allow(p: Phone): Moved =
  { state: { ...p, callLog: P::ask(p.callLog), recents: R::ask(p.recents) }, out: List(AskCallLog({ ticket: p.recents.ticket + 1 })) }

pure def landPrefill(pending: str, p: Phone): Phone =
  if (pending == "" or busy(p) or not(p.shown)) p else { ...p, number: pending, prefill: "", tab: KeypadTab, notice: Quiet }

pure def canRecentsAnswered(p: Phone, ticket: int): bool = p.shown and R::canAnswer(p.recents, ticket)

pure def recentsAnswered(p: Phone, ticket: int, answer: RecentsAnswer, at: int): Phone =
  val rows = match answer { | RecentsRead(r) => r.calls | _ => List() }
  val grant = match answer { | RecentsRead(r) => P::Granted | RecentsNotGranted => P::Denied | _ => p.callLog.grant }
  val failed = answer == RecentsUnreadable
  landPrefill(p.prefill, { ...p, recents: R::answer(p.recents, not(failed)), callLog: P::observe(p.callLog, grant),
    declared: answer != RecentsNotDeclared, rows: rows, readAt: at,
    notice: if (failed) ReadFailed else if (p.notice == ReadFailed) Quiet else p.notice })

pure def isAskCallLog(e: Effect): bool = match e { | AskCallLog(x) => true | _ => false }

pure def stepAccessIsAskedOnlyFromAllow(before: Phone, via: str, after: Phone, out: List[Effect]): bool =
  out.some(e => isAskCallLog(e)) implies (via == "allow" and not(before.callLog.asked))

pure def sometimesAccessNeeded(p: Phone): bool = p.callLog.grant == P::Denied and p.recents.status == R::Loaded

pure def sometimesSentToSettings(p: Phone): bool = P::needsSettings(p.callLog) and p.shown

pure def sometimesTheReadFailed(p: Phone): bool = p.notice == ReadFailed
```

## Story: Call a number myself

> As the owner, I want to dial on the keypad or tap a recent call and have
> Android place it, with the system dial screen as the fallback, so that only
> my own tap ever calls.

### Dial hands one number at a time to Telecom, and only from the showing it started in

The field and the controls are locked while a read or a call runs. A field
without a dialable number is refused with a notice. The call's answer is
shown only if Phone has been showing since it started; an answer from an
earlier showing changes nothing and cannot release a call of this one.

```quint
pure def canNumberTyped(p: Phone, number: str): bool = p.shown and not(busy(p))

pure def numberTyped(p: Phone, number: str): Phone = { ...p, number: number, notice: Quiet }

pure def canDial(p: Phone, number: str, valid: bool): bool = p.shown and not(busy(p)) and number != ""

pure def dial(p: Phone, number: str, valid: bool): Moved =
  val id = p.call.id + 1
  if (valid) { state: { ...p, number: number, call: A::dispatch(A::record(A::plan(id))), notice: Quiet }, out: List(Place({ id: id, number: number })) }
  else { state: { ...p, number: number, notice: InvalidNumber }, out: List() }

pure def canDialAnswered(p: Phone, id: int): bool = A::canConclude(p.call, id)

pure def dialAnswered(p: Phone, id: int, result: CallOutcome): Phone =
  landPrefill(p.prefill, { ...p, call: A::conclude(p.call, callWent(result), callKnown(result)),
    number: if (result == CallStarted) "" else p.number,
    notice: if (result == CallStarted) Quiet else Placement({ outcome: result }) })

pure def isPlace(e: Effect): bool = match e { | Place(x) => true | _ => false }

pure def stepOnlyTheOwnersDialStartsACall(before: Phone, via: str, after: Phone, out: List[Effect]): bool =
  out.some(e => isPlace(e)) implies (via == "dial" and after.call.outcome == A::Sent and after.call.id == before.call.id + 1)

pure def sometimesTheDialScreenOpened(p: Phone): bool = p.notice == Placement({ outcome: DialerOpened })

pure def sometimesAnInvalidNumberIsRefused(p: Phone): bool = p.notice == InvalidNumber and p.call.outcome != A::Sent

pure def sometimesACallIsUnconfirmed(p: Phone): bool = p.call.outcome == A::Unknown and p.shown
```

### A number handed to Phone fills the keypad once it is idle, and never dials

Contacts' Call, a voicemail's Call back, Home and Alpha's keypad request open
the keypad, with the number filled in when given, also when they hand it
over just before Phone shows. While a read or a call is busy, or Phone is
not yet showing, the number waits and lands when it clears, so an opened
keypad is never contradicted by an empty field.

```quint
pure def keypadAsked(p: Phone, number: str): Phone = landPrefill(number, { ...p, prefill: number, tab: KeypadTab })

pure def stepAHandedNumberNeverDials(before: Phone, via: str, after: Phone): bool =
  via == "keypadAsked" implies after.call == before.call

pure def sometimesAHandedNumberWaits(p: Phone): bool = p.prefill != "" and busy(p)
```

## Story: Move between Recents, Keypad, Voicemail and Contacts

> As the owner, I want tabs for Recents, Keypad and Voicemail, and Contacts
> beside them, with Voicemail offered only when my carrier provides it.

### The Voicemail tab exists only while the carrier's visual voicemail is ready

An unsupported or unconfigured carrier, or a store not yet read, shows no
Voicemail tab. Tabs are places side by side, not layers.

```quint
pure def canTabChosen(p: Phone, tab: PhoneTab): bool = p.shown and tab != p.tab and (tab != VoicemailTab or p.voicemailReady)

pure def tabChosen(p: Phone, tab: PhoneTab): Phone = { ...p, tab: tab, notice: Quiet }

pure def canCarrierRead(p: Phone, ready: bool): bool = (ready and p.shown) != p.voicemailReady

pure def carrierRead(p: Phone, ready: bool): Phone =
  { ...p, voicemailReady: ready and p.shown, tab: if (not(ready and p.shown) and p.tab == VoicemailTab) RecentsTab else p.tab }

pure def alwaysTheVoicemailTabNeedsACarrier(p: Phone): bool = p.tab == VoicemailTab implies p.voicemailReady

pure def alwaysACarrierOnlyWhileShown(p: Phone): bool = p.voicemailReady implies p.shown

pure def sometimesOnTheVoicemailTab(p: Phone): bool = p.tab == VoicemailTab
```

## Story: Find a call from the bar

> As the owner, I want "Call or ask" to filter Recents as I type, digits
> matching numbers, and Alpha's filter to show a chip I can clear (AC-22).

### The bar's query filters Recents on the phone, and Alpha's filter returns to Recents

A row matches when every word of the query matches: a word with digits
matches the number's digits, any other word the start of a word of the name.
That match is the screen's; no request is made while typing.

```quint
pure def canQueryTyped(p: Phone, typed: str): bool = p.shown

pure def queryTyped(p: Phone, typed: str): Phone = { ...p, listQuery: typedQuery(p.listQuery, typed) }

pure def canAlphaFiltered(p: Phone, query: str, label: str): bool = p.shown and query != ""

pure def alphaFiltered(p: Phone, query: str, label: str): Phone = { ...p, listQuery: AlphaQuery({ query: query, label: label }), tab: RecentsTab }

pure def canQueryCleared(p: Phone): bool = p.listQuery != NoQuery

pure def queryCleared(p: Phone): Phone = { ...p, listQuery: NoQuery }

pure def alwaysTheQueryOnlyWhileShown(p: Phone): bool = p.listQuery != NoQuery implies p.shown

pure def sometimesAlphaFilteredRecents(p: Phone): bool = isAlphaQuery(p.listQuery) and p.tab == RecentsTab
```

### Back clears Alpha's filter before it leaves Phone

After the comms stage, the open conversation with Alpha and the open
voicemail ([Voicemail](./voicemail.md)), Back clears a chip Alpha applied to
Recents. Back never moves between tabs.

```quint
type PhoneBack = PhoneChipClears | LeavesPhone

pure def phoneBack(p: Phone): PhoneBack = if (isAlphaQuery(p.listQuery)) PhoneChipClears else LeavesPhone

pure def lawBackLeavesPhoneOnlyWithoutAlphasFilter(q: ListQuery): bool =
  phoneBack({ ...initial, listQuery: q }) == LeavesPhone implies not(isAlphaQuery(q))
```
