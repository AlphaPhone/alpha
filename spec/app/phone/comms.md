# Talking with Alpha in Phone, Messages and Contacts

The split stage of [Phone](./), [Messages](../messages/) and
[Contacts](../contacts/): one
bottom bar that addresses the person on screen or Alpha, a stage that lays
the app's view out above the conversation sheet instead of covering it,
sheet heights closed, open and full, and End never covered. The sheet's own fitted
heights, drag and motion are the shell's (AC-07); this spec keeps what the
telephony screens decide: who the bar addresses, which view the stage shows
and what it returns to, where End is, and when it
briefs. It is kept, so the stage view and sheet height
survive a restart and a lost permission (AC-30).

## Story: Address the person or Alpha from one bar

> As the owner, I want one bar on every Phone, Contacts and Messages screen
> that addresses the person when the conversation with Alpha is closed and
> Alpha when it is open, with the other target one tap away.

### The comms state holds the screen's subject, the bar's target, the sheet height and the stage history

`key` names the subject on screen (`messages:thread:<id>`, `phone:recents:`,
`contacts:contact:<id>`): it changes exactly when the subject changes.
`ring` names the ringing call, not the caller: the same caller ringing again
is a new ring. A state an earlier build kept while it also held a proposal,
the proposals past and how many were approved is read without them, with
the screen, the bar's target, the sheet height, the stage and the requests
as they were.

```quint
type Actor = Owner | Agent | Device

type CommsApp = PhoneApp | MessagesApp | ContactsApp
type Subject = ListSubject | ThreadSubject | RecentsSubject | KeypadSubject | CallSubject | ContactSubject
type Target = PersonTarget | AlphaTarget
type Height = SheetClosed | SheetOpen | SheetFull
type StageEntry = { app: CommsApp, subject: Subject, key: str }
type Request = { about: str, request: str }
type Comms = {
  app: CommsApp, subject: Subject, key: str, target: Target, height: Height, voice: bool,
  stage: List[StageEntry], callLive: bool, emergency: bool, ring: str,
  briefed: str, requests: List[Request]
}

pure val initial: Comms = {
  app: MessagesApp, subject: ListSubject, key: "messages:list:", target: PersonTarget, height: SheetClosed, voice: false,
  stage: List(), callLive: false, emergency: false, ring: "",
  briefed: "", requests: List()
}
pure def hasPerson(subject: Subject): bool = subject == ThreadSubject or subject == ContactSubject or subject == CallSubject
pure val keyValues = Set("messages:list:", "messages:thread:thread:1", "phone:call:c1")
pure val ringValues = Set("", "ring1")
```

### The bar addresses Alpha exactly while the conversation is open, and the left slot holds the other target

Closed: the left slot is the Alpha button, and the field reads "Text Maya",
"Search or ask", "Call or ask", "Ask during call" or "Ask about Maya". Open:
the left slot is the person's avatar (a conversation or a contact) or a call
icon (a call), and lists, Recents and the keypad leave it empty. The Alpha
field reads "Ask Alpha"; the person field is plain. Holding the Alpha button
always starts a voice turn. No ring or badge is ever on the Alpha button
(AC-27).

