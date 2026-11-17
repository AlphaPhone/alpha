# Attempt

One effect outside Alpha: a message sent, an event written, a file deleted.
Alpha records it before sending it, sends it once, and says honestly how it
ended, including when it cannot know.

## Story: Do something outside, once

> As the owner, I want an action I approved to happen at most once, and to
> be told when Alpha cannot tell whether it happened.

### An attempt is planned, recorded, sent, and then confirmed, refused or unknown

```quint
type Outcome = Planned | Recorded | Sent | Confirmed | Refused | Unknown
type Attempt = { id: int, outcome: Outcome }

pure def plan(id: int): Attempt = { id: id, outcome: Planned }
```

### An attempt is recorded before it is sent, and one that was refused may be recorded again under its own number

```quint
pure def canRecord(a: Attempt): bool = a.outcome == Planned or a.outcome == Refused

pure def record(a: Attempt): Attempt = { ...a, outcome: Recorded }
```

### Only a recorded attempt is sent

```quint
pure def canDispatch(a: Attempt): bool = a.outcome == Recorded

pure def dispatch(a: Attempt): Attempt = { ...a, outcome: Sent }
```

### A sent attempt ends as its own answer says, or as unknown when no answer can be trusted

```quint
pure def canConclude(a: Attempt, id: int): bool = a.outcome == Sent and id == a.id

pure def conclude(a: Attempt, confirmed: bool, known: bool): Attempt =
  { ...a, outcome: if (not(known)) Unknown else if (confirmed) Confirmed else Refused }

pure def ended(a: Attempt): bool = a.outcome == Confirmed or a.outcome == Refused or a.outcome == Unknown
```

### An attempt whose outcome is unknown, or confirmed, is never recorded or sent again

```quint
pure def lawAnUnknownOutcomeIsNeverRetried(id: int, confirmed: bool): bool =
  val a = conclude({ id: id, outcome: Sent }, confirmed, false)
  not(canRecord(a)) and not(canDispatch(a))

pure def lawAConfirmedAttemptIsNeverRepeated(id: int): bool =
  val a = conclude({ id: id, outcome: Sent }, true, true)
  not(canRecord(a)) and not(canDispatch(a))
```

### A retry keeps the number of the attempt it retries

```quint
pure def lawARetryKeepsItsNumber(id: int): bool =
  dispatch(record({ id: id, outcome: Refused })).id == id
```
