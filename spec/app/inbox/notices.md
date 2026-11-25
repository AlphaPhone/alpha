# Mail notices

New mail noticed while Inbox is closed: the phone checks the Gmail
history of the account selected in the [list](./index.md) in the
background, from a starting point taken when watching began, and asks
the notices area to post a notice for each new message. Posting, tapping
and dismissing a notice, and whether Android lets Alpha post
notifications, are the notices area's; a tap comes back here as
`tapped`, naming the account and message, and opens that message in
Inbox.

The earlier Alpha checked mail in the background on a native schedule of
its own, keeping what it watched and where it had read to in the
encrypted slot `gmail-background:v1`, bound to the cloud key it had. This
Alpha leaves that slot unread, as [adoption](../platform/adoption.md)
says, and its check stops with the earlier schedule: after the update,
watching starts afresh for the account selected in the list, from a
starting point of its own, so mail that came before that point is not
noticed.

The shell passes the grant of the account it names as the list holds it,
whether notifications may be posted, the account selected in the list
whenever it changes, and tells when the cloud credential changed. Inbox
offers Settings the fact `status`: whether mail is watched, when it was
last checked, and why it is not.

## Story: Hear about new mail

> As the owner, I want a notice on the phone for each new message in the
> account I am reading, for mail that arrived after I turned this on, and
> nothing once I withdraw access or sign out.

### Watching keeps one account, the check of its history, where the history was last read in full, the page still to read, the notices up, and why Google stopped it

Account 0 is none; history point 0 means not read yet; page 0 means none
left to read. What is watched, its history point, the page still to
read, its refusals and the notices up are kept through a restart.

```quint
import read as R from "../../kit/read"
import access.* from "./access"

type Halt = Running | Refused | Unauthorized
type Problem = Fine | Forbidden | Denied | Unreachable
type Notices = {
  account: int, check: R::Read, since: int, page: int, refusals: int, halt: Halt,
  expired: bool, checkedAt: int, up: Set[int], posts: int,
}

type Effect =
  | Schedule({ account: int })
  | Unschedule({ watched: int })
  | ReadHistory({ ticket: int, account: int, since: int, page: int })
  | Post({ account: int, messages: Set[int] })
  | Withdraw({ posted: int })
  | OpenOwn({ watched: int, message: int })
type Noticed = { state: Notices, out: List[Effect] }

pure val initial: Notices = {
  account: 0, check: R::unread, since: 0, page: 0, refusals: 0, halt: Running,
  expired: false, checkedAt: 0, up: Set(), posts: 0,
}

pure val accountValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val pointValues = Set(1, 2, 3)
pure val pageValues = Set(0, 7)
pure val messagesValues = Set(Set(), Set(1), Set(1, 2))
pure val messageValues = Set(0, 1, 2)
pure val nowValues = Set(1, 4)
pure val weight_poll = 6
pure val weight_checked = 6
```

### Leaving an account withdraws its notices and its schedule, and no check of it can still answer

```quint
pure def leaving(s: Notices): List[Effect] =
  if (s.account != 0) List(Unschedule({ watched: s.account }), Withdraw({ posted: s.account })) else List()

pure def unwatched(check: R::Read, posts: int): Notices = {
  ...initial, check: { ...check, status: R::Idle }, posts: posts,
}
```

### Watching follows the account selected in the list, while Alpha may read it and post notifications, on one schedule of its own

Choosing it again after Google stopped it starts afresh.

```quint
pure def canWatch(s: Notices, access: Access, account: int, notify: bool): bool =
  allowsFor(access, account, Reading) and notify and (account != s.account or s.halt != Running)

pure def watch(s: Notices, access: Access, account: int, notify: bool): Noticed = {
  state: { ...unwatched(s.check, s.posts), account: account },
  out: leaving(s).append(Schedule({ account: account })),
}

pure def canUnwatch(s: Notices): bool = s.account != 0

pure def unwatch(s: Notices): Noticed = { state: unwatched(s.check, s.posts), out: leaving(s) }
```

