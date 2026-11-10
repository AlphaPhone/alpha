// The notification shade's copy of Alpha Phone's notices: epoch-fenced refreshes, the pressed
// notice offered as agent context, and a reviewed question about one notice.
module ShadeNotices {
  type Shade = {
    live: bool, hidden: bool, shade: bool, epoch: int, busy: bool, capturedEpoch: int,
    nativePresent: bool, nativeRev: int, shownPresent: bool, shownRev: int, shownEpoch: int,
    selection: int, question: int, checking: bool, checkEpoch: int, failed: bool,
    composed: bool, composedRev: int, composedNativeRev: int,
    dismissedRev: int, dismissedNativeRev: int
  }
  var s: Shade
  action init = s' = {
    live: true, hidden: false, shade: false, epoch: 0, busy: false, capturedEpoch: 0,
    nativePresent: false, nativeRev: 0, shownPresent: false, shownRev: 0, shownEpoch: 0,
    selection: -1, question: -1, checking: false, checkEpoch: 0, failed: false,
    composed: false, composedRev: -1, composedNativeRev: -1,
    dismissedRev: -1, dismissedNativeRev: -1 }
  /// The reviewed notice is still the one shown, in an open shade on a visible page.
  val ReviewCurrent = s.live and not(s.hidden) and s.shade and s.shownPresent and s.shownRev == s.question
  // A notice is posted, or replaced by a new revision.
  action nativePost = all { s.nativeRev < 3, s' = { ...s, nativePresent: true, nativeRev: s.nativeRev + 1 } }
  action nativeRemove = all { s.nativePresent, s' = { ...s, nativePresent: false } }
  action openShade = all { s.live, not(s.shade), s' = { ...s, shade: true } }
  // A press or a review from one shade session never carries into the next.
  action closeShade = all { s.shade, s' = { ...s, shade: false, selection: -1, question: -1 } }
  action beginRefresh = all {
    s.live, not(s.hidden), not(s.busy), s.shade,
    s' = { ...s, busy: true, capturedEpoch: s.epoch }
  }
  // A list read under an earlier epoch is dropped. A failed read empties the shade once.
  action refreshReply(listed: bool): bool = all {
    s.busy,
    if (not(s.live) or s.hidden or s.capturedEpoch != s.epoch) s' = { ...s, busy: false }
    else if (listed) s' = { ...s, busy: false, failed: false, shownPresent: s.nativePresent,
      shownRev: s.nativeRev, shownEpoch: s.epoch,
      selection: if (s.nativePresent and s.nativeRev == s.selection) s.selection else -1 }
    else s' = { ...s, busy: false, failed: true, shownPresent: false, selection: -1 }
  }
  action hide = all {
    s.live, not(s.hidden), s.epoch < 5,
    s' = { ...s, hidden: true, epoch: s.epoch + 1, shownPresent: false, selection: -1 }
  }
  action show = all { s.hidden, s.epoch < 5, s' = { ...s, hidden: false, epoch: s.epoch + 1 } }
  // The device was locked or unlocked. Titles shown before the change are discarded.
  action deviceState = all {
    s.live, s.epoch < 5,
    s' = { ...s, epoch: s.epoch + 1, question: -1, shownPresent: false, selection: -1 }
  }
  action press = all {
    s.live, s.shade, not(s.hidden), s.shownPresent,
    s' = { ...s, selection: s.shownRev }
  }
  action ask = all {
    s.live, s.shade, not(s.hidden), s.shownPresent, not(s.checking),
    s' = { ...s, selection: s.shownRev, question: s.shownRev }
  }
  // Continuing reads the list again before anything reaches the conversation draft.
  action composeBegin = all {
    s.question != -1, not(s.checking),
    if (ReviewCurrent) s' = { ...s, checking: true, checkEpoch: s.epoch }
    else s' = { ...s, question: -1 }
  }
  action composeReply(listed: bool): bool = all {
    s.checking,
    val same = listed and s.checkEpoch == s.epoch and ReviewCurrent
      and s.nativePresent and s.nativeRev == s.question
    s' = { ...s, checking: false, question: -1, composed: s.composed or same,
      composedRev: if (same) s.question else s.composedRev,
      composedNativeRev: if (same) s.nativeRev else s.composedNativeRev }
  }
  // The platform acts only on the exact revision that was shown.
  action dismiss = all {
    s.live, s.shade, not(s.hidden), s.shownPresent,
    if (s.nativePresent and s.nativeRev == s.shownRev)
      s' = { ...s, nativePresent: false, dismissedRev: s.shownRev, dismissedNativeRev: s.nativeRev }
    else s' = s
  }
  action unmount = all {
    s.live,
    s' = { ...s, live: false, shade: false, epoch: s.epoch + 1, selection: -1, question: -1 }
  }
  action step = any {
    nativePost, nativeRemove, openShade, closeShade, beginRefresh, refreshReply(true),
    refreshReply(false), hide, show, deviceState, press, ask, composeBegin, composeReply(true),
    composeReply(false), dismiss, unmount, s' = s
  }
  val ShownIsCurrentEpoch = s.shownPresent and s.live implies s.shownEpoch == s.epoch and not(s.hidden)
  val SelectionShown = s.selection != -1 implies s.shade and s.shownPresent and s.selection == s.shownRev
  val HiddenShowsNothing = s.hidden implies not(s.shownPresent) and s.selection == -1
  val QuestionNeedsShade = s.question != -1 implies s.shade and s.live
  val ComposeMatchesNotice = s.composed implies s.composedRev == s.composedNativeRev and s.composedRev > 0
  val DismissExactRevision = s.dismissedRev == s.dismissedNativeRev
  val TypeOK = s.epoch.in(0.to(6)) and s.nativeRev.in(0.to(3)) and s.selection.in((-1).to(3)) and s.question.in((-1).to(3))
  val safety = TypeOK and ShownIsCurrentEpoch and SelectionShown and HiddenShowsNothing
    and QuestionNeedsShade and ComposeMatchesNotice and DismissExactRevision
  val StaleRefreshWitness = s.busy and s.capturedEpoch != s.epoch and s.live
  val ReplacedWhileShownWitness = s.shownPresent and s.nativePresent and s.nativeRev != s.shownRev and s.selection == s.shownRev
  val QuestionOnReplacedNoticeWitness = s.question != -1 and s.nativeRev != s.question
  val StaleComposeCheckWitness = s.checking and s.checkEpoch != s.epoch
  // The device locks while the list is being read. The titles read before the lock are not shown.
  run staleRefreshDroppedTest = init.then(nativePost).then(openShade).then(beginRefresh)
    .then(deviceState).then(refreshReply(true)).expect(not(s.shownPresent) and not(s.busy) and safety)
    .then(beginRefresh).then(refreshReply(true)).expect(s.shownPresent and safety)
  // The notice changes after it was reviewed. Nothing is added to the conversation.
  run updatedNoticeNotComposedTest = init.then(nativePost).then(openShade).then(beginRefresh)
    .then(refreshReply(true)).then(ask).then(nativePost).then(composeBegin).then(composeReply(true))
    .expect(not(s.composed) and s.question == -1 and safety)
  run currentNoticeComposedTest = init.then(nativePost).then(openShade).then(beginRefresh)
    .then(refreshReply(true)).then(ask).then(composeBegin).then(composeReply(true))
    .expect(s.composed and s.composedRev == 1 and safety)
  run lockDuringComposeCheckTest = init.then(nativePost).then(openShade).then(beginRefresh)
    .then(refreshReply(true)).then(ask).then(composeBegin).then(deviceState).then(composeReply(true))
    .expect(not(s.composed) and safety)
  run replacedSelectionDroppedTest = init.then(nativePost).then(openShade).then(beginRefresh)
    .then(refreshReply(true)).then(press).expect(s.selection == 1)
    .then(nativePost).then(beginRefresh).then(refreshReply(true))
    .expect(s.selection == -1 and s.shownRev == 2 and safety)
  run staleDismissRefusedTest = init.then(nativePost).then(openShade).then(beginRefresh)
    .then(refreshReply(true)).then(nativePost).then(dismiss)
    .expect(s.nativePresent and s.dismissedRev == -1 and safety)
    .then(beginRefresh).then(refreshReply(true)).then(dismiss)
    .expect(not(s.nativePresent) and s.dismissedRev == 2 and safety)
}
