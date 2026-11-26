// spec/app/camera/index.md: a preview started joins the starts the phone may still answer, and
// one answered leaves them; an answer to the agent is added exactly when its request ends; a
// capture on the lock screen joins its session.

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

lemma StartingAccounted()
  ensures forall out: seq<Effect>, c: Camera {:trigger starting(out, c)} :: (c.preview >= 0 && (forall t :: t in c.pending ==> t > 0 && t <= c.preview) && c.showing) ==> alwaysStartsAccounted(starting(out, c).state)
{
  forall out: seq<Effect>, c: Camera | c.preview >= 0 && (forall t :: t in c.pending ==> t > 0 && t <= c.preview) && c.showing
    ensures alwaysStartsAccounted(starting(out, c).state)
  {
    var n := c.preview + 1;
    var after := starting(out, c).state;
    assert after.pending == c.pending + ProofLib.Filter((set_x: int) => !((set_x in c.pending)), [n]);
    Joined(c.pending, [n]);
    assert n in after.pending;
    forall t | t in after.pending ensures t > 0 && t <= after.preview {
    }
  }
}

lemma RetiringOut()
  ensures forall now: int, out: seq<Effect>, c: Camera {:trigger retiring(now, out, c)} :: (forall e :: e in out ==> !e.Answer?) ==> (forall e :: e in retiring(now, out, c).out ==> !e.Answer?)
{
}

lemma AnsweringAll()
  ensures forall d: Done, before: Camera {:trigger answering(d, before)} :: (forall e :: e in d.out ==> !e.Answer?) ==> (((!before.agent.stage.Over?) && answering(d, before).state.agent.stage.Over?) == (exists e :: e in answering(d, before).out && e.Answer?))
{
  forall d: Done, before: Camera | (forall e :: e in d.out ==> !e.Answer?)
    ensures (((!before.agent.stage.Over?) && answering(d, before).state.agent.stage.Over?) == (exists e :: e in answering(d, before).out && e.Answer?))
  {
    var r := answering(d, before);
    if (!before.agent.stage.Over?) && d.state.agent.stage.Over? {
      assert r.out[|r.out| - 1] in r.out;
      assert r.out[|r.out| - 1].Answer?;
    } else {
      assert r.out == d.out;
    }
  }
}

lemma RememberOne(photo: int, c: Camera)
  ensures (c.secure ==> photo in remember(photo, c).session) && (!c.secure ==> remember(photo, c).session == c.session)
{
  if c.secure {
    assert remember(photo, c).session == c.session + ProofLib.Filter((set_x: int) => !((set_x in c.session)), [photo]);
    Joined(c.session, [photo]);
  }
}

lemma StartingOne(out: seq<Effect>, c: Camera)
  requires c.preview >= 0 && (forall t :: t in c.pending ==> t > 0 && t <= c.preview) && c.showing
  ensures alwaysStartsAccounted(starting(out, c).state)
{
  var n := c.preview + 1;
  var after := starting(out, c).state;
  assert after.pending == c.pending + ProofLib.Filter((set_x: int) => !((set_x in c.pending)), [n]);
  Joined(c.pending, [n]);
}

lemma RetiringOne(now: int, out: seq<Effect>, c: Camera)
  requires forall e :: e in out ==> !e.Answer?
  ensures forall e :: e in retiring(now, out, c).out ==> !e.Answer?
{
}

lemma AnsweringOne(d: Done, before: Camera)
  requires forall e :: e in d.out ==> !e.Answer?
  ensures ((!before.agent.stage.Over?) && answering(d, before).state.agent.stage.Over?) == (exists e :: e in answering(d, before).out && e.Answer?)
{
  var r := answering(d, before);
  if (!before.agent.stage.Over?) && d.state.agent.stage.Over? {
    assert r.out[|r.out| - 1] in r.out;
    assert r.out[|r.out| - 1].Answer?;
  }
}

lemma AccessIsDeniedInv(s: Camera, grant: kit__permission_Grant, now: int)
  requires inv(s)
  requires !kit__permission_allows(kit__permission_observe(s.permission, grant))
  ensures inv(answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state)
{
}

lemma AccessIsDeniedStep(s: Camera, grant: kit__permission_Grant, now: int)
  requires inv(s)
  requires !kit__permission_allows(kit__permission_observe(s.permission, grant))
  ensures stepALostPreviewFails(s, "accessIs", answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state)
  ensures stepARetiredPreviewIsReleased(s, "accessIs", answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).out)
  ensures stepOneFocusWriteAtATime(s, "accessIs", answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).out)
  ensures stepSoundOnlyWithTheMicrophone(s, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).out)
  ensures stepASavedVideoIsTheLast(s, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state)
  ensures stepTheShutterNeverFiresCovered(s, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).out)
  ensures stepEachRequestIsAnsweredOnce(s, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).out)
  ensures stepTheAgentFailsOnlyForCause(s, "accessIs", answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state)
  ensures stepTheLockScreenOpensNothingElse(s, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state, answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).out)
  ensures stepOnlyThisVisitJoinsTheSession(s, "accessIs", answering(retiring(now, [], blocking(Cause.Denied, s.(permission := kit__permission_observe(s.permission, grant)))), s).state)
{
  var next := s.(permission := kit__permission_observe(s.permission, grant));
  var b := blocking(Cause.Denied, next);
  RetiringOne(now, [], b);
  AnsweringOne(retiring(now, [], b), s);
}

