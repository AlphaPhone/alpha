lemma FilterPartition<T>(p: T -> bool, q: T -> bool, xs: seq<T>)
  requires forall i :: 0 <= i < |xs| ==> q(xs[i]) == !p(xs[i])
  ensures |ProofLib.Filter(p, xs)| + |ProofLib.Filter(q, xs)| == |xs|
  decreases |xs|
{
  if |xs| == 0 {
    ProofLib.FilterNil(p, xs);
    ProofLib.FilterNil(q, xs);
  } else {
    ProofLib.FilterCons(p, xs);
    ProofLib.FilterCons(q, xs);
    assert forall i :: 0 <= i < |xs[1..]| ==> xs[1..][i] == xs[i + 1];
    FilterPartition(p, q, xs[1..]);
  }
}

lemma SmartCountsHold(s: Reminders)
  ensures alwaysSmartCountsConsistent(s)
{
  var vis := visibleItems(s);
  var pOver := (it: ItemEntry) => isOverdue(it, s.today);
  var pToday := (it: ItemEntry) => isToday(it, s.today);
  var pSched := (it: ItemEntry) => isScheduled(it);
  var pFlag := (it: ItemEntry) => isFlagged(it);
  var pAct := (it: ItemEntry) => isActive(it);
  var pComp := (it: ItemEntry) => it.completed;
  ProofLib.FilterImpLength(pOver, pToday, vis);
  ProofLib.FilterImpLength(pToday, pSched, vis);
  ProofLib.FilterImpLength(pSched, pAct, vis);
  ProofLib.FilterImpLength(pFlag, pAct, vis);
  FilterPartition(pAct, pComp, vis);
  assert smartCount(s, SmartView.OverdueView) == |ProofLib.Filter(pOver, vis)| by {
    ProofLib.FilterSamePredicate((it: ItemEntry) => isOverdue(it, s.today), pOver, vis);
  }
  assert smartCount(s, SmartView.TodayView) == |ProofLib.Filter(pToday, vis)| by {
    ProofLib.FilterSamePredicate((it: ItemEntry) => isToday(it, s.today), pToday, vis);
  }
  assert smartCount(s, SmartView.ScheduledView) == |ProofLib.Filter(pSched, vis)| by {
    ProofLib.FilterSamePredicate((it: ItemEntry) => isScheduled(it), pSched, vis);
  }
  assert smartCount(s, SmartView.FlaggedView) == |ProofLib.Filter(pFlag, vis)| by {
    ProofLib.FilterSamePredicate((it: ItemEntry) => isFlagged(it), pFlag, vis);
  }
  assert smartCount(s, SmartView.AllView) == |ProofLib.Filter(pAct, vis)| by {
    ProofLib.FilterSamePredicate((it: ItemEntry) => isActive(it), pAct, vis);
  }
  assert smartCount(s, SmartView.CompletedView) == |ProofLib.Filter(pComp, vis)| by {
    ProofLib.FilterSamePredicate((it: ItemEntry) => it.completed, pComp, vis);
  }
}

lemma ListsUniqueFromCounts(xs: seq<ListEntry>)
  requires forall l :: l in xs ==> |ProofLib.Filter((m: ListEntry) => (m.id == l.id), xs)| == 1
  ensures ProofLib.DistinctBy(xs, (l: ListEntry) => l.id)
{
  var key := (l: ListEntry) => l.id;
  forall i, j | 0 <= i < |xs| && 0 <= j < |xs| && i != j
    ensures key(xs[i]) != key(xs[j])
  {
    var p := (m: ListEntry) => (m.id == xs[i].id);
    assert xs[i] in xs;
    ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  }
}

lemma ListsCountsFromUnique(xs: seq<ListEntry>)
  requires ProofLib.DistinctBy(xs, (l: ListEntry) => l.id)
  ensures forall l :: l in xs ==> |ProofLib.Filter((m: ListEntry) => (m.id == l.id), xs)| == 1
{
  var key := (l: ListEntry) => l.id;
  forall l | l in xs
    ensures |ProofLib.Filter((m: ListEntry) => (m.id == l.id), xs)| == 1
  {
    var i :| 0 <= i < |xs| && xs[i] == l;
    var p := (m: ListEntry) => (m.id == l.id);
    ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  }
}

