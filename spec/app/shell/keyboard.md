# Keyboard and canvas

How the page is laid out from the window Android gives it: its width and
height as measured, never the screen's orientation. Android's window
shortens while the soft keyboard is up and keeps a focused field and its
keyboard through a rotation, so a window read straight would turn a
portrait phone sideways as soon as the owner types. The shell keeps the
window's height without the keyboard, and the canvas, Ask Alpha's composer
and the clearance of everything Ask Alpha floats over all rest on it. The
shell measures the window when it mounts, before any field can take focus.

Text size is measured, not declared: Android applies large text as the
WebView's text zoom, which grows the glyphs and leaves declared lengths
alone, so the shell measures a hidden probe and the layout follows what it
finds.

## Story: Type without the page turning sideways

> As the owner, I want typing in a portrait window to keep the portrait
> layout, a rotation while I type to turn the layout, and closing the
> keyboard with Back to put the composer away.

### The shell keeps the window as measured, the height without the keyboard, the canvas it lays out, whether a field has focus and whether the keyboard covers the composer

```quint
type Field = NoField | Composer | OtherField
type Base = { w: int, h: int }
type Keyboard = NotReported | Hidden | Shown
type Canvas = {
  mounted: bool, launcher: bool, base: Base, width: int, height: int, visible: int,
  field: Field, keyboard: Keyboard, voice: bool,
  landscape: bool, canvasWidth: int, wide: bool, covered: bool, released: int,
  textScale: int, split: bool, days: int, agenda: bool,
  clearance: int, bar: int, header: int,
}

pure val initial: Canvas = {
  mounted: false, launcher: false, base: { w: 0, h: 0 }, width: 412, height: 915, visible: 915,
  field: NoField, keyboard: NotReported, voice: false,
  landscape: false, canvasWidth: 412, wide: false, covered: false, released: 0,
  textScale: 100, split: false, days: 1, agenda: false,
  clearance: 0, bar: 0, header: 0,
}

pure val reference = 412
pure val wideCanvas = 760
pure val splitCanvas = 1000
pure val coveredBy = 150
```

### What the simulator tries

```quint
pure val widthValues = Set(360, 412, 915)
pure val heightValues = Set(412, 615, 915)
pure val visibleValues = Set(200, 412, 615, 915)
pure val scaleValues = Set(100, 130, 150, 200)
pure val clearanceValues = Set(80, 110)
pure val barValues = Set(40, 60)
pure val pxValues = Set(0, 60, 140)
pure val baseValues = Set({ w: 412, h: 915 }, { w: 915, h: 412 }, { w: 0, h: 0 })
pure val wValues = Set(412, 915)
pure val hValues = Set(615, 915)
pure val canvasValues = Set(360, 412, 1280)
```

### At the same width, a shorter window while a field has focus is the keyboard; a new width while a field has focus, within a fifth of the height kept, is a rotation, and the width kept stands in for the new height; any other change takes the height measured

```quint
pure def magnitude(n: int): int = if (n < 0) -n else n

pure def estimated(base: Base, w: int, h: int, typing: bool): Base =
  if (w == base.w) (if (not(typing) or h > base.h) { w: w, h: h } else base)
  else if (typing and base.w > 0 and magnitude(w - base.h) * 5 <= base.h) { w: w, h: if (h > base.w) h else base.w }
  else { w: w, h: h }

pure def lawAKeyboardIsNotARotation(base: Base, h: int): bool =
  (base.w > 0 and h < base.h) implies estimated(base, base.w, h, true) == base

pure def lawARotationWhileTypingSwapsTheSides(base: Base, h: int): bool =
  (base.w > 0 and base.h > 0) implies estimated(base, base.h, h, true).h >= base.w
```

### The canvas is landscape when the window is wider than its height without the keyboard; the launcher lays a portrait phone out at 412 points, and a canvas of 760 or more is wide

```quint
pure def laidOut(base: Base, c: Canvas): Canvas =
  val landscape = c.width > base.h
  val canvas = if (c.launcher and not(landscape)) reference else if (landscape or c.width >= reference) c.width else reference
  withLayout(c.textScale, { ...c, base: base, landscape: landscape, canvasWidth: canvas, wide: canvas >= wideCanvas })

pure def canMount(c: Canvas, width: int, height: int, launcher: bool): bool = not(c.mounted) and width > 0 and height > 0

pure def mount(c: Canvas, width: int, height: int, launcher: bool): Canvas =
  laidOut({ w: width, h: height },
    { ...c, mounted: true, launcher: launcher, width: width, height: height, visible: height,
      field: NoField, keyboard: NotReported, voice: false, covered: false })

pure def typing(c: Canvas): bool = c.field != NoField
```

### The composer is covered when more than 150 points of the height without the keyboard are hidden; a cover that ends while the composer has focus puts it away, where Android does not report the keyboard itself

```quint
pure def canResize(c: Canvas, width: int, height: int, visible: int): bool =
  c.mounted and width > 0 and height > 0 and visible > 0 and visible <= height

pure def resize(c: Canvas, width: int, height: int, visible: int): Canvas =
  val first = estimated(c.base, width, height, typing(c))
  val coveredNow = first.h - visible > coveredBy
  val release = c.covered and not(coveredNow) and c.field == Composer and c.keyboard == NotReported
  val base = if (release) estimated(c.base, width, height, false) else first
  laidOut(base, { ...c, width: width, height: height, visible: visible, covered: coveredNow,
    field: if (release) NoField else c.field, released: if (release) c.released + 1 else c.released })
```

