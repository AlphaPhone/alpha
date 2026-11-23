# Agentic comms

The AP-16 design ("split stage") for Phone, Contacts and Messages: one bottom bar that addresses
the person on screen or Alpha, a stage that lays the app's view out above the conversation sheet
instead of covering it, sheet heights closed, open and full, End never covered, and at most one
proposal at a time that acts only on the owner's tap. The sheet's own fitted heights, drag and
motion are the shell's (AC-07); this spec keeps what the telephony screens decide: who the bar
addresses, which view the stage shows and what it returns to, where End is, what Alpha may propose
and when it briefs. It is stored, so the stage view, the sheet height and an open proposal survive
process death and permission loss without executing anything (AC-30).

## Domain

### The comms state holds the screen's subject, the bar's target, the sheet height, the stage history and the open proposal

`key` names the subject on screen (`messages:thread:<id>`, `phone:recents:`, `contacts:contact:<id>`):
it changes exactly when the subject changes. `ring` names the ringing call, not the caller: the same
caller ringing again is a new ring.

```quint
import common.* from "./common"
type CommsApp = PhoneApp | MessagesApp | ContactsApp
type Subject = ListSubject | ThreadSubject | RecentsSubject | KeypadSubject | CallSubject | ContactSubject
type Target = PersonTarget | AlphaTarget
type Height = SheetClosed | SheetOpen | SheetFull
type StageEntry = { app: CommsApp, subject: Subject, key: str }
type ProposalKind = CallProposal | ScreenProposal | OtherProposal
type Proposal = NoProposal | Proposed({ proposalId: str, kind: ProposalKind, acts: bool, ring: str, live: bool })
type Fate = Replaced | Done | Declined | Retired
type PastProposal = { pastId: str, fate: Fate }
type Comms = {
  app: CommsApp, subject: Subject, key: str, target: Target, height: Height, voice: bool,
  stage: List[StageEntry], callLive: bool, emergency: bool, ring: str,
  proposal: Proposal, past: List[PastProposal], briefed: str, approved: int
}
pure val initial: Comms = {
  app: MessagesApp, subject: ListSubject, key: "messages:list:", target: PersonTarget, height: SheetClosed, voice: false,
  stage: List(), callLive: false, emergency: false, ring: "",
  proposal: NoProposal, past: List(), briefed: "", approved: 0
}
pure def openId(p: Proposal): str = match p { | Proposed(x) => x.proposalId | NoProposal => "" }
pure def openActs(p: Proposal): bool = match p { | Proposed(x) => x.acts | NoProposal => false }
pure def openKind(p: Proposal): ProposalKind = match p { | Proposed(x) => x.kind | NoProposal => OtherProposal }
pure def openRing(p: Proposal): str = match p { | Proposed(x) => x.ring | NoProposal => "" }
pure def openLive(p: Proposal): bool = match p { | Proposed(x) => x.live | NoProposal => false }
pure def hasPerson(subject: Subject): bool = subject == ThreadSubject or subject == ContactSubject or subject == CallSubject
pure def wasProposed(past: List[PastProposal], id: str): bool = past.some(x => x.pastId == id)
pure def retire(p: Proposal, fate: Fate, past: List[PastProposal]): List[PastProposal] =
  if (openId(p) == "") past else past.append({ pastId: openId(p), fate: fate })
pure val keyValues = Set("messages:list:", "messages:thread:thread:1", "phone:call:c1")
pure val proposalIdValues = Set("p1", "p2")
pure val ringValues = Set("", "ring1")
```

## Story: Address the person or Alpha from one bar

> As the owner, I want one bar on every Phone, Contacts and Messages screen that addresses the
> person when the chat is closed and Alpha when it is open, with the other target one tap away.

### The bar addresses Alpha exactly while the chat is open, and the left slot holds the other target

