/// AssistantDraftController as production drives it: read-only open with bounded retry,
/// queued edits bound to their conversation, conflict review, and consume with stale-receipt undo.
module DraftDispatch {
  type State = {
    key: int, bind: int, opening: bool, ready: bool, failed: bool, conflict: bool, error: bool,
    consuming: bool, loadStage: str, attempt: int, initial: str, composer: str, last: str,
    recordText: str, recordRev: int, savedText: str, edits: int, foreign: int,
    textOne: str, revOne: int, textTwo: str, revTwo: int,
    queued: bool, queuedKey: int, queuedBind: int, queuedText: str, queuedRev: int,
    consumeStage: str, consumeKey: int, consumeBind: int, consumeRev: int, expected: str,
    original: str, undoText: str, outcome: str, handoffs: int }
  var s: State
  // Revision 0 is a conversation with no saved record.
  pure def storeText(st: State, k: int): str = if (k == 1) st.textOne else st.textTwo
  pure def storeRev(st: State, k: int): int = if (k == 1) st.revOne else st.revTwo
  pure def write(st: State, k: int, text: str): State =
    if (k == 1) { ...st, textOne: text, revOne: st.revOne + 1 }
    else { ...st, textTwo: text, revTwo: st.revTwo + 1 }
  // edit(): remembers the text; a write is queued only for a ready, unpaused binding.
  pure def edited(st: State, text: str): State =
    if (st.key == 0 or text == st.last) st
    else if (not(st.ready) or st.failed or st.consuming) { ...st, last: text }
    else { ...st, last: text, queued: true, queuedKey: st.key, queuedBind: st.bind,
      queuedText: text, queuedRev: st.recordRev }
  // reviewConflict(): reread the saved copy, or report that it could not be read.
  pure def reviewed(st: State, readable: bool): State =
    if (readable) { ...st, recordText: storeText(st, st.key), recordRev: storeRev(st, st.key),
      opening: false, conflict: true, error: false, savedText: storeText(st, st.key) }
    else { ...st, opening: false, conflict: false, error: true }
  pure def bound(st: State, k: int): State =
    { ...st, key: k, bind: st.bind + 1, opening: true, ready: false, failed: false, conflict: false,
      error: false, consuming: false, loadStage: "reading", attempt: 0, initial: st.composer,
      last: st.composer, recordText: "", recordRev: 0, outcome: "none" }
  // The model keeps one pending write; a newer binding waits for an older binding's write.
  val slotFree = not(s.queued) or s.queuedBind == s.bind

