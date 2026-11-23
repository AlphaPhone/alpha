# Provisioning

How an operator brings a deployment of the product's own cloud up, from
the pinned upstream source and the data this product owns: its public
policy (see [Cloud](./index.md)), its resource ids, and a private file of
secrets per environment that never enters the repository. Every step is
read back before the next one runs; staging goes first, and production
follows only once staging answers at the same pin.

## Story: Bring a deployment up, one confirmed step at a time

> As the operator, I want each step to be confirmed before the next, and
> production to follow a staging that already works, so that a half-done
> deployment never takes phones' sign-ins or payments.

### The steps run in one order, the same for staging and production

Prepare exports, installs and builds the pinned upstream outside its
checkout. Render writes every Worker's configuration and checks it by
bundling without the network. Register prints the app's registration: its
callback, package and release signer. Secrets completes the private file
and checks it. Provision creates or recovers the key-value namespace, the
blob bucket, the database connection and the DNS records, and confirms each
by reading it back. Preflight reads those resources again without changing
them. Identity reports the database's redacted identity receipts for the
operator to review. Migrate applies the upstream migrations under those
receipts. Seed registers the app and its mobile sign-in clients. Deploy
uploads the API, the identity service and the edge Worker, each with its
secrets. Tenant creates the identity tenant with open sign-up. Pricing
fills the model price catalogue, without which inference refuses every
request. Smoke probes, without credentials, what a phone needs.

```quint
type Environment = Staging | Production
type Step = Prepare | Render | Register | Secrets | Provision | Preflight | Identity | Migrate | Seed | Deploy | Tenant | Pricing | Smoke

pure val total = 13

pure def taskAt(i: int): Step =
  if (i <= 0) Prepare else if (i == 1) Render else if (i == 2) Register else if (i == 3) Secrets
  else if (i == 4) Provision else if (i == 5) Preflight else if (i == 6) Identity else if (i == 7) Migrate
  else if (i == 8) Seed else if (i == 9) Deploy else if (i == 10) Tenant else if (i == 11) Pricing else Smoke

pure def order(task: Step): int =
  if (task == Prepare) 0 else if (task == Render) 1 else if (task == Register) 2 else if (task == Secrets) 3
  else if (task == Provision) 4 else if (task == Preflight) 5 else if (task == Identity) 6 else if (task == Migrate) 7
  else if (task == Seed) 8 else if (task == Deploy) 9 else if (task == Tenant) 10 else if (task == Pricing) 11 else 12
```

### Every step finds the stores and providers it depends on supplied by a step before it

Two databases (the cloud's and the identity service's), a rate-limit
store and a blob store; mail for sign-in codes, inference, speech,
payments and Google. The secrets supply the databases, the rate-limit
store and every provider's key (speech falls back to the platform's own
without one); provisioning supplies the blob store.

```quint
type Need = CloudDatabase | IdentityDatabase | RateLimitStore | BlobStore | Mail | Inference | Speech | Payments | Google

pure val everything: Set[Need] =
  Set(CloudDatabase, IdentityDatabase, RateLimitStore, BlobStore, Mail, Inference, Speech, Payments, Google)

pure def supplies(task: Step): Set[Need] =
  if (task == Secrets) Set(CloudDatabase, IdentityDatabase, RateLimitStore, Mail, Inference, Speech, Payments, Google)
  else if (task == Provision) Set(BlobStore)
  else Set()

pure def needs(task: Step): Set[Need] =
  if (task == Provision or task == Identity or task == Migrate or task == Seed) Set(CloudDatabase)
  else if (task == Preflight) Set(CloudDatabase, BlobStore)
  else if (task == Tenant) Set(IdentityDatabase, Mail)
  else if (task == Pricing) Set(Inference)
  else if (task == Deploy or task == Smoke) everything
  else Set()

pure def suppliedBefore(task: Step): Set[Need] =
  if (order(task) > order(Provision)) supplies(Secrets).union(supplies(Provision))
  else if (order(task) > order(Secrets)) supplies(Secrets)
  else Set()

pure def lawEachStepFindsWhatItNeeds(task: Step): bool = needs(task).subseteq(suppliedBefore(task))
```

### Each environment records how many steps were read back, whether one is running, whether the last read-back failed, and the pin it is at

