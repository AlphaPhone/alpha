lemma RevokedView(c: Conversation, workspace: int)
  requires c.workspace != workspace
  ensures workspaceRevoked(c, workspace).connectedWorkspaces == ProofLib.Filter((set_x: int) => !((set_x in [workspace])), c.connectedWorkspaces)
{
}

lemma workspaceRevoked_ensures(c: Conversation, workspace: int)
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace) ==> alwaysWorkspaceAndThreadConsistent(workspaceRevoked(c, workspace)))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace) ==> alwaysCursorsUsedOnce(workspaceRevoked(c, workspace)))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace) ==> stepMarkedReadOnlyWhenVisiblyShown(c, "workspaceRevoked", workspaceRevoked(c, workspace), []))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace) ==> stepDeleteRequiresConfirmedReview(c, "workspaceRevoked", workspaceRevoked(c, workspace), []))
{
  if inv(c) && canWorkspaceRevoked(c, workspace) && c.workspace != workspace {
    RevokedView(c, workspace);
    ProofLib.FilterMember((set_x: int) => !((set_x in [workspace])), c.connectedWorkspaces, c.workspace);
  }
}
