lemma openView_ensures(s: Shell, view: View)
  ensures (inv(s) ==> canOpenView(s, view) ==> alwaysHomeDrawsAskAlpha(openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> alwaysTrailIsBounded(openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> alwaysTrailIsAdmitted(openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> alwaysTextAskIsFull(openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepRouteHasItsOwnNumber(s, openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepACommsReturnPreservesTheSheet(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepACommsOpeningPreservesTheSheet(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepAgentNavigationKeepsAssistant(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepAgentNavigationLeavesItsViewInSight(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepAPageInsideAViewKeepsASheet(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepAnAgentsPageLowersAskAlpha(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepSpokenRouteMarksTheWriter(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepBackClosesOneLayer(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepHomeIsBare(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "openView", openView(s, view)))
{
  if inv(s) && canOpenView(s, view) {
    var after := openView(s, view);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail + [view];
      assert v in s.trail || v == view;
      assert available(after, v) == available(s, v);
    }
  }
}

lemma agentOpenView_ensures(s: Shell, view: View)
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> alwaysHomeDrawsAskAlpha(agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> alwaysTrailIsBounded(agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> alwaysTrailIsAdmitted(agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> alwaysTextAskIsFull(agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepRouteHasItsOwnNumber(s, agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepACommsReturnPreservesTheSheet(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepACommsOpeningPreservesTheSheet(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepAgentNavigationKeepsAssistant(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepAgentNavigationLeavesItsViewInSight(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepAPageInsideAViewKeepsASheet(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepAnAgentsPageLowersAskAlpha(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepSpokenRouteMarksTheWriter(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepBackClosesOneLayer(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepHomeIsBare(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "agentOpenView", agentOpenView(s, view)))
{
  if inv(s) && canAgentOpenView(s, view) {
    var after := agentOpenView(s, view);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail + [view];
      assert v in s.trail || v == view;
      assert available(after, v) == available(s, v);
    }
  }
}

lemma agentShowView_ensures(s: Shell, view: View)
  ensures (inv(s) ==> canAgentShowView(s, view) ==> alwaysHomeDrawsAskAlpha(agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> alwaysTrailIsBounded(agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> alwaysTrailIsAdmitted(agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> alwaysTextAskIsFull(agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepRouteHasItsOwnNumber(s, agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepACommsReturnPreservesTheSheet(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepACommsOpeningPreservesTheSheet(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepAgentNavigationKeepsAssistant(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepAgentNavigationLeavesItsViewInSight(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepAPageInsideAViewKeepsASheet(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepAnAgentsPageLowersAskAlpha(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepSpokenRouteMarksTheWriter(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepBackClosesOneLayer(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepHomeIsBare(s, "agentShowView", agentShowView(s, view)))
  ensures (inv(s) ==> canAgentShowView(s, view) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "agentShowView", agentShowView(s, view)))
{
  if inv(s) && canAgentShowView(s, view) {
    var after := agentShowView(s, view);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail + [view];
      assert v in s.trail || v == view;
      assert available(after, v) == available(s, v);
    }
    if !showing(s, view) {
      assert after.trail[|after.trail| - 1] == view;
      assert after.trail != s.trail;
    }
  }
}

lemma agentOpenSpoken_ensures(s: Shell, view: View, route: int)
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> alwaysHomeDrawsAskAlpha(agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> alwaysTrailIsBounded(agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> alwaysTrailIsAdmitted(agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> alwaysTextAskIsFull(agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepRouteHasItsOwnNumber(s, agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepACommsReturnPreservesTheSheet(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepACommsOpeningPreservesTheSheet(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepAgentNavigationKeepsAssistant(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepAgentNavigationLeavesItsViewInSight(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepAPageInsideAViewKeepsASheet(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepAnAgentsPageLowersAskAlpha(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepSpokenRouteMarksTheWriter(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepBackClosesOneLayer(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepHomeIsBare(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentOpenSpoken(s, view, route) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "agentOpenSpoken", agentOpenSpoken(s, view, route)))
{
  agentOpenView_ensures(s, view);
}

lemma agentShowSpoken_ensures(s: Shell, view: View, route: int)
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> alwaysHomeDrawsAskAlpha(agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> alwaysTrailIsBounded(agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> alwaysTrailIsAdmitted(agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> alwaysTextAskIsFull(agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepRouteHasItsOwnNumber(s, agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepACommsReturnPreservesTheSheet(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepACommsOpeningPreservesTheSheet(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepAgentNavigationKeepsAssistant(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepAgentNavigationLeavesItsViewInSight(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepAPageInsideAViewKeepsASheet(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepAnAgentsPageLowersAskAlpha(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepSpokenRouteMarksTheWriter(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepBackClosesOneLayer(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepHomeIsBare(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowSpoken(s, view, route) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "agentShowSpoken", agentShowSpoken(s, view, route)))
{
  agentShowView_ensures(s, view);
}

lemma goBack_ensures(s: Shell)
  ensures (inv(s) ==> canGoBack(s) ==> alwaysHomeDrawsAskAlpha(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysTrailIsBounded(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysTrailIsAdmitted(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysTextAskIsFull(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepRouteHasItsOwnNumber(s, goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepACommsReturnPreservesTheSheet(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepACommsOpeningPreservesTheSheet(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepAgentNavigationKeepsAssistant(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepAgentNavigationLeavesItsViewInSight(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepAPageInsideAViewKeepsASheet(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepAnAgentsPageLowersAskAlpha(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepSpokenRouteMarksTheWriter(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepBackClosesOneLayer(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepHomeIsBare(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "goBack", goBack(s)))
{
  if inv(s) && canGoBack(s) {
    var after := goBack(s);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail;
      assert available(after, v) == available(s, v);
    }
  }
}

lemma returnCommsView_ensures(s: Shell, previous: View)
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> alwaysHomeDrawsAskAlpha(returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> alwaysTrailIsBounded(returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> alwaysTrailIsAdmitted(returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> alwaysTextAskIsFull(returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepRouteHasItsOwnNumber(s, returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepACommsReturnPreservesTheSheet(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepACommsOpeningPreservesTheSheet(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepAgentNavigationKeepsAssistant(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepAgentNavigationLeavesItsViewInSight(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepAPageInsideAViewKeepsASheet(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepAnAgentsPageLowersAskAlpha(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepSpokenRouteMarksTheWriter(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepBackClosesOneLayer(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepHomeIsBare(s, "returnCommsView", returnCommsView(s, previous)))
  ensures (inv(s) ==> canReturnCommsView(s, previous) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "returnCommsView", returnCommsView(s, previous)))
{
  if inv(s) && canReturnCommsView(s, previous) {
    var after := returnCommsView(s, previous);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail;
      assert available(after, v) == available(s, v);
    }
  }
}

lemma openCommsView_ensures(s: Shell, view: View)
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> alwaysHomeDrawsAskAlpha(openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> alwaysTrailIsBounded(openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> alwaysTrailIsAdmitted(openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> alwaysTextAskIsFull(openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepRouteHasItsOwnNumber(s, openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepACommsReturnPreservesTheSheet(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepACommsOpeningPreservesTheSheet(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepAgentNavigationKeepsAssistant(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepAgentNavigationLeavesItsViewInSight(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepAPageInsideAViewKeepsASheet(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepAnAgentsPageLowersAskAlpha(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepSpokenRouteMarksTheWriter(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepBackClosesOneLayer(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepHomeIsBare(s, "openCommsView", openCommsView(s, view)))
  ensures (inv(s) ==> canOpenCommsView(s, view) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "openCommsView", openCommsView(s, view)))
{
  if inv(s) && canOpenCommsView(s, view) {
    var after := openCommsView(s, view);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail + [view];
      assert v in s.trail || v == view;
      assert available(after, v) == available(s, v);
    }
  }
}

lemma agentOpenFilesFrom_ensures(s: Shell, source: seq<View>, panel: Detent, route: int, spoken: bool)
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> alwaysHomeDrawsAskAlpha(agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> alwaysTrailIsBounded(agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> alwaysTrailIsAdmitted(agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> alwaysTextAskIsFull(agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepRouteHasItsOwnNumber(s, agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepACommsReturnPreservesTheSheet(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepACommsOpeningPreservesTheSheet(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepAgentNavigationKeepsAssistant(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepAgentNavigationLeavesItsViewInSight(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepAPageInsideAViewKeepsASheet(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepAnAgentsPageLowersAskAlpha(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepSpokenRouteMarksTheWriter(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepBackClosesOneLayer(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepHomeIsBare(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
  ensures (inv(s) ==> canAgentOpenFilesFrom(s, source, panel, route, spoken) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "agentOpenFilesFrom", agentOpenFilesFrom(s, source, panel, route, spoken)))
{
  if inv(s) && canAgentOpenFilesFrom(s, source, panel, route, spoken) {
    agentOpenView_ensures(s, View.Files);
  }
}

lemma agentShowInside_ensures(s: Shell, view: View)
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> alwaysHomeDrawsAskAlpha(agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> alwaysTrailIsBounded(agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> alwaysTrailIsAdmitted(agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> alwaysTextAskIsFull(agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepRouteHasItsOwnNumber(s, agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepACommsReturnPreservesTheSheet(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepACommsOpeningPreservesTheSheet(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepAgentNavigationKeepsAssistant(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepAgentNavigationLeavesItsViewInSight(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepAPageInsideAViewKeepsASheet(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepAnAgentsPageLowersAskAlpha(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepSpokenRouteMarksTheWriter(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepBackClosesOneLayer(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepHomeIsBare(s, "agentShowInside", agentShowInside(s, view)))
  ensures (inv(s) ==> canAgentShowInside(s, view) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "agentShowInside", agentShowInside(s, view)))
{
  if inv(s) && canAgentShowInside(s, view) {
    var after := agentShowInside(s, view);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail + [view];
      assert v in s.trail || v == view;
      assert available(after, v) == available(s, v);
    }
  }
}

lemma agentShowInsideSpoken_ensures(s: Shell, view: View, route: int)
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> alwaysHomeDrawsAskAlpha(agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> alwaysTrailIsBounded(agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> alwaysTrailIsAdmitted(agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> alwaysTextAskIsFull(agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepRouteHasItsOwnNumber(s, agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepACommsReturnPreservesTheSheet(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepACommsOpeningPreservesTheSheet(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepAgentNavigationKeepsAssistant(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepAgentNavigationLeavesItsViewInSight(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepAPageInsideAViewKeepsASheet(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepAnAgentsPageLowersAskAlpha(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepSpokenRouteMarksTheWriter(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepBackClosesOneLayer(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepHomeIsBare(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
  ensures (inv(s) ==> canAgentShowInsideSpoken(s, view, route) ==> stepClosedTextAskKeepsTheAdmittedTicket(s, "agentShowInsideSpoken", agentShowInsideSpoken(s, view, route)))
{
  agentShowInside_ensures(s, view);
}
