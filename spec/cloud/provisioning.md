# Provisioning

How an operator brings a deployment of eliza's cloud up for Alpha, with
eliza's own operator commands (`.eliza/spec/cloud/operator.md`) and the
files `apps/cloud` keeps: a profile per environment and Alpha's
registration. Secrets stay in the operator's own environment and never
enter the repository; a profile only names them. Every step is read back
before the next one runs; staging goes first, and production follows only
once staging is up at the same pin.

Where the deployment is the shipped Eliza Cloud, its operator runs these
steps with the registration `apps/cloud` prints; nothing here deploys.
`--seed` is for the local cloud alone: eliza refuses it outside staging
(`spec/cloud/deployment.md`, "An instance starts only for an accepted
profile, on its environment's own readable database, seeded only in staging,
with loopback delivery only on PGlite"), and a deployment registers Alpha by
`client apply`.

## Story: Bring a deployment up, one confirmed step at a time

> As the operator, I want each step to be confirmed before the next, and
> production to follow a staging that already works, so that a half-done
> deployment never takes phones' sign-ins or payments.

### The steps run in one order, the same for staging and production, each one command

Check runs Alpha's own check of its profiles, registration and asset links.
Migrate applies eliza's migrations to the environment's own database, which
eliza refuses for another environment's identity. Register applies Alpha's
registration file and keeps eliza's receipt. Prices checks the payment
provider's catalog against eliza's plans. Serve starts the cloud with the
profile, the secrets it names in the operator's environment and the
environment's database. Smoke reads, without a credential, what a phone
needs before it signs in: health, the service document naming Alpha, the
sign-in methods and Alpha's asset links (`./local.md`, its first four
gates).

```quint
type Environment = Staging | Production
type Step = Check | Migrate | Register | Prices | Serve | Smoke

pure val total = 6

pure def taskAt(i: int): Step =
  if (i <= 0) Check else if (i == 1) Migrate else if (i == 2) Register
  else if (i == 3) Prices else if (i == 4) Serve else Smoke

pure def commandOf(task: Step): str =
  if (task == Check) "node apps/cloud/dist/src/main.js check"
  else if (task == Migrate) "elizaos-cloud migrate --profile <profile> --environment <environment> --store <database>"
  else if (task == Register) "elizaos-cloud client apply --file <registration> --profile <profile> --environment <environment> --store <database>"
  else if (task == Prices) "elizaos-cloud prices check --profile <profile> --environment <environment>"
  else if (task == Serve) "elizaos-cloud serve --profile <profile> --environment <environment> --store <database>"
  else "GET /api/health, /api/public/service, /api/v1/auth/methods and /.well-known/assetlinks.json at the environment's cloud"
```

### Each environment records how many steps were read back, whether one is running, whether the last read-back failed, and the pin it is at

```quint
type Trigger = ByHandOnMain | ByHandElsewhere | Scheduled
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
pure val weight_launch = 6
pure val weight_readBack = 6
```

### A new eliza pin starts both environments again from the first step, once nothing is running

```quint
pure def canAdvance(s: Provisioning, pin: int): bool =
  pin > s.pin and not(s.staging.running) and not(s.production.running)

pure def advance(s: Provisioning, pin: int): Provisioning = { pin: pin, staging: fresh(pin), production: fresh(pin) }
```

### A step runs only once the step before it was read back, one at a time per environment; production runs only after staging is up at the same pin; and a serve runs only by hand from the main branch

```quint
pure def canLaunch(s: Provisioning, environment: Environment, trigger: Trigger): bool =
  val p = progress(s, environment)
  not(p.running) and p.done < total and p.pin == s.pin
    and (environment == Production implies live(s.staging, s.pin))
    and (taskAt(p.done) == Serve implies trigger == ByHandOnMain)

pure def launch(s: Provisioning, environment: Environment, trigger: Trigger): Moved =
  val p = progress(s, environment)
  { state: withProgress(environment, { ...p, running: true }, s),
    out: List(Run({ environment: environment, task: taskAt(p.done), trigger: trigger })) }
```

### A read-back settles the running step: it counts only if it passed, and a step that failed may run again

Each step is read back by what its command answers: the check's exit, the
migrations eliza reports applied, the receipt of `client apply` naming
Alpha's client, the verified catalog, health at the environment's cloud, and
every smoke read.

```quint
pure def afterReadBack(passes: bool, p: Progress): Progress =
  { ...p, running: false, failed: not(passes), done: if (passes) p.done + 1 else p.done }

pure def canReadBack(s: Provisioning, environment: Environment, passes: bool): bool = progress(s, environment).running

pure def readBack(s: Provisioning, environment: Environment, passes: bool): Provisioning =
  withProgress(environment, afterReadBack(passes, progress(s, environment)), s)
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

Discovered by the proof: without it, a passing smoke read could not be
shown to stop at the last step, nor a staging smoke read to leave a
production that has begun alone.

```quint
pure def alwaysARunningStepIsLeft(s: Provisioning): bool =
  (s.staging.running implies s.staging.done < total) and (s.production.running implies s.production.done < total)
```

### A step counts only through its own read-back, one at a time

```quint
pure def stepStepsCountOneAtATime(before: Provisioning, via: str, after: Provisioning): bool =
  (after.staging.done == before.staging.done or via == "advance"
    or (after.staging.done == before.staging.done + 1 and via == "readBack"))
  and (after.production.done == before.production.done or via == "advance"
    or (after.production.done == before.production.done + 1 and via == "readBack"))
```

### What runs is the next step of its environment, and a serve is always by hand from the main branch

```quint
pure def stepRunsAreInOrder(before: Provisioning, after: Provisioning, out: List[Effect]): bool =
  out.every(e => match e {
    | Run(r) => taskAt(progress(before, r.environment).done) == r.task
        and not(progress(before, r.environment).running)
        and (r.task == Serve implies r.trigger == ByHandOnMain)
  })
```

### A step that runs is always read back, passed or failed

The operator never leaves a step running without knowing how it ended,
so the next step, or a retry, can follow.

```quint
pure val fair_readBack = "weak"

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
