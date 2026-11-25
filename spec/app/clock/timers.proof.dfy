lemma UniqueTimersView(xs: seq<Timer>)
  ensures uniqueTimerIds(xs) == !(exists t :: t in xs && !(|ProofLib.Filter((u: Timer) => (u.id == t.id), xs)| == 1))
{
}

lemma TimerOfView(xs: seq<Timer>, id: int)
  ensures timerOf(xs, id) == (if 0 < |ProofLib.Filter((t: Timer) => (t.id == id), xs)| then ProofLib.Filter((t: Timer) => (t.id == id), xs)[0] else noTimer)
{
}

lemma UniqueToDistinct(xs: seq<Timer>)
  requires uniqueTimerIds(xs)
  ensures ProofLib.DistinctBy(xs, (t: Timer) => t.id)
{
  UniqueTimersView(xs);
  forall i, j | 0 <= i < |xs| && 0 <= j < |xs| && i != j ensures xs[i].id != xs[j].id {
    if xs[i].id == xs[j].id {
      var t := xs[i];
      assert t in xs;
      assert |ProofLib.Filter((u: Timer) => (u.id == t.id), xs)| == 1;
      ProofLib.FilterTwo((u: Timer) => (u.id == t.id), xs, i, j);
    }
  }
}

lemma DistinctToUnique(xs: seq<Timer>)
  requires ProofLib.DistinctBy(xs, (t: Timer) => t.id)
  ensures uniqueTimerIds(xs)
{
  UniqueTimersView(xs);
  forall t | t in xs ensures |ProofLib.Filter((u: Timer) => (u.id == t.id), xs)| == 1 {
    var i :| 0 <= i < |xs| && xs[i] == t;
    ProofLib.FilterOne((u: Timer) => (u.id == t.id), xs, i);
  }
}

lemma TimerOfMatches(xs: seq<Timer>, id: int, i: int)
  requires ProofLib.DistinctBy(xs, (t: Timer) => t.id)
  requires 0 <= i < |xs| && xs[i].id == id
  ensures timerOf(xs, id) == xs[i]
{
  TimerOfView(xs, id);
  var p := (t: Timer) => (t.id == id);
  ProofLib.FilterOne(p, xs, i);
  ProofLib.FilterMember(p, xs, xs[i]);
  assert xs[i] in ProofLib.Filter(p, xs);
  assert ProofLib.Filter(p, xs)[0] == xs[i];
}

lemma MapPreservesUnique(xs: seq<Timer>, ys: seq<Timer>)
  requires uniqueTimerIds(xs)
  requires |xs| == |ys| && forall i :: 0 <= i < |xs| ==> ys[i].id == xs[i].id
  ensures uniqueTimerIds(ys)
{
  UniqueToDistinct(xs);
  assert ProofLib.DistinctBy(ys, (t: Timer) => t.id);
  DistinctToUnique(ys);
}

lemma AppendFreshTimer(xs: seq<Timer>, x: Timer)
  requires uniqueTimerIds(xs)
  requires forall t :: t in xs ==> t.id != x.id
  ensures uniqueTimerIds(xs + [x])
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

lemma RemoveView(s: Timers, id: int)
  ensures remove(s, id).items == ProofLib.Filter((t: Timer) => (t.id != id), s.items)
{
}

lemma create_ensures(s: Timers, durationMs: int, autoStart: bool, at: int)
  ensures (inv(s) ==> canCreate(s, durationMs, at) ==> alwaysPositiveDuration(create(s, durationMs, autoStart, at)))
  ensures (inv(s) ==> canCreate(s, durationMs, at) ==> alwaysRemainingBounded(create(s, durationMs, autoStart, at)))
  ensures (inv(s) ==> canCreate(s, durationMs, at) ==> alwaysRunningHasEndAt(create(s, durationMs, autoStart, at)))
  ensures (inv(s) ==> canCreate(s, durationMs, at) ==> alwaysUniqueTimerIds(create(s, durationMs, autoStart, at)))
  ensures (inv(s) ==> canCreate(s, durationMs, at) ==> alwaysBoundedTimers(create(s, durationMs, autoStart, at)))
  ensures (inv(s) ==> canCreate(s, durationMs, at) ==> stepPausePreservesRemaining(s, "create", create(s, durationMs, autoStart, at)))
  ensures (inv(s) ==> canCreate(s, durationMs, at) ==> stepFinishNeverEarly(s, "create", create(s, durationMs, autoStart, at)))
{
  if inv(s) && canCreate(s, durationMs, at) {
    var created := Timer(s.issued + 1, durationMs, durationMs, (if autoStart then TimerStatus.Running else TimerStatus.Ready), (if autoStart then at else 0), (if autoStart then at + durationMs else 0), 0, 1);
    AppendFreshTimer(s.items, created);
  }
}

