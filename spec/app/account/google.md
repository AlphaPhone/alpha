# Google & email

The Google accounts the owner connected through Alpha Cloud, and what each
lets Alpha do with mail: read it, modify it (label, archive, mark read),
send it. Cloud holds the grants; this page holds what Cloud last read back
for the Cloud account signed in ([Sign-in](./signIn.md)), and Inbox and
Calendar ask it what they may do.

## Story: See my Google accounts

> As the owner, I want to see each Google account I connected and what it
> allows, as Cloud reports it, and to be told whenever an account allows
> less than before.

### Google & email holds the Cloud account it reads for, the accounts read back with what each allows, and the browser tab and disconnect in flight

```quint
import read as R from "../../kit/read"

type Link = { id: int, read: bool, modify: bool, send: bool }
type Work = Resting | Disconnecting | Confirming
type Note = Quiet | Denied | Failed | Narrowed | Disconnected | StillConnected | Unconfirmed
type Google = {
  owner: int, links: List[Link], list: R::Read,
  tab: int, away: bool, work: Work, ticket: int, leaving: int, gone: int, note: Note,
}

pure val initial: Google = {
  owner: 0, links: List(), list: R::unread,
  tab: 0, away: false, work: Resting, ticket: 0, leaving: 0, gone: 0, note: Quiet,
}

pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
pure val tabValues = Set(1, 2)
pure val accountValues = Set(1, 2)
pure val linksValues = Set(
  List(),
  List({ id: 1, read: true, modify: true, send: true }),
  List({ id: 1, read: true, modify: false, send: false }),
  List({ id: 1, read: true, modify: true, send: true }, { id: 2, read: true, modify: false, send: true }),
  List({ id: 2, read: false, modify: true, send: false }),
)
pure val weight_listed = 20
```

### What the page asks of the phone is a read of the accounts, a consent tab, a disconnect, or to forget an account's mail

```quint
type Effect = ReadAccounts({ check: int }) | OpenConsent({ tab: int, read: bool, modify: bool, send: bool }) | Disconnect({ ticket: int, account: int }) | Forget({ account: int })
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

### Inbox may read, modify or send with an account only as far as its grant allows

```quint
pure def holds(links: List[Link], id: int): bool = links.some(l => l.id == id)

pure def mayRead(g: Google, id: int): bool = g.links.some(l => l.id == id and l.read)

pure def mayModify(g: Google, id: int): bool = g.links.some(l => l.id == id and l.modify)

pure def maySend(g: Google, id: int): bool = g.links.some(l => l.id == id and l.send)
```

### The accounts are read again on the owner's request, one read at a time, and only the newest read is taken

```quint
pure def reading(work: Work, g: Google): Moved =
  { state: { ...g, work: work, list: R::ask(g.list) }, out: List(ReadAccounts({ check: g.list.ticket + 1 })) }

pure def canRefresh(g: Google): bool = g.owner > 0 and g.list.status != R::Loading and g.work == Resting

pure def refresh(g: Google): Moved = reading(Resting, g)
```

### A readback replaces the accounts, says when one allows less than before, and forgets the mail of every account no longer listed

An account that a confirmed disconnect removed is said to be
disconnected; one still listed after a disconnect is said to be still
connected; a readback that failed after a disconnect leaves it
unconfirmed.

```quint
pure def covers(a: Link, b: Link): bool = (b.read implies a.read) and (b.modify implies a.modify) and (b.send implies a.send)

pure def shrank(before: List[Link], after: List[Link], except: int): bool =
  before.some(b => b.id != except and not(after.some(a => a.id == b.id and covers(a, b))))

pure def forgotten(before: List[Link], after: List[Link]): List[Effect] =
  before.select(b => not(holds(after, b.id))).listMap(b => Forget({ account: b.id }))

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
    { state: { ...g, list: R::answer(g.list, true), links: fresh, work: Resting, leaving: 0,
        gone: if (dropped) g.leaving else if (holds(fresh, g.gone)) 0 else g.gone,
        note: if (shrank(g.links, fresh, except)) Narrowed else if (dropped) Disconnected else if (confirming) StillConnected else g.note },
      out: forgotten(g.links, fresh) }
```

### What an account allows never shrinks without the owner being told

```quint
pure def stepScopesNeverShrinkSilently(before: Google, via: str, after: Google): bool =
  (via != "ownerChanged" and shrank(before.links, after.links, if (after.note == Disconnected) after.gone else 0))
    implies after.note == Narrowed
```

### Every account that leaves the list has its mail forgotten

```quint
pure def stepALeavingAccountIsForgotten(before: Google, after: Google, out: List[Effect]): bool =
  before.links.every(b => holds(after.links, b.id) or out.some(e => match e { | Forget(f) => f.account == b.id | _ => false }))
```

### The accounts change only by a readback or a change of Cloud account

```quint
pure def stepOnlyAReadbackChangesTheAccounts(before: Google, via: str, after: Google): bool =
  after.links != before.links implies (via == "listed" or via == "ownerChanged")
```

### Two accounts can be connected, one of them able to send

```quint
pure def sometimesTwoAccounts(g: Google): bool = g.links.length() == 2 and maySend(g, 2) and not(mayModify(g, 2))
```

### The owner can be told an account allows less than before

```quint
pure def sometimesNarrowed(g: Google): bool = g.note == Narrowed
```

## Story: Connect a Google account

> As the owner, I want to connect Google in a browser tab, choose what
> Alpha may do with my mail, and come back to Alpha with the accounts as
> Google now allows them.

### Connecting opens a new tab, only once the accounts are known, and never asks for less than an account already allows

```quint
pure def canConnect(g: Google, read: bool, modify: bool, send: bool): bool =
  g.owner > 0 and not(g.away) and g.work == Resting and g.list.status == R::Loaded and (read or modify or send)

