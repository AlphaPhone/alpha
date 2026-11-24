# Collection

Other apps' notifications, which Alpha collects only when the owner
consents and Android gives it the authority to: it lists them, shows their
text only with the owner's consent to previews, keeps a short history only
if asked and only for so long, and forgets everything when collecting
stops. Alpha's own notices are listed beside them as rows of its own app,
which need no listener consent: they show while their channel is on and
the phone unlocked, and dismissing one withdraws its
[delivery](./posting.md). The listing is a kit [read](../../kit/read.md), so an answer to
an older listing is never shown, and listener access is a kit
[permission](../../kit/permission.md) that only Android's Settings grants.
Asking Alpha about one of these rows is a [notice tap](./index.md) from the
shade. Who is signed in comes from the account area.

## Story: Let Alpha see my notifications

> As the owner, I want Alpha to read other apps' notifications only while I
> have turned collection on, chosen the app, and Android allows it, and to
> forget them when any of that stops.

### Collection holds whose consent it is, the consent, the app chosen, Android's listener access, the phone's lock, the listing, the rows shown, Alpha's own rows and the history kept since a time

```quint
import read as R from "../../kit/read"
import permission as K from "../../kit/permission"
import operation as O from "../approvals/operation"

type Act = Listing | Open | Dismiss | ClearAll | OpenSettings | DismissOwn
type Effect = { act: Act, ticket: int }
type Collection = {
  owner: int, on: bool, preview: bool, keep: bool, paused: bool, chosen: bool,
  access: K::Permission, locked: bool,
  listing: R::Read, rows: int, previews: bool, kept: int, keptSince: int, own: int,
}
type Listed = { state: Collection, out: List[Effect] }

pure val maxKept = 20
pure val historyAge = 100

pure val initial: Collection = {
  owner: 0, on: false, preview: false, keep: false, paused: false, chosen: false,
  access: K::unasked, locked: false,
  listing: R::unread, rows: 0, previews: false, kept: 0, keptSince: 0, own: 0,
}

pure val ticketValues = Set(1, 2, 3, 4)
pure val rowsValues = Set(0, 1, 3)
pure val atValues = Set(0, 50, 150)
pure val nowValues = Set(0, 50, 150, 250)
pure val signedInValues = Set(1, 2)
pure val weight_listed = 3
pure val weight_consent = 2
```

### Collection is active only while it is on and not paused, Android allows it and the app is chosen

```quint
pure def active(c: Collection): bool = c.on and not(c.paused) and K::allows(c.access) and c.chosen
```

### Any change of consent or authority drops the rows shown, asks for a new listing when collection is active, and forgets the history when it is not

A listing asked before the change can no longer be answered.

```quint
pure def fenced(asked: R::Read, c: Collection): Listed =
  val live = active(c) and not(c.locked)
  val listing = if (live) R::ask(asked) else { ...asked, status: R::Idle }
  { state: { ...c, listing: listing, rows: 0, previews: false, kept: if (active(c) and c.keep) c.kept else 0 },
    out: if (live) List({ act: Listing, ticket: listing.ticket }) else List() }
```

### Only the owner signed in turns collection, previews and history on or off; previews and history need collection on

```quint
pure def canConsent(c: Collection, on: bool, preview: bool, keep: bool, signedIn: int, by: O::Actor): bool =
  by == O::Owner and signedIn == c.owner and signedIn > 0 and ((preview or keep) implies on)

pure def consent(c: Collection, on: bool, preview: bool, keep: bool, signedIn: int, by: O::Actor): Listed =
  fenced(c.listing, { ...c, on: on, preview: preview, keep: keep })

pure def lawOnlyTheOwnerConsents(c: Collection, on: bool, preview: bool, keep: bool, signedIn: int, who: O::Actor): bool =
  (who != O::Owner or signedIn != c.owner) implies not(canConsent(c, on, preview, keep, signedIn, who))
```

### The owner pauses and resumes collection, and chooses the app to collect from

```quint
pure def canPause(c: Collection, paused: bool, by: O::Actor): bool = by == O::Owner and c.paused != paused

pure def pause(c: Collection, paused: bool, by: O::Actor): Listed = fenced(c.listing, { ...c, paused: paused })

pure def canChoose(c: Collection, by: O::Actor): bool = by == O::Owner and not(c.chosen)

pure def choose(c: Collection, by: O::Actor): Listed = fenced(c.listing, { ...c, chosen: true })
```

### Listener access is granted only in Android's Settings, which Alpha opens for the owner

```quint
pure def canOpenSettings(c: Collection, by: O::Actor): bool = by == O::Owner and not(K::allows(c.access))

pure def openSettings(c: Collection, by: O::Actor): Listed =
  { state: { ...c, access: K::ask(c.access) }, out: List({ act: OpenSettings, ticket: c.listing.ticket }) }
```

### The phone says what Android allows, and whether the chosen app is still signed the same for this user; one that changed must be chosen again

