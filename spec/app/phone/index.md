# Phone

The phone app on an Alpha image that admits it: Recents, the Keypad and,
while the carrier's visual voicemail is ready, Voicemail as tabs. Alpha
never calls on its own. Every call the owner starts here is handed to the
phone: placed through Telecom where Alpha holds the dialer role, else opened
in the dial screen with the number, and the phone's own call screen owns
every live call. Alpha keeps only what the phone last said
about calls and the carrier. Other areas read those facts, for example to
pause voice during a call or to refuse a write during a call that may be an
emergency call.

- [Voicemail](./voicemail.md): the voicemail list, one open voicemail, its audio and its on-phone transcript
- [Call strip](./call.md): the strip over every view while a call is live, Return and End
- [Talking with Alpha](./comms.md): the one bar of Phone, Messages and Contacts, the stage above the conversation, End and Alpha's proposals
- [Phone details](./details.md): Settings → Phone: each line's SIM, carrier, number and network, and the role holders
- [Agent requests](../contacts/agent.md): calls and contact changes the agent proposes, which the owner approves on the phone

## Domain

### What Phone holds

Which tab is showing; call-log access; the recent calls as last read; the
keypad's digits, what the phone says the typed number is, and the contact it
matches; the handoff to the dialer and whether its answer was lost; and the
phone's last word on calls, missed calls, the carrier and its visual
voicemail.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"

type Tab = Recents | Keypad | Voicemail
type Filter = AllCalls | MissedCalls
type Typed = Blank | Partial | Dialable | Emergency
type Telecom = NoCall | OrdinaryCall | MaybeEmergencyCall | CallUnknown
type Phone = {
  front: bool, tab: Tab,
  log: P::Permission, recents: R::Read, rows: int, chip: Filter, sought: bool,
  digits: int, typed: Typed, lookup: R::Read, matched: bool,
  dial: R::Read, dialled: bool, failedDial: bool, unsureDial: bool,
  telecom: Telecom, carrier: bool, missed: int, voicemail: bool,
}

pure val initial: Phone = {
  front: false, tab: Recents,
  log: P::unasked, recents: R::unread, rows: 0, chip: AllCalls, sought: false,
  digits: 0, typed: Blank, lookup: R::unread, matched: false,
  dial: R::unread, dialled: false, failedDial: false, unsureDial: false,
  telecom: CallUnknown, carrier: false, missed: 0, voicemail: false,
}
```

### What Phone asks of the phone

A read of the call log, a lookup of the typed number among the contacts,
Android's prompt for call-log access, Android's Settings, marking missed
calls seen, and a handoff to the dialer: of the typed number, or of a recent
call's number, which the handoff names.

```quint
type Source = TypedNumber | PickedNumber
type Effect =
  | ReadLog({ ticket: int, device: bool })
  | MatchNumber({ ticket: int })
  | AskLog
  | OpenSettings
  | MarkSeen
  | Handoff({ ticket: int, source: Source, number: str })

type Moved = { state: Phone, out: List[Effect] }

pure def handoffIn(out: List[Effect]): bool =
  out.some(e => match e { | Handoff(h) => true | _ => false })
```

### What the simulator tries

```quint
pure val numberValues = Set("", "+14155550100")
pure val ticketValues = Set(1, 2, 3)
pure val countValues = Set(-1, 0, 2)
pure val unheardValues = Set(0, 1)
pure val weight_recentsRead = 3
pure val weight_press = 3
```

## Story: See my recent calls

> As the owner, I want my recent calls listed, all or only the missed ones,
> and to be told plainly when there are none, when they could not be read
> and when Alpha has no access to the call log.

### Phone reads the call log whenever Recents comes to the front

Showing Phone on Recents, or picking the Recents tab while Phone is in front, starts a new read. The Contacts tab can choose a Phone tab before the shell returns to Phone.

```quint
pure def onRecents(s: Phone): bool = s.front and s.tab == Recents

pure def readLog(device: bool, chip: Filter, s: Phone): Moved =
  val recents = R::ask(s.recents)
  { state: { ...s, chip: chip, recents: recents }, out: List(ReadLog({ ticket: recents.ticket, device: device })) }

pure def canShow(s: Phone): bool = not(s.front)

pure def show(s: Phone): Moved =
  val shown = { ...s, front: true, dialled: false, failedDial: false, unsureDial: false }
  if (shown.tab == Recents) readLog(true, s.chip, shown) else { state: shown, out: List() }
