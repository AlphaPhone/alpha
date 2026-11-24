# Preferences

What the owner sets about Alpha itself: its appearance and legible text,
the size of its text, whether Alpha asks before it acts, what it may share
or change without asking (the phone's location, the Browser page open,
changes to Gmail and to Calendar), and whether Inbox loads images from the
web. Alerts and their channels are Android's: Settings shows what
the phone reports ([Facts](./facts.md)) and opens Android's page for them
([Android](./android.md)). Recovering notification data, device roles and
alert sounds is offered on the [Developer](./developer.md) page.

## Story: Choose how Alpha looks

> As the owner, I want to choose a light or dark Alpha, or follow the
> phone, and to keep my choice.

### Preferences hold the appearance chosen and the one kept, the phone's look, the text size the phone reported, and the device preferences as last read

Who sends an event matters here: the owner chooses, the phone answers and
tells Alpha when it starts, comes back or opens Settings, and the agent
changes nothing. A text size of zero is one the phone has not reported.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Sender = Owner | Agent | Phone
type Theme = System | Light | Dark
type Look = LightLook | DarkLook
type SizeOutcome = Applied | NotConfirmed | NoTextSize
type Notice = Quiet | NotSaved | SizeNotConfirmed | SizeUnavailable | NotRecovered
type Share = AgentLocation | BrowserPage | GmailChanges | CalendarEdits

type Preferences = {
  theme: Theme, kept: Theme, legible: bool, keptLegible: bool, keeping: T::Timed, phoneLook: Look,
  size: int, sizing: T::Timed, changing: bool,
  document: T::Timed, askFirst: bool, images: bool, shares: List[Share],
  saving: T::Timed, nextAskFirst: bool, nextImages: bool, nextShares: List[Share],
  recovering: T::Timed, notice: Notice,
}

type Effect =
  KeepTheme({ keep: int, chosen: Theme, chosenLegible: bool })
  | OpenDisplay
  | SetTextSize({ sizeAsk: int, percent: int })
  | ReadTextSize({ sizeRead: int })
  | ReadDocument({ docRead: int })
  | SaveDocument({ save: int, saveAskFirst: bool, saveImages: bool, saveShares: List[Share] })
  | RecoverDocument({ recovery: int })
type Changed = { state: Preferences, out: List[Effect] }

pure val initial: Preferences = {
  theme: Light, kept: Light, legible: false, keptLegible: false, keeping: T::unasked, phoneLook: LightLook,
  size: 0, sizing: T::unasked, changing: false,
  document: T::unasked, askFirst: true, images: false, shares: List(),
  saving: T::unasked, nextAskFirst: true, nextImages: false, nextShares: List(),
  recovering: T::unasked, notice: Quiet,
}

pure val limit = 10000
pure val atValues = Set(0, 4000, 20000)
pure val nowValues = Set(0, 4000, 20000, 40000)
```

### Only the owner changes a preference; the agent and the phone cannot

```quint
pure def chooses(by: Sender): bool = by == Owner

pure def answers(by: Sender): bool = by == Phone
```

### Alpha is light or dark as chosen, and follows the phone when the choice is System

```quint
pure def shown(s: Preferences): Look =
  if (s.theme == System) s.phoneLook else if (s.theme == Dark) DarkLook else LightLook

pure def lawSystemFollowsThePhone(look: Look): bool =
  val s = { ...initial, theme: System, phoneLook: look }
  shown(s) == look and shown({ ...s, theme: Light }) == LightLook and shown({ ...s, theme: Dark }) == DarkLook

pure def canPhoneLookChanged(s: Preferences, look: Look, by: Sender): bool = answers(by)

pure def phoneLookChanged(s: Preferences, look: Look, by: Sender): Preferences = { ...s, phoneLook: look }
```

### Android's status and navigation bars follow the look Alpha draws

On a phone the shell tells Android each time the look drawn changes, and
never twice in a row for the same look; a browser has no bars to tell.

```quint
pure def barsDark(s: Preferences): bool = shown(s) == DarkLook

pure def lawTheBarsAreDarkExactlyWhenAlphaIs(theme: Theme, look: Look): bool =
  barsDark({ ...initial, theme: theme, phoneLook: look }) iff (theme == Dark or (theme == System and look == DarkLook))
```

### A choice shows at once and is kept on the phone, one at a time, with ten seconds to be kept

```quint
pure def canChooseTheme(s: Preferences, theme: Theme, at: int, by: Sender): bool =
  chooses(by) and not(T::busy(s.keeping))

