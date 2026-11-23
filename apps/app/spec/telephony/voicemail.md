# Voicemail

The Voicemail tab of Phone: the carrier's visual voicemail as Android's voicemail provider holds
it, read only while the tab's Phone is in front, and one voicemail open at a time with its audio,
playback, transcript and a confirmed delete. The decoded audio stays in memory for the open
voicemail only. A transcript is made on this phone by the on-device recognizer, fifty seconds of
16 kHz mono audio at a time; the audio is never sent to a cloud recognizer.

## Domain

### Voicemail holds the carrier state, the listed rows and the one open voicemail

Every reply carries the ticket of the voicemail it was asked for, so a reply for a voicemail that
was closed, replaced or deleted changes nothing.

```quint
import common.* from "./common"
type Carrier = CarrierUnread | CarrierReady | CarrierUnconfigured | CarrierUnsupported
type VoicemailRow = { id: str, number: str, title: str, date: int, seconds: int, fresh: bool, hasAudio: bool, carrierText: str }
type VoicemailAnswer = VoicemailListed({ carrier: Carrier, voicemails: List[VoicemailRow], blocked: bool }) | VoicemailUnreadable
type VoicemailWritten = VoicemailRemoved | VoicemailGone | VoicemailUnconfirmed | VoicemailKept
type AudioState = AudioNone | AudioFetching | AudioReady | AudioFailed
type TranscriptState = TranscriptNone | TranscriptRunning | TranscriptDone | TranscriptFailed | TranscriptUnavailable
type Engine = NoEngine | DeviceEngine | CarrierEngine
type Playback = Stopped | Playing | Paused
type OpenVoicemail = {
  openId: str, ticket: int, audio: AudioState, transcript: TranscriptState, words: str, engine: Engine,
  playback: Playback, heard: bool, confirming: bool, deleting: bool
}
type Voicemail = { shown: bool, epoch: int, carrier: Carrier, rows: List[VoicemailRow], opened: OpenVoicemail, inCall: bool, deleteFailed: bool, writeBlocked: bool }
pure def noVoicemail(ticket: int): OpenVoicemail = {
  openId: "", ticket: ticket, audio: AudioNone, transcript: TranscriptNone, words: "", engine: NoEngine,
  playback: Stopped, heard: false, confirming: false, deleting: false
}
pure val initial: Voicemail = { shown: false, epoch: 0, carrier: CarrierUnread, rows: List(), opened: noVoicemail(0), inCall: false, deleteFailed: false, writeBlocked: false }
pure def listed(rows: List[VoicemailRow], id: str): bool = rows.some(r => r.id == id)
pure def rowOf(rows: List[VoicemailRow], id: str): VoicemailRow =
  rows.select(r => r.id == id).nthOr(0, { id: id, number: "", title: "", date: 0, seconds: 0, fresh: false, hasAudio: false, carrierText: "" })
pure val idValues = Set("v1", "v2")
pure val ticketValues = Set(0, 1, 2, 3)
pure val wordsValues = Set("", "Call me back")
pure val answerValues = Set(VoicemailUnreadable, VoicemailListed({ carrier: CarrierUnsupported, voicemails: List(), blocked: false }))
  .union(Set(VoicemailListed({ carrier: CarrierReady, voicemails: List({ id: "v1", number: "4155550100", title: "Ann", date: 1, seconds: 24, fresh: true, hasAudio: true, carrierText: "" }), blocked: false })))
  .union(Set(VoicemailListed({ carrier: CarrierReady, voicemails: List({ id: "v2", number: "", title: "", date: 2, seconds: 61, fresh: false, hasAudio: false, carrierText: "See you at five" }), blocked: true })))
```

## Story: See my voicemail only when my carrier offers it

> As the owner, I want my voicemail list to show what Android's voicemail provider holds, and a
> carrier without visual voicemail never shown as "no voicemail".

### Rows exist only for a ready carrier, and a failed read is never an empty list

The provider observer only asks for another read. A voicemail removed elsewhere closes when the
next read no longer lists it.

```quint
pure def canVoicemailShown(v: Voicemail): bool = not(v.shown)
pure def voicemailShown(v: Voicemail): Voicemail = { ...v, shown: true, epoch: v.epoch + 1 }
pure def canVoicemailHidden(v: Voicemail): bool = v.shown
pure def voicemailHidden(v: Voicemail): Voicemail = { ...initial, epoch: v.epoch + 1, opened: noVoicemail(v.opened.ticket + 1), inCall: v.inCall, writeBlocked: v.writeBlocked }
pure def canListAsked(v: Voicemail): bool = v.shown
pure def listAsked(v: Voicemail): Voicemail = { ...v, epoch: v.epoch + 1 }
pure def canListAnswered(v: Voicemail, ticket: int): bool = v.shown and ticket == v.epoch
pure def listAnswered(v: Voicemail, ticket: int, answer: VoicemailAnswer): Voicemail = {
  val carrier = match answer { | VoicemailListed(l) => l.carrier | VoicemailUnreadable => CarrierUnread }
  val rows = match answer { | VoicemailListed(l) => if (l.carrier == CarrierReady) l.voicemails else List() | VoicemailUnreadable => List() }
  val keep = v.opened.openId != "" and listed(rows, v.opened.openId)
  val blocked = match answer { | VoicemailListed(l) => l.blocked | VoicemailUnreadable => v.writeBlocked }
  { ...v, carrier: carrier, rows: rows, writeBlocked: blocked, opened: if (keep) v.opened else noVoicemail(v.opened.ticket + 1) }
}
pure def alwaysNoRowsWithoutAReadyCarrier(v: Voicemail): bool = v.carrier != CarrierReady implies v.rows.length() == 0
pure def alwaysRowsOnlyWhileShown(v: Voicemail): bool = v.rows.length() > 0 implies v.shown
pure def alwaysTheOpenVoicemailIsListed(v: Voicemail): bool = v.opened.openId != "" implies listed(v.rows, v.opened.openId)
pure def sometimesAnUnsupportedCarrier(v: Voicemail): bool = v.carrier == CarrierUnsupported and v.shown
```

