module SettingsSession {
  type Op = { kind: str, token: int, instance: int, scaleToken: int, value: int, scale: int, other: int, failed: bool }
  type State = {
    owner: int, mounts: int, generation: int, scaleGeneration: int, scaleVersion: int, scalePending: bool,
    queue: List[Op], results: Set[Op],
    deviceScale: int, deviceOther: int,
    shownScale: int, shownOther: int, shownToken: int,
    regressed: bool, writeFailed: bool, keptSize: bool,
    held: int, latest: int, failedToken: int,
    restored: int
  }
  var s: State

  pure val Unknown = -1
  pure val Sizes = Set(75, 100, 115, 130, 150)
  pure val MaxMounts = 2
  pure val MaxGeneration = 4
  pure val MaxScaleGeneration = 3

  action init = s' = { owner: 0, mounts: 0, generation: 0, scaleGeneration: 0, scaleVersion: 0, scalePending: false, queue: List(), results: Set(),
    deviceScale: 100, deviceOther: 0, shownScale: Unknown, shownOther: Unknown, shownToken: 0,
    regressed: false, writeFailed: false, keptSize: false, held: Unknown, latest: 0, failedToken: 0, restored: 0 }
  action mount = all { s.owner == 0, s.mounts < MaxMounts, s' = { ...s, owner: s.mounts + 1, mounts: s.mounts + 1 } }
  action unmount = all { s.owner != 0,
    s' = { ...s, owner: 0, generation: s.generation + 1, scaleGeneration: s.scaleGeneration + 1,
      scaleVersion: s.scaleVersion + 1, scalePending: false, shownScale: Unknown, shownOther: Unknown,
      shownToken: 0, writeFailed: false, held: Unknown, latest: 0, failedToken: 0 } }
  pure def refreshed(v: State): State = { ...v, generation: v.generation + 1,
    queue: v.queue.append({ kind: "read", token: v.generation + 1, instance: v.owner,
      scaleToken: v.scaleVersion, value: 0, scale: 0, other: 0, failed: false }) }
  action refresh = all { s.owner != 0, s.generation < MaxGeneration, s' = refreshed(s) }
  action changeScale(value: int): bool = all { s.owner != 0, value.in(Sizes),
    s.scaleGeneration < MaxScaleGeneration,
    s' = { ...s, scaleGeneration: s.scaleGeneration + 1, scalePending: true, writeFailed: false,
      queue: s.queue.append({ kind: "write", token: s.scaleGeneration + 1, instance: s.owner,
        scaleToken: 0, value: value, scale: 0, other: 0, failed: false }) } }
  action deviceHandles(fails: bool): bool = all { s.queue.length() > 0,
    val op = s.queue.nth(0)
    val rejected = fails and op.kind == "write"
    val scale = if (op.kind == "write" and not(rejected)) op.value else s.deviceScale
    s' = { ...s, queue: s.queue.slice(1, s.queue.length()), deviceScale: scale,
      results: s.results.union(Set({ ...op, scale: scale, other: s.deviceOther, failed: rejected })) } }
  action deviceChanges = all { s.deviceOther < 2, s' = { ...s, deviceOther: s.deviceOther + 1 } }
  action settleRead(op: Op): bool = all { op.in(s.results), op.kind == "read",
    val current = s.owner == op.instance and s.generation == op.token
    val overlapped = s.scalePending or s.scaleVersion != op.scaleToken
    s' = if (not(current)) { ...s, results: s.results.exclude(Set(op)) }
      else { ...s, results: s.results.exclude(Set(op)), shownOther: op.other,
        shownScale: if (overlapped) s.shownScale else op.scale, shownToken: op.token,
        regressed: s.regressed or op.token < s.shownToken,
        keptSize: s.keptSize or overlapped } }
  action settleWrite(op: Op): bool = all { op.in(s.results), op.kind == "write",
    val dropped = { ...s, results: s.results.exclude(Set(op)) }
    val newest = s.scaleGeneration == op.token
    s' = if (s.owner != op.instance) dropped
      else if (op.failed)
        if (not(newest)) dropped
        else refreshed({ ...dropped, writeFailed: true, failedToken: op.token, held: Unknown,
          scalePending: false, scaleVersion: s.scaleVersion + 1,
          shownScale: if (s.held != Unknown) s.held else s.shownScale,
          restored: if (s.held != Unknown) 1 else s.restored })
      else if (op.token <= s.latest) dropped
      else if (newest) { ...dropped, latest: op.token, held: Unknown, shownScale: op.scale,
        scalePending: false, scaleVersion: s.scaleVersion + 1 }
      else if (s.failedToken == s.scaleGeneration)
        { ...dropped, latest: op.token, held: Unknown, shownScale: op.scale, restored: 2, scaleVersion: s.scaleVersion + 1 }
      else { ...dropped, latest: op.token, held: op.scale } }
  action step = {
    nondet value = Sizes.oneOf()
    nondet fails = Set(true, false).oneOf()
    any { mount, unmount, refresh, changeScale(value), deviceHandles(fails), deviceChanges,
      { all { s.results.size() > 0, { nondet op = s.results.oneOf() any { settleRead(op), settleWrite(op) } } } },
      s' = s }
  }

  val quiet = s.queue.length() == 0 and s.results.size() == 0
  val ShownSizeIsCurrent = quiet and s.owner != 0 and s.shownScale != Unknown
    implies s.shownScale == s.deviceScale
  val HeldIsOlderRequest = s.held != Unknown implies s.owner != 0 and s.latest > 0 and s.latest < s.scaleGeneration
  val ReadsNeverRegress = not(s.regressed)
  val UnmountedShowsNothing = s.owner == 0 implies s.shownScale == Unknown and s.shownOther == Unknown
  val ShownReadIsOwn = s.shownToken <= s.generation and (s.shownOther != Unknown implies s.shownToken > 0)
  val BoundedCounters = s.generation <= MaxGeneration + MaxScaleGeneration + MaxMounts and
    s.scaleGeneration <= MaxScaleGeneration + MaxMounts and s.owner <= s.mounts
  val safety = ShownSizeIsCurrent and HeldIsOlderRequest and ReadsNeverRegress and UnmountedShowsNothing and ShownReadIsOwn and BoundedCounters

  val OverlappedReadShownWitness = quiet and s.keptSize and s.shownScale == s.deviceScale and s.shownScale != 100
  val RetiredReadWitness = s.owner == 2 and s.shownOther == Unknown and s.generation >= 2 and s.results.size() == 0 and s.queue.length() == 0
  val FailedNewestShowsAppliedWitness = not(s.scalePending) and s.writeFailed and s.restored == 1 and s.shownScale == s.deviceScale and s.shownScale != 100
  val LateAppliedShownWitness = not(s.scalePending) and s.writeFailed and s.restored == 2 and s.shownScale == s.deviceScale and s.shownScale != 100

  pure def readOp(token: int, instance: int, scaleToken: int, scale: int, other: int): Op =
    { kind: "read", token: token, instance: instance, scaleToken: scaleToken, value: 0, scale: scale, other: other, failed: false }
  pure def writeOp(token: int, instance: int, value: int): Op =
    { kind: "write", token: token, instance: instance, scaleToken: 0, value: value, scale: value, other: 0, failed: false }

  run overlappedReadKeepsSizeTest = init.then(mount).then(refresh).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 100, 0))).expect(s.shownScale == 100)
    .then(refresh).then(deviceChanges).then(deviceHandles(false))
    .then(changeScale(130)).then(deviceHandles(false))
    .then(settleWrite({ ...writeOp(1, 1, 130), other: 1 })).expect(s.shownScale == 130)
    .then(settleRead(readOp(2, 1, 0, 100, 1)))
    .expect(s.shownScale == 130 and s.shownOther == 1 and s.deviceScale == 130 and s.keptSize and safety)
  run readAfterWriteSeesNewSizeTest = init.then(mount).then(refresh).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 100, 0))).then(changeScale(150)).then(refresh)
    .then(deviceHandles(false)).then(deviceHandles(false))
    .then(settleRead(readOp(2, 1, 0, 150, 0))).then(settleWrite(writeOp(1, 1, 150)))
    .expect(s.shownScale == 150 and safety)
  run newestSizeRequestWinsTest = init.then(mount).then(refresh).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 100, 0))).then(changeScale(115)).then(changeScale(130))
    .then(deviceHandles(false)).then(deviceHandles(false))
    .then(settleWrite(writeOp(2, 1, 130))).then(settleWrite(writeOp(1, 1, 115)))
    .expect(s.shownScale == 130 and s.deviceScale == 130 and safety)
  run supersededReadIsDroppedTest = init.then(mount).then(refresh).then(refresh)
    .then(deviceHandles(false)).then(deviceChanges).then(deviceHandles(false))
    .then(settleRead(readOp(2, 1, 0, 100, 1))).then(settleRead(readOp(1, 1, 0, 100, 0)))
    .expect(s.shownOther == 1 and s.shownToken == 2 and safety)
  run unmountRetiresReadTest = init.then(mount).then(refresh).then(deviceHandles(false)).then(unmount).then(mount)
    .then(settleRead(readOp(1, 1, 0, 100, 0)))
    .expect(s.owner == 2 and s.shownScale == Unknown and s.shownOther == Unknown and safety)
  run failedNewestShowsAppliedSizeTest = init.then(mount).then(refresh).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 100, 0))).then(changeScale(115)).then(changeScale(130))
    .then(deviceHandles(false)).then(deviceHandles(true)).expect(s.deviceScale == 115)
    .then(settleWrite(writeOp(1, 1, 115))).expect(s.shownScale == 100 and s.held == 115)
    .then(settleWrite({ ...writeOp(2, 1, 130), scale: 115, failed: true }))
    .expect(s.shownScale == 115 and s.deviceScale == 115 and s.writeFailed and s.held == Unknown and safety)
  run appliedSizeAfterFailureIsShownTest = init.then(mount).then(refresh).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 100, 0))).then(changeScale(115)).then(changeScale(130))
    .then(deviceHandles(false)).then(deviceHandles(true))
    .then(settleWrite({ ...writeOp(2, 1, 130), scale: 115, failed: true }))
    .expect(s.shownScale == 100 and s.writeFailed)
    .then(settleWrite(writeOp(1, 1, 115)))
    .expect(s.shownScale == 115 and s.deviceScale == 115 and s.restored == 2 and safety)
  run sizeChoiceBeforeReadTest = init.then(mount).then(changeScale(115)).then(refresh)
    .then(deviceHandles(false)).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 115, 0)))
    .expect(s.shownScale == Unknown and s.scalePending and safety)
    .then(settleWrite(writeOp(1, 1, 115)))
    .expect(s.shownScale == 115 and not(s.scalePending) and s.scaleVersion == 1 and safety)
  run failedChoiceBeforeReadRefetchesTest = init.then(mount).then(changeScale(130)).then(deviceHandles(true))
    .then(settleWrite({ ...writeOp(1, 1, 130), scale: 100, failed: true }))
    .expect(s.generation == 1 and s.queue.length() == 1 and not(s.scalePending) and safety)
    .then(deviceHandles(false)).then(settleRead(readOp(1, 1, 1, 100, 0)))
    .expect(s.shownScale == 100 and s.shownOther == 0 and safety)
  run failedNewestRefetchSettlesCurrentSizeTest = init.then(mount).then(refresh).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 100, 0))).then(changeScale(115)).then(changeScale(130))
    .then(deviceHandles(false)).then(deviceHandles(true)).then(settleWrite(writeOp(1, 1, 115)))
    .then(settleWrite({ ...writeOp(2, 1, 130), scale: 115, failed: true }))
    .then(deviceHandles(false)).then(settleRead(readOp(2, 1, 1, 115, 0)))
    .expect(quiet and s.restored == 1 and s.shownScale == 115 and s.deviceScale == 115 and safety)
  run lateAppliedRefetchSettlesCurrentSizeTest = init.then(mount).then(refresh).then(deviceHandles(false))
    .then(settleRead(readOp(1, 1, 0, 100, 0))).then(changeScale(115)).then(changeScale(130))
    .then(deviceHandles(false)).then(deviceHandles(true))
    .then(settleWrite({ ...writeOp(2, 1, 130), scale: 115, failed: true })).then(settleWrite(writeOp(1, 1, 115)))
    .then(deviceHandles(false)).then(settleRead(readOp(2, 1, 1, 115, 0)))
    .expect(quiet and s.restored == 2 and s.shownScale == 115 and s.deviceScale == 115 and safety)
}
