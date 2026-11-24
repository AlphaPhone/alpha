module MapsAgentSurfaceAdmission {
  type Request = { phase: str, opened: bool }
  type Look = { view: str, blocked: bool }
  type Surface = {
    view: str, pendingOpen: bool,
    blocks: Set[str], disposed: bool,
    requests: int -> Request, begun: int,
    opens: List[Look], admissions: Set[Look], lateOpens: int
  }
  var s: Surface
  pure val Requests = 1.to(3)
  pure val Views = Set("home", "maps", "other")
  pure val Blocks = Set("system", "secure", "shade", "suspended", "assistant", "sheet", "hidden", "dead")
  pure val idle: Request = { phase: "idle", opened: false }
  pure def blocked(v: Surface): bool = v.disposed or v.blocks != Set()
  pure def showable(v: Surface): bool = not(blocked(v)) and v.view.in(Set("home", "maps"))
  pure def look(v: Surface): Look = { view: v.view, blocked: blocked(v) }
  pure def answered(v: Surface, id: int): Surface = {
    val yes = showable(v) and v.view == "maps"
    { ...v, requests: v.requests.setBy(id, r => { ...r, phase: if (yes) "admitted" else "refused" }),
      admissions: if (yes) v.admissions.union(Set(look(v))) else v.admissions }
  }
  pure def waiting(v: Surface): Set[int] = Requests.filter(id => v.requests.get(id).phase == "waiting")

  action init = s' = {
    view: "home", pendingOpen: false, blocks: Set(), disposed: false,
    requests: Requests.mapBy(id => idle), begun: 0, opens: List(), admissions: Set(), lateOpens: 0
  }
  action setBlock(name: str, on: bool): bool = all {
    name.in(Blocks), on != s.blocks.contains(name),
    s' = { ...s, blocks: if (on) s.blocks.union(Set(name)) else s.blocks.exclude(Set(name)) }
  }
  action go(view: str): bool = all {
    view.in(Views), view != s.view or s.pendingOpen,
    s' = { ...s, view: view, pendingOpen: false }
  }
  action request = {
    val id = s.begun + 1
    val begun = { ...s, begun: id }
    all {
      s.begun < 3,
      s' = if (not(showable(s)) or s.view == "maps") answered(begun, id)
        else { ...begun, pendingOpen: true, opens: s.opens.append(look(s)),
          requests: s.requests.set(id, { phase: "waiting", opened: true }) }
    }
  }
  action commit = {
    val committed = { ...s, view: if (s.pendingOpen) "maps" else s.view, pendingOpen: false,
      lateOpens: if (s.pendingOpen and waiting(s) == Set()) s.lateOpens + 1 else s.lateOpens }
    all {
      s.pendingOpen or waiting(s) != Set(),
      s' = waiting(s).fold(committed, (v, id) => answered(v, id))
    }
  }
  action timeout(id: int): bool = all {
    s.requests.get(id).phase == "waiting", s' = answered(s, id)
  }
  action dispose = all { not(s.disposed), s' = { ...s, disposed: true } }
  action step = {
    nondet name = Blocks.oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet view = Views.oneOf()
    nondet id = Requests.oneOf()
    nondet draw = 0.to(5).oneOf()
    any {
      request, commit, timeout(id), go(view),
      all { draw == 0 or not(flag), setBlock(name, flag) },
      all { draw == 0, dispose },
      s' = s
    }
  }

  val TypeOK = s.view.in(Views) and s.blocks.subseteq(Blocks) and s.begun.in(0.to(3)) and
    Requests.forall(id => s.requests.get(id).phase.in(Set("idle", "waiting", "admitted", "refused")))
  val OpensOnlyOverUnblockedHome = s.opens.select(open => open != { view: "home", blocked: false }) == List()
  val AdmittedOnlyWithMapsShown = s.admissions.subseteq(Set({ view: "maps", blocked: false }))
  val OneOpenPerRequest = s.opens.length() == Requests.filter(id => s.requests.get(id).opened).size() and
    Requests.forall(id => s.requests.get(id).phase == "waiting" implies s.requests.get(id).opened)
  val RequestsInOrder = Requests.forall(id => (s.requests.get(id).phase != "idle") == (id <= s.begun))
  val LateOpenFollowsOpen = s.lateOpens <= s.opens.length()
  val PendingOpenOverHome = s.pendingOpen implies s.view == "home" and s.opens.length() > 0
  val safety = TypeOK and OpensOnlyOverUnblockedHome and AdmittedOnlyWithMapsShown and OneOpenPerRequest and
    RequestsInOrder and LateOpenFollowsOpen and PendingOpenOverHome

  val AdmittedAfterOpenWitness = Requests.exists(id => s.requests.get(id) == { phase: "admitted", opened: true })
  val AdmittedWithoutOpenWitness = Requests.exists(id => s.requests.get(id) == { phase: "admitted", opened: false })
  val RefusedAfterOpenWitness = Requests.exists(id => s.requests.get(id) == { phase: "refused", opened: true })
  val MapsOpensAfterRefusalWitness = s.lateOpens > 0 and s.view == "maps"
  val TwoRequestsShareOneCommitWitness = Requests.filter(id => s.requests.get(id) == { phase: "admitted", opened: true }).size() > 1

  run opensMapsOverHomeTest = init.then(request)
    .expect(s.requests.get(1).phase == "waiting" and s.pendingOpen and s.view == "home")
    .then(commit).expect(s.requests.get(1).phase == "admitted" and s.view == "maps" and safety)
    .then(request).expect(s.requests.get(2) == { phase: "admitted", opened: false } and s.opens.length() == 1 and safety)
  run neverOpensOverAnotherAppTest = init.then(go("other")).then(request)
    .expect(s.requests.get(1) == { phase: "refused", opened: false } and s.view == "other" and s.opens == List() and safety)
  run blockedScreenRefusesWithoutOpeningTest = init.then(setBlock("secure", true)).then(request)
    .expect(s.requests.get(1).phase == "refused" and s.opens == List())
    .then(setBlock("secure", false)).then(go("maps")).then(setBlock("sheet", true)).then(request)
    .expect(s.requests.get(2).phase == "refused" and safety)
  run lockDuringWaitRefusesTest = init.then(request).then(setBlock("system", true)).then(commit)
    .expect(s.requests.get(1) == { phase: "refused", opened: true } and s.view == "maps" and safety)
  run timeLimitRefusesAndMapsStillOpensTest = init.then(request).then(timeout(1))
    .expect(s.requests.get(1).phase == "refused" and s.view == "home" and s.pendingOpen)
    .then(commit).expect(s.view == "maps" and s.lateOpens == 1 and safety)
  run userNavigationReplacesTheOpenTest = init.then(request).then(go("other")).then(commit)
    .expect(s.requests.get(1).phase == "refused" and s.view == "other" and safety)
  run disposedAdapterAnswersNoTest = init.then(go("maps")).then(dispose).then(request)
    .expect(s.requests.get(1).phase == "refused" and s.admissions == Set() and safety)
  run overlappingRequestsShareTheCommitTest = init.then(request).then(request)
    .expect(s.opens.length() == 2).then(commit)
    .expect(s.requests.get(1).phase == "admitted" and s.requests.get(2).phase == "admitted" and safety)
}
