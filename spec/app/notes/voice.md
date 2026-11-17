# Voice note

A voice note kept in the owner's store: its transcript, made by the phone as
the audio allows and added to the note only as the owner
[reviewed](../../kit/review.md) it; a summary of what was added; Ask Alpha
about it; and playback. [Recording](./recording.md) makes the voice note;
it is otherwise a note in [Notes](./index.md).

## Story: Read and use the transcript

> As the owner, I want my recording transcribed until the transcript covers
> all of it, to read the transcript before it joins the note, to have it
> summarised, and to ask Alpha about it.

### The voice note holds its audio, the transcript heard and the transcript the note holds, its summary, and the one write to the note on its way

The note's revision is the one the store last confirmed. The transcript is
counted in segments of audio: `heard` is what the phone has transcribed,
`added` what the note holds, and `summary` what its summary covers.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import note.* from "./note"

type Part = Transcript | Summary
type VoiceNote = {
  owner: int, note: int, revision: int, segments: int, showing: bool,
  listen: R::Read, asked: int, heard: int, deaf: bool, quiet: bool, added: int, review: V::Review,
  summarising: R::Read, upTo: int, summary: int,
  writing: A::Attempt, part: Part, writeUpTo: int, play: R::Read,
}

pure val initial: VoiceNote = {
  owner: 0, note: 0, revision: 0, segments: 0, showing: false,
  listen: R::unread, asked: 0, heard: 0, deaf: false, quiet: false, added: 0, review: V::unreviewed,
  summarising: R::unread, upTo: 0, summary: 0,
  writing: A::plan(0), part: Transcript, writeUpTo: 0, play: R::unread,
}

pure def idle(r: R::Read): R::Read = { ...r, status: R::Idle }
pure def busy(v: VoiceNote): bool = v.writing.outcome == A::Recorded or v.writing.outcome == A::Sent
```

### What a voice note asks of the world

To transcribe the audio up to a segment, to summarise the transcript added,
to write the transcript or the summary to the note over the revision it
builds on, to hand the added transcript to Ask Alpha, and to play the audio.

```quint
type Effect =
  | Transcribes({ ticket: int, owner: int, note: int, upTo: int })
  | Summarises({ ticket: int, owner: int, note: int, upTo: int })
  | Writes({ ticket: int, owner: int, note: int, base: int, part: Part, upTo: int })
  | AsksAlpha({ note: int, upTo: int })
  | Plays({ ticket: int, note: int, segments: int })
