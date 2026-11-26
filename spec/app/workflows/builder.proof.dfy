lemma NextFold(start: int, steps: seq<app__workflows__steps_Step>)
  requires start >= 1
  ensures var res := Std.Collections.Seq.FoldLeft((n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n), start, steps);
    res >= start && forall s :: s in steps ==> s.id < res
  decreases |steps|
{
  if |steps| > 0 {
    var f := (n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n);
    var next := f(start, steps[0]);
    assert Std.Collections.Seq.FoldLeft(f, start, steps) == Std.Collections.Seq.FoldLeft(f, next, steps[1..]);
    NextFold(next, steps[1..]);
    forall s | s in steps ensures s.id < Std.Collections.Seq.FoldLeft(f, next, steps[1..]) {
      if s == steps[0] {
        assert s.id < next;
      } else {
        assert s in steps[1..];
      }
    }
  }
}

lemma offerRead_ensures(b: Builder, ticket: int, ok: bool, speaks: bool, reminders: bool, runDay: bool, schedules: bool, generates: bool, steps: seq<app__workflows__steps_Step>, name: int, when: app__workflows__schedule_When)
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> alwaysTheDraftIsShaped(offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> alwaysAWriteIsNamed(offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> alwaysAKeptSaveLocksTheDraft(offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> stepAGeneratedDraftIsUsedOnItsBaseline(b, "offerRead", offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> stepAKeptSaveFreezesTheDraft(b, "offerRead", offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> stepASaveIsAppliedOnce(b, "offerRead", offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> stepASaveIsSentOnlyWhenConfirmed(b, "offerRead", offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when), []))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> stepAKeptSaveIsLetGoOnlyWhenSettled(b, "offerRead", offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
  ensures (inv(b) ==> canOfferRead(b, ticket, steps) ==> stepStepsChangeOnlyByTheOwner(b, "offerRead", offerRead(b, ticket, ok, speaks, reminders, runDay, schedules, generates, steps, name, when)))
{
  if inv(b) && canOfferRead(b, ticket, steps) {
    NextFold(1, steps);
  }
}

lemma ToggleDayDays(w: app__workflows__schedule_When, day: int)
  ensures app__workflows__schedule_toggleDay(w, day).days ==
    (if day in w.days then ProofLib.Filter((set_x: int) => !((set_x in [day])), w.days)
     else w.days + ProofLib.Filter((set_x: int) => !((set_x in w.days)), [day]))
{
}

lemma toggleDay_ensures(b: Builder, day: int)
  ensures (inv(b) ==> canToggleDay(b, day) ==> alwaysTheDraftIsShaped(toggleDay(b, day)))
  ensures (inv(b) ==> canToggleDay(b, day) ==> alwaysAWriteIsNamed(toggleDay(b, day)))
  ensures (inv(b) ==> canToggleDay(b, day) ==> alwaysAKeptSaveLocksTheDraft(toggleDay(b, day)))
  ensures (inv(b) ==> canToggleDay(b, day) ==> stepAGeneratedDraftIsUsedOnItsBaseline(b, "toggleDay", toggleDay(b, day)))
  ensures (inv(b) ==> canToggleDay(b, day) ==> stepAKeptSaveFreezesTheDraft(b, "toggleDay", toggleDay(b, day)))
  ensures (inv(b) ==> canToggleDay(b, day) ==> stepASaveIsAppliedOnce(b, "toggleDay", toggleDay(b, day)))
  ensures (inv(b) ==> canToggleDay(b, day) ==> stepASaveIsSentOnlyWhenConfirmed(b, "toggleDay", toggleDay(b, day), []))
  ensures (inv(b) ==> canToggleDay(b, day) ==> stepAKeptSaveIsLetGoOnlyWhenSettled(b, "toggleDay", toggleDay(b, day)))
  ensures (inv(b) ==> canToggleDay(b, day) ==> stepStepsChangeOnlyByTheOwner(b, "toggleDay", toggleDay(b, day)))
{
  if inv(b) && canToggleDay(b, day) {
    ToggleDayDays(b.when, day);
    var days := app__workflows__schedule_toggleDay(b.when, day).days;
    if day in b.when.days {
      forall d | d in days ensures 0 <= d <= 6 {
        ProofLib.FilterMember((set_x: int) => !((set_x in [day])), b.when.days, d);
      }
      var other :| other in b.when.days && other != day;
      ProofLib.FilterMember((set_x: int) => !((set_x in [day])), b.when.days, other);
      assert other in days;
    } else {
      forall d | d in days ensures 0 <= d <= 6 {
        ProofLib.FilterMember((set_x: int) => !((set_x in b.when.days)), [day], d);
      }
      ProofLib.FilterMember((set_x: int) => !((set_x in b.when.days)), [day], day);
      assert day in days;
    }
  }
}

lemma useGenerated_ensures(b: Builder, steps: seq<app__workflows__steps_Step>, baseline: int)
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> alwaysTheDraftIsShaped(useGenerated(b, steps, baseline)))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> alwaysAWriteIsNamed(useGenerated(b, steps, baseline)))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> alwaysAKeptSaveLocksTheDraft(useGenerated(b, steps, baseline)))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> stepAGeneratedDraftIsUsedOnItsBaseline(b, "useGenerated", useGenerated(b, steps, baseline)))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> stepAKeptSaveFreezesTheDraft(b, "useGenerated", useGenerated(b, steps, baseline)))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> stepASaveIsAppliedOnce(b, "useGenerated", useGenerated(b, steps, baseline)))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> stepASaveIsSentOnlyWhenConfirmed(b, "useGenerated", useGenerated(b, steps, baseline), []))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> stepAKeptSaveIsLetGoOnlyWhenSettled(b, "useGenerated", useGenerated(b, steps, baseline)))
  ensures (inv(b) ==> canUseGenerated(b, steps, baseline) ==> stepStepsChangeOnlyByTheOwner(b, "useGenerated", useGenerated(b, steps, baseline)))
{
  if inv(b) && canUseGenerated(b, steps, baseline) {
    NextFold(b.next, steps);
  }
}

lemma takeSaved_ensures(b: Builder, steps: seq<app__workflows__steps_Step>)
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> alwaysTheDraftIsShaped(takeSaved(b, steps)))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> alwaysAWriteIsNamed(takeSaved(b, steps)))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> alwaysAKeptSaveLocksTheDraft(takeSaved(b, steps)))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> stepAGeneratedDraftIsUsedOnItsBaseline(b, "takeSaved", takeSaved(b, steps)))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> stepAKeptSaveFreezesTheDraft(b, "takeSaved", takeSaved(b, steps)))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> stepASaveIsAppliedOnce(b, "takeSaved", takeSaved(b, steps)))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> stepASaveIsSentOnlyWhenConfirmed(b, "takeSaved", takeSaved(b, steps), []))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> stepAKeptSaveIsLetGoOnlyWhenSettled(b, "takeSaved", takeSaved(b, steps)))
  ensures (inv(b) ==> canTakeSaved(b, steps) ==> stepStepsChangeOnlyByTheOwner(b, "takeSaved", takeSaved(b, steps)))
{
  if inv(b) && canTakeSaved(b, steps) {
    NextFold(b.next, steps);
  }
}
