lemma UnconfirmedIs(d: Reminders)
  ensures unconfirmed(d) == |ProofLib.Filter((n: int) => ((held(d, n).status.Pending? || held(d, n).status.Unsaved?) && held(d, n).change.Schedule?), d.numbers)|
{
}

lemma NoMoreUnconfirmed(d: Reminders, e: Reminders)
  requires e.numbers == d.numbers
  requires forall n :: n in d.numbers && ((held(e, n).status.Pending? || held(e, n).status.Unsaved?) && held(e, n).change.Schedule?) ==> ((held(d, n).status.Pending? || held(d, n).status.Unsaved?) && held(d, n).change.Schedule?)
  ensures unconfirmed(e) <= unconfirmed(d)
{
  UnconfirmedIs(d);
  UnconfirmedIs(e);
  ProofLib.FilterImpLength((n: int) => ((held(e, n).status.Pending? || held(e, n).status.Unsaved?) && held(e, n).change.Schedule?), (n: int) => ((held(d, n).status.Pending? || held(d, n).status.Unsaved?) && held(d, n).change.Schedule?), d.numbers);
}

lemma CreateAddsOne(d: Reminders, number: int, at: int, daily: bool, now: int, approval: int, insisted: bool, signedIn: int, by_: app__approvals__operation_Actor)
  ensures create(d, number, at, daily, now, approval, insisted, signedIn, by_).state.numbers == d.numbers + ProofLib.Filter((set_x: int) => !((set_x in d.numbers)), [number])
{
}

lemma RecoverTakesOne(d: Reminders, number: int, by_: app__approvals__operation_Actor)
  ensures recover(d, number, by_).state.interrupted == ProofLib.Filter((set_x: int) => !((set_x in [number])), d.interrupted)
{
}

