// The resident agent's proof: Dafny is shown which effect each transition returns.

lemma started_ensures(s: Resident, ticket: int, result: Outcome, now: int)
  ensures (inv(s) ==> canStarted(s, ticket) ==> alwaysADownAgentWaitsForSomething(started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> alwaysALaunchIsOwnedOnlyWhileStarting(started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> alwaysAutomaticStartsAreBounded(started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> alwaysTheAgentIsCheckedOnlyWhileUp(started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> alwaysNothingRunsWhileHeld(started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> alwaysErasingStopsTheAgent(started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> alwaysEachPhaseHasItsReason(started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(s, "started", started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepARefusedStartAsksTheOwner(s, "started", started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "started", started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepOnlyAConfirmedStopEndsStopping(s, "started", started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepEveryStartTakesTheNextNumber(s, started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepAStopNamesItsStart(s, started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepOnlyAnAutomaticStartIsCounted(s, "started", started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepLivenessChecksAreTenSecondsApart(s, "started", started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepAnAgentThatLeavesUpIsUnbound(s, started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "started", started(s, ticket, result, now).state))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepEveryReviewIsOpened(s, started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepAHolderIsToldOnlyOnceTheAgentIsDown(s, started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepAChangeEndsWithTheAgentStarted(s, "started", started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepNothingStartsAfterErasing(s, started(s, ticket, result, now).state, started(s, ticket, result, now).out))
  ensures (inv(s) ==> canStarted(s, ticket) ==> stepAnAgentWaitingForReviewStillWaitsAfterReopening(s, "started", started(s, ticket, result, now).state))
{
  if inv(s) && canStarted(s, ticket) {
    var after := started(s, ticket, result, now);
    assert !held(s);
    if result.KeptRecords? {
      assert after.out[0] == Effect.Kept;
      assert Effect.Kept in after.out;
    }
  }
}

lemma retry_ensures(s: Resident, now: int)
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysADownAgentWaitsForSomething(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysALaunchIsOwnedOnlyWhileStarting(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysAutomaticStartsAreBounded(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysTheAgentIsCheckedOnlyWhileUp(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysNothingRunsWhileHeld(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysErasingStopsTheAgent(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysEachPhaseHasItsReason(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(s, "retry", retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepARefusedStartAsksTheOwner(s, "retry", retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "retry", retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepOnlyAConfirmedStopEndsStopping(s, "retry", retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepEveryStartTakesTheNextNumber(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepAStopNamesItsStart(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepOnlyAnAutomaticStartIsCounted(s, "retry", retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepLivenessChecksAreTenSecondsApart(s, "retry", retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepAnAgentThatLeavesUpIsUnbound(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "retry", retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepEveryReviewIsOpened(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepAHolderIsToldOnlyOnceTheAgentIsDown(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepAChangeEndsWithTheAgentStarted(s, "retry", retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepNothingStartsAfterErasing(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepAnAgentWaitingForReviewStillWaitsAfterReopening(s, "retry", retry(s, now).state))
{
  if inv(s) && canRetry(s, now) {
    var after := retry(s, now);
    assert after.out == [Launch(s.launch + 1, false)];
    LaunchTakesTheNextNumber(s, after.state, after.out);
  }
}

lemma cleared_ensures(s: Resident)
  ensures (inv(s) ==> canCleared(s) ==> alwaysADownAgentWaitsForSomething(cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> alwaysALaunchIsOwnedOnlyWhileStarting(cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> alwaysAutomaticStartsAreBounded(cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> alwaysTheAgentIsCheckedOnlyWhileUp(cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> alwaysNothingRunsWhileHeld(cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> alwaysErasingStopsTheAgent(cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> alwaysEachPhaseHasItsReason(cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(s, "cleared", cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepARefusedStartAsksTheOwner(s, "cleared", cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "cleared", cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepOnlyAConfirmedStopEndsStopping(s, "cleared", cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> stepEveryStartTakesTheNextNumber(s, cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepAStopNamesItsStart(s, cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepOnlyAnAutomaticStartIsCounted(s, "cleared", cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> stepLivenessChecksAreTenSecondsApart(s, "cleared", cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> stepAnAgentThatLeavesUpIsUnbound(s, cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "cleared", cleared(s).state))
  ensures (inv(s) ==> canCleared(s) ==> stepEveryReviewIsOpened(s, cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepAHolderIsToldOnlyOnceTheAgentIsDown(s, cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepAChangeEndsWithTheAgentStarted(s, "cleared", cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepNothingStartsAfterErasing(s, cleared(s).state, cleared(s).out))
  ensures (inv(s) ==> canCleared(s) ==> stepAnAgentWaitingForReviewStillWaitsAfterReopening(s, "cleared", cleared(s).state))
{
  if inv(s) && canCleared(s) {
    var after := cleared(s);
    if !held(s) {
      assert after.out == [Launch(s.launch + 1, false)];
      LaunchTakesTheNextNumber(s, after.state, after.out);
    }
  }
}

lemma probed_ensures(s: Resident, ticket: int, alive: bool, kept: bool, now: int)
  ensures (inv(s) ==> canProbed(s, ticket) ==> alwaysADownAgentWaitsForSomething(probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> alwaysALaunchIsOwnedOnlyWhileStarting(probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> alwaysAutomaticStartsAreBounded(probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> alwaysTheAgentIsCheckedOnlyWhileUp(probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> alwaysNothingRunsWhileHeld(probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> alwaysErasingStopsTheAgent(probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> alwaysEachPhaseHasItsReason(probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(s, "probed", probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepARefusedStartAsksTheOwner(s, "probed", probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "probed", probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepOnlyAConfirmedStopEndsStopping(s, "probed", probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepEveryStartTakesTheNextNumber(s, probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepAStopNamesItsStart(s, probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepOnlyAnAutomaticStartIsCounted(s, "probed", probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepLivenessChecksAreTenSecondsApart(s, "probed", probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepAnAgentThatLeavesUpIsUnbound(s, probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "probed", probed(s, ticket, alive, kept, now).state))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepEveryReviewIsOpened(s, probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepAHolderIsToldOnlyOnceTheAgentIsDown(s, probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepAChangeEndsWithTheAgentStarted(s, "probed", probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepNothingStartsAfterErasing(s, probed(s, ticket, alive, kept, now).state, probed(s, ticket, alive, kept, now).out))
  ensures (inv(s) ==> canProbed(s, ticket) ==> stepAnAgentWaitingForReviewStillWaitsAfterReopening(s, "probed", probed(s, ticket, alive, kept, now).state))
{
  if inv(s) && canProbed(s, ticket) {
    var after := probed(s, ticket, alive, kept, now);
    if !alive {
      assert Effect.Unbind in after.out;
      if kept { assert Effect.Kept in after.out; }
    }
  }
}

lemma hold_ensures(s: Resident, by_: Changer)
  ensures (inv(s) ==> canHold(s, by_) ==> alwaysADownAgentWaitsForSomething(hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> alwaysALaunchIsOwnedOnlyWhileStarting(hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> alwaysAutomaticStartsAreBounded(hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> alwaysTheAgentIsCheckedOnlyWhileUp(hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> alwaysNothingRunsWhileHeld(hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> alwaysErasingStopsTheAgent(hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> alwaysEachPhaseHasItsReason(hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(s, "hold", hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepARefusedStartAsksTheOwner(s, "hold", hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "hold", hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepOnlyAConfirmedStopEndsStopping(s, "hold", hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> stepEveryStartTakesTheNextNumber(s, hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepAStopNamesItsStart(s, hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepOnlyAnAutomaticStartIsCounted(s, "hold", hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> stepLivenessChecksAreTenSecondsApart(s, "hold", hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> stepAnAgentThatLeavesUpIsUnbound(s, hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "hold", hold(s, by_).state))
  ensures (inv(s) ==> canHold(s, by_) ==> stepEveryReviewIsOpened(s, hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepAHolderIsToldOnlyOnceTheAgentIsDown(s, hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepAChangeEndsWithTheAgentStarted(s, "hold", hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepNothingStartsAfterErasing(s, hold(s, by_).state, hold(s, by_).out))
  ensures (inv(s) ==> canHold(s, by_) ==> stepAnAgentWaitingForReviewStillWaitsAfterReopening(s, "hold", hold(s, by_).state))
{
  if inv(s) && canHold(s, by_) {
    var after := hold(s, by_);
    if s.phase.Starting? || s.phase.Up? {
      assert after.out[1] == Effect.Unbind;
      assert Effect.Unbind in after.out;
      assert after.out[0].Halt? && after.out[0] in after.out;
    }
  }
}

lemma erase_ensures(s: Resident)
  ensures (inv(s) ==> canErase(s) ==> alwaysADownAgentWaitsForSomething(erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> alwaysALaunchIsOwnedOnlyWhileStarting(erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> alwaysAutomaticStartsAreBounded(erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> alwaysTheAgentIsCheckedOnlyWhileUp(erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> alwaysNothingRunsWhileHeld(erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> alwaysErasingStopsTheAgent(erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> alwaysEachPhaseHasItsReason(erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(s, "erase", erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepARefusedStartAsksTheOwner(s, "erase", erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "erase", erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepOnlyAConfirmedStopEndsStopping(s, "erase", erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> stepEveryStartTakesTheNextNumber(s, erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepAStopNamesItsStart(s, erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepOnlyAnAutomaticStartIsCounted(s, "erase", erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> stepLivenessChecksAreTenSecondsApart(s, "erase", erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> stepAnAgentThatLeavesUpIsUnbound(s, erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "erase", erase(s).state))
  ensures (inv(s) ==> canErase(s) ==> stepEveryReviewIsOpened(s, erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepAHolderIsToldOnlyOnceTheAgentIsDown(s, erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepAChangeEndsWithTheAgentStarted(s, "erase", erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepNothingStartsAfterErasing(s, erase(s).state, erase(s).out))
  ensures (inv(s) ==> canErase(s) ==> stepAnAgentWaitingForReviewStillWaitsAfterReopening(s, "erase", erase(s).state))
{
  if inv(s) && canErase(s) {
    var after := erase(s);
    if s.phase.Starting? || s.phase.Up? {
      assert after.out[1] == Effect.Unbind;
      assert Effect.Unbind in after.out;
      assert after.out[0].Halt? && after.out[0] in after.out;
    }
  }
}

lemma reopened_ensures(s: Resident, rebooted: bool)
  ensures (inv(s) ==> alwaysADownAgentWaitsForSomething(reopened(s, rebooted).state))
  ensures (inv(s) ==> alwaysALaunchIsOwnedOnlyWhileStarting(reopened(s, rebooted).state))
  ensures (inv(s) ==> alwaysAutomaticStartsAreBounded(reopened(s, rebooted).state))
  ensures (inv(s) ==> alwaysTheAgentIsCheckedOnlyWhileUp(reopened(s, rebooted).state))
  ensures (inv(s) ==> alwaysNothingRunsWhileHeld(reopened(s, rebooted).state))
  ensures (inv(s) ==> alwaysErasingStopsTheAgent(reopened(s, rebooted).state))
  ensures (inv(s) ==> alwaysEachPhaseHasItsReason(reopened(s, rebooted).state))
  ensures (inv(s) ==> stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(s, "reopened", reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepARefusedStartAsksTheOwner(s, "reopened", reopened(s, rebooted).state))
  ensures (inv(s) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "reopened", reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepOnlyAConfirmedStopEndsStopping(s, "reopened", reopened(s, rebooted).state))
  ensures (inv(s) ==> stepEveryStartTakesTheNextNumber(s, reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepAStopNamesItsStart(s, reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepOnlyAnAutomaticStartIsCounted(s, "reopened", reopened(s, rebooted).state))
  ensures (inv(s) ==> stepLivenessChecksAreTenSecondsApart(s, "reopened", reopened(s, rebooted).state))
  ensures (inv(s) ==> stepAnAgentThatLeavesUpIsUnbound(s, reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "reopened", reopened(s, rebooted).state))
  ensures (inv(s) ==> stepEveryReviewIsOpened(s, reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepAHolderIsToldOnlyOnceTheAgentIsDown(s, reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepAChangeEndsWithTheAgentStarted(s, "reopened", reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepNothingStartsAfterErasing(s, reopened(s, rebooted).state, reopened(s, rebooted).out))
  ensures (inv(s) ==> stepAnAgentWaitingForReviewStillWaitsAfterReopening(s, "reopened", reopened(s, rebooted).state))
{
  var after := reopened(s, rebooted);
  assert after.out[|after.out| - 1] == Effect.Unbind;
  assert Effect.Unbind in after.out;
}

lemma LaunchTakesTheNextNumber(s: Resident, after: Resident, out: seq<Effect>)
  requires out == [Launch(s.launch + 1, false)] && after.launch == s.launch + 1 && after.phase.Starting? && !held(after)
  ensures stepEveryStartTakesTheNextNumber(s, after, out)
{
  assert out[0] in out;
}
