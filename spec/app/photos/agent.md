# Photos for Alpha

What Alpha's agent may do with the library of [Photos](./index.md): search
it, inspect one item, propose a change of items the owner is looking at, or
propose a new album of them. Full photo access is a permission on the
phone, never an upload: every request is shown to the owner first, a read
returns only identities, revisions, kinds, dates and sizes in pixels, at
most a hundred rows, and nothing changes unless the owner confirms exactly
what was proposed. The card the owner sees belongs to the Approvals area,
which sends the owner's answer and says when the request expired; this spec
keeps what is particular to photos: what is read and at which revision a
change was proposed. Photos says whether it has access, whether it is on
the lock screen, which revision it lists, whether the items are listed and
whether a change is running, and carries out what the owner confirmed. The
pixels of one photo reach Alpha only when the owner asks Alpha about it in
the [Viewer](./viewer.md).

## Domain

### What the agent may ask

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import actor.* from "./actor"
import changes as C from "./changes"

type Ask = Search | Inspect | Alter | Collect
type Narrowing = AllItems | FavouritesOnly | NotFavourites | VideosOnly | StillsOnly | CameraAlbum | Screenshots
type Field = Identity | Revision | ItemKind | Taken | Dimensions | Name | AlbumName | Bytes | Modified | Place | Pixels

pure val sharedFields = Set(Identity, Revision, ItemKind, Taken, Dimensions)
pure val maxRows = 100
```

### What it asks of the phone and of Photos

A search or an inspection, each under a ticket; a change or an album handed
to Photos once confirmed; and the answer the agent gets when its request
ends.

```quint
type Result = Pending | Answered | Unread | Approved | Declined | Withdrawn | Expired | Stale | Blocked

type Effect =
  | SearchLibrary({ ticket: int, narrowing: Narrowing, earliest: int, latest: int, limit: int, columns: Set[Field] })
  | InspectItem({ ticket: int, photo: int, columns: Set[Field] })
  | Hand({ request: int, change: C::Change, items: Set[int], basis: int })
  | HandAlbum({ request: int, name: str, letters: int, items: Set[int], basis: int })
  | Answer({ request: int, result: Result, rows: int })
```

### The agent's request

One request at a time: what it asks, the review the owner sees, the read it
started, who decided it, how it ended and how many rows went back.

```quint
type Stage = Idle | Shown | Reading | Over

type Request = {
  ask: Ask, number: int, narrowing: Narrowing, earliest: int, latest: int, limit: int, photo: int,
  columns: Set[Field], change: C::Change, items: Set[int], name: str, letters: int, basis: int,
}

type Helper = { stage: Stage, request: Request, review: V::Review, read: R::Read, decidedBy: Actor, result: Result, rows: int }

type Done = { state: Helper, out: List[Effect] }

pure val initial: Helper = {
  stage: Idle,
  request: {
    ask: Search, number: 0, narrowing: AllItems, earliest: 0, latest: 0, limit: 0, photo: 0,
    columns: Set(), change: C::Favorite, items: Set(), name: "", letters: 0, basis: 0,
  },
  review: V::unreviewed, read: R::unread, decidedBy: Phone, result: Pending, rows: 0,
}

pure def free(s: Helper): bool = s.stage == Idle or s.stage == Over

pure def fits(r: Request): bool =
  r.columns.subseteq(sharedFields) and r.limit >= 1 and r.limit <= maxRows

pure def asking(r: Request, s: Helper): Helper =
  { ...s, stage: Shown, request: { ...r, number: s.request.number + 1 }, review: V::present(V::revise(s.review)),
    decidedBy: Phone, result: Pending, rows: 0 }

pure def ending(result: Result, rows: int, out: List[Effect], s: Helper): Done =
  { state: { ...s, stage: Over, result: result, rows: rows, review: V::dismiss(s.review) },
    out: out.append(Answer({ request: s.request.number, result: result, rows: rows })) }
