# Dock

How the owner's finger and the keyboard move Ask Alpha. The height Ask
Alpha is raised to belongs to the [shell](../shell/): a gesture here only
chooses where it lands, and asks the shell to raise it there or to go back
by a step or two. The dock keeps one gesture at a time, the moment until
which a stray click is ignored, and the height a sheet was left at.

## Story: Drag Ask Alpha where I want it

> As the owner, I want a drag or a flick of Ask Alpha to land where my
> finger meant: open it fully, keep it at the height I left it, or put it
> away, with one press doing one thing, and the composer never hidden by
> the keyboard.

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

### A gesture asks the shell to raise Ask Alpha, to go back a step or two, or nothing; a press that did not move is a tap on its control

```quint
type Effect = Raise({ detent: S::Detent }) | Lower({ steps: int }) | Tap

pure def asked(start: S::Detent, target: S::Detent): List[Effect] =
  if (S::height(target) > S::height(start)) List(Raise({ detent: target }))
  else if (target == start) List()
  else List(Lower({ steps: if (start == S::Full and target == S::Bar) 2 else 1 }))

pure def applied(asks: List[Effect], s: S::Shell): S::Shell =
  val first = asks.nthOr(0, Tap)
  match first {
    | Raise(r) => if (S::canRaise(s, r.detent)) S::raise(s, r.detent) else s
    | Lower(l) => if (l.steps == 2) S::goBack(S::goBack(s)) else S::goBack(s)
    | _ => s
  }

pure def moves(e: Effect): bool = match e { | Tap => false | _ => true }
```

### What the shell is asked brings Ask Alpha exactly where the gesture landed, from any shell with the drawer closed

The drawer is open only over Ask Alpha on the bar, and no drag starts
under it.

```quint
pure val phoneValues = Set({ trail: List(), drawer: false, assistant: S::Bar, image: false, contacts: false })
  .union(Set({ trail: List(S::Notes), drawer: false, assistant: S::Sheet, image: false, contacts: false }))
  .union(Set({ trail: List(S::Calendar, S::Notes), drawer: false, assistant: S::Full, image: true, contacts: false }))
  .union(Set({ trail: List(), drawer: false, assistant: S::Typing, image: false, contacts: true }))

pure def lawTheShellSettlesWhereTheGestureLands(phone: S::Shell, direction: Direction, flick: bool, height: int, floor: int, full: int): bool =
  not(phone.drawer) implies
    applied(asked(phone.assistant, landing(phone.assistant, direction, flick, height, floor, full).detent), phone).assistant
      == landing(phone.assistant, direction, flick, height, floor, full).detent
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

### The dock holds the gesture under the finger, where it started, until when a click is ignored, and the height the sheet was left at

```quint
type Gesture = Idle | Pressed | Dragging
type Dock = { gesture: Gesture, start: S::Detent, quiet: int, at: int, kept: int }

pure val initial: Dock = { gesture: Idle, start: S::Bar, quiet: 0, at: 0, kept: 0 }

pure val clickWindow = 400

type Moved = { state: Dock, out: List[Effect] }
```

### What the simulator tries

```quint
pure val nowValues = Set(100, 300, 700)
pure val heightValues = Set(0, 300, 700)
pure val floorValues = Set(80)
pure val fullValues = Set(800)
```

### A press starts one gesture, on Ask Alpha as it stands

```quint
pure def canPress(d: Dock, detent: S::Detent, now: int): bool = d.gesture == Idle and now >= d.at

pure def press(d: Dock, detent: S::Detent, now: int): Dock = { ...d, gesture: Pressed, start: detent, at: now }

pure def canDrag(d: Dock): bool = d.gesture == Pressed

pure def drag(d: Dock): Dock = { ...d, gesture: Dragging }
```

### A drag released asks the shell once for where it landed, and keeps a sheet's height

The click Android sends after the finger lifts is ignored for a moment, so
a drag that ends over Talk does not also start voice.

```quint
pure def canRelease(d: Dock, direction: Direction, flick: bool, height: int, floor: int, full: int, now: int): bool =
  d.gesture == Dragging and now >= d.at and 0 <= floor and floor < full and 0 <= height

pure def release(d: Dock, direction: Direction, flick: bool, height: int, floor: int, full: int, now: int): Moved =
  val l = landing(d.start, direction, flick, height, floor, full)
  { state: { ...d, gesture: Idle, at: now, quiet: now + clickWindow, kept: if (l.detent == S::Sheet) l.height else 0 },
    out: asked(d.start, l.detent) }
