# Google connection

The owner's managed Google connection through Eliza Cloud (`/api/v1/eliza/google/*`): one grant can
authorize Gmail and Calendar together. Gmail asks first for read access only; mailbox changes and
sending are incremental consents (P-37); Calendar writes need their own consent. Consent opens
Google's own page; its return to Alpha (an App Link, a browser resume or the native workspace
return) is only a reason to read the accounts again: the canonical account read is what grants
access. Every request and its readback belong to the account that started it.

## Story: Connect my Google account with the access I choose

> As the owner, I connect Google for mail and calendar with exactly the access I choose, and a
> reconnect never loses access I already gave.

### The panel reads the accounts first, and only the latest read for this account counts

```quint
type GPhase = GIdle | GWaiting | GRefreshing | GDenied | GFailed | GDisconnecting
type Panel = PanelClosed | SettingsPanel | CalendarPanel
type DisconnectOutcome = NoDisconnect | Disconnected | StillConnected | DisconnectUnconfirmed
type Capability = GmailRead | GmailModify | GmailSend | CalendarRead | CalendarWrite
type GrantRead = { account: int, gmailRead: bool, gmailModify: bool, gmailSend: bool, calendar: bool, calendarEdit: bool, readOk: bool }
type Google = {
  owner: int, attempt: int, phase: GPhase, account: int, readGrant: bool, modifyGrant: bool, sendGrant: bool, calendarGrant: bool, calendarWrite: bool,
  cacheVisible: bool, review: bool, outcome: DisconnectOutcome, rowsKnown: bool, backgrounded: bool,
  panel: Panel, reads: int, readPending: bool, verified: bool, held: Set[Capability], unverified: bool, choice: bool, calendarAllowed: bool,
  asked: Set[Capability], requested: Set[Capability], heldAtRequest: Set[Capability], dispatches: int, published: int
}
type GoogleEffect = ReadAccounts | StartConsent | CancelConsent | RevokeGrant
type GoogleStep = { state: Google, out: List[GoogleEffect] }
pure val initial: Google = {
  owner: 0, attempt: 0, phase: GIdle, account: 0, readGrant: false, modifyGrant: false, sendGrant: false, calendarGrant: false, calendarWrite: false,
  cacheVisible: false, review: false, outcome: NoDisconnect, rowsKnown: false, backgrounded: false,
  panel: PanelClosed, reads: 0, readPending: false, verified: false, held: Set(), unverified: false, choice: false, calendarAllowed: false,
  asked: Set(), requested: Set(), heldAtRequest: Set(), dispatches: 0, published: 0
}
pure def capIf(on: bool, c: Capability): Set[Capability] = if (on) Set(c) else Set()
pure def capsOf(g: GrantRead): Set[Capability] = {
  val has = g.account != 0
  capIf(has and g.gmailRead, GmailRead).union(capIf(has and g.gmailRead and g.gmailModify, GmailModify))
    .union(capIf(has and g.gmailRead and g.gmailSend, GmailSend)).union(capIf(has and g.calendar, CalendarRead))
    .union(capIf(has and g.calendar and g.calendarEdit, CalendarWrite))
}
pure def withRead(count: int, g: Google): GoogleStep = { state: { ...g, reads: count, readPending: true }, out: List(ReadAccounts) }
pure val readValues = Set(
  { account: 1, gmailRead: true, gmailModify: true, gmailSend: false, calendar: true, calendarEdit: false, readOk: true },
  { account: 2, gmailRead: true, gmailModify: false, gmailSend: false, calendar: true, calendarEdit: true, readOk: true },
  { account: 0, gmailRead: false, gmailModify: false, gmailSend: false, calendar: false, calendarEdit: false, readOk: true },
  { account: 1, gmailRead: false, gmailModify: false, gmailSend: false, calendar: false, calendarEdit: false, readOk: false })
pure val readIdValues = Set(1, 2, 3)
pure def canOpenPanel(g: Google, panel: Panel): bool = g.owner != 0 and panel != PanelClosed and g.panel == PanelClosed
pure def openPanel(g: Google, panel: Panel): GoogleStep =
  withRead(g.reads + 1, { ...g, panel: panel, verified: false, held: Set(), unverified: false, choice: false, asked: Set() })
pure def canClosePanel(g: Google): bool = g.panel != PanelClosed
pure def closePanel(g: Google): Google = { ...g, panel: PanelClosed, verified: false, held: Set(), unverified: false, choice: false, asked: Set() }
pure def canReload(g: Google): bool = g.panel != PanelClosed and g.phase != GWaiting and g.phase != GDisconnecting
pure def reload(g: Google): GoogleStep = withRead(g.reads + 1, { ...g, verified: false, held: Set(), choice: false, asked: Set() })
pure def canAccountsRead(g: Google, readId: int, read: GrantRead): bool = g.readPending and readId >= 1 and readId <= g.reads
pure def accountsRead(g: Google, readId: int, read: GrantRead): Google =
  if (readId != g.reads or g.phase == GDisconnecting) { ...g, readPending: readId != g.reads and g.readPending }
  else if (not(read.readOk)) { ...g, readPending: false, verified: false, held: Set(), unverified: true, choice: false, asked: Set(),
    phase: if (g.phase == GRefreshing or g.phase == GDenied) GFailed else g.phase }
  else {
    val has = read.account != 0
    { ...g, readPending: false, verified: g.panel != PanelClosed, held: capsOf(read), unverified: false,
      phase: if (g.phase == GWaiting) GWaiting else GIdle, account: read.account,
      readGrant: read.gmailRead and has, modifyGrant: read.gmailModify and read.gmailRead and has, sendGrant: read.gmailSend and read.gmailRead and has,
      calendarGrant: read.calendar and has, calendarWrite: read.calendarEdit and read.calendar and has,
      cacheVisible: false, review: false, outcome: NoDisconnect, rowsKnown: false }
  }
pure def alwaysAVerifiedReadIsTheOpenPanels(g: Google): bool = g.verified implies g.panel != PanelClosed
pure def alwaysChangesIncludeReading(g: Google): bool = (g.modifyGrant or g.sendGrant) implies g.readGrant
pure def alwaysCalendarEditsIncludeReading(g: Google): bool = g.calendarWrite implies g.calendarGrant
```

