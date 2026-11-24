# Cloud

Alpha's cloud is eliza's: `@elizaos/cloud` at the pin, which specifies its
own profile, routes, sign-in, device keys, entitlement, plans and billing
(`.eliza/spec/cloud/`). What Alpha owns, and this spec states, is which
deployment the app talks to in each environment, how Alpha's app is
registered with it as a native client, what its asset links must say,
which of its routes Alpha's screens reach through the phone, how an
operator brings a deployment up, including Alpha's own on Cloudflare, and
the gates a local cloud must pass.
The profiles, the seed and the commands that check them are `apps/cloud`.

- [Local cloud](./local.md): eliza's own server on this computer, and the gates Alpha's contract passes on it
- [Provisioning](./provisioning.md): the operator's commands, in order, each read back before the next
- [Rollout](./rollout.md): Alpha's own cloud on Cloudflare, the candidate's serve step

## Story: Know which cloud the app talks to

> As the owner, I want my phone to talk to one cloud, named once, so that
> my sign-in, my plan and my mail never go to a host the product did not
> choose.

### A hosted environment's profile answers at its deployment's cloud and keeps its returns on its deployment's App Link host

`@repo/deployment` names the cloud and the App Link host of each
environment; the profile that environment's deployment names says the same
API origin and has its web origin on that host. The local environment runs
the staging profile on this computer, where the cloud's origin is known only
once it listens.

```quint
type Hosts = { cloud: str, appLinkHost: str }
type ProfileHosts = { api: str, webHost: str }

pure def profileFits(deployment: Hosts, profile: ProfileHosts): bool =
  profile.api == deployment.cloud and profile.webHost == deployment.appLinkHost
```

### A cut-over candidate names neither the cloud nor the App Link host it would replace

The candidate is the product's own cloud, recorded and not used until the
decision on where Alpha's cloud runs is taken.

```quint
pure def candidateApart(serving: Hosts, candidate: Hosts): bool =
  candidate.cloud != serving.cloud and candidate.appLinkHost != serving.appLinkHost
    and candidate.cloud != serving.appLinkHost and candidate.appLinkHost != serving.cloud
```

## Story: Register Alpha's app with the cloud

> As the owner, I want the cloud to send my sign-in back only to Alpha's
> own app, signed by Alpha's own key, so that no other app can take my
> account's key.

