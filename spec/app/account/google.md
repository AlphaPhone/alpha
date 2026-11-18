# Google & email

The Google accounts the owner connected through Alpha Cloud, and what each
lets Alpha do with mail: read it, modify it (label, archive, mark read),
send it. Cloud holds the grants; this page holds what Cloud last read back
for the current sign-in, which [Session](./session.md) gives as `signIn`
and resets when it changes. Inbox and Calendar ask it what they may do;
what the agent itself may change is further limited by the owner's
switches in [Agent access to Google](./access.md).

## Story: See my Google accounts

> As the owner, I want to see each Google account I connected and what it
> allows, as Cloud reports it, and to be told whenever an account allows
> less than before.

### Google & email holds the accounts read back with what each allows, the read in flight, the browser visit, and a disconnect with its review

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import outside as O from "./outside"

type Link = { id: int, read: bool, modify: bool, send: bool }
type Work = Resting | Disconnecting | Confirming
type Note = Quiet | Denied | Failed | Narrowed | Disconnected | StillConnected | Unconfirmed | CutByRestart
type Google = {
  links: List[Link], list: R::Read, tab: O::Visit,
  work: Work, ticket: int, leaving: int, review: V::Review, gone: int, note: Note,
}

pure val initial: Google = {
  links: List(), list: R::unread, tab: O::novisit,
  work: Resting, ticket: 0, leaving: 0, review: V::unreviewed, gone: 0, note: Quiet,
}

pure val signInValues = Set(0, 1)
pure val ticketValues = Set(1, 2, 3, 4)
pure val tabValues = Set(1, 2)
pure val accountValues = Set(1, 2)
pure val linksValues = Set(
  List(),
  List({ id: 1, read: true, modify: true, send: true }),
  List({ id: 1, read: true, modify: false, send: false }),
  List({ id: 1, read: false, modify: false, send: true }),
  List({ id: 1, read: true, modify: true, send: true }, { id: 2, read: true, modify: false, send: true }),
  List({ id: 2, read: false, modify: true, send: false }),
)
pure val weight_listed = 20
```

### What the page asks of the phone is a read of the accounts, a consent tab, a disconnect, to pause an account's calendar sync, or to forget an account's mail

```quint
type Effect =
  ReadAccounts({ check: int }) | OpenConsent({ tab: int, read: bool, modify: bool, send: bool })
  | Disconnect({ ticket: int, account: int }) | PauseSync({ account: int }) | Forget({ account: int })
type Moved = { state: Google, out: List[Effect] }
```

### Modifying mail includes reading it

Cloud's readback is taken with that rule applied.

```quint
pure def shaped(l: Link): Link = { ...l, read: l.read or l.modify }

pure def lawModifyIncludesRead(id: int, read: bool, send: bool): bool =
  shaped({ id: id, read: read, modify: true, send: send }).read

pure def alwaysModifyIncludesRead(g: Google): bool = g.links.every(l => (l.modify implies l.read) and l.id > 0)
```

### Inbox and Calendar may read, modify or send with an account only as far as its grant allows

```quint
pure def holds(links: List[Link], id: int): bool = links.some(l => l.id == id)

pure def readable(links: List[Link], id: int): bool = links.some(l => l.id == id and l.read)

pure def mayRead(g: Google, id: int): bool = readable(g.links, id)

pure def mayModify(g: Google, id: int): bool = g.links.some(l => l.id == id and l.modify)

pure def maySend(g: Google, id: int): bool = g.links.some(l => l.id == id and l.send)
```

### The accounts are read again on the owner's request, one read at a time, and only the newest read is taken

```quint
pure def reading(work: Work, g: Google): Moved =
  { state: { ...g, work: work, list: R::ask(g.list) }, out: List(ReadAccounts({ check: g.list.ticket + 1 })) }

pure def canRefresh(g: Google, signIn: int): bool = signIn > 0 and g.list.status != R::Loading and g.work == Resting

pure def refresh(g: Google, signIn: int): Moved = reading(Resting, g)
```

### A readback replaces the accounts, says when one allows less than before, and forgets the mail of every account no longer listed or no longer readable

An account that a confirmed disconnect removed is said to be
disconnected; one still listed after a disconnect is said to be still
connected; a readback that failed after a disconnect leaves it
unconfirmed. Inbox takes `shrank` as the fact that a grant was narrowed.

```quint
pure def covers(a: Link, b: Link): bool = (b.read implies a.read) and (b.modify implies a.modify) and (b.send implies a.send)

