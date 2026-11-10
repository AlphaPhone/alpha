// Permitted and app-owned media: per-read fences, reviewed library changes, direct capture
// publication, the scan frame's keep commit and what a hidden page clears.
// Item 1 is a permitted library item; item 2 is a capture this app owns.
module MediaLifecycle {
  type Read = { pending: bool, epoch: int, ticket: int, id: int }
  type State = {
    scope: str, locked: bool, foreground: bool, picker: bool, epoch: int, revision: int,
    selection: int, ticket: int, read: Read, loaded: int, playback: bool,
    permittedRows: int, ownedRows: int, ownedCommitted: int,
    review: bool, reviewRevision: int, reviewAge: int,
    acting: bool, actingRevision: int, appliedRevision: int, appliedReviewed: int,
    frame: bool, frameReviewed: bool, publish: str, cacheStale: bool, recording: bool,
    hiddenUnderPicker: bool
  }
  var s: State
  pure val noRead: Read = { pending: false, epoch: -1, ticket: -1, id: 0 }
  action check(condition: bool): bool = all { assert(condition), s' = s }
  action init = s' = {
    scope: "denied", locked: false, foreground: true, picker: false, epoch: 0, revision: 0,
    selection: 0, ticket: 0, read: noRead, loaded: 0, playback: false,
    permittedRows: 0, ownedRows: 0, ownedCommitted: 0,
    review: false, reviewRevision: -1, reviewAge: 0,
    acting: false, actingRevision: -1, appliedRevision: -1, appliedReviewed: -1,
    frame: false, frameReviewed: false, publish: "idle", cacheStale: false, recording: false,
    hiddenUnderPicker: false
  }
  val permitted = s.scope != "denied" and not(s.locked)
  action grant(scope: str): bool = all {
    scope.in(Set("full", "selected")), not(s.acting),
    s' = { ...s, scope: scope, epoch: s.epoch + 1, permittedRows: 0 }
  }
  action loadCatalog = all { permitted, s.foreground, s' = { ...s, permittedRows: 1 } }
  // Denial or a locked device ends the permitted catalog, its selection and any open review.
  // Captures this app owns stay listed.
  action loseAccess(reason: str): bool = all {
    reason.in(Set("revoke", "lock")), s.epoch < 4,
    s' = { ...s, scope: if (reason == "revoke") "denied" else s.scope,
      locked: reason == "lock" or s.locked, epoch: s.epoch + 1, permittedRows: 0,
      selection: if (s.selection == 1) 0 else s.selection,
      loaded: if (s.loaded == 1) 0 else s.loaded,
      playback: s.playback and s.loaded == 2, review: false }
  }
  action unlock = s' = { ...s, locked: false }
  // Every selection takes a new ticket, so a read begun for one item is never accepted for another.
  action selectMedia(id: int): bool = all {
    s.foreground, s.ticket < 4,
    if (id == 1) permitted and s.permittedRows == 1 else s.ownedRows > 0,
    s' = { ...s, selection: id, ticket: s.ticket + 1, loaded: 0, playback: false, review: false }
  }
  action beginRead = all {
    s.selection != 0, s.foreground, not(s.read.pending),
    s' = { ...s, read: { pending: true, epoch: s.epoch, ticket: s.ticket, id: s.selection } }
  }
  action readComplete = all {
    s.read.pending,
    val current = s.read.epoch == s.epoch and s.read.ticket == s.ticket and s.read.id == s.selection
      and s.foreground and (s.read.id == 2 or permitted)
    s' = { ...s, read: noRead, loaded: if (current) s.read.id else s.loaded }
  }
  action play = all { s.loaded != 0, s.foreground, s' = { ...s, playback: true } }
  // A reviewed change to a permitted item: owner review, in-app confirmation, then Android's own
  // check of the reviewed revision.
  action review = all {
    s.selection == 1, permitted, s.foreground, not(s.acting), s.permittedRows == 1,
    s' = { ...s, review: true, reviewRevision: s.revision, reviewAge: 0 }
  }
  action tickReview = all { s.review, s' = { ...s, reviewAge: s.reviewAge + 1, review: s.reviewAge < 1 } }
  action cancelReview = all { s.review, s' = { ...s, review: false } }
  action confirmReview = all {
    s.review, not(s.acting), s.foreground,
    s' = if (s.reviewRevision != s.revision) { ...s, review: false }
      else { ...s, review: false, acting: true, actingRevision: s.reviewRevision }
  }
  action nativeApply = all {
    s.acting,
    s' = if (s.actingRevision == s.revision and permitted)
        { ...s, acting: false, appliedRevision: s.revision, appliedReviewed: s.actingRevision, selection: 0, loaded: 0, playback: false }
      else { ...s, acting: false }
  }
  // Photo and video captures are saved when the shutter is pressed, with any library scope.
  action shutterPhoto = all {
    s.foreground, not(s.recording), not(s.frame), s.ownedRows < 3,
    s' = { ...s, ownedRows: s.ownedRows + 1, ownedCommitted: s.ownedCommitted + 1 }
  }
  action startRecording = all { s.foreground, not(s.recording), not(s.frame), s' = { ...s, recording: true } }
  action finishRecording(saved: bool): bool = all {
    s.recording, s.ownedRows < 3,
    s' = { ...s, recording: false, ownedRows: if (saved) s.ownedRows + 1 else s.ownedRows,
      ownedCommitted: if (saved) s.ownedCommitted + 1 else s.ownedCommitted }
  }
  // Scan mode holds an unsaved frame for review. Keep commits it; nothing fences the commit, so
  // a review closed meanwhile leaves a saved photo whose outcome the review never showed.
  action captureScan = all {
    s.foreground, not(s.recording), not(s.frame), s.publish == "idle",
    s' = { ...s, frame: true, frameReviewed: true }
  }
  action openPicker = all { s.frame, s.foreground, s' = { ...s, picker: true } }
  action closePicker = all { s.picker, s' = { ...s, picker: false } }
  action beginKeep = all { s.frame, s.frameReviewed, s.publish == "idle", s' = { ...s, publish: "committing" } }
  action closeScanReview = all { s.frame, not(s.picker),
    s' = { ...s, frame: false, frameReviewed: false } }
  action commitKeep(saved: bool): bool = all {
    s.publish == "committing", s.ownedRows < 3,
    s' = { ...s, ownedRows: if (saved) s.ownedRows + 1 else s.ownedRows,
      ownedCommitted: if (saved) s.ownedCommitted + 1 else s.ownedCommitted,
      publish: if (saved and not(s.frame)) "unknown" else "idle",
      cacheStale: s.cacheStale or (saved and not(s.frame)) }
  }
  action refreshOwned = all { s.foreground, s' = { ...s, cacheStale: false, publish: if (s.publish == "unknown") "idle" else s.publish } }
  // Hiding the page stops playback, ends a review and finishes a recording. Only a readable
  // permitted library is cleared; a scan review that opened a system picker keeps its frame.
  action pause = all {
    s.epoch < 4,
    s' = { ...s, foreground: false, playback: false, review: false, recording: false,
      ownedRows: if (s.recording and s.ownedRows < 3) s.ownedRows + 1 else s.ownedRows,
      ownedCommitted: if (s.recording and s.ownedRows < 3) s.ownedCommitted + 1 else s.ownedCommitted,
      epoch: if (permitted) s.epoch + 1 else s.epoch,
      permittedRows: 0,
      selection: if (permitted) 0 else s.selection, loaded: if (permitted) 0 else s.loaded,
      frame: s.frame and s.picker, frameReviewed: s.frameReviewed and s.picker,
      hiddenUnderPicker: s.picker }
  }
  action resume = s' = { ...s, foreground: true, hiddenUnderPicker: false }
  // The library changed. The app's own video copy keeps the open viewer and its playback; any
  // other change closes them. Either way the catalog is read again.
  action sourceChange(own: bool): bool = all {
    s.epoch < 4,
    s' = { ...s, revision: if (own) s.revision else 1 - s.revision, epoch: s.epoch + 1, permittedRows: 0,
      selection: if (own) s.selection else 0, loaded: if (own) s.loaded else 0,
      playback: s.playback and own, review: s.review and own,
      ownedRows: if (own and s.ownedRows < 3) s.ownedRows + 1 else s.ownedRows,
      ownedCommitted: if (own and s.ownedRows < 3) s.ownedCommitted + 1 else s.ownedCommitted }
  }
  action step = {
    nondet id = Set(1, 2).oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet scope = Set("full", "selected").oneOf()
    nondet reason = Set("revoke", "lock").oneOf()
    any { grant(scope), loadCatalog, loseAccess(reason), unlock, selectMedia(id), beginRead, readComplete,
      play, review, tickReview, cancelReview, confirmReview, nativeApply, shutterPhoto, startRecording,
      finishRecording(flag), captureScan, openPicker, closePicker, beginKeep, closeScanReview,
      commitKeep(flag), refreshOwned, pause, resume, sourceChange(flag), s' = s }
  }
  val LoadedMatchesSelection = s.loaded != 0 implies s.loaded == s.selection
  val PermittedLoadNeedsAccess = s.loaded == 1 implies permitted
  val ReviewBindsRevision = s.review implies s.reviewRevision == s.revision and s.foreground and permitted
  val PlaybackAdmitted = s.playback implies s.foreground and s.loaded != 0
  val AppliedChangeMatchesReview = s.appliedRevision == s.appliedReviewed
  val PermittedCatalogNeedsAccess = not(permitted) implies s.permittedRows == 0
  val OwnedCapturesRetained = s.ownedRows == s.ownedCommitted
  // The frame outlives a hidden page only when a system picker was open as the page was hidden.
  val HiddenFrameNeedsPicker = (s.frame and not(s.foreground)) implies s.hiddenUnderPicker
  val UnknownKeepIsCommitted = s.publish == "unknown" implies s.cacheStale and s.ownedRows > 0
  val RecordingNeedsForeground = s.recording implies s.foreground
  val safety = LoadedMatchesSelection and PermittedLoadNeedsAccess and ReviewBindsRevision and PlaybackAdmitted
    and AppliedChangeMatchesReview and PermittedCatalogNeedsAccess and OwnedCapturesRetained
    and HiddenFrameNeedsPicker and UnknownKeepIsCommitted and RecordingNeedsForeground
  val OwnedSurvivesDenialWitness = s.scope == "denied" and s.ownedRows > 0 and not(s.foreground)
  val StaleReadPendingWitness = s.read.pending and s.read.ticket != s.ticket
  val HiddenPickerFrameWitness = s.frame and not(s.foreground) and s.picker
  val UnknownKeepWitness = s.publish == "unknown"
  val AppliedChangeWitness = s.appliedRevision != -1
  val OwnCopyKeepsPlaybackWitness = s.playback and s.epoch > 1 and s.loaded == 2

  run reviewedChangeTest = init.then(grant("selected")).then(loadCatalog).then(selectMedia(1)).then(review)
    .then(confirmReview).then(nativeApply).then(check(safety and s.appliedRevision == 0 and not(s.acting)))
  run revokeWhileReadingTest = init.then(grant("full")).then(loadCatalog).then(selectMedia(1)).then(beginRead)
    .then(loseAccess("revoke")).then(readComplete)
    .then(check(safety and s.loaded == 0 and s.permittedRows == 0))
  run changedSourceRefusedByAndroidTest = init.then(grant("full")).then(loadCatalog).then(selectMedia(1))
    .then(review).then(confirmReview).then(sourceChange(false)).then(nativeApply)
    .then(check(safety and s.appliedRevision == -1 and not(s.acting)))
  // A read begun for one item returns after another was selected: its bytes are not shown.
  run lateReadForOtherSelectionTest = init.then(shutterPhoto).then(grant("full")).then(loadCatalog)
    .then(selectMedia(1)).then(beginRead).then(selectMedia(2)).then(readComplete)
    .then(check(safety and s.loaded == 0 and s.selection == 2))
    .then(beginRead).then(readComplete).then(check(safety and s.loaded == 2))
  // Captures are saved without a review, and stay listed through denial and a hidden page.
  run ownedCaptureSurvivesPauseTest = init.then(shutterPhoto).then(selectMedia(2)).then(beginRead)
    .then(readComplete).then(play).then(pause)
    .then(check(safety and s.ownedRows == 1 and s.loaded == 2 and not(s.playback) and s.scope == "denied"))
  run recordingSavedOnPauseTest = init.then(startRecording).then(pause)
    .then(check(safety and not(s.recording) and s.ownedRows == 1))
  run pickerKeepsScanFrameTest = init.then(captureScan).then(openPicker).then(pause)
    .then(check(safety and s.frame)).then(resume).then(closePicker).then(pause)
    .then(check(safety and not(s.frame)))
  run keepCommittedAfterReviewClosedTest = init.then(captureScan).then(beginKeep).then(closeScanReview)
    .then(commitKeep(true)).then(check(safety and s.publish == "unknown" and s.ownedRows == 1 and s.cacheStale))
    .then(refreshOwned).then(check(safety and s.publish == "idle" and not(s.cacheStale)))
  run ownVideoCopyKeepsViewerTest = init.then(shutterPhoto).then(selectMedia(2)).then(beginRead).then(readComplete)
    .then(play).then(sourceChange(true)).then(check(safety and s.playback and s.loaded == 2 and s.ownedRows == 2))
    .then(sourceChange(false)).then(check(safety and not(s.playback) and s.loaded == 0))
  run reviewExpiresTest = init.then(grant("full")).then(loadCatalog).then(selectMedia(1)).then(review)
    .then(tickReview).then(tickReview).then(check(safety and not(s.review)))
  run hiddenPageEndsReviewTest = init.then(grant("full")).then(loadCatalog).then(selectMedia(1)).then(review)
    .then(pause).then(resume).then(check(safety and not(s.review) and s.selection == 0))
}
