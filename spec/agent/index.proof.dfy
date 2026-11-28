// spec/agent/index.md, "Only Android's native control executor can post UI observations, poll queued operations, submit receipts, or fire native interrupts"
lemma NotInPageRoutes(r: Route)
  requires r !in pageCoreRoutes
  requires r !in pageCalendarClockRoutes
  requires r !in pageReminderNotesRoutes
  requires r !in pageWorkflowRoutes
  requires r !in pageTaskWalletRoutes
  ensures r !in pageRoutes
{
}

lemma lawControlNativeRoutesAreAbsentFromThePage_ensures(controlRoute: Route)
  ensures (lawControlNativeRoutesAreAbsentFromThePage(controlRoute) == true)
{
  if controlRoute in nativeControlRoutes {
    if controlRoute == nativeControlRoutes[0] {
      NotInPageRoutes(controlRoute);
    } else if controlRoute == nativeControlRoutes[1] {
      NotInPageRoutes(controlRoute);
    } else if controlRoute == nativeControlRoutes[2] {
      NotInPageRoutes(controlRoute);
    } else {
      assert controlRoute == nativeControlRoutes[3];
      NotInPageRoutes(controlRoute);
    }
  }
}

lemma NotOtherCleanup(xs: seq<Route>, m: Method)
  requires m != Method.Post
  requires forall i :: 0 <= i < |xs| ==> xs[i] != Route(m, browserNotesCleanup, false)
  ensures Route(m, browserNotesCleanup, false) !in xs
{
}

lemma lawBrowserNotesCleanupIsOnThePage_ensures(method_: Method)
  ensures (lawBrowserNotesCleanupIsOnThePage(method_) == true)
{
  var r := Route(method_, browserNotesCleanup, false);
  if method_ == Method.Post {
    assert r in pageReminderNotesRoutes;
    assert r in pageRoutes;
  } else {
    NotOtherCleanup(pageCoreRoutes, method_);
    NotOtherCleanup(pageCalendarClockRoutes, method_);
    NotOtherCleanup(pageReminderNotesRoutes, method_);
    NotOtherCleanup(pageWorkflowRoutes, method_);
    NotOtherCleanup(pageTaskWalletRoutes, method_);
  }
}