pure def chooseTheme(s: Preferences, theme: Theme, at: int, by: Sender): Changed =
  val asking = T::ask(s.keeping, at, limit)
  { state: { ...s, theme: theme, keeping: asking, notice: Quiet }, out: List(KeepTheme({ keep: asking.read.ticket, chosen: theme, chosenLegible: s.legible })) }
```

### Legible text is turned on or off by the owner and kept with the appearance, the same way

Alpha then draws its text in a heavier, more open face.

```quint
pure def canSetLegible(s: Preferences, legible: bool, at: int, by: Sender): bool =
  chooses(by) and not(T::busy(s.keeping)) and legible != s.legible

pure def setLegible(s: Preferences, legible: bool, at: int, by: Sender): Changed =
  val asking = T::ask(s.keeping, at, limit)
  { state: { ...s, legible: legible, keeping: asking, notice: Quiet }, out: List(KeepTheme({ keep: asking.read.ticket, chosen: s.theme, chosenLegible: legible })) }
```

### A choice that could not be kept in time is taken back, and Alpha says it was not saved

```quint
pure val keepValues = Set(1, 2)

pure def notKept(keeping: T::Timed, s: Preferences): Preferences = { ...s, keeping: keeping, theme: s.kept, legible: s.keptLegible, notice: NotSaved }

pure def canThemeKept(s: Preferences, keep: int, ok: bool, by: Sender): bool = answers(by) and T::canAnswer(s.keeping, keep)

pure def themeKept(s: Preferences, keep: int, ok: bool, by: Sender): Preferences =
  if (ok) { ...s, keeping: T::answer(s.keeping, true), kept: s.theme, keptLegible: s.legible }
  else notKept(T::answer(s.keeping, false), s)

pure def canGiveUpKeeping(s: Preferences, now: int, by: Sender): bool = answers(by) and T::canGiveUp(s.keeping, now)

pure def giveUpKeeping(s: Preferences, now: int, by: Sender): Preferences = notKept(T::answer(s.keeping, false), s)
```

### Once nothing is being kept, the appearance and legible text shown are the ones kept

```quint
pure def alwaysTheAppearanceShownIsKept(s: Preferences): bool =
  not(T::busy(s.keeping)) implies (s.theme == s.kept and s.legible == s.keptLegible)
```

### Asked to change the appearance, the agent opens Display and changes nothing

What Ask Alpha does with "Turn on dark mode": the owner then chooses.

```quint
pure def canAgentAsksForALook(s: Preferences, by: Sender): bool = by == Agent

pure def agentAsksForALook(s: Preferences, by: Sender): Changed = { state: s, out: List(OpenDisplay) }

pure def isOpenDisplay(e: Effect): bool = match e { | OpenDisplay => true | _ => false }

pure def stepTheAgentOnlyOpensDisplay(before: Preferences, after: Preferences, out: List[Effect]): bool =
  out.some(e => isOpenDisplay(e)) implies (after == before and out.length() == 1)
```

### A dark choice can be kept

```quint
pure def sometimesDarkIsKept(s: Preferences): bool = s.kept == Dark and s.keeping.read.status == R::Loaded
```

### A choice can fail to be kept

```quint
pure def sometimesNotSaved(s: Preferences): bool = s.notice == NotSaved and s.keeping.read.status == R::Failed
```

## Story: Make the text larger or smaller

> As the owner, I want Alpha's text at the size I can read, and to know
> when the phone did not apply it.

### Text is 75, 100, 115, 130 or 150 percent, applied by the phone, one change or read at a time

```quint
pure val sizes: List[int] = List(75, 100, 115, 130, 150)
pure val percentValues = Set(0, 90, 100, 150)

pure def canChooseSize(s: Preferences, percent: int, at: int, by: Sender): bool =
  chooses(by) and sizes.includes(percent) and percent != s.size and not(T::busy(s.sizing))

pure def chooseSize(s: Preferences, percent: int, at: int, by: Sender): Changed =
  val asking = T::ask(s.sizing, at, limit)
  { state: { ...s, sizing: asking, changing: true, notice: Quiet }, out: List(SetTextSize({ sizeAsk: asking.read.ticket, percent: percent })) }
