# Review

Which proposal may produce a device effect, on whose authority, and at most
once. The authority is either the owner's tap on a review card, or the
owner's current request when the agent proposed an operation the request
may perform directly; the upstream rules of which operations are eligible
and how an attempt is reserved, claimed, dispatched and settled are
`spec/agent/deviceActions/{operations,execution}.md` of Eliza, carried out by
`DeviceExecution`. This spec is the phone's custody around it: one proposal
is in focus at a time; a direct pass over the proposals of one message runs
at most four, opens Browser at most once and stops at the first result that
is not a success; the owner's "Ask before Alpha acts" preference, read
before each direct approval and treated as on when it cannot be read,
admits no direct effect at all. A card reaches approval by the live route
or the recovered route ([Approvals](./approvals.md)); a recovered card is
bound to the agent session that listed it.

## Story: Let my agent act only with my say-so

> As the owner, I want a phone action to happen only when I approved its
> card on the screen it was meant for, or when my own message asked for a
> harmless local action and I allow that, and never twice, so that my
> phone never acts on its own.

### A direct effect needs an allow-listed operation of the current message that is not a workflow step, with review-first off

Opening a view (Settings included, which is navigation and never a settings
write), creating a note, opening a typed address in Browser, taking a photo
and opening a file may run directly; creating a reminder, reading notes,
reading reminders, reading the place or route Maps shows, reading or changing Calendar, changing files (share, move, trash, a new
folder), changing Photos, and calls, texts and contact changes always need
review. An operation that would change a setting never becomes
a card. A Browser open needs the address the owner typed and runs at most
once per message. With review-first off, each turn tells the agent so, as
the turn context's `voiceUi.agentActionMode` `direct-request-v1`
(`spec/agent/conversation/turnContext.md` of Eliza), so that it binds a
proposal of the owner's own request to the message; with review-first on
or unreadable the turn says nothing, and every proposal comes as a card.

