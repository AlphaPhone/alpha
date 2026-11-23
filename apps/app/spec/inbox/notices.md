# Background Gmail notices

On Android the launcher can watch the selected Gmail account for new unread Inbox mail in the
background (native `AlphaGmail`: WorkManager checks bound to the Cloud owner, credential and grant)
and post a notice that carries counts only. Tapping it opens the Inbox list for that account, or,
for Ask, lets the owner review the message's subject and snippet before a question to the agent is
placed in the composer. The browser build has no background notices.

## Story: Be told about new mail while the launcher is in the background

> As the owner, I want the phone to tell me when new mail arrives in the account I chose, to know
> whether that watch is working, and to have it stop when I change or lose that account.

### The watch follows the selected account for its Cloud owner, and stops when there is none

Configuring needs the owner's organization and the credential the screen is bound to; the native
side checks owner and grant again itself and needs the unlocked foreground. Choosing no account
withdraws the watch; an owner the screen cannot name yet leaves the saved watch for native to
recheck. A refused configuration releases only its own attempt.

```quint
type BackgroundStatus = WebUnavailable | BackgroundUnavailable | BackgroundDisabled | BackgroundWaiting | WatchingNewMail | CatchingUp
  | HistoryExpired | BackgroundUnsupported | BackgroundRetrying | GrantUnavailable | CapacityReached
type Watch = { credential: str, grant: str, user: str, organization: str }
type TapPhase = IdleTap | ReadingTap | ReadingGrants | ReadingMail | ReviewingAsk | RecheckingAsk | ConsumingTap | OpenedList | ComposedAsk | ClosedAsk
type Excerpt = { message: str, thread: str, revision: str, subject: str, snippet: str }
type MailNotices = {
  available: bool, watched: Watch, attempt: Watch, status: BackgroundStatus, lastCheck: int, notificationsAllowed: bool, uncertain: int,
  tap: TapPhase, token: str, tapGrant: str, asks: bool, spent: bool, canceled: bool, released: bool, excerpt: Excerpt
}
pure val noWatch: Watch = { credential: "", grant: "", user: "", organization: "" }
pure val noExcerpt: Excerpt = { message: "", thread: "", revision: "", subject: "", snippet: "" }
pure val initial: MailNotices = {
  available: false, watched: noWatch, attempt: noWatch, status: WebUnavailable, lastCheck: 0, notificationsAllowed: true, uncertain: 0,
  tap: IdleTap, token: "", tapGrant: "", asks: false, spent: false, canceled: false, released: false, excerpt: noExcerpt
}
pure def canNativeReady(s: MailNotices): bool = not(s.available)
pure def nativeReady(s: MailNotices): MailNotices = { ...s, available: true, status: BackgroundDisabled }
pure def canConfigure(s: MailNotices, watch: Watch): bool =
  s.available and s.attempt == noWatch and watch.grant != "" and watch.credential != "" and watch.user != "" and watch.organization != ""
pure def configure(s: MailNotices, watch: Watch): MailNotices = { ...s, attempt: watch }
pure def canConfigured(s: MailNotices, status: BackgroundStatus): bool = s.attempt != noWatch and status != WebUnavailable
pure def configured(s: MailNotices, status: BackgroundStatus): MailNotices = { ...s, watched: s.attempt, attempt: noWatch, status: status }
pure def canConfigureRefused(s: MailNotices): bool = s.attempt != noWatch
pure def configureRefused(s: MailNotices): MailNotices = { ...s, attempt: noWatch, status: GrantUnavailable }
pure def canWithdrawWatch(s: MailNotices, grant: str): bool = s.available and s.attempt == noWatch and s.watched != noWatch and (grant == "" or grant == s.watched.grant)
pure def withdrawWatch(s: MailNotices, grant: str): MailNotices = { ...s, watched: noWatch, status: BackgroundDisabled }
pure def alwaysTheBrowserWatchesNothing(s: MailNotices): bool = not(s.available) implies (s.watched == noWatch and s.attempt == noWatch and s.status == WebUnavailable)
pure def alwaysAWatchIsWholeOrNone(s: MailNotices): bool = s.watched == noWatch or (s.watched.grant != "" and s.watched.credential != "" and s.watched.organization != "")
pure val watchValues = Set({ credential: "c1", grant: "g1", user: "u1", organization: "org1" }, { credential: "c1", grant: "g2", user: "u1", organization: "" })
pure val grantValues = Set("", "g1", "g2")
pure def sometimesWatching(s: MailNotices): bool = s.status == WatchingNewMail and s.watched.grant == "g1"
pure def sometimesRefusedWatch(s: MailNotices): bool = s.status == GrantUnavailable and s.watched == noWatch
```

