# Local cloud

The same cloud on a developer's computer, built from the pinned upstream
with the product's own identity: an identity service in memory whose mail
goes to a sink on the computer, never to a mailbox; the API; and one TLS
front door that the phone, or the Android emulator, reaches over loopback.
Its check is the evidence that the product's contract is served without the
cloud it ships against today (see [Cloud](./index.md)). A passing check is
a local result only: not a deployed cloud, an APK, an emulator or a device
result.

## Story: Check the product's contract on my computer

> As a developer, I want to start the whole cloud locally and run the
> phone's contract against it, so that I know the product works without
> borrowing anyone else's cloud.

### The local cloud is stopped or running, and its check has passed some gates in order, or failed at one

The gates, in order: the app's registration is read from the database;
sign-in by an emailed code delivered to the sink, then the app's
authorization, the key minted and acknowledged; the account, the service
terms, the entitlement keys and route, the subscription and the referrals
are read with that key; a billing route refuses the phone's key and
accepts a proven session; the web host serves the asset links and forwards
the sign-in return while refusing an unregistered path; the key is revoked
and then refused; and no answer names a host of the cloud shipped today.

```quint
type Gate = Registration | SignIn | Reads | BillingSession | WebHost | Revocation | Isolation
type Local = { mocks: bool, running: bool, checking: bool, passed: int, failed: bool }

pure def gateAt(i: int): Gate =
  if (i <= 0) Registration else if (i == 1) SignIn else if (i == 2) Reads else if (i == 3) BillingSession
  else if (i == 4) WebHost else if (i == 5) Revocation else Isolation

pure val gates = 7

pure val initial: Local = { mocks: false, running: false, checking: false, passed: 0, failed: false }
```

### The local cloud starts only in a development session that allows mocks, and stops with every part together

Mocks, fixtures and developer surfaces exist only where development allows
them, never in a production build.

```quint
pure def canStart(s: Local, mocks: bool): bool = mocks and not(s.running)

pure def start(s: Local, mocks: bool): Local = { mocks: mocks, running: true, checking: false, passed: 0, failed: false }

pure def canStop(s: Local): bool = s.running

pure def stop(s: Local): Local = { ...s, running: false, checking: false }
```

### A check starts afresh on a running cloud

```quint
pure def canBeginCheck(s: Local): bool = s.running and not(s.checking)

pure def beginCheck(s: Local): Local = { ...s, checking: true, passed: 0, failed: false }
```

### Each gate is tried only after every gate before it passed; a failed gate ends the check

```quint
pure def canGate(s: Local, ok: bool): bool = s.checking and s.passed < gates

pure def gate(s: Local, ok: bool): Local =
  if (ok) { ...s, passed: s.passed + 1, checking: s.passed + 1 < gates }
  else { ...s, failed: true, checking: false }

pure def succeeded(s: Local): bool = s.passed == gates and not(s.failed)
```

### The local cloud runs only where mocks are allowed

```quint
pure def alwaysRunsOnlyWithMocks(s: Local): bool = s.running implies s.mocks
```

### A check runs only on a running cloud, and stops at its first failed gate

```quint
pure def alwaysChecksOnlyWhileRunning(s: Local): bool =
  (s.checking implies (s.running and not(s.failed) and s.passed < gates)) and 0 <= s.passed and s.passed <= gates
```

### Gates pass one at a time, in order

```quint
pure def stepGatesPassInOrder(before: Local, via: str, after: Local): bool =
  (after.passed > before.passed) implies (via == "gate" and after.passed == before.passed + 1 and before.checking)
```

### A check that starts always ends, passed or failed

Each gate's answer is awaited; the check never hangs between gates.

```quint
pure val fair_gate = "weak"

pure def leadsToACheckEnds(s: Local, later: Local): bool = s.checking implies not(later.checking)
```

### The whole contract can pass

```quint
pure def sometimesPassed(s: Local): bool = succeeded(s)
```

### A gate can fail

```quint
pure def sometimesFailed(s: Local): bool = s.failed and s.passed > 0
```
