# Microphone

The renderer's side of the microphone: which voice surface owns it, under which ticket, and why a
start was refused. The process-wide slot, its release receipts and the draft handoff are the os
package's (`spec/os/voice/microphone.md`); the shell reports Android's permission answer, the
call state, the page's visibility and each open and release as events.

## Domain

### The microphone holds its owner, the ticket of the current capture, whether it opened, the permission and why the last start was refused

```quint
type MicOwner = NoOwner | AssistantCapture | DictationCapture
type Permission = Unasked | Granted | Denied
type MicRefusal = NoRefusal | RefusedDenied | RefusedCall | RefusedBackground
type Microphone = { owner: MicOwner, ticket: int, open: bool, permission: Permission, callActive: bool, foreground: bool,
  refusal: MicRefusal, replaced: int }
pure val initial: Microphone = { owner: NoOwner, ticket: 0, open: false, permission: Unasked, callActive: false, foreground: true,
  refusal: NoRefusal, replaced: 0 }
pure val ticketValues = Set(1, 2, 3)
```

## Story: One voice surface at a time hears me

> As the owner, I want only the surface I am using to have my microphone, never while I am on a
> call or Alpha is in the background, so that I always know what is listening.

### A capture starts only in front, outside a call and with permission not refused, and a new one replaces the last

The replaced capture's later open or release changes nothing.

```quint
pure def canAcquire(m: Microphone, who: MicOwner): bool = who != NoOwner
pure def acquire(m: Microphone, who: MicOwner): Microphone =
  if (m.permission == Denied) { ...m, refusal: RefusedDenied }
  else if (m.callActive) { ...m, refusal: RefusedCall }
  else if (not(m.foreground)) { ...m, refusal: RefusedBackground }
  else { ...m, owner: who, ticket: m.ticket + 1, open: false, refusal: NoRefusal, replaced: m.replaced + (if (m.owner != NoOwner) 1 else 0) }
pure def canOpened(m: Microphone, ticket: int): bool = m.owner != NoOwner and ticket == m.ticket and not(m.open)
pure def opened(m: Microphone, ticket: int): Microphone = { ...m, open: true }
pure def canRelease(m: Microphone, ticket: int): bool = m.owner != NoOwner and ticket == m.ticket
pure def release(m: Microphone, ticket: int): Microphone = { ...m, owner: NoOwner, open: false }
pure def alwaysAnOpenCaptureHasAnOwner(m: Microphone): bool = m.open implies m.owner != NoOwner
pure def alwaysAnOwnedCaptureWasAdmitted(m: Microphone): bool =
  m.owner != NoOwner implies (m.permission != Denied and not(m.callActive) and m.foreground and m.ticket >= 1)
pure def sometimesReplaced(m: Microphone): bool = m.replaced >= 1 and m.open
pure def sometimesRefusedForACall(m: Microphone): bool = m.refusal == RefusedCall
```

### A call, leaving the screen or a revoked permission ends the capture at once

Nothing reopens the microphone by itself afterwards; voice starts again only when the owner starts it.

```quint
pure def canCallChanged(m: Microphone, active: bool): bool = active != m.callActive
pure def callChanged(m: Microphone, active: bool): Microphone =
  if (active) { ...m, owner: NoOwner, open: false, callActive: true } else { ...m, callActive: false }
pure def canForegroundChanged(m: Microphone, inFront: bool): bool = inFront != m.foreground
pure def foregroundChanged(m: Microphone, inFront: bool): Microphone =
  if (inFront) { ...m, foreground: true } else { ...m, owner: NoOwner, open: false, foreground: false }
pure def canPermissionAnswered(m: Microphone, granted: bool): bool = true
pure def permissionAnswered(m: Microphone, granted: bool): Microphone =
  if (granted) { ...m, permission: Granted } else { ...m, owner: NoOwner, open: false, permission: Denied }
pure def stepNothingReopensByItself(before: Microphone, via: str, after: Microphone): bool =
  (before.owner == NoOwner and after.owner != NoOwner) implies via == "acquire"
```

## Story: Recover from a refused microphone

> As the owner, I want a refused microphone to tell me how to allow it on my phone, so that I am
> never stuck without voice.

### Open app settings is offered only on the phone, for a refused permission, while nothing records

A browser's message names its own site settings and offers no button.

```quint
pure def deniedSettingsOffered(native: bool, m: Microphone): bool = native and m.permission == Denied and m.owner == NoOwner
pure val mValues = Set(initial, { ...initial, permission: Denied }, { ...initial, permission: Granted, owner: AssistantCapture, ticket: 1 })
pure def lawOnlyAPhoneOffersAppSettings(m: Microphone): bool = not(deniedSettingsOffered(false, m))
pure def sometimesDenied(m: Microphone): bool = deniedSettingsOffered(true, m) and m.refusal == RefusedDenied
```

## Story: See my voice as I speak

> As the owner, I want the level of my voice drawn while the microphone is open, from the audio it
> actually records, so that I can tell it hears me.

### Levels are drawn only from the open capture, as 44 bars between 4 and 48 units high

A peak or level outside 0 to 1 is not a measurement and draws nothing.

```quint
pure val levelBars = 44
pure val barFloor = 4
pure val barRange = 44
pure def barHeight(levelPermille: int): int =
  barFloor + (if (levelPermille <= 0) 0 else if (levelPermille >= 250) barRange else levelPermille * barRange * 4 / 1000)
pure val levelPermilleValues = Set(-1, 0, 100, 250, 1000)
pure def lawABarStaysInItsRange(levelPermille: int): bool = barHeight(levelPermille) >= barFloor and barHeight(levelPermille) <= barFloor + barRange
pure def levelsShown(m: Microphone): bool = m.open
```
