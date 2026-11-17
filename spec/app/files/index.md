# Files

The phone's shared storage as the owner browses it: the top with its
categories and storage, a folder with its breadcrumbs, a selection, a
search, and one change to the files at a time. The agent may look, and may
only propose a change.

- [Recent](./recent.md): the files opened lately, the access Alpha remembers for them, and the system picker
- [Trash](./trash.md): what was deleted, and bringing it back or erasing it
- [Preview](./preview.md): one file, shown and acted on
- [Scan](./scan.md): pages made into a PDF

## Story: Browse my storage

> As the owner, I want to open my storage, go into a folder and back along
> its path, and always be told plainly when Alpha may not or cannot read it.

### Files holds the access it was given, the path to the folder showing, what that folder lists, the selection, the search, the change under way and what the agent proposed

The owner, the agent and the phone each send their own events. An item's
revision changes whenever the item does.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import permission as P from "../../kit/permission"

type Actor = Owner | Agent | Phone
type Item = { id: int, name: str, revision: int, container: bool }
type Layout = Grid | Rows
type Order = ByDate | ByName | BySize
type Work = NewFolder | Rename | MoveTo | CopyTo | Share | Bin
type Plan = { work: Work, item: int, name: str, dest: int }
type Files = {
  access: P::Permission,
  trail: List[int], listing: R::Read, items: List[Item], picked: List[int],
  layout: Layout, order: Order, reversed: bool,
  searching: bool, query: R::Read, hits: List[int],
  attempt: A::Attempt, offer: Plan, review: V::Review,
}

pure val initial: Files = {
  access: P::unasked,
  trail: List(), listing: R::unread, items: List(), picked: List(),
  layout: Rows, order: ByDate, reversed: false,
  searching: false, query: R::unread, hits: List(),
  attempt: A::plan(0), offer: { work: NewFolder, item: 0, name: "", dest: 0 }, review: V::unreviewed,
}
```

### What Files asks of the phone

Android's prompt or its Settings, a read of the folder showing or of the
search, one change to the selected items, the selected items handed to
[Trash](./trash.md), and a file handed to [Preview](./preview.md).

```quint
type Effect =
  | AskAccess
  | OpenSettings
  | Look({ ticket: int, search: bool })
  | Perform({ ticket: int, work: Work, name: str, dest: int })
  | ToTrash({ items: List[int] })
  | Show({ item: int })
type Moved = { state: Files, out: List[Effect] }
```

### What the simulator tries

```quint
pure val targetValues = Set(1, 2, 3)
pure val destValues = Set(0, 1, 4)
pure val nameValues = Set("", "b", "d")
pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val depthValues = Set(0, 1)
pure val rowsValues = Set(List()).union(Set(List(2, 3)))
pure val entriesValues =
  Set(List())
    .union(Set(List({ id: 1, name: "a", revision: 1, container: true }, { id: 2, name: "b", revision: 1, container: false })))
    .union(Set(List({ id: 2, name: "b", revision: 2, container: false }, { id: 3, name: "c", revision: 1, container: false })))
```

### Files is denied, reading, unavailable or showing a folder

Without access nothing is read. A folder that could not be read is
unavailable. While a folder is read again what it listed stays in view.

```quint
type Browse = NoAccess | Reading | Unreachable | Showing

pure def allowed(s: Files): bool = P::allows(s.access)

pure def browse(s: Files): Browse =
  if (not(allowed(s))) NoAccess
  else if (s.listing.status == R::Loaded) Showing
  else if (s.listing.status == R::Failed) Unreachable
  else Reading

pure def has(items: List[Item], id: int): bool = items.some(i => i.id == id)
pure def busy(s: Files): bool = s.attempt.outcome == A::Sent
```

### Allow asks Android once, and after that opens its Settings

```quint
pure def canAllow(s: Files, by: Actor): bool = by == Owner and not(allowed(s))

pure def allow(s: Files, by: Actor): Moved =
  if (P::canAsk(s.access)) { state: { ...s, access: P::ask(s.access) }, out: List(AskAccess) }
  else { state: s, out: List(OpenSettings) }

pure def stepAndroidIsAskedOnce(before: Files, after: Files, out: List[Effect]): bool =
  out.some(e => match e { | AskAccess => true | _ => false }) implies (not(before.access.asked) and after.access.asked)
