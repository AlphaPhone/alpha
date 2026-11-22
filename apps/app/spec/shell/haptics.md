# Haptics

Touch feedback on Android: a switch turning on or off, the confirming button of a delete or other
removal in a dialog, and a long press that starts editing. Android plays it through
`AlphaDevice.haptic` and follows the owner's own touch-feedback setting; elsewhere nothing plays.
The feedback a click earns is read before the control's own handler changes it.

```quint
type Haptic = NoHaptic | ToggleOn | ToggleOff | Confirm | LongPress
type ControlRole = NotAControl | PlainButton | CheckboxSwitch | ButtonSwitch
type Haptics = { available: bool, last: Haptic, at: int, played: int }
pure val initial: Haptics = { available: false, last: NoHaptic, at: 0, played: 0 }
pure val RepeatMs = 300
pure val nowValues = Set(0, 100, 400)
```

## Story: Feel the changes I make

> As the owner, I want a light tap of feedback when I flip a switch, confirm a removal or start
> arranging Home, and never twice for one gesture.

### A click earns feedback only from an enabled control: a switch, or a dialog's destructive confirm

A checkbox switch has already changed when its click arrives; a button switch has not. A plain
button earns feedback only as a dialog's confirming button whose label removes or overwrites
something (Delete, Discard, Erase, Remove, Replace, Clear, Reset, Sign out) or that is marked
destructive; a Delete in a list still opens its own review.

```quint
pure def hapticForClick(role: ControlRole, disabled: bool, inert: bool, checked: bool, inDialog: bool, destructive: bool): Haptic =
  if (role == NotAControl or disabled or inert) NoHaptic
  else if (role == CheckboxSwitch) (if (checked) ToggleOn else ToggleOff)
  else if (role == ButtonSwitch) (if (checked) ToggleOff else ToggleOn)
  else if (inDialog and destructive) Confirm
  else NoHaptic
pure def lawAListButtonIsQuiet(destructive: bool): bool =
  hapticForClick(PlainButton, false, false, false, false, destructive) == NoHaptic
pure def lawDisabledIsQuiet(role: ControlRole, checked: bool, inDialog: bool, destructive: bool): bool =
  hapticForClick(role, true, false, checked, inDialog, destructive) == NoHaptic
```

### One gesture plays once, even when it reaches two paths

A held press and Android's context menu both report a long press: the same kind within 300 ms
plays once.

```quint
pure def install(h: Haptics, available: bool): Haptics = { ...h, available: available, last: NoHaptic, at: 0 }
pure def canPlay(h: Haptics, kind: Haptic, now: int): bool =
  h.available and kind != NoHaptic and not(kind == h.last and now - h.at < RepeatMs and now >= h.at)
pure def play(h: Haptics, kind: Haptic, now: int): Haptics = { ...h, last: kind, at: now, played: h.played + 1 }
pure def stepNothingPlaysWithoutTheDevice(before: Haptics, via: str, after: Haptics): bool =
  after.played > before.played implies before.available
pure def sometimesPlayedTwiceApart(h: Haptics): bool = h.played >= 2 and h.last == LongPress
```