lemma start_ensures(s: Timers, id: int, at: int)
  ensures (inv(s) ==> canStart(s, id, at) ==> alwaysPositiveDuration(start(s, id, at)))
  ensures (inv(s) ==> canStart(s, id, at) ==> alwaysRemainingBounded(start(s, id, at)))
  ensures (inv(s) ==> canStart(s, id, at) ==> alwaysRunningHasEndAt(start(s, id, at)))
  ensures (inv(s) ==> canStart(s, id, at) ==> alwaysUniqueTimerIds(start(s, id, at)))
  ensures (inv(s) ==> canStart(s, id, at) ==> alwaysBoundedTimers(start(s, id, at)))
  ensures (inv(s) ==> canStart(s, id, at) ==> stepPausePreservesRemaining(s, "start", start(s, id, at)))
  ensures (inv(s) ==> canStart(s, id, at) ==> stepFinishNeverEarly(s, "start", start(s, id, at)))
{
  if inv(s) && canStart(s, id, at) {
    MapPreservesUnique(s.items, start(s, id, at).items);
  }
}

lemma pause_ensures(s: Timers, id: int, now: int)
  ensures (inv(s) ==> canPause(s, id, now) ==> alwaysPositiveDuration(pause(s, id, now)))
  ensures (inv(s) ==> canPause(s, id, now) ==> alwaysRemainingBounded(pause(s, id, now)))
  ensures (inv(s) ==> canPause(s, id, now) ==> alwaysRunningHasEndAt(pause(s, id, now)))
  ensures (inv(s) ==> canPause(s, id, now) ==> alwaysUniqueTimerIds(pause(s, id, now)))
  ensures (inv(s) ==> canPause(s, id, now) ==> alwaysBoundedTimers(pause(s, id, now)))
  ensures (inv(s) ==> canPause(s, id, now) ==> stepPausePreservesRemaining(s, "pause", pause(s, id, now)))
  ensures (inv(s) ==> canPause(s, id, now) ==> stepFinishNeverEarly(s, "pause", pause(s, id, now)))
{
  if inv(s) && canPause(s, id, now) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    TimerOfMatches(s.items, id, idx);
    var after := pause(s, id, now);
    MapPreservesUnique(s.items, after.items);
    forall k | 0 <= k < |after.items| ensures validTimer(after.items[k]) && after.items[k].id <= after.issued {
      if k == idx {
        assert s.items[k] in s.items;
      } else {
        assert s.items[k].id != id;
        assert after.items[k] == s.items[k] && s.items[k] in s.items;
      }
    }
    forall t | t in after.items && (exists b :: b in s.items && b.id == t.id && b.status.Running?) && t.status.Paused?
      ensures t.remainingMs > 0 && (exists b :: b in s.items && b.id == t.id && t.remainingMs <= b.endAt - b.startedAt)
    {
      var k :| 0 <= k < |after.items| && after.items[k] == t;
      assert s.items[k] in s.items;
      if k != idx {
        assert s.items[k].id != id;
        assert t == s.items[k];
        var b :| b in s.items && b.id == t.id && b.status.Running?;
        var m :| 0 <= m < |s.items| && s.items[m] == b;
        assert m == k;
      }
    }
  }
}

lemma resume_ensures(s: Timers, id: int, at: int)
  ensures (inv(s) ==> canResume(s, id, at) ==> alwaysPositiveDuration(resume(s, id, at)))
  ensures (inv(s) ==> canResume(s, id, at) ==> alwaysRemainingBounded(resume(s, id, at)))
  ensures (inv(s) ==> canResume(s, id, at) ==> alwaysRunningHasEndAt(resume(s, id, at)))
  ensures (inv(s) ==> canResume(s, id, at) ==> alwaysUniqueTimerIds(resume(s, id, at)))
  ensures (inv(s) ==> canResume(s, id, at) ==> alwaysBoundedTimers(resume(s, id, at)))
  ensures (inv(s) ==> canResume(s, id, at) ==> stepPausePreservesRemaining(s, "resume", resume(s, id, at)))
  ensures (inv(s) ==> canResume(s, id, at) ==> stepFinishNeverEarly(s, "resume", resume(s, id, at)))
{
  if inv(s) && canResume(s, id, at) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    TimerOfMatches(s.items, id, idx);
    MapPreservesUnique(s.items, resume(s, id, at).items);
  }
}

