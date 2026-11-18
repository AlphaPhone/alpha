# Updates

How Alpha learns that a newer version of itself exists, and when it may
start installing it. Alpha reads its update channel's manifest every fifteen
minutes while it is on screen, keeps the offer that fits this phone, shows
it in Settings, and starts an automatic update only while the owner and the
phone are idle. Installing the offer is [Install](./install.md); a page
that opens or is open during an update is [Page](./page.md). How a release
reaches the channel is [Release](../../release/).

## Story: Read the update channel

> As the owner, I want Alpha to read its update channel, understand only a
> complete manifest, and never offer me another phone's build.

### A release names its variant, signer, version, download address, digest, size, version name and notes

The manifest describes each release by its variant (the launcher is the only
one Alpha installs), the digest of the certificate that signs it, its
version, its download address (whether it is HTTPS, carries credentials, and
its length), the digest and size of the APK, and the lengths of its version
name and notes. A digest or signer is a positive number standing for 64
lowercase hexadecimal characters; anything else is 0. A feed is one release,
or an index of releases, with the digest of the manifest's bytes.

```quint
import read as R from "../../kit/read"

type Variant = Launcher | OtherVariant
type Release = {
  variant: Variant, signer: int, version: int, digest: int, bytes: int,
  https: bool, credentials: bool, url: int, name: int, notes: int,
}
type Feed = { index: bool, releases: List[Release], manifest: int }

pure val noRelease: Release = {
  variant: OtherVariant, signer: 0, version: 0, digest: 0, bytes: 0,
  https: false, credentials: false, url: 0, name: 0, notes: 0,
}
pure val maxBytes = 2147483648
pure val maxUrl = 2048
pure val maxReleases = 16
pure val maxName = 64
pure val maxNotes = 500
```

### A release is well formed only with a signer, a version, an HTTPS address of at most 2048 characters without credentials, a digest, and a size of at most 2 GiB

```quint
pure def wellFormed(r: Release): bool =
  r.signer > 0 and r.version > 0 and r.digest > 0 and r.bytes > 0 and r.bytes <= maxBytes
    and r.https and not(r.credentials) and r.url > 0 and r.url <= maxUrl
```

### A manifest is complete when it is one well-formed release, or an index of 1 to 16 well-formed releases, no two with the same variant and signer

```quint
pure def sameKind(rs: List[Release], r: Release): int =
  rs.foldl(0, (n, q) => if (q.variant == r.variant and q.signer == r.signer) n + 1 else n)

pure def complete(f: Feed): bool =
  val n = f.releases.length()
  (if (f.index) n >= 1 and n <= maxReleases else n == 1)
    and f.releases.every(r => wellFormed(r) and sameKind(f.releases, r) == 1)
```

### An index of more than 16 releases is not complete

```quint
pure def lawAtMostSixteenReleases(feed: Feed): bool =
  feed.releases.length() > maxReleases implies not(complete(feed))
```

### An index that names one variant and signer twice is not complete

```quint
pure def lawARepeatedReleaseIsNotComplete(release: Release, manifest: int): bool =
  not(complete({ index: true, releases: List(release, release), manifest: manifest }))
```

### Of a complete manifest, Alpha keeps only the well-formed launcher release signed by the phone's own signing root

Another variant, another signer, or a release that is not well formed is
never kept, whatever else the manifest offers.

```quint
type Offer = { release: Release, manifest: int }

pure val noOffer: Offer = { release: noRelease, manifest: 0 }

pure def saved(o: Offer): bool = o.release.version > 0

pure def launcherFor(rs: List[Release], signer: int): Release =
  rs.foldl(noRelease, (found, r) => if (r.variant == Launcher and r.signer == signer) r else found)

pure def offerFrom(f: Feed, signer: int): Offer =
  val r = launcherFor(f.releases, signer)
  if (r.variant == Launcher and r.signer == signer and signer > 0 and wellFormed(r)) { release: r, manifest: f.manifest }
  else noOffer
```

### A version name is shown only when it has 1 to 64 characters, and notes only when they have at most 500