```

### When the phone gives access the top is read, and when it takes access away everything read is dropped

```quint
pure def entered(trail: List[int], s: Files): Moved =
  val listing = R::ask(s.listing)
  { state: { ...s, trail: trail, listing: listing, items: List(), picked: List(), review: V::dismiss(s.review) },
    out: List(Look({ ticket: listing.ticket, search: false })) }

pure def shut(access: P::Permission, s: Files): Files =
  { ...s, access: access, listing: { ...s.listing, status: R::Idle }, items: List(), picked: List(),
    searching: false, query: { ...s.query, status: R::Idle }, hits: List(), review: V::dismiss(s.review) }

pure def canAccessReported(s: Files, by: Actor): bool = by == Phone

pure def accessReported(s: Files, grant: P::Grant, by: Actor): Moved =
  val access = P::observe(s.access, grant)
  if (not(P::allows(access))) { state: shut(access, s), out: List() }
  else if (allowed(s)) { state: { ...s, access: access }, out: List() }
  else entered(s.trail, { ...s, access: access })
```

### Without access Files shows no items, no selection, no search and no proposal

```quint
pure def alwaysNothingIsShownWithoutAccess(s: Files): bool =
  allowed(s) or (s.items.length() == 0 and s.picked.length() == 0 and not(s.searching) and s.hits.length() == 0 and not(s.review.showing))
```

### Opening a folder, or a step of its path, reads that place afresh with nothing selected

The owner and the agent may open a folder that is listed; only the owner
walks back along the path. Neither moves while a change is under way.

```quint
pure def canOpenFolder(s: Files, target: int, by: Actor): bool =
  by != Phone and browse(s) == Showing and not(busy(s)) and s.items.some(i => i.id == target and i.container)

pure def openFolder(s: Files, target: int, by: Actor): Moved = entered(s.trail.append(target), s)

pure def canOpenCrumb(s: Files, depth: int, by: Actor): bool =
  by == Owner and allowed(s) and not(busy(s)) and depth >= 0 and depth < s.trail.length()

pure def openCrumb(s: Files, depth: int, by: Actor): Moved =
  entered(s.trail.foldl(List(), (kept, folder) => if (kept.length() < depth) kept.append(folder) else kept), s)

pure def stepMovingStartsAfresh(before: Files, via: str, after: Files): bool =
  (via == "openFolder" or via == "openCrumb") implies
    (after.items.length() == 0 and after.picked.length() == 0 and not(after.review.showing)
      and after.listing.status == R::Loading and after.listing.ticket == before.listing.ticket + 1)
```

### The folder showing is read again when asked, and only its newest answer is taken

The owner pulls to refresh, or the phone says the storage changed. The
answer keeps the selection that is still listed. A proposal whose item is
no longer listed as it was shown stops counting.

```quint
pure def canRefresh(s: Files): bool = allowed(s)

pure def refresh(s: Files): Moved =
  val listing = R::ask(s.listing)
  { state: { ...s, listing: listing }, out: List(Look({ ticket: listing.ticket, search: false })) }

pure def canListed(s: Files, ticket: int, by: Actor): bool =
  by == Phone and allowed(s) and R::canAnswer(s.listing, ticket)

pure def listed(s: Files, ticket: int, ok: bool, entries: List[Item], by: Actor): Files =
  val items = if (ok) entries else List()
  val bound = s.offer.work == NewFolder or s.items.some(i => i.id == s.offer.item and items.includes(i))
  { ...s, listing: R::answer(s.listing, ok), items: items,
    picked: s.picked.select(id => has(items, id)),
    review: if (s.review.showing and not(bound)) V::revise(s.review) else s.review }
```

### A folder that was not read lists nothing

```quint
pure def alwaysAnUnreadFolderListsNothing(s: Files): bool =
  (s.listing.status == R::Idle or s.listing.status == R::Failed) implies s.items.length() == 0
```

### The storage bar is never fuller than the storage

```quint
pure def filled(used: int, total: int): int =
  if (total <= 0 or used <= 0) 0 else if (used >= total) 100 else used * 100 / total

pure def lawTheStorageBarStaysInItsTrack(used: int, total: int): bool =
  filled(used, total) >= 0 and filled(used, total) <= 100
