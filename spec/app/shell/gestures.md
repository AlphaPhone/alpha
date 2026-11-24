# Gestures

What a finished swipe on the page means, decided by where it started, which
way it went and what shows: Back from a side edge, Home from the bottom bar
on the launcher, Android's notifications from a pull on bare Home, and a
sheet closed by a drag down its grip. Android owns the very top edge and,
in gesture navigation, the side edges: the shell answers only what reaches
the page. Distances are in points of the canvas, not of the window. Home
says whether a pull may ask Android for its shade (its spec, "A pull on
bare Home asks Android for its shade only when Alpha is the launcher"); Ask
Alpha's own drags are its dock's.

## Story: Swipe the way the phone expects

> As the owner, I want an edge swipe to go back, an upward swipe from the
> bottom bar to go Home on the launcher, and a pull down on empty Home to
> show Android's notifications, and a scroll of Home never to open anything.

### A swipe travels at least 46 points; a sideways one from within 30 points of a side edge, towards the middle, is Back

```quint
type Swipe = NoSwipe | SwipeBack | SwipeShade | SwipeHome

pure val travel = 46
pure val edge = 30
pure val barHeight = 43

pure def magnitude(n: int): int = if (n < 0) -n else n

pure def edgeBack(width: int, x: int, dx: int): bool = (x < edge and dx > travel) or (x > width - edge and dx < 0 - travel)
```

### On the launcher a pull down that Home allows opens Android's shade, and a swipe up from the bottom bar goes Home; nothing else is a swipe

A swipe up anywhere else, and any swipe in an ordinary app, scrolls.

```quint
pure def swipe(launcher: bool, pullAllowed: bool, width: int, height: int, x: int, y: int, dx: int, dy: int): Swipe =
  if (magnitude(dx) < travel and magnitude(dy) < travel) NoSwipe
  else if (magnitude(dy) <= magnitude(dx)) (if (edgeBack(width, x, dx)) SwipeBack else NoSwipe)
  else if (dy > travel and launcher and pullAllowed) SwipeShade
  else if (launcher and dy < 0 - travel and y > height - barHeight) SwipeHome
  else NoSwipe

pure val xValues = Set(10, 200, 400)
pure val yValues = Set(20, 400, 900)
pure val dxValues = Set(-60, 0, 60)
pure val dyValues = Set(-60, 0, 60)
pure val widthValues = Set(412, 800)
pure val heightValues = Set(915, 412)

pure def lawAShortSwipeDoesNothing(launcher: bool, pullAllowed: bool, width: int, height: int, x: int, y: int): bool =
  swipe(launcher, pullAllowed, width, height, x, y, 10, -10) == NoSwipe

pure def lawTheShadeAndHomeOnlyOnTheLauncher(pullAllowed: bool, width: int, height: int, x: int, y: int, dx: int, dy: int): bool =
  val result = swipe(false, pullAllowed, width, height, x, y, dx, dy)
  result != SwipeShade and result != SwipeHome

pure def lawASwipeUpNeverOpensTheShade(launcher: bool, pullAllowed: bool, width: int, height: int, x: int, y: int, dx: int): bool =
  swipe(launcher, pullAllowed, width, height, x, y, dx, -60) != SwipeShade
```

### A pull opens the shade only when it is clearly downward, one and a half times its sideways travel, starts below the 44-point status band, on Home itself and not in a field, with no keyboard up and nothing under the finger scrolled from its top

A Home taller than the screen claims such a pull at its top once it has
moved six points downward, and otherwise leaves the drag to scrolling.

```quint
pure val statusBand = 44

pure def pullOpensShade(allowed: bool, startY: int, dx: int, dy: int, onHome: bool, typing: bool, keyboard: bool, scrolled: bool): bool =
  allowed and dy > travel and dy * 2 > magnitude(dx) * 3 and startY >= statusBand and onHome
    and not(typing) and not(keyboard) and not(scrolled)

type Claim = ClaimPull | ReleasePull | WaitPull

pure def overflowPull(allowed: bool, dx: int, dy: int): Claim =
  if (not(allowed)) ReleasePull
  else if (magnitude(dx) < 6 and magnitude(dy) < 6) WaitPull
  else if (dy > 0 and dy > magnitude(dx)) ClaimPull
  else ReleasePull

pure val startYValues = Set(20, 60)

pure def lawTheStatusBandIsAndroids(dx: int, dy: int): bool = not(pullOpensShade(true, 20, dx, dy, true, false, false, false))

pure def lawAScrolledHomeIsNotPulled(startY: int, dx: int, dy: int): bool = not(pullOpensShade(true, startY, dx, dy, true, false, false, true))

pure def lawOnlyADownwardPullIsClaimed(dx: int, dy: int): bool = overflowPull(true, dx, dy) == ClaimPull implies dy > 0
```

## Story: Put a sheet away with a finger

> As the owner, I want to drag a sheet down by its grip to close it, and a
> short drag to let it spring back.

### Only the sheet on top is dragged, from its grip, the top 80 points away from its controls; a mostly sideways move gives up, and a release 72 points down or more closes it

```quint
type Release = SheetCloses | SheetStays

pure val dismissDistance = 72

pure def sheetRelease(onTop: bool, fromGrip: bool, sideways: bool, pulled: int): Release =
  if (onTop and fromGrip and not(sideways) and pulled >= dismissDistance) SheetCloses else SheetStays

pure val pulledValues = Set(0, 40, 72, 120)

pure def lawOnlyTheSheetOnTopCloses(fromGrip: bool, sideways: bool, pulled: int): bool =
  sheetRelease(false, fromGrip, sideways, pulled) == SheetStays

pure def lawAShortDragSpringsBack(onTop: bool, fromGrip: bool, sideways: bool): bool =
  sheetRelease(onTop, fromGrip, sideways, 40) == SheetStays
```
