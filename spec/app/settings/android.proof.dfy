lemma handOff_ensures(s: Android, page: app__settings_Page, target: Target, channel: int, at: int)
  ensures (inv(s) ==> canHandOff(s, page, target, channel, at) ==> alwaysAlphaSaysWhatAndroidSaid(handOff(s, page, target, channel, at).state))
  ensures (inv(s) ==> canHandOff(s, page, target, channel, at) ==> stepOneAndroidStartAtATime(s, "handOff", handOff(s, page, target, channel, at).state, handOff(s, page, target, channel, at).out))
{
  if inv(s) && canHandOff(s, page, target, channel, at) {
    var after := handOff(s, page, target, channel, at);
    var e := after.out[0];
    assert after.out == [e] && e in after.out && isOpenAndroid(e);
  }
}
