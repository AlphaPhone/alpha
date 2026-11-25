lemma PutSavedView(target: TargetKey, author: Author, saved: seq<SavedEntry>)
  ensures putSaved(target, author, saved) == (ProofLib.Filter((e: SavedEntry) => (e.target != target), saved) + (if author.Nobody? then [] else [SavedEntry(target, author)]))
{
}

lemma PutSavedPreserves(target: TargetKey, author: Author, saved: seq<SavedEntry>, ws: seq<int>)
  requires forall e :: e in saved ==> hasTarget(e.target) && (e.target.workspace in ws) && !e.author.Nobody?
  requires !author.Nobody? ==> (hasTarget(target) && (target.workspace in ws))
  ensures forall e :: e in putSaved(target, author, saved) ==> hasTarget(e.target) && (e.target.workspace in ws) && !e.author.Nobody?
{
  PutSavedView(target, author, saved);
  var filtered := ProofLib.Filter((e: SavedEntry) => (e.target != target), saved);
  forall e | e in filtered ensures e in saved {
    ProofLib.FilterMember((e: SavedEntry) => (e.target != target), saved, e);
  }
}

lemma RevokedViews(c: Composer, workspace: int, by_: Actor)
  ensures workspaceRevoked(c, workspace, by_).connectedWorkspaces == ProofLib.Filter((set_x: int) => !((set_x in [workspace])), c.connectedWorkspaces)
  ensures workspaceRevoked(c, workspace, by_).saved == ProofLib.Filter((e: SavedEntry) => (e.target.workspace != workspace), c.saved)
  ensures workspaceRevoked(c, workspace, by_).alphaRequests == ProofLib.Filter((r: AlphaRequest) => (r.target.workspace != workspace), c.alphaRequests)
{
}

lemma TypeReqView(c: Composer, workspace: int, channel: int, threadTs: int, text: string, by_: Actor)
  ensures typeAlphaRequest(c, workspace, channel, threadTs, text, by_).alphaRequests == (ProofLib.Filter((r: AlphaRequest) => (r.target != TargetKey(workspace, channel, threadTs)), c.alphaRequests) + (if (text == "") then [] else [AlphaRequest(TargetKey(workspace, channel, threadTs), text)]))
{
}

lemma SendReqView(c: Composer, workspace: int, channel: int, threadTs: int, by_: Actor)
  ensures sendAlphaRequest(c, workspace, channel, threadTs, by_).alphaRequests == ProofLib.Filter((r: AlphaRequest) => (r.target != TargetKey(workspace, channel, threadTs)), c.alphaRequests)
{
}

lemma workspaceRevoked_ensures(c: Composer, workspace: int, by_: Actor)
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace, by_) ==> alwaysBarTargetMatchesSheet(workspaceRevoked(c, workspace, by_)))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace, by_) ==> alwaysBroadcastOnlyInThread(workspaceRevoked(c, workspace, by_)))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace, by_) ==> alwaysWorkspaceAndSlotConsistent(workspaceRevoked(c, workspace, by_)))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "workspaceRevoked", workspaceRevoked(c, workspace, by_)))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace, by_) ==> stepOnlyOwnersTapSends(c, "workspaceRevoked", workspaceRevoked(c, workspace, by_), []))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace, by_) ==> stepUnknownSendIsReadBackOnly(c, "workspaceRevoked", workspaceRevoked(c, workspace, by_), []))
  ensures (inv(c) ==> canWorkspaceRevoked(c, workspace, by_) ==> stepSeparateDraftsNeverMerge(c, "workspaceRevoked", workspaceRevoked(c, workspace, by_)))
{
  if inv(c) && canWorkspaceRevoked(c, workspace, by_) {
    var after := workspaceRevoked(c, workspace, by_);
    RevokedViews(c, workspace, by_);
    if hasTarget(after.active) {
      ProofLib.FilterMember((set_x: int) => !((set_x in [workspace])), c.connectedWorkspaces, after.active.workspace);
    }
    forall e | e in after.saved ensures hasTarget(e.target) && (e.target.workspace in after.connectedWorkspaces) && !e.author.Nobody? {
      ProofLib.FilterMember((e: SavedEntry) => (e.target.workspace != workspace), c.saved, e);
      ProofLib.FilterMember((set_x: int) => !((set_x in [workspace])), c.connectedWorkspaces, e.target.workspace);
    }
    forall r | r in after.alphaRequests ensures hasTarget(r.target) && (r.target.workspace in after.connectedWorkspaces) && r.text != "" {
      ProofLib.FilterMember((r: AlphaRequest) => (r.target.workspace != workspace), c.alphaRequests, r);
      ProofLib.FilterMember((set_x: int) => !((set_x in [workspace])), c.connectedWorkspaces, r.target.workspace);
    }
  }
}

