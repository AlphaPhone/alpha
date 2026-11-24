# Speech out loud

Alpha reading something aloud for the owner: a message in a conversation,
a note, or a page in the browser. One reader is heard at a time, and a new
reading waits until the audio of the one before has been confirmed
stopped. Alpha's spoken replies in a conversation belong to
[Voice](./index.md), which keeps them to the current turn.

## Story: Listen to a message, a note or a page

> As the owner, I want Alpha to read something to me, stop when I ask, and
> never talk over itself.

### The speaker holds what it is reading, the ticket of that reading, its stage, whether earlier audio is still being stopped, and how the last reading ended

A reading waits for earlier audio to stop, is prepared, then plays; the
speaker is silent otherwise. A reading ends once: finished, failed, stopped,
or unavailable when speech cannot be used.

```quint
type Text = Message | Note | Page
type Stage = Silent | Waiting | Preparing | Playing
type Outcome = Unread | Pending | Finished | Failed | Stopped | Unavailable
type Speaker = { text: Text, item: int, ticket: int, stage: Stage, retiring: bool, started: bool, outcome: Outcome, latched: bool }

pure val initial: Speaker =
  { text: Message, item: 0, ticket: 0, stage: Silent, retiring: false, started: false, outcome: Unread, latched: false }

type Effect = Prepare({ ticket: int, text: Text, item: int }) | Silence({ reading: int })
type Spoken = { state: Speaker, out: List[Effect] }

pure val whichValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
```

### Choosing something to read replaces the reading before it; choosing what is being read stops it

The audio of the reading it replaces must stop first.

```quint
pure def reading(s: Speaker): bool = s.stage != Silent

pure def audible(s: Speaker): bool = s.stage == Preparing or s.stage == Playing

pure def silence(s: Speaker): List[Effect] = if (audible(s)) List(Silence({ reading: s.ticket })) else List()

pure def canRead(s: Speaker, text: Text, which: int): bool = not(s.latched) and which > 0

pure def read(s: Speaker, text: Text, which: int): Spoken =
  val retiring = s.retiring or audible(s)
  val fresh = { ...s, text: text, item: which, ticket: s.ticket + 1, retiring: retiring, started: false, outcome: Pending }
  if (reading(s) and s.text == text and s.item == which)
    { state: { ...s, stage: Silent, retiring: retiring, outcome: Stopped }, out: silence(s) }
  else if (retiring) { state: { ...fresh, stage: Waiting }, out: silence(s) }
  else { state: { ...fresh, stage: Preparing }, out: List(Prepare({ ticket: s.ticket + 1, text: text, item: which })) }
```

### A reading waiting behind earlier audio is prepared once that audio is confirmed stopped; if it cannot be confirmed, reading aloud closes until Alpha restarts

The owner is told "Speech could not be stopped. Restart Alpha."

```quint
pure def canCleaned(s: Speaker, confirmed: bool): bool = s.retiring

pure def cleaned(s: Speaker, confirmed: bool): Spoken =
  if (not(confirmed))
    { state: { ...s, retiring: false, latched: true, stage: Silent, outcome: if (s.stage == Waiting) Unavailable else s.outcome }, out: List() }
  else if (s.stage == Waiting)
    { state: { ...s, retiring: false, stage: Preparing }, out: List(Prepare({ ticket: s.ticket, text: s.text, item: s.item })) }
  else { state: { ...s, retiring: false }, out: List() }
```

### Only the current reading's audio plays, and it ends once, as its own answer says

Audio that ended, failed or was stopped must still be confirmed stopped
before the next reading plays.

```quint
pure def canReady(s: Speaker, ticket: int, ok: bool): bool = s.stage == Preparing and ticket == s.ticket

pure def ready(s: Speaker, ticket: int, ok: bool): Speaker =
  if (ok) { ...s, stage: Playing, started: true }
  else { ...s, stage: Silent, retiring: true, outcome: if (s.text == Note) Unavailable else Failed }

pure def canEnded(s: Speaker, ticket: int, ok: bool): bool = s.stage == Playing and ticket == s.ticket

pure def ended(s: Speaker, ticket: int, ok: bool): Speaker =
  { ...s, stage: Silent, retiring: true, outcome: if (ok) Finished else Failed }
```

### Stopping, or losing what is read (another conversation, another screen, a hidden page, a closed chat), stops the reading

```quint
pure def canStop(s: Speaker): bool = reading(s)

pure def stop(s: Speaker): Spoken =
  { state: { ...s, stage: Silent, retiring: s.retiring or audible(s), outcome: Stopped }, out: silence(s) }
```

### One reader is heard at a time: nothing is prepared or played while earlier audio is still stopping

```quint
pure def alwaysOneReaderAudible(s: Speaker): bool =
  (audible(s) implies not(s.retiring)) and (s.stage == Waiting implies s.retiring)
```

### A reading ends once, and only a reading that played can have finished

Discovered by the proof: playing audio has started, and a reading under way
has a ticket of its own.

```quint
pure def alwaysAnOutcomeOnlyWhenSilent(s: Speaker): bool =
  (s.outcome == Pending iff reading(s)) and (s.outcome == Finished implies s.started)
    and (s.stage == Playing implies s.started) and (reading(s) implies s.ticket > 0) and s.ticket >= 0

pure def stepOneOutcomePerReading(before: Speaker, after: Speaker): bool =
  (after.ticket == before.ticket and before.outcome != Pending) implies after.outcome == before.outcome
```

### Each step asks for at most one thing, and a reading is prepared only for its own ticket while nothing else is heard

```quint
pure def stepPreparedOnlyWhenNothingElseIsHeard(before: Speaker, after: Speaker, out: List[Effect]): bool =
  out.length() <= 1
    and out.every(e => match e { | Prepare(p) => p.ticket == after.ticket and after.stage == Preparing and not(after.retiring) | _ => true })
```

### Once reading aloud has closed it reads nothing more

```quint
pure def alwaysAClosedSpeakerIsSilent(s: Speaker): bool = s.latched implies (s.stage == Silent and not(s.retiring))
```

### A reading can wait behind the one it replaced, play, finish, be stopped by choosing it again, and reading aloud can close

```quint
pure def sometimesWaitingBehindEarlierAudio(s: Speaker): bool = s.stage == Waiting and s.ticket >= 2

pure def sometimesNoteReplacesMessage(s: Speaker): bool = s.stage == Playing and s.text == Note and s.ticket >= 2

pure def sometimesFinished(s: Speaker): bool = s.outcome == Finished

pure def sometimesToggledOff(s: Speaker): bool = s.outcome == Stopped and s.ticket == 1

pure def sometimesClosed(s: Speaker): bool = s.latched and s.outcome == Unavailable
```
