module BrowserPageEgress {
  pure val MaxRevision = 5
  pure val MaxCount = 3
  pure val Pages = Set("loading", "ready", "failed")
  pure val Shares = Set("idle", "waiting", "native")
  type State = {
    priv: bool,
    page: str, secure: bool, revision: int,
    foreground: bool, inBrowser: bool,
    share: str,
    captured: int, sent: int,
    nativeShares: int, emails: int, copies: int, bookmarkWrites: int, marked: bool,
    visited: bool, secureSeen: bool, readySeen: bool,
    loadNotice: bool, changedNotice: bool, emailNotice: bool, bookmarkNotice: bool, failureNotice: bool,
    copyNotice: bool, copiedNotice: bool, clipboardNotice: bool,
    insecureNotice: bool
  }
  var s: State
  pure def start(priv: bool): State = { priv: priv, page: "loading", secure: true, revision: 1, foreground: true,
    inBrowser: true, share: "idle", captured: 0, sent: 0, nativeShares: 0, emails: 0, copies: 0, bookmarkWrites: 0, marked: false,
    visited: false, secureSeen: false, readySeen: false, loadNotice: false, changedNotice: false, emailNotice: false,
    bookmarkNotice: false, failureNotice: false, copyNotice: false, copiedNotice: false, clipboardNotice: false,
    insecureNotice: false }
  action initNormal = s' = start(false)
  action initPrivate = s' = start(true)
  action init = any { initNormal, initPrivate }