```

### Files can be denied, unavailable, and showing a folder inside a folder

```quint
pure def sometimesDeniedAfterAsking(s: Files): bool = browse(s) == NoAccess and P::needsSettings(s.access)
pure def sometimesUnavailable(s: Files): bool = browse(s) == Unreachable
pure def sometimesInsideAFolder(s: Files): bool = browse(s) == Showing and s.trail.length() > 0 and s.items.length() > 0
```

## Story: Arrange and search what I see

> As the owner, I want a grid or a list, sorted my way, and a search that
> says when it is still looking, found nothing or could not finish.

### The owner chooses a grid or a list, and a sort; choosing the same sort again reverses it

```quint
pure def canShowAs(s: Files, layout: Layout, by: Actor): bool = by == Owner and layout != s.layout

pure def showAs(s: Files, layout: Layout, by: Actor): Files = { ...s, layout: layout }

pure def canSortBy(s: Files, order: Order, by: Actor): bool = by == Owner

pure def sortBy(s: Files, order: Order, by: Actor): Files =
  { ...s, order: order, reversed: order == s.order and not(s.reversed) }
```

### A search is looking, found nothing, found files, or could not finish

The owner or the agent may search: it reads and changes nothing. A new
search replaces the one before it, and only its own answer is shown.

```quint
type Finding = NoSearch | Looking | Nothing | Found | Trouble

pure def finding(s: Files): Finding =
  if (not(s.searching)) NoSearch
  else if (s.query.status == R::Failed) Trouble
  else if (s.query.status != R::Loaded) Looking
  else if (s.hits.length() == 0) Nothing
  else Found

pure def canSearchFor(s: Files, by: Actor): bool = by != Phone and allowed(s)

pure def searchFor(s: Files, by: Actor): Moved =
  val query = R::ask(s.query)
  { state: { ...s, searching: true, query: query, hits: List() }, out: List(Look({ ticket: query.ticket, search: true })) }

pure def canSearched(s: Files, ticket: int, by: Actor): bool =
  by == Phone and s.searching and R::canAnswer(s.query, ticket)

pure def searched(s: Files, ticket: int, ok: bool, rows: List[int], by: Actor): Files =
  { ...s, query: R::answer(s.query, ok), hits: if (ok) rows else List() }

pure def canClearSearch(s: Files, by: Actor): bool = by == Owner and s.searching

pure def clearSearch(s: Files, by: Actor): Files =
  { ...s, searching: false, query: { ...s.query, status: R::Idle }, hits: List() }
```

### Results are shown only for a search that is on and answered

```quint
pure def alwaysResultsBelongToAnAnsweredSearch(s: Files): bool =
  s.hits.length() > 0 implies (s.searching and s.query.status == R::Loaded)
```

### A search can find nothing, find files, and fail to finish

```quint
pure def sometimesSearchFoundNothing(s: Files): bool = finding(s) == Nothing
pure def sometimesSearchFoundFiles(s: Files): bool = finding(s) == Found
pure def sometimesSearchCouldNotFinish(s: Files): bool = finding(s) == Trouble
```

## Story: Change my files

> As the owner, I want to select items and make a folder, rename, move,
> copy, share or delete, one change at a time, and to be told honestly how
> each ended.

### The owner selects items of the folder showing, all of them, or none

```quint
pure def canToggle(s: Files, target: int, by: Actor): bool =
  by == Owner and browse(s) == Showing and not(busy(s)) and has(s.items, target)

pure def toggle(s: Files, target: int, by: Actor): Files =
  { ...s, picked: if (s.picked.includes(target)) s.picked.select(id => id != target) else s.picked.append(target) }

pure def canSelectAll(s: Files, by: Actor): bool =
  by == Owner and browse(s) == Showing and not(busy(s)) and s.items.length() > 0

pure def selectAll(s: Files, by: Actor): Files =
  { ...s, picked: s.items.listMap(i => i.id) }

pure def canCancelSelection(s: Files, by: Actor): bool = by == Owner and not(busy(s)) and s.picked.length() > 0

pure def cancelSelection(s: Files, by: Actor): Files = { ...s, picked: List() }
```

### Every selected item is one the folder lists

```quint
pure def alwaysTheSelectionIsListed(s: Files): bool = s.picked.every(id => has(s.items, id))
```

### A change fits its items: a new name is not empty and not taken, one item is renamed, and nothing moves into itself or to where it is

Sharing goes to email or the phone's share sheet; sharing by text message
is not offered.

```quint
pure def here(s: Files): int = s.trail.nthOr(s.trail.length() - 1, 0)

