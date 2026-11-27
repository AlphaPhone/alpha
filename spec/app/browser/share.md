# Share

How the page leaves the Browser at the owner's own request: sharing through
Android's share sheet, copying the link or preparing an email draft, and
opening the page in another browser where it needs what Alpha's tabs cannot
do, such as a passkey, or where a tab could not load it at all. Whether the
page has committed, is secure and is private comes from its
[page](./address.md); every load of it changes what is under review here.

## Story: Share the page

> As the owner, I want to share the page I am looking at, once per choice,
> and never a page that changed after I chose.

### Sharing holds the share panel's review and number, the last panel that sent, the review for opening the page elsewhere, and what it last told the owner

On Android, selecting Share in the Browser menu opens the system sheet.
Copy link uses the selected page's address and waits for the clipboard.
Whether the page needs another browser is part of opening it elsewhere: it
asked for a passkey, or its load failed where another browser may still
reach it.

```quint
import review as V from "../../kit/review"

type Kind = Normal | Private
type Dest = System | Copy | Email
type Delivery = NoDelivery | Sending({ panel: int, dest: Dest })
type Notice = Quiet | NoPage | Changed | Copied | ClipboardRefused | Passkeys | NoBrowser | NotOpened
type Failure = Unreachable | Untrusted | Refused
type Effect = Sheet({ panel: int }) | CopyLink({ panel: int }) | Draft({ panel: int }) | Elsewhere({ confirmed: bool })
type Share = {
  panel: int, sent: int, delivery: Delivery, review: V::Review,
  passkey: bool, stranded: bool, handoff: V::Review, privately: bool, launching: bool, confirmed: bool,
  notice: Notice,
}
type Step = { state: Share, out: List[Effect] }

pure val initial: Share = {
  panel: 0, sent: 0, delivery: NoDelivery, review: V::unreviewed,
  passkey: false, stranded: false, handoff: V::unreviewed, privately: false, launching: false, confirmed: false,
  notice: Quiet,
}

pure def busy(s: Share): bool = s.review.showing or s.handoff.showing or s.launching or s.delivery != NoDelivery
pure val panelValues = Set(1, 2, 3)
```

### Every load of the page changes what is under review, and the page no longer needs another browser

```quint
pure def pageChanged(s: Share): Share = { ...s, review: V::revise(s.review), handoff: V::revise(s.handoff), delivery: NoDelivery, passkey: false, stranded: false }
```

### The share panel opens over a committed page, one at a time; otherwise the owner is told to load the page first

```quint
pure def canOpenPanel(s: Share, ready: bool): bool = not(busy(s))

pure def openPanel(s: Share, ready: bool): Share =
  if (not(ready)) { ...s, notice: NoPage }
  else { ...s, panel: s.panel + 1, review: V::present(s.review), notice: Quiet }
```

### Choosing where to send the page sends it once, if it is still the page the panel opened on, and closes the panel

A page that changed meanwhile is not sent, and the owner is told.

```quint
pure def canChoose(s: Share, dest: Dest): bool = s.review.showing

pure def choose(s: Share, dest: Dest): Step =
  if (not(V::canConfirm(s.review))) { state: { ...s, review: V::dismiss(s.review), notice: Changed }, out: List() }
  else {
    state: { ...s, review: V::confirm(s.review), sent: s.panel,
      delivery: Sending({ panel: s.panel, dest: dest }), notice: Quiet },
    out: List(if (dest == System) Sheet({ panel: s.panel }) else if (dest == Copy) CopyLink({ panel: s.panel }) else Draft({ panel: s.panel })),
  }
```

### The answer for the current choice says whether it was carried out

Alpha waits for the clipboard before saying the link was copied. An answer
for a previous choice has no effect. If the page changed or the Browser
has gone to the background, the answer says nothing to the owner.

