lemma start_ensures(s: Resident, found: bool)
  ensures (inv(s) ==> canStart(s) ==> alwaysALaunchIsOwnedOnlyWhileStarting(start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> alwaysAutomaticStartsAreBounded(start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> alwaysTheAgentIsCheckedOnlyWhileUp(start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> alwaysReviewKeepsTheRecords(start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> alwaysNothingRunsDuringAChange(start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> alwaysErasingStopsTheAgent(start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "start", start(s, found).state, start(s, found).out))
  ensures (inv(s) ==> canStart(s) ==> stepEveryStartTakesTheNextNumber(s, start(s, found).state, start(s, found).out))
  ensures (inv(s) ==> canStart(s) ==> stepAStopNamesItsStart(s, start(s, found).state, start(s, found).out))
  ensures (inv(s) ==> canStart(s) ==> stepOnlyAnAutomaticStartIsCounted(s, "start", start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "start", start(s, found).state))
  ensures (inv(s) ==> canStart(s) ==> stepOnlyTheNetworkChangesOnline(s, "start", start(s, found).state))
{
  if inv(s) && canStart(s) {
    var after := start(s, found);
    if |after.out| > 0 {
      assert after.out[0] in after.out;
    }
  }
}

lemma retry_ensures(s: Resident, now: int)
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysALaunchIsOwnedOnlyWhileStarting(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysAutomaticStartsAreBounded(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysTheAgentIsCheckedOnlyWhileUp(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysReviewKeepsTheRecords(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysNothingRunsDuringAChange(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> alwaysErasingStopsTheAgent(retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "retry", retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepEveryStartTakesTheNextNumber(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepAStopNamesItsStart(s, retry(s, now).state, retry(s, now).out))
  ensures (inv(s) ==> canRetry(s, now) ==> stepOnlyAnAutomaticStartIsCounted(s, "retry", retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "retry", retry(s, now).state))
  ensures (inv(s) ==> canRetry(s, now) ==> stepOnlyTheNetworkChangesOnline(s, "retry", retry(s, now).state))
{
  if inv(s) && canRetry(s, now) {
    var after := retry(s, now);
    if |after.out| > 0 {
      assert after.out[0] in after.out;
    }
  }
}

lemma archived_ensures(s: Resident, ticket: int, done: bool, known: bool)
  ensures (inv(s) ==> canArchived(s, ticket) ==> alwaysALaunchIsOwnedOnlyWhileStarting(archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> alwaysAutomaticStartsAreBounded(archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> alwaysTheAgentIsCheckedOnlyWhileUp(archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> alwaysReviewKeepsTheRecords(archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> alwaysNothingRunsDuringAChange(archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> alwaysErasingStopsTheAgent(archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> stepACancelledStartStopsOnlyItsOwnLaunch(s, "archived", archived(s, ticket, done, known).state, archived(s, ticket, done, known).out))
  ensures (inv(s) ==> canArchived(s, ticket) ==> stepEveryStartTakesTheNextNumber(s, archived(s, ticket, done, known).state, archived(s, ticket, done, known).out))
  ensures (inv(s) ==> canArchived(s, ticket) ==> stepAStopNamesItsStart(s, archived(s, ticket, done, known).state, archived(s, ticket, done, known).out))
  ensures (inv(s) ==> canArchived(s, ticket) ==> stepOnlyAnAutomaticStartIsCounted(s, "archived", archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(s, "archived", archived(s, ticket, done, known).state))
  ensures (inv(s) ==> canArchived(s, ticket) ==> stepOnlyTheNetworkChangesOnline(s, "archived", archived(s, ticket, done, known).state))
{
  if inv(s) && canArchived(s, ticket) {
    var after := archived(s, ticket, done, known);
    if |after.out| > 0 {
      assert after.out[0] in after.out;
    }
  }
}
