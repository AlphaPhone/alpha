# OS

The phone's operating system image has its own update channel, apart from
the app's [Release](./index.md). The on-device updater ships disabled: its
enrolment is staged on the image and stays off until every gate passes. The
channel is pinned to one manifest, its download hosts, one product and
device, and one set of certificates; it never downgrades, never rotates the
platform or AVB keys, and never wipes data. Until enrolment is on, the
release owner updates an image by hand, and four drills prove recovery.

## Story: Enrol the image's updater

> As the release owner, I want the image's own updater to stay off until
> signing, trust, security, the update engine and physical recovery have
> all been proven.

### The channel is pinned to its manifest, hosts, product, device, OTA certificate and AVB key, with no key rotation and no data wipe

The manifest is `alpha-os-update.json` under the release tagged `os-pilot`
of Alpha's repository, eliza-research/alpha, where the launcher channel
also lives ([Release](./index.md)).

```quint
type Profile = {
  manifest: str, hosts: str, product: str, device: str, certificate: str, avb: str, rotate: bool, wipe: bool,
}
type Gate = SignedImage | ChannelGate | Trust | Selinux | Engine | PhysicalRecovery | CacheRetention | CandidateRecovery
type Drill = SignedUpdate | InterruptedUpdate | CompatibleRollback | StockRecovery
type Result = NotRun | Passed | DrillFailed
type Apply = Steady | Checked | Applying | Interrupted
type ImageRecord = { build: int, product: str, device: str, certificate: str, avb: str, wipe: bool }
type Drills = { signedUpdate: Result, interruptedUpdate: Result, compatibleRollback: Result, stockRecovery: Result }
type Ran = { signedRan: bool, interruptedRan: bool, rollbackRan: bool, stockRan: bool }
type Gates = {
  signedImage: bool, channel: bool, trust: bool, selinux: bool, engine: bool, recovery: bool,
  cacheRetention: bool, candidateRecovery: bool,
}
type Os = {
  staged: bool, enabled: bool, gates: Gates,
  installed: int, target: ImageRecord, apply: Apply, resumed: bool, knownGood: int, applied: Set[int],
  seen: Ran, drills: Drills,
}

pure val pinned: Profile = {
  manifest: "https://github.com/eliza-research/alpha/releases/download/os-pilot/alpha-os-update.json",
  hosts: "github.com release-assets.githubusercontent.com objects.githubusercontent.com storage.googleapis.com",
  product: "alpha_stallion_phone", device: "stallion",
  certificate: "66046a0729fe8d14b9bb53051b2225b396f7bcb07b2a757eac6fc799b1aee11e",
  avb: "ef17e93cb331c37187cb15c666c09b3861d539f8b24662f4fa3fd7314d806daa",
  rotate: false, wipe: false,
}
pure val noGates: Gates = {
  signedImage: false, channel: false, trust: false, selinux: false, engine: false, recovery: false,
  cacheRetention: false, candidateRecovery: false,
}
pure val stock: ImageRecord = { build: 0, product: "", device: "", certificate: "", avb: "", wipe: false }
pure val initial: Os = {
  staged: false, enabled: false, gates: noGates,
  installed: 0, target: stock, apply: Steady, resumed: false, knownGood: 0, applied: Set(),
  seen: { signedRan: false, interruptedRan: false, rollbackRan: false, stockRan: false },
  drills: { signedUpdate: NotRun, interruptedUpdate: NotRun, compatibleRollback: NotRun, stockRecovery: NotRun },
}

pure def result(s: Os, drill: Drill): Result =
  if (drill == SignedUpdate) s.drills.signedUpdate
  else if (drill == InterruptedUpdate) s.drills.interruptedUpdate
  else if (drill == CompatibleRollback) s.drills.compatibleRollback
  else s.drills.stockRecovery

pure def ran(s: Os, drill: Drill): bool =
  if (drill == SignedUpdate) s.seen.signedRan
  else if (drill == InterruptedUpdate) s.seen.interruptedRan
  else if (drill == CompatibleRollback) s.seen.rollbackRan
  else s.seen.stockRan

pure def gatePassed(g: Gates, gate: Gate): bool =
  if (gate == SignedImage) g.signedImage else if (gate == ChannelGate) g.channel else if (gate == Trust) g.trust
  else if (gate == Selinux) g.selinux else if (gate == Engine) g.engine else if (gate == PhysicalRecovery) g.recovery
  else if (gate == CacheRetention) g.cacheRetention else g.candidateRecovery

pure def everyGate(g: Gates): bool =
  g.signedImage and g.channel and g.trust and g.selinux and g.engine and g.recovery and g.cacheRetention and g.candidateRecovery
```