lemma ListOfUnique(xs: seq<ListEntry>, l: ListEntry)
  requires ProofLib.DistinctBy(xs, (x: ListEntry) => x.id)
  requires l in xs
  ensures hasList(xs, l.id)
  ensures listOf(xs, l.id) == l
{
  var key := (x: ListEntry) => x.id;
  var p := (m: ListEntry) => (m.id == l.id);
  var i :| 0 <= i < |xs| && xs[i] == l;
  ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  ProofLib.FilterMember(p, xs, l);
  var fs := ProofLib.Filter(p, xs);
  assert |fs| == 1 && l in fs && fs[0] == l;
}

lemma ListOfMember(xs: seq<ListEntry>, id: int)
  requires ProofLib.DistinctBy(xs, (x: ListEntry) => x.id)
  requires hasList(xs, id)
  ensures listOf(xs, id) in xs && listOf(xs, id).id == id
{
  var l :| l in xs && l.id == id;
  ListOfUnique(xs, l);
}

lemma ItemsUniqueFromCounts(xs: seq<ItemEntry>)
  requires forall it :: it in xs ==> |ProofLib.Filter((o: ItemEntry) => (o.id == it.id), xs)| == 1
  ensures ProofLib.DistinctBy(xs, (it: ItemEntry) => it.id)
{
  var key := (it: ItemEntry) => it.id;
  forall i, j | 0 <= i < |xs| && 0 <= j < |xs| && i != j
    ensures key(xs[i]) != key(xs[j])
  {
    var p := (o: ItemEntry) => (o.id == xs[i].id);
    assert xs[i] in xs;
    ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  }
}

lemma ItemsCountsFromUnique(xs: seq<ItemEntry>)
  requires ProofLib.DistinctBy(xs, (it: ItemEntry) => it.id)
  ensures forall it :: it in xs ==> |ProofLib.Filter((o: ItemEntry) => (o.id == it.id), xs)| == 1
{
  var key := (it: ItemEntry) => it.id;
  forall it | it in xs
    ensures |ProofLib.Filter((o: ItemEntry) => (o.id == it.id), xs)| == 1
  {
    var i :| 0 <= i < |xs| && xs[i] == it;
    var p := (o: ItemEntry) => (o.id == it.id);
    ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  }
}

lemma ItemOfUnique(xs: seq<ItemEntry>, it: ItemEntry)
  requires ProofLib.DistinctBy(xs, (x: ItemEntry) => x.id)
  requires it in xs
  ensures hasItem(xs, it.id)
  ensures itemOf(xs, it.id) == it
{
  var key := (x: ItemEntry) => x.id;
  var p := (o: ItemEntry) => (o.id == it.id);
  var i :| 0 <= i < |xs| && xs[i] == it;
  ProofLib.FilterCountOneIffUnique(p, xs, key, i);
  ProofLib.FilterMember(p, xs, it);
  var fs := ProofLib.Filter(p, xs);
  assert |fs| == 1 && it in fs && fs[0] == it;
}

lemma ItemOfMember(xs: seq<ItemEntry>, id: int)
  requires ProofLib.DistinctBy(xs, (x: ItemEntry) => x.id)
  requires hasItem(xs, id)
  ensures itemOf(xs, id) in xs && itemOf(xs, id).id == id
{
  var it :| it in xs && it.id == id;
  ItemOfUnique(xs, it);
}

