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

lemma FilterAllEmpty(p: StageProblem -> bool, xs: seq<StageProblem>)
  requires |ProofLib.Filter(p, xs)| == 0
  requires forall x :: x in xs ==> p(x)
  ensures xs == []
{
  if |xs| > 0 {
    ProofLib.FilterMember(p, xs, xs[0]);
  }
}

lemma StageProblemsParts(s: Stage)
  requires stageAdmitted(s)
  ensures reviewProblems(s) == []
  ensures ProofLib.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s)) == []
  ensures ProofLib.Filter((set_x: StageProblem) => !((set_x in (reviewProblems(s) + Std.Collections.Seq.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))))), listenerProblems(s)) == []
{
}

lemma StageProblemsEmpty(s: Stage)
  requires stageAdmitted(s)
  ensures reviewProblems(s) == []
  ensures ownerTelephonyProblems(s) == []
  ensures listenerProblems(s) == []
{
  StageProblemsParts(s);
  FilterAllEmpty((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s));
  reveal Std.Collections.Seq.Filter();
  FilterAllEmpty((set_x: StageProblem) => !((set_x in (reviewProblems(s) + Std.Collections.Seq.Filter((set_x: StageProblem) => !((set_x in reviewProblems(s))), ownerTelephonyProblems(s))))), listenerProblems(s));
}

lemma ReviewProblemsParts(s: Stage)
  requires reviewProblems(s) == []
  ensures problemIf((reviewedStage(s) && !(s.descriptorReviewed)), StageProblem.NoReviewedDescriptor) == []
  ensures ProofLib.Filter((set_x: StageProblem) => !((set_x in problemIf((reviewedStage(s) && !(s.descriptorReviewed)), StageProblem.NoReviewedDescriptor))), problemIf((reviewedStage(s) && !(s.productComplete)), StageProblem.ProductIncomplete)) == []
{
}

lemma ReviewProblemsEmpty(s: Stage)
  requires reviewProblems(s) == []
  requires reviewedStage(s)
  ensures s.descriptorReviewed && s.productComplete
{
  ReviewProblemsParts(s);
  FilterAllEmpty((set_x: StageProblem) => !((set_x in problemIf((reviewedStage(s) && !(s.descriptorReviewed)), StageProblem.NoReviewedDescriptor))), problemIf((reviewedStage(s) && !(s.productComplete)), StageProblem.ProductIncomplete));
}

lemma OwnerTelephonyProblemsEmpty(s: Stage)
  requires ownerTelephonyProblems(s) == []
  requires s.mode.Production?
  ensures !(s.ownerTelephony)
{
  assert problemIf((s.ownerTelephony && (!s.mode.Development?)), StageProblem.OwnerTelephonyOutsideDevelopment) == [];
}

lemma ListenerProblemsParts(s: Stage)
  requires listenerProblems(s) == []
  ensures problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel) == []
  ensures ProofLib.Filter((set_x: StageProblem) => !((set_x in problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel))), problemIf((listenerImage(s) && !((((s.listener && s.qualified) && s.speechPinned) && carriesListenerPatches(s)))), StageProblem.ListenerImageIncomplete)) == []
{
}

lemma ListenerProblemsEmpty(s: Stage)
  requires listenerProblems(s) == []
  requires listenerImage(s)
  ensures s.target.Pixel10a? && s.qualified && s.speechPinned && carriesListenerPatches(s)
{
  ListenerProblemsParts(s);
  FilterAllEmpty((set_x: StageProblem) => !((set_x in problemIf((listenerImage(s) && (!s.target.Pixel10a?)), StageProblem.ListenerImageOffThePixel))), problemIf((listenerImage(s) && !((((s.listener && s.qualified) && s.speechPinned) && carriesListenerPatches(s)))), StageProblem.ListenerImageIncomplete));
}