### Consent asks for the capabilities a caller names, after a current read, and never for less than the account holds

Inbox and Calendar request access one capability at a time (AP-09): Gmail read, Gmail changes,
Gmail send, Calendar read and Calendar edits. Changes and sending include reading, and edits
include Calendar reading. Cloud maps exactly the requested capabilities to Google scopes, so the
request also names everything the account already holds; a reconnect never drops an earlier grant.
Asking for Calendar edits first asks the owner to allow the agent's Calendar edits.

```quint
pure def listed(capabilities: List[Capability]): Set[Capability] = capabilities.foldl(Set(), (acc, c) => acc.union(Set(c)))
pure def implied(asked: Set[Capability]): Set[Capability] =
  asked.union(capIf(asked.contains(GmailModify) or asked.contains(GmailSend), GmailRead)).union(capIf(asked.contains(CalendarWrite), CalendarRead))
pure def dispatched(asked: Set[Capability], g: Google): GoogleStep =
  { state: { ...g, phase: GWaiting, attempt: g.attempt + 1, requested: implied(asked).union(g.held), heldAtRequest: g.held, asked: Set(),
      dispatches: g.dispatches + 1, backgrounded: false, unverified: false, choice: false }, out: List(StartConsent) }
pure val capabilitiesValues = Set(List(GmailRead), List(GmailModify), List(CalendarRead, CalendarWrite), List(GmailSend, CalendarRead), List())
pure def startable(g: Google): bool = not(g.readPending) and (g.phase == GIdle or g.phase == GDenied or g.phase == GFailed)
pure def canConnect(g: Google, capabilities: List[Capability]): bool =
  g.panel != PanelClosed and startable(g) and not(g.choice) and capabilities.length() >= 1
pure def connect(g: Google, capabilities: List[Capability]): GoogleStep = {
  val asked = listed(capabilities)
  if (not(g.verified)) { state: { ...g, unverified: true }, out: List() }
  else if (asked.contains(CalendarWrite) and not(g.calendarAllowed)) { state: { ...g, choice: true, asked: asked }, out: List() }
  else dispatched(asked, g)
}
pure def canAllowCalendar(g: Google): bool = g.choice and startable(g)
pure def allowCalendar(g: Google): GoogleStep =
  if (not(g.verified)) { state: { ...g, calendarAllowed: true, choice: false, asked: Set(), unverified: true }, out: List() }
  else dispatched(g.asked, { ...g, calendarAllowed: true })
pure def lawChangesIncludeReading(capabilities: List[Capability]): bool = {
  val asked = implied(listed(capabilities))
  (asked.contains(GmailModify) or asked.contains(GmailSend) implies asked.contains(GmailRead)) and (asked.contains(CalendarWrite) implies asked.contains(CalendarRead))
}
pure def stepConsentFollowsACurrentRead(before: Google, via: str, after: Google, out: List[GoogleEffect]): bool =
  out.includes(StartConsent) implies (before.verified and not(before.readPending))
pure def alwaysARequestKeepsEveryGrant(g: Google): bool = g.dispatches > 0 implies (g.heldAtRequest.subseteq(g.requested) and g.requested.size() >= 1)
pure def alwaysTheAllowChoiceFollowsARead(g: Google): bool = g.choice implies (g.verified and g.asked.contains(CalendarWrite))
pure def sometimesAskedToAllowCalendar(g: Google): bool = g.choice
pure def sometimesReconnectKeptModify(g: Google): bool =
  g.dispatches >= 1 and g.heldAtRequest.contains(GmailModify) and g.requested.contains(GmailModify) and g.requested.contains(CalendarWrite)
```

