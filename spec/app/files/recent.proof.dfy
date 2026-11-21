lemma FilterLength<T>(p: T -> bool, xs: seq<T>)
  ensures |ProofLib.Filter(p, xs)| <= |xs|
  decreases |xs|
{
  if |xs| == 0 {
    ProofLib.FilterNil(p, xs);
  } else {
    ProofLib.FilterCons(p, xs);
    FilterLength(p, xs[1..]);
  }
}

lemma FilterShorter<T>(p: T -> bool, xs: seq<T>, x: T)
  requires x in xs && !p(x)
  ensures |ProofLib.Filter(p, xs)| < |xs|
  decreases |xs|
{
  ProofLib.FilterCons(p, xs);
  if xs[0] == x {
    FilterLength(p, xs[1..]);
  } else {
    FilterShorter(p, xs[1..], x);
  }
}

lemma DroppedSound(before: Recent, after: Recent, extra: seq<Effect>)
  requires forall e :: e in extra ==> !e.Release?
  ensures stepAccessNoLongerNamedIsGivenUp(before, after, dropped(before, after) + extra)
  ensures stepNamedAccessIsKept(before, after, dropped(before, after) + extra)
  ensures stepAccessNoLongerNamedIsGivenUp(before, after, dropped(before, after))
  ensures stepNamedAccessIsKept(before, after, dropped(before, after))
{
  var F := ProofLib.Filter((r: Row) => ((r.grant != 0) && !(named(after, r.grant))), before.rows);
  var head := seq(|F|, i requires 0 <= i < |F| => Release(F[i].grant));
  assert dropped(before, after) == head;
  forall o: seq<Effect> | o == head || o == head + extra
    ensures stepAccessNoLongerNamedIsGivenUp(before, after, o) && stepNamedAccessIsKept(before, after, o)
  {
    forall r | r in before.rows && r.grant != 0 && !named(after, r.grant) ensures releases(o, r.grant) {
      ProofLib.FilterMember((r: Row) => ((r.grant != 0) && !(named(after, r.grant))), before.rows, r);
      var j :| 0 <= j < |F| && F[j] == r;
      assert o[j] == Release(r.grant);
      assert o[j] in o;
    }
    forall e | e in o && e.Release? ensures named(before, e.grant) && !named(after, e.grant) {
      var k :| 0 <= k < |o| && o[k] == e;
      if k < |head| {
        ProofLib.FilterMember((r: Row) => ((r.grant != 0) && !(named(after, r.grant))), before.rows, F[k]);
        assert F[k] in before.rows;
      } else {
        assert o[k] in extra;
      }
    }
  }
}

lemma ListedFirstMembers(row: Row, rows: seq<Row>)
  ensures forall r :: r in listedFirst(row, rows) ==> r == row || r in rows
  ensures row in listedFirst(row, rows)
  ensures |rows| <= limit ==> |listedFirst(row, rows)| <= limit
{
  var l := [row] + ProofLib.Filter((old_: Row) => !(((old_.origin == row.origin) && (old_.key == row.key))), rows);
  FilterLength((old_: Row) => !(((old_.origin == row.origin) && (old_.key == row.key))), rows);
  assert listedFirst(row, rows) == l || listedFirst(row, rows) == l[0..(|l| - 1)] + l[((|l| - 1) + 1)..];
  assert l[0] == row;
  forall r | r in listedFirst(row, rows) ensures r == row || r in rows {
    assert r in l;
    if r != row {
      var m :| 0 <= m < |l| && l[m] == r;
      assert m > 0;
      assert r in l[1..];
      ProofLib.FilterMember((old_: Row) => !(((old_.origin == row.origin) && (old_.key == row.key))), rows, r);
    }
  }
  if listedFirst(row, rows) != l {
    assert |l| > limit;
    assert listedFirst(row, rows)[0] == row;
  }
}

