# Gestures

Press custody on Home's tiles and the library's entries: which pointer owns a press or a drag,
what a held press becomes, and which tap a hold or drag swallows. Each finished gesture yields what
the shell does next (start Home's edit mode, open an entry's menu, open an app, remove, move or
drop a tile); Navigation and Favorites own the result. The shell tells this machine what is
showing after every change of Navigation, so a gesture that started on a surface that has since
gone owns nothing. A hold is a press kept still for 450 ms; moving more than 10 px makes it a
scroll or, in edit mode, a drag.

The swipe zones of the phone canvas and the pull on empty Home that asks for Android's shade are
libraries at the end.

## Story: Arrange Home with my fingers

> As the owner, I want a long press to start arranging Home, a drag to move a tile where I drop it,
> the minus or a keyboard activation to remove one, and the tap that ended a press never to open
> the app as well.

### One pointer owns a press or a drag, and only on the surface that is showing

A second pointer neither moves, ends nor cancels the first one's gesture. Outside edit mode a press
on a shown tile starts a hold; in edit mode it starts a drag, except on the minus. A covered Home,
the library opening, an app opening or the entry leaving the list ends the press, and an old hold
timer cannot retarget the entry that replaced it.

```quint
type Surface = OnHome | OnLibrary | Elsewhere
type Press = { pointer: int, key: str }
type Drag = { pointer: int, key: str, moved: bool }
type Act = StartEditing | OpenEntryMenu | Activate | RemoveTile | PlaceTile | MoveEarlier | MoveLater
type Outcome = { act: Act, key: str, over: str }
type Gestures = {
  mounted: bool, surface: Surface, covered: bool, editing: bool, visible: Set[str],
  press: Press, drag: Drag, swallow: str
}
type GestureStep = { state: Gestures, out: List[Outcome] }
pure val NoPress: Press = { pointer: 0, key: "" }
pure val NoDrag: Drag = { pointer: 0, key: "", moved: false }
pure val initial: Gestures = {
  mounted: true, surface: OnHome, covered: false, editing: false, visible: Set(),
  press: NoPress, drag: NoDrag, swallow: ""
}
pure val pointerValues = Set(1, 2)
pure val keyValues = Set("alpha:notes", "alpha:inbox")
pure val overValues = Set("", "alpha:notes", "alpha:inbox")
pure val visibleValues = Set(Set(), Set("alpha:notes", "alpha:inbox"), Set("alpha:inbox"))
pure val directionValues = Set(-1, 1)
pure val HoldMs = 450
pure val PressSlop = 10
pure def active(g: Gestures): bool = g.mounted and not(g.covered) and g.surface != Elsewhere
pure def withOutcomes(out: List[Outcome], g: Gestures): GestureStep = { state: g, out: out }
pure def acted(act: Act, key: str, over: str, g: Gestures): GestureStep =
  { state: g, out: List({ act: act, key: key, over: over }) }
pure def showing(g: Gestures, surface: Surface, editing: bool, covered: bool, visible: Set[str]): GestureStep = {
  val shown = { ...g, surface: surface, editing: editing, covered: covered, visible: visible }
  val keepPress = active(shown) and surface == g.surface and not(editing) and visible.contains(g.press.key)
  val keepDrag = active(shown) and surface == OnHome and editing and visible.contains(g.drag.key)
  withOutcomes(List(), { ...shown, press: if (keepPress) g.press else NoPress, drag: if (keepDrag) g.drag else NoDrag,
    swallow: if (visible.contains(g.swallow) and surface == g.surface) g.swallow else "" })
}
pure def canDown(g: Gestures, pointer: int, key: str, onRemove: bool): bool = g.mounted and pointer > 0
pure def down(g: Gestures, pointer: int, key: str, onRemove: bool): GestureStep = {
  val busy = (g.press.pointer != 0 and g.press.pointer != pointer) or (g.drag.pointer != 0 and g.drag.pointer != pointer)
  val base = { ...g, press: NoPress, swallow: "" }
  if (busy) withOutcomes(List(), g)
  else if (not(active(g)) or not(g.visible.contains(key))) withOutcomes(List(), base)
  else if (not(g.editing) or g.surface == OnLibrary) withOutcomes(List(), { ...base, press: { pointer: pointer, key: key } })
  else if (onRemove) withOutcomes(List(), base)
  else withOutcomes(List(), { ...base, drag: { pointer: pointer, key: key, moved: false } })
}
pure def canMovePointer(g: Gestures, pointer: int, far: bool): bool = g.mounted and pointer > 0
pure def movePointer(g: Gestures, pointer: int, far: bool): GestureStep = {
  val base = if (g.press.pointer == pointer and far) { ...g, press: NoPress } else g
  if (g.drag.pointer != pointer) withOutcomes(List(), base)
  else if (not(active(g)) or not(g.visible.contains(g.drag.key))) withOutcomes(List(), { ...base, drag: NoDrag })
  else if (far and not(g.drag.moved)) withOutcomes(List(), { ...base, drag: { ...g.drag, moved: true } })
  else withOutcomes(List(), base)
}
pure def canUp(g: Gestures, pointer: int, over: str): bool = g.mounted and pointer > 0
pure def up(g: Gestures, pointer: int, over: str): GestureStep = {
  val base = if (g.press.pointer == pointer) { ...g, press: NoPress } else g
  if (g.drag.pointer != pointer) withOutcomes(List(), base)
  else if (not(active(g)) or not(g.drag.moved) or not(g.visible.contains(g.drag.key))) withOutcomes(List(), { ...base, drag: NoDrag })
  else if (over == "" or over == g.drag.key or not(g.visible.contains(over))) withOutcomes(List(), { ...base, drag: NoDrag, swallow: g.drag.key })
  else acted(PlaceTile, g.drag.key, over, { ...base, drag: NoDrag, swallow: g.drag.key })
}
pure def canCancel(g: Gestures, pointer: int): bool = g.mounted and pointer > 0
pure def cancel(g: Gestures, pointer: int): GestureStep =
  withOutcomes(List(), { ...g, press: if (g.press.pointer == pointer) NoPress else g.press, drag: if (g.drag.pointer == pointer) NoDrag else g.drag })
pure def alwaysOneGestureAtATime(g: Gestures): bool = g.press.pointer == 0 or g.drag.pointer == 0
pure def alwaysRetiredOwnsNothing(g: Gestures): bool = g.mounted or (g.press == NoPress and g.drag == NoDrag and g.swallow == "")
pure def alwaysDragOnlyInEditMode(g: Gestures): bool = g.drag.pointer != 0 implies (g.editing and g.surface == OnHome)
pure def alwaysPressOnAShownEntry(g: Gestures): bool =
  (g.press.pointer != 0 implies g.visible.contains(g.press.key)) and (g.drag.pointer != 0 implies g.visible.contains(g.drag.key))
```

