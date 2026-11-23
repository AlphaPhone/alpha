// Proofs for spec/app/account/change.md.

lemma concluded_ensures(c: Change, attempt: int, result: Result)
  ensures (inv(c) ==> canConcluded(c, attempt) ==> alwaysOneThingAtATime(concluded(c, attempt, result).state))
  ensures (inv(c) ==> canConcluded(c, attempt) ==> stepAChangeIsConfirmedOnlyAsQuoted(c, "concluded", concluded(c, attempt, result).state, concluded(c, attempt, result).out))
  ensures (inv(c) ==> canConcluded(c, attempt) ==> stepACancelIsConfirmed(c, concluded(c, attempt, result).state, concluded(c, attempt, result).out))
  ensures (inv(c) ==> canConcluded(c, attempt) ==> stepNothingUnconfirmedIsToldAsDone(c, "concluded", concluded(c, attempt, result).state))
  ensures (inv(c) ==> canConcluded(c, attempt) ==> stepEveryOutcomeIsCheckedNotTrusted(c, "concluded", concluded(c, attempt, result).state, concluded(c, attempt, result).out))
  ensures (inv(c) ==> canConcluded(c, attempt) ==> stepNothingStartsWhileAnOutcomeIsUnknown(c, concluded(c, attempt, result).state, concluded(c, attempt, result).out))
  ensures (inv(c) ==> canConcluded(c, attempt) ==> stepANewSignInLeavesNothingUnderWay(c, "concluded", concluded(c, attempt, result).state))
{
  if inv(c) && canConcluded(c, attempt) {
    var after := concluded(c, attempt, result);
    var front: seq<Effect> := if result.PayNeeded? then [Effect.PayInvoice] else (if result.NotAuthorized? then [Effect.VerifyOwner] else []);
    assert after.out == front + [Effect.CheckPlan];
    assert after.out[|after.out| - 1] == Effect.CheckPlan;
    assert Effect.CheckPlan in after.out;
    forall e | e in after.out ensures !(e.AskQuote? || e.ConfirmChange? || e.CancelAtEnd? || e.KeepGoing?) { }
    assert !asksCloud(after.out);
  }
}
