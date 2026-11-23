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

// shownRow, with the heap-free filter the library's lemmas speak of
lemma ShownRowIs(s: Notes, id: int)
  ensures shownRow(s, id) == (if 0 < |ProofLib.Filter((r: Row) => (r.id == id), shown(s))| then ProofLib.Filter((r: Row) => (r.id == id), shown(s))[0] else blankRow)
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
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepOneSoundChangeAtATime(s, "openRow", openRow(s, id, covered, by_).state, openRow(s, id, covered, by_).out))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepAnUnknownChangeStaysUnknown(s, "openRow", openRow(s, id, covered, by_).state))
  ensures (inv(s) ==> canOpenRow(s, id, covered, by_) ==> stepTheAgentOnlyProposes(s, "openRow", openRow(s, id, covered, by_).state, openRow(s, id, covered, by_).out))
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
