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