## Story: Hear a voicemail

> As the owner, I want to open a voicemail, play it, and read a transcript made on my phone, and
> never have a voicemail play over a call.

### Opening a voicemail asks for its audio once, and a carrier transcript is shown as it is

Tapping the open voicemail again closes it, and so does Back on the Voicemail tab: a delete
confirmation closes first, and a delete in flight holds Back. Audio not yet on the phone asks its
source to download it first; a failed fetch can be retried.

```quint
pure def canVoicemailOpened(v: Voicemail, id: str): bool = v.shown and listed(v.rows, id) and not(v.opened.deleting)
pure def voicemailOpened(v: Voicemail, id: str): Voicemail = {
  val row = rowOf(v.rows, id)
  val fresh = noVoicemail(v.opened.ticket + 1)
  if (v.opened.openId == id) { ...v, opened: fresh }
  else { ...v, deleteFailed: false, opened: { ...fresh, openId: id, heard: not(row.fresh),
    transcript: if (row.carrierText != "") TranscriptDone else TranscriptNone,
    words: row.carrierText, engine: if (row.carrierText != "") CarrierEngine else NoEngine } }
}
pure def canVoicemailClosed(v: Voicemail): bool = v.opened.openId != "" and not(v.opened.deleting)
pure def voicemailClosed(v: Voicemail): Voicemail = { ...v, opened: noVoicemail(v.opened.ticket + 1) }
type VoicemailBack = VoicemailDeleteHolds | ConfirmCloses | VoicemailCloses | NoVoicemailBack
pure def voicemailBack(v: Voicemail): VoicemailBack =
  if (v.opened.deleting) VoicemailDeleteHolds
  else if (v.opened.confirming) ConfirmCloses
  else if (v.opened.openId != "") VoicemailCloses
  else NoVoicemailBack
pure def lawBackClosesTheConfirmationBeforeTheVoicemail(v: Voicemail): bool =
  (v.opened.confirming and not(v.opened.deleting)) implies voicemailBack(v) == ConfirmCloses
pure def canAudioAsked(v: Voicemail): bool = v.shown and v.opened.openId != "" and (v.opened.audio == AudioNone or v.opened.audio == AudioFailed)
pure def audioAsked(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, audio: AudioFetching } }
pure def canAudioAnswered(v: Voicemail, ticket: int): bool = v.opened.audio == AudioFetching and ticket == v.opened.ticket
pure def audioAnswered(v: Voicemail, ticket: int, ok: bool): Voicemail = { ...v, opened: { ...v.opened, audio: if (ok) AudioReady else AudioFailed } }
pure def alwaysAClosedVoicemailHoldsNothing(v: Voicemail): bool =
  v.opened.openId == "" implies (v.opened.audio == AudioNone and v.opened.playback == Stopped and not(v.opened.confirming))
pure def sometimesAudioReady(v: Voicemail): bool = v.opened.audio == AudioReady
```

### Playing marks a voicemail heard, and nothing plays during a call or behind the lock

Lock, background or a lost grant stop playback and close a pending delete confirmation. A call
pauses playback; play is offered again only after it ends.

```quint
pure def canPlayed(v: Voicemail): bool = v.shown and not(v.inCall) and v.opened.audio == AudioReady and v.opened.playback != Playing
pure def played(v: Voicemail): Voicemail =
  { ...v, opened: { ...v.opened, playback: Playing, heard: true }, rows: v.rows.listMap(r => if (r.id == v.opened.openId) { ...r, fresh: false } else r) }
pure def canPaused(v: Voicemail): bool = v.opened.playback == Playing
pure def paused(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, playback: Paused } }
pure def canPlaybackEnded(v: Voicemail): bool = v.opened.playback == Playing
pure def playbackEnded(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, playback: Stopped } }
pure def callChanged(v: Voicemail, inCall: bool): Voicemail =
  { ...v, inCall: inCall, opened: { ...v.opened, playback: if (inCall and v.opened.playback == Playing) Paused else v.opened.playback } }
pure def readinessLost(v: Voicemail): Voicemail =
  { ...v, opened: { ...v.opened, playback: if (v.opened.playback == Playing) Paused else v.opened.playback, confirming: v.opened.confirming and v.opened.deleting } }
pure def alwaysPlaybackNeedsAudio(v: Voicemail): bool = v.opened.playback != Stopped implies v.opened.audio == AudioReady
pure def alwaysNothingPlaysDuringACall(v: Voicemail): bool = v.inCall implies v.opened.playback != Playing
pure def alwaysPlayingMeansHeard(v: Voicemail): bool = v.opened.playback != Stopped implies v.opened.heard
pure def sometimesPaused(v: Voicemail): bool = v.opened.playback == Paused and v.inCall
```