lemma PutItemPreserves(xs: seq<ItemEntry>, lists: seq<ListEntry>, nextItemId: int, entry: ItemEntry)
  requires ProofLib.DistinctBy(xs, (x: ItemEntry) => x.id)
  requires forall it :: it in xs ==> itemWellFormed(it, lists, nextItemId)
  requires hasItem(xs, entry.id)
  requires itemWellFormed(entry, lists, nextItemId)
  ensures var ys := putItem(xs, entry);
    ProofLib.DistinctBy(ys, (x: ItemEntry) => x.id)
    && (forall it :: it in ys ==> itemWellFormed(it, lists, nextItemId))
    && entry in ys
    && (forall id :: hasItem(ys, id) == hasItem(xs, id))
{
  var ys := putItem(xs, entry);
  assert |ys| == |xs|;
  forall i | 0 <= i < |ys| ensures ys[i].id == xs[i].id && itemWellFormed(ys[i], lists, nextItemId) {
    assert xs[i] in xs;
  }
  var k :| 0 <= k < |xs| && xs[k].id == entry.id;
  assert ys[k] == entry;
  forall id ensures hasItem(ys, id) == hasItem(xs, id) {
    if hasItem(xs, id) {
      var j :| 0 <= j < |xs| && xs[j].id == id;
      assert ys[j] in ys && ys[j].id == id;
    }
    if hasItem(ys, id) {
      var j :| 0 <= j < |ys| && ys[j].id == id;
      assert xs[j] in xs && xs[j].id == id;
    }
  }
}

lemma initialHolds_ensures()
  ensures inv(initialHolds())
{
  var s := initialHolds();
  ListsCountsFromUnique(s.lists);
  ListOfUnique(s.lists, defaultList);
  SmartCountsHold(s);
}

