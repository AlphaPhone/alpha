# Voicemail

The Voicemail tab of [Phone](./phone.md): the carrier's visual voicemail as
Android's voicemail provider holds it, read only while Phone is in front,
and one voicemail open at a time with its audio, playback, transcript and a
confirmed delete. The audio stays in memory for the open voicemail only. A
transcript is made on this phone by the on-device recognizer or not at all;
the audio is never sent to a recognizer in the cloud.

## Story: See my voicemail only when my carrier offers it

> As the owner, I want my voicemail list to show what Android's voicemail
> provider holds, and a carrier without visual voicemail never shown as "no
> voicemail".

### Voicemail holds whether it shows, its read, the carrier state, the listed rows, the open voicemail and its delete

Every answer about the open voicemail carries the ticket it was asked under,
so an answer for a voicemail that was closed, replaced or deleted changes
nothing. A delete is the kit's attempt.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"

type Carrier = CarrierUnread | CarrierReady | CarrierUnconfigured | CarrierUnsupported
type VoicemailRow = { id: str, number: str, title: str, date: int, seconds: int, fresh: bool, hasAudio: bool, carrierText: str }
type VoicemailAnswer = VoicemailListed({ carrier: Carrier, voicemails: List[VoicemailRow], blocked: bool }) | VoicemailUnreadable
type VoicemailWritten = VoicemailRemoved | VoicemailGone | VoicemailUnconfirmed | VoicemailKept
type AudioState = AudioNone | AudioFetching | AudioReady | AudioFailed
type TranscriptState = TranscriptNone | TranscriptRunning | TranscriptDone | TranscriptFailed | TranscriptUnavailable
type Engine = NoEngine | DeviceEngine | CarrierEngine
type Playback = Stopped | Playing | Paused
type OpenVoicemail = {
  openId: str, ticket: int, audio: AudioState, source: str, transcript: TranscriptState, words: str, engine: Engine,
  playback: Playback, heard: bool, confirming: bool
}
type Effect = ReadVoicemail({ ticket: int, explicit: bool }) | FetchAudio({ ticket: int, voicemail: str }) | Transcribe({ ticket: int, voicemail: str })
  | MarkHeard({ voicemail: str }) | DeleteVoicemail({ id: int, voicemail: str })
type Voicemail = {
  shown: bool, list: R::Read, carrier: Carrier, rows: List[VoicemailRow], opened: OpenVoicemail, deletion: A::Attempt,
  inCall: bool, deleteFailed: bool, writeBlocked: bool
}
type Moved = { state: Voicemail, out: List[Effect] }

pure def noVoicemail(ticket: int): OpenVoicemail = {
  openId: "", ticket: ticket, audio: AudioNone, source: "", transcript: TranscriptNone, words: "", engine: NoEngine,
  playback: Stopped, heard: false, confirming: false
}
pure val initial: Voicemail = {
  shown: false, list: R::unread, carrier: CarrierUnread, rows: List(), opened: noVoicemail(0), deletion: A::plan(0),
  inCall: false, deleteFailed: false, writeBlocked: false
}
pure def listed(rows: List[VoicemailRow], voicemail: str): bool = rows.some(r => r.id == voicemail)
pure def rowOf(rows: List[VoicemailRow], voicemail: str): VoicemailRow =
  rows.select(r => r.id == voicemail).nthOr(0, { id: voicemail, number: "", title: "", date: 0, seconds: 0, fresh: false, hasAudio: false, carrierText: "" })
pure def deleting(v: Voicemail): bool = v.deletion.outcome == A::Sent
pure val voicemailValues = Set("v1", "v2")
pure val idValues = Set(0, 1, 2)
pure val ticketValues = Set(0, 1, 2, 3)
pure val wordsValues = Set("", "Call me back")
pure val sourceValues = Set("", "data:audio/amr;base64,AA==")
pure val answerValues = Set(VoicemailUnreadable, VoicemailListed({ carrier: CarrierUnsupported, voicemails: List(), blocked: false }))
  .union(Set(VoicemailListed({ carrier: CarrierReady, voicemails: List({ id: "v1", number: "4155550100", title: "Ann", date: 1, seconds: 24, fresh: true, hasAudio: true, carrierText: "" }), blocked: false })))
  .union(Set(VoicemailListed({ carrier: CarrierReady, voicemails: List({ id: "v2", number: "", title: "", date: 2, seconds: 61, fresh: false, hasAudio: false, carrierText: "See you at five" }), blocked: true })))