lemma draftSaved_ensures(c: Composer, by_: Actor)
  ensures (inv(c) ==> canDraftSaved(c, by_) ==> alwaysBarTargetMatchesSheet(draftSaved(c, by_)))
  ensures (inv(c) ==> canDraftSaved(c, by_) ==> alwaysBroadcastOnlyInThread(draftSaved(c, by_)))
  ensures (inv(c) ==> canDraftSaved(c, by_) ==> alwaysWorkspaceAndSlotConsistent(draftSaved(c, by_)))
  ensures (inv(c) ==> canDraftSaved(c, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "draftSaved", draftSaved(c, by_)))
  ensures (inv(c) ==> canDraftSaved(c, by_) ==> stepOnlyOwnersTapSends(c, "draftSaved", draftSaved(c, by_), []))
  ensures (inv(c) ==> canDraftSaved(c, by_) ==> stepUnknownSendIsReadBackOnly(c, "draftSaved", draftSaved(c, by_), []))
  ensures (inv(c) ==> canDraftSaved(c, by_) ==> stepSeparateDraftsNeverMerge(c, "draftSaved", draftSaved(c, by_)))
{
  if inv(c) && canDraftSaved(c, by_) {
    PutSavedPreserves(c.active, c.slot.author, c.saved, c.connectedWorkspaces);
  }
}

lemma draftCollided_ensures(c: Composer, held: int, theirs: Author, by_: Actor)
  ensures (inv(c) ==> canDraftCollided(c, held, theirs, by_) ==> alwaysBarTargetMatchesSheet(draftCollided(c, held, theirs, by_)))
  ensures (inv(c) ==> canDraftCollided(c, held, theirs, by_) ==> alwaysBroadcastOnlyInThread(draftCollided(c, held, theirs, by_)))
  ensures (inv(c) ==> canDraftCollided(c, held, theirs, by_) ==> alwaysWorkspaceAndSlotConsistent(draftCollided(c, held, theirs, by_)))
  ensures (inv(c) ==> canDraftCollided(c, held, theirs, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "draftCollided", draftCollided(c, held, theirs, by_)))
  ensures (inv(c) ==> canDraftCollided(c, held, theirs, by_) ==> stepOnlyOwnersTapSends(c, "draftCollided", draftCollided(c, held, theirs, by_), []))
  ensures (inv(c) ==> canDraftCollided(c, held, theirs, by_) ==> stepUnknownSendIsReadBackOnly(c, "draftCollided", draftCollided(c, held, theirs, by_), []))
  ensures (inv(c) ==> canDraftCollided(c, held, theirs, by_) ==> stepSeparateDraftsNeverMerge(c, "draftCollided", draftCollided(c, held, theirs, by_)))
{
  if inv(c) && canDraftCollided(c, held, theirs, by_) {
    PutSavedPreserves(c.active, theirs, c.saved, c.connectedWorkspaces);
  }
}

lemma sendAnswered_ensures(c: Composer, id: int, confirmed: bool, known: bool, by_: Actor)
  ensures (inv(c) ==> canSendAnswered(c, id, by_) ==> alwaysBarTargetMatchesSheet(sendAnswered(c, id, confirmed, known, by_).state))
  ensures (inv(c) ==> canSendAnswered(c, id, by_) ==> alwaysBroadcastOnlyInThread(sendAnswered(c, id, confirmed, known, by_).state))
  ensures (inv(c) ==> canSendAnswered(c, id, by_) ==> alwaysWorkspaceAndSlotConsistent(sendAnswered(c, id, confirmed, known, by_).state))
  ensures (inv(c) ==> canSendAnswered(c, id, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "sendAnswered", sendAnswered(c, id, confirmed, known, by_).state))
  ensures (inv(c) ==> canSendAnswered(c, id, by_) ==> stepOnlyOwnersTapSends(c, "sendAnswered", sendAnswered(c, id, confirmed, known, by_).state, sendAnswered(c, id, confirmed, known, by_).out))
  ensures (inv(c) ==> canSendAnswered(c, id, by_) ==> stepUnknownSendIsReadBackOnly(c, "sendAnswered", sendAnswered(c, id, confirmed, known, by_).state, sendAnswered(c, id, confirmed, known, by_).out))
  ensures (inv(c) ==> canSendAnswered(c, id, by_) ==> stepSeparateDraftsNeverMerge(c, "sendAnswered", sendAnswered(c, id, confirmed, known, by_).state))
{
  if inv(c) && canSendAnswered(c, id, by_) {
    PutSavedPreserves(c.sendTarget, Author.Nobody, c.saved, c.connectedWorkspaces);
  }
}

