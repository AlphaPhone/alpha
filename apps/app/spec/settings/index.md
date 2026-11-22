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

```quint
type Page = Root | General | Display | Network | Privacy | Permissions | Apps | Passwords
  | About | Problems | Licenses | LicenseDetail | Developer
type Settings = { page: Page, licence: int, developer: bool, opened: int }
pure val initial: Settings = { page: Root, licence: -1, developer: false, opened: 0 }
pure def parent(p: Page): Page =
  if (p == Display or p == Network) General
  else if (p == Permissions) Privacy
  else if (p == Passwords) Apps
  else if (p == Problems or p == Licenses) About
  else if (p == LicenseDetail) Licenses
  else Root
pure val pageValues = Set(Root, General, Display, Network, Privacy, Permissions, Apps, Passwords, About, Problems, Licenses, Developer)
pure val sValues = Set(initial).union(Set({ ...initial, developer: true }))
```

### A page opens from its parent, and Back returns to that parent

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

The assistant or a notice can open General, Display, Privacy, Permissions, Apps or About.

```quint
pure def listedSection(page: Page): bool =
  page == General or page == Display or page == Privacy or page == Permissions or page == Apps or page == About
pure def canOpenSection(s: Settings, page: Page): bool = listedSection(page)
pure def openSection(s: Settings, page: Page): Settings = { ...s, page: page, opened: s.opened + 1 }
pure def stepNoSurfaceOpensDeveloperOrPasswords(before: Settings, via: str, after: Settings): bool =
  via == "openSection" implies (after.page != Developer and after.page != Passwords)
```

### A licence opens its details from the list of licences

```quint
pure def canOpenLicence(s: Settings, index: int): bool = s.page == Licenses and index >= 0
pure def openLicence(s: Settings, index: int): Settings = { ...s, page: LicenseDetail, licence: index }
pure def alwaysDetailsNameALicence(s: Settings): bool = s.page == LicenseDetail implies s.licence >= 0
pure val indexValues = Set(-1, 0, 2)
```

### Leaving Settings returns to its root

```quint
pure def leave(s: Settings): Settings = { ...s, page: Root, licence: -1 }
pure def sometimesLeftFromDeep(s: Settings): bool = s.page == Root and s.opened >= 2
```
