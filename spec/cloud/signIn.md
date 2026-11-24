# Sign-in

How the phone turns a sign-in into a key of its own: it opens the hosted
sign-in, takes back the return the web host forwards (see
[Edge](./edge.md)), exchanges the code for a key, writes the key to the
phone's secure store, and only then acknowledges it to the cloud. How the
owner chooses a method and types an emailed code is the account screen's;
this spec is the transport underneath, and the key never leaves the secure
store for the page.

## Story: Sign in through the cloud

> As the owner, I want signing in to end with a key that only my phone
> holds, so that neither the page nor anything listening on the way can use
> my account.

### A sign-in is signed out, waiting for its return, exchanging the code, keeping the key, acknowledging it, or signed in

Each sign-in has its own attempt number, which its return must carry, and
a deadline for that return. The key is a secret: it appears only in what
is written to the secure store.

```quint
import attempt as A from "../kit/attempt"

type Stage = SignedOut | Authorizing | Exchanging | Keeping | Acknowledging | SignedIn
type Returned = Code | Denied | Malformed
type SecretKey = str
type Effect =
  | Open({ attempt: int })
  | Exchange({ attempt: int })
  | Keep({ credential: int, key: SecretKey })
  | Acknowledge({ credential: int })
  | Forget({ credential: int, revoke: bool })
type SignIn = {
  stage: Stage, attempt: int, deadline: int, clock: int,
  exchange: A::Attempt, acknowledgement: A::Attempt, credential: int,
}
type Moved = { state: SignIn, out: List[Effect] }

pure val returnWindow = 600

pure val initial: SignIn = {
  stage: SignedOut, attempt: 0, deadline: 0, clock: 0,
  exchange: A::plan(0), acknowledgement: A::plan(0), credential: 0,
}

pure val nowValues = Set(0, 60, 600, 700)
pure val attemptValues = Set(0, 1, 2)
pure val credentialValues = Set(0, 1, 2)
```

### Starting a sign-in opens the hosted sign-in under a new attempt number, and a return to an earlier one is no longer taken

Time only moves forward: an event that reports an earlier time is refused.

```quint
pure def canAuthorize(s: SignIn, now: int): bool =
  (s.stage == SignedOut or s.stage == Authorizing) and now >= s.clock

pure def authorize(s: SignIn, now: int): Moved =
  val attempt = s.attempt + 1
  { state: { ...s, stage: Authorizing, attempt: attempt, deadline: now + returnWindow, clock: now },
    out: List(Open({ attempt: attempt })) }
```

### Only a return for the attempt under way is taken, once; one with a code before its deadline is sent for exchange, and any other ends the sign-in

A denial, a return with no usable code, or one after its deadline uses the
attempt up: the owner starts again.

```quint
pure def canComeBack(s: SignIn, attempt: int, kind: Returned, now: int): bool =
  s.stage == Authorizing and attempt == s.attempt and now >= s.clock

pure def comeBack(s: SignIn, attempt: int, kind: Returned, now: int): Moved =
  if (kind == Code and now < s.deadline)
    { state: { ...s, stage: Exchanging, clock: now, exchange: A::dispatch(A::record(A::plan(attempt))) },
      out: List(Exchange({ attempt: attempt })) }
  else { state: { ...s, stage: SignedOut, clock: now }, out: List() }
```

### The exchange's own answer is taken once: a key is written to the secure store, and a refusal or a lost answer ends the sign-in

The code is spent either way, so an exchange is never sent again.

```quint
pure def canExchanged(s: SignIn, attempt: int, credential: int): bool =
  s.stage == Exchanging and A::canConclude(s.exchange, attempt) and credential > 0

pure def exchanged(s: SignIn, attempt: int, credential: int, key: SecretKey): Moved =
  { state: { ...s, stage: Keeping, credential: credential, exchange: A::conclude(s.exchange, true, true) },
    out: List(Keep({ credential: credential, key: key })) }

pure def canExchangeFailed(s: SignIn, attempt: int): bool =
  s.stage == Exchanging and A::canConclude(s.exchange, attempt)

pure def exchangeFailed(s: SignIn, attempt: int, known: bool): SignIn =
  { ...s, stage: SignedOut, exchange: A::conclude(s.exchange, false, known) }
```

### The key is acknowledged only once the secure store holds it

If the store cannot keep it, the sign-in ends unacknowledged, and the cloud
never activates the key.

```quint
pure def canKept(s: SignIn, credential: int): bool = s.stage == Keeping and credential == s.credential

pure def kept(s: SignIn, credential: int): Moved =
  { state: { ...s, stage: Acknowledging, acknowledgement: A::dispatch(A::record(A::plan(s.attempt))) },
    out: List(Acknowledge({ credential: credential })) }

pure def canKeepFailed(s: SignIn, credential: int): bool = s.stage == Keeping and credential == s.credential

pure def keepFailed(s: SignIn, credential: int): SignIn = { ...s, stage: SignedOut, credential: 0 }
```

### An acknowledged key signs the phone in; a refused one is forgotten, and one whose answer was lost is forgotten and revoked

