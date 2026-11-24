# Files agent operations

What the phone does with the agent's Files operations. The phone advertises `files.browser.v1` to a
resident agent that negotiates it, and `files.shown-target.v1` beside it only when the agent negotiates
that too. `files_filter` and `files_open` change nothing: they run without a card from any unprotected
screen and may bring Files forward. `files_share`, `files_move`, `files_trash` and
`files_folder_create` are proposals the owner reviews with Files on screen. A move or trash carries the
identity of each file as the phone read it when it built the card, and the device leaves alone any file
that changed since. With the shown-target capability a share, move or trash may name files by their
positions in the filter results on screen; the phone turns the positions into the exact paths before
the card is built, so the owner reviews the actual files and no file name reaches the agent. Without
it, a proposal by position is not available on this phone. Claim, journal and retry of an approved
operation are the assistant's device-action custody.

## Domain

### One operation, the screen it meets and what it did

```quint
type AgentOp = OpFilter | OpOpen | OpShare | OpFolderCreate | OpMove | OpTrash
type Target = ByPaths | ByShown | ResolvedShown
type Negotiated = NoFiles | BrowserOnly | WithShownTargets
type AgentView = OnHome | OnFiles | OnOther
type Authority = NoAuthority | DirectRequest | OwnerReview
type AgentOutcome = Unsettled | Succeeded | Failed | NotAvailable
type Proposal = { op: AgentOp, target: Target, negotiated: Negotiated, authority: Authority, view: AgentView,
  sensitive: bool, foreground: bool, primary: bool, granted: bool, bound: bool, identityCurrent: bool, shownCurrent: bool,
  navigated: bool, filtered: bool, previewed: bool, shareSheet: bool, changes: int, outcome: AgentOutcome }
pure val initial: Proposal = { op: OpFilter, target: ByPaths, negotiated: NoFiles, authority: NoAuthority, view: OnHome,
  sensitive: false, foreground: true, primary: true, granted: true, bound: false, identityCurrent: true, shownCurrent: true,
  navigated: false, filtered: false, previewed: false, shareSheet: false, changes: 0, outcome: Unsettled }
pure def direct(op: AgentOp): bool = op == OpFilter or op == OpOpen
pure def needsIdentity(op: AgentOp): bool = op == OpMove or op == OpTrash
pure def idle(s: Proposal): bool = s.authority == NoAuthority
pure def inFiles(s: Proposal): bool = s.view == OnFiles and s.foreground
pure def contextAllowed(s: Proposal): bool = not(s.sensitive) and (direct(s.op) or s.view == OnFiles)
pure def running(s: Proposal): bool = s.authority != NoAuthority and s.outcome == Unsettled
```

## Story: Offer the agent only what this phone can do

> As the owner, I want the agent to be offered Files operations only when it can use them, and a
> proposal that names files by position only when the phone can show me which files those are.

### The phone advertises the browser operations to an agent that negotiates them, and positions only beside them

`files_open` may always name the position of a result on screen; a share, move or trash only with the
shown-target capability.

```quint
pure def negotiate(phoneFiles: bool, peerBrowser: bool, peerShown: bool): Negotiated =
  if (not(phoneFiles) or not(peerBrowser)) NoFiles else if (peerShown) WithShownTargets else BrowserOnly
pure def acceptsTarget(negotiated: Negotiated, op: AgentOp, target: Target): bool =
  negotiated != NoFiles and (target == ByPaths or ((target == ByShown or target == ResolvedShown) and op != OpFilter and op != OpFolderCreate and (op == OpOpen or negotiated == WithShownTargets)))
pure def lawPositionsNeedTheirCapability(op: AgentOp, peerBrowser: bool): bool =
  (op == OpShare or op == OpMove or op == OpTrash) implies not(acceptsTarget(negotiate(true, peerBrowser, false), op, ByShown))
pure def lawNoBrowserNoFiles(op: AgentOp, target: Target, peerShown: bool): bool = not(acceptsTarget(negotiate(true, false, peerShown), op, target))
pure def canNegotiateWith(s: Proposal): bool = idle(s)
pure def negotiateWith(s: Proposal, peerBrowser: bool, peerShown: bool): Proposal = {
  val n = negotiate(true, peerBrowser, peerShown)
  { ...s, negotiated: n, outcome: if (s.outcome == Unsettled and not(acceptsTarget(n, s.op, s.target))) NotAvailable else s.outcome }
}
```

### A proposal the phone cannot take is not available, and is never shown for approval

