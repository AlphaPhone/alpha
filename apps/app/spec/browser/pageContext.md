# The Browser page with a message

When the owner talks to Alpha while Browser shows a public page, the message carries that page
beside its observation, as the turn context's `browserPage`: the tab id and revision of the observation's
selected `browser-tab`, the address, the title, when it was read, up to 6,000 characters of visible
text, the owner's selection and up to 20 links, or only the address and title with the reason the
rest was withheld. On Android the native tab host reads it (`AlphaBrowser.pageContext`) with Alpha's
page-context script in the tab's isolated world, which reads no field values, editable regions,
frames or storage, withholds a page with a visible password, one-time-code or card field, masks long
digit runs, keeps the head, tail and on-screen part of long text, and offers only public HTTPS links
that do not sign in or act when opened. The browser build fetches the public address again without
credentials. The page is web content the owner is looking at: the agent shows it once, for that
message only, inside the untrusted-content envelope, and it never grants an action. The turn context
around it is the assistant's ([context](../assistant/context.md)); Settings → Privacy → Browser page
for Alpha, on by default like Location for Alpha, is Settings'. These rules state what Browser must
do for one message.

## Story: Let Alpha see the page I have open

> As the owner, I want a message I send while Browser shows a page to carry that page, so that
> "summarize this page" or "what does it say about prices" works without copying anything, and I
> want it never to share a private tab, a sign-in page or a page I have moved away from.

### A page is read only for a message observed on the page Browser shows now, a settled public HTTPS page of a normal tab, with Browser page for Alpha on and a peer that takes it

The observation must be the non-sensitive Browser view, and its selected `browser-tab` must be the
tab Browser shows on the unlocked phone, at the same revision. A message that fails any of these
reads nothing and waits for nothing. Preferences that cannot be read share no page.

```quint
type PageSetting = SettingOn | SettingOff | SettingUnreadable
pure val defaultSetting = SettingOn
pure def enabledBy(setting: PageSetting): bool = setting == SettingOn
pure def lawUnreadablePreferencesShareNoPage(setting: PageSetting): bool = setting == SettingUnreadable implies not(enabledBy(setting))
type TurnFacts = {
  browserView: bool, sensitive: bool, shown: bool, sameTab: bool, sameRevision: bool,
  priv: bool, settled: bool, publicHttps: bool, enabled: bool, peerTakesIt: bool,
}
pure def pageShareable(shown: bool, priv: bool, resolved: bool, publicHttps: bool): bool = shown and not(priv) and resolved and publicHttps
pure def mayRead(f: TurnFacts): bool =
  f.browserView and not(f.sensitive) and f.sameTab and f.sameRevision and pageShareable(f.shown, f.priv, f.settled, f.publicHttps) and f.enabled and f.peerTakesIt
pure def lawAPrivateTabIsNeverRead(f: TurnFacts): bool = f.priv implies not(mayRead(f))
pure def lawAnotherPageIsNeverRead(f: TurnFacts): bool = not(f.sameTab and f.sameRevision) implies not(mayRead(f))
pure def lawASensitiveOrOtherScreenReadsNothing(f: TurnFacts): bool = (f.sensitive or not(f.browserView)) implies not(mayRead(f))
pure def lawTheSettingOffReadsNothing(f: TurnFacts): bool = not(f.enabled and f.peerTakesIt) implies not(mayRead(f))
pure def lawAnUnsettledOrInsecurePageIsNeverRead(f: TurnFacts): bool = not(f.settled and f.publicHttps) implies not(mayRead(f))
pure val readable: TurnFacts = {
  browserView: true, sensitive: false, shown: true, sameTab: true, sameRevision: true,
  priv: false, settled: true, publicHttps: true, enabled: true, peerTakesIt: true,
}
pure val fValues: Set[TurnFacts] = List(
  readable, { ...readable, priv: true }, { ...readable, sameRevision: false }, { ...readable, sameTab: false },
  { ...readable, sensitive: true }, { ...readable, browserView: false }, { ...readable, shown: false },
  { ...readable, settled: false }, { ...readable, publicHttps: false }, { ...readable, enabled: false },
  { ...readable, peerTakesIt: false },
).foldl(Set(), (acc, f) => acc.union(Set(f)))
```

### A message waits at most 1.2 seconds for its page, a refused, slow, changed or invalid read sends it without the page, and only the latest message's read counts

A read begins for each message; a message that may not read begins with nothing to wait for. The
answer counts only for the tab and revision the read began on, and only while that read is the
latest. The owner's setting is read again after the answer, with the page still the one Browser
shows, and only then is the page handed to the message. Cancelling the message withdraws its read.

