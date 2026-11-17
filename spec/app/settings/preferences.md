# Preferences

What the owner sets about Alpha itself: its appearance, the size of its
text, whether Alpha asks before it acts, and whether Inbox loads images
from the web. Alerts and their channels are Android's: Settings shows what
the phone reports ([Facts](./facts.md)) and opens Android's page for them
([Settings](./index.md)).

## Story: Choose how Alpha looks

> As the owner, I want to choose a light or dark Alpha, or follow the
> phone, and to keep my choice.

### Preferences hold the appearance chosen and the one kept, the text size the phone confirmed, and the device preferences as last read

Who sends an event matters here: the owner chooses, the phone answers, and
the agent changes nothing.

```quint
import read as R from "../../kit/read"

type Sender = Owner | Agent | Phone
type Theme = System | Light | Dark
type Look = LightLook | DarkLook
type SizeOutcome = Applied | NotConfirmed | NoTextSize
type Notice = Quiet | NotSaved | SizeNotConfirmed | SizeUnavailable

type Preferences = {
  theme: Theme, kept: Theme, keeping: R::Read, phoneLook: Look,
  size: int, sizing: R::Read, wanted: int,
  document: R::Read, due: int, askFirst: bool, images: bool,
  saving: R::Read, nextAskFirst: bool, nextImages: bool,
  recovering: R::Read, notice: Notice,
}

type Effect =
  KeepTheme({ keep: int, chosen: Theme })
  | SetTextSize({ sizeAsk: int, percent: int })
  | ReadDocument({ docRead: int })
  | SaveDocument({ save: int, saveAskFirst: bool, saveImages: bool })
  | RecoverDocument({ recovery: int })
type Changed = { state: Preferences, out: List[Effect] }

pure val initial: Preferences = {
  theme: System, kept: System, keeping: R::unread, phoneLook: LightLook,
  size: 100, sizing: R::unread, wanted: 100,
  document: R::unread, due: 0, askFirst: true, images: false,
  saving: R::unread, nextAskFirst: true, nextImages: false,
  recovering: R::unread, notice: Quiet,
}
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

### A choice shows at once and is kept on the phone, one at a time

```quint
pure def canChooseTheme(s: Preferences, theme: Theme, by: Sender): bool =
  chooses(by) and s.keeping.status != R::Loading

pure def chooseTheme(s: Preferences, theme: Theme, by: Sender): Changed =
  val asking = R::ask(s.keeping)
  { state: { ...s, theme: theme, keeping: asking, notice: Quiet }, out: List(KeepTheme({ keep: asking.ticket, chosen: theme })) }
```

### A choice that could not be kept is taken back, and Alpha says it was not saved

```quint
pure val keepValues = Set(1, 2)

pure def canThemeKept(s: Preferences, keep: int, ok: bool, by: Sender): bool = answers(by) and R::canAnswer(s.keeping, keep)

pure def themeKept(s: Preferences, keep: int, ok: bool, by: Sender): Preferences =
  if (ok) { ...s, keeping: R::answer(s.keeping, true), kept: s.theme }
  else { ...s, keeping: R::answer(s.keeping, false), theme: s.kept, notice: NotSaved }
```

### Once nothing is being kept, the appearance shown is the one kept

```quint
pure def alwaysTheAppearanceShownIsKept(s: Preferences): bool =
  s.keeping.status != R::Loading implies s.theme == s.kept
```

### A dark choice can be kept

```quint
pure def sometimesDarkIsKept(s: Preferences): bool = s.kept == Dark and s.keeping.status == R::Loaded
```

### A choice can fail to be kept

```quint
pure def sometimesNotSaved(s: Preferences): bool = s.notice == NotSaved and s.keeping.status == R::Failed
```

## Story: Make the text larger or smaller

> As the owner, I want Alpha's text at the size I can read, and to know
> when the phone did not apply it.

### Text is 75, 100, 115, 130 or 150 percent, applied by the phone, one change at a time

```quint
pure val sizes: List[int] = List(75, 100, 115, 130, 150)
pure val percentValues = Set(90, 100, 150)

pure def canChooseSize(s: Preferences, percent: int, by: Sender): bool =
  chooses(by) and sizes.includes(percent) and percent != s.size and s.sizing.status != R::Loading

pure def chooseSize(s: Preferences, percent: int, by: Sender): Changed =
  val asking = R::ask(s.sizing)
  { state: { ...s, sizing: asking, wanted: percent, notice: Quiet }, out: List(SetTextSize({ sizeAsk: asking.ticket, percent: percent })) }
```

### The size shown is the one the phone says it applied; otherwise Alpha says it was not confirmed or is unavailable

```quint
pure val sizeAskValues = Set(1, 2)