```quint
pure def nameShown(r: Release): bool = r.name >= 1 and r.name <= maxName

pure def notesShown(r: Release): bool = r.notes <= maxNotes
```

## Story: Keep the offer that fits this phone

> As the owner, I want to see an update only when it is newer than what I
> have and made for this phone, and to keep it when a check goes wrong.

### Alpha holds what the phone reports, the owner's activity, the check, the saved offer and whether an install is under way

The phone reports the installed version, its signing root and the install
permission. The owner's activity is reported by the shell and the other
areas; whether Alpha is in front (not behind another app or Ask Alpha's
own surface), whether a call is up and whether audio is in its normal mode
are reported by the phone. `asked` says the running check came from Settings; `note` is what
Settings says after such a check.

```quint
type Permission = Unsupported | Required | Starting | Supported
type Checked = Never | Fine | Missed
type Note = Silent | Ready | NothingNew | CouldNotCheck
type Activity = {
  home: bool, open: bool, typing: bool, voice: bool, dialog: bool, busy: bool, front: bool, call: bool, audio: bool,
}
type Updates = {
  installed: int, signer: int, permission: Permission, visible: bool, activity: Activity,
  check: R::Read, asked: bool, checked: Checked, checkedAt: int,
  offer: Offer, installing: bool, automatic: bool, note: Note,
}

pure val unknownActivity: Activity = {
  home: false, open: false, typing: false, voice: false, dialog: false, busy: false, front: false, call: false, audio: false,
}
pure val initial: Updates = {
  installed: 0, signer: 0, permission: Unsupported, visible: false, activity: unknownActivity,
  check: R::unread, asked: false, checked: Never, checkedAt: 0,
  offer: noOffer, installing: false, automatic: false, note: Silent,
}
```

### An offer applies only while its version is above the installed one

```quint
pure def applies(s: Updates): bool =
  saved(s.offer) and s.offer.release.version > s.installed
```

### The installed version never goes down, the signing root never changes, and a phone past its first 30 seconds is never starting again

Android refuses a downgrade, and Alpha signs with one key and never rotates
it, so a report of a lower version or another root is refused. A page lives
within one boot, so once the phone has reported the permission as required
or supported it is not starting any more.

```quint
pure def booted(p: Permission): bool = p == Required or p == Supported

pure def canObservePhone(s: Updates, installed: int, signer: int, permission: Permission): bool =
  installed >= s.installed and signer > 0 and (s.signer == 0 or signer == s.signer)
    and not(permission == Starting and booted(s.permission))

pure def observePhone(s: Updates, installed: int, signer: int, permission: Permission): Updates =
  { ...s, installed: installed, signer: signer, permission: permission }

pure def stepTheInstalledVersionOnlyAdvances(before: Updates, after: Updates): bool =
  after.installed >= before.installed and (before.signer != 0 implies after.signer == before.signer)
    and (booted(before.permission) implies after.permission != Starting)
```

### The saved offer is always the launcher signed by this phone's root

```quint
pure def alwaysTheOfferIsThisPhones(s: Updates): bool =
  saved(s.offer) implies
    (s.offer.release.variant == Launcher and s.offer.release.signer == s.signer and wellFormed(s.offer.release))
```

### An offer can apply

```quint
pure def sometimesAnOfferApplies(s: Updates): bool = applies(s)
```

## Story: Check for updates

> As the owner, I want Alpha to look for updates on its own while I use it,
> and to check at once when I ask, without two checks at the same time.

### Alpha knows whether it is on screen and what the owner is doing

```quint
pure def show(s: Updates, visible: bool): Updates = { ...s, visible: visible }

pure def observeActivity(s: Updates, activity: Activity): Updates = { ...s, activity: activity }
```

### A check is due fifteen minutes after one that was answered, a minute after one that failed, and at once before the first or when the clock went back

```quint
pure val interval = 900
pure val retry = 60

pure def dueAfter(checked: Checked, checkedAt: int, now: int): bool =
  checked == Never or now < checkedAt or now - checkedAt >= (if (checked == Missed) retry else interval)
```

### An answered check is not repeated within fifteen minutes

