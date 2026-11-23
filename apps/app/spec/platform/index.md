# Platform

The renderer's boundary with everything outside it: the phone's native plugins, the resident agent
that runs on the phone, Eliza Cloud's managed services, what the build allows, and the state kept
across restarts. Every other area reaches the outside world only through these services, so the
rules here hold for all of them. The child specs model the parts with a life cycle:

- [The resident agent connection](./resident.md)
- [A streamed reply over the native bridge](./nativeStream.md)
- [Live native renderer and voice event subscriptions](./viewEvents.md)
- [The problem log](./crashJournal.md)
- [App lifecycle and network state](./lifecycle.md)
- [Renderer recovery after the WebView's renderer is lost](./rendererRecovery.md)
- [Device storage, owner namespaces and reset](./storage.md)

## Story: Reach the phone's native capabilities

> As the owner, I want every feature to use my phone's own capabilities where this build has them,
> and to say plainly where it does not, so that nothing pretends to work on a device that cannot do it.

### The build is the browser page off the phone, the AOSP image where the image says so, and the launcher otherwise

The AOSP variant is the native build whose image reports the verified Alpha AOSP capability
(`DeviceApps.platformCapabilities().aospImage`). A launcher APK on stock Android never claims it,
and a page outside Capacitor is the browser variant.

```quint
type Variant = Launcher | Aosp | Browser

pure def variantOf(onDevice: bool, aospImage: bool): Variant =
  if (not(onDevice)) Browser else if (aospImage) Aosp else Launcher

pure def lawOnlyAVerifiedImageIsAosp(onDevice: bool, aospImage: bool): bool =
  (variantOf(onDevice, aospImage) == Aosp) iff (onDevice and aospImage)

pure def lawThePageOffThePhoneIsTheBrowser(aospImage: bool): bool = variantOf(false, aospImage) == Browser
```

### A capability is offered only on a variant whose build registers its plugin

Telephony, Messages, Contacts and the call bar register only on the AOSP image; every other plugin
registers on both native variants. The browser page registers no plugin.

```quint
type Reach = AnyNative | AospImage

pure def reachable(reach: Reach, variant: Variant): bool = match reach {
  | AnyNative => variant != Browser
  | AospImage => variant == Aosp
}

pure def lawAospCapabilitiesNeverReachTheLauncher(reach: Reach): bool =
  reachable(reach, Launcher) implies reach == AnyNative

pure def lawTheBrowserReachesNoPlugin(reach: Reach): bool = not(reachable(reach, Browser))

pure def lawTheAospImageReachesEveryPlugin(reach: Reach): bool = reachable(reach, Aosp)
```

### A plugin method is called only when the native bridge lists it

Capacitor makes up a function for any method name, so a method the native plugin does not declare
would turn into a call that never answers. A plugin that is not registered, or a method its native
header does not list, is unavailable and is never called.

```quint
type Header = NoHeader | Listed({ hasMethod: bool })

pure val headerValues = Set(NoHeader, Listed({ hasMethod: true }), Listed({ hasMethod: false }))

pure def mayCall(registered: bool, header: Header): bool = registered and (match header {
  | NoHeader => false
  | Listed(h) => h.hasMethod
})

pure def lawAnUnlistedMethodIsNeverCalled(registered: bool): bool =
  not(mayCall(registered, Listed({ hasMethod: false })))

pure def lawAnUnregisteredPluginIsNeverCalled(header: Header): bool = not(mayCall(false, header))
```

## Story: Talk to the resident agent

> As the owner, I want my requests to go to the agent running on my phone, under my own session,
> and a refusal to tell me whether and when to try again.

### Only a path that starts with one slash reaches the resident

A protocol-relative path or one without a leading slash is refused before anything is sent, so no
request can be steered to another host.

```quint
type PathShape = Rooted | Unrooted | ProtocolRelative

pure def pathAdmitted(path: PathShape): bool = path == Rooted

pure def lawOnlyRootedPathsAreSent(path: PathShape): bool = pathAdmitted(path) implies path == Rooted
```

### A request crosses to the resident only as the owner route table allows, and an unclaimed path only reads or posts

The owner route table is one asset, the same bytes the renderer reads and Android ships, so the two
gates never disagree. The group with the longest prefix that claims a path decides it by the rules
of [routes](../shell/routes.md): its method, path, query keys and id. Notes' state, interactions,
Trash erase and recording cleanup are the owner's records, as calendar's routes are. A path no group
claims is read with GET or sent with POST, never put, patched or deleted. A refused request is
answered as an invalid request and nothing is sent.

```quint
pure def methodAdmitted(claimed: bool, tableAllows: bool, readOrPost: bool): bool =
  if (claimed) tableAllows else readOrPost

pure def lawAnUnclaimedPathOnlyReadsOrPosts(tableAllows: bool): bool = not(methodAdmitted(false, tableAllows, false))

pure def lawAClaimedPathFollowsTheTable(readOrPost: bool): bool = not(methodAdmitted(true, false, readOrPost))
```

### A refusal carries a wait only when the resident answered 429 with a whole number of seconds

Every other refusal keeps the resident's status, code and message and no advice.

```quint
type Advice = NoAdvice | WaitSeconds({ seconds: int })

pure val maxWaitSeconds = 86400

pure def adviceOf(httpStatus: int, given: bool, seconds: int): Advice =
  if (httpStatus == 429 and given and seconds >= 0 and seconds <= maxWaitSeconds) WaitSeconds({ seconds: seconds }) else NoAdvice

pure val httpStatusValues = Set(200, 401, 409, 429, 503)
pure val secondsValues = Set(-1, 0, 30, 86401)

pure def lawAdviceOnlyOn429(httpStatus: int, given: bool, seconds: int): bool =
  adviceOf(httpStatus, given, seconds) != NoAdvice implies httpStatus == 429

pure def lawAdviceIsNeverNegative(httpStatus: int, given: bool, seconds: int): bool = match adviceOf(httpStatus, given, seconds) {
  | WaitSeconds(w) => w.seconds >= 0 and w.seconds <= maxWaitSeconds
  | NoAdvice => true
}
```

### A 2xx answer is the reply and anything else is a refusal

```quint
type Answer = Replied | Refused

pure def answerOf(httpStatus: int): Answer = if (httpStatus >= 200 and httpStatus < 300) Replied else Refused

pure def lawRefusedIsNot2xx(httpStatus: int): bool = answerOf(httpStatus) == Refused iff (httpStatus < 200 or httpStatus >= 300)
```

## Story: Use Eliza Cloud's managed services when signed in

> As the owner, I want sign-in, my plan and metered services to come from the Cloud this build
> ships with, and a request that needs my session to wait for it rather than go out without it.

### Eliza Cloud stays the live host until the Alpha Cloud cutover flag is set

The cutover flag (`ALPHA_CLOUD_CUTOVER`, built as `VITE_ALPHA_CLOUD_CUTOVER=1`, the one flag the
account and the Cloud transport both read) is off by default; off, every build talks to Eliza Cloud.

```quint
type Host = ElizaCloud | AlphaCloud

pure def hostOf(cutover: bool): Host = if (cutover) AlphaCloud else ElizaCloud

pure def lawWithoutTheFlagTheHostIsElizaCloud(cutover: bool): bool = not(cutover) implies hostOf(cutover) == ElizaCloud
```

### Staging is reached only by a test-mocks build that chose it, or a browser preview of the Cloud resident

A production or Android build always uses production; a choice of production is always honoured.
The choice is the build's `VITE_ALPHA_CLOUD_ENVIRONMENT`, and every Cloud request and every page it
opens names the chosen environment to native, so the native host and the renderer never address two
Clouds.

```quint
type Environment = Production | Staging
type Choice = NoChoice | ChoseProduction | ChoseStaging

pure def environmentOf(development: bool, testMocks: bool, onDevice: bool, previewStaging: bool, cloudResident: bool, choice: Choice): Environment =
  if (development and not(onDevice) and cloudResident) (if (previewStaging) Staging else Production)
  else if (choice == ChoseProduction) Production
  else if (testMocks and choice == ChoseStaging) Staging
  else if (development and testMocks and not(onDevice) and previewStaging) Staging
  else Production

pure def lawAndroidStagingNeedsTestMocksAndTheChoice(testMocks: bool, previewStaging: bool, cloudResident: bool, choice: Choice): bool =
  environmentOf(false, testMocks, true, previewStaging, cloudResident, choice) == Staging implies (testMocks and choice == ChoseStaging)

pure def lawAProductBuildIsProduction(development: bool, onDevice: bool, previewStaging: bool, choice: Choice): bool =
  (not(development) or onDevice) implies environmentOf(development, false, onDevice, previewStaging, false, choice) == Production

pure def lawChoosingProductionIsHonoured(development: bool, testMocks: bool, onDevice: bool, previewStaging: bool, cloudResident: bool): bool =
  not(development and not(onDevice) and cloudResident) implies
    environmentOf(development, testMocks, onDevice, previewStaging, cloudResident, ChoseProduction) == Production
```

### A request that needs the session is sent only while the owner is signed in

A public route goes out either way. A signed-out owner's authenticated request is refused as signed
out before it is sent.

```quint
type Auth = Public | NeedsSession

pure def sends(auth: Auth, signedIn: bool): bool = auth == Public or signedIn

pure def lawNoAuthenticatedRequestWithoutASession(auth: Auth): bool = sends(auth, false) implies auth == Public
```

### Only a route the Cloud client lists is requested

The listed routes are the managed services the device may use: account, plan, entitlement,
inference, speech, Maps and managed Google. Anything else is refused before it is sent.

```quint
pure def routeAdmitted(listed: bool, pathAdmittedNow: bool): bool = listed and pathAdmittedNow

pure def lawAnUnlistedRouteIsNeverSent(pathAdmittedNow: bool): bool = not(routeAdmitted(false, pathAdmittedNow))
```

### A 401 ends the session; every other refusal is Cloud unavailable with its status

No answer at all is Cloud unavailable with status 0. A 429 keeps the wait its `Retry-After` header gave,
in whole seconds and by `adviceOf`, as a resident refusal does, so a caller pauses for as long as Cloud asked.

```quint
type CloudOutcome = CloudAnswered | CloudSignedOutNow | CloudDown

pure def cloudOutcomeOf(httpStatus: int): CloudOutcome =
  if (httpStatus >= 200 and httpStatus < 300) CloudAnswered else if (httpStatus == 401) CloudSignedOutNow else CloudDown

pure def lawOnly401SignsOut(httpStatus: int): bool = cloudOutcomeOf(httpStatus) == CloudSignedOutNow iff httpStatus == 401

pure def lawNoAnswerIsUnavailable(httpStatus: int): bool = httpStatus == 0 implies cloudOutcomeOf(httpStatus) == CloudDown
```

### The phone's key stays with native, and a leaving screen cancels only its own call

Cloud requests go through the agent service's `ElizaCloud` plugin, which holds the device key and
the account session; the renderer never holds either. A screen that stops waiting cancels its own
call by its id, which then settles once as cancelled and is never retried; a call already answered
is not touched.

```quint
type CallEnd = CallAnswered | CallCancelled | CallInFlight

pure def cancelOutcome(callEnd: CallEnd): CallEnd = if (callEnd == CallInFlight) CallCancelled else callEnd

pure def lawCancelLeavesAnAnsweredCallAlone(callEnd: CallEnd): bool = callEnd == CallAnswered implies cancelOutcome(callEnd) == CallAnswered

pure def lawACancelledCallSettlesOnce(callEnd: CallEnd): bool = cancelOutcome(cancelOutcome(callEnd)) == cancelOutcome(callEnd)
```

## Story: Keep my phone's state across restarts

> As the owner, I want what I left on my phone to be there after a restart, a reload or a crash, and
> never to see another owner's state on the same phone.

### Every stored key of an owner lies in that owner's namespace, and a reset removes exactly those keys

```quint
type Slot = { owner: str, key: str }

pure def resetOwner(owner: str, slots: List[Slot]): List[Slot] = slots.select(s => s.owner != owner)

pure val slotsValues = Set(
  List(),
  List({ owner: "ann", key: "notes" }),
  List({ owner: "ann", key: "notes" }, { owner: "ben", key: "notes" }),
  List({ owner: "ben", key: "drafts" }, { owner: "ann", key: "drafts" }, { owner: "ann", key: "maps" })
)
pure val ownerValues = Set("ann", "ben")

pure def lawResetRemovesOnlyTheOwnersKeys(owner: str, slots: List[Slot]): bool = {
  val left = resetOwner(owner, slots)
  left.every(s => s.owner != owner) and slots.every(s => s.owner != owner implies left.includes(s))
}
```

## Story: Ship only what this build allows

> As the owner, I want the phone I use to contain no test mocks, fixtures or developer tools, and a
> simulated action never to touch anything real.

### Mocks, fixtures and developer surfaces exist only when the build allows test mocks

A build made with `ELIZA_DEV_ALLOW_TEST_MOCKS=1` may load fixtures and remote transports. The
developer device controls also need the development server, a page off the phone and the explicit
`?tools=1` query; that query alone admits nothing.

```quint
pure def fixturesAllowed(testMocks: bool): bool = testMocks

pure def toolsShown(testMocks: bool, devServer: bool, onDevice: bool, asked: bool): bool =
  testMocks and devServer and not(onDevice) and asked

pure def lawAProductionBuildLoadsNoFixture(devServer: bool, onDevice: bool, asked: bool): bool =
  not(fixturesAllowed(false)) and not(toolsShown(false, devServer, onDevice, asked))

pure def lawToolsNeverShowOnThePhone(testMocks: bool, devServer: bool, asked: bool): bool =
  not(toolsShown(testMocks, devServer, true, asked))
```

### A simulated action only ever changes simulated state

A fixture's call, message, payment or navigation changes the fixture and nothing else; outside a
test-mocks build there is no simulated state to change.

```quint
type ActionEffect = Simulated | Real

pure def effectOfAction(fixture: bool): ActionEffect = if (fixture) Simulated else Real

pure def lawAFixtureNeverActsForReal(fixture: bool): bool = fixture implies effectOfAction(fixture) == Simulated

pure def lawSimulationNeedsTestMocks(testMocks: bool): bool = (effectOfAction(fixturesAllowed(testMocks)) == Simulated) implies testMocks
```

### Mock mode opens on the phone only after both live collectors are paused

Notification collection and hosted background work keep running until each has paused; a failure of
either keeps mock mode closed.

```quint
pure def mockAdmitted(onDevice: bool, notificationsPaused: bool, hostedPaused: bool): bool =
  not(onDevice) or (notificationsPaused and hostedPaused)

pure def lawMockModeNeverMixesWithLiveCollection(notificationsPaused: bool, hostedPaused: bool): bool =
  mockAdmitted(true, notificationsPaused, hostedPaused) implies (notificationsPaused and hostedPaused)
```