### A return asks for a read and never grants access by itself

A matching App Link return reads again (a refusal reads too); a stale one changes nothing. A
browser resume after the app went to the background reads again. The native workspace return
publishes connected, denied or failed, which reads again; anything else is ignored.

```quint
type WorkspaceResult = ReturnNone | ReturnConnected | ReturnDenied | ReturnFailed | ReturnInvalid
pure val attemptValues = Set(1, 2)
pure def canAppReturn(g: Google, attempt: int, granted: bool): bool = g.phase == GWaiting
pure def appReturn(g: Google, attempt: int, granted: bool): GoogleStep =
  if (attempt != g.attempt) { state: g, out: List() }
  else withRead(g.reads + 1, { ...g, phase: if (granted) GRefreshing else GDenied })
pure def canBackgrounded(g: Google): bool = g.phase == GWaiting and not(g.backgrounded)
pure def backgrounded(g: Google): Google = { ...g, backgrounded: true }
pure def canBrowserResumed(g: Google): bool = g.phase == GWaiting and g.backgrounded
pure def browserResumed(g: Google): GoogleStep = withRead(g.reads + 1, { ...g, phase: GRefreshing, backgrounded: false })
pure def canWorkspaceReturn(g: Google, result: WorkspaceResult): bool = g.owner != 0 and g.phase != GDisconnecting
pure def workspaceReturn(g: Google, result: WorkspaceResult): GoogleStep =
  if (result == ReturnConnected or result == ReturnDenied or result == ReturnFailed) withRead(g.reads + 1, { ...g, phase: GRefreshing, published: g.published + 1 })
  else { state: g, out: List() }
pure def canCancelWait(g: Google): bool = g.phase == GWaiting
pure def cancelWait(g: Google): GoogleStep = { state: { ...g, phase: GIdle, backgrounded: false }, out: List(CancelConsent) }
pure def sameGrants(a: Google, b: Google): bool =
  a.account == b.account and a.readGrant == b.readGrant and a.modifyGrant == b.modifyGrant and a.sendGrant == b.sendGrant
    and a.calendarGrant == b.calendarGrant and a.calendarWrite == b.calendarWrite
pure def stepAReturnNeverGrantsAccess(before: Google, via: str, after: Google): bool =
  (via == "appReturn" or via == "browserResumed" or via == "workspaceReturn" or via == "backgrounded") implies sameGrants(before, after)
pure def sometimesWorkspaceReturnRead(g: Google): bool = g.published >= 1 and g.phase == GIdle and g.account != 0
pure def sometimesDenied(g: Google): bool = g.phase == GDenied
```

### Google's consent page is the only page consent opens

Consent opens only Google's own authorization page whose callback is a listed Cloud callback and
whose scopes are the managed Google scopes.

