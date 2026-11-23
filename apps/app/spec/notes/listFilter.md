# Notes list filter

The agent's `notes_list_filter` proposal for the canonical Notes list, under the `notes.list-filter.v1`
capability the phone negotiates for the resident connection that owns the list. A filter only narrows
what the list shows: it never moves, edits or deletes a note. It applies only to the exact list the turn
named, in the same Notes visit, and only while nothing on the phone changed. Which text and kind the
filter carries is kept by the shell under the proposal's number.

## Story: Let the agent narrow my Notes list only on the list I am looking at

> As the owner, I want the agent's suggested filter to change only the Notes list I had in front of me,
> and to be refused anywhere else or after anything changed.

### A turn names the list only while the plain list is in front, owned and settled

A message carries the canonical list, its collection revision and the Notes visit only when the plain
list is showing: no protected screen, no open note, menu, sheet, Trash or pending save in front, and the
list owned by this connection. Any change of screen, visit or owner after that is a changed context.

```quint
type Proposal = NoProposal | Admitted | RefusedProposal
type Authority = NoAuthority | DirectRequest | Reviewed
type FilterOutcome = Pending | FilterFailed | FilterUnknown | FilterSucceeded
type ListFilter = { negotiated: bool, reviewFirst: bool, onList: bool, sensitive: bool, obstructed: bool, owned: bool,
  revision: int, visit: int, named: bool, namedRevision: int, namedVisit: int, contextChanged: bool,
  proposal: Proposal, own: bool, workflow: bool, requested: int, authority: Authority, committed: bool,
  outcome: FilterOutcome, shown: int, shownBefore: int, appliedRevision: int, appliedVisit: int }
pure val initial: ListFilter = { negotiated: true, reviewFirst: false, onList: true, sensitive: false, obstructed: false, owned: true,
  revision: 0, visit: 0, named: false, namedRevision: 0, namedVisit: 0, contextChanged: false,
  proposal: NoProposal, own: false, workflow: false, requested: 0, authority: NoAuthority, committed: false,
  outcome: Pending, shown: 0, shownBefore: 0, appliedRevision: -1, appliedVisit: -1 }
pure def listObservable(s: ListFilter): bool = s.onList and not(s.sensitive) and not(s.obstructed) and s.owned
pure def contextAllowed(s: ListFilter): bool = s.named and s.onList and not(s.sensitive)
pure def stillCurrent(s: ListFilter): bool =
  listObservable(s) and contextAllowed(s) and s.namedRevision == s.revision and s.namedVisit == s.visit and not(s.contextChanged)
pure def idle(s: ListFilter): bool = s.proposal == NoProposal
pure def running(s: ListFilter): bool = s.authority != NoAuthority and s.outcome == Pending
pure def canObserve(s: ListFilter): bool = idle(s)
pure def observe(s: ListFilter): ListFilter =
  { ...s, named: listObservable(s), namedRevision: s.revision, namedVisit: s.visit, contextChanged: false }
pure def scene(s: ListFilter, onList: bool, sensitive: bool, obstructed: bool): ListFilter =
  { ...s, onList: onList, sensitive: sensitive, obstructed: obstructed,
    contextChanged: s.contextChanged or onList != s.onList or sensitive != s.sensitive or obstructed != s.obstructed }
pure def newVisit(s: ListFilter): ListFilter = { ...s, visit: s.visit + 1, contextChanged: true }
pure def canLoseOwner(s: ListFilter): bool = s.owned
pure def loseOwner(s: ListFilter): ListFilter = { ...s, owned: false, contextChanged: true }
pure def notesChange(s: ListFilter): ListFilter = { ...s, revision: s.revision + 1 }
```

### Only a negotiated agent naming the list is admitted, and only the owner's own message skips the card

A proposal from an agent that did not negotiate the capability, or from a turn that did not name the
canonical list, is refused before any card. An admitted proposal runs without a card only for the owner's
own current message, outside a workflow, with Review phone actions first off; otherwise it waits for the
owner's approval.