pure def connect(g: Google, read: bool, modify: bool, send: bool): Moved =
  val m = modify or g.links.some(l => l.modify)
  val sd = send or g.links.some(l => l.send)
  val r = read or m or g.links.some(l => l.read)
  { state: { ...g, tab: g.tab + 1, away: true, note: Quiet },
    out: List(OpenConsent({ tab: g.tab + 1, read: r, modify: m, send: sd })) }

pure def stepConsentNeverAsksForLess(before: Google, after: Google, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenConsent(x) => (x.modify implies x.read) and x.tab == after.tab and after.tab == before.tab + 1
        and before.links.every(l => covers({ id: l.id, read: x.read, modify: x.modify, send: x.send }, l))
    | _ => true
  })
```

### Only the return of the tab that is open is taken, once, and it grants nothing: the accounts are read back

A denied or failed connection is said so.

```quint
type Result = Granted | Declined | Broken

pure def canReturned(g: Google, tab: int): bool = g.away and tab == g.tab

pure def returned(g: Google, tab: int, result: Result): Moved =
  reading(g.work, { ...g, away: false, note: if (result == Declined) Denied else if (result == Broken) Failed else Quiet })

pure def stepABrowserReturnIsTakenOnce(before: Google, via: str, after: Google): bool =
  after.tab >= before.tab and (via == "returned" implies (before.away and not(after.away)))
```

### The owner can stop waiting for the browser, and the accounts are read back

```quint
pure def canStopWaiting(g: Google): bool = g.away

pure def stopWaiting(g: Google): Moved = reading(g.work, { ...g, away: false })
```

### A connection can be denied in the browser

```quint
pure def sometimesDenied(g: Google): bool = g.note == Denied and not(g.away)
```

### The owner can be waiting for the browser

```quint
pure def sometimesInTheBrowser(g: Google): bool = g.away and g.links.length() > 0
```

## Story: Disconnect a Google account

> As the owner, I want to disconnect an account and be told only what
> Cloud's own list confirms.

### Disconnecting names one listed account, and whatever Cloud answers, the accounts are read back to confirm it

```quint
pure def canDisconnect(g: Google, account: int): bool =
  g.work == Resting and not(g.away) and g.list.status != R::Loading and holds(g.links, account)

pure def disconnect(g: Google, account: int): Moved =
  { state: { ...g, work: Disconnecting, ticket: g.ticket + 1, leaving: account, note: Quiet },
    out: List(Disconnect({ ticket: g.ticket + 1, account: account })) }

pure def canDisconnectAnswered(g: Google, ticket: int): bool = g.work == Disconnecting and ticket == g.ticket

pure def disconnectAnswered(g: Google, ticket: int): Moved = reading(Confirming, g)

pure def alwaysADisconnectNamesItsAccount(g: Google): bool =
  (g.work != Resting implies (g.leaving > 0 and not(g.away) and g.owner > 0))
    and (g.work == Disconnecting implies g.list.status != R::Loading)
    and (g.work == Confirming implies g.list.status == R::Loading)
```

### An account is said to be disconnected only when the readback no longer lists it

```quint
pure def stepDisconnectedOnlyWhenNoLongerListed(before: Google, via: str, after: Google): bool =
  (after.note == Disconnected and before.note != Disconnected)
    implies (via == "listed" and before.work == Confirming and after.gone == before.leaving and not(holds(after.links, after.gone)))
```

### A disconnected account holds nothing

```quint
pure def alwaysADisconnectedAccountHoldsNothing(g: Google): bool =
  g.gone >= 0 and (g.gone > 0 implies not(holds(g.links, g.gone)))
```

### An account can be disconnected

```quint
pure def sometimesDisconnected(g: Google): bool = g.note == Disconnected and g.gone > 0
```

### A disconnect can leave the account still connected, or unconfirmed

```quint
pure def sometimesStillConnected(g: Google): bool = g.note == StillConnected

pure def sometimesUnconfirmed(g: Google): bool = g.note == Unconfirmed
```

## Story: Keep Google to its Cloud account

> As the owner, I want the Google accounts shown to be those of the Cloud
> account signed in, and nothing of another's to stay behind.

### A change of Cloud account forgets the accounts and their mail, retires a tab or disconnect in flight, and reads the new account's

The tab's number is kept, so the old tab's return is refused.

```quint
pure def canOwnerChanged(g: Google, owner: int): bool = owner >= 0 and owner != g.owner

pure def ownerChanged(g: Google, owner: int): Moved =
  val cleared = { ...g, owner: owner, links: List(), away: false, work: Resting, leaving: 0, gone: 0, note: Quiet }
  if (owner > 0) { state: reading(Resting, cleared).state, out: forgotten(g.links, List()).concat(reading(Resting, cleared).out) }
  else { state: { ...cleared, list: if (g.list.status == R::Loading) R::answer(g.list, false) else g.list }, out: forgotten(g.links, List()) }
```

### With no Cloud account signed in, there are no Google accounts and nothing in flight

```quint
pure def alwaysNoCloudAccountNoGoogle(g: Google): bool =
  g.owner >= 0 and (g.owner == 0 implies (g.links.length() == 0 and not(g.away) and g.work == Resting and g.list.status != R::Loading))
```

### A new Cloud account can find its own Google accounts

```quint
pure def sometimesAnotherOwnersAccounts(g: Google): bool = g.owner == 2 and g.links.length() > 0
```