Closed: the left slot is the Alpha button, and the field reads "Text Maya", "Search or ask",
"Call or ask", "Ask during call" or "Ask about Maya". Open: the left slot is the person's avatar (a
thread or a contact) or a call icon (a call), and lists, Recents and the keypad leave it empty, their
search being a header control beside the app's + button. The Alpha field reads "Ask Alpha" with the
account outline; the person field is plain. Holding the Alpha button always starts a voice turn.
No ring or badge is ever on the Alpha button (AC-27).

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
pure def canAlphaOpened(c: Comms, by: Actor): bool = ownerOnly(by) and c.height == SheetClosed
pure def alphaOpened(c: Comms, by: Actor): Comms = { ...c, height: SheetOpen, target: AlphaTarget }
pure def canChatClosed(c: Comms, by: Actor): bool = by != Alpha and c.height != SheetClosed
pure def chatClosed(c: Comms, by: Actor): Comms = { ...c, height: SheetClosed, target: PersonTarget, stage: List(), voice: false }
pure def alwaysTheBarAddressesAlphaExactlyWhileTheChatIsOpen(c: Comms): bool = (c.target == AlphaTarget) iff (c.height != SheetClosed)
pure def alwaysAClosedChatHasNoStageHistory(c: Comms): bool = c.height == SheetClosed implies c.stage.length() == 0
pure def alwaysTheLeftSlotIsNeverTheTargetTheBarAddresses(c: Comms): bool =
  (c.height == SheetClosed implies leftSlot(c) == AlphaButton) and (c.height != SheetClosed implies leftSlot(c) != AlphaButton)
pure def sometimesAlphaAddressedOverAThread(c: Comms): bool = c.target == AlphaTarget and c.subject == ThreadSubject
```

## Story: See what Alpha is acting on

> As the owner, I want the app to move into a stage above the chat when I open Alpha, never covered,
> and Back to return the stage to where it came from before it closes the chat.

### A view change while the chat is open keeps the sheet's height and remembers the view it left

The stage slides sideways and the sheet holds its height and transcript (AC-05). Back first returns
the stage to the view it came from (the "‹ Messages" chip), then closes the chat, then is the app's
own Back (AC-06). Closing the chat keeps the current stage view: a call Alpha started stays on the
call.

```quint
type BackStep = StageReturns | ChatCloses | AppBack
pure def backStep(c: Comms): BackStep = if (c.stage.length() > 0) StageReturns else if (c.height != SheetClosed) ChatCloses else AppBack
pure def subjectShown(c: Comms, app: CommsApp, subject: Subject, key: str, by: Actor): Comms = {
  val moved = c.height != SheetClosed and key != c.key
  { ...c, app: app, subject: subject, key: key,
    stage: if (moved) c.stage.append({ app: c.app, subject: c.subject, key: c.key }) else c.stage,
    height: if (c.emergency and c.height == SheetFull) SheetOpen else c.height }
}
pure def canStageReturned(c: Comms, by: Actor): bool = by != Alpha and c.stage.length() > 0
pure def stageReturned(c: Comms, by: Actor): Comms = {
  val entry = c.stage.nthOr(c.stage.length() - 1, { app: c.app, subject: c.subject, key: c.key })
  { ...c, app: entry.app, subject: entry.subject, key: entry.key, stage: c.stage.removeAt(c.stage.length() - 1) }
}
pure def lawBackReturnsTheStageBeforeClosingTheChat(c: Comms): bool =
  (c.stage.length() > 0 implies backStep(c) == StageReturns) and ((c.stage.length() == 0 and c.height != SheetClosed) implies backStep(c) == ChatCloses)
pure def stepTheSheetHoldsItsHeightWhenTheStageChanges(before: Comms, via: str, after: Comms): bool =
  (via == "subjectShown" or via == "stageReturned") implies (after.height == before.height or (before.emergency and after.height == SheetOpen))
pure def sometimesTheStageCanReturn(c: Comms): bool = c.stage.length() > 0 and c.subject == CallSubject
```

### The sheet is closed, open or full, and full never compacts an emergency call

Full shows the live strip: avatar, name and app, Mute and End during a call, Send when a draft is
waiting; tapping it or dragging down returns to open.

```quint
pure def canHeightChanged(c: Comms, height: Height, by: Actor): bool = by != Alpha and height != SheetClosed and c.height != SheetClosed
pure def heightChanged(c: Comms, height: Height, by: Actor): Comms = { ...c, height: if (c.emergency and height == SheetFull) SheetOpen else height }
pure def voiceChanged(c: Comms, on: bool, by: Actor): Comms = { ...c, voice: on }
pure def alwaysAnEmergencyCallIsNeverCompacted(c: Comms): bool = c.emergency implies c.height != SheetFull
pure def sometimesTheStripShows(c: Comms): bool = c.height == SheetFull and c.callLive
```

## Story: Never lose End

> As the owner, I want End to be reachable at every sheet height, during a drag and during a voice
> turn, always red and right-most, so that I can always hang up (AC-18).

### End is beside the bar when closed, in the call card when open, in the strip when full, and on the voice panel during a voice turn

An emergency call keeps its full-screen card with its own End when the chat is closed, and is
never at full height.

```quint
type EndPlace = EndBesideBar | EndInCard | EndInStrip | EndOnVoicePanel | EndNowhere
pure def endPlace(c: Comms): EndPlace =
  if (not(c.callLive)) EndNowhere
  else if (c.voice) EndOnVoicePanel
  else if (c.height == SheetFull) (if (c.emergency) EndNowhere else EndInStrip)
  else if (c.height == SheetOpen) EndInCard
  else if (c.emergency) EndInCard
  else EndBesideBar
