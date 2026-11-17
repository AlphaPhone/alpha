lemma DroppedSound(before: Recent, after: Recent)
  ensures stepAccessNoLongerNamedIsGivenUp(before, after, dropped(before, after))
  ensures stepNamedAccessIsKept(before, after, dropped(before, after))
{
  var F := ProofLib.Filter((r: Row) => ((r.grant != 0) && !(named(after, r.grant))), before.rows);
  var out := dropped(before, after);
  var head := seq(|F|, i requires 0 <= i < |F| => Release(F[i].grant));
  var tail := if ((before.opened_ != 0) && !(named(after, before.opened_))) then [Release(before.opened_)] else [];
  assert out == head + tail;
  forall r | r in before.rows && r.grant != 0 && !named(after, r.grant) ensures releases(out, r.grant) {
    ProofLib.FilterMember((r: Row) => ((r.grant != 0) && !(named(after, r.grant))), before.rows, r);
    var j :| 0 <= j < |F| && F[j] == r;
    assert out[j] == Release(r.grant);
    assert out[j] in out;
  }
  if before.opened_ != 0 && !named(after, before.opened_) {
    assert out[|head|] == Release(before.opened_);
    assert out[|head|] in out;
  }
  forall e | e in out && e.Release? ensures named(before, e.grant) && !named(after, e.grant) {
    var k :| 0 <= k < |out| && out[k] == e;
    if k < |head| {
      ProofLib.FilterMember((r: Row) => ((r.grant != 0) && !(named(after, r.grant))), before.rows, F[k]);
      assert F[k] in before.rows;
    }
  }
}

lemma ListedFirstMembers(row: Row, rows: seq<Row>)
  ensures forall r :: r in listedFirst(row, rows) ==> r == row || r in rows
{
  var l := [row] + ProofLib.Filter((old_: Row) => !(((old_.origin == row.origin) && (old_.key == row.key))), rows);
  assert listedFirst(row, rows) == l || listedFirst(row, rows) == l[0..(|l| - 1)] + l[((|l| - 1) + 1)..];
  forall r | r in listedFirst(row, rows) ensures r == row || r in rows {
    var k :| 0 <= k < |listedFirst(row, rows)| && listedFirst(row, rows)[k] == r;
    assert r in l;
    if r != row {
      var m :| 0 <= m < |l| && l[m] == r;
      assert m > 0;
      assert r in l[1..];
      ProofLib.FilterMember((old_: Row) => !(((old_.origin == row.origin) && (old_.key == row.key))), rows, r);
    }
  }
}

lemma PickerClosedPickers(s: Recent, ticket: int, chose: bool, remember: bool)
  ensures pickerClosed(s, ticket, chose, remember).state.pickers == ProofLib.Filter((t: int) => (t != ticket), s.pickers)
  ensures pickerClosed(s, ticket, chose, remember).state.live == (if (ticket == s.live) then 0 else s.live)
  ensures pickerClosed(s, ticket, chose, remember).state.asked == s.asked
{
}

lemma PickerClosedRows(s: Recent, ticket: int, chose: bool, remember: bool)
  ensures forall r :: r in pickerClosed(s, ticket, chose, remember).state.rows ==> r in s.rows || (r.grant == s.issued + 1 && r.origin == Origin.Picked)
  ensures pickerClosed(s, ticket, chose, remember).state.issued == (if (chose && (ticket == s.live)) then s.issued + 1 else s.issued)
  ensures pickerClosed(s, ticket, chose, remember).state.opened_ == (if (chose && (ticket == s.live)) then s.issued + 1 else s.opened_)
{
  var closed := s.(pickers := Std.Collections.Seq.Filter((t: int) => (t != ticket), s.pickers), live := (if (ticket == s.live) then 0 else s.live));
  TakenFacts(Origin.Picked, 0, remember, closed);
}

lemma TakenFacts(origin: Origin, key: int, remember: bool, s: Recent)
  ensures forall r :: r in taken(origin, key, remember, s).rows ==> r in s.rows || (r.grant == s.issued + 1 && r.origin == origin)
{
  ListedFirstMembers(Row(origin, (if origin.Picked? then (s.issued + 1) else key), (s.issued + 1)), s.rows);
}

