lemma learn_ensures(s: Boot, ticket: int, launcher: bool, assistant: bool, image: bool, contacts: bool, locale: string, hours: TimeStyle)
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysOnlyAPhoneIsLauncherAssistantOrImage(learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysContactsNeedTheImage(learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysNothingIsKnownBeforeTheFirstAnswer(learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysNothingIsKnownBeforeAsking(learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysEverySurfaceHasAWayOut(learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysOnlyTheAssistantSurfaceIsCalledOrClosed(learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> alwaysAClosedSurfaceHoldsNoCall(learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepTheSurfaceIsDecidedOnce(s, learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepWhatThePhoneAdmitsIsPassedOn(s, "learn", learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, contacts, locale, hours).out))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepHomeOnceShownStaysShown(s, learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepOnlyTheConnectionOrSignInShowsHome(s, "learn", learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepACallIsSpentOnce(s, "learn", learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, contacts, locale, hours).out))
  ensures (inv(s) ==> canLearn(s, ticket) ==> stepOnlyAFreshTrustedCallListens(s, learn(s, ticket, launcher, assistant, image, contacts, locale, hours).state, learn(s, ticket, launcher, assistant, image, contacts, locale, hours).out))
{
  if inv(s) && canLearn(s, ticket) {
    var after := learn(s, ticket, launcher, assistant, image, contacts, locale, hours);
    assert after.out[0] in after.out;
    assert admits(after.out[0]);
  }
}

lemma miss_ensures(s: Boot, ticket: int)
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysOnlyAPhoneIsLauncherAssistantOrImage(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysContactsNeedTheImage(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysNothingIsKnownBeforeTheFirstAnswer(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysNothingIsKnownBeforeAsking(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysEverySurfaceHasAWayOut(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysOnlyTheAssistantSurfaceIsCalledOrClosed(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> alwaysAClosedSurfaceHoldsNoCall(miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepTheSurfaceIsDecidedOnce(s, miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepWhatThePhoneAdmitsIsPassedOn(s, "miss", miss(s, ticket).state, miss(s, ticket).out))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepHomeOnceShownStaysShown(s, miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepOnlyTheConnectionOrSignInShowsHome(s, "miss", miss(s, ticket).state))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepACallIsSpentOnce(s, "miss", miss(s, ticket).state, miss(s, ticket).out))
  ensures (inv(s) ==> canMiss(s, ticket) ==> stepOnlyAFreshTrustedCallListens(s, miss(s, ticket).state, miss(s, ticket).out))
{
  if inv(s) && canMiss(s, ticket) {
    var after := miss(s, ticket);
    assert after.out[0] in after.out;
    assert admits(after.out[0]);
  }
}

lemma take_ensures(s: Boot, now: int)
  ensures (inv(s) ==> canTake(s) ==> alwaysOnlyAPhoneIsLauncherAssistantOrImage(take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> alwaysContactsNeedTheImage(take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> alwaysNothingIsKnownBeforeTheFirstAnswer(take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> alwaysNothingIsKnownBeforeAsking(take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> alwaysEverySurfaceHasAWayOut(take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> alwaysOnlyTheAssistantSurfaceIsCalledOrClosed(take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> alwaysAClosedSurfaceHoldsNoCall(take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> stepTheSurfaceIsDecidedOnce(s, take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> stepWhatThePhoneAdmitsIsPassedOn(s, "take", take(s, now).state, take(s, now).out))
  ensures (inv(s) ==> canTake(s) ==> stepHomeOnceShownStaysShown(s, take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> stepOnlyTheConnectionOrSignInShowsHome(s, "take", take(s, now).state))
  ensures (inv(s) ==> canTake(s) ==> stepACallIsSpentOnce(s, "take", take(s, now).state, take(s, now).out))
  ensures (inv(s) ==> canTake(s) ==> stepOnlyAFreshTrustedCallListens(s, take(s, now).state, take(s, now).out))
{
  if inv(s) && canTake(s) {
    var after := take(s, now);
    assert after.out[0] in after.out;
    assert raises(after.out[0]);
  }
}