lemma addTime_ensures(s: Timers, id: int, deltaMs: int, at: int)
  ensures (inv(s) ==> canAddTime(s, id, deltaMs, at) ==> alwaysPositiveDuration(addTime(s, id, deltaMs, at)))
  ensures (inv(s) ==> canAddTime(s, id, deltaMs, at) ==> alwaysRemainingBounded(addTime(s, id, deltaMs, at)))
  ensures (inv(s) ==> canAddTime(s, id, deltaMs, at) ==> alwaysRunningHasEndAt(addTime(s, id, deltaMs, at)))
  ensures (inv(s) ==> canAddTime(s, id, deltaMs, at) ==> alwaysUniqueTimerIds(addTime(s, id, deltaMs, at)))
  ensures (inv(s) ==> canAddTime(s, id, deltaMs, at) ==> alwaysBoundedTimers(addTime(s, id, deltaMs, at)))
  ensures (inv(s) ==> canAddTime(s, id, deltaMs, at) ==> stepPausePreservesRemaining(s, "addTime", addTime(s, id, deltaMs, at)))
  ensures (inv(s) ==> canAddTime(s, id, deltaMs, at) ==> stepFinishNeverEarly(s, "addTime", addTime(s, id, deltaMs, at)))
{
  if inv(s) && canAddTime(s, id, deltaMs, at) {
    MapPreservesUnique(s.items, addTime(s, id, deltaMs, at).items);
  }
}

lemma finish_ensures(s: Timers, id: int, now: int)
  ensures (inv(s) ==> canFinish(s, id, now) ==> alwaysPositiveDuration(finish(s, id, now)))
  ensures (inv(s) ==> canFinish(s, id, now) ==> alwaysRemainingBounded(finish(s, id, now)))
  ensures (inv(s) ==> canFinish(s, id, now) ==> alwaysRunningHasEndAt(finish(s, id, now)))
  ensures (inv(s) ==> canFinish(s, id, now) ==> alwaysUniqueTimerIds(finish(s, id, now)))
  ensures (inv(s) ==> canFinish(s, id, now) ==> alwaysBoundedTimers(finish(s, id, now)))
  ensures (inv(s) ==> canFinish(s, id, now) ==> stepPausePreservesRemaining(s, "finish", finish(s, id, now)))
  ensures (inv(s) ==> canFinish(s, id, now) ==> stepFinishNeverEarly(s, "finish", finish(s, id, now)))
{
  if inv(s) && canFinish(s, id, now) {
    UniqueToDistinct(s.items);
    var idx :| 0 <= idx < |s.items| && s.items[idx].id == id;
    TimerOfMatches(s.items, id, idx);
    var after := finish(s, id, now);
    MapPreservesUnique(s.items, after.items);
    forall k | 0 <= k < |after.items| ensures validTimer(after.items[k]) && after.items[k].id <= after.issued {
      if k == idx {
        assert s.items[k] in s.items;
      } else {
        assert s.items[k].id != id;
        assert after.items[k] == s.items[k] && s.items[k] in s.items;
      }
    }
    forall t | t in after.items && (exists b :: b in s.items && b.id == t.id && b.status.Running?) && t.status.Ringing?
      ensures exists b :: b in s.items && b.id == t.id && t.ringStartedAt >= b.endAt
    {
      var k :| 0 <= k < |after.items| && after.items[k] == t;
      assert s.items[k] in s.items;
      if k != idx {
        assert s.items[k].id != id;
        assert t == s.items[k];
        var b :| b in s.items && b.id == t.id && b.status.Running?;
        var m :| 0 <= m < |s.items| && s.items[m] == b;
        assert m == k;
      }
    }
  }
}

