# Collection

Other apps' notifications, which Alpha collects only when the owner
consents and Android gives it the authority to: it lists them, shows their
text only with the owner's consent to previews, keeps a short history only
if asked, and forgets everything when collecting stops. The listing is a
kit [read](../../kit/read.md), so an answer to an older listing is never
shown. Asking Alpha about one of these rows is a [notice tap](./index.md)
from the shade.

## Story: Let Alpha see my notifications

> As the owner, I want Alpha to read other apps' notifications only while I
> have turned collection on and Android allows it, and to forget them when
> either stops.

### Collection holds the owner's consent, Android's authority, the phone's state, the listing, the rows shown and the history kept

The owner turns collection, previews and history on or off, and can pause
it. Android grants the listener access, the phone may be locked, and the
app collected from is admitted only while it is the one the owner chose,
signed the same, for this user.

```quint
import read as R from "../../kit/read"

type Act = Listing | Open | Dismiss | ClearAll
type Effect = { act: Act, ticket: int }
type Collection = {
  on: bool, preview: bool, keep: bool, paused: bool,
  access: bool, admitted: bool, locked: bool,
  listing: R::Read, rows: int, previews: bool, kept: int,
}
type Listed = { state: Collection, out: List[Effect] }

pure val maxKept = 20

pure val initial: Collection = {
  on: false, preview: false, keep: false, paused: false,
  access: false, admitted: false, locked: false,
  listing: R::unread, rows: 0, previews: false, kept: 0,
}
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val rowsValues = Set(0, 1, 3)
pure val weight_listed = 3
```

### Collection is active only while it is on and not paused, Android allows it and the app is admitted

```quint
pure def active(c: Collection): bool = c.on and not(c.paused) and c.access and c.admitted
```

### Any change of consent or authority drops the rows shown, asks for a new listing when collection is active, and forgets the history when it is not

A listing asked before the change can no longer be answered.

```quint
pure def fenced(asked: R::Read, c: Collection): Listed =
  val listing = R::ask(asked)
  val live = active(c) and not(c.locked)
  { state: { ...c, listing: listing, rows: 0, previews: false, kept: if (active(c) and c.keep) c.kept else 0 },
    out: if (live) List({ act: Listing, ticket: listing.ticket }) else List() }
```

### The owner turns collection, previews and history on or off; previews and history need collection on

```quint
pure def canConsent(c: Collection, on: bool, preview: bool, keep: bool): bool =
  (preview or keep) implies on

pure def consent(c: Collection, on: bool, preview: bool, keep: bool): Listed =
  fenced(c.listing, { ...c, on: on, preview: preview, keep: keep })
```

### The owner pauses and resumes collection

```quint
pure def canPause(c: Collection, paused: bool): bool = c.paused != paused

pure def pause(c: Collection, paused: bool): Listed = fenced(c.listing, { ...c, paused: paused })
```

### The phone says whether Android allows collection and whether the app is admitted

```quint
pure def observe(c: Collection, access: bool, admitted: bool): Listed =
  fenced(c.listing, { ...c, access: access, admitted: admitted })
```

### The phone says when it locks, and a locked phone shows no rows

```quint
pure def canLock(c: Collection, locked: bool): bool = c.locked != locked

pure def lock(c: Collection, locked: bool): Listed = fenced(c.listing, { ...c, locked: locked })
```

### Only the newest listing is shown, while collection is active and the phone unlocked; its text only with consent to previews and never for a secret notification

The history keeps what was listed, up to twenty, only with consent to it.

```quint
pure def canListed(c: Collection, ticket: int, rows: int): bool =
  R::canAnswer(c.listing, ticket) and active(c) and not(c.locked) and rows >= 0

pure def listed(c: Collection, ticket: int, rows: int, secret: bool): Collection =
  val total = c.kept + rows
  { ...c, listing: R::answer(c.listing, true), rows: rows, previews: c.preview and not(secret) and rows > 0,
    kept: if (not(c.keep)) 0 else if (total > maxKept) maxKept else total }
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

### Rows appear only from a listing

```quint
pure def stepRowsComeFromAListing(before: Collection, via: str, after: Collection): bool =
  (after.rows > before.rows or after.kept > before.kept) implies via == "listed"
```

### A secret notification's text is never shown

```quint
pure def lawASecretIsNeverPreviewed(ticket: int, rows: int): bool =
  val c = { ...initial, on: true, preview: true, access: true, admitted: true, listing: { status: R::Loading, ticket: ticket } }
  not(listed(c, ticket, rows, true).previews)
```

### Rows can show with their text, without it, and the history can be kept while the phone is locked

```quint
pure def sometimesPreviews(c: Collection): bool = c.previews

pure def sometimesRowsWithoutText(c: Collection): bool = c.rows > 0 and not(c.previews)

pure def sometimesKeptWhileLocked(c: Collection): bool = c.locked and c.kept > 0
```

## Story: Act on another app's notification

> As the owner, I want to open or dismiss a notification from Alpha the way
> its own app would, and never have Alpha open something that is not that
> app's own.

### A row is opened only through its own app, never when it is secret, and only while the phone is unlocked

```quint
pure def canOpen(c: Collection, owned: bool, secret: bool): bool = c.rows > 0 and not(c.locked) and owned and not(secret)

pure def open(c: Collection, owned: bool, secret: bool): Listed = { state: c, out: List({ act: Open, ticket: c.listing.ticket }) }
```

### A row its app lets be cleared can be dismissed, and Clear all dismisses every row at once

```quint
pure def canDismiss(c: Collection, clearable: bool): bool = c.rows > 0 and not(c.locked) and clearable

pure def dismiss(c: Collection, clearable: bool): Listed =
  { state: { ...c, rows: c.rows - 1, previews: c.previews and c.rows > 1 }, out: List({ act: Dismiss, ticket: c.listing.ticket }) }

pure def canClearAll(c: Collection): bool = c.rows > 0 and not(c.locked)

pure def clearAll(c: Collection): Listed =
  { state: { ...c, rows: 0, previews: false }, out: List({ act: ClearAll, ticket: c.listing.ticket }) }
```

### The owner can clear the history

```quint
pure def canClearHistory(c: Collection): bool = c.kept > 0

pure def clearHistory(c: Collection): Collection = { ...c, kept: 0 }
```

### Nothing is opened or dismissed without a row on an unlocked phone

```quint
pure def stepActingNeedsARow(before: Collection, via: str, after: Collection, out: List[Effect]): bool =
  out.every(e => if (e.act == Listing) e.ticket == after.listing.ticket
    else before.rows > 0 and not(before.locked) and active(before))
    and out.length() <= 1
```

### Every row can be cleared at once

```quint
pure def sometimesAllCleared(c: Collection): bool = c.rows == 0 and c.kept > 0 and not(c.locked)
```
