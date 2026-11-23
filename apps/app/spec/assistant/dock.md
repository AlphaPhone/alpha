# Dock

The compact assistant: a composer bar or a pill resting at the bottom of
every screen, and the sheet it opens into. The chat is in one of the four
detents of [Detents](./detents.md): `Hidden` (the pill), `Input` (the bar),
`Sheet` and `Full`, with their rests and Home's bar defined there. One
pointer gesture at a time is captured, a drag or a tap; it settles in one
detent, and the click the platform may deliver after it is swallowed for a
window of two ticks (a tick is 200 ms). Home always keeps its bar. The shell
supplies the surface under the dock (`HomeView`, a view resting on the bar,
or one resting on the pill), measures heights in canvas pixels and turns
pointer travel into a direction, a zone and whether it was a flick.

## Story: Open and size the chat with one gesture

> As the owner, I want a tap or a drag on the dock to do exactly one thing,
> and a drag that ends over a button never to press it too, so that the
> chat goes where I put it and never starts voice by accident.

### A gesture is captured only from a detent, surface and voice state the shell still shows

```quint
import detents.* from "./detents"
type Surface = HomeView | BarView | PillView
type Control = NoControl | FocusControl | OpenControl | TypeControl | TalkControl | ResizeControl | ToolbarControl
type Direction = Up | Down
type Zone = Floor | Middle | Top
type Drag = { active: bool, mode: Detent, under: Surface, moved: bool, pressed: Control }
type Dock = {
  view: Surface, chat: Detent, voice: bool, drag: Drag, remembered: bool, swallowAge: int, dragAge: int,
  ghost: bool, ghostLabel: Control, effects: int, clickThrough: bool, ignored: int, barKept: bool,
}
pure val swallowWindow = 2
pure val noDrag: Drag = { active: false, mode: Input, under: HomeView, moved: false, pressed: NoControl }
pure val initial: Dock = {
  view: HomeView, chat: Input, voice: false, drag: noDrag, remembered: false, swallowAge: swallowWindow, dragAge: swallowWindow,
  ghost: false, ghostLabel: NoControl, effects: 0, clickThrough: false, ignored: 0, barKept: false,
}
pure def restOf(view: Surface): Detent = restFor(view == PillView)
pure def handle(label: Control): bool = label != ToolbarControl
pure def canDown(d: Dock, label: Control): bool =
  not(d.drag.active) and not(d.voice) and handle(label)
  and ((label == FocusControl or label == TypeControl) implies (d.chat == Input or d.chat == Hidden))
  and ((label == OpenControl or label == TalkControl) implies (d.chat == Hidden or d.chat == Input))
  and (label == ResizeControl implies d.chat == Sheet)
pure def down(d: Dock, label: Control): Dock =
  { ...d, drag: { active: true, mode: d.chat, under: d.view, moved: false, pressed: label },
    swallowAge: swallowWindow, ghost: false, ghostLabel: NoControl, effects: 0, barKept: false }
pure def canMove(d: Dock): bool = d.drag.active
pure def move(d: Dock): Dock = { ...d, drag: { ...d.drag, moved: true } }
pure def alwaysADragMatchesTheShell(d: Dock): bool =
  d.drag.active implies (d.drag.mode == d.chat and d.drag.under == d.view and not(d.voice))
pure def alwaysTheDetentIsKnown(d: Dock): bool = d.chat == Hidden or d.chat == Input or d.chat == Sheet or d.chat == Full
```

### A tap runs its control once, and a settled drag lands in one detent

A tap is a release with no movement. A moved drag from an open chat flicks
to `Full` upward or collapses downward, collapses near the floor, goes
`Full` near the top and otherwise stays where it was released, remembering
that height. From a collapsed detent a pull down collapses, a pull up near
the top goes `Full`, and otherwise the sheet opens.

