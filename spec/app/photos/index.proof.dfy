// spec/app/photos/index.md: sending a run's request takes items still to send; losing access
// asks the shell to close what shows the library; an answer lists only what the phone may show
// and pages on with older items; toggling keeps the selection within what is listed.

lemma Joined(xs: seq<int>, ys: seq<int>)
  ensures forall x :: x in xs + ProofLib.Filter((set_x: int) => !((set_x in xs)), ys) <==> (x in xs || x in ys)
{
  forall x
    ensures x in xs + ProofLib.Filter((set_x: int) => !((set_x in xs)), ys) <==> (x in xs || x in ys)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in xs)), ys, x);
  }
}

lemma Dropped(xs: seq<int>, ys: seq<int>)
  ensures forall x :: x in ProofLib.Filter((set_x: int) => !((set_x in ys)), xs) <==> (x in xs && x !in ys)
{
  forall x
    ensures x in ProofLib.Filter((set_x: int) => !((set_x in ys)), xs) <==> (x in xs && x !in ys)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in ys)), xs, x);
  }
}

lemma Kept(xs: seq<int>, ys: seq<int>)
  ensures forall x :: x in ProofLib.Filter((set_x: int) => (set_x in ys), xs) <==> (x in xs && x in ys)
{
  forall x
    ensures x in ProofLib.Filter((set_x: int) => (set_x in ys), xs) <==> (x in xs && x in ys)
  {
    ProofLib.FilterMember((set_x: int) => (set_x in ys), xs, x);
  }
}

lemma Sent(r: app__photos__changes_Run, items: seq<int>)
  requires app__photos__changes_alwaysDecidedByTheOwner(r) && app__photos__changes_alwaysOneRequestAtATime(r) && app__photos__changes_alwaysUndoFollowsADeletion(r)
  requires app__photos__changes_canSend(r, items)
  ensures app__photos__changes_running(r) && r.by_.Owner?
  ensures forall x :: x in items ==> x in r.left
  ensures app__photos__changes_alwaysDecidedByTheOwner(app__photos__changes_send(r, items))
  ensures app__photos__changes_alwaysOneRequestAtATime(app__photos__changes_send(r, items))
  ensures app__photos__changes_alwaysUndoFollowsADeletion(app__photos__changes_send(r, items))
{
  assert !((exists set_x :: set_x in items && !((set_x in r.left))));
  assert items[0] in items;
  assert items[0] in r.left;
  assert |r.left| > 0;
  var after := app__photos__changes_send(r, items);
  assert after.left == ProofLib.Filter((set_x: int) => !((set_x in items)), r.left);
  if r.change.Share? {
    forall x | x in r.left ensures x in items {
      if x !in items {
        assert x in r.left && !(x in items);
      }
    }
    ProofLib.FilterNone((set_x: int) => !((set_x in items)), r.left);
    assert |after.left| == 0;
  }
}