  action init = s' = { key: 0, bind: 0, opening: true, ready: false, failed: false, conflict: false,
    error: false, consuming: false, loadStage: "none", attempt: 0, initial: "", composer: "", last: "",
    recordText: "", recordRev: 0, savedText: "", edits: 0, foreign: 0,
    textOne: "A", revOne: 1, textTwo: "", revTwo: 0,
    queued: false, queuedKey: 0, queuedBind: 0, queuedText: "", queuedRev: 0,
    consumeStage: "none", consumeKey: 0, consumeBind: 0, consumeRev: 0, expected: "", original: "",
    undoText: "", outcome: "none", handoffs: 0 }
  action open(k: int): bool = all { k != s.key, s.bind < 4, s' = bound(s, k) }
  action retry = all { s.key != 0, s.bind < 4, s' = bound(s, s.key) }
  // A transient open failure is retried twice; the third failure is reported and nothing is written.
  action readFailed = all { s.loadStage == "reading",
    s' = if (s.attempt == 2) { ...s, loadStage: "none", failed: true, opening: false, error: true }
      else { ...s, attempt: s.attempt + 1 } }
  action readOk = all { s.loadStage == "reading", slotFree,
    s' = if (s.composer != s.initial or s.initial != "")
        if (storeRev(s, s.key) > 0 and storeText(s, s.key) != s.composer)
          { ...s, recordText: storeText(s, s.key), recordRev: storeRev(s, s.key), ready: true, failed: true,
            opening: false, conflict: true, savedText: storeText(s, s.key), loadStage: "none" }
        else edited({ ...s, recordText: storeText(s, s.key), recordRev: storeRev(s, s.key), ready: true,
          opening: false, loadStage: "none", last: storeText(s, s.key) }, s.composer)
      else { ...s, recordText: storeText(s, s.key), recordRev: storeRev(s, s.key),
        last: storeText(s, s.key), loadStage: "restoring" } }
  // The restore lands in the UI later; typing in between is kept and compared with the saved copy.
  action restoreCommitted = all { s.loadStage == "restoring", slotFree,
    s' = if (s.composer == s.initial)
        { ...s, composer: s.recordText, ready: true, loadStage: "none", opening: false, outcome: "none" }
      else if (s.composer == s.recordText) { ...s, ready: true, loadStage: "none", opening: false }
      else if (s.recordRev > 0)
        { ...s, ready: true, loadStage: "none", failed: true, opening: false, conflict: true, savedText: s.recordText }
      else edited({ ...s, ready: true, loadStage: "none", opening: false, last: s.recordText }, s.composer) }
  action typeText(text: str): bool = all { text != s.composer, s.edits < 4, slotFree,
    s' = edited({ ...s, composer: text, edits: s.edits + 1, outcome: "none" }, text) }
  // The queued write runs against the binding that queued it, also after that binding was retired.
  action flush(ok: bool, readable: bool): bool = all { s.queued,
    s' = if (s.queuedBind == s.bind and s.failed) { ...s, queued: false }
      else if (ok and storeRev(s, s.queuedKey) == s.queuedRev)
        if (s.queuedBind == s.bind)
          { ...write(s, s.queuedKey, s.queuedText), queued: false, outcome: "none",
            recordText: s.queuedText, recordRev: s.queuedRev + 1 }
        else { ...write(s, s.queuedKey, s.queuedText), queued: false, outcome: "none" }
      else if (s.queuedBind == s.bind) reviewed({ ...s, queued: false, failed: true }, readable)
      else { ...s, queued: false } }
  action externalSave(k: int): bool = all { s.foreign < 2,
    s' = { ...write(s, k, "X"), foreign: s.foreign + 1, outcome: "none" } }
  action restoreSaved = all { s.ready, s.conflict,
    s' = { ...s, failed: false, last: s.recordText, composer: s.recordText, conflict: false, outcome: "none" } }
  action keepCurrent = all { s.ready, s.conflict, slotFree,
    s' = edited({ ...s, failed: false, last: s.recordText, conflict: false, error: false }, s.composer) }
  // consume(): the caller's text leaves the composer only after its saved copy was cleared.
  action consumeBegin = all { s.key != 0, s.ready, not(s.failed), not(s.consuming), s.composer != "",
    not(s.queued and s.queuedBind == s.bind), s.consumeStage == "none",
    s' = { ...s, consuming: true, consumeStage: "clearing", consumeKey: s.key, consumeBind: s.bind,
      consumeRev: s.recordRev, expected: s.composer,
      original: if (s.recordRev > 0) s.recordText else s.composer } }
  action consumeCleared(ok: bool, readable: bool): bool = all { s.consumeStage == "clearing",
    s' = if (not(ok) or storeRev(s, s.consumeKey) != s.consumeRev)
        if (s.consumeBind == s.bind)
          reviewed({ ...s, consumeStage: "none", consuming: false, failed: true, outcome: "failed" }, readable)
        else { ...s, consumeStage: "none", outcome: "failed" }
      else if (s.consumeBind == s.bind and s.composer == s.expected)
        { ...write(s, s.consumeKey, ""), recordText: "", recordRev: s.consumeRev + 1, last: "", composer: "",
          consuming: false, consumeStage: "none", outcome: "consumed", handoffs: s.handoffs + 1 }
      // A receipt that is no longer current undoes its own clear and hands nothing off.
      else if (s.consumeBind == s.bind)
        reviewed({ ...write(write(s, s.consumeKey, ""), s.consumeKey, s.composer), consuming: false,
          failed: true, consumeStage: "none", outcome: "changed", undoText: s.composer }, readable)
      else { ...write(write(s, s.consumeKey, ""), s.consumeKey, s.original), consumeStage: "none",
        outcome: "changed", undoText: s.original } }
  action step = {
    nondet k = Set(1, 2).oneOf()
    nondet text = Set("", "A", "B").oneOf()
    nondet ok = Set(false, true).oneOf()
    nondet readable = Set(false, true).oneOf()
    any { open(k), retry, readFailed, readOk, restoreCommitted, typeText(text), flush(ok, readable),
      externalSave(k), restoreSaved, keepCurrent, consumeBegin, consumeCleared(ok, readable), s' = s }
  }

  val OpenRetriesBounded = s.attempt.in(0.to(2)) and (s.loadStage != "none" implies (s.opening and not(s.ready)))
  val OpeningIsReadOnly = s.opening implies not(s.queued and s.queuedBind == s.bind)
  val ConflictPausesWrites = s.conflict implies (s.ready and s.failed and not(s.opening))
  val ConsumeOwnsBinding = s.consuming implies (s.consumeStage == "clearing" and s.consumeBind == s.bind and
    not(s.queued and s.queuedBind == s.bind))
  val HandoffClearsDraft = s.outcome == "consumed" implies
    (storeText(s, s.consumeKey) == "" and s.composer == "" and s.last == "")
  val StaleReceiptUndone = s.outcome == "changed" implies storeText(s, s.consumeKey) == s.undoText
  val OneHandoffPerConsume = s.handoffs <= s.bind and (s.consumeStage == "clearing" implies s.expected != "")
  val safety = OpenRetriesBounded and OpeningIsReadOnly and ConflictPausesWrites and ConsumeOwnsBinding and
    HandoffClearsDraft and StaleReceiptUndone and OneHandoffPerConsume

  val ConflictWitness = s.conflict
  val OpenFailedWitness = s.error and s.attempt == 2 and not(s.opening)
  val HandoffWitness = s.outcome == "consumed"
  val StaleReceiptWitness = s.outcome == "changed"
  val RetiredWriteWitness = s.queued and s.queuedBind != s.bind

  run openedSetup = init.then(open(1)).then(readOk).then(restoreCommitted)
  run openingRetryTest = init.then(open(1)).then(readFailed).then(readFailed).then(readOk).then(restoreCommitted)
    .expect(s.attempt == 2 and s.ready and not(s.opening) and s.composer == "A" and not(s.queued) and safety)
  run openFailureKeepsTextTest = init.then(typeText("B")).then(open(1)).then(readFailed).then(readFailed)
    .then(readFailed).expect(s.error and s.failed and s.composer == "B" and s.textOne == "A" and not(s.queued) and safety)
    .then(retry).then(readOk).expect(s.conflict and s.savedText == "A" and s.composer == "B" and safety)
  run typedDuringOpenKeepsBothTest = init.then(open(1)).then(typeText("B")).then(readOk)
    .expect(s.conflict and s.savedText == "A" and s.composer == "B" and s.textOne == "A" and not(s.queued) and safety)
    .then(keepCurrent).then(flush(true, true)).expect(s.textOne == "B" and not(s.conflict) and safety)
  run restoreSavedTest = init.then(open(1)).then(typeText("B")).then(readOk).then(restoreSaved)
    .expect(s.composer == "A" and s.textOne == "A" and not(s.queued) and not(s.failed) and safety)
  run consumeHandoffTest = openedSetup.then(consumeBegin).then(consumeCleared(true, true))
    .expect(s.outcome == "consumed" and s.textOne == "" and s.composer == "" and s.handoffs == 1 and safety)
  run staleReceiptUndoTest = openedSetup.then(consumeBegin).then(typeText("B")).then(consumeCleared(true, true))
    .expect(s.outcome == "changed" and s.textOne == "B" and s.composer == "B" and s.handoffs == 0 and
      s.conflict and safety)
  run consumeAfterSwitchKeepsOriginalTest = openedSetup.then(consumeBegin).then(open(2)).then(consumeCleared(true, true))
    .expect(s.textOne == "A" and s.handoffs == 0 and s.key == 2 and not(s.conflict) and safety)
  run failedSaveReviewsConflictTest = openedSetup.then(typeText("B")).then(externalSave(1)).then(flush(true, true))
    .expect(s.conflict and s.savedText == "X" and s.composer == "B" and s.textOne == "X" and safety)
  run retiredWriteKeepsBindingTest = openedSetup.then(typeText("B")).then(open(2)).then(flush(true, true))
    .expect(s.textOne == "B" and s.textTwo == "" and safety)
}