What a registration holds and how the cloud admits a client is eliza's
(`spec/cloud/nativeClients/registry.md`, "Story: Admit only a registered
native client"); applying it is eliza's `client apply`
(`spec/cloud/nativeClients/registry.md`, "Story: Apply my app's
registration from its reviewed file").

### Alpha registers one client in each environment, under its own package and name

```quint
type Environment = Production | Staging
type ReturnUrl = { origin: str, path: str }
type Registration = {
  clientId: str, environment: Environment, displayName: str, androidPackage: str,
  certFingerprints: List[str], signInReturn: ReturnUrl, billingReturn: ReturnUrl
}

pure val alphaPackage = "ai.alphacompute.alphaphone"
pure val alphaName = "Alpha"
```

### Production trusts only the release signer, and staging also the debug signer

The release signer is the public digest of the key Alpha's distributed
builds are signed with (`legacy/android/release-signer.json`). The debug
signer is the digest of the Android host's debug keystore; it is added here
when the Android area brings that keystore in, and until then staging trusts
the release signer alone.

```quint
pure val releaseSigner = "ED:BF:CA:CB:1D:A6:89:00:8B:F4:E7:D6:75:17:6C:30:2D:EC:F8:31:61:A8:77:EB:8B:1D:E4:FF:AE:04:45:ED"
pure val debugSigners: List[str] = List()

pure def signersOf(environment: Environment): List[str] =
  if (environment == Staging) List(releaseSigner).concat(debugSigners) else List(releaseSigner)
```

### The release signer is never a debug signer

A debug keystore is in the repository; a release signed by it could be
installed over a phone by anyone who holds the repository.

```quint
pure def lawTheReleaseSignerIsNoDebugSigner(environment: Environment): bool =
  not(debugSigners.includes(releaseSigner)) and signersOf(environment).nthOr(0, "") == releaseSigner
```

### Each return is on the environment's web origin, at the paths Alpha's App Links have always opened, and Alpha keeps no connect return

The sign-in and billing returns are the paths phones installed before this
rebuild already open (`/alphaphone/auth/callback`,
`/alphaphone/billing/return`). A Google connection finished for Alpha shows
eliza's own page as connected (`spec/cloud/returnPages.md`, "A Google
connection finished for an enabled registration without a connect return
shows ReturnToApp as connected, with no action").

```quint
pure def registrationOf(environment: Environment, web: str): Registration = {
  clientId: alphaPackage, environment: environment, displayName: alphaName, androidPackage: alphaPackage,
  certFingerprints: signersOf(environment),
  signInReturn: { origin: web, path: "/alphaphone/auth/callback" },
  billingReturn: { origin: web, path: "/alphaphone/billing/return" }
}
```

### No return lies on the API origin, which serves no page

eliza's registry refuses one (`spec/cloud/nativeClients/registry.md`, "A
registration is accepted only when the registry stays valid and no return
lies on the API origin, and it never changes how another client is
admitted"), so a registration whose web origin is its cloud's API origin
could never be applied.

```quint
pure def returnsOffApi(registration: Registration, api: str): bool =
  registration.signInReturn.origin != api and registration.billingReturn.origin != api
```

### An environment's asset links hold exactly one statement for Alpha's package, naming that environment's signers

```quint
type Statement = { packageName: str, fingerprints: List[str] }

pure def assetLinksNameAlpha(statements: List[Statement], environment: Environment): bool =
  statements.select(s => s.packageName == alphaPackage) == List({ packageName: alphaPackage, fingerprints: signersOf(environment) })
```

## Story: Keep Alpha's own cloud ready for the cutover

> As the owner, I want Alpha's own cloud to stand at the hosts the
> candidate names, serving eliza's cloud under Alpha's name, model and
> services, so that taking the cutover changes only which cloud my phone
> signs in to.

The candidate is Alpha's own deployment of eliza's cloud on Cloudflare
([Rollout](./rollout.md)), under the profile the operator completes from
`apps/cloud/profile/candidate.example.json`. Phones keep the cloud
`@repo/deployment` names until the owner takes the cutover.

### The candidates of production and staging share no host

A staging change can then never reach a production phone, nor a production
credential a staging Worker.

```quint
pure def candidatesSeparate(production: Hosts, staging: Hosts): bool =
  Set(production.cloud).union(Set(production.appLinkHost)).intersect(Set(staging.cloud).union(Set(staging.appLinkHost))).size() == 0
```

### The candidate's profile answers at the candidate's cloud and keeps its returns on the candidate's App Link host

```quint
pure def candidateProfileFits(candidate: Hosts, profile: ProfileHosts): bool = profileFits(candidate, profile)
```

### Alpha's own cloud offers inference, speech, maps, managed Google and billing, under Alpha's name, its entitlements for Alpha's package

```quint
pure val ownCloudName = "Alpha Cloud"
pure val ownCapabilities: List[str] = List("inference", "speech", "maps", "managedGoogle", "billing")

pure def offersAlphasServices(name: str, audience: str, capabilities: List[str]): bool =
  name == ownCloudName and audience == alphaPackage and capabilities == ownCapabilities
```

### Alpha's own cloud mails each sign-in code from its own address on Alpha's zone

The sender is `noreply@alphacompute.cc` in both environments, the address the
mail provider verified for Alpha's zone.

```quint
pure val ownMailSender = "noreply@alphacompute.cc"

pure def mailsAsAlpha(sender: str): bool = sender == ownMailSender
```

### Chat on Alpha's own cloud is Alpha's model, and a request that names no cap is quoted and sent at the longest reply its provider generates

eliza's cloud quotes a call at its model's default cap and refuses one for a
model that has none; it forwards only the caller's own cap. Alpha's phone
names none, so the model's default is the longest reply its provider
generates, never a shorter one.

```quint
pure val alphaModel = "qwen-3.8-27b"
pure val alphaModelLongestReply = 40960

pure def chatModelFits(model: str, upstream: str, defaultCap: int): bool =
  model == alphaModel and upstream == alphaModel and defaultCap == alphaModelLongestReply
```

## Story: Reach my account's services from the app

> As the owner, I want every screen that reads my account, plan, billing,
> referrals, maps, Google connection, mail and calendar to reach the cloud
> through my phone, so that none of them is refused because the phone
> could not load Alpha's list of cloud routes.

The app hands eliza's `ElizaCloud` plugin one route table, which eliza loads
only whole: one route that is not a device route a page may use refuses
every route (`spec/os/signIn/cloudRequests.md`, "A cloud table is loaded
only when every route is a device route the page may use"). The service
document and a device's own sign-out belong to sign-in and go through
eliza's sign-in plugin.

### Each route of Alpha's cloud table is one of eliza's device routes by method and path, buffered, outside sign-in, and needs no account session

The app holds no account session, so a route that needs one could never be
sent. Sign-in owns the routes under `/api/v1/auth/`, `/api/v1/app-auth/`,
`/api/v1/api-keys/`, `/api/public/` and `/api/v1/voice/speech/`.

```quint
type Verb = Get | Post | Patch | Delete
type Auth = Public | KeyOrSession | SessionOnly
type Listing = { matches: int, buffered: bool, auth: Auth }

pure val signInPrefixes: List[str] = List("/api/v1/auth/", "/api/v1/app-auth/", "/api/v1/api-keys/", "/api/public/", "/api/v1/voice/speech/")

pure def pageRoute(listing: Listing, underSignIn: bool): bool =
  listing.matches == 1 and listing.buffered and not(underSignIn) and listing.auth != SessionOnly
```

### The table lists every route Alpha's screens and eliza's managed mail client send, each with the query keys they send

Path parameters are written `{name}`. The Gmail and inbox routes, with
their keys, are the ones eliza's managed Gmail client
(`@elizaos/plugin-inbox`) builds.

```quint
type TableRoute = { verb: Verb, path: str, query: List[str] }

pure val cloudTable: List[TableRoute] = List(
  { verb: Get, path: "/api/v1/user", query: List() },
  { verb: Get, path: "/api/v1/referrals", query: List() },
  { verb: Post, path: "/api/v1/referrals/apply", query: List() },
  { verb: Get, path: "/api/v1/subscriptions/plans", query: List() },
  { verb: Post, path: "/api/v1/subscriptions/checkout", query: List() },
  { verb: Post, path: "/api/v1/subscriptions/checkout/confirm", query: List() },
  { verb: Post, path: "/api/v1/subscription/redeem", query: List() },
  { verb: Get, path: "/api/v1/subscription/entitlement", query: List() },
  { verb: Get, path: "/api/v1/subscription/entitlement-keys", query: List() },
  { verb: Get, path: "/api/v1/billing/limits", query: List() },
  { verb: Get, path: "/api/v1/billing/invoices", query: List() },
  { verb: Get, path: "/api/v1/billing/invoices/{invoiceId}", query: List() },
  { verb: Get, path: "/api/v1/maps/capabilities", query: List() },
  { verb: Post, path: "/api/v1/maps/places/search", query: List() },
  { verb: Post, path: "/api/v1/maps/places/details", query: List() },
  { verb: Post, path: "/api/v1/maps/routes", query: List() },
  { verb: Post, path: "/api/v1/maps/tiles/viewport", query: List() },
  { verb: Get, path: "/api/v1/maps/tiles/{z}/{x}/{y}", query: List() },
  { verb: Get, path: "/api/v1/eliza/google/status", query: List("side", "grantId") },
  { verb: Get, path: "/api/v1/eliza/google/accounts", query: List("side") },
  { verb: Post, path: "/api/v1/eliza/google/connect/initiate", query: List() },
  { verb: Post, path: "/api/v1/eliza/google/disconnect", query: List() },
  { verb: Get, path: "/api/v1/eliza/google/gmail/search", query: List("side", "grantId", "query", "maxResults", "pageToken") },
  { verb: Get, path: "/api/v1/eliza/google/gmail/read", query: List("side", "grantId", "messageId") },
  { verb: Get, path: "/api/v1/eliza/google/gmail/inbox-v1/capabilities", query: List("grantId") },
  { verb: Get, path: "/api/v1/eliza/google/gmail/inbox-v1/thread", query: List("grantId", "threadId", "offset", "historyId") },
  { verb: Get, path: "/api/v1/eliza/google/gmail/inbox-v1/attachment", query: List("grantId", "messageId", "partId", "historyId") },
  { verb: Get, path: "/api/v1/eliza/google/gmail/inbox-v1/drafts", query: List("grantId", "pageToken") },
  { verb: Get, path: "/api/v1/eliza/google/gmail/inbox-v1/draft", query: List("grantId", "draftId") },
  { verb: Post, path: "/api/v1/eliza/google/gmail/inbox-v1/operations", query: List() },
  { verb: Post, path: "/api/v1/eliza/google/gmail/inbox-v1/operations/{requestId}/dispatch", query: List() },
  { verb: Get, path: "/api/v1/eliza/google/gmail/inbox-v1/operations/{requestId}", query: List("grantId") },
  { verb: Get, path: "/api/v1/eliza/google/calendar/calendars", query: List("grantId", "side") },
  { verb: Get, path: "/api/v1/eliza/google/calendar/feed", query: List("grantId", "side", "calendarId", "timeMin", "timeMax", "timeZone") },
  { verb: Get, path: "/api/v1/eliza/google/calendar/events/{eventId}", query: List("grantId", "calendarId") }
)
```

## Story: Come back to Alpha after authorizing a connection in my browser

> As the owner returning from a provider's consent page, I want one plain
> way back into Alpha that carries only what Alpha needs, and a clear
> message when the return cannot be used.

The provider sends the browser to Alpha's return page
(`apps/app/public/delegation-return.html`), which hands the result to the
app through Alpha's own link, `alphaphone://cloud-delegation`. The app,
not the page, checks that the state is the one it is waiting for.

### The return page clears the query from its address, and hands back only a well-formed return with exactly one result

A return has exactly one state of 43 URL-safe characters, a code of at most
4096 characters or an error but never both, a description of at most 2000
characters only beside an error, no key twice and no other key. A cancelled
authorization hands back the error alone; a reopened page with an empty
query asks to go back to Alpha.

```quint
type ReturnQuery = {
  given: int, repeated: bool, unknown: bool, stateValid: bool,
  hasCode: bool, codeFits: bool, hasError: bool, hasDescription: bool, descriptionFits: bool
}
type ReturnAnswer = Reopened | InvalidReturn | Cancelled | Continue

pure def returnAnswer(q: ReturnQuery): ReturnAnswer =
  if (q.given == 0) Reopened
  else if (q.repeated or q.unknown or not(q.stateValid) or q.hasCode == q.hasError
    or (q.hasCode and not(q.codeFits))
    or (q.hasDescription and (not(q.hasError) or not(q.descriptionFits)))) InvalidReturn
  else if (q.hasError) Cancelled
  else Continue

pure val qValues: Set[ReturnQuery] = Set(
  { given: 0, repeated: false, unknown: false, stateValid: false, hasCode: false, codeFits: false, hasError: false, hasDescription: false, descriptionFits: false },
  { given: 2, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: false },
  { given: 2, repeated: false, unknown: false, stateValid: true, hasCode: false, codeFits: false, hasError: true, hasDescription: true, descriptionFits: true },
  { given: 3, repeated: true, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: false },
  { given: 3, repeated: false, unknown: true, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: false },
  { given: 2, repeated: false, unknown: false, stateValid: false, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: false },
  { given: 3, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: true, hasDescription: false, descriptionFits: false },
  { given: 2, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: false, hasError: false, hasDescription: false, descriptionFits: false },
  { given: 3, repeated: false, unknown: false, stateValid: true, hasCode: false, codeFits: false, hasError: true, hasDescription: true, descriptionFits: false },
  { given: 3, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: true, descriptionFits: true }
)

pure def lawHandsBackOneResult(q: ReturnQuery): bool =
  (returnAnswer(q) == Continue or returnAnswer(q) == Cancelled)
    implies (q.stateValid and not(q.repeated) and not(q.unknown) and q.hasCode != q.hasError)

pure val qValues: Set[ReturnQuery] = Set(
  { given: 0, repeated: false, unknown: false, stateValid: false, hasCode: false, codeFits: true, hasError: false, hasDescription: false, descriptionFits: true },
  { given: 2, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: true },
  { given: 2, repeated: false, unknown: false, stateValid: true, hasCode: false, codeFits: true, hasError: true, hasDescription: false, descriptionFits: true },
  { given: 3, repeated: false, unknown: false, stateValid: true, hasCode: false, codeFits: true, hasError: true, hasDescription: true, descriptionFits: true },
  { given: 3, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: true, hasDescription: false, descriptionFits: true },
  { given: 3, repeated: true, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: true },
  { given: 3, repeated: false, unknown: true, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: true },
  { given: 2, repeated: false, unknown: false, stateValid: false, hasCode: true, codeFits: true, hasError: false, hasDescription: false, descriptionFits: true },
  { given: 2, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: false, hasError: false, hasDescription: false, descriptionFits: true },
  { given: 3, repeated: false, unknown: false, stateValid: true, hasCode: true, codeFits: true, hasError: false, hasDescription: true, descriptionFits: true },
  { given: 3, repeated: false, unknown: false, stateValid: true, hasCode: false, codeFits: true, hasError: true, hasDescription: true, descriptionFits: false }
)
```

### The return page runs only its own hashed script, sends no referrer and loads nothing else

The query carries a one-time code; no other script, no referrer and no
other request may see it.

```quint
type ReturnPage = { scripts: int, onlyItsHash: bool, sendsReferrer: bool, loads: int }

pure def returnPageSealed(page: ReturnPage): bool =
  page.scripts == 1 and page.onlyItsHash and not(page.sendsReferrer) and page.loads == 0
```
