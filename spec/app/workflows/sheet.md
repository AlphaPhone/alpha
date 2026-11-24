# Sheet

A workflow's history and the sheet of one run: the runs the agent kept,
read page by page, and one run opened with its output, read aloud on
request, and handed to Ask Alpha. A removed workflow keeps its history.

The run's status as reported, the workflow's newest version and whether
it was removed are facts of [Runs](./runs.md) and [Workflows](./index.md),
passed in with the events that need them; who is signed in is a fact of
the account area. Run again is the Run now review of [Runs](./runs.md).
The agent keeps the runs (eliza's `workflow/execution`); the phone only
reads them.

## Story: See a workflow's history

> As the owner, I want to see the runs a workflow made, newest first, page
> by page, even after the workflow was removed, and know when there are
> none or they could not be read.

### Sheet holds the owner, the history read with the runs shown and whether more remain, the run open with its output, the speech, and the workflow's version

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import runs as U from "./runs"

type Output = NoOutput | Text | Truncated | Empty
type Effect =
  | ReadRuns({ ticket: int, owner: int, after: int })
  | ReadOutput({ ticket: int, runId: int })
  | Speak({ id: int, runId: int })
  | Silence({ id: int })
  | AskAlpha({ runId: int })
type Sheet = {
  owner: int, history: R::Read, shown: int, more: bool, removed: bool,
  runId: int, status: U::Status, version: int, newest: int,
  output: R::Read, text: Output, speech: A::Attempt,
}
type Moved = { state: Sheet, out: List[Effect] }

pure val maxPage = 20

pure val initial: Sheet = {
  owner: 0, history: R::unread, shown: 0, more: false, removed: false,
  runId: 0, status: U::NoRun, version: 0, newest: 0,
  output: R::unread, text: NoOutput, speech: A::plan(0),
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val runIdValues = Set(0, 1, 2)
pure val countValues = Set(-1, 0, 1, 20, 21)
pure val versionValues = Set(0, 1, 2)
pure val ownerValues = Set(0, 1)
pure val statusValues = Set(U::Running, U::Done, U::Interrupted, U::NoRun)
```

### The history is read for the owner signed in, one page of at most 20 runs at a time, from the start or after the runs shown

A next page that could not be read can be asked for again.

```quint
pure def canReadHistory(s: Sheet, removed: bool): bool = s.owner >= 1 and s.history.status != R::Loading

pure def readHistory(s: Sheet, removed: bool): Moved =
  val asked = R::ask(s.history)
  { state: { ...s, history: asked, shown: 0, more: false, removed: removed },
    out: List(ReadRuns({ ticket: asked.ticket, owner: s.owner, after: 0 })) }

pure def canReadMore(s: Sheet): bool =
  s.shown >= maxPage and ((s.more and s.history.status == R::Loaded) or s.history.status == R::Failed)

pure def readMore(s: Sheet): Moved =
  val asked = R::ask(s.history)
  { state: { ...s, history: asked, more: false }, out: List(ReadRuns({ ticket: asked.ticket, owner: s.owner, after: s.shown })) }

pure def canRunsRead(s: Sheet, ticket: int, count: int): bool = R::canAnswer(s.history, ticket) and 0 <= count and count <= maxPage

pure def runsRead(s: Sheet, ticket: int, ok: bool, count: int, more: bool): Sheet =
  if (ok) { ...s, history: R::answer(s.history, true), shown: s.shown + count, more: more and count == maxPage }
  else { ...s, history: R::answer(s.history, false) }
```

### Each page adds to the runs shown, and more are offered only after a full page

```quint
pure def alwaysTheHistoryIsPaged(s: Sheet): bool = and {
  s.shown >= 0, s.owner >= 0,
  s.more implies (s.shown >= maxPage and s.history.status == R::Loaded),
  s.history.status == R::Loading implies s.owner >= 1,
}
```

### The history can be empty, fail, run to a second page, or be read for a removed workflow

```quint
pure def sometimesTheHistoryIsEmpty(s: Sheet): bool = s.history.status == R::Loaded and s.shown == 0

pure def sometimesTheHistoryFailed(s: Sheet): bool = s.history.status == R::Failed

pure def sometimesTheHistoryHasMore(s: Sheet): bool = s.shown > maxPage

pure def sometimesARemovedWorkflowKeepsItsHistory(s: Sheet): bool = s.removed and s.history.status == R::Loaded and s.shown >= 1
```

## Story: Read a run's sheet

> As the owner, I want to open a run, read its output whether it is long,
> cut short or empty, hear it read and stop the speech, know when the
> workflow has changed since, and ask Alpha about it.

### Opening a run reads its output, and notes the workflow's newest version

```quint
pure def canOpenRun(s: Sheet, runId: int, status: U::Status, version: int, newest: int): bool =
  runId >= 1 and status != U::NoRun and version >= 1 and newest >= version and s.owner >= 1

pure def openRun(s: Sheet, runId: int, status: U::Status, version: int, newest: int): Moved =
  val asked = R::ask(s.output)
  val silenced = if (s.speech.outcome == A::Sent) List(Silence({ id: s.speech.id })) else List()
  { state: { ...s, runId: runId, status: status, version: version, newest: newest, output: asked, text: NoOutput,
      speech: if (s.speech.outcome == A::Sent) A::conclude(s.speech, false, true) else s.speech },
    out: silenced.append(ReadOutput({ ticket: asked.ticket, runId: runId })) }

pure def canOutputRead(s: Sheet, ticket: int, text: Output): bool = R::canAnswer(s.output, ticket) and text != NoOutput

pure def outputRead(s: Sheet, ticket: int, ok: bool, text: Output): Sheet =
  { ...s, output: R::answer(s.output, ok), text: if (ok) text else NoOutput }
```

### The run's status and the workflow's version are followed while the run is open

```quint
pure def canRunChanged(s: Sheet, runId: int, status: U::Status): bool =
  runId == s.runId and runId >= 1 and s.status == U::Running and U::ended(status)

pure def runChanged(s: Sheet, runId: int, status: U::Status): Sheet = { ...s, status: status }

pure def canWorkflowChanged(s: Sheet, newest: int): bool = s.runId >= 1 and newest > s.newest

pure def workflowChanged(s: Sheet, newest: int): Sheet = { ...s, newest: newest }
```

### The sheet notes when the workflow has a newer version than the run, so Run again would run the newer one

```quint
pure def newerVersion(s: Sheet): bool = s.runId >= 1 and s.newest > s.version

pure def sometimesTheSheetNotesANewerVersion(s: Sheet): bool = newerVersion(s) and s.text == Text
```

### An ended run's output is read aloud when there is some, until it ends or the owner stops it

```quint
pure def canReadAloud(s: Sheet): bool =
  s.runId >= 1 and U::ended(s.status) and (s.text == Text or s.text == Truncated) and s.speech.outcome != A::Sent

pure def readAloud(s: Sheet): Moved =
  val asked = A::dispatch(A::record(A::plan(s.speech.id + 1)))
  { state: { ...s, speech: asked }, out: List(Speak({ id: asked.id, runId: s.runId })) }

pure def canSpeechEnded(s: Sheet, id: int): bool = A::canConclude(s.speech, id)

pure def speechEnded(s: Sheet, id: int): Sheet = { ...s, speech: A::conclude(s.speech, true, true) }

pure def canStopSpeech(s: Sheet): bool = s.speech.outcome == A::Sent

pure def stopSpeech(s: Sheet): Moved =
  { state: { ...s, speech: A::conclude(s.speech, false, true) }, out: List(Silence({ id: s.speech.id })) }
```

### Ask Alpha about a run hands the run to Ask Alpha

```quint
pure def canAskAbout(s: Sheet): bool = s.runId >= 1 and s.owner >= 1

pure def askAbout(s: Sheet): Moved = { state: s, out: List(AskAlpha({ runId: s.runId })) }
```

### Closing the run stops its speech

```quint
pure def canCloseRun(s: Sheet): bool = s.runId >= 1

pure def closeRun(s: Sheet): Moved =
  { state: { ...s, runId: 0, status: U::NoRun, version: 0, newest: 0, output: { ...s.output, status: R::Idle }, text: NoOutput,
      speech: if (s.speech.outcome == A::Sent) A::conclude(s.speech, false, true) else s.speech },
    out: if (s.speech.outcome == A::Sent) List(Silence({ id: s.speech.id })) else List() }
```

### Speech is heard only for the open run's output, once it ended, and never without some to read

```quint
pure def alwaysSpeechIsOfTheOpenRun(s: Sheet): bool = and {
  s.speech.outcome == A::Sent implies (s.runId >= 1 and U::ended(s.status) and (s.text == Text or s.text == Truncated)),
  s.speech.outcome != A::Recorded, s.speech.id >= 0,
  s.runId >= 1 implies (s.version >= 1 and s.newest >= s.version and s.status != U::NoRun),
  s.runId == 0 implies (s.text == NoOutput and s.output.status != R::Loading),
  s.text != NoOutput implies s.output.status == R::Loaded,
}
```

### Each speech is asked once and silenced only while it is heard

```quint
pure def stepSpeechIsAskedOnce(before: Sheet, via: str, after: Sheet, out: List[Effect]): bool =
  out.every(e => match e {
    | Speak(k) => via == "readAloud" and k.id == before.speech.id + 1 and k.runId == before.runId
    | Silence(k) => before.speech.outcome == A::Sent and k.id == before.speech.id
    | ReadOutput(o) => o.ticket == after.output.ticket and o.runId == after.runId
    | ReadRuns(r) => r.ticket == after.history.ticket and r.owner == after.owner
    | _ => true
  })
```

### Output can be long and cut short, empty, or fail to load, and a run can be read aloud to its end

```quint
pure def sometimesOutputIsCutShort(s: Sheet): bool = s.text == Truncated

pure def sometimesARunHasNoOutput(s: Sheet): bool = s.text == Empty and U::ended(s.status)

pure def sometimesOutputCannotBeRead(s: Sheet): bool = s.output.status == R::Failed and s.runId >= 1

pure def sometimesARunIsReadToTheEnd(s: Sheet): bool = s.speech.outcome == A::Confirmed and s.status == U::Done

pure def sometimesAnInterruptedRunIsOpen(s: Sheet): bool = s.status == U::Interrupted and s.text == Text
```

## Story: Keep the sheet to its owner

> As the owner, I want nothing of my runs shown to whoever signs in next,
> and a restart to close the sheet.

### A restart or another owner signing in closes the run and silences it, and forgets the history shown

```quint
pure def restart(s: Sheet): Sheet =
  { ...initial, owner: s.owner, history: { ...s.history, status: R::Idle }, output: { ...s.output, status: R::Idle },
    speech: if (s.speech.outcome == A::Sent) A::conclude(s.speech, false, true) else s.speech }

pure def canOwnerChanged(s: Sheet, owner: int): bool = owner != s.owner and owner >= 0

pure def ownerChanged(s: Sheet, owner: int): Moved =
  { state: { ...initial, owner: owner, history: { ...s.history, status: R::Idle }, output: { ...s.output, status: R::Idle },
      speech: if (s.speech.outcome == A::Sent) A::conclude(s.speech, false, true) else s.speech },
    out: if (s.speech.outcome == A::Sent) List(Silence({ id: s.speech.id })) else List() }
```
