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
    ProofLib.FoldLeftInflationary((n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n), 1, steps);
    ProofLib.FoldLeftAboveEach((n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n), (s: app__workflows__steps_Step) => s.id + 1, 1, steps);
  }
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
    app__workflows__schedule_lawEveryChangeKeepsTheScheduleWellFormed_ensures(b.when, b.when.preset, day, b.when.hour, b.when.minute, b.when.zone);
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
    ProofLib.FoldLeftInflationary((n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n), b.next, steps);
    ProofLib.FoldLeftAboveEach((n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n), (s: app__workflows__steps_Step) => s.id + 1, b.next, steps);
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
    ProofLib.FoldLeftInflationary((n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n), b.next, steps);
    ProofLib.FoldLeftAboveEach((n: int, s: app__workflows__steps_Step) => (if (s.id >= n) then (s.id + 1) else n), (s: app__workflows__steps_Step) => s.id + 1, b.next, steps);
  }
}