```quint
pure def canObserve(c: Collection, by: O::Actor): bool = by == O::Phone

pure def observe(c: Collection, grant: K::Grant, sameSigner: bool, by: O::Actor): Listed =
  fenced(c.listing, { ...c, access: K::observe(c.access, grant), chosen: c.chosen and sameSigner })
```

### The phone says when it locks, and a locked phone shows no rows

```quint
pure def canLock(c: Collection, locked: bool, by: O::Actor): bool = by == O::Phone and c.locked != locked

pure def lock(c: Collection, locked: bool, by: O::Actor): Listed =
  fenced(c.listing, { ...c, locked: locked, own: if (locked) 0 else c.own })
```

### Only the newest listing is shown, while collection is active and the phone unlocked; its text only with consent to previews and never for a secret notification; a listing can fail

The history keeps what was listed, up to twenty, only with consent to it,
dated from the time the oldest it keeps was listed.

```quint
pure def canListed(c: Collection, ticket: int, rows: int, by: O::Actor): bool =
  by == O::Phone and R::canAnswer(c.listing, ticket) and active(c) and not(c.locked) and rows >= 0

pure def listed(c: Collection, ticket: int, ok: bool, rows: int, secret: bool, at: int, by: O::Actor): Collection =
  val shown = if (ok) rows else 0
  val total = c.kept + shown
  { ...c, listing: R::answer(c.listing, ok), rows: shown, previews: c.preview and not(secret) and shown > 0,
    kept: if (not(c.keep)) 0 else if (total > maxKept) maxKept else total,
    keptSince: if (c.kept == 0) at else c.keptSince }
```

### History older than its limit is forgotten

```quint
pure def canForget(c: Collection, now: int, by: O::Actor): bool = by == O::Phone and c.kept > 0 and now >= c.keptSince + historyAge

pure def forget(c: Collection, now: int, by: O::Actor): Collection = { ...c, kept: 0 }

pure def leadsToOldHistoryIsForgotten(c: Collection, later: Collection): bool =
  c.kept > 0 implies (later.kept == 0 or later.keptSince != c.keptSince)

pure val fair_forget = "weak"
```

### Rows are shown only while collection is active and the phone unlocked

```quint
pure def alwaysRowsNeedAuthority(c: Collection): bool =
  (c.rows > 0 implies (active(c) and not(c.locked))) and c.rows >= 0
```

### Text is shown only with consent to previews

```quint
pure def alwaysAPreviewNeedsConsent(c: Collection): bool = c.previews implies (c.preview and c.rows > 0)
```

### When collection stops, nothing collected is kept

```quint
pure def alwaysClearedWhenCollectionStops(c: Collection): bool =
  (not(active(c)) implies c.kept == 0) and (c.kept > 0 implies c.keep) and 0 <= c.kept and c.kept <= maxKept
```

### Rows appear only from a listing, and an app is collected from again only once the owner chooses it

```quint
pure def stepRowsComeFromAListing(before: Collection, via: str, after: Collection): bool =
  ((after.rows > before.rows or after.kept > before.kept) implies via == "listed")
    and ((after.chosen and not(before.chosen)) implies via == "choose")
```

### A secret notification's text is never shown

```quint
pure def lawASecretIsNeverPreviewed(ticket: int, rows: int, at: int): bool =
  val c = { ...initial, owner: 1, on: true, preview: true, chosen: true, access: K::observe(K::unasked, K::Granted),
    listing: { status: R::Loading, ticket: ticket } }
  not(listed(c, ticket, true, rows, true, at, O::Phone).previews)
```

### Rows can show with their text, without it, the history can be kept while the phone is locked, a listing can fail, and an app can need choosing again

```quint
pure def sometimesPreviews(c: Collection): bool = c.previews

pure def sometimesRowsWithoutText(c: Collection): bool = c.rows > 0 and not(c.previews)

pure def sometimesKeptWhileLocked(c: Collection): bool = c.locked and c.kept > 0

pure def sometimesListingFailed(c: Collection): bool = c.listing.status == R::Failed and active(c)

pure def sometimesChooseAgain(c: Collection): bool = c.on and K::allows(c.access) and not(c.chosen) and c.listing.ticket > 0

pure def sometimesPausedAndForgotten(c: Collection): bool = c.paused and c.on and c.keep and c.kept == 0

pure def sometimesNeedsSettings(c: Collection): bool = K::needsSettings(c.access) and c.on
```

## Story: Act on another app's notification

> As the owner, I want to open or dismiss a notification from Alpha the way
> its own app would, and never have Alpha open something that is not that
> app's own.

### A row is opened only through its own app, never when it is secret, and only while the phone is unlocked

```quint
pure def canOpen(c: Collection, owned: bool, secret: bool, by: O::Actor): bool =
  by == O::Owner and c.rows > 0 and not(c.locked) and owned and not(secret)

pure def open(c: Collection, owned: bool, secret: bool, by: O::Actor): Listed = { state: c, out: List({ act: Open, ticket: c.listing.ticket }) }
```

### A row its app lets be cleared can be dismissed, and Clear all dismisses every row, each against the listing shown, never while locked