```quint
pure def canDelivered(s: Share, panel: int, ok: bool, shown: bool): bool = {
  val delivery = s.delivery
  match delivery { | Sending(x) => x.panel == panel | NoDelivery => false }
}

pure def delivered(s: Share, panel: int, ok: bool, shown: bool): Share =
  val delivery = s.delivery
  val notice = match delivery {
    | NoDelivery => Quiet
    | Sending(x) => if (not(shown)) Quiet else if (x.dest == Copy) (if (ok) Copied else ClipboardRefused) else if (ok) Quiet else NotOpened
  }
  { ...s, delivery: NoDelivery, notice: notice }

pure def alwaysDeliveryBelongsToTheLastChoice(s: Share): bool = {
  val delivery = s.delivery
  match delivery { | Sending(x) => x.panel == s.sent and not(s.review.showing) | NoDelivery => true }
}
```

### Closing the panel, or Alpha going to the background, sends nothing

```quint
pure def canClosePanel(s: Share): bool = s.review.showing

pure def closePanel(s: Share): Share = { ...s, review: V::dismiss(s.review) }

pure def hidden(s: Share): Share = { ...s, review: V::dismiss(s.review), handoff: V::dismiss(s.handoff), delivery: NoDelivery }
```

### Each share panel sends at most once, and only the page it opened on

```quint
pure def isShared(e: Effect): bool = match e { | Elsewhere(x) => false | _ => true }

pure def stepOneSendPerPanel(before: Share, via: str, after: Share, out: List[Effect]): bool =
  out.every(e => not(isShared(e)) or (via == "choose" and V::canConfirm(before.review) and before.sent < before.panel and after.sent == before.panel))

pure def alwaysPanelsAreCounted(s: Share): bool = s.sent >= 0 and s.sent <= s.panel and (s.review.showing implies s.sent < s.panel)
```

### A page can change under an open panel, and a link can be copied

```quint
pure def sometimesChangedUnderThePanel(s: Share): bool = s.notice == Changed

pure def sometimesCopied(s: Share): bool = s.notice == Copied and s.sent > 1
```

## Story: Open the page in another browser

> As the owner, I want to open a page in another browser when Alpha's tab
> cannot do what it needs, and a private page to leave only when I confirm.

### A page that asks for a passkey is told it needs another browser

```quint
pure def passkeyAsked(s: Share): Share = { ...s, passkey: true, notice: Passkeys }
```

### A page that could not load or timed out at an HTTPS address may open in another browser; any other failure may not

Both are failures of the network or the web view, which another browser may
get past. The tab says which failure it was: unreachable for a page that
could not load or timed out, untrusted for a refused certificate, and refused
for everything else it reports as a failure, such as an address Alpha does
not open, a web view that is not there, a sign-in that was cancelled or
failed, a password kept from an insecure page or a load the owner stopped.
A refused certificate stays refused, and the page's own failure message says
why. The tab also says whether the failed address is an HTTPS one; a failed
page has no secure mark, as it never committed.

```quint
pure def pageFailed(s: Share, failure: Failure, https: bool): Share = { ...s, stranded: failure == Unreachable and https }
```

### "Open externally" is offered for a committed HTTPS page from the phone Browser menu, or beside a normal tab's unreachable HTTPS page

The phone Browser does not support passkeys. The owner can open another
browser before starting a sign-in. A private tab asks first. A failed page has
already shown that its
address is an HTTPS one, so it leaves without a secure mark; a private
tab's failed page is not offered another browser.

```quint
pure def leavesFailed(s: Share, kind: Kind): bool = s.stranded and kind == Normal

pure def canOpenExternally(s: Share, kind: Kind, secure: bool): bool =
  (secure or leavesFailed(s, kind)) and not(busy(s))

pure def openExternally(s: Share, kind: Kind, secure: bool): Step =
  if (not(secure or leavesFailed(s, kind))) { state: { ...s, notice: NoPage }, out: List() }
  else if (kind == Private) { state: { ...s, privately: true, confirmed: false, handoff: V::present(s.handoff) }, out: List() }
  else { state: { ...s, privately: false, confirmed: false, launching: true }, out: List(Elsewhere({ confirmed: false })) }
```

