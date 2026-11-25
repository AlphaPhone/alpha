lemma UniqueFromCounts(xs: seq<AlertEntry>)
  requires forall e :: e in xs ==> |ProofLib.Filter((f: AlertEntry) => (f.id == e.id), xs)| == 1
  ensures ProofLib.DistinctBy(xs, (e: AlertEntry) => e.id)
{
  var key := (e: AlertEntry) => e.id;
  forall i, j | 0 <= i < |xs| && 0 <= j < |xs| && i != j
    ensures key(xs[i]) != key(xs[j])
  {
    var p := (f: AlertEntry) => (f.id == xs[i].id);
    assert xs[i] in xs;
    ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  }
}

lemma CountsFromUnique(xs: seq<AlertEntry>)
  requires ProofLib.DistinctBy(xs, (e: AlertEntry) => e.id)
  ensures forall e :: e in xs ==> |ProofLib.Filter((f: AlertEntry) => (f.id == e.id), xs)| == 1
{
  var key := (e: AlertEntry) => e.id;
  forall e | e in xs
    ensures |ProofLib.Filter((f: AlertEntry) => (f.id == e.id), xs)| == 1
  {
    var i :| 0 <= i < |xs| && xs[i] == e;
    var p := (f: AlertEntry) => (f.id == e.id);
    ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  }
}

lemma EntryOfUnique(xs: seq<AlertEntry>, e: AlertEntry)
  requires ProofLib.DistinctBy(xs, (x: AlertEntry) => x.id)
  requires e in xs
  ensures hasEntry(xs, e.id)
  ensures entryOf(xs, e.id) == e
{
  var key := (x: AlertEntry) => x.id;
  var p := (f: AlertEntry) => (f.id == e.id);
  var i :| 0 <= i < |xs| && xs[i] == e;
  ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  ProofLib.FilterMember(p, xs, e);
  var fs := ProofLib.Filter(p, xs);
  assert |fs| == 1;
  assert e in fs;
  assert fs[0] == e;
}

lemma EntryOfMember(xs: seq<AlertEntry>, id: int)
  requires ProofLib.DistinctBy(xs, (x: AlertEntry) => x.id)
  requires hasEntry(xs, id)
  ensures entryOf(xs, id) in xs && entryOf(xs, id).id == id
{
  var e :| e in xs && e.id == id;
  EntryOfUnique(xs, e);
}

lemma FirstRingingValid(xs: seq<AlertEntry>)
  requires ProofLib.DistinctBy(xs, (x: AlertEntry) => x.id)
  requires forall e :: e in xs ==> validEntry(e)
  ensures firstRingingId(xs) != 0 ==> (hasEntry(xs, firstRingingId(xs)) && entryOf(xs, firstRingingId(xs)).phase.Ringing?)
{
  var p := (e: AlertEntry) => e.phase.Ringing?;
  var fs := ProofLib.Filter(p, xs);
  if |fs| > 0 {
    ProofLib.FilterMember(p, xs, fs[0]);
    EntryOfUnique(xs, fs[0]);
  }
}

lemma PutEntryPreserves(xs: seq<AlertEntry>, entry: AlertEntry)
  requires ProofLib.DistinctBy(xs, (x: AlertEntry) => x.id)
  requires forall e :: e in xs ==> validEntry(e)
  requires validEntry(entry)
  ensures var ys := putEntry(xs, entry);
    ProofLib.DistinctBy(ys, (x: AlertEntry) => x.id)
    && (forall e :: e in ys ==> validEntry(e))
    && entry in ys
    && (forall e :: e in xs && e.id != entry.id ==> e in ys)
{
  var key := (x: AlertEntry) => x.id;
  var ys := putEntry(xs, entry);
  if hasEntry(xs, entry.id) {
    assert |ys| == |xs|;
    forall i | 0 <= i < |ys| ensures ys[i].id == xs[i].id && validEntry(ys[i]) {
      assert xs[i] in xs;
    }
    forall e | e in xs && e.id != entry.id ensures e in ys {
      var i :| 0 <= i < |xs| && xs[i] == e;
      assert ys[i] == e;
    }
    var k :| 0 <= k < |xs| && xs[k].id == entry.id;
    assert ys[k] == entry;
  } else {
    assert ys == xs + [entry];
    ProofLib.DistinctByConcat(xs, [entry], key);
  }
}

lemma BannerKeptAfterPut(xs: seq<AlertEntry>, entry: AlertEntry, bannerId: int)
  requires ProofLib.DistinctBy(xs, (x: AlertEntry) => x.id)
  requires forall e :: e in xs ==> validEntry(e)
  requires validEntry(entry)
  requires bannerId != 0 && bannerId != entry.id
  requires hasEntry(xs, bannerId) && entryOf(xs, bannerId).phase.Ringing?
  ensures var ys := putEntry(xs, entry);
    hasEntry(ys, bannerId) && entryOf(ys, bannerId).phase.Ringing?
{
  PutEntryPreserves(xs, entry);
  EntryOfMember(xs, bannerId);
  var cur := entryOf(xs, bannerId);
  var ys := putEntry(xs, entry);
  assert cur in ys;
  EntryOfUnique(ys, cur);
}