### Losing read access to the account watched, the permission to notify, the cloud session or the cloud credential stops watching at once and withdraws every notice

```quint
pure def accessChanged(s: Notices, access: Access, notify: bool): Noticed =
  if (s.account == 0 or (notify and (access.account != s.account or allows(access.grant, Reading)))) { state: s, out: List() }
  else unwatch(s)

pure def sessionChanged(s: Notices): Noticed = unwatch(s)

pure def credentialChanged(s: Notices): Noticed = unwatch(s)
```

### A scheduled check reads the history from the last point, or the page still to read, one check at a time

```quint
pure def canPoll(s: Notices): bool = s.account != 0 and s.halt == Running and s.check.status != R::Loading

pure def poll(s: Notices): Noticed =
  val check = R::ask(s.check)
  {
    state: { ...s, check: check },
    out: List(ReadHistory({ ticket: check.ticket, account: s.account, since: s.since, page: s.page })),
  }
```

### The first answer only sets the starting point, and so does a history Google has reset, which says earlier messages were not looked at; later ones post a notice for each new message, and the point moves on only with the last page

A history point never moves back but by a reset, and an answer is taken
only when it names each new message by a number. Google refusing the
account as unauthorized stops watching at once; refusing it otherwise
three times in a row stops it too; either until it is chosen again.

```quint
pure def canChecked(s: Notices, ticket: int, ok: bool, reset: bool, point: int, messages: Set[int]): bool =
  R::canAnswer(s.check, ticket) and s.account != 0 and not(messages.contains(0))
    and (ok implies (point >= 1 and ((s.since != 0 and not(reset)) implies point >= s.since)))

pure def checked(s: Notices, ticket: int, ok: bool, problem: Problem, reset: bool, point: int, page: int, messages: Set[int], now: int): Noticed =
  val check = R::answer(s.check, ok)
  val refusals = if (problem == Forbidden) s.refusals + 1 else s.refusals
  if (not(ok) and problem == Denied)
    { state: { ...s, check: check, halt: Unauthorized }, out: List(Unschedule({ watched: s.account })) }
  else if (not(ok) and refusals >= 3)
    { state: { ...s, check: check, refusals: refusals, halt: Refused }, out: List(Unschedule({ watched: s.account })) }
  else if (not(ok)) { state: { ...s, check: check, refusals: refusals }, out: List() }
  else if (s.since == 0 or reset)
    { state: { ...s, check: check, since: point, page: 0, refusals: 0, expired: reset and s.since != 0, checkedAt: now }, out: List() }
  else {
    state: {
      ...s, check: check, refusals: 0, checkedAt: now, expired: false,
      since: if (page == 0) point else s.since, page: page,
      up: s.up.union(messages), posts: s.posts + messages.size(),
    },
    out: if (messages.size() > 0) List(Post({ account: s.account, messages: messages })) else List(),
  }
```

### Only mail after the starting point is noticed, for the account watched, and the starting point moves back only when Google reset the history

```quint
pure def stepNoNoticeBeforeTheStartingPoint(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | Post(p) =>
      via == "checked" and before.since != 0 and p.account == before.account and p.account != 0
        and not(p.messages.contains(0)) and p.messages.subseteq(after.up) and not(after.expired)
    | _ => true
  })

pure def stepTheStartingPointMovesBackOnlyOnAReset(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  (via == "checked" and before.since != 0 and after.since < before.since) implies (after.expired and out.length() == 0)
```

### The history point moves on only when the last page of new mail was read

```quint
pure def stepThePointWaitsForTheLastPage(before: Notices, via: str, after: Notices): bool =
  (via == "checked" and after.page != 0) implies after.since == before.since
```

### Every history read is for the account watched, from its last point and page, under the newest ticket

```quint
pure def stepEveryReadIsOfTheAccountWatched(before: Notices, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadHistory(r) =>
      r.account == after.account and r.account != 0 and after.halt == Running
        and r.ticket == after.check.ticket and r.since == after.since and r.page == after.page
    | _ => true
  })
```

### A restart keeps what is watched, its point, its page and the notices up, and no check from before it can answer