### A hold or a long press opens edit mode on Home and an entry's menu in the library

A hold fires for the press it was started for, on the entry still under it; the tap that ends it
is swallowed. Android's long-press menu gesture (a context menu event) does the same at once.

```quint
pure def canHold(g: Gestures, pointer: int, key: str): bool = g.press.pointer == pointer and g.press.key == key and pointer > 0
pure def hold(g: Gestures, pointer: int, key: str): GestureStep =
  if (not(active(g)) or not(g.visible.contains(key))) withOutcomes(List(), { ...g, press: NoPress })
  else if (g.surface == OnLibrary) acted(OpenEntryMenu, key, "", { ...g, press: NoPress, swallow: key })
  else acted(StartEditing, key, "", { ...g, press: NoPress, swallow: key })
pure def canContext(g: Gestures, key: str): bool = active(g) and g.visible.contains(key)
pure def context(g: Gestures, key: str): GestureStep =
  if (g.surface == OnLibrary) acted(OpenEntryMenu, key, "", { ...g, press: NoPress, swallow: key })
  else if (g.editing) withOutcomes(List(), { ...g, press: NoPress })
  else acted(StartEditing, key, "", { ...g, press: NoPress, swallow: key })
pure def alwaysSwallowIsShown(g: Gestures): bool = g.swallow == "" or g.visible.contains(g.swallow)
pure def sometimesEditingStartedByHold(g: Gestures): bool = g.editing and g.swallow != ""
```

