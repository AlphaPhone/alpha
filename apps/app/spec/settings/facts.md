# Device facts

What Settings shows about the phone: one read of Android's facts at a time, fenced by its
generation; the text size the device holds; Alpha's roles; and the handoffs to Android's own pages.
On the launcher and the image these come from `AlphaDevice`, `ElizaSystem`, `AlphaNotifications`,
`AlphaPhotos`, `AlphaPhotoLibrary`, `AlphaFiles` and Files' storage reading; in a browser, from the
browser's own permission answers.

## Story: Read my phone's state truthfully

> As the owner, I want Settings to show what Android reports now, read again when I come back to
> it, and never a value from an older read.

### A read of the device is what Settings shows, and each read carries a generation

```quint
import vocabulary.* from "./vocabulary"

type DeviceRead = {
  wifi: Switch, bluetooth: Switch, airplane: Switch, location: Switch, dnd: Switch, brightnessAuto: Switch,
  camera: Access, microphone: Access, locationAccess: Access, calendar: Access, photos: Access, files: Access,
  notifications: Access, home: RoleHold, assistant: RoleHold, launcher: bool, version: str, versionCode: int,
  installedAt: int, android: str, textScale: int, storageUsed: int, storageTotal: int,
}
type Handoff = HandoffIdle | HandoffOpening | HandoffOpened({ specific: bool }) | HandoffRefused
type Facts = {
  read: DeviceRead, generation: int, shown: int, visible: bool, resumedUnread: bool,
  scaleIssued: int, scaleSeen: int, scaleFailed: int, scaleHeld: int, scalePending: bool,
  roleAsking: bool, roleRefused: bool, handoff: Handoff, handoffPage: SettingsPage, shade: ShadeAnswer,
}
pure val unread: DeviceRead = {
  wifi: Unknown, bluetooth: Unknown, airplane: Unknown, location: Unknown, dnd: Unknown, brightnessAuto: Unknown,
  camera: Unread, microphone: Unread, locationAccess: Unread, calendar: Unread, photos: Unread, files: Unread,
  notifications: Unread, home: RoleUnread, assistant: RoleUnread, launcher: false, version: "", versionCode: 0,
  installedAt: 0, android: "", textScale: 100, storageUsed: -1, storageTotal: -1,
}
pure val initial: Facts = {
  read: unread, generation: 0, shown: 0, visible: false, resumedUnread: false,
  scaleIssued: 0, scaleSeen: 0, scaleFailed: 0, scaleHeld: 0, scalePending: false, roleAsking: false, roleRefused: false,
  handoff: HandoffIdle, handoffPage: PageHome, shade: ShadeNotAsked,
}
pure val readValues = Set(unread).union(Set({ ...unread, wifi: On, home: NotHeldByAlpha, launcher: true, textScale: 115, versionCode: 7 }))
pure val tokenValues = Set(1, 2, 3)
```

### Each read starts a new generation, and only the newest generation's answer is shown

A read that overlapped a text-size change keeps the size already shown.

```quint
pure def beginRead(f: Facts): Facts = { ...f, generation: f.generation + 1, resumedUnread: false }
pure def canSettleRead(f: Facts, token: int, read: DeviceRead): bool = token == f.generation and token > f.shown
pure def settleRead(f: Facts, token: int, read: DeviceRead): Facts =
  { ...f, shown: token, read: if (f.scalePending) { ...read, textScale: f.read.textScale } else read }
pure def alwaysTheShownReadIsNoNewerThanTheLastBegun(f: Facts): bool = f.shown >= 0 and f.shown <= f.generation
pure def stepFactsChangeOnlyByARead(before: Facts, via: str, after: Facts): bool =
  (via != "settleRead" and via != "scaleApplied" and via != "scaleFailedNewest") implies after.read == before.read
pure def sometimesARead(f: Facts): bool = f.shown >= 1 and f.read.launcher
```

