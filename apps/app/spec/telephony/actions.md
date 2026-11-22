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
type Actions = { run: Run, ran: List[str], dispatches: int, refusals: int }
pure val initial: Actions = { run: Idle, ran: List(), dispatches: 0, refusals: 0 }
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
number taken from the text's body is refused before anything is looked up. A repeated operation ID
never runs again.

```quint
pure def startedRun(runId: str, kind: ActionKind, form: TargetForm, grounded: bool): Run =
  if (form == WrittenNumber and not(grounded)) Finished({ runId: runId, kind: kind, result: Refused })
  else Resolving({ runId: runId, kind: kind, form: form })
pure def canActionStarted(a: Actions, runId: str, by: Actor): bool = by == Device and runId != "" and not(inProgress(a.run)) and not(a.ran.includes(runId))
pure def actionStarted(a: Actions, runId: str, kind: ActionKind, form: TargetForm, grounded: bool, by: Actor): Actions =
  { ...a, run: startedRun(runId, kind, form, grounded), ran: a.ran.append(runId), refusals: a.refusals + (if (form == WrittenNumber and not(grounded)) 1 else 0) }
pure def lawANumberTheOwnerDidNotWriteIsRefused(runId: str, kind: ActionKind, grounded: bool): bool =
  not(grounded) implies startedRun(runId, kind, WrittenNumber, grounded) == Finished({ runId: runId, kind: kind, result: Refused })
pure def alwaysTheRunIsRemembered(a: Actions): bool = a.run == Idle or a.ran.includes(runIdOf(a.run))
pure def sometimesAnUngroundedNumberRefused(a: Actions): bool = resultOf(a.run) == Refused and a.dispatches == 0 and a.refusals > 0
```

### A name is looked up on the phone and the owner picks the exact number, even for one match

Every dialable number of every matching contact is one candidate. No match finishes as not found.
A new contact whose name or number is already in Contacts shows that contact as the one candidate,
"Add anyway"; a change shows each matching contact before and after; a change that would leave a
contact exactly as it is is never offered.

```quint
pure def canCandidatesFound(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.run) == runId and isResolving(a.run) and formOf(a.run) == ContactLookup
pure def candidatesFound(a: Actions, runId: str, candidates: List[Candidate], by: Actor): Actions = {
  val kind = kindOf(a.run)
  if (candidates.length() > 0) { ...a, run: Choosing({ runId: runId, kind: kind, candidates: candidates }) }
  else if (kind == ContactAdd) { ...a, run: Guarding({ runId: runId, kind: kind, guardedNumber: "" }) }
  else { ...a, run: Finished({ runId: runId, kind: kind, result: NothingFound }) }
}
pure def canCandidateChosen(a: Actions, runId: str, candidateId: str, by: Actor): bool =
  ownerOnly(by) and runIdOf(a.run) == runId and candidatesOf(a.run).some(x => x.candidateId == candidateId)
pure def candidateChosen(a: Actions, runId: str, candidateId: str, by: Actor): Actions = {
  val chosen = candidatesOf(a.run).select(x => x.candidateId == candidateId).nthOr(0, { candidateId: candidateId, title: "", number: "" })
  { ...a, run: Guarding({ runId: runId, kind: kindOf(a.run), guardedNumber: chosen.number }) }
}
pure def canNumberReady(a: Actions, runId: str, number: str, by: Actor): bool =
  by == Device and runIdOf(a.run) == runId and isResolving(a.run) and formOf(a.run) != ContactLookup and effectKind(kindOf(a.run))
pure def numberReady(a: Actions, runId: str, number: str, by: Actor): Actions = { ...a, run: Guarding({ runId: runId, kind: kindOf(a.run), guardedNumber: number }) }
pure def stepALookupReachesTheGuardOnlyByTheOwnersChoice(before: Actions, via: str, after: Actions): bool =
  (isResolving(before.run) and formOf(before.run) == ContactLookup and isGuarding(after.run))
    implies (via == "candidatesFound" and kindOf(before.run) == ContactAdd and candidatesOf(after.run).length() == 0)
pure def stepTheChosenNumberIsTheOneShown(before: Actions, via: str, after: Actions): bool =
  via == "candidateChosen" implies candidatesOf(before.run).some(x => x.number == guardedNumberOf(after.run))
pure def sometimesTheOwnerPicksAmongNames(a: Actions): bool = candidatesOf(a.run).length() > 1
```

### The owner's Not now, leaving the app or a changed context ends a run that has not dispatched

Not now, locking, hiding Alpha, or another view replacing the one the review ran under chooses
nothing; nothing is called, sent or changed.

```quint
pure def canReviewDismissed(a: Actions, runId: str, by: Actor): bool =
  by != Alpha and runIdOf(a.run) == runId and (isResolving(a.run) or isChoosing(a.run) or isGuarding(a.run))
pure def reviewDismissed(a: Actions, runId: str, by: Actor): Actions = { ...a, run: Finished({ runId: runId, kind: kindOf(a.run), result: OwnerCancelled }) }
pure def stepADispatchedRunIsNeverCancelled(before: Actions, via: str, after: Actions): bool =
  isDispatching(before.run) implies resultOf(after.run) != OwnerCancelled
pure def sometimesDismissed(a: Actions): bool = resultOf(a.run) == OwnerCancelled
```

