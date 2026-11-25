lemma openView_ensures(s: Shell, view: View)
  ensures (inv(s) ==> canOpenView(s, view) ==> alwaysHomeDrawsAskAlpha(openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> alwaysTrailIsBounded(openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> alwaysTrailIsAdmitted(openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepAgentNavigationKeepsAssistant(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepBackClosesOneLayer(s, "openView", openView(s, view)))
  ensures (inv(s) ==> canOpenView(s, view) ==> stepHomeIsBare(s, "openView", openView(s, view)))
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
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepAgentNavigationKeepsAssistant(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepBackClosesOneLayer(s, "agentOpenView", agentOpenView(s, view)))
  ensures (inv(s) ==> canAgentOpenView(s, view) ==> stepHomeIsBare(s, "agentOpenView", agentOpenView(s, view)))
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

lemma goBack_ensures(s: Shell)
  ensures (inv(s) ==> canGoBack(s) ==> alwaysHomeDrawsAskAlpha(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysTrailIsBounded(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysTrailIsAdmitted(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepAgentNavigationKeepsAssistant(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepBackClosesOneLayer(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepHomeIsBare(s, "goBack", goBack(s)))
{
  if inv(s) && canGoBack(s) {
    var after := goBack(s);
    forall v | v in after.trail ensures available(after, v) {
      assert v in s.trail;
      assert available(after, v) == available(s, v);
    }
  }
}
