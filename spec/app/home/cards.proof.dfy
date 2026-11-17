lemma LeadStep(xs: seq<Item>, last: Item, now: int)
  ensures lead(xs + [last], now) == (if !(ongoing(last, now)) then lead(xs, now) else (if (|lead(xs, now)| == 0) then [last] else (if precedes(last, (if ((0 <= 0) && (0 < |lead(xs, now)|)) then lead(xs, now)[0] else last)) then [last] else lead(xs, now))))
{
  ProofLib.FoldLeftAppend((best: seq<Item>, i: Item) => (if !(ongoing(i, now)) then best else (if (|best| == 0) then [i] else (if precedes(i, (if ((0 <= 0) && (0 < |best|)) then best[0] else i)) then [i] else best))), [], xs, last);
}

lemma LeadFacts(items: seq<Item>, now: int)
  ensures |lead(items, now)| <= 1
  ensures (|lead(items, now)| == 0) == !(exists i :: i in items && ongoing(i, now))
  ensures forall l :: l in lead(items, now) ==> l in items && ongoing(l, now) && !(exists i :: i in items && ongoing(i, now) && precedes(i, l))
  decreases |items|
{
  if |items| == 0 {
    assert lead(items, now) == [];
  } else {
    var xs := items[..|items| - 1];
    var last := items[|items| - 1];
    assert items == xs + [last];
    LeadStep(xs, last, now);
    LeadFacts(xs, now);
    var b := lead(xs, now);
    forall i | i in items ensures i in xs || i == last {
    }
    assert !precedes(last, last);
    if !ongoing(last, now) {
      assert lead(items, now) == b;
      forall l | l in b ensures !(exists i :: i in items && ongoing(i, now) && precedes(i, l)) {
      }
    } else if |b| == 0 {
      assert lead(items, now) == [last];
      forall i | i in items && ongoing(i, now) ensures !precedes(i, last) {
        if i != last {
          assert i in xs;
        }
      }
    } else if precedes(last, b[0]) {
      assert lead(items, now) == [last];
      assert b[0] in b;
      forall i | i in items && ongoing(i, now) ensures !precedes(i, last) {
        if i != last {
          assert i in xs;
          assert !precedes(i, b[0]);
        }
      }
    } else {
      assert lead(items, now) == b;
      assert b == [b[0]];
      assert b[0] in b;
      forall i | i in items && ongoing(i, now) ensures !precedes(i, b[0]) {
        if i != last {
          assert i in xs;
        }
      }
    }
  }
}

lemma lawTheLeadIsCurrentAndFirst_ensures(items: seq<Item>, now: int)
  ensures (lawTheLeadIsCurrentAndFirst(items, now) == true)
{
  LeadFacts(items, now);
}

lemma lawAnItemThatHasNotEndedIsNeverHidden_ensures(items: seq<Item>, now: int)
  ensures (lawAnItemThatHasNotEndedIsNeverHidden(items, now) == true)
{
  LeadFacts(items, now);
}

lemma FollowingView(items: seq<Item>, now: int)
  ensures following(items, now) == (if (!((exists i :: i in lead(items, now) && !(i.overdue))) && (|lead(items, now)| > 0)) then lead(ProofLib.Filter((i: Item) => !(i.overdue), items), now) else [])
{
}

lemma lawTheFollowingItemIsNotOverdue_ensures(items: seq<Item>, now: int)
  ensures (lawTheFollowingItemIsNotOverdue(items, now) == true)
{
  FollowingView(items, now);
  LeadFacts(ProofLib.Filter((i: Item) => !(i.overdue), items), now);
  forall f | f in following(items, now) ensures !(f.overdue) && ongoing(f, now) && f in items {
    ProofLib.FilterMember((i: Item) => !(i.overdue), items, f);
  }
}

lemma lawAnAgendaCardShowsAnItem_ensures(c: Cards, now: int)
  ensures (lawAnAgendaCardShowsAnItem(c, now) == true)
{
  LeadFacts(c.items, now);
}