### A return to the app reads now when Settings is in front, and when it is next shown otherwise

```quint
pure def resume(f: Facts): Facts = if (f.visible) beginRead(f) else { ...f, resumedUnread: true }
pure def show(f: Facts): Facts = beginRead({ ...f, visible: true })
pure def hide(f: Facts): Facts = { ...f, visible: false }
pure def alwaysAShownSettingsHasNothingUnread(f: Facts): bool = f.visible implies not(f.resumedUnread)
pure def sometimesUnreadBehindAnotherView(f: Facts): bool = f.resumedUnread
```

### The newest text-size request decides what is shown, and an older one only when the newest fails

The device applies requests in the order they were issued; their answers arrive in any order. An
older answer is held while a newer request is in flight, and shown once the newest fails, because it
is then the size the device holds. The sizes are 75, 100, 115, 130 and 150 percent. A failed newest
request says the size could not be saved, and Settings reads the device again.

```quint
pure val textScales = Set(75, 100, 115, 130, 150)
pure val percentValues = Set(75, 115, 150)
pure def canRequestScale(f: Facts, percent: int): bool = textScales.contains(percent)
pure def requestScale(f: Facts, percent: int): Facts = { ...f, scaleIssued: f.scaleIssued + 1, scalePending: true }
pure def canScaleApplied(f: Facts, token: int, percent: int): bool =
  token >= 1 and token <= f.scaleIssued and token > f.scaleSeen and textScales.contains(percent)
pure def scaleApplied(f: Facts, token: int, percent: int): Facts =
  if (token == f.scaleIssued or f.scaleFailed == f.scaleIssued)
    { ...f, scaleSeen: token, scaleHeld: 0, scalePending: if (token == f.scaleIssued) false else f.scalePending, read: { ...f.read, textScale: percent } }
  else { ...f, scaleSeen: token, scaleHeld: percent }
pure def canScaleFailedNewest(f: Facts): bool = f.scaleIssued >= 1 and f.scaleFailed < f.scaleIssued and f.scaleSeen < f.scaleIssued
pure def scaleFailedNewest(f: Facts): Facts =
  { ...f, scaleFailed: f.scaleIssued, scalePending: false, scaleHeld: 0,
    read: if (f.scaleHeld > 0) { ...f.read, textScale: f.scaleHeld } else f.read }
pure def alwaysTheShownSizeIsOneTheDeviceTakes(f: Facts): bool = textScales.contains(f.read.textScale)
pure def alwaysAnswersFollowRequests(f: Facts): bool = f.scaleSeen <= f.scaleIssued and f.scaleFailed <= f.scaleIssued
pure def sometimesAnOlderSizeHeld(f: Facts): bool = f.scaleHeld > 0
pure def scaleNotSaved(f: Facts): bool = f.scaleIssued >= 1 and f.scaleFailed == f.scaleIssued
```

### In a browser, each permission is the browser's own answer

The camera, microphone, location and notifications are what the browser's permission answers say;
photos and files there are always the ones the owner picks, which is partial access.

```quint
pure def pickedOnly(inBrowser: bool, access: Access): Access = if (inBrowser) Partial else access
pure def lawABrowserPickIsPartial(access: Access): bool = pickedOnly(true, access) == Partial
```

## Story: Make Alpha my Home app

> As the owner of a launcher build, I ask Android to make Alpha my Home app, and Settings tells me
> what Android then reports.

### Set as Home is offered only to a launcher build that Android reports does not hold the role

Android shows its own role dialog; whether Alpha holds the role is read back afterwards, never
assumed from the dialog's answer. A request Android refused says nothing changed.