```

### Leaving Phone, or leaving Recents, forgets the rows

```quint
pure def canLeave(s: Phone): bool = s.front

pure def leave(s: Phone): Phone = { ...s, front: false, rows: 0, sought: false, failedDial: false, unsureDial: false }

pure def canPickTab(s: Phone, tab: Tab): bool = tab != s.tab and (tab != Voicemail or s.voicemail)

pure def pickTab(s: Phone, tab: Tab): Moved =
  val turned = { ...s, tab: tab, rows: 0 }
  if (tab == Recents and s.front) readLog(true, s.chip, turned) else { state: turned, out: List() }
```

### The Voicemail tab is offered only while the carrier's visual voicemail is ready

The phone says whether it is ready when Phone shows and with each read of
the voicemail. When it stops being ready, a Voicemail tab that is showing
turns to Recents.

```quint
pure def voicemailReported(s: Phone, ready: bool): Moved =
  val told = { ...s, voicemail: ready }
  if (ready or s.tab != Voicemail) { state: told, out: List() }
  else if (s.front) readLog(true, s.chip, { ...told, tab: Recents, rows: 0 })
  else { state: { ...told, tab: Recents, rows: 0 }, out: List() }

pure def alwaysVoicemailOnlyWhileReady(s: Phone): bool = s.tab == Voicemail implies s.voicemail

pure def sometimesVoicemailTab(s: Phone): bool = s.front and s.tab == Voicemail
```

### The filter and "Retry call history" read the log again

```quint
pure def canPickChip(s: Phone, chip: Filter): bool = onRecents(s) and chip != s.chip

pure def pickChip(s: Phone, chip: Filter): Moved = readLog(false, chip, { ...s, rows: 0 })

pure def canRetry(s: Phone): bool = onRecents(s) and s.recents.status == R::Failed

pure def retry(s: Phone): Moved = readLog(true, s.chip, s)
```

### Only the newest read of the log is shown, with what Android says about access

A read that fails or finds access missing shows no rows. Rows shown on
Recents mark the missed calls seen. Each row is named by the contact on
the phone that holds its number, else by the name the log kept, else by
its number.

```quint
pure def canRecentsRead(s: Phone, ticket: int, count: int): bool =
  onRecents(s) and R::canAnswer(s.recents, ticket) and count >= 0

pure def recentsRead(s: Phone, ticket: int, ok: bool, grant: P::Grant, count: int): Moved =
  val log = P::observe(s.log, grant)
  val good = ok and P::allows(log)
  val read = { ...s, log: log, recents: R::answer(s.recents, good), rows: if (good) count else 0 }
  if (good and s.missed > 0) { state: { ...read, missed: 0 }, out: List(MarkSeen) }
  else { state: read, out: List() }
```

### No calls, a failed read and missing access are told apart

```quint
pure def noCalls(s: Phone): bool = onRecents(s) and s.recents.status == R::Loaded and s.rows == 0
pure def historyFailed(s: Phone): bool = onRecents(s) and s.recents.status == R::Failed and P::allows(s.log)
pure def logNeeded(s: Phone): bool = onRecents(s) and not(P::allows(s.log))
```

### Typing in the bar, or the agent's filter, searches the log afresh

Digits match numbers and letters match names, on the phone. Each search
uses the bounded call-log page from this visit, reading from Android when
the page is missing. Clearing the search or the agent's chip shows the
unfiltered page again.

```quint
pure def canSearch(s: Phone, typed: bool): bool = onRecents(s) and P::allows(s.log) and (typed or s.sought)

pure def search(s: Phone, typed: bool): Moved = readLog(false, s.chip, { ...s, sought: typed, rows: 0 })

pure def noMatchingCalls(s: Phone): bool = noCalls(s) and s.sought

pure def sometimesNoMatchingCalls(s: Phone): bool = noMatchingCalls(s) and s.chip == AllCalls
```

### Recent calls are held only while Recents is showing, from a read that was answered, with access

```quint
pure def alwaysRowsOnlyWhileShowing(s: Phone): bool =
  s.rows >= 0 and (s.rows > 0 implies (onRecents(s) and s.recents.status == R::Loaded and P::allows(s.log)))
