# Phone

Phone on the Alpha image: Recents, the keypad and Voicemail (its own spec), with Contacts as a
fourth tab that opens the Contacts app. Recents are a bounded call-log read (at most 50 calls,
newest first) made only while Phone is in front, kept in memory for that showing and never in
stored state or agent context. A call is placed only by the owner's own tap here; Android's
system call screen takes over the call. The keypad and a recent row never dial by themselves.

## Domain

### Phone holds its showing, the read in flight, the dial in flight, the tab, the rows and the keypad field

`epoch` moves with every read and every change of showing, so only the latest read answers;
`session` moves with every showing, so a dial belongs to the showing it started in. The keypad
number is the shell's string: it appends digits, keeps at most 40 characters and a leading `+`,
and checks a dialable number before Dial.

```quint
import common.* from "./common"
type PhoneTab = RecentsTab | KeypadTab | VoicemailTab
type CallLogAccess = LogUnread | LogGranted | LogNeeded | LogAbsent
type RecentKind = InboundCall | OutboundCall | MissedCall
type Recent = { id: str, number: str, title: str, kind: RecentKind, date: int, fresh: bool, seconds: int }
type RecentsAnswer = RecentsRead({ calls: List[Recent] }) | RecentsNotGranted | RecentsNotDeclared | RecentsUnreadable
type PhoneNotice = Quiet | InvalidNumber | ReadFailed | Placement({ outcome: CallOutcome })
type Phone = {
  shown: bool, epoch: int, reading: bool, askAccess: bool, session: int, dialing: bool,
  tab: PhoneTab, voicemailReady: bool, recents: List[Recent], access: CallLogAccess, readAt: int,
  number: str, prefill: str, notice: PhoneNotice, listQuery: ListQuery
}
pure val initial: Phone = {
  shown: false, epoch: 0, reading: false, askAccess: false, session: 0, dialing: false,
  tab: RecentsTab, voicemailReady: false, recents: List(), access: LogUnread, readAt: 0,
  number: "", prefill: "", notice: Quiet, listQuery: NoQuery
}
pure val ticketValues = Set(0, 1, 2, 3)
pure val sessionValues = Set(0, 1, 2)
pure val atValues = Set(0, 60000)
pure val numberValues = Set("", "4155550100")
pure val queryValues = Set("", "ann")
pure val labelValues = Set("Ann")
pure val answerValues = Set(RecentsNotGranted, RecentsNotDeclared, RecentsUnreadable, RecentsRead({ calls: List() }))
  .union(Set(RecentsRead({ calls: List({ id: "1", number: "4155550100", title: "Ann", kind: MissedCall, date: 50000, fresh: true, seconds: 0 }) })))
```

## Story: Read my recent calls while Phone is open

> As the owner, I want Phone to show my recent calls whenever I open it, and to forget them when I
> leave, so that my call log never lingers where I did not look.

### Showing Phone starts a read, and leaving it forgets the rows, the field and the notice

A read that answers after Phone left changes nothing. Leaving also closes the Voicemail tab, since
an unread voicemail store is never "no voicemail".

```quint
pure def canPhoneShown(p: Phone): bool = not(p.shown)
pure def phoneShown(p: Phone): Phone = { ...p, shown: true, epoch: p.epoch + 1, reading: true, askAccess: false }
pure def canPhoneHidden(p: Phone): bool = p.shown
pure def phoneHidden(p: Phone): Phone =
  { ...initial, epoch: p.epoch + 1, session: p.session + 1, tab: if (p.tab == VoicemailTab) RecentsTab else p.tab }
pure def alwaysRecentsOnlyWhileShownWithAccess(p: Phone): bool = p.recents.length() > 0 implies (p.shown and p.access == LogGranted)
pure def alwaysTheFieldOnlyWhileShown(p: Phone): bool = (p.number != "" or p.prefill != "" or p.notice != Quiet) implies p.shown
pure def alwaysWorkOnlyWhileShown(p: Phone): bool = (p.reading or p.dialing) implies p.shown
pure def sometimesRecentsShown(p: Phone): bool = p.recents.length() > 0
```

### Only the latest read publishes, and rows already shown stay until it answers

Refresh, the owner's Allow control and a return to the app each start a read that supersedes the
one in flight. Android asks for call-log access only inside a read the owner started from Allow,
never when Phone opens. A host that does not declare call-log access says there are no recents,
which is not "access needed"; a failed read shows no rows and says it could not load.

```quint
pure def canRefreshed(p: Phone, request: bool): bool = p.shown
pure def refreshed(p: Phone, request: bool): Phone = { ...p, epoch: p.epoch + 1, reading: true, askAccess: request }
pure def landPrefill(pending: str, p: Phone): Phone =
  if (pending == "" or p.reading or p.dialing) p else { ...p, number: pending, prefill: "", tab: KeypadTab, notice: Quiet }
pure def canRecentsAnswered(p: Phone, ticket: int): bool = p.shown and p.reading and ticket == p.epoch
pure def recentsAnswered(p: Phone, ticket: int, answer: RecentsAnswer, at: int): Phone = {
  val rows = match answer { | RecentsRead(r) => r.calls | _ => List() }
  val access = match answer {
    | RecentsRead(r) => LogGranted | RecentsNotGranted => LogNeeded | RecentsNotDeclared => LogAbsent | RecentsUnreadable => p.access
  }
  val failed = answer == RecentsUnreadable
  landPrefill(p.prefill, { ...p, reading: false, askAccess: false, recents: rows, access: access, readAt: at,
    notice: if (failed) ReadFailed else if (p.notice == ReadFailed) Quiet else p.notice })
}
pure def stepAccessIsAskedOnlyFromAllow(before: Phone, via: str, after: Phone): bool =
  (after.askAccess and not(before.askAccess)) implies via == "refreshed"
pure def sometimesAccessNeeded(p: Phone): bool = p.access == LogNeeded and not(p.reading)
pure def sometimesTheReadFailed(p: Phone): bool = p.notice == ReadFailed
```

