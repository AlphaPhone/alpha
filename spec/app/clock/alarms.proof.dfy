lemma UniqueAlarmsView(xs: seq<Alarm>)
  ensures uniqueIds(xs) == !(exists a :: a in xs && !(|ProofLib.Filter((b: Alarm) => (b.id == a.id), xs)| == 1))
{
}

lemma AlarmOfView(xs: seq<Alarm>, id: int)
  ensures alarmOf(xs, id) == (if 0 < |ProofLib.Filter((a: Alarm) => (a.id == id), xs)| then ProofLib.Filter((a: Alarm) => (a.id == id), xs)[0] else noAlarm)
{
}

lemma UniqueToDistinct(xs: seq<Alarm>)
  requires uniqueIds(xs)
  ensures ProofLib.DistinctBy(xs, (a: Alarm) => a.id)
{
  UniqueAlarmsView(xs);
  forall i, j | 0 <= i < |xs| && 0 <= j < |xs| && i != j ensures xs[i].id != xs[j].id {
    if xs[i].id == xs[j].id {
      var a := xs[i];
      assert a in xs;
      assert |ProofLib.Filter((b: Alarm) => (b.id == a.id), xs)| == 1;
      ProofLib.FilterTwo((b: Alarm) => (b.id == a.id), xs, i, j);
    }
  }
}

lemma DistinctToUnique(xs: seq<Alarm>)
  requires ProofLib.DistinctBy(xs, (a: Alarm) => a.id)
  ensures uniqueIds(xs)
{
  UniqueAlarmsView(xs);
  forall a | a in xs ensures |ProofLib.Filter((b: Alarm) => (b.id == a.id), xs)| == 1 {
    var i :| 0 <= i < |xs| && xs[i] == a;
    ProofLib.FilterOne((b: Alarm) => (b.id == a.id), xs, i);
  }
}

lemma AlarmOfMatches(xs: seq<Alarm>, id: int, i: int)
  requires ProofLib.DistinctBy(xs, (a: Alarm) => a.id)
  requires 0 <= i < |xs| && xs[i].id == id
  ensures alarmOf(xs, id) == xs[i]
{
  AlarmOfView(xs, id);
  var p := (a: Alarm) => (a.id == id);
  ProofLib.FilterOne(p, xs, i);
  ProofLib.FilterMember(p, xs, xs[i]);
  assert xs[i] in ProofLib.Filter(p, xs);
  assert ProofLib.Filter(p, xs)[0] == xs[i];
}

lemma MapPreservesUnique(xs: seq<Alarm>, ys: seq<Alarm>)
  requires uniqueIds(xs)
  requires |xs| == |ys| && forall i :: 0 <= i < |xs| ==> ys[i].id == xs[i].id
  ensures uniqueIds(ys)
  ensures forall id :: hasAlarm(ys, id) == hasAlarm(xs, id)
{
  UniqueToDistinct(xs);
  assert ProofLib.DistinctBy(ys, (a: Alarm) => a.id);
  DistinctToUnique(ys);
  forall id ensures hasAlarm(ys, id) == hasAlarm(xs, id) {
    if hasAlarm(ys, id) {
      var k :| 0 <= k < |ys| && ys[k].id == id;
      assert xs[k] in xs && xs[k].id == id;
    }
    if hasAlarm(xs, id) {
      var k :| 0 <= k < |xs| && xs[k].id == id;
      assert ys[k] in ys && ys[k].id == id;
    }
  }
}

lemma AppendFreshAlarm(xs: seq<Alarm>, x: Alarm)
  requires uniqueIds(xs)
  requires forall a :: a in xs ==> a.id != x.id
  ensures uniqueIds(xs + [x])
{
  UniqueToDistinct(xs);
  forall i, j | 0 <= i < |xs + [x]| && 0 <= j < |xs + [x]| && i != j ensures (xs + [x])[i].id != (xs + [x])[j].id {
    if i < |xs| && j == |xs| {
      assert (xs + [x])[i] == xs[i] && xs[i] in xs;
    } else if j < |xs| && i == |xs| {
      assert (xs + [x])[j] == xs[j] && xs[j] in xs;
    }
  }
  DistinctToUnique(xs + [x]);
}

