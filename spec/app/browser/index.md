# Browser

Web pages in native tabs. Normal tabs share one kept profile, with its
cookies and sign-ins, and come back after a restart; private tabs are
ephemeral and are never saved. This spec is the tabs and the saved session.
What one tab does is in the specs beside it:

- [Address](./address.md): one tab's page: the address bar, loading, the secure mark, back and forward, and find in page
- [Library](./library.md): bookmarks and history
- [Site](./site.md): what a site may use, signing in to it, and a site's data
- [Downloads](./downloads.md): a file a page offers, from review to Downloads
- [Share](./share.md): sharing a page, copying its link and opening it in another browser
- [Reading](./reading.md): reading a page for Ask Alpha and reading it aloud

Whether Alpha is in the foreground comes from the [Shell](../shell/), and
the owner's approval of a page the agent wants to open from the approvals
area. Clearing all browsing data here also empties the library's history
and the sites' remembered answers.

## Story: Open, pick and close tabs

> As the owner, I want a handful of tabs, normal or private, to move
> between them and close them, and never to be left with none.

### The Browser holds its open tabs, which are private, the one shown, their native tabs, the saved session and its writer, and what covers the page

A tab is a number, never used twice. A native tab is the web view Android
keeps for a tab that has loaded a page. The saved session is the record on
the phone; the writer carries one copy of it at a time.

```quint
import read as R from "../../kit/read"

type Kind = Normal | Private
type Layer = Uncovered | Address | Switcher | Menu | Library
type Erasing = Kept | Asked | Running
type Effect = Restore({ ticket: int }) | Create({ tab: int, kind: Kind }) | Close({ tab: int }) | Save({ write: int }) | Erase | Halt({ driven: int })
type Browser = {
  open: Set[int], privates: Set[int], selected: int, issued: int, native: Set[int],
  kept: Set[int], restore: R::Read, hydrated: bool, untouched: bool,
  stale: bool, writing: bool, write: int, carried: Set[int], began: int, failures: int, retryAt: int,
  erasing: Erasing, agent: int, layer: Layer,
}
type Step = { state: Browser, out: List[Effect] }

pure def closes(out: List[Effect], tab: int): bool = out.some(e => match e { | Close(c) => c.tab == tab | _ => false })
pure def halts(out: List[Effect], tab: int): bool = out.some(e => match e { | Halt(h) => h.driven == tab | _ => false })

pure val maxTabs = 8

pure def launch(issued: int, kept: Set[int], ticket: int, write: int): Browser = {
  open: Set(issued + 1), privates: Set(), selected: issued + 1, issued: issued + 1, native: Set(),
  kept: kept, restore: { ...R::unread, ticket: ticket }, hydrated: false, untouched: true,
  stale: false, writing: false, write: write, carried: Set(), began: 0, failures: 0, retryAt: 0,
  erasing: Kept, agent: 0, layer: Uncovered,
}

pure val initial: Browser = launch(0, Set(), 0, 0)

pure def normal(s: Browser): Set[int] = s.open.exclude(s.privates)
pure def kindOf(s: Browser, tab: int): Kind = if (s.privates.contains(tab)) Private else Normal
pure def steady(s: Browser): bool = s.restore.status != R::Loading and s.erasing != Running
```

### What the simulator tries

```quint
pure val tabValues = Set(1, 2, 3, 4, 5)
pure val insteadValues = tabValues
pure val openerValues = tabValues
pure val shownValues = tabValues
pure val ticketValues = Set(1, 2)
pure val nowValues = Set(0, 3, 70)
pure val weight_openTab = 4
pure val weight_askRestore = 4
pure val weight_restored = 4
```

### A new tab, normal or private, opens on top while fewer than eight are open

Not while the saved session is being read or browsing data is being
cleared.

```quint
pure def canOpenTab(s: Browser, kind: Kind): bool = steady(s) and s.open.size() < maxTabs

pure def openTab(s: Browser, kind: Kind): Browser =
  val tab = s.issued + 1
  { ...s, open: s.open.union(Set(tab)), privates: if (kind == Private) s.privates.union(Set(tab)) else s.privates,
    selected: tab, issued: tab, untouched: false, stale: s.stale or kind == Normal, layer: Address }
```

### Picking another open tab shows it and uncovers the page

