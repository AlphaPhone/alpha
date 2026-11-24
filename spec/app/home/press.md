# Press

Which finger owns a press or a drag on Home's tiles and the drawer's apps,
what a held press becomes, and which tap a hold or a drag swallows. Each
finished gesture says what Home does next: start editing, open an app's
menu, open the app, or remove or move a tile; [Home](./index.md) decides
whether the rules allow it. The launcher tells this machine what shows
after every change, so a gesture that started on a surface that has gone
owns nothing. A hold is a press kept still for 450 milliseconds; moving
more than 10 points makes it a scroll or, while Home is being edited, a
drag.

## Story: Arrange Home with my fingers

> As the owner, I want a long press to start arranging Home, a drag to move
> a tile where I drop it, the minus or a keyboard to remove one, and the tap
> that ended a press never to open the app as well.

### One finger owns a press or a drag, and only on the surface that shows

A tile is named by its key. A second finger neither moves, ends nor cancels
the first one's gesture. Outside editing a press on a shown tile starts a
hold; while editing it starts a drag, except on the minus. A covered Home,
the drawer opening, an app opening or the tile leaving the list ends the
press.

```quint
type Surface = OnHome | InDrawer | Elsewhere
type Hold = { finger: int, key: str, at: int }
type Drag = { finger: int, key: str, moved: bool }
type Act = StartEditing | OpenMenu | Activate | Remove | Place | MoveEarlier | MoveLater
type Outcome = { act: Act, key: str, onto: str }
type Press = {
  surface: Surface, covered: bool, editing: bool, shown: Set[str],
  hold: Hold, drag: Drag, swallow: str,
}
type Pressed = { state: Press, out: List[Outcome] }

pure val noHold: Hold = { finger: 0, key: "", at: 0 }
pure val noDrag: Drag = { finger: 0, key: "", moved: false }

pure val initial: Press = {
  surface: OnHome, covered: false, editing: false, shown: Set(),
  hold: noHold, drag: noDrag, swallow: "",
}

pure val holdFor = 450
```

### What the simulator tries

```quint
pure val fingerValues = Set(1, 2)
pure val keyValues = Set("view:Notes", "view:Inbox")
pure val ontoValues = Set("", "view:Notes", "view:Inbox")
pure val shownValues = Set(Set(), Set("view:Notes", "view:Inbox"), Set("view:Inbox"))
pure val directionValues = Set(-1, 1)
pure val nowValues = Set(0, 100, 450, 900)
```

### When what shows changes, a press or a drag on what has gone ends

```quint
pure def active(p: Press): bool = not(p.covered) and p.surface != Elsewhere

pure def nothing(p: Press): Pressed = { state: p, out: List() }

pure def acted(act: Act, key: str, onto: str, p: Press): Pressed = { state: p, out: List({ act: act, key: key, onto: onto }) }

pure def canShowing(p: Press, surface: Surface, editing: bool, covered: bool, shown: Set[str]): bool =
  surface != p.surface or editing != p.editing or covered != p.covered or not(shown.subseteq(p.shown) and p.shown.subseteq(shown))

pure def showing(p: Press, surface: Surface, editing: bool, covered: bool, shown: Set[str]): Pressed =
  val now = { ...p, surface: surface, editing: editing, covered: covered, shown: shown }
  val keepHold = active(now) and surface == p.surface and not(editing and surface == OnHome) and shown.contains(p.hold.key)
  val keepDrag = active(now) and surface == OnHome and editing and shown.contains(p.drag.key)
  nothing({ ...now, hold: if (keepHold) p.hold else noHold, drag: if (keepDrag) p.drag else noDrag,
    swallow: if (shown.contains(p.swallow) and surface == p.surface) p.swallow else "" })
```

### A finger down on a shown tile starts a hold, or while editing a drag; a busy finger elsewhere changes nothing

```quint
pure def busy(p: Press, finger: int): bool =
  (p.hold.finger != 0 and p.hold.finger != finger) or (p.drag.finger != 0 and p.drag.finger != finger)

pure def canDown(p: Press, finger: int, key: str, onMinus: bool, now: int): bool = finger > 0

pure def down(p: Press, finger: int, key: str, onMinus: bool, now: int): Pressed =
  val fresh = { ...p, hold: noHold, swallow: "" }
  if (busy(p, finger)) nothing(p)
  else if (not(active(p)) or not(p.shown.contains(key))) nothing(fresh)
  else if (not(p.editing) or p.surface == InDrawer) nothing({ ...fresh, hold: { finger: finger, key: key, at: now + holdFor } })
  else if (onMinus) nothing(fresh)
  else nothing({ ...fresh, drag: { finger: finger, key: key, moved: false } })
```

### Moving far ends a hold, and makes a drag a move

```quint
pure def canMoveFinger(p: Press, finger: int, far: bool): bool = finger > 0 and (p.hold.finger == finger or p.drag.finger == finger)

pure def moveFinger(p: Press, finger: int, far: bool): Pressed =
  val after = if (p.hold.finger == finger and far) { ...p, hold: noHold } else p
  if (p.drag.finger != finger) nothing(after)
  else if (not(active(p)) or not(p.shown.contains(p.drag.key))) nothing({ ...after, drag: noDrag })
  else if (far and not(p.drag.moved)) nothing({ ...after, drag: { ...p.drag, moved: true } })
  else nothing(after)
```