```quint
type ConsentPage = { googleOrigin: bool, callbackListed: bool, scopesListed: bool, carriesCredentials: bool }
pure def consentPageAllowed(p: ConsentPage): bool = p.googleOrigin and p.callbackListed and p.scopesListed and not(p.carriesCredentials)
pure val pValues = Set({ googleOrigin: true, callbackListed: true, scopesListed: true, carriesCredentials: false },
  { googleOrigin: false, callbackListed: true, scopesListed: true, carriesCredentials: false },
  { googleOrigin: true, callbackListed: false, scopesListed: true, carriesCredentials: false },
  { googleOrigin: true, callbackListed: true, scopesListed: true, carriesCredentials: true })
pure def lawOnlyGooglesOwnPageOpens(p: ConsentPage): bool = consentPageAllowed(p) implies (p.googleOrigin and not(p.carriesCredentials))
```

## Story: Use and remove my Google access

> As the owner, I see cached mail only while I hold read access, review a change only while I hold
> change access, and disconnect Google knowing whether Cloud confirmed it.

### Cached mail needs read access, and a review needs change access

```quint
pure def canShowCache(g: Google): bool = g.readGrant and g.account != 0 and not(g.cacheVisible)
pure def showCache(g: Google): Google = { ...g, cacheVisible: true }
pure def canPrepareReview(g: Google): bool = g.modifyGrant and g.account != 0 and not(g.review)
pure def prepareReview(g: Google): Google = { ...g, review: true }
pure def alwaysTheCacheNeedsRead(g: Google): bool = g.cacheVisible implies (g.readGrant and g.account != 0)
pure def alwaysAReviewNeedsCurrentChangeAccess(g: Google): bool = g.review implies (g.modifyGrant and g.account != 0)
```

### A disconnect is confirmed only by reading the accounts back

Disconnecting revokes Cloud's stored grant for the connection; it deletes no mail and cannot remove
the app from the Google Account's permissions. Only a readback that no longer lists the account is
a disconnect; one that cannot be read is unconfirmed.

```quint
pure def canDisconnect(g: Google): bool = g.account != 0 and g.phase != GDisconnecting and g.phase != GWaiting
pure def disconnect(g: Google): GoogleStep =
  { state: { ...g, phase: GDisconnecting, review: false, cacheVisible: false, outcome: NoDisconnect, rowsKnown: false }, out: List(RevokeGrant) }
pure val disconnectedValues = Set(Disconnected, StillConnected, DisconnectUnconfirmed)
pure def canDisconnectRead(g: Google, outcome: DisconnectOutcome, rowsKnown: bool): bool =
  g.phase == GDisconnecting and outcome != NoDisconnect and (not(rowsKnown) implies outcome == DisconnectUnconfirmed)
pure def disconnectRead(g: Google, outcome: DisconnectOutcome, rowsKnown: bool): Google = {
  val gone = outcome == Disconnected
  { ...g, phase: if (gone) GIdle else GFailed, outcome: outcome, rowsKnown: rowsKnown,
    account: if (gone) 0 else g.account, readGrant: g.readGrant and not(gone), modifyGrant: g.modifyGrant and not(gone),
    sendGrant: g.sendGrant and not(gone), calendarGrant: g.calendarGrant and not(gone), calendarWrite: g.calendarWrite and not(gone),
    held: if (gone) Set() else g.held, cacheVisible: false, review: false }
}
pure def alwaysADisconnectedAccountIsGone(g: Google): bool = g.outcome == Disconnected implies (g.account == 0 and not(g.readGrant))
pure def alwaysAnOutcomeNeedsItsReadback(g: Google): bool = (g.outcome == Disconnected or g.outcome == StillConnected) implies g.rowsKnown
pure def sometimesDisconnected(g: Google): bool = g.outcome == Disconnected
pure def sometimesDisconnectUnconfirmed(g: Google): bool = g.outcome == DisconnectUnconfirmed and g.account != 0
```

### Another account starts the connection over

```quint
pure val ownerValues = Set(1, 2)
pure def canOwnerChanged(g: Google, owner: int): bool = owner != g.owner and owner >= 0
pure def ownerChanged(g: Google, owner: int): Google = { ...initial, owner: owner, attempt: g.attempt, reads: g.reads }
pure def stepAnotherAccountSeesNoGrant(before: Google, via: str, after: Google): bool =
  via == "ownerChanged" implies (after.account == 0 and not(after.readGrant) and after.panel == PanelClosed and after.phase == GIdle)
```