pure def shrank(before: List[Link], after: List[Link], except: int): bool =
  before.some(b => b.id != except and not(after.some(a => a.id == b.id and covers(a, b))))

pure def unreadable(before: List[Link], after: List[Link]): List[Link] =
  before.select(b => not(holds(after, b.id)) or (b.read and not(readable(after, b.id))))

pure def forgotten(before: List[Link], after: List[Link]): List[Effect] =
  unreadable(before, after).listMap(b => Forget({ account: b.id }))

pure def canListed(g: Google, ticket: int, links: List[Link]): bool =
  R::canAnswer(g.list, ticket) and links.every(l => l.id > 0)

pure def listed(g: Google, ticket: int, ok: bool, links: List[Link]): Moved =
  val fresh = links.listMap(l => shaped(l))
  val confirming = g.work == Confirming
  val dropped = confirming and not(holds(fresh, g.leaving))
  val except = if (dropped) g.leaving else 0
  if (not(ok)) { state: { ...g, list: R::answer(g.list, false), work: Resting, leaving: 0,
      note: if (confirming) Unconfirmed else g.note }, out: List() }
  else
    { state: { ...g, list: R::answer(g.list, true), links: fresh, work: Resting, leaving: if (confirming) 0 else g.leaving,
        review: if (fresh != g.links) V::revise(g.review) else g.review,
        gone: if (dropped) g.leaving else if (holds(fresh, g.gone)) 0 else g.gone,
        note: if (shrank(g.links, fresh, except)) Narrowed else if (dropped) Disconnected else if (confirming) StillConnected else g.note },
      out: forgotten(g.links, fresh) }
```

### What an account allows never shrinks without the owner being told

```quint
pure def stepScopesNeverShrinkSilently(before: Google, via: str, after: Google): bool =
  (via == "listed" and shrank(before.links, after.links, if (after.note == Disconnected) after.gone else 0))
    implies after.note == Narrowed
```

### An account that leaves the list, or no longer allows reading, holds no mail

```quint
pure def stepAnUnreadableAccountIsForgotten(before: Google, after: Google, out: List[Effect]): bool =
  before.links.every(b => (b.read implies readable(after.links, b.id)) or out.includes(Forget({ account: b.id })))
```

### The accounts change only by a readback, a new sign-in or erasing Alpha

```quint
pure def stepOnlyAReadbackChangesTheAccounts(before: Google, via: str, after: Google): bool =
  after.links != before.links implies (via == "listed" or via == "reset" or via == "erase")
```

### Two accounts can be connected, one of them able to send

```quint
pure def sometimesTwoAccounts(g: Google): bool = g.links.length() == 2 and maySend(g, 2) and not(mayModify(g, 2))
```

### The owner can be told an account allows less than before

```quint
pure def sometimesNarrowed(g: Google): bool = g.note == Narrowed
```

### An account can stay listed after it stopped allowing reading, its mail forgotten

```quint
pure def sometimesListedButUnreadable(g: Google): bool = holds(g.links, 1) and not(mayRead(g, 1)) and g.note == Narrowed
```

## Story: Connect a Google account

> As the owner, I want to connect Google in a browser tab, choose what
> Alpha may do with my mail, and come back to Alpha with the accounts as
> Google now allows them.

### Connecting opens a new visit, only once the accounts are known, and never asks for less than an account already allows

```quint
pure def canConnect(g: Google, read: bool, modify: bool, send: bool, signIn: int): bool =
  signIn > 0 and not(g.tab.open) and g.work == Resting and not(g.review.showing) and g.list.status == R::Loaded and (read or modify or send)

pure def connect(g: Google, read: bool, modify: bool, send: bool, signIn: int): Moved =
  val m = modify or g.links.some(l => l.modify)
  val sd = send or g.links.some(l => l.send)
  val r = read or m or g.links.some(l => l.read)
  { state: { ...g, tab: O::go(g.tab), note: Quiet },
    out: List(OpenConsent({ tab: g.tab.number + 1, read: r, modify: m, send: sd })) }