```quint
type ReadStage = NoRead | Reading | Answered | Withdrawn | Delivered
type Withheld = NotWithheld | SensitivePage | Unreadable
type PageRead = { turn: int, stage: ReadStage, tab: str, revision: int, withheld: Withheld, page: bool, rechecked: bool }
pure val initial: PageRead = { turn: 0, stage: NoRead, tab: "", revision: -1, withheld: NotWithheld, page: false, rechecked: false }
pure val waitMs = 1200
pure def canBegin(r: PageRead, turn: int, tab: str, revision: int, allowed: bool): bool = turn > r.turn
pure def begin(r: PageRead, turn: int, tab: str, revision: int, allowed: bool): PageRead =
  { turn: turn, stage: if (allowed) Reading else NoRead, tab: tab, revision: revision, withheld: NotWithheld, page: false, rechecked: false }
pure def canAnswered(r: PageRead, turn: int, tab: str, revision: int, valid: bool, withheld: Withheld): bool = r.stage == Reading and turn == r.turn
pure def answered(r: PageRead, turn: int, tab: str, revision: int, valid: bool, withheld: Withheld): PageRead =
  if (valid and tab == r.tab and revision == r.revision) { ...r, stage: Answered, page: true, withheld: withheld }
  else { ...r, stage: Withdrawn, page: false }
pure def canTimedOut(r: PageRead, turn: int): bool = r.stage == Reading and turn == r.turn
pure def timedOut(r: PageRead, turn: int): PageRead = { ...r, stage: Withdrawn, page: false }
pure def canCancelled(r: PageRead, turn: int): bool = (r.stage == Reading or r.stage == Answered) and turn == r.turn
pure def cancelled(r: PageRead, turn: int): PageRead = { ...r, stage: Withdrawn, page: false }
pure def canRechecked(r: PageRead, turn: int, isOn: bool, present: bool): bool = r.stage == Answered and turn == r.turn and not(r.rechecked)
pure def rechecked(r: PageRead, turn: int, isOn: bool, present: bool): PageRead =
  if (isOn and present) { ...r, rechecked: true } else { ...r, stage: Withdrawn, page: false }
pure def canDelivered(r: PageRead, turn: int): bool = r.stage == Answered and turn == r.turn and r.rechecked
pure def delivered(r: PageRead, turn: int): PageRead = { ...r, stage: Delivered }
pure def alwaysOnlyAnAnsweredReadHoldsAPage(r: PageRead): bool = r.page iff (r.stage == Answered or r.stage == Delivered)
pure def alwaysADeliveredPageWasRecheckedAfterItsAnswer(r: PageRead): bool = r.stage == Delivered implies (r.rechecked and r.page)
pure def alwaysARecheckFollowsAnAnswer(r: PageRead): bool = r.rechecked implies (r.stage == Answered or r.stage == Delivered or r.stage == Withdrawn)
pure def stepALateAnswerNeverCounts(before: PageRead, via: str, after: PageRead): bool =
  (via == "answered" and before.stage != Reading) implies after == before
pure def sometimesAPageIsDelivered(r: PageRead): bool = r.stage == Delivered and r.withheld == NotWithheld
pure def sometimesAWithheldPageIsDelivered(r: PageRead): bool = r.stage == Delivered and r.withheld == SensitivePage
pure def sometimesAReadIsWithdrawn(r: PageRead): bool = r.stage == Withdrawn and r.turn > 0
pure val turnValues = Set(1, 2, 3)
pure val tabValues = Set("t1", "t2")
pure val revisionValues = Set(0, 1)
```

### A withheld page tells the agent only its address and title, and a sensitive page's address loses its query

A sensitive address (a sign-in, account or password page), a page with a credential field or
credential-like text withholds the page as sensitive; a page the host cannot read in isolation, a
slow script or a malformed result withholds it as unreadable. A read the contract below refuses is
sent as unreadable, with the address and title it would have had.

```quint
type Shared = { address: bool, query: bool, title: bool, text: bool, selection: bool, links: bool }
pure def sharedOf(w: Withheld): Shared = match w {
  | NotWithheld => { address: true, query: true, title: true, text: true, selection: true, links: true }
  | SensitivePage => { address: true, query: false, title: true, text: false, selection: false, links: false }
  | Unreadable => { address: true, query: true, title: true, text: false, selection: false, links: false }
}
pure def lawAWithheldPageCarriesNoContent(w: Withheld): bool = {
  val s = sharedOf(w)
  w != NotWithheld implies not(s.text or s.selection or s.links)
}
pure def lawASensitivePageKeepsNoQuery(w: Withheld): bool = w == SensitivePage implies not(sharedOf(w).query)
pure def lawEveryPageNamesItsAddressAndTitle(w: Withheld): bool = sharedOf(w).address and sharedOf(w).title
```

