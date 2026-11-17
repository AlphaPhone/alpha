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
