module PendingActionRecovery {
  type State = { binding: int, blocked: bool, key: int, failedKey: int, read: bool, readKey: int,
    timer: int, expiring: int, reads: int, triggers: int, applied: int, appliedKey: int, dropped: int }
  var s: State
  pure val None = -1
  pure def armed(st: State, key: int): State = { ...st, timer: if (st.expiring > 0) key else None }
  pure def synced(st: State): State = {
    val wanted = if (st.blocked) None else st.binding
    val cleared = if (wanted == None) { ...st, failedKey: None } else st
    if (cleared.key == wanted or (wanted != None and cleared.failedKey == wanted)) cleared
    else if (wanted == None) { ...cleared, failedKey: None, key: None, read: false, timer: None }
    else { ...cleared, failedKey: None, key: wanted, read: true, readKey: wanted, timer: None, reads: cleared.reads + 1 }
  }

  action init = s' = { binding: 0, blocked: false, key: None, failedKey: None, read: false, readKey: None,
    timer: None, expiring: 0, reads: 0, triggers: 0, applied: 0, appliedKey: None, dropped: 0 }
  action sync = s' = synced(s)
  action bindingChanged = all { s.binding < 3, s' = { ...s, binding: s.binding + 1, triggers: s.triggers + 1 } }
  action block = all { not(s.blocked), s' = synced({ ...s, blocked: true }) }
  action unblock = all { s.blocked, s.triggers < 6, s' = synced({ ...s, blocked: false, triggers: s.triggers + 1 }) }
  action readSettles(ok: bool, cards: int): bool = all { s.read,
    s' = if (s.blocked or s.binding != s.readKey or s.key != s.readKey) { ...s, read: false, dropped: s.dropped + 1 }
      else if (ok) armed({ ...s, read: false, applied: s.applied + 1, appliedKey: s.readKey, expiring: cards }, s.readKey)
      else armed({ ...s, read: false, key: None, failedKey: s.readKey }, s.readKey) }
  action timerFires = all { s.timer != None,
    s' = if (s.blocked or s.binding != s.timer) { ...s, timer: None }
      else if (s.failedKey == s.timer) armed({ ...s, expiring: s.expiring - 1 }, s.timer)
      else synced({ ...s, timer: None, expiring: s.expiring - 1, key: None, triggers: s.triggers + 1 }) }
  action continuation = all { s.triggers < 6,
    s' = synced({ ...s, key: None, failedKey: None, triggers: s.triggers + 1 }) }
  action step = {
    nondet ok = Set(false, true).oneOf()
    nondet cards = Set(0, 1, 2).oneOf()
    any { sync, bindingChanged, block, unblock, readSettles(ok, cards), timerFires, continuation, s' = s }
  }

  val NoRetryPolling = s.reads <= s.triggers + 1
  val FailedKeyNotRead = s.failedKey != None implies (s.key != s.failedKey and not(s.read and s.readKey == s.failedKey))
  val ReadBelongsToKey = s.read implies s.readKey == s.key
  val TimerBelongsToKey = s.timer != None implies
    (s.expiring > 0 and (s.timer == s.key or s.timer == s.failedKey or (s.blocked and s.key == None)))
  val BlockedHoldsNothing = s.blocked implies (s.key == None and s.failedKey == None and not(s.read))
  val AppliedWasRead = s.applied + s.dropped <= s.reads and s.appliedKey <= s.binding and s.expiring >= 0
  val safety = NoRetryPolling and FailedKeyNotRead and ReadBelongsToKey and TimerBelongsToKey and
    BlockedHoldsNothing and AppliedWasRead

  val FailedQuietWitness = s.failedKey == s.binding and not(s.read) and s.timer != None
  val StaleResultDroppedWitness = s.dropped > 0 and s.applied == 0
  val ExpiryRereadWitness = s.applied == 2 and s.reads == 2 and s.binding == 0 and s.triggers == 1

  run recoveredOnceTest = init.then(sync).expect(s.read and s.reads == 1).then(sync).then(readSettles(true, 0))
    .then(sync).then(sync).expect(s.reads == 1 and s.applied == 1 and s.timer == None and safety)
  run failedReadDoesNotPollTest = init.then(sync).then(readSettles(true, 2)).then(continuation)
    .expect(s.reads == 2).then(readSettles(false, 0))
    .expect(s.failedKey == 0 and s.key == None and s.timer == 0 and safety)
    .then(sync).then(sync).expect(s.reads == 2 and not(s.read) and safety)
    .then(timerFires).expect(s.reads == 2 and s.expiring == 1 and s.timer == 0 and safety)
    .then(bindingChanged).then(sync).expect(s.reads == 3 and s.failedKey == None and s.timer == None and safety)
  run staleResultDroppedTest = init.then(sync).then(bindingChanged).then(readSettles(true, 1))
    .expect(s.applied == 0 and s.dropped == 1 and s.expiring == 0 and safety)
    .then(sync).expect(s.read and s.readKey == 1 and s.reads == 2 and safety)
  run expiryReadsAgainOnceTest = init.then(sync).then(readSettles(true, 1)).expect(s.timer == 0)
    .then(timerFires).expect(s.read and s.reads == 2 and s.expiring == 0 and s.timer == None and safety)
    .then(readSettles(true, 0)).then(sync).expect(s.reads == 2 and s.timer == None and safety)
  run blockedForgetsFailureTest = init.then(sync).then(readSettles(false, 0)).then(block)
    .expect(s.failedKey == None and s.key == None and safety).then(unblock)
    .expect(s.read and s.reads == 2 and safety)
  run blockedDropsReadInFlightTest = init.then(sync).then(block).expect(not(s.read) and s.key == None and safety)
    .then(unblock).then(readSettles(true, 0)).expect(s.applied == 1 and s.reads == 2 and safety)
}