### The page is bounded and plain: HTTPS addresses without credentials or fragment, one-line title and link words, at most 6,000 characters of text and 16 KB in all

Page text and the selection keep line breaks and tabs; every other control character, and any
unpaired surrogate, refuses the page. Links have words, and their addresses follow the page's rule.

```quint
pure val textMax = 6000
pure val selectionMax = 1000
pure val titleMax = 300
pure val urlMax = 2048
pure val linksMax = 20
pure val linkTextMax = 120
pure val bytesMax = 16384
type PageSize = { text: int, selection: int, title: int, url: int, links: int, linkText: int, bytes: int }
pure def withinBounds(s: PageSize): bool =
  s.text <= textMax and s.selection <= selectionMax and s.title <= titleMax and s.url <= urlMax and
  s.links <= linksMax and s.linkText <= linkTextMax and s.bytes <= bytesMax
pure def lawLongerTextIsNeverSent(s: PageSize): bool = s.text > textMax implies not(withinBounds(s))
pure def lawMoreLinksAreNeverSent(s: PageSize): bool = s.links > linksMax implies not(withinBounds(s))
pure val fitting: PageSize = { text: 6000, selection: 0, title: 300, url: 2048, links: 20, linkText: 120, bytes: 16384 }
pure val sValues: Set[PageSize] = List(
  fitting, { ...fitting, text: 6001 }, { ...fitting, links: 21 }, { ...fitting, bytes: 16385 },
  { ...fitting, title: 301 }, { ...fitting, url: 2049 }, { ...fitting, selection: 1001 }, { ...fitting, linkText: 121 },
).foldl(Set(), (acc, x) => acc.union(Set(x)))
```

### The page goes only to a peer whose fresh status declares the Browser page, beside the observation of its own tab and revision

```quint
pure def sendsPage(held: bool, declared: bool, boundTab: bool, boundRevision: bool): bool = held and declared and boundTab and boundRevision
pure def lawAnUndeclaringPeerGetsNoPage(held: bool, boundTab: bool, boundRevision: bool): bool = not(sendsPage(held, false, boundTab, boundRevision))
pure def lawAnUnboundPageIsNeverSent(held: bool, declared: bool): bool = not(sendsPage(held, declared, false, true)) and not(sendsPage(held, declared, true, false))
```

## Story: Open a link of the page I asked about

> As the owner, I want "open the second story" to show me a card for that link of the page my
> message carried, and never to open an address the page wrote without my approval.

### An exact link of the page the latest message carried keeps its open card, and opens only after the owner approves it

An open whose address the owner typed may run without its card, as [the agent spec](./agent.md)
says. An open of a link the page gave, exactly as the page gave it, is offered as a card and never
runs directly. Any other address gets the notice instead of a card.

```quint
type OpenGround = OwnerTyped | PageLink | Ungrounded
pure def groundOf(typed: bool, pageLink: bool): OpenGround = if (typed) OwnerTyped else if (pageLink) PageLink else Ungrounded
pure def offersCard(g: OpenGround): bool = g != Ungrounded
pure def runs(g: OpenGround, reviewed: bool): bool = g == OwnerTyped or (g == PageLink and reviewed)
pure def lawAPageLinkNeverOpensUnreviewed(pageLink: bool): bool = not(runs(groundOf(false, pageLink), false))
pure def lawAnUngroundedOpenGetsNoCard(typed: bool, pageLink: bool): bool =
  not(typed or pageLink) implies not(offersCard(groundOf(typed, pageLink)))
pure def lawAnUngroundedOpenNeverRuns(reviewed: bool): bool = not(runs(Ungrounded, reviewed))
```

## Story: Know how my agent reads the page

> As the owner, I want the agent to read the page only the way I allowed, so that a request to read
> page text tells it where the page comes from instead of reading it.

### The agent has no separate page read: a page-text request is refused with where the page comes from, and only back, forward and reload are view commands

The refusal says that the open page comes with each message while Browser is on screen, unless
Browser page for Alpha is off, and that Ask about page shares a reviewed excerpt.

```quint
type Interaction = GetText | BrowserCommand | OtherInteraction
type InteractionAnswer = PageComesWithMessages | CommandHandled | NoCommandForView
pure def interactionAnswer(i: Interaction): InteractionAnswer = match i {
  | GetText => PageComesWithMessages
  | BrowserCommand => CommandHandled
  | OtherInteraction => NoCommandForView
}
pure def lawOnlyACommandIsHandled(i: Interaction): bool = (interactionAnswer(i) == CommandHandled) iff (i == BrowserCommand)
pure def lawGetTextNeverReadsThePage(i: Interaction): bool = i == GetText implies interactionAnswer(i) == PageComesWithMessages
```
