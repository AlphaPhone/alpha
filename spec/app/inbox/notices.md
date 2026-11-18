# Mail notices

New mail noticed while Inbox is closed: the phone checks the Gmail
history of the account selected in the [list](./index.md) in the
background, from a starting point taken when watching began, and asks
the notices area to post a notice for each new message. Posting, tapping
and dismissing a notice, and whether Android lets Alpha post
notifications, are the notices area's; a tap comes back here as
`tapped`, naming the account and message, and opens that message in
Inbox.

The shell passes the grant of the account it names as the list holds it,
whether notifications may be posted, and the account selected in the
list whenever it changes.

## Story: Hear about new mail

> As the owner, I want a notice on the phone when new mail arrives in the
> account I am reading, for mail that arrived after I turned this on, and
> nothing once I withdraw access or sign out.

### Watching keeps one account, the check of its history, where the history was last read, and how often Google refused it

Account 0 is none; history point 0 means not read yet. The account, its
history point and its refusals are kept through a restart.

```quint
import read as R from "../../kit/read"
import access.* from "./access"

type Notices = { account: int, check: R::Read, since: int, refusals: int, stopped: bool, posts: int }

type Effect =
  | Schedule({ account: int })
  | Unschedule({ watched: int })
  | ReadHistory({ ticket: int, account: int, since: int })
  | Post({ account: int, message: int })
  | Withdraw({ posted: int })
  | OpenOwn({ watched: int, message: int })
type Noticed = { state: Notices, out: List[Effect] }

pure val initial: Notices = { account: 0, check: R::unread, since: 0, refusals: 0, stopped: false, posts: 0 }

pure val accountValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val pointValues = Set(0, 1, 2)
pure val messageValues = Set(0, 1, 2)
```

### Leaving an account withdraws its notices and its schedule, and no check of it can still answer

```quint
pure def leaving(s: Notices): List[Effect] =
  if (s.account != 0) List(Unschedule({ watched: s.account }), Withdraw({ posted: s.account })) else List()

pure def unwatched(check: R::Read, posts: int): Notices =
  { account: 0, check: { ...check, status: R::Idle }, since: 0, refusals: 0, stopped: false, posts: posts }
```

### Watching follows the account selected in the list, while Alpha may read it and post notifications, on one schedule of its own

Choosing it again after Google stopped it starts afresh.

```quint
pure def canWatch(s: Notices, access: Access, notify: bool): bool =
  allowsFor(access, access.account, Reading) and notify and (access.account != s.account or s.stopped)

pure def watch(s: Notices, access: Access, notify: bool): Noticed = {
  state: { ...unwatched(s.check, s.posts), account: access.account },
  out: leaving(s).append(Schedule({ account: access.account })),
}

pure def canUnwatch(s: Notices): bool = s.account != 0

pure def unwatch(s: Notices): Noticed = { state: unwatched(s.check, s.posts), out: leaving(s) }
```

### Losing read access to the account watched, the permission to notify, or the cloud session stops watching at once

```quint
pure def accessChanged(s: Notices, access: Access, notify: bool): Noticed =
  if (s.account == 0 or (notify and (access.account != s.account or allows(access.grant, Reading)))) { state: s, out: List() }
  else unwatch(s)

pure def sessionChanged(s: Notices): Noticed = unwatch(s)
```

### A scheduled check reads the history since the last point, one check at a time

```quint
pure def canPoll(s: Notices): bool = s.account != 0 and not(s.stopped) and s.check.status != R::Loading

pure def poll(s: Notices): Noticed =
  val check = R::ask(s.check)
  { state: { ...s, check: check }, out: List(ReadHistory({ ticket: check.ticket, account: s.account, since: s.since })) }
```

### The first answer only sets the starting point, and so does a history Google has reset; later ones post a notice for new mail

Google refusing the account three times in a row stops watching it until
it is chosen again.