```quint
type Op = OpenView | OpenSettings | CreateNote | BrowserNavigate | CameraCapture | FilesOpen | CreateReminder | NotesRead
  | RemindersRead | MapsRead | CalendarRead | CalendarWrite | FilesChange | PhotosChange | CommsAct | SettingsWrite
type Preference = PreferenceOff | PreferenceOn | PreferenceUnreadable
type Journal = JournalEmpty | JournalReserved | JournalApplying | JournalTerminal
type Authority = NoAuthority | ByReview | ByRequest
type Route = NoRoute | LiveRoute | RecoveredRoute
type Settled = NotSettled | Succeeded | FailedResult | UnknownResult
type Entry = { authority: Authority, expired: bool, fresh: bool, sensitive: bool, asks: bool, bound: bool, route: Route, sameSession: bool }
type Custody = {
  card: bool, busy: bool, journal: Journal, identity: bool, fresh: bool, sensitive: bool, expired: bool, aborted: bool,
  reviewFirst: Preference, bound: bool, op: Op, workflow: bool, grounded: bool, browserUsed: bool,
  pass: int, passOpen: bool, passEffects: int, browserAuto: int, authority: Authority,
  decisions: int, claims: int, dispatches: int, receipts: int, status: Settled, returned: Settled, synced: bool,
  admitted: bool, at: Entry, route: Route, session: int, cardSession: int,
}
pure val directPerMessage = 4
pure val benign: Entry = { authority: NoAuthority, expired: false, fresh: true, sensitive: false, asks: false, bound: true, route: NoRoute, sameSession: true }
pure val initial: Custody = {
  card: false, busy: false, journal: JournalEmpty, identity: true, fresh: true, sensitive: false, expired: false, aborted: false,
  reviewFirst: PreferenceOff, bound: true, op: OpenView, workflow: false, grounded: false, browserUsed: false,
  pass: 0, passOpen: true, passEffects: 0, browserAuto: 0, authority: NoAuthority,
  decisions: 0, claims: 0, dispatches: 0, receipts: 0, status: NotSettled, returned: NotSettled, synced: false,
  admitted: false, at: benign, route: NoRoute, session: 0, cardSession: 0,
}
pure def directOp(op: Op): bool = op == OpenView or op == OpenSettings or op == CreateNote or op == BrowserNavigate or op == CameraCapture or op == FilesOpen
pure def reviewedOp(op: Op): bool =
  op == CreateReminder or op == NotesRead or op == RemindersRead or op == MapsRead or op == CalendarRead or op == CalendarWrite
    or op == FilesChange or op == PhotosChange or op == CommsAct
pure def lawAReviewedClassIsNeverDirect(op: Op): bool = reviewedOp(op) implies not(directOp(op))
pure def parses(op: Op): bool = directOp(op) or reviewedOp(op)
pure def valid(c: Custody): bool = c.fresh and not(c.sensitive or c.expired or c.aborted)
pure def asks(c: Custody): bool = c.reviewFirst != PreferenceOff
pure def eligible(c: Custody): bool =
  directOp(c.op) and not(c.workflow) and (c.op == BrowserNavigate implies (c.grounded and not(c.browserUsed)))
pure def canPrefer(c: Custody, value: Preference): bool = not(c.busy)
pure def prefer(c: Custody, value: Preference): Custody = { ...c, reviewFirst: value }
pure def canPropose(c: Custody, op: Op, workflow: bool, bound: bool, grounded: bool, listed: bool): bool =
  not(c.busy) and (listed implies (parses(op) and not(workflow)))
pure def propose(c: Custody, op: Op, workflow: bool, bound: bool, grounded: bool, listed: bool): Custody =
  { ...c, op: op, workflow: workflow, bound: bound, grounded: grounded, card: listed, journal: JournalEmpty, identity: true,
    fresh: true, expired: false, authority: NoAuthority, decisions: 0, claims: 0, dispatches: 0, receipts: 0,
    status: NotSettled, returned: NotSettled, synced: false, admitted: false, at: benign,
    route: if (listed) LiveRoute else NoRoute, cardSession: c.session }
pure def canStartPass(c: Custody, sameMessage: bool): bool = not(c.busy)
pure def startPass(c: Custody, sameMessage: bool): Custody =
  { ...c, pass: 0, passOpen: true, passEffects: 0, browserUsed: sameMessage and c.browserUsed,
    browserAuto: if (sameMessage) c.browserAuto else 0, bound: sameMessage and c.bound }
pure def dispatchedOnce(c: Custody): bool = c.dispatches == 1
pure def directAuthority(c: Custody): bool = c.at.authority == ByRequest
pure def alwaysADirectEffectIsAllowListed(c: Custody): bool =
  (dispatchedOnce(c) and directAuthority(c)) implies (directOp(c.op) and not(c.workflow) and (c.op == BrowserNavigate implies c.grounded))
pure def alwaysADirectEffectServesTheCurrentRequest(c: Custody): bool = (dispatchedOnce(c) and directAuthority(c)) implies c.at.bound
pure def alwaysAtMostFourDirectPerMessage(c: Custody): bool =
  c.pass <= directPerMessage and c.passEffects <= directPerMessage and c.passEffects <= c.pass + 1
pure def alwaysReviewFirstBlocksEveryDirectEffect(c: Custody): bool =
  ((dispatchedOnce(c) and directAuthority(c)) implies not(c.at.asks)) and ((c.busy and c.authority == ByRequest and c.journal == JournalEmpty) implies not(asks(c)))
pure def alwaysASettingIsOnlyEverNavigated(c: Custody): bool =
  c.op == SettingsWrite implies (not(c.card) and not(c.busy) and c.dispatches == 0 and c.journal == JournalEmpty)
pure def alwaysAWorkflowStepIsNeverDirect(c: Custody): bool = c.workflow implies (not(directAuthority(c)) and not(c.busy and c.authority == ByRequest))
pure def alwaysOneBrowserOpenPerMessage(c: Custody): bool = c.browserAuto <= 1
pure def statesDirectRequests(reviewFirst: Preference): bool = reviewFirst == PreferenceOff
pure def lawATurnStatesDirectRequestsOnlyWithReviewFirstOff(reviewFirst: Preference): bool =
  statesDirectRequests(reviewFirst) iff not(asks(prefer(initial, reviewFirst)))
```