### Where Android reports the keyboard, the keyboard hiding puts the composer away, unless it hid to hand the composer to voice

```quint
pure def canFocusField(c: Canvas, focus: Field): bool = c.mounted and focus != c.field

pure def focusField(c: Canvas, focus: Field): Canvas = { ...c, field: focus }

pure def canKeyboardReported(c: Canvas, shown: bool, voice: bool): bool = c.mounted

pure def keyboardReported(c: Canvas, shown: bool, voice: bool): Canvas =
  val release = c.keyboard == Shown and not(shown or voice) and c.field == Composer
  { ...c, keyboard: if (shown or voice) Shown else Hidden, voice: voice,
    field: if (release) NoField else c.field, released: if (release) c.released + 1 else c.released }
```

### Alpha going to the background puts the composer away

```quint
pure def canBackground(c: Canvas): bool = c.field == Composer

pure def background(c: Canvas): Canvas = { ...c, field: NoField, released: c.released + 1 }
```

### Only the composer is put away, and only when it had focus

```quint
pure def stepOnlyTheComposerIsPutAway(before: Canvas, via: str, after: Canvas): bool =
  after.released > before.released implies (before.field == Composer and after.field == NoField)
```

### A mounted canvas holds the window, is wide exactly from 760 points, and keeps a height

```quint
pure def alwaysTheCanvasHoldsTheWindow(c: Canvas): bool =
  c.mounted implies (c.base.w > 0 and c.base.h > 0 and (c.canvasWidth >= c.width or c.launcher) and c.wide == (c.canvasWidth >= wideCanvas))

pure def alwaysPutAwayOnlyCounts(c: Canvas): bool = c.released >= 0
```

### The owner can type in a portrait window wider than what is left of it, rotate while typing, and close the keyboard with Back

```quint
pure def sometimesTypingInPortraitWiderThanTall(c: Canvas): bool =
  c.mounted and typing(c) and c.visible < c.width and not(c.landscape)

pure def sometimesRotatedWhileTyping(c: Canvas): bool = c.mounted and typing(c) and c.landscape and c.covered

pure def sometimesPutAwayByBack(c: Canvas): bool = c.released > 0 and c.keyboard == Hidden
```

## Story: Read everything at the text size I chose

> As the owner, I want large text to give labels room, wide windows to show
> a reading column, and a list beside its open item only where both fit.

### From 150% text a list and its item take one pane each and Calendar shows its day as an agenda; below it, a list splits from a 1000-point canvas, and Calendar shows as many 240-point day columns as fit beside its 76-point times, widened with the text, at most seven

```quint
pure def daysFor(canvas: int, scale: int): int =
  val days = (canvas - 76) * 100 / (240 * (if (scale > 100) scale else 100))
  if (days < 1) 1 else if (days > 7) 7 else days

pure def withLayout(scale: int, c: Canvas): Canvas =
  if (scale >= 150) { ...c, textScale: scale, split: false, days: 1, agenda: true }
  else { ...c, textScale: scale, split: c.canvasWidth >= splitCanvas, days: daysFor(c.canvasWidth, scale), agenda: false }

pure def canMeasureText(c: Canvas, scale: int): bool = scale > 0 and scale != c.textScale

pure def measureText(c: Canvas, scale: int): Canvas = withLayout(scale, c)

pure def alwaysLargeTextIsOnePane(c: Canvas): bool =
  (c.textScale >= 150 implies (c.agenda and not(c.split) and c.days == 1))
    and (c.textScale < 150 implies (not(c.agenda) and c.split == (c.canvasWidth >= splitCanvas) and c.days == daysFor(c.canvasWidth, c.textScale)))
    and c.days >= 1 and c.days <= 7

pure def lawWiderTextFewerColumns(canvas: int): bool = daysFor(canvas, 200) <= daysFor(canvas, 100)

pure def sometimesTheAgendaAtLargeText(c: Canvas): bool = c.agenda and c.mounted
```

## Story: Scroll past Ask Alpha

> As the owner, I want the end of every list to scroll clear of Ask Alpha,
> and a notice at the top never to cover an app's header.

### Ask Alpha's footprint is what it covers now and its bar alone, which is never more; while nothing of Ask Alpha shows, the last footprint stays

The header clearance is the bottom of the header that shows: an app's, an
open sheet's, or Ask Alpha's own when it fills the screen.

```quint
pure def canDockMeasured(c: Canvas, clearance: int, bar: int): bool = bar > 0 and bar <= clearance

pure def dockMeasured(c: Canvas, clearance: int, bar: int): Canvas = { ...c, clearance: clearance, bar: bar }

pure def canHeaderMeasured(c: Canvas, px: int): bool = px >= 0 and px != c.header

pure def headerMeasured(c: Canvas, px: int): Canvas = { ...c, header: px }

pure def alwaysTheBarFitsInTheFootprint(c: Canvas): bool = (c.clearance == 0 and c.bar == 0) or (c.bar > 0 and c.bar <= c.clearance)

pure def sometimesTheFootprintIsKnown(c: Canvas): bool = c.bar > 0 and c.mounted
```