lemma AccessIsStarting(s: Camera, grant: kit__permission_Grant)
  requires inv(s)
  requires kit__permission_allows(kit__permission_observe(s.permission, grant))
  requires mayStart(s.(permission := kit__permission_observe(s.permission, grant)))
  ensures inv(starting([], s.(permission := kit__permission_observe(s.permission, grant))).state)
  ensures stepALostPreviewFails(s, "accessIs", starting([], s.(permission := kit__permission_observe(s.permission, grant))).state)
  ensures stepARetiredPreviewIsReleased(s, "accessIs", starting([], s.(permission := kit__permission_observe(s.permission, grant))).state, starting([], s.(permission := kit__permission_observe(s.permission, grant))).out)
  ensures stepOneFocusWriteAtATime(s, "accessIs", starting([], s.(permission := kit__permission_observe(s.permission, grant))).state, starting([], s.(permission := kit__permission_observe(s.permission, grant))).out)
  ensures stepSoundOnlyWithTheMicrophone(s, starting([], s.(permission := kit__permission_observe(s.permission, grant))).state, starting([], s.(permission := kit__permission_observe(s.permission, grant))).out)
  ensures stepASavedVideoIsTheLast(s, starting([], s.(permission := kit__permission_observe(s.permission, grant))).state)
  ensures stepTheShutterNeverFiresCovered(s, starting([], s.(permission := kit__permission_observe(s.permission, grant))).state, starting([], s.(permission := kit__permission_observe(s.permission, grant))).out)
  ensures stepEachRequestIsAnsweredOnce(s, starting([], s.(permission := kit__permission_observe(s.permission, grant))).state, starting([], s.(permission := kit__permission_observe(s.permission, grant))).out)
  ensures stepTheAgentFailsOnlyForCause(s, "accessIs", starting([], s.(permission := kit__permission_observe(s.permission, grant))).state)
  ensures stepTheLockScreenOpensNothingElse(s, starting([], s.(permission := kit__permission_observe(s.permission, grant))).state, starting([], s.(permission := kit__permission_observe(s.permission, grant))).out)
  ensures stepOnlyThisVisitJoinsTheSession(s, "accessIs", starting([], s.(permission := kit__permission_observe(s.permission, grant))).state)
{
  var next := s.(permission := kit__permission_observe(s.permission, grant));
  StartingOne([], next);
}