### A drag that moved and is dropped on another shown tile places it there; the tap its release makes is swallowed

```quint
pure def canUp(p: Press, finger: int, onto: str): bool = finger > 0 and (p.hold.finger == finger or p.drag.finger == finger)

pure def up(p: Press, finger: int, onto: str): Pressed =
  val after = if (p.hold.finger == finger) { ...p, hold: noHold } else p
  if (p.drag.finger != finger) nothing(after)
  else if (not(active(p)) or not(p.drag.moved) or not(p.shown.contains(p.drag.key))) nothing({ ...after, drag: noDrag })
  else if (onto == "" or onto == p.drag.key or not(p.shown.contains(onto))) nothing({ ...after, drag: noDrag, swallow: p.drag.key })
  else acted(Place, p.drag.key, onto, { ...after, drag: noDrag, swallow: p.drag.key })

pure def canCancel(p: Press, finger: int): bool = finger > 0 and (p.hold.finger == finger or p.drag.finger == finger)

pure def cancel(p: Press, finger: int): Pressed =
  nothing({ ...p, hold: if (p.hold.finger == finger) noHold else p.hold, drag: if (p.drag.finger == finger) noDrag else p.drag })
```

### One gesture at a time, a drag only while Home is edited, and only on a tile that shows

```quint
pure def alwaysOneGestureAtATime(p: Press): bool = p.hold.finger == 0 or p.drag.finger == 0

pure def alwaysADragOnlyWhileEditing(p: Press): bool = p.drag.finger != 0 implies (p.editing and p.surface == OnHome)

pure def alwaysAPressIsOnAShownTile(p: Press): bool =
  (p.hold.finger != 0 implies p.shown.contains(p.hold.key)) and (p.drag.finger != 0 implies p.shown.contains(p.drag.key))
```

### A hold, or Android's long-press menu, starts editing on Home and opens an app's menu in the drawer, and the tap that ends it is swallowed

The hold fires for the press it was started for, on the tile still under
it, once its time has come.

```quint
pure def canHoldDue(p: Press, now: int): bool = p.hold.finger != 0 and now >= p.hold.at

pure def holdDue(p: Press, now: int): Pressed =
  val key = p.hold.key
  if (not(active(p)) or not(p.shown.contains(key))) nothing({ ...p, hold: noHold })
  else if (p.surface == InDrawer) acted(OpenMenu, key, "", { ...p, hold: noHold, swallow: key })
  else acted(StartEditing, key, "", { ...p, hold: noHold, swallow: key })

pure def canLongPress(p: Press, key: str): bool = active(p) and p.shown.contains(key)

pure def longPress(p: Press, key: str): Pressed =
  if (p.surface == InDrawer) acted(OpenMenu, key, "", { ...p, hold: noHold, swallow: key })
  else if (p.editing) nothing({ ...p, hold: noHold })
  else acted(StartEditing, key, "", { ...p, hold: noHold, swallow: key })

pure def alwaysTheSwallowedTapShows(p: Press): bool = p.swallow == "" or p.shown.contains(p.swallow)

pure def sometimesAHoldStartsEditing(p: Press): bool = p.editing and p.swallow != ""
```

### A tap opens its app, unless a hold or a drag ended on it; while editing, a tap on the minus or a keyboard's press removes the tile, and the arrows move it one place

A plain tap on a tile while editing does nothing. Delete removes it.

```quint
pure def canTap(p: Press, key: str, onMinus: bool, keyboard: bool): bool = active(p) and p.shown.contains(key)

pure def tap(p: Press, key: str, onMinus: bool, keyboard: bool): Pressed =
  val after = { ...p, swallow: "" }
  if (p.swallow == key) nothing(after)
  else if (p.editing and p.surface == OnHome) (if (onMinus or keyboard) acted(Remove, key, "", after) else nothing(after))
  else acted(Activate, key, "", after)

pure def canArrow(p: Press, key: str, direction: int): bool =
  active(p) and p.editing and p.surface == OnHome and p.shown.contains(key) and (direction == 1 or direction == -1)

pure def arrow(p: Press, key: str, direction: int): Pressed = acted(if (direction < 0) MoveEarlier else MoveLater, key, "", p)

pure def canErase(p: Press, key: str): bool = active(p) and p.editing and p.surface == OnHome and p.shown.contains(key)

pure def erase(p: Press, key: str): Pressed = acted(Remove, key, "", p)
```

### A tap after a hold never opens the app it was held on

```quint
pure def stepNoOpeningAfterAHold(before: Press, via: str, after: Press, out: List[Outcome]): bool =
  out.every(o => o.act == Activate implies (via == "tap" and before.swallow != o.key))
```

### Removing and moving come only while Home is edited

```quint
pure def stepEditingOutcomesOnlyWhileEditing(before: Press, via: str, after: Press, out: List[Outcome]): bool =
  out.every(o => (o.act == Remove or o.act == Place or o.act == MoveEarlier or o.act == MoveLater)
    implies (before.editing and before.surface == OnHome))

pure def sometimesATileIsDropped(p: Press): bool = p.swallow != "" and p.editing and p.drag == noDrag
```
