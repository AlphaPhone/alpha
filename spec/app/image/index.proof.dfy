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

lemma StageProblemsFilter(s: Stage)
  ensures stageProblems(s) == ((((reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))) + ProofLib.Filter((set_x: StageProblem) => !((set_x in (reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))))), listenerProblems(s))) + ProofLib.Filter((set_x: StageProblem) => !((set_x in ((reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))) + ProofLib.Filter((set_x: StageProblem) => !((set_x in (reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))))), listenerProblems(s))))), patchProblems(s))) + ProofLib.Filter((set_x: StageProblem) => !((set_x in (((reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))) + ProofLib.Filter((set_x: StageProblem) => !((set_x in (reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))))), listenerProblems(s))) + ProofLib.Filter((set_x: StageProblem) => !((set_x in ((reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))) + ProofLib.Filter((set_x: StageProblem) => !((set_x in (reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))))), listenerProblems(s))))), patchProblems(s))))), brandingProblems(s)))
{
}

lemma StageProblemsEmpty(s: Stage)
  requires stageAdmitted(s)
  ensures reviewProblems(s) == []
  ensures ownerTelephonyProblems(s) == []
  ensures listenerProblems(s) == []
{
  StageProblemsFilter(s);
  assert reviewProblems(s) == [];
  FilterEmpty(ownerTelephonyProblems(s));
  assert reviewProblems(s) + ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s)) == [];
  FilterEmpty(listenerProblems(s));
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
  ensures listenerProblems(s) == (problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel) + ProofLib.Filter((set_x: StageProblem) => !((set_x in problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel))), problemIf((listenerImage(s) && !(((s.listener && s.qualified) && carriesListenerPatches(s)))), StageProblem.ListenerImageIncomplete)))
{
}

lemma ListenerProblemsEmpty(s: Stage)
  requires listenerProblems(s) == []
  requires listenerImage(s)
  ensures s.target.Pixel10a? && s.qualified && carriesListenerPatches(s)
{
  ListenerProblemsFilter(s);
  assert problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel) == [];
  FilterEmpty(problemIf((listenerImage(s) && !(((s.listener && s.qualified) && carriesListenerPatches(s)))), StageProblem.ListenerImageIncomplete));
}
