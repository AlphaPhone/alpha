lemma IsolationView(s: WorkspaceList)
  ensures alwaysWorkspaceIsolation(s) == (((((((((((((!((exists w :: w in s.connected && !((((w.workspace > 0) && (w.credentialRev > 0)) && (|ProofLib.Filter((x: WorkspaceLink) => (x.workspace == w.workspace), s.connected)| == 1))))) && (!((|s.connected| == 0)) || ((((s.selected.workspace == 0) && (s.pages == 0)) && (s.keptPages == 0)) && (!s.list.status.Loading?)))) && (!((s.selected.workspace > 0)) || isConnected(s.connected, s.selected.workspace))) && (!((s.keptPages > 0)) || (isConnected(s.connected, s.kept.workspace) && (credOf(s.connected, s.kept.workspace) == s.keptCredential)))) && (!(s.saved) || ((((s.pages > 0) && (s.kept == s.selected)) && (s.keptPages == s.pages)) && (credOf(s.connected, s.selected.workspace) == s.keptCredential)))) && (!((s.count.workspace > 0)) || (isConnected(s.connected, s.count.workspace) && (credOf(s.connected, s.count.workspace) == s.count.credentialRev)))) && (!(s.count.fresh_) || ((((s.count.workspace > 0) && (s.count.workspace == s.selected.workspace)) && !(s.saved)) && s.failure.Fine?))) && (s.pages >= 0)) && (s.total >= 0)) && (s.keptPages >= 0)) && (s.keptTotal >= 0)) && (s.count.unread >= 0)) && (s.count.mentions >= 0)) && (s.count.mentions <= s.count.unread))
{
}

lemma UniqueToDistinctBy(xs: seq<WorkspaceLink>)
  requires forall w :: w in xs ==> |ProofLib.Filter((x: WorkspaceLink) => (x.workspace == w.workspace), xs)| == 1
  ensures ProofLib.DistinctBy(xs, (w: WorkspaceLink) => w.workspace)
{
  forall i, j | 0 <= i < |xs| && 0 <= j < |xs| && i != j ensures xs[i].workspace != xs[j].workspace {
    if xs[i].workspace == xs[j].workspace {
      var w := xs[i];
      assert w in xs;
      ProofLib.FilterTwo((x: WorkspaceLink) => (x.workspace == w.workspace), xs, i, j);
    }
  }
}

lemma DistinctByToUnique(xs: seq<WorkspaceLink>)
  requires ProofLib.DistinctBy(xs, (w: WorkspaceLink) => w.workspace)
  ensures forall w :: w in xs ==> |ProofLib.Filter((x: WorkspaceLink) => (x.workspace == w.workspace), xs)| == 1
{
  forall w | w in xs ensures |ProofLib.Filter((x: WorkspaceLink) => (x.workspace == w.workspace), xs)| == 1 {
    var i :| 0 <= i < |xs| && xs[i] == w;
    ProofLib.FilterOne((x: WorkspaceLink) => (x.workspace == w.workspace), xs, i);
  }
}

lemma LinkOfStep(xs: seq<WorkspaceLink>, last: WorkspaceLink, target: int)
  ensures linkOf(xs + [last], target) == (if last.workspace == target then last else linkOf(xs, target))
{
  ProofLib.FoldLeftAppend((found: WorkspaceLink, w: WorkspaceLink) => (if (w.workspace == target) then w else found), noLink, xs, last);
}

lemma LinkOfUnique(xs: seq<WorkspaceLink>, target: int, entry: WorkspaceLink)
  requires ProofLib.DistinctBy(xs, (w: WorkspaceLink) => w.workspace)
  requires entry in xs && entry.workspace == target
  ensures linkOf(xs, target) == entry
  decreases |xs|
{
  var prefix := xs[..|xs| - 1];
  var last := xs[|xs| - 1];
  assert xs == prefix + [last];
  LinkOfStep(prefix, last, target);
  if last == entry {
  } else {
    assert entry in prefix;
    assert last.workspace != target;
    LinkOfUnique(prefix, target, entry);
  }
}

lemma ConnectedNextView(s: WorkspaceList, workspace: int, credentialRev: int)
  ensures workspaceConnected(s, workspace, credentialRev).state.connected == ProofLib.Filter((w: WorkspaceLink) => (w.workspace != workspace), s.connected) + [WorkspaceLink(workspace, credentialRev)]
{
}

lemma RemovedRestView(s: WorkspaceList, workspace: int)
  ensures workspaceRemoved(s, workspace).state.connected == ProofLib.Filter((w: WorkspaceLink) => (w.workspace != workspace), s.connected)
{
}

