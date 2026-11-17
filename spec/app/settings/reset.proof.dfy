lemma TryStopsFirst(before: Reset, said: Said, at: int, s: Reset)
  requires s.made == before.made
  ensures stepEveryTryStopsFirst(before, startTry(said, at, s).state, startTry(said, at, s).out)
{
  var t := startTry(said, at, s);
  var e := StopAccountUsers(s.made + 1);
  assert t.out == [e];
  assert e in t.out && isStop(e);
  forall x | x in t.out ensures x.StopAccountUsers? && x.stopping == t.state.clear.id {
    assert x == e;
  }
}

lemma recorded_ensures(s: Reset, record: int, saved: bool, at: int)
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> alwaysAnUnwrittenRecordIsNotPending(recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> alwaysTriesAreCounted(recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> alwaysNoTryWithoutApproval(recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> alwaysNoReviewOnceApproved(recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> alwaysOneStepAtATime(recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> alwaysErasedOnlyWhenConfirmed(recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepAnUnknownEraseIsNeverRetried(s, recorded(s, record, saved, at).state, recorded(s, record, saved, at).out))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepOnlyAlphasOwnRetriesAreCounted(s, "recorded", recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepAlphaTriesOncePerStart(s, recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepNothingStopsBeforeTheResetIsRecorded(s, "recorded", recorded(s, record, saved, at).state, recorded(s, record, saved, at).out))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepAPendingResetStaysPending(s, recorded(s, record, saved, at).state))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepEveryTryStopsFirst(s, recorded(s, record, saved, at).state, recorded(s, record, saved, at).out))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepKeysAreRevokedOncePerTry(s, recorded(s, record, saved, at).state, recorded(s, record, saved, at).out))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepEraseOnlyOnceStopped(s, recorded(s, record, saved, at).state, recorded(s, record, saved, at).out))
  ensures (inv(s) ==> canRecorded(s, record, saved, at) ==> stepAnErasedPhoneIsFinal(s, recorded(s, record, saved, at).state))
{
  if inv(s) && canRecorded(s, record, saved, at) {
    var after := recorded(s, record, saved, at);
    if saved {
      TryStopsFirst(s, Said.Quiet, at, s.(recording := kit__read_answer(s.recording, true), pending := true));
    }
  }
}

lemma retryOnLaunch_ensures(s: Reset, at: int)
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> alwaysAnUnwrittenRecordIsNotPending(retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> alwaysTriesAreCounted(retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> alwaysNoTryWithoutApproval(retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> alwaysNoReviewOnceApproved(retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> alwaysOneStepAtATime(retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> alwaysErasedOnlyWhenConfirmed(retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepAnUnknownEraseIsNeverRetried(s, retryOnLaunch(s, at).state, retryOnLaunch(s, at).out))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepOnlyAlphasOwnRetriesAreCounted(s, "retryOnLaunch", retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepAlphaTriesOncePerStart(s, retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepNothingStopsBeforeTheResetIsRecorded(s, "retryOnLaunch", retryOnLaunch(s, at).state, retryOnLaunch(s, at).out))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepAPendingResetStaysPending(s, retryOnLaunch(s, at).state))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepEveryTryStopsFirst(s, retryOnLaunch(s, at).state, retryOnLaunch(s, at).out))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepKeysAreRevokedOncePerTry(s, retryOnLaunch(s, at).state, retryOnLaunch(s, at).out))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepEraseOnlyOnceStopped(s, retryOnLaunch(s, at).state, retryOnLaunch(s, at).out))
  ensures (inv(s) ==> canRetryOnLaunch(s, at) ==> stepAnErasedPhoneIsFinal(s, retryOnLaunch(s, at).state))
{
  if inv(s) && canRetryOnLaunch(s, at) {
    var after := retryOnLaunch(s, at);
    TryStopsFirst(s, Said.Quiet, at, s.(tries := s.tries + 1, launchTry := false));
  }
}

lemma tryAgain_ensures(s: Reset, at: int)
  ensures (inv(s) ==> canTryAgain(s, at) ==> alwaysAnUnwrittenRecordIsNotPending(tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> alwaysTriesAreCounted(tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> alwaysNoTryWithoutApproval(tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> alwaysNoReviewOnceApproved(tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> alwaysOneStepAtATime(tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> alwaysErasedOnlyWhenConfirmed(tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepAnUnknownEraseIsNeverRetried(s, tryAgain(s, at).state, tryAgain(s, at).out))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepOnlyAlphasOwnRetriesAreCounted(s, "tryAgain", tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepAlphaTriesOncePerStart(s, tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepNothingStopsBeforeTheResetIsRecorded(s, "tryAgain", tryAgain(s, at).state, tryAgain(s, at).out))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepAPendingResetStaysPending(s, tryAgain(s, at).state))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepEveryTryStopsFirst(s, tryAgain(s, at).state, tryAgain(s, at).out))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepKeysAreRevokedOncePerTry(s, tryAgain(s, at).state, tryAgain(s, at).out))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepEraseOnlyOnceStopped(s, tryAgain(s, at).state, tryAgain(s, at).out))
  ensures (inv(s) ==> canTryAgain(s, at) ==> stepAnErasedPhoneIsFinal(s, tryAgain(s, at).state))
{
  if inv(s) && canTryAgain(s, at) {
    var after := tryAgain(s, at);
    TryStopsFirst(s, Said.Quiet, at, s);
  }
}
