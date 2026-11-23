# Approved phone actions

What runs on the Alpha image after the owner approved an Alpha telephony proposal (the agent's
`telephony` operation family: `phone_dial`, `phone_call`, `sms_send`, `mms_send`, `sms_compose`,
`sms_reply_selected`, the contact writes and the selected-item reads, and Alpha's own
`phone_keypad`, `contact_show`, `contact_read_selected` and `sms_latest_sender`). The device admits
them only through its native telephony capability (eliza#39942): off the image none is advertised
and each answers unavailable. The agent names a contact by search text and never receives the
address book: the lookup happens on the phone, and the owner sees the exact name and number (or a
contact's fields before and after) in the approval card before anything calls, sends or writes.
Each run reports exactly what it observed and is never retried.

## Domain

### One action runs at a time, from its start through the lookup, the owner's choice and the guard to its result

```quint
import common.* from "./common"
type ActionKind = PlaceCall | DialNumber | ComposeText | SendText | SendPictures | ReplyToSelected | KeypadOpen
  | ContactAdd | ContactChange | ContactRemove | ContactsShow | ReadThread | ReadContact | ReadVoicemail | RemoveVoicemail | LatestSender
type TargetForm = WrittenNumber | ContactLookup | NoTarget
type Candidate = { candidateId: str, title: str, number: str }
type Settled = Applied | NothingFound | OwnerCancelled | Unavailable | NotDone | Unconfirmed | Refused | Busy | Occupied | NoneSelected | Stale | EmergencyHandoff
type Run = Idle
  | Resolving({ runId: str, kind: ActionKind, form: TargetForm })
  | Choosing({ runId: str, kind: ActionKind, candidates: List[Candidate] })
  | Guarding({ runId: str, kind: ActionKind, guardedNumber: str })
  | Dispatching({ runId: str, kind: ActionKind, number: str })
  | Finished({ runId: str, kind: ActionKind, result: Settled })
type Actions = { ongoing: Run, ran: List[str], dispatches: int, refusals: int }
pure val initial: Actions = { ongoing: Idle, ran: List(), dispatches: 0, refusals: 0 }
pure def runIdOf(r: Run): str = match r {
  | Resolving(x) => x.runId | Choosing(x) => x.runId | Guarding(x) => x.runId | Dispatching(x) => x.runId | Finished(x) => x.runId | Idle => ""
}
pure def kindOf(r: Run): ActionKind = match r {
  | Resolving(x) => x.kind | Choosing(x) => x.kind | Guarding(x) => x.kind | Dispatching(x) => x.kind | Finished(x) => x.kind | Idle => ReadThread
}
pure def resultOf(r: Run): Settled = match r { | Finished(x) => x.result | _ => NotDone }
pure def isResolving(r: Run): bool = match r { | Resolving(x) => true | _ => false }
pure def formOf(r: Run): TargetForm = match r { | Resolving(x) => x.form | _ => NoTarget }
pure def isChoosing(r: Run): bool = match r { | Choosing(x) => true | _ => false }
pure def isGuarding(r: Run): bool = match r { | Guarding(x) => true | _ => false }
pure def isDispatching(r: Run): bool = match r { | Dispatching(x) => true | _ => false }
pure def isFinished(r: Run): bool = match r { | Finished(x) => true | _ => false }
pure def inProgress(r: Run): bool = not(r == Idle) and not(isFinished(r))
pure def candidatesOf(r: Run): List[Candidate] = match r { | Choosing(x) => x.candidates | _ => List() }
pure def guardedNumberOf(r: Run): str = match r { | Guarding(x) => x.guardedNumber | _ => "" }
pure def effectKind(kind: ActionKind): bool =
  kind == PlaceCall or kind == DialNumber or kind == SendText or kind == SendPictures or kind == ComposeText
    or kind == ContactAdd or kind == ContactChange or kind == ContactRemove or kind == RemoveVoicemail
pure val runIdValues = Set("op1", "op2")
pure val candidateIdValues = Set("7:4155550100", "8:4155550111")
pure val numberValues = Set("", "4155550100")
pure val candidatesValues = Set(List())
  .union(Set(List({ candidateId: "7:4155550100", title: "Maya Chen", number: "4155550100" })))
  .union(Set(List({ candidateId: "7:4155550100", title: "Maya Chen", number: "4155550100" }, { candidateId: "8:4155550111", title: "Maya Ortiz", number: "4155550111" })))
```

## Story: Call or text only the person I approved

> As the owner, I want an approved call or text to reach exactly the number I saw on the card, and a
> name to reach no one until I pick the exact number, so that a model's mistake never dials someone.

### An action starts once per operation ID, and a number the owner did not write is refused

A call or text to a number runs only for a number written in the owner's own request (#1393,
#1396): a proposal naming a different number, a contact in place of the written number, or a
number taken from the text's body is refused before anything is looked up. A contact change is
judged by every number it saves, adds or removes: when the owner's request writes any number, each
of them must be one the owner wrote, or the change is refused before anything is looked up; a
request that writes no number leaves the numbers to the owner's review (upstream
`spec/agent/deviceActions/telephony.md`, `contactValueVerdict`). The refusal says that the number
is not one the owner wrote. A repeated operation ID never runs again.

```quint
pure def startedRun(runId: str, kind: ActionKind, form: TargetForm, grounded: bool): Run =
  if (form == WrittenNumber and not(grounded)) Finished({ runId: runId, kind: kind, result: Refused })
  else Resolving({ runId: runId, kind: kind, form: form })
pure def canActionStarted(a: Actions, runId: str, by: Actor): bool = by == Device and runId != "" and not(inProgress(a.ongoing)) and not(a.ran.includes(runId))
pure def actionStarted(a: Actions, runId: str, kind: ActionKind, form: TargetForm, grounded: bool, by: Actor): Actions =
  { ...a, ongoing: startedRun(runId, kind, form, grounded), ran: a.ran.append(runId), refusals: a.refusals + (if (form == WrittenNumber and not(grounded)) 1 else 0) }
pure def lawANumberTheOwnerDidNotWriteIsRefused(runId: str, kind: ActionKind, grounded: bool): bool =
  not(grounded) implies startedRun(runId, kind, WrittenNumber, grounded) == Finished({ runId: runId, kind: kind, result: Refused })
pure def alwaysTheRunIsRemembered(a: Actions): bool = a.ongoing == Idle or a.ran.includes(runIdOf(a.ongoing))
pure def sometimesAnUngroundedNumberRefused(a: Actions): bool = resultOf(a.ongoing) == Refused and a.dispatches == 0 and a.refusals > 0
```

### A name is looked up on the phone and the owner picks the exact number, even for one match

Every dialable number of every matching contact is one candidate. No match finishes as not found.
A new contact whose name or any of whose numbers is already in Contacts shows that contact as the
one candidate, "Add anyway"; a change shows each matching contact before and after, with its `set`
fields replaced (or added beside the existing values) and its explicit `add` and `remove` values
applied; a change that would leave a contact exactly as it is is never offered. A removal the
phone stages in its Undo window is the deletion the owner approved, and reads as deleted.

```quint
pure def canCandidatesFound(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.ongoing) == runId and isResolving(a.ongoing) and formOf(a.ongoing) == ContactLookup
pure def candidatesFound(a: Actions, runId: str, candidates: List[Candidate], by: Actor): Actions = {
  val kind = kindOf(a.ongoing)
  if (candidates.length() > 0) { ...a, ongoing: Choosing({ runId: runId, kind: kind, candidates: candidates }) }
  else if (kind == ContactAdd) { ...a, ongoing: Guarding({ runId: runId, kind: kind, guardedNumber: "" }) }
  else { ...a, ongoing: Finished({ runId: runId, kind: kind, result: NothingFound }) }
}
pure def canCandidateChosen(a: Actions, runId: str, candidateId: str, by: Actor): bool =
  ownerOnly(by) and runIdOf(a.ongoing) == runId and candidatesOf(a.ongoing).some(x => x.candidateId == candidateId)
pure def candidateChosen(a: Actions, runId: str, candidateId: str, by: Actor): Actions = {
  val chosen = candidatesOf(a.ongoing).select(x => x.candidateId == candidateId).nthOr(0, { candidateId: candidateId, title: "", number: "" })
  { ...a, ongoing: Guarding({ runId: runId, kind: kindOf(a.ongoing), guardedNumber: chosen.number }) }
}
pure def canNumberReady(a: Actions, runId: str, number: str, by: Actor): bool =
  by == Device and runIdOf(a.ongoing) == runId and isResolving(a.ongoing) and formOf(a.ongoing) != ContactLookup and effectKind(kindOf(a.ongoing))
pure def numberReady(a: Actions, runId: str, number: str, by: Actor): Actions = { ...a, ongoing: Guarding({ runId: runId, kind: kindOf(a.ongoing), guardedNumber: number }) }
pure def stepALookupReachesTheGuardOnlyByTheOwnersChoice(before: Actions, via: str, after: Actions): bool =
  (isResolving(before.ongoing) and formOf(before.ongoing) == ContactLookup and isGuarding(after.ongoing))
    implies (via == "candidatesFound" and kindOf(before.ongoing) == ContactAdd and candidatesOf(after.ongoing).length() == 0)
pure def stepTheChosenNumberIsTheOneShown(before: Actions, via: str, after: Actions): bool =
  via == "candidateChosen" implies candidatesOf(before.ongoing).some(x => x.number == guardedNumberOf(after.ongoing))
pure def sometimesTheOwnerPicksAmongNames(a: Actions): bool = candidatesOf(a.ongoing).length() > 1
```

### The owner's Not now, leaving the app or a changed context ends a run that has not dispatched

Not now, locking, hiding Alpha, or another view replacing the one the review ran under chooses
nothing; nothing is called, sent or changed. A review the owner leaves unanswered for five minutes
also chooses nothing, so a forgotten chooser never acts later and never holds back the next action.

```quint
pure def canReviewDismissed(a: Actions, runId: str, by: Actor): bool =
  by != Alpha and runIdOf(a.ongoing) == runId and (isResolving(a.ongoing) or isChoosing(a.ongoing) or isGuarding(a.ongoing))
pure def reviewDismissed(a: Actions, runId: str, by: Actor): Actions = { ...a, ongoing: Finished({ runId: runId, kind: kindOf(a.ongoing), result: OwnerCancelled }) }
pure def stepADispatchedRunIsNeverCancelled(before: Actions, via: str, after: Actions): bool =
  isDispatching(before.ongoing) implies resultOf(after.ongoing) != OwnerCancelled
pure def sometimesDismissed(a: Actions): bool = resultOf(a.ongoing) == OwnerCancelled
```

## Story: Nothing acts over an emergency call

> As the owner, I want every approved call, text, dial handoff and contact write to read the
> phone's call state right before it runs, and to do nothing while a call may be an emergency call.

### An effect dispatches only after a fresh call-state reading allows it

A refusal is reported in the guard's own words: nothing was done during a call that may be an
emergency call.

```quint
pure def canGuardAnswered(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.ongoing) == runId and isGuarding(a.ongoing)
pure def guardAnswered(a: Actions, runId: str, fresh: bool, reading: CallReading, by: Actor): Actions =
  if (effectAllowed(fresh, reading)) { ...a, ongoing: Dispatching({ runId: runId, kind: kindOf(a.ongoing), number: guardedNumberOf(a.ongoing) }), dispatches: a.dispatches + 1 }
  else { ...a, ongoing: Finished({ runId: runId, kind: kindOf(a.ongoing), result: Refused }), refusals: a.refusals + 1 }
pure def stepAnEffectDispatchesOnlyAfterTheGuard(before: Actions, via: str, after: Actions): bool =
  (isDispatching(after.ongoing) and not(isDispatching(before.ongoing))) implies (via == "guardAnswered" and isGuarding(before.ongoing))
pure def stepNothingDispatchesOverAnEmergencyCall(before: Actions, via: str, after: Actions): bool =
  after.dispatches > before.dispatches implies (via == "guardAnswered" and isDispatching(after.ongoing))
pure def sometimesTheGuardRefused(a: Actions): bool = resultOf(a.ongoing) == Refused and a.refusals > 0 and a.ran.length() > 0
```

## Story: Be told exactly what happened

> As the owner, I want one short receipt for each approved action that says what the phone
> observed, never that a call connected or a text was delivered when it does not know.

### A dispatched effect settles with what the phone answered, and a lost answer is unconfirmed, never nothing

A coded native refusal (no phone-app role, no call grant, no write access, Contacts closed) is the
phone refusing before it acted: unavailable. A lost reply may follow an accepted call, a radio that
took the text, or a committed contact write, so it is unconfirmed, and the run is never retried.

Each receipt is one sentence chosen by the result's own kind and status: a text Android only
accepted reads "Message handed to Android.", one the radio sent "Message sent.", and only a
delivery report reads "Message delivered."; no incoming text reads that there is none; an
emergency-guard refusal and a refused unwritten number each say their own reason. Where the phone
answered nothing, the sentence follows the outcome alone.

```quint
pure def canEffectAnswered(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.ongoing) == runId and isDispatching(a.ongoing)
pure def effectAnswered(a: Actions, runId: str, result: Settled, by: Actor): Actions = { ...a, ongoing: Finished({ runId: runId, kind: kindOf(a.ongoing), result: result }) }
pure def canEffectLost(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.ongoing) == runId and isDispatching(a.ongoing)
pure def effectLost(a: Actions, runId: str, by: Actor): Actions = { ...a, ongoing: Finished({ runId: runId, kind: kindOf(a.ongoing), result: Unconfirmed }) }
pure def stepALostAnswerIsUnconfirmed(before: Actions, via: str, after: Actions): bool = via == "effectLost" implies resultOf(after.ongoing) == Unconfirmed
pure def sometimesUnconfirmed(a: Actions): bool = resultOf(a.ongoing) == Unconfirmed and a.dispatches > 0
pure def sometimesApplied(a: Actions): bool = resultOf(a.ongoing) == Applied and a.dispatches > 0
```

### An unconfirmed text is settled only by the phone's own send record for its operation ID

The agent's device execution reads an unknown outcome back once. A text, sent to a written
number or to the number the owner picked, is looked up in the phone's send history by its exact
operation ID: a record the radio took, sent or delivered reads applied; a cancelled, denied or
failed one reads not sent; no record, or one still unknown, leaves it unconfirmed. A call, a dial
handoff or a contact write is never read back, since nothing on the phone can tell, and stays
unconfirmed. Nothing is sent again to find out.

```quint
type SendRecord = NoRecord | RecordUnknown | RecordTaken | RecordNotSent
type ReadBackAnswer = StaysUnconfirmed | ReadApplied | ReadNotSent
pure def readBackOf(kind: ActionKind, record: SendRecord): ReadBackAnswer =
  if (not(kind == SendText or kind == ComposeText)) StaysUnconfirmed
  else if (record == RecordTaken) ReadApplied
  else if (record == RecordNotSent) ReadNotSent
  else StaysUnconfirmed
pure def lawOnlyATextsOwnRecordSettlesIt(kind: ActionKind, record: SendRecord): bool =
  readBackOf(kind, record) != StaysUnconfirmed implies ((kind == SendText or kind == ComposeText) and (record == RecordTaken or record == RecordNotSent))
pure def lawNoRecordIsNeverNotSent(kind: ActionKind): bool = readBackOf(kind, NoRecord) == StaysUnconfirmed
```

### A read, a keypad, a filtered list or a draft settles without any effect

Reads of the open thread, contact or voicemail share only what is open, whole and within bounds,
or say none is selected. The keypad opens filled in at most; Contacts shows the matches, and Alpha
learns only whether there was one. A text for a conversation that is open goes into its draft
slot instead of being sent (AC-14). A draft request (`sms_compose` with `draft: true`) is never
sent: once its recipient is the number the owner wrote or picked, the text goes into the draft of
the conversation it names (`replyThreadId`), of the open conversation with that one recipient, or
of a new message to that number, and Messages opens on it for the owner to edit and send; an
occupied slot settles as occupied and nothing is sent. A reply to the selected conversation goes to
that exact conversation's full address set (eliza#39920), or says none is selected or that it is
occupied.
The latest sender is read from the newest incoming row's address only, never its body: the last
four digits, or with `sms.latest-sender.v2` the whole dialable number and its conversation, so a
reply draft goes to that sender in that conversation (upstream `spec/os/android/messages.md`,
"Story: Name the sender of my latest text without reading it").

```quint
pure def canSettledWithoutEffect(a: Actions, runId: str, by: Actor): bool =
  by == Device and runIdOf(a.ongoing) == runId and (isResolving(a.ongoing) or (isGuarding(a.ongoing) and (kindOf(a.ongoing) == ComposeText or kindOf(a.ongoing) == SendText)))
pure def settledWithoutEffect(a: Actions, runId: str, result: Settled, by: Actor): Actions = { ...a, ongoing: Finished({ runId: runId, kind: kindOf(a.ongoing), result: result }) }
pure def stepASettlementWithoutEffectNeverDispatches(before: Actions, via: str, after: Actions): bool =
  via == "settledWithoutEffect" implies after.dispatches == before.dispatches
pure def sometimesDraftedInsteadOfSent(a: Actions): bool = kindOf(a.ongoing) == ComposeText and resultOf(a.ongoing) == Applied and a.dispatches == 0
```

### A view change that shows the outcome waits for the reply that carries it

Opening the keypad, a conversation with Alpha's draft, or a filtered Contacts list shows what an
approved or direct action did. It runs at once when no chat request is in flight, and otherwise
only once the request carrying the action's reply has ended, so it never reads as the owner
leaving and never stops that reply (#1433). Nothing is dialed or sent by it.

```quint
type ReplyState = ReplyInFlight | ReplySettled
pure def presentNow(reply: ReplyState, changesView: bool): bool = not(changesView) or reply == ReplySettled
pure def lawAViewChangeNeverCutsTheReplyShort(reply: ReplyState, changesView: bool): bool =
  (presentNow(reply, changesView) and changesView) implies reply == ReplySettled
```