lemma openFromFolder_ensures(s: Recent, key: int, remember: bool)
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> alwaysNamedAccessWasGiven(openFromFolder(s, key, remember).state))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> alwaysRecentIsBounded(openFromFolder(s, key, remember).state))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> alwaysAnExportHoldsNoAccess(openFromFolder(s, key, remember).state))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> alwaysOpenPickersWereAsked(openFromFolder(s, key, remember).state))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> alwaysPickersAreCountedFromZero(openFromFolder(s, key, remember).state))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> stepAccessNoLongerNamedIsGivenUp(s, openFromFolder(s, key, remember).state, openFromFolder(s, key, remember).out))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> stepNamedAccessIsKept(s, openFromFolder(s, key, remember).state, openFromFolder(s, key, remember).out))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> stepAccessGivenUpNeverReturns(s, openFromFolder(s, key, remember).state))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> stepAPickerClosesOnce(s, "openFromFolder", openFromFolder(s, key, remember).state))
  ensures (inv(s) ==> canOpenFromFolder(s, key) ==> stepOnlyTheLivePickerDelivers(s, "openFromFolder", openFromFolder(s, key, remember).state))
{
  if inv(s) && canOpenFromFolder(s, key) {
    var after := openFromFolder(s, key, remember).state;
    TakenFacts(Origin.InFolder, key, remember, s);
    DroppedSound(s, after);
  }
}

lemma reopen_ensures(s: Recent, row: Row)
  ensures (inv(s) ==> canReopen(s, row) ==> alwaysNamedAccessWasGiven(reopen(s, row).state))
  ensures (inv(s) ==> canReopen(s, row) ==> alwaysRecentIsBounded(reopen(s, row).state))
  ensures (inv(s) ==> canReopen(s, row) ==> alwaysAnExportHoldsNoAccess(reopen(s, row).state))
  ensures (inv(s) ==> canReopen(s, row) ==> alwaysOpenPickersWereAsked(reopen(s, row).state))
  ensures (inv(s) ==> canReopen(s, row) ==> alwaysPickersAreCountedFromZero(reopen(s, row).state))
  ensures (inv(s) ==> canReopen(s, row) ==> stepAccessNoLongerNamedIsGivenUp(s, reopen(s, row).state, reopen(s, row).out))
  ensures (inv(s) ==> canReopen(s, row) ==> stepNamedAccessIsKept(s, reopen(s, row).state, reopen(s, row).out))
  ensures (inv(s) ==> canReopen(s, row) ==> stepAccessGivenUpNeverReturns(s, reopen(s, row).state))
  ensures (inv(s) ==> canReopen(s, row) ==> stepAPickerClosesOnce(s, "reopen", reopen(s, row).state))
  ensures (inv(s) ==> canReopen(s, row) ==> stepOnlyTheLivePickerDelivers(s, "reopen", reopen(s, row).state))
{
  if inv(s) && canReopen(s, row) {
    var after := reopen(s, row).state;
    ListedFirstMembers(row, s.rows);
    DroppedSound(s, after);
  }
}

lemma exported_ensures(s: Recent, key: int)
  ensures (inv(s) ==> alwaysNamedAccessWasGiven(exported(s, key).state))
  ensures (inv(s) ==> alwaysRecentIsBounded(exported(s, key).state))
  ensures (inv(s) ==> alwaysAnExportHoldsNoAccess(exported(s, key).state))
  ensures (inv(s) ==> alwaysOpenPickersWereAsked(exported(s, key).state))
  ensures (inv(s) ==> alwaysPickersAreCountedFromZero(exported(s, key).state))
  ensures (inv(s) ==> stepAccessNoLongerNamedIsGivenUp(s, exported(s, key).state, exported(s, key).out))
  ensures (inv(s) ==> stepNamedAccessIsKept(s, exported(s, key).state, exported(s, key).out))
  ensures (inv(s) ==> stepAccessGivenUpNeverReturns(s, exported(s, key).state))
  ensures (inv(s) ==> stepAPickerClosesOnce(s, "exported", exported(s, key).state))
  ensures (inv(s) ==> stepOnlyTheLivePickerDelivers(s, "exported", exported(s, key).state))
{
  if inv(s) {
    var after := exported(s, key).state;
    ListedFirstMembers(Row(Origin.Exported, key, 0), s.rows);
    DroppedSound(s, after);
  }
}