```quint
type LeftSlot = NoSlot | AlphaButton | AvatarSlot | CallSlot
type Field = AskAlpha | TextPerson | SearchOrAsk | CallOrAsk | AskDuringCall | AskAbout

pure def leftSlot(c: Comms): LeftSlot =
  if (c.height == SheetClosed) AlphaButton
  else if (c.subject == ThreadSubject or c.subject == ContactSubject) AvatarSlot
  else if (c.subject == CallSubject) CallSlot
  else NoSlot

pure def barField(c: Comms): Field =
  if (c.height != SheetClosed) AskAlpha
  else if (c.subject == ThreadSubject) TextPerson
  else if (c.subject == CallSubject) AskDuringCall
  else if (c.subject == ContactSubject) AskAbout
  else if (c.subject == RecentsSubject or c.subject == KeypadSubject) CallOrAsk
  else SearchOrAsk

pure def canAlphaOpened(c: Comms, by: Actor): bool = by == Owner and c.height == SheetClosed

pure def alphaOpened(c: Comms, by: Actor): Comms = { ...c, height: SheetOpen, target: AlphaTarget }

pure def canChatClosed(c: Comms, by: Actor): bool = by != Agent and c.height != SheetClosed

pure def chatClosed(c: Comms, by: Actor): Comms = { ...c, height: SheetClosed, target: PersonTarget, stage: List(), voice: false }

pure def alwaysTheBarAddressesAlphaExactlyWhileTheChatIsOpen(c: Comms): bool = (c.target == AlphaTarget) iff (c.height != SheetClosed)

pure def alwaysAClosedChatHasNoStageHistory(c: Comms): bool = c.height == SheetClosed implies c.stage.length() == 0

pure def alwaysTheLeftSlotIsNeverTheTargetTheBarAddresses(c: Comms): bool =
  (c.height == SheetClosed implies leftSlot(c) == AlphaButton) and (c.height != SheetClosed implies leftSlot(c) != AlphaButton)

pure def sometimesAlphaAddressedOverAThread(c: Comms): bool = c.target == AlphaTarget and c.subject == ThreadSubject
```

## Story: See what Alpha is acting on

> As the owner, I want the app to move into a stage above the conversation
> when I open Alpha, never covered, and Back to return the stage to where it
> came from before it closes the conversation.

### A view change while the conversation is open keeps the sheet's height and remembers the view it left

The stage slides sideways and the sheet holds its height and transcript
(AC-05). Moving to another communications app remembers the app and subject
it left. Choosing a tab, recipient or conversation in the same app updates
the subject while preserving the app history. Back from the sheet first
returns to the earlier app (the "‹ Messages" chip), then closes the
conversation, then is the app's own Back (AC-06). Closing the conversation
keeps the current stage view: a call Alpha started stays on the call.

```quint
type BackStep = StageReturns | ChatCloses | AppBack

pure def backStep(c: Comms): BackStep = if (c.stage.length() > 0) StageReturns else if (c.height != SheetClosed) ChatCloses else AppBack

pure def subjectShown(c: Comms, app: CommsApp, subject: Subject, key: str, by: Actor): Comms =
  val shifted = c.height != SheetClosed and app != c.app
  { ...c, app: app, subject: subject, key: key,
    stage: if (shifted) c.stage.append({ app: c.app, subject: c.subject, key: c.key }) else c.stage,
    height: if (c.emergency and c.height == SheetFull) SheetOpen else c.height }

pure def stepSameAppKeepsStageHistory(before: Comms, via: str, after: Comms): bool =
  (via == "subjectShown" and before.app == after.app) implies before.stage == after.stage

pure def canStageReturned(c: Comms, by: Actor): bool = by != Agent and c.stage.length() > 0

pure def stageReturned(c: Comms, by: Actor): Comms =
  val entry = c.stage.nthOr(c.stage.length() - 1, { app: c.app, subject: c.subject, key: c.key })
  { ...c, app: entry.app, subject: entry.subject, key: entry.key, stage: c.stage.removeAt(c.stage.length() - 1) }

pure def lawBackReturnsTheStageBeforeClosingTheChat(c: Comms): bool =
  (c.stage.length() > 0 implies backStep(c) == StageReturns) and ((c.stage.length() == 0 and c.height != SheetClosed) implies backStep(c) == ChatCloses)

pure def stepTheSheetHoldsItsHeightWhenTheStageChanges(before: Comms, via: str, after: Comms): bool =
  (via == "subjectShown" or via == "stageReturned") implies (after.height == before.height or (before.emergency and after.height == SheetOpen))

pure def sometimesTheStageCanReturn(c: Comms): bool = c.stage.length() > 0 and c.subject == CallSubject
```

### Returning through an embedded Contacts tab follows the Phone stage without adding history

