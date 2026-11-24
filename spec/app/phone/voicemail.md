# Voicemail

Phone's Voicemail tab: the carrier's voicemail list with unheard marks, and
one open voicemail with its audio, playback and transcript. A transcript is
made by the phone's own recognizer, or comes from the carrier; the audio
never leaves the phone to be transcribed. Each opening asks for audio and a
transcript under new tickets, so an answer for a voicemail that was closed,
replaced or deleted is refused. Calling back opens [Phone](./)'s keypad and
Message opens [Messages](../messages/), each with the caller's number filled
in.

## Domain

### What Voicemail holds

Whether the tab is showing; the list as last read and the unheard count the
phone reports; and the open voicemail: whether it was heard, its audio and
playback, its transcript, a delete confirmation and the last removal.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"

type Playback = Stopped | Playing | Paused
type Reach = CallBack | Message
type Voicemail = {
  front: bool, list: R::Read, items: int, unheard: int,
  open: bool, heard: bool,
  audio: R::Read, playback: Playback,
  transcript: R::Read, carrierText: bool, noRecognizer: bool,
  confirming: bool, removal: A::Attempt,
}

pure val initial: Voicemail = {
  front: false, list: R::unread, items: 0, unheard: 0,
  open: false, heard: false,
  audio: R::unread, playback: Stopped,
  transcript: R::unread, carrierText: false, noRecognizer: false,
  confirming: false, removal: A::plan(0),
}
```

### What Voicemail asks of the phone

A read of the list, the open voicemail's audio, a transcript by the phone's
own recognizer, marking a voicemail heard, Phone or Messages opened with the
caller's number, and the removal of a voicemail under its number.

```quint
type Effect =
  | ReadList({ ticket: int, refresh: bool })
  | FetchAudio({ ticket: int })
  | TranscribeOnPhone({ ticket: int })
  | MarkHeard
  | ReachCaller({ app: Reach })
  | Remove({ id: int })

type Moved = { state: Voicemail, out: List[Effect] }

pure def removeOne(id: int): List[Effect] = List(Remove({ id: id }))
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val countValues = Set(-1, 0, 1, 2)
pure val weight_audioFetched = 3
pure val weight_transcribed = 3
pure val weight_listed = 3
```

## Story: See my voicemail

> As the owner, I want my voicemails listed with the unheard ones marked,
> and nothing shown when there is no carrier.

### Voicemail reads the list each time its tab comes to the front

```quint
pure def readList(refresh: bool, front: bool, s: Voicemail): Moved =
  val list = R::ask(s.list)
  { state: { ...s, front: front, list: list }, out: List(ReadList({ ticket: list.ticket, refresh: refresh })) }

pure def canShow(s: Voicemail): bool = not(s.front)

pure def show(s: Voicemail): Moved = readList(true, true, s)
```

### A carrier notice refreshes the visible list from the phone's latest read

The Phone view keeps one voicemail observer in the foreground. Its notices
also carry whether the carrier still offers visual voicemail and the number
of unheard messages.

```quint
pure def canArrived(s: Voicemail): bool = s.front

pure def arrived(s: Voicemail): Moved = readList(false, true, s)
```

### Leaving the tab forgets the list and closes the open voicemail, which stops playback

```quint
pure def closing(front: bool, s: Voicemail): Voicemail =
  { ...s, front: front, open: false, heard: false, playback: Stopped, carrierText: false, noRecognizer: false, confirming: false,
    audio: { ...s.audio, status: R::Idle }, transcript: { ...s.transcript, status: R::Idle } }

pure def canLeave(s: Voicemail): bool = s.front

pure def leave(s: Voicemail): Voicemail = { ...closing(false, s), items: 0 }
```

### Only the newest read of the list is shown, and nothing without a carrier

The read also tells how many voicemails are unheard.

```quint
pure def canListed(s: Voicemail, ticket: int, count: int, unheard: int): bool =
  s.front and R::canAnswer(s.list, ticket) and 0 <= unheard and unheard <= count