### The watch's status says what it can promise, from the native side's own report

The status names whether checks are watching, catching up, waiting to retry, out of history,
unsupported by the server, missing the matching sign-in or grant, or out of notice history; with the
time of the last successful check, whether Android notifications are allowed and how many notices
have an unknown outcome (those are never posted again).

```quint
pure def canStatusRead(s: MailNotices, status: BackgroundStatus, lastCheck: int, notificationsAllowed: bool, uncertain: int): bool =
  s.available and status != WebUnavailable and lastCheck >= 0 and uncertain >= 0
pure def statusRead(s: MailNotices, status: BackgroundStatus, lastCheck: int, notificationsAllowed: bool, uncertain: int): MailNotices =
  { ...s, status: status, lastCheck: lastCheck, notificationsAllowed: notificationsAllowed, uncertain: uncertain }
pure def alwaysCountsAreNotNegative(s: MailNotices): bool = s.lastCheck >= 0 and s.uncertain >= 0
pure val lastCheckValues = Set(0, 1700000000000)
pure val uncertainValues = Set(0, 2)
```

## Story: Open the Inbox or ask about the exact notification I tapped

> As the owner, I want a notice I tap to open my inbox, or to let me ask about the exact message it
> was about, and never anyone else's mail.

### A tap is admitted only for its own owner and a readable grant, and an ordinary tap spends it first

A tap is read only in the foreground of the unlocked phone, and carries a token, grant, credential,
user and generation. It is admitted only while its owner and scope are current, for a grant the
account list reports readable. An ordinary tap is spent first; only then does the Inbox list open,
for that account, with its folder and search cleared, and nothing is read or marked read. A newer tap
replaces one not yet reviewed.

```quint
type TapEvidence = { token: str, grant: str, validIdentity: bool, sameOwner: bool, scopeCurrent: bool, asks: bool }
type GrantEvidence = { scopeCurrent: bool, readableGrant: bool, askReady: bool }
pure def tapSettled(s: MailNotices): bool = s.tap == IdleTap or s.tap == OpenedList or s.tap == ComposedAsk or s.tap == ClosedAsk
pure def canReadPending(s: MailNotices): bool = s.available and (tapSettled(s) or s.tap == ReadingTap)
pure def readPending(s: MailNotices): MailNotices =
  { ...s, tap: ReadingTap, token: "", tapGrant: "", asks: false, spent: false, canceled: false, released: false, excerpt: noExcerpt }
pure def canAcceptPending(s: MailNotices, evidence: TapEvidence): bool = s.tap == ReadingTap
pure def acceptPending(s: MailNotices, evidence: TapEvidence): MailNotices =
  if (evidence.validIdentity and evidence.sameOwner and evidence.scopeCurrent and evidence.token != "" and evidence.grant != "")
    { ...s, tap: ReadingGrants, token: evidence.token, tapGrant: evidence.grant, asks: evidence.asks }
  else { ...s, tap: ClosedAsk }
pure def canCheckGrants(s: MailNotices, grants: GrantEvidence): bool = s.tap == ReadingGrants
pure def checkGrants(s: MailNotices, grants: GrantEvidence): MailNotices =
  if (not(grants.scopeCurrent and grants.readableGrant) or (s.asks and not(grants.askReady))) { ...s, tap: ClosedAsk }
  else { ...s, tap: if (s.asks) ReadingMail else ConsumingTap }
pure def alwaysAnAdmittedTapHasItsToken(s: MailNotices): bool =
  (s.tap == ReadingGrants or s.tap == ReadingMail or s.tap == ReviewingAsk or s.tap == RecheckingAsk or s.tap == ConsumingTap or s.tap == ComposedAsk)
    implies (s.token != "" and s.tapGrant != "")
pure val evidenceValues = Set({ token: "t1", grant: "g1", validIdentity: true, sameOwner: true, scopeCurrent: true, asks: false },
  { token: "t1", grant: "g1", validIdentity: true, sameOwner: true, scopeCurrent: true, asks: true },
  { token: "t1", grant: "g1", validIdentity: true, sameOwner: false, scopeCurrent: true, asks: false })
pure val grantsValues = Set({ scopeCurrent: true, readableGrant: true, askReady: true }, { scopeCurrent: true, readableGrant: false, askReady: true },
  { scopeCurrent: true, readableGrant: true, askReady: false })
pure def sometimesListOpened(s: MailNotices): bool = s.tap == OpenedList and s.spent
```