pure def stepConsentNeverAsksForLess(before: Google, after: Google, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenConsent(x) => (x.modify implies x.read) and x.tab == after.tab.number and after.tab.number == before.tab.number + 1
        and before.links.every(l => covers({ id: l.id, read: x.read, modify: x.modify, send: x.send }, l))
    | _ => true
  })
```

### Only the return of the visit that is open is taken, once, and it grants nothing: the accounts are read back

A denied or failed connection is said so.

```quint
type Result = Granted | Declined | Broken

pure def canReturned(g: Google, tab: int): bool = O::canReturn(g.tab, tab)

pure def returned(g: Google, tab: int, result: Result): Moved =
  reading(g.work, { ...g, tab: O::back(g.tab), note: if (result == Declined) Denied else if (result == Broken) Failed else Quiet })

pure def stepABrowserReturnGrantsNothing(before: Google, via: str, after: Google, out: List[Effect]): bool =
  after.tab.number >= before.tab.number
    and ((via == "returned" or via == "returnedCold" or via == "stopWaiting")
      implies (after.links == before.links and out == List(ReadAccounts({ check: after.list.ticket })) and not(after.tab.open)))
```

### The owner can stop waiting for the browser, and the accounts are read back

```quint
pure def canStopWaiting(g: Google): bool = g.tab.open

pure def stopWaiting(g: Google): Moved = reading(g.work, { ...g, tab: O::back(g.tab) })
```

### A connection can be denied in the browser

```quint
pure def sometimesDenied(g: Google): bool = g.note == Denied and not(g.tab.open)
```

### A connection can fail in the browser

```quint
pure def sometimesAConnectionFailed(g: Google): bool = g.note == Failed and g.list.status == R::Loading
```

### The owner can be waiting for the browser

```quint
pure def sometimesInTheBrowser(g: Google): bool = g.tab.open and g.links.length() > 0
```

## Story: Disconnect a Google account

> As the owner, I want to disconnect an account only after confirming it
> for that account, and be told only what Cloud's own list confirms.

### Disconnecting is reviewed for one listed account, and is refused if the list changed meanwhile

```quint
pure def canAskDisconnect(g: Google, account: int): bool =
  g.work == Resting and not(g.tab.open) and not(g.review.showing) and g.list.status != R::Loading and holds(g.links, account)

pure def askDisconnect(g: Google, account: int): Google = { ...g, leaving: account, review: V::present(g.review), note: Quiet }

pure def canKeepAccount(g: Google): bool = g.review.showing

pure def keepAccount(g: Google): Google = { ...g, leaving: 0, review: V::dismiss(g.review) }
```

### Confirming tells Calendar to pause that account's sync and asks Cloud to disconnect it, and whatever Cloud answers, the accounts are read back to confirm it

```quint
pure def canConfirmDisconnect(g: Google): bool =
  V::canConfirm(g.review) and g.work == Resting and holds(g.links, g.leaving) and g.list.status != R::Loading

pure def confirmDisconnect(g: Google): Moved =
  { state: { ...g, work: Disconnecting, ticket: g.ticket + 1, review: V::confirm(g.review) },
    out: List(PauseSync({ account: g.leaving }), Disconnect({ ticket: g.ticket + 1, account: g.leaving })) }

pure def canDisconnectAnswered(g: Google, ticket: int): bool = g.work == Disconnecting and ticket == g.ticket

pure def disconnectAnswered(g: Google, ticket: int): Moved = reading(Confirming, g)

pure def stepADisconnectIsConfirmedAndToldToCalendar(before: Google, via: str, after: Google, out: List[Effect]): bool =
  out.every(e => match e {
    | Disconnect(x) => via == "confirmDisconnect" and V::canConfirm(before.review) and holds(before.links, x.account)
        and x.account == before.leaving and out.includes(PauseSync({ account: x.account }))
    | _ => true
  })

pure def alwaysADisconnectNamesItsAccount(g: Google): bool = and {
  O::valid(g.tab),
  g.work != Resting implies (g.leaving > 0 and holds(g.links, g.leaving) and not(g.tab.open)),
  g.work == Disconnecting implies g.list.status != R::Loading,
  g.work == Confirming implies g.list.status == R::Loading,
  g.review.showing implies (g.leaving > 0 and g.work == Resting),
}
```

### An account is said to be disconnected only when the readback no longer lists it, and it then holds nothing

```quint
pure def stepADisconnectedAccountHoldsNothing(before: Google, via: str, after: Google, out: List[Effect]): bool =
  (after.note == Disconnected and before.note != Disconnected)
    implies (via == "listed" and before.work == Confirming and after.gone == before.leaving and not(holds(after.links, after.gone))
      and out.includes(Forget({ account: after.gone })) and not(mayRead(after, after.gone)) and not(maySend(after, after.gone)))