```quint
type Released = { lands: Detent, keeps: bool }
pure def release(mode: Detent, direction: Direction, zone: Zone, flick: bool, home: bool): Released = {
  val collapse = restFor(not(home))
  if (isOpen(mode))
    if (flick) { lands: if (direction == Up) Full else collapse, keeps: false }
    else if (zone == Floor) { lands: collapse, keeps: false }
    else if (zone == Top) { lands: Full, keeps: false }
    else { lands: Sheet, keeps: true }
  else if (direction == Down) { lands: collapse, keeps: false }
  else if (zone == Top) { lands: Full, keeps: false }
  else { lands: Sheet, keeps: not(flick) and zone != Floor }
}
pure def forgetClosed(d: Dock): Dock = if (isOpen(d.chat)) d else { ...d, remembered: false }
pure def activate(label: Control, d: Dock): Dock = forgetClosed(
  if (label == OpenControl or label == FocusControl) { ...d, chat: Sheet }
  else if (label == TypeControl) { ...d, chat: Input }
  else if (label == TalkControl) { ...d, voice: true }
  else if (label == ResizeControl or label == ToolbarControl) { ...d, chat: if (d.chat == Full) Sheet else Full }
  else d)
pure def changed(before: Dock, after: Dock): int = if (before.chat != after.chat or before.voice != after.voice) 1 else 0
pure def canTap(d: Dock): bool = d.drag.active and not(d.drag.moved)
pure def tap(d: Dock): Dock = {
  val acted = activate(d.drag.pressed, { ...d, drag: noDrag })
  if (d.drag.pressed == NoControl) { ...acted, ghost: false }
  else { ...acted, swallowAge: 0, ghost: true, ghostLabel: d.drag.pressed, effects: d.effects + changed(d, acted) }
}
pure def canSettleDrag(d: Dock): bool = d.drag.active and d.drag.moved
pure def settleDrag(d: Dock, direction: Direction, zone: Zone, flick: bool, over: Control): Dock = {
  val collapsed = d.drag.mode == Input or d.drag.mode == Hidden
  val target = release(d.drag.mode, direction, zone, flick, d.view == HomeView)
  val chat = if (target.lands == Hidden and not(collapsed)) restOf(d.view) else target.lands
  val after = { ...d, drag: noDrag, chat: chat, remembered: (d.remembered or target.keeps) and isOpen(chat),
    barKept: d.view == HomeView and d.drag.mode == Input and direction == Down }
  { ...after, swallowAge: 0, dragAge: 0, ghost: over != NoControl, ghostLabel: over, effects: d.effects + changed(d, after) }
}
pure def canCancelDrag(d: Dock): bool = d.drag.active
pure def cancelDrag(d: Dock): Dock = if (d.drag.moved) { ...d, drag: noDrag, swallowAge: 0, dragAge: 0 } else { ...d, drag: noDrag }
pure def alwaysOneEffectPerGesture(d: Dock): bool = d.effects <= 1
pure def sometimesSheetOpenedByDrag(d: Dock): bool = d.chat == Sheet and d.remembered
pure def sometimesFullByTap(d: Dock): bool = d.chat == Full and d.effects == 1
```

### A click the platform still owes a gesture is swallowed inside its window

Only the toolbar size button, pressed again after the window of the last
real drag, acts on a late click; every other late click is ignored. A fresh
press lifts the suppression.

```quint
pure def swallowed(d: Dock): bool = d.swallowAge < swallowWindow
pure def canLateClick(d: Dock): bool = d.ghost and not(d.drag.active) and swallowed(d)
pure def lateClick(d: Dock): Dock = {
  val passes = d.ghostLabel == ToolbarControl and d.dragAge >= swallowWindow
  val acted = activate(d.ghostLabel, d)
  if (passes) { ...acted, ghost: false, effects: d.effects + changed(d, acted), clickThrough: changed(d, acted) > 0 }
  else { ...d, ghost: false, ignored: if (d.ignored < 3) d.ignored + 1 else 3 }
}
pure def tick(d: Dock): Dock = { ...d,
  swallowAge: if (d.swallowAge < swallowWindow) d.swallowAge + 1 else swallowWindow,
  dragAge: if (d.dragAge < swallowWindow) d.dragAge + 1 else swallowWindow,
  ghost: d.ghost and d.swallowAge + 1 < swallowWindow }
pure def alwaysNoClickThrough(d: Dock): bool = not(d.clickThrough)
pure def alwaysAGhostIsInsideItsWindow(d: Dock): bool = d.ghost implies (swallowed(d) or d.drag.active)
pure def sometimesALateClickWasSwallowed(d: Dock): bool = d.ignored > 0
```

### Home keeps its bar, and a dragged height lasts only while the chat it was dragged in is open