lemma setToday_ensures(s: Reminders, day: int)
  ensures (inv(s) ==> canSetToday(s, day) ==> alwaysDefaultListExists(setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> alwaysEveryItemWellFormed(setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> alwaysSelectedItemExists(setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> alwaysHiddenExactlyWhileDeleteHeld(setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> alwaysActiveCustomListExists(setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> alwaysSmartCountsConsistent(setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> stepDeleteOnlyOnExpire(s, "setToday", setToday(s, day), []))
  ensures (inv(s) ==> canSetToday(s, day) ==> stepUndoRestoresExactState(s, "setToday", setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> stepDeleteListKeepsItemsValid(s, "setToday", setToday(s, day)))
  ensures (inv(s) ==> canSetToday(s, day) ==> stepNoSentWriteAfterRestart(s, "setToday", setToday(s, day), []))
  ensures (inv(s) ==> canSetToday(s, day) ==> stepRecurringCompleteAdvancesDue(s, "setToday", setToday(s, day)))
{
  if inv(s) && canSetToday(s, day) {
    SmartCountsHold(setToday(s, day));
  }
}

lemma createList_ensures(s: Reminders)
  ensures (inv(s) ==> canCreateList(s) ==> alwaysDefaultListExists(createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> alwaysEveryItemWellFormed(createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> alwaysSelectedItemExists(createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> alwaysHiddenExactlyWhileDeleteHeld(createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> alwaysActiveCustomListExists(createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> alwaysSmartCountsConsistent(createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> stepDeleteOnlyOnExpire(s, "createList", createList(s).state, createList(s).out))
  ensures (inv(s) ==> canCreateList(s) ==> stepUndoRestoresExactState(s, "createList", createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> stepDeleteListKeepsItemsValid(s, "createList", createList(s).state))
  ensures (inv(s) ==> canCreateList(s) ==> stepNoSentWriteAfterRestart(s, "createList", createList(s).state, createList(s).out))
  ensures (inv(s) ==> canCreateList(s) ==> stepRecurringCompleteAdvancesDue(s, "createList", createList(s).state))
{
  if inv(s) && canCreateList(s) {
    ListsUniqueFromCounts(s.lists);
    ListOfMember(s.lists, defaultListId);
    var defL := listOf(s.lists, defaultListId);
    var created := ListEntry(s.nextListId, false, 1);
    var after := createList(s).state;
    ProofLib.DistinctByConcat(s.lists, [created], (l: ListEntry) => l.id);
    ListsCountsFromUnique(after.lists);
    assert defL in after.lists;
    ListOfUnique(after.lists, defL);
    forall it | it in after.items ensures hasList(after.lists, it.listId) {
      var l :| l in s.lists && l.id == it.listId;
      assert l in after.lists;
    }
    SmartCountsHold(after);
  }
}

lemma renameList_ensures(s: Reminders, listId: int)
  ensures (inv(s) ==> canRenameList(s, listId) ==> alwaysDefaultListExists(renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> alwaysEveryItemWellFormed(renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> alwaysSelectedItemExists(renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> alwaysHiddenExactlyWhileDeleteHeld(renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> alwaysActiveCustomListExists(renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> alwaysSmartCountsConsistent(renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> stepDeleteOnlyOnExpire(s, "renameList", renameList(s, listId).state, renameList(s, listId).out))
  ensures (inv(s) ==> canRenameList(s, listId) ==> stepUndoRestoresExactState(s, "renameList", renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> stepDeleteListKeepsItemsValid(s, "renameList", renameList(s, listId).state))
  ensures (inv(s) ==> canRenameList(s, listId) ==> stepNoSentWriteAfterRestart(s, "renameList", renameList(s, listId).state, renameList(s, listId).out))
  ensures (inv(s) ==> canRenameList(s, listId) ==> stepRecurringCompleteAdvancesDue(s, "renameList", renameList(s, listId).state))
{
  if inv(s) && canRenameList(s, listId) {
    ListsUniqueFromCounts(s.lists);
    ListOfMember(s.lists, defaultListId);
    var after := renameList(s, listId).state;
    assert |after.lists| == |s.lists|;
    forall i | 0 <= i < |after.lists| ensures after.lists[i].id == s.lists[i].id && after.lists[i].isDefault == s.lists[i].isDefault {
      assert s.lists[i] in s.lists;
    }
    ListsCountsFromUnique(after.lists);
    var defIdx :| 0 <= defIdx < |s.lists| && s.lists[defIdx] == listOf(s.lists, defaultListId);
    assert after.lists[defIdx] in after.lists && after.lists[defIdx].id == defaultListId && after.lists[defIdx].isDefault;
    ListOfUnique(after.lists, after.lists[defIdx]);
    forall id ensures hasList(after.lists, id) == hasList(s.lists, id) {
      if hasList(s.lists, id) {
        var j :| 0 <= j < |s.lists| && s.lists[j].id == id;
        assert after.lists[j] in after.lists && after.lists[j].id == id;
      }
      if hasList(after.lists, id) {
        var j :| 0 <= j < |after.lists| && after.lists[j].id == id;
        assert s.lists[j] in s.lists && s.lists[j].id == id;
      }
    }
    SmartCountsHold(after);
  }
}

lemma deleteList_ensures(s: Reminders, listId: int, mode: DeleteMode)
  ensures (inv(s) ==> canDeleteList(s, listId) ==> alwaysDefaultListExists(deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> alwaysEveryItemWellFormed(deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> alwaysSelectedItemExists(deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> alwaysHiddenExactlyWhileDeleteHeld(deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> alwaysActiveCustomListExists(deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> alwaysSmartCountsConsistent(deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> stepDeleteOnlyOnExpire(s, "deleteList", deleteList(s, listId, mode).state, deleteList(s, listId, mode).out))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> stepUndoRestoresExactState(s, "deleteList", deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> stepDeleteListKeepsItemsValid(s, "deleteList", deleteList(s, listId, mode).state))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> stepNoSentWriteAfterRestart(s, "deleteList", deleteList(s, listId, mode).state, deleteList(s, listId, mode).out))
  ensures (inv(s) ==> canDeleteList(s, listId) ==> stepRecurringCompleteAdvancesDue(s, "deleteList", deleteList(s, listId, mode).state))
{
  if inv(s) && canDeleteList(s, listId) {
    ListsUniqueFromCounts(s.lists);
    ItemsUniqueFromCounts(s.items);
    ListOfMember(s.lists, defaultListId);
    var defL := listOf(s.lists, defaultListId);
    var after := deleteList(s, listId, mode).state;
    var lp := (l: ListEntry) => (l.id != listId);
    ProofLib.FilterKeepsDistinctBy(lp, s.lists, (l: ListEntry) => l.id);
    ProofLib.FilterSubset(lp, s.lists);
    ListsCountsFromUnique(after.lists);
    ProofLib.FilterMember(lp, s.lists, defL);
    ListOfUnique(after.lists, defL);
    forall lid | lid != listId && hasList(s.lists, lid) ensures hasList(after.lists, lid) {
      var l :| l in s.lists && l.id == lid;
      ProofLib.FilterMember(lp, s.lists, l);
    }
    if mode.ReassignToDefault? {
      assert |after.items| == |s.items|;
      forall i | 0 <= i < |after.items|
        ensures after.items[i].id == s.items[i].id && itemWellFormed(after.items[i], after.lists, after.nextItemId)
      {
        assert s.items[i] in s.items;
      }
      ItemsCountsFromUnique(after.items);
    } else {
      var ip := (it: ItemEntry) => (it.listId != listId);
      ProofLib.FilterKeepsDistinctBy(ip, s.items, (it: ItemEntry) => it.id);
      ProofLib.FilterSubset(ip, s.items);
      forall it | it in after.items ensures itemWellFormed(it, after.lists, after.nextItemId) {
        ProofLib.FilterMember(ip, s.items, it);
      }
      ItemsCountsFromUnique(after.items);
    }
    SmartCountsHold(after);
  }
}

lemma createItem_ensures(s: Reminders, spec: ItemSpec)
  ensures (inv(s) ==> canCreateItem(s, spec) ==> alwaysDefaultListExists(createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> alwaysEveryItemWellFormed(createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> alwaysSelectedItemExists(createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> alwaysHiddenExactlyWhileDeleteHeld(createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> alwaysActiveCustomListExists(createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> alwaysSmartCountsConsistent(createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> stepDeleteOnlyOnExpire(s, "createItem", createItem(s, spec).state, createItem(s, spec).out))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> stepUndoRestoresExactState(s, "createItem", createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> stepDeleteListKeepsItemsValid(s, "createItem", createItem(s, spec).state))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> stepNoSentWriteAfterRestart(s, "createItem", createItem(s, spec).state, createItem(s, spec).out))
  ensures (inv(s) ==> canCreateItem(s, spec) ==> stepRecurringCompleteAdvancesDue(s, "createItem", createItem(s, spec).state))
{
  if inv(s) && canCreateItem(s, spec) {
    ItemsUniqueFromCounts(s.items);
    var after := createItem(s, spec).state;
    var created := after.items[|s.items|];
    assert after.items == s.items + [created];
    ProofLib.DistinctByConcat(s.items, [created], (it: ItemEntry) => it.id);
    ItemsCountsFromUnique(after.items);
    SmartCountsHold(after);
  }
}

lemma updateItem_ensures(s: Reminders, itemId: int, spec: ItemSpec)
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> alwaysDefaultListExists(updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> alwaysEveryItemWellFormed(updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> alwaysSelectedItemExists(updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> alwaysHiddenExactlyWhileDeleteHeld(updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> alwaysActiveCustomListExists(updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> alwaysSmartCountsConsistent(updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> stepDeleteOnlyOnExpire(s, "updateItem", updateItem(s, itemId, spec).state, updateItem(s, itemId, spec).out))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> stepUndoRestoresExactState(s, "updateItem", updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> stepDeleteListKeepsItemsValid(s, "updateItem", updateItem(s, itemId, spec).state))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> stepNoSentWriteAfterRestart(s, "updateItem", updateItem(s, itemId, spec).state, updateItem(s, itemId, spec).out))
  ensures (inv(s) ==> canUpdateItem(s, itemId, spec) ==> stepRecurringCompleteAdvancesDue(s, "updateItem", updateItem(s, itemId, spec).state))
{
  if inv(s) && canUpdateItem(s, itemId, spec) {
    ItemsUniqueFromCounts(s.items);
    ItemOfMember(s.items, itemId);
    var cur := itemOf(s.items, itemId);
    var updated := cur.(listId := spec.listId, hasDue := spec.hasDue, dueDay := (if spec.hasDue then spec.dueDay else 0), hasDueTime := spec.hasDueTime, dueMinute := (if spec.hasDueTime then spec.dueMinute else 0), repeat := spec.repeat, priority := spec.priority, flagged := spec.flagged, revision := cur.revision + 1);
    PutItemPreserves(s.items, s.lists, s.nextItemId, updated);
    var after := updateItem(s, itemId, spec).state;
    ItemsCountsFromUnique(after.items);
    SmartCountsHold(after);
  }
}

lemma toggleFlag_ensures(s: Reminders, itemId: int)
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> alwaysDefaultListExists(toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> alwaysEveryItemWellFormed(toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> alwaysSelectedItemExists(toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> alwaysHiddenExactlyWhileDeleteHeld(toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> alwaysActiveCustomListExists(toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> alwaysSmartCountsConsistent(toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> stepDeleteOnlyOnExpire(s, "toggleFlag", toggleFlag(s, itemId).state, toggleFlag(s, itemId).out))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> stepUndoRestoresExactState(s, "toggleFlag", toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> stepDeleteListKeepsItemsValid(s, "toggleFlag", toggleFlag(s, itemId).state))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> stepNoSentWriteAfterRestart(s, "toggleFlag", toggleFlag(s, itemId).state, toggleFlag(s, itemId).out))
  ensures (inv(s) ==> canToggleFlag(s, itemId) ==> stepRecurringCompleteAdvancesDue(s, "toggleFlag", toggleFlag(s, itemId).state))
{
  if inv(s) && canToggleFlag(s, itemId) {
    ItemsUniqueFromCounts(s.items);
    ItemOfMember(s.items, itemId);
    var cur := itemOf(s.items, itemId);
    var updated := cur.(flagged := !cur.flagged, revision := cur.revision + 1);
    PutItemPreserves(s.items, s.lists, s.nextItemId, updated);
    var after := toggleFlag(s, itemId).state;
    ItemsCountsFromUnique(after.items);
    SmartCountsHold(after);
  }
}

lemma moveItem_ensures(s: Reminders, itemId: int, targetListId: int)
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> alwaysDefaultListExists(moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> alwaysEveryItemWellFormed(moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> alwaysSelectedItemExists(moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> alwaysHiddenExactlyWhileDeleteHeld(moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> alwaysActiveCustomListExists(moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> alwaysSmartCountsConsistent(moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> stepDeleteOnlyOnExpire(s, "moveItem", moveItem(s, itemId, targetListId).state, moveItem(s, itemId, targetListId).out))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> stepUndoRestoresExactState(s, "moveItem", moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> stepDeleteListKeepsItemsValid(s, "moveItem", moveItem(s, itemId, targetListId).state))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> stepNoSentWriteAfterRestart(s, "moveItem", moveItem(s, itemId, targetListId).state, moveItem(s, itemId, targetListId).out))
  ensures (inv(s) ==> canMoveItem(s, itemId, targetListId) ==> stepRecurringCompleteAdvancesDue(s, "moveItem", moveItem(s, itemId, targetListId).state))
{
  if inv(s) && canMoveItem(s, itemId, targetListId) {
    ItemsUniqueFromCounts(s.items);
    ItemOfMember(s.items, itemId);
    var cur := itemOf(s.items, itemId);
    var updated := cur.(listId := targetListId, revision := cur.revision + 1);
    PutItemPreserves(s.items, s.lists, s.nextItemId, updated);
    var after := moveItem(s, itemId, targetListId).state;
    ItemsCountsFromUnique(after.items);
    SmartCountsHold(after);
  }
}

lemma toggleComplete_ensures(s: Reminders, itemId: int, nextDueDay: int, at: int)
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> alwaysDefaultListExists(toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> alwaysEveryItemWellFormed(toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> alwaysSelectedItemExists(toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> alwaysHiddenExactlyWhileDeleteHeld(toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> alwaysActiveCustomListExists(toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> alwaysSmartCountsConsistent(toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> stepDeleteOnlyOnExpire(s, "toggleComplete", toggleComplete(s, itemId, nextDueDay, at).state, toggleComplete(s, itemId, nextDueDay, at).out))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> stepUndoRestoresExactState(s, "toggleComplete", toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> stepDeleteListKeepsItemsValid(s, "toggleComplete", toggleComplete(s, itemId, nextDueDay, at).state))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> stepNoSentWriteAfterRestart(s, "toggleComplete", toggleComplete(s, itemId, nextDueDay, at).state, toggleComplete(s, itemId, nextDueDay, at).out))
  ensures (inv(s) ==> canToggleComplete(s, itemId, nextDueDay) ==> stepRecurringCompleteAdvancesDue(s, "toggleComplete", toggleComplete(s, itemId, nextDueDay, at).state))
{
  if inv(s) && canToggleComplete(s, itemId, nextDueDay) {
    ItemsUniqueFromCounts(s.items);
    ItemOfMember(s.items, itemId);
    var cur := itemOf(s.items, itemId);
    var recurring := !cur.completed && !cur.repeat.NoRepeat?;
    var updated := if recurring then cur.(dueDay := nextDueDay, snoozedUntil := 0, revision := cur.revision + 1) else cur.(completed := !cur.completed, snoozedUntil := 0, revision := cur.revision + 1);
    PutItemPreserves(s.items, s.lists, s.nextItemId, updated);
    var after := toggleComplete(s, itemId, nextDueDay, at).state;
    ItemsCountsFromUnique(after.items);
    ItemOfUnique(after.items, updated);
    SmartCountsHold(after);
  }
}

lemma deleteItem_ensures(s: Reminders, itemId: int, at: int)
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> alwaysDefaultListExists(deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> alwaysEveryItemWellFormed(deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> alwaysSelectedItemExists(deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> alwaysHiddenExactlyWhileDeleteHeld(deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> alwaysActiveCustomListExists(deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> alwaysSmartCountsConsistent(deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> stepDeleteOnlyOnExpire(s, "deleteItem", deleteItem(s, itemId, at).state, deleteItem(s, itemId, at).out))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> stepUndoRestoresExactState(s, "deleteItem", deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> stepDeleteListKeepsItemsValid(s, "deleteItem", deleteItem(s, itemId, at).state))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> stepNoSentWriteAfterRestart(s, "deleteItem", deleteItem(s, itemId, at).state, deleteItem(s, itemId, at).out))
  ensures (inv(s) ==> canDeleteItem(s, itemId) ==> stepRecurringCompleteAdvancesDue(s, "deleteItem", deleteItem(s, itemId, at).state))
{
  if inv(s) && canDeleteItem(s, itemId) {
    SmartCountsHold(deleteItem(s, itemId, at).state);
  }
}

lemma undoAction_ensures(s: Reminders, now: int)
  ensures (inv(s) ==> canUndoAction(s, now) ==> alwaysDefaultListExists(undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> alwaysEveryItemWellFormed(undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> alwaysSelectedItemExists(undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> alwaysHiddenExactlyWhileDeleteHeld(undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> alwaysActiveCustomListExists(undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> alwaysSmartCountsConsistent(undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> stepDeleteOnlyOnExpire(s, "undoAction", undoAction(s, now).state, undoAction(s, now).out))
  ensures (inv(s) ==> canUndoAction(s, now) ==> stepUndoRestoresExactState(s, "undoAction", undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> stepDeleteListKeepsItemsValid(s, "undoAction", undoAction(s, now).state))
  ensures (inv(s) ==> canUndoAction(s, now) ==> stepNoSentWriteAfterRestart(s, "undoAction", undoAction(s, now).state, undoAction(s, now).out))
  ensures (inv(s) ==> canUndoAction(s, now) ==> stepRecurringCompleteAdvancesDue(s, "undoAction", undoAction(s, now).state))
{
  if inv(s) && canUndoAction(s, now) {
    var after := undoAction(s, now).state;
    if !s.undoData.kind.UndoDelete? {
      ItemsUniqueFromCounts(s.items);
      ItemOfMember(s.items, s.undoData.itemId);
      var cur := itemOf(s.items, s.undoData.itemId);
      var restored := cur.(completed := s.undoData.prevCompleted, dueDay := s.undoData.prevDueDay, snoozedUntil := s.undoData.prevSnoozedUntil, revision := cur.revision + 1);
      PutItemPreserves(s.items, s.lists, s.nextItemId, restored);
      ItemsCountsFromUnique(after.items);
      ItemOfUnique(after.items, restored);
    }
    SmartCountsHold(after);
  }
}

lemma expireUndo_ensures(s: Reminders, now: int)
  ensures (inv(s) ==> canExpireUndo(s, now) ==> alwaysDefaultListExists(expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> alwaysEveryItemWellFormed(expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> alwaysSelectedItemExists(expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> alwaysHiddenExactlyWhileDeleteHeld(expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> alwaysActiveCustomListExists(expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> alwaysSmartCountsConsistent(expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> stepDeleteOnlyOnExpire(s, "expireUndo", expireUndo(s, now).state, expireUndo(s, now).out))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> stepUndoRestoresExactState(s, "expireUndo", expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> stepDeleteListKeepsItemsValid(s, "expireUndo", expireUndo(s, now).state))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> stepNoSentWriteAfterRestart(s, "expireUndo", expireUndo(s, now).state, expireUndo(s, now).out))
  ensures (inv(s) ==> canExpireUndo(s, now) ==> stepRecurringCompleteAdvancesDue(s, "expireUndo", expireUndo(s, now).state))
{
  if inv(s) && canExpireUndo(s, now) {
    var after := expireUndo(s, now).state;
    if s.undoData.kind.UndoDelete? {
      ItemsUniqueFromCounts(s.items);
      var p := (it: ItemEntry) => (it.id != s.hiddenId);
      ProofLib.FilterKeepsDistinctBy(p, s.items, (it: ItemEntry) => it.id);
      ProofLib.FilterSubset(p, s.items);
      ItemsCountsFromUnique(after.items);
      if s.selectedId != 0 {
        var sel :| sel in s.items && sel.id == s.selectedId;
        ProofLib.FilterMember(p, s.items, sel);
      }
    }
    SmartCountsHold(after);
  }
}

lemma ownerChanged_ensures(s: Reminders, owner: int)
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> alwaysDefaultListExists(ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> alwaysEveryItemWellFormed(ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> alwaysSelectedItemExists(ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> alwaysHiddenExactlyWhileDeleteHeld(ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> alwaysActiveCustomListExists(ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> alwaysSmartCountsConsistent(ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> stepDeleteOnlyOnExpire(s, "ownerChanged", ownerChanged(s, owner), []))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> stepUndoRestoresExactState(s, "ownerChanged", ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> stepDeleteListKeepsItemsValid(s, "ownerChanged", ownerChanged(s, owner)))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> stepNoSentWriteAfterRestart(s, "ownerChanged", ownerChanged(s, owner), []))
  ensures (inv(s) ==> canOwnerChanged(s, owner) ==> stepRecurringCompleteAdvancesDue(s, "ownerChanged", ownerChanged(s, owner)))
{
  if inv(s) && canOwnerChanged(s, owner) {
    var after := ownerChanged(s, owner);
    ListsCountsFromUnique(after.lists);
    ListOfUnique(after.lists, defaultList);
    SmartCountsHold(after);
  }
}

lemma reopen_ensures(s: Reminders)
  ensures (inv(s) ==> alwaysDefaultListExists(reopen(s).state))
  ensures (inv(s) ==> alwaysEveryItemWellFormed(reopen(s).state))
  ensures (inv(s) ==> alwaysSelectedItemExists(reopen(s).state))
  ensures (inv(s) ==> alwaysHiddenExactlyWhileDeleteHeld(reopen(s).state))
  ensures (inv(s) ==> alwaysActiveCustomListExists(reopen(s).state))
  ensures (inv(s) ==> alwaysSmartCountsConsistent(reopen(s).state))
  ensures (inv(s) ==> stepDeleteOnlyOnExpire(s, "reopen", reopen(s).state, reopen(s).out))
  ensures (inv(s) ==> stepUndoRestoresExactState(s, "reopen", reopen(s).state))
  ensures (inv(s) ==> stepDeleteListKeepsItemsValid(s, "reopen", reopen(s).state))
  ensures (inv(s) ==> stepNoSentWriteAfterRestart(s, "reopen", reopen(s).state, reopen(s).out))
  ensures (inv(s) ==> stepRecurringCompleteAdvancesDue(s, "reopen", reopen(s).state))
{
  if inv(s) {
    var moved := reopen(s);
    if s.sync.status.Loading? {
      assert moved.out[0] in moved.out && moved.out[0] == SyncFetch(s.sync.ticket);
    }
    if undoHeld(s) {
      var idx := if s.sync.status.Loading? then 1 else 0;
      assert moved.out[idx] in moved.out && moved.out[idx] == WakeUndo(s.undo.until);
    }
    SmartCountsHold(moved.state);
  }
}
