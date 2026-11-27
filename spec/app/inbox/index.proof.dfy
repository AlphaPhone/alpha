// The cursor given up is among those spent, and the one account that may be
// read is a connected one: the Filters of a set union and of a selection.

lemma LoadMoreSpent(s: Mailbox)
  ensures loadMore(s).state.spent == s.spent + ProofLib.Filter((set_x: int) => !((set_x in s.spent)), [s.cursor])
{
}

lemma SoleReadableFilter(connected: seq<Linked>)
  ensures soleReadable(connected) == (var local_0 := ProofLib.Filter((c: Linked) => app__inbox__access_allows(c.grant, app__inbox__access_Deed.Reading), connected); if (|local_0| == 1) then (if ((0 <= 0) && (0 < |local_0|)) then local_0[0] else noLink).account else 0)
{
}

lemma SoleReadableIsConnected(connected: seq<Linked>)
  ensures soleReadable(connected) == 0 || isConnected(connected, soleReadable(connected))
{
  SoleReadableFilter(connected);
  var readers := ProofLib.Filter((c: Linked) => app__inbox__access_allows(c.grant, app__inbox__access_Deed.Reading), connected);
  if |readers| == 1 {
    ProofLib.FilterSubset((c: Linked) => app__inbox__access_allows(c.grant, app__inbox__access_Deed.Reading), connected);
    assert readers[0] in connected;
  }
}