```

### Rows exist only for a ready carrier, and a failed read is never an empty list

Showing reads the list; leaving the front, locking or hiding the page
forgets the rows and closes the open voicemail. A change the provider
reports asks for another read. A voicemail removed elsewhere closes when the
next read no longer lists it.

```quint
pure def canShow(v: Voicemail, showing: bool): bool = showing != v.shown

pure def show(v: Voicemail, showing: bool): Moved =
  if (showing) { state: { ...v, shown: true, list: R::ask(v.list) }, out: List(ReadVoicemail({ ticket: v.list.ticket + 1, explicit: false })) }
  else { state: { ...initial, list: if (v.list.status == R::Loading) R::answer(v.list, false) else v.list,
                  opened: noVoicemail(v.opened.ticket + 1), deletion: v.deletion, inCall: v.inCall, writeBlocked: v.writeBlocked },
         out: List() }

pure def canRefresh(v: Voicemail, explicit: bool): bool = v.shown

pure def refresh(v: Voicemail, explicit: bool): Moved =
  { state: { ...v, list: R::ask(v.list) }, out: List(ReadVoicemail({ ticket: v.list.ticket + 1, explicit: explicit })) }

pure def canListAnswered(v: Voicemail, ticket: int): bool = v.shown and R::canAnswer(v.list, ticket)

pure def listAnswered(v: Voicemail, ticket: int, answer: VoicemailAnswer): Voicemail =
  val carrier = match answer { | VoicemailListed(l) => l.carrier | VoicemailUnreadable => CarrierUnread }
  val rows = match answer { | VoicemailListed(l) => if (l.carrier == CarrierReady) l.voicemails else List() | VoicemailUnreadable => List() }
  val keep = v.opened.openId != "" and listed(rows, v.opened.openId)
  val blocked = match answer { | VoicemailListed(l) => l.blocked | VoicemailUnreadable => v.writeBlocked }
  { ...v, list: R::answer(v.list, answer != VoicemailUnreadable), carrier: carrier, rows: rows, writeBlocked: blocked,
    opened: if (keep) v.opened else noVoicemail(v.opened.ticket + 1) }

pure def alwaysNoRowsWithoutAReadyCarrier(v: Voicemail): bool = v.carrier != CarrierReady implies v.rows.length() == 0

pure def alwaysRowsOnlyWhileShown(v: Voicemail): bool = v.rows.length() > 0 implies v.shown

pure def sometimesAnUnsupportedCarrier(v: Voicemail): bool = v.carrier == CarrierUnsupported and v.shown
```

## Story: Hear a voicemail

> As the owner, I want to open a voicemail, play it, and read a transcript
> made on my phone, and never have a voicemail play over a call.

### Opening a voicemail asks for its audio once, and a carrier transcript is shown as it is

Tapping the open voicemail again closes it, and so does Back: a delete
confirmation closes first, and a delete in flight holds Back. Audio not yet
on the phone asks its source to download it first; a failed fetch can be
retried.

```quint
pure def canVoicemailOpened(v: Voicemail, voicemail: str): bool = v.shown and listed(v.rows, voicemail) and not(deleting(v))

pure def voicemailOpened(v: Voicemail, voicemail: str): Moved =
  val row = rowOf(v.rows, voicemail)
  val fresh = noVoicemail(v.opened.ticket + 1)
  if (v.opened.openId == voicemail) { state: { ...v, opened: fresh }, out: List() }
  else { state: { ...v, deleteFailed: false, opened: { ...fresh, openId: voicemail, heard: not(row.fresh), audio: AudioFetching,
           transcript: if (row.carrierText != "") TranscriptDone else TranscriptNone,
           words: row.carrierText, engine: if (row.carrierText != "") CarrierEngine else NoEngine } },
         out: List(FetchAudio({ ticket: fresh.ticket, voicemail: voicemail })) }

pure def canVoicemailClosed(v: Voicemail): bool = v.opened.openId != "" and not(deleting(v))

pure def voicemailClosed(v: Voicemail): Voicemail = { ...v, opened: noVoicemail(v.opened.ticket + 1) }

