lemma EntryAfterPut(d: Approvals, e: Approvals, id: int, p: app__approvals__proposal_Proposal, i: int)
  requires e.proposals == d.proposals[id := p]
  requires i in d.ids && i in e.ids && i != id
  ensures entry(e, i) == entry(d, i)
{
}

lemma forbid_ensures(d: Approvals, id: int, operation: app__approvals__operation_Operation, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> alwaysEveryProposalKeepsItsRules(forbid(d, id, operation, signedIn, by_).state))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> alwaysOneActionAtATime(forbid(d, id, operation, signedIn, by_).state))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> alwaysALeaseFollowsItsRead(forbid(d, id, operation, signedIn, by_).state))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> stepNoApprovalNoticeOutlivesItsProposal(d, "forbid", forbid(d, id, operation, signedIn, by_).state, forbid(d, id, operation, signedIn, by_).out))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> stepOneActionAtATime(d, "forbid", forbid(d, id, operation, signedIn, by_).state, forbid(d, id, operation, signedIn, by_).out))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> stepARestartKeepsEveryProposal(d, "forbid", forbid(d, id, operation, signedIn, by_).state))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> stepWhatIsAskedAgainIsAskedOnce(d, "forbid", forbid(d, id, operation, signedIn, by_).state, forbid(d, id, operation, signedIn, by_).out))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> stepAFailedListingWaitsForTheConversationToChange(d, "forbid", forbid(d, id, operation, signedIn, by_).state))
  ensures (inv(d) ==> canForbid(d, id, operation, signedIn, by_) ==> stepACardIsUnavailableOnlyFromALaterListing(d, "forbid", forbid(d, id, operation, signedIn, by_).state))
{
  if inv(d) && canForbid(d, id, operation, signedIn, by_) {
    var m := forbid(d, id, operation, signedIn, by_);
    var after := m.state;
    var f := (set_x: int) => !((set_x in d.ids));
    ProofLib.FilterNil(f, []);
    ProofLib.FilterCons(f, [id]);
    assert after.ids == d.ids + [id];
    var p := app__approvals__proposal_forbid(app__approvals__proposal_initial, id, operation, signedIn, by_).state;
    assert after.proposals == d.proposals[id := p];
    assert entry(after, id) == p;
    assert entry(d, id) == app__approvals__proposal_initial;
    assert leaseOf(after, id) == app__approvals__lease_initial;
    forall i | i in d.ids ensures entry(after, i) == entry(d, i) && leaseOf(after, i) == leaseOf(d, i) {
      EntryAfterPut(d, after, id, p, i);
    }
    forall i | i in after.ids ensures i > 0 && keepsItsRules(i, entry(after, i), leaseOf(after, i)) {
      if i != id { assert i in d.ids; }
    }
    forall i | i in after.ids ensures inFlight(entry(after, i)) == (i == after.running) {
      if i != id { assert i in d.ids; }
    }
    forall i | i in after.ids && entry(d, i).stage.Pending? != entry(after, i).stage.Pending?
      ensures exists e :: e in m.out && e.Noticing? && e.card == i && e.up == entry(after, i).stage.Pending?
    {
      if i != id { assert i in d.ids; }
      assert i == id;
      assert m.out[|m.out| - 1] in m.out;
    }
  }
}