lemma loadMore_ensures(s: Mailbox)
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysCountsAreNotNegative(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAPageCursorIsUsedOnce(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAFurtherPageNeedsAFreshList(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysChosenMessagesBelongToAFreshList(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAccountsAreKnownOnlyFromAnAnswer(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysTheAccountSelectedIsConnected(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysNothingIsShownWithoutReadAccess(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysASavedListIsBoundToItsCredential(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysTheListKeptIsOfItsCredential(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAFreshCountWasRead(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepAFailedReadKeepsTheList(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepChangingTheSelectionForgetsTheListAndItsRead(s, loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepEveryReadIsForTheSelection(s, loadMore(s).state, loadMore(s).out))
  ensures (inv(s) ==> canLoadMore(s) ==> stepARevokedReadEmptiesTheList(s, loadMore(s).state, loadMore(s).out))
  ensures (inv(s) ==> canLoadMore(s) ==> stepACursorIsGivenUpWhenItsPageIsAsked(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepACheckAfterAFailedReadReadsAgain(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepAHeldCheckForgetsNothing(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepARestartKnowsNoGrant(s, "loadMore", loadMore(s).state))
{
  if inv(s) && canLoadMore(s) {
    LoadMoreSpent(s);
    ProofLib.FilterMember((set_x: int) => !((set_x in s.spent)), [s.cursor], s.cursor);
  }
}

lemma AccountsAnsweredBranch(s: Mailbox, ticket: int, ok: bool, connected: seq<Linked>, placed: Mailbox)
  requires inv(s) && canAccountsAnswered(s, ticket) && ok
  requires var local_11 := s.(accounts := kit__read_answer(s.accounts, ok));
           var local_12 := isConnected(connected, s.selected.account);
           var local_13 := if local_12 then s.selected.account else soleReadable(connected);
           var local_14 := linkOf(s.connected, local_13).credential;
           var local_15 := if local_14 != 0 then local_14 else if s.kept.account == local_13 then s.keptCredential else 0;
           var local_16 := local_12 && local_15 != 0 && linkOf(connected, local_13).credential != local_15;
           var local_18 := if keptOutlived(connected, s) then withoutKept(local_11) else local_11;
           var local_19 := local_18.(connected := connected, checked := ticket, failure := if s.failure.Revoked? || s.failure.LeaseNeeded? then Failure.Fine else s.failure);
           placed == (if local_16 then emptied(local_13, local_19).(list := local_19.list.(status := kit__read_Status.Idle)) else if local_12 then local_19 else turned(Selection(local_13, Folder.Incoming, ""), local_19.(searchable := false)))
  ensures alwaysCountsAreNotNegative(placed)
  ensures alwaysAPageCursorIsUsedOnce(placed)
  ensures alwaysAFurtherPageNeedsAFreshList(placed)
  ensures readable(placed) ==> alwaysChosenMessagesBelongToAFreshList(placed)
  ensures alwaysAccountsAreKnownOnlyFromAnAnswer(placed)
  ensures alwaysTheAccountSelectedIsConnected(placed)
  ensures readable(placed) ==> alwaysASavedListIsBoundToItsCredential(placed)
  ensures alwaysTheListKeptIsOfItsCredential(placed)
  ensures alwaysAFreshCountWasRead(placed)
  ensures !placed.failure.Revoked?
  ensures placed.list.ticket >= s.list.ticket && placed.revision >= s.revision
  ensures placed.selected != s.selected ==> (placed.pages == 0 || placed.saved) && placed.cursor == 0 && |placed.chosen| == 0 && placed.revision > s.revision
  ensures !readable(placed) ==> alwaysNothingIsShownWithoutReadAccess(emptied(if isConnected(connected, s.selected.account) then s.selected.account else soleReadable(connected), placed))
{
  SoleReadableIsConnected(connected);
}

lemma AccountsAnsweredAsking(s: Mailbox, ticket: int, ok: bool, connected: seq<Linked>, placed: Mailbox)
  requires inv(s) && canAccountsAnswered(s, ticket) && ok && readable(placed) && searchableIn(placed.selected.folder, placed)
  requires alwaysCountsAreNotNegative(placed) && alwaysAPageCursorIsUsedOnce(placed) && alwaysAFurtherPageNeedsAFreshList(placed)
  requires alwaysChosenMessagesBelongToAFreshList(placed) && alwaysAccountsAreKnownOnlyFromAnAnswer(placed)
  requires alwaysTheAccountSelectedIsConnected(placed) && alwaysASavedListIsBoundToItsCredential(placed)
  requires alwaysTheListKeptIsOfItsCredential(placed) && alwaysAFreshCountWasRead(placed)
  requires !placed.failure.Revoked? && placed.list.ticket >= s.list.ticket
  requires placed.selected != s.selected ==> (placed.pages == 0 || placed.saved) && placed.cursor == 0 && |placed.chosen| == 0 && placed.revision > s.revision
  requires accountsAnswered(s, ticket, ok, connected) == asking(0, placed)
  ensures var m := accountsAnswered(s, ticket, ok, connected);
    alwaysCountsAreNotNegative(m.state) && alwaysAPageCursorIsUsedOnce(m.state) &&
    alwaysAFurtherPageNeedsAFreshList(m.state) && alwaysChosenMessagesBelongToAFreshList(m.state) &&
    alwaysAccountsAreKnownOnlyFromAnAnswer(m.state) && alwaysTheAccountSelectedIsConnected(m.state) &&
    alwaysNothingIsShownWithoutReadAccess(m.state) && alwaysASavedListIsBoundToItsCredential(m.state) &&
    alwaysTheListKeptIsOfItsCredential(m.state) && alwaysAFreshCountWasRead(m.state) &&
    stepAFailedReadKeepsTheList(s, "accountsAnswered", m.state) &&
    stepChangingTheSelectionForgetsTheListAndItsRead(s, m.state) &&
    stepEveryReadIsForTheSelection(s, m.state, m.out) &&
    stepARevokedReadEmptiesTheList(s, m.state, m.out) &&
    stepACursorIsGivenUpWhenItsPageIsAsked(s, "accountsAnswered", m.state) &&
    stepACheckAfterAFailedReadReadsAgain(s, "accountsAnswered", m.state) &&
    stepAHeldCheckForgetsNothing(s, "accountsAnswered", m.state) &&
    stepARestartKnowsNoGrant(s, "accountsAnswered", m.state)
{
}

lemma AccountsAnsweredNotOk(s: Mailbox, ticket: int, ok: bool, connected: seq<Linked>)
  requires inv(s) && canAccountsAnswered(s, ticket) && !ok
  ensures var m := accountsAnswered(s, ticket, ok, connected);
    alwaysCountsAreNotNegative(m.state) && alwaysAPageCursorIsUsedOnce(m.state) &&
    alwaysAFurtherPageNeedsAFreshList(m.state) && alwaysChosenMessagesBelongToAFreshList(m.state) &&
    alwaysAccountsAreKnownOnlyFromAnAnswer(m.state) && alwaysTheAccountSelectedIsConnected(m.state) &&
    alwaysNothingIsShownWithoutReadAccess(m.state) && alwaysASavedListIsBoundToItsCredential(m.state) &&
    alwaysTheListKeptIsOfItsCredential(m.state) && alwaysAFreshCountWasRead(m.state) &&
    stepAFailedReadKeepsTheList(s, "accountsAnswered", m.state) &&
    stepChangingTheSelectionForgetsTheListAndItsRead(s, m.state) &&
    stepEveryReadIsForTheSelection(s, m.state, m.out) &&
    stepARevokedReadEmptiesTheList(s, m.state, m.out) &&
    stepACursorIsGivenUpWhenItsPageIsAsked(s, "accountsAnswered", m.state) &&
    stepACheckAfterAFailedReadReadsAgain(s, "accountsAnswered", m.state) &&
    stepAHeldCheckForgetsNothing(s, "accountsAnswered", m.state) &&
    stepARestartKnowsNoGrant(s, "accountsAnswered", m.state)
{
}

lemma AccountsAnsweredUnreadable(s: Mailbox, ticket: int, ok: bool, connected: seq<Linked>, account: int, placed: Mailbox)
  requires inv(s) && canAccountsAnswered(s, ticket) && ok && !readable(placed)
  requires account == (if isConnected(connected, s.selected.account) then s.selected.account else soleReadable(connected))
  requires placed.selected.account == account && placed.connected == connected && placed.accounts == kit__read_answer(s.accounts, ok)
  requires alwaysCountsAreNotNegative(placed) && alwaysAPageCursorIsUsedOnce(placed) && alwaysAFurtherPageNeedsAFreshList(placed)
  requires alwaysAccountsAreKnownOnlyFromAnAnswer(placed) && alwaysTheAccountSelectedIsConnected(placed)
  requires alwaysTheListKeptIsOfItsCredential(placed) && alwaysAFreshCountWasRead(placed)
  requires !placed.failure.Revoked? && placed.revision >= s.revision
  requires accountsAnswered(s, ticket, ok, connected) == Moved(emptied(account, placed), [])
  ensures var m := accountsAnswered(s, ticket, ok, connected);
    alwaysCountsAreNotNegative(m.state) && alwaysAPageCursorIsUsedOnce(m.state) &&
    alwaysAFurtherPageNeedsAFreshList(m.state) && alwaysChosenMessagesBelongToAFreshList(m.state) &&
    alwaysAccountsAreKnownOnlyFromAnAnswer(m.state) && alwaysTheAccountSelectedIsConnected(m.state) &&
    alwaysNothingIsShownWithoutReadAccess(m.state) && alwaysASavedListIsBoundToItsCredential(m.state) &&
    alwaysTheListKeptIsOfItsCredential(m.state) && alwaysAFreshCountWasRead(m.state) &&
    stepAFailedReadKeepsTheList(s, "accountsAnswered", m.state) &&
    stepChangingTheSelectionForgetsTheListAndItsRead(s, m.state) &&
    stepEveryReadIsForTheSelection(s, m.state, m.out) &&
    stepARevokedReadEmptiesTheList(s, m.state, m.out) &&
    stepACursorIsGivenUpWhenItsPageIsAsked(s, "accountsAnswered", m.state) &&
    stepACheckAfterAFailedReadReadsAgain(s, "accountsAnswered", m.state) &&
    stepAHeldCheckForgetsNothing(s, "accountsAnswered", m.state) &&
    stepARestartKnowsNoGrant(s, "accountsAnswered", m.state)
{
}

lemma AccountsAnsweredKeep(s: Mailbox, ticket: int, ok: bool, connected: seq<Linked>, placed: Mailbox)
  requires inv(s) && canAccountsAnswered(s, ticket) && ok && readable(placed)
  requires placed.selected == s.selected && !placed.failure.Revoked?
  requires !searchableIn(placed.selected.folder, placed) || !s.list.status.Failed?
  requires alwaysCountsAreNotNegative(placed) && alwaysAPageCursorIsUsedOnce(placed) && alwaysAFurtherPageNeedsAFreshList(placed)
  requires alwaysChosenMessagesBelongToAFreshList(placed) && alwaysAccountsAreKnownOnlyFromAnAnswer(placed)
  requires alwaysTheAccountSelectedIsConnected(placed) && alwaysASavedListIsBoundToItsCredential(placed)
  requires alwaysTheListKeptIsOfItsCredential(placed) && alwaysAFreshCountWasRead(placed)
  requires accountsAnswered(s, ticket, ok, connected) == Moved(placed, [])
  ensures var m := accountsAnswered(s, ticket, ok, connected);
    alwaysCountsAreNotNegative(m.state) && alwaysAPageCursorIsUsedOnce(m.state) &&
    alwaysAFurtherPageNeedsAFreshList(m.state) && alwaysChosenMessagesBelongToAFreshList(m.state) &&
    alwaysAccountsAreKnownOnlyFromAnAnswer(m.state) && alwaysTheAccountSelectedIsConnected(m.state) &&
    alwaysNothingIsShownWithoutReadAccess(m.state) && alwaysASavedListIsBoundToItsCredential(m.state) &&
    alwaysTheListKeptIsOfItsCredential(m.state) && alwaysAFreshCountWasRead(m.state) &&
    stepAFailedReadKeepsTheList(s, "accountsAnswered", m.state) &&
    stepChangingTheSelectionForgetsTheListAndItsRead(s, m.state) &&
    stepEveryReadIsForTheSelection(s, m.state, m.out) &&
    stepARevokedReadEmptiesTheList(s, m.state, m.out) &&
    stepACursorIsGivenUpWhenItsPageIsAsked(s, "accountsAnswered", m.state) &&
    stepACheckAfterAFailedReadReadsAgain(s, "accountsAnswered", m.state) &&
    stepAHeldCheckForgetsNothing(s, "accountsAnswered", m.state) &&
    stepARestartKnowsNoGrant(s, "accountsAnswered", m.state)
{
}

lemma accountsAnswered_ensures(s: Mailbox, ticket: int, ok: bool, connected: seq<Linked>)
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysCountsAreNotNegative(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAPageCursorIsUsedOnce(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAFurtherPageNeedsAFreshList(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysChosenMessagesBelongToAFreshList(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAccountsAreKnownOnlyFromAnAnswer(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysTheAccountSelectedIsConnected(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysNothingIsShownWithoutReadAccess(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysASavedListIsBoundToItsCredential(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysTheListKeptIsOfItsCredential(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAFreshCountWasRead(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepAFailedReadKeepsTheList(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepChangingTheSelectionForgetsTheListAndItsRead(s, accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepEveryReadIsForTheSelection(s, accountsAnswered(s, ticket, ok, connected).state, accountsAnswered(s, ticket, ok, connected).out))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepARevokedReadEmptiesTheList(s, accountsAnswered(s, ticket, ok, connected).state, accountsAnswered(s, ticket, ok, connected).out))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepACursorIsGivenUpWhenItsPageIsAsked(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepACheckAfterAFailedReadReadsAgain(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepAHeldCheckForgetsNothing(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepARestartKnowsNoGrant(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
{
  if inv(s) && canAccountsAnswered(s, ticket) {
    if !ok {
      AccountsAnsweredNotOk(s, ticket, ok, connected);
    } else {
      var local_11 := s.(accounts := kit__read_answer(s.accounts, ok));
      var local_12 := isConnected(connected, s.selected.account);
      var local_13 := if local_12 then s.selected.account else soleReadable(connected);
      var local_14 := linkOf(s.connected, local_13).credential;
      var local_15 := if local_14 != 0 then local_14 else if s.kept.account == local_13 then s.keptCredential else 0;
      var local_16 := local_12 && local_15 != 0 && linkOf(connected, local_13).credential != local_15;
      var local_17 := readable(s) && local_12 && !local_16;
      var local_18 := if keptOutlived(connected, s) then withoutKept(local_11) else local_11;
      var local_19 := local_18.(connected := connected, checked := ticket, failure := if s.failure.Revoked? || s.failure.LeaseNeeded? then Failure.Fine else s.failure);
      var local_20 := if local_16 then emptied(local_13, local_19).(list := local_19.list.(status := kit__read_Status.Idle)) else if local_12 then local_19 else turned(Selection(local_13, Folder.Incoming, ""), local_19.(searchable := false));
      AccountsAnsweredBranch(s, ticket, ok, connected, local_20);
      if !readable(local_20) {
        AccountsAnsweredUnreadable(s, ticket, ok, connected, local_13, local_20);
      } else if !searchableIn(local_20.selected.folder, local_20) {
        AccountsAnsweredKeep(s, ticket, ok, connected, local_20);
      } else if !local_17 || (!local_20.list.status.Loading? && (local_20.pages == 0 || local_20.saved || local_20.list.status.Failed?)) {
        AccountsAnsweredAsking(s, ticket, ok, connected, local_20);
      } else {
        AccountsAnsweredKeep(s, ticket, ok, connected, local_20);
      }
    }
  }
}
