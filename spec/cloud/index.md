# Cloud

Alpha's cloud services are the upstream elizaOS cloud: its API Worker is
re-exported from the pinned upstream, which specifies its own routes and
storage. What Alpha owns is which deployment the app talks to, what the
phone may ask of it, the small Worker in front of its web host, the session
rules the phone keeps for anything that touches money, and how an operator
brings a deployment up. This spec states the deployments and the one policy
every build agrees on; its children state the rest.

- [Edge](./edge.md): the Worker in front of the web host, and the only paths it answers
- [Routes](./routes.md): what the phone may ask of the cloud, and the pages it may open
- [Transport](./transport.md): the gate every request of the page passes, and whose answers it hands back
- [Sign-in](./signIn.md): the token exchange and acknowledgement, with the key kept in the phone's secure store
- [Entitlement](./entitlement.md): the signed, short-lived statement of the owner's plan
- [Billing session](./session.md): a session proven by an emailed code, held in memory for an hour at most
- [Billing](./billing.md): changing or cancelling a plan, each change reviewed and then confirmed
- [Provisioning](./provisioning.md): how an operator brings a deployment up, staging before production
- [Local cloud](./local.md): the same cloud on a developer's computer, and its contract gates

## Story: Know which cloud the app talks to

> As the owner, I want my phone to talk to one cloud, named once, so that
> my sign-in, my plan and my mail never go to a host the product did not
> choose.

### A deployment has a production and a staging environment, each with an API host, a web host, a services host, a tenant and an entitlement audience

Two clouds exist: the one the app ships against today, and the product's
own, which stays dormant until the cut-over. Every host is reached over a
secure connection on the usual port.

```quint
type Cloud = Shipped | Own
type Environment = Production | Staging
type Row = { api: str, web: str, services: str, tenant: str, audience: str, own: bool }

pure def row(cloud: Cloud, environment: Environment): Row =
  if (cloud == Shipped and environment == Production)
    { api: "api.eliza.app", web: "eliza.app", services: "cloud.eliza.app", tenant: "elizacloud", audience: "eliza-alpha-phone", own: false }
  else if (cloud == Shipped)
    { api: "api-staging.eliza.app", web: "staging.eliza.app", services: "cloud-staging.eliza.app", tenant: "elizacloud-staging", audience: "eliza-alpha-phone", own: false }
  else if (environment == Production)
    { api: "api.alphacompute.ai", web: "cloud.alphacompute.ai", services: "cloud.alphacompute.ai", tenant: "alphacompute", audience: "ai.alphacompute.alphaphone", own: true }
  else
    { api: "api-staging.alphacompute.ai", web: "cloud-staging.alphacompute.ai", services: "cloud-staging.alphacompute.ai", tenant: "alphacompute-staging", audience: "ai.alphacompute.alphaphone", own: true }
```

### The two environments of a cloud have different API hosts and tenants, and one entitlement audience

```quint
pure def lawEnvironmentsAreApart(cloud: Cloud): bool =
  val production = row(cloud, Production)
  val staging = row(cloud, Staging)
  production.api != staging.api and production.web != staging.web
    and production.tenant != staging.tenant and production.audience == staging.audience
```

### The product's own cloud is marked on both its environments, and the shipped cloud on neither

```quint
pure def lawOwnIsMarkedOnBoth(cloud: Cloud, environment: Environment): bool =
  row(cloud, environment).own == (cloud == Own)
```

### The product's own cloud names no host or tenant of the cloud shipped today

```quint
pure def lawOwnNamesNothingShipped(environment: Environment, other: Environment): bool =
  val own = row(Own, environment)
  val shipped = row(Shipped, other)
  own.api != shipped.api and own.web != shipped.web and own.services != shipped.services
    and own.api != shipped.web and own.web != shipped.api and own.tenant != shipped.tenant
```

## Story: Build every part of the app against one policy

> As the product's maintainer, I want the page, the Android app and the
> build to name the same cloud, and a build to stop when they do not, so
> that no part of a phone signs in somewhere the rest does not.