### Enrolment is staged only with exactly the pinned profile, and staged disabled

```quint
pure def isPinned(p: Profile): bool =
  p.manifest == pinned.manifest and p.hosts == pinned.hosts and p.product == pinned.product and p.device == pinned.device
    and p.certificate == pinned.certificate and p.avb == pinned.avb and not(p.rotate) and not(p.wipe)

pure def canStage(s: Os, profile: Profile): bool = not(s.staged) and isPinned(profile)

pure def stage(s: Os, profile: Profile): Os = { ...s, staged: true, enabled: false }
```

### A gate passes once, and physical recovery only after all four drills passed

```quint
pure def allDrillsPassed(s: Os): bool =
  s.drills.signedUpdate == Passed and s.drills.interruptedUpdate == Passed
    and s.drills.compatibleRollback == Passed and s.drills.stockRecovery == Passed

pure def canPass(s: Os, gate: Gate): bool =
  s.staged and not(gatePassed(s.gates, gate)) and (gate == PhysicalRecovery implies allDrillsPassed(s))

pure def pass(s: Os, gate: Gate): Os =
  val g = s.gates
  {
    ...s,
    gates: if (gate == SignedImage) { ...g, signedImage: true } else if (gate == ChannelGate) { ...g, channel: true }
      else if (gate == Trust) { ...g, trust: true } else if (gate == Selinux) { ...g, selinux: true }
      else if (gate == Engine) { ...g, engine: true } else if (gate == PhysicalRecovery) { ...g, recovery: true }
      else if (gate == CacheRetention) { ...g, cacheRetention: true } else { ...g, candidateRecovery: true },
  }
```

### The updater is enabled only when every gate has passed

```quint
pure def canEnable(s: Os): bool = s.staged and not(s.enabled) and everyGate(s.gates)

pure def enable(s: Os): Os = { ...s, enabled: true }

pure def alwaysEnabledOnlyAfterEveryGate(s: Os): bool =
  s.enabled implies (s.staged and everyGate(s.gates))
```

### Physical recovery has passed only with all four drills passed

```quint
pure def alwaysRecoveryRestsOnTheDrills(s: Os): bool =
  s.gates.recovery implies allDrillsPassed(s)
```

### Enrolment can be staged and still disabled

```quint
pure def sometimesStagedDisabled(s: Os): bool = s.staged and not(s.enabled) and s.gates.trust
```

## Story: Update an image by hand

> As the release owner, I want to update a phone's image only to a newer,
> compatible release of the same product and keys, with a journal that lets
> me recover if it is interrupted.

### Two release records are compatible only from the installed build to a newer one of the pinned product, device and keys that wipes nothing

```quint
pure def compatible(s: Os, base: ImageRecord, goal: ImageRecord): bool =
  base.build == s.installed and goal.build > base.build and goal.product == pinned.product and goal.device == pinned.device
    and goal.certificate == pinned.certificate and goal.avb == pinned.avb and not(goal.wipe)

pure def canCheck(s: Os, base: ImageRecord, goal: ImageRecord): bool = s.apply == Steady and compatible(s, base, goal)

pure def check(s: Os, base: ImageRecord, goal: ImageRecord): Os = { ...s, apply: Checked, target: goal, resumed: false }
```

### A checked update is applied with a journal, can be interrupted, and resumes from the journal

```quint
pure def canStartApply(s: Os): bool = s.apply == Checked

pure def startApply(s: Os): Os = { ...s, apply: Applying }

pure def canInterrupt(s: Os): bool = s.apply == Applying

pure def interrupt(s: Os): Os = { ...s, apply: Interrupted }

pure def canResume(s: Os): bool = s.apply == Interrupted

pure def resume(s: Os): Os = { ...s, apply: Applying, resumed: true }
```

### A finished update installs its target; a signed update has then been run, and an interrupted one recovered

