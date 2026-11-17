# Dock

How the owner's finger and the keyboard move Ask Alpha. The height Ask
Alpha is raised to belongs to the [shell](../shell/): a gesture here only
chooses where it lands, and asks the shell to raise it there or to go back
by a step or two. These are rules with no state of their own.

## Story: Drag Ask Alpha where I want it

> As the owner, I want a drag or a flick of Ask Alpha to land where my
> finger meant: open it fully, keep it at the height I left it, or put it
> away, and the composer never hidden by the keyboard.

### A released drag lands on the bar, a sheet at a height, or the full screen

Near the top it fills the screen and near the floor it goes to the bar;
the zones are 120 points deep, or a third of the travel when that is less.
An open sheet flicked up fills the screen and flicked down goes to the bar.
Pulled down from the bar or typing, it rests on the bar. Between the zones
a sheet keeps the height it was left at; height 0 is its fitted height.

```quint
import shell as S from "../shell"

type Direction = Up | Down
type Landing = { detent: S::Detent, height: int }

pure val snapZone = 120

pure def zone(floor: int, full: int): int = if (snapZone < (full - floor) / 3) snapZone else (full - floor) / 3

pure def isOpen(detent: S::Detent): bool = detent == S::Sheet or detent == S::Full

pure def landing(start: S::Detent, direction: Direction, flick: bool, height: int, floor: int, full: int): Landing =
  val z = zone(floor, full)
  val nearTop = height >= full - z
  val nearFloor = height <= floor + z
  if (isOpen(start))
    if (flick) { detent: if (direction == Up) S::Full else S::Bar, height: 0 }
    else if (nearFloor) { detent: S::Bar, height: 0 }
    else if (nearTop) { detent: S::Full, height: 0 }
    else { detent: S::Sheet, height: height }
  else if (direction == Down) { detent: S::Bar, height: 0 }
  else if (nearTop) { detent: S::Full, height: 0 }
  else { detent: S::Sheet, height: if (flick or nearFloor) 0 else height }
```

### A gesture asks the shell to raise Ask Alpha, to go back a step or two, or nothing

A press that did not move is a tap on its control and asks nothing of the
height.

```quint
type Ask = Stay | Raise({ detent: S::Detent }) | Lower({ steps: int })

pure def asked(start: S::Detent, target: S::Detent): Ask =
  if (S::height(target) > S::height(start)) Raise({ detent: target })
  else if (target == start) Stay
  else Lower({ steps: if (start == S::Full and target == S::Bar) 2 else 1 })

pure def released(dragged: bool, start: S::Detent, direction: Direction, flick: bool, height: int, floor: int, full: int): Ask =
  if (dragged) asked(start, landing(start, direction, flick, height, floor, full).detent) else Stay

pure def applied(a: Ask, s: S::Shell): S::Shell =
  match a {
    | Raise(r) => if (S::canRaise(s, r.detent)) S::raise(s, r.detent) else s
    | Lower(l) => if (l.steps == 2) S::goBack(S::goBack(s)) else S::goBack(s)
    | _ => s
  }

pure def shellAt(detent: S::Detent): S::Shell = { trail: List(), drawer: false, assistant: detent, image: false, contacts: false }
```

### What the shell is asked brings Ask Alpha exactly where the gesture landed

```quint
pure def lawTheShellSettlesWhereTheGestureLands(start: S::Detent, direction: Direction, flick: bool, height: int, floor: int, full: int): bool =
  applied(released(true, start, direction, flick, height, floor, full), shellAt(start)).assistant
    == landing(start, direction, flick, height, floor, full).detent
```

### A tap moves nothing

```quint
pure def lawATapMovesNothing(start: S::Detent, direction: Direction, flick: bool, height: int, floor: int, full: int): bool =
  val a = released(false, start, direction, flick, height, floor, full)
  match a { | Raise(r) => false | Lower(l) => false | _ => true }
```

### A flick of an open sheet goes by its direction alone

```quint
pure def lawAFlickGoesByItsDirection(start: S::Detent, direction: Direction, height: int, floor: int, full: int): bool =
  isOpen(start) implies
    landing(start, direction, true, height, floor, full).detent == (if (direction == Up) S::Full else S::Bar)
```

### Pulled down from the bar or from typing, Ask Alpha rests on the bar

```quint
pure def lawPulledDownAtRestStaysOnTheBar(start: S::Detent, flick: bool, height: int, floor: int, full: int): bool =
  not(isOpen(start)) implies landing(start, Down, flick, height, floor, full).detent == S::Bar
```

### A sheet keeps the height it was left at only between the two zones

```quint
pure def lawAKeptHeightLiesBetweenTheZones(start: S::Detent, direction: Direction, flick: bool, height: int, floor: int, full: int): bool =
  val l = landing(start, direction, flick, height, floor, full)
  val z = zone(floor, full)
  l.height != 0 implies (l.detent == S::Sheet and l.height == height and floor + z < height and height < full - z)
```

## Story: Type without losing the composer

> As the owner, I want the composer to stay above the keyboard while I
> type, and Ask Alpha to rest again when the keyboard goes.

### The composer sits on whichever is higher, the keyboard or the navigation bar

```quint
pure def lift(keyboard: int, navigation: int): int = if (keyboard > navigation) keyboard else navigation

pure def lawTheComposerStaysAboveTheKeyboard(keyboard: int, navigation: int): bool =
  val l = lift(keyboard, navigation)
  l >= keyboard and l >= navigation and (l == keyboard or l == navigation)
```

### Focusing the composer on the bar raises Ask Alpha to typing

```quint
pure def focused(detent: S::Detent): Ask = if (detent == S::Bar) Raise({ detent: S::Typing }) else Stay

pure def lawFocusingTheBarTypes(detent: S::Detent): bool =
  applied(focused(detent), shellAt(detent)).assistant == (if (detent == S::Bar) S::Typing else detent)
```

### A keyboard closed while typing puts Ask Alpha back on the bar

```quint
pure def keyboardClosed(detent: S::Detent): Ask = if (detent == S::Typing) Lower({ steps: 1 }) else Stay

pure def lawAClosedKeyboardLeavesTypingForTheBar(detent: S::Detent): bool =
  applied(keyboardClosed(detent), shellAt(detent)).assistant == (if (detent == S::Typing) S::Bar else detent)
```