### The policy names the cloud distributed builds use; a development build may switch to the product's own cloud as a candidate

The page's constants, the Android app's constants and the build's
settings are each generated from the policy, and each names the cloud it
was generated for. The switch selects the product's own cloud for a
development, test or validation build only, while the product still ships
against the other one.

```quint
type Output = Page | Android | Settings
type Deployment = { policy: Cloud, candidate: bool, page: Cloud, android: Cloud, settings: Cloud }
type Effect = Built({ cloud: Cloud, distribution: bool })
type Moved = { state: Deployment, out: List[Effect] }

pure val initial: Deployment = { policy: Shipped, candidate: false, page: Shipped, android: Shipped, settings: Shipped }

pure def selected(s: Deployment): Cloud = if (s.candidate) Own else s.policy
```

### The switch is turned on only while the product ships against the other cloud

```quint
pure def canSwitchOn(s: Deployment): bool = s.policy == Shipped and not(s.candidate)

pure def switchOn(s: Deployment): Deployment = { ...s, candidate: true }

pure def canSwitchOff(s: Deployment): bool = s.candidate

pure def switchOff(s: Deployment): Deployment = { ...s, candidate: false }
```

### Generating writes every output from the policy as it is now

```quint
pure def generate(s: Deployment): Deployment =
  val cloud = selected(s)
  { ...s, page: cloud, android: cloud, settings: cloud }
```

### An output can be changed by hand, or left behind when the policy moves

```quint
pure def edit(s: Deployment, output: Output, cloud: Cloud): Deployment =
  if (output == Page) { ...s, page: cloud }
  else if (output == Android) { ...s, android: cloud }
  else { ...s, settings: cloud }
```

### The check passes only when every output names the cloud the policy selects

```quint
pure def agrees(s: Deployment): bool =
  val cloud = selected(s)
  s.page == cloud and s.android == cloud and s.settings == cloud
```

### A build runs only when the check passes, and a distributed build never on a candidate

A candidate build has its own credential namespace, so a phone that runs it
signs in afresh, and it cannot be distributed by accident.

```quint
pure def canBuild(s: Deployment, distribution: bool): bool =
  agrees(s) and (distribution implies not(s.candidate))

pure def build(s: Deployment, distribution: bool): Moved =
  { state: s, out: List(Built({ cloud: selected(s), distribution: distribution })) }

pure def stepABuildIsAdmittedByTheCheck(before: Deployment, after: Deployment, out: List[Effect]): bool =
  out.every(e => match e {
    | Built(b) => agrees(before) and b.cloud == selected(before) and (b.distribution implies not(before.candidate))
  })
```

### The cut-over moves distributed builds to the product's own cloud only once it answers in both environments and the release carries the credential migration

Phones then sign in again: accounts, plans and Google grants do not move
by themselves. Whether the cloud answers is what [Provisioning](./provisioning.md)
reports after its smoke test in staging and production.

```quint
pure def canCutOver(s: Deployment, live: bool, migration: bool): bool =
  s.policy == Shipped and not(s.candidate) and live and migration

pure def cutOver(s: Deployment, live: bool, migration: bool): Deployment = { ...s, policy: Own }
```

### A candidate build exists only before the cut-over

```quint
pure def alwaysTheSwitchIsForTheShippedCloud(s: Deployment): bool = s.candidate implies s.policy == Shipped
```

### The policy changes only at the cut-over, and never back

```quint
pure def stepThePolicyMovesOnlyAtTheCutOver(before: Deployment, via: str, after: Deployment): bool =
  (after.policy != before.policy implies via == "cutOver") and (before.policy == Own implies after.policy == Own)
```

### An output can disagree with the policy, and the check then refuses every build

```quint
pure def sometimesAnOutputIsStale(s: Deployment): bool = not(agrees(s))
```

### A development build can run against the product's own cloud as a candidate

```quint
pure def sometimesRehearsing(s: Deployment): bool = s.candidate and agrees(s)
```

### The product can cut over to its own cloud

```quint
pure def sometimesCutOver(s: Deployment): bool = s.policy == Own and agrees(s)
```