```

### A press that did not move taps its control once

```quint
pure def canLift(d: Dock, now: int): bool = d.gesture == Pressed and now >= d.at

pure def lift(d: Dock, now: int): Moved = { state: { ...d, gesture: Idle, at: now, quiet: now + clickWindow }, out: List(Tap) }
```

### A click of a control taps it, unless it is the late click of a gesture just ended

```quint
pure def canClick(d: Dock, now: int): bool = d.gesture == Idle and now >= d.at

pure def click(d: Dock, now: int): Moved = { state: { ...d, at: now }, out: if (now >= d.quiet) List(Tap) else List() }
```

### A gesture under the finger is dropped when the shell changes beneath it

Navigation, voice, a resize or the window losing focus ends the gesture:
it asks for nothing, and its late click is ignored.

```quint
pure def canShift(d: Dock, now: int): bool = now >= d.at

pure def shift(d: Dock, now: int): Moved =
  { state: { ...d, gesture: Idle, at: now, quiet: if (d.gesture == Idle) d.quiet else now + clickWindow }, out: List() }
```

### Ask Alpha put away forgets the height its sheet was left at

```quint
pure def canPutAway(d: Dock, now: int): bool = now >= d.at

pure def putAway(d: Dock, now: int): Moved = { state: { ...d, gesture: Idle, at: now, kept: 0 }, out: List() }

pure def stepAPutAwaySheetForgetsItsHeight(before: Dock, via: str, after: Dock): bool =
  (via == "putAway" implies after.kept == 0) and (after.kept != before.kept implies (via == "release" or via == "putAway"))
```

### One gesture asks the shell once, and only a drag released asks it to move

```quint
pure def stepOneGestureAsksOnce(before: Dock, via: str, after: Dock, out: List[Effect]): bool =
  out.length() <= 1 and out.every(e => moves(e) implies (via == "release" and before.gesture == Dragging))
```

### A press does one thing: a tap is never also a drag, and a late click never taps

```quint
pure def stepAPressDoesOneThing(before: Dock, via: str, after: Dock, out: List[Effect]): bool =
  out.every(e => match e {
    | Tap => (via == "lift" and before.gesture == Pressed) or (via == "click" and before.gesture == Idle and after.at >= before.quiet)
    | _ => true
  })
```

### The dock's clock never goes back

```quint
pure def stepTimeNeverGoesBack(before: Dock, via: str, after: Dock): bool = after.at >= before.at

pure def alwaysAKeptHeightIsAHeight(d: Dock): bool = d.kept >= 0
```

### A drag can be under way, a sheet can keep its height, and a click can be ignored

```quint
pure def sometimesADragIsUnderWay(d: Dock): bool = d.gesture == Dragging

pure def sometimesASheetKeepsItsHeight(d: Dock): bool = d.kept > 0

pure def sometimesALateClickIsIgnored(d: Dock): bool = d.gesture == Idle and d.at < d.quiet and d.at > 0
```

## Story: Type without losing the composer

> As the owner, I want the composer to stay above the keyboard while I
> type, and Ask Alpha to rest again when the keyboard goes.

### While typing the composer sits above the keyboard and the navigation bar; otherwise on the navigation bar alone

```quint
pure def composerLift(typing: bool, keyboard: int, navigation: int): int =
  if (typing and keyboard > navigation) keyboard else navigation

pure def lawTheComposerClearsTheKeyboardWhileTyping(keyboard: int, navigation: int): bool =
  composerLift(true, keyboard, navigation) >= keyboard and composerLift(true, keyboard, navigation) >= navigation

pure def lawTheKeyboardLiftsNothingElse(keyboard: int, navigation: int): bool =
  composerLift(false, keyboard, navigation) == navigation
```

### Focusing the composer on the bar raises Ask Alpha to typing

```quint
pure def focused(detent: S::Detent): List[Effect] = if (detent == S::Bar) List(Raise({ detent: S::Typing })) else List()

pure def lawFocusingTheBarTypes(phone: S::Shell): bool =
  not(phone.drawer) implies
    applied(focused(phone.assistant), phone).assistant == (if (phone.assistant == S::Bar) S::Typing else phone.assistant)
```

### A keyboard closed while typing puts Ask Alpha back on the bar

```quint
pure def keyboardClosed(detent: S::Detent): List[Effect] = if (detent == S::Typing) List(Lower({ steps: 1 })) else List()

pure def lawAClosedKeyboardLeavesTypingForTheBar(phone: S::Shell): bool =
  not(phone.drawer) implies applied(keyboardClosed(phone.assistant), phone).assistant == (if (phone.assistant == S::Typing) S::Bar else phone.assistant)
```