lemma schedule_ensures(s: Alerts, id: int, dueAt: int, revision: int, now: int)
  ensures (inv(s) ==> canSchedule(s, id, dueAt, revision, now) ==> alwaysAlertsWellFormed(schedule(s, id, dueAt, revision, now).state))
  ensures (inv(s) ==> canSchedule(s, id, dueAt, revision, now) ==> alwaysBannerIsRinging(schedule(s, id, dueAt, revision, now).state))
  ensures (inv(s) ==> canSchedule(s, id, dueAt, revision, now) ==> stepBannerActionClearsBanner(s, "schedule", schedule(s, id, dueAt, revision, now).state, schedule(s, id, dueAt, revision, now).out))
  ensures (inv(s) ==> canSchedule(s, id, dueAt, revision, now) ==> stepReopenRearmsScheduled(s, "schedule", schedule(s, id, dueAt, revision, now).state, schedule(s, id, dueAt, revision, now).out))
{
  if inv(s) && canSchedule(s, id, dueAt, revision, now) {
    UniqueFromCounts(s.entries);
    var entry := AlertEntry(id, dueAt, revision, AlertPhase.Scheduled, 0, 0, false, kit__attempt_plan(0));
    PutEntryPreserves(s.entries, entry);
    var ys := putEntry(s.entries, entry);
    CountsFromUnique(ys);
    if s.bannerId == id {
      FirstRingingValid(ys);
    } else if s.bannerId != 0 {
      BannerKeptAfterPut(s.entries, entry, s.bannerId);
    }
  }
}

lemma cancelAlert_ensures(s: Alerts, id: int)
  ensures (inv(s) ==> canCancelAlert(s, id) ==> alwaysAlertsWellFormed(cancelAlert(s, id).state))
  ensures (inv(s) ==> canCancelAlert(s, id) ==> alwaysBannerIsRinging(cancelAlert(s, id).state))
  ensures (inv(s) ==> canCancelAlert(s, id) ==> stepBannerActionClearsBanner(s, "cancelAlert", cancelAlert(s, id).state, cancelAlert(s, id).out))
  ensures (inv(s) ==> canCancelAlert(s, id) ==> stepReopenRearmsScheduled(s, "cancelAlert", cancelAlert(s, id).state, cancelAlert(s, id).out))
{
  if inv(s) && canCancelAlert(s, id) {
    UniqueFromCounts(s.entries);
    var p := (e: AlertEntry) => (e.id != id);
    var ys := ProofLib.Filter(p, s.entries);
    ProofLib.FilterKeepsDistinctBy(p, s.entries, (e: AlertEntry) => e.id);
    ProofLib.FilterSubset(p, s.entries);
    CountsFromUnique(ys);
    if s.bannerId == id {
      FirstRingingValid(ys);
    } else if s.bannerId != 0 {
      EntryOfMember(s.entries, s.bannerId);
      var cur := entryOf(s.entries, s.bannerId);
      ProofLib.FilterMember(p, s.entries, cur);
      EntryOfUnique(ys, cur);
    }
  }
}

lemma fire_ensures(s: Alerts, id: int, now: int)
  ensures (inv(s) ==> canFire(s, id, now) ==> alwaysAlertsWellFormed(fire(s, id, now).state))
  ensures (inv(s) ==> canFire(s, id, now) ==> alwaysBannerIsRinging(fire(s, id, now).state))
  ensures (inv(s) ==> canFire(s, id, now) ==> stepBannerActionClearsBanner(s, "fire", fire(s, id, now).state, fire(s, id, now).out))
  ensures (inv(s) ==> canFire(s, id, now) ==> stepReopenRearmsScheduled(s, "fire", fire(s, id, now).state, fire(s, id, now).out))
{
  if inv(s) && canFire(s, id, now) {
    UniqueFromCounts(s.entries);
    EntryOfMember(s.entries, id);
    var cur := entryOf(s.entries, id);
    var ringing := cur.(phase := AlertPhase.Ringing, firedAt := now);
    PutEntryPreserves(s.entries, ringing);
    var ys := putEntry(s.entries, ringing);
    CountsFromUnique(ys);
    EntryOfUnique(ys, ringing);
  }
}

