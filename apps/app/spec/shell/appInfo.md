# App info

An installed entry's menu in the library offers Android's App info page for exactly that entry,
in its profile. Android resolves the entry again when it opens the page (spec of the system
bridge, "App info opens Android's details page for exactly the entry the owner chose"); the shell
keeps one request at a time, under the ticket it captured, and shows Android's refusal for the
entry it asked about even if the library has closed since.

```quint
type InfoPhase = InfoIdle | InfoQueued
type InfoReply = InfoOpened | InfoInvalid | InfoProfileGone | InfoNotInstalled | InfoFailed
type AppInfo = { phase: InfoPhase, target: str, ticket: int, notice: str, reason: InfoReply }
pure val initial: AppInfo = { phase: InfoIdle, target: "", ticket: 0, notice: "", reason: InfoOpened }
pure val keyValues = Set("org.fixture.clock", "org.fixture.mail/org.fixture.mail.Main#10")
pure val ticketValues = Set(0, 1, 2)
```

## Story: Check an app's details in Android

> As the owner, I want App info on a library entry to open Android's page for that exact app and
> profile, and to be told plainly when Android could not open it.

### One request at a time, settled only by the reply to its own ticket

The menu closes when the request is sent; focus goes back to the entry's tile. Another App info
waits until the first is answered.

```quint
pure def canRequest(a: AppInfo, key: str): bool = a.phase == InfoIdle and key != ""
pure def request(a: AppInfo, key: str): AppInfo = { ...a, phase: InfoQueued, target: key, ticket: a.ticket + 1 }
pure def canAnswer(a: AppInfo, ticket: int, reply: InfoReply): bool = a.phase == InfoQueued and ticket == a.ticket
pure def answer(a: AppInfo, ticket: int, reply: InfoReply): AppInfo =
  if (reply == InfoOpened) { ...a, phase: InfoIdle } else { ...a, phase: InfoIdle, notice: a.target, reason: reply }
pure def alwaysAQueuedRequestNamesItsEntry(a: AppInfo): bool = (a.phase == InfoQueued implies a.target != "") and a.ticket >= 0
pure def stepARefusalNamesTheEntryAsked(before: AppInfo, via: str, after: AppInfo): bool =
  (via == "answer" and after.notice != before.notice) implies (after.notice == before.target and after.reason != InfoOpened)
pure def sometimesRefusedAfterAsking(a: AppInfo): bool = a.notice != "" and a.reason == InfoNotInstalled
```

### A refusal is shown once and the library reads the device again

The entry may be gone, disabled or in a profile that left; after a refusal the shell refreshes the
installed list, and the notice is dismissed by the owner or replaced by the next refusal.

```quint
pure def canDismissNotice(a: AppInfo): bool = a.notice != ""
pure def dismissNotice(a: AppInfo): AppInfo = { ...a, notice: "" }
pure def lawOnlyAnOpenedPageIsSilent(a: AppInfo): bool =
  a.phase == InfoQueued implies (answer(a, a.ticket, InfoOpened).notice == a.notice)
pure val aValues = Set(initial, { ...initial, phase: InfoQueued, target: "org.fixture.clock", ticket: 1 })
```
