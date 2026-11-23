# Workflow runs

One open workflow, its run history and the run the owner is looking at, and the one reviewed run
request this phone keeps until the agent's answer is known. The agent admits a run by the exact
version the owner reviewed and a submission id it applies at most once
(`@elizaos/plugin-workflow`, its reviewed admission spec upstream);
this phone saves that submission before it is sent, so a lost answer is recovered by asking again
and never by starting a second run (PRD AP-04, AP-11; legacy `WorkflowExecution`,
`WorkflowExecutionAuditAdmission`).

## Domain

### Runs hold the open workflow, the request kept for it, the run shown and the history read

```quint
import vocabulary as V from "./vocabulary"
type Custody = NoCustody | Saved | Sent | Unknown | NotAdmitted | ConfirmingResend
type Intent = { owner: str, workflowId: str, version: int, submission: str }
type Shown = { runId: str, owner: str, workflowId: str, finished: bool, cancelRequested: bool, status: str, reconciliation: str }
type Entry = { runId: str, occurred: V::Occurred, finished: bool, status: str, at: str }
type Runs = {
  owner: str, workflowId: str, version: int, typed: bool, confirming: bool, reviewed: int,
  intent: Intent, custody: Custody, executions: int, abandoned: bool, recovered: bool, resends: int,
  shown: Shown, previous: Shown, claimed: bool, switchCancels: int, history: List[Entry], selected: str
}
pure val noIntent: Intent = { owner: "", workflowId: "", version: 0, submission: "" }
pure val noRun: Shown = { runId: "", owner: "", workflowId: "", finished: false, cancelRequested: false, status: "", reconciliation: "" }
pure val initial: Runs = {
  owner: "", workflowId: "", version: 0, typed: false, confirming: false, reviewed: 0,
  intent: noIntent, custody: NoCustody, executions: 0, abandoned: false, recovered: false, resends: 0,
  shown: noRun, previous: noRun, claimed: false, switchCancels: 0, history: List(), selected: ""
}
pure def hasEntry(r: Runs, runId: str): bool = r.history.some(e => e.runId == runId)
pure def entryOf(r: Runs, runId: str): Entry = r.history.select(e => e.runId == runId).nthOr(0, { runId: "", occurred: V::Ran, finished: false, status: "", at: "" })
```

### What the simulator tries

```quint
pure val ownerValues = Set("ann", "ben")
pure val workflowIdValues = Set("w1")
pure val versionValues = Set(1, 2)
pure val submissionValues = Set("s1", "s2")
pure val runIdValues = Set("r1", "r2")
pure val statusValues = Set("running", "finished")
pure val reconciliationValues = Set("", "outcome-unknown")
pure val entriesValues = Set(List(), List({ runId: "r1", occurred: V::Missed, finished: true, status: "finished", at: "t1" }), List({ runId: "r2", occurred: V::Ran, finished: false, status: "running", at: "t2" }))
```

## Story: Open a workflow and see its runs

> As the owner, I open a workflow and see its runs in order, a missed occurrence as not run, and the
> exact run a notice named when I tap it.

### Opening a workflow reads its runs afresh, and a run of another owner is never shown

The selected run shows its own output as it is, when the agent gave one; another owner's outputs are
forgotten with their runs.

```quint
pure def canOpenWorkflow(r: Runs, owner: str, workflowId: str, version: int, typed: bool): bool =
  owner != "" and workflowId != "" and version >= 1 and owner == r.owner
pure def openWorkflow(r: Runs, owner: str, workflowId: str, version: int, typed: bool): Runs = {
  val same = r.workflowId == workflowId
  { ...r, workflowId: workflowId, version: version, typed: typed, confirming: false,
    history: if (same) r.history else List(), selected: if (same) r.selected else "", shown: if (same) r.shown else noRun }
}
pure def canHistoryRead(r: Runs, entries: List[Entry]): bool = r.workflowId != "" and entries.every(e => e.runId != "")
pure def historyRead(r: Runs, entries: List[Entry]): Runs = { ...r, history: entries }
pure def alwaysAShownRunIsTheCurrentOwners(r: Runs): bool = r.shown.runId != "" implies (r.shown.owner == r.owner and r.shown.workflowId == r.workflowId)
```