lemma DeleteView(s: Alarms, id: int, now: int)
  ensures requestDelete(s, id, now).items == ProofLib.Filter((a: Alarm) => (a.id != id), s.items)
{
}

lemma create_ensures(s: Alarms, hour: int, minute: int, daysMask: int, snoozeMinutes: int, vibrate: bool, fireAt: int)
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysValidAlarmTimes(create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysUniqueIds(create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysBoundedCount(create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysDisabledAlarmNeverRings(create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysRingingOnlyWhenEnabled(create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysSnoozedHasFutureTarget(create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> stepUndoRestoresDeleted(s, "create", create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> stepTriggerOnlyAtOrAfterDue(s, "create", create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) ==> stepDismissOneOffDisables(s, "create", create(s, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
{
  if inv(s) && canCreate(s, hour, minute, daysMask, snoozeMinutes, fireAt) {
    var created := Alarm(s.issued + 1, hour, minute, daysMask, true, snoozeMinutes, vibrate, Phase.Idle, fireAt, 0, false, 1);
    AppendFreshAlarm(s.items, created);
  }
}

lemma update_ensures(s: Alarms, id: int, hour: int, minute: int, daysMask: int, snoozeMinutes: int, vibrate: bool, fireAt: int)
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysValidAlarmTimes(update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysUniqueIds(update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysBoundedCount(update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysDisabledAlarmNeverRings(update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysRingingOnlyWhenEnabled(update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> alwaysSnoozedHasFutureTarget(update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> stepUndoRestoresDeleted(s, "update", update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> stepTriggerOnlyAtOrAfterDue(s, "update", update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
  ensures (inv(s) ==> canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) ==> stepDismissOneOffDisables(s, "update", update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt)))
{
  if inv(s) && canUpdate(s, id, hour, minute, daysMask, snoozeMinutes, fireAt) {
    MapPreservesUnique(s.items, update(s, id, hour, minute, daysMask, snoozeMinutes, vibrate, fireAt).items);
  }
}

lemma toggle_ensures(s: Alarms, id: int, on: bool, fireAt: int)
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> alwaysValidAlarmTimes(toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> alwaysUniqueIds(toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> alwaysBoundedCount(toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> alwaysDisabledAlarmNeverRings(toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> alwaysRingingOnlyWhenEnabled(toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> alwaysSnoozedHasFutureTarget(toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> stepUndoRestoresDeleted(s, "toggle", toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> stepTriggerOnlyAtOrAfterDue(s, "toggle", toggle(s, id, on, fireAt)))
  ensures (inv(s) ==> canToggle(s, id, on, fireAt) ==> stepDismissOneOffDisables(s, "toggle", toggle(s, id, on, fireAt)))
{
  if inv(s) && canToggle(s, id, on, fireAt) {
    MapPreservesUnique(s.items, toggle(s, id, on, fireAt).items);
  }
}

lemma requestDelete_ensures(s: Alarms, id: int, now: int)
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> alwaysValidAlarmTimes(requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> alwaysUniqueIds(requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> alwaysBoundedCount(requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> alwaysDisabledAlarmNeverRings(requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> alwaysRingingOnlyWhenEnabled(requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> alwaysSnoozedHasFutureTarget(requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> stepUndoRestoresDeleted(s, "requestDelete", requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> stepTriggerOnlyAtOrAfterDue(s, "requestDelete", requestDelete(s, id, now)))
  ensures (inv(s) ==> canRequestDelete(s, id, now) ==> stepDismissOneOffDisables(s, "requestDelete", requestDelete(s, id, now)))
{
  if inv(s) && canRequestDelete(s, id, now) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    AlarmOfMatches(s.items, id, idx);
    DeleteView(s, id, now);
    var p := (a: Alarm) => (a.id != id);
    var filtered := ProofLib.Filter(p, s.items);
    ProofLib.FilterKeepsDistinctBy(p, s.items, (a: Alarm) => a.id);
    DistinctToUnique(filtered);
    ProofLib.FilterSubset(p, s.items);
    forall a | a in filtered ensures a.id != id {
      ProofLib.FilterMember(p, s.items, a);
    }
  }
}

lemma undoDelete_ensures(s: Alarms, now: int)
  ensures (inv(s) ==> canUndoDelete(s, now) ==> alwaysValidAlarmTimes(undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> alwaysUniqueIds(undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> alwaysBoundedCount(undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> alwaysDisabledAlarmNeverRings(undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> alwaysRingingOnlyWhenEnabled(undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> alwaysSnoozedHasFutureTarget(undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> stepUndoRestoresDeleted(s, "undoDelete", undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> stepTriggerOnlyAtOrAfterDue(s, "undoDelete", undoDelete(s, now)))
  ensures (inv(s) ==> canUndoDelete(s, now) ==> stepDismissOneOffDisables(s, "undoDelete", undoDelete(s, now)))
{
  if inv(s) && canUndoDelete(s, now) {
    AppendFreshAlarm(s.items, s.hidden);
  }
}

lemma trigger_ensures(s: Alarms, id: int, now: int)
  ensures (inv(s) ==> canTrigger(s, id, now) ==> alwaysValidAlarmTimes(trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> alwaysUniqueIds(trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> alwaysBoundedCount(trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> alwaysDisabledAlarmNeverRings(trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> alwaysRingingOnlyWhenEnabled(trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> alwaysSnoozedHasFutureTarget(trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> stepUndoRestoresDeleted(s, "trigger", trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> stepTriggerOnlyAtOrAfterDue(s, "trigger", trigger(s, id, now)))
  ensures (inv(s) ==> canTrigger(s, id, now) ==> stepDismissOneOffDisables(s, "trigger", trigger(s, id, now)))
{
  if inv(s) && canTrigger(s, id, now) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    AlarmOfMatches(s.items, id, idx);
    assert s.items[idx] in s.items;
    var after := trigger(s, id, now);
    MapPreservesUnique(s.items, after.items);
    forall k | 0 <= k < |after.items| ensures validAlarm(after.items[k]) && after.items[k].id <= after.issued {
      if k != idx {
        assert s.items[k].id != id;
        assert after.items[k] == s.items[k] && s.items[k] in s.items;
      }
    }
  }
}

lemma snooze_ensures(s: Alarms, id: int, now: int)
  ensures (inv(s) ==> canSnooze(s, id, now) ==> alwaysValidAlarmTimes(snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> alwaysUniqueIds(snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> alwaysBoundedCount(snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> alwaysDisabledAlarmNeverRings(snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> alwaysRingingOnlyWhenEnabled(snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> alwaysSnoozedHasFutureTarget(snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> stepUndoRestoresDeleted(s, "snooze", snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> stepTriggerOnlyAtOrAfterDue(s, "snooze", snooze(s, id, now)))
  ensures (inv(s) ==> canSnooze(s, id, now) ==> stepDismissOneOffDisables(s, "snooze", snooze(s, id, now)))
{
  if inv(s) && canSnooze(s, id, now) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    AlarmOfMatches(s.items, id, idx);
    assert s.items[idx] in s.items;
    var after := snooze(s, id, now);
    MapPreservesUnique(s.items, after.items);
    forall k | 0 <= k < |after.items| ensures validAlarm(after.items[k]) && after.items[k].id <= after.issued {
      if k != idx {
        assert s.items[k].id != id;
        assert after.items[k] == s.items[k] && s.items[k] in s.items;
      }
    }
  }
}

lemma dismiss_ensures(s: Alarms, id: int, nextFireAt: int, now: int)
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> alwaysValidAlarmTimes(dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> alwaysUniqueIds(dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> alwaysBoundedCount(dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> alwaysDisabledAlarmNeverRings(dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> alwaysRingingOnlyWhenEnabled(dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> alwaysSnoozedHasFutureTarget(dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> stepUndoRestoresDeleted(s, "dismiss", dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> stepTriggerOnlyAtOrAfterDue(s, "dismiss", dismiss(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canDismiss(s, id, nextFireAt, now) ==> stepDismissOneOffDisables(s, "dismiss", dismiss(s, id, nextFireAt, now)))
{
  if inv(s) && canDismiss(s, id, nextFireAt, now) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    AlarmOfMatches(s.items, id, idx);
    assert s.items[idx] in s.items;
    var after := dismiss(s, id, nextFireAt, now);
    MapPreservesUnique(s.items, after.items);
    forall k | 0 <= k < |after.items| ensures validAlarm(after.items[k]) && after.items[k].id <= after.issued {
      if k != idx {
        assert s.items[k].id != id;
        assert after.items[k] == s.items[k] && s.items[k] in s.items;
      }
    }
    forall a | a in after.items && (exists b :: b in s.items && b.id == a.id && !b.phase.Idle? && b.daysMask == 0) && a.phase.Idle?
      ensures !a.enabled
    {
      var k :| 0 <= k < |after.items| && after.items[k] == a;
      if k != idx {
        assert s.items[k].id != id;
        assert a == s.items[k];
        var b :| b in s.items && b.id == a.id && !b.phase.Idle? && b.daysMask == 0;
        var m :| 0 <= m < |s.items| && s.items[m] == b;
        assert m == k;
      }
    }
  }
}

lemma autoSilence_ensures(s: Alarms, id: int, nextFireAt: int, now: int)
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> alwaysValidAlarmTimes(autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> alwaysUniqueIds(autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> alwaysBoundedCount(autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> alwaysDisabledAlarmNeverRings(autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> alwaysRingingOnlyWhenEnabled(autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> alwaysSnoozedHasFutureTarget(autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> stepUndoRestoresDeleted(s, "autoSilence", autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> stepTriggerOnlyAtOrAfterDue(s, "autoSilence", autoSilence(s, id, nextFireAt, now)))
  ensures (inv(s) ==> canAutoSilence(s, id, nextFireAt, now) ==> stepDismissOneOffDisables(s, "autoSilence", autoSilence(s, id, nextFireAt, now)))
{
  if inv(s) && canAutoSilence(s, id, nextFireAt, now) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    AlarmOfMatches(s.items, id, idx);
    assert s.items[idx] in s.items;
    var after := autoSilence(s, id, nextFireAt, now);
    MapPreservesUnique(s.items, after.items);
    forall k | 0 <= k < |after.items| ensures validAlarm(after.items[k]) && after.items[k].id <= after.issued {
      if k != idx {
        assert s.items[k].id != id;
        assert after.items[k] == s.items[k] && s.items[k] in s.items;
      }
    }
  }
}

lemma ackMissed_ensures(s: Alarms, id: int)
  ensures (inv(s) ==> canAckMissed(s, id) ==> alwaysValidAlarmTimes(ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> alwaysUniqueIds(ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> alwaysBoundedCount(ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> alwaysDisabledAlarmNeverRings(ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> alwaysRingingOnlyWhenEnabled(ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> alwaysSnoozedHasFutureTarget(ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> stepUndoRestoresDeleted(s, "ackMissed", ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> stepTriggerOnlyAtOrAfterDue(s, "ackMissed", ackMissed(s, id)))
  ensures (inv(s) ==> canAckMissed(s, id) ==> stepDismissOneOffDisables(s, "ackMissed", ackMissed(s, id)))
{
  if inv(s) && canAckMissed(s, id) {
    MapPreservesUnique(s.items, ackMissed(s, id).items);
  }
}

lemma reopen_ensures(s: Alarms, now: int)
  ensures (inv(s) ==> alwaysValidAlarmTimes(reopen(s, now)))
  ensures (inv(s) ==> alwaysUniqueIds(reopen(s, now)))
  ensures (inv(s) ==> alwaysBoundedCount(reopen(s, now)))
  ensures (inv(s) ==> alwaysDisabledAlarmNeverRings(reopen(s, now)))
  ensures (inv(s) ==> alwaysRingingOnlyWhenEnabled(reopen(s, now)))
  ensures (inv(s) ==> alwaysSnoozedHasFutureTarget(reopen(s, now)))
  ensures (inv(s) ==> stepUndoRestoresDeleted(s, "reopen", reopen(s, now)))
  ensures (inv(s) ==> stepTriggerOnlyAtOrAfterDue(s, "reopen", reopen(s, now)))
  ensures (inv(s) ==> stepDismissOneOffDisables(s, "reopen", reopen(s, now)))
{
  if inv(s) {
    MapPreservesUnique(s.items, reopen(s, now).items);
  }
}