```quint
pure def lawAnAnsweredCheckWaitsFifteenMinutes(checkedAt: int, now: int): bool =
  (now >= checkedAt and now - checkedAt < interval) implies not(dueAfter(Fine, checkedAt, now))
```

### A failed check is tried again after one minute, not before

```quint
pure def lawAFailedCheckRetriesAfterAMinute(checkedAt: int): bool =
  dueAfter(Missed, checkedAt, checkedAt + retry) and not(dueAfter(Missed, checkedAt, checkedAt + retry - 1))
```

### Alpha checks on its own only while on screen, when a check is due, and never during another check or an install

```quint
type Effect =
  | CheckFeed({ ticket: int })
  | StartInstall({ version: int, digest: int, bytes: int, signer: int, manifest: int, automatic: bool })
  | OpenInstallSettings
type Acted = { state: Updates, out: List[Effect] }

pure def free(s: Updates): bool = s.check.status != R::Loading and not(s.installing)

pure def canPoll(s: Updates, now: int): bool = s.visible and dueAfter(s.checked, s.checkedAt, now) and free(s)

pure def poll(s: Updates, now: int): Acted =
  val c = R::ask(s.check)
  { state: { ...s, check: c, asked: false }, out: List(CheckFeed({ ticket: c.ticket })) }
```

### Check for updates checks at once, unless a check or an install is under way

```quint
pure def canCheckNow(s: Updates): bool = free(s)

pure def checkNow(s: Updates): Acted =
  val c = R::ask(s.check)
  { state: { ...s, check: c, asked: true, note: Silent }, out: List(CheckFeed({ ticket: c.ticket })) }
```

### Only one check is ever under way, and never during an install

```quint
pure def alwaysOneThingAtATime(s: Updates): bool = not(s.installing and s.check.status == R::Loading)

pure def stepACheckStartsOnlyWhenFree(before: Updates, after: Updates, out: List[Effect]): bool =
  out.every(e => match e { | CheckFeed(c) => free(before) | _ => true })
```

### Only the answer to the newest check is taken: a complete manifest replaces the offer, a withdrawn one removes it, and anything else keeps it

The channel answers with a manifest, says it is withdrawn (the manifest is
gone), or cannot be read. A manifest that is not complete counts as
unreadable. Settings then says whether a compatible update is ready, none
was offered, or the check failed.

```quint
type Reply = Withdrawn | Unreadable | Answered(Feed)

pure def understood(reply: Reply): bool = match reply {
  | Unreadable => false
  | Answered(f) => complete({ index: f.index, releases: f.releases, manifest: f.manifest })
  | _ => true
}

pure def canAnswer(s: Updates, ticket: int): bool = R::canAnswer(s.check, ticket)

pure def answer(s: Updates, ticket: int, reply: Reply, now: int): Updates =
  val ok = understood(reply)
  val kept = { ...s.offer, manifest: 0 }
  val offer = match reply {
    | Withdrawn => noOffer
    | Unreadable => kept
    | Answered(f) => if (ok) offerFrom({ index: f.index, releases: f.releases, manifest: f.manifest }, s.signer) else kept
  }
  val after = { ...s, check: R::answer(s.check, ok), checked: if (ok) Fine else Missed, checkedAt: now, offer: offer }
  { ...after, note: if (not(s.asked)) s.note else if (not(ok)) CouldNotCheck else if (applies(after)) Ready else NothingNew }
```

### A check that fails never replaces the saved offer

The offer stays in Settings, but an automatic update waits for a check that
succeeds again.

```quint
pure def stepAFailedCheckKeepsTheOffer(before: Updates, via: str, after: Updates): bool =
  (via == "answer" and after.checked == Missed) implies
    (after.offer.release == before.offer.release and after.offer.manifest == 0)
```

### A failed check can leave the saved offer in place

```quint
pure def sometimesAFailedCheckKeptTheOffer(s: Updates): bool = s.checked == Missed and saved(s.offer)
```

### Settings can say that no compatible update was offered, or that the check failed

```quint
pure def sometimesNothingNew(s: Updates): bool = s.note == NothingNew

pure def sometimesCouldNotCheck(s: Updates): bool = s.note == CouldNotCheck
```