### A newer definition ends a confirmation of the older one

```quint
pure def canDefinitionRead(r: Runs, version: int): bool = r.workflowId != "" and version >= r.version
pure def definitionRead(r: Runs, version: int): Runs = { ...r, version: version, confirming: r.confirming and r.reviewed == version }
pure def alwaysAConfirmationIsOfTheCurrentVersion(r: Runs): bool = r.confirming implies r.reviewed == r.version
```

### A notice opens exactly the run it names

Opening a run from its notice (the clock area's workflow notice, #39954) shows that run of its
workflow at the version the notice names, and selects it in the history; a removed workflow, another
version or another workflow's run opens nothing (upstream `notices.md`, `openWorkflowNotice`).

```quint
pure def canShowRun(r: Runs, runId: str, finished: bool, cancelRequested: bool, status: str, reconciliation: str): bool = r.owner != "" and r.workflowId != "" and runId != ""
pure def showRun(r: Runs, runId: str, finished: bool, cancelRequested: bool, status: str, reconciliation: str): Runs =
  { ...r, shown: { runId: runId, owner: r.owner, workflowId: r.workflowId, finished: finished, cancelRequested: cancelRequested, status: status, reconciliation: reconciliation }, selected: runId }
pure def stepOpeningARunShowsExactlyThatRun(before: Runs, via: str, after: Runs): bool =
  via == "showRun" implies (after.selected == after.shown.runId and after.shown.owner == before.owner)
pure def canSelectRun(r: Runs, runId: str): bool = hasEntry(r, runId)
pure def selectRun(r: Runs, runId: str): Runs = { ...r, selected: runId }
```

### Only an open, unfinished run of the current owner refreshes by itself, first after 2 seconds and then every 5

A read that changed nothing or failed backs off to 5 seconds (#1004).

```quint
pure def autoRefreshes(r: Runs): bool = r.shown.runId != "" and not(r.shown.finished) and r.shown.owner == r.owner
pure def refreshAfter(first: bool, changed: bool, failed: bool): int = if (first or (changed and not(failed))) 2000 else 5000
pure def lawRefreshIsNeverFasterThanTwoSeconds(first: bool, changed: bool, failed: bool): bool = refreshAfter(first, changed, failed) >= 2000
pure def canReceiptRead(r: Runs, runId: str, finished: bool, cancelRequested: bool, status: str, reconciliation: str): bool = runId != "" and r.shown.runId == runId
pure def receiptRead(r: Runs, runId: str, finished: bool, cancelRequested: bool, status: str, reconciliation: str): Runs =
  { ...r, shown: { ...r.shown, finished: r.shown.finished or finished, cancelRequested: r.shown.cancelRequested or cancelRequested, status: status, reconciliation: reconciliation } }
pure def stepAReadNeverUnfinishesARun(before: Runs, via: str, after: Runs): bool =
  (via == "receiptRead" and before.shown.finished) implies after.shown.finished
```

## Story: Run the version I reviewed exactly once

> As the owner, I review a workflow and run it, and I want the run to be of the version I saw, found
> again after a lost answer, and never started twice.

### Run is reviewed first, and the confirmation saves one fresh submission before anything is sent

```quint
pure def canReview(r: Runs): bool = r.workflowId != "" and r.custody == NoCustody
pure def review(r: Runs): Runs = { ...r, confirming: true, reviewed: r.version }
pure def canConfirm(r: Runs, submission: str): bool =
  r.confirming and r.reviewed == r.version and r.custody == NoCustody and submission != "" and submission != r.intent.submission
pure def confirm(r: Runs, submission: str): Runs =
  { ...r, confirming: false, custody: Saved, executions: 0, abandoned: false, recovered: false,
    intent: { owner: r.owner, workflowId: r.workflowId, version: r.reviewed, submission: submission } }
pure def canDispatched(r: Runs): bool = r.custody == Saved
pure def dispatched(r: Runs): Runs = { ...r, custody: Sent }
pure def alwaysAKeptRequestHasASubmission(r: Runs): bool = r.custody != NoCustody implies (r.intent.submission != "" and r.intent.version >= 1)
pure def stepARequestIsOfTheReviewedVersion(before: Runs, via: str, after: Runs): bool =
  via == "confirm" implies (after.intent.version == before.reviewed and after.intent.workflowId == before.workflowId)
```

### The agent's admission shows the run, once, only to the owner who asked

An admission that arrives after the account changed leaves the outcome unknown and shows nothing.

```quint
pure def canAdmitted(r: Runs, runId: str, version: int): bool =
  runId != "" and version == r.intent.version and (r.custody == Sent or r.custody == Unknown)
pure def admitted(r: Runs, runId: str, version: int): Runs =
  if (r.intent.owner == r.owner and r.intent.workflowId == r.workflowId)
    { ...r, custody: NoCustody, executions: 1, intent: noIntent,
      shown: { ...noRun, runId: runId, owner: r.owner, workflowId: r.workflowId, status: "queued" }, selected: runId }
  else { ...r, custody: Unknown, executions: 1 }
pure def alwaysAtMostOneExecution(r: Runs): bool = r.executions <= 1
pure def sometimesRanReviewed(r: Runs): bool = r.shown.runId != "" and r.executions == 1 and r.custody == NoCustody
```

### A version the agent did not admit abandons the request, and a lost answer keeps it

```quint
pure def canVersionRefused(r: Runs): bool = r.custody == Sent and r.executions == 0
pure def versionRefused(r: Runs): Runs = { ...r, custody: NoCustody, intent: noIntent, abandoned: true }
pure def canReplyLost(r: Runs): bool = r.custody == Sent
pure def replyLost(r: Runs): Runs = { ...r, custody: Unknown }
pure def alwaysAnAbandonedRequestNeverRan(r: Runs): bool = r.abandoned implies (r.executions == 0 and r.custody == NoCustody)
```

### An unknown outcome is settled by asking for the same submission, and resent only after review

The agent finds the run it admitted for that submission, even after the workflow was edited. A
submission it never admitted is abandoned once the version moved on, and is otherwise offered to
send again under its own identity after the owner reviews it.

```quint
pure def canReconciled(r: Runs, found: bool, runId: str): bool =
  r.custody == Unknown and r.intent.owner == r.owner and (found implies runId != "") and (not(found) implies (runId == "" and r.executions == 0))
pure def reconciled(r: Runs, found: bool, runId: str): Runs =
  if (found and r.intent.workflowId == r.workflowId)
    { ...r, custody: NoCustody, executions: 1, recovered: true, intent: noIntent,
      shown: { ...noRun, runId: runId, owner: r.owner, workflowId: r.workflowId, status: "queued" }, selected: runId }
  else if (found) { ...r, custody: NoCustody, executions: 1, recovered: true, intent: noIntent }
  else if (r.intent.version != r.version) { ...r, custody: NoCustody, intent: noIntent, abandoned: true }
  else { ...r, custody: NotAdmitted }
pure def canReviewResend(r: Runs): bool = r.custody == NotAdmitted and r.intent.owner == r.owner and r.intent.version == r.version
pure def reviewResend(r: Runs): Runs = { ...r, custody: ConfirmingResend }
pure def canResend(r: Runs): bool = r.custody == ConfirmingResend and r.intent.version == r.version
pure def resend(r: Runs): Runs = { ...r, custody: Sent, resends: r.resends + 1 }
pure def canLeaveResend(r: Runs): bool = r.custody == ConfirmingResend
pure def leaveResend(r: Runs): Runs = { ...r, custody: NotAdmitted }
pure def stepAResendKeepsItsSubmission(before: Runs, via: str, after: Runs): bool = via == "resend" implies after.intent == before.intent
pure def sometimesRecoveredAfterALostReply(r: Runs): bool = r.recovered and r.shown.runId != ""
pure def sometimesResentAfterReview(r: Runs): bool = r.resends >= 1 and r.custody == Sent
```

### A restart or another account leaves a sent request unknown and hides the run

```quint
pure def restarted(r: Runs): Runs =
  { ...r, confirming: false, shown: noRun, custody: if (r.custody == NoCustody or r.custody == NotAdmitted) r.custody else Unknown }
pure def canSwitchOwner(r: Runs, owner: str): bool = owner != "" and owner != r.owner
pure def switchOwner(r: Runs, owner: str): Runs =
  { ...r, owner: owner, confirming: false, shown: noRun, selected: "", history: List(), workflowId: "", version: 0,
    previous: if (r.shown.runId != "" and not(r.shown.finished) and r.owner != "") r.shown else r.previous,
    custody: if (r.custody == NotAdmitted or r.custody == ConfirmingResend) Unknown else r.custody }
pure def sometimesUnknownAfterSwitch(r: Runs): bool = r.custody == Unknown and r.intent.owner != r.owner and r.intent.owner != ""
```

## Story: Stop a run I started

> As the owner, I cancel a run that is still going, and when I switch accounts during a run the
> previous account started, the phone asks once to stop it and the new account never sees it.

### Cancel is asked only for the shown, unfinished run of the current owner

Stop asks once more, naming the run, before the cancel is sent; closing that question sends nothing
(legacy "Cancel run" then "Confirm cancel").

```quint
pure def canRequestCancel(r: Runs): bool = autoRefreshes(r) and not(r.shown.cancelRequested)
pure def requestCancel(r: Runs): Runs = { ...r, shown: { ...r.shown, cancelRequested: true } }
pure def alwaysCancelNeedsAShownRun(r: Runs): bool = r.shown.cancelRequested implies r.shown.runId != ""
```

### The previous account's unfinished run is asked to stop at most once

A best-effort cancel goes with the request that ran it; the new account can neither see nor approve
that run (#1128, #1207).

```quint
pure def canCancelPrevious(r: Runs): bool = r.previous.runId != "" and r.previous.owner != r.owner and not(r.claimed)
pure def cancelPrevious(r: Runs): Runs = { ...r, claimed: true, switchCancels: r.switchCancels + 1, previous: noRun }
pure def alwaysASwitchCancelsAtMostOnce(r: Runs): bool = r.switchCancels <= 1 and (r.switchCancels == 1 implies r.claimed)
pure def alwaysThePreviousRunIsAnotherOwners(r: Runs): bool = r.previous.runId != "" implies r.previous.owner != r.owner
pure def sometimesPreviousCancelled(r: Runs): bool = r.claimed and r.switchCancels == 1
```

## Story: Run a missed occurrence when I choose

> As the owner, I see an occurrence that passed while my phone or agent was off recorded as missed,
> and I can choose to run it now as a new, reviewed run; nothing runs late by itself.

### Run now of a missed typed occurrence returns to a fresh reviewed confirmation, and the missed record stays

```quint
pure def canRunMissedNow(r: Runs, runId: str): bool =
  r.typed and r.custody == NoCustody and entryOf(r, runId).runId == runId and runId != "" and entryOf(r, runId).occurred == V::Missed
pure def runMissedNow(r: Runs, runId: str): Runs = { ...r, confirming: true, reviewed: r.version, selected: runId }
pure def stepRunNowKeepsTheMissedRecord(before: Runs, via: str, after: Runs): bool = via == "runMissedNow" implies after.history == before.history
pure def sometimesMissedRunReviewed(r: Runs): bool = r.confirming and entryOf(r, r.selected).occurred == V::Missed
```