```

### What the simulator tries

```quint
pure val photoValues = Set(0, 3)
pure val itemsValues = Set(Set(), Set(1), Set(1, 2))
pure val columnsValues = Set(Set(Identity, Revision), Set(Identity, Pixels), Set(Name))
pure val limitValues = Set(0, 20, 100, 101)
pure val rowsValues = Set(0, 7, 120)
pure val earliestValues = Set(0, 5)
pure val latestValues = Set(5)
pure val basisValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val nameValues = Set("", "Trip")
pure val lettersValues = Set(0, 4)
```

## Story: Let Alpha read my library

> As the owner, I want Alpha's agent to search my photos or look at one
> only after I see what it asks for, and to get identities and dates, never
> names, places or pixels, and never more than a hundred at a time.

### The agent asks for a search by kind, favourites, dates or the Camera and Screenshots albums, or for one item, reading only identities, revisions, kinds, dates and sizes in pixels, never from the lock screen or without access

```quint
pure def canAskSearch(s: Helper, narrowing: Narrowing, earliest: int, latest: int, limit: int, columns: Set[Field], allowed: bool, secure: bool, by: Actor): bool =
  by == Agent and free(s) and allowed and not(secure) and earliest <= latest
    and fits({ ...s.request, limit: limit, columns: columns })

pure def askSearch(s: Helper, narrowing: Narrowing, earliest: int, latest: int, limit: int, columns: Set[Field], allowed: bool, secure: bool, by: Actor): Helper =
  asking({ ...s.request, ask: Search, narrowing: narrowing, earliest: earliest, latest: latest, limit: limit, columns: columns }, s)

pure def canAskInspect(s: Helper, photo: int, columns: Set[Field], allowed: bool, secure: bool, by: Actor): bool =
  by == Agent and free(s) and allowed and not(secure) and photo > 0 and columns.subseteq(sharedFields)

pure def askInspect(s: Helper, photo: int, columns: Set[Field], allowed: bool, secure: bool, by: Actor): Helper =
  asking({ ...s.request, ask: Inspect, photo: photo, limit: 1, columns: columns }, s)
```

### Only the owner's confirmation of the request shown sends the read, with exactly what was shown

```quint
pure def reading(by: Actor, s: Helper): Done =
  val asked = R::ask(s.read)
  val r = s.request
  val started = { ...s, stage: Reading, read: asked, decidedBy: by, review: V::confirm(s.review) }
  if (r.ask == Search)
    { state: started, out: List(SearchLibrary({ ticket: asked.ticket, narrowing: r.narrowing, earliest: r.earliest, latest: r.latest, limit: r.limit, columns: r.columns })) }
  else { state: started, out: List(InspectItem({ ticket: asked.ticket, photo: r.photo, columns: r.columns })) }

pure def stepReadsAreConfirmedAndSmall(before: Helper, via: str, after: Helper, out: List[Effect]): bool =
  out.every(e => match e {
    | SearchLibrary(q) =>
        via == "confirm" and V::canConfirm(before.review) and before.request.ask == Search and after.decidedBy == Owner
          and q.columns.subseteq(before.request.columns) and before.request.columns.subseteq(q.columns)
          and q.columns.subseteq(sharedFields) and q.limit == before.request.limit and q.limit >= 1 and q.limit <= maxRows
          and q.narrowing == before.request.narrowing and q.earliest == before.request.earliest and q.latest == before.request.latest
    | InspectItem(q) =>
        via == "confirm" and V::canConfirm(before.review) and before.request.ask == Inspect and after.decidedBy == Owner
          and q.photo == before.request.photo and q.columns.subseteq(sharedFields)
          and q.columns.subseteq(before.request.columns) and before.request.columns.subseteq(q.columns)
    | _ => true
  })
```

### A read ends as the phone answers its ticket, and the agent gets at most the rows it was allowed

A late answer, to a read withdrawn or ended, is refused.

```quint
pure def canAnswered(s: Helper, ticket: int, by: Actor): bool = by == Phone and s.stage == Reading and R::canAnswer(s.read, ticket)

pure def answered(s: Helper, ticket: int, ok: bool, rows: int, by: Actor): Done =
  val kept = if (rows > s.request.limit) s.request.limit else if (rows < 0) 0 else rows
  ending(if (ok) Answered else Unread, if (ok) kept else 0, List(), { ...s, read: R::answer(s.read, ok) })
