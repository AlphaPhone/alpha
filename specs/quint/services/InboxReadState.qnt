/// Read and unread marks for one loaded message. The label change is idempotent, so it has no
/// durable record, but it is sent once: an automatic mark with an uncertain outcome is not
/// sent again until the mark is confirmed or the mailbox is reset.
module InboxReadState {
  type Marks = {
    unread: bool, inFlight: bool, target: bool, unconfirmed: bool, stale: int,
    autoSinceConfirm: int, sessionFlights: int, sends: int
  }
  var s: Marks
  action init = s' = {
    unread: true, inFlight: false, target: false, unconfirmed: false, stale: 0,
    autoSinceConfirm: 0, sessionFlights: 0, sends: 0 }
  /// Opening an unread message marks it read without a tap.
  action openMessage = all {
    s.unread, not(s.inFlight), not(s.unconfirmed), s.sends < 4,
    s' = { ...s, inFlight: true, target: false, autoSinceConfirm: s.autoSinceConfirm + 1,
      sessionFlights: s.sessionFlights + 1, sends: s.sends + 1 }
  }
  /// An explicit mark is allowed after an uncertain one, but not beside one in flight.
  action explicitMark(unread: bool): bool = all {
    not(s.inFlight), s.sends < 4,
    s' = { ...s, inFlight: true, target: unread, sessionFlights: s.sessionFlights + 1, sends: s.sends + 1 }
  }
  /// Only a confirmed result changes the message. Anything else may have reached the provider.
  action reply(confirmed: bool): bool = all {
    s.inFlight,
    s' = { ...s, inFlight: false, sessionFlights: s.sessionFlights - 1,
      unconfirmed: not(confirmed), unread: if (confirmed) s.target else s.unread,
      autoSinceConfirm: if (confirmed) 0 else s.autoSinceConfirm }
  }
  /// A mailbox reset forgets the marks in flight and the uncertain ones.
  action resetMailbox = all {
    s.stale < 2,
    s' = { ...s, inFlight: false, unconfirmed: false, autoSinceConfirm: 0, sessionFlights: 0,
      stale: if (s.inFlight) s.stale + 1 else s.stale }
  }
  /// A request from before the reset ends. Its result is recorded but changes no message.
  action staleReply(confirmed: bool): bool = all {
    s.stale > 0,
    s' = { ...s, stale: s.stale - 1, unconfirmed: not(confirmed),
      autoSinceConfirm: if (confirmed) 0 else s.autoSinceConfirm }
  }
  action newMail = all { not(s.unread), not(s.inFlight), s' = { ...s, unread: true } }
  action step = any {
    openMessage, explicitMark(true), explicitMark(false), reply(true), reply(false),
    resetMailbox, staleReply(true), staleReply(false), newMail, s' = s
  }
  val AutoMarkSentOnce = s.autoSinceConfirm <= 1
  val SingleFlight = s.sessionFlights == (if (s.inFlight) 1 else 0)
  val TypeOK = s.sends.in(0.to(4)) and s.stale.in(0.to(2))
  val safety = TypeOK and AutoMarkSentOnce and SingleFlight
  val UncertainAutoMarkWitness = s.unconfirmed and s.unread and not(s.inFlight) and s.autoSinceConfirm == 1
  val StaleBesideNewWitness = s.stale > 0 and s.inFlight
  val ExplicitAfterUncertainWitness = s.unconfirmed and s.inFlight and s.autoSinceConfirm == 1
  /// The automatic mark ends without a confirmed result. Opening the message again sends
  /// nothing; an explicit mark still can.
  run uncertainAutoMarkNotRepeatedTest = init.then(openMessage).then(reply(false))
    .expect(s.unconfirmed and s.unread and safety)
    .then(openMessage.fail())
  run explicitMarkAfterUncertainTest = init.then(openMessage).then(reply(false))
    .then(explicitMark(false)).then(reply(true))
    .expect(not(s.unread) and not(s.unconfirmed) and s.sends == 2 and safety)
  run markInFlightRefusesAnotherTest = init.then(openMessage).expect(safety)
    .then(explicitMark(true).fail())
  run resetAllowsOneMoreAutoMarkTest = init.then(openMessage).then(reply(false)).then(resetMailbox)
    .then(openMessage).expect(s.autoSinceConfirm == 1 and s.sends == 2 and safety)
  run staleUnknownBlocksAutoMarkTest = init.then(openMessage).then(resetMailbox).then(staleReply(false))
    .expect(s.unconfirmed and safety)
    .then(openMessage.fail())
}
