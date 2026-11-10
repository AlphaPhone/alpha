// Day offsets counted from today, across local midnight: loaded rows are read again by a
// midnight timer or on resume, and retained forms are re-anchored so their civil date holds.
module DayAnchor {
  type State = {
    today: int, mounted: bool,
    // refreshDue: the date changed and the midnight timer (or a resume) has not yet run.
    refreshDue: bool,
    // Device and reminder rows carry offsets computed on rowReadDay; rowDay is an event's civil day.
    rowsShown: bool, rowReadDay: int, rowDay: int,
    // form: "none" | "creation" (retained new-event form) | "edit" (retained edit of a device,
    // reminder or Google event) | "plain" (a form with no retained identity, such as a new
    // reminder or an edit of an unsent Google create).
    form: str, formOff: int, formAnchor: int, formIntended: int,
    saved: bool, savedRetained: bool, savedWhileDue: bool, savedDay: int, savedIntended: int
  }
  var s: State
  action init = s' = { today: 0, mounted: true, refreshDue: false,
    rowsShown: true, rowReadDay: 0, rowDay: 1,
    form: "none", formOff: 0, formAnchor: 0, formIntended: 0,
    saved: false, savedRetained: false, savedWhileDue: false, savedDay: 0, savedIntended: 0 }
  val RowOff = s.rowDay - s.rowReadDay
  val Retained = s.form.in(Set("creation", "edit"))
  // The draft adapters shift a retained form's offset by the days since its anchor.
  pure def anchored(state: State): State =
    if (state.form.in(Set("creation", "edit")) and state.formAnchor != state.today)
      { ...state, formOff: state.formOff + state.formAnchor - state.today, formAnchor: state.today }
    else state

  action openForm(kind: str, off: int): bool = all {
    s.mounted, kind.in(Set("creation", "edit", "plain")), off.in(0.to(1)),
    s' = { ...s, form: kind, formOff: off, formAnchor: s.today, formIntended: s.today + off }
  }
  action closeForm = all { s.form != "none", s' = { ...s, form: "none" } }
  // Local midnight passes. While mounted, a timer set for it is now due.
  action midnight = all {
    s.today < 2, s' = { ...s, today: s.today + 1, refreshDue: s.mounted }
  }
  // The timer (or the app resuming) reads the rows again; that publication also re-renders, which
  // re-anchors a retained form. A failed device read hides its rows instead of showing old offsets.
  action refresh(ok: bool): bool = all {
    s.mounted,
    s' = anchored({ ...s, refreshDue: false, rowsShown: ok,
      rowReadDay: if (ok) s.today else s.rowReadDay })
  }
  // Any other state change re-renders too.
  action render = all { s.mounted, s' = anchored(s) }
  // Save resolves the form's offset against the current day.
  action save = all {
    s.form != "none", not(s.saved),
    s' = { ...s, saved: true, savedRetained: Retained, savedWhileDue: s.refreshDue,
      savedDay: s.today + s.formOff, savedIntended: s.formIntended, form: "none" }
  }
  action unmount = all {
    s.mounted, s' = { ...s, mounted: false, refreshDue: false, rowsShown: false, form: "none" }
  }
  // Mounting reads the rows and sets the next midnight timer.
  action mount = all {
    not(s.mounted), s' = { ...s, mounted: true, rowsShown: true, rowReadDay: s.today }
  }
  action step = {
    nondet kind = Set("creation", "edit", "plain").oneOf()
    nondet off = 0.to(1).oneOf()
    nondet ok = Bool.oneOf()
    any { openForm(kind, off), closeForm, midnight, refresh(ok), render, save, unmount, mount, s' = s }
  }

  // Shown rows carry today's offsets unless the midnight refresh is still due.
  val RowsFollowDate = s.rowsShown implies (s.rowReadDay == s.today or s.refreshDue)
  val RowOffIsCivilDay = (s.rowsShown and s.rowReadDay == s.today) implies s.today + RowOff == s.rowDay
  // A retained form is anchored to today, or to an earlier day only while the refresh is due.
  val RetainedFormFollowsDate = Retained implies (s.formAnchor == s.today or s.refreshDue)
  // Re-anchoring never changes the civil date a retained form means.
  val RetainedFormKeepsCivilDate = Retained implies s.formAnchor + s.formOff == s.formIntended
  val RetainedSaveOnIntendedDay = (s.saved and s.savedRetained and not(s.savedWhileDue))
    implies s.savedDay == s.savedIntended
  val DueOnlyWhileMounted = s.refreshDue implies s.mounted
  val TypeOK = s.today.in(0.to(2)) and s.form.in(Set("none", "creation", "edit", "plain"))
    and s.rowReadDay.in(0.to(2)) and s.formAnchor.in(0.to(2))
  val safety = TypeOK and RowsFollowDate and RowOffIsCivilDay and RetainedFormFollowsDate
    and RetainedFormKeepsCivilDate and RetainedSaveOnIntendedDay and DueOnlyWhileMounted

  val StaleRowsAwaitingTimerWitness = s.rowsShown and s.rowReadDay != s.today and s.refreshDue
  val ReanchoredFormWitness = Retained and s.formOff < 0
  // A form with no retained identity is not re-anchored: after midnight it means the next day.
  val PlainFormShiftedWitness = s.form == "plain" and not(s.refreshDue)
    and s.today + s.formOff != s.formIntended
  val PlainSavedOnShiftedDayWitness = s.saved and not(s.savedRetained) and not(s.savedWhileDue)
    and s.savedDay != s.savedIntended
  val RowsHiddenAfterFailedReadWitness = s.mounted and not(s.rowsShown) and s.today > 0

  // The screen stays on across midnight: the timer reads the rows again with today's offsets.
  run midnightRefreshTest = init.then(midnight)
    .expect(StaleRowsAwaitingTimerWitness and RowOff == 1 and safety)
    .then(refresh(true)).expect(RowOff == 0 and s.rowReadDay == 1 and not(s.refreshDue) and safety)
  run retainedFormReanchoredTest = init.then(openForm("creation", 1)).then(midnight).then(refresh(true))
    .expect(s.formOff == 0 and s.formAnchor == 1 and safety).then(save)
    .expect(s.savedDay == 1 and s.savedIntended == 1 and safety)
  run retainedEditReanchoredTest = init.then(openForm("edit", 0)).then(midnight).then(render)
    .expect(ReanchoredFormWitness and s.formOff == -1 and safety).then(refresh(true)).then(save)
    .expect(s.savedDay == 0 and s.savedIntended == 0 and safety)
  run failedReadHidesRowsTest = init.then(midnight).then(refresh(false))
    .expect(RowsHiddenAfterFailedReadWitness and safety)
    .then(refresh(true)).expect(s.rowsShown and RowOff == 0 and safety)
  run remountReadsTodayTest = init.then(unmount).then(midnight).expect(not(s.refreshDue))
    .then(mount).expect(s.rowReadDay == 1 and RowOff == 0 and safety)
  run plainFormShiftsTest = init.then(openForm("plain", 0)).then(midnight).then(refresh(true))
    .expect(PlainFormShiftedWitness).then(save)
    .expect(PlainSavedOnShiftedDayWitness and s.savedDay == 1 and s.savedIntended == 0 and safety)
}
