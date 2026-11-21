lemma proceed_ensures(s: Access, by_: app__startup__actor_Actor, now: int)
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysThePlaceIsWithinTheCount(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysAStepStillReadStalls(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysNothingShowsBeforeAlphaKnowsWhereItRuns(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysWhatIsSavedWasChosen(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysAPromptWaitsOnItsSave(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysNothingWaitsForAnOwnerNotSetUp(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysAReviewIsOfAnOfferedAccess(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysAllSetOnlyAfterTheLastStep(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> alwaysALateAllSetSaysWhy(proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepComingBackReadsEveryAccessAgain(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepTheWalkthroughNeverGoesBack(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepOnlyTheOwnerOrAPregrantMovesTheWalkthrough(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepARestartKeepsProgress(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepAnAnswerChangesOnlyItsAccess(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepAPromptOnlyAfterItsAskingIsSaved(s, "proceed", proceed(s, by_, now).state, proceed(s, by_, now).out))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepEachRequestAwaitsItsOwnAnswer(s, proceed(s, by_, now).state, proceed(s, by_, now).out))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepEveryStepPassedIsSaved(s, proceed(s, by_, now).state, proceed(s, by_, now).out))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepANoticeHasACause(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepAReviewLeavesTheWalkthroughAlone(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepAllSetOnlyForANewAccountOrALateError(s, "proceed", proceed(s, by_, now).state))
  ensures (inv(s) ==> canProceed(s, by_) ==> stepHomeOnlyAtTheEnd(s, "proceed", proceed(s, by_, now).state, proceed(s, by_, now).out))
{
  if inv(s) && canProceed(s, by_) {
    if flow(s, nextKey(s)).Ready? {
      var choice := if (nextKey(s) in s.acted) then Choice.Allowed else Choice.Continued;
      AdvancedSaves(choice, true, s, now);
      assert proceed(s, by_, now) == advanced(choice, true, s, now);
    } else {
      assert proceed(s, by_, now).state.choices == s.choices;
    }
  }
}

lemma skip_ensures(s: Access, by_: app__startup__actor_Actor, now: int)
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysThePlaceIsWithinTheCount(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysAStepStillReadStalls(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysNothingShowsBeforeAlphaKnowsWhereItRuns(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysWhatIsSavedWasChosen(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysAPromptWaitsOnItsSave(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysNothingWaitsForAnOwnerNotSetUp(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysAReviewIsOfAnOfferedAccess(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysAllSetOnlyAfterTheLastStep(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> alwaysALateAllSetSaysWhy(skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepComingBackReadsEveryAccessAgain(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepTheWalkthroughNeverGoesBack(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepOnlyTheOwnerOrAPregrantMovesTheWalkthrough(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepARestartKeepsProgress(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepAnAnswerChangesOnlyItsAccess(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepAPromptOnlyAfterItsAskingIsSaved(s, "skip", skip(s, by_, now).state, skip(s, by_, now).out))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepEachRequestAwaitsItsOwnAnswer(s, skip(s, by_, now).state, skip(s, by_, now).out))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepEveryStepPassedIsSaved(s, skip(s, by_, now).state, skip(s, by_, now).out))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepANoticeHasACause(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepAReviewLeavesTheWalkthroughAlone(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepAllSetOnlyForANewAccountOrALateError(s, "skip", skip(s, by_, now).state))
  ensures (inv(s) ==> canSkip(s, by_) ==> stepHomeOnlyAtTheEnd(s, "skip", skip(s, by_, now).state, skip(s, by_, now).out))
{
  if inv(s) && canSkip(s, by_) {
    AdvancedSaves(Choice.Skipped, true, s, now);
  }
}

lemma act_ensures(s: Access, by_: app__startup__actor_Actor, now: int)
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysThePlaceIsWithinTheCount(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysAStepStillReadStalls(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysNothingShowsBeforeAlphaKnowsWhereItRuns(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysWhatIsSavedWasChosen(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysAPromptWaitsOnItsSave(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysNothingWaitsForAnOwnerNotSetUp(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysAReviewIsOfAnOfferedAccess(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysAllSetOnlyAfterTheLastStep(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> alwaysALateAllSetSaysWhy(act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepComingBackReadsEveryAccessAgain(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepTheWalkthroughNeverGoesBack(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepOnlyTheOwnerOrAPregrantMovesTheWalkthrough(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepARestartKeepsProgress(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepAnAnswerChangesOnlyItsAccess(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepAPromptOnlyAfterItsAskingIsSaved(s, "act", act(s, by_, now).state, act(s, by_, now).out))
  ensures (inv(s) ==> canAct(s, by_) ==> stepEachRequestAwaitsItsOwnAnswer(s, act(s, by_, now).state, act(s, by_, now).out))
  ensures (inv(s) ==> canAct(s, by_) ==> stepEveryStepPassedIsSaved(s, act(s, by_, now).state, act(s, by_, now).out))
  ensures (inv(s) ==> canAct(s, by_) ==> stepANoticeHasACause(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepAReviewLeavesTheWalkthroughAlone(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepAllSetOnlyForANewAccountOrALateError(s, "act", act(s, by_, now).state))
  ensures (inv(s) ==> canAct(s, by_) ==> stepHomeOnlyAtTheEnd(s, "act", act(s, by_, now).state, act(s, by_, now).out))
{
  if inv(s) && canAct(s, by_) {
    var key := shownKey(s);
    var after := act(s, by_, now).state;
    ProofLib.FilterMember((set_x: app__startup__steps_Key) => !((set_x in s.acted)), [key], key);
    assert key in after.acted;
    if s.look.AtOne? {
      assert offered(s, key);
    } else {
      NextIsUnpassed(s);
    }
  }
}

lemma answered_ensures(s: Access, key: app__startup__steps_Key, ticket: int, grant: kit__permission_Grant, requestable: bool, on: bool)
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysThePlaceIsWithinTheCount(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysAStepStillReadStalls(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysNothingShowsBeforeAlphaKnowsWhereItRuns(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysWhatIsSavedWasChosen(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysAPromptWaitsOnItsSave(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysNothingWaitsForAnOwnerNotSetUp(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysAReviewIsOfAnOfferedAccess(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysAllSetOnlyAfterTheLastStep(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> alwaysALateAllSetSaysWhy(answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepComingBackReadsEveryAccessAgain(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepTheWalkthroughNeverGoesBack(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepOnlyTheOwnerOrAPregrantMovesTheWalkthrough(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepARestartKeepsProgress(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepAnAnswerChangesOnlyItsAccess(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepAPromptOnlyAfterItsAskingIsSaved(s, "answered", answered(s, key, ticket, grant, requestable, on), []))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepEachRequestAwaitsItsOwnAnswer(s, answered(s, key, ticket, grant, requestable, on), []))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepEveryStepPassedIsSaved(s, answered(s, key, ticket, grant, requestable, on), []))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepANoticeHasACause(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepAReviewLeavesTheWalkthroughAlone(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepAllSetOnlyForANewAccountOrALateError(s, "answered", answered(s, key, ticket, grant, requestable, on)))
  ensures (inv(s) ==> canAnswered(s, key, ticket) ==> stepHomeOnlyAtTheEnd(s, "answered", answered(s, key, ticket, grant, requestable, on), []))
{
  if inv(s) && canAnswered(s, key, ticket) {
    var after := answered(s, key, ticket, grant, requestable, on);
    forall k | k != key
      ensures !changed(s, after, k)
    {
      PositionInjective(k, key);
      ProofLib.FilterMember((set_x: app__startup__steps_Key) => !((set_x in s.known)), [key], k);
      FlagMember(s.promptless, key, !(requestable), k);
      FlagMember(s.off, key, !(on), k);
    }
  }
}

lemma failed_ensures(s: Access, key: app__startup__steps_Key, ticket: int)
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysThePlaceIsWithinTheCount(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysAStepStillReadStalls(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysNothingShowsBeforeAlphaKnowsWhereItRuns(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysWhatIsSavedWasChosen(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysAPromptWaitsOnItsSave(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysNothingWaitsForAnOwnerNotSetUp(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysAReviewIsOfAnOfferedAccess(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysAllSetOnlyAfterTheLastStep(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> alwaysALateAllSetSaysWhy(failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepComingBackReadsEveryAccessAgain(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepTheWalkthroughNeverGoesBack(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepOnlyTheOwnerOrAPregrantMovesTheWalkthrough(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepARestartKeepsProgress(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepAnAnswerChangesOnlyItsAccess(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepAPromptOnlyAfterItsAskingIsSaved(s, "failed", failed(s, key, ticket), []))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepEachRequestAwaitsItsOwnAnswer(s, failed(s, key, ticket), []))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepEveryStepPassedIsSaved(s, failed(s, key, ticket), []))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepANoticeHasACause(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepAReviewLeavesTheWalkthroughAlone(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepAllSetOnlyForANewAccountOrALateError(s, "failed", failed(s, key, ticket)))
  ensures (inv(s) ==> canFailed(s, key, ticket) ==> stepHomeOnlyAtTheEnd(s, "failed", failed(s, key, ticket), []))
{
  if inv(s) && canFailed(s, key, ticket) {
    var after := failed(s, key, ticket);
    forall k | k != key
      ensures !changed(s, after, k)
    {
      PositionInjective(k, key);
      ProofLib.FilterMember((set_x: app__startup__steps_Key) => !((set_x in s.known)), [key], k);
    }
  }
}


lemma PositionInjective(a: app__startup__steps_Key, b: app__startup__steps_Key)
  ensures app__startup__steps_position(a) == app__startup__steps_position(b) ==> a == b
{
}

lemma NextIsUnpassed(s: Access)
  requires !completed(s)
  ensures unpassed(s, nextKey(s))
{
  var k :| k in app__startup__steps_everyKey && unpassed(s, k);
}

lemma FlagMember(group: seq<app__startup__steps_Key>, key: app__startup__steps_Key, on: bool, k: app__startup__steps_Key)
  ensures k in flag(group, key, on) <==> (if on then (k in group || k == key) else (k in group && k != key))
{
  if on {
    ProofLib.FilterMember((set_x: app__startup__steps_Key) => !((set_x in group)), [key], k);
  } else {
    ProofLib.FilterMember((set_x: app__startup__steps_Key) => !((set_x in [key])), group, k);
  }
}

lemma AdvancedSaves(choice: Choice, home: bool, s: Access, now: int)
  ensures |advanced(choice, home, s, now).out| >= 1
  ensures advanced(choice, home, s, now).out[0] == Save(kit__read_ask(s.store).ticket)
  ensures advanced(choice, home, s, now).out[0] in advanced(choice, home, s, now).out
  ensures saves(advanced(choice, home, s, now).out[0])
{
}
