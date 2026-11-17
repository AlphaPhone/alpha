lemma TryStopsFirst(before: Reset, via: string, said: Said, s: Reset)
  requires s.made == before.made && s.pending
  ensures stepEveryTryStopsFirst(before, via, startTry(said, s).state, startTry(said, s).out)
  ensures !(exists e :: e in startTry(said, s).out && isClear(e))
{
  var t := startTry(said, s);
  var e := StopAccountUsers(s.made + 1);
  assert t.out == [e];
  assert e in t.out && isStop(e);
  forall x | x in t.out ensures x.StopAccountUsers? && x.stopping == t.state.clear.id && !isClear(x) {
    assert x == e;
  }
}

lemma reviewed_ensures(s: Reset, review: int, reply: Answer)
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> alwaysTriesAreCounted(reviewed(s, review, reply).state))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> alwaysNoTryWithoutApproval(reviewed(s, review, reply).state))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> alwaysNoReviewOnceApproved(reviewed(s, review, reply).state))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> alwaysErasedOnlyWhenConfirmed(reviewed(s, review, reply).state))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> stepAlphaRetriesByItselfAtMostThreeTimes(s, "reviewed", reviewed(s, review, reply).state))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> stepAPendingResetStaysPending(s, reviewed(s, review, reply).state))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> stepEveryTryStopsFirst(s, "reviewed", reviewed(s, review, reply).state, reviewed(s, review, reply).out))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> stepEraseOnlyOnceStopped(s, "reviewed", reviewed(s, review, reply).state, reviewed(s, review, reply).out))
  ensures (inv(s) ==> canReviewed(s, review, reply) ==> stepAnErasedPhoneIsFinal(s, reviewed(s, review, reply).state))
{
  if inv(s) && canReviewed(s, review, reply) {
    var after := reviewed(s, review, reply);
    if reply.Approved? {
      TryStopsFirst(s, "reviewed", Said.Quiet, s.(review := kit__read_answer(s.review, true), pending := true));
    } else {
      assert after.out == [];
    }
  }
}

lemma retryOnLaunch_ensures(s: Reset)
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> alwaysTriesAreCounted(retryOnLaunch(s).state))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> alwaysNoTryWithoutApproval(retryOnLaunch(s).state))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> alwaysNoReviewOnceApproved(retryOnLaunch(s).state))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> alwaysErasedOnlyWhenConfirmed(retryOnLaunch(s).state))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> stepAlphaRetriesByItselfAtMostThreeTimes(s, "retryOnLaunch", retryOnLaunch(s).state))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> stepAPendingResetStaysPending(s, retryOnLaunch(s).state))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> stepEveryTryStopsFirst(s, "retryOnLaunch", retryOnLaunch(s).state, retryOnLaunch(s).out))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> stepEraseOnlyOnceStopped(s, "retryOnLaunch", retryOnLaunch(s).state, retryOnLaunch(s).out))
  ensures (inv(s) ==> canRetryOnLaunch(s) ==> stepAnErasedPhoneIsFinal(s, retryOnLaunch(s).state))
{
  if inv(s) && canRetryOnLaunch(s) {
    var after := retryOnLaunch(s);
    TryStopsFirst(s, "retryOnLaunch", s.said, s);
  }
}

lemma tryAgain_ensures(s: Reset)
  ensures (inv(s) ==> canTryAgain(s) ==> alwaysTriesAreCounted(tryAgain(s).state))
  ensures (inv(s) ==> canTryAgain(s) ==> alwaysNoTryWithoutApproval(tryAgain(s).state))
  ensures (inv(s) ==> canTryAgain(s) ==> alwaysNoReviewOnceApproved(tryAgain(s).state))
  ensures (inv(s) ==> canTryAgain(s) ==> alwaysErasedOnlyWhenConfirmed(tryAgain(s).state))
  ensures (inv(s) ==> canTryAgain(s) ==> stepAlphaRetriesByItselfAtMostThreeTimes(s, "tryAgain", tryAgain(s).state))
  ensures (inv(s) ==> canTryAgain(s) ==> stepAPendingResetStaysPending(s, tryAgain(s).state))
  ensures (inv(s) ==> canTryAgain(s) ==> stepEveryTryStopsFirst(s, "tryAgain", tryAgain(s).state, tryAgain(s).out))
  ensures (inv(s) ==> canTryAgain(s) ==> stepEraseOnlyOnceStopped(s, "tryAgain", tryAgain(s).state, tryAgain(s).out))
  ensures (inv(s) ==> canTryAgain(s) ==> stepAnErasedPhoneIsFinal(s, tryAgain(s).state))
{
  if inv(s) && canTryAgain(s) {
    var after := tryAgain(s);
    TryStopsFirst(s, "tryAgain", Said.Quiet, s);
  }
}
