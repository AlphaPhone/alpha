# Instance

Android can start Alpha again while it is up: a press of HOME, the launcher
icon, a notification, the return from sign-in. There is one page that keeps
Alpha's state, and a start that lands elsewhere hands itself to that page
instead of building another. A page is known by its task: Android's Home
task or an ordinary one, which is fixed for the task's life, so a task
that is finished and started again is a new one.

## Story: Stay one Home

> As the owner, I want every way of opening Alpha to bring me to the same
> Alpha, and a press of HOME never to leave me with nothing.

### One page owns Alpha, in Android's Home task or in an ordinary one

Alpha counts the starts, those delivered to a page, the hand-offs its
owner has not answered and those lost with the page they were handed to,
whether handing off can still be trusted, and the newest hand-off Android
has yet to say it carried out.

```quint
import read as R from "../../kit/read"

type Owner = Nobody | InHome | InOrdinary
type Effect = DeliverHere({ home: bool }) | BuildAndDeliver({ home: bool }) | HandOff({ ticket: int })

type Instance = {
  owner: Owner, homePage: bool, ordinaryPage: bool, unanswered: int, trusted: bool,
  forward: R::Read, waitingHome: bool, starts: int, delivered: int, lost: int,
}

type Started = { state: Instance, out: List[Effect] }

pure val initial: Instance = {
  owner: Nobody, homePage: false, ordinaryPage: false, unanswered: 0, trusted: true,
  forward: R::unread, waitingHome: false, starts: 0, delivered: 0, lost: 0,
}

pure val maxUnanswered = 3

pure def hasPage(s: Instance, home: bool): bool = if (home) s.homePage else s.ordinaryPage
```

### A start reaches the page in its task, builds the first page, or hands itself to the owner

A HOME start lands in the Home task and every other start in an ordinary
one. A start that finds a page there is delivered to it. With no page
anywhere it builds one, which becomes the owner. Otherwise it asks Android
to bring the owner forward with its request and builds nothing, until the
owner has left two such requests unanswered: the third start then stops
trusting hand-offs and builds its own page, which becomes the owner, and
Android's answer to the hand-off before it no longer counts.

```quint
pure def built(home: bool, s: Instance): Instance =
  {
    ...s, owner: if (home) InHome else InOrdinary, homePage: s.homePage or home, ordinaryPage: s.ordinaryPage or not(home),
    forward: if (s.forward.status == R::Loading) R::answer(s.forward, false) else s.forward,
  }

pure def start(s: Instance, home: bool): Started =
  val asking = R::ask(s.forward)
  val counted = { ...s, starts: s.starts + 1 }
  if (hasPage(s, home)) { state: { ...counted, delivered: s.delivered + 1 }, out: List(DeliverHere({ home: home })) }
  else if (s.owner == Nobody) { state: { ...built(home, counted), delivered: s.delivered + 1 }, out: List(BuildAndDeliver({ home: home })) }
  else if (s.trusted and s.unanswered + 1 < maxUnanswered)
    { state: { ...counted, unanswered: s.unanswered + 1, forward: asking, waitingHome: home }, out: List(HandOff({ ticket: asking.ticket })) }
  else { state: { ...built(home, counted), trusted: false, delivered: s.delivered + 1 }, out: List(BuildAndDeliver({ home: home })) }
```

### When Android refuses to bring the owner forward, the start that asked builds its own page, and every start waiting on the owner is delivered to it

Android answers the newest hand-off only. A refusal ends trust in handing
off.

```quint
pure def canForwarded(s: Instance, ticket: int): bool = R::canAnswer(s.forward, ticket)

pure def forwarded(s: Instance, ticket: int, brought: bool): Started =
  if (brought) { state: { ...s, forward: R::answer(s.forward, true) }, out: List() }
  else {
    state: { ...built(s.waitingHome, s), trusted: false, delivered: s.delivered + s.unanswered, unanswered: 0 },
    out: List(BuildAndDeliver({ home: s.waitingHome })),
  }
```

### The owner coming to the front answers every hand-off, and so is delivered every start waiting on it

```quint
pure def canFront(s: Instance): bool = s.owner != Nobody and s.unanswered > 0

pure def front(s: Instance): Instance = { ...s, unanswered: 0, delivered: s.delivered + s.unanswered }
```

### When the owner's page goes, another page that is up owns Alpha, and the starts handed to it go with it

```quint
pure def canGone(s: Instance): bool = s.owner != Nobody

pure def gone(s: Instance): Instance =
  val dropped = { ...s, unanswered: 0, lost: s.lost + s.unanswered }
  if (s.owner == InHome) { ...dropped, homePage: false, owner: if (s.ordinaryPage) InOrdinary else Nobody }
  else { ...dropped, ordinaryPage: false, owner: if (s.homePage) InHome else Nobody }
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

### At most two hand-offs go unanswered

```quint
pure def alwaysUnansweredHandOffsAreBounded(s: Instance): bool =
  0 <= s.unanswered and s.unanswered < maxUnanswered
```

### A hand-off waits on Android only while handing off is trusted

```quint
pure def alwaysAWaitingHandOffIsTrusted(s: Instance): bool = s.forward.status == R::Loading implies s.trusted
```

### Every start reaches a page: the one in its task, one it builds there, or the trusted owner it is handed to

```quint
pure def stepEveryStartReachesAPage(before: Instance, via: str, after: Instance, out: List[Effect]): bool =
  out.every(e => match e {
    | DeliverHere(d) => via == "start" and hasPage(before, d.home) and hasPage(after, d.home)
    | BuildAndDeliver(b) => hasPage(after, b.home) and after.owner == (if (b.home) InHome else InOrdinary)
    | HandOff(h) => via == "start" and after.trusted and after.unanswered == before.unanswered + 1
        and after.homePage == before.homePage and after.ordinaryPage == before.ordinaryPage and h.ticket == after.forward.ticket
  })
    and (via == "start" implies out.length() == 1)
    and ((via == "forwarded" and not(after.trusted)) implies out.length() == 1)
```

### Every start is delivered once, waits on the owner, or went with the page it was handed to

```quint
pure def alwaysEveryStartIsDeliveredOnce(s: Instance): bool =
  s.starts == s.delivered + s.unanswered + s.lost and s.delivered >= 0 and s.lost >= 0
```

### A start handed off is lost only with the page it was handed to

```quint
pure def stepAHandOffIsLostOnlyWithItsPage(before: Instance, via: str, after: Instance): bool =
  after.lost >= before.lost and (after.lost > before.lost implies via == "gone")
```

### Every start handed off is answered in the end

Provided the owner comes to the front while it is up.

```quint
pure def leadsToEveryHandOffIsAnswered(s: Instance, later: Instance): bool = s.unanswered > 0 implies later.unanswered == 0

pure val fair_front = "weak"
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

### A refused hand-off builds a second page

```quint
pure def sometimesARefusalBuildsAPage(s: Instance): bool = s.homePage and s.ordinaryPage and s.forward.status == R::Failed and s.delivered >= 3
```

### An owner that never comes forward ends with a second page

```quint
pure def sometimesASecondPageIsBuilt(s: Instance): bool = s.homePage and s.ordinaryPage and s.unanswered == 2
```

### A start handed to a page that went can be lost

```quint
pure def sometimesAHandOffIsLost(s: Instance): bool = s.lost > 0
```

### Alpha can be left with no page and start again

```quint
pure def sometimesEveryPageIsGone(s: Instance): bool = s.owner == Nobody and not(s.trusted)
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
```
