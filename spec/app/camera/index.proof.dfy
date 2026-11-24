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
  StartingAccounted();
  AnsweringAll();
  RetiringOut();
}

lemma agentAsk_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysNoCameraWithoutAccess(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysNothingHeldAway(agentAsk(s, by_).state))
  ensures (inv(s) ==> canAgentAsk(s, by_) ==> alwaysStartsAccounted(agentAsk(s, by_).state))
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

lemma scanDocument_ensures(s: Camera, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysNoCameraWithoutAccess(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysNothingHeldAway(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysStartsAccounted(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysLensSettingsValid(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysFocusFollowsTheNewestTap(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysRecordingHoldsThePreview(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysOneShutterOnTheCamera(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysTheRequestWaitsOnTheCamera(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> alwaysSecureShowsOnlyItsSession(scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepALostPreviewFails(s, "scanDocument", scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepARetiredPreviewIsReleased(s, "scanDocument", scanDocument(s, now, by_).state, scanDocument(s, now, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepOneFocusWriteAtATime(s, "scanDocument", scanDocument(s, now, by_).state, scanDocument(s, now, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepSoundOnlyWithTheMicrophone(s, scanDocument(s, now, by_).state, scanDocument(s, now, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepASavedVideoIsTheLast(s, scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepTheShutterNeverFiresCovered(s, scanDocument(s, now, by_).state, scanDocument(s, now, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepEachRequestIsAnsweredOnce(s, scanDocument(s, now, by_).state, scanDocument(s, now, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepTheAgentFailsOnlyForCause(s, "scanDocument", scanDocument(s, now, by_).state))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepTheLockScreenOpensNothingElse(s, scanDocument(s, now, by_).state, scanDocument(s, now, by_).out))
  ensures (inv(s) ==> canScanDocument(s, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "scanDocument", scanDocument(s, now, by_).state))
{
  AnsweringAll();
  RetiringOut();
}

lemma flip_ensures(s: Camera, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysNoCameraWithoutAccess(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysNothingHeldAway(flip(s, by_).state))
  ensures (inv(s) ==> canFlip(s, by_) ==> alwaysStartsAccounted(flip(s, by_).state))
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

lemma setRatio_ensures(s: Camera, ratio: Ratio, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysNoCameraWithoutAccess(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysNothingHeldAway(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysStartsAccounted(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysLensSettingsValid(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysFocusFollowsTheNewestTap(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysRecordingHoldsThePreview(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysOneShutterOnTheCamera(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysTheRequestWaitsOnTheCamera(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> alwaysSecureShowsOnlyItsSession(setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepALostPreviewFails(s, "setRatio", setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepARetiredPreviewIsReleased(s, "setRatio", setRatio(s, ratio, by_).state, setRatio(s, ratio, by_).out))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepOneFocusWriteAtATime(s, "setRatio", setRatio(s, ratio, by_).state, setRatio(s, ratio, by_).out))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepSoundOnlyWithTheMicrophone(s, setRatio(s, ratio, by_).state, setRatio(s, ratio, by_).out))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepASavedVideoIsTheLast(s, setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepTheShutterNeverFiresCovered(s, setRatio(s, ratio, by_).state, setRatio(s, ratio, by_).out))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepEachRequestIsAnsweredOnce(s, setRatio(s, ratio, by_).state, setRatio(s, ratio, by_).out))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepTheAgentFailsOnlyForCause(s, "setRatio", setRatio(s, ratio, by_).state))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepTheLockScreenOpensNothingElse(s, setRatio(s, ratio, by_).state, setRatio(s, ratio, by_).out))
  ensures (inv(s) ==> canSetRatio(s, ratio, by_) ==> stepOnlyThisVisitJoinsTheSession(s, "setRatio", setRatio(s, ratio, by_).state))
{
  StartingAccounted();
}

lemma open_ensures(s: Camera, secure: bool, newest: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysNoCameraWithoutAccess(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysNothingHeldAway(open(s, secure, newest, by_).state))
  ensures (inv(s) ==> canOpen(s, by_) ==> alwaysStartsAccounted(open(s, secure, newest, by_).state))
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
  RememberAll();
}

lemma recordingVerified_ensures(s: Camera, ok: bool, now: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysNoCameraWithoutAccess(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysNothingHeldAway(recordingVerified(s, ok, now, by_).state))
  ensures (inv(s) ==> canRecordingVerified(s, by_) ==> alwaysStartsAccounted(recordingVerified(s, ok, now, by_).state))
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
  RememberAll();
}
