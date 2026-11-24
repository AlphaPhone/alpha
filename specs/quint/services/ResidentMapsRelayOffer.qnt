module ResidentMapsRelayOffer {
  type Turn = { phase: str, receiving: bool, navigation: int }
  type Relay = {
    navigation: int, registrations: int,
    turns: int -> Turn, begun: int,
    lastAccepted: int,
    activeOffer: int, relay: bool
  }
  var s: Relay
  pure val Turns = 1.to(3)
  pure val Phases = Set("idle", "opening", "connected", "plain", "done")
  pure val idle: Turn = { phase: "idle", receiving: false, navigation: 0 }
  pure def ended(turn: Turn, phase: str): Turn = { ...turn, phase: phase, receiving: false }
  pure def phase(r: Relay, id: int): str = r.turns.get(id).phase

  action init = s' = {
    navigation: 0, registrations: 0, turns: Turns.mapBy(id => idle), begun: 0, lastAccepted: 0,
    activeOffer: 0, relay: false
  }
  action setNavigation(flag: bool): bool = all {
    flag != (s.navigation != 0), s.registrations < 3,
    s' = if (flag) { ...s, navigation: s.registrations + 1, registrations: s.registrations + 1 }
      else { ...s, navigation: 0 }
  }
  action beginTurn(resident: bool): bool = all {
    s.begun < 3,
    s' = { ...s, begun: s.begun + 1,
      turns: s.turns.set(s.begun + 1,
        { phase: if (resident and s.navigation != 0) "opening" else "plain", receiving: false,
          navigation: s.navigation }) }
  }
  action openSettles(id: int, accepted: bool): bool = {
    val turn = s.turns.get(id)
    all {
      turn.phase == "opening",
      s' = if (accepted)
          { ...s, turns: s.turns.set(id, { ...turn, phase: "connected", receiving: s.navigation == turn.navigation }),
            lastAccepted: id, activeOffer: id, relay: true }
        else { ...s, turns: s.turns.set(id, ended(turn, "plain")) }
    }
  }
  action receivingFails(id: int): bool = all {
    phase(s, id) == "connected", s.turns.get(id).receiving,
    s' = { ...s, turns: s.turns.set(id, ended(s.turns.get(id), "connected")) }
  }
  action endTurn(id: int): bool = all {
    phase(s, id).in(Set("connected", "plain")),
    s' = { ...s, turns: s.turns.set(id, ended(s.turns.get(id), "done")),
      activeOffer: if (phase(s, id) == "connected" and s.activeOffer == id) 0 else s.activeOffer,
      relay: if (phase(s, id) == "connected" and s.activeOffer == id) false else s.relay }
  }
  action unlatchedEnd(id: int): bool = all {
    phase(s, id) == "connected",
    s' = { ...s, turns: s.turns.set(id, ended(s.turns.get(id), "done")), activeOffer: 0, relay: false }
  }
  action step = {
    nondet id = Turns.oneOf()
    nondet flag = Set(false, true).oneOf()
    any {
      setNavigation(flag), beginTurn(flag), openSettles(id, flag), receivingFails(id), endTurn(id), s' = s
    }
  }

  val TypeOK = Turns.forall(id => phase(s, id).in(Phases)) and s.begun.in(0.to(3)) and
    s.activeOffer.in(0.to(3)) and s.lastAccepted.in(0.to(3)) and
    s.navigation.in(0.to(3)) and s.registrations.in(0.to(3))
  val FlagMatchesOffer = s.relay == (s.activeOffer != 0)
  val OfferOwnerIsConnected = s.activeOffer != 0 implies phase(s, s.activeOffer) == "connected"
  val LastAcceptedOwnsFlag = s.activeOffer.in(Set(0, s.lastAccepted)) and
    (s.lastAccepted != 0 and phase(s, s.lastAccepted) == "connected" implies s.activeOffer == s.lastAccepted)
  val TurnsBeginInOrder = Turns.forall(id => (phase(s, id) != "idle") == (id <= s.begun))
  val OfferNeedsNavigation = Turns.forall(id =>
    phase(s, id).in(Set("opening", "connected")) implies s.turns.get(id).navigation != 0)
  val ReceivingNeedsConnection = Turns.forall(id => s.turns.get(id).receiving implies phase(s, id) == "connected")
  val safety = TypeOK and FlagMatchesOffer and OfferOwnerIsConnected and LastAcceptedOwnsFlag and
    TurnsBeginInOrder and OfferNeedsNavigation and ReceivingNeedsConnection

  val ConnectedTurnShowsFlagDesired = Turns.exists(id => phase(s, id) == "connected") implies s.relay

  val OverlappingOffersWitness = Turns.filter(id => phase(s, id) == "connected").size() == 2
  val OlderTurnOutlivesFlagWitness = not(s.relay) and Turns.exists(id => phase(s, id) == "connected")
  val StaleEndKeptFlagWitness = s.relay and Turns.exists(id => id != s.activeOffer and phase(s, id) == "done")
  val FlagOutlivesReceivingWitness = s.relay and not(s.turns.get(s.activeOffer).receiving)
  val FlagWithoutReceivingBindingWitness = Turns.exists(id => phase(s, id) == "connected" and
    s.activeOffer == id and s.turns.get(id).navigation != s.navigation and s.navigation != 0)
  val RefusedOfferWitness = not(s.relay) and s.navigation != 0 and Turns.exists(id => phase(s, id) == "plain")

  run turnOwnsFlagTest = init.then(setNavigation(true)).then(beginTurn(true))
    .expect(phase(s, 1) == "opening" and not(s.relay))
    .then(openSettles(1, true)).expect(s.relay and s.activeOffer == 1)
    .then(endTurn(1)).expect(not(s.relay) and s.activeOffer == 0 and safety)
  run nothingOfferedWithoutNavigationTest = init.then(beginTurn(true)).expect(phase(s, 1) == "plain")
    .then(setNavigation(true)).then(beginTurn(false)).expect(phase(s, 2) == "plain")
    .then(endTurn(1)).then(endTurn(2)).expect(not(s.relay) and safety)
  run refusedOfferSendsPlainTest = init.then(setNavigation(true)).then(beginTurn(true))
    .then(openSettles(1, false)).expect(phase(s, 1) == "plain" and not(s.relay))
    .then(endTurn(1)).expect(not(s.relay) and safety)
  run olderTurnEndKeepsNewerFlagTest = init.then(setNavigation(true)).then(beginTurn(true))
    .then(openSettles(1, true)).then(beginTurn(true)).then(openSettles(2, true))
    .expect(s.activeOffer == 2)
    .then(endTurn(1)).expect(s.relay and s.activeOffer == 2 and safety)
    .then(endTurn(2)).expect(not(s.relay) and safety)
  run unlatchedEndWouldClearNewerFlagTest = init.then(setNavigation(true)).then(beginTurn(true))
    .then(openSettles(1, true)).then(beginTurn(true)).then(openSettles(2, true))
    .then(unlatchedEnd(1)).expect(not(s.relay) and phase(s, 2) == "connected" and not(LastAcceptedOwnsFlag))
  run newerTurnEndLeavesOlderWithoutFlagTest = init.then(setNavigation(true)).then(beginTurn(true))
    .then(openSettles(1, true)).then(beginTurn(true)).then(openSettles(2, true)).then(endTurn(2))
    .expect(not(s.relay) and phase(s, 1) == "connected" and not(ConnectedTurnShowsFlagDesired) and safety)
  run failedReceiveKeepsFlagUntilEndTest = init.then(setNavigation(true)).then(beginTurn(true))
    .then(openSettles(1, true)).then(receivingFails(1)).expect(s.relay and not(s.turns.get(1).receiving))
    .then(endTurn(1)).expect(not(s.relay) and safety)
  run replacedBindingHoldsFlagWithoutReceivingTest = init.then(setNavigation(true)).then(beginTurn(true))
    .then(setNavigation(false)).then(setNavigation(true)).then(openSettles(1, true))
    .expect(s.relay and phase(s, 1) == "connected" and not(s.turns.get(1).receiving) and safety)
    .then(endTurn(1)).expect(not(s.relay) and safety)
}
