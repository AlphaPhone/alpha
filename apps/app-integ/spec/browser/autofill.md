# Eligible autofill

Alpha never sees a website password. Android's password provider fills a login field in a tab only
when the browser engine itself attests the field's frame origin: a script in an isolated world of
every frame reports trusted focus on a username or password field of its own frame, over a channel
page script cannot reach. An HTTP sign-in prompt offers its fields only for a challenge the engine
reports for the page's own secure host. This spec states the native host's contract; the renderer
reads `loginFillStatus` to say whether this device can fill, and the menu's Passwords entry opens
Alpha's Passwords app, where the password provider is chosen.

## Story: Fill a login only on the site I see

> As the owner, I want my password provider to fill a login field only on the exact site whose page
> is shown, and never into a frame or prompt of another origin.

### A field is offered for filling only with an engine-attested origin equal to the shown page's, on the selected, shown, running, error-free tab with no prompt open

```quint
type Fill = {
  attested: bool, fieldOrigin: int, pageOrigin: int, selected: bool, shown: bool, resumed: bool, failed: bool,
  prompt: bool, offered: bool, saveArmed: bool, saved: bool, committedOrigin: int,
}
pure val initial: Fill = {
  attested: false, fieldOrigin: 0, pageOrigin: 1, selected: true, shown: true, resumed: true, failed: false,
  prompt: false, offered: false, saveArmed: false, saved: false, committedOrigin: 0,
}
pure def eligible(f: Fill): bool =
  f.attested and f.fieldOrigin == f.pageOrigin and f.selected and f.shown and f.resumed and not(f.failed) and not(f.prompt)
pure def offering(attest: bool, f: Fill): Fill = { ...f, offered: eligible(f) }
pure def canFocusField(f: Fill, attested: bool, origin: int): bool = origin == 1 or origin == 2
pure def focusField(f: Fill, attested: bool, origin: int): Fill = offering(true, { ...f, attested: attested, fieldOrigin: origin })
pure def canNavigate(f: Fill, origin: int): bool = origin == 1 or origin == 2
pure def navigate(f: Fill, origin: int): Fill =
  { ...f, pageOrigin: origin, attested: false, fieldOrigin: 0, offered: false, failed: false, saveArmed: false, committedOrigin: 0 }
pure def pageFailed(f: Fill): Fill = { ...f, failed: true, offered: false, saveArmed: false }
pure def presented(f: Fill, selected: bool): Fill = offering(true, { ...f, selected: selected, shown: selected })
pure def paused(f: Fill): Fill = { ...f, resumed: false, offered: false }
pure def resumed(f: Fill): Fill = offering(true, { ...f, resumed: true })
pure def promptOpened(f: Fill): Fill = { ...f, prompt: true, offered: false }
pure def promptClosed(f: Fill): Fill = offering(true, { ...f, prompt: false })
pure def leftForAnotherApp(f: Fill): Fill = { ...f, offered: false }
pure def alwaysOnlyAnAttestedFieldOfTheShownPageIsOffered(f: Fill): bool = f.offered implies eligible(f)
pure val originValues = Set(1, 2)
pure def sometimesOffered(f: Fill): bool = f.offered
```

### A provider's save waits for a successful commit at the same origin

Share, Downloads and another browser end filling in every tab before they leave the page.

```quint
pure def canSubmitted(f: Fill): bool = f.offered
pure def submitted(f: Fill): Fill = { ...f, saveArmed: true }
pure def canCommitted(f: Fill, origin: int): bool = origin == 1 or origin == 2
pure def committed(f: Fill, origin: int): Fill =
  { ...f, committedOrigin: origin, saved: f.saved or (f.saveArmed and origin == f.fieldOrigin and not(f.failed)), saveArmed: false }
pure def alwaysASaveFollowsASameOriginCommit(f: Fill): bool = f.saved implies f.committedOrigin != 0
pure def sometimesSaved(f: Fill): bool = f.saved
```

## Story: Know whether this phone can fill logins in Browser

> As the owner, I want Browser's menu to take me to my password provider, and to say when this
> phone's WebView cannot attest login fields.

### Filling is offered only when the native host reports attested fields available

```quint
type FillSupport = FillUnknown | FillAvailable | FillUnsupported
pure def fillSupport(answered: bool, available: bool): FillSupport =
  if (not(answered)) FillUnknown else if (available) FillAvailable else FillUnsupported
pure def lawAnUnansweredDeviceIsNeverAvailable(available: bool): bool = fillSupport(false, available) == FillUnknown
```