```quint
pure def canChecked(s: Notices, ticket: int, ok: bool, point: int): bool =
  R::canAnswer(s.check, ticket) and s.account != 0 and (ok implies point >= 1)

pure def checked(s: Notices, ticket: int, ok: bool, refused: bool, reset: bool, point: int, message: int): Noticed =
  val check = R::answer(s.check, ok)
  val refusals = if (refused) s.refusals + 1 else if (ok) 0 else s.refusals
  if (not(ok) and refused and refusals >= 3)
    { state: { ...s, check: check, refusals: refusals, stopped: true }, out: List(Unschedule({ watched: s.account })) }
  else if (not(ok)) { state: { ...s, check: check, refusals: refusals }, out: List() }
  else if (s.since == 0 or reset or message == 0) { state: { ...s, check: check, since: point, refusals: 0 }, out: List() }
  else {
    state: { ...s, check: check, since: point, refusals: 0, posts: s.posts + 1 },
    out: List(Post({ account: s.account, message: message })),
  }
```

### Only mail after the starting point is noticed, for the account watched

```quint
pure def stepNoNoticeBeforeTheStartingPoint(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | Post(p) => via == "checked" and before.since != 0 and p.account == before.account and p.account != 0 and p.message != 0
    | _ => true
  })
```

### Every history read is for the account watched, from its last point, under the newest ticket

```quint
pure def stepEveryReadIsOfTheAccountWatched(before: Notices, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadHistory(r) =>
      r.account == after.account and r.account != 0 and not(after.stopped)
        and r.ticket == after.check.ticket and r.since == after.since
    | _ => true
  })
```

### A restart keeps the account watched and its starting point, and no check from before it can answer

```quint
pure def restart(s: Notices): Notices = { ...s, check: { ...s.check, status: R::Idle } }

pure def lawARestartLetsTheCheckRunAgain(account: int, ticket: int, since: int): bool =
  val after = restart({ account: account, check: { status: R::Loading, ticket: ticket }, since: since, refusals: 0, stopped: false, posts: 0 })
  account != 0 implies (canPoll(after) and not(R::canAnswer(after.check, ticket)))
```

### With no account watched nothing is checked, and watching stops, with no check left, only after three refusals in a row

```quint
pure def alwaysWatchingNeedsAnAccount(s: Notices): bool =
  s.account == 0 implies (s.check.status != R::Loading and not(s.stopped) and s.since == 0 and s.refusals == 0)

pure def alwaysWatchingStopsOnlyAfterThreeRefusals(s: Notices): bool =
  s.refusals >= 0 and (s.stopped iff s.refusals >= 3) and s.refusals <= 3
    and (s.stopped implies s.check.status != R::Loading)
```

### Watching can start quietly, post a notice, stop after refusals, and wait to check again after a restart

```quint
pure def sometimesWatchingStartedQuietly(s: Notices): bool = s.since != 0 and s.check.status == R::Loaded

pure def sometimesWatchingStopped(s: Notices): bool = s.stopped

pure def sometimesANoticeWasPosted(s: Notices): bool = s.posts >= 1 and s.account != 0

pure def sometimesACheckWaitsAfterARestart(s: Notices): bool =
  s.account != 0 and s.check.status == R::Idle and s.check.ticket >= 1 and s.since != 0
```

## Story: Open my message from a notice

> As the owner, I want tapping a notice to open that message in Inbox,
> under the account it came for, and an old notice to open nothing once
> that account is no longer watched.

### A tapped notice opens its message in Inbox for the account watched, which the list selects first

```quint
pure def canTapped(s: Notices, account: int, message: int): bool = account != 0 and account == s.account and message != 0

pure def tapped(s: Notices, account: int, message: int): Noticed =
  { state: s, out: List(OpenOwn({ watched: account, message: message })) }

pure def stepATapOpensOnlyMailOfTheAccountWatched(before: Notices, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenOwn(o) => o.watched == before.account and o.watched != 0 and o.message != 0
    | _ => true
  })
```
