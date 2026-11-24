# Native client

Alpha Phone is the one native client each Alpha Cloud environment admits:
its application id, its name, the returns of sign-in, billing and Google on
the environment's web origin, and the certificates its release is signed
with. The same registration seeds a staging Cloud, fills the Worker's
registry and is applied to the environment's database by eliza's operator
command.

## Story: Admit only Alpha Phone, signed by Alpha's release certificate

> As the owner, I want the Cloud to hand a sign-in, a payment or a Google
> connection back only to Alpha Phone signed by our release certificate, so
> that no other app on my phone can take them.

### The release certificate is always registered, and the previous one only while an approved rotation keeps it

```quint
type Signer = { release: str, previous: str, rotationApproved: bool }

pure def registeredSigners(s: Signer): List[str] =
  if (s.rotationApproved and s.previous != "" and s.previous != s.release) List(s.release, s.previous) else List(s.release)

pure def lawThePreviousCertificateOnlyWhileARotationIsApproved(release: str, previous: str, rotationApproved: bool): bool =
  val listed = registeredSigners({ release: release, previous: previous, rotationApproved: rotationApproved })
  listed.includes(release) and (listed.length() == 2 implies rotationApproved)
```

### A registration is refused where eliza's registry would refuse it: returns that repeat, lie on the API origin or are not an HTTPS origin and path, certificates that repeat or are malformed, none or more than four of them, or a package that is not a reverse-DNS name

```quint
type RegistrationProblem = ReturnsRepeat | ReturnOnApiOrigin | ReturnNotAnHttpsPath | CertificatesRepeat | CertificateMalformed | CertificateCount | PackageMalformed

pure val maxCertificates = 4

pure def registrationProblems(distinctReturns: bool, returnsOnApi: int, malformedReturns: int, certificates: int, distinctCertificates: bool, malformedCertificates: int, packageWellFormed: bool): List[RegistrationProblem] =
  (if (distinctReturns) List() else List(ReturnsRepeat))
    .concat(if (returnsOnApi > 0) List(ReturnOnApiOrigin) else List())
    .concat(if (malformedReturns > 0) List(ReturnNotAnHttpsPath) else List())
    .concat(if (distinctCertificates) List() else List(CertificatesRepeat))
    .concat(if (malformedCertificates > 0) List(CertificateMalformed) else List())
    .concat(if (certificates < 1 or certificates > maxCertificates) List(CertificateCount) else List())
    .concat(if (packageWellFormed) List() else List(PackageMalformed))

pure def lawAnAcceptedRegistrationKeepsTheRegistryRules(distinctReturns: bool, returnsOnApi: int, malformedReturns: int, certificates: int, distinctCertificates: bool, malformedCertificates: int, packageWellFormed: bool): bool =
  registrationProblems(distinctReturns, returnsOnApi, malformedReturns, certificates, distinctCertificates, malformedCertificates, packageWellFormed) == List()
    implies (distinctReturns and returnsOnApi <= 0 and malformedReturns <= 0 and distinctCertificates and malformedCertificates <= 0
      and certificates >= 1 and certificates <= maxCertificates and packageWellFormed)
```

### A device key Alpha Cloud issues lives thirty days, within the one to ninety days the registry allows

```quint
pure val credentialTtlDays = 30

pure def lawTheKeyLifetimeIsWithinTheRegistryBounds(days: int): bool =
  days == credentialTtlDays implies (days >= 1 and days <= 90)
```