```

### The size is read from the phone; until the phone reports one, Alpha says it is unavailable

```quint
pure def readSize(at: int, s: Preferences): Changed =
  val asking = T::ask(s.sizing, at, limit)
  { state: { ...s, sizing: asking, changing: false, size: 0 }, out: List(ReadTextSize({ sizeRead: asking.read.ticket })) }

pure val sizeAskValues = Set(1, 2)

pure def canSizeReported(s: Preferences, sizeAsk: int, percent: int, by: Sender): bool =
  answers(by) and not(s.changing) and T::canAnswer(s.sizing, sizeAsk)

pure def sizeReported(s: Preferences, sizeAsk: int, percent: int, by: Sender): Preferences =
  if (sizes.includes(percent)) { ...s, sizing: T::answer(s.sizing, true), size: percent }
  else { ...s, sizing: T::answer(s.sizing, false), size: 0 }
```

### The size shown is the one the phone says it applied; when it cannot say, Alpha says so and reads the size again

After a change the phone did not confirm, Alpha no longer knows the size on
screen, so it reads it.

```quint
pure def canSizeApplied(s: Preferences, sizeAsk: int, result: SizeOutcome, percent: int, at: int, by: Sender): bool =
  answers(by) and s.changing and T::canAnswer(s.sizing, sizeAsk) and (result == Applied implies sizes.includes(percent))

pure def sizeApplied(s: Preferences, sizeAsk: int, result: SizeOutcome, percent: int, at: int, by: Sender): Changed =
  if (result == Applied) { state: { ...s, sizing: T::answer(s.sizing, true), changing: false, size: percent }, out: List() }
  else if (result == NotConfirmed) readSize(at, { ...s, sizing: T::answer(s.sizing, false), notice: SizeNotConfirmed })
  else { state: { ...s, sizing: T::answer(s.sizing, false), changing: false, size: 0, notice: SizeUnavailable }, out: List() }
```

### A change not answered in time counts as not confirmed, and a read not answered in time leaves the size unavailable

```quint
pure def canGiveUpOnSize(s: Preferences, now: int, by: Sender): bool = answers(by) and T::canGiveUp(s.sizing, now)

pure def giveUpOnSize(s: Preferences, now: int, at: int, by: Sender): Changed =
  if (s.changing) readSize(at, { ...s, sizing: T::answer(s.sizing, false), notice: SizeNotConfirmed })
  else { state: { ...s, sizing: T::answer(s.sizing, false), size: 0 }, out: List() }
```

### Every change or read of the text size ends

```quint
pure def leadsToASizeAskingEnds(s: Preferences, later: Preferences): bool = T::busy(s.sizing) implies not(T::busy(later.sizing))

pure val fair_giveUpOnSize = "weak"
```

### The size is one of the five, or unavailable, and is unavailable while the phone is being asked

```quint
pure def alwaysTheSizeIsOneOfTheFiveOrUnavailable(s: Preferences): bool =
  (s.size == 0 or sizes.includes(s.size)) and ((T::busy(s.sizing) and not(s.changing)) implies s.size == 0)
```

### The size shown changes to a size only when the phone reported or applied it

```quint
pure def stepTheSizeIsOneThePhoneGave(before: Preferences, via: str, after: Preferences): bool =
  (after.size != before.size and after.size != 0) implies ((via == "sizeApplied" or via == "sizeReported") and after.sizing.read.status == R::Loaded)
```

### At 150 percent other areas lay out one column

```quint
pure def largeText(s: Preferences): bool = s.size >= 150
```

### The largest text can be applied

```quint
pure def sometimesLargestText(s: Preferences): bool = largeText(s) and s.sizing.read.status == R::Loaded and not(s.changing)
```

### A size can go unconfirmed while Alpha reads it again

```quint
pure def sometimesSizeNotConfirmed(s: Preferences): bool = s.notice == SizeNotConfirmed and T::busy(s.sizing)
```

### The size can be unavailable

```quint
pure def sometimesSizeUnknown(s: Preferences): bool = s.size == 0 and s.sizing.read.status == R::Failed

pure def sometimesNoTextSizeOnThisPhone(s: Preferences): bool = s.notice == SizeUnavailable
```

## Story: Decide whether Alpha asks before it acts

> As the owner, I want Alpha to ask me before it acts unless I turned that
> off, and to keep asking whenever it cannot tell what I chose.

### Ask before Alpha acts covers the agent's actions on the web, with the camera and on photos

The approvals area asks it before carrying one out. Writing a note and
moving between Alpha's own screens are never held for it.

```quint
type Act = WebAction | CameraAction | PhotosAction | NoteWrite | InAppMove

