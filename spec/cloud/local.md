# Local cloud

eliza's own cloud server (`elizaos-cloud serve` from the pinned checkout)
on this computer, under Alpha's staging profile and seed, over a PGlite
database of the run, with the staging mailbox that keeps each sign-in code
on the computer. Its check is the evidence that eliza's cloud serves what
Alpha needs under Alpha's own profile. A passing check is a local result
only: not a deployed cloud, an APK, an emulator or a device result.

## Story: Check Alpha's contract on my computer

> As a developer, I want to start eliza's cloud locally under Alpha's own
> profile and walk what the phone needs of it, so that I know Alpha works
> with the cloud before anyone deploys it.

### The local cloud is stopped or running, and its check has passed some gates in order, or failed at one

The gates, in order: health; the public service document names Alpha; the
sign-in methods offer the emailed code; the asset links name Alpha's package
and signers (`./index.md`); a sign-in by the code mailed to the staging
mailbox; a device key minted and acknowledged for Alpha's client; the
account, the entitlement and the plans read with that key through eliza's
own client; and a billing route refused to the key, which proves no
session.

```quint
type Gate = Health | ServiceDocument | SignInMethods | AssetLinks | EmailedCode | DeviceKey | KeyedReads | BillingRefused
type Local = { loopback: bool, running: bool, checking: bool, passed: int, failed: bool }

pure def gateAt(i: int): Gate =
  if (i <= 0) Health else if (i == 1) ServiceDocument else if (i == 2) SignInMethods else if (i == 3) AssetLinks
  else if (i == 4) EmailedCode else if (i == 5) DeviceKey else if (i == 6) KeyedReads else BillingRefused

pure val gates = 8

pure val initial: Local = { loopback: false, running: false, checking: false, passed: 0, failed: false }
```

### The local cloud starts only for a profile whose database, mail, text messages and providers are all on this computer, and stops with every part together

The database is PGlite in a directory of the run; mail and text messages
are eliza's loopback adapters; every provider the profile names (payments,
models, speech, maps, Google) is on a loopback address. A profile that names
anything else is refused before any process starts.

```quint
pure def canStart(s: Local, loopback: bool): bool = loopback and not(s.running)

pure def start(s: Local, loopback: bool): Local = { loopback: loopback, running: true, checking: false, passed: 0, failed: false }

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

### The local cloud runs only on this computer

```quint
pure def alwaysRunsOnlyOnLoopback(s: Local): bool = s.running implies s.loopback
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

Each gate waits for what the cloud answers under a bounded deadline; the
check never hangs between gates.

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
