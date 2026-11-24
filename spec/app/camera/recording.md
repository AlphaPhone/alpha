# Recording

A video recorded in the [Camera](./index.md): its timer, the limits that
stop it, and how it ends. A recording cut by its size limit keeps what fits,
and is called saved only once the phone has checked what it kept. One
interrupted by a call or another app keeps what was recorded. One whose
recorder fails, or that the phone does not finish in time, is broken. Each recording
ends exactly once. Camera holds the recording and decides when its preview,
its microphone and its owner allow one.

## Domain

### A recording and its limits

A recording is idle, opening, running, stopping, being checked after the
size limit cut it, or ended as saved, empty or broken, and may have been
interrupted. It runs with sound or without, from the moment the phone said it started, and stops by itself at
five minutes or 100 MB. A stop the phone has not finished within ten seconds
breaks it.

```quint
type Stage = Idle | Opening | Running | Stopping | Checking | Saved | Empty | Broken

type Film = {
  stage: Stage, sound: bool, since: int, elapsed: int, bytes: int, truncated: bool, preempted: bool,
  deadline: int, checked: bool, video: int,
}

pure val maxBytes = 104857600
pure val maxSeconds = 300
pure val stopGrace = 10000
pure val second = 1000

pure val initial: Film = {
  stage: Idle, sound: false, since: 0, elapsed: 0, bytes: 0, truncated: false, preempted: false,
  deadline: 0, checked: false, video: 0,
}

pure def recording(f: Film): bool = f.stage == Opening or f.stage == Running or f.stage == Stopping

pure def pending(f: Film): bool = recording(f) or f.stage == Checking

pure def finished(f: Film): bool = f.stage == Saved or f.stage == Empty or f.stage == Broken

pure def stopping(now: int, f: Film): Film = { ...f, stage: Stopping, deadline: now + stopGrace }
```

### What the simulator tries

```quint
pure val pieceValues = Set(41943040, 73400320)
pure val nowValues = Set(0, 150000, 300000, 450000)
pure val videoValues = Set(0, 7)
pure val weight_chunk = 3
```

## Story: Record a video

> As the owner, I want a running timer while I record, everything I
> recorded kept even when it hits the limit, and to be told honestly when a
> recording could not be saved.

### A recording starts, with sound or without, only when none is under way

```quint
pure def canStart(f: Film): bool = not(pending(f))

pure def start(f: Film, sound: bool): Film = { ...initial, stage: Opening, sound: sound }
```

### The phone says whether the recording started; one that did not is broken

```quint
pure def canStarted(f: Film): bool = f.stage == Opening

pure def started(f: Film, ok: bool, now: int): Film =
  if (ok) { ...f, stage: Running, since: now } else { ...f, stage: Broken }
```

### The timer runs forward from the recording's start, and five minutes stops it

```quint
pure def canTick(f: Film, now: int): bool = f.stage == Running and now >= f.since + f.elapsed * second

pure def tick(f: Film, now: int): Film =
  val seconds = (now - f.since) / second
  val timed = { ...f, elapsed: if (seconds > maxSeconds) maxSeconds else seconds }
  if (timed.elapsed >= maxSeconds) stopping(now, timed) else timed
```

### Reaching 100 MB stops the recording and keeps what fits: a piece that would not fit is left out, never the whole video

```quint
pure def canChunk(f: Film, piece: int): bool = (f.stage == Running or f.stage == Stopping) and piece > 0

pure def chunk(f: Film, piece: int, now: int): Film =
  val room = f.bytes + piece <= maxBytes
  val kept = if (room) { ...f, bytes: f.bytes + piece } else { ...f, truncated: true }
  if ((not(room) or kept.bytes == maxBytes) and f.stage == Running) stopping(now, kept) else kept
```

### The owner stops a running recording

```quint
pure def canStop(f: Film): bool = f.stage == Running

pure def stop(f: Film, now: int): Film = stopping(now, f)
```

### A recording interrupted by a call or another app taking the camera is stopped, and keeps what was recorded

```quint
pure def canInterrupted(f: Film): bool = f.stage == Running

pure def interrupted(f: Film, now: int): Film = stopping(now, { ...f, preempted: true })
```

### A recording whose recorder fails while it runs or stops is broken

```quint
pure def canFailed(f: Film): bool = f.stage == Running or f.stage == Stopping

pure def failed(f: Film): Film = { ...f, stage: Broken }
```

### A stop the phone does not finish in time breaks the recording

```quint
pure def canTimedOut(f: Film, now: int): bool = f.stage == Stopping and now >= f.deadline

pure def timedOut(f: Film, now: int): Film = { ...f, stage: Broken }
```

### A stopped recording ends as the phone finished it: empty when it holds nothing, checked first when the limit cut it