```quint
pure def canAcknowledged(s: SignIn, attempt: int): bool =
  s.stage == Acknowledging and A::canConclude(s.acknowledgement, attempt)

pure def acknowledged(s: SignIn, attempt: int, confirmed: bool, known: bool): Moved =
  val concluded = { ...s, acknowledgement: A::conclude(s.acknowledgement, confirmed, known) }
  if (confirmed and known) { state: { ...concluded, stage: SignedIn }, out: List() }
  else { state: { ...concluded, stage: SignedOut, credential: 0 },
    out: List(Forget({ credential: s.credential, revoke: not(known) })) }
```

### Signing out forgets the key and revokes it

```quint
pure def canSignOut(s: SignIn): bool = s.stage == SignedIn

pure def signOut(s: SignIn): Moved =
  { state: { ...s, stage: SignedOut, credential: 0 }, out: List(Forget({ credential: s.credential, revoke: true })) }
```

### A key handed to the secure store is always either kept and acknowledged, or forgotten

The phone never stays holding a key the store has not answered for.

```quint
pure val fair_kept = "weak"
pure val fair_keepFailed = "weak"

pure def leadsToTheStoreAnswers(s: SignIn, later: SignIn): bool = s.stage == Keeping implies later.stage != Keeping
```

### Signed in means the cloud confirmed both the exchange and the acknowledgement of this phone's key

```quint
pure def alwaysSignedInIsAcknowledged(s: SignIn): bool =
  s.stage == SignedIn implies (s.exchange.outcome == A::Confirmed and s.acknowledgement.outcome == A::Confirmed)
```

### The phone holds a credential exactly while it keeps, acknowledges or uses a key the exchange returned

```quint
pure def holdsKey(s: SignIn): bool = s.stage == Keeping or s.stage == Acknowledging or s.stage == SignedIn

pure def alwaysACredentialCameFromTheExchange(s: SignIn): bool =
  (s.credential > 0 iff holdsKey(s)) and (holdsKey(s) implies s.exchange.outcome == A::Confirmed)
```

### An exchange or an acknowledgement in flight belongs to the attempt under way

```quint
pure def alwaysWhatIsInFlightIsThisAttempts(s: SignIn): bool =
  (s.stage == Exchanging implies (s.exchange.outcome == A::Sent and s.exchange.id == s.attempt))
    and (s.stage == Acknowledging implies (s.acknowledgement.outcome == A::Sent and s.acknowledgement.id == s.attempt))
```

### The key is written only to the secure store, only from the exchange's answer, and acknowledged only after it was kept

```quint
pure def stepTheKeyGoesOnlyToTheStore(before: SignIn, via: str, after: SignIn, out: List[Effect]): bool =
  out.every(e => match e {
    | Keep(k) => via == "exchanged" and k.credential == after.credential
    | Acknowledge(a) => via == "kept" and before.stage == Keeping
    | Exchange(x) => via == "comeBack" and x.attempt == before.attempt
    | _ => true
  })
```

### A return is taken at most once

```quint
pure def stepAReturnIsUsedOnce(before: SignIn, via: str, after: SignIn): bool =
  via == "comeBack" implies after.stage != Authorizing
```

### Time never goes back

```quint
pure def stepTimeNeverGoesBack(before: SignIn, after: SignIn): bool = after.clock >= before.clock
```

### A return carrying another attempt's number is refused

```quint
pure def lawAReturnForAnotherAttemptIsRefused(attempt: int, other: int, kind: Returned, now: int): bool =
  other != attempt implies not(canComeBack({ ...initial, stage: Authorizing, attempt: attempt }, other, kind, now))
```

### The phone can be signed in

```quint
pure def sometimesSignedIn(s: SignIn): bool = s.stage == SignedIn
```

### A sign-in can wait on its acknowledgement

```quint
pure def sometimesAcknowledging(s: SignIn): bool = s.stage == Acknowledging
```

### An exchange's answer can be lost, and the owner starts again

```quint
pure def sometimesExchangeLost(s: SignIn): bool = s.exchange.outcome == A::Unknown and s.stage == SignedOut
```

## Story: Keep the key out of the page

> As the owner, I want the page and the agent to know only whether I am
> signed in, never my key.

### The page sees the stage and the credential's number, never the key

The key is a secret, so `check` refuses the spec if it, or anything
decided by it, could reach what the page sees.

```quint
type Seen = { stage: Stage, credential: int }

pure def seen(s: SignIn): Seen = { stage: s.stage, credential: s.credential }
```

### A sign-in that was never acknowledged leaves no key behind after a restart

What is in memory is lost; the secure store and the signed-in stage
survive. A key kept but not yet acknowledged is forgotten, and revoked if
the acknowledgement may have reached the cloud.

```quint
pure def restart(s: SignIn): Moved =
  if (s.stage == Keeping or s.stage == Acknowledging)
    { state: { ...s, stage: SignedOut, credential: 0 },
      out: List(Forget({ credential: s.credential, revoke: s.stage == Acknowledging })) }
  else if (s.stage == SignedIn) { state: s, out: List() }
  else { state: { ...s, stage: SignedOut }, out: List() }

pure def stepARestartKeepsOnlyASignIn(before: SignIn, via: str, after: SignIn): bool =
  via == "restart" implies (after.stage == SignedOut or before.stage == SignedIn)
```
