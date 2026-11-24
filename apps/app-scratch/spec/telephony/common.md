# Telephony: shared terms

The vocabulary Phone, Messages, Contacts, voicemail and the call bar share: where the apps exist
at all, when a provider may be read, who may act, the call-state gate that keeps an emergency call
untouched, the list query the bar types, and what the owner is told after a call request. It has
no state of its own.

## Story: Use Phone, Messages and Contacts only on the Alpha image

> As the owner, I want Phone, Messages and Contacts only on my Alpha AOSP phone, where Alpha is the
> default dialer and SMS app, so that no other build pretends to make calls or send texts.

### The apps exist only on the Alpha image with the telephony plugin registered

The answer comes from the build variant and the native registration (`AlphaTelephony`, which the
image registers only for a verified system install), never from a URL, storage or a setting: the
launcher APK on stock Android, the browser build and a test-mocks development server never offer
them, and a stored state cannot turn them on.

```quint
type BuildVariant = LauncherVariant | AospVariant | BrowserVariant
pure def telephonyOffered(build: BuildVariant, registered: bool): bool = build == AospVariant and registered
pure def lawOnlyTheRegisteredImageOffersTelephony(registered: bool): bool =
  not(telephonyOffered(LauncherVariant, registered)) and not(telephonyOffered(BrowserVariant, registered))
    and (telephonyOffered(AospVariant, registered) iff registered)
```

### A provider is read only while its view is in front on an unlocked phone with the grant

Call log, threads, voicemail and contacts are read for the visit that shows them and dropped when
the view leaves the front, the page hides or the phone locks; a read that answers after that
publishes nothing.

```quint
type Presence = { inFront: bool, unlocked: bool }
pure def providerReadable(p: Presence, granted: bool): bool = p.inFront and p.unlocked and granted
pure def lawNothingIsReadBehindTheLockOrInTheBackground(granted: bool): bool =
  not(providerReadable({ inFront: false, unlocked: true }, granted)) and not(providerReadable({ inFront: true, unlocked: false }, granted))
```

## Story: Alpha drafts and proposes, I send, call and approve

> As the owner, I want Alpha to write drafts and propose calls, and only my own tap to send a
> text, place a call or approve a change, so that nothing leaves my phone that I did not choose.

### Every change names who asked for it: the owner, Alpha or the device

The device is the native side and the renderer answering: a provider read, a send receipt, a
Telecom report. The shell checks who an input came from before it hands it to a machine; Alpha's
input arrives only through the chat.

```quint
type Actor = Owner | Alpha | Device
pure def ownerOnly(who: Actor): bool = who == Owner
pure def lawAlphaIsNeverTheOwner(who: Actor): bool = ownerOnly(who) iff (who != Alpha and who != Device)
```

## Story: Never act during an emergency call

> As the owner, I want Alpha to do nothing that acts while a call that may be an emergency call is
> live, and every call, text or contact write to check the phone's call state right before it
> runs, so that an emergency call is never interrupted or replaced.

### A live call that cannot be ruled out as an emergency call holds the gate

Telecom's reading says whether a call is live and whether it is an emergency call, each possibly
unknown (without phone-state access). The display gate holds while a live call is not known to be
ordinary; with no call or no readable state the shell keeps working, so a lost bridge never freezes
proposals for good.

```quint
type Known = KnownYes | KnownNo | NotKnown
type CallReading = { inCall: Known, emergency: Known }
pure val noReading: CallReading = { inCall: NotKnown, emergency: NotKnown }
pure def emergencyLive(r: CallReading): bool = r.inCall == KnownYes and r.emergency != KnownNo
pure val readingValues = Set(
  { inCall: KnownYes, emergency: KnownYes }, { inCall: KnownYes, emergency: KnownNo }, { inCall: KnownYes, emergency: NotKnown },
  { inCall: KnownNo, emergency: KnownNo }, { inCall: NotKnown, emergency: NotKnown })
pure def lawAnUnknownKindOfLiveCallHoldsTheGate(reading: CallReading): bool =
  (reading.inCall == KnownYes and reading.emergency == NotKnown) implies emergencyLive(reading)
```

### A call, text, dial handoff or contact write runs only on a fresh reading that rules out an emergency call

The side-effect guard fails closed: a reading that did not come back, did not parse, does not know
whether a call is live, or cannot rule out an emergency call refuses, and the action reports that
nothing was done.

```quint
pure def effectAllowed(fresh: bool, r: CallReading): bool = fresh and r.inCall != NotKnown and not(emergencyLive(r))
pure def lawTheEffectGuardFailsClosed(fresh: bool, reading: CallReading): bool =
  (effectAllowed(fresh, reading) implies (fresh and reading.inCall != NotKnown and not(emergencyLive(reading))))
    and not(effectAllowed(false, reading)) and not(effectAllowed(fresh, noReading))
```

