# Settings vocabulary

What every Settings page says about the phone, in the words Android allows. A fact Android did not
answer is unknown, and unknown is never drawn as off.

## Story: See only what Android reported

> As the owner, I want Settings to show a switch, a grant or a role only as Android reported it,
> so that a value it could not read never looks like a choice I made.

### A reported switch is on or off, and anything else is unknown

```quint
type Switch = On | Off | Unknown
pure def switchOf(reported: bool, value: bool): Switch = if (not(reported)) Unknown else if (value) On else Off
pure def lawAnUnreportedSwitchIsUnknown(value: bool): bool = switchOf(false, value) == Unknown
```

### A permission is allowed, partial, asks, denied or unread, and only a grant is allowed

Photos may be all, the ones chosen, or limited; files may be all or chosen files; each of these is
partial unless it is all.

```quint
type Access = Allowed | Partial | Asks | Denied | Unread
pure def accessOf(reported: bool, granted: bool): Access = if (not(reported)) Unread else if (granted) Allowed else Denied
pure def lawAnUnreadGrantIsNeverDenied(granted: bool): bool = accessOf(false, granted) == Unread
```

### A browser's permission answer is allowed, asks or denied, and no answer is unread

```quint
type BrowserAnswer = Granted | Prompt | Refused | NoAnswer
pure def accessOfBrowser(answer: BrowserAnswer): Access =
  if (answer == Granted) Allowed else if (answer == Prompt) Asks else if (answer == Refused) Denied else Unread
pure def lawABrowserPromptAsks(answer: BrowserAnswer): bool = (answer == Prompt) iff (accessOfBrowser(answer) == Asks)
```

### A role is held by Alpha, by another app, by none that Android names, or unavailable

An empty or unreadable list of holders never claims that no app holds the role.

```quint
type RoleHold = HeldByAlpha | HeldElsewhere | NotHeldByAlpha | RoleUnavailable | RoleUnread
pure def roleOf(read: bool, available: bool, held: bool, otherHolder: bool): RoleHold =
  if (not(read)) RoleUnread else if (not(available)) RoleUnavailable else if (held) HeldByAlpha
  else if (otherHolder) HeldElsewhere else NotHeldByAlpha
pure def lawNoHolderNamedIsNeverNoHolder(available: bool): bool =
  roleOf(true, true, false, false) == NotHeldByAlpha
```

### Do Not Disturb is on for priority, alarms or none, off for all, and unknown otherwise

```quint
type Interruption = InterruptAll | InterruptPriority | InterruptAlarms | InterruptNone | InterruptUnread
pure def dndOf(filter: Interruption): Switch =
  if (filter == InterruptAll) Off else if (filter == InterruptUnread) Unknown else On
pure def lawAnUnreadFilterIsUnknown(filter: Interruption): bool = filter == InterruptUnread iff dndOf(filter) == Unknown
```

### Wi-Fi is on when Android reports the switch, or an active Wi-Fi transport without it

No active transport does not prove Wi-Fi is off: it may be on and disconnected.

```quint
pure def wifiOf(reported: bool, enabled: bool, active: bool): Switch =
  if (reported) switchOf(true, enabled) else if (active) On else Unknown
pure def lawAnInactiveTransportNeverTurnsWifiOff(active: bool): bool = wifiOf(false, false, active) != Off
```
