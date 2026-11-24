// spec/app/photos/agent.md: a request that ends emits its answer, the last effect of the
// step; a search confirmed was asked within the limits it reads.

lemma confirm_ensures(s: Helper, revision: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canConfirm(s, revision, by_) ==> alwaysOneRequestAtATime(confirm(s, revision, by_).state))
  ensures (inv(s) ==> canConfirm(s, revision, by_) ==> stepReadsAreConfirmedAndSmall(s, "confirm", confirm(s, revision, by_).state, confirm(s, revision, by_).out))
  ensures (inv(s) ==> canConfirm(s, revision, by_) ==> stepHandsOnlyWhatWasConfirmed(s, "confirm", confirm(s, revision, by_).state, confirm(s, revision, by_).out))
  ensures (inv(s) ==> canConfirm(s, revision, by_) ==> stepAnsweredOnce(s, "confirm", confirm(s, revision, by_).state, confirm(s, revision, by_).out))
{
  if inv(s) && canConfirm(s, revision, by_) {
    var d := confirm(s, revision, by_);
    if !(s.request.ask.Search? || s.request.ask.Inspect?) {
      assert d.out[|d.out| - 1].Answer?;
      assert d.out[|d.out| - 1] in d.out;
    } else if s.request.ask.Search? {
      assert fits(s.request);
    }
  }
}

lemma decline_ensures(s: Helper, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canDecline(s, by_) ==> alwaysOneRequestAtATime(decline(s, by_).state))
  ensures (inv(s) ==> canDecline(s, by_) ==> stepReadsAreConfirmedAndSmall(s, "decline", decline(s, by_).state, decline(s, by_).out))
  ensures (inv(s) ==> canDecline(s, by_) ==> stepHandsOnlyWhatWasConfirmed(s, "decline", decline(s, by_).state, decline(s, by_).out))
  ensures (inv(s) ==> canDecline(s, by_) ==> stepAnsweredOnce(s, "decline", decline(s, by_).state, decline(s, by_).out))
{
  if inv(s) && canDecline(s, by_) {
    var d := decline(s, by_);
    assert d.out[0].Answer?;
    assert d.out[0] in d.out;
  }
}