## Story: Call a number myself

> As the owner, I want to dial on the keypad or tap a recent call and have Android place it, with
> the system dial screen as the fallback, so that only my own tap ever calls.

### Dial hands one number at a time to Telecom, and only from the showing it started in

The field and the controls are locked while a read or a dial runs. A field without a dialable
number is refused with a notice. The dial's answer is shown only if Phone has been showing since
it started, whatever reads ran meanwhile; an answer from an earlier showing changes nothing and
cannot release a dial of this one.

```quint
pure def canNumberTyped(p: Phone, number: str): bool = p.shown and not(p.reading) and not(p.dialing)
pure def numberTyped(p: Phone, number: str): Phone = { ...p, number: number, notice: Quiet }
pure def canDialStarted(p: Phone, valid: bool): bool = p.shown and not(p.reading) and not(p.dialing)
pure def dialStarted(p: Phone, valid: bool): Phone = if (valid) { ...p, dialing: true, notice: Quiet } else { ...p, notice: InvalidNumber }
pure def canDialAnswered(p: Phone, session: int): bool = p.dialing and session == p.session
pure def dialAnswered(p: Phone, session: int, result: CallOutcome): Phone =
  landPrefill(p.prefill, { ...p, dialing: false,
    number: if (result == CallStarted) "" else p.number,
    notice: if (result == CallStarted) Quiet else Placement({ outcome: result }) })
pure def stepOnlyTheOwnersDialStartsACall(before: Phone, via: str, after: Phone): bool =
  (after.dialing and not(before.dialing)) implies via == "dialStarted"
pure def sometimesTheDialScreenOpened(p: Phone): bool = p.notice == Placement({ outcome: DialerOpened })
pure def sometimesAnInvalidNumberIsRefused(p: Phone): bool = p.notice == InvalidNumber and not(p.dialing)
```

### A number handed to Phone fills the keypad once it is idle, and never dials

Contacts' Call, a voicemail's Call back, Home and Alpha's keypad request open the keypad, with the
number filled in when given. While a read or a dial is busy the number waits and lands when it
clears, so an opened keypad is never contradicted by an empty field.

```quint
pure def canKeypadAsked(p: Phone, number: str): bool = p.shown
pure def keypadAsked(p: Phone, number: str): Phone = landPrefill(number, { ...p, prefill: number, tab: KeypadTab })
pure def stepAHandedNumberNeverDials(before: Phone, via: str, after: Phone): bool =
  via == "keypadAsked" implies after.dialing == before.dialing
pure def sometimesAHandedNumberWaits(p: Phone): bool = p.prefill != "" and (p.reading or p.dialing)
```

## Story: Move between Recents, Keypad, Voicemail and Contacts

> As the owner, I want tabs for Recents, Keypad and Voicemail, and Contacts beside them, with
> Voicemail offered only when my carrier provides it.

### The Voicemail tab exists only while the carrier's visual voicemail is ready

An unsupported or unconfigured carrier, or a store not yet read, shows no Voicemail tab; Home's
Phone card names the tab it leads to.

```quint
pure def canTabChosen(p: Phone, tab: PhoneTab): bool = p.shown and tab != p.tab and (tab != VoicemailTab or p.voicemailReady)
pure def tabChosen(p: Phone, tab: PhoneTab): Phone = { ...p, tab: tab, notice: Quiet }
pure def carrierRead(p: Phone, ready: bool): Phone =
  { ...p, voicemailReady: ready and p.shown, tab: if (not(ready and p.shown) and p.tab == VoicemailTab) RecentsTab else p.tab }
pure def alwaysTheVoicemailTabNeedsACarrier(p: Phone): bool = p.tab == VoicemailTab implies p.voicemailReady
pure def alwaysACarrierOnlyWhileShown(p: Phone): bool = p.voicemailReady implies p.shown
pure def sometimesOnTheVoicemailTab(p: Phone): bool = p.tab == VoicemailTab
```

## Story: Find a call from the bar

> As the owner, I want "Call or ask" to filter Recents as I type, digits matching numbers, and
> Alpha's filter to show a chip I can clear (AC-22).

### The bar's query filters Recents on the phone, and Alpha's filter returns to Recents

A row matches when every word of the query matches: a word with digits matches the number's
digits, any other word the start of a word of the name. That match is the shell's; no request is
made while typing.

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

After the comms stage, the open chat and the open voicemail (voicemail.md), Back clears a chip
Alpha applied to Recents. Tabs are places side by side, not layers: Back never moves between them.

```quint
type PhoneBack = PhoneChipClears | LeavesPhone
pure def phoneBack(p: Phone): PhoneBack = if (isAlphaQuery(p.listQuery)) PhoneChipClears else LeavesPhone
pure def lawBackLeavesPhoneOnlyWithoutAlphasFilter(p: Phone): bool = phoneBack(p) == LeavesPhone implies not(isAlphaQuery(p.listQuery))
```