pure def fits(s: Files, plan: Plan): bool =
  val free = plan.name != "" and not(s.items.some(i => i.name == plan.name))
  if (plan.work == NewFolder) free
  else if (plan.work == Rename) s.picked.length() == 1 and free
  else if (plan.work == MoveTo or plan.work == CopyTo)
    s.picked.length() > 0 and not(s.picked.includes(plan.dest)) and (plan.work == CopyTo or plan.dest != here(s))
  else s.picked.length() > 0
```

### A change is sent once under its own number, and deleting hands the selection to Trash

Only the owner starts a change, in a folder that is showing, and not
while another is under way.

```quint
pure def started(plan: Plan, s: Files): Moved =
  val attempt = A::dispatch(A::record(A::plan(s.attempt.id + 1)))
  if (plan.work == Bin) { state: { ...s, picked: List() }, out: List(ToTrash({ items: s.picked })) }
  else { state: { ...s, attempt: attempt },
    out: List(Perform({ ticket: attempt.id, work: plan.work, name: plan.name, dest: plan.dest })) }

pure def canBegin(s: Files, work: Work, name: str, dest: int, by: Actor): bool =
  by == Owner and browse(s) == Showing and not(busy(s))
    and fits(s, { work: work, item: 0, name: name, dest: dest })

pure def begin(s: Files, work: Work, name: str, dest: int, by: Actor): Moved =
  started({ work: work, item: 0, name: name, dest: dest }, s)
```

### Deleting hands Trash only items the folder lists

```quint
pure def stepOnlyListedItemsAreTrashed(before: Files, after: Files, out: List[Effect]): bool =
  out.every(e => match e {
    | ToTrash(t) => t.items.length() > 0 and t.items.every(id => has(before.items, id))
    | _ => true
  })
```

### A change ends as its own answer says, the selection is dropped and the folder is read again

```quint
pure def canFinished(s: Files, ticket: int, by: Actor): bool = by == Phone and A::canConclude(s.attempt, ticket)

pure def finished(s: Files, ticket: int, confirmed: bool, known: bool, by: Actor): Moved =
  val ended = { ...s, attempt: A::conclude(s.attempt, confirmed, known), picked: List() }
  if (allowed(s)) refresh(ended) else { state: ended, out: List() }
```

### One request leaves for each change, and only when the owner starts it or approves it

No step asks more than one thing of the phone.

```quint
pure def performs(out: List[Effect]): bool = out.some(e => match e { | Perform(p) => true | _ => false })

pure def stepOneRequestPerChange(before: Files, via: str, after: Files, out: List[Effect]): bool =
  out.length() <= 1
    and performs(out) == (after.attempt.id != before.attempt.id)
    and (performs(out) implies
      ((via == "begin" or via == "approve") and not(busy(before)) and after.attempt.id == before.attempt.id + 1))
    and out.every(e => match e { | Perform(p) => p.ticket == after.attempt.id and p.work != Bin | _ => true })
```

### A new name never takes the name of an item already listed

```quint
pure def stepANewNameIsFree(before: Files, after: Files, out: List[Effect]): bool =
  out.every(e => match e {
    | Perform(p) => (p.work == NewFolder or p.work == Rename) implies (p.name != "" and not(before.items.some(i => i.name == p.name)))
    | _ => true
  })
```

### A change under way ends

```quint
pure def leadsToAChangeEnds(s: Files, later: Files): bool = busy(s) implies not(busy(later))

pure val fair_finished = "weak"
```

### A change can be confirmed, refused, and left unknown

```quint
pure def sometimesAChangeIsConfirmed(s: Files): bool = s.attempt.outcome == A::Confirmed
pure def sometimesAChangeIsRefused(s: Files): bool = s.attempt.outcome == A::Refused
pure def sometimesAChangeIsUnknown(s: Files): bool = s.attempt.outcome == A::Unknown
pure def sometimesSeveralAreSelected(s: Files): bool = s.picked.length() > 1
```

## Story: Let the agent help with my files

> As the owner, I want the agent to find and open files for me, and to
> change them only when I approve exactly what it showed me.

### The agent opens a listed file for reading, as the owner does

```quint
pure def canView(s: Files, target: int, by: Actor): bool =
  by != Phone and browse(s) == Showing and s.items.some(i => i.id == target and not(i.container))

