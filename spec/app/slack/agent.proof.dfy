lemma RevokedConnView(s: AgentSlack, workspace: int, by_: Actor)
  ensures workspaceRevoked(s, workspace, by_).connectedWorkspaces == ProofLib.Filter((set_x: int) => !((set_x in [workspace])), s.connectedWorkspaces)
{
}

lemma workspaceRevoked_ensures(s: AgentSlack, workspace: int, by_: Actor)
  ensures (inv(s) ==> canWorkspaceRevoked(s, workspace, by_) ==> alwaysAuthAndReviewInvariants(workspaceRevoked(s, workspace, by_)))
  ensures (inv(s) ==> canWorkspaceRevoked(s, workspace, by_) ==> stepReadsAndDraftsNeverMutateOrSend(s, "workspaceRevoked", workspaceRevoked(s, workspace, by_), []))
  ensures (inv(s) ==> canWorkspaceRevoked(s, workspace, by_) ==> stepMutationsRequireExactRevisionApproval(s, "workspaceRevoked", workspaceRevoked(s, workspace, by_), []))
{
  if inv(s) && canWorkspaceRevoked(s, workspace, by_) {
    var after := workspaceRevoked(s, workspace, by_);
    RevokedConnView(s, workspace, by_);
    ProofLib.FilterMember((set_x: int) => !((set_x in [workspace])), s.connectedWorkspaces, after.activeWorkspace);
    if after.review.showing {
      ProofLib.FilterMember((set_x: int) => !((set_x in [workspace])), s.connectedWorkspaces, after.pending.workspace);
    }
  }
}