pure def governed(act: Act): bool = act == WebAction or act == CameraAction or act == PhotosAction
```

### The device preferences are read when Alpha starts, when Settings opens, and when Alpha comes back while Settings shows, with ten seconds to answer, never while a change or a recovery is in flight

They hold Ask before Alpha acts, Load images in Inbox, and what Alpha may
share or change without asking. On a phone updated from the previous
Alpha, which kept these in a document of its own, the phone reads that
document, once, while it has none of Alpha's: the choices made there stay,
and a choice it lacks starts as on a new phone. Alpha never writes the
previous document.

```quint
pure def readAgain(at: int, s: Preferences): Changed =
  val asking = T::ask(s.document, at, limit)
  { state: { ...s, document: asking }, out: List(ReadDocument({ docRead: asking.read.ticket })) }

pure def free(s: Preferences): bool = not(T::busy(s.document)) and not(T::busy(s.saving)) and not(T::busy(s.recovering))

pure def canOpened(s: Preferences, at: int, by: Sender): bool = answers(by) and free(s)

pure def opened(s: Preferences, at: int, by: Sender): Changed = readAgain(at, s)

pure def canResumed(s: Preferences, at: int, showing: bool, by: Sender): bool = answers(by) and showing and free(s)

pure def resumed(s: Preferences, at: int, showing: bool, by: Sender): Changed = readAgain(at, s)

pure def stepTheDocumentIsReadOnlyWhenDue(before: Preferences, via: str, after: Preferences): bool =
  after.document.read.ticket != before.document.read.ticket implies
    (via == "start" or ((via == "opened" or via == "resumed" or via == "recovered" or via == "giveUpOnRecovery") and not(T::busy(before.saving))))
```

### A new phone lets Alpha act without asking first, load images in Inbox, use its location and the Browser page open, and change Gmail and Calendar

Location is on because the launcher already holds the location grant on an
Alpha image; the owner turns any of these off here, or revokes the grant in
Android. A recovery restores these, and a choice the previous Alpha lacked
starts as one of these.

```quint
type Chosen = { askFirst: bool, images: bool, shares: List[Share] }

pure val newPhone: Chosen = { askFirst: false, images: true, shares: List(AgentLocation, BrowserPage, GmailChanges, CalendarEdits) }

pure def lawANewPhoneAllowsEveryShare(share: Share): bool = newPhone.shares.includes(share) and not(newPhone.askFirst) and newPhone.images
```

### What the phone could not read is taken as asking first, loading no images and sharing nothing

The phone reports the document readable, with its values, or not.

```quint
pure val docReadValues = Set(1, 2, 3)
pure val sharesValues = Set(List(), List(AgentLocation, BrowserPage), List(AgentLocation, BrowserPage, GmailChanges, CalendarEdits))
pure val shareValues = Set(AgentLocation, BrowserPage, GmailChanges)

pure def safe(document: T::Timed, s: Preferences): Preferences = { ...s, document: document, askFirst: true, images: false, shares: List() }

pure def canDocumentRead(s: Preferences, docRead: int, readable: bool, askFirst: bool, images: bool, shares: List[Share], by: Sender): bool =
  answers(by) and T::canAnswer(s.document, docRead)

pure def documentRead(s: Preferences, docRead: int, readable: bool, askFirst: bool, images: bool, shares: List[Share], by: Sender): Preferences =
  if (readable) { ...s, document: T::answer(s.document, true), askFirst: askFirst, images: images, shares: shares }
  else safe(T::answer(s.document, false), s)

pure def canGiveUpOnDocument(s: Preferences, now: int, by: Sender): bool = answers(by) and T::canGiveUp(s.document, now)

pure def giveUpOnDocument(s: Preferences, now: int, by: Sender): Preferences = safe(T::answer(s.document, false), s)

pure def alwaysAnUnreadDocumentIsSafe(s: Preferences): bool =
  (s.document.read.status == R::Idle or s.document.read.status == R::Failed) implies (s.askFirst and not(s.images) and s.shares.length() == 0)
```

### Every read of the device preferences ends, answered or given up

```quint
pure def leadsToADocumentReadEnds(s: Preferences, later: Preferences): bool =
  T::busy(s.document) implies not(T::busy(later.document))

