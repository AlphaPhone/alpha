# Platform

Alpha's boundary with everything outside its page: the phone's plugins, the
resident agent that runs on the phone, the cloud, what the build allows, and
what the phone kept across a restart. Every area reaches the world only
through the services of `apps/app/src/platform/`, whose phone layer is
eliza's own client of each plugin, so the rules here hold for all of them.
What those clients and the phone's host decide is eliza's and is not stated
again here: how the agent service starts, restarts and stops the agent, and
holds its records for review after a storage failure; which routes, headers
and streams its channel admits; how its runtime client waits for a starting
agent, numbers its generations and reads a refusal; and how eliza's cloud
client reads the cloud's refusals.

- [Feed](./feed.md): a live feed of the agent's events for one screen
- [Adoption](./adoption.md): what the earlier Alpha kept, carried into the new stores

## Story: Reach the phone's native capabilities

> As the owner, I want every feature to use my phone's own capabilities
> where this build has them, and to say plainly where it does not, so that
> nothing pretends to work on a device that cannot do it.

### Alpha is the browser page off the phone, the Alpha image where the phone's host says so, and the launcher otherwise

The phone's host says it is an Alpha image by registering eliza's telephony
plugin, which only an image's build registers. A launcher on stock Android
never registers it, and a page outside the phone's host registers nothing.

```quint
type Variant = Launcher | Image | Browser

pure def variantOf(onPhone: bool, telephony: bool): Variant =
  if (not(onPhone)) Browser else if (telephony) Image else Launcher

pure def lawOnlyTheImageRegistersTelephony(onPhone: bool, telephony: bool): bool =
  (variantOf(onPhone, telephony) == Image) iff (onPhone and telephony)

pure def lawThePageOffThePhoneIsTheBrowser(telephony: bool): bool = variantOf(false, telephony) == Browser
```

### A capability is offered only on a variant whose host registers its plugin

Telephony, Messages and Contacts are the image's; every other plugin
registers on both phone variants; the browser page has none, and its
service says the phone's part is absent.

```quint
type Reach = AnyPhone | ImageOnly

pure def reachable(reach: Reach, build: Variant): bool = match reach {
  | AnyPhone => build != Browser
  | ImageOnly => build == Image
}

pure def lawImageCapabilitiesNeverReachTheLauncher(reach: Reach): bool =
  reachable(reach, Launcher) implies reach == AnyPhone

pure def lawTheBrowserReachesNoPlugin(reach: Reach): bool = not(reachable(reach, Browser))

pure def lawTheImageReachesEveryPlugin(reach: Reach): bool = reachable(reach, Image)
```

## Story: Talk to the resident agent

> As the owner, I want my requests to go to the agent running on my phone,
> naming my phone as I asked, and to be told honestly whether a request
> that broke may still have reached it.

### The agent hears the device headers a request names, on the phone as in a browser

A request or a streamed turn names the phone to the agent with eliza's
device headers and client id. Alpha hands every header a request names to
eliza's runtime client, which admits or refuses them by its own rule, and
on to the phone's agent plugin or the agent's address: none is dropped on
the way, so the agent on the phone and the one a browser reaches hear the
same request. A request whose headers eliza's client refuses is never sent.

```quint
type Way = ThroughThePhone | ThroughTheAddress

pure def headersHeard(named: bool, admitted: bool, way: Way): bool = named and admitted

pure def lawTheWayChangesNothingTheAgentHears(named: bool, admitted: bool): bool =
  headersHeard(named, admitted, ThroughThePhone) == headersHeard(named, admitted, ThroughTheAddress)

pure def lawARefusedHeaderIsNeverHeard(named: bool, way: Way): bool = not(headersHeard(named, false, way))
```

### A stream the phone ended before its first answer was never sent; one that broke after it may have reached the agent

The phone's agent plugin ends a stream as `failed`, with its channel's
code, only before it relays anything to the agent. Such a stream is a
request that never left Alpha. A stream that errs, is withdrawn or stops
once the agent's answer has begun has an outcome Alpha cannot know.

```quint
type Ending = Finished | Errored | Withdrawn | RefusedByThePhone
type Delivery = Delivered | NeverSent | MaybeSent

pure def deliveryOf(answered: bool, ending: Ending): Delivery =
  if (not(answered) and ending == RefusedByThePhone) NeverSent
  else if (answered and ending == Finished) Delivered
  else MaybeSent

pure def lawOnlyARefusalBeforeTheAnswerIsNeverSent(answered: bool, ending: Ending): bool =
  deliveryOf(answered, ending) == NeverSent iff (not(answered) and ending == RefusedByThePhone)

pure def lawABrokenAnswerIsNeverCalledDelivered(ending: Ending): bool =
  ending != Finished implies deliveryOf(true, ending) == MaybeSent
```

### A streamed answer the phone relays never grows past two mebibytes

A chunk that would take the body past the limit ends the stream as broken,
and the stream is withdrawn from the phone.