Off Home the bar dismisses to the pill and the pill's Type control brings it
back; the shell lowers a raised bar the same way when Back closes it. Closing
the chat, navigating or collapsing forgets the dragged height, so the chat
reopens at its fitted height. In portrait a touch anywhere above the open
half sheet closes it and reaches nothing underneath; the next touch is
ordinary (#796).

```quint
pure def canSizeButton(d: Dock): bool = not(d.drag.active) and not(d.ghost) and isOpen(d.chat)
pure def sizeButton(d: Dock): Dock = { ...activate(ToolbarControl, d), effects: 1 }
pure def canCloseChat(d: Dock): bool = not(d.ghost) and isOpen(d.chat)
pure def closeChat(d: Dock): Dock =
  { ...d, drag: noDrag, chat: restOf(d.view), effects: 1, remembered: false,
    swallowAge: if (d.drag.moved) 0 else d.swallowAge, dragAge: if (d.drag.moved) 0 else d.dragAge }
pure def canNavigate(d: Dock, view: Surface): bool = view != d.view
pure def navigate(d: Dock, view: Surface): Dock =
  { ...d, view: view, chat: if (isOpen(d.chat)) d.chat else restOf(view), barKept: false,
    remembered: d.remembered and isOpen(d.chat),
    drag: noDrag, swallowAge: if (d.drag.moved) 0 else d.swallowAge, dragAge: if (d.drag.moved) 0 else d.dragAge }
pure def canOpenSheet(d: Dock): bool = not(d.drag.active) and not(swallowed(d)) and not(isOpen(d.chat))
pure def openSheet(d: Dock): Dock = { ...d, chat: Sheet, remembered: false, barKept: false }
pure def canLowerBar(d: Dock): bool = not(d.drag.active) and d.chat == Input and d.view != HomeView
pure def lowerBar(d: Dock): Dock = { ...d, chat: Hidden, barKept: false }
pure def canTouchOutside(d: Dock): bool = not(d.drag.active) and not(d.ghost) and d.chat == Sheet
pure def touchOutside(d: Dock): Dock = closeChat(d)
pure def stepATouchAboveTheSheetOnlyClosesIt(before: Dock, via: str, after: Dock): bool =
  via == "touchOutside" implies (after.voice == before.voice and after.view == before.view and not(isOpen(after.chat)))
pure def canVoiceEnds(d: Dock): bool = d.voice
pure def voiceEnds(d: Dock): Dock = { ...d, voice: false }
pure def alwaysHomeKeepsItsBar(d: Dock): bool = keepsItsBar(d.view == HomeView, d.chat)
pure def alwaysAKeptBarIsHomesBar(d: Dock): bool = d.barKept implies (d.view == HomeView and d.chat == Input)
pure def alwaysARememberedHeightIsOpen(d: Dock): bool = d.remembered implies isOpen(d.chat)
pure def sometimesHomeBarPulledDownStays(d: Dock): bool = d.barKept and d.swallowAge == 0
pure def sometimesBarViewOnThePill(d: Dock): bool = d.view == BarView and d.chat == Hidden
pure def sometimesFlickDismissedToPill(d: Dock): bool = d.view == PillView and d.chat == Hidden and d.swallowAge == 0 and d.effects == 1
```

Opening the view an action card names keeps the chat where it is: a chat
that was open stays open, Camera included (#1386). Only `closeChat` and a
collapse lower it.

## Story: Size the sheet to what it shows

> As the owner, I want the sheet to open at a height that fits its content,
> follow my finger when I drag it, and never cover the screen above its top
> margin, so that I can keep the app I asked about in view.

### The open sheet's height stays between its floor and full, and a flick is at least 1 px per ms

The default half height is 60% of the viewport, at least 200 px and at most
the space above the keyboard. A dragged height is clamped between the
smaller of 200 px and half, and full. The snap zone is 120 px or a third of
the travel, whichever is smaller. A free release from the bar needs 24 px of
travel, from the pill 56 px; less than 8 px is a tap. Speed is measured over
the last 100 ms, and a finger held still 80 ms before lifting is no flick.

```quint
pure val sheetMinimum = 200
pure val snapZoneMaximum = 120
pure val tapSlop = 8
pure val barPull = 24
pure val pillPull = 56
pure val flickWindowMs = 100
pure val flickHoldMs = 80
pure def smaller(a: int, b: int): int = if (a < b) a else b
pure def larger(a: int, b: int): int = if (a > b) a else b
pure def halfHeight(viewport: int, room: int): int = smaller(room, larger(sheetMinimum, viewport * 6 / 10))
pure def clampSheet(height: int, half: int, full: int): int = larger(smaller(sheetMinimum, half), smaller(height, full))
pure def snapZone(floor: int, full: int): int = smaller(snapZoneMaximum, (full - floor) / 3)
pure def zoneOf(height: int, floor: int, full: int): Zone =
  if (height <= floor + snapZone(floor, full)) Floor else if (height >= full - snapZone(floor, full)) Top else Middle
pure def isFlick(travel: int, elapsedMs: int, heldMs: int): bool =
  elapsedMs > 0 and elapsedMs <= flickWindowMs and heldMs <= flickHoldMs and (travel >= elapsedMs or travel <= 0 - elapsedMs)
pure def isTap(travel: int): bool = travel < tapSlop and travel > 0 - tapSlop
pure def pullNeeded(start: Detent): int = if (start == Hidden) pillPull else barPull
pure def lawAClampedSheetNeverPassesFull(height: int, half: int, full: int): bool =
  (half >= 0 and full >= half) implies clampSheet(height, half, full) <= full
pure def lawAClampedSheetKeepsItsFloor(height: int, half: int, full: int): bool =
  (half >= 0 and full >= sheetMinimum) implies clampSheet(height, half, full) >= smaller(sheetMinimum, half)
pure def lawHalfIsNeverBelowItsMinimumWhenThereIsRoom(viewport: int, room: int): bool =
  room >= sheetMinimum implies halfHeight(viewport, room) >= sheetMinimum
pure def lawATapIsNeverAFlick(travel: int, elapsedMs: int): bool = (isTap(travel) and elapsedMs >= tapSlop) implies not(isFlick(travel, elapsedMs, 0))
```
