// The shelf as the composer holds it: what setting aside, taking back and
// changing in place do to the numbers on it and the drafts under them, by the
// Filter of a set union or exclusion; and the drafts the composer names.

lemma ShelfPlaceShelved(sh: app__inbox__shelf_Shelf, l: app__inbox__letter_Letter)
  ensures app__inbox__shelf_place(sh, l).shelved == sh.shelved + ProofLib.Filter((set_x: int) => !((set_x in sh.shelved)), [l.id])
{
}

lemma ShelfTakeShelved(sh: app__inbox__shelf_Shelf, d: int)
  ensures app__inbox__shelf_take(sh, d).shelved == ProofLib.Filter((set_x: int) => !((set_x in [d])), sh.shelved)
{
}

lemma ShelfPlaced(sh: app__inbox__shelf_Shelf, l: app__inbox__letter_Letter)
  ensures forall k :: k in app__inbox__shelf_place(sh, l).shelved <==> (k in sh.shelved || k == l.id)
  ensures forall k :: app__inbox__shelf_held(app__inbox__shelf_place(sh, l), k) == (if k == l.id then l else app__inbox__shelf_held(sh, k))
{
  ShelfPlaceShelved(sh, l);
  forall k
    ensures k in app__inbox__shelf_place(sh, l).shelved <==> (k in sh.shelved || k == l.id)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in sh.shelved)), [l.id], k);
  }
}

lemma ShelfTaken(sh: app__inbox__shelf_Shelf, d: int)
  ensures forall k :: k in app__inbox__shelf_take(sh, d).shelved <==> (k in sh.shelved && k != d)
  ensures forall k :: k != d ==> app__inbox__shelf_held(app__inbox__shelf_take(sh, d), k) == app__inbox__shelf_held(sh, k)
{
  ShelfTakeShelved(sh, d);
  forall k
    ensures k in app__inbox__shelf_take(sh, d).shelved <==> (k in sh.shelved && k != d)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in [d])), sh.shelved, k);
  }
}

lemma ShelfAmended(sh: app__inbox__shelf_Shelf, l: app__inbox__letter_Letter)
  ensures app__inbox__shelf_amend(sh, l).shelved == sh.shelved
  ensures forall k :: app__inbox__shelf_held(app__inbox__shelf_amend(sh, l), k) == (if k == l.id then l else app__inbox__shelf_held(sh, k))
{
}

lemma ShelfLetter(s: Composer, k: int)
  requires inv(s) && k in s.shelf.shelved
  ensures app__inbox__shelf_held(s.shelf, k).id == k && app__inbox__shelf_whole(app__inbox__shelf_held(s.shelf, k))
  ensures whole(app__inbox__shelf_held(s.shelf, k), s.made) && app__inbox__shelf_held(s.shelf, k).session == s.session
  ensures settledFirst(app__inbox__shelf_held(s.shelf, k))
  ensures !(s.open && s.letter.id == k)
{
}

lemma AmendKeepsTheShelf(s: Composer, l: app__inbox__letter_Letter)
  requires alwaysTheShelfHoldsOtherDraftsOfThisSession(s) && alwaysAnUnsureDraftIsHandedToNothing(s) && l.id in s.shelf.shelved
  requires app__inbox__shelf_whole(l) && whole(l, s.made) && l.session == s.session && settledFirst(l)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(s.(shelf := app__inbox__shelf_amend(s.shelf, l)))
  ensures alwaysAnUnsureDraftIsHandedToNothing(s.(shelf := app__inbox__shelf_amend(s.shelf, l)))
{
  ShelfAmended(s.shelf, l);
}

lemma TakeKeepsTheShelf(s: Composer, d: int)
  requires alwaysTheShelfHoldsOtherDraftsOfThisSession(s) && alwaysAnUnsureDraftIsHandedToNothing(s)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(s.(shelf := app__inbox__shelf_take(s.shelf, d)))
  ensures alwaysAnUnsureDraftIsHandedToNothing(s.(shelf := app__inbox__shelf_take(s.shelf, d)))
  ensures d !in app__inbox__shelf_take(s.shelf, d).shelved
{
  ShelfTaken(s.shelf, d);
}

