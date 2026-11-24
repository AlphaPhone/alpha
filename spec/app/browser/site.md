# Site

What a website may use and keep: the camera, the microphone and location
it asks for, the sign-in a site asks for, and the data it keeps. Normal
tabs share one profile, which remembers the owner's answer for each site;
private tabs remember nothing. Which tab is shown comes from the
[Browser](./index.md), and which page a tab holds from its
[page](./address.md). Downloads are in [Downloads](./downloads.md).

## Story: Let a site use the camera, microphone or location

> As the owner, I want a site to ask me before it uses my camera,
> microphone or location, only while I am looking at it, and to remember
> my answer in normal tabs.

### The Browser's site state holds the answers remembered for each site, the tab shown, and the one question being asked

A question is the site's own, Android's permission dialog, or a sign-in. It
belongs to the tab, page and site that asked.

```quint
type Kind = Normal | Private
type Want = Camera | Microphone | Location
type Decision = Unset | Allowed | Denied
type Answer = { known: bool, allow: bool }
type Prompt = Quiet | Asking | Android | SignIn
type Effect =
  | AskAndroid({ want: Want })
  | Grant({ page: int, want: Want })
  | Refuse({ page: int })
  | Authenticate({ page: int, user: str, password: SecretSitePassword })
  | Clear({ ticket: int })
type Site = {
  decisions: int -> Answer, shown: int,
  prompt: Prompt, tab: int, page: int, origin: int, kind: Kind, want: Want, stale: bool,
  tries: int, blocked: bool, clearing: bool, clear: int, clearedOrigin: int,
}
type Step = { state: Site, out: List[Effect] }

pure val initial: Site = {
  decisions: Map(), shown: 0,
  prompt: Quiet, tab: 0, page: 0, origin: 0, kind: Normal, want: Camera, stale: false,
  tries: 0, blocked: false, clearing: false, clear: 0, clearedOrigin: 0,
}

pure def decision(s: Site, origin: int): Decision =
  val a = if (s.decisions.keys().contains(origin)) s.decisions.get(origin) else { known: false, allow: false }
  if (not(a.known)) Unset else if (a.allow) Allowed else Denied
```

### What the simulator tries

```quint
pure val tabValues = Set(1, 2)
pure val pageValues = Set(1, 2)
pure val originValues = Set(1, 2)
pure val ticketValues = Set(1, 2)
```

### The tab shown in the foreground is told to the site state, and a site's question or a sign-in for another tab is dropped

Android's own dialog stays: its answer still counts for the page that
asked.

```quint
pure def canShow(s: Site, tab: int): bool = tab != s.shown

pure def show(s: Site, tab: int): Step =
  val drop = (s.prompt == Asking or s.prompt == SignIn) and s.tab != tab
  { state: { ...s, shown: tab, prompt: if (drop) Quiet else s.prompt }, out: if (drop) List(Refuse({ page: s.page })) else List() }
```

### A site asks only from the tab shown, one question at a time; a remembered no is answered at once, a remembered yes goes straight to Android, and anything else asks the owner

A private tab always asks.

```quint
pure def canRequested(s: Site, tab: int, page: int, origin: int, kind: Kind, want: Want): bool =
  s.prompt == Quiet and tab == s.shown and tab != 0

pure def requested(s: Site, tab: int, page: int, origin: int, kind: Kind, want: Want): Step =
  val known = if (kind == Normal) decision(s, origin) else Unset
  val asked = { ...s, tab: tab, page: page, origin: origin, kind: kind, want: want, stale: false, blocked: false }
  if (known == Denied) { state: asked, out: List(Refuse({ page: page })) }
  else if (known == Allowed) { state: { ...asked, prompt: Android }, out: List(AskAndroid({ want: want })) }
  else { state: { ...asked, prompt: Asking }, out: List() }
```

### The owner's answer goes to Android when it is yes, refuses the site when it is no, and is remembered only in a normal tab

```quint
pure def canDecide(s: Site, allow: bool): bool = s.prompt == Asking

pure def decide(s: Site, allow: bool): Step =
  val kept = if (s.kind == Normal) s.decisions.put(s.origin, { known: true, allow: allow }) else s.decisions
  if (allow) { state: { ...s, decisions: kept, prompt: Android }, out: List(AskAndroid({ want: s.want })) }
  else { state: { ...s, decisions: kept, prompt: Quiet }, out: List(Refuse({ page: s.page })) }
```

### What Android answers reaches the page only if the page that asked is still there

```quint
pure def canAndroidAnswered(s: Site, granted: bool): bool = s.prompt == Android

pure def androidAnswered(s: Site, granted: bool): Step =
  { state: { ...s, prompt: Quiet }, out: if (granted and not(s.stale)) List(Grant({ page: s.page, want: s.want })) else List(Refuse({ page: s.page })) }
```

### A tab that moves on to another page or closes takes its question with it

A question the owner was asked is dropped; Android's dialog stays, and its
answer no longer counts.

```quint
pure def movedOn(s: Site, tab: int): Site =
  if (tab != s.tab) s
  else if (s.prompt == Android) { ...s, stale: true }
  else { ...s, prompt: Quiet, tries: 0 }
```

### A site's question or a sign-in is shown only on the tab shown in the foreground

