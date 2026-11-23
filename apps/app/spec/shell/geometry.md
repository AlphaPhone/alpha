# Geometry

The phone canvas is laid out from measured window geometry, never from the screen's orientation
(issue #411). Android's `adjustResize` window shortens while the soft keyboard is up and keeps a
focused field and its keyboard through a rotation, so "wider than tall" read straight from the
window would flip a portrait phone into the wide arrangement as soon as the owner types. One
estimator keeps the window's keyboard-free height; the arrangement, the dock's covered reading and
the composer's release all rest on it. The shell measures the window when it mounts, before any
field can hold focus, so a keyboard is never up over an estimator that has no height.

Text size is measured, not declared: Android applies large text as WebView text zoom, which grows
glyphs and line boxes and leaves declared lengths alone, so the shell measures a hidden 100 px
probe and publishes its ratio. The dock (bar, pill or composer) floats over the page; its measured
footprint is the scroll clearance of Home, the library and every app scroller, and the header
clearance keeps top notices off an app's header.

```quint
type Field = NoField | ComposerField | OtherField
type Base = { w: int, h: int }
type Geometry = {
  mounted: bool, launcher: bool, base: Base, width: int, layoutHeight: int, visualHeight: int,
  field: Field, ime: int, handoff: bool,
  free: int, landscape: bool, canvasWidth: int, wide: bool, primed: bool,
  covered: bool, covers: int, releases: int,
  textScale: int, split: bool, calendarDays: int, agenda: bool,
  clearance: int, rest: int, header: int
}
pure val initial: Geometry = {
  mounted: false, launcher: false, base: { w: 0, h: 0 }, width: 412, layoutHeight: 915, visualHeight: 915,
  field: NoField, ime: -1, handoff: false,
  free: 915, landscape: false, canvasWidth: 412, wide: false, primed: false,
  covered: false, covers: 0, releases: 0,
  textScale: 100, split: false, calendarDays: 1, agenda: false,
  clearance: -1, rest: -1, header: 0
}
pure val Reference = 412
pure val WideCanvas = 760
pure val SplitCanvas = 1000
pure val CoveredBy = 150
pure val widthValues = Set(360, 412, 915)
pure val heightValues = Set(412, 915)
pure val layoutHeightValues = Set(200, 340, 412, 615, 915)
pure val visualHeightValues = Set(200, 340, 412, 615, 915)
pure val scaleValues = Set(100, 130, 150, 200)
pure val clearanceValues = Set(80, 110)
pure val restValues = Set(40, 60)
pure val pxValues = Set(0, 60, 140)
```

## Story: Type without the page turning sideways

> As the owner, I want typing in a portrait window to keep the portrait layout, a rotation while I
> type to turn the layout, and closing the keyboard with Back to put the composer away.

### The estimator keeps the keyboard-free height, and a swap of the sides while editing is a rotation

At the same width, a shorter window while a field has focus is the keyboard. A new width while a
field has focus, within a fifth of the remembered height, is a rotation: the remembered width
stands in for the new keyboard-free height. Any other width change takes the measured height.

```quint
pure def magnitude(n: int): int = if (n < 0) -n else n
pure def estimated(base: Base, w: int, h: int, editing: bool): Base =
  if (w == base.w) (if (not(editing) or h > base.h) { w: w, h: h } else base)
  else if (editing and base.w > 0 and magnitude(w - base.h) * 5 <= base.h) { w: w, h: if (h > base.w) h else base.w }
  else { w: w, h: h }
pure def laidOut(base: Base, launcher: bool, g: Geometry): Geometry = {
  val landscape = g.width > base.h
  val canvas = if (launcher and not(landscape)) Reference else if (landscape or g.width >= Reference) g.width else Reference
  { ...g, base: base, free: base.h, landscape: landscape, canvasWidth: canvas, wide: canvas >= WideCanvas }
}
pure def canMount(g: Geometry, width: int, height: int, launcher: bool): bool = width > 0 and height > 0
pure def mount(g: Geometry, width: int, height: int, launcher: bool): Geometry =
  laidOut({ w: width, h: height }, launcher,
    { ...g, mounted: true, launcher: launcher, width: width, layoutHeight: height, visualHeight: height,
      field: NoField, ime: -1, handoff: false, primed: true, covered: false })
pure def editing(g: Geometry): bool = g.field != NoField
pure def canResize(g: Geometry, width: int, layoutHeight: int, visualHeight: int): bool =
  g.mounted and width > 0 and layoutHeight > 0 and visualHeight > 0 and visualHeight <= layoutHeight
pure def resize(g: Geometry, width: int, layoutHeight: int, visualHeight: int): Geometry = {
  val first = estimated(g.base, width, layoutHeight, editing(g))
  val coveredNow = first.h - visualHeight > CoveredBy
  val release = g.covered and not(coveredNow) and g.field == ComposerField and g.ime == -1
  val base = if (release) estimated(g.base, width, layoutHeight, false) else first
  laidOut(base, g.launcher,
    { ...g, width: width, layoutHeight: layoutHeight, visualHeight: visualHeight, covered: coveredNow,
      covers: if (coveredNow and not(g.covered)) g.covers + 1 else g.covers,
      field: if (release) NoField else g.field, releases: if (release) g.releases + 1 else g.releases })
}
pure val baseValues = Set({ w: 412, h: 915 }, { w: 915, h: 412 }, { w: 0, h: 0 })
pure val wValues = Set(412, 915)
pure val hValues = Set(615, 915)
pure def lawAKeyboardIsNotARotation(base: Base, h: int): bool =
  (base.w > 0 and h < base.h) implies estimated(base, base.w, h, true) == base
pure def lawARotationWhileTypingSwapsTheSides(base: Base, h: int): bool =
  (base.w > 0 and base.h > 0) implies estimated(base, base.h, h, true).h >= base.w
pure def alwaysAMountedEstimatorIsPrimed(g: Geometry): bool = g.mounted implies (g.primed and g.base.w > 0)
pure def alwaysTheCanvasHoldsTheWindow(g: Geometry): bool =
  g.mounted implies ((g.canvasWidth >= g.width or g.launcher) and g.wide == (g.canvasWidth >= WideCanvas) and g.free == g.base.h)
pure def sometimesTypingInPortraitWiderThanTall(g: Geometry): bool =
  g.mounted and editing(g) and g.visualHeight < g.width and not(g.landscape)
pure def sometimesRotatedWhileTyping(g: Geometry): bool = g.mounted and editing(g) and g.landscape and g.covered
```

### The composer is released only by a keyboard that covered it

The dock calls the composer covered when more than 150 pixels of the keyboard-free height are
hidden. Where Android reports the keyboard itself, that report decides: the keyboard hiding without
a voice hand-off releases the composer, and a hand-off keeps the editor. Without a report, a cover
that ends releases it. A short suggestion bar never counts. The page going to the background
releases it too.

```quint
pure def canFocusField(g: Geometry, field: Field): bool = g.mounted
pure def focusField(g: Geometry, field: Field): Geometry = { ...g, field: field }
pure def keyboardShown(g: Geometry, visible: bool, handoff: bool): Geometry = {
  val release = g.ime == 1 and not(visible or handoff) and g.field == ComposerField
  { ...g, ime: if (visible or handoff) 1 else 0, handoff: handoff,
    field: if (release) NoField else g.field, releases: if (release) g.releases + 1 else g.releases }
}
pure def background(g: Geometry): Geometry = { ...g, field: if (g.field == ComposerField) NoField else g.field }
pure def alwaysReleasesFollowCovers(g: Geometry): bool = g.releases >= 0 and g.covers >= 0 and g.ime >= -1 and g.ime <= 1
pure def stepOnlyTheComposerIsReleased(before: Geometry, via: str, after: Geometry): bool =
  after.releases > before.releases implies (before.field == ComposerField and after.field == NoField)
pure def sometimesReleasedByBack(g: Geometry): bool = g.releases > 0 and g.ime == 0
```

## Story: Read everything at the text size I chose

> As the owner, I want large text to give labels room, wide windows to show a reading column, and
> lists beside their open item only where both fit.

### The surface layout follows the canvas width and the measured text scale

From 150% text the list beside its item returns to one pane and Calendar shows the day as an agenda;
below that, day columns are as many 240-pixel columns as fit beside the 76-pixel time gutter, widened
with the text and at most seven; lists split from a 1000-pixel canvas.

```quint
pure def daysFor(canvas: int, scale: int): int = {
  val days = (canvas - 76) * 100 / (240 * (if (scale > 100) scale else 100))
  if (days < 1) 1 else if (days > 7) 7 else days
}
pure def withLayout(scale: int, g: Geometry): Geometry =
  if (scale >= 150) { ...g, textScale: scale, split: false, calendarDays: 1, agenda: true }
  else { ...g, textScale: scale, split: g.canvasWidth >= SplitCanvas, calendarDays: daysFor(g.canvasWidth, scale), agenda: false }
pure def canMeasureText(g: Geometry, scale: int): bool = scale > 0
pure def measureText(g: Geometry, scale: int): Geometry = withLayout(scale, g)
pure def largeText(g: Geometry): bool = g.textScale >= 150
pure def extraLargeText(g: Geometry): bool = g.textScale > 150
pure def alwaysLargeTextIsOnePane(g: Geometry): bool =
  (g.textScale >= 150 implies (g.agenda and not(g.split) and g.calendarDays == 1)) and g.calendarDays >= 1 and g.calendarDays <= 7
pure def sometimesAgendaAtLargeText(g: Geometry): bool = g.agenda and g.mounted
pure val canvasValues = Set(360, 412, 1280)
pure def lawWiderTextFewerColumns(canvas: int): bool = daysFor(canvas, 200) <= daysFor(canvas, 100)
```

### The dock's footprint is published while a dock shows, and kept while none does

Two lengths are published: everything the dock covers now, and the bar alone, which is never more.
The shell marks the dock slot it mounts, so the footprint is read from the boxes the dock's surfaces
draw, again whenever one of them resizes; with the conversation at rest the whole dock is the bar,
and with it open as a sheet or full screen the bar is everything it covers.
While the shade or the lock screen hides the dock the last footprint stays, so Home does not jump
when it returns. The header clearance is the bottom of the visible header: an app's, the library's
title row, an open sheet's, or the conversation's when it is full screen.

```quint
pure def canDockMeasured(g: Geometry, clearance: int, rest: int): bool = rest > 0 and rest <= clearance
pure def dockMeasured(g: Geometry, clearance: int, rest: int): Geometry = { ...g, clearance: clearance, rest: rest }
pure def canHeaderMeasured(g: Geometry, px: int): bool = px >= 0
pure def headerMeasured(g: Geometry, px: int): Geometry = { ...g, header: px }
pure def alwaysTheBarFitsInTheFootprint(g: Geometry): bool =
  (g.clearance == -1 and g.rest == -1) or (g.rest > 0 and g.rest <= g.clearance)
pure def sometimesDockPublished(g: Geometry): bool = g.rest > 0 and g.mounted
```
