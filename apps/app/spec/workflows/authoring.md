# Typed workflow drafts

The owner describes a phone workflow, the agent drafts it from the operations this phone
advertises, and the owner saves exactly the draft reviewed. A save carries a mutation id the agent
applies once, so a lost answer is recovered by asking again and never by saving twice (upstream
`authoring.md`; legacy `WorkflowAuthoring`; PRD AP-04).

## Domain

### A draft holds the spec under edit, the version reviewed, and the one save kept for it

```quint
type Category = Calls | Sms | Payments | Contacts | ArbitraryCode | UnnamedEmail
type Authoring = {
  draft: bool, spec: int, review: int, pending: int, pendingSpec: int, minted: int, applied: List[int], saves: int,
  busy: bool, unreceipted: bool, resendReview: bool, storageFailed: bool, discardAsk: bool, committed: bool,
  agentChanged: bool, compilerChanged: bool
}
pure val initial: Authoring = {
  draft: true, spec: 0, review: -1, pending: 0, pendingSpec: 0, minted: 0, applied: List(), saves: 0,
  busy: false, unreceipted: false, resendReview: false, storageFailed: false, discardAsk: false, committed: false,
  agentChanged: false, compilerChanged: false
}
pure def locked(a: Authoring): bool = a.busy or a.pending != 0 or a.storageFailed
pure def appliedPending(a: Authoring): bool = a.pending != 0 and a.applied.includes(a.pending)
pure def committedDraft(review: int, a: Authoring): Authoring =
  { ...a, committed: true, draft: false, pending: 0, busy: false, review: review, unreceipted: false, resendReview: false }
```

## Story: Describe a workflow and keep only what this phone can do

> As the owner, I describe a workflow in my own words, and I want a request for something phone
> workflows can never do refused before anything reaches my agent.

### A description asking for calls, texts, payments, Contacts, code or email to unnamed people is refused before generation

The refusal names the operations this agent and phone can use instead. When the agent itself asks for
clarification instead of a draft, its question is shown as it asked it, and the description and any
draft stay as they were (legacy `workflow-scope-refusal.spec.ts`).

```quint
pure def scopeRefused(categories: Set[Category]): bool = categories.size() > 0
pure val categoriesValues = Set(Set(), Set(Calls), Set(Payments, ArbitraryCode))
pure def lawAnyRefusedCategoryStopsGeneration(categories: Set[Category]): bool = categories.contains(Sms) implies scopeRefused(categories)
```

### The unsent description is kept for its owner across closing and reopening

