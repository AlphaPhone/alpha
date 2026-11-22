# Favorites

Home's tiles are one ordered list of keys: an Alpha app as `alpha:<app id>` (`alpha:calendar`) and
an installed Android entry by its exact launcher identity, package, then activity, then profile
(`org.fixture.clock/org.fixture.clock.Main#10`); a label never identifies an entry. The list is the
owner's on-device record, kept in the owner's storage. It may name entries that are not installed
now: they keep their slots and are not drawn.

Until the owner arranges Home, it shows Alpha's admitted apps in Alpha's order (spec/shell, "Home
lists Alpha's apps in Alpha's order until the owner arranges them"), and the installed apps when no
Alpha app is admitted. An earlier Alpha kept the list under `alpha.launcher.favorites.v1`; the
shell imports that record once.

```quint
type Legacy = NoLegacy | LegacyV1 | LegacyBareDefaults | LegacyChoice
type Favorites = {
  chosen: bool, entries: List[str], previous: List[str], imported: bool,
  mergeViews: bool, trimBare: bool, views: List[str]
}
pure val initial: Favorites = {
  chosen: false, entries: List(), previous: List(), imported: false,
  mergeViews: false, trimBare: false, views: List()
}
type Cursor = { at: int, found: int }
type Refill = { out: List[str], taken: int }
pure val keyValues = Set("alpha:notes", "alpha:workflows", "org.fixture.clock")
pure val keysValues = Set(List(), List("alpha:notes", "alpha:automations"), List("alpha:notes", "org.fixture.clock", "org.fixture.gone"))
pure val viewsValues = Set(List(), List("alpha:notes"), List("alpha:notes", "alpha:workflows"))
pure val appsValues = Set(List(), List("org.fixture.clock"), List("org.fixture.clock", "org.fixture.camera"))
pure val availableValues = Set(List("alpha:notes", "alpha:workflows", "org.fixture.clock"))
pure val visibleValues = Set(List("alpha:notes", "org.fixture.clock"), List("alpha:notes", "alpha:workflows", "org.fixture.clock"))
pure val overValues = Set("alpha:notes", "org.fixture.clock")
pure val directionValues = Set(-1, 1)
```

## Story: Keep Home the way I arranged it

> As the owner, I want the apps I put on Home to stay in my order, defaults to fill Home only
> until I choose, and an older Alpha's arrangement to carry over.

### Every key is current and listed once

Earlier Alpha keys are renamed once: Workflows was `alpha:automations` and before that
`alpha:workflows`, the assistant was `alpha:chat`, and Wallet (`alpha:inventory`) left the product.

```quint
pure def unique(xs: List[str]): List[str] = xs.foldl(List(), (acc, k) => if (acc.includes(k)) acc else acc.append(k))
pure def renamed(key: str): str =
  if (key == "alpha:automations") "alpha:workflows" else if (key == "alpha:chat") "alpha:assistant" else key
pure def current(xs: List[str]): List[str] =
  unique(xs.select(k => k != "alpha:inventory").listMap(k => renamed(k)))
pure def alwaysFavoritesAreCurrentAndUnique(f: Favorites): bool =
  f.entries == unique(f.entries) and not(f.entries.includes("alpha:automations")) and
  not(f.entries.includes("alpha:chat")) and not(f.entries.includes("alpha:inventory"))
pure def lawRenamingIsIdempotent(keys: List[str]): bool = current(current(keys)) == current(keys)
```

### An earlier record is imported once, and only into a list that was never stored

A v1 record named only installed shortcuts: Alpha's apps join it. A v2 record without a default
policy was written by an Alpha that saved every installed app as the default: once the inventory is
read, the installed apps the owner never placed are trimmed and the old list is kept beside it. Any
other v2 record is the owner's choice. A record that is missing or unreadable leaves the defaults.

```quint
pure def canImportLegacy(f: Favorites, record: Legacy, keys: List[str]): bool = not(f.imported)
pure def importLegacy(f: Favorites, record: Legacy, keys: List[str]): Favorites = match record {
  | NoLegacy => { ...f, imported: true }
  | LegacyV1 => { ...f, imported: true, chosen: true, entries: current(keys), mergeViews: true }
  | LegacyBareDefaults => { ...f, imported: true, chosen: true, entries: current(keys), trimBare: true, previous: keys }
  | LegacyChoice => { ...f, imported: true, chosen: true, entries: current(keys) }
}
pure def stepImportHappensOnce(before: Favorites, via: str, after: Favorites): bool =
  via == "importLegacy" implies not(before.imported)
pure def sometimesImportedV1(f: Favorites): bool = f.imported and f.chosen and f.views.length() > 0 and not(f.mergeViews)
```

### Defaults follow what is admitted until the owner chooses, and an explicit empty Home stays empty

The admitted Alpha apps are offered on every render, in Alpha's order. Before a choice they are
Home; once the installed inventory has been read the defaults are written as the owner's list. A
choice, including an empty Home, is never replaced by defaults again.

```quint
pure def defaults(views: List[str], apps: List[str]): List[str] = if (views.length() > 0) views else apps
pure def syncViews(f: Favorites, views: List[str]): Favorites =
  if (not(f.chosen)) { ...f, views: views, entries: current(views) }
  else if (f.mergeViews) { ...f, views: views, entries: current(f.entries.concat(views)), mergeViews: views.length() == 0 }
  else { ...f, views: views }
pure def inventoryLoaded(f: Favorites, apps: List[str]): Favorites = {
  val shown = f.entries.select(k => f.views.includes(k) or apps.includes(k))
  val loaded = f.views.concat(apps)
  if (not(f.chosen)) { ...f, chosen: true, entries: current(defaults(f.views, apps)) }
  else if (f.trimBare and f.views.length() > 0 and shown == loaded)
    { ...f, trimBare: false, previous: f.entries, entries: f.entries.select(k => f.views.includes(k) or not(apps.includes(k))) }
  else { ...f, trimBare: f.trimBare and f.views.length() == 0 }
}
pure def stepAChoiceIsNeverUndone(before: Favorites, after: Favorites): bool = before.chosen implies after.chosen
pure def stepDefaultsOnlyBeforeAChoice(before: Favorites, via: str, after: Favorites): bool =
  (before.chosen and before.entries != after.entries and (via == "syncViews" or via == "inventoryLoaded")) implies
    (before.mergeViews or before.trimBare)
pure def sometimesExplicitEmptyHome(f: Favorites): bool = f.chosen and f.entries.length() == 0 and f.views.length() > 0
pure def sometimesTrimmedBareDefaults(f: Favorites): bool = f.imported and not(f.trimBare) and f.previous.length() > 0
```

### An edit adds, removes or moves one key and leaves every other slot where it was

Adding needs an entry that exists now; removing works for any listed key. Moving and dropping
reorder only the entries Home shows: entries not installed now keep their slots. Every edit is the
owner's choice.

```quint
pure def indexIn(xs: List[str], key: str): int =
  xs.foldl({ at: 0, found: -1 }, (c, k) => { at: c.at + 1, found: if (k == key and c.found < 0) c.at else c.found }).found
pure def moveTo(order: List[str], key: str, place: int): List[str] = {
  val rest = order.select(k => k != key)
  val filled = rest.foldl({ out: List(), taken: 0 }, (r, k) =>
    { out: if (r.taken == place) r.out.append(key).append(k) else r.out.append(k), taken: r.taken + 1 })
  if (place >= rest.length()) filled.out.append(key) else filled.out
}
pure def refill(entries: List[str], shown: List[str], order: List[str]): List[str] =
  entries.foldl({ out: List(), taken: 0 }, (r, k) =>
    if (shown.includes(k)) { out: r.out.append(order.nthOr(r.taken, k)), taken: r.taken + 1 } else { out: r.out.append(k), taken: r.taken }).out
pure def shownOf(f: Favorites, visible: List[str]): List[str] = f.entries.select(k => visible.includes(k))
pure def canToggle(f: Favorites, key: str, available: List[str]): bool = f.entries.includes(key) or available.includes(key)
pure def toggle(f: Favorites, key: str, available: List[str]): Favorites =
  { ...f, chosen: true, entries: if (f.entries.includes(key)) f.entries.select(k => k != key) else current(f.entries.append(key)) }
pure def canRemove(f: Favorites, key: str): bool = f.entries.includes(key)
pure def remove(f: Favorites, key: str): Favorites = { ...f, chosen: true, entries: f.entries.select(k => k != key) }
pure def canMove(f: Favorites, key: str, direction: int, visible: List[str]): bool = {
  val shown = shownOf(f, visible)
  val at = indexIn(shown, key)
  at >= 0 and at + direction >= 0 and at + direction < shown.length() and (direction == 1 or direction == -1)
}
pure def move(f: Favorites, key: str, direction: int, visible: List[str]): Favorites = {
  val shown = shownOf(f, visible)
  { ...f, chosen: true, entries: refill(f.entries, shown, moveTo(shown, key, indexIn(shown, key) + direction)) }
}
pure def canPlace(f: Favorites, key: str, over: str, visible: List[str]): bool =
  key != over and indexIn(shownOf(f, visible), key) >= 0 and indexIn(shownOf(f, visible), over) >= 0
pure def place(f: Favorites, key: str, over: str, visible: List[str]): Favorites = {
  val shown = shownOf(f, visible)
  { ...f, chosen: true, entries: refill(f.entries, shown, moveTo(shown, key, indexIn(shown, over))) }
}
pure def lawMovingKeepsEveryKey(xs: List[str], key: str, over: str): bool = {
  val order = unique(xs)
  val moved = moveTo(order, key, indexIn(order, over))
  order.includes(key) implies (moved.length() == order.length() and order.every(k => moved.includes(k)))
}
pure def lawHiddenSlotsStay(keys: List[str], visible: List[str], key: str): bool = {
  val entries = unique(keys)
  val shown = entries.select(k => visible.includes(k))
  val after = refill(entries, shown, moveTo(shown, key, 0))
  after.length() == entries.length() and entries.every(k => visible.includes(k) or indexIn(after, k) == indexIn(entries, k))
}
pure def sometimesHiddenSlotBetweenTiles(f: Favorites): bool = f.chosen and f.entries.includes("org.fixture.gone") and f.entries.length() >= 3
```