lemma workspaceConnected_ensures(s: WorkspaceList, workspace: int, credentialRev: int)
  ensures (inv(s) ==> canWorkspaceConnected(s, workspace, credentialRev) ==> alwaysWorkspaceIsolation(workspaceConnected(s, workspace, credentialRev).state))
  ensures (inv(s) ==> canWorkspaceConnected(s, workspace, credentialRev) ==> alwaysCursorUsedOnce(workspaceConnected(s, workspace, credentialRev).state))
{
  if inv(s) && canWorkspaceConnected(s, workspace, credentialRev) {
    var after := workspaceConnected(s, workspace, credentialRev).state;
    var entry := WorkspaceLink(workspace, credentialRev);
    IsolationView(s);
    IsolationView(after);
    ConnectedNextView(s, workspace, credentialRev);
    UniqueToDistinctBy(s.connected);
    var kept := ProofLib.Filter((w: WorkspaceLink) => (w.workspace != workspace), s.connected);
    ProofLib.FilterKeepsDistinctBy((w: WorkspaceLink) => (w.workspace != workspace), s.connected, (w: WorkspaceLink) => w.workspace);
    forall w | w in kept ensures w in s.connected && w.workspace != workspace {
      ProofLib.FilterMember((w: WorkspaceLink) => (w.workspace != workspace), s.connected, w);
    }
    forall w | w in s.connected && w.workspace != workspace ensures w in kept {
      ProofLib.FilterMember((w: WorkspaceLink) => (w.workspace != workspace), s.connected, w);
    }
    assert after.connected == kept + [entry];
    assert ProofLib.DistinctBy(after.connected, (w: WorkspaceLink) => w.workspace);
    DistinctByToUnique(after.connected);
    assert entry in after.connected;
    LinkOfUnique(after.connected, workspace, entry);
    if s.selected.workspace > 0 && s.selected.workspace != workspace {
      var sw :| sw in s.connected && sw.workspace == s.selected.workspace;
      assert sw in after.connected;
      LinkOfUnique(s.connected, sw.workspace, sw);
      LinkOfUnique(after.connected, sw.workspace, sw);
    }
    if s.keptPages > 0 && s.kept.workspace != workspace {
      var kw :| kw in s.connected && kw.workspace == s.kept.workspace;
      assert kw in after.connected;
      LinkOfUnique(s.connected, kw.workspace, kw);
      LinkOfUnique(after.connected, kw.workspace, kw);
    }
    if s.count.workspace > 0 && s.count.workspace != workspace {
      var cw :| cw in s.connected && cw.workspace == s.count.workspace;
      assert cw in after.connected;
      LinkOfUnique(s.connected, cw.workspace, cw);
      LinkOfUnique(after.connected, cw.workspace, cw);
    }
  }
}

lemma workspaceRemoved_ensures(s: WorkspaceList, workspace: int)
  ensures (inv(s) ==> canWorkspaceRemoved(s, workspace) ==> alwaysWorkspaceIsolation(workspaceRemoved(s, workspace).state))
  ensures (inv(s) ==> canWorkspaceRemoved(s, workspace) ==> alwaysCursorUsedOnce(workspaceRemoved(s, workspace).state))
{
  if inv(s) && canWorkspaceRemoved(s, workspace) {
    var after := workspaceRemoved(s, workspace).state;
    IsolationView(s);
    IsolationView(after);
    RemovedRestView(s, workspace);
    UniqueToDistinctBy(s.connected);
    ProofLib.FilterKeepsDistinctBy((w: WorkspaceLink) => (w.workspace != workspace), s.connected, (w: WorkspaceLink) => w.workspace);
    DistinctByToUnique(after.connected);
    forall w | w in after.connected ensures w in s.connected && w.workspace != workspace {
      ProofLib.FilterMember((w: WorkspaceLink) => (w.workspace != workspace), s.connected, w);
    }
    forall w | w in s.connected && w.workspace != workspace ensures w in after.connected {
      ProofLib.FilterMember((w: WorkspaceLink) => (w.workspace != workspace), s.connected, w);
    }
    if s.selected.workspace > 0 && s.selected.workspace != workspace {
      var sw :| sw in s.connected && sw.workspace == s.selected.workspace;
      assert sw in after.connected;
      LinkOfUnique(s.connected, sw.workspace, sw);
      LinkOfUnique(after.connected, sw.workspace, sw);
    }
    if s.keptPages > 0 && s.kept.workspace != workspace {
      var kw :| kw in s.connected && kw.workspace == s.kept.workspace;
      assert kw in after.connected;
      LinkOfUnique(s.connected, kw.workspace, kw);
      LinkOfUnique(after.connected, kw.workspace, kw);
    }
    if s.count.workspace > 0 && s.count.workspace != workspace {
      var cw :| cw in s.connected && cw.workspace == s.count.workspace;
      assert cw in after.connected;
      LinkOfUnique(s.connected, cw.workspace, cw);
      LinkOfUnique(after.connected, cw.workspace, cw);
    }
    if s.selected.workspace == workspace && |after.connected| > 0 {
      var nw := after.connected[0];
      assert nw in after.connected;
      LinkOfUnique(after.connected, nw.workspace, nw);
    }
  }
}