```

### A search can wait for the owner, and its rows go back to the agent

```quint
pure def sometimesSearchShown(s: Helper): bool = s.stage == Shown and s.request.ask == Search and V::canConfirm(s.review)

pure def sometimesRowsReturned(s: Helper): bool = s.result == Answered and s.rows == s.request.limit and s.request.ask == Search
```

### An item can be inspected, and a read can fail

```quint
pure def sometimesInspected(s: Helper): bool = s.result == Answered and s.request.ask == Inspect

pure def sometimesUnread(s: Helper): bool = s.result == Unread
```

## Story: Let Alpha change my photos

> As the owner, I want Alpha's agent to change or share photos, or make an
> album of them, only after I confirm exactly what it proposed, never to
> recover, delete forever or replace anything, and never on a library that
> changed since it looked.

### The agent proposes a favourite, an unfavourite, a move to Recently deleted, a share of at most a hundred, or a new album, of items the owner is looking at, while no change runs; a proposal from an older read opens no review

Recovering, undoing, deleting forever and replacing an original are the
owner's alone: the agent's change is never a recovery, and Recently deleted
and the Viewer take no event from the agent.

```quint
pure def canPropose(s: Helper, change: C::Change, items: Set[int], basis: int, revision: int, listed: bool, running: bool, allowed: bool, secure: bool, by: Actor): bool =
  by == Agent and free(s) and allowed and not(secure) and listed and not(running) and items.size() > 0
    and change != C::Restore and (change == C::Share implies items.size() <= C::maxShare)

pure def proposing(r: Request, revision: int, s: Helper): Done =
  val shown = asking(r, s)
  if (r.basis == revision) { state: shown, out: List() } else ending(Stale, 0, List(), shown)

pure def propose(s: Helper, change: C::Change, items: Set[int], basis: int, revision: int, listed: bool, running: bool, allowed: bool, secure: bool, by: Actor): Done =
  proposing({ ...s.request, ask: Alter, change: change, items: items, basis: basis }, revision, s)

pure def canProposeAlbum(s: Helper, name: str, letters: int, items: Set[int], basis: int, revision: int, listed: bool, running: bool, allowed: bool, secure: bool, by: Actor): bool =
  canPropose(s, C::Favorite, items, basis, revision, listed, running, allowed, secure, by) and name != "" and letters >= 1

pure def proposeAlbum(s: Helper, name: str, letters: int, items: Set[int], basis: int, revision: int, listed: bool, running: bool, allowed: bool, secure: bool, by: Actor): Done =
  proposing({ ...s.request, ask: Collect, name: name, letters: letters, items: items, basis: basis }, revision, s)
```

### The owner confirms the request shown, once; a change goes to Photos only while the library is at the revision proposed, and otherwise is stale

```quint
pure def canConfirm(s: Helper, revision: int, by: Actor): bool = by == Owner and s.stage == Shown and V::canConfirm(s.review)

pure def confirm(s: Helper, revision: int, by: Actor): Done =
  val r = s.request
  val decided = { ...s, decidedBy: by, review: V::confirm(s.review) }
  if (r.ask == Search or r.ask == Inspect) reading(by, s)
  else if (r.basis != revision) ending(Stale, 0, List(), decided)
  else if (r.ask == Alter) ending(Approved, 0, List(Hand({ request: r.number, change: r.change, items: r.items, basis: r.basis })), decided)
  else ending(Approved, 0, List(HandAlbum({ request: r.number, name: r.name, letters: r.letters, items: r.items, basis: r.basis })), decided)

pure def stepHandsOnlyWhatWasConfirmed(before: Helper, via: str, after: Helper, out: List[Effect]): bool =
  out.every(e => match e {
    | Hand(h) => via == "confirm" and V::canConfirm(before.review) and before.request.ask == Alter and after.decidedBy == Owner
        and h.change == before.request.change and h.change != C::Restore and h.basis == before.request.basis
        and h.items.subseteq(before.request.items) and before.request.items.subseteq(h.items)
    | HandAlbum(h) => via == "confirm" and V::canConfirm(before.review) and before.request.ask == Collect and after.decidedBy == Owner
        and h.name == before.request.name and h.basis == before.request.basis
        and h.items.subseteq(before.request.items) and before.request.items.subseteq(h.items)
    | _ => true
  })