pure def canSizeAnswered(s: Preferences, sizeAsk: int, result: SizeOutcome, percent: int, by: Sender): bool =
  answers(by) and R::canAnswer(s.sizing, sizeAsk) and (result == Applied implies sizes.includes(percent))

pure def sizeAnswered(s: Preferences, sizeAsk: int, result: SizeOutcome, percent: int, by: Sender): Preferences =
  if (result == Applied) { ...s, sizing: R::answer(s.sizing, true), size: percent }
  else { ...s, sizing: R::answer(s.sizing, false), notice: if (result == NotConfirmed) SizeNotConfirmed else SizeUnavailable }

pure def alwaysTheSizeIsOneOfTheFive(s: Preferences): bool = sizes.includes(s.size)

pure def stepTheSizeChangesOnlyWhenThePhoneAppliedIt(before: Preferences, via: str, after: Preferences): bool =
  after.size != before.size implies (via == "sizeAnswered" and after.sizing.status == R::Loaded)
```

### At 150 percent other areas lay out one column

```quint
pure def largeText(s: Preferences): bool = s.size >= 150
```

### The largest text can be applied

```quint
pure def sometimesLargestText(s: Preferences): bool = largeText(s) and s.sizing.status == R::Loaded
```

### A size can go unconfirmed

```quint
pure def sometimesSizeNotConfirmed(s: Preferences): bool = s.notice == SizeNotConfirmed
```

## Story: Decide whether Alpha asks before it acts

> As the owner, I want Alpha to ask me before it acts unless I turned that
> off, and to keep asking whenever it cannot tell what I chose.

### The device preferences are read from the phone when Settings opens or Alpha resumes, with ten seconds to answer, never while a change or a recovery is in flight

They hold Ask before Alpha acts and Load images in Inbox.

```quint
pure val documentLimit = 10
pure val atValues = Set(0, 4, 20)
pure val nowValues = Set(0, 4, 20, 40)

pure def readAgain(at: int, s: Preferences): Changed =
  val asking = R::ask(s.document)
  { state: { ...s, document: asking, due: at + documentLimit }, out: List(ReadDocument({ docRead: asking.ticket })) }

pure def canReadDocument(s: Preferences, at: int, by: Sender): bool =
  answers(by) and s.document.status != R::Loading and s.saving.status != R::Loading and s.recovering.status != R::Loading

pure def readDocument(s: Preferences, at: int, by: Sender): Changed = readAgain(at, s)
```

### What the phone could not read is taken as asking first and loading no images

The phone reports the document readable, with its two values, or not.

```quint
pure val docReadValues = Set(1, 2, 3)

pure def safe(document: R::Read, s: Preferences): Preferences = { ...s, document: document, askFirst: true, images: false }

pure def canDocumentRead(s: Preferences, docRead: int, readable: bool, askFirst: bool, images: bool, by: Sender): bool =
  answers(by) and R::canAnswer(s.document, docRead)

pure def documentRead(s: Preferences, docRead: int, readable: bool, askFirst: bool, images: bool, by: Sender): Preferences =
  if (readable) { ...s, document: R::answer(s.document, true), askFirst: askFirst, images: images }
  else safe(R::answer(s.document, false), s)

pure def canGiveUpOnDocument(s: Preferences, now: int, by: Sender): bool =
  answers(by) and s.document.status == R::Loading and now >= s.due

pure def giveUpOnDocument(s: Preferences, now: int, by: Sender): Preferences =
  safe(R::answer(s.document, false), s)

pure def alwaysAnUnreadDocumentIsSafe(s: Preferences): bool =
  (s.document.status == R::Idle or s.document.status == R::Failed) implies (s.askFirst and not(s.images))
```

### Every read of the device preferences ends, answered or given up

```quint
pure def leadsToADocumentReadEnds(s: Preferences, later: Preferences): bool =
  s.document.status == R::Loading implies later.document.status != R::Loading

pure val fair_giveUpOnDocument = "weak"
```

### Alpha asks before it acts unless the phone read that the owner turned it off, and loads images only when the phone read that the owner turned it on

Other areas ask these before acting or loading. While the document is being
read again, Alpha asks first.

```quint
pure def asksBeforeActing(s: Preferences): bool = s.document.status != R::Loaded or s.askFirst

pure def loadsImages(s: Preferences): bool = s.document.status == R::Loaded and s.images
```

### The owner changes Ask before Alpha acts or Load images only once the phone has read them, one save at a time

```quint
pure def editable(s: Preferences, by: Sender): bool =
  chooses(by) and s.document.status == R::Loaded and s.saving.status != R::Loading

