lemma InspectPreserves(mid: Calendar, target: int, res: Viewed)
  requires target == shownInspection(mid) && res == inspectFor(target, mid)
  ensures alwaysOnlyRowsShownAreLimited(mid) ==> alwaysOnlyRowsShownAreLimited(res.state)
  ensures alwaysRowsAreForTheAnchoredDay(mid) ==> alwaysRowsAreForTheAnchoredDay(res.state)
  ensures alwaysAReadableSourceWasAskedForTheAnchoredDay(mid) ==> alwaysAReadableSourceWasAskedForTheAnchoredDay(res.state)
  ensures alwaysCountsAreNotNegative(mid) ==> alwaysCountsAreNotNegative(res.state)
  ensures alwaysTheAgendaStartsToday(mid) ==> alwaysTheAgendaStartsToday(res.state)
  ensures alwaysColumnsOnlyOnAWideScreen(mid) ==> alwaysColumnsOnlyOnAWideScreen(res.state)
  ensures alwaysNoOverlayOverAnOpenEvent(mid) ==> alwaysNoOverlayOverAnOpenEvent(res.state)
  ensures alwaysNoOverlayUnderAFormOrAReview(mid) ==> alwaysNoOverlayUnderAFormOrAReview(res.state)
  ensures alwaysRemindersAreForTheAnchoredDay(mid) ==> alwaysRemindersAreForTheAnchoredDay(res.state)
  ensures alwaysAnOpenReminderShowsAlone(mid) ==> alwaysAnOpenReminderShowsAlone(res.state)
  ensures alwaysAnInspectionAwaitedIsForWhatShows(res.state)
  ensures alwaysBackClosesWhatIsOnTop(mid) ==> alwaysBackClosesWhatIsOnTop(res.state)
  ensures alwaysAnOpenEventHasOneSource(mid) ==> alwaysAnOpenEventHasOneSource(res.state)
  ensures alwaysAnEventAwayIsOpen(mid) ==> alwaysAnEventAwayIsOpen(res.state)
  ensures alwaysGoogleIsTheOwners(mid) ==> alwaysGoogleIsTheOwners(res.state)
  ensures alwaysAnOverlayIsInFront(mid) ==> alwaysAnOverlayIsInFront(res.state)
  ensures alwaysAWaitingReadWaitsOnAWrite(mid) ==> alwaysAWaitingReadWaitsOnAWrite(res.state)
  ensures alwaysTheSelectionIsWhatShows(res.state)
  ensures forall e :: e in res.out ==> !e.ReadDay?
  ensures res.state.today == mid.today
  ensures res.state.detail == mid.detail
{
  if target < 0 {
    assert res == Viewed(mid.(inspection := retiredInspection(mid.inspection)), []);
  } else {
    var next := kit__read_ask(mid.inspection);
    assert res == Viewed(mid.(inspection := next), [Inspect(next.ticket, target)]);
  }
}

lemma formChanged_ensures(s: Calendar, form: FormShown)
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysOnlyRowsShownAreLimited(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysRowsAreForTheAnchoredDay(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysAReadableSourceWasAskedForTheAnchoredDay(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysCountsAreNotNegative(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysTheAgendaStartsToday(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysColumnsOnlyOnAWideScreen(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysNoOverlayOverAnOpenEvent(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysNoOverlayUnderAFormOrAReview(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysRemindersAreForTheAnchoredDay(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysAnOpenReminderShowsAlone(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysAnInspectionAwaitedIsForWhatShows(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysBackClosesWhatIsOnTop(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysAnOpenEventHasOneSource(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysAnEventAwayIsOpen(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysGoogleIsTheOwners(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysAnOverlayIsInFront(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysAWaitingReadWaitsOnAWrite(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> alwaysTheSelectionIsWhatShows(formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> stepReadsOnlyWhatItMay(s, formChanged(s, form).state, formChanged(s, form).out))
  ensures (inv(s) ==> canFormChanged(s, form) ==> stepTodayNeverGoesBack(s, formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> stepAColumnPickKeepsTheSelectedDay(s, "formChanged", formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> stepAnEventComesBackOnlyWhenFound(s, "formChanged", formChanged(s, form).state))
  ensures (inv(s) ==> canFormChanged(s, form) ==> stepARereadWaitsForTheWrite(s, "formChanged", formChanged(s, form).state, formChanged(s, form).out))
{
  if inv(s) && canFormChanged(s, form) {
    var mid := s.(form := form, overlay := (if (!form.NoFormShown?) then Overlay.NoOverlay else s.overlay));
    var res := formChanged(s, form);
    InspectPreserves(mid, shownInspection(mid), res);
  }
}

lemma eventFound_ensures(s: Calendar, ticket: int, exact: bool)
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysOnlyRowsShownAreLimited(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysRowsAreForTheAnchoredDay(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysAReadableSourceWasAskedForTheAnchoredDay(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysCountsAreNotNegative(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysTheAgendaStartsToday(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysColumnsOnlyOnAWideScreen(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysNoOverlayOverAnOpenEvent(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysNoOverlayUnderAFormOrAReview(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysRemindersAreForTheAnchoredDay(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysAnOpenReminderShowsAlone(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysAnInspectionAwaitedIsForWhatShows(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysBackClosesWhatIsOnTop(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysAnOpenEventHasOneSource(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysAnEventAwayIsOpen(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysGoogleIsTheOwners(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysAnOverlayIsInFront(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysAWaitingReadWaitsOnAWrite(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> alwaysTheSelectionIsWhatShows(eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> stepReadsOnlyWhatItMay(s, eventFound(s, ticket, exact).state, eventFound(s, ticket, exact).out))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> stepTodayNeverGoesBack(s, eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> stepAColumnPickKeepsTheSelectedDay(s, "eventFound", eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> stepAnEventComesBackOnlyWhenFound(s, "eventFound", eventFound(s, ticket, exact).state))
  ensures (inv(s) ==> canEventFound(s, ticket, exact) ==> stepARereadWaitsForTheWrite(s, "eventFound", eventFound(s, ticket, exact).state, eventFound(s, ticket, exact).out))
{
  if inv(s) && canEventFound(s, ticket, exact) {
    var mid := s.(detail := Detail.Showing, event := kit__read_answer(s.event, true));
    var res := eventFound(s, ticket, exact);
    InspectPreserves(mid, shownInspection(mid), res);
  }
}