lemma propose_ensures(d: Approvals, id: int, operation: app__approvals__operation_Operation, expires: int, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> alwaysEveryProposalKeepsItsRules(propose(d, id, operation, expires, signedIn, by_).state))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> alwaysOneActionAtATime(propose(d, id, operation, expires, signedIn, by_).state))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> alwaysALeaseFollowsItsRead(propose(d, id, operation, expires, signedIn, by_).state))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> stepNoApprovalNoticeOutlivesItsProposal(d, "propose", propose(d, id, operation, expires, signedIn, by_).state, propose(d, id, operation, expires, signedIn, by_).out))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> stepOneActionAtATime(d, "propose", propose(d, id, operation, expires, signedIn, by_).state, propose(d, id, operation, expires, signedIn, by_).out))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> stepARestartKeepsEveryProposal(d, "propose", propose(d, id, operation, expires, signedIn, by_).state))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> stepWhatIsAskedAgainIsAskedOnce(d, "propose", propose(d, id, operation, expires, signedIn, by_).state, propose(d, id, operation, expires, signedIn, by_).out))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> stepAFailedListingWaitsForTheConversationToChange(d, "propose", propose(d, id, operation, expires, signedIn, by_).state))
  ensures (inv(d) ==> canPropose(d, id, operation, signedIn, by_) ==> stepACardIsUnavailableOnlyFromALaterListing(d, "propose", propose(d, id, operation, expires, signedIn, by_).state))
{
  if inv(d) && canPropose(d, id, operation, signedIn, by_) {
    var m := propose(d, id, operation, expires, signedIn, by_);
    var after := m.state;
    var f := (set_x: int) => !((set_x in d.ids));
    ProofLib.FilterNil(f, []);
    ProofLib.FilterCons(f, [id]);
    assert after.ids == d.ids + [id];
    var p := app__approvals__proposal_propose(app__approvals__proposal_initial, id, operation, expires, signedIn, by_);
    assert after.proposals == d.proposals[id := p];
    assert entry(after, id) == p;
    assert entry(d, id) == app__approvals__proposal_initial;
    assert leaseOf(after, id) == app__approvals__lease_initial;
    forall i | i in d.ids ensures entry(after, i) == entry(d, i) && leaseOf(after, i) == leaseOf(d, i) {
      EntryAfterPut(d, after, id, p, i);
    }
    forall i | i in after.ids ensures i > 0 && keepsItsRules(i, entry(after, i), leaseOf(after, i)) {
      if i != id { assert i in d.ids; }
    }
    forall i | i in after.ids ensures inFlight(entry(after, i)) == (i == after.running) {
      if i != id { assert i in d.ids; }
    }
    forall i | i in after.ids && entry(d, i).stage.Pending? != entry(after, i).stage.Pending?
      ensures exists e :: e in m.out && e.Noticing? && e.card == i && e.up == entry(after, i).stage.Pending?
    {
      if i != id { assert i in d.ids; }
      assert i == id;
      assert m.out[|m.out| - 1] in m.out;
    }
  }
}

lemma start_ensures(d: Approvals, id: int, operation: app__approvals__operation_Operation, message: int, typed: bool, automated: bool, wanted: app__approvals__operation_Preference, protectedScreen: bool, expires: int, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> alwaysEveryProposalKeepsItsRules(start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> alwaysOneActionAtATime(start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> alwaysALeaseFollowsItsRead(start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> stepNoApprovalNoticeOutlivesItsProposal(d, "start", start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state, start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).out))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> stepOneActionAtATime(d, "start", start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state, start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).out))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> stepARestartKeepsEveryProposal(d, "start", start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> stepWhatIsAskedAgainIsAskedOnce(d, "start", start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state, start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).out))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> stepAFailedListingWaitsForTheConversationToChange(d, "start", start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state))
  ensures (inv(d) ==> canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) ==> stepACardIsUnavailableOnlyFromALaterListing(d, "start", start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_).state))
{
  if inv(d) && canStart(d, id, operation, message, typed, automated, wanted, protectedScreen, signedIn, by_) {
    var m := start(d, id, operation, message, typed, automated, wanted, protectedScreen, expires, signedIn, by_);
    var after := m.state;
    var f := (set_x: int) => !((set_x in d.ids));
    ProofLib.FilterNil(f, []);
    ProofLib.FilterCons(f, [id]);
    assert after.ids == d.ids + [id];
    var p := app__approvals__proposal_request(app__approvals__proposal_initial, id, operation, message, typed, expires, signedIn, by_).state;
    assert after.proposals == d.proposals[id := p];
    assert entry(after, id) == p;
    assert entry(d, id) == app__approvals__proposal_initial;
    assert leaseOf(after, id) == app__approvals__lease_initial;
    forall i | i in d.ids ensures entry(after, i) == entry(d, i) && leaseOf(after, i) == leaseOf(d, i) {
      EntryAfterPut(d, after, id, p, i);
    }
    forall i | i in after.ids ensures i > 0 && keepsItsRules(i, entry(after, i), leaseOf(after, i)) {
      if i != id { assert i in d.ids; }
    }
    forall i | i in after.ids ensures inFlight(entry(after, i)) == (i == after.running) {
      if i != id { assert i in d.ids; }
    }
    forall i | i in after.ids && entry(d, i).stage.Pending? != entry(after, i).stage.Pending?
      ensures exists e :: e in m.out && e.Noticing? && e.card == i && e.up == entry(after, i).stage.Pending?
    {
      if i != id { assert i in d.ids; }
      assert i == id;
      assert m.out[|m.out| - 1] in m.out;
    }
  }
}