```quint
pure def canPropose(s: Proposal): bool = idle(s)
pure def propose(s: Proposal, op: AgentOp, target: Target): Proposal =
  { ...s, op: op, target: target, bound: false, identityCurrent: true, shownCurrent: true, navigated: false, filtered: false,
    previewed: false, shareSheet: false, outcome: if (acceptsTarget(s.negotiated, op, target)) Unsettled else NotAvailable }
pure def alwaysPositionsNeedTheirCapability(s: Proposal): bool =
  ((s.target == ByShown or s.target == ResolvedShown) and s.op != OpOpen and s.outcome == Unsettled) implies s.negotiated == WithShownTargets
pure def sometimesUnnegotiatedPositionsRefused(s: Proposal): bool = s.outcome == NotAvailable and s.target == ByShown and s.op == OpTrash
```

## Story: Review the actual files before anything changes

> As the owner, I want a card to show me the very files it will share, move or trash, and a move or
> trash to leave alone any file that changed after I saw the card.

### Positions become the exact paths shown, while the results that were shown are still on screen

```quint
pure def canResolveShown(s: Proposal): bool =
  idle(s) and s.target == ByShown and s.op != OpOpen and s.outcome == Unsettled and inFiles(s) and s.shownCurrent
pure def resolveShown(s: Proposal): Proposal = { ...s, target: ResolvedShown }
pure def canShownChange(s: Proposal): bool = s.shownCurrent
pure def shownChange(s: Proposal): Proposal = { ...s, shownCurrent: false }
pure def alwaysUnresolvedPositionsNeverRun(s: Proposal): bool = s.authority != NoAuthority implies (s.target != ByShown or s.op == OpOpen)
```

### A move or trash card binds the identity of each file as primary storage reads it in the open view

```quint
pure def canBindIdentities(s: Proposal): bool =
  idle(s) and needsIdentity(s.op) and s.target != ByShown and s.outcome == Unsettled and inFiles(s) and s.primary
pure def bindIdentities(s: Proposal): Proposal = { ...s, bound: true }
pure def canFilesChange(s: Proposal): bool = s.identityCurrent
pure def filesChange(s: Proposal): Proposal = { ...s, identityCurrent: false }
```

### A direct operation runs without a card; a reviewed one runs only after approval

Approval refuses a move or trash whose card carries no identities.

```quint
pure def canRunDirect(s: Proposal): bool = idle(s) and direct(s.op) and s.outcome == Unsettled
pure def runDirect(s: Proposal): Proposal =
  { ...s, authority: DirectRequest, navigated: false, filtered: false, previewed: false, shareSheet: false }
pure def canApprove(s: Proposal): bool =
  idle(s) and not(direct(s.op)) and s.outcome == Unsettled and s.target != ByShown and (needsIdentity(s.op) implies s.bound)
pure def approve(s: Proposal): Proposal =
  { ...s, authority: OwnerReview, navigated: false, filtered: false, previewed: false, shareSheet: false }
pure def alwaysOnlyFilterAndOpenRunDirectly(s: Proposal): bool = s.authority == DirectRequest implies direct(s.op)
```

### An operation that meets the wrong screen or no access is refused and changes nothing

```quint
pure def canRefuse(s: Proposal): bool =
  running(s) and (not(contextAllowed(s)) or not(s.foreground) or not(s.granted)
    or (needsIdentity(s.op) and (not(s.bound) or not(s.primary))) or (not(direct(s.op)) and s.view != OnFiles))
pure def refuse(s: Proposal): Proposal = { ...s, outcome: Failed }
pure def canScene(s: Proposal): bool = idle(s)
pure def scene(s: Proposal, view: AgentView, sensitive: bool, foreground: bool, primary: bool, granted: bool): Proposal =
  { ...s, view: view, sensitive: sensitive, foreground: foreground, primary: primary, granted: granted }
pure def alwaysAProtectedScreenBlocksFiles(s: Proposal): bool =
  (s.sensitive and s.authority != NoAuthority) implies (s.outcome != Succeeded and not(s.navigated))
pure def sometimesRefusedOutsideFiles(s: Proposal): bool = s.outcome == Failed and s.op == OpShare and s.view == OnHome
```

## Story: Let the agent show me files without changing them

> As the owner, I want "find my lease" to bring Files forward with the results, and "open the first one"
> to open it there, with nothing changed.

### Only filter and open bring Files forward, and they change nothing

