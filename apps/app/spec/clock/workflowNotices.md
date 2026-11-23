# Workflow notices

A notice the phone posted for a workflow run (a step's result, an approval, a hosted result waiting
for the owner's return) leaves a tap the phone keeps until Alpha consumes it (`ElizaNotifications`:
`pendingWorkflowTap`, `consumeWorkflowTap`; `AlphaHostedResults`: `pendingResult`, `consumeResult`,
`releaseResultQuestion`). Alpha opens the exact run the notice names, through the workflows area's
runs, only for the account the notice belongs to. A tap of the notice's Ask action reviews a question
about it instead (#461, #472: a step's notice and an approval notice both offer it); a question is
drafted only after the tap is read again unchanged and consumed at the notice's revision. Asking
never approves, denies or sends anything: an approval stays pending for the owner's own decision.
A tap read while the workflows view was refreshing or resetting is read again when that ends (the
Workflows place counts each refresh or reset); a question already under review is not a read and
stays open, since Add to chat reads its tap again anyway.

## Story: Return to the run a notice names

> As the owner, I want a workflow notice to open exactly the run it is about, once, for my account,
> so that I see the result I was told about and a tap never opens another account's run.

### One check at a time; a read under a view generation that moved on is checked again

```quint
type NoticeTapSource = WorkflowTap | ResultTap
type WorkflowStage = WIdleTap | WReadingTap | WOpeningRun | WConsumingTap | WQuestionTap
type WorkflowReport = NoWorkflowReport | OtherAccount | RunUnavailable | NotKept | QuestionChanged
type WorkflowNotices = { stage: WorkflowStage, source: NoticeTapSource, generation: int, readGeneration: int, recheck: bool,
  token: str, runId: str, question: bool, opens: int, consumes: int, composed: int, releases: int, discards: int, openedToken: str, report: WorkflowReport }
pure val initial: WorkflowNotices = { stage: WIdleTap, source: WorkflowTap, generation: 0, readGeneration: 0, recheck: false,
  token: "", runId: "", question: false, opens: 0, consumes: 0, composed: 0, releases: 0, discards: 0, openedToken: "", report: NoWorkflowReport }
pure def back(again: bool, w: WorkflowNotices): WorkflowNotices = { ...w, stage: WIdleTap, token: "", runId: "", question: false, recheck: again }
pure def canTapAnnounced(w: WorkflowNotices): bool = not(w.recheck)
pure def tapAnnounced(w: WorkflowNotices): WorkflowNotices = { ...w, recheck: true }
pure def canViewMoved(w: WorkflowNotices): bool = true
pure def viewMoved(w: WorkflowNotices): WorkflowNotices = { ...w, generation: w.generation + 1 }
pure def stepAMovedViewKeepsAnOpenQuestion(before: WorkflowNotices, via: str, after: WorkflowNotices): bool =
  (via == "viewMoved" and before.stage == WQuestionTap) implies after.stage == WQuestionTap
pure def canBeginCheck(w: WorkflowNotices, source: NoticeTapSource): bool = w.stage == WIdleTap and w.recheck
pure def beginCheck(w: WorkflowNotices, source: NoticeTapSource): WorkflowNotices =
  { ...w, stage: WReadingTap, source: source, readGeneration: w.generation, recheck: false, report: NoWorkflowReport }
pure val tokenValues = Set("", "w1", "w2")
pure val runIdValues = Set("run-1", "")
```

### A pending tap opens its run only for the signed-in account, and a run opened once is never opened again for the same tap

```quint
pure def canTapResolved(w: WorkflowNotices, token: str, sameAccount: bool, runId: str, question: bool): bool = w.stage == WReadingTap
pure def tapResolved(w: WorkflowNotices, token: str, sameAccount: bool, runId: str, question: bool): WorkflowNotices =
  if (w.readGeneration != w.generation) back(true, w)
  else if (token == "") back(false, w)
  else if (not(sameAccount)) { ...back(false, w), report: OtherAccount }
  else if (question) { ...w, stage: WQuestionTap, token: token, runId: runId, question: true }
  else if (token == w.openedToken) { ...w, stage: WConsumingTap, token: token, runId: runId }
  else if (runId == "") { ...w, stage: WConsumingTap, token: token, report: RunUnavailable }
  else { ...w, stage: WOpeningRun, token: token, runId: runId }
pure def canRunOpened(w: WorkflowNotices, ok: bool): bool = w.stage == WOpeningRun
pure def runOpened(w: WorkflowNotices, ok: bool): WorkflowNotices =
  { ...w, stage: WConsumingTap, opens: w.opens + 1, openedToken: w.token, report: if (ok) NoWorkflowReport else RunUnavailable }
pure def canTapConsumed(w: WorkflowNotices, ok: bool): bool = w.stage == WConsumingTap
pure def tapConsumed(w: WorkflowNotices, ok: bool): WorkflowNotices =
  { ...back(false, w), consumes: w.consumes + 1, composed: if (ok and w.question) w.composed + 1 else w.composed,
    report: if (w.question and not(ok)) NotKept else w.report }
pure def stepARunOpensOncePerTap(before: WorkflowNotices, after: WorkflowNotices): bool =
  after.opens > before.opens implies before.openedToken != before.token
pure def sometimesRunOpened(w: WorkflowNotices): bool = w.opens >= 1 and w.consumes >= 1
pure def sometimesOtherAccount(w: WorkflowNotices): bool = w.report == OtherAccount
pure def sometimesReadAgain(w: WorkflowNotices): bool = w.recheck and w.generation > 0 and w.stage == WIdleTap
```

### A question about a notice is drafted only after its tap is read again unchanged and consumed; Cancel settles it, an interruption keeps it

The question is reviewed in the assistant's question review (see
[notice question](../assistant/noticeQuestion.md)), as Alpha's own notice named by its tap; its Add to
chat is Continue, and closing it unadded is Cancel. Continue reads the pending tap again: the same token, still a question, with the same notice title,
text and revision; anything else reports that the notice changed and drafts nothing. Cancel on a
workflow notice consumes its tap as discarded, so the review never reopens by itself; a hosted
result's question is released. Leaving the review by going Home, to another app or hiding the page
interrupts it and keeps the tap for the next return; so does a newer review replacing it. A tap that
carries no notice text has nothing to review and reports that the notice changed.