```

### A disconnect can be reviewed for one account

```quint
pure def sometimesADisconnectIsReviewed(g: Google): bool = g.review.showing and g.leaving == 2 and g.links.length() == 2
```

### An account can be disconnected

```quint
pure def sometimesDisconnected(g: Google): bool = g.note == Disconnected and g.gone > 0
```

### A disconnect confirmed in the same readback as another account narrowing is told as a narrowing

```quint
pure def sometimesANarrowingOutranksADisconnect(g: Google): bool = g.note == Narrowed and g.gone > 0 and not(holds(g.links, g.gone))
```

### A disconnect can leave the account still connected, or unconfirmed

```quint
pure def sometimesStillConnected(g: Google): bool = g.note == StillConnected

pure def sometimesUnconfirmed(g: Google): bool = g.note == Unconfirmed
```

## Story: Keep Google to its sign-in

> As the owner, I want the Google accounts shown to be those of the Cloud
> account signed in, nothing of another's to stay behind, and nothing to
> survive erasing Alpha.

### A new sign-in, or signing out, forgets the accounts and their mail, ends a visit or disconnect in flight, and reads the new sign-in's accounts

The visit's number is kept, so the old visit's return is refused.

```quint
pure def cleared(note: Note, g: Google): Google =
  { ...g, links: List(), tab: O::back(O::coldBack(g.tab)), work: Resting, leaving: 0, gone: 0,
    review: V::dismiss(V::revise(g.review)), note: note, list: O::retire(g.list) }

pure def canReset(g: Google, signIn: int): bool = signIn >= 0

pure def reset(g: Google, signIn: int): Moved =
  val c = cleared(Quiet, g)
  if (signIn > 0) { state: reading(Resting, c).state, out: forgotten(g.links, List()).concat(reading(Resting, c).out) }
  else { state: c, out: forgotten(g.links, List()) }

pure def lawSigningOutLeavesNoGoogle(read: bool, send: bool): bool =
  val g = { ...initial, links: List({ id: 1, read: read, modify: false, send: send }), tab: { open: true, number: 1, orphan: false } }
  val out = reset(g, 0)
  out.state.links.length() == 0 and not(out.state.tab.open) and out.state.list.status != R::Loading
    and out.out == List(Forget({ account: 1 }))
```

### Accounts can be listed for the sign-in

```quint
pure def sometimesANewSignInsAccounts(g: Google): bool = g.links.length() > 0 and g.list.ticket >= 2 and g.tab.number == 0 and g.note == Quiet
```

### A restart keeps the accounts last read back, orphans an open visit, leaves a disconnect in flight unconfirmed, and reads the accounts again

```quint
pure def canRestart(g: Google, signIn: int): bool = signIn >= 0

pure def restart(g: Google, signIn: int): Moved =
  val r = { ...g, tab: O::orphaned(g.tab), work: Resting, leaving: 0, review: V::dismiss(V::revise(g.review)), list: O::retire(g.list),
    note: if (g.work == Resting) g.note else Unconfirmed }
  if (signIn > 0) reading(Resting, r) else { state: r, out: List() }
```

### A consent visit's return after a restart grants nothing and reads the accounts back

```quint
pure def canReturnedCold(g: Google, tab: int): bool = O::canReturnCold(g.tab, tab) and g.work == Resting

pure def returnedCold(g: Google, tab: int): Moved = reading(Resting, { ...g, tab: O::coldBack(g.tab), note: CutByRestart })
```

### A consent visit can come back after a restart and be read back

```quint
pure def sometimesAColdReturnIsReadBack(g: Google): bool = g.note == CutByRestart and g.list.status == R::Loading
```

### Erasing Alpha forgets every account and its mail and refuses every answer still in flight

```quint
pure def erase(g: Google): Moved = { state: cleared(Quiet, g), out: forgotten(g.links, List()) }
```