lemma recover_ensures(d: Approvals, id: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canRecover(d, id, by_) ==> alwaysEveryProposalKeepsItsRules(recover(d, id, by_).state))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> alwaysOneActionAtATime(recover(d, id, by_).state))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> alwaysALeaseFollowsItsRead(recover(d, id, by_).state))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> stepNoApprovalNoticeOutlivesItsProposal(d, "recover", recover(d, id, by_).state, recover(d, id, by_).out))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> stepOneActionAtATime(d, "recover", recover(d, id, by_).state, recover(d, id, by_).out))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> stepARestartKeepsEveryProposal(d, "recover", recover(d, id, by_).state))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> stepWhatIsAskedAgainIsAskedOnce(d, "recover", recover(d, id, by_).state, recover(d, id, by_).out))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> stepAFailedListingWaitsForTheConversationToChange(d, "recover", recover(d, id, by_).state))
  ensures (inv(d) ==> canRecover(d, id, by_) ==> stepACardIsUnavailableOnlyFromALaterListing(d, "recover", recover(d, id, by_).state))
{
  if inv(d) && canRecover(d, id, by_) {
    var m := recover(d, id, by_);
    var after := m.state;
    var f := (set_x: int) => !((set_x in [id]));
    assert after.interrupted == ProofLib.Filter(f, d.interrupted);
    forall k | k in after.interrupted ensures k in d.interrupted && k != id {
      ProofLib.FilterMember(f, d.interrupted, k);
    }
    ProofLib.FilterMember(f, d.interrupted, id);
    assert id !in after.interrupted;
    forall i | i in after.ids ensures i > 0 && keepsItsRules(i, entry(after, i), leaseOf(after, i)) {
      assert keepsItsRules(i, entry(d, i), leaseOf(d, i));
    }
  }
}

lemma stillWaiting_ensures(d: Approvals, id: int, ticket: int, by_: app__approvals__operation_Actor)
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> alwaysEveryProposalKeepsItsRules(stillWaiting(d, id, ticket, by_)))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> alwaysOneActionAtATime(stillWaiting(d, id, ticket, by_)))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> alwaysALeaseFollowsItsRead(stillWaiting(d, id, ticket, by_)))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> stepNoApprovalNoticeOutlivesItsProposal(d, "stillWaiting", stillWaiting(d, id, ticket, by_), []))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> stepOneActionAtATime(d, "stillWaiting", stillWaiting(d, id, ticket, by_), []))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> stepARestartKeepsEveryProposal(d, "stillWaiting", stillWaiting(d, id, ticket, by_)))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> stepWhatIsAskedAgainIsAskedOnce(d, "stillWaiting", stillWaiting(d, id, ticket, by_), []))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> stepAFailedListingWaitsForTheConversationToChange(d, "stillWaiting", stillWaiting(d, id, ticket, by_)))
  ensures (inv(d) ==> canStillWaiting(d, id, ticket, by_) ==> stepACardIsUnavailableOnlyFromALaterListing(d, "stillWaiting", stillWaiting(d, id, ticket, by_)))
{
  if inv(d) && canStillWaiting(d, id, ticket, by_) {
    var m := stillWaiting(d, id, ticket, by_);
    var after := m;
    var f := (set_x: int) => !((set_x in [id]));
    assert after.interrupted == ProofLib.Filter(f, d.interrupted);
    forall k | k in after.interrupted ensures k in d.interrupted && k != id {
      ProofLib.FilterMember(f, d.interrupted, k);
    }
    ProofLib.FilterMember(f, d.interrupted, id);
    assert id !in after.interrupted;
  }
}