```quint
type Trigger = ByHandOnMain | ByHandElsewhere | Scheduled
type Migration = Complete | Paused | Broken
type Progress = { done: int, running: bool, failed: bool, pin: int }
type Provisioning = { pin: int, staging: Progress, production: Progress }
type Effect = Run({ environment: Environment, task: Step, trigger: Trigger })
type Moved = { state: Provisioning, out: List[Effect] }

pure def fresh(pin: int): Progress = { done: 0, running: false, failed: false, pin: pin }

pure val initial: Provisioning = { pin: 0, staging: fresh(0), production: fresh(0) }

pure def progress(s: Provisioning, environment: Environment): Progress =
  if (environment == Staging) s.staging else s.production

pure def withProgress(environment: Environment, p: Progress, s: Provisioning): Provisioning =
  if (environment == Staging) { ...s, staging: p } else { ...s, production: p }

pure def live(p: Progress, pin: int): bool = p.done == total and p.pin == pin

pure val pinValues = Set(1, 2)
pure val completeValues = Set(true)
pure val separateValues = Set(true)
pure val weight_launch = 6
pure val weight_readBack = 6
pure val weight_secretsRead = 3
pure val weight_identityRead = 3
pure val weight_migrated = 3
pure val weight_smoked = 3
```

### A new upstream pin starts both environments again from the first step, once nothing is running

```quint
pure def canAdvance(s: Provisioning, pin: int): bool =
  pin > s.pin and not(s.staging.running) and not(s.production.running)

pure def advance(s: Provisioning, pin: int): Provisioning = { pin: pin, staging: fresh(pin), production: fresh(pin) }
```

### A step runs only once the step before it was read back, one at a time per environment; production runs only after staging is up at the same pin; and a deploy runs only by hand from the main branch

```quint
pure def canLaunch(s: Provisioning, environment: Environment, trigger: Trigger): bool =
  val p = progress(s, environment)
  not(p.running) and p.done < total and p.pin == s.pin
    and (environment == Production implies live(s.staging, s.pin))
    and (taskAt(p.done) == Deploy implies trigger == ByHandOnMain)

pure def launch(s: Provisioning, environment: Environment, trigger: Trigger): Moved =
  val p = progress(s, environment)
  { state: withProgress(environment, { ...p, running: true }, s),
    out: List(Run({ environment: environment, task: taskAt(p.done), trigger: trigger })) }
```

### A read-back settles the running step: it counts only if it passed, and a step that failed may run again

Any step can fail as it runs; the steps below the next one each say what
their read-back checks.

```quint
pure def afterReadBack(passes: bool, p: Progress): Progress =
  { ...p, running: false, failed: not(passes), done: if (passes) p.done + 1 else p.done }

pure def awaits(s: Provisioning, environment: Environment, task: Step): bool =
  val p = progress(s, environment)
  p.running and taskAt(p.done) == task

pure def special(task: Step): bool = task == Secrets or task == Identity or task == Migrate or task == Smoke

pure def canReadBack(s: Provisioning, environment: Environment): bool =
  val p = progress(s, environment)
  p.running and not(special(taskAt(p.done)))

pure def readBack(s: Provisioning, environment: Environment): Provisioning =
  withProgress(environment, afterReadBack(true, progress(s, environment)), s)

pure def canReadBackFailed(s: Provisioning, environment: Environment): bool = progress(s, environment).running

pure def readBackFailed(s: Provisioning, environment: Environment): Provisioning =
  withProgress(environment, afterReadBack(false, progress(s, environment)), s)
```

### The secrets pass only when every required value is present, the two databases are separate, and the payments key is a live key in production and a test key in staging

```quint
pure def secretsPass(environment: Environment, complete: bool, separate: bool, liveKey: bool): bool =
  complete and separate and (liveKey == (environment == Production))

pure def canSecretsRead(s: Provisioning, environment: Environment): bool = awaits(s, environment, Secrets)

pure def secretsRead(s: Provisioning, environment: Environment, complete: bool, separate: bool, liveKey: bool): Provisioning =
  withProgress(environment, afterReadBack(secretsPass(environment, complete, separate, liveKey), progress(s, environment)), s)

pure def lawPaymentKeysMatchTheEnvironment(complete: bool, separate: bool): bool =
  not(secretsPass(Staging, complete, separate, true)) and not(secretsPass(Production, complete, separate, false))
```

### The database identity passes only when its receipts match the ones the operator reviewed