```quint
pure def canPick(s: Browser, tab: int): bool = steady(s) and s.open.contains(tab) and tab != s.selected

pure def pick(s: Browser, tab: int): Browser =
  { ...s, selected: tab, untouched: false, stale: s.stale or not(s.privates.contains(tab)), layer: Uncovered }
```

### Closing a tab closes its native tab, shows another open tab if it was the one shown, and leaves one new tab when it was the last

A tab the agent was driving is given up with it.

```quint
pure def canCloseTab(s: Browser, tab: int, instead: int): bool =
  steady(s) and s.open.contains(tab) and (s.open.size() == 1 or (s.open.contains(instead) and instead != tab))

pure def closeTab(s: Browser, tab: int, instead: int): Step =
  val alone = s.open.size() == 1
  val fresh = s.issued + 1
  val closed = {
    ...s,
    open: if (alone) Set(fresh) else s.open.exclude(Set(tab)),
    privates: s.privates.exclude(Set(tab)),
    selected: if (alone) fresh else if (s.selected == tab) instead else s.selected,
    issued: if (alone) fresh else s.issued,
    native: s.native.exclude(Set(tab)),
    agent: if (s.agent == tab) 0 else s.agent,
    untouched: false, stale: s.stale or not(s.privates.contains(tab)),
  }
  { state: closed, out: (if (s.native.contains(tab)) List(Close({ tab: tab })) else List())
      .concat(if (s.agent == tab) List(Halt({ driven: tab })) else List()) }
```

### A tab gets its native tab when it is the one shown and loads a page, and loses it if Android cannot make one

```quint
pure def canLoad(s: Browser, tab: int): bool =
  steady(s) and tab == s.selected and not(s.native.contains(tab))

pure def load(s: Browser, tab: int): Step =
  { state: { ...s, native: s.native.union(Set(tab)), untouched: false }, out: List(Create({ tab: tab, kind: kindOf(s, tab) })) }

pure def canNativeLost(s: Browser, tab: int): bool = s.native.contains(tab)

pure def nativeLost(s: Browser, tab: int): Step =
  { state: { ...s, native: s.native.exclude(Set(tab)), agent: if (s.agent == tab) 0 else s.agent },
    out: if (s.agent == tab) List(Halt({ driven: tab })) else List() }
```

### A tab a page opens is as private as the page, is shown, and is closed again when eight are open or the tabs are not settled

```quint
pure def canPopup(s: Browser, opener: int): bool = s.native.contains(opener)

pure def popup(s: Browser, opener: int): Step =
  val tab = s.issued + 1
  if (s.open.size() >= maxTabs or not(steady(s))) { state: { ...s, issued: tab }, out: List(Close({ tab: tab })) }
  else {
    state: { ...s, open: s.open.union(Set(tab)), native: s.native.union(Set(tab)),
      privates: if (s.privates.contains(opener)) s.privates.union(Set(tab)) else s.privates,
      selected: tab, issued: tab, untouched: false, stale: s.stale or not(s.privates.contains(opener)), layer: Uncovered },
    out: List(),
  }
```

### One layer at a time covers the page, and Back uncovers it

The address being edited with its suggestions, the tab switcher, the menu
or the library. The find bar, page history and leaving the Browser come
after, in [Address](./address.md) and the [Shell](../shell/).

```quint
pure def canCover(s: Browser, layer: Layer): bool = layer != Uncovered and layer != s.layer

pure def cover(s: Browser, layer: Layer): Browser = { ...s, layer: layer }

pure def canUncover(s: Browser): bool = s.layer != Uncovered

pure def uncover(s: Browser): Browser = { ...s, layer: Uncovered }

pure def pageShown(s: Browser): bool = s.layer == Uncovered and s.native.contains(s.selected) and steady(s)
```

### Between one and eight tabs are open, and the one shown is among them

```quint
pure def alwaysTabsAreBounded(s: Browser): bool =
  s.open.size() >= 1 and s.open.size() <= maxTabs and s.open.contains(s.selected)
```

### Only open tabs are private, and only open tabs have a native tab

So no native tab is left without an owner.

```quint
pure def alwaysEveryNativeTabHasAnOwner(s: Browser): bool =
  s.native.subseteq(s.open) and s.privates.subseteq(s.open)
```

### A tab's number is never used again