```quint
pure def canAskHome(f: Facts): bool =
  f.read.launcher and not(f.roleAsking) and (f.read.home == NotHeldByAlpha or f.read.home == HeldElsewhere)
pure def askHome(f: Facts): Facts = { ...f, roleAsking: true, roleRefused: false }
pure def canHomeAnswered(f: Facts, refused: bool): bool = f.roleAsking
pure def homeAnswered(f: Facts, refused: bool): Facts = beginRead({ ...f, roleAsking: false, roleRefused: refused })
pure def stepARoleIsHeldOnlyByARead(before: Facts, via: str, after: Facts): bool =
  (via == "askHome" or via == "homeAnswered") implies after.read.home == before.read.home
pure def sometimesAskingForHome(f: Facts): bool = f.roleAsking
```

## Story: Go to Android's own page

> As the owner, I tap a row for something Android owns, such as Wi-Fi, Bluetooth, the shade, app
> info or default apps, and Android's page opens; if this phone has no page for exactly that, I am
> told a broader one opened.

### One handoff runs at a time, and its answer names whether the specific page opened

A repeated tap while Android is opening a page is ignored. A page Android could not open says it is
unavailable. Alpha's App info, Android's all-files access page and its photo library dialog are
handoffs too, and Settings reads the device again after the last two answer.

```quint
pure def canBeginHandoff(f: Facts, page: SettingsPage): bool = f.handoff != HandoffOpening
pure def beginHandoff(f: Facts, page: SettingsPage): Facts = { ...f, handoff: HandoffOpening, handoffPage: page }
pure def canHandoffAnswered(f: Facts, opened: bool, specific: bool): bool = f.handoff == HandoffOpening
pure def handoffAnswered(f: Facts, opened: bool, specific: bool): Facts =
  { ...f, handoff: if (opened) HandoffOpened({ specific: specific }) else HandoffRefused }
pure def sometimesABroaderPage(f: Facts): bool = f.handoff == HandoffOpened({ specific: false })
```

### A broader page is named for what it covers

```quint
type SettingsPage = PageWifi | PageBluetooth | PageMobile | PageAirplane | PageLocation | PageDisplay | PageSound
  | PageBattery | PageAbout | PageDeveloper | PageNotifications | PagePrivacy | PageDefaultApps | PageDnd | PageHome
  | PageAppInfo | PageFilesAccess | PagePhotoAccess
type BroaderNotice = NoBroader | NetworkPage | PriorityPage | RelatedPage
pure def broaderNotice(page: SettingsPage, specific: bool): BroaderNotice =
  if (specific) NoBroader else if (page == PageAirplane or page == PageMobile) NetworkPage
  else if (page == PageDnd) PriorityPage else RelatedPage
pure def lawASpecificPageNeedsNoNotice(page: SettingsPage): bool = broaderNotice(page, true) == NoBroader
pure def lawEveryBroaderPageHasANotice(page: SettingsPage): bool = broaderNotice(page, false) != NoBroader
```

### The shade opens only from a focused launcher that holds the status bar permission

Otherwise Settings says which of those Android reported missing, until the next tap.

```quint
type ShadeAnswer = ShadeNotAsked | ShadeOpened | ShadeStandalone | ShadePermissionMissing | ShadeUnsupported | ShadeNotInFront
pure def canShadeAnswered(f: Facts, answer: ShadeAnswer): bool = answer != ShadeNotAsked
pure def shadeAnswered(f: Facts, answer: ShadeAnswer): Facts = { ...f, shade: answer }
pure def shadeOpened(answer: ShadeAnswer): bool = answer == ShadeOpened
pure def lawOnlyAnOpenedShadeCounts(answer: ShadeAnswer): bool = shadeOpened(answer) iff answer == ShadeOpened
```

### Storage use is shown only as a used and a total Android reported, used never above total

The primary volume Files reads is the source; the launcher's own snapshot is used where Files has
no volume to report.

```quint
pure def storageKnown(read: DeviceRead): bool =
  read.storageUsed >= 0 and read.storageTotal > 0 and read.storageUsed <= read.storageTotal
pure def lawUnreadStorageIsNotShown(read: DeviceRead): bool = read.storageTotal < 0 implies not(storageKnown(read))
```