```

### Recents can be empty, fail, need access, and show missed calls

```quint
pure def sometimesNoCalls(s: Phone): bool = noCalls(s) and s.chip == MissedCalls
pure def sometimesHistoryFailed(s: Phone): bool = historyFailed(s)
pure def sometimesLogNeeded(s: Phone): bool = logNeeded(s) and s.log.asked
pure def sometimesMissedCallsShown(s: Phone): bool = s.rows > 0 and s.chip == MissedCalls
```

## Story: Give Alpha the call log

> As the owner, I want Alpha to ask for the call log once, from a control I
> tap, and afterwards to send me to Settings.

### Alpha asks for call-log access only from the Allow control, and only once

```quint
pure def canAllow(s: Phone): bool = onRecents(s) and P::canAsk(s.log)

pure def allow(s: Phone): Moved = { state: { ...s, log: P::ask(s.log) }, out: List(AskLog) }
```

### After asking, the control opens Android's Settings

```quint
pure def canGoToSettings(s: Phone): bool = onRecents(s) and P::needsSettings(s.log)

pure def goToSettings(s: Phone): Moved = { state: s, out: List(OpenSettings) }
```

### Access that arrives reads the log, and access that goes forgets the rows

```quint
pure def logReported(s: Phone, grant: P::Grant): Moved =
  val log = P::observe(s.log, grant)
  if (not(P::allows(log))) { state: { ...s, log: log, rows: 0 }, out: List() }
  else if (onRecents(s) and not(P::allows(s.log))) readLog(true, s.chip, { ...s, log: log })
  else { state: { ...s, log: log }, out: List() }
```

### Android's prompt is shown only when the owner taps Allow

```quint
pure def stepThePromptNeedsTheControl(before: Phone, via: str, after: Phone, out: List[Effect]): bool =
  out.some(e => match e { | AskLog => true | _ => false }) implies (via == "allow" and not(before.log.asked))
```

## Story: Type a number

> As the owner, I want to type a number, see the contact it belongs to, and
> take a digit back.

### Each digit, or each digit taken back, is judged by the phone and looked up among the contacts on the phone

The phone says whether what is now typed is blank, a partial number, a
number it can dial or an emergency number. The lookup happens on the phone.
The owner can also edit or paste the number directly.

```quint
pure def judged(digits: int, typed: Typed, s: Phone): Moved =
  val lookup = R::ask(s.lookup)
  { state: { ...s, digits: digits, typed: typed, lookup: lookup, matched: false, failedDial: false, unsureDial: false },
    out: List(MatchNumber({ ticket: lookup.ticket })) }

pure def canPress(s: Phone, typed: Typed): bool =
  s.front and s.tab == Keypad and s.digits < maxDigits and typed != Blank

pure def press(s: Phone, typed: Typed): Moved = judged(s.digits + 1, typed, s)

pure def canTakeBack(s: Phone, typed: Typed): bool =
  s.front and s.tab == Keypad and s.digits > 0 and ((s.digits == 1) == (typed == Blank))

pure def takeBack(s: Phone, typed: Typed): Moved = judged(s.digits - 1, typed, s)

pure def canEditNumber(s: Phone, digits: int, typed: Typed): bool =
  s.front and s.tab == Keypad and s.dial.status != R::Loading
    and 0 <= digits and digits <= maxDigits and ((digits == 0) == (typed == Blank))

pure def editNumber(s: Phone, digits: int, typed: Typed): Moved = judged(digits, typed, s)
```

### A number handed to Phone opens the keypad with it filled in, and never dials

Contacts' Call and other keypad handoffs give Phone
a number, also before Phone shows. The phone judges it and looks it up as
if it had been typed.

```quint
pure def canPrefill(s: Phone, digits: int, typed: Typed): bool = 0 < digits and digits <= maxDigits and typed != Blank

pure def prefill(s: Phone, digits: int, typed: Typed): Moved = judged(digits, typed, { ...s, tab: Keypad, rows: 0 })

pure def stepAHandedNumberNeverDials(before: Phone, via: str, after: Phone, out: List[Effect]): bool =
  via == "prefill" implies (not(handoffIn(out)) and after.dialled == before.dialled)

pure def sometimesAHandedNumberWaits(s: Phone): bool = s.tab == Keypad and s.digits > 0 and not(s.front) and s.lookup.status == R::Loading
```

### Only the newest lookup names a contact

```quint
pure def canNumberMatched(s: Phone, ticket: int): bool = R::canAnswer(s.lookup, ticket)

pure def numberMatched(s: Phone, ticket: int, found: bool): Phone =
  { ...s, lookup: R::answer(s.lookup, true), matched: found and s.digits > 0 }
```

### The keypad holds at most forty dial characters, and is blank exactly when it holds none

```quint
pure val maxDigits = 40