lemma close_ensures(s: Recent, forget: bool)
  ensures (inv(s) ==> canClose(s) ==> alwaysNamedAccessWasGiven(close(s, forget).state))
  ensures (inv(s) ==> canClose(s) ==> alwaysRecentIsBounded(close(s, forget).state))
  ensures (inv(s) ==> canClose(s) ==> alwaysAnExportHoldsNoAccess(close(s, forget).state))
  ensures (inv(s) ==> canClose(s) ==> alwaysOpenPickersWereAsked(close(s, forget).state))
  ensures (inv(s) ==> canClose(s) ==> alwaysPickersAreCountedFromZero(close(s, forget).state))
  ensures (inv(s) ==> canClose(s) ==> stepAccessNoLongerNamedIsGivenUp(s, close(s, forget).state, close(s, forget).out))
  ensures (inv(s) ==> canClose(s) ==> stepNamedAccessIsKept(s, close(s, forget).state, close(s, forget).out))
  ensures (inv(s) ==> canClose(s) ==> stepAccessGivenUpNeverReturns(s, close(s, forget).state))
  ensures (inv(s) ==> canClose(s) ==> stepAPickerClosesOnce(s, "close", close(s, forget).state))
  ensures (inv(s) ==> canClose(s) ==> stepOnlyTheLivePickerDelivers(s, "close", close(s, forget).state))
{
  if inv(s) && canClose(s) {
    var after := close(s, forget).state;
    if forget {
      forall r | r in after.rows ensures r in s.rows {
        ProofLib.FilterMember((r: Row) => (r.grant != s.opened_), s.rows, r);
      }
    }
    DroppedSound(s, after);
  }
}

lemma lapsed_ensures(s: Recent, grant: int)
  ensures (inv(s) ==> canLapsed(s, grant) ==> alwaysNamedAccessWasGiven(lapsed(s, grant).state))
  ensures (inv(s) ==> canLapsed(s, grant) ==> alwaysRecentIsBounded(lapsed(s, grant).state))
  ensures (inv(s) ==> canLapsed(s, grant) ==> alwaysAnExportHoldsNoAccess(lapsed(s, grant).state))
  ensures (inv(s) ==> canLapsed(s, grant) ==> alwaysOpenPickersWereAsked(lapsed(s, grant).state))
  ensures (inv(s) ==> canLapsed(s, grant) ==> alwaysPickersAreCountedFromZero(lapsed(s, grant).state))
  ensures (inv(s) ==> canLapsed(s, grant) ==> stepAccessNoLongerNamedIsGivenUp(s, lapsed(s, grant).state, lapsed(s, grant).out))
  ensures (inv(s) ==> canLapsed(s, grant) ==> stepNamedAccessIsKept(s, lapsed(s, grant).state, lapsed(s, grant).out))
  ensures (inv(s) ==> canLapsed(s, grant) ==> stepAccessGivenUpNeverReturns(s, lapsed(s, grant).state))
  ensures (inv(s) ==> canLapsed(s, grant) ==> stepAPickerClosesOnce(s, "lapsed", lapsed(s, grant).state))
  ensures (inv(s) ==> canLapsed(s, grant) ==> stepOnlyTheLivePickerDelivers(s, "lapsed", lapsed(s, grant).state))
{
  if inv(s) && canLapsed(s, grant) {
    DroppedSound(s, lapsed(s, grant).state);
  }
}

lemma sessionEnded_ensures(s: Recent)
  ensures (inv(s) ==> alwaysNamedAccessWasGiven(sessionEnded(s).state))
  ensures (inv(s) ==> alwaysRecentIsBounded(sessionEnded(s).state))
  ensures (inv(s) ==> alwaysAnExportHoldsNoAccess(sessionEnded(s).state))
  ensures (inv(s) ==> alwaysOpenPickersWereAsked(sessionEnded(s).state))
  ensures (inv(s) ==> alwaysPickersAreCountedFromZero(sessionEnded(s).state))
  ensures (inv(s) ==> stepAccessNoLongerNamedIsGivenUp(s, sessionEnded(s).state, sessionEnded(s).out))
  ensures (inv(s) ==> stepNamedAccessIsKept(s, sessionEnded(s).state, sessionEnded(s).out))
  ensures (inv(s) ==> stepAccessGivenUpNeverReturns(s, sessionEnded(s).state))
  ensures (inv(s) ==> stepAPickerClosesOnce(s, "sessionEnded", sessionEnded(s).state))
  ensures (inv(s) ==> stepOnlyTheLivePickerDelivers(s, "sessionEnded", sessionEnded(s).state))
{
  if inv(s) {
    DroppedSound(s, sessionEnded(s).state);
  }
}

