lemma handOff_ensures(s: Android, page: app__settings_Page, target: Target, channel: int, at: int)
  ensures (inv(s) ==> canHandOff(s, page, target, channel, at) ==> alwaysAlphaSaysWhatAndroidSaid(handOff(s, page, target, channel, at).state))
  ensures (inv(s) ==> canHandOff(s, page, target, channel, at) ==> stepOneAndroidStartAtATime(s, "handOff", handOff(s, page, target, channel, at).state, handOff(s, page, target, channel, at).out))
{
  if inv(s) && canHandOff(s, page, target, channel, at) {
    var after := handOff(s, page, target, channel, at);
    var eff := OpenAndroid(target, channel, scopeOf(target), after.state.start.read.ticket);
    assert after.out == [eff];
    assert eff in after.out && isOpenAndroid(eff);
    assert forall e :: e in after.out ==> e == eff;
  }
}