pure def alwaysTheKeypadIsWellFormed(s: Phone): bool =
  0 <= s.digits and s.digits <= maxDigits and ((s.digits == 0) == (s.typed == Blank))
```

### A contact is named only for the digits now typed

```quint
pure def alwaysTheMatchIsForTheDigitsTyped(s: Phone): bool =
  s.matched implies (s.digits > 0 and s.lookup.status == R::Loaded)
```

### A typed number can match a contact

```quint
pure def sometimesContactMatched(s: Phone): bool = s.matched and s.typed == Dialable
```

## Story: Call a number

> As the owner, I want Call to open the phone's dialer with the number, once,
> and never to call something that is not a number.

### Call hands the typed number to the dialer, only if the phone says it is a number it can dial

A partial number is never handed over. Without a carrier only an emergency
number is.

```quint
pure def dialable(s: Phone): bool =
  s.typed == Emergency or (s.typed == Dialable and s.carrier)

pure def handOff(source: Source, number: str, s: Phone): Moved =
  val dial = R::ask(s.dial)
  { state: { ...s, dial: dial, dialled: true, failedDial: false, unsureDial: false }, out: List(Handoff({ ticket: dial.ticket, source: source, number: number })) }

pure def canDialTyped(s: Phone): bool = s.front and s.tab == Keypad and not(s.dialled) and dialable(s)

pure def dialTyped(s: Phone): Moved = handOff(TypedNumber, "", s)
```

### Tapping a recent call hands its number to the dialer

The handoff names the number of the call tapped.

```quint
pure def canDialRecent(s: Phone, number: str): bool = s.rows > 0 and s.carrier and not(s.dialled) and number != ""

pure def dialRecent(s: Phone, number: str): Moved = handOff(PickedNumber, number, s)
```

### Tapping a keypad contact hands over the contact's full number

The lookup is for the currently typed digits. The owner can choose the
matched contact without having to type the rest of the number.

```quint
pure def canDialMatched(s: Phone, number: str): bool =
  s.front and s.tab == Keypad and s.matched and s.carrier and not(s.dialled) and number != ""

pure def dialMatched(s: Phone, number: str): Moved = handOff(PickedNumber, number, s)
```

### A voicemail callback hands the caller's number to the phone

The owner's Call back button uses the caller's full number while the
carrier is available and Voicemail is showing.

```quint
pure def canDialVoicemail(s: Phone, number: str): bool =
  s.front and s.tab == Voicemail and s.carrier and not(s.dialled) and number != ""

pure def dialVoicemail(s: Phone, number: str): Moved = handOff(PickedNumber, number, s)
```

### One handoff is made each time Phone is showing

The dialer covers Phone; coming back is a new showing.

```quint
pure def stepOneHandoffPerShowing(before: Phone, via: str, after: Phone, out: List[Effect]): bool =
  handoffIn(out) implies (before.front and not(before.dialled) and after.dialled and out.length() == 1)
```

### Only a number the phone can dial is handed over

```quint
pure def stepOnlyANumberIsHandedOver(before: Phone, via: str, after: Phone, out: List[Effect]): bool =
  handoffIn(out) implies ((via == "dialTyped" and dialable(before)) or (via == "dialRecent" and before.rows > 0 and before.carrier) or (via == "dialMatched" and before.matched and before.carrier) or (via == "dialVoicemail" and before.tab == Voicemail and before.carrier))
```

### The dialer's answer counts only while the same showing lasts

When the dialer did not open, Phone says so.

```quint
pure def canDialAnswered(s: Phone, ticket: int): bool = s.front and s.dialled and R::canAnswer(s.dial, ticket)

pure def dialAnswered(s: Phone, ticket: int, opened: bool): Phone =
  { ...s, dial: R::answer(s.dial, opened), failedDial: not(opened), unsureDial: false }
```

### With the dialer role a call is placed through Telecom, and counts as started only when Telecom accepted it

Without the role or Android's call grant the dial screen opens with the
number instead, and an emergency number only ever opens the dial screen.
When Telecom's answer never comes, Phone says Alpha cannot tell whether
the call started, and the number is not handed over again in this
showing.

```quint
pure def canDialLost(s: Phone): bool = s.front and s.dialled and s.dial.status == R::Loading

pure def dialLost(s: Phone): Phone = { ...s, dial: R::answer(s.dial, false), failedDial: false, unsureDial: true }

