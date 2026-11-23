# Cloud

Alpha's cloud is eliza's: `@elizaos/cloud` at the pin, which specifies its
own profile, routes, sign-in, device keys, entitlement, plans and billing
(`.eliza/spec/cloud/`). What Alpha owns, and this spec states, is which
deployment the app talks to in each environment, how Alpha's app is
registered with it as a native client, what its asset links must say, how
an operator brings a deployment up, and the gates a local cloud must pass.
The profiles, the seed and the commands that check them are `apps/cloud`.

- [Local cloud](./local.md): eliza's own server on this computer, and the gates Alpha's contract passes on it
- [Provisioning](./provisioning.md): the operator's commands, in order, each read back before the next

## Story: Know which cloud the app talks to

> As the owner, I want my phone to talk to one cloud, named once, so that
> my sign-in, my plan and my mail never go to a host the product did not
> choose.

### A hosted environment's profile answers at its deployment's cloud and keeps its returns on its deployment's App Link host

`@repo/deployment` names the cloud and the App Link host of each
environment; the profile that environment's deployment names says the same
API origin and has its web origin on that host. The local environment runs
the staging profile on this computer, where the cloud's origin is known only
once it listens.

```quint
type Hosts = { cloud: str, appLinkHost: str }
type ProfileHosts = { api: str, webHost: str }

pure def profileFits(deployment: Hosts, profile: ProfileHosts): bool =
  profile.api == deployment.cloud and profile.webHost == deployment.appLinkHost
```

### A cut-over candidate names neither the cloud nor the App Link host it would replace

The candidate is the product's own cloud, recorded and not used until the
decision on where Alpha's cloud runs is taken.

```quint
pure def candidateApart(serving: Hosts, candidate: Hosts): bool =
  candidate.cloud != serving.cloud and candidate.appLinkHost != serving.appLinkHost
    and candidate.cloud != serving.appLinkHost and candidate.appLinkHost != serving.cloud
```

## Story: Register Alpha's app with the cloud

> As the owner, I want the cloud to send my sign-in back only to Alpha's
> own app, signed by Alpha's own key, so that no other app can take my
> account's key.

What a registration holds and how the cloud admits a client is eliza's
(`spec/cloud/nativeClients/registry.md`, "Story: Admit only a registered
native client"); applying it is eliza's `client apply`
(`spec/cloud/nativeClients/registry.md`, "Story: Apply my app's
registration from its reviewed file").

### Alpha registers one client in each environment, under its own package and name

```quint
type Environment = Production | Staging
type ReturnUrl = { origin: str, path: str }
type Registration = {
  clientId: str, environment: Environment, displayName: str, androidPackage: str,
  certFingerprints: List[str], signInReturn: ReturnUrl, billingReturn: ReturnUrl, connectReturn: ReturnUrl
}

pure val alphaPackage = "ai.alphacompute.alphaphone"
pure val alphaName = "Alpha"
```

### Production trusts only the release signer, and staging also the debug signer

The release signer is the public digest of the key Alpha's distributed
builds are signed with (`legacy/android/release-signer.json`). The debug
signer is the digest of the Android host's debug keystore; it is added here
when the Android area brings that keystore in, and until then staging trusts
the release signer alone.

```quint
pure val releaseSigner = "ED:BF:CA:CB:1D:A6:89:00:8B:F4:E7:D6:75:17:6C:30:2D:EC:F8:31:61:A8:77:EB:8B:1D:E4:FF:AE:04:45:ED"
pure val debugSigners: List[str] = List()

pure def signersOf(environment: Environment): List[str] =
  if (environment == Staging) List(releaseSigner).concat(debugSigners) else List(releaseSigner)
```

### Each return is on the environment's web origin, under Alpha's own path

```quint
pure def registrationOf(environment: Environment, web: str): Registration = {
  clientId: alphaPackage, environment: environment, displayName: alphaName, androidPackage: alphaPackage,
  certFingerprints: signersOf(environment),
  signInReturn: { origin: web, path: "/apps/alpha/sign-in" },
  billingReturn: { origin: web, path: "/apps/alpha/billing" },
  connectReturn: { origin: web, path: "/apps/alpha/connect" }
}
```

### An environment's asset links hold exactly one statement for Alpha's package, naming that environment's signers

```quint
type Statement = { packageName: str, fingerprints: List[str] }

pure def assetLinksNameAlpha(statements: List[Statement], environment: Environment): bool =
  statements.select(s => s.packageName == alphaPackage) == List({ packageName: alphaPackage, fingerprints: signersOf(environment) })
```