```quint
pure def restart(s: Notices): Notices = { ...s, check: { ...s.check, status: R::Idle } }

pure def lawARestartLetsTheCheckRunAgain(account: int, ticket: int, since: int): bool =
  val after = restart({ ...initial, account: account, check: { status: R::Loading, ticket: ticket }, since: since })
  account != 0 implies (canPoll(after) and not(R::canAnswer(after.check, ticket)))
```

### With no account watched nothing is checked and no notice is up, and watching stops, with no check left, only when Google refused it

```quint
pure def alwaysWatchingNeedsAnAccount(s: Notices): bool =
  s.account == 0 implies (
    s.check.status != R::Loading and s.halt == Running and s.since == 0 and s.page == 0 and s.refusals == 0
      and s.up.size() == 0 and not(s.expired)
  )

pure def alwaysWatchingStopsOnlyWhenRefused(s: Notices): bool =
  s.refusals >= 0 and s.refusals <= 3 and ((s.halt == Refused) iff s.refusals >= 3)
    and (s.halt != Running implies s.check.status != R::Loading) and (s.page != 0 implies s.since != 0)
```

### Watching can start quietly, post notices, go on to a further page, lose earlier mail to a reset, stop after refusals or at once when unauthorized, and wait to check again after a restart

```quint
pure def sometimesWatchingStartedQuietly(s: Notices): bool = s.since != 0 and s.check.status == R::Loaded and s.posts == 0

pure def sometimesNoticesWerePosted(s: Notices): bool = s.up.size() >= 2 and s.account != 0

pure def sometimesAFurtherPageIsToRead(s: Notices): bool = s.page != 0 and s.posts >= 1

pure def sometimesEarlierMailWasMissed(s: Notices): bool = s.expired

pure def sometimesWatchingStopped(s: Notices): bool = s.halt == Refused

pure def sometimesWatchingIsUnauthorized(s: Notices): bool = s.halt == Unauthorized

pure def sometimesACheckWaitsAfterARestart(s: Notices): bool =
  s.account != 0 and s.check.status == R::Idle and s.check.ticket >= 1 and s.since != 0
```

## Story: See whether mail is watched

> As the owner, I want Settings to show whether new mail is noticed, when
> it was last checked, and why not when it is not.

### The status is off, watching since the last check, catching up on further pages, missing earlier mail after a reset, stopped by refusals, or no longer allowed

```quint
type Phase = Off | Watching | CatchingUp | Expired | Stopped | NoLongerAllowed
type Status = { phase: Phase, account: int, checkedAt: int }

pure def status(s: Notices): Status = {
  phase:
    if (s.account == 0) Off
    else if (s.halt == Unauthorized) NoLongerAllowed
    else if (s.halt == Refused) Stopped
    else if (s.expired) Expired
    else if (s.page != 0) CatchingUp
    else Watching,
  account: s.account, checkedAt: s.checkedAt,
}

pure def sometimesSettingsShowsCatchingUp(s: Notices): bool = status(s).phase == CatchingUp
```

## Story: Open my message from a notice

> As the owner, I want tapping a notice to open that message in Inbox,
> under the account it came for, and an old notice to open nothing once
> that account is no longer watched.

### A tapped notice opens its message in Inbox for the account watched, which the list selects first, and only a notice that is up

```quint
pure def canTapped(s: Notices, account: int, message: int): bool =
  account != 0 and account == s.account and message != 0 and s.up.contains(message)

pure def tapped(s: Notices, account: int, message: int): Noticed =
  { state: { ...s, up: s.up.exclude(Set(message)) }, out: List(OpenOwn({ watched: account, message: message })) }

pure def stepATapOpensOnlyTheNoticeUp(before: Notices, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenOwn(o) =>
      o.watched == before.account and o.watched != 0 and before.up.contains(o.message)
        and not(after.up.contains(o.message))
    | _ => true
  })

pure def sometimesANoticeWasOpened(s: Notices): bool = s.posts >= 1 and s.up.size() < s.posts and s.account != 0
```