type VoicemailBack = VoicemailDeleteHolds | ConfirmCloses | VoicemailCloses | NoVoicemailBack

pure def voicemailBack(v: Voicemail): VoicemailBack =
  if (deleting(v)) VoicemailDeleteHolds
  else if (v.opened.confirming) ConfirmCloses
  else if (v.opened.openId != "") VoicemailCloses
  else NoVoicemailBack

pure def lawBackClosesTheConfirmationBeforeTheVoicemail(voicemail: str, confirming: bool): bool =
  confirming implies voicemailBack({ ...initial, opened: { ...noVoicemail(1), openId: voicemail, confirming: confirming } }) == ConfirmCloses

pure def canAudioAsked(v: Voicemail): bool = v.shown and v.opened.openId != "" and v.opened.audio == AudioFailed

pure def audioAsked(v: Voicemail): Moved =
  { state: { ...v, opened: { ...v.opened, audio: AudioFetching } }, out: List(FetchAudio({ ticket: v.opened.ticket, voicemail: v.opened.openId })) }

pure def canAudioAnswered(v: Voicemail, ticket: int): bool = v.opened.audio == AudioFetching and ticket == v.opened.ticket

pure def audioAnswered(v: Voicemail, ticket: int, source: str): Voicemail =
  { ...v, opened: { ...v.opened, audio: if (source != "") AudioReady else AudioFailed, source: source } }

pure def alwaysAClosedVoicemailHoldsNothing(v: Voicemail): bool =
  v.opened.openId == "" implies (v.opened.audio == AudioNone and v.opened.source == "" and v.opened.playback == Stopped and not(v.opened.confirming))

pure def alwaysTheOpenVoicemailIsListed(v: Voicemail): bool = v.opened.openId != "" implies listed(v.rows, v.opened.openId)

pure def alwaysAudioIsHeldOnlyWhenReady(v: Voicemail): bool = (v.opened.source != "") iff (v.opened.audio == AudioReady)

pure def sometimesAudioReady(v: Voicemail): bool = v.opened.audio == AudioReady
```

### Playing marks a voicemail heard, and nothing plays during a call

A call pauses playback; play is offered again only after it ends. Playing a
new voicemail asks the provider to mark it heard.

```quint
pure def canPlayed(v: Voicemail): bool = v.shown and not(v.inCall) and v.opened.audio == AudioReady and v.opened.playback != Playing

pure def played(v: Voicemail): Moved =
  val row = rowOf(v.rows, v.opened.openId)
  { state: { ...v, opened: { ...v.opened, playback: Playing, heard: true },
             rows: v.rows.listMap(r => if (r.id == v.opened.openId) { ...r, fresh: false } else r) },
    out: if (row.fresh and not(v.writeBlocked)) List(MarkHeard({ voicemail: v.opened.openId })) else List() }

pure def canPaused(v: Voicemail): bool = v.opened.playback == Playing

pure def paused(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, playback: Paused } }

pure def canPlaybackEnded(v: Voicemail): bool = v.opened.playback == Playing

pure def playbackEnded(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, playback: Stopped } }

pure def canCallChanged(v: Voicemail, inCall: bool): bool = inCall != v.inCall

pure def callChanged(v: Voicemail, inCall: bool): Voicemail =
  { ...v, inCall: inCall, opened: { ...v.opened, playback: if (inCall and v.opened.playback == Playing) Paused else v.opened.playback } }

pure def alwaysPlaybackNeedsAudio(v: Voicemail): bool = v.opened.playback != Stopped implies v.opened.audio == AudioReady

pure def alwaysNothingPlaysDuringACall(v: Voicemail): bool = v.inCall implies v.opened.playback != Playing

pure def alwaysPlayingMeansHeard(v: Voicemail): bool = v.opened.playback != Stopped implies v.opened.heard

pure def sometimesPausedByACall(v: Voicemail): bool = v.opened.playback == Paused and v.inCall
```

### A transcript is made on this phone or not at all

With the on-device recognizer not ready the transcript reads unavailable; it
never becomes a request to the cloud. A transcript that came back empty
reads failed and can be asked again.

```quint
pure def canTranscriptAsked(v: Voicemail): bool =
  v.shown and v.opened.audio == AudioReady
    and (v.opened.transcript == TranscriptNone or v.opened.transcript == TranscriptFailed or v.opened.transcript == TranscriptUnavailable)