lemma CheckedUnion(checked: seq<int>, a: int)
  ensures forall x :: x in checked + ProofLib.Filter((set_x: int) => !((set_x in checked)), [a]) <==> (x in checked || x == a)
{
  forall x
    ensures x in checked + ProofLib.Filter((set_x: int) => !((set_x in checked)), [a]) <==> (x in checked || x == a)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in checked)), [a], x);
  }
}

lemma CheckSentChecked(s: Composer, draft: int, access: app__inbox__access_Access)
  ensures checkSent(s, draft, access).state.checked == s.checked + ProofLib.Filter((set_x: int) => !((set_x in s.checked)), [letterNamed(s, draft).doubt.attempt])
{
}

lemma sentAway_ensures(s: Composer, draft: int, attempt: int, revision: int)
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> alwaysAnOpenDraftIsWhole(sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> alwaysAWaitingEditHasItsDeadline(sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> alwaysTheCopyIsTheDraft(sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> alwaysOneCheckRunsAtATime(sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> alwaysAnUnsureDraftIsHandedToNothing(sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> alwaysTheShelfHoldsOtherDraftsOfThisSession(sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepAWriteIsDueOnlyAfterItsPause(s, "sentAway", sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepOneWriteAtATime(s, "sentAway", sentAway(s, draft, attempt, revision).state, sentAway(s, draft, attempt, revision).out))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepAHandedDraftStaysPut(s, "sentAway", sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "sentAway", sentAway(s, draft, attempt, revision).state, sentAway(s, draft, attempt, revision).out))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepASentDraftIsForgottenOrMarked(s, "sentAway", sentAway(s, draft, attempt, revision).state, sentAway(s, draft, attempt, revision).out))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepAnUnknownSendIsCheckedOnce(s, sentAway(s, draft, attempt, revision).state, sentAway(s, draft, attempt, revision).out))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepEditingASavedDraftReplacesNone(s, "sentAway", sentAway(s, draft, attempt, revision).state))
  ensures (inv(s) ==> canSentAway(s, draft, attempt, revision) ==> stepADraftComesBackAsItWasSetAside(s, "sentAway", sentAway(s, draft, attempt, revision).state))
{
  if inv(s) && canSentAway(s, draft, attempt, revision) {
    var l := letterNamed(s, draft);
    var m := app__inbox__letter_markedSent(l, revision);
    if !(s.open && s.letter.id == draft) {
      ShelfLetter(s, draft);
      if app__inbox__letter_forgettable(l, revision) {
        TakeKeepsTheShelf(s, draft);
      } else {
        AmendKeepsTheShelf(s, m);
        ShelfAmended(s.shelf, m);
      }
    }
  }
}

lemma checkSent_ensures(s: Composer, draft: int, access: app__inbox__access_Access)
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> alwaysAnOpenDraftIsWhole(checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> alwaysAWaitingEditHasItsDeadline(checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> alwaysTheCopyIsTheDraft(checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> alwaysOneCheckRunsAtATime(checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> alwaysAnUnsureDraftIsHandedToNothing(checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> alwaysTheShelfHoldsOtherDraftsOfThisSession(checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepAWriteIsDueOnlyAfterItsPause(s, "checkSent", checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepOneWriteAtATime(s, "checkSent", checkSent(s, draft, access).state, checkSent(s, draft, access).out))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepAHandedDraftStaysPut(s, "checkSent", checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "checkSent", checkSent(s, draft, access).state, checkSent(s, draft, access).out))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepASentDraftIsForgottenOrMarked(s, "checkSent", checkSent(s, draft, access).state, checkSent(s, draft, access).out))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepAnUnknownSendIsCheckedOnce(s, checkSent(s, draft, access).state, checkSent(s, draft, access).out))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepEditingASavedDraftReplacesNone(s, "checkSent", checkSent(s, draft, access).state))
  ensures (inv(s) ==> canCheckSent(s, draft, access) ==> stepADraftComesBackAsItWasSetAside(s, "checkSent", checkSent(s, draft, access).state))
{
  if inv(s) && canCheckSent(s, draft, access) {
    CheckSentChecked(s, draft, access);
    CheckedUnion(s.checked, letterNamed(s, draft).doubt.attempt);
    if !(s.open && s.letter.id == draft) {
      ShelfLetter(s, draft);
    }
  }
}

lemma checkedSent_ensures(s: Composer, ticket: int, ok: bool, found: bool)
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> alwaysAnOpenDraftIsWhole(checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> alwaysAWaitingEditHasItsDeadline(checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> alwaysTheCopyIsTheDraft(checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> alwaysOneCheckRunsAtATime(checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> alwaysAnUnsureDraftIsHandedToNothing(checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> alwaysTheShelfHoldsOtherDraftsOfThisSession(checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepAWriteIsDueOnlyAfterItsPause(s, "checkedSent", checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepOneWriteAtATime(s, "checkedSent", checkedSent(s, ticket, ok, found).state, checkedSent(s, ticket, ok, found).out))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepAHandedDraftStaysPut(s, "checkedSent", checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "checkedSent", checkedSent(s, ticket, ok, found).state, checkedSent(s, ticket, ok, found).out))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepASentDraftIsForgottenOrMarked(s, "checkedSent", checkedSent(s, ticket, ok, found).state, checkedSent(s, ticket, ok, found).out))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepAnUnknownSendIsCheckedOnce(s, checkedSent(s, ticket, ok, found).state, checkedSent(s, ticket, ok, found).out))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepEditingASavedDraftReplacesNone(s, "checkedSent", checkedSent(s, ticket, ok, found).state))
  ensures (inv(s) ==> canCheckedSent(s, ticket) ==> stepADraftComesBackAsItWasSetAside(s, "checkedSent", checkedSent(s, ticket, ok, found).state))
{
  if inv(s) && canCheckedSent(s, ticket) && ok && named(s, s.checking) && letterNamed(s, s.checking).doubt.attempt != 0 {
    var told := s.(check := kit__read_answer(s.check, ok), checking := 0);
    var l := letterNamed(s, s.checking);
    if !(s.open && s.letter.id == s.checking) {
      ShelfLetter(s, s.checking);
      if !found {
        AmendKeepsTheShelf(told, app__inbox__letter_notSent(l));
      } else if app__inbox__letter_forgettable(l, l.doubt.revision) && l.sending == 0 {
        TakeKeepsTheShelf(told, s.checking);
      } else {
        AmendKeepsTheShelf(told, app__inbox__letter_foundSent(l));
      }
    }
  }
}

lemma setAside_ensures(s: Composer)
  ensures (inv(s) ==> canSetAside(s) ==> alwaysAnOpenDraftIsWhole(setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> alwaysAWaitingEditHasItsDeadline(setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> alwaysTheCopyIsTheDraft(setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> alwaysOneCheckRunsAtATime(setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> alwaysAnUnsureDraftIsHandedToNothing(setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> alwaysTheShelfHoldsOtherDraftsOfThisSession(setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> stepAWriteIsDueOnlyAfterItsPause(s, "setAside", setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> stepOneWriteAtATime(s, "setAside", setAside(s), []))
  ensures (inv(s) ==> canSetAside(s) ==> stepAHandedDraftStaysPut(s, "setAside", setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "setAside", setAside(s), []))
  ensures (inv(s) ==> canSetAside(s) ==> stepASentDraftIsForgottenOrMarked(s, "setAside", setAside(s), []))
  ensures (inv(s) ==> canSetAside(s) ==> stepAnUnknownSendIsCheckedOnce(s, setAside(s), []))
  ensures (inv(s) ==> canSetAside(s) ==> stepEditingASavedDraftReplacesNone(s, "setAside", setAside(s)))
  ensures (inv(s) ==> canSetAside(s) ==> stepADraftComesBackAsItWasSetAside(s, "setAside", setAside(s)))
{
  if inv(s) && canSetAside(s) {
    ShelfPlaced(s.shelf, s.letter);
  }
}

lemma resume_ensures(s: Composer, draft: int)
  ensures (inv(s) ==> canResume(s, draft) ==> alwaysAnOpenDraftIsWhole(resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> alwaysAWaitingEditHasItsDeadline(resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> alwaysTheCopyIsTheDraft(resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> alwaysOneCheckRunsAtATime(resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> alwaysAnUnsureDraftIsHandedToNothing(resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> alwaysTheShelfHoldsOtherDraftsOfThisSession(resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> stepAWriteIsDueOnlyAfterItsPause(s, "resume", resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> stepOneWriteAtATime(s, "resume", resume(s, draft), []))
  ensures (inv(s) ==> canResume(s, draft) ==> stepAHandedDraftStaysPut(s, "resume", resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "resume", resume(s, draft), []))
  ensures (inv(s) ==> canResume(s, draft) ==> stepASentDraftIsForgottenOrMarked(s, "resume", resume(s, draft), []))
  ensures (inv(s) ==> canResume(s, draft) ==> stepAnUnknownSendIsCheckedOnce(s, resume(s, draft), []))
  ensures (inv(s) ==> canResume(s, draft) ==> stepEditingASavedDraftReplacesNone(s, "resume", resume(s, draft)))
  ensures (inv(s) ==> canResume(s, draft) ==> stepADraftComesBackAsItWasSetAside(s, "resume", resume(s, draft)))
{
  if inv(s) && canResume(s, draft) {
    ShelfLetter(s, draft);
    TakeKeepsTheShelf(s, draft);
  }
}

lemma endedOpenRefused(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && (s.open && s.letter.id == draft) && result.Refused?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
}

lemma endedOpenSaved(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && (s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToSave?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
}

lemma endedOpenDeleteLost(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && (s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToDelete? && result.Unknown?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
}

lemma endedOpenDeleted(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && (s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToDelete? && !result.Unknown?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
}

lemma endedOpenSendUnknown(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && (s.open && s.letter.id == draft) && !result.Refused? && !letterNamed(s, draft).use.ToSave? && !letterNamed(s, draft).use.ToDelete?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
}

lemma endedOpen(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && (s.open && s.letter.id == draft)
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
  if (result.Refused?) {
    endedOpenRefused(s, draft, attempt, result, revision, gmail);
  } else if (!result.Refused? && letterNamed(s, draft).use.ToSave?) {
    endedOpenSaved(s, draft, attempt, result, revision, gmail);
  } else if (!result.Refused? && letterNamed(s, draft).use.ToDelete? && result.Unknown?) {
    endedOpenDeleteLost(s, draft, attempt, result, revision, gmail);
  } else if (!result.Refused? && letterNamed(s, draft).use.ToDelete? && !result.Unknown?) {
    endedOpenDeleted(s, draft, attempt, result, revision, gmail);
  } else if (!result.Refused? && !letterNamed(s, draft).use.ToSave? && !letterNamed(s, draft).use.ToDelete?) {
    endedOpenSendUnknown(s, draft, attempt, result, revision, gmail);
  }
}

lemma endedAsideRefused(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && !(s.open && s.letter.id == draft) && result.Refused?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
  ShelfLetter(s, draft);
  AmendKeepsTheShelf(s, app__inbox__letter_unsent(letterNamed(s, draft)));
}

lemma endedAsideSaved(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && !(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToSave? && result.Confirmed?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
  ShelfLetter(s, draft);
  AmendKeepsTheShelf(s, app__inbox__letter_landed(letterNamed(s, draft), gmail));
}

lemma endedAsideSaveLost(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && !(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToSave? && !result.Confirmed?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
  ShelfLetter(s, draft);
  AmendKeepsTheShelf(s, app__inbox__letter_lost(letterNamed(s, draft)));
}

lemma endedAsideDeleteLost(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && !(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToDelete? && result.Unknown?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
  ShelfLetter(s, draft);
  AmendKeepsTheShelf(s, app__inbox__letter_lost(letterNamed(s, draft)));
}

lemma endedAsideDeleted(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && !(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToDelete? && !result.Unknown?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
  ShelfLetter(s, draft);
  TakeKeepsTheShelf(s, draft);
}

lemma endedAsideSendUnknown(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  requires inv(s) && canEnded(s, draft, attempt, result, revision, gmail) && !(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToSend?
  ensures alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state)
{
  ShelfLetter(s, draft);
  AmendKeepsTheShelf(s, app__inbox__letter_doubted(letterNamed(s, draft), attempt, revision));
}

lemma ended_ensures(s: Composer, draft: int, attempt: int, result: kit__attempt_Outcome, revision: int, gmail: int)
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> alwaysAnOpenDraftIsWhole(ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> alwaysAWaitingEditHasItsDeadline(ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> alwaysTheCopyIsTheDraft(ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> alwaysOneCheckRunsAtATime(ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> alwaysAnUnsureDraftIsHandedToNothing(ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> alwaysTheShelfHoldsOtherDraftsOfThisSession(ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepAWriteIsDueOnlyAfterItsPause(s, "ended", ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepOneWriteAtATime(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepAHandedDraftStaysPut(s, "ended", ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepASentDraftIsForgottenOrMarked(s, "ended", ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepAnUnknownSendIsCheckedOnce(s, ended(s, draft, attempt, result, revision, gmail).state, ended(s, draft, attempt, result, revision, gmail).out))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepEditingASavedDraftReplacesNone(s, "ended", ended(s, draft, attempt, result, revision, gmail).state))
  ensures (inv(s) ==> canEnded(s, draft, attempt, result, revision, gmail) ==> stepADraftComesBackAsItWasSetAside(s, "ended", ended(s, draft, attempt, result, revision, gmail).state))
{
  if inv(s) && canEnded(s, draft, attempt, result, revision, gmail) {
    if ((s.open && s.letter.id == draft)) {
      endedOpen(s, draft, attempt, result, revision, gmail);
    } else if (!(s.open && s.letter.id == draft) && result.Refused?) {
      endedAsideRefused(s, draft, attempt, result, revision, gmail);
    } else if (!(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToSave? && result.Confirmed?) {
      endedAsideSaved(s, draft, attempt, result, revision, gmail);
    } else if (!(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToSave? && !result.Confirmed?) {
      endedAsideSaveLost(s, draft, attempt, result, revision, gmail);
    } else if (!(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToDelete? && result.Unknown?) {
      endedAsideDeleteLost(s, draft, attempt, result, revision, gmail);
    } else if (!(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToDelete? && !result.Unknown?) {
      endedAsideDeleted(s, draft, attempt, result, revision, gmail);
    } else if (!(s.open && s.letter.id == draft) && !result.Refused? && letterNamed(s, draft).use.ToSend?) {
      endedAsideSendUnknown(s, draft, attempt, result, revision, gmail);
    }
  }
}

lemma copyReadIdle(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int)
  requires inv(s) && canCopyRead(s, ticket, found, held, gmail) && (!ok || s.letter.sending != 0)
  ensures alwaysAnOpenDraftIsWhole(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheCopyIsTheDraft(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysOneCheckRunsAtATime(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepOneWriteAtATime(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
{
}

lemma copyReadFound(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int)
  requires inv(s) && canCopyRead(s, ticket, found, held, gmail) && ok && s.letter.sending == 0 && s.letter.unsure && found
  ensures alwaysAnOpenDraftIsWhole(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheCopyIsTheDraft(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysOneCheckRunsAtATime(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepOneWriteAtATime(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
{
}

lemma copyReadNotFound(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int)
  requires inv(s) && canCopyRead(s, ticket, found, held, gmail) && ok && s.letter.sending == 0 && s.letter.unsure && !found
  ensures alwaysAnOpenDraftIsWhole(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheCopyIsTheDraft(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysOneCheckRunsAtATime(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepOneWriteAtATime(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
{
}

lemma copyReadCopy(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int)
  requires inv(s) && canCopyRead(s, ticket, found, held, gmail) && ok && s.letter.sending == 0 && !s.letter.unsure && s.letter.draft.sync.Edited? && s.letter.gmail != 0
  ensures alwaysAnOpenDraftIsWhole(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheCopyIsTheDraft(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysOneCheckRunsAtATime(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepOneWriteAtATime(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
{
}

lemma copyReadOther(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int)
  requires inv(s) && canCopyRead(s, ticket, found, held, gmail) && ok && s.letter.sending == 0 && !s.letter.unsure && !(s.letter.draft.sync.Edited? && s.letter.gmail != 0)
  ensures alwaysAnOpenDraftIsWhole(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAWaitingEditHasItsDeadline(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheCopyIsTheDraft(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysOneCheckRunsAtATime(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysAnUnsureDraftIsHandedToNothing(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures alwaysTheShelfHoldsOtherDraftsOfThisSession(copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepAWriteIsDueOnlyAfterItsPause(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepOneWriteAtATime(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAHandedDraftStaysPut(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepASentDraftIsForgottenOrMarked(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepAnUnknownSendIsCheckedOnce(s, copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out)
  ensures stepEditingASavedDraftReplacesNone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
  ensures stepADraftComesBackAsItWasSetAside(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state)
{
}

lemma copyRead_ensures(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int)
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> alwaysAnOpenDraftIsWhole(copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> alwaysAWaitingEditHasItsDeadline(copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> alwaysTheCopyIsTheDraft(copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> alwaysOneCheckRunsAtATime(copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> alwaysAnUnsureDraftIsHandedToNothing(copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> alwaysTheShelfHoldsOtherDraftsOfThisSession(copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepAWriteIsDueOnlyAfterItsPause(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepOneWriteAtATime(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepAHandedDraftStaysPut(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepADraftIsForgottenOnlyWhenDiscardedOrGone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepASentDraftIsForgottenOrMarked(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepAnUnknownSendIsCheckedOnce(s, copyRead(s, ticket, ok, found, held, gmail).state, copyRead(s, ticket, ok, found, held, gmail).out))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepEditingASavedDraftReplacesNone(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state))
  ensures (inv(s) ==> canCopyRead(s, ticket, found, held, gmail) ==> stepADraftComesBackAsItWasSetAside(s, "copyRead", copyRead(s, ticket, ok, found, held, gmail).state))
{
  if inv(s) && canCopyRead(s, ticket, found, held, gmail) {
    if ((!ok || s.letter.sending != 0)) {
      copyReadIdle(s, ticket, ok, found, held, gmail);
    } else if (ok && s.letter.sending == 0 && s.letter.unsure && found) {
      copyReadFound(s, ticket, ok, found, held, gmail);
    } else if (ok && s.letter.sending == 0 && s.letter.unsure && !found) {
      copyReadNotFound(s, ticket, ok, found, held, gmail);
    } else if (ok && s.letter.sending == 0 && !s.letter.unsure && s.letter.draft.sync.Edited? && s.letter.gmail != 0) {
      copyReadCopy(s, ticket, ok, found, held, gmail);
    } else if (ok && s.letter.sending == 0 && !s.letter.unsure && !(s.letter.draft.sync.Edited? && s.letter.gmail != 0)) {
      copyReadOther(s, ticket, ok, found, held, gmail);
    }
  }
}
