lemma learn_ensures(s: Boot, ticket: int, launcher: bool, assistant: bool, image: bool, pregrants: bool, contacts: bool, locale: string, hours: TimeStyle)
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysOnlyAPhoneDecidesTheSurface(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysNothingIsKnownBeforeTheFirstAnswer(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysNothingIsKnownBeforeAsking(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysAProductionBuildNeverMocks(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysMockModeShowsItsBanner(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysTheAssistantSurfaceShowsNothingOfHome(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysTheMarkHidesHome(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysOnlyTheAssistantSurfaceIsCalled(learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepTheSurfaceIsDecidedOnce(s, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepWhatThePhoneSaysIsPassedOn(s, "learn", learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).out))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepTheWalkthroughBeginsOnceAlphaKnowsWhereItRuns(s, "learn", learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).out))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepTheConnectionResolvesOnce(s, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepOnlyTheConnectionEndsTheWait(s, "learn", learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepHomeOnceShownStaysShown(s, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepOnlyCloseEndsTheSurface(s, "learn", learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).out))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepACallIsSpentOnce(s, "learn", learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).out))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepOnlyAFreshTrustedCallListens(s, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours).out))
{
  if inv(s) && canLearn(s, ticket) {
    var after := learn(s, ticket, launcher, assistant, image, pregrants, contacts, locale, hours);
    assert after.out[0] in after.out && admits(after.out[0]);
    assert after.out[1] in after.out && formats(after.out[1]);
    if !s.known {
      assert after.out[2] in after.out && presents(after.out[2]);
      if !after.state.assistant {
        assert after.out[3] in after.out && walks(after.out[3]);
      }
    }
  }
}

lemma miss_ensures(s: Boot, ticket: int)
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysOnlyAPhoneDecidesTheSurface(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysNothingIsKnownBeforeTheFirstAnswer(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysNothingIsKnownBeforeAsking(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysAProductionBuildNeverMocks(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysMockModeShowsItsBanner(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysTheAssistantSurfaceShowsNothingOfHome(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysTheMarkHidesHome(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysOnlyTheAssistantSurfaceIsCalled(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepTheSurfaceIsDecidedOnce(s, miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepWhatThePhoneSaysIsPassedOn(s, "miss", miss(s, ticket).state, miss(s, ticket).out))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepTheWalkthroughBeginsOnceAlphaKnowsWhereItRuns(s, "miss", miss(s, ticket).state, miss(s, ticket).out))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepTheConnectionResolvesOnce(s, miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepOnlyTheConnectionEndsTheWait(s, "miss", miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepHomeOnceShownStaysShown(s, miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepOnlyCloseEndsTheSurface(s, "miss", miss(s, ticket).state, miss(s, ticket).out))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepACallIsSpentOnce(s, "miss", miss(s, ticket).state, miss(s, ticket).out))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepOnlyAFreshTrustedCallListens(s, miss(s, ticket).state, miss(s, ticket).out))
{
  if inv(s) && canMiss(s, ticket) {
    var after := miss(s, ticket);
    assert after.out[0] in after.out && admits(after.out[0]);
    if !s.known {
      assert after.out[1] in after.out && presents(after.out[1]);
      if !after.state.assistant {
        assert after.out[2] in after.out && walks(after.out[2]);
      }
    }
  }
}

lemma late_ensures(s: Boot, ticket: int, now: int)
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysOnlyAPhoneDecidesTheSurface(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysNothingIsKnownBeforeTheFirstAnswer(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysNothingIsKnownBeforeAsking(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysAProductionBuildNeverMocks(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysMockModeShowsItsBanner(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysTheAssistantSurfaceShowsNothingOfHome(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysTheMarkHidesHome(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> alwaysOnlyTheAssistantSurfaceIsCalled(late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepTheSurfaceIsDecidedOnce(s, late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepWhatThePhoneSaysIsPassedOn(s, "late", late(s, ticket, now).state, late(s, ticket, now).out))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepTheWalkthroughBeginsOnceAlphaKnowsWhereItRuns(s, "late", late(s, ticket, now).state, late(s, ticket, now).out))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepTheConnectionResolvesOnce(s, late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepOnlyTheConnectionEndsTheWait(s, "late", late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepHomeOnceShownStaysShown(s, late(s, ticket, now).state))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepOnlyCloseEndsTheSurface(s, "late", late(s, ticket, now).state, late(s, ticket, now).out))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepACallIsSpentOnce(s, "late", late(s, ticket, now).state, late(s, ticket, now).out))
  ensures (inv(s) ==> canLate(s, ticket, now) ==> stepOnlyAFreshTrustedCallListens(s, late(s, ticket, now).state, late(s, ticket, now).out))
{
  if inv(s) && canLate(s, ticket, now) {
    var after := late(s, ticket, now);
    assert after.out[0] in after.out && admits(after.out[0]);
    if !s.known {
      assert after.out[1] in after.out && presents(after.out[1]);
      if !after.state.assistant {
        assert after.out[2] in after.out && walks(after.out[2]);
      }
    }
  }
}

lemma take_ensures(s: Boot, over: bool, account: int, now: int)
  ensures (inv(s) ==> canTake(s, over) ==> alwaysOnlyAPhoneDecidesTheSurface(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> alwaysNothingIsKnownBeforeTheFirstAnswer(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> alwaysNothingIsKnownBeforeAsking(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> alwaysAProductionBuildNeverMocks(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> alwaysMockModeShowsItsBanner(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> alwaysTheAssistantSurfaceShowsNothingOfHome(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> alwaysTheMarkHidesHome(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> alwaysOnlyTheAssistantSurfaceIsCalled(take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> stepTheSurfaceIsDecidedOnce(s, take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> stepWhatThePhoneSaysIsPassedOn(s, "take", take(s, over, account, now).state, take(s, over, account, now).out))
  ensures (inv(s) ==> canTake(s, over) ==> stepTheWalkthroughBeginsOnceAlphaKnowsWhereItRuns(s, "take", take(s, over, account, now).state, take(s, over, account, now).out))
  ensures (inv(s) ==> canTake(s, over) ==> stepTheConnectionResolvesOnce(s, take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> stepOnlyTheConnectionEndsTheWait(s, "take", take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> stepHomeOnceShownStaysShown(s, take(s, over, account, now).state))
  ensures (inv(s) ==> canTake(s, over) ==> stepOnlyCloseEndsTheSurface(s, "take", take(s, over, account, now).state, take(s, over, account, now).out))
  ensures (inv(s) ==> canTake(s, over) ==> stepACallIsSpentOnce(s, "take", take(s, over, account, now).state, take(s, over, account, now).out))
  ensures (inv(s) ==> canTake(s, over) ==> stepOnlyAFreshTrustedCallListens(s, take(s, over, account, now).state, take(s, over, account, now).out))
{
  if inv(s) && canTake(s, over) {
    var after := take(s, over, account, now);
    assert after.out[0] in after.out && raises(after.out[0]);
  }
}
