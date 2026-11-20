/// A note's attachment opens its retained reference, or the exact bytes selected
/// through the picker for a legacy fingerprint. Opening cannot edit the note.
module NoteSourceAttachment {
  type OpenState = {
    active: bool, linked: bool, referenced: bool, owned: bool,
    stage: str, grant: bool, exact: bool
  }
  var s: OpenState

  action initFor(linked: bool, referenced: bool): bool = s' = {
    active: true, linked: linked, referenced: referenced and linked, owned: false,
    stage: "idle", grant: false, exact: false
  }
  action init = {
    nondet linked = Bool.oneOf()
    nondet referenced = Bool.oneOf()
    initFor(linked, referenced)
  }
  action tap = all { s.active, s.linked, s.stage == "idle",
    s' = { ...s, owned: true, stage: if (s.referenced) "opening" else "pick", exact: s.referenced } }
  action leave = all { s.active, s' = { ...s, active: false, owned: false } }
  action enter = all { not(s.active), s' = { ...s, active: true } }
  action changedLink = all { s.active, s' = { ...s, owned: false } }
  action choose(selected: bool): bool = all { s.stage == "pick",
    s' = if (selected) { ...s, grant: true, stage: if (s.owned) "read" else "release" }
      else { ...s, owned: false, stage: "idle" } }
  action verify(matches: bool): bool = all { s.stage == "read",
    s' = if (matches and s.owned) { ...s, stage: "opening", exact: true }
      else { ...s, stage: "release" } }
  action finish = all { s.stage == "opening",
    s' = { ...s, owned: false, stage: if (s.grant) "release" else "idle", exact: false } }
  action release = all { s.stage == "release", s' = { ...s, owned: false, grant: false, stage: "idle" } }
  action step = {
    nondet selected = Bool.oneOf()
    nondet matches = Bool.oneOf()
    any { tap, leave, enter, changedLink, choose(selected), verify(matches), finish, release, s' = s }
  }
  val OpenRequiresExactSource = (s.stage == "opening") implies s.exact
  val SelectionOwnedByActiveOperation = s.grant implies s.stage.in(Set("read", "opening", "release"))
  val RetainedLinkSkipsPicker = s.referenced implies not(s.grant)
  val safety = OpenRequiresExactSource and SelectionOwnedByActiveOperation and RetainedLinkSkipsPicker

  val OpeningReference = s.stage == "opening" and s.referenced
  val OpeningMatchedSelection = s.stage == "opening" and s.grant
  val ReleasingRetiredSelection = s.stage == "release" and not(s.owned)

  run retainedLinkOpensDirectlyTest = initFor(true,true).then(tap).expect(OpeningReference and safety)
    .then(finish).expect(s.stage == "idle" and safety)
  run matchingSelectionOpensTest = initFor(true,false).then(tap).then(choose(true)).then(verify(true))
    .expect(OpeningMatchedSelection and safety).then(finish).then(release).expect(not(s.grant) and safety)
  run changedLinkReleasesSelectionTest = initFor(true,false).then(tap).then(choose(true)).then(changedLink)
    .then(verify(true)).expect(ReleasingRetiredSelection and safety).then(release).expect(not(s.grant) and safety)
  run pickerResultAfterLeaveIsReleasedTest = initFor(true,false).then(tap).then(leave).then(choose(true))
    .expect(ReleasingRetiredSelection and safety)
  run differentSelectionNeverOpensTest = initFor(true,false).then(tap).then(choose(true)).then(verify(false))
    .expect(s.stage == "release" and not(s.exact) and safety)
}
