# Instance

Android can start Alpha again while it is up: a press of HOME, the launcher
icon, a notification, the return from sign-in. There is one page that keeps
Alpha's state, and a start that lands elsewhere hands itself to that page
instead of building another.

## Story: Stay one Home

> As the owner, I want every way of opening Alpha to bring me to the same
> Alpha, and a press of HOME never to leave me with nothing.

### One page owns Alpha, in Android's Home task or in an ordinary one

Alpha counts the hand-offs its owner has not answered, and whether handing
off can still be trusted.

```quint
type Owner = Nobody | InHome | InOrdinary
type Effect = DeliverHere | BuildAndDeliver | HandOff

type Instance = { owner: Owner, homePage: bool, ordinaryPage: bool, unanswered: int, trusted: bool }

type Started = { state: Instance, out: List[Effect] }

pure val initial: Instance = { owner: Nobody, homePage: false, ordinaryPage: false, unanswered: 0, trusted: true }

pure val maxUnanswered = 3
```

### A start reaches the page in its task, builds the first page, or hands itself to the owner

A HOME start lands in the Home task and every other start in an ordinary
one. A start that finds a page there is delivered to it. With no page
anywhere it builds one, which becomes the owner. Otherwise it asks the
owner to come forward, passes its request on and builds nothing. When
Android refuses that, or the owner has left three such requests
unanswered, handing off is no longer trusted and the start builds its own
page, which becomes the owner.

```quint
pure def start(s: Instance, home: bool, brought: bool): Started =
  val there = if (home) s.homePage else s.ordinaryPage
  val asked = if (brought) s.unanswered + 1 else s.unanswered
  val built = { ...s, owner: if (home) InHome else InOrdinary, homePage: s.homePage or home, ordinaryPage: s.ordinaryPage or not(home) }
  if (there) { state: s, out: List(DeliverHere) }
  else if (s.owner == Nobody) { state: built, out: List(BuildAndDeliver) }
  else if (s.trusted) { state: { ...s, unanswered: asked, trusted: brought and asked < maxUnanswered }, out: List(HandOff) }
  else { state: built, out: List(BuildAndDeliver) }
```

### The owner coming to the front answers every hand-off

```quint
pure def canFront(s: Instance): bool = s.owner != Nobody and s.unanswered > 0

pure def front(s: Instance): Instance = { ...s, unanswered: 0 }
```

### When the owner's page goes, another page that is up owns Alpha

```quint
pure def canGone(s: Instance): bool = s.owner != Nobody

pure def gone(s: Instance): Instance =
  if (s.owner == InHome) { ...s, homePage: false, owner: if (s.ordinaryPage) InOrdinary else Nobody }
  else { ...s, ordinaryPage: false, owner: if (s.homePage) InHome else Nobody }
```

### There is one page as long as handing off is trusted

```quint
pure def alwaysOnePageWhileHandOffIsTrusted(s: Instance): bool =
  (s.homePage and s.ordinaryPage) implies not(s.trusted)
```

### The owner is a page that is up, and no page is up without an owner

```quint
pure def alwaysTheOwnerIsAPageThatIsUp(s: Instance): bool =
  (s.owner == InHome implies s.homePage) and (s.owner == InOrdinary implies s.ordinaryPage)
    and (s.owner == Nobody implies not(s.homePage or s.ordinaryPage))
```

### At most three hand-offs go unanswered, and the third ends the trust

```quint
pure def alwaysUnansweredHandOffsAreBounded(s: Instance): bool =
  0 <= s.unanswered and s.unanswered <= maxUnanswered and (s.unanswered == maxUnanswered implies not(s.trusted))
```

### Every start is delivered exactly once

```quint
pure def stepEveryStartIsDeliveredOnce(before: Instance, via: str, after: Instance, out: List[Effect]): bool =
  out.length() == (if (via == "start") 1 else 0)
```

### A start is handed off only to an owner that is still trusted, and builds nothing then

```quint
pure def stepAHandOffBuildsNothing(before: Instance, after: Instance, out: List[Effect]): bool =
  out.some(e => e == HandOff) implies (before.trusted and before.owner != Nobody
    and after.homePage == before.homePage and after.ordinaryPage == before.ordinaryPage)
```

### Trust in handing off does not come back while Alpha runs

```quint
pure def stepLostTrustStaysLost(before: Instance, after: Instance): bool =
  not(before.trusted) implies not(after.trusted)
```

### A hand-off can wait for the owner

```quint
pure def sometimesAHandOffWaits(s: Instance): bool = s.unanswered > 0 and s.trusted
```

### An owner that never comes forward ends with a second page

```quint
pure def sometimesASecondPageIsBuilt(s: Instance): bool = s.homePage and s.ordinaryPage
```

### Alpha can be left with no page and start again

```quint
pure def sometimesEveryPageIsGone(s: Instance): bool = s.owner == Nobody and not(s.trusted)
```
