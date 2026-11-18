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

lemma TapView(before: Cards, via: string, after: Cards, out: seq<Effect>)
  ensures stepATapOpensOneApp(before, via, after, out) == (((|ProofLib.Filter((e: Effect) => e.Go?, out)| == 1) == (via == "openCard")) && (!(((via == "openCard") && (exists e :: e in out && e.ReadCalendar?))) || failed(before.calendar)))
{
}

lemma CandidatesView(c: Cards, o: Others)
  ensures candidates(c, o) == ProofLib.Filter((i: Item) => onCard(i, o), ((c.calendar.items + c.agent.items) + ProofLib.Filter((r: Item) => r.origin.Reminder?, o.reminders)))
{
}

lemma FlowRowsLength(f: Flows)
  ensures |flowRows(f)| == (if |f.rows| < 2 then |f.rows| else 2)
  decreases |f.rows|
{
  if |f.rows| > 0 {
    var prefix := f.rows[..|f.rows| - 1];
    var last := f.rows[|f.rows| - 1];
    assert f.rows == prefix + [last];
    ProofLib.FoldLeftAppend((l: seq<Row>, r: Row) => (if (|l| < 2) then (l + [r]) else l), [], prefix, last);
    FlowRowsLength(f.(rows := prefix));
  }
}

lemma look_ensures(c: Cards, now: int)
  ensures (inv(c) ==> canLook(c, now) ==> alwaysEachCalendarHoldsOnlyWhatItAnswered(look(c, now).state))
  ensures (inv(c) ==> canLook(c, now) ==> alwaysNoReadIsFromALaterDay(look(c, now).state))
  ensures (inv(c) ==> canLook(c, now) ==> alwaysAnAnswerIsRemembered(look(c, now).state))
  ensures (inv(c) ==> canLook(c, now) ==> stepALookLeavesNoCalendarUnread(c, "look", look(c, now).state))
  ensures (inv(c) ==> canLook(c, now) ==> stepReadsAreTicketed(c, "look", look(c, now).state, look(c, now).out))
  ensures (inv(c) ==> canLook(c, now) ==> stepTicketsOnlyRise(c, "look", look(c, now).state))
  ensures (inv(c) ==> canLook(c, now) ==> stepATapOpensOneApp(c, "look", look(c, now).state, look(c, now).out))
{
  if inv(c) && canLook(c, now) {
    var after := look(c, now);
    TapView(c, "look", after.state, after.out);
    assert forall i :: 0 <= i < |after.out| ==> !after.out[i].Go?;
    ProofLib.FilterNone((e: Effect) => e.Go?, after.out);
  }
}

lemma openCard_ensures(c: Cards, kind: Kind, now: int)
  ensures (inv(c) ==> canOpenCard(c, now) ==> alwaysEachCalendarHoldsOnlyWhatItAnswered(openCard(c, kind, now).state))
  ensures (inv(c) ==> canOpenCard(c, now) ==> alwaysNoReadIsFromALaterDay(openCard(c, kind, now).state))
  ensures (inv(c) ==> canOpenCard(c, now) ==> alwaysAnAnswerIsRemembered(openCard(c, kind, now).state))
  ensures (inv(c) ==> canOpenCard(c, now) ==> stepALookLeavesNoCalendarUnread(c, "openCard", openCard(c, kind, now).state))
  ensures (inv(c) ==> canOpenCard(c, now) ==> stepReadsAreTicketed(c, "openCard", openCard(c, kind, now).state, openCard(c, kind, now).out))
  ensures (inv(c) ==> canOpenCard(c, now) ==> stepTicketsOnlyRise(c, "openCard", openCard(c, kind, now).state))
  ensures (inv(c) ==> canOpenCard(c, now) ==> stepATapOpensOneApp(c, "openCard", openCard(c, kind, now).state, openCard(c, kind, now).out))
{
  if inv(c) && canOpenCard(c, now) {
    var after := openCard(c, kind, now);
    TapView(c, "openCard", after.state, after.out);
    var rest := after.out[1..];
    assert forall i :: 0 <= i < |rest| ==> !rest[i].Go?;
    ProofLib.FilterCons((e: Effect) => e.Go?, after.out);
    ProofLib.FilterNone((e: Effect) => e.Go?, rest);
  }
}

lemma lawTiesGoToTheFirstRead_ensures(a: Item, b: Item, now: int)
  ensures (lawTiesGoToTheFirstRead(a, b, now) == true)
{
  assert lead([], now) == [];
  assert [a] == [] + [a];
  LeadStep([], a, now);
  assert [a, b] == [a] + [b];
  LeadStep([a], b, now);
}

lemma lawTheCardShowsOnlyWhatMayBeOnIt_ensures(cards: Cards, now: int, others: Others)
  ensures (lawTheCardShowsOnlyWhatMayBeOnIt(cards, now, others) == true)
{
  var cs := candidates(cards, others);
  CandidatesView(cards, others);
  LeadFacts(cs, now);
  forall i | i in lead(cs, now) ensures !(i.done) && !(i.origin.PhoneCalendar? && (i.calendar in others.hidden)) {
    ProofLib.FilterMember((i: Item) => onCard(i, others), ((cards.calendar.items + cards.agent.items) + ProofLib.Filter((r: Item) => r.origin.Reminder?, others.reminders)), i);
  }
}

lemma lawTheWorkflowsCardShowsTwoAndCountsTheRest_ensures(flows: Flows)
  ensures (lawTheWorkflowsCardShowsTwoAndCountsTheRest(flows) == true)
{
  FlowRowsLength(flows);
}
