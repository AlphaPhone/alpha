# Layers

What covers the page for a moment: a sheet, a menu or a dialog an area
opened, and what holds the whole phone while its own machine says so, such
as a call coming in, an update being installed or the startup walkthrough.
Each is drawn by the area that opened it: a sheet, menu or dialog where its
screen is, a hold at the shell's `overlay` place, and the notices at
`notice`, over everything. The shell keeps only which are open, in the order
they opened, so that Back closes the one on top and the page under them
takes no touch. None of them outlives the page: Alpha opening again starts
with none.

## Story: Keep a sheet or a dialog above the phone

> As the owner, I want a sheet, menu or dialog to own the phone while it is
> open, Ask Alpha to stay usable beside one that leaves it free, and Back to
> close the one on top first.

### The layers are the sheets, menus and dialogs open now, from the bottom, the holds on the phone, and the screens with a step of their own

A layer is named by its id, which its area chooses; a layer that covers
also covers Ask Alpha. A hold is named by what holds the phone. A screen
with a step of its own, such as Home being edited, is named by its place.

```quint
type Kind = MenuLayer | DialogLayer | SheetLayer
type Layer = { id: str, kind: Kind, covers: bool }
type Layers = { open: List[Layer], holds: Set[str], steps: Set[str] }

pure val initial: Layers = { open: List(), holds: Set(), steps: Set() }
```

### What the simulator tries

```quint
pure val idValues = Set("add", "menu", "call")
pure val placeValues = Set("home", "view:Notes")
```

### A layer opens on top, once, and closes by its id with its area

Opening a layer that is already open changes nothing.

```quint
pure def listed(l: Layers, id: str): bool = l.open.some(x => x.id == id)

pure def canOpenLayer(l: Layers, id: str, kind: Kind, covers: bool): bool = id != "" and not(listed(l, id))

pure def openLayer(l: Layers, id: str, kind: Kind, covers: bool): Layers =
  { ...l, open: l.open.append({ id: id, kind: kind, covers: covers }) }

pure def canCloseLayer(l: Layers, id: str): bool = listed(l, id)

pure def closeLayer(l: Layers, id: str): Layers = { ...l, open: l.open.select(x => x.id != id) }
```

### Back closes the layer on top, and nothing under it

```quint
pure val noLayer: Layer = { id: "", kind: SheetLayer, covers: true }

pure def top(l: Layers): Layer = l.open.nthOr(l.open.length() - 1, noLayer)

pure def canBack(l: Layers): bool = l.open.length() > 0

pure def back(l: Layers): Layers = { ...l, open: l.open.removeAt(l.open.length() - 1) }

pure def stepBackClosesOnlyTheTop(before: Layers, via: str, after: Layers): bool =
  via == "back" implies (after.open.length() == before.open.length() - 1 and after.holds.subseteq(before.holds) and before.holds.subseteq(after.holds))
```

### A press on Ask Alpha closes a sheet on top that leaves Ask Alpha usable

```quint
pure def canPressAssistant(l: Layers): bool = l.open.length() > 0 and not(top(l).covers)

pure def pressAssistant(l: Layers): Layers = back(l)
```

### Home closes every layer, unless the phone is held

```quint
pure def canHome(l: Layers): bool = l.open.length() > 0 and l.holds.size() == 0

pure def home(l: Layers): Layers = { ...l, open: List() }
```

### Something holds the phone until it lets go, and each holder holds it once

```quint
pure def canHold(l: Layers, id: str): bool = id != "" and not(l.holds.contains(id))

pure def hold(l: Layers, id: str): Layers = { ...l, holds: l.holds.union(Set(id)) }

pure def canRelease(l: Layers, id: str): bool = l.holds.contains(id)

pure def release(l: Layers, id: str): Layers = { ...l, holds: l.holds.exclude(Set(id)) }
```

### A screen says when it has a step of its own to take Back, and when it has none left; its page stays usable

```quint
pure def canOfferStep(l: Layers, place: str): bool = place != "" and not(l.steps.contains(place))

pure def offerStep(l: Layers, place: str): Layers = { ...l, steps: l.steps.union(Set(place)) }

pure def canWithdrawStep(l: Layers, place: str): bool = l.steps.contains(place)

pure def withdrawStep(l: Layers, place: str): Layers = { ...l, steps: l.steps.exclude(Set(place)) }
```

### The page under a layer or a hold takes no touch, and a covering layer or a hold takes none for Ask Alpha either

```quint
pure def pageInert(l: Layers): bool = l.open.length() > 0 or l.holds.size() > 0

pure def assistantInert(l: Layers): bool = l.holds.size() > 0 or l.open.some(x => x.covers)

pure def lawWhatCoversAskAlphaCoversThePage(l: Layers): bool = assistantInert(l) implies pageInert(l)
```

### Back goes first to the layer on top; with no layer, a held phone takes Back and Home and closes nothing; then a screen with a step of its own takes Back; otherwise the shell takes them

The area of the layer on top may take its Back first, as a sheet with a
step of its own does.

```quint
type Taker = ByLayer | ByHold | ByStep | ByShell

pure def backTaker(l: Layers): Taker =
  if (l.open.length() > 0) ByLayer else if (l.holds.size() > 0) ByHold else if (l.steps.size() > 0) ByStep else ByShell

pure def takesBack(l: Layers): bool = backTaker(l) != ByShell

pure def homeTaker(l: Layers): Taker = if (l.holds.size() > 0) ByHold else if (l.open.length() > 0) ByLayer else ByShell

pure def lawAHeldPhoneGoesNowhere(l: Layers): bool =
  (l.holds.size() > 0 and l.open.length() == 0) implies (backTaker(l) == ByHold and homeTaker(l) == ByHold and not(canHome(l)))
```

### Only an area, Back, Home and a press on Ask Alpha close a layer

```quint
pure def stepLayersCloseOnlyAsAsked(before: Layers, via: str, after: Layers): bool =
  after.open.length() < before.open.length()
    implies (via == "closeLayer" or via == "back" or via == "home" or via == "pressAssistant")
```

### Two layers can be open, a sheet can leave Ask Alpha usable, the phone can be held with no layer, and a screen can take Back

```quint
pure def sometimesTwoLayersAreOpen(l: Layers): bool = l.open.length() >= 2

pure def sometimesAskAlphaStaysUsable(l: Layers): bool = l.open.length() > 0 and not(assistantInert(l))

pure def sometimesHeldWithoutALayer(l: Layers): bool = l.holds.size() > 0 and l.open.length() == 0

pure def sometimesAScreenTakesBack(l: Layers): bool = backTaker(l) == ByStep
```