type Moved = { state: VoiceNote, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val latestValues = Set(2, 5)
pure val segmentsValues = Set(1, 2, 3)
pure val heardValues = Set(0, 1)
pure val summaryValues = Set(0, 1)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val weight_transcribed = 3
pure val weight_written = 3
```

### The owner opens a voice note with its audio, the transcript it holds and its summary

Nothing being written to another voice note may be on its way.

```quint
pure def canOpenVoice(v: VoiceNote, note: int, revision: int, segments: int, heard: int, summary: int, by: Actor): bool =
  by == Owner and isOwner(v.owner) and not(busy(v)) and not(v.showing) and note > 0 and revision > 0
    and segments > 0 and 0 <= summary and summary <= heard and heard <= segments

pure def openVoice(v: VoiceNote, note: int, revision: int, segments: int, heard: int, summary: int, by: Actor): VoiceNote =
  { ...v, note: note, revision: revision, segments: segments, showing: true,
    listen: idle(v.listen), asked: heard, heard: heard, deaf: false, quiet: false, added: heard,
    review: V::dismiss(v.review), summarising: idle(v.summarising), upTo: 0, summary: summary, writeUpTo: 0, play: idle(v.play) }
```

### The phone transcribes all the audio not yet transcribed, one request at a time, shown or not, until the owner cancels or a transcription fails

```quint
pure def canTranscribe(v: VoiceNote, by: Actor): bool =
  by == Phone and v.note > 0 and v.listen.status != R::Loading and v.heard < v.segments and not(v.deaf) and not(v.quiet)

pure def transcribe(v: VoiceNote, by: Actor): Moved =
  val listen = R::ask(v.listen)
  { state: { ...v, listen: listen, asked: v.segments },
    out: List(Transcribes({ ticket: listen.ticket, owner: v.owner, note: v.note, upTo: v.segments })) }
```

### Only the answer to the request in flight is taken: the transcript of what was asked, or a failure to say

```quint
pure def canTranscribed(v: VoiceNote, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(v.listen, ticket)

pure def transcribed(v: VoiceNote, ticket: int, ok: bool, by: Actor): VoiceNote =
  if (ok) { ...v, listen: R::answer(v.listen, true), heard: v.asked, review: V::revise(v.review) }
  else { ...v, listen: R::answer(v.listen, false), deaf: true }
```

### The owner cancels a transcription, and only the owner's Try again transcribes after a failure or a cancel

```quint
pure def canCancelTranscription(v: VoiceNote, by: Actor): bool = by == Owner and v.listen.status == R::Loading

pure def cancelTranscription(v: VoiceNote, by: Actor): VoiceNote = { ...v, listen: idle(v.listen), quiet: true }

pure def canRetryTranscription(v: VoiceNote, by: Actor): bool = by == Owner and v.note > 0 and (v.deaf or v.quiet)

pure def retryTranscription(v: VoiceNote, by: Actor): VoiceNote = { ...v, deaf: false, quiet: false }
```

### The transcript catches up with the audio, unless it fails, is cancelled, or the note is let go of

```quint
pure def leadsToTheTranscriptCatchesUp(v: VoiceNote, later: VoiceNote): bool =
  (v.note > 0 and v.heard < v.segments)
    implies (later.heard == later.segments or later.deaf or later.quiet or later.note != v.note)

pure val fair_transcribe = "weak"
pure val fair_transcribed = "weak"
```

### The transcript is always a prefix of the audio, and what was added and summarised a prefix of the transcript

What is being written adds to what the note holds, and never goes past
what was heard.

```quint
pure def alwaysTheTranscriptIsAPrefixOfTheAudio(v: VoiceNote): bool =
  0 <= v.summary and v.summary <= v.added and v.added <= v.heard and v.heard <= v.asked
    and v.asked <= v.segments and v.upTo <= v.added and v.writeUpTo <= v.heard
    and (busy(v) and v.part == Summary implies v.writeUpTo <= v.added)
    and (busy(v) and v.part == Transcript implies v.writeUpTo >= v.added)
```

### The owner reads the new transcript, and adding it writes it to the note only as it was shown

```quint
pure def canShowTranscript(v: VoiceNote, by: Actor): bool =
  by == Owner and v.showing and v.heard > v.added and not(v.review.showing) and not(busy(v))
    and v.summarising.status != R::Loading

pure def showTranscript(v: VoiceNote, by: Actor): VoiceNote = { ...v, review: V::present(v.review) }

pure def write(part: Part, upTo: int, v: VoiceNote): Moved =
  val attempt = A::dispatch(A::record(A::plan(v.writing.id + 1)))
  { state: { ...v, writing: attempt, part: part, writeUpTo: upTo },
    out: List(Writes({ ticket: attempt.id, owner: v.owner, note: v.note, base: v.revision, part: part, upTo: upTo })) }

pure def canAddTranscript(v: VoiceNote, by: Actor): bool =
  by == Owner and V::canConfirm(v.review) and v.heard > v.added and not(busy(v)) and v.summarising.status != R::Loading

pure def addTranscript(v: VoiceNote, by: Actor): Moved = write(Transcript, v.heard, { ...v, review: V::confirm(v.review) })
```

### The owner asks for a summary of the transcript added, and the summary is written to the note

Only the answer to the request in flight is taken.

```quint
pure def canSummarise(v: VoiceNote, by: Actor): bool =
  by == Owner and v.showing and v.summarising.status != R::Loading and v.added > v.summary and not(busy(v))
    and not(v.review.showing)

pure def summarise(v: VoiceNote, by: Actor): Moved =
  val summarising = R::ask(v.summarising)
  { state: { ...v, summarising: summarising, upTo: v.added },
    out: List(Summarises({ ticket: summarising.ticket, owner: v.owner, note: v.note, upTo: v.added })) }

pure def canSummarised(v: VoiceNote, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(v.summarising, ticket)

pure def summarised(v: VoiceNote, ticket: int, ok: bool, by: Actor): Moved =
  val answered = { ...v, summarising: R::answer(v.summarising, ok) }
  if (ok) write(Summary, v.upTo, answered) else { state: answered, out: List() }
```

### A write to the note ends as the store says: the note then holds it, the store refused it as overtaken, or the outcome is unknown and it is never written again

```quint
pure def canWritten(v: VoiceNote, ticket: int, ok: bool, latest: int, by: Actor): bool =
  by == Phone and A::canConclude(v.writing, ticket) and (ok implies latest > v.revision)

pure def written(v: VoiceNote, ticket: int, ok: bool, known: bool, latest: int, by: Actor): VoiceNote =
  val writing = A::conclude(v.writing, ok, known)
  if (writing.outcome != A::Confirmed) { ...v, writing: writing }
  else if (v.part == Transcript) { ...v, writing: writing, added: v.writeUpTo, revision: latest }
  else { ...v, writing: writing, summary: v.writeUpTo, revision: latest }
```

### The transcript and summary shown are what the note holds: they change only when the store confirms a write, or another note opens

```quint
pure def stepTheNoteHoldsWhatIsShown(before: VoiceNote, via: str, after: VoiceNote): bool =
  (after.added != before.added or after.summary != before.summary)
    implies ((via == "written" and after.writing.outcome == A::Confirmed) or via == "openVoice" or via == "ownerChanged")
```

### Ask Alpha about this transcript hands Ask Alpha the transcript the note holds

The shell then raises Ask Alpha.

```quint
pure def canAskAlpha(v: VoiceNote, by: Actor): bool = by == Owner and v.showing and v.added > 0

pure def askAlpha(v: VoiceNote, by: Actor): Moved = { state: v, out: List(AsksAlpha({ note: v.note, upTo: v.added })) }
```

### Only the transcript the owner added leaves the note, and only what was shown is written to it

```quint
pure def stepOnlyTheAddedTranscriptLeaves(before: VoiceNote, via: str, after: VoiceNote, out: List[Effect]): bool =
  out.every(e => match e {
    | AsksAlpha(a) => a.upTo == before.added and a.upTo > 0 and a.note == before.note
    | Summarises(x) => x.upTo == before.added and x.note == before.note
    | Transcribes(t) => t.upTo == before.segments and before.listen.status != R::Loading
    | Writes(w) => not(busy(before)) and w.base == before.revision and w.note == before.note and w.owner == before.owner
        and w.ticket == before.writing.id + 1 and isOwner(w.owner)
        and (if (w.part == Transcript) via == "addTranscript" and V::canConfirm(before.review) and w.upTo == before.heard
          else via == "summarised" and w.upTo == before.upTo)
    | _ => true
  })
```

### A write whose outcome is unknown is never sent again

```quint
pure def stepAnUnknownWriteStaysUnknown(before: VoiceNote, via: str, after: VoiceNote): bool =
  after.writing.id >= before.writing.id
    and ((before.writing.outcome == A::Unknown and after.writing.id == before.writing.id and via != "ownerChanged")
      implies after.writing.outcome == A::Unknown)
```

### A transcript on show is one not yet in the note, and nothing else is written or summarised meanwhile

```quint
pure def alwaysAShownTranscriptIsNew(v: VoiceNote): bool =
  (v.review.showing implies (v.showing and v.heard > v.added and not(busy(v)) and v.summarising.status != R::Loading))
    and (v.summarising.status == R::Loading implies not(busy(v)))
```

### A transcription asked for ends, and a write ends

```quint
pure def leadsToATranscriptionEnds(v: VoiceNote, later: VoiceNote): bool =
  v.listen.status == R::Loading implies later.listen.status != R::Loading

pure def leadsToAWriteEnds(v: VoiceNote, later: VoiceNote): bool = busy(v) implies not(busy(later))

pure val fair_written = "weak"
```

### A transcript can be on show, added, summarised, caught up while hidden, fail, be cancelled, and a write can be refused or unknown

```quint
pure def sometimesTranscriptOnShow(v: VoiceNote): bool = v.review.showing and v.added == 0

pure def sometimesAdded(v: VoiceNote): bool = v.added > 0 and v.part == Transcript and v.writing.outcome == A::Confirmed

pure def sometimesSummarised(v: VoiceNote): bool = v.summary > 0 and v.part == Summary and v.writing.outcome == A::Confirmed

pure def sometimesCaughtUpHidden(v: VoiceNote): bool = not(v.showing) and v.note > 0 and v.heard == v.segments and v.segments > v.added

pure def sometimesTranscriptionFailed(v: VoiceNote): bool = v.deaf and v.heard < v.segments

pure def sometimesTranscriptionCancelled(v: VoiceNote): bool = v.quiet and v.heard < v.segments

pure def sometimesAWriteRefused(v: VoiceNote): bool = v.writing.outcome == A::Refused

pure def sometimesAWriteUnknown(v: VoiceNote): bool = v.writing.outcome == A::Unknown
```

## Story: Listen to a voice note

> As the owner, I want to play a voice note, and be told when it cannot be
> played.

### A voice note plays, and only the answer to the current playing counts

Played through, the player rests; one that cannot be played says so.

```quint
pure def canPlay(v: VoiceNote, by: Actor): bool = by == Owner and v.showing and v.play.status != R::Loading

pure def play(v: VoiceNote, by: Actor): Moved =
  val play = R::ask(v.play)
  { state: { ...v, play: play }, out: List(Plays({ ticket: play.ticket, note: v.note, segments: v.segments })) }

pure def canPlayed(v: VoiceNote, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(v.play, ticket)

pure def played(v: VoiceNote, ticket: int, ok: bool, by: Actor): VoiceNote = { ...v, play: R::answer(v.play, ok) }

pure def canStopPlaying(v: VoiceNote, by: Actor): bool = by == Owner and v.play.status == R::Loading

pure def stopPlaying(v: VoiceNote, by: Actor): VoiceNote = { ...v, play: idle(v.play) }
```

### Nothing plays but the voice note on show

```quint
pure def alwaysOnlyTheNoteOnShowPlays(v: VoiceNote): bool = v.play.status == R::Loading implies (v.showing and v.note > 0)
```

### A voice note can play, and can fail to play

```quint
pure def sometimesPlaying(v: VoiceNote): bool = v.play.status == R::Loading and v.added > 0

pure def sometimesUnplayable(v: VoiceNote): bool = v.play.status == R::Failed and v.showing
```

## Story: Leave a voice note

> As the owner, I want Back and leaving Notes to close what is open over the
> voice note, then the voice note, while its transcript goes on being made.

### Back closes the transcript on show first, then the voice note; leaving Notes closes both and stops playing

A write on its way still lands, and transcription goes on behind.

```quint
pure def canBack(v: VoiceNote): bool = v.showing

pure def back(v: VoiceNote): VoiceNote =
  if (v.review.showing) { ...v, review: V::dismiss(v.review) }
  else { ...v, showing: false, play: idle(v.play) }

pure def left(v: VoiceNote): VoiceNote = { ...v, showing: false, review: V::dismiss(v.review), play: idle(v.play) }

pure def stepLeavingKeepsTheWrite(before: VoiceNote, via: str, after: VoiceNote): bool =
  (via == "back" or via == "left") implies (after.writing == before.writing and after.listen == before.listen)
```

## Story: Another owner never hears my voice notes

> As the owner, I want nothing of my voice notes shown to, or written for,
> whoever uses the phone after me.

### When another owner takes the phone, the voice note is let go of and no answer for the owner before is taken

```quint
pure def canOwnerChanged(v: VoiceNote, owner: int, by: Actor): bool = by == Phone and owner != v.owner and owner >= 0

pure def ownerChanged(v: VoiceNote, owner: int, by: Actor): VoiceNote =
  { ...initial, owner: owner, listen: idle(v.listen), summarising: idle(v.summarising), play: idle(v.play),
    writing: A::plan(v.writing.id) }

pure def stepNoAnswerForAFormerOwner(before: VoiceNote, via: str, after: VoiceNote): bool =
  via == "ownerChanged" implies and {
    after.note == 0, not(busy(after)), after.listen.status != R::Loading,
    after.summarising.status != R::Loading, after.play.status != R::Loading,
  }
```

### A voice note open, or written to, is one of the owner the phone has now

```quint
pure def alwaysTheVoiceNoteIsTheOwners(v: VoiceNote): bool =
  ((v.note > 0 or busy(v)) implies isOwner(v.owner))
    and ((v.showing or busy(v) or v.summarising.status == R::Loading) implies v.note > 0)
```

## Story: Come back to a voice note after a restart

> As the owner, I want a write cut off by a restart reported, not repeated.

### A restart closes the voice note, drops what was asked and not answered, and leaves a write cut off unknown

```quint
pure def restart(v: VoiceNote): VoiceNote =
  { ...v, showing: false, listen: idle(v.listen), summarising: idle(v.summarising), play: idle(v.play),
    review: V::dismiss(v.review), writing: if (busy(v)) A::conclude(v.writing, false, false) else v.writing }

pure def stepNoLateAnswerAfterRestart(before: VoiceNote, via: str, after: VoiceNote): bool =
  via == "restart" implies (not(busy(after)) and after.listen.status != R::Loading and after.added == before.added)
```
