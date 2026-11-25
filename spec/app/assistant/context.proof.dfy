// spec/app/assistant/context.md, "Every request of Ask Alpha carries the capabilities this phone runs of those the agent offered, and none when it offered none"
lemma lawOnlyOfferedNamesAreSent_ensures(offered: seq<string>, runs: seq<string>)
  ensures (lawOnlyOfferedNamesAreSent(offered, runs) == true)
{
  forall set_x | set_x in sentNames(offered, runs) ensures set_x in offered {
    assert set_x in ProofLib.Filter((set_x: string) => (set_x in runs), offered);
    ProofLib.FilterMember((set_x: string) => (set_x in runs), offered, set_x);
  }
}