lemma PickerClosedShape(s: Recent, ticket: int, chose: bool, keep: bool, by_: Actor)
  ensures var delivers := chose && ticket == s.live; var closed := s.(pickers := Std.Collections.Seq.Filter((t: int) => (t != ticket), s.pickers), live := (if (ticket == s.live) then 0 else s.live), replacing := (if (ticket == s.live) then 0 else s.replacing)); var cleared := (if (delivers && (s.replacing != 0)) then closed.(rows := Std.Collections.Seq.Filter((r: Row) => !(((r.key == s.replacing) && (r.grant == 0))), closed.rows)) else closed); var listed := delivers && (keep || s.replacing != 0); pickerClosed(s, ticket, chose, keep, by_).state == (if listed then given(Origin.Picked, 0, cleared) else (if delivers then cleared.(issued := (s.issued + 1)) else cleared)) && pickerClosed(s, ticket, chose, keep, by_).out == dropped(s, pickerClosed(s, ticket, chose, keep, by_).state) + (if delivers then [Open((s.issued + 1), (if listed then (s.issued + 1) else 0))] else [])
{
}

lemma GivenFacts(origin: Origin, key: int, s: Recent)
  ensures forall r :: r in given(origin, key, s).rows ==> r in s.rows || (r.grant == s.issued + 1 && r.origin == origin)
  ensures given(origin, key, s).issued == s.issued + 1
  ensures exists r :: r in given(origin, key, s).rows && r.grant == s.issued + 1 && r.key == (if origin.Picked? then s.issued + 1 else key)
{
  var row := Row(origin, (if origin.Picked? then (s.issued + 1) else key), (s.issued + 1));
  ListedFirstMembers(row, s.rows);
}