pure def transcriptAsked(v: Voicemail): Moved =
  { state: { ...v, opened: { ...v.opened, transcript: TranscriptRunning, words: "", engine: DeviceEngine } },
    out: List(Transcribe({ ticket: v.opened.ticket, voicemail: v.opened.openId })) }

pure def canTranscriptAnswered(v: Voicemail, ticket: int): bool = v.opened.transcript == TranscriptRunning and ticket == v.opened.ticket

pure def transcriptAnswered(v: Voicemail, ticket: int, ready: bool, words: str): Voicemail =
  { ...v, opened: { ...v.opened, transcript: if (not(ready)) TranscriptUnavailable else if (words != "") TranscriptDone else TranscriptFailed,
                    words: if (ready) words else "", engine: if (ready and words != "") DeviceEngine else NoEngine } }

pure def alwaysARunningTranscriptIsOnThePhone(v: Voicemail): bool = v.opened.transcript == TranscriptRunning implies v.opened.engine == DeviceEngine

pure def alwaysATranscriptNamesItsSource(v: Voicemail): bool =
  v.opened.transcript == TranscriptDone implies (v.opened.engine == DeviceEngine or v.opened.engine == CarrierEngine)

pure def sometimesTranscribedOnThePhone(v: Voicemail): bool = v.opened.transcript == TranscriptDone and v.opened.engine == DeviceEngine

pure def sometimesNoRecognizer(v: Voicemail): bool = v.opened.transcript == TranscriptUnavailable
```

## Story: Delete one voicemail I chose

> As the owner, I want Delete to ask me first, delete exactly the voicemail I
> have open, and keep it on screen when the phone could not delete it.

### A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it

Only a removal the provider confirmed (eliza stages it in the deletion
window, whose own notice offers Undo), or a voicemail already gone, takes the
row away. An unconfirmed delete keeps the row and blocks every voicemail
write until a refresh the owner asks for: the voicemail store's write gate is
eliza's, and each read says whether it holds. A delete still in flight when
the voicemail closes is of no voicemail on screen.

```quint
pure def canDeleteAsked(v: Voicemail): bool = v.shown and v.opened.openId != "" and not(deleting(v)) and not(v.writeBlocked)

pure def deleteAsked(v: Voicemail): Voicemail = { ...v, deleteFailed: false, opened: { ...v.opened, confirming: true } }

pure def canDeleteDeclined(v: Voicemail): bool = v.opened.confirming and not(deleting(v))

pure def deleteDeclined(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, confirming: false } }

pure def canDeleteStarted(v: Voicemail): bool = v.shown and v.opened.confirming and not(deleting(v)) and not(v.writeBlocked)

pure def deleteStarted(v: Voicemail): Moved =
  val id = v.deletion.id + 1
  { state: { ...v, deletion: A::dispatch(A::record(A::plan(id))), opened: { ...v.opened, playback: Stopped } },
    out: List(DeleteVoicemail({ id: id, voicemail: v.opened.openId })) }

pure def canDeleteAnswered(v: Voicemail, id: int): bool = A::canConclude(v.deletion, id)

pure def deleteAnswered(v: Voicemail, id: int, written: VoicemailWritten): Voicemail =
  val gone = written == VoicemailRemoved or written == VoicemailGone
  val concluded = { ...v, deletion: A::conclude(v.deletion, gone, written != VoicemailUnconfirmed) }
  if (not(v.shown)) concluded
  else if (gone) { ...concluded, rows: v.rows.select(r => r.id != v.opened.openId), opened: noVoicemail(v.opened.ticket + 1) }
  else { ...concluded, deleteFailed: true, writeBlocked: v.writeBlocked or written == VoicemailUnconfirmed, opened: { ...v.opened, confirming: false } }

pure def alwaysDeletingNeedsConfirmation(v: Voicemail): bool = (deleting(v) and v.opened.openId != "") implies v.opened.confirming

pure def sometimesARefusedDeleteKeepsTheVoicemail(v: Voicemail): bool = v.deleteFailed and v.opened.openId != ""

pure def sometimesAnUnconfirmedDeleteBlocksWrites(v: Voicemail): bool = v.writeBlocked and v.opened.openId != ""

pure def sometimesDeleted(v: Voicemail): bool = v.deletion.outcome == A::Confirmed and v.shown
```