pure val fair_giveUpOnDocument = "weak"
```

### Alpha asks before it acts unless the phone read that the owner turned it off, and loads images only when the phone read that the owner turned it on

Other areas ask these before acting or loading. While the document is being
read again, Alpha asks first.

```quint
pure def asksBeforeActing(s: Preferences, act: Act): bool =
  governed(act) and (s.document.read.status != R::Loaded or s.askFirst)

pure def loadsImages(s: Preferences): bool = s.document.read.status == R::Loaded and s.images
```

### Alpha shares the phone's location or the Browser page open with a chat turn, and changes Gmail or Calendar, only when the phone read that the owner allowed it

Each turn reads this just before it is sent, so the first turn after a
start reads what the phone kept. A private tab or a sign-in page is never
shared.

```quint
pure def allows(s: Preferences, share: Share): bool = s.document.read.status == R::Loaded and s.shares.includes(share)

pure def lawAnUnreadDocumentSharesNothing(share: Share): bool = not(allows(initial, share))
```

### The owner changes Ask before Alpha acts, Load images or what Alpha may share only once the phone has read them, one save at a time, with ten seconds to save

```quint
pure def editable(s: Preferences, by: Sender): bool =
  chooses(by) and s.document.read.status == R::Loaded and not(T::busy(s.saving))

pure def saveDocument(at: int, askFirst: bool, images: bool, shares: List[Share], s: Preferences): Changed =
  val asking = T::ask(s.saving, at, limit)
  {
    state: { ...s, saving: asking, nextAskFirst: askFirst, nextImages: images, nextShares: shares, notice: Quiet },
    out: List(SaveDocument({ save: asking.read.ticket, saveAskFirst: askFirst, saveImages: images, saveShares: shares })),
  }

pure def canSetAskFirst(s: Preferences, askFirst: bool, at: int, by: Sender): bool = editable(s, by) and askFirst != s.askFirst

pure def setAskFirst(s: Preferences, askFirst: bool, at: int, by: Sender): Changed = saveDocument(at, askFirst, s.images, s.shares, s)

pure def canSetImages(s: Preferences, images: bool, at: int, by: Sender): bool = editable(s, by) and images != s.images

pure def setImages(s: Preferences, images: bool, at: int, by: Sender): Changed = saveDocument(at, s.askFirst, images, s.shares, s)

pure def canSetShare(s: Preferences, share: Share, on: bool, at: int, by: Sender): bool = editable(s, by) and on != s.shares.includes(share)

pure def setShare(s: Preferences, share: Share, on: bool, at: int, by: Sender): Changed =
  saveDocument(at, s.askFirst, s.images, if (on) s.shares.append(share) else s.shares.select(x => x != share), s)

pure def alwaysASaveBuildsOnWhatWasRead(s: Preferences): bool =
  T::busy(s.saving) implies s.document.read.status == R::Loaded
```

### A change takes effect when the phone saved it; otherwise, or when the phone does not answer in time, Alpha says it was not saved and nothing changes

```quint
pure val saveValues = Set(1, 2)

pure def canDocumentSaved(s: Preferences, save: int, ok: bool, by: Sender): bool = answers(by) and T::canAnswer(s.saving, save)

pure def documentSaved(s: Preferences, save: int, ok: bool, by: Sender): Preferences =
  if (ok) { ...s, saving: T::answer(s.saving, true), askFirst: s.nextAskFirst, images: s.nextImages, shares: s.nextShares }
  else { ...s, saving: T::answer(s.saving, false), notice: NotSaved }

pure def canGiveUpOnSaving(s: Preferences, now: int, by: Sender): bool = answers(by) and T::canGiveUp(s.saving, now)

pure def giveUpOnSaving(s: Preferences, now: int, by: Sender): Preferences = { ...s, saving: T::answer(s.saving, false), notice: NotSaved }
```

### Every save of the device preferences ends

```quint
pure def leadsToASaveEnds(s: Preferences, later: Preferences): bool = T::busy(s.saving) implies not(T::busy(later.saving))

pure val fair_giveUpOnSaving = "weak"
```

### Alpha stops asking first only when the phone has read or saved that the owner turned it off

```quint
pure def stepAskingStopsOnlyOnTheOwnersWord(before: Preferences, via: str, after: Preferences): bool =
  (asksBeforeActing(before, WebAction) and not(asksBeforeActing(after, WebAction))) implies (via == "documentSaved" or via == "documentRead")
```

### When the device preferences cannot be read, the owner can recover them: the phone resets them to its defaults, and they are read again

A recovery not answered in ten seconds is given up and the document is read
again; Alpha says when it did not recover.

```quint
pure val recoveryValues = Set(1, 2)

