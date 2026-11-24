# Rollout

One deployment of an Alpha Cloud environment, as the operator command carries
it out: the secrets read from a private file outside the checkout, the
Cloudflare resources checked against what is recorded, both Workers rendered,
then the API Worker deployed and the web host after it. Each step stops the
rollout with its reason, and nothing reaches Cloudflare before every check
before it has passed.

## Story: Deploy an environment without reading a secret into the repository

> As the operator, I want one command to put an environment on Cloudflare,
> refusing before it changes anything when a secret, a resource or the
> configuration is not right, and never minting a key on a machine that would
> lose it.

### A rollout starts with no secret read, nothing checked and nothing deployed

```quint
type Secrets = Unread | Incomplete | Complete
type Resources = Unchecked | Verified | Conflicting
type Worker = Waiting | Deployed
type Rollout = { frozen: bool, secrets: Secrets, generated: bool, resources: Resources, rendered: bool, api: Worker, edge: Worker }

pure val initial: Rollout = { frozen: false, secrets: Unread, generated: false, resources: Unchecked, rendered: false, api: Waiting, edge: Waiting }
```

### A rollout run by CI is frozen before it reads its secrets

```quint
pure def canFreeze(r: Rollout): bool = r.secrets == Unread and not(r.frozen)

pure def freeze(r: Rollout): Rollout = { ...r, frozen: true }
```

### Reading the secrets generates each missing internal secret once, except in a frozen rollout, and they are complete only when every one is there and fits its environment

```quint
pure def canReadSecrets(r: Rollout): bool = r.secrets == Unread

pure def readSecrets(r: Rollout, internalMissing: bool, providedFit: bool): Rollout =
  val generates = internalMissing and not(r.frozen)
  { ...r, generated: generates, secrets: if (providedFit and (not(internalMissing) or generates)) Complete else Incomplete }
```

### The Cloudflare resources are checked only once the secrets are complete

```quint
pure def canCheckResources(r: Rollout): bool = r.secrets == Complete and r.resources == Unchecked

pure def checkResources(r: Rollout, recorded: bool): Rollout = { ...r, resources: if (recorded) Verified else Conflicting }
```

### The Workers are rendered only for verified resources

```quint
pure def canRender(r: Rollout): bool = r.resources == Verified and not(r.rendered)

pure def render(r: Rollout): Rollout = { ...r, rendered: true }
```

### The API Worker is deployed once rendered, and the web host once rendered, since it reaches an API Worker already serving through its binding

```quint
pure def canDeployApi(r: Rollout): bool = r.rendered and r.api == Waiting

pure def deployApi(r: Rollout): Rollout = { ...r, api: Deployed }

pure def canDeployEdge(r: Rollout): bool = r.rendered and r.edge == Waiting

pure def deployEdge(r: Rollout): Rollout = { ...r, edge: Deployed }
```

### Nothing is deployed before the secrets are complete, the resources verified and the configuration rendered

```quint
pure def alwaysChecksComeInOrder(r: Rollout): bool =
  (r.rendered implies r.resources == Verified) and (r.resources != Unchecked implies r.secrets == Complete)

pure def alwaysDeployedOnlyWhenReady(r: Rollout): bool =
  (r.api == Deployed or r.edge == Deployed) implies (r.secrets == Complete and r.resources == Verified and r.rendered)
```

### A frozen rollout generates no secret

A sealing or entitlement key minted on a CI runner would be lost with it, and
every phone would be signed out.

```quint
pure def alwaysFrozenGeneratesNothing(r: Rollout): bool =
  (r.frozen implies not(r.generated)) and (r.secrets == Unread implies not(r.generated))
```

### A rollout can deploy both Workers, and can stop on its secrets or its resources

```quint
pure def sometimesBothDeployed(r: Rollout): bool = r.api == Deployed and r.edge == Deployed

pure def sometimesStoppedOnSecrets(r: Rollout): bool = r.secrets == Incomplete

pure def sometimesStoppedOnResources(r: Rollout): bool = r.resources == Conflicting
```

## Story: Keep every secret private and fitting its environment

> As the owner, I want the Cloud's secrets kept in a file only the operator
> can read, outside the repository, and never a live payment key in staging
> or a test one in production.

### The secrets file lies outside the checkout and only its owner may read it

```quint
pure def secretsFileAccepted(insideCheckout: bool, othersMayRead: bool): bool = not(insideCheckout) and not(othersMayRead)
```

### Production takes only a live Stripe key, and staging only a test key

```quint
pure def stripeKeyFits(production: bool, live: bool): bool = production == live
```

## Story: Create an environment's Cloudflare resources once

> As the operator, I want provisioning to create only what is missing, to
> find by name what a stopped run already created, and to stop at a resource
> that belongs to something else, so that running it again is always safe.

### Each resource is kept when it is the one recorded, created only when absent and creating, and otherwise refused

```quint
type Observed = Absent | Recorded | Foreign
type Reconcile = Create | Keep | Refuse

pure def reconcile(observed: Observed, creating: bool): Reconcile =
  if (observed == Recorded) Keep else if (observed == Absent and creating) Create else Refuse

pure def lawNeverCreatesOverAnother(observed: Observed, creating: bool): bool =
  reconcile(observed, creating) == Create implies observed == Absent
```

## Story: Tell whether a deployed environment is ready

> As the operator, I want one credential-free check of what the phone needs
> from a deployed environment, gate by gate, before anyone is asked to test it
> on a phone.

### An environment is ready only when each public gate passes: API health, Terms and Privacy, entitlement keys, the app's registration, the plans, the sign-in methods, the App Link file and the return page

```quint
type Gate = ApiHealth | ServiceDocuments | EntitlementKeys | AppRegistration | Plans | SignInMethods | AssetLinks | CallbackPage

pure val smokeGates: List[Gate] = List(ApiHealth, ServiceDocuments, EntitlementKeys, AppRegistration, Plans, SignInMethods, AssetLinks, CallbackPage)
```