```quint
type QuestionEnd = ComposeQuestion | CancelQuestion | InterruptQuestion
pure def canQuestionAnswered(w: WorkflowNotices, ending: QuestionEnd, unchanged: bool): bool = w.stage == WQuestionTap
pure def questionAnswered(w: WorkflowNotices, ending: QuestionEnd, unchanged: bool): WorkflowNotices =
  if (ending == ComposeQuestion and unchanged) { ...w, stage: WConsumingTap }
  else if (ending == ComposeQuestion) { ...back(false, w), report: QuestionChanged }
  else if (ending == CancelQuestion and w.source == WorkflowTap) { ...w, stage: WConsumingTap, question: false, discards: w.discards + 1 }
  else { ...back(false, w), releases: w.releases + 1 }
pure def alwaysADraftNeedsAConsumedTap(w: WorkflowNotices): bool = w.composed <= w.consumes
pure def stepAQuestionNeverOpensItsRun(before: WorkflowNotices, via: str, after: WorkflowNotices): bool =
  via == "questionAnswered" implies after.opens == before.opens
pure def sometimesQuestionDrafted(w: WorkflowNotices): bool = w.composed >= 1
pure def sometimesQuestionDiscarded(w: WorkflowNotices): bool = w.discards >= 1 and w.stage == WIdleTap
pure def sometimesQuestionChanged(w: WorkflowNotices): bool = w.report == QuestionChanged
```