lemma completeFromBanner_ensures(s: Alerts, id: int, expectedRevision: int)
  ensures (inv(s) ==> canCompleteFromBanner(s, id, expectedRevision) ==> alwaysAlertsWellFormed(completeFromBanner(s, id, expectedRevision).state))
  ensures (inv(s) ==> canCompleteFromBanner(s, id, expectedRevision) ==> alwaysBannerIsRinging(completeFromBanner(s, id, expectedRevision).state))
  ensures (inv(s) ==> canCompleteFromBanner(s, id, expectedRevision) ==> stepBannerActionClearsBanner(s, "completeFromBanner", completeFromBanner(s, id, expectedRevision).state, completeFromBanner(s, id, expectedRevision).out))
  ensures (inv(s) ==> canCompleteFromBanner(s, id, expectedRevision) ==> stepReopenRearmsScheduled(s, "completeFromBanner", completeFromBanner(s, id, expectedRevision).state, completeFromBanner(s, id, expectedRevision).out))
{
  if inv(s) && canCompleteFromBanner(s, id, expectedRevision) {
    UniqueFromCounts(s.entries);
    EntryOfMember(s.entries, id);
    var cur := entryOf(s.entries, id);
    var done := cur.(phase := AlertPhase.Completed, completed := true, revision := cur.revision + 1, attempt := kit__attempt_dispatch(kit__attempt_record(kit__attempt_plan(s.nextAttempt))));
    PutEntryPreserves(s.entries, done);
    var ys := putEntry(s.entries, done);
    CountsFromUnique(ys);
    if s.bannerId == id {
      FirstRingingValid(ys);
    } else if s.bannerId != 0 {
      BannerKeptAfterPut(s.entries, done, s.bannerId);
    }
    var out := completeFromBanner(s, id, expectedRevision).out;
    assert out[0] in out && out[0].ClearBanner?;
  }
}

lemma snoozeFromBanner_ensures(s: Alerts, id: int, expectedRevision: int, until: int, now: int)
  ensures (inv(s) ==> canSnoozeFromBanner(s, id, expectedRevision, until, now) ==> alwaysAlertsWellFormed(snoozeFromBanner(s, id, expectedRevision, until, now).state))
  ensures (inv(s) ==> canSnoozeFromBanner(s, id, expectedRevision, until, now) ==> alwaysBannerIsRinging(snoozeFromBanner(s, id, expectedRevision, until, now).state))
  ensures (inv(s) ==> canSnoozeFromBanner(s, id, expectedRevision, until, now) ==> stepBannerActionClearsBanner(s, "snoozeFromBanner", snoozeFromBanner(s, id, expectedRevision, until, now).state, snoozeFromBanner(s, id, expectedRevision, until, now).out))
  ensures (inv(s) ==> canSnoozeFromBanner(s, id, expectedRevision, until, now) ==> stepReopenRearmsScheduled(s, "snoozeFromBanner", snoozeFromBanner(s, id, expectedRevision, until, now).state, snoozeFromBanner(s, id, expectedRevision, until, now).out))
{
  if inv(s) && canSnoozeFromBanner(s, id, expectedRevision, until, now) {
    UniqueFromCounts(s.entries);
    EntryOfMember(s.entries, id);
    var cur := entryOf(s.entries, id);
    var snoozed := cur.(phase := AlertPhase.Snoozed, dueAt := until, snoozedUntil := until, revision := cur.revision + 1, attempt := kit__attempt_dispatch(kit__attempt_record(kit__attempt_plan(s.nextAttempt))));
    PutEntryPreserves(s.entries, snoozed);
    var ys := putEntry(s.entries, snoozed);
    CountsFromUnique(ys);
    if s.bannerId == id {
      FirstRingingValid(ys);
    } else if s.bannerId != 0 {
      BannerKeptAfterPut(s.entries, snoozed, s.bannerId);
    }
    var out := snoozeFromBanner(s, id, expectedRevision, until, now).out;
    assert out[0] in out && out[0].ClearBanner?;
  }
}

