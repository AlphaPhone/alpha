# Startup

How Alpha comes up: it reads where it is running, shows the surface that
fits, and keeps Home still behind the Alpha mark until the connection to
the resident agent has resolved. Home takes input only when nothing is over
it: not the mark, not sign-in, not the access walkthrough and not the
failure screen. The update hold at startup belongs to the update area and
sign-in to the account area; both are only told here.

- [Access](./access.md): the walkthrough that asks for each access
- [Recovery](./recovery.md): what happens when the page fails or is lost
- [Journal](./journal.md): the bounded record of failures
- [Instance](./instance.md): one Home page, however often Alpha is started

## Story: Come up knowing where Alpha runs

> As the owner, I want Alpha to find out what this phone is before it shows
> anything, and to start anyway when the phone will not say.

### Alpha knows whether it runs on a phone, reads the rest, and keeps what it was told

On a phone Alpha reads whether it is the launcher, whether this page is the
assistant surface, whether the phone is an Alpha image and admits Contacts,
and the phone's locale and clock. Until the first answer nothing is known
and the cautious answer stands for each.

```quint
import read as R from "../../kit/read"

type TimeStyle = ByLocale | TwelveHour | TwentyFourHour
type Origin = Gesture | WakeWord | PowerButton
type Effect = ReadFacts({ ticket: int }) | Admit({ image: bool, contacts: bool }) | Raise({ listening: bool }) | CloseSurface

type Boot = {
  phone: bool, facts: R::Read, known: bool,
  launcher: bool, assistant: bool, image: bool, contacts: bool, locale: str, hours: TimeStyle,
  waiting: bool, signingIn: bool,
  called: bool, origin: Origin, locked: bool, cold: bool, at: int, closed: bool,
}

type Booted = { state: Boot, out: List[Effect] }

pure val initial: Boot = {
  phone: false, facts: R::unread, known: false,
  launcher: false, assistant: false, image: false, contacts: false, locale: "", hours: ByLocale,
  waiting: true, signingIn: false,
  called: false, origin: Gesture, locked: true, cold: false, at: 0, closed: false,
}
```

### The page starts once, by asking the phone for its facts

```quint
pure def canStart(s: Boot): bool = s.facts.status == R::Idle

pure def start(s: Boot, phone: bool): Booted =
  val facts = R::ask(s.facts)
  { state: { ...s, phone: phone, facts: facts }, out: List(ReadFacts({ ticket: facts.ticket })) }
```

### The first answer decides the surface, and every answer says what the phone admits

Only a phone can be the launcher, the assistant surface or an Alpha image,
and only an image admits Contacts. What the phone admits is passed on to
the shell with each answer.

```quint
pure def canLearn(s: Boot, ticket: int): bool = R::canAnswer(s.facts, ticket)

pure def learn(s: Boot, ticket: int, launcher: bool, assistant: bool, image: bool, contacts: bool, locale: str, hours: TimeStyle): Booted =
  val onImage = if (s.known) s.image else s.phone and image
  val admitted = onImage and contacts
  {
    state: {
      ...s, facts: R::answer(s.facts, true), known: true,
      launcher: if (s.known) s.launcher else s.phone and launcher,
      assistant: if (s.known) s.assistant else s.phone and assistant,
      image: onImage, contacts: admitted, locale: locale, hours: hours,
    },
    out: List(Admit({ image: onImage, contacts: admitted })),
  }
```

### A read that fails still lets Alpha start, and admits nothing it did not hear

Alpha then keeps what it knew, or the cautious answers on the first read,
and Contacts is withdrawn until a read admits it again.

```quint
pure def canMiss(s: Boot, ticket: int): bool = R::canAnswer(s.facts, ticket)

pure def miss(s: Boot, ticket: int): Booted =
  { state: { ...s, facts: R::answer(s.facts, false), known: true, contacts: false }, out: List(Admit({ image: s.image, contacts: false })) }
```

### Coming back to the front reads the facts again

```quint
pure def canResume(s: Boot): bool = s.known

pure def resume(s: Boot): Booted =
  val facts = R::ask(s.facts)
  { state: { ...s, facts: facts }, out: List(ReadFacts({ ticket: facts.ticket })) }
```

### Only a phone is the launcher, the assistant surface or an Alpha image

```quint
pure def alwaysOnlyAPhoneIsLauncherAssistantOrImage(s: Boot): bool =
  (s.launcher or s.assistant or s.image) implies s.phone
```

### Contacts is admitted only on an Alpha image

```quint
pure def alwaysContactsNeedTheImage(s: Boot): bool = s.contacts implies s.image
```

### Nothing is taken as known before the first answer

```quint
pure def alwaysNothingIsKnownBeforeTheFirstAnswer(s: Boot): bool =
  s.known or not(s.launcher or s.assistant or s.image or s.contacts)
```

### Nothing is known before Alpha has asked