lemma remember_ensures(s: Recent, key: int, by_: Actor)
  ensures (inv(s) ==> canRemember(s, key, by_) ==> alwaysNamedAccessWasGiven(remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> alwaysRecentIsBounded(remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> alwaysOpenPickersWereAsked(remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, remember(s, key, by_).state, remember(s, key, by_).out))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepNamedAccessIsKept(s, remember(s, key, by_).state, remember(s, key, by_).out))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepAccessGivenUpNeverReturns(s, remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepARowOpensOnlyWithAccess(s, remember(s, key, by_).state, remember(s, key, by_).out))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepAForgottenRowIsGone(s, "remember", remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepAGoneFileLeavesTheList(s, "remember", remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepARestartEndsTheSession(s, "remember", remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepAPickerClosesOnce(s, "remember", remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepOnlyTheLivePickerDelivers(s, "remember", remember(s, key, by_).state))
  ensures (inv(s) ==> canRemember(s, key, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "remember", remember(s, key, by_).state))
{
  if inv(s) && canRemember(s, key, by_) {
    var m := remember(s, key, by_);
    GivenFacts(Origin.InFolder, key, s);
    DroppedSound(s, m.state, []);
  }
}

lemma exported_ensures(s: Recent, key: int, by_: Actor)
  ensures (inv(s) ==> canExported(s, key, by_) ==> alwaysNamedAccessWasGiven(exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> alwaysRecentIsBounded(exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> alwaysOpenPickersWereAsked(exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, exported(s, key, by_).state, exported(s, key, by_).out))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepNamedAccessIsKept(s, exported(s, key, by_).state, exported(s, key, by_).out))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepAccessGivenUpNeverReturns(s, exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepARowOpensOnlyWithAccess(s, exported(s, key, by_).state, exported(s, key, by_).out))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepAForgottenRowIsGone(s, "exported", exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepAGoneFileLeavesTheList(s, "exported", exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepARestartEndsTheSession(s, "exported", exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepAPickerClosesOnce(s, "exported", exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepOnlyTheLivePickerDelivers(s, "exported", exported(s, key, by_).state))
  ensures (inv(s) ==> canExported(s, key, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "exported", exported(s, key, by_).state))
{
  if inv(s) && canExported(s, key, by_) {
    var m := exported(s, key, by_);
    GivenFacts(Origin.Exported, key, s);
    DroppedSound(s, m.state, []);
  }
}

lemma reached_ensures(s: Recent, ticket: int, ok: bool, ended: bool, by_: Actor)
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> alwaysNamedAccessWasGiven(reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> alwaysRecentIsBounded(reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> alwaysOpenPickersWereAsked(reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, reached(s, ticket, ok, ended, by_).state, reached(s, ticket, ok, ended, by_).out))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepNamedAccessIsKept(s, reached(s, ticket, ok, ended, by_).state, reached(s, ticket, ok, ended, by_).out))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepAccessGivenUpNeverReturns(s, reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepARowOpensOnlyWithAccess(s, reached(s, ticket, ok, ended, by_).state, reached(s, ticket, ok, ended, by_).out))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepAForgottenRowIsGone(s, "reached", reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepAGoneFileLeavesTheList(s, "reached", reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepARestartEndsTheSession(s, "reached", reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepAPickerClosesOnce(s, "reached", reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepOnlyTheLivePickerDelivers(s, "reached", reached(s, ticket, ok, ended, by_).state))
  ensures (inv(s) ==> canReached(s, ticket, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "reached", reached(s, ticket, ok, ended, by_).state))
{
  if inv(s) && canReached(s, ticket, by_) {
    var m := reached(s, ticket, ok, ended, by_);
    ListedFirstMembers(s.asked, s.rows);
    DroppedSound(s, m.state, (if (ok && (s.asked in s.rows)) then [Open(s.asked.key, s.asked.grant)] else []));
  }
}

lemma forget_ensures(s: Recent, row: Row, by_: Actor)
  ensures (inv(s) ==> canForget(s, row, by_) ==> alwaysNamedAccessWasGiven(forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> alwaysRecentIsBounded(forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> alwaysOpenPickersWereAsked(forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, forget(s, row, by_).state, forget(s, row, by_).out))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepNamedAccessIsKept(s, forget(s, row, by_).state, forget(s, row, by_).out))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepAccessGivenUpNeverReturns(s, forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepARowOpensOnlyWithAccess(s, forget(s, row, by_).state, forget(s, row, by_).out))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepAForgottenRowIsGone(s, "forget", forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepAGoneFileLeavesTheList(s, "forget", forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepARestartEndsTheSession(s, "forget", forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepAPickerClosesOnce(s, "forget", forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepOnlyTheLivePickerDelivers(s, "forget", forget(s, row, by_).state))
  ensures (inv(s) ==> canForget(s, row, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "forget", forget(s, row, by_).state))
{
  if inv(s) && canForget(s, row, by_) {
    var m := forget(s, row, by_);
    assert m.state.rows == ProofLib.Filter((r: Row) => (r != row), s.rows);
    forall r | r in m.state.rows ensures r in s.rows {
      ProofLib.FilterMember((r: Row) => (r != row), s.rows, r);
    }
    FilterShorter((r: Row) => (r != row), s.rows, row);
    DroppedSound(s, m.state, []);
  }
}

lemma gone_ensures(s: Recent, key: int, by_: Actor)
  ensures (inv(s) ==> canGone(s, key, by_) ==> alwaysNamedAccessWasGiven(gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> alwaysRecentIsBounded(gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> alwaysOpenPickersWereAsked(gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, gone(s, key, by_).state, gone(s, key, by_).out))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepNamedAccessIsKept(s, gone(s, key, by_).state, gone(s, key, by_).out))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepAccessGivenUpNeverReturns(s, gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepARowOpensOnlyWithAccess(s, gone(s, key, by_).state, gone(s, key, by_).out))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepAForgottenRowIsGone(s, "gone", gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepAGoneFileLeavesTheList(s, "gone", gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepARestartEndsTheSession(s, "gone", gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepAPickerClosesOnce(s, "gone", gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepOnlyTheLivePickerDelivers(s, "gone", gone(s, key, by_).state))
  ensures (inv(s) ==> canGone(s, key, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "gone", gone(s, key, by_).state))
{
  if inv(s) && canGone(s, key, by_) {
    var m := gone(s, key, by_);
    assert m.state.rows == ProofLib.Filter((r: Row) => (r.origin.Picked? || (r.key != key)), s.rows);
    forall r | r in m.state.rows ensures r in s.rows {
      ProofLib.FilterMember((r: Row) => (r.origin.Picked? || (r.key != key)), s.rows, r);
    }
    var x :| x in s.rows && !x.origin.Picked? && x.key == key;
    FilterShorter((r: Row) => (r.origin.Picked? || (r.key != key)), s.rows, x);
    DroppedSound(s, m.state, []);
  }
}

lemma lapsed_ensures(s: Recent, key: int, by_: Actor)
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> alwaysNamedAccessWasGiven(lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> alwaysRecentIsBounded(lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> alwaysOpenPickersWereAsked(lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, lapsed(s, key, by_).state, lapsed(s, key, by_).out))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepNamedAccessIsKept(s, lapsed(s, key, by_).state, lapsed(s, key, by_).out))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepAccessGivenUpNeverReturns(s, lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepARowOpensOnlyWithAccess(s, lapsed(s, key, by_).state, lapsed(s, key, by_).out))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepAForgottenRowIsGone(s, "lapsed", lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepAGoneFileLeavesTheList(s, "lapsed", lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepARestartEndsTheSession(s, "lapsed", lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepAPickerClosesOnce(s, "lapsed", lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepOnlyTheLivePickerDelivers(s, "lapsed", lapsed(s, key, by_).state))
  ensures (inv(s) ==> canLapsed(s, key, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "lapsed", lapsed(s, key, by_).state))
{
  if inv(s) && canLapsed(s, key, by_) {
    var m := lapsed(s, key, by_);
    DroppedSound(s, m.state, []);
  }
}

lemma sessionEnded_ensures(s: Recent, by_: Actor)
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> alwaysNamedAccessWasGiven(sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> alwaysRecentIsBounded(sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> alwaysOpenPickersWereAsked(sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, sessionEnded(s, by_).state, sessionEnded(s, by_).out))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepNamedAccessIsKept(s, sessionEnded(s, by_).state, sessionEnded(s, by_).out))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepAccessGivenUpNeverReturns(s, sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepARowOpensOnlyWithAccess(s, sessionEnded(s, by_).state, sessionEnded(s, by_).out))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepAForgottenRowIsGone(s, "sessionEnded", sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepAGoneFileLeavesTheList(s, "sessionEnded", sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepARestartEndsTheSession(s, "sessionEnded", sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepAPickerClosesOnce(s, "sessionEnded", sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepOnlyTheLivePickerDelivers(s, "sessionEnded", sessionEnded(s, by_).state))
  ensures (inv(s) ==> canSessionEnded(s, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "sessionEnded", sessionEnded(s, by_).state))
{
  if inv(s) && canSessionEnded(s, by_) {
    var m := sessionEnded(s, by_);
    DroppedSound(s, m.state, []);
  }
}

lemma restart_ensures(s: Recent, by_: Actor)
  ensures (inv(s) ==> canRestart(s, by_) ==> alwaysNamedAccessWasGiven(restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> alwaysRecentIsBounded(restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> alwaysOpenPickersWereAsked(restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, restart(s, by_).state, restart(s, by_).out))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepNamedAccessIsKept(s, restart(s, by_).state, restart(s, by_).out))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepAccessGivenUpNeverReturns(s, restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepARowOpensOnlyWithAccess(s, restart(s, by_).state, restart(s, by_).out))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepAForgottenRowIsGone(s, "restart", restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepAGoneFileLeavesTheList(s, "restart", restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepARestartEndsTheSession(s, "restart", restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepAPickerClosesOnce(s, "restart", restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepOnlyTheLivePickerDelivers(s, "restart", restart(s, by_).state))
  ensures (inv(s) ==> canRestart(s, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "restart", restart(s, by_).state))
{
  if inv(s) && canRestart(s, by_) {
    var m := restart(s, by_);
    DroppedSound(s, m.state, []);
  }
}

lemma openPicker_ensures(s: Recent, replacing: int, by_: Actor)
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> alwaysNamedAccessWasGiven(openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> alwaysRecentIsBounded(openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> alwaysOpenPickersWereAsked(openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, openPicker(s, replacing, by_).state, openPicker(s, replacing, by_).out))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepNamedAccessIsKept(s, openPicker(s, replacing, by_).state, openPicker(s, replacing, by_).out))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepAccessGivenUpNeverReturns(s, openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepARowOpensOnlyWithAccess(s, openPicker(s, replacing, by_).state, openPicker(s, replacing, by_).out))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepAForgottenRowIsGone(s, "openPicker", openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepAGoneFileLeavesTheList(s, "openPicker", openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepARestartEndsTheSession(s, "openPicker", openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepAPickerClosesOnce(s, "openPicker", openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepOnlyTheLivePickerDelivers(s, "openPicker", openPicker(s, replacing, by_).state))
  ensures (inv(s) ==> canOpenPicker(s, replacing, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "openPicker", openPicker(s, replacing, by_).state))
{
  if inv(s) && canOpenPicker(s, replacing, by_) {
    var after := openPicker(s, replacing, by_).state;
    forall t | t in after.pickers ensures t > 0 && t <= after.opened_ {
      if t !in s.pickers {
        assert t == s.opened_ + 1;
      }
    }
    assert after.pickers[|s.pickers|] == after.live;
  }
}

lemma pickerClosed_ensures(s: Recent, ticket: int, chose: bool, keep: bool, by_: Actor)
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> alwaysNamedAccessWasGiven(pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> alwaysRecentIsBounded(pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> alwaysOpenPickersWereAsked(pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepAccessNoLongerNamedIsGivenUp(s, pickerClosed(s, ticket, chose, keep, by_).state, pickerClosed(s, ticket, chose, keep, by_).out))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepNamedAccessIsKept(s, pickerClosed(s, ticket, chose, keep, by_).state, pickerClosed(s, ticket, chose, keep, by_).out))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepAccessGivenUpNeverReturns(s, pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepARowOpensOnlyWithAccess(s, pickerClosed(s, ticket, chose, keep, by_).state, pickerClosed(s, ticket, chose, keep, by_).out))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepAForgottenRowIsGone(s, "pickerClosed", pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepAGoneFileLeavesTheList(s, "pickerClosed", pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepARestartEndsTheSession(s, "pickerClosed", pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepAPickerClosesOnce(s, "pickerClosed", pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepOnlyTheLivePickerDelivers(s, "pickerClosed", pickerClosed(s, ticket, chose, keep, by_).state))
  ensures (inv(s) ==> canPickerClosed(s, ticket, by_) ==> stepASelectedFileReplacesItsLapsedRow(s, "pickerClosed", pickerClosed(s, ticket, chose, keep, by_).state))
{
  if inv(s) && canPickerClosed(s, ticket, by_) {
    var delivers := chose && ticket == s.live;
    var closed := s.(pickers := Std.Collections.Seq.Filter((t: int) => (t != ticket), s.pickers), live := (if (ticket == s.live) then 0 else s.live), replacing := (if (ticket == s.live) then 0 else s.replacing));
    var cleared := (if (delivers && (s.replacing != 0)) then closed.(rows := Std.Collections.Seq.Filter((r: Row) => !(((r.key == s.replacing) && (r.grant == 0))), closed.rows)) else closed);
    var listed := delivers && (keep || s.replacing != 0);
    PickerClosedShape(s, ticket, chose, keep, by_);
    var m := pickerClosed(s, ticket, chose, keep, by_);
    var after := m.state;
    assert after.pickers == ProofLib.Filter((t: int) => (t != ticket), s.pickers);
    forall t | t in after.pickers ensures t in s.pickers && t != ticket {
      ProofLib.FilterMember((t: int) => (t != ticket), s.pickers, t);
    }
    FilterShorter((t: int) => (t != ticket), s.pickers, ticket);
    if after.live != 0 {
      ProofLib.FilterMember((t: int) => (t != ticket), s.pickers, after.live);
    }
    ProofLib.FilterMember((t: int) => (t != ticket), s.pickers, s.live);
    if delivers && s.replacing != 0 {
      assert cleared.rows == ProofLib.Filter((r: Row) => !(((r.key == s.replacing) && (r.grant == 0))), s.rows);
      forall r | r in cleared.rows ensures r in s.rows && !(r.key == s.replacing && r.grant == 0) {
        ProofLib.FilterMember((r: Row) => !(((r.key == s.replacing) && (r.grant == 0))), s.rows, r);
      }
    } else {
      assert cleared.rows == s.rows;
    }
    if listed {
      GivenFacts(Origin.Picked, 0, cleared);
      assert after.rows == given(Origin.Picked, 0, cleared).rows;
    } else {
      assert after.rows == cleared.rows;
    }
    forall r | r in after.rows ensures r.grant == 0 || named(s, r.grant) || r.grant > s.issued {
      if r in s.rows && r.grant != 0 {
        assert named(s, r.grant);
      }
    }
    DroppedSound(s, after, (if delivers then [Open((s.issued + 1), (if listed then (s.issued + 1) else 0))] else []));
  }
}
