module WorkflowMetadataEdit {
  type Edit = {
    version: int, name: int, knownVersion: int, knownName: int, opened: bool,
    editor: bool, editorVersion: int,
    intent: bool, intentVersion: int, busy: bool, stage: str,
    wire: int, wireId: int, wireVersion: int, reply: str,
    receipts: Set[int], seen: bool, checked: bool, sent: int, admissions: int, applications: int
  }
  var s: Edit
  action init = s' = {
    version: 0, name: 0, knownVersion: 0, knownName: 0, opened: true,
    editor: false, editorVersion: 0,
    intent: false, intentVersion: 0, busy: false, stage: "idle",
    wire: 0, wireId: 0, wireVersion: 0, reply: "none",
    receipts: Set(), seen: false, checked: false, sent: 0, admissions: 0, applications: 0 }
  pure def appliedThis(v: Edit): bool = v.receipts.contains(v.admissions)
  pure def reread(v: Edit): Edit = { ...v, knownVersion: v.version, knownName: v.name }
  pure def settled(v: Edit): Edit = { ...v, busy: false, stage: "idle", reply: "none" }
  action editTap = all {
    s.opened, not(s.busy), not(s.intent), not(s.editor),
    s' = { ...s, editor: true, editorVersion: s.knownVersion }
  }
  action saveTap = all {
    s.editor, not(s.busy), not(s.intent), s.admissions < 3,
    s' = { ...s, intent: true, intentVersion: s.editorVersion, busy: true, stage: "admitted",
      reply: "none", seen: false, checked: false, sent: 0, admissions: s.admissions + 1 }
  }
  action dispatch = all {
    s.busy, s.stage == "admitted",
    s' = { ...s, stage: "sent", wire: 1, wireId: s.admissions, wireVersion: s.intentVersion, sent: 1 }
  }
  action serverApply = all {
    s.wire > 0, not(s.receipts.contains(s.wireId)), s.version == s.wireVersion,
    s' = { ...s, wire: 0, version: s.version + 1, name: s.wireId,
      receipts: s.receipts.union(Set(s.wireId)), applications: s.applications + 1,
      reply: if (s.stage == "sent" and s.wireId == s.admissions) "ok" else s.reply }
  }
  action serverReject = all {
    s.wire > 0, not(s.receipts.contains(s.wireId)), s.version != s.wireVersion,
    s' = { ...s, wire: 0, reply: if (s.stage == "sent" and s.wireId == s.admissions) "rejected" else s.reply }
  }
  action requestLost = all { s.wire > 0, s' = { ...s, wire: 0 } }
  action successReply = all {
    s.busy, s.stage == "sent", s.reply == "ok",
    s' = { ...reread(settled(s)), intent: false, editor: false, seen: true }
  }
  action rejectedReply = all {
    s.busy, s.stage == "sent", s.reply == "rejected",
    s' = { ...reread(settled(s)), intent: false, editor: false }
  }
  action unknownReply = all { s.busy, s.stage == "sent", s' = settled(s) }
  action refresh = all {
    not(s.busy),
    val read = { ...reread(s), opened: true, editor: false, checked: true }
    if (not(s.intent)) s' = read
    else if (appliedThis(s)) s' = { ...read, intent: false, seen: true }
    else if (s.version != s.intentVersion) s' = { ...read, intent: false }
    else s' = read
  }
  action back = all {
    s.editor,
    if (s.stage == "admitted") s' = { ...settled(s), intent: false, editor: false }
    else s' = { ...settled(s), editor: false }
  }
  action remoteEdit = all { s.version < 4, s.version - s.applications < 2, s' = { ...s, version: s.version + 1 } }
  action restart = all {
    s.opened,
    s' = { ...settled(s), opened: false, editor: false, checked: false }
  }
  action step = any {
    editTap, saveTap, dispatch, serverApply, serverReject, requestLost, successReply,
    rejectedReply, unknownReply, refresh, back, remoteEdit, restart, s' = s
  }
  val AppliedOncePerEdit = s.applications == s.receipts.size() and s.applications <= s.admissions
  val ReleasedRequestCannotApply = s.wire > 0 and not(s.intent)
    implies s.version != s.wireVersion or s.receipts.contains(s.wireId)
  val UnseenChangeStaysRetained = appliedThis(s) and not(s.seen) implies s.intent
  val BusyHoldsEntry = s.busy implies s.intent and s.stage != "idle"
  val EditorIsOfReadVersion = s.editor implies s.opened and s.editorVersion == s.knownVersion
  val OneCopyPerEdit = s.sent <= 1 and s.wire <= 1 and (s.wire > 0 and s.wireId == s.admissions implies s.sent == 1)
  val NameIsAnAppliedChange = s.name == 0 or s.receipts.contains(s.name)
  val TypeOK = s.stage.in(Set("idle", "admitted", "sent")) and s.reply.in(Set("none", "ok", "rejected"))
    and s.version.in(0.to(5)) and s.admissions.in(0.to(3)) and s.receipts.subseteq(1.to(3))
  val safety = TypeOK and AppliedOncePerEdit and ReleasedRequestCannotApply and UnseenChangeStaysRetained
    and BusyHoldsEntry and EditorIsOfReadVersion and OneCopyPerEdit and NameIsAnAppliedChange
  val AppliedUnconfirmedWitness = s.intent and appliedThis(s) and not(s.seen) and not(s.busy)
  val LateRequestReleasedWitness = s.wire > 0 and not(s.intent)
  val NeverSentStaysLockedWitness = s.intent and s.checked and not(s.busy) and s.sent == 0
    and s.version == s.intentVersion
  val RenamedTwiceWitness = s.applications == 2 and s.knownName == 2 and not(s.intent)
  run savedNameTest = init.then(editTap).then(saveTap).then(dispatch).then(serverApply).then(successReply)
    .expect(s.name == 1 and s.knownName == 1 and not(s.intent) and not(s.editor) and safety)
  run lostReplyReconciledTest = init.then(editTap).then(saveTap).then(dispatch).then(serverApply)
    .then(unknownReply).expect(s.intent and s.editor and s.knownName == 0 and safety)
    .then(refresh).expect(not(s.intent) and s.seen and s.knownName == 1 and safety)
    .then(editTap).then(saveTap).then(dispatch).then(serverApply).then(successReply)
    .expect(s.applications == 2 and s.knownName == 2 and safety)
  run changedVersionReleasesTest = init.then(editTap).then(saveTap).then(dispatch).then(unknownReply)
    .then(remoteEdit).then(refresh).expect(not(s.intent) and s.wire == 1 and safety)
    .then(serverReject).expect(s.name == 0 and s.applications == 0 and safety)
  run refusedEditReleasesTest = init.then(editTap).then(saveTap).then(remoteEdit).then(dispatch)
    .then(serverReject).then(rejectedReply)
    .expect(not(s.intent) and not(s.editor) and s.knownVersion == 1 and s.name == 0 and safety)
  run neverSentStaysLockedTest = init.then(editTap).then(saveTap).then(restart).then(refresh)
    .expect(NeverSentStaysLockedWitness and safety)
    .then(editTap.fail())
  run retainedBlocksSaveTest = init.then(editTap).then(saveTap).then(dispatch).then(requestLost)
    .then(unknownReply).expect(s.editor and s.intent and safety)
    .then(saveTap.fail())
  run leaveBeforeDispatchReleasesTest = init.then(editTap).then(saveTap).then(back)
    .expect(not(s.intent) and s.sent == 0 and s.wire == 0 and not(s.busy) and safety)
  run leaveAfterDispatchRetainsTest = init.then(editTap).then(saveTap).then(dispatch).then(back)
    .expect(s.intent and not(s.busy) and not(s.editor) and safety)
    .then(serverApply).expect(s.name == 1 and s.intent and safety)
    .then(refresh).expect(not(s.intent) and s.seen and s.knownName == 1 and safety)
}