pure def view(s: Files, target: int, by: Actor): Moved = { state: s, out: List(Show({ item: target })) }
```

### The agent proposes a change to one listed item, and the proposal changes nothing

One proposal is open at a time. A new folder is proposed for the folder
showing.

```quint
pure def canPropose(s: Files, work: Work, target: int, by: Actor): bool =
  by == Agent and browse(s) == Showing and not(s.review.showing) and (work == NewFolder or has(s.items, target))

pure def propose(s: Files, work: Work, target: int, name: str, dest: int, by: Actor): Files =
  { ...s, offer: { work: work, item: target, name: name, dest: dest }, review: V::present(s.review) }

pure def stepAProposalChangesNothing(before: Files, via: str, after: Files, out: List[Effect]): bool =
  via == "propose" implies (out.length() == 0 and after.attempt == before.attempt and after.items == before.items)
```

### The owner approves a proposal only as it was shown, and then it runs on that item alone

Approving selects the proposed item and starts the change as the owner's
own would start. A proposal whose item changed can only be declined.

```quint
pure def aimed(plan: Plan, s: Files): Files = if (plan.work == NewFolder) s else { ...s, picked: List(plan.item) }

pure def canApprove(s: Files, by: Actor): bool =
  by == Owner and V::canConfirm(s.review) and browse(s) == Showing and not(busy(s)) and fits(aimed(s.offer, s), s.offer)

pure def approve(s: Files, by: Actor): Moved =
  started(s.offer, { ...aimed(s.offer, s), review: V::confirm(s.review) })

pure def canDecline(s: Files, by: Actor): bool = by == Owner and s.review.showing

pure def decline(s: Files, by: Actor): Files = { ...s, review: V::dismiss(s.review) }
```

### A proposal that can still be approved names an item the folder lists

```quint
pure def alwaysAnApprovableProposalNamesAListedItem(s: Files): bool =
  V::canConfirm(s.review) implies (s.offer.work == NewFolder or has(s.items, s.offer.item))
```

### A proposal was never shown ahead of its item

Discovered by the proof: were a proposal recorded as shown at a later
revision than its item has reached, a change to the item could bring a
proposal that had stopped counting back to life.

```quint
pure def alwaysAProposalIsNotShownAhead(s: Files): bool = s.review.shown <= s.review.revision
```

### An approved proposal acts on the proposed item and no other

A deletion hands that item alone to Trash.

```quint
pure def stepApprovalActsOnTheProposedItem(before: Files, via: str, after: Files, out: List[Effect]): bool =
  (via == "approve" and before.offer.work != NewFolder) implies
    ((before.offer.work == Bin or after.picked == List(before.offer.item))
      and out.every(e => match e { | ToTrash(t) => t.items == List(before.offer.item) | _ => true }))
```

### A proposal can be open, and can stop counting because its item changed

```quint
pure def sometimesAProposalIsOpen(s: Files): bool = V::canConfirm(s.review)
pure def sometimesAProposalStoppedCounting(s: Files): bool = s.review.showing and not(V::canConfirm(s.review))
```

## Story: Come back after a restart

> As the owner, I want my grid and sort kept, and never a change repeated
> because the phone restarted in the middle of it.

### A restart keeps the access, the layout and the sort, and a change cut off is reported as unknown

Everything read is dropped and read again when Files is next opened. The
numbers of reads and changes go on from where they were, so an answer from
before the restart is refused.

```quint
pure def canRestart(s: Files, by: Actor): bool = by == Phone

pure def restart(s: Files, by: Actor): Files =
  { ...shut(s.access, s), trail: List(), attempt: if (busy(s)) A::conclude(s.attempt, false, false) else s.attempt }

pure def stepARestartKeepsTheArrangement(before: Files, via: str, after: Files): bool =
  via == "restart" implies
    (after.layout == before.layout and after.order == before.order and after.reversed == before.reversed
      and after.access == before.access and not(busy(after)))
```

### The numbers of reads and changes never go back

```quint
pure def stepNumbersNeverGoBack(before: Files, via: str, after: Files): bool =
  after.listing.ticket >= before.listing.ticket and after.query.ticket >= before.query.ticket
    and after.attempt.id >= before.attempt.id
```

### A restart can cut a change off

```quint
pure def sometimesAChangeWasCutOff(s: Files): bool = s.attempt.outcome == A::Unknown and s.listing.status == R::Idle
```
