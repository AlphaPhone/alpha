# Shell

The shell is everything Alpha draws around the apps: Home with its daily overview and app grid,
the app library, navigation and Android Back, the launcher's favorites and its gestures, the one
Android shade, sheets and inline modals, the keyboard and window geometry, accessible toasts and
the notices slot, startup permissions, recovery from a failed render, haptics and the owner route
table the Android request gate shares. Each child spec is one machine or library; the shell code in
`src/shell/` runs them, and `src/web/shell/` draws them.

- [Navigation](./navigation.md): the open app, its kept place, the Back order and the layers above.
- [Favorites](./favorites.md): Home's ordered favorites, their defaults and their migration.
- [Gestures](./gestures.md): press, hold and drag custody on Home and in the library; swipe zones.
- [App info](./appInfo.md): the one App info handoff for a library entry.
- [Shade](./shade.md): the one notification surface a pull on Home reaches.
- [Inventory](./inventory.md): when the installed-app list is read again.
- [Toasts](./toasts.md): accessible toast lifetime, the queue and persistent notices.
- [Geometry](./geometry.md): keyboard-free height, canvas arrangement, text scale and dock clearance.
- [Focus](./focus.md): where focus goes after a screen change, a closed modal and a reloaded list.
- [Overview](./overview.md): the daily overview cards on Home (AP-07).
- [Permissions](./permissions.md): the startup access walkthrough.
- [Landing](./landing.md): the delegation return page.
- [Recovery](./recovery.md): a failed render and the recovery screen.
- [Haptics](./haptics.md): touch feedback.
- [Routes](./routes.md): the owner route table.
- [System](./system.md): what the renderer relies on from Android's handoffs.

## Story: Open an app from Home and keep my place

> As the owner, I want every app I may use on this phone to open from Home, and to find it where I
> left it when I come back to it, even after Android restarted Alpha.

### An app is offered only where its availability admits it

Phone, Messages and Contacts exist only on the Alpha AOSP image (PRD AP-08). A launcher APK on stock
Android and the browser build never list, open or route to them; every other app is offered in
every build.

```quint
type Availability = Everywhere | AospOnly
type Variant = LauncherBuild | AospImage | BrowserBuild
pure def admits(availability: Availability, variant: Variant): bool =
  availability == Everywhere or variant == AospImage
pure def lawAospAppsOnlyOnTheImage(variant: Variant): bool =
  admits(AospOnly, variant) iff variant == AospImage
pure def lawEverywhereAppsInEveryBuild(variant: Variant): bool = admits(Everywhere, variant)
```

### Home lists Alpha's apps in Alpha's order until the owner arranges them

The default Home row order is Phone, Messages, Inbox, Calendar, Browser, Camera, Photos, Maps,
Notes, Contacts, Files, Workflows, Settings and Clock, each only where it is admitted. The order is
a position number per app; an app without one is not a Home default.

```quint
pure def homeRank(app: str): int =
  if (app == "phone") 1 else if (app == "messages") 2 else if (app == "inbox") 3
  else if (app == "calendar") 4 else if (app == "browser") 5 else if (app == "camera") 6
  else if (app == "photos") 7 else if (app == "maps") 8 else if (app == "notes") 9
  else if (app == "contacts") 10 else if (app == "files") 11 else if (app == "workflows") 12
  else if (app == "settings") 13 else if (app == "clock") 14 else 0
pure def onHomeByDefault(app: str): bool = homeRank(app) > 0
pure def lawAssistantIsNotATile(app: str): bool = app == "assistant" implies not(onHomeByDefault(app))
pure val appValues = Set("phone", "assistant", "calendar")
```