```quint
pure def canEnded(f: Film): bool = f.stage == Stopping

pure def ended(f: Film, ok: bool, video: int): Film =
  if (f.bytes == 0) { ...f, stage: Empty }
  else if (not(ok) or video <= 0) { ...f, stage: Broken }
  else if (f.truncated) { ...f, stage: Checking, video: video }
  else { ...f, stage: Saved, video: video }
```

### A recording the limit cut is saved only once the phone confirmed what it kept

```quint
pure def canVerified(f: Film): bool = f.stage == Checking

pure def verified(f: Film, ok: bool): Film =
  if (ok) { ...f, stage: Saved, checked: true } else { ...f, stage: Broken, video: 0 }

pure def alwaysSavedIsWhole(f: Film): bool =
  (f.stage == Saved implies (f.video > 0 and f.bytes > 0 and (f.truncated implies f.checked)))
    and (f.stage == Checking implies (f.truncated and f.video > 0 and f.bytes > 0))
```

### A recording runs within five minutes and 100 MB, and one opening holds nothing yet

Discovered by the proof: without the last, a recording could seem to start
already over its limit.

```quint
pure def alwaysWithinLimits(f: Film): bool =
  f.bytes >= 0 and f.bytes <= maxBytes and f.elapsed >= 0 and f.elapsed <= maxSeconds
    and (f.stage == Running implies (f.bytes < maxBytes and not(f.truncated) and f.elapsed < maxSeconds))
    and (f.stage == Opening implies (f.bytes == 0 and f.elapsed == 0 and not(f.truncated)))
```

### A recording is settled exactly once

Only a recording being stopped is finished or times out, only one being
checked is confirmed, only one running or stopping is lost, and one that has
ended changes only when a new one starts.

```quint
pure def stepSettledOnce(before: Film, via: str, after: Film): bool =
  (via == "ended" implies before.stage == Stopping)
    and (via == "timedOut" implies before.stage == Stopping)
    and (via == "verified" implies before.stage == Checking)
    and (via == "failed" implies (before.stage == Running or before.stage == Stopping))
    and ((finished(after) and not(finished(before))) implies Set("started", "ended", "timedOut", "verified", "failed").contains(via))
    and (finished(before) implies (via == "start" or (after.stage == before.stage and after.video == before.video)))
```

### Neither the limit nor an interruption discards what was recorded

```quint
pure def stepTheLimitKeepsWhatWasRecorded(before: Film, via: str, after: Film): bool =
  (via == "chunk" implies (after.bytes >= before.bytes and after.stage != Empty and after.stage != Broken))
    and (via == "interrupted" implies (after.stage == Stopping and after.bytes == before.bytes))
    and ((via == "ended" and before.bytes > 0) implies after.stage != Empty)
```

### A recording that hit the limit can be saved

```quint
pure def sometimesTruncatedSaved(f: Film): bool = f.stage == Saved and f.truncated
```

### A recording can be checked after the limit cut it

```quint
pure def sometimesChecking(f: Film): bool = f.stage == Checking
```

### A recording can hold nothing

```quint
pure def sometimesEmpty(f: Film): bool = f.stage == Empty
```

### A recording can be interrupted and still be saved

```quint
pure def sometimesInterruptedSaved(f: Film): bool = f.stage == Saved and f.preempted
```

### A recording can be lost part way

```quint
pure def sometimesLost(f: Film): bool = f.stage == Broken and f.bytes > 0 and f.video == 0
```

### A recording can run without sound

```quint
pure def sometimesSilent(f: Film): bool = f.stage == Running and not(f.sound)
```

### A recording being stopped or checked ends

If the phone answers, or the clock passes the stop's deadline, a stopped
recording comes to an end; if the phone answers, a checked one does.

```quint
pure def leadsToStopEnds(f: Film, later: Film): bool = f.stage == Stopping implies later.stage != Stopping

pure def leadsToCheckEnds(f: Film, later: Film): bool = f.stage == Checking implies later.stage != Checking

pure val fair_ended = "weak"
pure val fair_verified = "weak"
```

## Story: Read the clock

> As the owner, I want the recording timer and the trim handles to read as
> minutes, seconds and tenths, never as 0:60.0.

### A time in tenths of a second reads as minutes, seconds below sixty and tenths

```quint
type Clock = { minutes: int, seconds: int, tenths: int }

pure def clock(time: int): Clock = { minutes: time / 600, seconds: (time % 600) / 10, tenths: time % 10 }

pure def lawClockSecondsBelowSixty(time: int): bool =
  val c = clock(time)
  time >= 0 implies (c.seconds >= 0 and c.seconds < 60 and c.tenths >= 0 and c.tenths < 10 and c.minutes * 600 + c.seconds * 10 + c.tenths == time)
```

### The timer shows the recording's elapsed time on the clock

```quint
pure def timer(f: Film): Clock = clock(f.elapsed * 10)
```