### A transcript is made on this phone or not at all

With the on-device recognizer not ready the transcript reads unavailable; it never becomes a cloud
request. A transcript that came back empty reads failed and can be asked again.

```quint
pure def canTranscriptAsked(v: Voicemail, ready: bool): bool =
  v.shown and v.opened.audio == AudioReady
    and (v.opened.transcript == TranscriptNone or v.opened.transcript == TranscriptFailed or v.opened.transcript == TranscriptUnavailable)
pure def transcriptAsked(v: Voicemail, ready: bool): Voicemail =
  { ...v, opened: { ...v.opened, transcript: if (ready) TranscriptRunning else TranscriptUnavailable, words: "", engine: if (ready) DeviceEngine else NoEngine } }
pure def canTranscriptAnswered(v: Voicemail, ticket: int): bool = v.opened.transcript == TranscriptRunning and ticket == v.opened.ticket
pure def transcriptAnswered(v: Voicemail, ticket: int, words: str): Voicemail =
  { ...v, opened: { ...v.opened, transcript: if (words != "") TranscriptDone else TranscriptFailed, words: words, engine: if (words != "") DeviceEngine else NoEngine } }
pure def alwaysARunningTranscriptIsOnThePhone(v: Voicemail): bool = v.opened.transcript == TranscriptRunning implies v.opened.engine == DeviceEngine
pure def alwaysATranscriptNamesItsSource(v: Voicemail): bool =
  v.opened.transcript == TranscriptDone implies (v.opened.engine == DeviceEngine or v.opened.engine == CarrierEngine)
pure def sometimesTranscribedOnThePhone(v: Voicemail): bool = v.opened.transcript == TranscriptDone and v.opened.engine == DeviceEngine
pure def sometimesNoRecognizer(v: Voicemail): bool = v.opened.transcript == TranscriptUnavailable
```

## Story: Delete one voicemail I chose

> As the owner, I want Delete to ask me first, delete exactly the voicemail I have open, and keep it
> on screen when the phone could not delete it.

### A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it

Alpha's request to delete the open voicemail asks the same confirmation. Only a removal the
provider confirmed, or a voicemail already gone, takes the row away. The provider's answer is a
status (`deleted`, `not-found`, `unconfirmed`, or kept): an unconfirmed delete keeps the row and
blocks every voicemail write until an explicit refresh that began after it (the voicemail store's
write gate, upstream `spec/os/android/voicemail.md`).

```quint
pure def canDeleteAsked(v: Voicemail): bool = v.shown and v.opened.openId != "" and not(v.opened.deleting) and not(v.writeBlocked)
pure def deleteAsked(v: Voicemail): Voicemail = { ...v, deleteFailed: false, opened: { ...v.opened, confirming: true } }
pure def canDeleteDeclined(v: Voicemail): bool = v.opened.confirming and not(v.opened.deleting)
pure def deleteDeclined(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, confirming: false } }
pure def canDeleteStarted(v: Voicemail): bool = v.shown and v.opened.confirming and not(v.opened.deleting) and not(v.writeBlocked)
pure def deleteStarted(v: Voicemail): Voicemail = { ...v, opened: { ...v.opened, deleting: true, playback: Stopped } }
pure def canDeleteAnswered(v: Voicemail, ticket: int): bool = v.opened.deleting and ticket == v.opened.ticket
pure def deleteAnswered(v: Voicemail, ticket: int, written: VoicemailWritten): Voicemail =
  if (written == VoicemailRemoved or written == VoicemailGone) { ...v, rows: v.rows.select(r => r.id != v.opened.openId), opened: noVoicemail(v.opened.ticket + 1) }
  else { ...v, deleteFailed: true, writeBlocked: v.writeBlocked or written == VoicemailUnconfirmed, opened: { ...v.opened, confirming: false, deleting: false } }
pure def alwaysDeletingNeedsConfirmation(v: Voicemail): bool = v.opened.deleting implies (v.opened.confirming and v.opened.openId != "")
pure def sometimesARefusedDeleteKeepsTheVoicemail(v: Voicemail): bool = v.deleteFailed and v.opened.openId != ""
pure def sometimesAnUnconfirmedDeleteBlocksWrites(v: Voicemail): bool = v.writeBlocked and v.opened.openId != ""
pure def sometimesDeleted(v: Voicemail): bool = v.carrier == CarrierReady and v.rows.length() == 0 and v.opened.ticket > 2
```
