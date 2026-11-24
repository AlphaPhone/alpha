module PlanAdmissionGrace {
  type Record = { present: bool, credential: int, age: str, endsAt: str }
  type State = {
    credential: int, record: Record,
    memoryEndsAt: str, redeemedEnd: str,
    binding: str, admittedBy: str, notice: str,
    lastWrittenEnd: str, writes: int
  }
  var s: State
  pure val NO_RECORD = { present: false, credential: 0, age: "fresh", endsAt: "none" }
  action init = s' = {
    credential: 0, record: NO_RECORD, memoryEndsAt: "none", redeemedEnd: "unset",
    binding: "none", admittedBy: "none", notice: "none", lastWrittenEnd: "none", writes: 0
  }
  pure def recent(record: Record, credential: int): bool =
    record.present and credential != 0 and record.credential == credential and record.age == "fresh" and record.endsAt != "past"
  pure def planWindowEnd(kind: str, reported: str, lastKnown: str): str =
    if (kind == "credits") "none"
    else if (kind == "active" and reported == "future") "future"
    else if (kind == "active" and lastKnown == "past") "none"
    else lastKnown
  def lastKnownEnd: str =
    if (s.redeemedEnd != "unset") s.redeemedEnd
    else if (recent(s.record, s.credential) and s.record.endsAt != "none") s.record.endsAt else s.memoryEndsAt
  action signIn(credential: int): bool = all {
    credential.in(Set(1, 2)), credential != s.credential,
    s' = { ...s, credential: credential, memoryEndsAt: "none", redeemedEnd: "unset", binding: "none", admittedBy: "none", notice: "none" }
  }
  action signOut = all {
    s.credential != 0,
    s' = { ...s, credential: 0, record: NO_RECORD, memoryEndsAt: "none", redeemedEnd: "unset", binding: "unbound", admittedBy: "none", notice: "none" }
  }
  action admitWithoutAccount = s' = { ...s, binding: "unbound", admittedBy: "none", notice: "sign-in", memoryEndsAt: "none", redeemedEnd: "unset" }
  action signInRejected = all {
    s.credential != 0,
    s' = { ...s, record: NO_RECORD, binding: "unbound", admittedBy: "none", notice: "sign-in", memoryEndsAt: "none", redeemedEnd: "unset" }
  }
  action redeem(end: str): bool = all {
    s.credential != 0, s.binding == "cloud", end.in(Set("none", "future")),
    val mine = s.record.present and s.record.credential == s.credential
    s' = { ...s, redeemedEnd: end, memoryEndsAt: end,
      record: if (mine) { ...s.record, endsAt: end } else s.record,
      lastWrittenEnd: if (mine) end else s.lastWrittenEnd }
  }
  action admitOffline = all {
    s.credential != 0,
    val kept = recent(s.record, s.credential)
    s' = { ...s, binding: if (kept) "kept" else "unbound", admittedBy: if (kept) "grace" else "none",
      notice: "offline", memoryEndsAt: if (kept) s.record.endsAt else "none" }
  }
  action admitBillingOutage = all {
    s.credential != 0,
    val admitted = recent(s.record, s.credential)
    s' = { ...s, binding: if (admitted) "cloud" else "unbound", admittedBy: if (admitted) "grace" else "none",
      notice: if (admitted) "none" else "needs-plan",
      memoryEndsAt: if (admitted) planWindowEnd("unavailable", "none", lastKnownEnd) else "none" }
  }
  action verified(kind: str, reported: str): bool = all {
    s.credential != 0, s.writes < 4, kind.in(Set("active", "credits")), reported.in(Set("none", "future")),
    kind == "credits" implies reported == "none",
    val end = planWindowEnd(kind, reported, lastKnownEnd)
    s' = { ...s, record: { present: true, credential: s.credential, age: "fresh", endsAt: end },
      memoryEndsAt: end, binding: "cloud", admittedBy: "verified", notice: "none",
      lastWrittenEnd: end, writes: s.writes + 1 }
  }
  action refreshVerified(kind: str, reported: str): bool = all {
    s.binding == "cloud", s.writes < 4, kind.in(Set("active", "credits")), reported.in(Set("none", "future")),
    kind == "credits" implies reported == "none",
    val end = planWindowEnd(kind, reported, s.memoryEndsAt)
    s' = { ...s, record: { present: true, credential: s.credential, age: "fresh", endsAt: end },
      memoryEndsAt: end, lastWrittenEnd: end, writes: s.writes + 1 }
  }
  action refreshFailed = all { s.binding == "cloud", s' = s }
  action planEnded = all {
    s.credential != 0,
    s' = { ...s, record: NO_RECORD, memoryEndsAt: "none", binding: "unbound", admittedBy: "none", notice: "plan-ended" }
  }
  action windowPasses = all { s.record.present, s.record.age == "fresh", s' = { ...s, record: { ...s.record, age: "old" } } }
  action endPasses = all {
    s.record.endsAt == "future" or s.memoryEndsAt == "future" or s.redeemedEnd == "future",
    s' = { ...s, record: { ...s.record, endsAt: if (s.record.endsAt == "future") "past" else s.record.endsAt },
      memoryEndsAt: if (s.memoryEndsAt == "future") "past" else s.memoryEndsAt,
      redeemedEnd: if (s.redeemedEnd == "future") "past" else s.redeemedEnd }
  }
  action step = {
    nondet credential = Set(1, 2).oneOf()
    nondet end = Set("none", "future").oneOf()
    nondet kind = Set("active", "credits").oneOf()
    any {
      signIn(credential), signOut, admitWithoutAccount, signInRejected, redeem(end),
      admitOffline, admitBillingOutage, verified(kind, end), refreshVerified(kind, end),
      refreshFailed, planEnded, windowPasses, endPasses, s' = s
    }
  }
  val EndsAtNotPast = s.lastWrittenEnd != "past"
  val GraceBoundToCredential = s.admittedBy == "grace" implies
    s.record.present and s.record.credential == s.credential and s.credential != 0
  val KeptOnlyOffline = s.binding == "kept" implies s.notice == "offline" and s.admittedBy == "grace"
  val CloudBindingHasBasis = s.binding == "cloud" implies s.admittedBy != "none" and s.credential != 0
  val PlanEndedRemovesRecord = s.notice == "plan-ended" implies not(s.record.present) and s.binding == "unbound"
  val RedeemedEndBelongsToSignIn = s.redeemedEnd != "unset" implies s.credential != 0
  val SignedOutUnbound = s.credential == 0 implies s.binding.in(Set("none", "unbound")) and s.admittedBy == "none"
  val TypeOK = s.credential.in(0.to(2)) and s.binding.in(Set("none", "cloud", "unbound", "kept"))
    and s.admittedBy.in(Set("none", "verified", "grace"))
    and s.notice.in(Set("none", "offline", "needs-plan", "plan-ended", "sign-in"))
    and s.record.endsAt.in(Set("none", "future", "past")) and s.memoryEndsAt.in(Set("none", "future", "past"))
    and s.redeemedEnd.in(Set("unset", "none", "future", "past"))
    and s.record.age.in(Set("fresh", "old")) and s.writes.in(0.to(4))
  val safety = TypeOK and EndsAtNotPast and GraceBoundToCredential and KeptOnlyOffline and CloudBindingHasBasis and
    PlanEndedRemovesRecord and SignedOutUnbound and RedeemedEndBelongsToSignIn

  val KeptOfflineWitness = s.binding == "kept"
  val PastEndInMemoryWitness = s.memoryEndsAt == "past" and s.binding == "cloud"
  val OtherAccountRecordWitness = s.record.present and s.credential != 0 and s.record.credential != s.credential and s.binding == "unbound" and s.notice == "offline"
  val OldRecordUnbindsWitness = s.record.present and s.record.age == "old" and s.binding == "unbound" and s.notice == "offline"
  val BillingOutageAdmitsWitness = s.binding == "cloud" and s.admittedBy == "grace"
  val RedeemedEndPastWitness = s.redeemedEnd == "past" and s.binding == "cloud"

  val RefreshRewroteRecordWitness = s.writes > 1 and s.admittedBy == "grace" and s.record.age == "fresh"
  val SignOutRemovedRecordWitness = s.credential == 0 and not(s.record.present) and s.writes > 0

  run refreshRewritesRecordTest = init.then(signIn(1)).then(verified("active", "future")).then(windowPasses)
    .then(refreshVerified("active", "none")).expect(s.record.age == "fresh" and s.record.endsAt == "future" and s.writes == 2 and safety)
    .then(endPasses).then(refreshVerified("active", "none"))
    .expect(s.record.endsAt == "none" and s.memoryEndsAt == "none" and s.lastWrittenEnd == "none" and safety)
  run signOutRemovesRecordTest = init.then(signIn(1)).then(verified("credits", "none")).then(signOut)
    .expect(SignOutRemovedRecordWitness and safety)
    .then(signIn(1)).then(admitOffline).expect(s.binding == "unbound" and safety)
  run renewalAfterPastEndTest = init.then(signIn(1)).then(verified("active", "future")).then(endPasses)
    .expect(PastEndInMemoryWitness and s.record.endsAt == "past")
    .then(verified("active", "none"))
    .expect(s.record.endsAt == "none" and s.lastWrittenEnd == "none" and s.memoryEndsAt == "none" and safety)
    .then(admitOffline).expect(KeptOfflineWitness and safety)
  run offlineGraceTest = init.then(signIn(1)).then(verified("credits", "none")).then(admitOffline)
    .expect(s.binding == "kept" and s.admittedBy == "grace" and safety)
    .then(windowPasses).then(admitOffline).expect(OldRecordUnbindsWitness and safety)
  run otherAccountRecordIgnoredTest = init.then(signIn(1)).then(verified("active", "none"))
    .then(signIn(2)).then(admitOffline).expect(OtherAccountRecordWitness and safety)
    .then(admitBillingOutage).expect(s.binding == "unbound" and s.notice == "needs-plan" and safety)
  run billingOutageAdmitsFromRecordTest = init.then(signIn(1)).then(verified("active", "future"))
    .then(admitBillingOutage).expect(BillingOutageAdmitsWitness and s.memoryEndsAt == "future" and s.writes == 1 and safety)
  run planEndedRemovesGraceTest = init.then(signIn(1)).then(verified("active", "none")).then(planEnded)
    .then(admitOffline).expect(s.binding == "unbound" and not(s.record.present) and safety)
  run pastEndGivesNoGraceTest = init.then(signIn(1)).then(verified("active", "future")).then(endPasses)
    .then(admitOffline).expect(s.binding == "unbound" and s.memoryEndsAt == "none" and safety)
  run rejectedSignInForgetsGraceTest = init.then(signIn(1)).then(verified("active", "future")).then(signInRejected)
    .expect(not(s.record.present) and s.notice == "sign-in" and safety)
    .then(admitOffline).expect(s.binding == "unbound" and safety)
  run redeemedEndPrecedesRecordTest = init.then(signIn(1)).then(verified("active", "none")).then(redeem("future"))
    .expect(s.record.endsAt == "future" and s.memoryEndsAt == "future" and safety)
    .then(endPasses).expect(RedeemedEndPastWitness)
    .then(verified("active", "none")).expect(s.record.endsAt == "none" and s.lastWrittenEnd == "none" and safety)
}
