// spec/app/camera/index.md: a set grown by one holds what it held and the one added;
// a set less one holds what it held but that one.

lemma Joined(xs: seq<int>, ys: seq<int>)
  ensures forall x :: x in xs + ProofLib.Filter((set_x: int) => !((set_x in xs)), ys) <==> (x in xs || x in ys)
{
  forall x
    ensures x in xs + ProofLib.Filter((set_x: int) => !((set_x in xs)), ys) <==> (x in xs || x in ys)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in xs)), ys, x);
  }
}

lemma Dropped(xs: seq<int>, ys: seq<int>)
  ensures forall x :: x in ProofLib.Filter((set_x: int) => !((set_x in ys)), xs) <==> (x in xs && x !in ys)
{
  forall x
    ensures x in ProofLib.Filter((set_x: int) => !((set_x in ys)), xs) <==> (x in xs && x !in ys)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in ys)), xs, x);
  }
}

lemma StartingPending(out: seq<Effect>, c: Camera)
  ensures starting(out, c).state.pending == c.pending + ProofLib.Filter((set_x: int) => !((set_x in c.pending)), [c.preview + 1])
{
}

lemma StartedPending(s: Camera, ticket: int, ok: bool, by_: Actor)
  ensures previewStarted(s, ticket, ok, by_).pending == ProofLib.Filter((set_x: int) => !((set_x in [ticket])), s.pending)
  ensures staleFailed(s, ticket, by_).pending == ProofLib.Filter((set_x: int) => !((set_x in [ticket])), s.pending)
  ensures staleOpened(s, ticket, by_).state.pending == ProofLib.Filter((set_x: int) => !((set_x in [ticket])), s.pending)
{
}

lemma Remembered(photo: int, c: Camera)
  ensures photo > 0 && c.secure ==> remember(photo, c).session == c.session + ProofLib.Filter((set_x: int) => !((set_x in c.session)), [photo])
{
}

