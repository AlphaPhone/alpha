lemma downloaded_ensures(s: Install, ticket: int, bytes: int, digest: int)
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysTheTargetIsAboveTheBaseline(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysOnlyACheckedFileIsStaged(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysEveryOpenPageIsAsked(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysARefusalFails(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysPausedUntilSettled(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysStoppedOnlyWhilePaused(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysAnAutomaticCommitWasRechecked(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysACommitWaitsForAStoppedAgent(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysNothingCommittedEarly(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysAKeptConfirmationIsPending(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> alwaysProgressIsAFraction(downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepAKeptFileIsRehashed(s, "downloaded", downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepAMismatchIsEvicted(s, "downloaded", downloaded(s, ticket, bytes, digest).state, downloaded(s, ticket, bytes, digest).out))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepNoInstallBeginsWhilePaused(s, "downloaded", downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepTheSessionIsBound(s, downloaded(s, ticket, bytes, digest).state, downloaded(s, ticket, bytes, digest).out))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepSealedOnlyWhenEveryPageIsReady(s, "downloaded", downloaded(s, ticket, bytes, digest).state))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepTheAgentResumesOnlyWhenReleased(s, downloaded(s, ticket, bytes, digest).state, downloaded(s, ticket, bytes, digest).out))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepACommitIsSentOnce(s, downloaded(s, ticket, bytes, digest).state, downloaded(s, ticket, bytes, digest).out))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepTheConfirmationOpensOnlyWhenAllowed(s, downloaded(s, ticket, bytes, digest).state, downloaded(s, ticket, bytes, digest).out))
  ensures (inv(s) ==> canDownloaded(s, ticket) ==> stepPagesReconnectOnlyAfterACancel(s, downloaded(s, ticket, bytes, digest).state, downloaded(s, ticket, bytes, digest).out))
{
  if inv(s) && canDownloaded(s, ticket) {
    var after := downloaded(s, ticket, bytes, digest);
    if !(bytes == s.target.bytes && digest == s.target.digest) {
      assert after.out[0].Evict?;
      assert after.out[0] in after.out;
    }
  }
}

lemma openPage_ensures(s: Install, page: int)
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysTheTargetIsAboveTheBaseline(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysOnlyACheckedFileIsStaged(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysEveryOpenPageIsAsked(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysARefusalFails(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysPausedUntilSettled(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysStoppedOnlyWhilePaused(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysAnAutomaticCommitWasRechecked(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysACommitWaitsForAStoppedAgent(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysNothingCommittedEarly(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysAKeptConfirmationIsPending(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> alwaysProgressIsAFraction(openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepAKeptFileIsRehashed(s, "openPage", openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepAMismatchIsEvicted(s, "openPage", openPage(s, page).state, openPage(s, page).out))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepNoInstallBeginsWhilePaused(s, "openPage", openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepTheSessionIsBound(s, openPage(s, page).state, openPage(s, page).out))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepSealedOnlyWhenEveryPageIsReady(s, "openPage", openPage(s, page).state))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepTheAgentResumesOnlyWhenReleased(s, openPage(s, page).state, openPage(s, page).out))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepACommitIsSentOnce(s, openPage(s, page).state, openPage(s, page).out))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepTheConfirmationOpensOnlyWhenAllowed(s, openPage(s, page).state, openPage(s, page).out))
  ensures (inv(s) ==> canOpenPage(s, page) ==> stepPagesReconnectOnlyAfterACancel(s, openPage(s, page).state, openPage(s, page).out))
{
  if inv(s) && canOpenPage(s, page) {
    var after := openPage(s, page).state;
    OpenPageFilter(s, page);
    AskedFilter(s);
    AskedFilter(after);
    forall x | x in after.pages && after.phase.Activating?
      ensures x in (after.waiting + ProofLib.Filter((set_x: int) => !((set_x in after.waiting)), after.ready))
    {
      UnionHas(s.pages, [page], x);
      UnionHas(s.waiting, [page], x);
      UnionHas(s.waiting, s.ready, x);
      UnionHas(after.waiting, after.ready, x);
    }
    forall x | x in after.waiting ensures x in after.pages {
      UnionHas(s.pages, [page], x);
      UnionHas(s.waiting, [page], x);
    }
    forall x | x in after.ready ensures x in after.pages {
      UnionHas(s.pages, [page], x);
    }
  }
}

lemma closePage_ensures(s: Install, page: int)
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysTheTargetIsAboveTheBaseline(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysOnlyACheckedFileIsStaged(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysEveryOpenPageIsAsked(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysARefusalFails(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysPausedUntilSettled(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysStoppedOnlyWhilePaused(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysAnAutomaticCommitWasRechecked(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysACommitWaitsForAStoppedAgent(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysNothingCommittedEarly(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysAKeptConfirmationIsPending(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> alwaysProgressIsAFraction(closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepAKeptFileIsRehashed(s, "closePage", closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepAMismatchIsEvicted(s, "closePage", closePage(s, page), []))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepNoInstallBeginsWhilePaused(s, "closePage", closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepTheSessionIsBound(s, closePage(s, page), []))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepSealedOnlyWhenEveryPageIsReady(s, "closePage", closePage(s, page)))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepTheAgentResumesOnlyWhenReleased(s, closePage(s, page), []))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepACommitIsSentOnce(s, closePage(s, page), []))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepTheConfirmationOpensOnlyWhenAllowed(s, closePage(s, page), []))
  ensures (inv(s) ==> canClosePage(s, page) ==> stepPagesReconnectOnlyAfterACancel(s, closePage(s, page), []))
{
  if inv(s) && canClosePage(s, page) {
    var after := closePage(s, page);
    ClosePageFilter(s, page);
    AskedFilter(s);
    AskedFilter(after);
    forall x | x in after.waiting ensures x in after.pages {
      ExcludeHas(s.pages, page, x);
      ExcludeHas(s.waiting, page, x);
    }
    forall x | x in after.ready ensures x in after.pages {
      ExcludeHas(s.pages, page, x);
      ExcludeHas(s.ready, page, x);
    }
  }
}

lemma answer_ensures(s: Install, page: int, activation: int, ready: bool)
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysTheTargetIsAboveTheBaseline(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysOnlyACheckedFileIsStaged(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysEveryOpenPageIsAsked(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysARefusalFails(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysPausedUntilSettled(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysStoppedOnlyWhilePaused(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysAnAutomaticCommitWasRechecked(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysACommitWaitsForAStoppedAgent(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysNothingCommittedEarly(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysAKeptConfirmationIsPending(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> alwaysProgressIsAFraction(answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepAKeptFileIsRehashed(s, "answer", answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepAMismatchIsEvicted(s, "answer", answer(s, page, activation, ready), []))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepNoInstallBeginsWhilePaused(s, "answer", answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepTheSessionIsBound(s, answer(s, page, activation, ready), []))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepSealedOnlyWhenEveryPageIsReady(s, "answer", answer(s, page, activation, ready)))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepTheAgentResumesOnlyWhenReleased(s, answer(s, page, activation, ready), []))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepACommitIsSentOnce(s, answer(s, page, activation, ready), []))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepTheConfirmationOpensOnlyWhenAllowed(s, answer(s, page, activation, ready), []))
  ensures (inv(s) ==> canAnswer(s, page, activation) ==> stepPagesReconnectOnlyAfterACancel(s, answer(s, page, activation, ready), []))
{
  if inv(s) && canAnswer(s, page, activation) {
    var after := answer(s, page, activation, ready);
    AnswerFilter(s, page, activation, ready);
    AskedFilter(s);
    AskedFilter(after);
    if ready {
      forall x | x in after.pages
        ensures x in (after.waiting + ProofLib.Filter((set_x: int) => !((set_x in after.waiting)), after.ready))
      {
        UnionHas(s.waiting, s.ready, x);
        ExcludeHas(s.waiting, page, x);
        UnionHas(s.ready, [page], x);
        UnionHas(after.waiting, after.ready, x);
      }
      forall x | x in after.waiting ensures x in after.pages {
        ExcludeHas(s.waiting, page, x);
      }
      forall x | x in after.ready ensures x in after.pages {
        UnionHas(s.ready, [page], x);
      }
    }
  }
}

lemma seal_ensures(s: Install)
  ensures (inv(s) ==> canSeal(s) ==> alwaysTheTargetIsAboveTheBaseline(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysOnlyACheckedFileIsStaged(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysEveryOpenPageIsAsked(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysARefusalFails(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysPausedUntilSettled(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysStoppedOnlyWhilePaused(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysAnAutomaticCommitWasRechecked(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysACommitWaitsForAStoppedAgent(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysNothingCommittedEarly(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysAKeptConfirmationIsPending(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> alwaysProgressIsAFraction(seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> stepAKeptFileIsRehashed(s, "seal", seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> stepAMismatchIsEvicted(s, "seal", seal(s).state, seal(s).out))
  ensures (inv(s) ==> canSeal(s) ==> stepNoInstallBeginsWhilePaused(s, "seal", seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> stepTheSessionIsBound(s, seal(s).state, seal(s).out))
  ensures (inv(s) ==> canSeal(s) ==> stepSealedOnlyWhenEveryPageIsReady(s, "seal", seal(s).state))
  ensures (inv(s) ==> canSeal(s) ==> stepTheAgentResumesOnlyWhenReleased(s, seal(s).state, seal(s).out))
  ensures (inv(s) ==> canSeal(s) ==> stepACommitIsSentOnce(s, seal(s).state, seal(s).out))
  ensures (inv(s) ==> canSeal(s) ==> stepTheConfirmationOpensOnlyWhenAllowed(s, seal(s).state, seal(s).out))
  ensures (inv(s) ==> canSeal(s) ==> stepPagesReconnectOnlyAfterACancel(s, seal(s).state, seal(s).out))
{
  if inv(s) && canSeal(s) {
    assert s.waiting == [];
    AskedFilter(s);
    forall x | x in s.pages ensures x in s.ready {
      UnionHas(s.waiting, s.ready, x);
    }
  }
}

lemma UnionHas(a: seq<int>, b: seq<int>, x: int)
  ensures x in (a + ProofLib.Filter((set_x: int) => !((set_x in a)), b)) <==> (x in a || x in b)
{
  ProofLib.FilterMember((set_x: int) => !((set_x in a)), b, x);
}

lemma ExcludeHas(a: seq<int>, p: int, x: int)
  ensures x in ProofLib.Filter((set_x: int) => !((set_x in [p])), a) <==> (x in a && x != p)
{
  ProofLib.FilterMember((set_x: int) => !((set_x in [p])), a, x);
}

lemma AskedFilter(s: Install)
  ensures alwaysEveryOpenPageIsAsked(s) == (((!(s.phase.Activating?) || !((exists set_x :: set_x in s.pages && !((set_x in (s.waiting + ProofLib.Filter((set_x: int) => !((set_x in s.waiting)), s.ready))))))) && !((exists set_x :: set_x in s.waiting && !((set_x in s.pages))))) && !((exists set_x :: set_x in s.ready && !((set_x in s.pages)))))
{
}

lemma OpenPageFilter(s: Install, page: int)
  ensures openPage(s, page).state.pages == s.pages + ProofLib.Filter((set_x: int) => !((set_x in s.pages)), [page])
  ensures s.phase.Activating? ==> openPage(s, page).state.waiting == s.waiting + ProofLib.Filter((set_x: int) => !((set_x in s.waiting)), [page])
  ensures !(s.phase.Activating?) ==> openPage(s, page).state.waiting == s.waiting
  ensures openPage(s, page).state.ready == s.ready
  ensures openPage(s, page).state.phase == s.phase
{
}

lemma ClosePageFilter(s: Install, page: int)
  ensures !(s.phase.Activating?) ==> closePage(s, page).pages == ProofLib.Filter((set_x: int) => !((set_x in [page])), s.pages)
  ensures !(s.phase.Activating?) ==> closePage(s, page).waiting == ProofLib.Filter((set_x: int) => !((set_x in [page])), s.waiting)
  ensures !(s.phase.Activating?) ==> closePage(s, page).ready == ProofLib.Filter((set_x: int) => !((set_x in [page])), s.ready)
  ensures s.phase.Activating? ==> closePage(s, page).pages == ProofLib.Filter((set_x: int) => !((set_x in [page])), s.pages)
  ensures s.phase.Activating? ==> closePage(s, page).waiting == [] && closePage(s, page).ready == []
{
}

lemma AnswerFilter(s: Install, page: int, activation: int, ready: bool)
  ensures ready ==> answer(s, page, activation, ready).waiting == ProofLib.Filter((set_x: int) => !((set_x in [page])), s.waiting)
  ensures ready ==> answer(s, page, activation, ready).ready == s.ready + ProofLib.Filter((set_x: int) => !((set_x in s.ready)), [page])
  ensures ready ==> answer(s, page, activation, ready).pages == s.pages
  ensures ready ==> answer(s, page, activation, ready).phase == s.phase
{
}
