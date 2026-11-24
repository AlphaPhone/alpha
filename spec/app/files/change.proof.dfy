lemma FinishedDone(c: Change, ticket: int, done: seq<int>, failed: seq<int>)
  ensures finished(c, ticket, done, failed).done == (var F := ProofLib.Filter((i: app__files__shared_Item) => (i.id in done), c.items); seq(|F|, i_map requires 0 <= i_map < |F| => var i := F[i_map]; i.id))
{
}

lemma finished_ensures(c: Change, ticket: int, done: seq<int>, failed: seq<int>)
  ensures (inv(c) ==> canFinished(c, ticket) ==> alwaysAChoiceComesBeforeSending(finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> alwaysAChoiceWaitsOnAFittingChange(finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> alwaysTheAgentNeverReplaces(finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> alwaysNothingMovesIntoItself(finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> alwaysOnlyItemsOfTheChangeAreDone(finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> alwaysNoTextMessageShare(finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> alwaysTheSheetWasNumbered(finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> stepReplacingIsTheOwnersChoice(c, "finished", finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> stepAnUnknownItemIsNotSentAgain(c, "finished", finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> stepOneSendPerSheet(c, "finished", finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> stepSheetsAreNumberedAfresh(c, finished(c, ticket, done, failed)))
  ensures (inv(c) ==> canFinished(c, ticket) ==> stepARestartLeavesNothingUnderWay(c, "finished", finished(c, ticket, done, failed)))
{
  if inv(c) && canFinished(c, ticket) {
    var after := finished(c, ticket, done, failed);
    var F := ProofLib.Filter((i: app__files__shared_Item) => (i.id in done), c.items);
    FinishedDone(c, ticket, done, failed);
    forall id | id in after.done ensures exists i :: i in c.items && i.id == id {
      var k :| 0 <= k < |after.done| && after.done[k] == id;
      assert F[k] in F;
      ProofLib.FilterMember((i: app__files__shared_Item) => (i.id in done), c.items, F[k]);
    }
  }
}
