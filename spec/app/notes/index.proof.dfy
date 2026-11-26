lemma OrderedIs(rows: seq<Row>)
  ensures ordered(rows) == ProofLib.Filter((r: Row) => r.pinned, rows) + ProofLib.Filter((r: Row) => !(r.pinned), rows)
{
}

lemma lawAPinnedNoteLeads_ensures(rows: seq<Row>)
  ensures (lawAPinnedNoteLeads(rows) == true)

{
  if exists r :: r in rows && r.pinned {
    var r :| r in rows && r.pinned;
    OrderedIs(rows);
    var pinned := ProofLib.Filter((r: Row) => r.pinned, rows);
    ProofLib.FilterMember((r: Row) => r.pinned, rows, r);
    assert r in pinned;
    assert |pinned| > 0;
    ProofLib.FilterMember((r: Row) => r.pinned, rows, pinned[0]);
    assert pinned[0] in pinned;
    assert ordered(rows)[0] == pinned[0];
  }
}

lemma RenamedKeepsFolders(folders: seq<Folder>, id: int, name: string, x: int)
  ensures hasFolder(renamed(folders, id, name), x) == hasFolder(folders, x)
{
  var after := renamed(folders, id, name);
  if hasFolder(folders, x) {
    var f :| f in folders && f.id == x;
    var i :| 0 <= i < |folders| && folders[i] == f;
    assert after[i].id == x;
    assert after[i] in after;
  }
  if hasFolder(after, x) {
    var g :| g in after && g.id == x;
    var i :| 0 <= i < |after| && after[i] == g;
    assert folders[i].id == x;
    assert folders[i] in folders;
  }
}

lemma lawRenamingKeepsEveryNoteInItsFolder_ensures(rows: seq<Row>, folders: seq<Folder>, folder: int, name: string)
  ensures (lawRenamingKeepsEveryNoteInItsFolder(rows, folders, folder, name) == true)

{
  var a := tidied(rows, renamed(folders, folder, name));
  var b := tidied(rows, folders);
  assert |a| == |b|;
  forall i | 0 <= i < |a|
    ensures a[i] == b[i]
  {
    RenamedKeepsFolders(folders, folder, name, rows[i].folder);
  }
  assert a == b;
}

lemma ShownRowIs(s: Notes, id: int)
  ensures shownRow(s, id) == (if 0 < |ProofLib.Filter((r: Row) => (r.id == id), shown(s))| then ProofLib.Filter((r: Row) => (r.id == id), shown(s))[0] else blankRow)
{
}

lemma RowOfIs(s: Notes, id: int)
  ensures rowOf(s, id) == (if 0 < |ProofLib.Filter((r: Row) => (r.id == id), s.rows)| then ProofLib.Filter((r: Row) => (r.id == id), s.rows)[0] else blankRow)
{
}

lemma ShownIs(s: Notes)
  ensures shown(s) == ordered(ProofLib.Filter((r: Row) => inView(s, r), s.rows))
{
}