### Ask shows only the subject and snippet, and rechecks them before the tap is spent

Ask reads the exact message and thread; an unavailable message opens the Inbox list instead, and a
wrong one does nothing. The owner reviews an excerpt of subject and snippet only, never the body or
attachments, and may edit it; a blank or sensitive question is refused. Confirming rechecks the same
pending token and generation and a fresh read of the same revision, message, thread, subject and
snippet. Cancelling keeps the notice; only an explicit dismissal releases the question. Back closes
the review as a cancel, never as a dismissal. The question is placed in the composer and nothing is
sent.

```quint
type InitialReply = UnavailableMail | WrongMail | ExactMail
type MailEvidence = { scopeCurrent: bool, reply: InitialReply, reviewable: bool, excerpt: Excerpt }
type Recheck = { sameToken: bool, sameGeneration: bool, fresh: Excerpt }
type ConsumeEvidence = { acknowledged: bool, scopeCurrent: bool, composed: bool }
pure def canOpenAsk(s: MailNotices, mail: MailEvidence): bool = s.tap == ReadingMail
pure def openAsk(s: MailNotices, mail: MailEvidence): MailNotices =
  if (not(mail.scopeCurrent)) { ...s, tap: ClosedAsk }
  else if (mail.reply == UnavailableMail) { ...s, tap: OpenedList }
  else if (mail.reply == ExactMail and mail.reviewable) { ...s, tap: ReviewingAsk, excerpt: mail.excerpt }
  else { ...s, tap: ClosedAsk }
pure def canConfirmAsk(s: MailNotices, scopeCurrent: bool, safeQuestion: bool): bool = s.tap == ReviewingAsk
pure def confirmAsk(s: MailNotices, scopeCurrent: bool, safeQuestion: bool): MailNotices = if (scopeCurrent and safeQuestion) { ...s, tap: RecheckingAsk } else s
pure def exactQuestion(s: MailNotices, question: Recheck): bool = question.sameToken and question.sameGeneration and question.fresh == s.excerpt and s.excerpt != noExcerpt
pure def canFinishRecheck(s: MailNotices, question: Recheck, scopeCurrent: bool): bool = s.tap == RecheckingAsk
pure def finishRecheck(s: MailNotices, question: Recheck, scopeCurrent: bool): MailNotices =
  if (not(s.canceled) and scopeCurrent and exactQuestion(s, question)) { ...s, tap: ConsumingTap } else { ...s, tap: ClosedAsk }
pure def canCancelAsk(s: MailNotices, explicitDismissal: bool): bool =
  (s.tap == ReviewingAsk or s.tap == RecheckingAsk or (s.tap == ConsumingTap and s.asks)) and not(s.canceled)
pure def cancelAsk(s: MailNotices, explicitDismissal: bool): MailNotices =
  if (s.tap == ReviewingAsk) { ...s, tap: ClosedAsk, canceled: true, released: explicitDismissal } else { ...s, canceled: true }
pure def canFinishConsume(s: MailNotices, consumed: ConsumeEvidence): bool = s.tap == ConsumingTap
pure def finishConsume(s: MailNotices, consumed: ConsumeEvidence): MailNotices =
  { ...s, spent: consumed.acknowledged,
    tap: if (not(consumed.acknowledged and consumed.scopeCurrent)) ClosedAsk else if (not(s.asks)) OpenedList else if (consumed.composed and not(s.canceled)) ComposedAsk else ClosedAsk }
pure def alwaysAskPhasesAreAsks(s: MailNotices): bool = (s.tap == ReadingMail or s.tap == ReviewingAsk or s.tap == RecheckingAsk or s.tap == ComposedAsk) implies s.asks
pure def alwaysASpentTapIsSettled(s: MailNotices): bool = s.spent implies (s.tap == ClosedAsk or s.tap == OpenedList or s.tap == ComposedAsk)
pure def alwaysAComposedQuestionWasSpent(s: MailNotices): bool = s.tap == ComposedAsk implies (s.spent and s.asks and s.excerpt != noExcerpt)
pure def alwaysAReleaseKeepsTheTapUnspent(s: MailNotices): bool = s.released implies (s.tap == ClosedAsk and s.canceled and not(s.spent))
pure def stepOnlyConsumingSpendsATap(before: MailNotices, via: str, after: MailNotices): bool = (not(before.spent) and after.spent) implies via == "finishConsume"
pure def stepARecheckNeverComposes(before: MailNotices, via: str, after: MailNotices): bool = via == "finishRecheck" implies (after.tap != ComposedAsk and not(after.spent))
pure val excerpt1: Excerpt = { message: "m1", thread: "t1", revision: "h1", subject: "Lunch", snippet: "Noon?" }
pure val mailValues = Set({ scopeCurrent: true, reply: ExactMail, reviewable: true, excerpt: excerpt1 })
  .union(Set({ scopeCurrent: true, reply: UnavailableMail, reviewable: true, excerpt: noExcerpt }))
  .union(Set({ scopeCurrent: true, reply: WrongMail, reviewable: true, excerpt: noExcerpt }))
pure val questionValues = Set({ sameToken: true, sameGeneration: true, fresh: excerpt1 })
  .union(Set({ sameToken: true, sameGeneration: true, fresh: { ...excerpt1, snippet: "Changed" } }))
  .union(Set({ sameToken: false, sameGeneration: true, fresh: excerpt1 }))
pure val consumedValues = Set({ acknowledged: true, scopeCurrent: true, composed: true }, { acknowledged: true, scopeCurrent: false, composed: true },
  { acknowledged: false, scopeCurrent: true, composed: true }, { acknowledged: true, scopeCurrent: true, composed: false })
pure def sometimesQuestionComposed(s: MailNotices): bool = s.tap == ComposedAsk
pure def sometimesSpentWithoutQuestion(s: MailNotices): bool = s.tap == ClosedAsk and s.spent
pure def sometimesReleased(s: MailNotices): bool = s.released
```

### A failed confirmation reports what happened to the question

Before the tap is spent a failure reports that the notification changed; after it, that the
question could not be kept.

```quint
type AskFailure = NoAskFailure | ChangedNotice | CouldNotKeep
pure def askFailure(confirming: bool, s: MailNotices): AskFailure =
  if (not(confirming and s.asks) or s.tap != ClosedAsk) NoAskFailure else if (s.spent) CouldNotKeep else ChangedNotice
pure def lawAnUnfinishedAskReportsNothing(confirming: bool, s: MailNotices): bool = s.tap != ClosedAsk implies askFailure(confirming, s) == NoAskFailure
pure val sValues = Set(initial).union(Set({ ...initial, available: true, tap: ClosedAsk, asks: true, spent: true }))
```