lemma FilmingSavedInv(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping? || s.film.stage.Checking?
  requires f.stage.Saved?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures inv(filming(f, now, s).state)
{
  RememberOne(f.video, s.(film := f));
}

lemma FilmingSavedStep(f: app__camera__recording_Film, now: int, s: Camera, via: string)
  requires inv(s)
  requires s.film.stage.Stopping? || s.film.stage.Checking?
  requires f.stage.Saved?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  requires via == "recordingEnded" || via == "recordingVerified"
  ensures stepALostPreviewFails(s, via, filming(f, now, s).state)
  ensures stepARetiredPreviewIsReleased(s, via, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOneFocusWriteAtATime(s, via, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepSoundOnlyWithTheMicrophone(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepASavedVideoIsTheLast(s, filming(f, now, s).state)
  ensures stepTheShutterNeverFiresCovered(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepEachRequestIsAnsweredOnce(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepTheAgentFailsOnlyForCause(s, via, filming(f, now, s).state)
  ensures stepTheLockScreenOpensNothingElse(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOnlyThisVisitJoinsTheSession(s, via, filming(f, now, s).state)
{
  RememberOne(f.video, s.(film := f));
}

lemma FilmingCheckingInvA(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping?
  requires f.stage.Checking?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures alwaysNoCameraWithoutAccess(filming(f, now, s).state)
  ensures alwaysNothingHeldAway(filming(f, now, s).state)
  ensures alwaysStartsAccounted(filming(f, now, s).state)
  ensures alwaysTorchBelongsToItsPreview(filming(f, now, s).state)
  ensures alwaysLensSettingsValid(filming(f, now, s).state)
{
}

lemma FilmingCheckingInvB(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping?
  requires f.stage.Checking?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures alwaysFocusFollowsTheNewestTap(filming(f, now, s).state)
  ensures alwaysRecordingHoldsThePreview(filming(f, now, s).state)
  ensures alwaysOneShutterOnTheCamera(filming(f, now, s).state)
  ensures alwaysTheRequestWaitsOnTheCamera(filming(f, now, s).state)
  ensures alwaysSecureShowsOnlyItsSession(filming(f, now, s).state)
{
}

lemma FilmingCheckingStep(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping?
  requires f.stage.Checking?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures stepALostPreviewFails(s, "recordingEnded", filming(f, now, s).state)
  ensures stepARetiredPreviewIsReleased(s, "recordingEnded", filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOneFocusWriteAtATime(s, "recordingEnded", filming(f, now, s).state, filming(f, now, s).out)
  ensures stepSoundOnlyWithTheMicrophone(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepASavedVideoIsTheLast(s, filming(f, now, s).state)
  ensures stepTheShutterNeverFiresCovered(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepEachRequestIsAnsweredOnce(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepTheAgentFailsOnlyForCause(s, "recordingEnded", filming(f, now, s).state)
  ensures stepTheLockScreenOpensNothingElse(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOnlyThisVisitJoinsTheSession(s, "recordingEnded", filming(f, now, s).state)
{
}

lemma FilmingEmptyInv(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping?
  requires f.stage.Empty?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures inv(filming(f, now, s).state)
{
}

lemma FilmingEmptyStep(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping?
  requires f.stage.Empty?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures stepALostPreviewFails(s, "recordingEnded", filming(f, now, s).state)
  ensures stepARetiredPreviewIsReleased(s, "recordingEnded", filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOneFocusWriteAtATime(s, "recordingEnded", filming(f, now, s).state, filming(f, now, s).out)
  ensures stepSoundOnlyWithTheMicrophone(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepASavedVideoIsTheLast(s, filming(f, now, s).state)
  ensures stepTheShutterNeverFiresCovered(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepEachRequestIsAnsweredOnce(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepTheAgentFailsOnlyForCause(s, "recordingEnded", filming(f, now, s).state)
  ensures stepTheLockScreenOpensNothingElse(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOnlyThisVisitJoinsTheSession(s, "recordingEnded", filming(f, now, s).state)
{
}

lemma FilmingBrokenInvA(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping? || s.film.stage.Checking?
  requires f.stage.Broken?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures alwaysNoCameraWithoutAccess(filming(f, now, s).state)
  ensures alwaysNothingHeldAway(filming(f, now, s).state)
  ensures alwaysStartsAccounted(filming(f, now, s).state)
  ensures alwaysTorchBelongsToItsPreview(filming(f, now, s).state)
  ensures alwaysLensSettingsValid(filming(f, now, s).state)
{
}

lemma FilmingBrokenInvB1(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping? || s.film.stage.Checking?
  requires f.stage.Broken?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures alwaysFocusFollowsTheNewestTap(filming(f, now, s).state)
  ensures alwaysRecordingHoldsThePreview(filming(f, now, s).state)
{
}

lemma FilmingBrokenInvB2(f: app__camera__recording_Film, now: int, s: Camera)
  requires inv(s)
  requires s.film.stage.Stopping? || s.film.stage.Checking?
  requires f.stage.Broken?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  ensures alwaysOneShutterOnTheCamera(filming(f, now, s).state)
  ensures alwaysTheRequestWaitsOnTheCamera(filming(f, now, s).state)
{
}

lemma FilmingBrokenInvB3(f: app__camera__recording_Film, now: int, s: Camera)
  requires alwaysSecureShowsOnlyItsSession(s)
  requires f.stage.Broken?
  ensures alwaysSecureShowsOnlyItsSession(filming(f, now, s).state)
{
  var c := settling(f, s);
  assert c.secure == s.secure && c.last == s.last && c.session == s.session;
  var r := filming(f, now, s).state;
  assert r.secure == c.secure && r.last == c.last && r.session == c.session;
}

lemma FilmingBrokenStepA(f: app__camera__recording_Film, now: int, s: Camera, via: string)
  requires inv(s)
  requires s.film.stage.Stopping? || s.film.stage.Checking?
  requires f.stage.Broken?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  requires via == "recordingEnded" || via == "recordingVerified"
  ensures stepALostPreviewFails(s, via, filming(f, now, s).state)
  ensures stepARetiredPreviewIsReleased(s, via, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOneFocusWriteAtATime(s, via, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepSoundOnlyWithTheMicrophone(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepASavedVideoIsTheLast(s, filming(f, now, s).state)
{
}

lemma FilmingBrokenStepB(f: app__camera__recording_Film, now: int, s: Camera, via: string)
  requires inv(s)
  requires s.film.stage.Stopping? || s.film.stage.Checking?
  requires f.stage.Broken?
  requires app__camera__recording_alwaysWithinLimits(f) && app__camera__recording_alwaysSavedIsWhole(f)
  requires via == "recordingEnded" || via == "recordingVerified"
  ensures stepTheShutterNeverFiresCovered(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepEachRequestIsAnsweredOnce(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepTheAgentFailsOnlyForCause(s, via, filming(f, now, s).state)
  ensures stepTheLockScreenOpensNothingElse(s, filming(f, now, s).state, filming(f, now, s).out)
  ensures stepOnlyThisVisitJoinsTheSession(s, via, filming(f, now, s).state)
{
}

lemma RememberAll()
  ensures forall photo: int, c: Camera {:trigger remember(photo, c)} :: (c.secure ==> photo in remember(photo, c).session) && (!c.secure ==> remember(photo, c).session == c.session)
{
  forall photo: int, c: Camera
    ensures (c.secure ==> photo in remember(photo, c).session) && (!c.secure ==> remember(photo, c).session == c.session)
  {
    if c.secure {
      assert remember(photo, c).session == c.session + ProofLib.Filter((set_x: int) => !((set_x in c.session)), [photo]);
      Joined(c.session, [photo]);
    }
  }
}

lemma accessIs_ensures(s: Camera, grant: kit__permission_Grant, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysNoCameraWithoutAccess(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysNothingHeldAway(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysStartsAccounted(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysTorchBelongsToItsPreview(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysLensSettingsValid(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysFocusFollowsTheNewestTap(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysRecordingHoldsThePreview(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysOneShutterOnTheCamera(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysSecureShowsOnlyItsSession(accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepALostPreviewFails(s, "accessIs", accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepARetiredPreviewIsReleased(s, "accessIs", accessIs(s, grant, now, by_).state, accessIs(s, grant, now, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepOneFocusWriteAtATime(s, "accessIs", accessIs(s, grant, now, by_).state, accessIs(s, grant, now, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, accessIs(s, grant, now, by_).state, accessIs(s, grant, now, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepASavedVideoIsTheLast(s, accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepTheShutterNeverFiresCovered(s, accessIs(s, grant, now, by_).state, accessIs(s, grant, now, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepEachRequestIsAnsweredOnce(s, accessIs(s, grant, now, by_).state, accessIs(s, grant, now, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "accessIs", accessIs(s, grant, now, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepTheLockScreenOpensNothingElse(s, accessIs(s, grant, now, by_).state, accessIs(s, grant, now, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "accessIs", accessIs(s, grant, now, by_).state))
{
  if inv(s) && canAccessIs(s, by_) {
    var next := s.(permission := kit__permission_observe(s.permission, grant));
    if !kit__permission_allows(next.permission) {
      AccessIsDeniedInv(s, grant, now);
      AccessIsDeniedStep(s, grant, now);
    } else if mayStart(next) {
      AccessIsStarting(s, grant);
    }
  }
}

lemma agentAsk_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysNoCameraWithoutAccess(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysNothingHeldAway(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysStartsAccounted(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysTorchBelongsToItsPreview(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysLensSettingsValid(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysFocusFollowsTheNewestTap(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysRecordingHoldsThePreview(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysOneShutterOnTheCamera(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysSecureShowsOnlyItsSession(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepALostPreviewFails(s, "agentAsk", agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepARetiredPreviewIsReleased(s, "agentAsk", agentAsk(s, by_).state, agentAsk(s, by_).out))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepOneFocusWriteAtATime(s, "agentAsk", agentAsk(s, by_).state, agentAsk(s, by_).out))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, agentAsk(s, by_).state, agentAsk(s, by_).out))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepASavedVideoIsTheLast(s, agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepTheShutterNeverFiresCovered(s, agentAsk(s, by_).state, agentAsk(s, by_).out))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepEachRequestIsAnsweredOnce(s, agentAsk(s, by_).state, agentAsk(s, by_).out))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "agentAsk", agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepTheLockScreenOpensNothingElse(s, agentAsk(s, by_).state, agentAsk(s, by_).out))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "agentAsk", agentAsk(s, by_).state))
{
  StartingAccounted();
}

lemma agentDecline_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysNoCameraWithoutAccess(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysNothingHeldAway(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysStartsAccounted(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysTorchBelongsToItsPreview(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysLensSettingsValid(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysFocusFollowsTheNewestTap(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysRecordingHoldsThePreview(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysOneShutterOnTheCamera(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> alwaysSecureShowsOnlyItsSession(agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepALostPreviewFails(s, "agentDecline", agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepARetiredPreviewIsReleased(s, "agentDecline", agentDecline(s, by_).state, agentDecline(s, by_).out))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepOneFocusWriteAtATime(s, "agentDecline", agentDecline(s, by_).state, agentDecline(s, by_).out))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, agentDecline(s, by_).state, agentDecline(s, by_).out))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepASavedVideoIsTheLast(s, agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepTheShutterNeverFiresCovered(s, agentDecline(s, by_).state, agentDecline(s, by_).out))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepEachRequestIsAnsweredOnce(s, agentDecline(s, by_).state, agentDecline(s, by_).out))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "agentDecline", agentDecline(s, by_).state))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepTheLockScreenOpensNothingElse(s, agentDecline(s, by_).state, agentDecline(s, by_).out))
  ensures (inv(s) ==> canAgentDecline(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "agentDecline", agentDecline(s, by_).state))
{
  AnsweringAll();
}

lemma agentExpired_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysNoCameraWithoutAccess(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysNothingHeldAway(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysStartsAccounted(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysTorchBelongsToItsPreview(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysLensSettingsValid(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysFocusFollowsTheNewestTap(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysRecordingHoldsThePreview(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysOneShutterOnTheCamera(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> alwaysSecureShowsOnlyItsSession(agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepALostPreviewFails(s, "agentExpired", agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepARetiredPreviewIsReleased(s, "agentExpired", agentExpired(s, by_).state, agentExpired(s, by_).out))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepOneFocusWriteAtATime(s, "agentExpired", agentExpired(s, by_).state, agentExpired(s, by_).out))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, agentExpired(s, by_).state, agentExpired(s, by_).out))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepASavedVideoIsTheLast(s, agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepTheShutterNeverFiresCovered(s, agentExpired(s, by_).state, agentExpired(s, by_).out))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepEachRequestIsAnsweredOnce(s, agentExpired(s, by_).state, agentExpired(s, by_).out))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "agentExpired", agentExpired(s, by_).state))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepTheLockScreenOpensNothingElse(s, agentExpired(s, by_).state, agentExpired(s, by_).out))
  ensures (inv(s) ==> canAgentExpired(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "agentExpired", agentExpired(s, by_).state))
{
  AnsweringAll();
}

lemma agentWithdraw_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysNoCameraWithoutAccess(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysNothingHeldAway(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysStartsAccounted(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysTorchBelongsToItsPreview(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysLensSettingsValid(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysFocusFollowsTheNewestTap(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysRecordingHoldsThePreview(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysOneShutterOnTheCamera(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> alwaysSecureShowsOnlyItsSession(agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepALostPreviewFails(s, "agentWithdraw", agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepARetiredPreviewIsReleased(s, "agentWithdraw", agentWithdraw(s, by_).state, agentWithdraw(s, by_).out))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepOneFocusWriteAtATime(s, "agentWithdraw", agentWithdraw(s, by_).state, agentWithdraw(s, by_).out))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, agentWithdraw(s, by_).state, agentWithdraw(s, by_).out))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepASavedVideoIsTheLast(s, agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepTheShutterNeverFiresCovered(s, agentWithdraw(s, by_).state, agentWithdraw(s, by_).out))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepEachRequestIsAnsweredOnce(s, agentWithdraw(s, by_).state, agentWithdraw(s, by_).out))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "agentWithdraw", agentWithdraw(s, by_).state))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepTheLockScreenOpensNothingElse(s, agentWithdraw(s, by_).state, agentWithdraw(s, by_).out))
  ensures (inv(s) ==> canAgentWithdraw(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "agentWithdraw", agentWithdraw(s, by_).state))
{
  AnsweringAll();
}

lemma agentShoot_ensures(s: Camera, sensitive: bool, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysNoCameraWithoutAccess(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysNothingHeldAway(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysStartsAccounted(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysTorchBelongsToItsPreview(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysLensSettingsValid(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysFocusFollowsTheNewestTap(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysRecordingHoldsThePreview(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysOneShutterOnTheCamera(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysTheRequestWaitsOnTheCamera(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> alwaysSecureShowsOnlyItsSession(agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepALostPreviewFails(s, "agentShoot", agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepARetiredPreviewIsReleased(s, "agentShoot", agentShoot(s, sensitive, by_).state, agentShoot(s, sensitive, by_).out))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepOneFocusWriteAtATime(s, "agentShoot", agentShoot(s, sensitive, by_).state, agentShoot(s, sensitive, by_).out))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepSoundOnlyWithTheMicrophone(s, agentShoot(s, sensitive, by_).state, agentShoot(s, sensitive, by_).out))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepASavedVideoIsTheLast(s, agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepTheShutterNeverFiresCovered(s, agentShoot(s, sensitive, by_).state, agentShoot(s, sensitive, by_).out))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepEachRequestIsAnsweredOnce(s, agentShoot(s, sensitive, by_).state, agentShoot(s, sensitive, by_).out))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepTheAgentFailsOnlyForCause(s, "agentShoot", agentShoot(s, sensitive, by_).state))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepTheLockScreenOpensNothingElse(s, agentShoot(s, sensitive, by_).state, agentShoot(s, sensitive, by_).out))
  ensures (inv(s) ==> canAgentShoot(s, sensitive, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "agentShoot", agentShoot(s, sensitive, by_).state))
{
  AnsweringAll();
}

lemma captured_ensures(s: Camera, ticket: int, photo: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysNoCameraWithoutAccess(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysNothingHeldAway(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysStartsAccounted(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysTorchBelongsToItsPreview(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysLensSettingsValid(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysRecordingHoldsThePreview(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysOneShutterOnTheCamera(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysTheRequestWaitsOnTheCamera(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepALostPreviewFails(s, "captured", captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "captured", captured(s, ticket, photo, by_).state, captured(s, ticket, photo, by_).out))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "captured", captured(s, ticket, photo, by_).state, captured(s, ticket, photo, by_).out))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepSoundOnlyWithTheMicrophone(s, captured(s, ticket, photo, by_).state, captured(s, ticket, photo, by_).out))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepASavedVideoIsTheLast(s, captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepTheShutterNeverFiresCovered(s, captured(s, ticket, photo, by_).state, captured(s, ticket, photo, by_).out))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepEachRequestIsAnsweredOnce(s, captured(s, ticket, photo, by_).state, captured(s, ticket, photo, by_).out))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepTheAgentFailsOnlyForCause(s, "captured", captured(s, ticket, photo, by_).state))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepTheLockScreenOpensNothingElse(s, captured(s, ticket, photo, by_).state, captured(s, ticket, photo, by_).out))
  ensures (inv(s) ==> canCaptured(s, ticket, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "captured", captured(s, ticket, photo, by_).state))
{
  AnsweringAll();
  RememberAll();
}

lemma close_ensures(s: Camera, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysNoCameraWithoutAccess(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysNothingHeldAway(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysStartsAccounted(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysTorchBelongsToItsPreview(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysLensSettingsValid(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysFocusFollowsTheNewestTap(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysRecordingHoldsThePreview(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysOneShutterOnTheCamera(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> alwaysSecureShowsOnlyItsSession(close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> stepALostPreviewFails(s, "close", close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> stepARetiredPreviewIsReleased(s, "close", close(s, now, by_).state, close(s, now, by_).out))
  ensures (inv(s) ==> canClose(s, by_) ==> stepOneFocusWriteAtATime(s, "close", close(s, now, by_).state, close(s, now, by_).out))
  ensures (inv(s) ==> canClose(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, close(s, now, by_).state, close(s, now, by_).out))
  ensures (inv(s) ==> canClose(s, by_) ==> stepASavedVideoIsTheLast(s, close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> stepTheShutterNeverFiresCovered(s, close(s, now, by_).state, close(s, now, by_).out))
  ensures (inv(s) ==> canClose(s, by_) ==> stepEachRequestIsAnsweredOnce(s, close(s, now, by_).state, close(s, now, by_).out))
  ensures (inv(s) ==> canClose(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "close", close(s, now, by_).state))
  ensures (inv(s) ==> canClose(s, by_) ==> stepTheLockScreenOpensNothingElse(s, close(s, now, by_).state, close(s, now, by_).out))
  ensures (inv(s) ==> canClose(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "close", close(s, now, by_).state))
{
  AnsweringAll();
  RetiringOut();
}

lemma scanDocument_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysNoCameraWithoutAccess(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysNothingHeldAway(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysStartsAccounted(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysTorchBelongsToItsPreview(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysLensSettingsValid(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysFocusFollowsTheNewestTap(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysRecordingHoldsThePreview(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysOneShutterOnTheCamera(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysSecureShowsOnlyItsSession(scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepALostPreviewFails(s, "scanDocument", scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepARetiredPreviewIsReleased(s, "scanDocument", scanDocument(s, by_).state, scanDocument(s, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepOneFocusWriteAtATime(s, "scanDocument", scanDocument(s, by_).state, scanDocument(s, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, scanDocument(s, by_).state, scanDocument(s, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepASavedVideoIsTheLast(s, scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepTheShutterNeverFiresCovered(s, scanDocument(s, by_).state, scanDocument(s, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepEachRequestIsAnsweredOnce(s, scanDocument(s, by_).state, scanDocument(s, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "scanDocument", scanDocument(s, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepTheLockScreenOpensNothingElse(s, scanDocument(s, by_).state, scanDocument(s, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "scanDocument", scanDocument(s, by_).state))
{
  AnsweringAll();
  RetiringOut();
}

lemma flip_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysNoCameraWithoutAccess(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysNothingHeldAway(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysStartsAccounted(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysTorchBelongsToItsPreview(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysLensSettingsValid(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysFocusFollowsTheNewestTap(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysRecordingHoldsThePreview(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysOneShutterOnTheCamera(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysSecureShowsOnlyItsSession(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepALostPreviewFails(s, "flip", flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepARetiredPreviewIsReleased(s, "flip", flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepOneFocusWriteAtATime(s, "flip", flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepASavedVideoIsTheLast(s, flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepTheShutterNeverFiresCovered(s, flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepEachRequestIsAnsweredOnce(s, flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "flip", flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepTheLockScreenOpensNothingElse(s, flip(s, by_).state, flip(s, by_).out))
  ensures (inv(s) ==> canFlip(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "flip", flip(s, by_).state))
{
  StartingAccounted();
}

lemma open_ensures(s: Camera, secure: bool, newest: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysNoCameraWithoutAccess(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysNothingHeldAway(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysStartsAccounted(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysTorchBelongsToItsPreview(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysLensSettingsValid(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysFocusFollowsTheNewestTap(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysRecordingHoldsThePreview(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysOneShutterOnTheCamera(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysSecureShowsOnlyItsSession(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepALostPreviewFails(s, "open", open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepARetiredPreviewIsReleased(s, "open", open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepOneFocusWriteAtATime(s, "open", open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepASavedVideoIsTheLast(s, open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepTheShutterNeverFiresCovered(s, open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepEachRequestIsAnsweredOnce(s, open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "open", open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepTheLockScreenOpensNothingElse(s, open(s, secure, newest, by_).state, open(s, secure, newest, by_).out))
  ensures (inv(s) ==> canOpen(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "open", open(s, secure, newest, by_).state))
{
  StartingAccounted();
}

lemma retry_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysNoCameraWithoutAccess(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysNothingHeldAway(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysStartsAccounted(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysTorchBelongsToItsPreview(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysLensSettingsValid(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysFocusFollowsTheNewestTap(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysRecordingHoldsThePreview(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysOneShutterOnTheCamera(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> alwaysSecureShowsOnlyItsSession(retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepALostPreviewFails(s, "retry", retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepARetiredPreviewIsReleased(s, "retry", retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepOneFocusWriteAtATime(s, "retry", retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepASavedVideoIsTheLast(s, retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepTheShutterNeverFiresCovered(s, retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepEachRequestIsAnsweredOnce(s, retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "retry", retry(s, by_).state))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepTheLockScreenOpensNothingElse(s, retry(s, by_).state, retry(s, by_).out))
  ensures (inv(s) ==> canRetry(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "retry", retry(s, by_).state))
{
  StartingAccounted();
}

lemma uncovered_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysNoCameraWithoutAccess(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysNothingHeldAway(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysStartsAccounted(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysTorchBelongsToItsPreview(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysLensSettingsValid(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysFocusFollowsTheNewestTap(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysRecordingHoldsThePreview(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysOneShutterOnTheCamera(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> alwaysSecureShowsOnlyItsSession(uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepALostPreviewFails(s, "uncovered", uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepARetiredPreviewIsReleased(s, "uncovered", uncovered(s, by_).state, uncovered(s, by_).out))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepOneFocusWriteAtATime(s, "uncovered", uncovered(s, by_).state, uncovered(s, by_).out))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, uncovered(s, by_).state, uncovered(s, by_).out))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepASavedVideoIsTheLast(s, uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepTheShutterNeverFiresCovered(s, uncovered(s, by_).state, uncovered(s, by_).out))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepEachRequestIsAnsweredOnce(s, uncovered(s, by_).state, uncovered(s, by_).out))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "uncovered", uncovered(s, by_).state))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepTheLockScreenOpensNothingElse(s, uncovered(s, by_).state, uncovered(s, by_).out))
  ensures (inv(s) ==> canUncovered(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "uncovered", uncovered(s, by_).state))
{
  StartingAccounted();
}

lemma previewLost_ensures(s: Camera, ticket: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysNoCameraWithoutAccess(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysNothingHeldAway(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysStartsAccounted(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysTorchBelongsToItsPreview(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysLensSettingsValid(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysRecordingHoldsThePreview(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysOneShutterOnTheCamera(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysTheRequestWaitsOnTheCamera(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepALostPreviewFails(s, "previewLost", previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "previewLost", previewLost(s, ticket, by_).state, previewLost(s, ticket, by_).out))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "previewLost", previewLost(s, ticket, by_).state, previewLost(s, ticket, by_).out))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepSoundOnlyWithTheMicrophone(s, previewLost(s, ticket, by_).state, previewLost(s, ticket, by_).out))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepASavedVideoIsTheLast(s, previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepTheShutterNeverFiresCovered(s, previewLost(s, ticket, by_).state, previewLost(s, ticket, by_).out))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepEachRequestIsAnsweredOnce(s, previewLost(s, ticket, by_).state, previewLost(s, ticket, by_).out))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepTheAgentFailsOnlyForCause(s, "previewLost", previewLost(s, ticket, by_).state))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepTheLockScreenOpensNothingElse(s, previewLost(s, ticket, by_).state, previewLost(s, ticket, by_).out))
  ensures (inv(s) ==> canPreviewLost(s, ticket, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "previewLost", previewLost(s, ticket, by_).state))
{
  AnsweringAll();
}

lemma previewStarted_ensures(s: Camera, ticket: int, ok: bool, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysNoCameraWithoutAccess(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysNothingHeldAway(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysStartsAccounted(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysTorchBelongsToItsPreview(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysLensSettingsValid(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysRecordingHoldsThePreview(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysOneShutterOnTheCamera(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysTheRequestWaitsOnTheCamera(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepALostPreviewFails(s, "previewStarted", previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "previewStarted", previewStarted(s, ticket, ok, by_).state, previewStarted(s, ticket, ok, by_).out))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "previewStarted", previewStarted(s, ticket, ok, by_).state, previewStarted(s, ticket, ok, by_).out))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepSoundOnlyWithTheMicrophone(s, previewStarted(s, ticket, ok, by_).state, previewStarted(s, ticket, ok, by_).out))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepASavedVideoIsTheLast(s, previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepTheShutterNeverFiresCovered(s, previewStarted(s, ticket, ok, by_).state, previewStarted(s, ticket, ok, by_).out))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepEachRequestIsAnsweredOnce(s, previewStarted(s, ticket, ok, by_).state, previewStarted(s, ticket, ok, by_).out))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepTheAgentFailsOnlyForCause(s, "previewStarted", previewStarted(s, ticket, ok, by_).state))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepTheLockScreenOpensNothingElse(s, previewStarted(s, ticket, ok, by_).state, previewStarted(s, ticket, ok, by_).out))
  ensures (inv(s) ==> canPreviewStarted(s, ticket, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "previewStarted", previewStarted(s, ticket, ok, by_).state))
{
  AnsweringAll();
  assert previewStarted(s, ticket, ok, by_).state.pending == ProofLib.Filter((set_x: int) => !((set_x in [ticket])), s.pending);
  Dropped(s.pending, [ticket]);
}

lemma staleOpened_ensures(s: Camera, ticket: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysNoCameraWithoutAccess(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysNothingHeldAway(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysStartsAccounted(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysTorchBelongsToItsPreview(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysLensSettingsValid(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysRecordingHoldsThePreview(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysOneShutterOnTheCamera(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysTheRequestWaitsOnTheCamera(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepALostPreviewFails(s, "staleOpened", staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "staleOpened", staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "staleOpened", staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepSoundOnlyWithTheMicrophone(s, staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepASavedVideoIsTheLast(s, staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepTheShutterNeverFiresCovered(s, staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepEachRequestIsAnsweredOnce(s, staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepTheAgentFailsOnlyForCause(s, "staleOpened", staleOpened(s, ticket, by_).state))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepTheLockScreenOpensNothingElse(s, staleOpened(s, ticket, by_).state, staleOpened(s, ticket, by_).out))
  ensures (inv(s) ==> canStaleOpened(s, ticket, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "staleOpened", staleOpened(s, ticket, by_).state))
{
  assert staleOpened(s, ticket, by_).state.pending == ProofLib.Filter((set_x: int) => !((set_x in [ticket])), s.pending);
  Dropped(s.pending, [ticket]);
}

lemma staleFailed_ensures(s: Camera, ticket: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysNoCameraWithoutAccess(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysNothingHeldAway(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysStartsAccounted(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysTorchBelongsToItsPreview(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysLensSettingsValid(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysFocusFollowsTheNewestTap(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysRecordingHoldsThePreview(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysOneShutterOnTheCamera(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysTheRequestWaitsOnTheCamera(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> alwaysSecureShowsOnlyItsSession(staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepALostPreviewFails(s, "staleFailed", staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepARetiredPreviewIsReleased(s, "staleFailed", staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepOneFocusWriteAtATime(s, "staleFailed", staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepSoundOnlyWithTheMicrophone(s, staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepASavedVideoIsTheLast(s, staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepTheShutterNeverFiresCovered(s, staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepEachRequestIsAnsweredOnce(s, staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepTheAgentFailsOnlyForCause(s, "staleFailed", staleFailed(s, ticket, by_)))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepTheLockScreenOpensNothingElse(s, staleFailed(s, ticket, by_), []))
  ensures (inv(s) ==> canStaleFailed(s, ticket, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "staleFailed", staleFailed(s, ticket, by_)))
{
  assert staleFailed(s, ticket, by_).pending == ProofLib.Filter((set_x: int) => !((set_x in [ticket])), s.pending);
  Dropped(s.pending, [ticket]);
}

lemma recordingEnded_ensures(s: Camera, ok: bool, video: int, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysNoCameraWithoutAccess(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysNothingHeldAway(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysStartsAccounted(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysTorchBelongsToItsPreview(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysLensSettingsValid(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysFocusFollowsTheNewestTap(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysRecordingHoldsThePreview(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysOneShutterOnTheCamera(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> alwaysSecureShowsOnlyItsSession(recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepALostPreviewFails(s, "recordingEnded", recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepARetiredPreviewIsReleased(s, "recordingEnded", recordingEnded(s, ok, video, now, by_).state, recordingEnded(s, ok, video, now, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepOneFocusWriteAtATime(s, "recordingEnded", recordingEnded(s, ok, video, now, by_).state, recordingEnded(s, ok, video, now, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, recordingEnded(s, ok, video, now, by_).state, recordingEnded(s, ok, video, now, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepASavedVideoIsTheLast(s, recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepTheShutterNeverFiresCovered(s, recordingEnded(s, ok, video, now, by_).state, recordingEnded(s, ok, video, now, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepEachRequestIsAnsweredOnce(s, recordingEnded(s, ok, video, now, by_).state, recordingEnded(s, ok, video, now, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "recordingEnded", recordingEnded(s, ok, video, now, by_).state))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepTheLockScreenOpensNothingElse(s, recordingEnded(s, ok, video, now, by_).state, recordingEnded(s, ok, video, now, by_).out))
  ensures (inv(s) ==> canRecordingEnded(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "recordingEnded", recordingEnded(s, ok, video, now, by_).state))
{
  if inv(s) && canRecordingEnded(s, by_) {
    var f := app__camera__recording_ended(s.film, ok, video);
    if f.stage.Saved? {
      FilmingSavedInv(f, now, s);
      FilmingSavedStep(f, now, s, "recordingEnded");
    } else if f.stage.Checking? {
      FilmingCheckingInvA(f, now, s);
      FilmingCheckingInvB(f, now, s);
      FilmingCheckingStep(f, now, s);
    } else if f.stage.Empty? {
      FilmingEmptyInv(f, now, s);
      FilmingEmptyStep(f, now, s);
    } else {
      FilmingBrokenInvA(f, now, s);
      FilmingBrokenInvB1(f, now, s);
      FilmingBrokenInvB2(f, now, s);
      FilmingBrokenInvB3(f, now, s);
      FilmingBrokenStepA(f, now, s, "recordingEnded");
      FilmingBrokenStepB(f, now, s, "recordingEnded");
    }
  }
}

lemma recordingVerified_ensures(s: Camera, ok: bool, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysNoCameraWithoutAccess(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysNothingHeldAway(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysStartsAccounted(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysTorchBelongsToItsPreview(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysLensSettingsValid(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysFocusFollowsTheNewestTap(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysRecordingHoldsThePreview(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysOneShutterOnTheCamera(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysSecureShowsOnlyItsSession(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepALostPreviewFails(s, "recordingVerified", recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepARetiredPreviewIsReleased(s, "recordingVerified", recordingVerified(s, ok, now, by_).state, recordingVerified(s, ok, now, by_).out))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepOneFocusWriteAtATime(s, "recordingVerified", recordingVerified(s, ok, now, by_).state, recordingVerified(s, ok, now, by_).out))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, recordingVerified(s, ok, now, by_).state, recordingVerified(s, ok, now, by_).out))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepASavedVideoIsTheLast(s, recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepTheShutterNeverFiresCovered(s, recordingVerified(s, ok, now, by_).state, recordingVerified(s, ok, now, by_).out))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepEachRequestIsAnsweredOnce(s, recordingVerified(s, ok, now, by_).state, recordingVerified(s, ok, now, by_).out))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "recordingVerified", recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepTheLockScreenOpensNothingElse(s, recordingVerified(s, ok, now, by_).state, recordingVerified(s, ok, now, by_).out))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "recordingVerified", recordingVerified(s, ok, now, by_).state))
{
  if inv(s) && canRecordingVerified(s, by_) {
    var f := app__camera__recording_verified(s.film, ok);
    if f.stage.Saved? {
      FilmingSavedInv(f, now, s);
      FilmingSavedStep(f, now, s, "recordingVerified");
    } else {
      FilmingBrokenInvA(f, now, s);
      FilmingBrokenInvB1(f, now, s);
      FilmingBrokenInvB2(f, now, s);
      FilmingBrokenInvB3(f, now, s);
      FilmingBrokenStepA(f, now, s, "recordingVerified");
      FilmingBrokenStepB(f, now, s, "recordingVerified");
    }
  }
}

lemma chunk_ensures(s: Camera, piece: int, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysNoCameraWithoutAccess(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysNothingHeldAway(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysStartsAccounted(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysTorchBelongsToItsPreview(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysLensSettingsValid(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysFocusFollowsTheNewestTap(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysRecordingHoldsThePreview(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysOneShutterOnTheCamera(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysTheRequestWaitsOnTheCamera(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> alwaysSecureShowsOnlyItsSession(chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepALostPreviewFails(s, "chunk", chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepARetiredPreviewIsReleased(s, "chunk", chunk(s, piece, now, by_).state, chunk(s, piece, now, by_).out))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepOneFocusWriteAtATime(s, "chunk", chunk(s, piece, now, by_).state, chunk(s, piece, now, by_).out))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepSoundOnlyWithTheMicrophone(s, chunk(s, piece, now, by_).state, chunk(s, piece, now, by_).out))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepASavedVideoIsTheLast(s, chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepTheShutterNeverFiresCovered(s, chunk(s, piece, now, by_).state, chunk(s, piece, now, by_).out))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepEachRequestIsAnsweredOnce(s, chunk(s, piece, now, by_).state, chunk(s, piece, now, by_).out))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepTheAgentFailsOnlyForCause(s, "chunk", chunk(s, piece, now, by_).state))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepTheLockScreenOpensNothingElse(s, chunk(s, piece, now, by_).state, chunk(s, piece, now, by_).out))
  ensures (inv(s) ==> canChunk(s, piece, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "chunk", chunk(s, piece, now, by_).state))
{
  if inv(s) && canChunk(s, piece, by_) {
    var f := app__camera__recording_chunk(s.film, piece, now);
    assert !f.stage.Saved? && !f.stage.Empty? && !f.stage.Broken?;
  }
}

lemma recordingSize_ensures(s: Camera, total: int, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysNoCameraWithoutAccess(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysNothingHeldAway(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysStartsAccounted(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysTorchBelongsToItsPreview(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysLensSettingsValid(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysFocusFollowsTheNewestTap(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysRecordingHoldsThePreview(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysOneShutterOnTheCamera(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysTheRequestWaitsOnTheCamera(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> alwaysSecureShowsOnlyItsSession(recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepALostPreviewFails(s, "recordingSize", recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepARetiredPreviewIsReleased(s, "recordingSize", recordingSize(s, total, now, by_).state, recordingSize(s, total, now, by_).out))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepOneFocusWriteAtATime(s, "recordingSize", recordingSize(s, total, now, by_).state, recordingSize(s, total, now, by_).out))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepSoundOnlyWithTheMicrophone(s, recordingSize(s, total, now, by_).state, recordingSize(s, total, now, by_).out))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepASavedVideoIsTheLast(s, recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepTheShutterNeverFiresCovered(s, recordingSize(s, total, now, by_).state, recordingSize(s, total, now, by_).out))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepEachRequestIsAnsweredOnce(s, recordingSize(s, total, now, by_).state, recordingSize(s, total, now, by_).out))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepTheAgentFailsOnlyForCause(s, "recordingSize", recordingSize(s, total, now, by_).state))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepTheLockScreenOpensNothingElse(s, recordingSize(s, total, now, by_).state, recordingSize(s, total, now, by_).out))
  ensures (inv(s) ==> canRecordingSize(s, total, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "recordingSize", recordingSize(s, total, now, by_).state))
{
  if inv(s) && canRecordingSize(s, total, by_) {
    chunk_ensures(s, total - s.film.bytes, now, by_);
  }
}

lemma toggleRatio_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysNoCameraWithoutAccess(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysNothingHeldAway(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysStartsAccounted(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysTorchBelongsToItsPreview(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysLensSettingsValid(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysFocusFollowsTheNewestTap(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysRecordingHoldsThePreview(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysOneShutterOnTheCamera(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> alwaysSecureShowsOnlyItsSession(toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepALostPreviewFails(s, "toggleRatio", toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepARetiredPreviewIsReleased(s, "toggleRatio", toggleRatio(s, by_).state, toggleRatio(s, by_).out))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepOneFocusWriteAtATime(s, "toggleRatio", toggleRatio(s, by_).state, toggleRatio(s, by_).out))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, toggleRatio(s, by_).state, toggleRatio(s, by_).out))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepASavedVideoIsTheLast(s, toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepTheShutterNeverFiresCovered(s, toggleRatio(s, by_).state, toggleRatio(s, by_).out))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepEachRequestIsAnsweredOnce(s, toggleRatio(s, by_).state, toggleRatio(s, by_).out))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "toggleRatio", toggleRatio(s, by_).state))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepTheLockScreenOpensNothingElse(s, toggleRatio(s, by_).state, toggleRatio(s, by_).out))
  ensures (inv(s) ==> canToggleRatio(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "toggleRatio", toggleRatio(s, by_).state))
{
  StartingAccounted();
}

lemma agentLens_ensures(s: Camera, requested: RequestedLens, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysNoCameraWithoutAccess(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysNothingHeldAway(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysStartsAccounted(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysTorchBelongsToItsPreview(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysLensSettingsValid(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysFocusFollowsTheNewestTap(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysRecordingHoldsThePreview(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysOneShutterOnTheCamera(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysTheRequestWaitsOnTheCamera(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> alwaysSecureShowsOnlyItsSession(agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepALostPreviewFails(s, "agentLens", agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepARetiredPreviewIsReleased(s, "agentLens", agentLens(s, requested, by_).state, agentLens(s, requested, by_).out))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepOneFocusWriteAtATime(s, "agentLens", agentLens(s, requested, by_).state, agentLens(s, requested, by_).out))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepSoundOnlyWithTheMicrophone(s, agentLens(s, requested, by_).state, agentLens(s, requested, by_).out))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepASavedVideoIsTheLast(s, agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepTheShutterNeverFiresCovered(s, agentLens(s, requested, by_).state, agentLens(s, requested, by_).out))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepEachRequestIsAnsweredOnce(s, agentLens(s, requested, by_).state, agentLens(s, requested, by_).out))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepTheAgentFailsOnlyForCause(s, "agentLens", agentLens(s, requested, by_).state))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepTheLockScreenOpensNothingElse(s, agentLens(s, requested, by_).state, agentLens(s, requested, by_).out))
  ensures (inv(s) ==> canAgentLens(s, requested, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "agentLens", agentLens(s, requested, by_).state))
{
  StartingAccounted();
}
