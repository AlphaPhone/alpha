// Synchronous source-view generation and verification; no APK/device/signing effect is modeled.
module AndroidInstallationIdentity {
  type State = {selected: int, profile: int, revision: int, profileRevision: int,
    cache0: str, cache1: str, accepted: bool, result: str}
  var s: State

  action init = s' = {selected: 1, profile: 0, revision: 0, profileRevision: 0,
    cache0: "none", cache1: "none", accepted: false, result: "none"}

  action selectPackage(identity: int): bool = all {
    identity.in(Set(1, 2, 3)),
    s' = {...s, selected: identity, accepted: false, result: "none"},
  }
  action editInput = s' = {...s, revision: 1 - s.revision, accepted: false, result: "none"}
  action tamper = all {
    s.profile == 2,
    s' = {...s, cache0: if (s.profileRevision == 0) "bad" else s.cache0,
      cache1: if (s.profileRevision == 1) "bad" else s.cache1,
      accepted: false, result: "none"},
  }
  action generate = {
    val cache = if (s.revision == 0) s.cache0 else s.cache1
    val refused = s.selected == 3 or s.selected == 2 and cache == "bad"
    s' = {...s, profile: if (refused) s.profile else s.selected,
      profileRevision: if (refused) s.profileRevision else s.revision,
      cache0: if (not(refused) and s.selected == 2 and s.revision == 0) "good" else s.cache0,
      cache1: if (not(refused) and s.selected == 2 and s.revision == 1) "good" else s.cache1,
      accepted: false, result: if (refused) "refused" else "generated"}
  }
  action verify = {
    val cache = if (s.revision == 0) s.cache0 else s.cache1
    val ok = s.selected.in(Set(1, 2)) and s.profile == s.selected
      and (s.selected == 1 or s.profileRevision == s.revision and cache == "good")
    s' = {...s, accepted: ok, result: if (ok) "accepted" else "refused"}
  }
  action step = any {
    {nondet identity = Set(1, 2, 3).oneOf(); selectPackage(identity)},
    editInput, tamper, generate, verify, s' = s,
  }
  val AcceptedIdentityIsCurrent = s.accepted implies s.selected.in(Set(1, 2)) and s.profile == s.selected
    and (s.selected == 1 or s.profileRevision == s.revision
      and (if (s.revision == 0) s.cache0 else s.cache1) == "good")
  val CacheStatesAreBounded = s.cache0.in(Set("none", "good", "bad")) and s.cache1.in(Set("none", "good", "bad"))
  val safety = AcceptedIdentityIsCurrent and CacheStatesAreBounded

  run retainedInputChangeTest = init.then(selectPackage(2)).then(generate).then(verify).then(editInput).then(verify)
    .expect(not(s.accepted) and safety)
  run corruptedViewRefusedTest = init.then(selectPackage(2)).then(generate).then(tamper).then(generate).then(verify)
    .expect(not(s.accepted) and s.cache0 == "bad" and safety)
  run canonicalDefaultRetainedTest = init.then(selectPackage(2)).then(generate).then(tamper).then(selectPackage(1)).then(generate).then(verify)
    .expect(s.accepted and s.profile == 1 and s.cache0 == "bad" and safety)
  run unknownPackageKeepsProfileTest = init.then(generate).then(selectPackage(3)).then(generate).then(verify)
    .expect(not(s.accepted) and s.profile == 1 and safety)
}