### The owner can review opening a shown private web frame in another browser

The button offers the currently visible private frame at its requested
HTTPS address. The enclosing browser gives the address the owner entered,
without claiming that the opaque frame's connection was verified. The exact
page stays bound to the review until the owner confirms or cancels.

```quint
pure def canReviewPrivateFrame(s: Share, ready: bool): bool = ready and not(busy(s))

pure def reviewPrivateFrame(s: Share, ready: bool): Share =
  { ...s, privately: true, confirmed: false, handoff: V::present(s.handoff), notice: Quiet }
```

### The owner confirms the private page as shown, or cancels

```quint
pure def canConfirmExternally(s: Share): bool = V::canConfirm(s.handoff)

pure def confirmExternally(s: Share): Step =
  { state: { ...s, handoff: V::confirm(s.handoff), confirmed: true, launching: true }, out: List(Elsewhere({ confirmed: true })) }

pure def canCancelExternally(s: Share): bool = s.handoff.showing

pure def cancelExternally(s: Share): Share = { ...s, handoff: V::dismiss(s.handoff) }
```

### The other browser opens, or the owner is told that none could and the page is still here

```quint
pure def canLaunched(s: Share, ok: bool, found: bool): bool = s.launching

pure def launched(s: Share, ok: bool, found: bool): Share =
  { ...s, launching: false, notice: if (ok) Quiet else if (found) NotOpened else NoBrowser }
```

### A private page goes to another browser only once the owner confirmed it

```quint
pure def alwaysAPrivatePageLeavesOnlyConfirmed(s: Share): bool = (s.launching and s.privately) implies s.confirmed

pure def stepAPrivatePageLeavesOnlyConfirmed(before: Share, via: str, after: Share, out: List[Effect]): bool =
  out.every(e => match e { | Elsewhere(x) => x.confirmed or not(after.privately) | _ => true })
```

### Only an HTTPS page is opened in another browser

```quint
pure def lawOnlySecurePagesLeave(kind: Kind): bool =
  openExternally({ ...initial, passkey: true }, kind, false).out.length() == 0
```

### Only an unreachable HTTPS address makes a failed page leave, and only from a normal tab

A certificate that was refused, any other failure and an http address keep
the page in the tab, whatever the shell says of its secure mark.

```quint
pure def lawAFailedPageLeavesOnlyWhenAnotherBrowserMayReachIt(kind: Kind, failure: Failure, https: bool): bool =
  val s = pageFailed(initial, failure, https)
  (canOpenExternally(s, kind, false) iff (failure == Unreachable and https and kind == Normal)) and
    (openExternally(s, kind, false).out.length() > 0 iff (failure == Unreachable and https and kind == Normal))
```

### The next load of the page ends the offer for a failed page

So a reload, or going to another address, never sends the page that failed.

```quint
pure def lawTheNextLoadEndsTheOffer(kind: Kind): bool =
  not(canOpenExternally(pageChanged(pageFailed(initial, Unreachable, true)), kind, false))
```

### Only a failure marks the page as one another browser may reach, and every load clears it

```quint
pure def stepOnlyAFailureStrandsThePage(before: Share, via: str, after: Share): bool =
  ((after.stranded and not(before.stranded)) implies via == "pageFailed") and
    (via == "pageChanged" implies not(after.stranded))
```

### A confirmed private page can open elsewhere, and there can be no other browser

```quint
pure def sometimesPrivatePageOpenedElsewhere(s: Share): bool = s.launching and s.privately

pure def sometimesNoOtherBrowser(s: Share): bool = s.notice == NoBrowser
```

### A page that failed to load can open in another browser

```quint
pure def sometimesAFailedPageOpensElsewhere(s: Share): bool = s.launching and s.stranded
```