### A tap opens its entry unless a hold or drag ended on it; in edit mode it removes

In edit mode a tap on the minus, or any keyboard or assistive activation of a tile, removes it from
Home; a plain pointer tap on the tile does nothing. The arrow keys move a tile one place and Delete
removes it.

```quint
pure def canTap(g: Gestures, key: str, onRemove: bool, keyboard: bool): bool = active(g) and g.visible.contains(key)
pure def tap(g: Gestures, key: str, onRemove: bool, keyboard: bool): GestureStep = {
  val held = g.swallow == key
  val after = { ...g, swallow: "" }
  if (held) withOutcomes(List(), after)
  else if (g.editing and g.surface == OnHome) (if (onRemove or keyboard) acted(RemoveTile, key, "", after) else withOutcomes(List(), after))
  else acted(Activate, key, "", after)
}
pure def canArrow(g: Gestures, key: str, direction: int): bool =
  active(g) and g.editing and g.surface == OnHome and g.visible.contains(key) and (direction == 1 or direction == -1)
pure def arrow(g: Gestures, key: str, direction: int): GestureStep =
  acted(if (direction < 0) MoveEarlier else MoveLater, key, "", g)
pure def canErase(g: Gestures, key: str): bool = active(g) and g.editing and g.surface == OnHome and g.visible.contains(key)
pure def erase(g: Gestures, key: str): GestureStep = acted(RemoveTile, key, "", g)
pure def stepNoOpenAfterAHold(before: Gestures, via: str, after: Gestures, out: List[Outcome]): bool =
  out.some(o => o.act == Activate) implies (via == "tap" and before.swallow != out.nthOr(0, { act: Activate, key: "", over: "" }).key)
pure def stepEditOutcomesOnlyInEditMode(before: Gestures, via: str, after: Gestures, out: List[Outcome]): bool =
  out.some(o => o.act == RemoveTile or o.act == PlaceTile or o.act == MoveEarlier or o.act == MoveLater) implies
    (before.editing and before.surface == OnHome)
pure def sometimesDropped(g: Gestures): bool = g.swallow != "" and g.editing and g.drag == NoDrag
```

### Unmounting retires every gesture, and a remounted Home swallows nothing of the old one

```quint
pure def canUnmount(g: Gestures): bool = g.mounted
pure def unmount(g: Gestures): GestureStep = withOutcomes(List(), { ...g, mounted: false, press: NoPress, drag: NoDrag, swallow: "" })
pure def canMount(g: Gestures): bool = not(g.mounted)
pure def mount(g: Gestures): GestureStep = withOutcomes(List(), { ...g, mounted: true, editing: false, covered: false })
```

## Story: Swipe the way the phone expects

> As the owner, I want an edge swipe to go back, an upward swipe from the bottom bar to go Home on
> the launcher, and a downward pull on empty Home to show Android's notifications.

### A finished swipe does one thing, decided by where it started and which way it went

Travel under 46 canvas pixels does nothing. A mostly horizontal swipe from either 30-pixel side
edge is Back. On the launcher a downward pull that the shade policy accepts opens Android's shade
and an upward swipe that starts below the bottom bar's top is HOME. A downward swipe lowers a half
sheet; an upward one on Home raises the assistant. Android owns the very top edge and, in gesture
navigation, the side edges; the shell answers only what reaches the page.