## Story: Filter a list from the bar

> As the owner, I want to type in the bar to filter Recents, Messages or Contacts on my phone as I
> type, and let Alpha filter the same list with a chip I can clear (AC-22).

### Typing filters locally; Alpha's filter shows a chip and survives an emptied field

Typing never makes a network request; Enter or a sentence goes to Alpha instead, which answers by
applying a filter of its own. Emptying the field drops the owner's filter and keeps Alpha's until
its chip is cleared.

```quint
type ListQuery = NoQuery | OwnerQuery({ typed: str }) | AlphaQuery({ query: str, label: str })
pure def isAlphaQuery(q: ListQuery): bool = match q { | AlphaQuery(a) => true | _ => false }
pure def queryText(q: ListQuery): str = match q { | OwnerQuery(o) => o.typed | AlphaQuery(a) => a.query | NoQuery => "" }
pure def typedQuery(q: ListQuery, typed: str): ListQuery =
  if (typed == "" and isAlphaQuery(q)) q else if (typed == "") NoQuery else OwnerQuery({ typed: typed })
pure val qValues = Set(NoQuery, OwnerQuery({ typed: "ann" }), AlphaQuery({ query: "ann", label: "Ann" }))
pure val typedValues = Set("", "ann", "415")
pure def lawEmptyingTheFieldKeepsAlphasFilter(q: ListQuery): bool =
  (isAlphaQuery(q) implies typedQuery(q, "") == q) and (not(isAlphaQuery(q)) implies typedQuery(q, "") == NoQuery)
```

### A question for Alpha leaves the bar only once a turn took it

Enter on a sentence, or Send on a request to Alpha, opens the chat on the subject with the question.
The field keeps it until the assistant says a turn took it, and then only where the owner has not
typed something else meanwhile. A question the assistant could not take, or did not answer for in
time, stays where it was typed, so the owner never retypes it (#1268, #1314).

```quint
type AskAnswer = AskTaken | AskNotTaken | AskUnanswered
pure def askLeavesField(answer: AskAnswer, unchanged: bool): bool = answer == AskTaken and unchanged
pure def lawAQuestionAlphaDidNotTakeStays(answer: AskAnswer, unchanged: bool): bool =
  askLeavesField(answer, unchanged) implies (answer == AskTaken and unchanged)
pure def lawAnUntakenQuestionIsNeverCleared(unchanged: bool): bool =
  not(askLeavesField(AskNotTaken, unchanged)) and not(askLeavesField(AskUnanswered, unchanged))
```

## Story: Be told what became of a call I asked for

> As the owner, I want to be told whether Android took my call, opened the dial screen instead, or
> could not, and never that a call connected when the phone does not know.

### A call is reported started only when Telecom accepted it, and a lost answer is never "not called"

The owner's tap asks Telecom to place the call. Without the dialer role or the call grant the
number opens in the system dial screen instead. An emergency number (or one Android cannot class)
is never placed: the dial screen opens with it. A lost answer may follow an accepted call, so it
reads unconfirmed.

```quint
type PlaceAnswer = TelecomPlaced | TelecomEmergency | TelecomBusy | TelecomUnavailable | TelecomFailed | RoleRequired | GrantRequired | PlaceLost
type HandoffAnswer = NoHandoff | HandoffOpened | HandoffMissing | HandoffFailed
type CallOutcome = CallStarted | EmergencyOpened | LineBusy | CallsUnavailable | CallNotStarted | DialerOpened | NoDialer | DialerFailed | CallUnconfirmed
pure def callOutcome(answer: PlaceAnswer, handoff: HandoffAnswer): CallOutcome =
  if (answer == TelecomPlaced) CallStarted
  else if (answer == TelecomEmergency) EmergencyOpened
  else if (answer == TelecomBusy) LineBusy
  else if (answer == TelecomUnavailable) CallsUnavailable
  else if (answer == TelecomFailed) CallNotStarted
  else if (answer == PlaceLost) CallUnconfirmed
  else if (handoff == HandoffOpened) DialerOpened
  else if (handoff == HandoffMissing) NoDialer
  else DialerFailed
pure def lawOnlyTelecomsAcceptanceStartsACall(answer: PlaceAnswer, handoff: HandoffAnswer): bool =
  ((callOutcome(answer, handoff) == CallStarted) iff (answer == TelecomPlaced))
    and (answer == PlaceLost implies callOutcome(answer, handoff) == CallUnconfirmed)
    and (callOutcome(answer, handoff) == DialerOpened implies (answer == RoleRequired or answer == GrantRequired))
```