```quint
pure def alwaysTabNumbersAreNeverReused(s: Browser): bool =
  s.open.forall(tab => tab <= s.issued) and s.kept.forall(tab => tab <= s.issued) and s.carried.forall(tab => tab <= s.issued)

pure def stepANumberNeverGoesBack(before: Browser, via: str, after: Browser): bool = after.issued >= before.issued
```

### A native tab whose tab stops being open is closed

Except where Android ends them all itself: a restart, and clearing all
browsing data.

```quint
pure def stepNoNativeTabIsLeftBehind(before: Browser, via: str, after: Browser, out: List[Effect]): bool =
  via == "restart" or via == "erased" or
    before.native.forall(tab => after.open.contains(tab) or closes(out, tab))
```

### A page's new tab that cannot stay is closed at once

```quint
pure def stepARefusedPopupIsClosed(before: Browser, via: str, after: Browser, out: List[Effect]): bool =
  (via == "popup" and after.open.size() == before.open.size()) implies closes(out, after.issued)
```

### Eight tabs can be open, and a private tab beside a normal one

```quint
pure def sometimesEveryTabIsOpen(s: Browser): bool = s.open.size() == maxTabs

pure def sometimesAPrivateTabBesideANormalOne(s: Browser): bool =
  s.privates.size() > 0 and normal(s).size() > 0 and s.native.size() > 1
```

## Story: Keep my tabs through a restart

> As the owner, I want my normal tabs back after the phone restarts, and
> my private tabs gone.

### A launch reads the saved session, and may ask again after a failed read

```quint
pure def canAskRestore(s: Browser): bool =
  not(s.hydrated) and s.erasing == Kept and (s.restore.status == R::Idle or s.restore.status == R::Failed)

pure def askRestore(s: Browser): Step =
  val asked = R::ask(s.restore)
  { state: { ...s, restore: asked }, out: List(Restore({ ticket: asked.ticket })) }
```

### The saved tabs replace an untouched launch tab, or join the open tabs when they all fit

The tab shown after a restore is one of the saved tabs. After a failed
read the owner browses unsaved; a later read that finds more saved tabs
than fit beside the open ones leaves the saved session unread.

```quint
pure def canRestored(s: Browser, ticket: int, shown: int): bool =
  R::canAnswer(s.restore, ticket) and (s.kept.size() == 0 or s.kept.contains(shown))

pure def restored(s: Browser, ticket: int, ok: bool, shown: int): Browser =
  val fits = s.untouched or s.open.size() + s.kept.size() <= maxTabs
  val read = { ...s, restore: R::answer(s.restore, ok and fits) }
  if (not(ok and fits)) read
  else if (s.kept.size() == 0) { ...read, hydrated: true }
  else if (s.untouched) { ...read, hydrated: true, open: s.kept, selected: shown }
  else { ...read, hydrated: true, open: s.open.union(s.kept), stale: true }
```

### A restart ends every private tab and every native tab, and starts from one new tab

A write that had not landed is lost with the process. Reads and writes keep counting, so an answer to one asked before the restart is refused.

```quint
pure def restart(s: Browser): Browser = launch(s.issued, s.kept, s.restore.ticket, s.write)

pure def stepARestartEndsPrivateTabs(before: Browser, via: str, after: Browser): bool =
  via == "restart" implies (after.privates.size() == 0 and after.native.size() == 0 and after.open.size() == 1)
```

### Tabs change only once the saved session has been read or its read has failed

So nothing the owner does can come before the saved tabs.

```quint
pure def stepTabsWaitForTheSavedSession(before: Browser, via: str, after: Browser): bool =
  (before.restore.status == R::Loading and via != "restored" and via != "restart") implies
    (after.open.subseteq(before.open) and before.open.subseteq(after.open) and after.selected == before.selected)
```

### A launch nobody has touched has no private tab, no native tab and no agent

```quint
pure def alwaysAnUntouchedLaunchIsBare(s: Browser): bool =
  s.untouched implies (s.privates.size() == 0 and s.native.size() == 0 and s.agent == 0)
```

### Restored tabs wait without a native tab until they are shown

```quint
pure def sometimesRestoredTabsWait(s: Browser): bool =
  s.hydrated and s.open.size() > 1 and s.native.size() == 0 and s.untouched

pure def sometimesBrowsingUnsaved(s: Browser): bool =
  not(s.hydrated) and s.restore.status == R::Failed and s.open.size() > 1
```