pure def listed(s: Voicemail, ticket: int, ok: bool, carrier: bool, count: int, unheard: int, stillOpen: bool): Voicemail =
  val good = ok and carrier
  val read = { ...s, list: R::answer(s.list, good), items: if (good) count else 0, unheard: if (good) unheard else s.unheard }
  if (read.items == 0 or not(stillOpen)) closing(true, read) else read
```

### The phone reports how many voicemails are unheard, for Home and the tab

Home's calls card leads to Recents while there are missed calls not yet
seen, and otherwise to the Voicemail tab while any voicemail is unheard.

```quint
pure def canUnheardReported(s: Voicemail, count: int): bool = count >= 0

pure def unheardReported(s: Voicemail, count: int): Voicemail = { ...s, unheard: count }
```

### Voicemails are listed only while the tab is showing, from a read that was answered and kept while the list is read again

```quint
pure def alwaysListedOnlyWhileShowing(s: Voicemail): bool =
  s.items >= 0 and s.unheard >= 0
    and (s.items > 0 implies (s.front and (s.list.status == R::Loaded or s.list.status == R::Loading)))
```

### The list can be empty, fail, and hold unheard voicemail

```quint
pure def sometimesNoVoicemail(s: Voicemail): bool = s.front and s.list.status == R::Loaded and s.items == 0
pure def sometimesListFailed(s: Voicemail): bool = s.front and s.list.status == R::Failed
pure def sometimesUnheardListed(s: Voicemail): bool = s.items > 0 and s.unheard > 0
```

## Story: Listen to a voicemail

> As the owner, I want to open a voicemail, play, pause and replay it, and
> have it stop when a call starts.

### Opening a voicemail asks for its audio under a new ticket

A transcript the carrier supplied is shown as it is. Selecting a different
voicemail replaces the current one and stops its playback.

```quint
pure def canOpen(s: Voicemail, carrierText: bool): bool = s.front and s.items > 0 and not(s.confirming) and not(removing(s))

pure def open(s: Voicemail, carrierText: bool): Moved =
  val audio = R::ask(s.audio)
  { state: { ...s, open: true, heard: false, playback: Stopped, confirming: false, audio: audio,
      carrierText: carrierText, noRecognizer: false, transcript: { ...s.transcript, status: R::Idle } },
    out: List(FetchAudio({ ticket: audio.ticket })) }
```

### Closing the voicemail returns to the list

```quint
pure def canClose(s: Voicemail): bool = s.open

pure def close(s: Voicemail): Voicemail = closing(true, s)
```

### Audio that failed can be asked for again

```quint
pure def canRetryAudio(s: Voicemail): bool = s.open and s.audio.status == R::Failed

pure def retryAudio(s: Voicemail): Moved =
  val audio = R::ask(s.audio)
  { state: { ...s, audio: audio }, out: List(FetchAudio({ ticket: audio.ticket })) }
```

### Only the open voicemail's newest audio is taken, and with it a transcript is asked of the phone's own recognizer

Without a carrier transcript, audio that arrives is transcribed on the
phone. When the phone's recognizer is not ready, the voicemail says no
transcript is available; nothing else is asked to transcribe it.

```quint
pure def canAudioFetched(s: Voicemail, ticket: int): bool = s.open and R::canAnswer(s.audio, ticket)

pure def audioFetched(s: Voicemail, ticket: int, ok: bool, recognizer: bool): Moved =
  val fetched = { ...s, audio: R::answer(s.audio, ok) }
  val transcript = R::ask(s.transcript)
  if (not(ok) or s.carrierText or s.transcript.status == R::Loaded) { state: fetched, out: List() }
  else if (not(recognizer)) { state: { ...fetched, noRecognizer: true }, out: List() }
  else { state: { ...fetched, transcript: transcript, noRecognizer: false }, out: List(TranscribeOnPhone({ ticket: transcript.ticket })) }
```

### Play needs the audio, and never plays during a call

`live` is Phone's fact that a call is live. Playing marks the voicemail
heard.

```quint
pure def canPlay(s: Voicemail, live: bool): bool =
  s.open and s.audio.status == R::Loaded and s.playback != Playing and not(s.confirming) and not(live)