pure def canCallChanged(c: Comms, live: bool, emergencyCall: bool, by: Actor): bool = by == Device
pure def callChanged(c: Comms, live: bool, emergencyCall: bool, by: Actor): Comms = {
  val emergency = live and emergencyCall
  { ...c, callLive: live, emergency: emergency, height: if (emergency and c.height == SheetFull) SheetOpen else c.height }
}
pure def alwaysEndIsReachableDuringACall(c: Comms): bool = c.callLive implies endPlace(c) != EndNowhere
pure def alwaysAnEmergencyIsALiveCall(c: Comms): bool = c.emergency implies c.callLive
pure def sometimesEndOnTheVoicePanel(c: Comms): bool = endPlace(c) == EndOnVoicePanel
```

## Story: Answer, decline or screen a call while I talk to Alpha

> As the owner, I want a call that rings while the chat is open to turn the stage into the incoming
> card with Answer and Decline at its top, and Alpha to offer "Screen it" once for that ring (AC-21).

### A ring shows its card in the stage, and its Screen it proposal retires when the ring ends

Decline restores the previous stage; the typed Alpha request survives. When the ring ends
(answered, declined, screened or missed) its open card can never screen a later call, even from the
same caller.

```quint
pure def canRingStarted(c: Comms, ring: str, by: Actor): bool = by == Device and ring != "" and ring != c.ring
pure def ringStarted(c: Comms, ring: str, by: Actor): Comms = {
  val stale = openKind(c.proposal) == ScreenProposal
  { ...c, ring: ring, proposal: if (stale) NoProposal else c.proposal, past: if (stale) retire(c.proposal, Retired, c.past) else c.past }
}
pure def canRingEnded(c: Comms, by: Actor): bool = by == Device and c.ring != ""
pure def ringEnded(c: Comms, by: Actor): Comms = {
  val stale = openKind(c.proposal) == ScreenProposal and openRing(c.proposal) == c.ring
  { ...c, ring: "", proposal: if (stale) NoProposal else c.proposal, past: if (stale) retire(c.proposal, Retired, c.past) else c.past }
}
pure def alwaysAScreenProposalBelongsToTheRing(c: Comms): bool = openKind(c.proposal) == ScreenProposal implies (c.ring != "" and openRing(c.proposal) == c.ring)
pure def sometimesScreenItOffered(c: Comms): bool = openKind(c.proposal) == ScreenProposal
```

## Story: Approve what Alpha proposes, one thing at a time

> As the owner, I want at most one open proposal with one button, executed only by my tap through
> the approval path, never later on its own, and nothing that acts while an emergency call is live.

### A new proposal replaces the open one, and a replaced or ignored proposal never acts

A proposal opens the chat if it was closed. One that acts is dropped while an emergency call is
live; one that only notes something is kept (Alpha may take notes there, AC-19). A call proposal
names the person and the number (AC-20).

```quint
pure def canProposed(c: Comms, proposalId: str, kind: ProposalKind, acts: bool, ring: str, by: Actor): bool =
  by == Alpha and proposalId != "" and (proposalId != openId(c.proposal) or not(openLive(c.proposal))) and not(wasProposed(c.past, proposalId))
    and (kind == ScreenProposal implies (ring != "" and ring == c.ring)) and (kind != ScreenProposal implies ring == "")
pure def proposed(c: Comms, proposalId: str, kind: ProposalKind, acts: bool, ring: str, by: Actor): Comms =
  if (c.emergency and acts) c
  else { ...c, proposal: Proposed({ proposalId: proposalId, kind: kind, acts: acts, ring: ring, live: true }),
    past: if (proposalId == openId(c.proposal)) c.past else retire(c.proposal, Replaced, c.past),
    height: if (c.height == SheetClosed) SheetOpen else c.height, target: AlphaTarget }