```quint
pure def canOpenFiles(s: Proposal): bool = running(s) and contextAllowed(s) and s.foreground and s.view != OnFiles and direct(s.op)
pure def openFiles(s: Proposal): Proposal = { ...s, view: OnFiles, navigated: true }
pure def canShowFilter(s: Proposal): bool = running(s) and contextAllowed(s) and inFiles(s) and s.granted and s.op == OpFilter
pure def showFilter(s: Proposal): Proposal = { ...s, filtered: true, outcome: Succeeded }
pure def canOpenFile(s: Proposal): bool = running(s) and contextAllowed(s) and inFiles(s) and s.granted and s.op == OpOpen
pure def openFile(s: Proposal, found: bool): Proposal = {
  val ok = found and (s.target != ByShown or s.shownCurrent)
  { ...s, previewed: ok, outcome: if (ok) Succeeded else Failed }
}
pure def alwaysOnlyFilterAndOpenBringFilesForward(s: Proposal): bool = s.navigated implies direct(s.op)
pure def stepADirectOperationChangesNothing(before: Proposal, after: Proposal): bool =
  before.authority == DirectRequest implies (after.changes == before.changes and not(after.shareSheet))
pure def sometimesFilteredFromHome(s: Proposal): bool = s.filtered and s.navigated and s.outcome == Succeeded
pure def sometimesChangedResultsOpenNothing(s: Proposal): bool = s.op == OpOpen and s.target == ByShown and s.outcome == Failed and not(s.shownCurrent)
```

## Story: Carry out the change I approved, exactly

> As the owner, I want a share to open the share sheet and wait for me there, a new folder to be made
> where the card said, and a move or trash to touch only the files I reviewed, as I reviewed them.

### A share succeeds when the share sheet opened; the owner still chooses where it goes

```quint
pure def canShare(s: Proposal): bool = running(s) and contextAllowed(s) and inFiles(s) and s.granted and s.op == OpShare and s.authority == OwnerReview
pure def share(s: Proposal, opened: bool): Proposal = { ...s, shareSheet: opened, outcome: if (opened) Succeeded else Failed }
pure def alwaysTheShareSheetFollowsAReview(s: Proposal): bool = s.shareSheet implies (s.op == OpShare and s.authority != DirectRequest)
pure def alwaysASharedProposalOpenedTheSheet(s: Proposal): bool = (s.op == OpShare and s.outcome == Succeeded) implies s.shareSheet
```

### A new folder is made where the card said

```quint
pure def canCreateFolder(s: Proposal): bool = running(s) and contextAllowed(s) and inFiles(s) and s.granted and s.op == OpFolderCreate and s.authority == OwnerReview
pure def createFolder(s: Proposal, ok: bool): Proposal = { ...s, changes: s.changes + (if (ok) 1 else 0), outcome: if (ok) Succeeded else Failed }
```

### A move or trash changes only files still as they were reviewed

An operation the phone could not carry out to its end, such as a filter whose query failed or a card
that names files Files no longer shows, fails and changes nothing; only then is it settled.

```quint
pure def canTransfer(s: Proposal): bool =
  running(s) and contextAllowed(s) and inFiles(s) and s.granted and s.primary and s.bound and needsIdentity(s.op) and s.authority == OwnerReview
pure def transfer(s: Proposal): Proposal =
  { ...s, changes: s.changes + (if (s.identityCurrent) 1 else 0), outcome: if (s.identityCurrent) Succeeded else Failed }
pure def alwaysAMoveOrTrashWasReviewedByIdentity(s: Proposal): bool =
  (needsIdentity(s.op) and s.outcome == Succeeded) implies (s.authority != DirectRequest and s.bound)
pure def canGiveUp(s: Proposal): bool = running(s)
pure def giveUp(s: Proposal): Proposal = { ...s, outcome: Failed }
pure def canSettleProposal(s: Proposal): bool = s.authority != NoAuthority and s.outcome != Unsettled
pure def settleProposal(s: Proposal): Proposal = { ...s, authority: NoAuthority }
pure def sometimesMovedByPosition(s: Proposal): bool = s.op == OpMove and s.target == ResolvedShown and s.outcome == Succeeded and s.changes >= 1
pure def sometimesAChangedFileIsLeftAlone(s: Proposal): bool = s.op == OpTrash and s.outcome == Failed and s.bound and not(s.identityCurrent)
pure def stepGivingUpChangesNothing(before: Proposal, via: str, after: Proposal): bool =
  via == "giveUp" implies (after.changes == before.changes and after.shareSheet == before.shareSheet and after.outcome == Failed)
```
