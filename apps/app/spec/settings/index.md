# Settings

Alpha's Settings: a short root of categories, the pages each opens, and Android's own Settings for
what Android owns (PRD AP-12, AP-14, AP-15). Every value on a page is what Android, the vault, the
updater or the resident reported; a control is offered only when it can act. Settings keeps no
backup, import or export of the owner's data, and its developer pages exist only in a build with
test mocks.

- [Vocabulary](./vocabulary.md): switches, grants and roles as Android reported them.
- [Device facts](./facts.md): the facts read, text size, roles and Android handoffs.
- [Appearance](./appearance.md): light, dark or the system's choice, and legible text.
- [Preferences](./preferences.md): what Alpha may do and read, kept on the phone.
- [Privacy](./privacy.md): the always-on listener row and where speech goes.
- [Network](./network.md): nearby Wi-Fi, a join through Android's approval, and connectivity.
- [Updates](./updates.md): Alpha's own launcher updates, by hand and hands-off.
- [Reset](./reset.md): erasing Alpha's data after a native review.
- [Diagnostics](./diagnostics.md): the problem log, the diagnostics export and the licences.
- [Passwords](./passwords.md): Alpha's password vault, unlocked only by Android.
- [Native custody](./native.md): what the native updater, reset and stores guarantee the renderer.

## Story: Find a setting in a few taps

> As the owner, I open Settings, choose General, Privacy, Apps or About, and go back the way I
> came, so that I find each setting where I expect it and Android's own pages one tap away.

### Settings has a root, four categories and the pages each category opens

General's Notifications opens the notifications page Clock's mirror keeps. The root's Account row
shows the account's email or sign-in state and its AI provider row Own key or Cloud, as the account
reports them.

```quint
type Page = Root | General | Display | Notifications | Network | Privacy | Permissions | Apps | Passwords
  | AppInbox | AppCamera | AppMaps | AppNotes | AppPhotos | About | Problems | Licenses | LicenseDetail | Developer
type Settings = { page: Page, licence: int, developer: bool, opened: int }
pure val initial: Settings = { page: Root, licence: -1, developer: false, opened: 0 }
pure def parent(p: Page): Page =
  if (p == Display or p == Notifications or p == Network) General
  else if (p == Permissions) Privacy
  else if (p == Passwords or p == AppInbox or p == AppCamera or p == AppMaps or p == AppNotes or p == AppPhotos) Apps
  else if (p == Problems or p == Licenses) About
  else if (p == LicenseDetail) Licenses
  else Root
pure val pageValues = Set(Root, General, Display, Notifications, Network, Privacy, Permissions, Apps, Passwords, AppInbox, AppPhotos, About, Problems, Licenses, Developer)
pure val sValues = Set(initial).union(Set({ ...initial, developer: true }))
```

### A page opens from its parent, and Back returns to that parent

Android's Back does the same: it pops one page, and on the root it leaves Settings. What the page
holds open closes first and Back stays on the page: the erase or preferences-reset confirmation,
the Wi-Fi password sheet, the problem log's clear confirmation, and the vault's pending
confirmation or open entry. A confirmation belongs to the visit of the page that opened it.

```quint
pure def canOpen(s: Settings, page: Page): bool =
  page != Root and page != LicenseDetail and parent(page) == s.page and (page != Developer or s.developer)
pure def open(s: Settings, page: Page): Settings = { ...s, page: page, opened: s.opened + 1 }
pure def canBack(s: Settings): bool = s.page != Root
pure def back(s: Settings): Settings = { ...s, page: parent(s.page), licence: if (s.page == LicenseDetail) -1 else s.licence }
pure def sometimesTwoLevelsDeep(s: Settings): bool = s.page == Display or s.page == Permissions
```

### Developer pages open only in a build with test mocks

The build decides `developer` when Settings starts; nothing the owner or another surface sends can
turn it on.

```quint
pure def alwaysDeveloperOnlyWithTestMocks(s: Settings): bool = s.page == Developer implies s.developer
pure def stepTheBuildGateNeverChanges(before: Settings, after: Settings): bool = after.developer == before.developer
pure def sometimesDeveloperOpen(s: Settings): bool = s.page == Developer
```

### Another surface may open only a listed section, never Developer or Passwords

The assistant or a notice can open General, Display, Notifications, Privacy, Permissions, Apps,
Inbox's page or About. The account, Google and the AI provider live in the Account app: the root's Account, Google &
email and AI provider rows open it, and a request for Settings' `plans`, `google` or `provider`
route opens that section of the Account app instead; `calendar` opens Calendar's Calendars sheet and
`workflows` opens Workflows.