lemma openRow_ensures(s: Notes, id: int, covered: bool, by_: app__notes__note_Actor)
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysARemovedFolderStaysGone(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysALaterReadingIsOwed(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysOnlyAGoodReadingIsShown(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysFoldersAreSound(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysTheFilterNamesAFolder(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysAChangeIsSentOnceWrittenDown(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysAShownProposalIsPending(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> alwaysEverythingIsTheOwners(openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepRemovedFoldersAreRemembered(s, "openRow", openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepTheListNeverGoesBack(s, "openRow", openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepOnlyAReadingChangesTheList(s, "openRow", openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepANoteOpensAsListed(s, "openRow", openRow(s, id, covered, by_).state, openRow(s, id, covered, by_).out))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepTheAgentOpensOnceForTheCurrentTurn(s, "openRow", openRow(s, id, covered, by_).state, openRow(s, id, covered, by_).out))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepOneSoundChangeAtATime(s, "openRow", openRow(s, id, covered, by_).state, openRow(s, id, covered, by_).out))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepAnUnknownChangeStaysUnknown(s, "openRow", openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepTheAgentOnlyProposes(s, "openRow", openRow(s, id, covered, by_).state, openRow(s, id, covered, by_).out))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepOnlyReviewedNotesAreDeleted(s, "openRow", openRow(s, id, covered, by_).state, openRow(s, id, covered, by_).out))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepLeavingKeepsTheProposal(s, "openRow", openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepNoAnswerForAFormerOwner(s, "openRow", openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepNoLateAnswerAfterRestart(s, "openRow", openRow(s, id, covered, by_).state))

{
  if inv(s) && canOpenRow(s, id, covered, by_) {
    var x :| x in shown(s) && x.id == id;
    ProofLib.FilterMember((r: Row) => (r.id == id), shown(s), x);
    ShownRowIs(s, id);
    var f := ProofLib.Filter((r: Row) => (r.id == id), shown(s));
    assert 0 < |f|;
    assert f[0] in f;
    ProofLib.FilterMember((r: Row) => (r.id == id), shown(s), f[0]);
  }
}

lemma agentOpen_ensures(s: Notes, id: int, covered: bool, req: app__notes__note_Request, by_: app__notes__note_Actor)
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysARemovedFolderStaysGone(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysALaterReadingIsOwed(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysOnlyAGoodReadingIsShown(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysFoldersAreSound(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysTheFilterNamesAFolder(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysAChangeIsSentOnceWrittenDown(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysAShownProposalIsPending(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> alwaysEverythingIsTheOwners(agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepRemovedFoldersAreRemembered(s, "agentOpen", agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepTheListNeverGoesBack(s, "agentOpen", agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepOnlyAReadingChangesTheList(s, "agentOpen", agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepANoteOpensAsListed(s, "agentOpen", agentOpen(s, id, covered, req, by_).state, agentOpen(s, id, covered, req, by_).out))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepTheAgentOpensOnceForTheCurrentTurn(s, "agentOpen", agentOpen(s, id, covered, req, by_).state, agentOpen(s, id, covered, req, by_).out))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepOneSoundChangeAtATime(s, "agentOpen", agentOpen(s, id, covered, req, by_).state, agentOpen(s, id, covered, req, by_).out))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepAnUnknownChangeStaysUnknown(s, "agentOpen", agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepTheAgentOnlyProposes(s, "agentOpen", agentOpen(s, id, covered, req, by_).state, agentOpen(s, id, covered, req, by_).out))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepOnlyReviewedNotesAreDeleted(s, "agentOpen", agentOpen(s, id, covered, req, by_).state, agentOpen(s, id, covered, req, by_).out))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepLeavingKeepsTheProposal(s, "agentOpen", agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepNoAnswerForAFormerOwner(s, "agentOpen", agentOpen(s, id, covered, req, by_).state))
  ensures (inv(s) ==> canAgentOpen(s, id, covered, req, by_) ==> stepNoLateAnswerAfterRestart(s, "agentOpen", agentOpen(s, id, covered, req, by_).state))
{
  if inv(s) && canAgentOpen(s, id, covered, req, by_) {
    if agentOpens(s, id, covered, req, by_) {
      var x :| x in s.rows && x.id == id;
      ProofLib.FilterMember((r: Row) => (r.id == id), s.rows, x);
      RowOfIs(s, id);
      var f := ProofLib.Filter((r: Row) => (r.id == id), s.rows);
      assert 0 < |f|;
      assert f[0] in f;
      ProofLib.FilterMember((r: Row) => (r.id == id), s.rows, f[0]);
      var row := rowOf(s, id);
      var after := agentOpen(s, id, covered, req, by_).state;
      assert row in after.rows && inView(after, row);
      var viewed := ProofLib.Filter((r: Row) => inView(after, r), after.rows);
      ProofLib.FilterMember((r: Row) => inView(after, r), after.rows, row);
      ShownIs(after);
      OrderedIs(viewed);
      if row.pinned {
        ProofLib.FilterMember((r: Row) => r.pinned, viewed, row);
      } else {
        ProofLib.FilterMember((r: Row) => !(r.pinned), viewed, row);
      }
      assert row in shown(after);
    }
  }
}