lemma dismiss_ensures(s: Timers, id: int)
  ensures (inv(s) ==> canDismiss(s, id) ==> alwaysPositiveDuration(dismiss(s, id)))
  ensures (inv(s) ==> canDismiss(s, id) ==> alwaysRemainingBounded(dismiss(s, id)))
  ensures (inv(s) ==> canDismiss(s, id) ==> alwaysRunningHasEndAt(dismiss(s, id)))
  ensures (inv(s) ==> canDismiss(s, id) ==> alwaysUniqueTimerIds(dismiss(s, id)))
  ensures (inv(s) ==> canDismiss(s, id) ==> alwaysBoundedTimers(dismiss(s, id)))
  ensures (inv(s) ==> canDismiss(s, id) ==> stepPausePreservesRemaining(s, "dismiss", dismiss(s, id)))
  ensures (inv(s) ==> canDismiss(s, id) ==> stepFinishNeverEarly(s, "dismiss", dismiss(s, id)))
{
  if inv(s) && canDismiss(s, id) {
    MapPreservesUnique(s.items, dismiss(s, id).items);
  }
}

lemma reset_ensures(s: Timers, id: int)
  ensures (inv(s) ==> canReset(s, id) ==> alwaysPositiveDuration(reset(s, id)))
  ensures (inv(s) ==> canReset(s, id) ==> alwaysRemainingBounded(reset(s, id)))
  ensures (inv(s) ==> canReset(s, id) ==> alwaysRunningHasEndAt(reset(s, id)))
  ensures (inv(s) ==> canReset(s, id) ==> alwaysUniqueTimerIds(reset(s, id)))
  ensures (inv(s) ==> canReset(s, id) ==> alwaysBoundedTimers(reset(s, id)))
  ensures (inv(s) ==> canReset(s, id) ==> stepPausePreservesRemaining(s, "reset", reset(s, id)))
  ensures (inv(s) ==> canReset(s, id) ==> stepFinishNeverEarly(s, "reset", reset(s, id)))
{
  if inv(s) && canReset(s, id) {
    MapPreservesUnique(s.items, reset(s, id).items);
  }
}

lemma remove_ensures(s: Timers, id: int)
  ensures (inv(s) ==> canRemove(s, id) ==> alwaysPositiveDuration(remove(s, id)))
  ensures (inv(s) ==> canRemove(s, id) ==> alwaysRemainingBounded(remove(s, id)))
  ensures (inv(s) ==> canRemove(s, id) ==> alwaysRunningHasEndAt(remove(s, id)))
  ensures (inv(s) ==> canRemove(s, id) ==> alwaysUniqueTimerIds(remove(s, id)))
  ensures (inv(s) ==> canRemove(s, id) ==> alwaysBoundedTimers(remove(s, id)))
  ensures (inv(s) ==> canRemove(s, id) ==> stepPausePreservesRemaining(s, "remove", remove(s, id)))
  ensures (inv(s) ==> canRemove(s, id) ==> stepFinishNeverEarly(s, "remove", remove(s, id)))
{
  if inv(s) && canRemove(s, id) {
    UniqueToDistinct(s.items);
    RemoveView(s, id);
    ProofLib.FilterKeepsDistinctBy((t: Timer) => (t.id != id), s.items, (t: Timer) => t.id);
    DistinctToUnique(ProofLib.Filter((t: Timer) => (t.id != id), s.items));
    ProofLib.FilterSubset((t: Timer) => (t.id != id), s.items);
  }
}

lemma reopen_ensures(s: Timers, now: int)
  ensures (inv(s) ==> canReopen(s, now) ==> alwaysPositiveDuration(reopen(s, now)))
  ensures (inv(s) ==> canReopen(s, now) ==> alwaysRemainingBounded(reopen(s, now)))
  ensures (inv(s) ==> canReopen(s, now) ==> alwaysRunningHasEndAt(reopen(s, now)))
  ensures (inv(s) ==> canReopen(s, now) ==> alwaysUniqueTimerIds(reopen(s, now)))
  ensures (inv(s) ==> canReopen(s, now) ==> alwaysBoundedTimers(reopen(s, now)))
  ensures (inv(s) ==> canReopen(s, now) ==> stepPausePreservesRemaining(s, "reopen", reopen(s, now)))
  ensures (inv(s) ==> canReopen(s, now) ==> stepFinishNeverEarly(s, "reopen", reopen(s, now)))
{
  if inv(s) && canReopen(s, now) {
    MapPreservesUnique(s.items, reopen(s, now).items);
  }
}