pure def play(s: Voicemail, live: bool): Moved =
  val played = { ...s, playback: Playing, heard: true }
  if (s.heard) { state: played, out: List() }
  else { state: { ...played, unheard: if (s.unheard > 0) s.unheard - 1 else 0 }, out: List(MarkHeard) }
```

### Pause holds the place, and the end of the audio stops it

```quint
pure def canPause(s: Voicemail): bool = s.playback == Playing

pure def pause(s: Voicemail): Voicemail = { ...s, playback: Paused }

pure def canEnded(s: Voicemail): bool = s.playback == Playing

pure def ended(s: Voicemail): Voicemail = { ...s, playback: Stopped }
```

### A call that starts pauses playback

```quint
pure def callStarted(s: Voicemail): Voicemail =
  if (s.playback == Playing) { ...s, playback: Paused } else s
```

### A voicemail is open only while the tab is showing

Discovered by the proof: without it, playback could start on a voicemail
left open behind another tab.

```quint
pure def alwaysOpenOnlyWhileShowing(s: Voicemail): bool = s.open implies s.front
```

### Nothing plays without the open voicemail's audio, and what plays was heard

```quint
pure def alwaysPlaybackNeedsAudio(s: Voicemail): bool =
  s.playback != Stopped implies (s.open and s.front and s.audio.status == R::Loaded and s.heard and not(s.confirming))
```

### A call that starts leaves nothing playing

```quint
pure def stepACallStopsPlayback(before: Voicemail, via: str, after: Voicemail): bool =
  via == "callStarted" implies after.playback != Playing
```

### Playback can be paused by a call, and audio can fail

```quint
pure def sometimesPausedByACall(s: Voicemail): bool = s.playback == Paused and s.heard
pure def sometimesAudioFailed(s: Voicemail): bool = s.open and s.audio.status == R::Failed
pure def sometimesPlaying(s: Voicemail): bool = s.playback == Playing
```

## Story: Read what was said

> As the owner, I want a transcript of a voicemail made on my phone, and
> never to have its audio sent away to be transcribed.

### Only the open voicemail's newest transcript is shown

```quint
pure def canTranscribed(s: Voicemail, ticket: int): bool = s.open and R::canAnswer(s.transcript, ticket)

pure def transcribed(s: Voicemail, ticket: int, ok: bool): Voicemail = { ...s, transcript: R::answer(s.transcript, ok) }
```

### A transcript is asked only of the phone's own recognizer, only for audio on the phone, and never beside a carrier transcript

```quint
pure def stepTranscriptsStayOnThePhone(before: Voicemail, via: str, after: Voicemail, out: List[Effect]): bool =
  out.some(e => match e { | TranscribeOnPhone(t) => true | _ => false }) implies
    (via == "audioFetched" and after.audio.status == R::Loaded and not(after.carrierText) and not(after.noRecognizer)
      and after.transcript.status == R::Loading)
```

### A transcript is under way or shown only for an open voicemail whose audio arrived, and never when the recognizer is unavailable

```quint
pure def alwaysTheTranscriptIsTheOpenOnes(s: Voicemail): bool =
  (s.transcript.status != R::Idle implies (s.open and s.audio.status == R::Loaded and not(s.carrierText)))
    and (s.noRecognizer implies s.transcript.status == R::Idle)
    and ((s.carrierText or s.noRecognizer) implies s.open)
```

### A transcript can be made on the phone, fail, be unavailable, or come from the carrier

```quint
pure def sometimesTranscribed(s: Voicemail): bool = s.transcript.status == R::Loaded and s.playback == Playing
pure def sometimesTranscriptFailed(s: Voicemail): bool = s.transcript.status == R::Failed
pure def sometimesNoRecognizer(s: Voicemail): bool = s.noRecognizer and s.audio.status == R::Loaded
pure def sometimesCarrierText(s: Voicemail): bool = s.carrierText and s.audio.status == R::Loaded
```

## Story: Answer a voicemail

> As the owner, I want to call back or send a message to the caller from
> the voicemail.

### Call back hands the caller's number to Phone and Message opens Messages with it

```quint
pure def canReach(s: Voicemail, how: Reach): bool = s.open and not(s.confirming)

