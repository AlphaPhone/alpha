# Share, copy and document transfer

The owner's explicit share of the one note on screen: the system share sheet, Copy text, an email draft
in Inbox, or saving the note as a text file. Each acts on a snapshot of the selected note taken when the
owner chose, and only while that note is still the one on screen unchanged. Nothing is sent by Notes:
an email is only a draft for the owner to review and send in Inbox. There is no import or export of app
data; reading a text file into a new note exists only in builds that allow test mocks.

## Story: Share the note I have open

> As the owner, I want to share, copy, email or save the note I am looking at, exactly as it is, and
> never anything else.

### A share acts on the open note's snapshot, only while it is still the same note

The snapshot is the note's export text. A share whose note changed, closed or left the screen does
nothing. Email opens an Inbox draft with the title as subject and the text as body; Notes sends nothing.

```quint
type ShareChannel = SystemShare | CopyText | EmailDraft | SaveText
pure def shareAllowed(noteOpen: bool, sameSnapshot: bool, active: bool): bool = noteOpen and sameSnapshot and active
pure def channelSendsMessage(channel: ShareChannel): bool = false
pure def lawNotesNeverSendsMail(channel: ShareChannel): bool = not(channelSendsMessage(channel))
pure def lawChangedNoteIsNotShared(noteOpen: bool, active: bool): bool = not(shareAllowed(noteOpen, false, active))
```

### The export text is the note's own words by kind, and a voice note says its audio is not included

A text note exports its body; a checklist its items with [x] or [ ] marks; a link its address and clips.
A voice note exports its transcript, or says no transcript was saved, then its summary and action items,
and states that the audio is not included. A saved text file is valid UTF-8 of at most 64 KiB.

```quint
type VoiceExportPart = AudioNotIncluded | TranscriptPart | NoTranscriptPart | SummaryPart | ActionsPart
pure def voiceExport(hasTranscript: bool, hasSummary: bool, hasActions: bool): List[VoiceExportPart] = {
  val opening = List(AudioNotIncluded).append(if (hasTranscript) TranscriptPart else NoTranscriptPart)
  val summarized = if (hasSummary) opening.append(SummaryPart) else opening
  if (hasActions) summarized.append(ActionsPart) else summarized
}
pure def textExportFits(utf8Bytes: int, validUtf8: bool): bool = validUtf8 and utf8Bytes >= 0 and utf8Bytes <= 65536
pure val utf8BytesValues = Set(0, 65536, 65537)
pure def lawVoiceExportNamesMissingAudio(hasTranscript: bool, hasSummary: bool, hasActions: bool): bool =
  voiceExport(hasTranscript, hasSummary, hasActions).head() == AudioNotIncluded
pure def lawOversizedExportRefused(validUtf8: bool): bool = not(textExportFits(65537, validUtf8))
```

## Story: Save a note as a file, with the result shown where I asked for it

> As the owner, I want one document operation at a time, and its result shown in the Notes visit I
> started it from, even when the system picker covered Alpha.

### One document operation runs at a time, and its receipt shows only in its own visible visit

A second choice while one runs is refused as busy. A result after Notes was left is dropped. A receipt
issued on a visible page shows at once; on a hidden page it waits until the page is visible again and then
shows only in the visit it belongs to. An import stores its note only after a completed read.

```quint
type TransferKind = NoTransfer | ImportText | ExportText
type TransferResult = TransferDone | TransferRefused | TransferThrew
type Transfer = { active: bool, hidden: bool, visit: int, busy: bool, kind: TransferKind, token: int,
  waiting: List[int], shown: int, dropped: int, settled: int, imported: int, reads: int, refusedBusy: int, lastShownVisit: int }
pure val initial: Transfer = { active: true, hidden: false, visit: 0, busy: false, kind: NoTransfer, token: 0,
  waiting: List(), shown: 0, dropped: 0, settled: 0, imported: 0, reads: 0, refusedBusy: 0, lastShownVisit: -1 }
pure def delivered(dummy: int, s: Transfer): Transfer =
  s.waiting.foldl({ ...s, waiting: List() }, (acc, token) =>
    if (token == s.visit and s.active) { ...acc, shown: acc.shown + 1, lastShownVisit: token } else { ...acc, dropped: acc.dropped + 1 })
pure def issued(dummy: int, s: Transfer): Transfer = if (s.hidden) s else delivered(0, s)
pure def canChooseTransfer(s: Transfer, kind: TransferKind, testMocks: bool): bool =
  kind != NoTransfer and s.active and not(s.hidden) and (kind == ExportText or testMocks)
pure def chooseTransfer(s: Transfer, kind: TransferKind, testMocks: bool): Transfer =
  if (s.busy) { ...s, refusedBusy: s.refusedBusy + 1 } else { ...s, busy: true, kind: kind, token: s.visit }
pure def canTransferSettled(s: Transfer, result: TransferResult, stored: bool): bool = s.kind != NoTransfer
pure def transferSettled(s: Transfer, result: TransferResult, stored: bool): Transfer = {
  val present = s.token == s.visit
  val finished = { ...s, busy: false, kind: NoTransfer, settled: s.settled + 1 }
  issued(0, if (result == TransferThrew) (if (present) { ...finished, waiting: s.waiting.append(s.visit) } else finished)
    else if (not(present) or not(s.active)) finished
    else if (s.kind == ImportText and result == TransferDone)
      { ...finished, reads: s.reads + 1, imported: if (stored) s.imported + 1 else s.imported,
        waiting: if (stored) s.waiting.append(s.visit) else s.waiting }
    else { ...finished, waiting: s.waiting.append(s.visit) })
}
pure def canLeaveTransfer(s: Transfer): bool = s.active
pure def leaveTransfer(s: Transfer): Transfer = { ...s, active: false, visit: s.visit + 1 }
pure def canEnterTransfer(s: Transfer): bool = not(s.active)
pure def enterTransfer(s: Transfer): Transfer = { ...s, active: true }
pure def canHidePage(s: Transfer): bool = not(s.hidden)
pure def hidePage(s: Transfer): Transfer = { ...s, hidden: true }
pure def canShowPage(s: Transfer): bool = s.hidden
pure def showPage(s: Transfer): Transfer = delivered(0, { ...s, hidden: false })
pure def alwaysSingleDocumentOperation(s: Transfer): bool = s.busy == (s.kind != NoTransfer)
pure def alwaysImportNeedsCompletedRead(s: Transfer): bool = s.imported <= s.reads and s.reads <= s.settled
pure def alwaysReceiptFollowsFinishedOperation(s: Transfer): bool = s.waiting.length() + s.shown + s.dropped <= s.settled
pure def alwaysWaitingReceiptNotFromLaterVisit(s: Transfer): bool = s.waiting.every(token => token <= s.visit)
pure def alwaysReceiptWaitsOnlyWhileHidden(s: Transfer): bool = s.waiting.length() > 0 implies s.hidden
pure def alwaysShownReceiptFromOwnVisit(s: Transfer): bool = s.lastShownVisit <= s.visit and (s.shown == 0 iff s.lastShownVisit == -1)
pure def sometimesReceiptWaitsForVisiblePage(s: Transfer): bool = s.waiting.length() > 0 and s.hidden and not(s.busy)
pure def sometimesLateResultDropped(s: Transfer): bool = s.dropped > 0
pure def sometimesExported(s: Transfer): bool = s.shown > 0 and s.imported == 0
```
