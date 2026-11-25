lemma BotTokensView(s: Auth)
  ensures alwaysBotTokensRejected(s) == ((((s.ticket >= 0) && (s.nonce >= 0)) && (s.nextRev >= 0)) && !(exists w :: w in s.connected && !((((((w.tokenKind.UserToken? && (w.workspace > 0)) && (w.userId > 0)) && (w.credentialRev > 0)) && (w.credentialRev <= s.nextRev)) && (|ProofLib.Filter((x: WorkspaceAuth) => (x.workspace == w.workspace), s.connected)| == 1)))))
{
}

lemma UpsertView(connected: seq<WorkspaceAuth>, entry: WorkspaceAuth)
  ensures upsertWorkspace(connected, entry) == ProofLib.Filter((w: WorkspaceAuth) => (w.workspace != entry.workspace), connected) + [entry]
{
}

lemma RevokedConnView(s: Auth, workspace: int)
  ensures workspaceRevoked(s, workspace).state.connected == ProofLib.Filter((w: WorkspaceAuth) => (w.workspace != workspace), s.connected)
{
}

lemma SignOutConnView(s: Auth, workspace: int)
  ensures signOutWorkspace(s, workspace).state.connected == ProofLib.Filter((w: WorkspaceAuth) => (w.workspace != workspace), s.connected)
{
}

lemma UniqueToDistinctBy(xs: seq<WorkspaceAuth>)
  requires forall w :: w in xs ==> |ProofLib.Filter((x: WorkspaceAuth) => (x.workspace == w.workspace), xs)| == 1
  ensures ProofLib.DistinctBy(xs, (w: WorkspaceAuth) => w.workspace)
{
  forall i, j | 0 <= i < |xs| && 0 <= j < |xs| && i != j ensures xs[i].workspace != xs[j].workspace {
    if xs[i].workspace == xs[j].workspace {
      var w := xs[i];
      assert w in xs;
      ProofLib.FilterTwo((x: WorkspaceAuth) => (x.workspace == w.workspace), xs, i, j);
    }
  }
}

lemma DistinctByToUnique(xs: seq<WorkspaceAuth>)
  requires ProofLib.DistinctBy(xs, (w: WorkspaceAuth) => w.workspace)
  ensures forall w :: w in xs ==> |ProofLib.Filter((x: WorkspaceAuth) => (x.workspace == w.workspace), xs)| == 1
{
  forall w | w in xs ensures |ProofLib.Filter((x: WorkspaceAuth) => (x.workspace == w.workspace), xs)| == 1 {
    var i :| 0 <= i < |xs| && xs[i] == w;
    ProofLib.FilterOne((x: WorkspaceAuth) => (x.workspace == w.workspace), xs, i);
  }
}

lemma exchanged_ensures(s: Auth, ticket: int, reply: ExchangeOutcome, token: string, refresh: string)
  ensures (inv(s) ==> canExchanged(s, ticket) ==> alwaysAuthScreensAreSensitive(exchanged(s, ticket, reply, token, refresh).state))
  ensures (inv(s) ==> canExchanged(s, ticket) ==> alwaysBotTokensRejected(exchanged(s, ticket, reply, token, refresh).state))
  ensures (inv(s) ==> canExchanged(s, ticket) ==> stepPerWorkspaceSignOutIsIsolated(s, "exchanged", exchanged(s, ticket, reply, token, refresh).state, exchanged(s, ticket, reply, token, refresh).out))
{
  if inv(s) && canExchanged(s, ticket) {
    if reply.ExchangeUser? && reply.workspace > 0 && reply.userId > 0 {
      var after := exchanged(s, ticket, reply, token, refresh).state;
      var entry := WorkspaceAuth(reply.workspace, reply.userId, s.nextRev + 1, TokenKind.UserToken);
      BotTokensView(s);
      BotTokensView(after);
      UpsertView(s.connected, entry);
      UniqueToDistinctBy(s.connected);
      var kept := ProofLib.Filter((w: WorkspaceAuth) => (w.workspace != entry.workspace), s.connected);
      ProofLib.FilterKeepsDistinctBy((w: WorkspaceAuth) => (w.workspace != entry.workspace), s.connected, (w: WorkspaceAuth) => w.workspace);
      forall w | w in kept ensures w in s.connected && w.workspace != entry.workspace {
        ProofLib.FilterMember((w: WorkspaceAuth) => (w.workspace != entry.workspace), s.connected, w);
      }
      assert after.connected == kept + [entry];
      assert ProofLib.DistinctBy(after.connected, (w: WorkspaceAuth) => w.workspace);
      DistinctByToUnique(after.connected);
    }
  }
}

lemma workspaceRevoked_ensures(s: Auth, workspace: int)
  ensures (inv(s) ==> canWorkspaceRevoked(s, workspace) ==> alwaysAuthScreensAreSensitive(workspaceRevoked(s, workspace).state))
  ensures (inv(s) ==> canWorkspaceRevoked(s, workspace) ==> alwaysBotTokensRejected(workspaceRevoked(s, workspace).state))
  ensures (inv(s) ==> canWorkspaceRevoked(s, workspace) ==> stepPerWorkspaceSignOutIsIsolated(s, "workspaceRevoked", workspaceRevoked(s, workspace).state, workspaceRevoked(s, workspace).out))
{
  if inv(s) && canWorkspaceRevoked(s, workspace) {
    var moved := workspaceRevoked(s, workspace);
    var after := moved.state;
    BotTokensView(s);
    BotTokensView(after);
    RevokedConnView(s, workspace);
    UniqueToDistinctBy(s.connected);
    ProofLib.FilterKeepsDistinctBy((w: WorkspaceAuth) => (w.workspace != workspace), s.connected, (w: WorkspaceAuth) => w.workspace);
    DistinctByToUnique(after.connected);
    forall w | w in after.connected ensures w in s.connected && w.workspace != workspace {
      ProofLib.FilterMember((w: WorkspaceAuth) => (w.workspace != workspace), s.connected, w);
    }
    assert moved.out[0] in moved.out && moved.out[1] in moved.out;
  }
}

lemma signOutWorkspace_ensures(s: Auth, workspace: int)
  ensures (inv(s) ==> canSignOutWorkspace(s, workspace) ==> alwaysAuthScreensAreSensitive(signOutWorkspace(s, workspace).state))
  ensures (inv(s) ==> canSignOutWorkspace(s, workspace) ==> alwaysBotTokensRejected(signOutWorkspace(s, workspace).state))
  ensures (inv(s) ==> canSignOutWorkspace(s, workspace) ==> stepPerWorkspaceSignOutIsIsolated(s, "signOutWorkspace", signOutWorkspace(s, workspace).state, signOutWorkspace(s, workspace).out))
{
  if inv(s) && canSignOutWorkspace(s, workspace) {
    var moved := signOutWorkspace(s, workspace);
    var after := moved.state;
    BotTokensView(s);
    BotTokensView(after);
    SignOutConnView(s, workspace);
    UniqueToDistinctBy(s.connected);
    ProofLib.FilterKeepsDistinctBy((w: WorkspaceAuth) => (w.workspace != workspace), s.connected, (w: WorkspaceAuth) => w.workspace);
    DistinctByToUnique(after.connected);
    forall w | w in after.connected ensures w in s.connected && w.workspace != workspace {
      ProofLib.FilterMember((w: WorkspaceAuth) => (w.workspace != workspace), s.connected, w);
    }
    assert moved.out[1] in moved.out && moved.out[2] in moved.out;
  }
}