lemma read_ensures(d: Reminders, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canRead(d, by_) ==> alwaysEveryReminderKeepsItsRules(read(d, by_).state))
  ensures (inv(d) ==> canRead(d, by_) ==> alwaysTheListIsCurrentOrMarked(read(d, by_).state))
  ensures (inv(d) ==> canRead(d, by_) ==> alwaysFewCreationsAreUnconfirmed(read(d, by_).state))
  ensures (inv(d) ==> canRead(d, by_) ==> stepAFailureIsSaidOnce(d, "read", read(d, by_).state, read(d, by_).out))
  ensures (inv(d) ==> canRead(d, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "read", read(d, by_).state))
  ensures (inv(d) ==> canRead(d, by_) ==> stepEachReminderIsPickedUpOnce(d, "read", read(d, by_).state, read(d, by_).out))
{
  if inv(d) && canRead(d, by_) {
    var after := read(d, by_).state;
    forall n | n in d.numbers ensures held(after, n) == held(d, n) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma listed_ensures(d: Reminders, ticket: int, ok: bool, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canListed(d, ticket, by_) ==> alwaysEveryReminderKeepsItsRules(listed(d, ticket, ok, by_).state))
  ensures (inv(d) ==> canListed(d, ticket, by_) ==> alwaysTheListIsCurrentOrMarked(listed(d, ticket, ok, by_).state))
  ensures (inv(d) ==> canListed(d, ticket, by_) ==> alwaysFewCreationsAreUnconfirmed(listed(d, ticket, ok, by_).state))
  ensures (inv(d) ==> canListed(d, ticket, by_) ==> stepAFailureIsSaidOnce(d, "listed", listed(d, ticket, ok, by_).state, listed(d, ticket, ok, by_).out))
  ensures (inv(d) ==> canListed(d, ticket, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "listed", listed(d, ticket, ok, by_).state))
  ensures (inv(d) ==> canListed(d, ticket, by_) ==> stepEachReminderIsPickedUpOnce(d, "listed", listed(d, ticket, ok, by_).state, listed(d, ticket, ok, by_).out))
{
  if inv(d) && canListed(d, ticket, by_) {
    var after := listed(d, ticket, ok, by_).state;
    forall n | n in d.numbers ensures held(after, n) == held(d, n) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma refuseCreate_ensures(d: Reminders, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canRefuseCreate(d, by_) ==> alwaysEveryReminderKeepsItsRules(refuseCreate(d, by_)))
  ensures (inv(d) ==> canRefuseCreate(d, by_) ==> alwaysTheListIsCurrentOrMarked(refuseCreate(d, by_)))
  ensures (inv(d) ==> canRefuseCreate(d, by_) ==> alwaysFewCreationsAreUnconfirmed(refuseCreate(d, by_)))
  ensures (inv(d) ==> canRefuseCreate(d, by_) ==> stepAFailureIsSaidOnce(d, "refuseCreate", refuseCreate(d, by_), []))
  ensures (inv(d) ==> canRefuseCreate(d, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "refuseCreate", refuseCreate(d, by_)))
  ensures (inv(d) ==> canRefuseCreate(d, by_) ==> stepEachReminderIsPickedUpOnce(d, "refuseCreate", refuseCreate(d, by_), []))
{
  if inv(d) && canRefuseCreate(d, by_) {
    var after := refuseCreate(d, by_);
    forall n | n in d.numbers ensures held(after, n) == held(d, n) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma create_ensures(d: Reminders, number: int, at: int, daily: bool, now: int, approval: int, insisted: bool, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canCreate(d, number, at, daily, now, approval, insisted, signedIn, by_) ==> alwaysEveryReminderKeepsItsRules(create(d, number, at, daily, now, approval, insisted, signedIn, by_).state))
  ensures (inv(d) ==> canCreate(d, number, at, daily, now, approval, insisted, signedIn, by_) ==> alwaysTheListIsCurrentOrMarked(create(d, number, at, daily, now, approval, insisted, signedIn, by_).state))
  ensures (inv(d) ==> canCreate(d, number, at, daily, now, approval, insisted, signedIn, by_) ==> alwaysFewCreationsAreUnconfirmed(create(d, number, at, daily, now, approval, insisted, signedIn, by_).state))
  ensures (inv(d) ==> canCreate(d, number, at, daily, now, approval, insisted, signedIn, by_) ==> stepAFailureIsSaidOnce(d, "create", create(d, number, at, daily, now, approval, insisted, signedIn, by_).state, create(d, number, at, daily, now, approval, insisted, signedIn, by_).out))
  ensures (inv(d) ==> canCreate(d, number, at, daily, now, approval, insisted, signedIn, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "create", create(d, number, at, daily, now, approval, insisted, signedIn, by_).state))
  ensures (inv(d) ==> canCreate(d, number, at, daily, now, approval, insisted, signedIn, by_) ==> stepEachReminderIsPickedUpOnce(d, "create", create(d, number, at, daily, now, approval, insisted, signedIn, by_).state, create(d, number, at, daily, now, approval, insisted, signedIn, by_).out))
{
  if inv(d) && canCreate(d, number, at, daily, now, approval, insisted, signedIn, by_) {
    var after := create(d, number, at, daily, now, approval, insisted, signedIn, by_).state;
    var f := (set_x: int) => !((set_x in d.numbers));
    CreateAddsOne(d, number, at, daily, now, approval, insisted, signedIn, by_);
    ProofLib.FilterNil(f, []);
    ProofLib.FilterCons(f, [number]);
    assert after.numbers == d.numbers + [number];
    var r := app__notices__reminder_create(app__notices__reminder_initial, number, at, daily, now, approval, signedIn, by_);
    forall n | n in d.numbers ensures held(after, n) == held(d, n) {
    }
    assert held(after, number) == r;
    forall n | n in after.numbers ensures keepsItsRules(n, held(after, n)) {
      if n != number { assert n in d.numbers; assert keepsItsRules(n, held(d, n)); }
    }
    var pa := (n: int) => ((held(after, n).status.Pending? || held(after, n).status.Unsaved?) && held(after, n).change.Schedule?);
    var pd := (n: int) => ((held(d, n).status.Pending? || held(d, n).status.Unsaved?) && held(d, n).change.Schedule?);
    UnconfirmedIs(d);
    UnconfirmedIs(after);
    ProofLib.FilterAppend(pa, d.numbers, number);
    ProofLib.FilterSamePredicate(pa, pd, d.numbers);
  }
}

lemma operate_ensures(d: Reminders, number: int, now: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canOperate(d, number, now, by_) ==> alwaysEveryReminderKeepsItsRules(operate(d, number, now, by_).state))
  ensures (inv(d) ==> canOperate(d, number, now, by_) ==> alwaysTheListIsCurrentOrMarked(operate(d, number, now, by_).state))
  ensures (inv(d) ==> canOperate(d, number, now, by_) ==> alwaysFewCreationsAreUnconfirmed(operate(d, number, now, by_).state))
  ensures (inv(d) ==> canOperate(d, number, now, by_) ==> stepAFailureIsSaidOnce(d, "operate", operate(d, number, now, by_).state, operate(d, number, now, by_).out))
  ensures (inv(d) ==> canOperate(d, number, now, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "operate", operate(d, number, now, by_).state))
  ensures (inv(d) ==> canOperate(d, number, now, by_) ==> stepEachReminderIsPickedUpOnce(d, "operate", operate(d, number, now, by_).state, operate(d, number, now, by_).out))
{
  if inv(d) && canOperate(d, number, now, by_) {
    var after := operate(d, number, now, by_).state;
    var r := app__notices__reminder_operate(held(d, number), now, by_).state;
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma answer_ensures(d: Reminders, number: int, result: app__notices__reminder_Answer, reason: app__notices__reminder_Reason, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canAnswer(d, number, result, reason, by_) ==> alwaysEveryReminderKeepsItsRules(answer(d, number, result, reason, by_).state))
  ensures (inv(d) ==> canAnswer(d, number, result, reason, by_) ==> alwaysTheListIsCurrentOrMarked(answer(d, number, result, reason, by_).state))
  ensures (inv(d) ==> canAnswer(d, number, result, reason, by_) ==> alwaysFewCreationsAreUnconfirmed(answer(d, number, result, reason, by_).state))
  ensures (inv(d) ==> canAnswer(d, number, result, reason, by_) ==> stepAFailureIsSaidOnce(d, "answer", answer(d, number, result, reason, by_).state, answer(d, number, result, reason, by_).out))
  ensures (inv(d) ==> canAnswer(d, number, result, reason, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "answer", answer(d, number, result, reason, by_).state))
  ensures (inv(d) ==> canAnswer(d, number, result, reason, by_) ==> stepEachReminderIsPickedUpOnce(d, "answer", answer(d, number, result, reason, by_).state, answer(d, number, result, reason, by_).out))
{
  if inv(d) && canAnswer(d, number, result, reason, by_) {
    var after := answer(d, number, result, reason, by_).state;
    var r := app__notices__reminder_answer(held(d, number), number, result, reason, by_).state;
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma retry_ensures(d: Reminders, number: int, now: int, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canRetry(d, number, now, signedIn, by_) ==> alwaysEveryReminderKeepsItsRules(retry(d, number, now, signedIn, by_).state))
  ensures (inv(d) ==> canRetry(d, number, now, signedIn, by_) ==> alwaysTheListIsCurrentOrMarked(retry(d, number, now, signedIn, by_).state))
  ensures (inv(d) ==> canRetry(d, number, now, signedIn, by_) ==> alwaysFewCreationsAreUnconfirmed(retry(d, number, now, signedIn, by_).state))
  ensures (inv(d) ==> canRetry(d, number, now, signedIn, by_) ==> stepAFailureIsSaidOnce(d, "retry", retry(d, number, now, signedIn, by_).state, retry(d, number, now, signedIn, by_).out))
  ensures (inv(d) ==> canRetry(d, number, now, signedIn, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "retry", retry(d, number, now, signedIn, by_).state))
  ensures (inv(d) ==> canRetry(d, number, now, signedIn, by_) ==> stepEachReminderIsPickedUpOnce(d, "retry", retry(d, number, now, signedIn, by_).state, retry(d, number, now, signedIn, by_).out))
{
  if inv(d) && canRetry(d, number, now, signedIn, by_) {
    var after := retry(d, number, now, signedIn, by_).state;
    var r := app__notices__reminder_retry(held(d, number), now, signedIn, by_);
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma discard_ensures(d: Reminders, number: int, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canDiscard(d, number, signedIn, by_) ==> alwaysEveryReminderKeepsItsRules(discard(d, number, signedIn, by_).state))
  ensures (inv(d) ==> canDiscard(d, number, signedIn, by_) ==> alwaysTheListIsCurrentOrMarked(discard(d, number, signedIn, by_).state))
  ensures (inv(d) ==> canDiscard(d, number, signedIn, by_) ==> alwaysFewCreationsAreUnconfirmed(discard(d, number, signedIn, by_).state))
  ensures (inv(d) ==> canDiscard(d, number, signedIn, by_) ==> stepAFailureIsSaidOnce(d, "discard", discard(d, number, signedIn, by_).state, discard(d, number, signedIn, by_).out))
  ensures (inv(d) ==> canDiscard(d, number, signedIn, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "discard", discard(d, number, signedIn, by_).state))
  ensures (inv(d) ==> canDiscard(d, number, signedIn, by_) ==> stepEachReminderIsPickedUpOnce(d, "discard", discard(d, number, signedIn, by_).state, discard(d, number, signedIn, by_).out))
{
  if inv(d) && canDiscard(d, number, signedIn, by_) {
    var after := discard(d, number, signedIn, by_).state;
    var r := app__notices__reminder_discard(held(d, number), signedIn, by_);
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma found_ensures(d: Reminders, number: int, ticket: int, present: bool, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canFound(d, number, ticket, by_) ==> alwaysEveryReminderKeepsItsRules(found(d, number, ticket, present, by_).state))
  ensures (inv(d) ==> canFound(d, number, ticket, by_) ==> alwaysTheListIsCurrentOrMarked(found(d, number, ticket, present, by_).state))
  ensures (inv(d) ==> canFound(d, number, ticket, by_) ==> alwaysFewCreationsAreUnconfirmed(found(d, number, ticket, present, by_).state))
  ensures (inv(d) ==> canFound(d, number, ticket, by_) ==> stepAFailureIsSaidOnce(d, "found", found(d, number, ticket, present, by_).state, found(d, number, ticket, present, by_).out))
  ensures (inv(d) ==> canFound(d, number, ticket, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "found", found(d, number, ticket, present, by_).state))
  ensures (inv(d) ==> canFound(d, number, ticket, by_) ==> stepEachReminderIsPickedUpOnce(d, "found", found(d, number, ticket, present, by_).state, found(d, number, ticket, present, by_).out))
{
  if inv(d) && canFound(d, number, ticket, by_) {
    var after := found(d, number, ticket, present, by_).state;
    var r := app__notices__reminder_found(held(d, number), present, by_);
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma deleted_ensures(d: Reminders, number: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canDeleted(d, number, by_) ==> alwaysEveryReminderKeepsItsRules(deleted(d, number, by_).state))
  ensures (inv(d) ==> canDeleted(d, number, by_) ==> alwaysTheListIsCurrentOrMarked(deleted(d, number, by_).state))
  ensures (inv(d) ==> canDeleted(d, number, by_) ==> alwaysFewCreationsAreUnconfirmed(deleted(d, number, by_).state))
  ensures (inv(d) ==> canDeleted(d, number, by_) ==> stepAFailureIsSaidOnce(d, "deleted", deleted(d, number, by_).state, deleted(d, number, by_).out))
  ensures (inv(d) ==> canDeleted(d, number, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "deleted", deleted(d, number, by_).state))
  ensures (inv(d) ==> canDeleted(d, number, by_) ==> stepEachReminderIsPickedUpOnce(d, "deleted", deleted(d, number, by_).state, deleted(d, number, by_).out))
{
  if inv(d) && canDeleted(d, number, by_) {
    var after := deleted(d, number, by_).state;
    var r := app__notices__reminder_deleted(held(d, number), by_).state;
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma decide_ensures(d: Reminders, number: int, change: app__notices__reminder_Change, seen: int, fresh_: int, target: int, now: int, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canDecide(d, number, change, seen, fresh_, target, now, signedIn, by_) ==> alwaysEveryReminderKeepsItsRules(decide(d, number, change, seen, fresh_, target, now, signedIn, by_).state))
  ensures (inv(d) ==> canDecide(d, number, change, seen, fresh_, target, now, signedIn, by_) ==> alwaysTheListIsCurrentOrMarked(decide(d, number, change, seen, fresh_, target, now, signedIn, by_).state))
  ensures (inv(d) ==> canDecide(d, number, change, seen, fresh_, target, now, signedIn, by_) ==> alwaysFewCreationsAreUnconfirmed(decide(d, number, change, seen, fresh_, target, now, signedIn, by_).state))
  ensures (inv(d) ==> canDecide(d, number, change, seen, fresh_, target, now, signedIn, by_) ==> stepAFailureIsSaidOnce(d, "decide", decide(d, number, change, seen, fresh_, target, now, signedIn, by_).state, decide(d, number, change, seen, fresh_, target, now, signedIn, by_).out))
  ensures (inv(d) ==> canDecide(d, number, change, seen, fresh_, target, now, signedIn, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "decide", decide(d, number, change, seen, fresh_, target, now, signedIn, by_).state))
  ensures (inv(d) ==> canDecide(d, number, change, seen, fresh_, target, now, signedIn, by_) ==> stepEachReminderIsPickedUpOnce(d, "decide", decide(d, number, change, seen, fresh_, target, now, signedIn, by_).state, decide(d, number, change, seen, fresh_, target, now, signedIn, by_).out))
{
  if inv(d) && canDecide(d, number, change, seen, fresh_, target, now, signedIn, by_) {
    var after := decide(d, number, change, seen, fresh_, target, now, signedIn, by_).state;
    var r := app__notices__reminder_decide(held(d, number), change, seen, fresh_, target, now, signedIn, by_);
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma due_ensures(d: Reminders, number: int, now: int, revision: int, notifications: bool, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canDue(d, number, now, revision, notifications, by_) ==> alwaysEveryReminderKeepsItsRules(due(d, number, now, revision, notifications, by_).state))
  ensures (inv(d) ==> canDue(d, number, now, revision, notifications, by_) ==> alwaysTheListIsCurrentOrMarked(due(d, number, now, revision, notifications, by_).state))
  ensures (inv(d) ==> canDue(d, number, now, revision, notifications, by_) ==> alwaysFewCreationsAreUnconfirmed(due(d, number, now, revision, notifications, by_).state))
  ensures (inv(d) ==> canDue(d, number, now, revision, notifications, by_) ==> stepAFailureIsSaidOnce(d, "due", due(d, number, now, revision, notifications, by_).state, due(d, number, now, revision, notifications, by_).out))
  ensures (inv(d) ==> canDue(d, number, now, revision, notifications, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "due", due(d, number, now, revision, notifications, by_).state))
  ensures (inv(d) ==> canDue(d, number, now, revision, notifications, by_) ==> stepEachReminderIsPickedUpOnce(d, "due", due(d, number, now, revision, notifications, by_).state, due(d, number, now, revision, notifications, by_).out))
{
  if inv(d) && canDue(d, number, now, revision, notifications, by_) {
    var after := due(d, number, now, revision, notifications, by_).state;
    var r := app__notices__reminder_due(held(d, number), now, revision, notifications, by_);
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma revise_ensures(d: Reminders, number: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canRevise(d, number, by_) ==> alwaysEveryReminderKeepsItsRules(revise(d, number, by_).state))
  ensures (inv(d) ==> canRevise(d, number, by_) ==> alwaysTheListIsCurrentOrMarked(revise(d, number, by_).state))
  ensures (inv(d) ==> canRevise(d, number, by_) ==> alwaysFewCreationsAreUnconfirmed(revise(d, number, by_).state))
  ensures (inv(d) ==> canRevise(d, number, by_) ==> stepAFailureIsSaidOnce(d, "revise", revise(d, number, by_).state, revise(d, number, by_).out))
  ensures (inv(d) ==> canRevise(d, number, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "revise", revise(d, number, by_).state))
  ensures (inv(d) ==> canRevise(d, number, by_) ==> stepEachReminderIsPickedUpOnce(d, "revise", revise(d, number, by_).state, revise(d, number, by_).out))
{
  if inv(d) && canRevise(d, number, by_) {
    var after := revise(d, number, by_).state;
    var r := app__notices__reminder_revise(held(d, number), by_);
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma restart_ensures(d: Reminders, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canRestart(d, by_) ==> alwaysEveryReminderKeepsItsRules(restart(d, by_)))
  ensures (inv(d) ==> canRestart(d, by_) ==> alwaysTheListIsCurrentOrMarked(restart(d, by_)))
  ensures (inv(d) ==> canRestart(d, by_) ==> alwaysFewCreationsAreUnconfirmed(restart(d, by_)))
  ensures (inv(d) ==> canRestart(d, by_) ==> stepAFailureIsSaidOnce(d, "restart", restart(d, by_), []))
  ensures (inv(d) ==> canRestart(d, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "restart", restart(d, by_)))
  ensures (inv(d) ==> canRestart(d, by_) ==> stepEachReminderIsPickedUpOnce(d, "restart", restart(d, by_), []))
{
  if inv(d) && canRestart(d, by_) {
    var after := restart(d, by_);
    forall n | n in d.numbers ensures held(after, n) == held(d, n) {
    }
    NoMoreUnconfirmed(d, after);
  }
}

lemma recover_ensures(d: Reminders, number: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canRecover(d, number, by_) ==> alwaysEveryReminderKeepsItsRules(recover(d, number, by_).state))
  ensures (inv(d) ==> canRecover(d, number, by_) ==> alwaysTheListIsCurrentOrMarked(recover(d, number, by_).state))
  ensures (inv(d) ==> canRecover(d, number, by_) ==> alwaysFewCreationsAreUnconfirmed(recover(d, number, by_).state))
  ensures (inv(d) ==> canRecover(d, number, by_) ==> stepAFailureIsSaidOnce(d, "recover", recover(d, number, by_).state, recover(d, number, by_).out))
  ensures (inv(d) ==> canRecover(d, number, by_) ==> stepAnUnknownSchedulingIsSettledByALaterRead(d, "recover", recover(d, number, by_).state))
  ensures (inv(d) ==> canRecover(d, number, by_) ==> stepEachReminderIsPickedUpOnce(d, "recover", recover(d, number, by_).state, recover(d, number, by_).out))
{
  if inv(d) && canRecover(d, number, by_) {
    var after := recover(d, number, by_).state;
    var r := app__notices__reminder_recovered(held(d, number), by_).state;
    forall n | n in d.numbers ensures held(after, n) == (if n == number then r else held(d, n)) {
    }
    NoMoreUnconfirmed(d, after);
    var f := (set_x: int) => !((set_x in [number]));
    RecoverTakesOne(d, number, by_);
    forall k | k in after.interrupted ensures k in d.interrupted && k != number {
      ProofLib.FilterMember(f, d.interrupted, k);
    }
    assert keepsItsRules(number, held(d, number));
    forall n | n in after.numbers ensures keepsItsRules(n, held(after, n)) {
      if n != number { assert keepsItsRules(n, held(d, n)); }
    }
  }
}