```quint
pure def listedSection(page: Page): bool =
  page == General or page == Display or page == Notifications or page == Privacy or page == Permissions or page == Apps
  or page == AppInbox or page == About
pure def canOpenSection(s: Settings, page: Page): bool = listedSection(page)
pure def openSection(s: Settings, page: Page): Settings = { ...s, page: page, opened: s.opened + 1 }
pure def stepNoSurfaceOpensDeveloperOrPasswords(before: Settings, via: str, after: Settings): bool =
  via == "openSection" implies (after.page != Developer and after.page != Passwords)
```

### A route names a listed section, or another app it is forwarded to

The legacy section names still open their page: `sound` opens General and `notifications` opens
Notifications.

```quint
type Forward = ToSettings | ToPlans | ToProvider | ToGoogle | ToCalendar | ToWorkflows
pure def forwardOf(route: str): Forward =
  if (route == "plans" or route == "account") ToPlans else if (route == "provider") ToProvider
  else if (route == "google") ToGoogle else if (route == "calendar") ToCalendar
  else if (route == "workflows") ToWorkflows else ToSettings
pure def sectionOf(route: str): Page =
  if (route == "general" or route == "sound") General else if (route == "notifications") Notifications
  else if (route == "display") Display
  else if (route == "privacy") Privacy else if (route == "permissions") Permissions else if (route == "apps") Apps
  else if (route == "inbox") AppInbox else if (route == "about") About else Root
pure def lawNoRouteOpensDeveloperOrPasswords(route: str): bool = sectionOf(route) != Developer and sectionOf(route) != Passwords
pure def lawARouteSectionIsListed(route: str): bool = sectionOf(route) == Root or listedSection(sectionOf(route))
```

### Apps lists each app once, and opens its page in Settings or the app itself

An app with nothing to set in Settings opens the app; Messages is listed only on the Alpha image,
and Photos has a page on the phone, where Android decides its library access.

```quint
type AppRow = RowBrowser | RowCalendar | RowCamera | RowFiles | RowInbox | RowMaps | RowMessages | RowNotes
  | RowPasswords | RowPhotos | RowWorkflows
pure def appPage(app: AppRow, onPhone: bool): Page =
  if (app == RowInbox) AppInbox else if (app == RowCamera) AppCamera else if (app == RowMaps) AppMaps
  else if (app == RowNotes) AppNotes else if (app == RowPasswords) Passwords
  else if (app == RowPhotos and onPhone) AppPhotos else Root
pure def appListed(app: AppRow, aosp: bool): bool = app != RowMessages or aosp
pure def lawAnAppPageOpensFromApps(app: AppRow, onPhone: bool): bool =
  appPage(app, onPhone) == Root or parent(appPage(app, onPhone)) == Apps
```

### Calendar's row opens Calendar at its Calendars sheet, where its sources are set

Settings mounts no Calendar settings of its own; the `calendar` route opens the same sheet.

```quint
pure val calendarSettingsRoute: str = "settings"
pure def appRoute(app: AppRow): str = if (app == RowCalendar) calendarSettingsRoute else ""
pure def lawOnlyCalendarOpensAtARoute(app: AppRow): bool = appRoute(app) != "" implies app == RowCalendar
```

### General's Phone row opens Phone's line details on the Alpha image only, and About's Agent activity opens the assistant's activity on the phone

The Phone row hands off to the Phone app's information (SIM, carrier, roles and the identifiers
Android shows); Agent activity hands off to the assistant's activity, which needs the on-device
agent. Neither row exists where its app cannot answer.

```quint
type Elsewhere = PhoneInfo | AgentActivity
pure def elsewhereShown(e: Elsewhere, aosp: bool, onPhone: bool): bool = if (e == PhoneInfo) aosp else onPhone
pure def elsewhereRoute(e: Elsewhere): str = if (e == PhoneInfo) "info" else "activity"
pure def lawThePhoneRowOnlyOnTheImage(onPhone: bool): bool = not(elsewhereShown(PhoneInfo, false, onPhone))
pure def lawNoAgentActivityInABrowser(aosp: bool): bool = not(elsewhereShown(AgentActivity, aosp, false))
```

### Privacy's Access setup reopens the first-run access walkthrough at its first step

```quint
pure val accessSetupStep: int = 0
```

### A licence opens its details from the list of licences

```quint
pure def canOpenLicence(s: Settings, index: int): bool = s.page == Licenses and index >= 0
pure def openLicence(s: Settings, index: int): Settings = { ...s, page: LicenseDetail, licence: index }
pure def alwaysDetailsNameALicence(s: Settings): bool = s.page == LicenseDetail implies s.licence >= 0
pure val indexValues = Set(-1, 0, 2)
```

### Leaving Settings returns to its root

Settings leaves when another app or Home comes to the front; going to the background keeps the
page, but a vault the page held is locked.

```quint
pure def leave(s: Settings): Settings = { ...s, page: Root, licence: -1 }
pure def sometimesLeftFromDeep(s: Settings): bool = s.page == Root and s.opened >= 2
```