## Story: Nothing acts over an emergency call

> As the owner, I want every approved call, text, dial handoff and contact write to read the
> phone's call state right before it runs, and to do nothing while a call may be an emergency call.

### An effect dispatches only after a fresh call-state reading allows it

A refusal is reported in the guard's own words: nothing was done during a call that may be an
emergency call.

```quint
pure def canGuardAnswered(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.run) == runId and isGuarding(a.run)
pure def guardAnswered(a: Actions, runId: str, fresh: bool, reading: CallReading, by: Actor): Actions =
  if (effectAllowed(fresh, reading)) { ...a, run: Dispatching({ runId: runId, kind: kindOf(a.run), number: guardedNumberOf(a.run) }), dispatches: a.dispatches + 1 }
  else { ...a, run: Finished({ runId: runId, kind: kindOf(a.run), result: Refused }), refusals: a.refusals + 1 }
pure def stepAnEffectDispatchesOnlyAfterTheGuard(before: Actions, via: str, after: Actions): bool =
  (isDispatching(after.run) and not(isDispatching(before.run))) implies (via == "guardAnswered" and isGuarding(before.run))
pure def stepNothingDispatchesOverAnEmergencyCall(before: Actions, via: str, after: Actions): bool =
  after.dispatches > before.dispatches implies (via == "guardAnswered" and isDispatching(after.run))
pure def sometimesTheGuardRefused(a: Actions): bool = resultOf(a.run) == Refused and a.refusals > 0 and a.ran.length() > 0
```

## Story: Be told exactly what happened

> As the owner, I want one short receipt for each approved action that says what the phone
> observed, never that a call connected or a text was delivered when it does not know.

### A dispatched effect settles with what the phone answered, and a lost answer is unconfirmed, never nothing

A coded native refusal (no phone-app role, no call grant, no write access, Contacts closed) is the
phone refusing before it acted: unavailable. A lost reply may follow an accepted call, a radio that
took the text, or a committed contact write, so it is unconfirmed, and the run is never retried.

```quint
pure def canEffectAnswered(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.run) == runId and isDispatching(a.run)
pure def effectAnswered(a: Actions, runId: str, result: Settled, by: Actor): Actions = { ...a, run: Finished({ runId: runId, kind: kindOf(a.run), result: result }) }
pure def canEffectLost(a: Actions, runId: str, by: Actor): bool = by == Device and runIdOf(a.run) == runId and isDispatching(a.run)
pure def effectLost(a: Actions, runId: str, by: Actor): Actions = { ...a, run: Finished({ runId: runId, kind: kindOf(a.run), result: Unconfirmed }) }
pure def stepALostAnswerIsUnconfirmed(before: Actions, via: str, after: Actions): bool = via == "effectLost" implies resultOf(after.run) == Unconfirmed
pure def sometimesUnconfirmed(a: Actions): bool = resultOf(a.run) == Unconfirmed and a.dispatches > 0
pure def sometimesApplied(a: Actions): bool = resultOf(a.run) == Applied and a.dispatches > 0
```

### A read, a keypad, a filtered list or a draft settles without any effect

Reads of the open thread, contact or voicemail share only what is open, whole and within bounds,
or say none is selected. The keypad opens filled in at most; Contacts shows the matches, and Alpha
learns only whether there was one. A text for a conversation that is open goes into its draft
slot instead of being sent (AC-14); a reply to the selected conversation goes to that exact
conversation's full address set (eliza#39920), or says none is selected or that it is occupied.
The latest sender is read from the newest incoming row's address only, never its body: the last
four digits, or with `sms.latest-sender.v2` the whole dialable number and its conversation, so a
reply draft goes to that sender in that conversation (upstream `spec/os/android/messages.md`,
"Story: Name the sender of my latest text without reading it").

```quint
pure def canSettledWithoutEffect(a: Actions, runId: str, by: Actor): bool =
  by == Device and runIdOf(a.run) == runId and (isResolving(a.run) or (isGuarding(a.run) and (kindOf(a.run) == ComposeText or kindOf(a.run) == SendText)))
pure def settledWithoutEffect(a: Actions, runId: str, result: Settled, by: Actor): Actions = { ...a, run: Finished({ runId: runId, kind: kindOf(a.run), result: result }) }
pure def stepASettlementWithoutEffectNeverDispatches(before: Actions, via: str, after: Actions): bool =
  via == "settledWithoutEffect" implies after.dispatches == before.dispatches
pure def sometimesDraftedInsteadOfSent(a: Actions): bool = kindOf(a.run) == ComposeText and resultOf(a.run) == Applied and a.dispatches == 0
```