```quint
pure def canFinish(s: Os): bool = s.apply == Applying

pure def finish(s: Os): Os =
  {
    ...s, apply: Steady, installed: s.target.build, applied: s.applied.union(Set(s.target.build)),
    seen: { ...s.seen, signedRan: true, interruptedRan: s.seen.interruptedRan or s.resumed },
  }
```

### An update in progress always targets a newer compatible release with the pinned keys and no wipe

```quint
pure def alwaysNoDowngradeRotationOrWipe(s: Os): bool =
  s.apply != Steady implies
    (s.target.build > s.installed and s.target.product == pinned.product and s.target.device == pinned.device
      and s.target.certificate == pinned.certificate and s.target.avb == pinned.avb and not(s.target.wipe))
```

### A build is installed only by finishing an update or by falling back

```quint
pure def stepTheImageChangesOnlyByUpdateOrFallback(before: Os, via: str, after: Os): bool =
  after.installed != before.installed implies (via == "finish" or via == "fallback")
```

## Story: Recover an image

> As the release owner, I want a phone whose update went wrong brought back
> to the stock factory image or to the last release I kept as good.

### A release is kept as known-good only once it has been installed

```quint
pure def canRetainKnownGood(s: Os): bool = s.apply == Steady and s.installed != 0

pure def retainKnownGood(s: Os): Os = { ...s, knownGood: s.installed }

pure def alwaysKnownGoodWasInstalled(s: Os): bool = s.knownGood == 0 or s.applied.contains(s.knownGood)
```

### The phone runs the stock image or a release that was applied to it

Discovered by the proof: without it, a release that was never applied could
be kept as known-good.

```quint
pure def alwaysInstalledWasApplied(s: Os): bool = s.installed == 0 or s.applied.contains(s.installed)
```

### A phone falls back, when steady or interrupted, to the pinned stock factory image or to the known-good release

Only the stock factory image whose digest the channel pins is flashed; any
other archive is refused. Falling back from an interrupted update recovers
it.

```quint
pure val stockFactoryImage = "d1d2550268de9fd4bfdd4ff0910cc4471fec6ba361506278c25f34f312106675"

pure def canFallback(s: Os, toStock: bool, image: str): bool =
  (s.apply == Steady or s.apply == Interrupted)
    and (if (toStock) image == stockFactoryImage else s.knownGood != 0)

pure def fallback(s: Os, toStock: bool, image: str): Os =
  {
    ...s, apply: Steady, installed: if (toStock) 0 else s.knownGood,
    seen: {
      signedRan: s.seen.signedRan, stockRan: s.seen.stockRan or toStock, rollbackRan: s.seen.rollbackRan or not(toStock),
      interruptedRan: s.seen.interruptedRan or s.apply == Interrupted,
    },
  }
```

### A phone can fall back from an interrupted update

```quint
pure def sometimesRecoveredFromAnInterruption(s: Os): bool = s.seen.interruptedRan and not(s.resumed)
```

## Story: Run the drills

> As the release owner, I want each recovery drill to say "not run" until I
> have actually run it on a phone.

### A drill's result is recorded by the release owner only once that drill has been run, and a failed drill takes back physical recovery and turns the updater off

```quint
pure def canRecordDrill(s: Os, drill: Drill): bool = ran(s, drill)

pure def recordDrill(s: Os, drill: Drill, passed: bool): Os =
  val r = if (passed) Passed else DrillFailed
  val d = s.drills
  {
    ...s,
    drills: if (drill == SignedUpdate) { ...d, signedUpdate: r } else if (drill == InterruptedUpdate) { ...d, interruptedUpdate: r }
      else if (drill == CompatibleRollback) { ...d, compatibleRollback: r } else { ...d, stockRecovery: r },
    gates: if (passed) s.gates else { ...s.gates, recovery: false },
    enabled: s.enabled and passed,
  }
```

### A drill that has not been run says "not run"

```quint
pure def alwaysNotRunUntilRun(s: Os): bool =
  (s.drills.signedUpdate != NotRun implies s.seen.signedRan)
    and (s.drills.interruptedUpdate != NotRun implies s.seen.interruptedRan)
    and (s.drills.compatibleRollback != NotRun implies s.seen.rollbackRan)
    and (s.drills.stockRecovery != NotRun implies s.seen.stockRan)
```

### Every drill can pass

```quint
pure def sometimesAllDrillsPassed(s: Os): bool = allDrillsPassed(s)
```

### The updater can be enabled