## Story: Save the session

> As the owner, I want my tabs saved as I go, without Alpha hammering the
> phone when a save fails.

### A normal tab whose page changes makes the saved session stale

A private tab never does.

```quint
pure def canTouch(s: Browser, tab: int): bool = s.open.contains(tab) and not(s.privates.contains(tab))

pure def touch(s: Browser, tab: int): Browser = { ...s, stale: true }
```

### A stale session is written once it has been read, one write at a time, and never while browsing data is being cleared

The write carries the normal tabs only. After a failed write the next one
waits.

```quint
pure def canSave(s: Browser, now: int): bool =
  s.stale and s.hydrated and not(s.writing) and s.erasing != Running and now >= s.retryAt

pure def save(s: Browser, now: int): Step =
  { state: { ...s, stale: false, writing: true, write: s.write + 1, carried: normal(s), began: now },
    out: List(Save({ write: s.write + 1 })) }
```

### A write that lands becomes the saved session, and one that fails waits longer each time, up to a minute

```quint
pure def backoff(failures: int): int =
  if (failures <= 1) 2 else if (failures == 2) 4 else if (failures == 3) 8
  else if (failures == 4) 16 else if (failures == 5) 32 else 60

pure def canSaved(s: Browser, ticket: int): bool = s.writing and ticket == s.write

pure def saved(s: Browser, ticket: int, ok: bool, now: int): Browser =
  if (ok) { ...s, writing: false, kept: s.carried, failures: 0, retryAt: 0 }
  else { ...s, writing: false, stale: true, failures: if (s.failures < 6) s.failures + 1 else 6, retryAt: now + backoff(s.failures + 1) }

pure def lawTheWaitGrowsAndStopsAtAMinute(failures: int): bool =
  backoff(failures) <= backoff(failures + 1) and backoff(failures) >= 2 and backoff(failures) <= 60
```

### A private tab is never in the saved session, nor in a write

```quint
pure def alwaysAPrivateTabIsNeverSaved(s: Browser): bool =
  s.privates.forall(tab => not(s.kept.contains(tab)) and not(s.carried.contains(tab)))
```

### Nothing is written before the saved session has been read, nor while browsing data is being cleared

```quint
pure def alwaysWritesWaitForTheRead(s: Browser): bool =
  s.writing implies (s.hydrated and s.erasing != Running)
```

### A saved session that has not been read is never written over

```quint
pure def stepAnUnreadSessionIsNeverOverwritten(before: Browser, via: str, after: Browser): bool =
  (not(before.hydrated) and via != "erased") implies (after.kept.subseteq(before.kept) and before.kept.subseteq(after.kept))
```

### One write is in flight at a time

```quint
pure def stepOneWriteAtATime(before: Browser, via: str, after: Browser, out: List[Effect]): bool =
  out.every(e => match e { | Save(w) => via == "save" and not(before.writing) and w.write == after.write | _ => true })
    and after.write >= before.write
```

### A write after a failure started no sooner than its wait allowed

```quint
pure def alwaysAFailedSaveWaits(s: Browser): bool =
  (s.writing implies s.began >= s.retryAt) and s.failures >= 0 and s.failures <= 6
```

### The saved session holds no more tabs than can be open

```quint
pure def alwaysTheSavedSessionFits(s: Browser): bool =
  s.kept.size() <= maxTabs and s.carried.size() <= maxTabs
```

### A session can be saved, and a failed save can be waiting

```quint
pure def sometimesTabsAreSaved(s: Browser): bool = s.kept.size() > 1 and not(s.stale)

pure def sometimesAFailedSaveWaits(s: Browser): bool = s.failures > 1 and s.stale and not(s.writing)
```

## Story: Clear all browsing data

> As the owner, I want to clear everything the Browser kept, after
> confirming, and to keep my private tabs open.

### Clearing is asked for from the menu, and confirmed or cancelled

Not while the saved session is being read or a write is in flight.