## Story: Install an update

> As the owner, I want to install an update from Settings, and Alpha to
> install one on its own only when I am not using the phone.

### The owner is idle only on Home with nothing open, not typing, no voice, no dialog and the connection not busy, and the phone is quiet only with Alpha in front, no call and normal audio

```quint
pure def ownerIdle(a: Activity): bool =
  a.home and not(a.open) and not(a.typing) and not(a.voice) and not(a.dialog) and not(a.busy)

pure def phoneQuiet(a: Activity): bool = a.front and not(a.call) and a.audio
```

### Any one activity keeps an automatic update from starting

```quint
pure def lawAnyActivityBlocks(activity: Activity): bool =
  (not(activity.home) or activity.open or activity.typing or activity.voice or activity.dialog or activity.busy
    or not(activity.front) or activity.call or not(activity.audio))
    implies not(ownerIdle(activity) and phoneQuiet(activity))
```

### Install update installs the offer that applies, unless Android's install permission is missing or Alpha is busy

```quint
pure def offered(s: Updates, automatic: bool): Effect =
  StartInstall({
    version: s.offer.release.version, digest: s.offer.release.digest, bytes: s.offer.release.bytes,
    signer: s.offer.release.signer, manifest: s.offer.manifest, automatic: automatic,
  })

pure def canInstall(s: Updates): bool = applies(s) and free(s) and s.permission != Required

pure def install(s: Updates): Acted =
  { state: { ...s, installing: true, automatic: false }, out: List(offered(s, false)) }
```

### An automatic update starts only on screen, with the owner idle, the phone quiet, Android's permission, and an offer from a check that succeeded

```quint
pure def canStartAutomatically(s: Updates): bool =
  s.visible and ownerIdle(s.activity) and phoneQuiet(s.activity) and s.permission == Supported
    and applies(s) and s.offer.manifest > 0 and free(s)

pure def startAutomatically(s: Updates): Acted =
  { state: { ...s, installing: true, automatic: true }, out: List(offered(s, true)) }
```

### An install is only ever of the offer that applies, never while a check or another install is under way

```quint
pure def stepAnInstallIsOfTheOfferThatApplies(before: Updates, after: Updates, out: List[Effect]): bool =
  out.every(e => match e {
    | StartInstall(i) =>
      applies(before) and free(before) and i.version == before.offer.release.version
        and i.version > before.installed and i.digest == before.offer.release.digest
        and i.signer == before.signer and i.manifest == before.offer.manifest
    | _ => true
  })
```

### An automatic install starts only while the owner is idle, the phone quiet and Android allows it

```quint
pure def stepAnAutomaticInstallWaitsForIdle(before: Updates, after: Updates, out: List[Effect]): bool =
  out.every(e => match e {
    | StartInstall(i) =>
      i.automatic implies (before.visible and ownerIdle(before.activity) and phoneQuiet(before.activity)
        and before.permission == Supported and i.manifest > 0)
    | _ => true
  })
```

### When the install ends, is put off, or finds its offer changed or withdrawn, Alpha is free again

A changed offer waits for a new check before an automatic update; a
withdrawn one is removed.

```quint
type Ending = Finished | Deferred | OfferChanged | OfferWithdrawn

pure def canEndInstall(s: Updates): bool = s.installing

pure def endInstall(s: Updates, ending: Ending): Updates =
  val offer = if (ending == OfferWithdrawn) noOffer else if (ending == OfferChanged) { ...s.offer, manifest: 0 } else s.offer
  { ...s, installing: false, automatic: false, offer: offer }
```

### An automatic install can start

```quint
pure def sometimesAnAutomaticInstall(s: Updates): bool = s.installing and s.automatic
```

### Install update can be under way

```quint
pure def sometimesAManualInstall(s: Updates): bool = s.installing and not(s.automatic)
```

## Story: Allow automatic updates

> As the owner, I want to see whether Alpha may update itself, and to be
> taken to Android's setting when it may not.

### Android's install permission is unsupported, required, starting or supported

Unsupported is an Android older than 12. Required means Alpha may neither
update itself nor ask Android to install. Starting means the phone booted
less than 30 seconds ago. The permission comes from the phone in
`observePhone`.

