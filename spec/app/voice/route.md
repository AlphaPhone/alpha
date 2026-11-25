# Where speech goes

Where Alpha sends the owner's voice to be heard and its replies to be
spoken: the owner's own provider key, Alpha Cloud when signed in and within
its limits, or the speech models on this phone. Every build carries the
phone's models, so the phone is always the fallback. A component with no
state of its own: [Voice](./index.md) holds one route and moves it only
through these rules.

## Story: Choose where speech is processed

> As the owner, I want my speech processed by the best service I set up,
> and on this phone when there is none, without having to choose each time.

### The route knows the owner's account or key, whether Cloud has limited it, the owner's answer to the disclosure, and a hold after a failure

The account's key tells one Cloud account or provider key from another; a
hold names the key it was placed for. Times are in seconds.

```quint
type Account = SignedOut | CloudAccount | OwnKey | OwnKeyWithoutVoice
type Way = OnPhone | ViaCloud | ViaOwnKey
type Route = { account: Account, key: int, limited: bool, consent: bool, declined: bool, holdKey: int, holdUntil: int }

pure val signedOut: Route =
  { account: SignedOut, key: 0, limited: false, consent: false, declined: false, holdKey: 0, holdUntil: 0 }

pure val rValues: Set[Route] =
  Set(signedOut)
    .union(Set({ ...signedOut, account: CloudAccount, key: 1, consent: true }))
    .union(Set({ ...signedOut, account: CloudAccount, key: 1, limited: true, consent: true }))
    .union(Set({ ...signedOut, account: OwnKey, key: 2, limited: true, consent: true }))
    .union(Set({ ...signedOut, account: CloudAccount, key: 1, holdKey: 1, holdUntil: 60 }))
    .union(Set({ ...signedOut, account: OwnKeyWithoutVoice, key: 3, consent: true }))
pure val keyValues = Set(1, 2)
pure val nowValues = Set(0, 59, 60, 700, 4000)
pure val waitValues = Set(0, 20, 120, 5000)
```

### The owner's own key with a voice is used first, then Cloud when signed in and not limited, otherwise this phone

A key without a voice, or no account at all, keeps speech on the phone.
Cloud's limits do not apply to the owner's own key.

```quint
pure def networked(r: Route): bool = r.account == CloudAccount or r.account == OwnKey

pure def held(r: Route, now: int): bool = r.holdUntil > 0 and r.holdKey == r.key and now < r.holdUntil

pure def wanted(r: Route, now: int): Way =
  if (not(networked(r)) or held(r, now)) OnPhone
  else if (r.account == OwnKey) ViaOwnKey
  else if (r.limited) OnPhone
  else ViaCloud

pure def lawYourOwnKeyIgnoresCloudLimits(r: Route, now: int): bool =
  (r.account == OwnKey and not(held(r, now))) implies wanted({ ...r, limited: true }, now) == ViaOwnKey

pure def lawWithoutAnAccountSpeechStaysOnThePhone(r: Route, now: int): bool =
  not(networked(r)) implies wanted(r, now) == OnPhone
```

### Speech leaves the phone only after the owner has agreed to the disclosure for that account

The disclosure says what is sent, and to whom. Declining keeps speech on the
phone and is not asked again for that account; a new account or key starts
unanswered. Signing in to Alpha Cloud is itself the answer for that account,
as in the existing app ([Voice](./index.md)), so only a new key of the
owner's own asks afresh.