Once the shell has returned to Phone from its embedded Contacts tab at the
same Ask Alpha height, the Phone subject replaces Contacts on stage. A
staged Phone entry is consumed if Contacts still owns it.

```quint
pure def canPhoneTabReturned(c: Comms, subject: Subject, key: str, by: Actor): bool =
  by == Device and key != "" and (subject == KeypadSubject or subject == RecentsSubject)

pure def phoneTabReturned(c: Comms, subject: Subject, key: str, by: Actor): Comms =
  val shown = subjectShown(c, PhoneApp, subject, key, by)
  val recentStage = c.stage.nthOr(c.stage.length() - 1, { app: ContactsApp, subject: ListSubject, key: "" })
  { ...shown, stage: if (c.app == ContactsApp and recentStage.app == PhoneApp) c.stage.removeAt(c.stage.length() - 1) else c.stage }

pure def stepPhoneTabReturnDoesNotAddHistory(before: Comms, via: str, after: Comms): bool =
  via == "phoneTabReturned" implies after.stage.length() <= before.stage.length()
```

### The sheet is closed, open or full, and full never compacts an emergency call

Full shows the live strip: avatar, name and app, Mute and End during a call,
Send when a draft is waiting; tapping it or dragging down returns to open.

```quint
pure def canHeightChanged(c: Comms, height: Height, by: Actor): bool = by != Agent and height != SheetClosed and c.height != SheetClosed

pure def heightChanged(c: Comms, height: Height, by: Actor): Comms = { ...c, height: if (c.emergency and height == SheetFull) SheetOpen else height }

pure def voiceChanged(c: Comms, on: bool, by: Actor): Comms = { ...c, voice: on }

pure def alwaysAnEmergencyCallIsNeverCompacted(c: Comms): bool = c.emergency implies c.height != SheetFull

pure def sometimesTheStripShows(c: Comms): bool = c.height == SheetFull and c.callLive
```

## Story: Never lose End

> As the owner, I want End to be reachable at every sheet height, during a
> drag and during a voice turn, always red and right-most, so that I can
> always hang up (AC-18).

### End is above the view when closed, in the call card when open, in the strip when full, and on the voice panel during a voice turn

When closed, Android alone presents a ringing call and its Decline every
time. An emergency call keeps its full-screen card with its own End when
the conversation is closed, and is never at full height.

```quint
type EndPlace = EndAboveView | EndInCard | EndInStrip | EndOnVoicePanel | EndOnAndroid | EndNowhere

pure def endPlace(c: Comms): EndPlace =
  if (not(c.callLive)) EndNowhere
  else if (c.voice) EndOnVoicePanel
  else if (c.height == SheetFull) (if (c.emergency) EndNowhere else EndInStrip)
  else if (c.height == SheetOpen) EndInCard
  else if (c.ring != "") EndOnAndroid
  else if (c.emergency) EndInCard
  else EndAboveView

pure def canCallChanged(c: Comms, live: bool, emergencyCall: bool, by: Actor): bool = by == Device

pure def callChanged(c: Comms, live: bool, emergencyCall: bool, by: Actor): Comms =
  val emergency = live and emergencyCall
  { ...c, callLive: live, emergency: emergency, height: if (emergency and c.height == SheetFull) SheetOpen else c.height }

pure def alwaysEndIsReachableDuringACall(c: Comms): bool = c.callLive implies endPlace(c) != EndNowhere

pure def alwaysAnEmergencyIsALiveCall(c: Comms): bool = c.emergency implies c.callLive

pure def sometimesEndOnTheVoicePanel(c: Comms): bool = endPlace(c) == EndOnVoicePanel
```

## Story: Answer or decline a call while I talk to Alpha

> As the owner, I want a call that rings while the conversation is open to
> turn the stage into the incoming card with Answer and Decline at its top (AC-21).

### A ring shows its card in the stage and clears when the ring ends

Decline restores the previous stage; the typed Alpha request survives.