```quint
pure def canIdentityRead(s: Provisioning, environment: Environment): bool = awaits(s, environment, Identity)

pure def identityRead(s: Provisioning, environment: Environment, matches: bool): Provisioning =
  withProgress(environment, afterReadBack(matches, progress(s, environment)), s)
```

### A migration counts only when the migrator says it completed; one that paused at a release barrier does not

```quint
pure def canMigrated(s: Provisioning, environment: Environment): bool = awaits(s, environment, Migrate)

pure def migrated(s: Provisioning, environment: Environment, ending: Migration): Provisioning =
  withProgress(environment, afterReadBack(ending == Complete, progress(s, environment)), s)
```

### The smoke test passes only when every probe does

The probes: which API environment answered, the terms and privacy text,
the published entitlement keys, the app's exact registration and callback,
the plan catalogue, the sign-in providers, the asset links for the release
signer, and the hosted callback page.

```quint
pure def canSmoked(s: Provisioning, environment: Environment): bool = awaits(s, environment, Smoke)

pure def smoked(s: Provisioning, environment: Environment, probes: bool): Provisioning =
  withProgress(environment, afterReadBack(probes, progress(s, environment)), s)
```

### Production has begun only after staging was up at the same pin

```quint
pure def alwaysProductionFollowsStaging(s: Provisioning): bool =
  (s.production.done > 0 or s.production.running) implies live(s.staging, s.production.pin)
```

### Both environments are at the current pin, and neither has read back more steps than there are

```quint
pure def alwaysProgressIsOnThePin(s: Provisioning): bool =
  s.staging.pin == s.pin and s.production.pin == s.pin
    and 0 <= s.staging.done and s.staging.done <= total and 0 <= s.production.done and s.production.done <= total
```

### A step runs only while one is left to run

Discovered by the proof: without it, a passing smoke test could not be
shown to stop at the last step, nor a staging smoke test to leave a
production that has begun alone.

```quint
pure def alwaysARunningStepIsLeft(s: Provisioning): bool =
  (s.staging.running implies s.staging.done < total) and (s.production.running implies s.production.done < total)
```

### A step counts only through its own read-back, one at a time

```quint
pure def readBacks(via: str): bool =
  via == "readBack" or via == "readBackFailed" or via == "secretsRead" or via == "identityRead" or via == "migrated" or via == "smoked"

pure def stepStepsCountOneAtATime(before: Provisioning, via: str, after: Provisioning): bool =
  (after.staging.done == before.staging.done or via == "advance"
    or (after.staging.done == before.staging.done + 1 and readBacks(via)))
  and (after.production.done == before.production.done or via == "advance"
    or (after.production.done == before.production.done + 1 and readBacks(via)))
```

### What runs is the next step of its environment, and a deploy is always by hand from the main branch

```quint
pure def stepRunsAreInOrder(before: Provisioning, after: Provisioning, out: List[Effect]): bool =
  out.every(e => match e {
    | Run(r) => taskAt(progress(before, r.environment).done) == r.task
        and not(progress(before, r.environment).running)
        and (r.task == Deploy implies r.trigger == ByHandOnMain)
  })
```

### A migration that paused, or any step that failed, does not count

```quint
pure def lawOnlyACompleteMigrationCounts(ending: Migration, done: int, pin: int): bool =
  val p = { done: done, running: true, failed: false, pin: pin }
  afterReadBack(ending == Complete, p).done == (if (ending == Complete) done + 1 else done)
```

### A step that runs is always read back, passed or failed

The operator never leaves a step running without knowing how it ended,
so the next step, or a retry, can follow.

```quint
pure val fair_readBack = "weak"
pure val fair_readBackFailed = "weak"
pure val fair_secretsRead = "weak"
pure val fair_identityRead = "weak"
pure val fair_migrated = "weak"
pure val fair_smoked = "weak"

pure def leadsToARunningStepIsReadBack(s: Provisioning, later: Provisioning): bool =
  (s.staging.running implies not(later.staging.running)) and (s.production.running implies not(later.production.running))
```

### Staging can be up

```quint
pure def sometimesStagingUp(s: Provisioning): bool = live(s.staging, s.pin) and s.production.done == 0
```

### Production can be up

```quint
pure def sometimesProductionUp(s: Provisioning): bool = live(s.production, s.pin)
```

### A step can fail and wait to run again

```quint
pure def sometimesAStepFailed(s: Provisioning): bool = s.staging.failed and not(s.staging.running)
```
