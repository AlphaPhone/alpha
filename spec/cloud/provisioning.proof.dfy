lemma lawEachStepFindsWhatItNeeds_ensures(task: Step)
  ensures (lawEachStepFindsWhatItNeeds(task) == true)
{
  SuppliedBeforeUnfolds(task);
  ProofLib.FilterMember((set_x: Need) => !((set_x in supplies(Step.Secrets))), supplies(Step.Provision), Need.BlobStore);
  forall x | x in needs(task) ensures x in suppliedBefore(task) {
    if order(task) > order(Step.Provision) {
      assert x in supplies(Step.Secrets) || x == Need.BlobStore;
    }
  }
}

lemma SuppliedBeforeUnfolds(task: Step)
  ensures suppliedBefore(task) == (if (order(task) > order(Step.Provision)) then (supplies(Step.Secrets) + ProofLib.Filter((set_x: Need) => !((set_x in supplies(Step.Secrets))), supplies(Step.Provision))) else if (order(task) > order(Step.Secrets)) then supplies(Step.Secrets) else [])
{
}
