# Haptics

Touch feedback: a switch turning on or off, the confirming button of a
removal in a dialog, and the long press that starts editing Home. Android
plays it and follows the owner's own touch-feedback setting; a browser
plays nothing. What a click earns is read before the control's own handler
changes it.

## Story: Feel the changes I make

> As the owner, I want a light tap of feedback when I flip a switch,
> confirm a removal or start arranging Home, and never twice for one
> gesture.

### A click earns feedback only from a control that takes it: a switch, or a dialog's button that removes or overwrites something

A checkbox switch has already changed when its click arrives; a button
switch has not. A plain button earns feedback only as a dialog's
confirming button whose label removes or overwrites something (Delete,
Discard, Erase, Remove, Replace, Clear, Reset, Sign out) or that is marked
destructive; a Delete in a list still opens its own review first.

```quint
type Haptic = NoHaptic | ToggleOn | ToggleOff | Confirm | LongPress
type Role = NotAControl | PlainButton | CheckboxSwitch | ButtonSwitch

pure def hapticForClick(role: Role, disabled: bool, inert: bool, checked: bool, inDialog: bool, destructive: bool): Haptic =
  if (role == NotAControl or disabled or inert) NoHaptic
  else if (role == CheckboxSwitch) (if (checked) ToggleOn else ToggleOff)
  else if (role == ButtonSwitch) (if (checked) ToggleOff else ToggleOn)
  else if (inDialog and destructive) Confirm
  else NoHaptic

pure def lawAButtonInAListIsQuiet(destructive: bool): bool =
  hapticForClick(PlainButton, false, false, false, false, destructive) == NoHaptic

pure def lawADisabledControlIsQuiet(role: Role, checked: bool, inDialog: bool, destructive: bool): bool =
  hapticForClick(role, true, false, checked, inDialog, destructive) == NoHaptic
```

### Haptics knows whether the phone plays feedback, and the last feedback played and when

```quint
type Haptics = { available: bool, last: Haptic, at: int, played: int }

pure val initial: Haptics = { available: false, last: NoHaptic, at: 0, played: 0 }

pure val repeatWindow = 300

pure val nowValues = Set(0, 100, 400)
```

### The phone says once whether it plays feedback

```quint
pure def canInstall(h: Haptics, available: bool): bool = not(h.available) and h.played == 0

pure def install(h: Haptics, available: bool): Haptics = { ...h, available: available }
```

### One gesture plays once, even when it reaches two paths: the same feedback within 300 milliseconds plays once

A held press and Android's long-press menu both report a long press.

```quint
pure def canPlay(h: Haptics, kind: Haptic, now: int): bool =
  h.available and kind != NoHaptic and now >= h.at and not(kind == h.last and now - h.at < repeatWindow)

pure def play(h: Haptics, kind: Haptic, now: int): Haptics = { ...h, last: kind, at: now, played: h.played + 1 }

pure def stepNothingPlaysWithoutThePhone(before: Haptics, via: str, after: Haptics): bool =
  after.played > before.played implies before.available

pure def alwaysPlayedCounts(h: Haptics): bool = h.played >= 0 and (h.played > 0 implies h.available)

pure def sometimesPlayedTwiceApart(h: Haptics): bool = h.played >= 2 and h.last == LongPress
```
