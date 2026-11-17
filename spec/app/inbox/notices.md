# Notices

New mail noticed while Inbox is closed: the phone checks the Gmail
history of one account in the background, from a starting point taken
when watching began, and posts a notice that opens that message in Inbox.
The grant comes from the [list](./index.md), and whether Android lets
Alpha post notifications from the permission Settings keeps.

## Story: Hear about new mail

> As the owner, I want a notice on the phone when new mail arrives in the
> account I chose, for mail that arrived after I turned this on, and
> nothing once I withdraw access or sign out.

### Watching keeps one account, the check of its history, where the history was last read, and the notice posted

Account 0 is none; history point 0 means not read yet.

```quint
import read as R from "../../kit/read"
import access.* from "./access"

type Notices = { account: int, check: R::Read, since: int, refusals: int, stopped: bool, notice: int }

type Effect =
  | Schedule({ account: int })
  | Unschedule({ watched: int })
  | ReadHistory({ ticket: int, account: int, since: int })
  | Post({ account: int, message: int })
  | Withdraw({ notice: int })
  | OpenOwn({ watched: int, message: int })
type Noticed = { state: Notices, out: List[Effect] }

pure val initial: Notices = { account: 0, check: R::unread, since: 0, refusals: 0, stopped: false, notice: 0 }

pure val accountValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val pointValues = Set(0, 1, 2)
pure val messageValues = Set(0, 1, 2)
```

### Leaving an account withdraws its notice and its schedule, and no check of it can still answer

```quint
pure def leaving(s: Notices): List[Effect] =
  (if (s.account != 0) List(Unschedule({ watched: s.account })) else List())
    .concat(if (s.notice != 0) List(Withdraw({ notice: s.notice })) else List())

pure def unwatched(check: R::Read): Notices =
  { account: 0, check: { ...check, status: R::Idle }, since: 0, refusals: 0, stopped: false, notice: 0 }
```

### Watching starts for an account Alpha may read, while notifications are allowed, on one schedule of its own

```quint
pure def canWatch(s: Notices, account: int, grant: Grant, notify: bool): bool =
  account != 0 and account != s.account and allows(grant, Reading) and notify

pure def watch(s: Notices, account: int, grant: Grant, notify: bool): Noticed = {
  state: { ...unwatched(s.check), account: account },
  out: leaving(s).append(Schedule({ account: account })),
}

pure def canUnwatch(s: Notices): bool = s.account != 0

pure def unwatch(s: Notices): Noticed = { state: unwatched(s.check), out: leaving(s) }
```

### Losing read access, notifications, or the cloud session stops watching at once

```quint
pure def accessChanged(s: Notices, grant: Grant, notify: bool): Noticed =
  if (allows(grant, Reading) and notify) { state: s, out: List() } else unwatch(s)

pure def sessionChanged(s: Notices): Noticed = unwatch(s)
```

### A scheduled check reads the history since the last point, one check at a time

```quint
pure def canPoll(s: Notices): bool = s.account != 0 and not(s.stopped) and s.check.status != R::Loading

pure def poll(s: Notices): Noticed =
  val check = R::ask(s.check)
  { state: { ...s, check: check }, out: List(ReadHistory({ ticket: check.ticket, account: s.account, since: s.since })) }
```

### The first answer only sets the starting point; later ones post a notice for new mail

Google refusing the account three times in a row stops watching it until
it is chosen again.

```quint
pure def canChecked(s: Notices, ticket: int, point: int): bool =
  R::canAnswer(s.check, ticket) and s.account != 0 and point >= 1

pure def checked(s: Notices, ticket: int, ok: bool, refused: bool, point: int, message: int): Noticed =
  val check = R::answer(s.check, ok)
  val refusals = if (refused) s.refusals + 1 else s.refusals
  if (not(ok) and refused and refusals >= 3)
    { state: { ...s, check: check, refusals: refusals, stopped: true }, out: List(Unschedule({ watched: s.account })) }
  else if (not(ok)) { state: { ...s, check: check, refusals: refusals }, out: List() }
  else if (s.since == 0 or message == 0) { state: { ...s, check: check, since: point, refusals: 0 }, out: List() }
  else {
    state: { ...s, check: check, since: point, refusals: 0, notice: message },
    out: List(Post({ account: s.account, message: message })),
  }
```

### Only mail after the starting point is noticed, for the account watched

```quint
pure def stepNoNoticeBeforeTheStartingPoint(before: Notices, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | Post(p) => before.since != 0 and p.account == before.account and after.notice == p.message
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

### A notice belongs to the account watched, and watching stops, with no check left, only after three refusals

```quint
pure def alwaysANoticeBelongsToTheAccountWatched(s: Notices): bool =
  (s.notice != 0 implies (s.account != 0 and s.since != 0))
    and (s.account == 0 implies (s.check.status != R::Loading and not(s.stopped) and s.since == 0))

pure def alwaysWatchingStopsOnlyAfterThreeRefusals(s: Notices): bool =
  s.refusals >= 0 and (s.stopped iff s.refusals >= 3) and s.refusals <= 3
    and (s.stopped implies s.check.status != R::Loading)
```

### A notice can be up, and watching can stop after refusals

```quint
pure def sometimesANoticeIsUp(s: Notices): bool = s.notice != 0

pure def sometimesWatchingStopped(s: Notices): bool = s.stopped

pure def sometimesWatchingStartedQuietly(s: Notices): bool = s.since != 0 and s.notice == 0
```

## Story: Open my message from a notice

> As the owner, I want tapping a notice to open that message in Inbox,
> and an old notice to open nothing once it no longer belongs to me.

### Tapping the notice up opens its message for the account watched, once

```quint
pure def canTap(s: Notices, message: int): bool = s.notice != 0 and message == s.notice

pure def tap(s: Notices, message: int): Noticed =
  { state: { ...s, notice: 0 }, out: List(OpenOwn({ watched: s.account, message: message })) }

pure def canDismiss(s: Notices): bool = s.notice != 0

pure def dismiss(s: Notices): Notices = { ...s, notice: 0 }

pure def stepATapOpensOnlyTheNoticeUp(before: Notices, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenOwn(o) => o.message == before.notice and o.message != 0 and o.watched == before.account and after.notice == 0
    | _ => true
  })
```
