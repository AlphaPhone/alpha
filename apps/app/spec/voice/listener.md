# Always-on listener

On the Alpha AOSP image a separate privileged listener can hear its name and open Alpha's voice,
and a press-and-hold of power can too (P-61). The listener, its consent, its crash breaker and the
SystemUI indicator lease are the os package's (`spec/os/voice/listener.md`,
`spec/os/voice/indicatorLease.md`, `spec/os/voice/invocation.md`); the renderer reads the listener's
status, may pause it or turn it off, and takes each invocation once. It can never turn listening on
or resume it. Where the image does not admit the listener (stock Android, or an image that does
not declare it), Alpha's voice is in-chat only and Alpha stops a listener left on at startup.

## Domain

### The renderer holds whether the image admits the listener, the startup stop, what the listener last said, any action in flight and each invocation taken

```quint
type ImageListener = NoListener | ListenerAdmitted
type WakeStop = StopNotNeeded | StopPending | StopConfirmed | StopUnconfirmed
type ListenerMode = Unavailable | ListeningOn | ListeningPaused | ListeningOff | NeedsSetup | StoppedByListener
type Origin = NothingPending | AssistOnly | ListenerWake | SystemGesture | PowerPress
type ListenerEffect = StartVoice | OpenAssistant
type Listener = { booted: bool, image: ImageListener, wakeStop: WakeStop, mode: ListenerMode, microphoneOpen: bool,
  issued: int, busy: bool, actions: int, takes: int, voiceStarts: int, lastOrigin: Origin }
type ListenerStep = { state: Listener, out: List[ListenerEffect] }
pure val initial: Listener = { booted: false, image: NoListener, wakeStop: StopNotNeeded, mode: Unavailable, microphoneOpen: false,
  issued: 0, busy: false, actions: 0, takes: 0, voiceStarts: 0, lastOrigin: NothingPending }
pure def says(out: List[ListenerEffect], l: Listener): ListenerStep = { state: l, out: out }
pure val tokenValues = Set(1, 2, 3)
```

## Story: Use the listener only on the image that admits it

> As the owner of an Alpha phone, I want the listener controls only where the Alpha image admits
> its listener, and a listener left on to be stopped where it does not, so that nothing listens on
> a phone where Alpha does not show it.

### The listener is admitted only on the AOSP variant whose image declares it; elsewhere on Android a listener left on is stopped at startup

Off Android there is nothing to stop.

```quint
pure def canBoot(l: Listener, aosp: bool, declared: bool, android: bool): bool = not(l.booted)
pure def boot(l: Listener, aosp: bool, declared: bool, android: bool): Listener = {
  val admitted = aosp and declared and android
  { ...l, booted: true, image: if (admitted) ListenerAdmitted else NoListener,
    wakeStop: if (admitted or not(android)) StopNotNeeded else StopPending }
}
pure def alwaysWithoutAdmissionNothingIsShownOrTaken(l: Listener): bool =
  l.image == NoListener implies (l.mode == Unavailable and l.takes == 0 and l.voiceStarts == 0 and not(l.busy) and not(l.microphoneOpen))
pure def alwaysAnAdmittedListenerNeedsNoStartupStop(l: Listener): bool =
  l.image == ListenerAdmitted implies l.wakeStop == StopNotNeeded
```

### The startup stop is confirmed only by an off reply, within five seconds, with the microphone closed

A late reply, a reply that is still listening or holds the microphone, a failed call and a missing
bridge confirm nothing; Settings then shows "Wake listening could not be confirmed off. Turn it off
in Android settings."

```quint
pure val stopDeadlineMs = 5000
pure def confirmsStop(inTime: bool, reportedOff: bool, microphoneClosed: bool): bool = inTime and reportedOff and microphoneClosed
pure def canWakeStopAnswered(l: Listener, inTime: bool, reportedOff: bool, microphoneClosed: bool): bool = l.wakeStop == StopPending
pure def wakeStopAnswered(l: Listener, inTime: bool, reportedOff: bool, microphoneClosed: bool): Listener =
  { ...l, wakeStop: if (confirmsStop(inTime, reportedOff, microphoneClosed)) StopConfirmed else StopUnconfirmed }
pure def lawALateOrOpenReplyNeverConfirms(inTime: bool, reportedOff: bool, microphoneClosed: bool): bool =
  confirmsStop(inTime, reportedOff, microphoneClosed) iff (inTime and reportedOff and microphoneClosed)
pure def stepAStopSettlesOnce(before: Listener, via: str, after: Listener): bool =
  (before.wakeStop == StopConfirmed or before.wakeStop == StopUnconfirmed) implies after.wakeStop == before.wakeStop
pure def sometimesStopUnconfirmed(l: Listener): bool = l.wakeStop == StopUnconfirmed
pure def sometimesStopConfirmed(l: Listener): bool = l.wakeStop == StopConfirmed
```

## Story: See and stop what the listener is doing

