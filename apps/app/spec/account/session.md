# Cloud session

The account the phone is signed in to, as the renderer knows it: the deployment and environment
the build addresses, the account Cloud named for the saved key, that key's expiry and renewal, and
sign-out. The key itself stays in the native host (`AlphaCloudSignIn`); the renderer holds its
local generation id, which is not a credential. `generation` advances whenever the account changes,
so every other area can fence a request or a result to the account it was made for.

## Story: Sign in once for Cloud's managed services

> As the owner, I sign in to Eliza Cloud once on my phone, and my agent keeps running on the phone
> whatever happens to my sign-in, so that Cloud only adds managed services and never replaces my agent.

### The build addresses one deployment, and staging only with test mocks or the Cloud resident's browser preview

The deployment and environment are fixed when the session loads, and they are the platform's
(spec/platform/index.md, "Staging is reached only by a test-mocks build that chose it, or a browser
preview of the Cloud resident"), so the session and every Cloud request address one Cloud. A
production build addresses only production; staging needs `ELIZA_DEV_ALLOW_TEST_MOCKS=1`, or the
development server's browser preview of the Cloud resident. Each deployment's public hosts (its API,
its web pages and the agents host its Google callbacks may name) are the ones the published Cloud
deployment, `cloud/deployment.json`, names for that environment, so Alpha Cloud is addressed at its own
zone and never at a host the deployment does not publish.

```quint
type Deployment = ElizaCloud | AlphaCloud
type Environment = Production | Staging
type Phase = SignedOut | SignedIn | ActivationPending | KeyRefused | KeyExpired
type Revocation = NoRevocation | Revoked | HereOnly
type Waiting = NoNotice | PlainNotice | RestartedNotice
type Holder = Free | Attempt | SigningOut
type Account = { userId: str, organizationId: str, credentialId: str, expiresAt: int }
type Session = {
  deployment: Deployment, environment: Environment, testMocks: bool, preview: bool, loaded: bool,
  phase: Phase, account: Account, generation: int, expiryWarning: bool, renewals: int,
  startupResolved: bool, holder: Holder, waiting: Waiting, waitingGeneration: int,
  notices: int, dropped: int, revocation: Revocation, created: bool, priorUnconfirmed: bool
}
pure val noAccount: Account = { userId: "", organizationId: "", credentialId: "", expiresAt: 0 }
pure val initial: Session = {
  deployment: ElizaCloud, environment: Production, testMocks: false, preview: false, loaded: false,
  phase: SignedOut, account: noAccount, generation: 0, expiryWarning: false, renewals: 0,
  startupResolved: false, holder: Free, waiting: NoNotice, waitingGeneration: 0,
  notices: 0, dropped: 0, revocation: NoRevocation, created: false, priorUnconfirmed: false
}
pure def canLoad(s: Session, deployment: Deployment, environment: Environment, testMocks: bool, preview: bool): bool =
  not(s.loaded) and (environment == Production or testMocks or preview)
pure def load(s: Session, deployment: Deployment, environment: Environment, testMocks: bool, preview: bool): Session =
  { ...s, loaded: true, deployment: deployment, environment: environment, testMocks: testMocks, preview: preview }
pure def alwaysStagingNeedsTestMocksOrThePreview(s: Session): bool = s.environment == Staging implies (s.testMocks or s.preview)
pure def alwaysNothingBeforeLoad(s: Session): bool = not(s.loaded) implies (s.phase == SignedOut and s.holder == Free)
pure def sometimesStaging(s: Session): bool = s.environment == Staging and s.phase == SignedIn
```

### A signed-in account is the one Cloud named for the saved key

The session adopts an account only with a user, an organization, a local key generation and an
expiry. An account other than the one before it is a new generation; a renewed key of the same
account is not.

```quint
pure def wellFormed(a: Account): bool = a.userId != "" and a.organizationId != "" and a.credentialId != "" and a.expiresAt > 0
pure def isSignedIn(p: Phase): bool = p != SignedOut
pure def sameOwner(a: Account, b: Account): bool = a.userId == b.userId and a.organizationId == b.organizationId
pure def adopted(account: Account, phase: Phase, s: Session): Session =
  { ...s, phase: phase, account: account, expiryWarning: false, revocation: NoRevocation, created: false, priorUnconfirmed: false,
    generation: if (isSignedIn(s.phase) and sameOwner(account, s.account)) s.generation else s.generation + 1 }
pure val accountValues = Set(
  { userId: "u1", organizationId: "o1", credentialId: "c1", expiresAt: 5 },
  { userId: "u1", organizationId: "o1", credentialId: "c2", expiresAt: 6 },
  { userId: "u2", organizationId: "o2", credentialId: "c3", expiresAt: 4 },
  { userId: "", organizationId: "o1", credentialId: "c4", expiresAt: 5 })
pure def alwaysSignedOutHoldsNoAccount(s: Session): bool = (s.phase == SignedOut) iff (s.account == noAccount)
pure def alwaysASignedInAccountIsWellFormed(s: Session): bool = isSignedIn(s.phase) implies wellFormed(s.account)
pure def stepAnotherOwnerIsANewGeneration(before: Session, after: Session): bool =
  (not(sameOwner(before.account, after.account)) implies after.generation > before.generation) and after.generation >= before.generation
```

### Startup restores the saved sign-in without starting a new one

At startup the native host reports the saved key and Cloud names its account; that account is
adopted as signed in, or as waiting for Cloud's confirmation of the key.

```quint
pure def canRestore(s: Session, account: Account, confirmed: bool): bool =
  s.loaded and s.phase == SignedOut and s.holder == Free and wellFormed(account)
pure def restore(s: Session, account: Account, confirmed: bool): Session =
  adopted(account, if (confirmed) SignedIn else ActivationPending, s)
pure def canConfirmActivation(s: Session): bool = s.phase == ActivationPending
pure def confirmActivation(s: Session): Session = { ...s, phase: SignedIn }
pure def sometimesActivationPending(s: Session): bool = s.phase == ActivationPending
```

### A completed sign-in replaces the session and keeps the agent running

A sign-in that completed, on the sign-in screen or as a retained native return, is adopted, and
the resident agent is ensured: Cloud never stops it (P-43).

```quint
type SessionEffect = EnsureResident | UnbindInference | RevokeKey({ credentialId: str }) | ShowIncomplete({ restarted: bool })
type SessionStep = { state: Session, out: List[SessionEffect] }
pure def canSignInCompleted(s: Session, account: Account, created: bool, priorUnconfirmed: bool): bool =
  s.loaded and s.holder != SigningOut and wellFormed(account)
pure def signInCompleted(s: Session, account: Account, created: bool, priorUnconfirmed: bool): SessionStep =
  { state: { ...adopted(account, SignedIn, s), created: created, priorUnconfirmed: priorUnconfirmed and not(created) }, out: List(EnsureResident) }
pure def stepACompletedSignInEnsuresTheAgent(before: Session, via: str, after: Session, out: List[SessionEffect]): bool =
  via == "signInCompleted" implies out.includes(EnsureResident)
pure def sometimesSignedIn(s: Session): bool = s.phase == SignedIn and s.generation >= 2
```

### A new account, and an earlier sign-in left unconfirmed, are told for the sign-in that reported them

The host's answer says whether Cloud created the account, and whether the key this sign-in
replaced was revoked or is unconfirmed. Account shows "New account", or "Signed in · check devices"
while an earlier key may still work, until the account changes or signs out.

```quint
pure def alwaysNewsBelongsToASignIn(s: Session): bool = (s.created or s.priorUnconfirmed) implies isSignedIn(s.phase)
pure def alwaysANewAccountHadNoEarlierSignIn(s: Session): bool = s.created implies not(s.priorUnconfirmed)
pure def stepNewsComesOnlyWithACompletedSignIn(before: Session, via: str, after: Session): bool =
  ((after.created and not(before.created)) or (after.priorUnconfirmed and not(before.priorUnconfirmed))) implies via == "signInCompleted"
pure def sometimesNewAccount(s: Session): bool = s.created and s.phase == SignedIn
pure def sometimesEarlierSignInUnconfirmed(s: Session): bool = s.priorUnconfirmed and s.phase == SignedIn
```

## Story: Keep my sign-in working until I sign out

> As the owner, I want my key renewed before it expires, a warning only when renewal cannot
> succeed, and a plain request to sign in again once Cloud no longer accepts my key.

### A renewal replaces the key of the same account, never the account

The native host renews the saved key through `POST /api/v1/app-auth/mobile/renew` (upstream
`routesByName.mobileRenew`) when it is due, on load and on resume; sign-out names the renewed key
with `X-Renewed-Credential-Id` (`renewedCredential`). A sign-in renews for at most 180 days: past
that Cloud answers `RenewalWindowClosed` (409), the host reports `sign-in-required`, and the key
works until it expires.

```quint
pure val renewalWindow = 180 * 86400000
pure def renewable(signedInAt: int, now: int): bool = now - signedInAt < renewalWindow
pure def lawNoRenewalPastTheWindow(signedInAt: int, now: int): bool = (now - signedInAt >= renewalWindow) implies not(renewable(signedInAt, now))
pure def canRenewed(s: Session, credentialId: str, expiresAt: int): bool =
  (s.phase == SignedIn or s.phase == ActivationPending) and credentialId != "" and credentialId != s.account.credentialId and expiresAt > s.account.expiresAt
pure def renewed(s: Session, credentialId: str, expiresAt: int): Session =
  { ...s, phase: SignedIn, account: { ...s.account, credentialId: credentialId, expiresAt: expiresAt }, expiryWarning: false, renewals: s.renewals + 1 }
pure val credentialIdValues = Set("c2", "c5")
pure val expiresAtValues = Set(6, 9)
pure def sometimesRenewed(s: Session): bool = s.renewals >= 1 and s.phase == SignedIn
```

### The expiry warning is the host's, and a refused key asks for a new sign-in

The host warns when fewer than three days remain and renewal is impossible or failed. A key Cloud
answered with 401 is refused: it stays saved, and the owner is asked to sign in now.

```quint
pure val expiryWarningLead = 14 * 86400000
pure def keyExpiringSoon(a: Account, now: int): bool = a.expiresAt > 0 and a.expiresAt - now <= expiryWarningLead
pure def canRenewalReported(s: Session, warning: bool, refused: bool): bool = s.phase == SignedIn or s.phase == ActivationPending
pure def renewalReported(s: Session, warning: bool, refused: bool): Session =
  { ...s, expiryWarning: warning or refused, phase: if (refused) KeyRefused else s.phase }
pure def canRejected(s: Session): bool = s.phase == SignedIn or s.phase == ActivationPending
pure def rejected(s: Session): Session = { ...s, phase: KeyRefused, expiryWarning: true }
pure def canExpire(s: Session, now: int): bool = isSignedIn(s.phase) and s.phase != KeyExpired and now >= s.account.expiresAt
pure def expire(s: Session, now: int): Session = { ...s, phase: KeyExpired, expiryWarning: true }
pure val nowValues = Set(4, 6, 9)
pure def alwaysARefusedKeyWarns(s: Session): bool = (s.phase == KeyRefused or s.phase == KeyExpired) implies s.expiryWarning
pure def sometimesKeyRefused(s: Session): bool = s.phase == KeyRefused
pure def sometimesKeyExpired(s: Session): bool = s.phase == KeyExpired
```

### Sign-out revokes exactly the key it was asked for, and the agent keeps running

Sign-out is fenced to the captured key: Cloud inference is unbound first, then, only while the
host still holds that key, Cloud's self-revocation route (`DELETE /api/v1/api-keys/current`) is
asked once and the host clears its credential state. Only a confirmed revocation reads as signed
out everywhere; any other answer is signed out here only. The agent is started again without Cloud inference.

```quint
pure def canBeginSignOut(s: Session, credentialId: str): bool =
  isSignedIn(s.phase) and s.holder == Free and credentialId == s.account.credentialId
pure def beginSignOut(s: Session, credentialId: str): SessionStep =
  { state: { ...s, holder: SigningOut }, out: List(UnbindInference, RevokeKey({ credentialId: credentialId })) }
pure def canSignOutSettled(s: Session, revoked: bool): bool = s.holder == SigningOut
pure def signOutSettled(s: Session, revoked: bool): SessionStep =
  drain(List(EnsureResident), { ...s, holder: Free, phase: SignedOut, account: noAccount, generation: s.generation + 1,
    expiryWarning: false, created: false, priorUnconfirmed: false, revocation: if (revoked) Revoked else HereOnly })
pure def revokesOnly(e: SessionEffect, credentialId: str): bool = match e { | RevokeKey(r) => r.credentialId == credentialId | _ => true }
pure def stepSignOutRevokesOnlyTheCapturedKey(before: Session, via: str, after: Session, out: List[SessionEffect]): bool =
  out.every(e => revokesOnly(e, before.account.credentialId))
pure def stepSignOutLeavesTheAgentRunning(before: Session, via: str, after: Session, out: List[SessionEffect]): bool =
  via == "signOutSettled" implies (out.includes(EnsureResident) and after.phase == SignedOut)
pure def alwaysSigningOutHasAnAccount(s: Session): bool = s.holder == SigningOut implies isSignedIn(s.phase)
pure def sometimesSignedOutHereOnly(s: Session): bool = s.revocation == HereOnly and s.phase == SignedOut
pure def sometimesSignedOutEverywhere(s: Session): bool = s.revocation == Revoked
```

## Story: Hear why a sign-in from the browser did not finish

> As the owner, I want to be told when a sign-in returned to Alpha without finishing, once, and
> only for the sign-in I am looking at, even when Alpha restarted meanwhile.

### A return without a result waits for startup and for the step in flight, and an outdated one is dropped

The host retains `signInIncomplete` across a restart: one that arrives before startup settles says
Alpha restarted. While a sign-in attempt or sign-out holds the slot, the notice waits; when the
slot frees, it is shown unless the account changed meanwhile. A saved key Cloud never confirmed is
removed by the host, which signs the session out.

```quint
type IncompleteCode = AppLinkUnverified | StorageFailed | ActivationExpired
pure def drain(extra: List[SessionEffect], s: Session): SessionStep =
  if (s.waiting == NoNotice or s.holder != Free or not(s.startupResolved)) { state: s, out: extra }
  else if (s.waiting == PlainNotice and s.waitingGeneration != s.generation) { state: { ...s, waiting: NoNotice, dropped: s.dropped + 1 }, out: extra }
  else { state: { ...s, waiting: NoNotice, notices: s.notices + 1 }, out: extra.append(ShowIncomplete({ restarted: s.waiting == RestartedNotice })) }
pure def canStartupSettles(s: Session): bool = s.loaded and not(s.startupResolved)
pure def startupSettles(s: Session): SessionStep = drain(List(), { ...s, startupResolved: true })
pure def canAttemptStarts(s: Session): bool = s.loaded and s.holder == Free
pure def attemptStarts(s: Session): Session = { ...s, holder: Attempt }
pure def canAttemptEnds(s: Session): bool = s.holder == Attempt
pure def attemptEnds(s: Session): SessionStep = drain(List(), { ...s, holder: Free })
pure def afterIncomplete(code: IncompleteCode, s: Session): Session =
  if (code == ActivationExpired and s.phase == ActivationPending)
    { ...s, phase: SignedOut, account: noAccount, generation: s.generation + 1, expiryWarning: false, created: false, priorUnconfirmed: false }
  else s
pure def canIncompleteArrives(s: Session, code: IncompleteCode): bool = s.loaded
pure def incompleteArrives(s: Session, code: IncompleteCode): SessionStep = {
  val cleared = afterIncomplete(code, s)
  if (s.holder != Free or not(s.startupResolved))
    { state: { ...cleared, waiting: if (s.waiting == RestartedNotice or not(s.startupResolved)) RestartedNotice else PlainNotice,
      waitingGeneration: cleared.generation }, out: List() }
  else { state: { ...cleared, notices: s.notices + 1 }, out: List(ShowIncomplete({ restarted: false })) }
}
pure def alwaysAWaitingNoticeHasAReason(s: Session): bool = s.waiting != NoNotice implies (s.holder != Free or not(s.startupResolved))
pure def sometimesRestartedNoticeShown(s: Session): bool = s.notices >= 1 and s.startupResolved and s.waiting == NoNotice and s.generation == 0
pure def sometimesOutdatedNoticeDropped(s: Session): bool = s.dropped >= 1
```

## Story: Use Cloud only for managed services

> As the owner, I want my phone to call Cloud only for sign-in, my plan and the managed services I
> use, never to host, provision or pair an agent.

### Only managed routes are admitted, the sign-in hand-off only with test mocks, and funds only on Eliza Cloud

The route table of `@elizaos/cloud/client` is the transport's; this is the product's admission over
it. Alpha Cloud has no in-app credit top-up.

```quint
type RouteKind = IdentityRoute | BillingRoute | EntitlementRoute | RedeemRoute | SelfRevokeRoute | GoogleRoute
  | MapsRoute | InferenceRoute | SpeechRoute | ReferralRoute | FundsRoute | ServiceInfoRoute
  | HostedAgentRoute | PairingRoute | HandOffRoute
pure def routeAdmitted(r: RouteKind, testMocks: bool, deployment: Deployment): bool =
  if (r == HostedAgentRoute or r == PairingRoute) false
  else if (r == HandOffRoute) testMocks
  else if (r == FundsRoute) deployment == ElizaCloud
  else true
pure def lawNoAgentIsHostedOrPaired(testMocks: bool, deployment: Deployment): bool =
  not(routeAdmitted(HostedAgentRoute, testMocks, deployment)) and not(routeAdmitted(PairingRoute, testMocks, deployment))
pure def lawTheHandOffNeedsTestMocks(deployment: Deployment): bool = not(routeAdmitted(HandOffRoute, false, deployment))
pure def lawAlphaCloudSellsNoCredits(testMocks: bool): bool = not(routeAdmitted(FundsRoute, testMocks, AlphaCloud))
```

## Story: Talk to my agent from the power button at cold start

> As the owner, a long press of the power button on the Alpha image while the phone starts opens
> voice only for the account I am signed in to, and never while sign-in or setup holds the phone.

### A protected power launch is claimed only for a settled, quiet production account with its agent connected

The account reference names the Cloud environment, the user and the organization, and is given
only once startup has settled, nothing is being signed in or out, the account's key may be used,
the environment is production and the agent is connected; the ids must be well-formed. Until
startup settles with nothing interactive open, the first restore is still pending and the launch
waits for it rather than being discarded.

```quint
pure def restorePending(resolved: bool, interactive: bool): bool = not(interactive) and not(resolved)
pure def powerLaunchClaimable(resolved: bool, interactive: bool, busy: bool, usable: bool, production: bool, connected: bool, wellFormedIds: bool): bool =
  resolved and not(interactive) and not(busy) and usable and production and connected and wellFormedIds
pure def lawAnInteractivePhoneNeverClaims(resolved: bool, busy: bool, usable: bool, production: bool, connected: bool, wellFormedIds: bool): bool =
  not(powerLaunchClaimable(resolved, true, busy, usable, production, connected, wellFormedIds))
pure def lawStagingNeverClaims(resolved: bool, interactive: bool, busy: bool, usable: bool, connected: bool, wellFormedIds: bool): bool =
  not(powerLaunchClaimable(resolved, interactive, busy, usable, false, connected, wellFormedIds))
pure def lawAPendingRestoreIsNeverClaimed(busy: bool, usable: bool, production: bool, connected: bool, wellFormedIds: bool): bool =
  restorePending(false, false) and not(powerLaunchClaimable(false, false, busy, usable, production, connected, wellFormedIds))
```
