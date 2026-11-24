module DayAnchor {
  type State = {
    today: int, mounted: bool,
    refreshDue: bool,
    rowsShown: bool, rowReadDay: int, rowDay: int,
    form: str, formOff: int, formAnchor: int, formIntended: int,
    closedEditDay: int,
    saved: bool, savedRetained: bool, savedWhileDue: bool, savedDay: int, savedIntended: int
  }
  var s: State
  action init = s' = { today: 0, mounted: true, refreshDue: false,
    rowsShown: true, rowReadDay: 0, rowDay: 1,
    form: "none", formOff: 0, formAnchor: 0, formIntended: 0, closedEditDay: -1,
    saved: false, savedRetained: false, savedWhileDue: false, savedDay: 0, savedIntended: 0 }
  val RowOff = s.rowDay - s.rowReadDay
  val Retained = s.form.in(Set("creation", "edit"))
  pure def anchored(state: State): State =
    if (state.form != "none" and state.formAnchor != state.today)
      { ...state, formOff: state.formOff + state.formAnchor - state.today, formAnchor: state.today }
    else state

  action openForm(kind: str, off: int): bool = all {
    s.mounted, s.form == "none", kind.in(Set("creation", "edit", "plain")), off.in(0.to(1)),
    s' = { ...s, form: kind, formOff: off, formAnchor: s.today, formIntended: s.today + off }
  }
  action closeForm = all {
    s.form != "none",
    s' = { ...s, form: "none", closedEditDay: if (s.form == "edit") s.today else s.closedEditDay }
  }
  action midnight = all {
    s.today < 2, s' = { ...s, today: s.today + 1, refreshDue: s.mounted }
  }
  action refresh(ok: bool): bool = all {
    s.mounted,
    s' = anchored({ ...s, refreshDue: false, rowsShown: ok,
      rowReadDay: if (ok) s.today else s.rowReadDay })
  }
  action render = all { s.mounted, s' = anchored(s) }
  action save = all {
    s.form != "none", not(s.saved),
    s' = { ...s, saved: true, savedRetained: Retained, savedWhileDue: s.refreshDue,
      savedDay: s.today + s.formOff, savedIntended: s.formIntended, form: "none",
      rowsShown: Retained or s.rowsShown, rowReadDay: if (Retained) s.today else s.rowReadDay }
  }
  action unmount = all {
    s.mounted,
    s' = { ...s, mounted: false, refreshDue: false, rowsShown: false, form: "none", closedEditDay: -1 }
  }
  action mount = all {
    not(s.mounted), s' = { ...s, mounted: true, rowsShown: true, rowReadDay: s.today }
  }
  action step = {
    nondet kind = Set("creation", "edit", "plain").oneOf()
    nondet off = 0.to(1).oneOf()
    nondet ok = Bool.oneOf()
    any { openForm(kind, off), closeForm, midnight, refresh(ok), render, save, unmount, mount, s' = s }
  }

  val RowsFollowDate = s.rowsShown implies (s.rowReadDay == s.today or s.refreshDue)
  val RowOffIsCivilDay = (s.rowsShown and s.rowReadDay == s.today) implies s.today + RowOff == s.rowDay
  val FormFollowsDate = s.form != "none" implies (s.formAnchor == s.today or s.refreshDue)
  val FormKeepsCivilDate = s.form != "none" implies s.formAnchor + s.formOff == s.formIntended
  val SaveOnIntendedDay = (s.saved and not(s.savedWhileDue)) implies s.savedDay == s.savedIntended
  val DueOnlyWhileMounted = s.refreshDue implies s.mounted
  val TypeOK = s.today.in(0.to(2)) and s.form.in(Set("none", "creation", "edit", "plain"))
    and s.rowReadDay.in(0.to(2)) and s.formAnchor.in(0.to(2))
    and s.closedEditDay.in((-1).to(2)) and s.closedEditDay <= s.today
  val safety = TypeOK and RowsFollowDate and RowOffIsCivilDay and FormFollowsDate
    and FormKeepsCivilDate and SaveOnIntendedDay and DueOnlyWhileMounted

  val StaleRowsAwaitingTimerWitness = s.rowsShown and s.rowReadDay != s.today and s.refreshDue
  val ReanchoredFormWitness = Retained and s.formOff < 0
  val PlainFormReanchoredWitness = s.form == "plain" and s.formOff < 0
  val SavedBeforeTimerWitness = s.saved and s.savedWhileDue and s.savedDay != s.savedIntended
  val ReopenedEditWitness = s.form == "edit" and s.closedEditDay >= 0 and s.closedEditDay < s.formAnchor
    and s.formAnchor == s.today
  val RowsHiddenAfterFailedReadWitness = s.mounted and not(s.rowsShown) and s.today > 0

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
  run plainFormFollowsDateTest = init.then(openForm("plain", 0)).then(midnight).then(refresh(true))
    .expect(PlainFormReanchoredWitness and s.formOff == -1 and safety).then(save)
    .expect(s.savedDay == 0 and s.savedIntended == 0 and safety)
  run reopenedEditAnchoredTodayTest = init.then(openForm("edit", 1)).then(closeForm).then(midnight)
    .then(refresh(true)).then(openForm("edit", 0))
    .expect(ReopenedEditWitness and s.formAnchor == 1 and s.formOff == 0 and s.formIntended == 1 and safety)
    .then(render).expect(s.formOff == 0 and safety).then(save)
    .expect(s.savedDay == 1 and s.savedIntended == 1 and safety)
  run saveBeforeTimerTest = init.then(openForm("creation", 0)).then(midnight).then(save)
    .expect(SavedBeforeTimerWitness and s.savedDay == 1 and safety)
}