lemma readBackAnswered_ensures(c: Composer, ticket: int, ok: bool, wasSent: bool, by_: Actor)
  ensures (inv(c) ==> canReadBackAnswered(c, ticket, by_) ==> alwaysBarTargetMatchesSheet(readBackAnswered(c, ticket, ok, wasSent, by_).state))
  ensures (inv(c) ==> canReadBackAnswered(c, ticket, by_) ==> alwaysBroadcastOnlyInThread(readBackAnswered(c, ticket, ok, wasSent, by_).state))
  ensures (inv(c) ==> canReadBackAnswered(c, ticket, by_) ==> alwaysWorkspaceAndSlotConsistent(readBackAnswered(c, ticket, ok, wasSent, by_).state))
  ensures (inv(c) ==> canReadBackAnswered(c, ticket, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "readBackAnswered", readBackAnswered(c, ticket, ok, wasSent, by_).state))
  ensures (inv(c) ==> canReadBackAnswered(c, ticket, by_) ==> stepOnlyOwnersTapSends(c, "readBackAnswered", readBackAnswered(c, ticket, ok, wasSent, by_).state, readBackAnswered(c, ticket, ok, wasSent, by_).out))
  ensures (inv(c) ==> canReadBackAnswered(c, ticket, by_) ==> stepUnknownSendIsReadBackOnly(c, "readBackAnswered", readBackAnswered(c, ticket, ok, wasSent, by_).state, readBackAnswered(c, ticket, ok, wasSent, by_).out))
  ensures (inv(c) ==> canReadBackAnswered(c, ticket, by_) ==> stepSeparateDraftsNeverMerge(c, "readBackAnswered", readBackAnswered(c, ticket, ok, wasSent, by_).state))
{
  if inv(c) && canReadBackAnswered(c, ticket, by_) {
    PutSavedPreserves(c.sendTarget, Author.Nobody, c.saved, c.connectedWorkspaces);
  }
}

lemma typeAlphaRequest_ensures(c: Composer, workspace: int, channel: int, threadTs: int, text: string, by_: Actor)
  ensures (inv(c) ==> canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) ==> alwaysBarTargetMatchesSheet(typeAlphaRequest(c, workspace, channel, threadTs, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) ==> alwaysBroadcastOnlyInThread(typeAlphaRequest(c, workspace, channel, threadTs, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) ==> alwaysWorkspaceAndSlotConsistent(typeAlphaRequest(c, workspace, channel, threadTs, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "typeAlphaRequest", typeAlphaRequest(c, workspace, channel, threadTs, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) ==> stepOnlyOwnersTapSends(c, "typeAlphaRequest", typeAlphaRequest(c, workspace, channel, threadTs, text, by_), []))
  ensures (inv(c) ==> canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) ==> stepUnknownSendIsReadBackOnly(c, "typeAlphaRequest", typeAlphaRequest(c, workspace, channel, threadTs, text, by_), []))
  ensures (inv(c) ==> canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) ==> stepSeparateDraftsNeverMerge(c, "typeAlphaRequest", typeAlphaRequest(c, workspace, channel, threadTs, text, by_)))
{
  if inv(c) && canTypeAlphaRequest(c, workspace, channel, threadTs, text, by_) {
    TypeReqView(c, workspace, channel, threadTs, text, by_);
    var t := TargetKey(workspace, channel, threadTs);
    var filtered := ProofLib.Filter((r: AlphaRequest) => (r.target != t), c.alphaRequests);
    forall r | r in filtered ensures hasTarget(r.target) && (r.target.workspace in c.connectedWorkspaces) && r.text != "" {
      ProofLib.FilterMember((r: AlphaRequest) => (r.target != t), c.alphaRequests, r);
    }
  }
}

lemma sendAlphaRequest_ensures(c: Composer, workspace: int, channel: int, threadTs: int, by_: Actor)
  ensures (inv(c) ==> canSendAlphaRequest(c, workspace, channel, threadTs, by_) ==> alwaysBarTargetMatchesSheet(sendAlphaRequest(c, workspace, channel, threadTs, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, workspace, channel, threadTs, by_) ==> alwaysBroadcastOnlyInThread(sendAlphaRequest(c, workspace, channel, threadTs, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, workspace, channel, threadTs, by_) ==> alwaysWorkspaceAndSlotConsistent(sendAlphaRequest(c, workspace, channel, threadTs, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, workspace, channel, threadTs, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "sendAlphaRequest", sendAlphaRequest(c, workspace, channel, threadTs, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, workspace, channel, threadTs, by_) ==> stepOnlyOwnersTapSends(c, "sendAlphaRequest", sendAlphaRequest(c, workspace, channel, threadTs, by_), []))
  ensures (inv(c) ==> canSendAlphaRequest(c, workspace, channel, threadTs, by_) ==> stepUnknownSendIsReadBackOnly(c, "sendAlphaRequest", sendAlphaRequest(c, workspace, channel, threadTs, by_), []))
  ensures (inv(c) ==> canSendAlphaRequest(c, workspace, channel, threadTs, by_) ==> stepSeparateDraftsNeverMerge(c, "sendAlphaRequest", sendAlphaRequest(c, workspace, channel, threadTs, by_)))
{
  if inv(c) && canSendAlphaRequest(c, workspace, channel, threadTs, by_) {
    SendReqView(c, workspace, channel, threadTs, by_);
    var t := TargetKey(workspace, channel, threadTs);
    var filtered := ProofLib.Filter((r: AlphaRequest) => (r.target != t), c.alphaRequests);
    forall r | r in filtered ensures hasTarget(r.target) && (r.target.workspace in c.connectedWorkspaces) && r.text != "" {
      ProofLib.FilterMember((r: AlphaRequest) => (r.target != t), c.alphaRequests, r);
    }
  }
}
