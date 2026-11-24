# Alpha Cloud

Alpha Cloud is Alpha Phone's own deployment of eliza's cloud on Cloudflare, in
`apps/cloud`: an API Worker that is eliza's own Worker serving Alpha's profile,
and a web host Worker on the App Link host. Each hosted environment of
`packages/deployment` names it as its cutover candidate; phones keep the Cloud
they shipped with until the owner takes the cutover. What eliza's cloud
decides for any deployment is eliza's spec; this one holds what Alpha adds.

- [Native client](./registration.md): Alpha Phone's registration with the Cloud
- [Web host](./edge.md): the Worker on the App Link host
- [Rollout](./rollout.md): putting one environment on Cloudflare

## Story: Move phones to Alpha Cloud only when the owner takes the cutover

> As the owner, I want every phone to keep the Cloud it signed in to until I
> approve the cutover release, and then both environments to move at once, so
> that no phone of mine is left between two Clouds.

### An environment addresses its shipped Cloud or its candidate, and has taken the cutover exactly when it addresses the candidate

```quint
type Hosts = { api: str, web: str }
type Row = { addressed: Hosts, candidate: Hosts }

pure def cutoverTaken(row: Row): bool = row.addressed == row.candidate

pure val rowValues = Set({ addressed: { api: "https://api.shipped.test", web: "https://shipped.test" }, candidate: { api: "https://api.alpha.test", web: "https://cloud.alpha.test" } })
  .union(Set({ addressed: { api: "https://api.alpha.test", web: "https://cloud.alpha.test" }, candidate: { api: "https://api.alpha.test", web: "https://cloud.alpha.test" } }))
pure val productionValues = rowValues
pure val stagingValues = Set({ addressed: { api: "https://api-staging.shipped.test", web: "https://staging.shipped.test" }, candidate: { api: "https://api-staging.alpha.test", web: "https://cloud-staging.alpha.test" } })
  .union(Set({ addressed: { api: "https://api-staging.alpha.test", web: "https://cloud-staging.alpha.test" }, candidate: { api: "https://api-staging.alpha.test", web: "https://cloud-staging.alpha.test" } }))
  .union(Set({ addressed: { api: "https://api.alpha.test", web: "https://cloud.alpha.test" }, candidate: { api: "https://api.alpha.test", web: "https://cloud.alpha.test" } }))
```

### The cutover is taken in both environments or in neither, and a table split between them is refused

```quint
type Cutover = NotTaken | Taken | Split

pure def cutover(production: Row, staging: Row): Cutover =
  if (cutoverTaken(production) and cutoverTaken(staging)) Taken
  else if (not(cutoverTaken(production)) and not(cutoverTaken(staging))) NotTaken
  else Split

pure def lawSplitExactlyWhenTheEnvironmentsDisagree(production: Row, staging: Row): bool =
  (cutover(production, staging) == Split) iff (cutoverTaken(production) != cutoverTaken(staging))
```

### Alpha Cloud's two environments share no origin

A staging change can then never reach a production phone, nor a production
credential a staging Worker.

```quint
pure def candidatesApart(production: Row, staging: Row): bool =
  Set(production.candidate.api).union(Set(production.candidate.web))
    .intersect(Set(staging.candidate.api).union(Set(staging.candidate.web))).size() == 0
```

## Story: Serve one reviewed profile

> As the owner, I want Alpha Cloud to run eliza's cloud with Alpha's own name,
> hosts, model and capabilities, from values an operator reviewed, so that what
> it serves is exactly what was approved.

### Alpha Cloud offers inference, speech, maps, managed Google and billing, under its own name, with entitlements for Alpha Phone's application id

```quint
pure val alphaCloudName = "Alpha Cloud"
pure val alphaAudience = "ai.alphacompute.alphaphone"
pure val alphaCapabilities: List[str] = List("inference", "speech", "maps", "managedGoogle", "billing")
```

### Chat on Alpha Cloud is Alpha's model, and a request that names no cap is sent at the longest reply its provider generates

```quint
pure val alphaModel = "qwen-3.8-27b"
pure val alphaModelMaxOutputTokens = 40960
```

### The API Worker serves only while the profile in its assets is the text its pinned digest names, and otherwise asks the caller to retry

The profile is larger than a Worker variable may be, so the Worker's static
assets carry it and a variable pins its digest.

```quint
type WorkerAnswer = Served | Unavailable

pure def workerAnswer(pinned: bool, found: bool, matches: bool): WorkerAnswer =
  if (pinned and found and matches) Served else Unavailable

pure def lawServesOnlyThePinnedProfile(pinned: bool, found: bool, matches: bool): bool =
  workerAnswer(pinned, found, matches) == Served implies (pinned and found and matches)
```

## Story: Render a deployment only when it is provisioned

> As the operator, I want a Worker configuration written only for Cloudflare
> resources that exist, on hosts in Alpha's zone, and never one that points at
> another company's Cloud.

### A configuration is rendered only for a provisioned account and database, hosts in the zone, and a complete worker block

```quint
type ResourceId = Provisioned | Placeholder | Malformed
type RenderProblem = AccountUnprovisioned | DatabaseUnprovisioned | ApiOutsideZone | WebOutsideZone | NoWorkerBlock

pure def renderProblems(account: ResourceId, database: ResourceId, apiInZone: bool, webInZone: bool, workerBlock: bool): List[RenderProblem] =
  (if (account == Provisioned) List() else List(AccountUnprovisioned))
    .concat(if (database == Provisioned) List() else List(DatabaseUnprovisioned))
    .concat(if (apiInZone) List() else List(ApiOutsideZone))
    .concat(if (webInZone) List() else List(WebOutsideZone))
    .concat(if (workerBlock) List() else List(NoWorkerBlock))

pure def lawRenderedOnlyWhenProvisioned(account: ResourceId, database: ResourceId, apiInZone: bool, webInZone: bool, workerBlock: bool): bool =
  renderProblems(account, database, apiInZone, webInZone, workerBlock) == List()
    implies (account == Provisioned and database == Provisioned and apiInZone and webInZone and workerBlock)
```

### A rendered configuration that names a deployed Eliza Cloud host is refused

```quint
pure def renderAccepted(problems: List[RenderProblem], namesElizaCloud: bool): bool =
  problems == List() and not(namesElizaCloud)
```

## Story: Launch the resident agent on the deployment's own Cloud

> As the owner, I want my phone's agent to ask for inference only from the
> Cloud my phone addresses, with Alpha's model, keeping embeddings on the phone
> and its credential out of every file.

### The agent's launch uses the cloud backend at exactly the environment's API origin, Alpha's model, embeddings on the phone, and no credential in its document

```quint
type Launch = { cloudBackend: bool, onApiOrigin: bool, smallModel: str, largeModel: str, localEmbeddings: bool, carriesCredential: bool }

pure def launchFits(l: Launch): bool =
  l.cloudBackend and l.onApiOrigin and l.smallModel == alphaModel and l.largeModel == alphaModel
    and l.localEmbeddings and not(l.carriesCredential)
```
