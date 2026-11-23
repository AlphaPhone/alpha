// Proofs for spec/app/account/plan.md.

lemma checked_ensures(p: Plan, ticket: int, answer: Verified, signIn: int, now: int)
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> alwaysExpiryIsHonest(checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> alwaysGraceIsBoundToASignInsRecordAndKeptOnlyOffline(checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> alwaysARefusalLeavesNoRecord(checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> alwaysTheFundingSheetIsOpenOnlyWithoutCloudAi(checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> alwaysADismissalHoldsOnlyForItsNotice(checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepANewSignInStartsFromNothing(p, "checked", checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepARefusalIsNeverUpgradedByTheRecord(p, checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepARefusedSignInIsEnded(p, checked(p, ticket, answer, signIn, now).state, checked(p, ticket, answer, signIn, now).out))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepOnlyCloudsAnswerWritesTheRecord(p, "checked", checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepOnlyCloudsAnswerTurnsAiOn(p, "checked", checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepUsageIsOnlyWhatCloudReported(p, "checked", checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepAutomaticChecksAreAMinuteApart(p, "checked", checked(p, ticket, answer, signIn, now).state))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepReconnectingChecksOnceForEachReturn(p, "checked", checked(p, ticket, answer, signIn, now).state, checked(p, ticket, answer, signIn, now).out))
  ensures (inv(p) ==> canChecked(p, ticket, signIn) ==> stepARestartKeepsOnlyItsSignInsRecord(p, "checked", checked(p, ticket, answer, signIn, now).state))
{
  if inv(p) && canChecked(p, ticket, signIn) {
    var after := checked(p, ticket, answer, signIn, now);
    var q := timed(now, p);
    if admits(answer) && answer.until > q.seen {
    } else if answer.kind.NoPlan? {
    } else if answer.kind.SignInRefused? {
      assert after.out == [Effect.Answered, Effect.EndSignIn];
      assert after.out[1].EndSignIn?;
    } else {
      assert after == failed(true, signIn, q);
    }
  }
}