```

### The owner declines, the agent withdraws, the Approvals area expires a request, and Photos losing access or being hidden ends it

```quint
pure def canDecline(s: Helper, by: Actor): bool = by == Owner and s.stage == Shown

pure def decline(s: Helper, by: Actor): Done = ending(Declined, 0, List(), s)

pure def canWithdraw(s: Helper, by: Actor): bool = by == Agent and (s.stage == Shown or s.stage == Reading)

pure def withdraw(s: Helper, by: Actor): Done = ending(Withdrawn, 0, List(), s)

pure def canExpire(s: Helper, by: Actor): bool = by == Phone and s.stage == Shown

pure def expire(s: Helper, by: Actor): Done = ending(Expired, 0, List(), s)

pure def canLeave(s: Helper, by: Actor): bool = by == Phone and (s.stage == Shown or s.stage == Reading)

pure def leave(s: Helper, by: Actor): Done = ending(Blocked, 0, List(), s)
```

### One request at a time: a review shows only an open request, a read is under way only once the owner confirmed it, and nothing the agent asked for exceeds what it may read

```quint
pure def alwaysOneRequestAtATime(s: Helper): bool =
  (s.review.showing iff s.stage == Shown) and s.review.shown <= s.review.revision
    and (s.stage == Reading implies s.read.status == R::Loading)
    and ((s.stage == Reading or s.result == Answered or s.result == Unread or s.result == Approved)
      implies (s.decidedBy == Owner and s.stage != Shown))
    and ((s.stage == Reading or s.result == Answered) implies (s.request.ask == Search or s.request.ask == Inspect))
    and ((s.request.ask == Search and s.stage != Idle) implies fits(s.request))
    and (s.request.ask == Inspect implies s.request.columns.subseteq(sharedFields))
    and s.rows >= 0 and s.rows <= s.request.limit and (s.result != Answered implies s.rows == 0)
    and (s.request.ask == Alter implies s.request.change != C::Restore)
```

### Every request is answered once, when it ends, with how it ended

A proposal from an older read ends as soon as it is made.

```quint
pure def ends(before: Helper, after: Helper): bool =
  after.stage == Over and (before.stage != Over or after.request.number != before.request.number)

pure def stepAnsweredOnce(before: Helper, via: str, after: Helper, out: List[Effect]): bool =
  out.every(e => match e {
    | Answer(a) => ends(before, after) and a.request == after.request.number
        and a.result == after.result and a.rows == after.rows and a.rows <= after.request.limit
    | _ => true
  })
    and (ends(before, after) implies out.some(e => match e { | Answer(a) => true | _ => false }))
```

### A request shown or being read ends

If the Approvals area expires requests it shows and the phone answers each
read, no request waits for ever.

```quint
pure def leadsToRequestEnds(s: Helper, later: Helper): bool =
  (s.stage == Shown or s.stage == Reading) implies later.stage == Over

pure val fair_expire = "weak"
pure val fair_answered = "weak"
```

### A change or an album can wait for the owner, and be handed to Photos

```quint
pure def sometimesChangeShown(s: Helper): bool = s.stage == Shown and s.request.ask == Alter and s.request.change == C::Trash

pure def sometimesAlbumApproved(s: Helper): bool = s.result == Approved and s.request.ask == Collect
```

### A proposal from an older read, or one the library outran before the owner confirmed it, is stale

```quint
pure def sometimesStaleProposal(s: Helper): bool = s.result == Stale and s.decidedBy == Phone

pure def sometimesOutrun(s: Helper): bool = s.result == Stale and s.decidedBy == Owner
```

### A request can be declined, withdrawn, expired or ended by Photos

```quint
pure def sometimesDeclined(s: Helper): bool = s.result == Declined

pure def sometimesWithdrawnWhileReading(s: Helper): bool = s.result == Withdrawn and s.read.status == R::Loading

pure def sometimesExpired(s: Helper): bool = s.result == Expired

pure def sometimesBlocked(s: Helper): bool = s.result == Blocked
```