```quint
pure def sometimesEnabled(s: Os): bool = s.enabled
```

## Story: Sign a preserving OS update

> As the release owner, I want a pilot image update signed only from the
> exact build I reviewed, keeping every key and the phone's data, so that a
> phone that takes it keeps everything it had.

### A preserving update is signed only from a plan that names exactly one reviewed build, by a reviewed producer, with the pinned tools, for Alpha's product and device

The plan names the unsigned build's bytes, the commits that produced it, its
fingerprint and build time, the OTA tools' bytes, and the one private place
the signed update goes. Signing starts only from a plan whose text has the
digest the release owner reviewed, and only on the build and tools whose
bytes have the digests the plan names.

```quint
type OsPlan = { reviewed: int, producer: bool, tools: bool, product: bool, output: bool, inputs: bool }

pure def osPlanAdmitted(plan: OsPlan): bool =
  plan.reviewed == 1 and plan.producer and plan.tools and plan.product and plan.output and plan.inputs

pure def lawTwoReviewedBuildsAreNoBinding(plan: OsPlan): bool = plan.reviewed != 1 implies not(osPlanAdmitted(plan))
```

### The build keeps its own APK signers and verified-boot keys, replaces no data or trust-state partition, and brings no signing hook of its own

```quint
type OsBuild = { signersKept: bool, bootKeysKept: bool, abUpdate: bool, dataPartitions: bool, hooks: bool, identity: bool }

pure def osBuildAdmitted(unsigned: OsBuild): bool =
  unsigned.signersKept and unsigned.bootKeysKept and unsigned.abUpdate and not(unsigned.dataPartitions) and not(unsigned.hooks) and unsigned.identity

pure def lawABuildThatReplacesDataIsNeverSigned(unsigned: OsBuild): bool = unsigned.dataPartitions implies not(osBuildAdmitted(unsigned))
```

### The signed update is kept only when one certificate, the enrolled release key's, signs it whole, for the planned build and time, with no wipe and no downgrade

The release key is read only into memory that never reaches a disk, and is
proven to pair with the enrolled certificate before it signs. The signed
update is retained privately, never over an object already there; it is
not yet qualified for any phone.

```quint
type OsSigned = { enrolled: bool, oneSigner: bool, postBuild: bool, postTime: bool, wipes: bool, downgrades: bool }

pure def osSignedKept(signed: OsSigned): bool =
  signed.enrolled and signed.oneSigner and signed.postBuild and signed.postTime and not(signed.wipes) and not(signed.downgrades)

pure def lawAWipingUpdateIsNeverKept(signed: OsSigned): bool = signed.wipes implies not(osSignedKept(signed))
```

### What the simulator tries

```quint
pure val wrong: Profile = { ...pinned, rotate: true }
pure val profileValues = Set(pinned).union(Set(wrong)).union(Set({ ...pinned, wipe: true }))
pure def release(build: int): ImageRecord =
  { build: build, product: pinned.product, device: pinned.device, certificate: pinned.certificate, avb: pinned.avb, wipe: false }
pure val baseValues = Set(stock).union(Set(release(1))).union(Set(release(2)))
pure val goalValues =
  Set(release(1)).union(Set(release(2))).union(Set({ ...release(2), wipe: true }))
    .union(Set({ ...release(2), certificate: "rotated" }))
pure val imageValues = Set(stockFactoryImage).union(Set("another archive"))
pure val reviewedPlan: OsPlan = { reviewed: 1, producer: true, tools: true, product: true, output: true, inputs: true }
pure val planValues = Set(reviewedPlan, { ...reviewedPlan, reviewed: 2 }, { ...reviewedPlan, tools: false })
pure val keptBuild: OsBuild = { signersKept: true, bootKeysKept: true, abUpdate: true, dataPartitions: false, hooks: false, identity: true }
pure val unsignedValues = Set(keptBuild, { ...keptBuild, dataPartitions: true }, { ...keptBuild, signersKept: false })
pure val signedUpdate: OsSigned = { enrolled: true, oneSigner: true, postBuild: true, postTime: true, wipes: false, downgrades: false }
pure val signedValues = Set(signedUpdate, { ...signedUpdate, wipes: true }, { ...signedUpdate, enrolled: false })
pure val weight_pass = 12
pure val weight_recordDrill = 6
pure val weight_enable = 4
pure val weight_stage = 4
```
