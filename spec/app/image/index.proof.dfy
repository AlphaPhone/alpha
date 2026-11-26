lemma lawAnAdmittedProductionStageWasReviewed_ensures(s: Stage)
  ensures (lawAnAdmittedProductionStageWasReviewed(s) == true)
{
  if stageAdmitted(s) && s.mode.Production? {
    StageProblemsEmpty(s);
    ReviewProblemsEmpty(s);
    OwnerTelephonyProblemsEmpty(s);
  }
}

lemma lawAnAdmittedListenerImageIsAQualifiedPixel_ensures(s: Stage)
  ensures (lawAnAdmittedListenerImageIsAQualifiedPixel(s) == true)
{
  if stageAdmitted(s) && listenerImage(s) {
    StageProblemsEmpty(s);
    ListenerProblemsEmpty(s);
  }
}

lemma FilterEmpty(xs: seq<StageProblem>)
  requires |ProofLib.Filter((set_x: StageProblem) => !((set_x in ([]))), xs)| == 0
  ensures xs == []
{
  if |xs| > 0 {
    var empty: seq<StageProblem> := [];
    ProofLib.FilterMember((set_x: StageProblem) => !((set_x in empty)), xs, xs[0]);
    assert xs[0] in ProofLib.Filter((set_x: StageProblem) => !((set_x in empty)), xs);
  }
}

lemma StageProblemsEmpty(s: Stage)
  requires stageAdmitted(s)
  ensures reviewProblems(s) == []
  ensures ownerTelephonyProblems(s) == []
  ensures listenerProblems(s) == []
{
  reveal Std.Collections.Seq.Filter();
  var r := reviewProblems(s);
  var o := ownerTelephonyProblems(s);
  var l := listenerProblems(s);
  var f1 := Std.Collections.Seq.Filter((set_x: StageProblem) => !((set_x in r)), o);
  var f2 := Std.Collections.Seq.Filter((set_x: StageProblem) => !((set_x in (r + f1))), l);
  assert r == [];
  assert f1 == [];
  if |o| > 0 {
    assert !(o[0] in r);
  }
  assert r + f1 == [];
  assert f2 == [];
  if |l| > 0 {
    assert !(l[0] in (r + f1));
  }
}

lemma ReviewProblemsFilter(s: Stage)
  ensures reviewProblems(s) == (problemIf((reviewedStage(s) && !(s.descriptorReviewed)), StageProblem.NoReviewedDescriptor) + ProofLib.Filter((set_x: StageProblem) => !((set_x in problemIf((reviewedStage(s) && !(s.descriptorReviewed)), StageProblem.NoReviewedDescriptor))), problemIf((reviewedStage(s) && !(s.productComplete)), StageProblem.ProductIncomplete)))
{
}

lemma ReviewProblemsEmpty(s: Stage)
  requires reviewProblems(s) == []
  requires reviewedStage(s)
  ensures s.descriptorReviewed && s.productComplete
{
  ReviewProblemsFilter(s);
  assert problemIf((reviewedStage(s) && !(s.descriptorReviewed)), StageProblem.NoReviewedDescriptor) == [];
  FilterEmpty(problemIf((reviewedStage(s) && !(s.productComplete)), StageProblem.ProductIncomplete));
}

lemma OwnerTelephonyProblemsFilter(s: Stage)
  ensures ownerTelephonyProblems(s) == (problemIf((s.ownerTelephony && (!s.mode.Development?)), StageProblem.OwnerTelephonyOutsideDevelopment) + ProofLib.Filter((set_x: StageProblem) => !((set_x in problemIf((s.ownerTelephony && (!s.mode.Development?)), StageProblem.OwnerTelephonyOutsideDevelopment))), problemIf((s.ownerTelephony && listenerImage(s)), StageProblem.OwnerTelephonyOnAListenerImage)))
{
}

lemma OwnerTelephonyProblemsEmpty(s: Stage)
  requires ownerTelephonyProblems(s) == []
  requires s.mode.Production?
  ensures !(s.ownerTelephony)
{
  OwnerTelephonyProblemsFilter(s);
  assert problemIf((s.ownerTelephony && (!s.mode.Development?)), StageProblem.OwnerTelephonyOutsideDevelopment) == [];
}

lemma ListenerProblemsFilter(s: Stage)
  ensures listenerProblems(s) == (problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel) + ProofLib.Filter((set_x: StageProblem) => !((set_x in problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel))), problemIf((listenerImage(s) && !((((s.listener && s.qualified) && s.speechPinned) && carriesListenerPatches(s)))), StageProblem.ListenerImageIncomplete)))
{
}

lemma ListenerProblemsEmpty(s: Stage)
  requires listenerProblems(s) == []
  requires listenerImage(s)
  ensures s.target.Pixel10a? && s.qualified && s.speechPinned && carriesListenerPatches(s)
{
  ListenerProblemsFilter(s);
  assert problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel) == [];
  FilterEmpty(problemIf((listenerImage(s) && !((((s.listener && s.qualified) && s.speechPinned) && carriesListenerPatches(s)))), StageProblem.ListenerImageIncomplete));
}
