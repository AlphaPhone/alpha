# Image

How Alpha reaches a phone inside its own image: the launcher staged into an
AOSP product, the Cuttlefish x86_64 phone for validation or the Pixel 10a
(stallion) for the hardware; what the image grants the launcher; the image
carried to a Pixel by cable, with a way back; and the licences of what
ships. How a release is built, signed and published, and the OS image's own
update channel, are [Release](../../release/); this area is what Alpha's
`pnpm aosp` (`apps/app/scripts/aosp.ts`) checks on top of eliza's image
tools (eliza's `spec/os/image/` and `spec/os/update/`), with Alpha's product
files in `apps/app/aosp/`. A staged product, a signed release and the record
of either are staging evidence: an image boot, an applied update and the
owner's acceptance are each shown by their own step, never by these.

- [Licences](./licences.md): what Alpha ships, the licence of each part, and what a licence flags

## Story: Stage Alpha into an image

> As Alpha's release owner, I want to stage the launcher into a Cuttlefish
> or Pixel 10a product, as a development build of my own or as a production
> build of a reviewed release, so that nothing half-reviewed reaches a
> production image.

### A stage puts the launcher into the Cuttlefish phone or the Pixel 10a, as a development or a production build, with the listener and source patches it names

A listener image is one that activates the Sense listener: a stage given
the listener's qualification record, or a production stage given the
listener. The branding packet is the source and asset packet of Alpha's
system screens.

```quint
type Target = Cuttlefish | Pixel10a
type Mode = Development | Production
type Patch = Chip | Ops | Assist | ProtectedPower | SoongMemory | SensePolicy
type Stage = { target: Target, mode: Mode, descriptorReviewed: bool, productComplete: bool, ownerTelephony: bool, listener: bool, qualified: bool, patches: List[Patch], branding: bool }
type StageProblem = NoReviewedDescriptor | ProductIncomplete | OwnerTelephonyOutsideDevelopment | OwnerTelephonyOnAListenerImage | ListenerImageOffThePixel
  | ListenerImageIncomplete | SensePolicyWithoutAListenerImage | PowerAndAssistTogether | BrandingOutsideAPixelProduction

pure def listenerImage(s: Stage): bool = s.qualified or (s.mode == Production and s.listener)
pure def problemIf(found: bool, problem: StageProblem): Set[StageProblem] = if (found) Set(problem) else Set()

pure val developmentStage: Stage = { target: Cuttlefish, mode: Development, descriptorReviewed: false, productComplete: false, ownerTelephony: false, listener: false, qualified: false, patches: List(), branding: false }
pure val listenerStage: Stage = { target: Pixel10a, mode: Production, descriptorReviewed: true, productComplete: true, ownerTelephony: false, listener: true, qualified: true,
  patches: List(Chip, Ops, ProtectedPower, SensePolicy), branding: false }
pure val sValues = Set(developmentStage, { ...developmentStage, ownerTelephony: true }, { ...developmentStage, target: Pixel10a, ownerTelephony: true },
  { ...developmentStage, mode: Production }, { ...developmentStage, mode: Production, descriptorReviewed: true, productComplete: true },
  { ...developmentStage, mode: Production, descriptorReviewed: true, productComplete: true, ownerTelephony: true },
  listenerStage, { ...listenerStage, mode: Development }, { ...listenerStage, target: Cuttlefish }, { ...listenerStage, patches: List(Chip, Ops, SensePolicy) },
  { ...listenerStage, ownerTelephony: true }, { ...listenerStage, patches: List(Chip, Ops, ProtectedPower, SensePolicy, Assist) },
  { ...developmentStage, patches: List(SensePolicy) }, { ...listenerStage, qualified: false, branding: true },
  { ...developmentStage, branding: true }, { ...developmentStage, target: Pixel10a, patches: List(SoongMemory, Assist) })
```

### A production stage, and every listener image, needs a reviewed launcher descriptor and a product with no field unset

A development stage describes the launcher from the APK it is given.

```quint
pure def reviewedStage(s: Stage): bool = s.mode == Production or listenerImage(s)

pure def reviewProblems(s: Stage): Set[StageProblem] =
  problemIf(reviewedStage(s) and not(s.descriptorReviewed), NoReviewedDescriptor)
    .union(problemIf(reviewedStage(s) and not(s.productComplete), ProductIncomplete))
```

### Owner telephony is for a development stage of either target, and never for a listener image

Owner telephony is an image the owner builds with their own key that still
keeps Alpha's phone and messages; a production stage and a listener image
already carry image telephony.

```quint
pure def ownerTelephonyProblems(s: Stage): Set[StageProblem] =
  problemIf(s.ownerTelephony and s.mode != Development, OwnerTelephonyOutsideDevelopment)
    .union(problemIf(s.ownerTelephony and listenerImage(s), OwnerTelephonyOnAListenerImage))
```

### A listener image is a Pixel 10a stage with the listener, its qualification record and the chip, ops, protected power and Sense policy patches

```quint
pure val listenerPatches: List[Patch] = List(Chip, Ops, ProtectedPower, SensePolicy)
pure def carriesListenerPatches(s: Stage): bool = listenerPatches.every(p => s.patches.includes(p))

pure def listenerProblems(s: Stage): Set[StageProblem] =
  problemIf(listenerImage(s) and s.target != Pixel10a, ListenerImageOffThePixel)
    .union(problemIf(listenerImage(s) and not(s.listener and s.qualified and carriesListenerPatches(s)), ListenerImageIncomplete))
```

### The Sense policy patch belongs only to a listener image, and the protected power and generic assist patches never come together

Both power patches change the same SystemUI source.

```quint
pure def patchProblems(s: Stage): Set[StageProblem] =
  problemIf(s.patches.includes(SensePolicy) and not(listenerImage(s)), SensePolicyWithoutAListenerImage)
    .union(problemIf(s.patches.includes(ProtectedPower) and s.patches.includes(Assist), PowerAndAssistTogether))
```

### The branding packet is staged only into a production Pixel 10a

```quint
pure def brandingProblems(s: Stage): Set[StageProblem] = problemIf(s.branding and not(s.mode == Production and s.target == Pixel10a), BrandingOutsideAPixelProduction)
```

### A stage is admitted only when no rule above refuses it, and a refusal names every problem

The stage is refused before any APK, descriptor or source is read.

```quint
pure def stageProblems(s: Stage): Set[StageProblem] =
  reviewProblems(s).union(ownerTelephonyProblems(s)).union(listenerProblems(s)).union(patchProblems(s)).union(brandingProblems(s))

pure def stageAdmitted(s: Stage): bool = stageProblems(s).size() == 0

pure def lawAnAdmittedProductionStageWasReviewed(s: Stage): bool =
  (stageAdmitted(s) and s.mode == Production) implies (s.descriptorReviewed and s.productComplete and not(s.ownerTelephony))

pure def lawAnAdmittedListenerImageIsAQualifiedPixel(s: Stage): bool =
  (stageAdmitted(s) and listenerImage(s)) implies (s.target == Pixel10a and s.qualified and carriesListenerPatches(s))
```

## Story: Keep the phone and messages on Alpha's phone

> As the owner, I want my Alpha phone, a development one I built myself
> too, to keep Alpha able to take my calls and texts across an image update,
> without the image choosing for me.

### Image telephony is staged for a production stage, a listener image and an owner telephony stage, and for no other

Image telephony is the overlay that tells Alpha it runs on its own image,
which it needs before it offers Phone, Contacts and Messages, and the role
overrides that enable its call and message handlers at package scan, so
that Android still finds Alpha eligible for the dialer and SMS roles after
an image update. Neither assigns a role. A development stage without owner
telephony is a launcher only.

```quint
pure def imageTelephony(s: Stage): bool = s.mode == Production or listenerImage(s) or s.ownerTelephony

pure def lawALauncherOnlyDevelopmentStageKeepsNoRoles(s: Stage): bool =
  (s.mode == Development and not(s.ownerTelephony) and not(listenerImage(s))) implies not(imageTelephony(s))
```

### Home and Autofill defaults are staged only for a production stage or a listener image, so an owner's development phone keeps the owner's choices

```quint
pure def provisionsHome(s: Stage): bool = s.mode == Production or listenerImage(s)

pure def lawADevelopmentPhoneKeepsItsOwnersDefaults(s: Stage): bool =
  (s.mode == Development and not(listenerImage(s))) implies not(provisionsHome(s))
```

## Story: Let a handed-over phone update its launcher on its own

> As the owner of a phone handed to me, I want Alpha to install its own
> updates without first asking me to allow unknown apps, and Settings to
> show my phone's IMEI and SIM serial, and no other privileged power for
> the launcher.

### On an image the launcher holds exactly two privileged permissions, its phone's own identifiers and the install of its own updates, or none

Android grants a privileged permission only to a system app the image
allow-lists, and grants it to an update only when the image's own launcher
holds it; so the image decides, not an update.

```quint
pure val alphaPrivileged: List[str] = List("android.permission.READ_PRIVILEGED_PHONE_STATE", "android.permission.INSTALL_SELF_UPDATES")

pure def privilegedAdmitted(named: List[str]): bool = named == List() or named == alphaPrivileged

pure val namedValues = Set(List(), alphaPrivileged, List("android.permission.READ_PRIVILEGED_PHONE_STATE"),
  List("android.permission.INSTALL_SELF_UPDATES", "android.permission.READ_PRIVILEGED_PHONE_STATE"), alphaPrivileged.concat(List("android.permission.INSTALL_PACKAGES")))

pure def lawNoOtherPrivilegeIsAdmitted(named: List[str]): bool =
  privilegedAdmitted(named) implies named.every(p => alphaPrivileged.includes(p))
```

### The first-boot grants are exactly the startup walkthrough's, Contacts and phone state, each revocable, and never messages, calls or call history

A fresh phone whose launcher is the system shows no Android permission
dialog for them; the owner can still revoke each in Android's Settings.
Messages and calls come with the SMS and dialer roles, and call history
stays behind the owner's own control in Alpha.

```quint
pure val firstBootGrants: List[str] = List(
  "android.permission.POST_NOTIFICATIONS", "android.permission.RECORD_AUDIO", "android.permission.CAMERA",
  "android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.READ_CALENDAR", "android.permission.WRITE_CALENDAR",
  "android.permission.READ_MEDIA_IMAGES", "android.permission.READ_MEDIA_VIDEO", "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.READ_CONTACTS", "android.permission.WRITE_CONTACTS",
  "android.permission.READ_PHONE_STATE", "android.permission.READ_PHONE_NUMBERS")
pure val neverGranted: List[str] = List("android.permission.SEND_SMS", "android.permission.READ_SMS", "android.permission.CALL_PHONE", "android.permission.READ_CALL_LOG")

pure def grantsAdmitted(named: List[str]): bool = named == firstBootGrants

pure val grantValues = Set("android.permission.CAMERA", "android.permission.READ_SMS", "android.permission.CALL_PHONE", "android.permission.READ_CALL_LOG")

pure def lawNoMessageCallOrHistoryIsGrantedAtFirstBoot(grant: str): bool = neverGranted.includes(grant) implies not(firstBootGrants.includes(grant))
```

## Story: Update an Alpha Pixel by cable, and get back

> As Alpha's release owner, I want to put a signed Alpha release on a Pixel
> by cable from Alpha's one channel and fall back to the installed build, or
> to Google's stock image, when the update fails, so that no phone is left
> without a working system.

### Alpha has one update channel, stable, for alpha_stallion_phone on stallion, and refuses downgrades

`apps/app/aosp/pixel10a-ota-channel.json` is that channel, the file form of
the profile [OS](../../release/os.md) pins; eliza's operator checks every
candidate and fallback against it.

```quint
type Channel = { name: str, product: str, device: str, downgradeAllowed: bool }

pure val alphaChannel: Channel = { name: "stable", product: "alpha_stallion_phone", device: "stallion", downgradeAllowed: false }

pure def channelIsAlphas(c: Channel): bool = c == alphaChannel

pure val cValues = Set(alphaChannel, { ...alphaChannel, downgradeAllowed: true }, { ...alphaChannel, product: "alpha_cf_x86_64_phone" })

pure def lawAlphasChannelNeverDowngrades(c: Channel): bool = channelIsAlphas(c) implies not(c.downgradeAllowed)
```

### Each operator command reads Alpha's channel and the stallion stock source lock where it reads one and the operator named none

Checking, applying, archiving the stock image and retaining a known-good
release read the channel; archiving and verifying the stock image read the
stock source lock. Status and fallback read only the device's journal.

```quint
type OtaCommand = Check | Apply | Status | Fallback | StockArchive | VerifyStock | RetainKnownGood

pure def readsChannel(command: OtaCommand): bool = command == Check or command == Apply or command == StockArchive or command == RetainKnownGood
pure def readsSourceLock(command: OtaCommand): bool = command == StockArchive or command == VerifyStock

pure def lawAFallbackReadsOnlyTheJournal(command: OtaCommand): bool =
  (command == Status or command == Fallback) implies not(readsChannel(command) or readsSourceLock(command))
```

## Story: Sign Alpha's releases with one key

> As Alpha's release owner, I want every Alpha APK and image signed by the
> one key I enrolled, with no rotation, so that a phone takes an update only
> from Alpha and a key never silently changes.

### Alpha signs with one release key and never rotates it: a signer record that still carries a rotation is refused

This is the signer record's side of [Release](../../release/)'s one signer
and no rotation. Phones of Alpha's version 49, signed by the old key, are
wiped rather than updated in place, so nothing reads a rotation lineage any
more; a record that names one is refused rather than ignored.

```quint
type SignerRecord = { rotation: bool }

pure def signerRecordAdmitted(r: SignerRecord): bool = not(r.rotation)

pure val rValues = Set({ rotation: true }, { rotation: false })

pure def lawARotationIsNeverSigned(r: SignerRecord): bool = r.rotation implies not(signerRecordAdmitted(r))
```
