# Startup

How Alpha comes up: it reads where it is running, shows the surface that
fits, and keeps Home behind the Alpha mark until the connection to the
resident agent has resolved. Startup is the one owner of where Alpha runs.
It tells the shell what the phone admits, the areas that show times how
the phone writes them, Home which surface it is, and the access
walkthrough, once, which accesses to offer. Home takes input only when
nothing shows over it: sign-in (the account area's), a panel of the
walkthrough, the failure screen and the update hold (the update area's)
each say so from their own state, and Startup is told only whether any of
them shows. What Home and the shell draw on each surface is theirs; Startup
says only which surface it is, and that the assistant-only surface draws
nothing of Home.

- [Access](./access.md): the walkthrough that asks for each access
- [Steps](./steps.md): the accesses it asks for, and what each row says
- [Finish](./finish.md): how the walkthrough ends
- [Call](./call.md): a call to Ask Alpha, and whether it may listen
- [Actor](./actor.md): what only the owner may do
- [Recovery](./recovery.md): what happens when a page fails or is lost
- [Journal](./journal.md): the bounded record of failures
- [Instance](./instance.md): one Home page, however often Alpha is started

## Story: Come up knowing where Alpha runs

> As the owner, I want Alpha to find out what this phone is before it shows
> anything, and to start anyway when the phone will not say.

### Alpha knows whether it runs on a phone and in a test build, reads the rest, and keeps what decides the surface

On a phone Alpha reads whether it is the launcher, whether this page is the
assistant surface, whether the phone is an Alpha image, whether the image
grants the walkthrough's accesses ahead, whether it admits Contacts, and
the phone's locale and clock. Until the first answer nothing is known and
the cautious answer stands for each. Whether the image grants accesses
ahead is the walkthrough's to keep.

```quint
import read as R from "../../kit/read"
import call as C from "./call"

type TimeStyle = ByLocale | TwelveHour | TwentyFourHour
type Outcome = Pending | Connected | Unreachable | Offline | Recovering
type Mock = NoMock | Mocking | LeftMock
type Presentation = Launcher | AssistantOnly | Plain
type Effect =
  ReadFacts({ ticket: int }) | Admit({ image: bool, contacts: bool }) | Format({ locale: str, hours: TimeStyle })
  | Present({ presentation: Presentation }) | Walk({ phone: bool, pregrants: bool })
  | Raise({ origin: C::Origin, listening: bool, cold: bool }) | CloseSurface

type Boot = {
  phone: bool, testBuild: bool, mock: Mock, fixtures: bool, startedAt: int,
  facts: R::Read, askedAt: int, known: bool, waited: bool,
  launcher: bool, assistant: bool, image: bool, connection: Outcome, call: C::Call,
}

type Booted = { state: Boot, out: List[Effect] }

pure val initial: Boot = {
  phone: false, testBuild: false, mock: NoMock, fixtures: false, startedAt: 0,
  facts: R::unread, askedAt: 0, known: false, waited: false,
  launcher: false, assistant: false, image: false, connection: Pending, call: C::noCall,
}
```

### The page starts once, by asking the phone for its facts

```quint
pure def canStart(s: Boot): bool = s.facts.status == R::Idle

pure def start(s: Boot, phone: bool, testBuild: bool, mockAsked: bool, fixturesAsked: bool, at: int): Booted =
  val facts = R::ask(s.facts)
  {
    state: {
      ...s, phone: phone, testBuild: testBuild, mock: if (testBuild and mockAsked) Mocking else NoMock,
      fixtures: testBuild and fixturesAsked, startedAt: at, facts: facts, askedAt: at,
    },
    out: List(ReadFacts({ ticket: facts.ticket })),
  }
```

### The first answer decides the surface, tells Home which it is, and begins the walkthrough off the assistant-only surface; every answer says what the phone admits and how it writes times

Only a phone can be the launcher, the assistant surface or an Alpha image,
or grant accesses ahead, and only an image admits Contacts. A call that
arrived before the first answer is dropped if this page is not the
assistant surface.

```quint
pure def presentation(s: Boot): Presentation = if (s.assistant) AssistantOnly else if (s.launcher) Launcher else Plain

pure def placed(decided: Boot, first: bool, pregrants: bool): List[Effect] =
  if (not(first)) List()
  else if (decided.assistant) List(Present({ presentation: presentation(decided) }))
  else List(Present({ presentation: presentation(decided) }), Walk({ phone: decided.phone, pregrants: decided.phone and pregrants }))

pure def canLearn(s: Boot, ticket: int): bool = R::canAnswer(s.facts, ticket)

pure def learn(s: Boot, ticket: int, launcher: bool, assistant: bool, image: bool, pregrants: bool, contacts: bool, locale: str, hours: TimeStyle): Booted =
  val decided = if (s.known) s else { ...s, launcher: s.phone and launcher, assistant: s.phone and assistant, image: s.phone and image }
  {
    state: {
      ...decided, facts: R::answer(s.facts, true), known: true, waited: false,
      call: if (decided.assistant) s.call else C::noCall,
    },
    out: List(Admit({ image: decided.image, contacts: decided.image and contacts }), Format({ locale: locale, hours: hours })).concat(placed(decided, not(s.known), pregrants)),
  }
```

### A read that fails, or is not answered within ten seconds, still lets Alpha start, and admits nothing it did not hear

Alpha then keeps what it knew, or the cautious answers on the first read,
and Contacts is withdrawn until a read admits it again.

```quint
pure def unanswered(facts: R::Read, waited: bool, s: Boot): Booted =
  val decided = { ...s, facts: facts, known: true, waited: waited }
  {
    state: { ...decided, call: if (decided.assistant) s.call else C::noCall },
    out: List(Admit({ image: s.image, contacts: false })).concat(placed(decided, not(s.known), false)),
  }

pure def canMiss(s: Boot, ticket: int): bool = R::canAnswer(s.facts, ticket)

pure def miss(s: Boot, ticket: int): Booted = unanswered(R::answer(s.facts, false), false, s)

pure def canLate(s: Boot, ticket: int, now: int): bool = R::canAnswer(s.facts, ticket) and now >= s.askedAt + 10000

pure def late(s: Boot, ticket: int, now: int): Booted = unanswered(R::answer(s.facts, false), true, s)
```

### Coming back to the front reads the facts again

```quint
pure def canResume(s: Boot): bool = s.known and s.facts.status != R::Loading

pure def resume(s: Boot, now: int): Booted =
  val facts = R::ask(s.facts)
  { state: { ...s, facts: facts, askedAt: now }, out: List(ReadFacts({ ticket: facts.ticket })) }
```

### Only a phone is the launcher, the assistant surface or an Alpha image

```quint
pure def alwaysOnlyAPhoneDecidesTheSurface(s: Boot): bool = (s.launcher or s.assistant or s.image) implies s.phone
```

### Nothing is taken as known before the first answer

This holds by what each answer writes, and guards it.

```quint
pure def alwaysNothingIsKnownBeforeTheFirstAnswer(s: Boot): bool = s.known or not(s.launcher or s.assistant or s.image)
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
this is a phone, the launcher, the assistant surface or an image. A new
page reads them afresh.

```quint
pure def stepTheSurfaceIsDecidedOnce(before: Boot, after: Boot): bool =
  before.known implies (after.known and after.phone == before.phone and after.launcher == before.launcher
    and after.assistant == before.assistant and after.image == before.image)
```

### Every answer about the phone is passed on: what it admits to the shell, and how it writes times to the areas that show them

Contacts is admitted only on an Alpha image. Only a full answer says how
the phone writes times.

```quint
pure def admits(e: Effect): bool = match e { | Admit(a) => true | _ => false }

pure def formats(e: Effect): bool = match e { | Format(f) => true | _ => false }

pure def answers(via: str): bool = via == "learn" or via == "miss" or via == "late"

pure def stepWhatThePhoneSaysIsPassedOn(before: Boot, via: str, after: Boot, out: List[Effect]): bool =
  out.every(e => match e { | Admit(a) => a.image == after.image and (a.contacts implies a.image) | _ => true })
    and (out.some(e => admits(e)) iff answers(via))
    and (out.some(e => formats(e)) iff via == "learn")
```

### Home is told its surface, and the walkthrough begun, once, when Alpha first knows where it runs, and the walkthrough never on the assistant-only surface

The walkthrough is offered the phone's accesses only on a phone, and the
image's grants ahead only on a phone that said so.

```quint
pure def presents(e: Effect): bool = match e { | Present(p) => true | _ => false }

pure def walks(e: Effect): bool = match e { | Walk(w) => true | _ => false }

pure def stepTheWalkthroughBeginsOnceAlphaKnowsWhereItRuns(before: Boot, via: str, after: Boot, out: List[Effect]): bool =
  (out.some(e => presents(e)) iff (answers(via) and not(before.known)))
    and (out.some(e => walks(e)) iff (answers(via) and not(before.known) and not(after.assistant)))
    and out.every(e => match e {
      | Present(p) => p.presentation == presentation(after)
      | Walk(w) => w.phone == after.phone and (w.pregrants implies (after.phone and via == "learn"))
      | _ => true
    })
```

### Alpha comes to know the phone's facts once it has asked

Ten seconds without an answer counts as a failed read.

```quint
pure def leadsToTheFactsAreKnown(s: Boot, later: Boot): bool = s.facts.status != R::Idle implies later.known

pure val fair_late = "weak"
```

### A failed first read still starts Alpha

```quint
pure def sometimesAFailedReadStillStarts(s: Boot): bool = s.known and s.facts.status == R::Failed and not(s.waited)
```

### A read the phone never answers still starts Alpha

```quint
pure def sometimesAnUnansweredReadStillStarts(s: Boot): bool = s.known and s.facts.status == R::Failed and s.waited
```

## Story: Start in mock mode only in a test build

> As the owner, I want a phone I bought never to show simulated data, and a
> tester always to see that they are looking at it.

### Mock mode and fixtures are admitted only in a test build

This holds by what starting writes, and guards it.

```quint
pure def alwaysAProductionBuildNeverMocks(s: Boot): bool = (s.mock != NoMock or s.fixtures) implies s.testBuild
```

### Mock mode shows its banner on every surface, and Exit mock mode leaves it

```quint
pure def canExitMock(s: Boot): bool = s.mock == Mocking

pure def exitMock(s: Boot): Boot = { ...s, mock: LeftMock }

pure def alwaysMockModeShowsItsBanner(s: Boot): bool = s.mock == Mocking implies shows(s, MockBanner)
```

### A test build can run in mock mode

```quint
pure def sometimesATestBuildMocks(s: Boot): bool = s.mock == Mocking and s.known
```

### Mock mode can be left

```quint
pure def sometimesMockModeIsLeft(s: Boot): bool = s.mock == LeftMock
```

## Story: Show the surface that fits

> As the owner, I want Alpha to be my Home when it is the launcher, only a
> chat when I call the assistant, and an ordinary page in a browser.

### Alpha is the launcher's Home, the assistant-only surface, or a plain page

The assistant surface wins over the launcher. A browser, and a phone that
did not say it is the launcher, get the plain page.

```quint
pure def sometimesAlphaIsTheLauncher(s: Boot): bool = s.known and presentation(s) == Launcher
```

### Alpha can run as a plain page in a browser

```quint
pure def sometimesAlphaIsAPlainPage(s: Boot): bool = s.known and not(s.phone) and presentation(s) == Plain
```

### The assistant-only surface shows chat and close, and mock mode's banner, and nothing of Home

Home, on the launcher or the plain page, is what the home area and the
shell draw there, its own way back included. The Alpha mark covers Home
until the connection resolves; chat on the assistant-only surface shows
at once, and Close with it.

```quint
type Part = Mark | Home | Chat | Close | MockBanner

pure def shows(s: Boot, part: Part): bool =
  val alone = s.known and presentation(s) == AssistantOnly
  if (part == Mark) marked(s) and not(alone)
  else if (part == Home) s.known and not(marked(s)) and not(alone)
  else if (part == Chat or part == Close) alone
  else s.mock == Mocking

pure def alwaysTheAssistantSurfaceShowsNothingOfHome(s: Boot): bool =
  presentation(s) == AssistantOnly implies (not(shows(s, Home)) and not(shows(s, Mark)) and (s.known implies shows(s, Close)))
```

### Alpha can be the assistant-only surface

```quint
pure def sometimesAlphaIsTheAssistantSurface(s: Boot): bool = shows(s, Chat) and shows(s, Close)
```

## Story: Wait for the agent

> As the owner, I want to see the Alpha mark rather than a Home that does
> not answer, until Alpha knows whether its agent is there.

### Until the connection has resolved, Home shows only the Alpha mark

```quint
pure def marked(s: Boot): bool = s.connection == Pending

pure def alwaysTheMarkHidesHome(s: Boot): bool = marked(s) implies not(shows(s, Home))
```

### Home takes input only once the facts are known, the connection has resolved, and nothing shows over it

What shows over Home (sign-in, a panel of the walkthrough, the failure
screen, the update hold) is told by the shell from those machines.

```quint
pure def usable(s: Boot, over: bool): bool = s.known and s.connection != Pending and not(over)
```

### The connection resolves once: connected, unreachable, offline or being recovered, each said on Home

The account area reports how the connection ended, under sign-in too.

```quint
pure def canResolve(s: Boot, how: Outcome): bool = s.connection == Pending and how != Pending

pure def resolve(s: Boot, how: Outcome): Boot = { ...s, connection: how }
```

### A connection that has not resolved thirty seconds after start counts as unreachable

```quint
pure def canTimedOut(s: Boot, now: int): bool =
  s.connection == Pending and s.facts.status != R::Idle and now >= s.startedAt + 30000

pure def timedOut(s: Boot, now: int): Boot = { ...s, connection: Unreachable }
```

### The connection, once resolved, stays as it ended

```quint
pure def stepTheConnectionResolvesOnce(before: Boot, after: Boot): bool =
  before.connection != Pending implies after.connection == before.connection
```

### Only the connection's report or its time running out ends the wait

This holds by what each event writes, and guards it.

```quint
pure def stepOnlyTheConnectionEndsTheWait(before: Boot, via: str, after: Boot): bool =
  (before.connection == Pending and after.connection != Pending) implies (via == "resolve" or via == "timedOut")
```

### Home, once shown, is not put behind the mark again

```quint
pure def stepHomeOnceShownStaysShown(before: Boot, after: Boot): bool = shows(before, Home) implies shows(after, Home)
```

### The mark ends once Alpha has started, whether or not the agent answers

```quint
pure def leadsToTheMarkEnds(s: Boot, later: Boot): bool = (marked(s) and s.facts.status != R::Idle) implies not(marked(later))

pure val fair_timedOut = "weak"
```

### Home can take input

```quint
pure def sometimesHomeTakesInput(s: Boot): bool = usable(s, false) and shows(s, Home)
```

### The agent can be found offline

```quint
pure def sometimesTheAgentIsOffline(s: Boot): bool = s.known and s.connection == Offline
```

### The agent can be found unreachable once thirty seconds have passed

```quint
pure def sometimesTheAgentIsUnreachable(s: Boot): bool = shows(s, Home) and s.connection == Unreachable
```

## Story: Be called up as the assistant

> As the owner, I want the assist gesture, the wake word, the power button
> or the Quick Settings tile to bring up Ask Alpha, listening only when I
> just asked for that.

### The assistant surface notes each call when it arrives, and the newest replaces one not yet taken

A call can arrive before Alpha knows which surface it is.

```quint
pure def canSummon(s: Boot): bool = not(s.known) or s.assistant

pure def summon(s: Boot, origin: C::Origin, trusted: bool, locked: bool, cold: bool, at: int, account: int): Boot =
  { ...s, call: C::note(origin, trusted, locked, cold, at, account) }
```

### A call is taken once Home takes input, and raises Ask Alpha listening only as Call says

```quint
pure def canTake(s: Boot, over: bool): bool = s.call.called and s.assistant and usable(s, over)

pure def take(s: Boot, over: bool, account: int, now: int): Booted =
  {
    state: { ...s, call: C::noCall },
    out: List(Raise({ origin: s.call.origin, listening: C::listens(s.call, s.image, account, now), cold: s.call.cold })),
  }
```

### Close asks for the assistant surface to end, which Recovery ends once

```quint
pure def canLeave(s: Boot): bool = s.known and s.assistant

pure def leave(s: Boot): Booted = { state: { ...s, call: C::noCall }, out: List(CloseSurface) }

pure def closes(e: Effect): bool = match e { | CloseSurface => true | _ => false }

pure def stepOnlyCloseEndsTheSurface(before: Boot, via: str, after: Boot, out: List[Effect]): bool =
  out.some(e => closes(e)) implies (via == "leave" and before.known and before.assistant and not(after.call.called))
```

### Only the assistant surface, or a page not yet told which it is, holds a call

```quint
pure def alwaysOnlyTheAssistantSurfaceIsCalled(s: Boot): bool = s.call.called implies (not(s.known) or s.assistant)
```

### A call raises Ask Alpha exactly once, and only once the connection has resolved

```quint
pure def raises(e: Effect): bool = match e { | Raise(r) => true | _ => false }

pure def stepACallIsSpentOnce(before: Boot, via: str, after: Boot, out: List[Effect]): bool =
  (out.some(e => raises(e)) iff (via == "take" and before.call.called and not(after.call.called)))
    and (out.some(e => raises(e)) implies (before.known and before.connection != Pending))
```

### Ask Alpha listens only for a fresh call from a trusted caller on an Alpha image, and keeps how the call came

```quint
pure def stepOnlyAFreshTrustedCallListens(before: Boot, after: Boot, out: List[Effect]): bool =
  out.every(e => match e {
    | Raise(r) => r.origin == before.call.origin and r.cold == before.call.cold
        and (r.listening implies (before.call.trusted and before.image and not(before.call.locked)
          and before.call.origin != C::Gesture and before.call.origin != C::Tile))
    | _ => true
  })
```

### The assistant surface can be called while Alpha is still starting

```quint
pure def sometimesACallWaitsForStartup(s: Boot): bool = s.call.called and not(s.known)
```

### A call can wait for the connection

```quint
pure def sometimesACallWaitsForTheConnection(s: Boot): bool = s.call.called and s.known and s.connection == Pending
```

### What the simulator tries

The first three readings, and calls taken at once, a few seconds later
and long after, under two accounts.

```quint
pure val ticketValues = Set(1, 2, 3)
pure val nowValues = Set(0, 4000, 12000, 40000)
pure val atValues = Set(0, 4000)
pure val accountValues = Set(1, 2)
pure val localeValues = Set("en-US", "de-DE")
pure val weight_learn = 4
```