pure def saveDocument(askFirst: bool, images: bool, s: Preferences): Changed =
  val asking = R::ask(s.saving)
  {
    state: { ...s, saving: asking, nextAskFirst: askFirst, nextImages: images, notice: Quiet },
    out: List(SaveDocument({ save: asking.ticket, saveAskFirst: askFirst, saveImages: images })),
  }

pure def canSetAskFirst(s: Preferences, askFirst: bool, by: Sender): bool = editable(s, by) and askFirst != s.askFirst

pure def setAskFirst(s: Preferences, askFirst: bool, by: Sender): Changed = saveDocument(askFirst, s.images, s)

pure def canSetImages(s: Preferences, images: bool, by: Sender): bool = editable(s, by) and images != s.images

pure def setImages(s: Preferences, images: bool, by: Sender): Changed = saveDocument(s.askFirst, images, s)

pure def alwaysASaveBuildsOnWhatWasRead(s: Preferences): bool =
  s.saving.status == R::Loading implies s.document.status == R::Loaded
```

### A change takes effect when the phone saved it; otherwise Alpha says it was not saved and nothing changes

```quint
pure val saveValues = Set(1, 2)

pure def canDocumentSaved(s: Preferences, save: int, ok: bool, by: Sender): bool = answers(by) and R::canAnswer(s.saving, save)

pure def documentSaved(s: Preferences, save: int, ok: bool, by: Sender): Preferences =
  if (ok) { ...s, saving: R::answer(s.saving, true), askFirst: s.nextAskFirst, images: s.nextImages }
  else { ...s, saving: R::answer(s.saving, false), notice: NotSaved }
```

### Alpha stops asking first only when the phone has read or saved that the owner turned it off

```quint
pure def stepAskingStopsOnlyOnTheOwnersWord(before: Preferences, via: str, after: Preferences): bool =
  (asksBeforeActing(before) and not(asksBeforeActing(after))) implies (via == "documentSaved" or via == "documentRead")
```

### When the device preferences cannot be read, the owner can recover them, after backing up, and they are read again

The phone resets the document to its defaults; Alpha then reads what it
holds.

```quint
pure val recoveryValues = Set(1, 2)

pure def canRecover(s: Preferences, by: Sender): bool =
  chooses(by) and s.document.status == R::Failed and s.recovering.status != R::Loading

pure def recover(s: Preferences, by: Sender): Changed =
  val asking = R::ask(s.recovering)
  { state: { ...s, recovering: asking, notice: Quiet }, out: List(RecoverDocument({ recovery: asking.ticket })) }

pure def canRecovered(s: Preferences, recovery: int, ok: bool, at: int, by: Sender): bool =
  answers(by) and R::canAnswer(s.recovering, recovery)

pure def recovered(s: Preferences, recovery: int, ok: bool, at: int, by: Sender): Changed =
  readAgain(at, { ...s, recovering: R::answer(s.recovering, ok) })

pure def stepRecoveryIsReadBack(before: Preferences, via: str, after: Preferences): bool =
  via == "recovered" implies (after.document.ticket == before.document.ticket + 1 and after.askFirst == before.askFirst)
```

### Recovery is offered only while the device preferences cannot be read

```quint
pure def alwaysRecoveryOnlyWhenUnread(s: Preferences): bool =
  s.recovering.status == R::Loading implies (s.document.status == R::Failed and s.askFirst and not(s.images))
```

### The owner can turn off asking first

```quint
pure def sometimesActsWithoutAsking(s: Preferences): bool = not(asksBeforeActing(s))
```

### Images can load in Inbox

```quint
pure def sometimesImagesLoad(s: Preferences): bool = loadsImages(s)
```

### The device preferences can be under recovery

```quint
pure def sometimesRecovering(s: Preferences): bool = s.recovering.status == R::Loading
```

## Story: Keep my preferences through a restart

> As the owner, I want what I chose to be there when Alpha starts again,
> and nothing half-done to count.

### A restart keeps the appearance kept and the size applied, drops what was in flight, and reads the device preferences again

```quint
pure def drop(r: R::Read): R::Read = if (r.status == R::Loading) R::answer(r, false) else r

pure def canRestart(s: Preferences, at: int, by: Sender): bool = answers(by)

pure def restart(s: Preferences, at: int, by: Sender): Changed =
  readAgain(at, safe(s.document, {
    ...s, theme: s.kept, keeping: drop(s.keeping), sizing: drop(s.sizing),
    saving: drop(s.saving), recovering: drop(s.recovering), notice: Quiet,
  }))

pure def stepARestartKeepsWhatWasKept(before: Preferences, via: str, after: Preferences): bool =
  via == "restart" implies (after.theme == before.kept and after.size == before.size and asksBeforeActing(after))
```
