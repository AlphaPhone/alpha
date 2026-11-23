# Entry

Opening the assistant from outside the app: the system assist gesture or
power-button hold, the always-on listener's handoff, and the assistant
Quick Settings tile. Android classifies each invocation (`DailyApps`
`assistantInvoked`, read once with `take`); the renderer opens the chat
full for any of them and starts voice only for a listener or system
invocation made on an unlocked phone within 5 s, or within 15 s when a cold
start adopted it for the same account. A plain assist invocation, and
anything read from an older surface, never starts voice. Each invocation is
taken once.

## Story: Summon my assistant from anywhere on the phone

> As the owner, I want the assist gesture to open my assistant at once and
> start listening only when I asked by voice on an unlocked phone, so that
> a pocket press never opens a microphone.

### An invocation opens the chat once, and starts voice only when it came by voice, unlocked, fresh and for this account

```quint
type Origin = NoOrigin | AssistOrigin | ListenerOrigin | SystemOrigin
type Summons = {
  origin: Origin, lockedAt: bool, ageMs: int, adopted: bool, coldAccount: int, account: int, locked: bool,
  opens: int, voiceStarts: int, takes: int,
}
pure val initial: Summons = {
  origin: NoOrigin, lockedAt: true, ageMs: 0, adopted: false, coldAccount: 0, account: 1, locked: false,
  opens: 0, voiceStarts: 0, takes: 0,
}
pure val freshMs = 5000
pure val adoptedFreshMs = 15000
pure def byVoice(o: Origin): bool = o == ListenerOrigin or o == SystemOrigin
pure def startsVoice(s: Summons): bool =
  byVoice(s.origin) and not(s.lockedAt or s.locked) and s.ageMs <= (if (s.adopted) adoptedFreshMs else freshMs)
  and (s.adopted implies s.coldAccount == s.account)
pure def canInvoke(s: Summons, origin: Origin, cold: bool): bool = origin != NoOrigin
pure def invoke(s: Summons, origin: Origin, cold: bool): Summons =
  { ...s, origin: origin, lockedAt: s.locked, ageMs: 0, adopted: false,
    coldAccount: if (cold and byVoice(origin) and not(s.locked)) s.account else 0 }
pure def canAdopt(s: Summons): bool = s.coldAccount != 0 and not(s.adopted) and s.coldAccount == s.account and s.ageMs <= adoptedFreshMs
pure def adopt(s: Summons): Summons = { ...s, adopted: true }
pure def canElapse(s: Summons, ms: int): bool = ms >= 1 and s.origin != NoOrigin
pure def elapse(s: Summons, ms: int): Summons = { ...s, ageMs: s.ageMs + ms }
pure def canLockChanges(s: Summons, locked: bool): bool = s.locked != locked
pure def lockChanges(s: Summons, locked: bool): Summons = { ...s, locked: locked }
pure def accountChanges(s: Summons): Summons = { ...s, account: s.account + 1 }
pure def canTake(s: Summons, foreground: bool): bool = s.origin != NoOrigin
pure def take(s: Summons, foreground: bool): Summons =
  if (not(foreground)) s
  else { ...s, origin: NoOrigin, opens: s.opens + 1, voiceStarts: s.voiceStarts + (if (startsVoice(s)) 1 else 0), takes: s.takes + 1 }
pure def alwaysVoiceStartsOnlyForVoiceInvocations(s: Summons): bool = s.voiceStarts <= s.opens and s.opens == s.takes
pure def stepAnAssistGestureNeverStartsVoice(before: Summons, via: str, after: Summons): bool =
  (via == "take" and not(byVoice(before.origin))) implies after.voiceStarts == before.voiceStarts
pure def stepALockedInvocationNeverStartsVoice(before: Summons, via: str, after: Summons): bool =
  (via == "take" and (before.lockedAt or before.locked)) implies after.voiceStarts == before.voiceStarts
pure def stepAStaleInvocationNeverStartsVoice(before: Summons, via: str, after: Summons): bool =
  (via == "take" and before.ageMs > adoptedFreshMs) implies after.voiceStarts == before.voiceStarts
pure def sometimesVoiceStarted(s: Summons): bool = s.voiceStarts >= 1
pure def sometimesOpenedWithoutVoice(s: Summons): bool = s.opens >= 1 and s.voiceStarts == 0
pure def sometimesAdoptedColdStart(s: Summons): bool = s.adopted and s.voiceStarts == 0 and s.origin != NoOrigin
pure val msValues = Set(1, 5000, 10001)
```

### The tile opens the assistant only through its own launch, and waits for unlock on a locked phone

The tile carries no authority: a tap on a locked phone waits for the unlock
and opens the assistant then; it never starts voice.

```quint
pure def tileLaunches(locked: bool, unlocked: bool): bool = not(locked) or unlocked
pure def lawALockedTileWaitsForUnlock(locked: bool): bool = locked implies not(tileLaunches(locked, false))
```

### On the assistant surface, its launch is taken once, and closing the chat with no app open closes the surface

When Android opened Alpha as the system assistant (its own assist
activity), the renderer takes that launch's invocation once
(`Agent.takeInvocation`), as an invocation of its origin; a locked or
unknown keyguard never starts voice. Hiding the chat while no app is open
closes the assistant surface (`DailyApps.closeAssistant`), back to what was
in front before.

```quint
pure def takesLaunch(assistantSurface: bool, taken: bool): bool = assistantSurface and not(taken)
pure def closesSurface(assistantSurface: bool, chatHidden: bool, appOpen: bool): bool = assistantSurface and chatHidden and not(appOpen)
pure def lawALaunchIsTakenOnce(surface: bool): bool = not(takesLaunch(surface, true))
pure def lawTheMainSurfaceNeverCloses(hidden: bool, open: bool): bool = not(closesSurface(false, hidden, open))
pure def lawAnOpenAppKeepsTheSurface(surface: bool, hidden: bool): bool = not(closesSurface(surface, hidden, true))
```