  action startLoad(https: bool): bool = all { s.page != "loading", s.revision < MaxRevision,
    s' = { ...s, page: "loading", secure: https, revision: s.revision + 1 } }
  action commit = all { s.page == "loading",
    s' = { ...s, page: "ready", visited: s.visited or not(s.priv), secureSeen: s.secureSeen or s.secure, readySeen: true } }
  action loadFails = all { s.page == "loading",
    s' = { ...s, page: "failed", insecureNotice: s.insecureNotice or not(s.secure) } }
  action hide = all { s.foreground, s' = { ...s, foreground: false } }
  action show = all { not(s.foreground), s' = { ...s, foreground: true } }
  action leaveBrowser = all { s.inBrowser, s' = { ...s, inBrowser: false } }
  action returnToBrowser = all { not(s.inBrowser), s' = { ...s, inBrowser: true } }

  action startShare =
    if (s.share != "idle") s' = s
    else if (s.page != "ready") s' = { ...s, loadNotice: true }
    else s' = { ...s, share: "waiting", captured: s.revision }
  action shareDelayEnds = all { s.share == "waiting",
    if (s.foreground and s.inBrowser and s.revision == s.captured and s.nativeShares < MaxCount)
      s' = { ...s, share: "native", sent: s.captured, nativeShares: s.nativeShares + 1 }
    else all { not(s.foreground and s.inBrowser and s.revision == s.captured),
      s' = { ...s, share: "idle", changedNotice: true } } }
  action nativeShareSettles(ok: bool): bool = all { s.share == "native",
    s' = { ...s, share: "idle", failureNotice: s.failureNotice or not(ok) } }
  action shareEmail = all { s.emails < MaxCount,
    if (s.foreground and s.inBrowser and s.page == "ready") s' = { ...s, emails: s.emails + 1 }
    else s' = { ...s, emailNotice: true } }
  action copyLink(ok: bool): bool = all { s.copies < MaxCount,
    if (not(s.foreground and s.inBrowser and s.page == "ready")) s' = { ...s, copyNotice: true }
    else if (ok) s' = { ...s, copies: s.copies + 1, copiedNotice: true }
    else s' = { ...s, clipboardNotice: true } }
  action toggleBookmark = all { s.bookmarkWrites < MaxCount,
    if (s.page == "ready" and s.secure) s' = { ...s, bookmarkWrites: s.bookmarkWrites + 1, marked: not(s.marked) }
    else s' = { ...s, bookmarkNotice: true } }
  action step = {
    nondet flag = Set(true, false).oneOf()
    any { startLoad(flag), commit, loadFails, hide, show, leaveBrowser, returnToBrowser, startShare, shareDelayEnds,
      nativeShareSettles(flag), shareEmail, copyLink(flag), toggleBookmark, s' = s }
  }

  val TypeOK = Pages.contains(s.page) and Shares.contains(s.share) and s.revision.in(1.to(MaxRevision)) and
    s.nativeShares.in(0.to(MaxCount)) and s.emails.in(0.to(MaxCount)) and s.copies.in(0.to(MaxCount)) and
    s.bookmarkWrites.in(0.to(MaxCount))
  val ShareBoundToItsRequest = (s.share != "idle" implies (s.captured >= 1 and s.captured <= s.revision)) and
    (s.share == "native" implies s.sent == s.captured) and (s.sent > 0 iff s.nativeShares > 0)
  val PrivateTabStaysOutOfHistory = s.priv implies not(s.visited)
  val BookmarkNeedsSecurePage = (s.marked or s.bookmarkWrites > 0) implies s.secureSeen
  val EmailNeedsCommittedPage = s.emails > 0 implies s.readySeen
  val ShareNeedsCommittedPage = s.nativeShares > 0 implies s.readySeen
  val CopyNeedsCommittedPage = (s.copies > 0 or s.clipboardNotice) implies s.readySeen
  val CopiedNoticeNeedsCopy = s.copiedNotice iff s.copies > 0
  val safety = TypeOK and ShareBoundToItsRequest and PrivateTabStaysOutOfHistory and BookmarkNeedsSecurePage and
    EmailNeedsCommittedPage and ShareNeedsCommittedPage and CopyNeedsCommittedPage and CopiedNoticeNeedsCopy

  val SharedWitness = s.nativeShares > 0 and s.share == "idle" and not(s.failureNotice)
  val PageChangedBeforeShareWitness = s.changedNotice
  val PageMovedUnderShareSheetWitness = s.share == "native" and s.nativeShares == 1 and s.revision > s.sent
  val PrivatePageBookmarkedWitness = s.priv and s.marked
  val PrivatePageEmailedWitness = s.priv and s.emails > 0
  val PrivatePageCopiedWitness = s.priv and s.copies > 0
  val InsecurePageFailedWitness = s.insecureNotice and s.page == "failed"

  run shareWaitsForMenuTest = initNormal.then(commit).then(startShare)
    .expect(s.share == "waiting" and s.nativeShares == 0 and safety)
    .then(startShare).expect(s.share == "waiting" and s.captured == 1)
    .then(shareDelayEnds).expect(s.share == "native" and s.sent == 1 and s.nativeShares == 1 and safety)
    .then(startShare).expect(s.nativeShares == 1 and not(s.loadNotice))
    .then(nativeShareSettles(true)).expect(s.share == "idle" and not(s.failureNotice) and safety)
  run navigationDuringDelayRefusesTest = initNormal.then(commit).then(startShare).then(startLoad(true)).then(commit)
    .then(shareDelayEnds)
    .expect(s.share == "idle" and s.changedNotice and s.nativeShares == 0 and safety)
  run hiddenDuringDelayRefusesTest = initNormal.then(commit).then(startShare).then(hide).then(shareDelayEnds)
    .expect(s.share == "idle" and s.changedNotice and s.nativeShares == 0 and safety)
    .then(show).then(startShare).then(shareDelayEnds).expect(s.share == "native" and safety)
  run unloadedPageRefusesEveryEgressTest = initNormal.then(startShare).then(shareEmail).then(toggleBookmark)
    .then(copyLink(true))
    .expect(s.loadNotice and s.emailNotice and s.bookmarkNotice and s.copyNotice and s.share == "idle" and
      s.emails == 0 and s.copies == 0 and s.bookmarkWrites == 0 and safety)
  run insecurePageIsNotBookmarkedTest = initNormal.then(commit).then(startLoad(false)).then(commit).then(toggleBookmark)
    .expect(s.bookmarkNotice and not(s.marked) and safety)
    .then(shareEmail).expect(s.emails == 1 and safety)
  run privateTabEgressTest = initPrivate.then(commit).then(toggleBookmark).then(shareEmail)
    .expect(s.marked and s.emails == 1 and not(s.visited) and safety)
  run bookmarkCommitAndRemoveTest = initNormal.then(toggleBookmark)
    .expect(s.bookmarkNotice and not(s.marked) and s.bookmarkWrites == 0 and safety)
    .then(commit).then(toggleBookmark).expect(s.marked and s.bookmarkWrites == 1 and safety)
    .then(toggleBookmark).expect(not(s.marked) and s.bookmarkWrites == 2 and safety)
  run privateBookmarkOutsideHistoryTest = initPrivate.then(commit).then(toggleBookmark)
    .expect(s.marked and not(s.visited) and s.bookmarkWrites == 1 and safety)
  run copyLinkNeedsShownPageTest = initNormal.then(commit).then(leaveBrowser).then(copyLink(true))
    .expect(s.copyNotice and s.copies == 0 and safety)
    .then(returnToBrowser).then(copyLink(false)).expect(s.clipboardNotice and s.copies == 0 and safety)
    .then(copyLink(true)).expect(s.copies == 1 and s.copiedNotice and safety)
  run insecurePageFailureIsExplainedTest = initNormal.then(commit).then(startLoad(true)).then(loadFails)
    .expect(s.page == "failed" and not(s.insecureNotice) and safety)
    .then(startLoad(false)).then(loadFails).expect(s.insecureNotice and safety)
  run failedShareIsReportedTest = initNormal.then(commit).then(startShare).then(shareDelayEnds)
    .then(nativeShareSettles(false))
    .expect(s.share == "idle" and s.failureNotice and safety)
}