Discovered by the proof: without it, a page that had never asked could
already claim to be the launcher, and starting would then make a browser
the launcher.

```quint
pure def alwaysNothingIsKnownBeforeAsking(s: Boot): bool = s.facts.status == R::Idle implies not(s.known)
```

### Once decided, the surface does not change while the page lives

A later answer changes Contacts, the locale and the clock, never whether
this is a phone, the launcher, the assistant surface or an image.

```quint
pure def stepTheSurfaceIsDecidedOnce(before: Boot, after: Boot): bool =
  before.known implies (after.known and after.phone == before.phone and after.launcher == before.launcher
    and after.assistant == before.assistant and after.image == before.image)
```

### Every answer about the phone is passed on to the shell, and nothing else is

```quint
pure def admits(e: Effect): bool = match e { | Admit(a) => true | _ => false }

pure def stepWhatThePhoneAdmitsIsPassedOn(before: Boot, via: str, after: Boot, out: List[Effect]): bool =
  out.every(e => match e { | Admit(a) => a.image == after.image and a.contacts == after.contacts | _ => true })
    and (out.some(e => admits(e)) iff (via == "learn" or via == "miss"))
```

### A failed first read still starts Alpha

```quint
pure def sometimesAFailedReadStillStarts(s: Boot): bool = s.known and s.facts.status == R::Failed and not(s.image)
```

### Contacts can be admitted and withdrawn again

```quint
pure def sometimesContactsAreWithdrawn(s: Boot): bool = s.image and not(s.contacts) and s.facts.status == R::Failed
```

## Story: Show the surface that fits

> As the owner, I want Alpha to be my Home when it is the launcher, only a
> chat when I call the assistant, and an ordinary page in a browser.

### Alpha is the launcher's Home, the assistant-only surface, or a plain page

The assistant surface wins over the launcher. A browser, and a phone that
did not say it is the launcher, get the plain page.

```quint
type Presentation = Launcher | AssistantOnly | Plain

pure def presentation(s: Boot): Presentation =
  if (s.assistant) AssistantOnly else if (s.launcher) Launcher else Plain
```

### The assistant-only surface shows chat and close and nothing else

The launcher's Home has no back button of its own and opens Android's
shade; the plain page has its own back button and no shade. The Apps
drawer needs a phone's installed apps. Nothing is drawn before the first
answer.

```quint
type Part = Chat | Close | Tiles | Cards | Panels | AppsDrawer | BackButton | ShadePull

pure def shows(s: Boot, part: Part): bool =
  val mode = presentation(s)
  if (not(s.known)) false
  else if (mode == AssistantOnly) part == Chat or part == Close
  else if (part == Chat or part == Tiles or part == Cards or part == Panels) true
  else if (part == AppsDrawer) s.phone
  else if (part == BackButton) mode == Plain
  else if (part == ShadePull) mode == Launcher
  else false
```

### Every surface has a way out of an app

Close on the assistant surface, the back button on a plain page, and the
phone's own Home and Back where Alpha is the launcher.

```quint
pure def alwaysEverySurfaceHasAWayOut(s: Boot): bool =
  s.known implies (shows(s, Close) or shows(s, BackButton) or (presentation(s) == Launcher and shows(s, ShadePull)))
```

### Alpha can be the launcher's Home

```quint
pure def sometimesAlphaIsTheLauncher(s: Boot): bool = s.known and presentation(s) == Launcher
```

### Alpha can run as a plain page in a browser

```quint
pure def sometimesAlphaIsAPlainPage(s: Boot): bool = s.known and not(s.phone) and shows(s, BackButton)
```

## Story: Wait for the agent

> As the owner, I want to see the Alpha mark rather than a Home that does
> not answer, until Alpha knows whether its agent is there.

### Until the connection has resolved, Home shows only the Alpha mark and takes no input

Home waits from the start. The mark stands in for it, except under
sign-in, which covers both. Home takes input once the facts are known,
Home no longer waits and sign-in is closed.

```quint
pure def marked(s: Boot): bool = s.waiting and not(s.signingIn)

pure def usable(s: Boot): bool = s.known and not(s.waiting) and not(s.signingIn)
```

### Sign-in opens over Home, waiting or not

```quint
pure def canSignInShown(s: Boot): bool = not(s.signingIn)

pure def signInShown(s: Boot): Boot = { ...s, signingIn: true }
```

### Home is shown when the agent answers, and also when Alpha learns that it will not

A connection that failed, is offline or is being recovered shows Home with
that said, even under sign-in. An agent that answers while sign-in is open
changes nothing: Home waits for sign-in to close.

```quint
type Outcome = Connected | Unreachable | Offline | Recovering

pure def canResolve(s: Boot, how: Outcome): bool =
  s.waiting and (how != Connected or not(s.signingIn))

pure def resolve(s: Boot, how: Outcome): Boot = { ...s, waiting: false }
```

### Closing sign-in shows Home