lemma dismissFromBanner_ensures(s: Alerts, id: int, expectedRevision: int)
  ensures (inv(s) ==> canDismissFromBanner(s, id, expectedRevision) ==> alwaysAlertsWellFormed(dismissFromBanner(s, id, expectedRevision).state))
  ensures (inv(s) ==> canDismissFromBanner(s, id, expectedRevision) ==> alwaysBannerIsRinging(dismissFromBanner(s, id, expectedRevision).state))
  ensures (inv(s) ==> canDismissFromBanner(s, id, expectedRevision) ==> stepBannerActionClearsBanner(s, "dismissFromBanner", dismissFromBanner(s, id, expectedRevision).state, dismissFromBanner(s, id, expectedRevision).out))
  ensures (inv(s) ==> canDismissFromBanner(s, id, expectedRevision) ==> stepReopenRearmsScheduled(s, "dismissFromBanner", dismissFromBanner(s, id, expectedRevision).state, dismissFromBanner(s, id, expectedRevision).out))
{
  if inv(s) && canDismissFromBanner(s, id, expectedRevision) {
    UniqueFromCounts(s.entries);
    EntryOfMember(s.entries, id);
    var cur := entryOf(s.entries, id);
    var dismissed := cur.(phase := AlertPhase.Dismissed, revision := cur.revision + 1, attempt := kit__attempt_dispatch(kit__attempt_record(kit__attempt_plan(s.nextAttempt))));
    PutEntryPreserves(s.entries, dismissed);
    var ys := putEntry(s.entries, dismissed);
    CountsFromUnique(ys);
    if s.bannerId == id {
      FirstRingingValid(ys);
    } else if s.bannerId != 0 {
      BannerKeptAfterPut(s.entries, dismissed, s.bannerId);
    }
    var out := dismissFromBanner(s, id, expectedRevision).out;
    assert out[0] in out && out[0].ClearBanner?;
  }
}

lemma syncAnswered_ensures(s: Alerts, id: int, attemptId: int, confirmed: bool, known: bool)
  ensures (inv(s) ==> canSyncAnswered(s, id, attemptId) ==> alwaysAlertsWellFormed(syncAnswered(s, id, attemptId, confirmed, known)))
  ensures (inv(s) ==> canSyncAnswered(s, id, attemptId) ==> alwaysBannerIsRinging(syncAnswered(s, id, attemptId, confirmed, known)))
  ensures (inv(s) ==> canSyncAnswered(s, id, attemptId) ==> stepBannerActionClearsBanner(s, "syncAnswered", syncAnswered(s, id, attemptId, confirmed, known), []))
  ensures (inv(s) ==> canSyncAnswered(s, id, attemptId) ==> stepReopenRearmsScheduled(s, "syncAnswered", syncAnswered(s, id, attemptId, confirmed, known), []))
{
  if inv(s) && canSyncAnswered(s, id, attemptId) {
    UniqueFromCounts(s.entries);
    EntryOfMember(s.entries, id);
    var cur := entryOf(s.entries, id);
    var settled := cur.(attempt := kit__attempt_conclude(cur.attempt, confirmed, known));
    PutEntryPreserves(s.entries, settled);
    var ys := putEntry(s.entries, settled);
    CountsFromUnique(ys);
    if s.bannerId == id {
      EntryOfUnique(ys, settled);
    } else if s.bannerId != 0 {
      BannerKeptAfterPut(s.entries, settled, s.bannerId);
    }
  }
}

lemma reopen_ensures(s: Alerts)
  ensures (inv(s) ==> alwaysAlertsWellFormed(reopen(s).state))
  ensures (inv(s) ==> alwaysBannerIsRinging(reopen(s).state))
  ensures (inv(s) ==> stepBannerActionClearsBanner(s, "reopen", reopen(s).state, reopen(s).out))
  ensures (inv(s) ==> stepReopenRearmsScheduled(s, "reopen", reopen(s).state, reopen(s).out))
{
  if inv(s) {
    UniqueFromCounts(s.entries);
    var moved := reopen(s);
    var ys := moved.state.entries;
    assert |ys| == |s.entries|;
    forall i | 0 <= i < |ys|
      ensures ys[i].id == s.entries[i].id
      ensures ys[i].phase == s.entries[i].phase
      ensures ys[i].dueAt == s.entries[i].dueAt
      ensures ys[i].completed == s.entries[i].completed
      ensures validEntry(ys[i])
      ensures !ys[i].attempt.outcome.Sent?
    {
      assert s.entries[i] in s.entries;
    }
    CountsFromUnique(ys);
    if s.bannerId != 0 {
      EntryOfMember(s.entries, s.bannerId);
      var b := entryOf(s.entries, s.bannerId);
      var idx :| 0 <= idx < |s.entries| && s.entries[idx] == b;
      assert ys[idx] in ys && ys[idx].id == s.bannerId && ys[idx].phase.Ringing?;
      EntryOfUnique(ys, ys[idx]);
    }
    var waiting := ProofLib.Filter((e: AlertEntry) => isWaiting(e), ys);
    forall e | e in s.entries && isWaiting(e)
      ensures exists fx :: fx in moved.out && fx.Arm? && fx.id == e.id && fx.at == e.dueAt
    {
      var idx :| 0 <= idx < |s.entries| && s.entries[idx] == e;
      var y := ys[idx];
      assert y in ys && isWaiting(y);
      ProofLib.FilterMember((x: AlertEntry) => isWaiting(x), ys, y);
      var wi :| 0 <= wi < |waiting| && waiting[wi] == y;
      assert moved.out[wi] in moved.out && moved.out[wi] == Arm(e.id, e.dueAt);
    }
  }
}