```quint
pure def canAskErase(s: Browser): bool =
  s.erasing == Kept and s.restore.status != R::Loading and not(s.writing)

pure def askErase(s: Browser): Browser = { ...s, erasing: Asked, layer: Uncovered }

pure def canCancelErase(s: Browser): bool = s.erasing == Asked

pure def cancelErase(s: Browser): Browser = { ...s, erasing: Kept }

pure def canConfirmErase(s: Browser): bool =
  s.erasing == Asked and s.restore.status != R::Loading and not(s.writing)

pure def confirmErase(s: Browser): Step = { state: { ...s, erasing: Running }, out: List(Erase) }
```

### Cleared data takes every normal tab and the saved session with it, and keeps the private tabs

If the tab shown was a normal one, a new tab is shown in its place. The
agent's tab goes with the rest. A clearing that fails changes nothing.

```quint
pure def canErased(s: Browser): bool = s.erasing == Running

pure def erased(s: Browser, ok: bool): Step =
  val stays = s.privates.contains(s.selected)
  val fresh = s.issued + 1
  if (not(ok)) { state: { ...s, erasing: Kept }, out: List() }
  else {
    state: { ...s, erasing: Kept, kept: Set(), carried: Set(), hydrated: true, stale: false, agent: 0,
      open: if (stays) s.open.intersect(s.privates) else s.open.intersect(s.privates).union(Set(fresh)), issued: if (stays) s.issued else fresh,
      selected: if (stays) s.selected else fresh,
      native: s.native.intersect(s.privates), untouched: false },
    out: if (s.agent != 0) List(Halt({ driven: s.agent })) else List(),
  }
```

### Clearing waits for the writer, and the saved session is not read while clearing is asked for or under way

```quint
pure def alwaysClearingWaitsForTheWriter(s: Browser): bool =
  (s.erasing == Running implies not(s.writing)) and (s.restore.status == R::Loading implies s.erasing == Kept)
```

### Clearing ends

```quint
pure def leadsToClearingEnds(s: Browser, later: Browser): bool = s.erasing == Running implies later.erasing != Running

pure val fair_erased = "weak"
```

### Private tabs can outlive a clearing

```quint
pure def sometimesPrivateTabsOutliveAClearing(s: Browser): bool =
  s.privates.size() > 0 and normal(s).size() == 0 and s.hydrated and s.kept.size() == 0
```

## Story: Let the agent open a page

> As the owner, I want the agent to open a page I approved in a tab of its
> own, and to take that tab back whenever I like.

### The agent opens only an HTTPS address with no user name or password in it, in a new normal tab, one at a time

The approval comes from the approvals area. The tab gets its native tab at
once and does not take the place of the tab the owner is on.

```quint
pure def canAgentOpen(s: Browser, secure: bool, userInfo: bool): bool =
  secure and not(userInfo) and steady(s) and s.agent == 0 and s.open.size() < maxTabs

pure def agentOpen(s: Browser, secure: bool, userInfo: bool): Step =
  val tab = s.issued + 1
  { state: { ...s, open: s.open.union(Set(tab)), native: s.native.union(Set(tab)), issued: tab, agent: tab, untouched: false, stale: true },
    out: List(Create({ tab: tab, kind: Normal })) }
```

### "Stop and take over" stops the agent and gives its tab to the owner

```quint
pure def canTakeOver(s: Browser): bool = s.agent != 0

pure def takeOver(s: Browser): Step = { state: { ...s, agent: 0 }, out: List(Halt({ driven: s.agent })) }
```

### The agent gives its tab up when it is done

```quint
pure def canAgentDone(s: Browser): bool = s.agent != 0

pure def agentDone(s: Browser): Browser = { ...s, agent: 0 }
```

### The agent drives only an open normal tab that has a native tab

```quint
pure def alwaysTheAgentDrivesAnOpenNormalTab(s: Browser): bool =
  s.agent != 0 implies (s.native.contains(s.agent) and not(s.privates.contains(s.agent)))
```

### The agent's page never takes the owner's place, and the agent is told whenever its tab is taken away

```quint
pure def stepTheAgentNeverTakesTheOwnersPlace(before: Browser, via: str, after: Browser, out: List[Effect]): bool =
  (via == "agentOpen" implies after.selected == before.selected) and
    ((before.agent != 0 and after.agent == 0 and via != "agentDone" and via != "restart") implies halts(out, before.agent))
```

### The agent can be driving a tab the owner is not on

```quint
pure def sometimesTheAgentDrivesAnotherTab(s: Browser): bool = s.agent != 0 and s.agent != s.selected
```