```quint
pure def alwaysAQuestionIsForTheShownTab(s: Site): bool =
  (s.prompt == Asking or s.prompt == SignIn) implies (s.tab == s.shown and s.shown != 0)
```

### Only a normal tab's answer is remembered, and only the owner's answer, a clearing or clearing everything changes what is remembered

```quint
pure def stepAPrivateTabRemembersNothing(before: Site, via: str, after: Site): bool =
  after.decisions != before.decisions implies
    ((via == "decide" and before.kind == Normal) or via == "cleared" or via == "wiped")
```

### A site gets the camera, microphone or location only after Android allowed it, for the page that asked

```quint
pure def stepAGrantIsForThePageThatAsked(before: Site, via: str, after: Site, out: List[Effect]): bool =
  out.every(e => match e {
    | Grant(g) => via == "androidAnswered" and before.prompt == Android and not(before.stale) and g.page == before.page
    | _ => true
  })
```

### A site the owner said no to is not asked about again

```quint
pure def lawANoIsRemembered(origin: int, want: Want): bool =
  val s = decide({ ...initial, shown: 1, prompt: Asking, tab: 1, page: 1, origin: origin, want: want }, false).state
  requested(s, 1, 2, origin, Normal, want).state.prompt == Quiet
```

### Android's dialog can still be open after the owner switched tabs, and a yes can be remembered

```quint
pure def sometimesAndroidOverAnotherTab(s: Site): bool = s.prompt == Android and s.tab != s.shown

pure def sometimesAYesRemembered(s: Site): bool = s.decisions.keys().contains(1) and decision(s, 1) == Allowed and s.prompt == Quiet
```

## Story: Sign in to a site

> As the owner, I want to give a site my user name and password when it
> asks over a secure connection, and not be asked endlessly.

### A sign-in is asked only by a secure page of the site shown, at most three times for a page; anything else is blocked and said so

The password typed goes to the site and is never kept.

```quint
type SecretSitePassword = str

pure val maxTries = 3

pure def canChallenged(s: Site, tab: int, page: int, secureSameHost: bool): bool =
  s.prompt == Quiet and tab == s.shown and tab != 0

pure def challenged(s: Site, tab: int, page: int, secureSameHost: bool): Step =
  val tries = if (tab == s.tab and page == s.page) s.tries else 0
  if (not(secureSameHost) or tries >= maxTries) { state: { ...s, blocked: true }, out: List(Refuse({ page: page })) }
  else { state: { ...s, prompt: SignIn, tab: tab, page: page, tries: tries + 1, blocked: false }, out: List() }

pure def canSignIn(s: Site, user: str, password: SecretSitePassword): bool = s.prompt == SignIn

pure def signIn(s: Site, user: str, password: SecretSitePassword): Step =
  { state: { ...s, prompt: Quiet }, out: List(Authenticate({ page: s.page, user: user, password: password })) }

pure def canCancelSignIn(s: Site): bool = s.prompt == SignIn

pure def cancelSignIn(s: Site): Step = { state: { ...s, prompt: Quiet }, out: List(Refuse({ page: s.page })) }
```

### A page is asked to sign in at most three times

```quint
pure def alwaysSignInIsBounded(s: Site): bool = s.tries >= 0 and s.tries <= maxTries
```

### A sign-in is sent only from the sign-in the owner was shown

```quint
pure def stepASignInIsOnlyWhatWasAsked(before: Site, via: str, after: Site, out: List[Effect]): bool =
  out.every(e => match e { | Authenticate(a) => via == "signIn" and before.prompt == SignIn and a.page == before.page | _ => true })
```

### A sign-in can be blocked, and asked for

```quint
pure def sometimesSignInAsked(s: Site): bool = s.prompt == SignIn and s.tries > 1

pure def sometimesSignInBlocked(s: Site): bool = s.blocked and s.tries == maxTries
```

## Story: Clear a site's data

> As the owner, I want to clear what the site I am on keeps: its cookies,
> its stored data and my answers to it.

### Clearing a site's data needs a loaded site, and runs one at a time

```quint
pure def canClearSite(s: Site, origin: int, loaded: bool): bool = loaded and not(s.clearing) and origin != 0

pure def clearSite(s: Site, origin: int, loaded: bool): Step =
  { state: { ...s, clearing: true, clear: s.clear + 1, clearedOrigin: origin }, out: List(Clear({ ticket: s.clear + 1 })) }
```

### Cleared data forgets the answers given to that site; a clearing that fails forgets nothing

```quint
pure def canCleared(s: Site, ticket: int): bool = s.clearing and ticket == s.clear

pure def cleared(s: Site, ticket: int, ok: bool): Site =
  { ...s, clearing: false, decisions: if (ok) s.decisions.put(s.clearedOrigin, { known: false, allow: false }) else s.decisions }
```

### Clearing all browsing data forgets every answer and drops the question being asked

```quint
pure def wiped(s: Site): Site = { ...s, decisions: Map(), prompt: if (s.prompt == Android) Android else Quiet, stale: true }
```

### A site's answers can be forgotten

```quint
pure def sometimesForgotten(s: Site): bool = s.decisions.keys().contains(1) and decision(s, 1) == Unset
```