pure def reach(s: Voicemail, how: Reach): Moved = { state: s, out: List(ReachCaller({ app: how })) }

pure def stepReachingLeavesTheVoicemailAsItWas(before: Voicemail, via: str, after: Voicemail, out: List[Effect]): bool =
  via == "reach" implies after == before
```

## Story: Delete a voicemail

> As the owner, I want a voicemail deleted only after I confirm it, and to
> be told when Alpha cannot tell whether it was.

### Delete asks first, stops playback, and Keep closes the question

```quint
pure def removing(s: Voicemail): bool = s.removal.outcome == A::Sent

pure def canAskDelete(s: Voicemail): bool = s.open and not(s.confirming) and not(removing(s))

pure def askDelete(s: Voicemail): Voicemail = { ...s, confirming: true, playback: Stopped }

pure def canKeep(s: Voicemail): bool = s.confirming

pure def keep(s: Voicemail): Voicemail = { ...s, confirming: false }
```

### Confirming removes the open voicemail under a new number

```quint
pure def canConfirmDelete(s: Voicemail): bool = s.confirming and not(removing(s))

pure def confirmDelete(s: Voicemail): Moved =
  val removal = A::dispatch(A::record(A::plan(s.removal.id + 1)))
  { state: { ...s, confirming: false, removal: removal }, out: removeOne(removal.id) }
```

### The phone's answer ends the removal it names

A removal that was made, or whose outcome is unknown, closes the voicemail
and reads the list again; a refused one keeps it open. A queued deletion
is still pending until Android's journal confirms the provider's result.
When Alpha stops waiting for that result, the outcome is unknown.

```quint
pure def canRemoved(s: Voicemail, id: int): bool = A::canConclude(s.removal, id)

pure def canRemovalLost(s: Voicemail): bool = removing(s)

pure def removalLost(s: Voicemail): Moved = removed(s, s.removal.id, false, false)

pure def removed(s: Voicemail, id: int, done: bool, known: bool): Moved =
  val removal = A::conclude(s.removal, done, known)
  val after = { ...s, removal: removal }
  if (removal.outcome == A::Refused or not(s.front)) { state: after, out: List() }
  else readList(true, true, closing(true, after))
```

### A voicemail is removed only by confirming, once

```quint
pure def stepRemovingNeedsTheConfirmation(before: Voicemail, via: str, after: Voicemail, out: List[Effect]): bool =
  out.some(e => match e { | Remove(r) => true | _ => false }) implies
    (via == "confirmDelete" and before.confirming and not(removing(before)) and out == removeOne(before.removal.id + 1))
```

### The question is asked only over an open voicemail, and a removal is never recorded without being sent

```quint
pure def alwaysDeleteIsAskedOverAnOpenVoicemail(s: Voicemail): bool =
  (s.confirming implies s.open) and s.removal.id >= 0 and s.removal.outcome != A::Recorded
    and (s.removal.id == 0 implies s.removal.outcome == A::Planned)
```

### A removal under way ends

It ends with the phone's answer, or as unknown when Alpha stops waiting
for one.

```quint
pure def leadsToARemovalEnds(s: Voicemail, later: Voicemail): bool = removing(s) implies not(removing(later))

pure val fair_removed = "weak"
pure val fair_removalLost = "weak"
```

### A voicemail can be deleted, kept after a refusal, or end unknown

```quint
pure def sometimesDeleted(s: Voicemail): bool = s.removal.outcome == A::Confirmed and s.front
pure def sometimesRefusedKeptOpen(s: Voicemail): bool = s.removal.outcome == A::Refused and s.open
pure def sometimesRemovalUnknown(s: Voicemail): bool = s.removal.outcome == A::Unknown and s.list.status == R::Loading
```