```quint
pure def canRingStarted(c: Comms, ring: str, by: Actor): bool = by == Device and ring != "" and ring != c.ring

pure def ringStarted(c: Comms, ring: str, by: Actor): Comms = { ...c, ring: ring }

pure def canRingEnded(c: Comms, by: Actor): bool = by == Device and c.ring != ""

pure def ringEnded(c: Comms, by: Actor): Comms = { ...c, ring: "" }

pure def sometimesARingIsShown(c: Comms): bool = c.ring != ""
```

## Story: Hear what Alpha knows when I open it

> As the owner, I want Alpha's first line, when the conversation opens on a
> new subject, to be one or two sentences of facts from the phone's own
> sources about the screen, and not repeated when nothing changed (AC-25).

### A subject is briefed once, only with the conversation open, and never from fixtures

The briefing comes from what the view read: missed calls and new voicemail
on Phone; Messages and Contacts give none, since their rows never enter the
agent's context. It appears as a facts card that Alpha does not sign. With
nothing known it is absent.

```quint
pure def canBriefingShown(c: Comms, key: str, by: Actor): bool = by == Device and c.height != SheetClosed and key == c.key and key != c.briefed

pure def briefingShown(c: Comms, key: str, by: Actor): Comms = { ...c, briefed: key }

pure def stepABriefingIsNeverRepeated(before: Comms, via: str, after: Comms): bool = via == "briefingShown" implies before.briefed != after.briefed

pure def sometimesBriefed(c: Comms): bool = c.briefed != "" and c.briefed == c.key and c.height != SheetClosed
```

## Story: Keep what I was asking Alpha

> As the owner, I want my unsent request to Alpha about a conversation or
> contact kept apart from my text to the person, so that swapping the bar's
> target never clears or merges them (AC-10).

### Each subject keeps one request to Alpha, separate from its draft

`about` is the key of the screen, such as a conversation or a contact.
The text to the person is the [composer](../messages/composer.md)'s draft;
the request is kept here, across a restart. Sending the request to Alpha
clears it, and nothing in it ever reaches the SMS provider.

```quint
pure val aboutValues = Set("messages:thread:1", "contacts:contact:7")
pure val requestValues = Set("", "who is this")

pure def canRequestTyped(c: Comms, about: str, request: str, by: Actor): bool = by == Owner and about != ""

pure def requestTyped(c: Comms, about: str, request: str, by: Actor): Comms =
  { ...c, requests: c.requests.select(r => r.about != about).concat(if (request == "") List() else List({ about: about, request: request })) }

pure def canRequestSent(c: Comms, about: str, by: Actor): bool = by == Owner and c.requests.some(r => r.about == about)

pure def requestSent(c: Comms, about: str, by: Actor): Comms = { ...c, requests: c.requests.select(r => r.about != about) }

pure def alwaysOneRequestPerSubject(c: Comms): bool =
  c.requests.foldl(true, (ok, r) => ok and r.request != "" and c.requests.select(x => x.about == r.about).length() == 1)

pure def sometimesARequestKeptBesideTheStage(c: Comms): bool = c.requests.length() > 0 and c.height == SheetClosed
```

### What was written signed out becomes the account's that signs in, only where that account kept nothing

The stage and the requests are kept under the account signed in. What was
kept while signed out moves to the first account that signs in when that
account has nothing kept, and is then removed from the phone's own place,
so a later account never receives it. An account's own kept state is never
replaced; a damaged record is never moved. Nothing is sent or proposed by
the move.

```quint
type Kept = NothingKept | KeptState | KeptDamaged

pure def adoptsDeviceSlot(device: Kept, account: Kept): bool = device == KeptState and account == NothingKept

pure def lawAnAccountsOwnStateIsNeverReplaced(device: Kept, account: Kept): bool = account != NothingKept implies not(adoptsDeviceSlot(device, account))

pure def lawADamagedRecordIsNeverMoved(account: Kept): bool = not(adoptsDeviceSlot(KeptDamaged, account))
```