pure def alwaysAnUnsureCallIsThisShowings(s: Phone): bool =
  s.unsureDial implies (s.front and s.dialled and not(s.failedDial) and s.dial.status == R::Failed)

pure def sometimesUnsureCall(s: Phone): bool = s.unsureDial
```

### "Couldn't open the dialer" is shown only for this showing's handoff

```quint
pure def alwaysAFailedHandoffIsThisShowings(s: Phone): bool =
  s.failedDial implies (s.front and s.dialled and s.dial.status == R::Failed)
```

### A handoff can fail, and an emergency number can be handed over without a carrier

```quint
pure def sometimesHandoffFailed(s: Phone): bool = s.failedDial
pure def sometimesEmergencyWithoutCarrier(s: Phone): bool = s.dialled and s.typed == Emergency and not(s.carrier)
```

## Story: Know when a call is live

> As the owner, I want Alpha to show a strip while a call is live, to pause
> its voice, and never to act during a call that may be an emergency call.

### The phone says whether a call is live, whether it may be an emergency call, and whether the carrier is ready

A call whose kind the phone cannot rule out as an emergency call may be
one; without phone-state access Alpha does not know whether a call is live.

```quint
pure def telecomReported(s: Phone, telecom: Telecom, carrier: bool): Phone = { ...s, telecom: telecom, carrier: carrier }
```

### A live call shows the strip and pauses Alpha's voice

The strip returns to the phone's call screen. Other areas read this fact.

```quint
pure def liveCall(s: Phone): bool = s.telecom == OrdinaryCall or s.telecom == MaybeEmergencyCall
```

### Alpha acts outside only when the phone has ruled out an emergency call

A call, a send or a contact change waits while a call that may be an
emergency call is live, and while Alpha cannot tell. Other areas read this
fact.

```quint
pure def clear(s: Phone): bool = s.telecom == NoCall or s.telecom == OrdinaryCall

pure def lawNothingActsDuringAPossibleEmergencyCall(telecom: Telecom, carrier: bool): bool =
  clear(telecomReported(initial, telecom, carrier)) implies (telecom != MaybeEmergencyCall and telecom != CallUnknown)
```

### A live call can be one that may be an emergency call

```quint
pure def sometimesMaybeEmergency(s: Phone): bool = liveCall(s) and not(clear(s)) and s.front
```

## Story: See missed calls on Home

> As the owner, I want Home to show a card for calls I missed, until I have
> seen them in Recents.

### The phone reports missed calls not yet seen

```quint
pure def canMissedReported(s: Phone, count: int): bool = count >= 0

pure def missedReported(s: Phone, count: int): Phone = { ...s, missed: count }
```

### Home shows the missed-calls card while there are missed calls not yet seen

One tap on the card opens Recents with the missed calls.

```quint
pure def missedCard(s: Phone): bool = s.missed > 0
```

### One tap on the card opens Recents with the missed calls, and otherwise the Voicemail tab while a voicemail is unheard

`unheard` is Voicemail's count of unheard voicemails.

```quint
pure def canOpenMissed(s: Phone): bool = s.missed > 0

pure def openMissed(s: Phone): Moved =
  val turned = { ...s, tab: Recents, chip: MissedCalls, rows: 0, sought: false }
  if (s.front) readLog(true, MissedCalls, turned) else { state: turned, out: List() }

pure def canOpenVoicemail(s: Phone, unheard: int): bool = s.missed == 0 and unheard > 0 and s.voicemail

pure def openVoicemail(s: Phone, unheard: int): Phone = { ...s, tab: Voicemail, rows: 0 }

pure def sometimesOpenedOnMissed(s: Phone): bool = s.front and s.tab == Recents and s.chip == MissedCalls and s.missed > 0
```

### Missed calls are counted, and are marked seen only by showing Recents

```quint
pure def alwaysMissedIsCounted(s: Phone): bool = s.missed >= 0

pure def stepMissedCallsAreSeenInRecents(before: Phone, via: str, after: Phone, out: List[Effect]): bool =
  after.missed < before.missed implies (via == "missedReported" or (via == "recentsRead" and out.some(e => match e { | MarkSeen => true | _ => false })))
```

### The card can show, and can clear when Recents is read

```quint
pure def sometimesMissedCard(s: Phone): bool = missedCard(s) and not(s.front)
pure def sometimesMissedSeen(s: Phone): bool = onRecents(s) and s.rows > 0 and s.missed == 0 and s.chip == MissedCalls
```
