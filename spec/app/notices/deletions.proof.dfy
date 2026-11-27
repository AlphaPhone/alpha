lemma HeldAfterPut(d: Deletions, n0: int, x: app__notices__deletion_Deletion, n: int)
  requires n0 in d.numbers && n in d.numbers
  ensures held(d.(deletions := d.deletions[n0 := x]), n) == (if n == n0 then x else held(d, n))
{
}

lemma QueueAddsOne(d: Deletions, number: int, itemId: int)
  ensures queue(d, number, itemId).state.numbers == d.numbers + ProofLib.Filter((set_x: int) => !((set_x in d.numbers)), [number])
{
}

lemma RecoverTakesOne(d: Deletions, number: int)
  ensures recover(d, number).state.interrupted == ProofLib.Filter((set_x: int) => !((set_x in [number])), d.interrupted)
{
}

lemma queue_ensures(d: Deletions, number: int, itemId: int)
  ensures (inv(d) ==> canQueue(d, number, itemId) ==> alwaysEveryDeletionKeepsItsRules(queue(d, number, itemId).state))
  ensures (inv(d) ==> canQueue(d, number, itemId) ==> alwaysAnItemIsInHandOnce(queue(d, number, itemId).state))
  ensures (inv(d) ==> canQueue(d, number, itemId) ==> stepAnUnknownDeletionIsNeverRequeued(d, "queue", queue(d, number, itemId).state))
  ensures (inv(d) ==> canQueue(d, number, itemId) ==> stepEachEffectNamesItsDeletion(d, "queue", queue(d, number, itemId).state, queue(d, number, itemId).out))
  ensures (inv(d) ==> canQueue(d, number, itemId) ==> stepARestartIsPickedUpFirst(d, "queue", queue(d, number, itemId).state, queue(d, number, itemId).out))
{
  if inv(d) && canQueue(d, number, itemId) {
    var after := queue(d, number, itemId).state;
    var f := (set_x: int) => !((set_x in d.numbers));
    QueueAddsOne(d, number, itemId);
    forall n | n in after.numbers ensures n in d.numbers || n == number {
      ProofLib.FilterMember(f, [number], n);
    }
    ProofLib.FilterMember(f, [number], number);
    assert number in after.numbers;
    var x := app__notices__deletion_queue(app__notices__deletion_initial, number, itemId, d.viewer).state;
    assert held(after, number) == x;
    forall n | n in d.numbers ensures n in after.numbers && held(after, n) == held(d, n) {
    }
    forall n | n in after.numbers ensures keepsItsRules(n, held(after, n)) {
      if n != number { assert keepsItsRules(n, held(d, n)); }
    }
    forall n, m | n in after.numbers && m in after.numbers && n != m && held(after, n).itemId == held(after, m).itemId
      ensures settledBack(held(after, n)) || settledBack(held(after, m))
    {
      if n == number {
        assert m in d.numbers;
        assert !(((held(d, m).itemId != itemId) || settledBack(held(d, m)))) ==> false;
      } else if m == number {
        assert n in d.numbers;
        assert !(((held(d, n).itemId != itemId) || settledBack(held(d, n)))) ==> false;
      } else {
        assert !(!(((n != m) && (held(d, n).itemId == held(d, m).itemId))) || (settledBack(held(d, n)) || settledBack(held(d, m)))) ==> false;
      }
    }
    forall m | m in after.numbers && m !in d.numbers
      ensures forall n :: n in d.numbers ==> (held(d, n).itemId != held(after, m).itemId || settledBack(held(d, n)))
    {
      assert m == number;
    }
    var out := queue(d, number, itemId).out;
    forall e | e in out ensures e.About? && e.deletion == number {
    }
  }
}

lemma recover_ensures(d: Deletions, number: int)
  ensures (inv(d) ==> canRecover(d, number) ==> alwaysEveryDeletionKeepsItsRules(recover(d, number).state))
  ensures (inv(d) ==> canRecover(d, number) ==> alwaysAnItemIsInHandOnce(recover(d, number).state))
  ensures (inv(d) ==> canRecover(d, number) ==> stepAnUnknownDeletionIsNeverRequeued(d, "recover", recover(d, number).state))
  ensures (inv(d) ==> canRecover(d, number) ==> stepEachEffectNamesItsDeletion(d, "recover", recover(d, number).state, recover(d, number).out))
  ensures (inv(d) ==> canRecover(d, number) ==> stepARestartIsPickedUpFirst(d, "recover", recover(d, number).state, recover(d, number).out))
{
  if inv(d) && canRecover(d, number) {
    var after := recover(d, number).state;
    var f := (set_x: int) => !((set_x in [number]));
    RecoverTakesOne(d, number);
    forall n | n in after.interrupted ensures n in d.interrupted && n != number {
      ProofLib.FilterMember(f, d.interrupted, n);
    }
    assert number in d.numbers;
    assert keepsItsRules(number, held(d, number));
    var x := app__notices__deletion_restart(held(d, number)).state;
    assert keepsItsRules(number, x);
    forall n | n in after.numbers ensures keepsItsRules(n, held(after, n)) {
      HeldAfterPut(d, number, x, n);
    }
    var out := recover(d, number).out;
    forall e | e in out ensures e.About? && !(e.does.Delete? || e.does.Restore?) {
    }
  }
}

