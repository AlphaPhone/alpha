// Proof of the provider machine's obligations Dafny cannot find alone.

lemma choose_ensures(s: Provider, busy: bool, origin: app__account__outside_Origin, now: int)
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> alwaysOwnKeyNeedsASavedKey(choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> alwaysAnOfferFitsWhatWasChecked(choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> alwaysTheRequestFitsItsForm(choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> alwaysAKeyIsUsedOnlyAsOffered(choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepTheProviderChangesOnlyOnThePhonesWord(s, "choose", choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepEveryRequestTakesTheNextNumber(s, choose(s, busy, origin, now).state, choose(s, busy, origin, now).out))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepCheckingAKeyChangesNoKey(s, "choose", choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepOwnKeyIsSelectedOnlyAfterItsDisclosure(s, "choose", choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepSavingAKeyNotInUseNeverHoldsTheAgent(s, "choose", choose(s, busy, origin, now).state, choose(s, busy, origin, now).out))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepEveryChangeFollowsAConfirmedChoice(s, "choose", choose(s, busy, origin, now).state, choose(s, busy, origin, now).out))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepAChangeToWhatTheAgentRunsOnWaitsForIt(s, "choose", choose(s, busy, origin, now).state, choose(s, busy, origin, now).out))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepTheAgentIsLetGoWhenTheChangeEnds(s, "choose", choose(s, busy, origin, now).state, choose(s, busy, origin, now).out))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepTheAgentIsHeldOnlyOnItsWord(s, "choose", choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepRemovingTheKeyNeverSwitchesToCloud(s, "choose", choose(s, busy, origin, now).state))
  ensures (inv(s) ==> canChoose(s, busy, origin, now) ==> stepErasingLeavesNoKey(s, "choose", choose(s, busy, origin, now).state))
{
  var after := choose(s, busy, origin, now);
  assert after.out[0] in after.out;
}

lemma agentHeld_ensures(s: Provider, now: int)
  ensures (inv(s) ==> canAgentHeld(s) ==> alwaysOwnKeyNeedsASavedKey(agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> alwaysAnOfferFitsWhatWasChecked(agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> alwaysTheRequestFitsItsForm(agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> alwaysAKeyIsUsedOnlyAsOffered(agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepTheProviderChangesOnlyOnThePhonesWord(s, "agentHeld", agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepEveryRequestTakesTheNextNumber(s, agentHeld(s, now).state, agentHeld(s, now).out))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepCheckingAKeyChangesNoKey(s, "agentHeld", agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepOwnKeyIsSelectedOnlyAfterItsDisclosure(s, "agentHeld", agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepSavingAKeyNotInUseNeverHoldsTheAgent(s, "agentHeld", agentHeld(s, now).state, agentHeld(s, now).out))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepEveryChangeFollowsAConfirmedChoice(s, "agentHeld", agentHeld(s, now).state, agentHeld(s, now).out))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepAChangeToWhatTheAgentRunsOnWaitsForIt(s, "agentHeld", agentHeld(s, now).state, agentHeld(s, now).out))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepTheAgentIsLetGoWhenTheChangeEnds(s, "agentHeld", agentHeld(s, now).state, agentHeld(s, now).out))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepTheAgentIsHeldOnlyOnItsWord(s, "agentHeld", agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepRemovingTheKeyNeverSwitchesToCloud(s, "agentHeld", agentHeld(s, now).state))
  ensures (inv(s) ==> canAgentHeld(s) ==> stepErasingLeavesNoKey(s, "agentHeld", agentHeld(s, now).state))
{
  var after := agentHeld(s, now);
  assert after.out[0] in after.out;
}

lemma removeKey_ensures(s: Provider, kind: Kind, busy: bool, origin: app__account__outside_Origin, now: int)
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> alwaysOwnKeyNeedsASavedKey(removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> alwaysAnOfferFitsWhatWasChecked(removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> alwaysTheRequestFitsItsForm(removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> alwaysAKeyIsUsedOnlyAsOffered(removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepTheProviderChangesOnlyOnThePhonesWord(s, "removeKey", removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepEveryRequestTakesTheNextNumber(s, removeKey(s, kind, busy, origin, now).state, removeKey(s, kind, busy, origin, now).out))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepCheckingAKeyChangesNoKey(s, "removeKey", removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepOwnKeyIsSelectedOnlyAfterItsDisclosure(s, "removeKey", removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepSavingAKeyNotInUseNeverHoldsTheAgent(s, "removeKey", removeKey(s, kind, busy, origin, now).state, removeKey(s, kind, busy, origin, now).out))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepEveryChangeFollowsAConfirmedChoice(s, "removeKey", removeKey(s, kind, busy, origin, now).state, removeKey(s, kind, busy, origin, now).out))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepAChangeToWhatTheAgentRunsOnWaitsForIt(s, "removeKey", removeKey(s, kind, busy, origin, now).state, removeKey(s, kind, busy, origin, now).out))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepTheAgentIsLetGoWhenTheChangeEnds(s, "removeKey", removeKey(s, kind, busy, origin, now).state, removeKey(s, kind, busy, origin, now).out))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepTheAgentIsHeldOnlyOnItsWord(s, "removeKey", removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepRemovingTheKeyNeverSwitchesToCloud(s, "removeKey", removeKey(s, kind, busy, origin, now).state))
  ensures (inv(s) ==> canRemoveKey(s, kind, busy, origin, now) ==> stepErasingLeavesNoKey(s, "removeKey", removeKey(s, kind, busy, origin, now).state))
{
  var after := removeKey(s, kind, busy, origin, now);
  assert after.out[0] in after.out;
}

lemma used_ensures(s: Provider, ticket: int, ok: bool, revision: int)
  ensures (inv(s) ==> canUsed(s, ticket) ==> alwaysOwnKeyNeedsASavedKey(used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> alwaysAnOfferFitsWhatWasChecked(used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> alwaysTheRequestFitsItsForm(used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> alwaysAKeyIsUsedOnlyAsOffered(used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepTheProviderChangesOnlyOnThePhonesWord(s, "used", used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepEveryRequestTakesTheNextNumber(s, used(s, ticket, ok, revision).state, used(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepCheckingAKeyChangesNoKey(s, "used", used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepOwnKeyIsSelectedOnlyAfterItsDisclosure(s, "used", used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepSavingAKeyNotInUseNeverHoldsTheAgent(s, "used", used(s, ticket, ok, revision).state, used(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepEveryChangeFollowsAConfirmedChoice(s, "used", used(s, ticket, ok, revision).state, used(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepAChangeToWhatTheAgentRunsOnWaitsForIt(s, "used", used(s, ticket, ok, revision).state, used(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepTheAgentIsLetGoWhenTheChangeEnds(s, "used", used(s, ticket, ok, revision).state, used(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepTheAgentIsHeldOnlyOnItsWord(s, "used", used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepRemovingTheKeyNeverSwitchesToCloud(s, "used", used(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canUsed(s, ticket) ==> stepErasingLeavesNoKey(s, "used", used(s, ticket, ok, revision).state))
{
  var after := used(s, ticket, ok, revision);
  if s.holding { assert after.out[0] == Effect.ReleaseAgent; assert after.out[0] in after.out; }
}

lemma selected_ensures(s: Provider, ticket: int, ok: bool, revision: int)
  ensures (inv(s) ==> canSelected(s, ticket) ==> alwaysOwnKeyNeedsASavedKey(selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> alwaysAnOfferFitsWhatWasChecked(selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> alwaysTheRequestFitsItsForm(selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> alwaysAKeyIsUsedOnlyAsOffered(selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepTheProviderChangesOnlyOnThePhonesWord(s, "selected", selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepEveryRequestTakesTheNextNumber(s, selected(s, ticket, ok, revision).state, selected(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepCheckingAKeyChangesNoKey(s, "selected", selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepOwnKeyIsSelectedOnlyAfterItsDisclosure(s, "selected", selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepSavingAKeyNotInUseNeverHoldsTheAgent(s, "selected", selected(s, ticket, ok, revision).state, selected(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepEveryChangeFollowsAConfirmedChoice(s, "selected", selected(s, ticket, ok, revision).state, selected(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepAChangeToWhatTheAgentRunsOnWaitsForIt(s, "selected", selected(s, ticket, ok, revision).state, selected(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepTheAgentIsLetGoWhenTheChangeEnds(s, "selected", selected(s, ticket, ok, revision).state, selected(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepTheAgentIsHeldOnlyOnItsWord(s, "selected", selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepRemovingTheKeyNeverSwitchesToCloud(s, "selected", selected(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canSelected(s, ticket) ==> stepErasingLeavesNoKey(s, "selected", selected(s, ticket, ok, revision).state))
{
  var after := selected(s, ticket, ok, revision);
  if s.holding { assert after.out[0] == Effect.ReleaseAgent; assert after.out[0] in after.out; }
}

lemma removed_ensures(s: Provider, ticket: int, ok: bool, revision: int)
  ensures (inv(s) ==> canRemoved(s, ticket) ==> alwaysOwnKeyNeedsASavedKey(removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> alwaysAnOfferFitsWhatWasChecked(removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> alwaysTheRequestFitsItsForm(removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> alwaysAKeyIsUsedOnlyAsOffered(removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepTheProviderChangesOnlyOnThePhonesWord(s, "removed", removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepEveryRequestTakesTheNextNumber(s, removed(s, ticket, ok, revision).state, removed(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepCheckingAKeyChangesNoKey(s, "removed", removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepOwnKeyIsSelectedOnlyAfterItsDisclosure(s, "removed", removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepSavingAKeyNotInUseNeverHoldsTheAgent(s, "removed", removed(s, ticket, ok, revision).state, removed(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepEveryChangeFollowsAConfirmedChoice(s, "removed", removed(s, ticket, ok, revision).state, removed(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepAChangeToWhatTheAgentRunsOnWaitsForIt(s, "removed", removed(s, ticket, ok, revision).state, removed(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepTheAgentIsLetGoWhenTheChangeEnds(s, "removed", removed(s, ticket, ok, revision).state, removed(s, ticket, ok, revision).out))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepTheAgentIsHeldOnlyOnItsWord(s, "removed", removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepRemovingTheKeyNeverSwitchesToCloud(s, "removed", removed(s, ticket, ok, revision).state))
  ensures (inv(s) ==> canRemoved(s, ticket) ==> stepErasingLeavesNoKey(s, "removed", removed(s, ticket, ok, revision).state))
{
  var after := removed(s, ticket, ok, revision);
  if s.holding { assert after.out[0] == Effect.ReleaseAgent; assert after.out[0] in after.out; }
}

lemma giveUp_ensures(s: Provider, now: int)
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysOwnKeyNeedsASavedKey(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysAnOfferFitsWhatWasChecked(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysTheRequestFitsItsForm(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysAKeyIsUsedOnlyAsOffered(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepTheProviderChangesOnlyOnThePhonesWord(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepEveryRequestTakesTheNextNumber(s, giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepCheckingAKeyChangesNoKey(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepOwnKeyIsSelectedOnlyAfterItsDisclosure(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepSavingAKeyNotInUseNeverHoldsTheAgent(s, "giveUp", giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepEveryChangeFollowsAConfirmedChoice(s, "giveUp", giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepAChangeToWhatTheAgentRunsOnWaitsForIt(s, "giveUp", giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepTheAgentIsLetGoWhenTheChangeEnds(s, "giveUp", giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepTheAgentIsHeldOnlyOnItsWord(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepRemovingTheKeyNeverSwitchesToCloud(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepErasingLeavesNoKey(s, "giveUp", giveUp(s, now).state))
{
  var after := giveUp(s, now);
  if s.holding { assert after.out[0] == Effect.ReleaseAgent; assert after.out[0] in after.out; }
}