```quint
pure val bodyLimit = 2097152

pure def chunkTaken(held: int, bytes: int): bool = bytes >= 0 and held + bytes <= bodyLimit

pure val heldValues = Set(0, 1048576, 2097152)
pure val bytesValues = Set(-1, 0, 1, 1048576)

pure def lawTheBodyIsBounded(held: int, bytes: int): bool =
  (held >= 0 and chunkTaken(held, bytes)) implies (held + bytes >= 0 and held + bytes <= bodyLimit)
```

## Story: Be told when to try again

> As the owner, I want a request the agent or the cloud turned away for
> now to say how long to wait, and never to invent a wait it was not given.

### A refusal carries a wait only when the other side answered 429 with a whole number of seconds, at most a day

The wait is the `Retry-After` the cloud or the agent's address gave, or
the one eliza's runtime client read from the agent's refusal. Every other
refusal keeps only its status.

```quint
pure val maxWaitSeconds = 86400

pure def waitAdvised(status: int, given: bool, seconds: int): bool =
  status == 429 and given and seconds >= 0 and seconds <= maxWaitSeconds

pure val statusValues = Set(200, 401, 429, 503)
pure val secondsValues = Set(-1, 0, 30, 86401)

pure def lawAWaitIsAdvisedOnlyOn429(status: int, given: bool, seconds: int): bool =
  waitAdvised(status, given, seconds) implies status == 429

pure def lawAnAdvisedWaitIsWithinADay(status: int, given: bool, seconds: int): bool =
  waitAdvised(status, given, seconds) implies (seconds >= 0 and seconds <= maxWaitSeconds)

pure def lawAnUngivenWaitIsNeverAdvised(status: int, seconds: int): bool = not(waitAdvised(status, false, seconds))
```

## Story: Send while my phone has a network

> As the owner, I want a message to go out whenever Android says my phone
> is connected, even when the page thinks it is offline.

### A request is refused for want of a network only when Android confirms the app's network is down

The page's own offline hint is never trusted: where Android has said
nothing, the request goes out and its own answer says how it went.

```quint
type Net = NetUnknown | NetOnline | NetOffline

pure def refusedOffline(network: Net): bool = network == NetOffline

pure def lawOnlyAConfirmedOfflineRefuses(network: Net): bool = refusedOffline(network) iff network == NetOffline
```

## Story: Ship only what this build allows

> As the owner, I want the phone I use to contain no test mocks, fixtures
> or developer tools, and a simulated action never to touch anything real.

### Mocks, fixtures and developer surfaces exist only when the build allows test mocks

A build made with `ELIZA_DEV_ALLOW_TEST_MOCKS=1` may load fixtures and the
fake world. The developer device controls also need the development
server, a page off the phone and the explicit `?tools=1` query; that query
alone admits nothing.

```quint
pure def fixturesAllowed(testMocks: bool): bool = testMocks

pure def toolsShown(testMocks: bool, devServer: bool, onPhone: bool, asked: bool): bool =
  testMocks and devServer and not(onPhone) and asked

pure def lawAProductionBuildLoadsNoFixture(devServer: bool, onPhone: bool, asked: bool): bool =
  not(fixturesAllowed(false)) and not(toolsShown(false, devServer, onPhone, asked))

pure def lawToolsNeverShowOnThePhone(testMocks: bool, devServer: bool, asked: bool): bool =
  not(toolsShown(testMocks, devServer, true, asked))
```

### A built page runs only its own scripts

The built page carries a Content-Security-Policy as the first element of
its head, so it covers every route the page serves: scripts and WebAssembly
only from the page's own origin, never an inline or evaluated script, no
plugin object and no base element. The development server is not held to
it.

```quint
pure def scriptRuns(ownOrigin: bool, inline: bool, evaluated: bool): bool = ownOrigin and not(inline) and not(evaluated)

pure def lawOnlyThePagesOwnScriptsRun(inline: bool, evaluated: bool): bool =
  (inline or evaluated) implies not(scriptRuns(true, inline, evaluated))

pure def lawAnotherOriginsScriptNeverRuns(inline: bool, evaluated: bool): bool = not(scriptRuns(false, inline, evaluated))
```

### A simulated action only ever changes simulated state

A fixture's call, message, payment or navigation changes the fixture and
nothing else; outside a test-mocks build there is no simulated state to
change.

```quint
type Acting = Simulated | ForReal

pure def actingOf(fixture: bool): Acting = if (fixture) Simulated else ForReal

pure def lawAFixtureNeverActsForReal(fixture: bool): bool = fixture implies actingOf(fixture) == Simulated

pure def lawSimulationNeedsTestMocks(testMocks: bool): bool = (actingOf(fixturesAllowed(testMocks)) == Simulated) implies testMocks
```

### Mock mode opens on the phone only after both live collectors are paused

The phone's notification collection and the agent's hosted background
work keep running until each has paused; a failure of either keeps mock
mode closed.

```quint
pure def mockAdmitted(onPhone: bool, notificationsPaused: bool, hostedPaused: bool): bool =
  not(onPhone) or (notificationsPaused and hostedPaused)

pure def lawMockModeNeverMixesWithLiveCollection(notificationsPaused: bool, hostedPaused: bool): bool =
  mockAdmitted(true, notificationsPaused, hostedPaused) implies (notificationsPaused and hostedPaused)
```