```quint
type Swipe = NoSwipe | SwipeBack | SwipeShade | SwipeHome | LowerAssistant | RaiseAssistant
pure def magnitude(n: int): int = if (n < 0) -n else n
pure def swipe(launcher: bool, atHome: bool, sheet: bool, conversation: bool, pullAccepted: bool,
  x: int, y: int, dx: int, dy: int): Swipe = {
  val ax = magnitude(dx)
  val ay = magnitude(dy)
  val edgeBack = (x < 30 and dx > 46) or (x > 412 - 30 and dx < -46)
  if (ax < 46 and ay < 46) NoSwipe
  else if (ay <= ax) (if (edgeBack) SwipeBack else NoSwipe)
  else if (dy > 46 and launcher and pullAccepted) SwipeShade
  else if (launcher and dy < -46 and y > 872) SwipeHome
  else if (sheet and dy > 46) LowerAssistant
  else if (atHome and not(sheet) and not(conversation) and dy < -46) RaiseAssistant
  else NoSwipe
}
pure val xValues = Set(10, 200, 400)
pure val yValues = Set(20, 400, 900)
pure val dxValues = Set(-60, 0, 60)
pure val dyValues = Set(-60, 0, 60)
pure def lawShortTravelDoesNothing(launcher: bool, atHome: bool, sheet: bool, x: int, y: int): bool =
  swipe(launcher, atHome, sheet, false, true, x, y, 10, -10) == NoSwipe
pure def lawShadeAndHomeOnlyOnTheLauncher(atHome: bool, sheet: bool, conversation: bool, x: int, y: int, dx: int, dy: int): bool = {
  val result = swipe(false, atHome, sheet, conversation, true, x, y, dx, dy)
  result != SwipeShade and result != SwipeHome
}
```

### A pull asks for Android's shade only on empty launcher Home

Not on the assistant surface, a locked Home, with the stand-in shade, an app, the library, voice
or a conversation over Home; only a clearly downward pull (one and a half times its sideways
travel) that started below the 44-pixel status band, on Home itself rather than a field, with no
keyboard up and nothing under the finger scrolled from its top. A Home taller than the screen lets
the page claim such a pull at its top once it has moved six pixels downward.

```quint
pure def emptyHome(launcher: bool, assistant: bool, secure: bool, standIn: bool, atHome: bool,
  library: bool, voice: bool, conversation: bool): bool =
  launcher and not(assistant) and not(secure) and not(standIn) and atHome and not(library) and not(voice) and not(conversation)
pure def pullOpensShade(eligible: bool, startY: int, dx: int, dy: int, onHome: bool, editable: bool,
  keyboard: bool, scrolled: bool): bool =
  eligible and dy > 46 and dy * 2 > magnitude(dx) * 3 and startY >= 44 and onHome and not(editable) and not(keyboard) and not(scrolled)
type PullClaim = ClaimPull | ReleasePull | WaitPull
pure def overflowPull(eligible: bool, dx: int, dy: int): PullClaim =
  if (not(eligible)) ReleasePull
  else if (magnitude(dx) < 6 and magnitude(dy) < 6) WaitPull
  else if (dy > 0 and dy > magnitude(dx)) ClaimPull else ReleasePull
pure val startYValues = Set(20, 60)
pure def lawStatusBandIsAndroids(dx: int, dy: int): bool = not(pullOpensShade(true, 20, dx, dy, true, false, false, false))
pure def lawNoPullOverAnApp(launcher: bool, secure: bool): bool =
  not(emptyHome(launcher, false, secure, false, false, false, false, false))
```

### A sheet follows a drag down its grip and closes past the dismiss distance

Only the top layer's bottom sheet is dragged, from its grip area (its top 80 pixels, away from its
controls). A mostly sideways move abandons the drag; a release 72 pixels or more down closes the
sheet, a shorter one springs back.

```quint
type SheetRelease = SheetCloses | SheetStays
pure def sheetRelease(top: bool, fromGrip: bool, sideways: bool, pulled: int): SheetRelease =
  if (top and fromGrip and not(sideways) and pulled >= 72) SheetCloses else SheetStays
pure val pulledValues = Set(0, 40, 72, 120)
pure def lawOnlyTheTopSheetCloses(fromGrip: bool, sideways: bool, pulled: int): bool =
  sheetRelease(false, fromGrip, sideways, pulled) == SheetStays
```
