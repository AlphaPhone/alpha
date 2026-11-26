# Site

Clearing what a website keeps: its cookies and stored data. Which tab is shown
comes from the [Browser](./index.md), and which page a tab holds from its
[page](./address.md).

## Story: Clear a site's data

> As the owner, I want to clear what the site I am on keeps: its cookies
> and its stored data.

### Clearing a site's data needs a loaded site, and runs one at a time

The confirmation binds the loaded page and its navigation. If the page leaves
or reloads before the clearing begins, the confirmation sends no clearing.

```quint
type Effect = Clear({ ticket: int })
type Site = { clearing: bool, clear: int, clearedOrigin: int, lastCleared: int }
type Step = { state: Site, out: List[Effect] }

pure val initial: Site = { clearing: false, clear: 0, clearedOrigin: 0, lastCleared: 0 }

pure val originValues = Set(1, 2)
pure val ticketValues = Set(1, 2)

pure def canClearSite(s: Site, origin: int, loaded: bool): bool = loaded and not(s.clearing) and origin != 0

pure def clearSite(s: Site, origin: int, loaded: bool): Step =
  { state: { ...s, clearing: true, clear: s.clear + 1, clearedOrigin: origin }, out: List(Clear({ ticket: s.clear + 1 })) }
```

### Cleared data forgets the answers given to that site; a clearing that fails forgets nothing

```quint
pure def canCleared(s: Site, ticket: int): bool = s.clearing and ticket == s.clear

pure def cleared(s: Site, ticket: int, ok: bool): Site =
  { ...s, clearing: false, lastCleared: if (ok) s.clearedOrigin else s.lastCleared }
```

### Clearing all browsing data forgets every remembered site clearing

```quint
pure def wiped(s: Site): Site = { ...s, lastCleared: 0 }
```

### A clearing runs for the ticket it issued, and a site can be cleared

```quint
pure def alwaysClearCountIsNonNegative(s: Site): bool = s.clear >= 0

pure def stepClearMatchesTicket(before: Site, via: str, after: Site, out: List[Effect]): bool =
  out.every(e => match e { | Clear(c) => via == "clearSite" and not(before.clearing) and c.ticket == after.clear })

pure def sometimesCleared(s: Site): bool = not(s.clearing) and s.lastCleared > 0
```