pure def canRecover(s: Preferences, at: int, by: Sender): bool =
  chooses(by) and s.document.read.status == R::Failed and free(s)

pure def recover(s: Preferences, at: int, by: Sender): Changed =
  val asking = T::ask(s.recovering, at, limit)
  { state: { ...s, recovering: asking, notice: Quiet }, out: List(RecoverDocument({ recovery: asking.read.ticket })) }

pure def canRecovered(s: Preferences, recovery: int, ok: bool, at: int, by: Sender): bool =
  answers(by) and T::canAnswer(s.recovering, recovery)

pure def recovered(s: Preferences, recovery: int, ok: bool, at: int, by: Sender): Changed =
  readAgain(at, { ...s, recovering: T::answer(s.recovering, ok), notice: if (ok) Quiet else NotRecovered })

pure def canGiveUpOnRecovery(s: Preferences, now: int, by: Sender): bool = answers(by) and T::canGiveUp(s.recovering, now)

pure def giveUpOnRecovery(s: Preferences, now: int, at: int, by: Sender): Changed =
  readAgain(at, { ...s, recovering: T::answer(s.recovering, false), notice: NotRecovered })
```

### Every recovery ends

```quint
pure def leadsToARecoveryEnds(s: Preferences, later: Preferences): bool = T::busy(s.recovering) implies not(T::busy(later.recovering))

pure val fair_giveUpOnRecovery = "weak"
```

### Recovery is under way only while the device preferences cannot be read, and nothing else is asked of them meanwhile

```quint
pure def alwaysRecoveryOnlyWhenUnread(s: Preferences): bool =
  T::busy(s.recovering) implies (s.document.read.status == R::Failed and s.askFirst and not(s.images) and not(T::busy(s.saving)))
```

### The owner can turn off asking first

```quint
pure def sometimesActsWithoutAsking(s: Preferences): bool =
  not(asksBeforeActing(s, WebAction)) and s.saving.read.status == R::Loaded and not(s.nextAskFirst)
```

### The owner can stop Alpha sharing the Browser page

```quint
pure def sometimesBrowserPageWithheld(s: Preferences): bool =
  s.saving.read.status == R::Loaded and not(s.shares.includes(BrowserPage)) and s.shares.includes(AgentLocation)
```

### The owner can let images load in Inbox

```quint
pure def sometimesImagesLoad(s: Preferences): bool = loadsImages(s) and s.saving.read.status == R::Loaded and s.nextImages
```

### The device preferences can be under recovery, and a recovery can fail

```quint
pure def sometimesRecovering(s: Preferences): bool = T::busy(s.recovering)

pure def sometimesNotRecovered(s: Preferences): bool = s.notice == NotRecovered
```

## Story: Keep my preferences through a restart

> As the owner, I want what I chose to be there when Alpha starts again,
> and nothing half-done to count.

### Alpha starts with the appearance and legible text it kept, or Light and ordinary text when nothing readable was kept, and the phone's look; it reads the text size and the device preferences again, and drops what was in flight

On a phone updated from the previous Alpha, which kept light, dark or the
phone's look on its own, the phone reports that as kept while Alpha has
kept none of its own.

```quint
pure def drop(t: T::Timed): T::Timed = if (T::busy(t)) T::answer(t, false) else t

pure def canStart(s: Preferences, by: Sender): bool = answers(by)

pure def start(s: Preferences, at: int, kept: Theme, keptLegible: bool, readable: bool, look: Look, by: Sender): Changed =
  val theme = if (readable) kept else Light
  val legible = readable and keptLegible
  val fresh = safe(drop(s.document), {
    ...s, theme: theme, kept: theme, legible: legible, keptLegible: legible, phoneLook: look, keeping: drop(s.keeping),
    saving: drop(s.saving), recovering: drop(s.recovering), notice: Quiet,
  })
  val sized = readSize(at, { ...fresh, sizing: drop(s.sizing) })
  val read = readAgain(at, sized.state)
  { state: read.state, out: sized.out.concat(read.out) }
```

### The appearance kept changes only when the phone kept the owner's choice, or when Alpha starts with what it kept

```quint
pure def stepTheKeptAppearanceIsTheOwners(before: Preferences, via: str, after: Preferences): bool =
  after.kept != before.kept implies ((via == "themeKept" and after.kept == before.theme) or via == "start")
```