```quint
pure def automaticStatus(s: Updates): str =
  if (s.permission == Supported) "Allowed" else if (s.permission == Starting) "Starting" else ""
```

### Allow automatic updates is offered only while the permission is required, and opens Android's setting

```quint
pure def canAllowAutomatic(s: Updates): bool = s.permission == Required

pure def allowAutomatic(s: Updates): Acted = { state: s, out: List(OpenInstallSettings) }
```

### Android's setting is opened only when the permission is required

```quint
pure def stepSettingsOpenOnlyWhenRequired(before: Updates, after: Updates, out: List[Effect]): bool =
  out.every(e => match e { | OpenInstallSettings => before.permission == Required | _ => true })
```

### Allow automatic updates can be offered beside an update

```quint
pure def sometimesPermissionRequired(s: Updates): bool = s.permission == Required and applies(s)
```

## Story: Settings rows

> As the owner, I want Settings to show the update rows plainly: the
> permission, the update to install, Check for updates, and what the last
> check found.

### Settings shows Install update with the offered version while an offer applies, and its label says when it is downloading

```quint
pure def installRowShown(s: Updates): bool = applies(s)

pure def installLabel(s: Updates): str =
  if (s.installing and not(s.automatic)) "Downloading update" else "Install update"
```

### Check for updates says when it is checking

```quint
pure def checkLabel(s: Updates): str =
  if (s.check.status == R::Loading and s.asked) "Checking for updates" else "Check for updates"
```

### After a check from Settings, the status row says what it found

```quint
pure def noteText(s: Updates): str =
  if (s.note == Ready) "A compatible update is ready below."
  else if (s.note == NothingNew) "No compatible update was offered."
  else if (s.note == CouldNotCheck) "Couldn’t check for updates. Try again."
  else ""
```

### What the simulator tries

```quint
pure def good(signer: int, version: int): Release =
  { variant: Launcher, signer: signer, version: version, digest: version, bytes: 1,
    https: true, credentials: false, url: 40, name: 4, notes: 0 }

pure val installedValues = Set(0, 1, 2, 3)
pure val signerValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
pure val nowValues = Set(0, 30, 60, 900, 2000)
pure val quiet: Activity = { ...unknownActivity, home: true, front: true, audio: true }
pure val activityValues =
  Set(quiet)
    .union(Set({ ...quiet, typing: true }))
    .union(Set({ ...quiet, call: true }))
    .union(Set({ ...quiet, dialog: true }))
    .union(Set({ ...quiet, front: false }))
    .union(Set(unknownActivity))
pure val releaseValues = Set(good(1, 2)).union(Set({ ...good(1, 2), https: false })).union(Set(noRelease))
pure val manifestValues = Set(7, 8)
pure val feedValues =
  Set({ index: false, releases: List(good(1, 2)), manifest: 7 })
    .union(Set({ index: true, releases: List(good(1, 2), good(2, 3)), manifest: 8 }))
    .union(Set({ index: true, releases: List(
      good(1, 1), good(2, 1), good(3, 1), good(4, 1), good(5, 1), good(6, 1), good(7, 1), good(8, 1), good(9, 1),
      good(10, 1), good(11, 1), good(12, 1), good(13, 1), good(14, 1), good(15, 1), good(16, 1), good(17, 1)), manifest: 9 }))
pure val replyValues =
  Set(Withdrawn).union(Set(Unreadable))
    .union(Set(Answered({ index: false, releases: List(good(1, 2)), manifest: 7 })))
    .union(Set(Answered({ index: true, releases: List(good(1, 3), good(2, 4)), manifest: 8 })))
    .union(Set(Answered({ index: true, releases: List(good(1, 3), good(1, 3)), manifest: 9 })))
    .union(Set(Answered({ index: false, releases: List({ ...good(1, 4), https: false }), manifest: 10 })))
    .union(Set(Answered({ index: false, releases: List({ ...good(1, 4), variant: OtherVariant }), manifest: 11 })))
    .union(Set(Answered({ index: true, releases: List(), manifest: 12 })))
```