lemma open_ensures(s: Camera, secure: bool, newest: int, by_: Actor)
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysNothingHeldAway(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysStartsAccounted(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysLensSettingsValid(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysFocusFollowsTheNewestTap(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysRecordingWithinLimits(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysSecureShowsOnlyItsSession(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepARetiredPreviewIsReleased(s, "open", open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepOneFocusWriteAtATime(s, "open", open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepARecordingEndsOnce(s, "open", open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "open", open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepLockScreenOpensOnlyItsSession(s, open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
{
if inv(s) && canOpen(s, by_) {
  var shown := s.(showing := true, secure := secure, session := [], last := (if secure then 0 else newest));
  if mayStart(shown) {
    Joined(shown.pending, [shown.preview + 1]);
    StartingPending([], shown);
    var after := starting([], shown).state;
    assert after.pending == shown.pending + ProofLib.Filter((set_x: int) => !((set_x in shown.pending)), [shown.preview + 1]);
    assert after.preview == s.preview + 1;
    forall t | t in after.pending ensures t > 0 && t <= after.preview {
      assert t in shown.pending || t in [shown.preview + 1];
      if t in s.pending { assert t <= s.preview; }
    }
    assert after.preview in after.pending;
  }
}
}

lemma accessIs_ensures(s: Camera, grant: kit__permission_Grant, by_: Actor)
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysNothingHeldAway(accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysStartsAccounted(accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysLensSettingsValid(accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysFocusFollowsTheNewestTap(accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysRecordingWithinLimits(accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysSecureShowsOnlyItsSession(accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepARetiredPreviewIsReleased(s, "accessIs", accessIs(s, grant, by_).state, accessIs(s, grant, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepOneFocusWriteAtATime(s, "accessIs", accessIs(s, grant, by_).state, accessIs(s, grant, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepARecordingEndsOnce(s, "accessIs", accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "accessIs", accessIs(s, grant, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepLockScreenOpensOnlyItsSession(s, accessIs(s, grant, by_).state, accessIs(s, grant, by_).out))
{
if inv(s) && canAccessIs(s, by_) {
  var told := s.(permission := kit__permission_observe(s.permission, grant));
  if !kit__permission_allows(told.permission) {
    var after := retiring([], told).state;
    forall t | t in after.pending ensures t > 0 && t <= after.preview { }
  } else if mayStart(told) {
    Joined(told.pending, [told.preview + 1]);
    StartingPending([], told);
    var after := starting([], told).state;
    forall t | t in after.pending ensures t > 0 && t <= after.preview { }
    assert after.preview in after.pending;
  }
}
}

lemma previewStarted_ensures(s: Camera, ticket: int, ok: bool, by_: Actor)
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysNothingHeldAway(previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysStartsAccounted(previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysLensSettingsValid(previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysRecordingWithinLimits(previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "previewStarted", previewStarted(s, ticket, ok, by_), []))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "previewStarted", previewStarted(s, ticket, ok, by_), []))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepARecordingEndsOnce(s, "previewStarted", previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "previewStarted", previewStarted(s, ticket, ok, by_)))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepLockScreenOpensOnlyItsSession(s, previewStarted(s, ticket, ok, by_), []))
{
{
  Dropped(s.pending, [ticket]);
  StartedPending(s, ticket, ok, by_);
}
}

lemma retry_ensures(s: Camera, by_: Actor)
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysNothingHeldAway(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysStartsAccounted(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysLensSettingsValid(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysFocusFollowsTheNewestTap(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysRecordingWithinLimits(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysSecureShowsOnlyItsSession(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepARetiredPreviewIsReleased(s, "retry", retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepOneFocusWriteAtATime(s, "retry", retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepARecordingEndsOnce(s, "retry", retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "retry", retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepLockScreenOpensOnlyItsSession(s, retry(s, by_).state, retry(s, by_).out))
{
{
  Joined(s.pending, [s.preview + 1]);
  StartingPending([], s);
}
}

lemma staleFailed_ensures(s: Camera, ticket: int, by_: Actor)
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysNothingHeldAway(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysStartsAccounted(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysLensSettingsValid(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysRecordingWithinLimits(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "staleFailed", staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "staleFailed", staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepARecordingEndsOnce(s, "staleFailed", staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "staleFailed", staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepLockScreenOpensOnlyItsSession(s, staleFailed(s, ticket, by_), []))
{
{
  Dropped(s.pending, [ticket]);
  StartedPending(s, ticket, true, by_);
}
}

lemma staleOpened_ensures(s: Camera, ticket: int, by_: Actor)
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysNothingHeldAway(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysStartsAccounted(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysLensSettingsValid(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysRecordingWithinLimits(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "staleOpened", staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "staleOpened", staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepARecordingEndsOnce(s, "staleOpened", staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "staleOpened", staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepLockScreenOpensOnlyItsSession(s, staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
{
{
  Dropped(s.pending, [ticket]);
  StartedPending(s, ticket, true, by_);
}
}

lemma flip_ensures(s: Camera, by_: Actor)
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysNothingHeldAway(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysStartsAccounted(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysLensSettingsValid(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysFocusFollowsTheNewestTap(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysRecordingWithinLimits(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysSecureShowsOnlyItsSession(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepARetiredPreviewIsReleased(s, "flip", flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepOneFocusWriteAtATime(s, "flip", flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepARecordingEndsOnce(s, "flip", flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "flip", flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepLockScreenOpensOnlyItsSession(s, flip(s, by_).state, flip(s, by_).out))
{
{
  Joined(s.pending, [s.preview + 1]);
  StartingPending([StopPreview(s.preview)], s.(lens := (if s.lens.Back? then Lens.Front else Lens.Back), flash := false, zoom := oneTime));
}
}

lemma captured_ensures(s: Camera, ticket: int, photo: int, by_: Actor)
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysNothingHeldAway(captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysStartsAccounted(captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysLensSettingsValid(captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysRecordingWithinLimits(captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "captured", captured(s, ticket, photo, by_), []))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "captured", captured(s, ticket, photo, by_), []))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepARecordingEndsOnce(s, "captured", captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "captured", captured(s, ticket, photo, by_)))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepLockScreenOpensOnlyItsSession(s, captured(s, ticket, photo, by_), []))
{
{
  Joined(s.session, [photo]);
  Remembered(photo, s.(shot := 0));
}
}

lemma recordingEnded_ensures(s: Camera, ok: bool, video: int, by_: Actor)
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysNothingHeldAway(recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysStartsAccounted(recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysLensSettingsValid(recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysFocusFollowsTheNewestTap(recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysRecordingWithinLimits(recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysSecureShowsOnlyItsSession(recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepARetiredPreviewIsReleased(s, "recordingEnded", recordingEnded(s, ok, video, by_).state, recordingEnded(s, ok, video, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepOneFocusWriteAtATime(s, "recordingEnded", recordingEnded(s, ok, video, by_).state, recordingEnded(s, ok, video, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepARecordingEndsOnce(s, "recordingEnded", recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepTheLimitKeepsWhatWasRecorded(s, "recordingEnded", recordingEnded(s, ok, video, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepLockScreenOpensOnlyItsSession(s, recordingEnded(s, ok, video, by_).state, recordingEnded(s, ok, video, by_).out))
{
{
  Joined(s.session, [video]);
  Remembered(video, s.(rec := Film.Saved));
}
}