### A card is listed only on the foreground, recovered only under the current screen, and approved only under the session that listed it

The foreground listing never admits a workflow step or an operation outside
the contract; a workflow step is admitted only by its own run's review. A
reply lists the proposals bound to its message and, as cards, the pending
ones the agent made for review, which carry no message
(`spec/agent/deviceActions/index.md` of Eliza), unless they were drawn
already.
Recovery after the conversation reopened lists no expired proposal and
nothing on a private screen. A recovered card from another agent session is
refused before any journal work ("The agent changed. Review this action
again.").

```quint
pure def listable(c: Custody): bool = not(c.busy) and parses(c.op) and not(c.workflow)
pure def canReview(c: Custody, visible: bool): bool = not(c.busy) and (visible implies listable(c))
pure def review(c: Custody, visible: bool): Custody = { ...c, card: visible, fresh: true, route: LiveRoute, cardSession: c.session }
pure def canReviewWorkflow(c: Custody): bool = not(c.busy) and c.workflow and parses(c.op)
pure def reviewWorkflow(c: Custody): Custody = { ...c, card: true, fresh: true, route: LiveRoute, cardSession: c.session }
pure def canRecover(c: Custody): bool = listable(c) and not(c.sensitive) and not(c.expired)
pure def recover(c: Custody): Custody = { ...c, card: true, fresh: true, route: RecoveredRoute, cardSession: c.session }
pure def canChangeAgent(c: Custody): bool = not(c.busy)
pure def changeAgent(c: Custody): Custody = { ...c, session: c.session + 1 }
pure def canRestart(c: Custody): bool = not(c.busy)
pure def restart(c: Custody): Custody = { ...c, card: false }
pure def canChangeContext(c: Custody): bool = not(c.busy)
pure def changeContext(c: Custody): Custody = { ...c, fresh: false }
pure def canBecomeSensitive(c: Custody): bool = not(c.busy)
pure def becomeSensitive(c: Custody): Custody = { ...c, sensitive: true, fresh: false }
pure def expire(c: Custody): Custody = { ...c, expired: true }
pure def abort(c: Custody): Custody = { ...c, aborted: true }
pure def sameSession(c: Custody): bool = c.cardSession == c.session
pure def mayApproveCard(c: Custody): bool = c.card and not(c.busy) and valid(c) and (c.route == RecoveredRoute implies sameSession(c))
pure def mayDirect(c: Custody): bool = mayApproveCard(c) and not(asks(c)) and c.bound and eligible(c) and c.passOpen and c.pass < directPerMessage
pure def alwaysARecoveredEffectRanUnderItsListingSession(c: Custody): bool =
  (dispatchedOnce(c) and c.at.route == RecoveredRoute and c.at.authority == ByReview) implies c.at.sameSession
pure def alwaysARecoveredEffectWasUnexpired(c: Custody): bool = (dispatchedOnce(c) and c.at.route == RecoveredRoute) implies not(c.at.expired)
pure def sometimesARecoveredEffect(c: Custody): bool = dispatchedOnce(c) and c.at.route == RecoveredRoute and c.returned == Succeeded
```

### An approval consumes its card before it waits, and the executor runs only after an exact reservation, a decision and a claim

```quint
pure def canBegin(c: Custody, byRequest: bool): bool = if (byRequest) mayDirect(c) else mayApproveCard(c)
pure def begin(c: Custody, byRequest: bool): Custody =
  { ...c, card: false, busy: true, returned: NotSettled, synced: false,
    browserUsed: c.browserUsed or (byRequest and c.op == BrowserNavigate), authority: if (byRequest) ByRequest else ByReview }
pure def canReserve(c: Custody, exact: bool): bool = c.busy and c.journal == JournalEmpty
pure def reserve(c: Custody, exact: bool): Custody = { ...c, journal: JournalReserved, identity: exact }
pure def canDecide(c: Custody): bool = c.busy and c.journal == JournalReserved and c.identity and valid(c)
pure def decide(c: Custody): Custody = { ...c, decisions: c.decisions + 1 }
pure def canClaim(c: Custody): bool = c.busy and c.journal == JournalReserved and c.decisions > c.claims and valid(c)
pure def claim(c: Custody): Custody = { ...c, claims: c.claims + 1 }
pure def canMarkApplying(c: Custody): bool = c.busy and c.journal == JournalReserved and c.claims > 0 and valid(c)
pure def markApplying(c: Custody): Custody = { ...c, journal: JournalApplying }
pure def canDispatch(c: Custody): bool =
  c.busy and c.journal == JournalApplying and c.identity and valid(c) and c.dispatches == 0 and c.authority != NoAuthority
pure def dispatch(c: Custody): Custody =
  { ...c, dispatches: 1,
    at: { authority: c.authority, expired: c.expired, fresh: c.fresh, sensitive: c.sensitive, asks: asks(c), bound: c.bound, route: c.route, sameSession: sameSession(c) },
    passEffects: c.passEffects + (if (c.authority == ByRequest) 1 else 0),
    browserAuto: c.browserAuto + (if (c.authority == ByRequest and c.op == BrowserNavigate) 1 else 0),
    admitted: valid(c) and (c.authority == ByReview or (c.authority == ByRequest and not(asks(c)) and c.bound and directOp(c.op) and not(c.workflow))) }
pure def alwaysAnEffectHadAReservationAndAClaim(c: Custody): bool =
  dispatchedOnce(c) implies ((c.journal == JournalApplying or c.journal == JournalTerminal) and c.decisions > 0 and c.claims > 0 and c.identity)
pure def alwaysOneEffectPerProposal(c: Custody): bool = c.dispatches == 0 or c.dispatches == 1
pure def alwaysAnExpiredProposalNeverRuns(c: Custody): bool = dispatchedOnce(c) implies not(c.at.expired)
pure def alwaysAChangedScreenRetiresTheProposal(c: Custody): bool = dispatchedOnce(c) implies c.at.fresh
pure def alwaysAPrivateScreenNeverRuns(c: Custody): bool = dispatchedOnce(c) implies not(c.at.sensitive)
pure def alwaysAnEffectWasAuthorized(c: Custody): bool = dispatchedOnce(c) implies (c.admitted and c.authority != NoAuthority)
pure def alwaysTheCardIsConsumedBeforeTheWait(c: Custody): bool = c.busy implies not(c.card)
pure def sometimesADirectEffect(c: Custody): bool = dispatchedOnce(c) and directAuthority(c) and c.returned == Succeeded
```

### A result is settled once, uploaded only from the terminal journal, and "unknown" only for an attempt that reached the executor

A failure before dispatch answers "failed" and ends the direct pass. A
journal that already holds an applying or finished attempt for the proposal
is not repeated, and the call cannot say what that attempt did.

```quint
pure def canSettleCustody(c: Custody, result: Settled): bool =
  c.busy and c.journal == JournalApplying and result != NotSettled and (c.dispatches == 0 implies result == FailedResult)
pure def settleCustody(c: Custody, result: Settled): Custody = { ...c, journal: JournalTerminal, status: result }
pure def canUpload(c: Custody): bool = c.busy and c.journal == JournalTerminal
pure def upload(c: Custody): Custody = { ...c, receipts: c.receipts + 1 }
pure def leave(result: Settled, c: Custody): Custody =
  { ...c, busy: false, returned: result, pass: c.pass + (if (c.authority == ByRequest) 1 else 0),
    passOpen: c.passOpen and (c.authority != ByRequest or (result == Succeeded and not(c.aborted))) }
pure def canFinish(c: Custody, synced: bool): bool = c.busy and c.journal == JournalTerminal
pure def finish(c: Custody, synced: bool): Custody = { ...leave(c.status, c), synced: synced }
pure def canAbandon(c: Custody): bool = c.busy
pure def abandon(c: Custody): Custody = leave(if (c.dispatches == 1) UnknownResult else FailedResult, c)
pure def canDuplicate(c: Custody): bool = c.busy and (c.journal == JournalApplying or c.journal == JournalTerminal) and c.dispatches == 0
pure def duplicate(c: Custody): Custody = leave(UnknownResult, c)
pure def alwaysAReceiptFollowsTheTerminalJournal(c: Custody): bool = c.receipts > 0 implies c.journal == JournalTerminal
pure def alwaysUnknownIsJournaledOnlyAfterDispatch(c: Custody): bool = c.status == UnknownResult implies dispatchedOnce(c)
pure def alwaysUnknownIsAnsweredOnlyAfterDispatchOrAnEarlierAttempt(c: Custody): bool =
  c.returned == UnknownResult implies (dispatchedOnce(c) or c.journal == JournalApplying or c.journal == JournalTerminal)
pure def sometimesFailedWithoutDispatch(c: Custody): bool = c.returned == FailedResult and not(dispatchedOnce(c)) and not(c.busy)
pure def sometimesTheDirectPassEnded(c: Custody): bool = not(c.passOpen) and c.pass >= 1
pure val weight_dispatch = 3
pure val weight_markApplying = 3
pure val weight_claim = 3
pure val weight_decide = 3
pure val weight_reserve = 3
```

## Story: Act only on what I asked for

> As the owner, when my message names a number, a site or a photo, I want
> the agent's proposal to match what I wrote, so that it never calls, texts
> or opens something I did not ask for.

### A call, dial or text that contradicts the number I wrote gets a notice instead of a card, and is rejected so a reload cannot bring it back

A written number has at least seven digits; numbers match on their digits
or their last ten. A contact chosen in place of a written number
contradicts it unless the owner also wrote that contact's name. The
message's own text body is removed first, as whole words. The notice reads
"That is not the number in your message, so nothing was called or sent.
Ask again with the number." (for a contact: "…so nothing was saved.").

```quint
type Target = NumberTarget({ matches: bool }) | ContactTarget({ nameWritten: bool }) | NoTarget
pure val writtenDigits = 7
pure def contradicts(writtenNumbers: int, target: Target): bool =
  writtenNumbers >= 1 and (match target {
    | NumberTarget(x) => not(x.matches)
    | ContactTarget(x) => not(x.nameWritten)
    | NoTarget => false })
pure def carded(writtenNumbers: int, target: Target): bool = not(contradicts(writtenNumbers, target))
pure def lawAWrongNumberIsNeverACard(n: int): bool = n >= 1 implies not(carded(n, NumberTarget({ matches: false })))
pure def lawANamedContactIsNotAContradiction(n: int): bool = carded(n, ContactTarget({ nameWritten: true }))
pure def lawNoWrittenNumberContradictsNothing(target: Target): bool = carded(0, target)
pure val nValues = Set(0, 1, 2)
pure val targetValues = Set(NoTarget).union(Set(NumberTarget({ matches: true }))).union(Set(NumberTarget({ matches: false })))
  .union(Set(ContactTarget({ nameWritten: true }))).union(Set(ContactTarget({ nameWritten: false })))
```

### The keypad opens directly only for a number I typed, a photo only for my own photo request, and Browser only for an address or search I wrote or my own ask for its tab list

A photo runs directly at most once per message and only on a visible,
uncovered viewfinder; the request is at most 512 characters with no
question mark in its first 80. An ungrounded Browser proposal of the
current message gets the notice "I only open a site or search you ask for
yourself" with an example, and no card; a grounded one that is not a
direct command keeps its review card. Showing Browser's own list of open
tabs uses Browser's whole-message tab list request ([Browser session](../browser/session.md)).
"Show my open tabs" and "What tabs do I have open?" open the list without a
card. Binding a tab-list proposal to unrelated words does not authorize it to open. A Browser open of a link of the
page my message carried ([Turn context](./context.md)), exactly as the page
gave it, also keeps its review card and never opens on its own (#1444): the
page's words are not the owner's, so such an open counts as not typed even
when its family grounds it for a card. A
Browser tab switch that matches several tabs never runs directly.

```quint
pure val photoRequestLimit = 512
pure val photoPrefixLimit = 80
pure def keypadDirect(number: bool, typed: bool): bool = not(number) or typed
pure def photoDirect(ownRequest: bool, len: int, alreadyTaken: bool): bool = ownRequest and len >= 1 and len <= photoRequestLimit and not(alreadyTaken)
pure def browserDirect(grounded: bool, command: bool, ambiguousTab: bool): bool = grounded and command and not(ambiguousTab)
pure def browserCommanded(typedCommand: bool, tabList: bool, askedForTabs: bool): bool =
  if (tabList) askedForTabs else typedCommand
pure def browserNoticeInstead(grounded: bool): bool = not(grounded)
pure def lawAnUntypedNumberNeverDials(typed: bool): bool = typed or not(keypadDirect(true, typed))
pure def lawOnePhotoPerMessage(own: bool, len: int): bool = not(photoDirect(own, len, true))
pure def lawAnAmbiguousTabNeedsTheOwner(grounded: bool, command: bool): bool = not(browserDirect(grounded, command, true))
pure def lawATabListNeedsItsOwnRequest(typedCommand: bool, askedForTabs: bool): bool =
  browserCommanded(typedCommand, true, askedForTabs) == askedForTabs
pure def lawOtherwiseTheWordsCommand(typedCommand: bool, askedForTabs: bool): bool =
  browserCommanded(typedCommand, false, askedForTabs) == typedCommand
pure def browserCarded(grounded: bool, pageLink: bool): bool = grounded or pageLink
pure def ownerTyped(grounded: bool, pageLink: bool): bool = grounded and not(pageLink)
pure def lawAPageLinkIsNeverOwnerTyped(grounded: bool): bool = not(ownerTyped(grounded, true))
pure def lawAPageLinkKeepsItsCardAndNeverRunsDirectly(command: bool): bool = browserCarded(false, true) and not(browserDirect(false, command, false))
pure def lawAnUngroundedOpenGetsTheNotice(pageLink: bool): bool = not(browserCarded(false, pageLink)) implies browserNoticeInstead(false)
pure val lenValues = Set(0, 1, 512, 513)
```

### A card that acts on a set it lists is offered only once it listed a non-empty set on this phone, and approved only from the latest review that listed it

Closing every Browser tab is offered only as a card that lists the tabs
that will close, read from Browser on this phone when the card is first
drawn and bound to that proposal; a private tab is counted, not named, and
the agent never receives the list (#1443). A proposal whose set cannot be
listed, or is empty, gets a notice instead of a card ("Close all tabs: …").
A new review forgets every earlier listing, and approval never reads the
set again: reading binds a list, and only a card may do that. Its executor
acts on exactly the listed set or on nothing.

```quint
type Listing = NotItemized | Unlisted | ListedEmpty | Listed
pure def cardOffered(l: Listing): bool = l == NotItemized or l == Listed
pure def noticeInstead(l: Listing): bool = l == Unlisted or l == ListedEmpty
pure def approvable(l: Listing, listedInLatestReview: bool): bool = l == NotItemized or (l == Listed and listedInLatestReview)
pure def lawAnUnlistedSetIsNeverACard(l: Listing): bool = (l == Unlisted or l == ListedEmpty) implies not(cardOffered(l))
pure def lawAnItemizedCardNeedsTheLatestListing(l: Listing): bool = l != NotItemized implies not(approvable(l, false))
pure def lawEveryOfferIsACardOrANotice(l: Listing): bool = cardOffered(l) or noticeInstead(l)
pure val lValues = Set(NotItemized, Unlisted, ListedEmpty, Listed)
```

## Story: Find what a card is about

> As the owner, I want a card's link to open the view its action is about,
> so that I can check a reminder, a note or a place before I approve.

### A card opens the view its family names, or else the view of its operation's class

A family that names a destination keeps it. Otherwise a reminder, read or
created, opens Reminders; a note or a note read opens Notes; a Calendar
read or change opens Calendar; a file opens Files; a photo change opens
Photos and a capture Camera; a Browser open opens Browser; a Maps read
opens Maps; a view or a Settings page opens nothing of its own, and a call,
text or contact change opens the app its family names.

```quint
pure def destinationOf(op: Op): str = match op {
  | CreateReminder => "reminders" | RemindersRead => "reminders" | CreateNote => "notes" | NotesRead => "notes"
  | CalendarRead => "calendar" | CalendarWrite => "calendar" | FilesOpen => "files" | FilesChange => "files"
  | PhotosChange => "photos" | CameraCapture => "camera" | BrowserNavigate => "browser" | MapsRead => "maps"
  | OpenView => "" | OpenSettings => "settings" | CommsAct => "" | SettingsWrite => "" }
pure def lawAReminderCardOpensReminders(op: Op): bool = (op == CreateReminder or op == RemindersRead) implies destinationOf(op) == "reminders"
pure def lawAMapsReadOpensMaps(op: Op): bool = op == MapsRead implies destinationOf(op) == "maps"
pure val opValues = Set(CreateReminder, RemindersRead, MapsRead, NotesRead, CommsAct, OpenView)
```

## Story: Approve a call or text where I am talking

> As the owner, I want a call, text or contact card to wait on the Phone,
> Messages and Contacts bar too, one at a time, and to act only once
> whichever of the two I approve it from.

### A comms card is staged on the comms bar when it is listed, and only the stage's open, live proposal is approved, once

Every listed call, dial, text, read or contact card is proposed to the
comms stage (`spec/telephony/comms.md`) with the words its card shows; a
newer one replaces the open one, and one that acts is dropped while an
emergency call is live. Approving it in the chat first approves it on the
stage, and a card the stage no longer holds open is not approved; approving
it from the comms bar approves it on the stage and then runs it through
this review, never twice. Declining it anywhere declines it on both.

```quint
pure def commsApproved(stageOpen: bool, live: bool, emergencyActs: bool): bool = stageOpen and live and not(emergencyActs)
pure def runsOnce(fromChat: bool, fromBar: bool): bool = not(fromChat and fromBar)
pure def lawAReplacedCommsCardNeverRuns(live: bool): bool = not(commsApproved(false, live, false))
pure def lawNothingActsOverAnEmergencyCall(open: bool): bool = not(commsApproved(open, true, true))
pure def lawBothRoutesNeverBothRun(fromChat: bool): bool = runsOnce(fromChat, false) and not(runsOnce(true, true))
```

## Story: Let a workflow use my phone only for the step I approved

> As the owner, I want a phone step of a workflow to run only for the run
> and step I approved in Workflows, exactly once, so that a workflow never
> acts in the chat or on its own.

### A workflow-bound proposal runs only from its own run's step review, once, and its executor knows the run

A proposal whose binding names a workflow run is never listed in the chat
and never runs directly. Once the owner approved the step in Workflows and
the agent admitted it, the step's review asks the device review for the
proposal bound to exactly that run and step; it runs once as reviewed, and
its executor learns the run, version and step it serves, so a Notes save
or a notification knows it is a workflow's. Another run's or step's
proposal is left alone.

```quint
pure def workflowStepRuns(bound: bool, sameRun: bool, sameStep: bool, admitted: bool, consumed: bool): bool =
  bound and sameRun and sameStep and admitted and not(consumed)
pure def lawAnotherRunsProposalNeverRuns(atStep: bool): bool = not(workflowStepRuns(true, false, atStep, true, false))
pure def lawAWorkflowStepRunsOnce(sameRun: bool): bool = not(workflowStepRuns(true, sameRun, true, true, true))
pure def lawAnUnboundProposalIsNotAStep(sameRun: bool): bool = not(workflowStepRuns(false, sameRun, true, true, false))
```