```quint
pure def canSignInClosed(s: Boot): bool = s.signingIn

pure def signInClosed(s: Boot): Boot = { ...s, signingIn: false, waiting: false }
```

### Home, once shown, is not put behind the mark again

```quint
pure def stepHomeOnceShownStaysShown(before: Boot, after: Boot): bool =
  not(before.waiting) implies not(after.waiting)
```

### Only the connection resolving or sign-in closing shows Home

```quint
pure def stepOnlyTheConnectionOrSignInShowsHome(before: Boot, via: str, after: Boot): bool =
  (before.waiting and not(after.waiting)) implies (via == "resolve" or via == "signInClosed")
```

### Home is shown once the connection resolves

A Home waiting with no sign-in over it comes to be shown, or sign-in opens,
provided the account area reports how the connection ended.

```quint
pure def leadsToHomeIsShown(s: Boot, later: Boot): bool =
  marked(s) implies (not(later.waiting) or later.signingIn)

pure val fair_resolve = "weak"
```

### Home can take input

```quint
pure def sometimesHomeTakesInput(s: Boot): bool = usable(s) and presentation(s) != AssistantOnly
```

### Home can wait behind sign-in

```quint
pure def sometimesHomeWaitsBehindSignIn(s: Boot): bool = s.known and s.waiting and s.signingIn
```

### Home can be shown under sign-in when the agent cannot be reached

```quint
pure def sometimesHomeIsShownUnderSignIn(s: Boot): bool = s.known and not(s.waiting) and s.signingIn
```

## Story: Be called up as the assistant

> As the owner, I want the assist gesture, the wake word or the power
> button to bring up Ask Alpha, listening only when I just asked for that.

### The assistant surface notes each call, and the newest replaces one not yet taken

```quint
pure def canSummon(s: Boot): bool = s.known and s.assistant and not(s.closed)

pure def summon(s: Boot, origin: Origin, locked: bool, cold: bool, now: int): Boot =
  { ...s, called: true, origin: origin, locked: locked, cold: cold, at: now }
```

### A call listens only from the wake word or power button, unlocked, and soon enough

Soon enough is five seconds, or fifteen when the call had to start Alpha.
The assist gesture opens Ask Alpha without listening.

```quint
pure def freshFor(cold: bool): int = if (cold) 15000 else 5000

pure def hears(origin: Origin, locked: bool, cold: bool, at: int, now: int): bool =
  origin != Gesture and not(locked) and now >= at and now - at <= freshFor(cold)
```

### A call is taken once Home takes input, and is spent

```quint
pure def canTake(s: Boot): bool = s.called and usable(s)

pure def take(s: Boot, now: int): Booted =
  { state: { ...s, called: false }, out: List(Raise({ listening: hears(s.origin, s.locked, s.cold, s.at, now) })) }
```

### Close ends the assistant surface, once

```quint
pure def canLeave(s: Boot): bool = s.known and s.assistant and not(s.closed)

pure def leave(s: Boot): Booted = { state: { ...s, closed: true, called: false }, out: List(CloseSurface) }
```

### Only the assistant surface is called or closed

```quint
pure def alwaysOnlyTheAssistantSurfaceIsCalledOrClosed(s: Boot): bool =
  (s.called or s.closed) implies (s.known and s.assistant)
```

### A closed surface holds no call

```quint
pure def alwaysAClosedSurfaceHoldsNoCall(s: Boot): bool = not(s.closed and s.called)
```

### A call raises Ask Alpha exactly once

```quint
pure def raises(e: Effect): bool = match e { | Raise(r) => true | _ => false }

pure def stepACallIsSpentOnce(before: Boot, via: str, after: Boot, out: List[Effect]): bool =
  out.some(e => raises(e)) iff (via == "take" and before.called and not(after.called))
```

### Ask Alpha never listens for the gesture, for a locked phone, or for a stale call

```quint
pure def stepOnlyAFreshTrustedCallListens(before: Boot, after: Boot, out: List[Effect]): bool =
  out.every(e => match e { | Raise(r) => r.listening implies (before.origin != Gesture and not(before.locked)) | _ => true })

pure def lawAStaleCallDoesNotListen(origin: Origin, locked: bool, cold: bool, at: int, now: int): bool =
  (now - at > 15000 or now < at) implies not(hears(origin, locked, cold, at, now))
```

### The assistant surface can be called while Alpha is still starting

```quint
pure def sometimesACallWaitsForStartup(s: Boot): bool = s.called and not(usable(s))
```

### The assistant surface can be closed

```quint
pure def sometimesTheAssistantSurfaceIsClosed(s: Boot): bool = s.closed
```

### What the simulator tries

The first three readings, and calls taken at once, a few seconds later
and long after.

```quint
pure val ticketValues = Set(1, 2, 3)
pure val nowValues = Set(0, 4000, 9000, 30000)
pure val weight_learn = 4
```