```quint
pure def canPrefer(s: ListFilter, reviewFirst: bool): bool = idle(s)
pure def prefer(s: ListFilter, reviewFirst: bool): ListFilter = { ...s, reviewFirst: reviewFirst }
pure def canNegotiate(s: ListFilter, offered: bool): bool = idle(s)
pure def negotiate(s: ListFilter, offered: bool): ListFilter = { ...s, negotiated: offered }
pure def canPropose(s: ListFilter, requested: int, own: bool, workflow: bool): bool = idle(s) and requested >= 1
pure def propose(s: ListFilter, requested: int, own: bool, workflow: bool): ListFilter =
  { ...s, requested: requested, own: own, workflow: workflow, shownBefore: s.shown,
    proposal: if (s.negotiated and contextAllowed(s)) Admitted else RefusedProposal }
pure def canRunDirect(s: ListFilter): bool =
  s.proposal == Admitted and s.authority == NoAuthority and s.own and not(s.workflow) and not(s.reviewFirst)
pure def runDirect(s: ListFilter): ListFilter = { ...s, authority: DirectRequest }
pure def canApprove(s: ListFilter): bool = s.proposal == Admitted and s.authority == NoAuthority
pure def approve(s: ListFilter): ListFilter = { ...s, authority: Reviewed }
pure val requestedValues = Set(1, 2)
pure def alwaysRefusedNeverRuns(s: ListFilter): bool = s.proposal == RefusedProposal implies s.authority == NoAuthority
pure def alwaysNeedsNegotiation(s: ListFilter): bool = s.proposal == Admitted implies s.negotiated and s.named
pure def alwaysOnlyOwnMessageSkipsCard(s: ListFilter): bool =
  s.authority == DirectRequest implies s.own and not(s.workflow) and not(s.reviewFirst)
pure def sometimesRefusedProposal(s: ListFilter): bool = s.proposal == RefusedProposal
```

### The filter is shown only on the list the turn named, checked again at commit

At run time and again as the list commits, the same list must be in front at the named revision, in the
same visit, with nothing changed: an older approval cannot apply after a new Notes visit even when the
revision is the same. A declined run shows nothing. Once the list committed, the exact filter on the
still current list is a success; anything else is unconfirmed. The owner clears a filter from its chip.

```quint
pure def canDecline(s: ListFilter): bool = running(s) and not(s.committed) and not(stillCurrent(s))
pure def decline(s: ListFilter): ListFilter = { ...s, outcome: FilterFailed }
pure def canCommit(s: ListFilter): bool = running(s) and not(s.committed) and stillCurrent(s)
pure def commit(s: ListFilter): ListFilter =
  { ...s, committed: true, shown: s.requested, appliedRevision: s.revision, appliedVisit: s.visit }
pure def canAfterCommit(s: ListFilter): bool = running(s) and s.committed
pure def afterCommit(s: ListFilter): ListFilter =
  { ...s, outcome: if (s.shown == s.requested and stillCurrent(s)) FilterSucceeded else FilterUnknown }
pure def canAbort(s: ListFilter): bool = running(s)
pure def abort(s: ListFilter): ListFilter = { ...s, outcome: if (s.committed) FilterUnknown else FilterFailed }
pure def canSettleFilter(s: ListFilter): bool = not(idle(s)) and (s.proposal == RefusedProposal or s.outcome != Pending)
pure def settleFilter(s: ListFilter): ListFilter =
  { ...s, proposal: NoProposal, authority: NoAuthority, committed: false, outcome: Pending, contextChanged: false }
pure def canClearFilter(s: ListFilter): bool = idle(s) and s.shown != 0
pure def clearFilter(s: ListFilter): ListFilter = { ...s, shown: 0 }
pure def alwaysFilterOnReviewedList(s: ListFilter): bool =
  s.committed implies s.appliedRevision == s.namedRevision and s.appliedVisit == s.namedVisit
pure def alwaysDeclinedShowsNothing(s: ListFilter): bool = s.outcome == FilterFailed implies s.shown == s.shownBefore
pure def alwaysSucceededShowsRequested(s: ListFilter): bool =
  s.outcome == FilterSucceeded implies s.shown == s.requested and s.appliedRevision == s.namedRevision
pure def sometimesApplied(s: ListFilter): bool = s.outcome == FilterSucceeded
pure def sometimesChangedListRefused(s: ListFilter): bool = s.outcome == FilterFailed and s.authority != NoAuthority
pure def sometimesOldVisitRefused(s: ListFilter): bool = s.outcome == FilterFailed and s.visit != s.namedVisit
```
