# Apps drawer

The Apps drawer owns its search text and the app whose menu shows. The
shell owns the drawer route and Home owns what was read from the phone.

## Story: Find an installed app by name

> As the owner, I want to find the app I am looking for by its name or
> package and leave the drawer without keeping the search.

### The drawer's search starts empty

```quint
type Drawer = { query: str, menu: str }

pure val initial: Drawer = { query: "", menu: "" }
pure val queryValues = Set("", "clock", "notes")
pure val appValues = Set("clock", "mail", "notes")
pure val listedValues = Set(Set(), Set("clock"), Set("clock", "mail"))
```

### The search can change while Apps shows, and it clears when Apps closes

```quint
pure def canSearch(d: Drawer, query: str, open: bool): bool = open and query != d.query

pure def search(d: Drawer, query: str, open: bool): Drawer = { ...d, query: query, menu: "" }

pure def canClear(d: Drawer): bool = d.query != "" or d.menu != ""

pure def clear(d: Drawer): Drawer = initial
```

## Story: Act on an installed app from its menu

> As the owner, I want a long press on an app in Apps to offer Add to Home
> and Android's App info.

### The menu names a current app and closes before Apps

An app already on Home says On Home. Changing the search, leaving Apps
or losing the app from the current catalog also closes its menu.

```quint
pure def canOpenMenu(d: Drawer, app: str, open: bool, listed: Set[str]): bool =
  d.menu == "" and app != "" and open and listed.contains(app)

pure def openMenu(d: Drawer, app: str, open: bool, listed: Set[str]): Drawer = { ...d, menu: app }

pure def canCloseMenu(d: Drawer): bool = d.menu != ""

pure def closeMenu(d: Drawer): Drawer = { ...d, menu: "" }

pure def canAppsChanged(d: Drawer, listed: Set[str]): bool = d.menu != "" and not(listed.contains(d.menu))

pure def appsChanged(d: Drawer, listed: Set[str]): Drawer = closeMenu(d)
```
