# Notice question

Asking the assistant about one of Alpha Phone's own notifications from the
shade ("Help me with this notification."). Only a reminder, calendar or
navigation notice that the owner can read is askable; a hosted result, a
digest, a workflow step or focus notice (a workflow approval notice has its
own reviewed question, below), and a redacted one ("Unlock to view",
"Content hidden") fall back to opening the notice. The owner edits the
question in a review; submitting rechecks that exactly that notice is still
listed with the same revision, that the owner and screen are unchanged and
that the composer may take it, then consumes the retained result once and
composes the question into the assistant as a draft. Leaving Home or the
app interrupts it. Nothing is sent: the owner sends from the composer.

## Story: Ask Alpha about a notification

> As the owner, I want to turn a notification into a question for my
> assistant, see exactly what will be shared, and have it composed once
> into my chat for me to send, so that I never share a stale or private
> notice by accident.

### A notice is composed once, after a recheck of the exact notice, and only while the owner and screen are current

```quint
type AskPhase = AskIdle | AskReview | AskRecheck | AskConsume | AskDone | AskFallback
type AskKind = ValidNotice | SummaryNotice | OrdinaryNotice | PrivateNotice
type AskEdit = ValidEdit | EmptyEdit | PrivateEdit
type AskReply = ExactNotice | TokenChanged | BodyChanged | NotOwnNotice | MissingNotice
type AskValidation = NoValidation | StaleValidation | PrivateValidation
type Asking = {
  owner: bool, sensitive: bool, composer: bool, phase: AskPhase, dialog: bool, proceed: bool, validation: AskValidation,
  interrupted: bool, closes: int, discards: int, rechecks: int, consumeCalls: int, consumed: int, composed: int,
  reports: int, fallback: int, resolving: bool, resolveCalls: int, resolveFailures: int,
}
pure val initial: Asking = {
  owner: true, sensitive: false, composer: true, phase: AskIdle, dialog: false, proceed: false, validation: NoValidation,
  interrupted: false, closes: 0, discards: 0, rechecks: 0, consumeCalls: 0, consumed: 0, composed: 0,
  reports: 0, fallback: 0, resolving: false, resolveCalls: 0, resolveFailures: 0,
}
pure def ownerCurrent(a: Asking): bool = a.owner and not(a.sensitive)
pure def ended(a: Asking): Asking = { ...a, phase: AskDone, closes: 1 }
pure def canOpenNotice(a: Asking, kind: AskKind): bool = a.phase == AskIdle
pure def openNotice(a: Asking, kind: AskKind): Asking =
  if (kind == ValidNotice and ownerCurrent(a)) { ...a, phase: AskReview, dialog: true, proceed: true } else { ...a, phase: AskFallback, fallback: 1 }
pure def ownerChanges(a: Asking, value: bool): Asking = { ...a, owner: value }
pure def sensitivityChanges(a: Asking, value: bool): Asking = { ...a, sensitive: value }
pure def composerChanges(a: Asking, value: bool): Asking = { ...a, composer: value }
pure def canSubmit(a: Asking, edit: AskEdit): bool = a.phase == AskReview
pure def submit(a: Asking, edit: AskEdit): Asking =
  if (edit == EmptyEdit) { ...a, proceed: false }
  else if (not(ownerCurrent(a))) { ...a, proceed: false, validation: StaleValidation }
  else if (edit == PrivateEdit) { ...a, proceed: true, validation: PrivateValidation }
  else { ...a, phase: AskRecheck, dialog: false, proceed: false, validation: NoValidation, rechecks: 1 }
pure def canDismiss(a: Asking, explicit: bool): bool = a.phase == AskReview
pure def dismiss(a: Asking, explicit: bool): Asking =
  ended({ ...a, dialog: false, proceed: false, validation: NoValidation, interrupted: true, discards: if (explicit) 1 else 0 })
pure def canInterrupt(a: Asking): bool = a.phase == AskRecheck or a.phase == AskConsume
pure def interrupt(a: Asking): Asking = { ...a, interrupted: true, closes: 1 }
pure def canRecheck(a: Asking, reply: AskReply): bool = a.phase == AskRecheck
pure def recheck(a: Asking, reply: AskReply): Asking =
  if (ownerCurrent(a) and not(a.interrupted) and a.composer and reply == ExactNotice) { ...a, phase: AskConsume, consumeCalls: 1 }
  else ended({ ...a, reports: a.reports + 1 })
pure def canSettleConsume(a: Asking, ok: bool): bool = a.phase == AskConsume
pure def settleConsume(a: Asking, ok: bool): Asking = {
  val publish = ok and ownerCurrent(a) and not(a.interrupted)
  ended({ ...a, consumed: if (ok) 1 else 0, composed: if (publish) 1 else 0, reports: if (publish) a.reports else a.reports + 1 })
}
pure def resolveTap(a: Asking): Asking = if (a.resolving) a else { ...a, resolving: true, resolveCalls: a.resolveCalls + 1 }
pure def canFinishResolve(a: Asking, ok: bool): bool = a.resolving
pure def finishResolve(a: Asking, ok: bool): Asking = { ...a, resolving: false, resolveFailures: a.resolveFailures + (if (ok) 0 else 1) }
pure def alwaysTheDialogIsTheReview(a: Asking): bool = a.dialog == (a.phase == AskReview) and (a.proceed implies a.dialog)
pure def alwaysComposedOnceAfterConsuming(a: Asking): bool = a.composed <= a.consumed and a.consumed <= a.consumeCalls
pure def alwaysDiscardedOrConsumedNotBoth(a: Asking): bool = a.discards + a.consumeCalls <= 1 and a.consumeCalls <= a.rechecks
pure def alwaysResolveFailuresFollowTaps(a: Asking): bool = a.resolveFailures <= a.resolveCalls
pure def sometimesComposed(a: Asking): bool = a.composed == 1
pure def sometimesFellBack(a: Asking): bool = a.fallback == 1
```

## Story: Ask Alpha about a workflow approval notice

> As the owner, I want Ask Alpha on a workflow approval notice to open the
> same reviewed question about that step, so that I can understand what I
> am approving before I decide, without asking ever deciding it.

### A workflow approval notice is asked about through a reviewed excerpt, rechecked and consumed at Add to chat, and asking never decides the step

Clock resolves the exact run under the current agent and hands the step's
excerpt to the assistant's question review; Add to chat rereads the notice
and composes the draft only when exactly that notice is still listed with
the revision the owner saw, and consumes it once. Cancelling leaves the
approval waiting; an expired, withdrawn or other owner's notice supplies no
context (#472, #461).

```quint
pure def workflowAskComposes(listed: bool, sameRevision: bool, consumed: bool): bool = listed and sameRevision and consumed
pure def decidesStep(asked: bool, approvedOnCard: bool): bool = approvedOnCard
pure def lawAChangedNoticeComposesNothing(consumed: bool): bool = not(workflowAskComposes(true, false, consumed))
pure def lawAskingNeverDecides(asked: bool): bool = not(decidesStep(asked, false))
```