Closing the draft sheet keeps what the owner typed; reopening it, or reloading Alpha, shows that
text again for the same owner and never another owner's. A description the phone could not keep
stays on screen with a warning, and saving or discarding the draft forgets it (#465).

```quint
pure def keptTextShown(sameOwner: bool, kept: bool): bool = sameOwner and kept
pure val sameOwnerValues = Set(true, false)
pure val keptValues = Set(true, false)
pure def lawAnotherOwnersTextIsNeverShown(kept: bool): bool = not(keptTextShown(false, kept))
```

## Story: Save exactly the draft I reviewed, once

> As the owner, I review the draft before saving it, and I want the save to be of those exact
> steps, recovered after a lost answer, and never a second copy.

### An edit is possible only while nothing is kept, and a save first shows the current spec for review

```quint
pure def canEdit(a: Authoring): bool = a.draft and not(locked(a)) and a.spec < 2
pure def edit(a: Authoring): Authoring = { ...a, spec: a.spec + 1, discardAsk: false }
pure def canSaveTap(a: Authoring): bool = a.draft and not(locked(a)) and a.minted < 3
pure def saveTap(a: Authoring): Authoring =
  if (a.review != a.spec) { ...a, review: a.spec }
  else { ...a, pending: a.minted + 1, minted: a.minted + 1, pendingSpec: a.spec, busy: true }
pure def alwaysAKeptSaveIsOfTheReviewedSpec(a: Authoring): bool = a.pending != 0 implies (a.spec == a.pendingSpec and a.draft)
```

### The agent's receipt saves the draft; a refusal after the agent changed releases it; a lost answer keeps it

```quint
pure def canAgentApplied(a: Authoring): bool = a.pending != 0 and not(appliedPending(a)) and not(a.agentChanged) and a.saves == 0
pure def agentApplied(a: Authoring): Authoring = { ...a, applied: a.applied.append(a.pending), saves: a.saves + 1 }
pure def canReceiptReply(a: Authoring): bool = a.busy and appliedPending(a)
pure def receiptReply(a: Authoring): Authoring = committedDraft(-1, a)
pure def canRefusalReply(a: Authoring): bool = a.busy and a.pending != 0 and not(appliedPending(a)) and a.agentChanged
pure def refusalReply(a: Authoring): Authoring = { ...a, pending: 0, busy: false, review: -1 }
pure def canUnknownReply(a: Authoring, seen: bool): bool = a.busy
pure def unknownReply(a: Authoring, seen: bool): Authoring = { ...a, busy: false, unreceipted: a.unreceipted and not(seen) }
pure def alwaysOneSavePerDraft(a: Authoring): bool = a.saves <= 1 and a.saves == a.applied.length()
pure def alwaysAnAppliedSaveIsNeverAbandoned(a: Authoring): bool = a.saves > 0 implies (a.committed or appliedPending(a))
pure def alwaysCommittedClearsTheDraft(a: Authoring): bool = a.committed implies (not(a.draft) and a.pending == 0 and a.saves == 1)
pure def sometimesSaved(a: Authoring): bool = a.committed
```

### Recovery asks the agent for the kept save; a missing record is offered to send again after review

A new compiler or agent changes what the same bytes mean, so a kept save is then not resent.

```quint
pure def canRecover(a: Authoring, answered: bool): bool = a.pending != 0 and not(a.busy)
pure def recover(a: Authoring, answered: bool): Authoring =
  if (not(answered)) { ...a, unreceipted: false, resendReview: false }
  else if (appliedPending(a)) committedDraft(-1, a)
  else { ...a, unreceipted: true }
pure def canResendTap(a: Authoring): bool = a.pending != 0 and not(a.busy) and a.unreceipted
pure def resendTap(a: Authoring): Authoring =
  if (a.compilerChanged) { ...a, unreceipted: false, resendReview: false }
  else if (not(a.resendReview)) { ...a, resendReview: true }
  else if (appliedPending(a)) committedDraft(-1, a)
  else { ...a, busy: true, resendReview: false }
pure def alwaysAResendNeedsAMissingRecord(a: Authoring): bool = a.resendReview implies (a.unreceipted and a.pending != 0 and not(a.busy))
pure def alwaysUnreceiptedMeansKept(a: Authoring): bool = a.unreceipted implies a.pending != 0
pure def canAgentChange(a: Authoring): bool = not(a.agentChanged) and a.saves == 0
pure def agentChange(a: Authoring): Authoring = { ...a, agentChanged: true }
pure def canCompilerChange(a: Authoring): bool = not(a.compilerChanged)
pure def compilerChange(a: Authoring): Authoring = { ...a, compilerChanged: true }
pure def sometimesResendOffered(a: Authoring): bool = a.resendReview
```

### Storage that cannot be written locks the draft, and discarding takes two taps

Nothing is stored before the first edit.

```quint
pure def canStorageFails(a: Authoring): bool = a.draft and not(a.storageFailed)
pure def storageFails(a: Authoring): Authoring = { ...a, storageFailed: true }
pure def canStorageRecovers(a: Authoring): bool = a.storageFailed
pure def storageRecovers(a: Authoring): Authoring = { ...a, storageFailed: false }
pure def canDiscardTap(a: Authoring): bool = a.draft and not(a.busy) and a.pending == 0
pure def discardTap(a: Authoring): Authoring = if (a.discardAsk) { ...a, draft: false, discardAsk: false } else { ...a, discardAsk: true }
pure def canRestart(a: Authoring): bool = a.busy or a.unreceipted or a.resendReview or a.discardAsk
pure def restart(a: Authoring): Authoring = { ...a, busy: false, unreceipted: false, resendReview: false, discardAsk: false, review: -1 }
pure def sometimesDiscarded(a: Authoring): bool = not(a.draft) and not(a.committed)
```
