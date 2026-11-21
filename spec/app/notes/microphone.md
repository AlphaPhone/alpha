# The microphone

Allowing the microphone for a voice note: Android's prompt, asked once, a
recording queued behind it, and Android's Settings once the answer was no.
The permission itself is [the kit's](../../kit/permission.md);
[recording](./recording.md) starts only while it allows the microphone.

## Story: Allow the microphone for a voice note

> As the owner, I want Record voice note to ask for the microphone when
> Alpha lacks it and then start recording, and to send me to Android's
> Settings once I said no.

### The microphone's permission, whether Android's prompt is open, and the recording waiting behind it with the folder it is for

```quint
import permission as P from "../../kit/permission"
import note.* from "./note"

type Microphone = { owner: int, mic: P::Permission, asking: bool, queued: bool, folder: int, started: bool }

pure val initial: Microphone = { owner: 0, mic: P::unasked, asking: false, queued: false, folder: 0, started: false }
```

### What allowing the microphone asks of the phone

To show Android's prompt, to start the recording that waited for it, and to
open Android's Settings for Alpha.

```quint
type Effect =
  | AsksMicrophone
  | Records({ folder: int })
  | OpensSettings
type Moved = { state: Microphone, out: List[Effect] }
```

### What the simulator tries

```quint
pure val grantValues = Set(P::Granted, P::Denied)
pure val folderValues = Set(0, 2)
pure val ownerValues = Set(0, 1, 2)
```

### The phone reports what Android allows

What Android reports replaces what Alpha believed, also when the owner
changed it in Settings.

```quint
pure def canReported(m: Microphone, grant: P::Grant, by: Actor): bool = by == Phone and not(m.asking)

pure def reported(m: Microphone, grant: P::Grant, by: Actor): Microphone = { ...m, mic: P::observe(m.mic, grant) }
```

### Record voice note asks for the microphone when Alpha lacks it and has never asked, and the recording waits behind Android's prompt

Recording needs the owner's notes available (Notes, "Nothing new can be
made while the notes are unavailable or storage has failed"), and nothing
else of Notes open. While the microphone is allowed, Record voice note
starts the recorder at once ([Recording](./recording.md), "A new recording
starts only when no recording is unfinished, and is made in the folder the
list is narrowed to").

```quint
pure def canAsk(m: Microphone, available: bool, folder: int, covered: bool, by: Actor): bool =
  mayOpen(covered, by) and isOwner(m.owner) and available and not(m.asking) and P::canAsk(m.mic) and folder >= 0

pure def ask(m: Microphone, available: bool, folder: int, covered: bool, by: Actor): Moved =
  { state: { ...m, mic: P::ask(m.mic), asking: true, queued: true, folder: folder, started: false }, out: List(AsksMicrophone) }
```

### Android answers, and the recording waiting starts only if the microphone is now allowed, Notes is still in front, no call is on, nothing plays and the recorder is free

The phone says whether all of those hold now: the recorder's own guards
for starting. A recording that cannot start then is dropped, not kept for
later.

```quint
pure def canAnswered(m: Microphone, grant: P::Grant, ready: bool, by: Actor): bool = by == Phone and m.asking

pure def answered(m: Microphone, grant: P::Grant, ready: bool, by: Actor): Moved =
  val mic = P::observe(m.mic, grant)
  val starts = m.queued and P::allows(mic) and ready
  { state: { ...m, mic: mic, asking: false, queued: false, started: starts },
    out: if (starts) List(Records({ folder: m.folder })) else List() }
```

### Once the owner said no, Record voice note offers Android's Settings instead of asking again

```quint
pure def canOpenSettings(m: Microphone, by: Actor): bool = by == Owner and P::needsSettings(m.mic) and not(m.asking)

pure def openSettings(m: Microphone, by: Actor): Moved = { state: m, out: List(OpensSettings) }
```

### Android's prompt is shown at most once, and a recording waits only behind it

```quint
pure def alwaysOnePrompt(m: Microphone): bool =
  (m.asking implies (m.mic.asked and isOwner(m.owner))) and (m.queued implies m.asking) and m.folder >= 0

pure def stepAskedOnce(before: Microphone, via: str, after: Microphone, out: List[Effect]): bool =
  out.every(e => match e {
    | AsksMicrophone => not(before.mic.asked) and not(P::allows(before.mic)) and after.asking
    | Records(r) => via == "answered" and before.queued and P::allows(after.mic) and r.folder == before.folder
    | OpensSettings => P::needsSettings(before.mic)
  })
```

### The microphone can be asked for, refused for good, and allowed with the recording then started

```quint
pure def sometimesAsking(m: Microphone): bool = m.asking and m.queued and m.folder > 0

pure def sometimesDenied(m: Microphone): bool = P::needsSettings(m.mic) and not(P::allows(m.mic)) and not(m.asking)

pure def sometimesAllowedThenStarted(m: Microphone): bool = m.started and P::allows(m.mic)
```

## Story: Leave Notes while Android asks

> As the owner, I want a recording I asked for and then left behind never
> to start by itself.

### Leaving Notes drops the recording waiting behind the prompt and leaves the prompt open; a restart or another owner drops the prompt too

Android's own prompt stays until it is answered; its answer then starts
nothing.

```quint
pure def left(m: Microphone): Microphone = { ...m, queued: false }

pure def canRestart(m: Microphone, by: Actor): bool = by == Phone

pure def restart(m: Microphone, by: Actor): Microphone = { ...m, asking: false, queued: false }

pure def canOwnerChanged(m: Microphone, owner: int, by: Actor): bool = by == Phone and owner != m.owner and owner >= 0

pure def ownerChanged(m: Microphone, owner: int, by: Actor): Microphone = { ...m, owner: owner, asking: false, queued: false, started: false }

pure def stepNothingStartsBehindTheOwner(before: Microphone, via: str, after: Microphone): bool =
  (via == "left" or via == "restart" or via == "ownerChanged") implies not(after.queued)

pure def sometimesLeftWhileAsking(m: Microphone): bool = m.asking and not(m.queued)
```