```quint
pure def way(r: Route, now: int): Way = if (r.consent) wanted(r, now) else OnPhone

pure def asksConsent(r: Route, now: int): bool = wanted(r, now) != OnPhone and not(r.consent) and not(r.declined)

pure def decide(r: Route, agree: bool): Route = { ...r, consent: agree, declined: not(agree) }

pure def changeAccount(r: Route, account: Account, key: int): Route =
  { ...r, account: account, key: key, consent: false, declined: false }

pure def limit(r: Route, limited: bool): Route = { ...r, limited: limited }

pure def lawAudioLeavesThePhoneOnlyWithConsent(r: Route, now: int): bool =
  way(r, now) != OnPhone implies r.consent

pure def lawTheDisclosureIsAnsweredOnce(r: Route, agree: bool, now: int): bool =
  not(asksConsent(decide(r, agree), now))

pure def lawANewAccountAsksAgain(r: Route, account: Account, key: int, now: int): bool =
  way(changeAccount(r, account, key), now) == OnPhone
```

## Story: Keep talking when the network fails

> As the owner, I want a conversation to carry on on this phone when the
> network service fails, and Alpha not to keep trying a service that just
> failed.

### A failure of the network service holds speech on the phone: a minute after a brief failure, ten minutes after the account was refused, and the server's wait after a rate limit, never more than an hour

A rate limit with no stated wait holds for a minute. A sign-in failure falls
back without a hold. A failure that is not the network's, such as a
cancelled request or a recording with no speech, changes nothing.

```quint
type Fault = Brief | AccountRefused | RateLimited | SignInNeeded | NotTheNetwork

pure val briefHold = 60
pure val accountHold = 600
pure val longestHold = 3600

pure def holdFor(fault: Fault, wait: int): int =
  if (fault == Brief) briefHold
  else if (fault == AccountRefused) accountHold
  else if (fault == RateLimited) (if (wait <= 0) briefHold else if (wait > longestHold) longestHold else wait)
  else 0

pure def fallsBack(fault: Fault): bool = fault != NotTheNetwork

pure def noteFailure(r: Route, fault: Fault, wait: int, now: int): Route =
  if (holdFor(fault, wait) > 0 and networked(r)) { ...r, holdKey: r.key, holdUntil: now + holdFor(fault, wait) } else r

pure def lawABriefFailureHoldsAMinute(r: Route, now: int): bool =
  networked(r) implies noteFailure(r, Brief, 0, now).holdUntil == now + 60

pure def lawARefusedAccountHoldsTenMinutes(r: Route, wait: int, now: int): bool =
  networked(r) implies noteFailure(r, AccountRefused, wait, now).holdUntil == now + 600

pure def lawARateLimitHoldsForTheServersWait(r: Route, wait: int, now: int): bool =
  (networked(r) and wait > 0 and wait <= 3600) implies noteFailure(r, RateLimited, wait, now).holdUntil == now + wait

pure def lawAHoldIsNeverLongerThanAnHour(r: Route, fault: Fault, wait: int, now: int): bool =
  val after = noteFailure(r, fault, wait, now)
  after == r or after.holdUntil <= now + 3600

pure def lawAFailureOutsideTheNetworkChangesNothing(r: Route, wait: int, now: int): bool =
  noteFailure(r, NotTheNetwork, wait, now) == r and noteFailure(r, SignInNeeded, wait, now) == r
```

### While the hold lasts speech stays on the phone, and it lapses on its own

```quint
pure def lawAHeldRouteStaysOnThePhone(r: Route, fault: Fault, wait: int, now: int): bool =
  (networked(r) and holdFor(fault, wait) > 0 and now >= 0) implies way(noteFailure(r, fault, wait, now), now) == OnPhone

pure def lawAHoldLapses(r: Route): bool = not(held(r, r.holdUntil))
```

### A hold belongs to the account or key it was placed for

```quint
pure def lawAHoldBelongsToItsAccount(r: Route, account: Account, key: int, now: int): bool =
  key != r.holdKey implies not(held(changeAccount(r, account, key), now))
```

### When the phone's own speech is unavailable, nothing is held, since the network is all there is

```quint
pure def clearHold(r: Route): Route = { ...r, holdKey: 0, holdUntil: 0 }

pure def lawWithoutThePhonesSpeechNothingIsHeld(r: Route, now: int): bool = not(held(clearHold(r), now))
```