```quint
pure def canDismiss(c: Collection, clearable: bool, by: O::Actor): bool = by == O::Owner and c.rows > 0 and not(c.locked) and clearable

pure def dismiss(c: Collection, clearable: bool, by: O::Actor): Listed =
  { state: { ...c, rows: c.rows - 1, previews: c.previews and c.rows > 1 }, out: List({ act: Dismiss, ticket: c.listing.ticket }) }

pure def canClearAll(c: Collection, by: O::Actor): bool = by == O::Owner and c.rows > 0 and not(c.locked)

pure def clearAll(c: Collection, by: O::Actor): Listed =
  { state: { ...c, rows: 0, previews: false }, out: List({ act: ClearAll, ticket: c.listing.ticket }) }
```

### Clear all leaves what dismissing each row in turn leaves

```quint
pure def lawClearAllIsEachDismissedInTurn(ticket: int): bool =
  val c = { ...initial, owner: 1, on: true, preview: true, chosen: true, access: K::observe(K::unasked, K::Granted),
    listing: { status: R::Loaded, ticket: ticket }, rows: 2, previews: true }
  clearAll(c, O::Owner).state == dismiss(dismiss(c, true, O::Owner).state, true, O::Owner).state
```

### The owner can clear the history

```quint
pure def canClearHistory(c: Collection, by: O::Actor): bool = by == O::Owner and c.kept > 0

pure def clearHistory(c: Collection, by: O::Actor): Collection = { ...c, kept: 0 }
```

### Nothing is opened or dismissed without a row on an unlocked phone, and each act names the listing shown

```quint
pure def stepActingNeedsARow(before: Collection, via: str, after: Collection, out: List[Effect]): bool =
  out.every(e => if (e.act == Listing) e.ticket == after.listing.ticket
    else if (e.act == OpenSettings) via == "openSettings"
    else if (e.act == DismissOwn) via == "dismissOwn" and before.own > 0 and not(before.locked)
    else before.rows > 0 and not(before.locked) and active(before) and e.ticket == before.listing.ticket)
    and out.length() <= 1
```

### Every row can be cleared at once

```quint
pure def sometimesAllCleared(c: Collection): bool = c.rows == 0 and c.kept > 0 and not(c.locked)
```

## Story: See and dismiss Alpha's own notices

> As the owner, I want Alpha's own notices listed with the others whether
> or not I let Alpha read other apps, and to dismiss them the same way.

### The phone lists Alpha's own notices still out while their channel is on and the phone unlocked, whatever the listener consent

```quint
pure def canShowOwn(c: Collection, rows: int, by: O::Actor): bool = by == O::Phone and rows >= 0

pure def showOwn(c: Collection, rows: int, channel: bool, by: O::Actor): Collection =
  { ...c, own: if (channel and not(c.locked)) rows else 0 }
```

### An own notice is dismissed only on an unlocked phone, which withdraws its delivery

The lock is checked in the same step that dismisses it.

```quint
pure def canDismissOwn(c: Collection, by: O::Actor): bool = by == O::Owner and c.own > 0 and not(c.locked)

pure def dismissOwn(c: Collection, by: O::Actor): Listed =
  { state: { ...c, own: c.own - 1 }, out: List({ act: DismissOwn, ticket: c.listing.ticket }) }
```

### Alpha's own rows need no listener consent, and show only while the phone is unlocked

```quint
pure def alwaysOwnRowsNeedNoListenerConsent(c: Collection): bool = c.own >= 0 and (c.own > 0 implies not(c.locked))
```

### Own rows can show while collection is off

```quint
pure def sometimesOwnRowsWithoutConsent(c: Collection): bool = c.own > 0 and not(active(c))
```

## Story: Change owner or restart while collecting

> As the owner, I want what Alpha collected for me never shown to someone
> else, and my consent to survive a restart.

### Changing owner forgets everything collected, the consent, which is the new owner's to give, and the own rows of the owner before

```quint
pure def canSwitchOwner(c: Collection, signedIn: int, by: O::Actor): bool = by == O::Phone and signedIn != c.owner

pure def switchOwner(c: Collection, signedIn: int, by: O::Actor): Listed =
  fenced(c.listing, { ...c, owner: signedIn, on: false, preview: false, keep: false, paused: false, chosen: false, own: 0 })
```

### A restart keeps the consent and the history, drops the rows shown, Alpha's own included until the phone lists them again, and asks for a new listing

```quint
pure def canRestart(c: Collection, by: O::Actor): bool = by == O::Phone

pure def restart(c: Collection, by: O::Actor): Listed = fenced(c.listing, { ...c, own: 0 })

pure def stepARestartKeepsTheConsent(before: Collection, via: str, after: Collection): bool =
  (via == "restart" implies
    (after.on == before.on and after.preview == before.preview and after.keep == before.keep and after.chosen == before.chosen
      and after.rows == 0 and after.own == 0 and after.kept == before.kept))
    and (via == "switchOwner" implies (not(after.on) and after.kept == 0 and after.rows == 0 and after.own == 0))
```