lemma restart_ensures(s: Recent)
  ensures (inv(s) ==> alwaysNamedAccessWasGiven(restart(s).state))
  ensures (inv(s) ==> alwaysRecentIsBounded(restart(s).state))
  ensures (inv(s) ==> alwaysAnExportHoldsNoAccess(restart(s).state))
  ensures (inv(s) ==> alwaysOpenPickersWereAsked(restart(s).state))
  ensures (inv(s) ==> alwaysPickersAreCountedFromZero(restart(s).state))
  ensures (inv(s) ==> stepAccessNoLongerNamedIsGivenUp(s, restart(s).state, restart(s).out))
  ensures (inv(s) ==> stepNamedAccessIsKept(s, restart(s).state, restart(s).out))
  ensures (inv(s) ==> stepAccessGivenUpNeverReturns(s, restart(s).state))
  ensures (inv(s) ==> stepAPickerClosesOnce(s, "restart", restart(s).state))
  ensures (inv(s) ==> stepOnlyTheLivePickerDelivers(s, "restart", restart(s).state))
{
  if inv(s) {
    DroppedSound(s, restart(s).state);
  }
}

lemma openPicker_ensures(s: Recent)
  ensures (inv(s) ==> alwaysNamedAccessWasGiven(openPicker(s).state))
  ensures (inv(s) ==> alwaysRecentIsBounded(openPicker(s).state))
  ensures (inv(s) ==> alwaysAnExportHoldsNoAccess(openPicker(s).state))
  ensures (inv(s) ==> alwaysOpenPickersWereAsked(openPicker(s).state))
  ensures (inv(s) ==> alwaysPickersAreCountedFromZero(openPicker(s).state))
  ensures (inv(s) ==> stepAccessNoLongerNamedIsGivenUp(s, openPicker(s).state, openPicker(s).out))
  ensures (inv(s) ==> stepNamedAccessIsKept(s, openPicker(s).state, openPicker(s).out))
  ensures (inv(s) ==> stepAccessGivenUpNeverReturns(s, openPicker(s).state))
  ensures (inv(s) ==> stepAPickerClosesOnce(s, "openPicker", openPicker(s).state))
  ensures (inv(s) ==> stepOnlyTheLivePickerDelivers(s, "openPicker", openPicker(s).state))
{
  if inv(s) {
    var after := openPicker(s).state;
    assert after.pickers == s.pickers + [s.asked + 1];
    assert after.asked == s.asked + 1;
    assert alwaysOpenPickersWereAsked(s);
    assert forall t :: t in s.pickers ==> t > 0 && t <= s.asked;
    forall t | t in after.pickers ensures t > 0 && t <= after.asked {
      if t in s.pickers {
        assert t > 0 && t <= s.asked;
      } else {
        assert t == s.asked + 1;
      }
    }
    assert after.pickers[|s.pickers|] == after.live;
    assert after.live in after.pickers;
  }
}

lemma pickerClosed_ensures(s: Recent, ticket: int, chose: bool, remember: bool)
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> alwaysNamedAccessWasGiven(pickerClosed(s, ticket, chose, remember).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> alwaysRecentIsBounded(pickerClosed(s, ticket, chose, remember).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> alwaysAnExportHoldsNoAccess(pickerClosed(s, ticket, chose, remember).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> alwaysOpenPickersWereAsked(pickerClosed(s, ticket, chose, remember).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> alwaysPickersAreCountedFromZero(pickerClosed(s, ticket, chose, remember).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> stepAccessNoLongerNamedIsGivenUp(s, pickerClosed(s, ticket, chose, remember).state, pickerClosed(s, ticket, chose, remember).out))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> stepNamedAccessIsKept(s, pickerClosed(s, ticket, chose, remember).state, pickerClosed(s, ticket, chose, remember).out))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> stepAccessGivenUpNeverReturns(s, pickerClosed(s, ticket, chose, remember).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> stepAPickerClosesOnce(s, "pickerClosed", pickerClosed(s, ticket, chose, remember).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket) ==> stepOnlyTheLivePickerDelivers(s, "pickerClosed", pickerClosed(s, ticket, chose, remember).state))
{
  if inv(s) && canPickerClosed(s, ticket) {
    PickerClosedPickers(s, ticket, chose, remember);
    PickerClosedRows(s, ticket, chose, remember);
    var after := pickerClosed(s, ticket, chose, remember).state;
    forall t | t in after.pickers ensures t in s.pickers && t != ticket {
      ProofLib.FilterMember((t: int) => (t != ticket), s.pickers, t);
    }
    if after.live != 0 {
      ProofLib.FilterMember((t: int) => (t != ticket), s.pickers, after.live);
    }
    ProofLib.FilterMember((t: int) => (t != ticket), s.pickers, s.live);
    DroppedSound(s, after);
  }
}
