lemma opened_ensures(s: Licences, at: int)
  ensures (inv(s) ==> alwaysLicencesAreCountedOnceLoaded(opened_(s, at).state))
  ensures (inv(s) ==> alwaysTheSearchNarrowsTheLoadedList(opened_(s, at).state))
  ensures (inv(s) ==> alwaysALicenceShownWasLoadedAndMatches(opened_(s, at).state))
  ensures (inv(s) ==> stepLicencesLoadOnce(s, "opened", opened_(s, at).state, opened_(s, at).out))
  ensures (inv(s) ==> stepClosingALicenceKeepsTheSearch(s, "opened", opened_(s, at).state))
{
  if inv(s) {
    var after := opened_(s, at);
    if app__settings__timed_busy(s.load) || loadedSome(s) {
      assert after.out == [];
    } else {
      var e := LoadLicences(after.state.load.read.ticket);
      assert after.out == [e];
      assert e in after.out && isLoadLicences(e);
      forall x | x in after.out ensures x.LoadLicences? && x.load == after.state.load.read.ticket {
        assert x == e;
      }
    }
  }
}
