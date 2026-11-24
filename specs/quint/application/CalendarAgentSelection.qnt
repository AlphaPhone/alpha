module CalendarAgentSelection {
  type Selection = { kind: str, open: int, revision: int }
  type State = {
    open: int, shown: int -> int, provider: int -> int,
    form: str,
    selection: Selection, selectionEpoch: int,
    keyOpen: int, keyRevision: int, epoch: int,
    pending: str, pendingToken: int, pendingOpen: int
  }
  var s: State
  pure val none: Selection = { kind: "none", open: 0, revision: 0 }
  action init = s' = { open: 0, shown: Map(1 -> 0, 2 -> 0), provider: Map(1 -> 0, 2 -> 0),
    form: "none", selection: none, selectionEpoch: 0, keyOpen: 0, keyRevision: 0, epoch: 0,
    pending: "none", pendingToken: 0, pendingOpen: 0 }
  pure def retired(state: State): State =
    { ...state, selection: none, keyOpen: 0, keyRevision: 0, epoch: state.epoch + 1 }
  val Exposed = if (s.selection.kind == "source") (if (s.form == "local") s.selection else none)
    else if (s.selection.kind == "event" and s.open == s.selection.open) s.selection
    else none

  action openEvent(e: int): bool = all {
    Set(1, 2).contains(e), s.form == "none", s' = { ...s, open: e }
  }
  action renderDetail = all {
    s.open != 0, s.epoch < 6,
    s.keyOpen != s.open or s.keyRevision != s.shown.get(s.open),
    s' = { ...s, selection: none, keyOpen: s.open, keyRevision: s.shown.get(s.open),
      epoch: s.epoch + 1, pending: "event", pendingToken: s.epoch + 1, pendingOpen: s.open }
  }
  action inspected(ready: bool): bool = all {
    s.pending == "event",
    s' = if (ready and s.pendingToken == s.epoch and s.open == s.pendingOpen)
        { ...s, pending: "none", selectionEpoch: s.epoch,
          selection: { kind: "event", open: s.pendingOpen, revision: s.provider.get(s.pendingOpen) } }
      else { ...s, pending: "none" }
  }
  action closeEvent = all {
    s.open != 0, s.keyOpen == s.open, s.epoch < 6, s' = { ...retired(s), open: 0 }
  }
  action refresh = all { s.epoch < 6, s' = { ...retired(s), shown: s.provider } }
  action commitElsewhere = all {
    s.epoch < 6,
    s' = if (s.selection.kind == "event" and s.open == s.selection.open
          and s.provider.get(s.open) == s.keyRevision)
        { ...s, shown: s.provider, epoch: s.epoch + 1, selectionEpoch: s.epoch + 1 }
      else { ...retired(s), shown: s.provider }
  }
  action providerChange(e: int): bool = all {
    Set(1, 2).contains(e), s.provider.get(e) < 2,
    s' = { ...s, provider: s.provider.set(e, s.provider.get(e) + 1) }
  }
  action newForm = all {
    s.epoch < 6, s.open == 0,
    s' = { ...retired(s), form: "local", pending: "source", pendingToken: s.epoch + 1,
      pendingOpen: 0 }
  }
  action sourcePrepared(ready: bool): bool = all {
    s.pending == "source",
    s' = if (ready and s.pendingToken == s.epoch and s.form == "local")
        { ...s, pending: "none", selectionEpoch: s.epoch,
          selection: { kind: "source", open: 0, revision: 0 } }
      else { ...s, pending: "none" }
  }
  action pickCalendar(local: bool): bool = all {
    s.form != "none", s' = { ...s, form: if (local) "local" else "other" }
  }
  action closeForm = all { s.form != "none", s' = { ...s, form: "none" } }
  action step = {
    nondet e = Set(1, 2).oneOf()
    nondet flag = Bool.oneOf()
    any {
      openEvent(e), renderDetail, inspected(flag), closeEvent, refresh, commitElsewhere, providerChange(e), newForm,
      sourcePrepared(flag), pickCalendar(flag), closeForm, s' = s
    }
  }

  val ExposedEventIsOpen = Exposed.kind == "event" implies Exposed.open == s.open and s.open != 0
  val ExposedSourceMatchesForm = Exposed.kind == "source" implies s.form == "local"
  val SelectionFromCurrentEpoch = s.selection.kind != "none" implies s.selectionEpoch == s.epoch
  val SelectionMatchesKey = s.selection.kind == "event" implies s.selection.open == s.keyOpen
  val RevisionWasProviders = s.selection.kind == "event"
    implies s.selection.revision <= s.provider.get(s.selection.open)
  val TypeOK = s.open.in(0.to(2)) and s.form.in(Set("none", "local", "other"))
    and s.pending.in(Set("none", "event", "source")) and s.epoch.in(0.to(6))
    and s.selection.kind.in(Set("none", "event", "source"))
  val safety = TypeOK and ExposedEventIsOpen and ExposedSourceMatchesForm
    and SelectionFromCurrentEpoch and SelectionMatchesKey and RevisionWasProviders

  val EventSelectedWitness = Exposed.kind == "event"
  val SourceSelectedWitness = Exposed.kind == "source"
  val RetiredInspectionWitness = s.pending == "event" and s.pendingToken != s.epoch
  val SourceHiddenByCalendarChoiceWitness = s.selection.kind == "source" and s.form == "other"

  run inspectedEventSelectedTest = init.then(openEvent(1)).then(renderDetail).then(inspected(true))
    .expect(EventSelectedWitness and Exposed.open == 1 and safety)
    .then(renderDetail.fail())
  run lateInspectionDroppedTest = init.then(openEvent(1)).then(renderDetail).then(closeEvent)
    .then(openEvent(2)).expect(RetiredInspectionWitness).then(inspected(true))
    .expect(Exposed.kind == "none" and s.selection.kind == "none" and safety)
    .then(renderDetail).then(inspected(true)).expect(Exposed.open == 2 and safety)
  run refreshRetiresSelectionTest = init.then(openEvent(1)).then(renderDetail).then(inspected(true))
    .then(providerChange(1)).then(refresh).expect(Exposed.kind == "none" and safety)
    .then(renderDetail).then(inspected(true))
    .expect(Exposed.revision == 1 and s.keyRevision == 1 and safety)
  run commitElsewhereKeepsSelectionTest = init.then(openEvent(1)).then(renderDetail).then(inspected(true))
    .then(providerChange(2)).then(commitElsewhere)
    .expect(Exposed.kind == "event" and Exposed.open == 1 and s.shown.get(2) == 1 and safety)
  run commitElsewhereDropsChangedRowTest = init.then(openEvent(1)).then(renderDetail).then(inspected(true))
    .then(providerChange(1)).then(commitElsewhere).expect(Exposed.kind == "none" and safety)
    .then(renderDetail).then(inspected(true)).expect(Exposed.revision == 1 and safety)
  run failedInspectionSelectsNothingTest = init.then(openEvent(1)).then(renderDetail)
    .then(inspected(false)).expect(Exposed.kind == "none" and safety)
  run sourceFollowsFormCalendarTest = init.then(newForm).then(sourcePrepared(true))
    .expect(SourceSelectedWitness and safety).then(pickCalendar(false))
    .expect(SourceHiddenByCalendarChoiceWitness and Exposed.kind == "none" and safety)
    .then(pickCalendar(true)).expect(Exposed.kind == "source" and safety)
  run sourceForOtherCalendarDroppedTest = init.then(newForm).then(pickCalendar(false))
    .then(sourcePrepared(true)).expect(s.selection.kind == "none" and safety)
}