lemma sendNext_ensures(s: Photos, items: seq<int>, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysVideosNeedTheirAccess(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysOnlyOwnWithoutAccess(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysTheAlbumShowingIsListed(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysNothingShownWhileHidden(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysTheLockScreenListsOnlyItsSession(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysSelectionIsListed(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysRunsAreTheOwners(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysDialogNamesItsSubject(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepLosingAccessClosesWhatShowsTheLibrary(s, "sendNext", sendNext(s, items, by_).state, sendNext(s, items, by_).out))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepNothingChangesWithoutAccess(s, sendNext(s, items, by_).state, sendNext(s, items, by_).out))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepAPageKeepsWhatWasListed(s, "sendNext", sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepChangesAreTheOwners(s, "sendNext", sendNext(s, items, by_).state, sendNext(s, items, by_).out))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepAFavouriteToggles(s, "sendNext", sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepAlbumChangesCarryTheSelection(s, "sendNext", sendNext(s, items, by_).state, sendNext(s, items, by_).out))
{
  if inv(s) && canSendNext(s, items, by_) {
    Sent(s.job, items);
  }
}

lemma accessIs_ensures(s: Photos, grant: kit__permission_Grant, videos: bool, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysVideosNeedTheirAccess(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysOnlyOwnWithoutAccess(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysTheAlbumShowingIsListed(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysNothingShownWhileHidden(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysTheLockScreenListsOnlyItsSession(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysSelectionIsListed(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysRunsAreTheOwners(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> alwaysDialogNamesItsSubject(accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepLosingAccessClosesWhatShowsTheLibrary(s, "accessIs", accessIs(s, grant, videos, by_).state, accessIs(s, grant, videos, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepNothingChangesWithoutAccess(s, accessIs(s, grant, videos, by_).state, accessIs(s, grant, videos, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepAPageKeepsWhatWasListed(s, "accessIs", accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepChangesAreTheOwners(s, "accessIs", accessIs(s, grant, videos, by_).state, accessIs(s, grant, videos, by_).out))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepAFavouriteToggles(s, "accessIs", accessIs(s, grant, videos, by_).state))
  ensures (inv(s) ==> canAccessIs(s, by_) ==> stepAlbumChangesCarryTheSelection(s, "accessIs", accessIs(s, grant, videos, by_).state, accessIs(s, grant, videos, by_).out))
{
  var d := accessIs(s, grant, videos, by_);
  if !kit__permission_allows(kit__permission_observe(s.access, grant)) {
    assert d.out[0].Revoke?;
    assert d.out[0] in d.out;
  } else {
    assert forall e :: e in d.out ==> !e.Revoke?;
  }
}

lemma toggle_ensures(s: Photos, photo: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysVideosNeedTheirAccess(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysOnlyOwnWithoutAccess(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysTheAlbumShowingIsListed(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysNothingShownWhileHidden(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysTheLockScreenListsOnlyItsSession(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysSelectionIsListed(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysRunsAreTheOwners(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysDialogNamesItsSubject(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepLosingAccessClosesWhatShowsTheLibrary(s, "toggle", toggle(s, photo, by_), []))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepNothingChangesWithoutAccess(s, toggle(s, photo, by_), []))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepAPageKeepsWhatWasListed(s, "toggle", toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepChangesAreTheOwners(s, "toggle", toggle(s, photo, by_), []))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepAFavouriteToggles(s, "toggle", toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepAlbumChangesCarryTheSelection(s, "toggle", toggle(s, photo, by_), []))
{
  if inv(s) && canToggle(s, photo, by_) {
    var after := toggle(s, photo, by_);
    if photo in s.selected {
      assert after.selected == ProofLib.Filter((set_x: int) => !((set_x in [photo])), s.selected);
      Dropped(s.selected, [photo]);
    } else {
      assert after.selected == s.selected + ProofLib.Filter((set_x: int) => !((set_x in s.selected)), [photo]);
      Joined(s.selected, [photo]);
    }
  }
}

lemma PageStep(before: Photos, via: string, after: Photos)
  ensures stepAPageKeepsWhatWasListed(before, via, after) == (!((((via == "listed") && before.paging) && after.library.status.Loaded?)) || (!((exists set_x :: set_x in before.rows && !((set_x in after.rows)))) && older(ProofLib.Filter((set_x: int) => !((set_x in before.rows)), after.rows), before.rows)))
{
}

lemma listed_ensures(s: Photos, ticket: int, ok: bool, rows: seq<int>, owned: seq<int>, starred: seq<int>, revision: int, more: bool, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysVideosNeedTheirAccess(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysOnlyOwnWithoutAccess(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysTheAlbumShowingIsListed(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysNothingShownWhileHidden(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysTheLockScreenListsOnlyItsSession(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysSelectionIsListed(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysRunsAreTheOwners(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysDialogNamesItsSubject(listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepLosingAccessClosesWhatShowsTheLibrary(s, "listed", listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state, listed(s, ticket, ok, rows, owned, starred, revision, more, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepNothingChangesWithoutAccess(s, listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state, listed(s, ticket, ok, rows, owned, starred, revision, more, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepAPageKeepsWhatWasListed(s, "listed", listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepChangesAreTheOwners(s, "listed", listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state, listed(s, ticket, ok, rows, owned, starred, revision, more, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepAFavouriteToggles(s, "listed", listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepAlbumChangesCarryTheSelection(s, "listed", listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state, listed(s, ticket, ok, rows, owned, starred, revision, more, by_).out))
{
  if inv(s) && canListed(s, ticket, by_) && ok && !(s.paging && ((revision != s.revision) || !(older(rows, s.rows)))) {
    var after := listed(s, ticket, ok, rows, owned, starred, revision, more, by_).state;
    var sess := if s.secure then ProofLib.Filter((set_x: int) => (set_x in s.only), rows) else rows;
    var shown := if kit__permission_allows(s.access) then sess else ProofLib.Filter((set_x: int) => (set_x in owned), sess);
    var whole := if !showsItems(s) then [] else (if s.paging then (s.rows + ProofLib.Filter((set_x: int) => !((set_x in s.rows)), shown)) else shown);
    var ownedAll := if s.paging then (s.mine + ProofLib.Filter((set_x: int) => !((set_x in s.mine)), owned)) else owned;
    assert after.rows == whole;
    assert after.mine == ProofLib.Filter((set_x: int) => (set_x in whole), ownedAll);
    Kept(rows, s.only);
    Kept(sess, owned);
    Joined(s.rows, shown);
    Joined(s.mine, owned);
    Kept(ownedAll, whole);
    forall x | x in whole ensures x in shown || (s.paging && x in s.rows) {
    }
    forall x | x in shown ensures x in rows && (s.secure ==> x in s.only) && (!kit__permission_allows(s.access) ==> x in owned) {
    }
    if !kit__permission_allows(s.access) {
      forall x | x in whole ensures x in after.mine {
        if s.paging && x in s.rows {
          assert x in s.mine;
        }
      }
    }
    if s.secure {
      forall x | x in whole ensures x in s.only {
      }
    }
    if s.paging {
      PageStep(s, "listed", after);
      Dropped(whole, s.rows);
      forall x | x in ProofLib.Filter((set_x: int) => !((set_x in s.rows)), after.rows) ensures x in rows {
      }
      assert older(ProofLib.Filter((set_x: int) => !((set_x in s.rows)), after.rows), s.rows);
    }
  }
}