pure def alwaysTheOpenProposalWasNeverRetired(c: Comms): bool = openId(c.proposal) == "" or not(wasProposed(c.past, openId(c.proposal)))
pure def stepNothingActsDuringAnEmergencyCall(before: Comms, via: str, after: Comms): bool =
  (before.emergency and via == "proposed") implies (not(openActs(after.proposal)) or after.proposal == before.proposal)
```

### Only the owner's tap approves the open proposal, and never one that acts over an emergency call

After a call proposal is approved the stage switches to the call with a "‹ Messages" chip and the
sheet keeps its height (AC-20); no dial fires before the tap. An approved proposal is done and can
never be approved again.

```quint
pure def canProposalApproved(c: Comms, proposalId: str, by: Actor): bool =
  ownerOnly(by) and proposalId != "" and proposalId == openId(c.proposal) and openLive(c.proposal) and not(c.emergency and openActs(c.proposal))
    and (openKind(c.proposal) == ScreenProposal implies c.ring != "")
pure def proposalApproved(c: Comms, proposalId: str, by: Actor): Comms =
  { ...c, proposal: NoProposal, past: retire(c.proposal, Done, c.past), approved: c.approved + 1 }
pure def canProposalDeclined(c: Comms, proposalId: str, by: Actor): bool = ownerOnly(by) and proposalId != "" and proposalId == openId(c.proposal)
pure def proposalDeclined(c: Comms, proposalId: str, by: Actor): Comms = { ...c, proposal: NoProposal, past: retire(c.proposal, Declined, c.past) }
pure def stepOnlyTheOwnersTapApproves(before: Comms, via: str, after: Comms): bool = after.approved > before.approved implies via == "proposalApproved"
pure def stepAnApprovalNeverActsOverAnEmergencyCall(before: Comms, via: str, after: Comms): bool =
  (via == "proposalApproved" and before.emergency) implies not(openActs(before.proposal))
pure def stepOnlyALiveProposalIsApproved(before: Comms, via: str, after: Comms): bool = via == "proposalApproved" implies openLive(before.proposal)
pure def sometimesACallApproved(c: Comms): bool = c.approved > 0 and c.past.some(x => x.fate == Done)
pure def sometimesAProposalWaitsOverAnEmergencyCall(c: Comms): bool = c.emergency and openId(c.proposal) != "" and not(openActs(c.proposal))
```

### A proposal restored from the phone's own store is shown, never approved, until Alpha proposes it again

The stage keeps the open proposal across process death (AC-30), and its card's words are kept beside
it in the phone's comms record (`alpha-proposal:v1`: at most one open card, its text at most 4,000
characters), only to redraw it (spec/assistant/approvals.md, "A card restored from the phone's own
store is shown but never executed"). Every proposal the stage holds when it is loaded, at start or
for the account that signs in, is a restored one: it can be dismissed, and only the live or
recovered route proposing the same ID again makes it approvable.

```quint
pure def canRestored(c: Comms, by: Actor): bool = by == Device and openLive(c.proposal)
pure def restored(c: Comms, by: Actor): Comms = {
  val p = c.proposal
  { ...c, proposal: match p { | Proposed(x) => Proposed({ ...x, live: false }) | NoProposal => NoProposal } }
}
pure def stepARestoredProposalKeepsItsPlace(before: Comms, via: str, after: Comms): bool =
  via == "restored" implies (openId(after.proposal) == openId(before.proposal) and not(openLive(after.proposal)) and after.past == before.past)
pure def sometimesARestoredProposalWaits(c: Comms): bool = openId(c.proposal) != "" and not(openLive(c.proposal))
```

## Story: Hear what Alpha knows when I open it

> As the owner, I want Alpha's first line, when the chat opens on a new subject, to be one or two
> sentences of facts from the phone's own sources about the screen, and not repeated when nothing
> changed (AC-25).

### A subject is briefed once, only with the chat open, and never from fixtures in production

The briefing comes from what the view read: missed calls and new voicemail on Phone; Messages and
Contacts give none, since their rows never enter agent context. With nothing known it is absent.

```quint
pure def canBriefingShown(c: Comms, key: str, by: Actor): bool = by == Device and c.height != SheetClosed and key == c.key and key != c.briefed
pure def briefingShown(c: Comms, key: str, by: Actor): Comms = { ...c, briefed: key }
pure def stepABriefingIsNeverRepeated(before: Comms, via: str, after: Comms): bool = via == "briefingShown" implies before.briefed != after.briefed
pure def sometimesBriefed(c: Comms): bool = c.briefed != "" and c.briefed == c.key and c.height != SheetClosed
```
