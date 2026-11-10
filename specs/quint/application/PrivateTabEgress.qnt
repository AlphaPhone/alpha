/// How the page in a browser tab can leave it: history and saved tabs, a bookmark, an email
/// draft, the share sheet, and another browser, which a private tab reaches only after a review.
module PrivateTabEgress {
  type State = {
    priv: bool, committed: bool,
    // Changes with every navigation of the tab.
    revision: int,
    foreground: bool, inBrowser: bool,
    inHistory: bool, savedTab: bool, bookmarked: bool, emailDraft: bool, shareSheet: bool,
    // Opening another browser: in progress, the private review, and the document it was started for.
    sharing: bool, review: str, capturedRevision: int,
    externalSent: bool, sentPrivateUnreviewed: bool, sentStale: bool
  }
  var s: State
  action initFor(priv: bool): bool = s' = { priv: priv, committed: false, revision: 0,
    foreground: true, inBrowser: true, inHistory: false, savedTab: false, bookmarked: false,
    emailDraft: false, shareSheet: false, sharing: false, review: "none", capturedRevision: 0,
    externalSent: false, sentPrivateUnreviewed: false, sentStale: false }
  action init = {
    nondet priv = Set(false, true).oneOf()
    initFor(priv)
  }
  action navigate = all { s.revision < 3,
    s' = { ...s, revision: s.revision + 1, committed: false } }
  // A committed page of a normal tab enters history and becomes the tab's saved address.
  action commit = all { not(s.committed), s.revision > 0,
    s' = { ...s, committed: true, inHistory: s.inHistory or not(s.priv), savedTab: s.savedTab or not(s.priv) } }
  // Explicit actions on the committed page. None of them asks again in a private tab.
  action bookmark = all { s.committed, s.foreground, s.inBrowser, s' = { ...s, bookmarked: true } }
  action emailShare = all { s.committed, s.foreground, s.inBrowser, s' = { ...s, emailDraft: true } }
  action share = all { s.committed, s.foreground, s.inBrowser, not(s.sharing), s' = { ...s, shareSheet: true } }
  // A private tab's review is refused outright while the app is hidden.
  action externalStart = all {
    s.committed, not(s.sharing),
    s' = if (s.priv and not(s.foreground)) s
      else { ...s, sharing: true, review: if (s.priv) "open" else "none", capturedRevision: s.revision }
  }
  action reviewApprove = all { s.review == "open", s.foreground, s' = { ...s, review: "approved" } }
  action reviewDeny = all { s.review == "open", s' = { ...s, review: "none", sharing: false } }
  // After the review the page must still be the reviewed document, shown in the Browser.
  action externalSend = all {
    s.sharing, s.review != "open",
    s' = if (not(s.foreground) or not(s.inBrowser) or s.revision != s.capturedRevision or not(s.committed))
        { ...s, sharing: false, review: "none" }
      else { ...s, sharing: false, review: "none", externalSent: true,
        sentPrivateUnreviewed: s.sentPrivateUnreviewed or (s.priv and s.review != "approved"),
        sentStale: s.sentStale or s.revision != s.capturedRevision }
  }
  // Hiding the app closes an open review as not confirmed.
  action hide = s' = { ...s, foreground: false,
    review: if (s.review == "open") "none" else s.review,
    sharing: if (s.review == "open") false else s.sharing }
  action show = s' = { ...s, foreground: true }
  action leaveBrowser = s' = { ...s, inBrowser: false }
  action enterBrowser = s' = { ...s, inBrowser: true }
  action step = any { navigate, commit, bookmark, emailShare, share, externalStart, reviewApprove,
    reviewDeny, externalSend, hide, show, leaveBrowser, enterBrowser, s' = s }
  val PrivateNeverImplicit = s.priv implies not(s.inHistory or s.savedTab)
  val PrivateExternalReviewed = not(s.sentPrivateUnreviewed)
  val ExternalIsReviewedDocument = not(s.sentStale)
  val ReviewOnlyForPrivate = s.review != "none" implies (s.priv and s.sharing)
  val OpenReviewImpliesForeground = s.review == "open" implies s.foreground
  val TypeOK = s.review.in(Set("none", "open", "approved")) and s.revision.in(0.to(3)) and
    s.capturedRevision <= s.revision
  val safety = TypeOK and PrivateNeverImplicit and PrivateExternalReviewed and ExternalIsReviewedDocument and
    ReviewOnlyForPrivate and OpenReviewImpliesForeground
  // A private page's address can be bookmarked or put in an email draft without a review.
  val PrivateBookmarkWitness = s.priv and s.bookmarked
  val PrivateEmailDraftWitness = s.priv and s.emailDraft
  val PrivateExternalSentWitness = s.priv and s.externalSent
  val NavigatedDuringReviewWitness = s.review == "approved" and s.revision != s.capturedRevision
  run privateExternalNeedsReviewTest = initFor(true).then(navigate).then(commit).then(externalStart)
    .expect(s.review == "open" and not(s.externalSent)).then(reviewApprove).then(externalSend)
    .expect(s.externalSent and not(s.inHistory or s.savedTab) and safety)
  // A review approved for one page does not carry over to the page the tab navigated to meanwhile.
  run navigationVoidsReviewTest = initFor(true).then(navigate).then(commit).then(externalStart)
    .then(navigate).then(commit).then(reviewApprove).then(externalSend)
    .expect(not(s.externalSent) and not(s.sharing) and s.review == "none" and safety)
  run hiddenReviewDeniedTest = initFor(true).then(navigate).then(commit).then(externalStart).then(hide)
    .expect(s.review == "none" and not(s.sharing)).then(externalStart)
    .expect(not(s.sharing) and not(s.externalSent) and safety)
  run normalTabNoReviewTest = initFor(false).then(navigate).then(commit).then(externalStart).then(externalSend)
    .expect(s.externalSent and s.inHistory and s.savedTab and safety)
  run privateExplicitEgressTest = initFor(true).then(navigate).then(commit).then(bookmark).then(emailShare)
    .expect(s.bookmarked and s.emailDraft and not(s.inHistory or s.savedTab) and safety)
}