> As the owner of the Alpha image, I want to see whether the listener is listening and to pause or
> turn it off from Alpha, with the listener's own answer shown, so that I can always stop it and
> never mistake an old status for what it did.

### A status read is shown only when no action runs and nothing newer was issued

An action makes every read before it stale.

```quint
pure def canBeginRead(l: Listener): bool = l.image == ListenerAdmitted and not(l.busy)
pure def beginRead(l: Listener): Listener = { ...l, issued: l.issued + 1 }
pure def canReadAnswered(l: Listener, token: int, mode: ListenerMode, microphoneOpen: bool): bool =
  l.image == ListenerAdmitted and not(l.busy) and token == l.issued and token >= 1
pure def readAnswered(l: Listener, token: int, mode: ListenerMode, microphoneOpen: bool): Listener =
  { ...l, mode: mode, microphoneOpen: microphoneOpen }
```

### Alpha may pause or turn off listening, one action at a time, and never turns it on or resumes it

A stop is offered while the listener listens, is paused or still holds the microphone. Only the
listener's own confirmed answer changes what is shown; an unconfirmed one keeps the last status.

```quint
type Stop = PauseListening | TurnOffListening
pure def canBeginStop(l: Listener, stop: Stop): bool =
  l.image == ListenerAdmitted and not(l.busy) and (l.mode == ListeningOn or l.mode == ListeningPaused or l.microphoneOpen)
pure def beginStop(l: Listener, stop: Stop): Listener = { ...l, busy: true, issued: l.issued + 1, actions: l.actions + 1 }
pure def canStopAnswered(l: Listener, confirmed: bool, mode: ListenerMode): bool =
  l.busy and (confirmed implies (mode != ListeningOn and mode != Unavailable))
pure def stopAnswered(l: Listener, confirmed: bool, mode: ListenerMode): Listener =
  if (confirmed) { ...l, busy: false, mode: mode, microphoneOpen: false } else { ...l, busy: false }
pure val modeValues = Set(ListeningOn, ListeningPaused, ListeningOff, NeedsSetup, StoppedByListener)
pure def stepOnlyTheListenerTurnsListeningOn(before: Listener, via: str, after: Listener): bool =
  (after.mode == ListeningOn and before.mode != ListeningOn) implies via == "readAnswered"
pure def sometimesPausedByTheOwner(l: Listener): bool = l.mode == ListeningPaused and l.actions >= 1 and not(l.busy)
```

## Story: Start voice from my listener or the power button, once

> As the owner of the Alpha image, I want saying the listener's name or holding power to start one
> voice conversation, only while my phone is unlocked and Alpha is in front with nothing over it, so
> that nothing else can open my microphone.

### An invocation starts voice only from a wake, a system gesture or a protected power press, on an unlocked, visible screen with no dialog, no connection prompt and no voice running

Any other launch only opens the assistant. The listener's native bridge binds the signed-in session
and gives each arrival once (`spec/os/voice/invocation.md`).

```quint
pure def startsVoice(origin: Origin): bool = origin == ListenerWake or origin == SystemGesture or origin == PowerPress
pure def canInvocationTaken(l: Listener, origin: Origin, unlocked: bool, visible: bool, dialogOpen: bool, connectionPrompt: bool, voiceActive: bool): bool =
  l.image == ListenerAdmitted and origin != NothingPending
pure def invocationTaken(l: Listener, origin: Origin, unlocked: bool, visible: bool, dialogOpen: bool, connectionPrompt: bool, voiceActive: bool): ListenerStep = {
  val voice = startsVoice(origin) and unlocked and visible and not(dialogOpen) and not(connectionPrompt) and not(voiceActive)
  says(if (voice) List(StartVoice) else List(OpenAssistant),
    { ...l, takes: l.takes + 1, voiceStarts: l.voiceStarts + (if (voice) 1 else 0), lastOrigin: origin })
}
pure def stepVoiceStartsOnlyFromATrustedOriginOnAFreeScreen(before: Listener, via: str, after: Listener, out: List[ListenerEffect]): bool =
  out.includes(StartVoice) implies (via == "invocationTaken" and startsVoice(after.lastOrigin) and after.voiceStarts == before.voiceStarts + 1)
pure def alwaysEachTakeStartsVoiceAtMostOnce(l: Listener): bool = l.voiceStarts >= 0 and l.voiceStarts <= l.takes
pure def lawALockedPhoneNeverStartsVoice(origin: Origin, visible: bool): bool =
  not(invocationTaken({ ...initial, image: ListenerAdmitted, booted: true }, origin, false, visible, false, false, false).out.includes(StartVoice))
pure def sometimesWakeStartedVoice(l: Listener): bool = l.voiceStarts >= 1 and l.lastOrigin == ListenerWake
pure def sometimesPowerOnlyOpened(l: Listener): bool = l.lastOrigin == PowerPress and l.voiceStarts == 0
```
