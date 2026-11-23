# Alpha parity audit: `notes` and `files`

Trees: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream `eliza-develop` / `eliza-vs`.
Read-only audit. Nothing was built, generated or run; every claim below is from reading source.
Paths are relative to the tree named in each line (`L:` legacy alpha, `P:` port alpha, `EL:` eliza-develop, `EV:` eliza-vs).

## Summary

| Class | Count |
| --- | --- |
| OK | 49 |
| MISSING | 5 |
| CHANGED | 7 |
| UNIMPLEMENTED | 4 |
| UNMODELED | 2 |
| UNVERIFIED | 4 |
| KNOWN | 8 |
| RETIRED | 0 |

**Verdict.** `files` is close to parity: the native plugin is unchanged apart from one removed method, every
legacy Files story I checked has a rule and shell/UI code, and the only gaps are a not-adopted Recent index
and unverified limits. `notes` is **not** at parity. The port keeps only the agent's canonical Notes and
silently drops the phone's own "Previous notes" collection (`notes-records:v1:device`), which legacy kept
reachable through a visible route as recently as 14 Nov; this is not in the open-items doc. Three further
Notes gaps would be noticed on the first day of use: voice-note audio is transcribed on the Cloud/provider
route automatically while recording (legacy made transcription an explicit, later choice), existing
"From note" origin links are unreadable and then overwritten because the stored index shape changed, and
the Notes list never re-reads after the agent changes a note. Several editor controls (pin, checklist
conversion, reminder from a note) are specified or shown but do nothing. Durable data that *is* carried
over correctly: the folder list, the device Trash rows (with the known limits), canonical voice recordings
and their native custody.

## Gaps

Most severe first.

### 1. MISSING: the phone's "Previous notes" collection has no route and no import (durable data)

- **Behaviour.** Notes saved on the phone before canonical Notes (encrypted slot `notes-records:v1:device`,
  plus the older localStorage keys `alphaphone:notes:v2`, `alphaphone:prototype:notes:v1`,
  `alphaphone:daily:v1`) stay reachable from Notes options as "Previous notes", never mixed with agent Notes.
- **Legacy evidence.** `L:apps/app/src/prototype/canonical-notes-ui.ts:386-396` (source menu,
  `notesTitle:'Previous notes'`, `previousNotesAction`); `L:apps/app/src/prototype/agent-adapter.ts:1599`
  (`notesSourceOptions.push({id:'legacy',label:'Previous notes',…})`);
  `L:apps/app/src/prototype/legacy-notes-access.ts` (whole file: presence probe and guarded open);
  `L:apps/app/src/runtime/notes-secure-store.ts:9-14`. Tests: `L:test/browser/legacy-notes-access.spec.ts`
  (4 tests), `L:test/browser/canonical-notes.spec.ts` "Notes keeps previous device data behind an explicit
  recovery route without mixing collections", `L:test/notes-owner-retirement.test.mjs`. Recent fixes:
  fb3c5a1f4 (14 Nov, "Keep retained phone notes in Notes options"), c8de1738d, bb5163d6a. #1422 did not
  retire it (the files are still on develop after #1422).
- **Port evidence.** `P:apps/app/spec/notes/collection.md:91-97`: "The phone keeps no copy of its own and
  never reads, migrates or cleans an earlier store." `P:apps/app/spec/notes/index.md:9-13` mentions only
  folders, origins, Trash and the draft. The "earlier Notes document" the agent imports is the agent's own
  `notes-state` file (`EV:packages/notes/src/prior.vibe:35-60`, `EV:packages/notes/src/store.vibe:87-107`),
  not this slot. No reader of `notes-records:v1:device` exists under `P:apps/app/src`
  (`rg notes-records` hits only `android/` and legacy tests). The open-items doc lists the draft slot and
  the Trash import limits, not this collection.
- **Side effects that make it worse.**
  - The same collection's *deleted* notes are imported (`P:apps/app/src/notes/legacyTrash.vibe:40-70`)
    while its live notes are not.
  - `P:apps/app/src/notes/sources.vibe:137-142` (`releaseUnused`, run from `P:apps/app/src/notes/layer.vibe:50-51`
    on every reference change) tells Android to keep only the document references the *canonical* snapshot
    names. Legacy reconciled references only against the device collection and only while Previous notes was
    the selected source (`L:apps/app/src/prototype/notes-trash-adapter.ts:57,66`). After three days the
    read grants of every document a Previous note links to are released
    (`P:android/…/AlphaMailAttachmentsPlugin.java:138-146`); that cannot be undone by a later import.
- **User impact.** After the update every note the owner wrote before canonical Notes disappears from the
  phone's UI. The bytes stay in the encrypted slot, but nothing can show them.
- **Smallest fix.** Add a rule to `P:apps/app/spec/notes/collection.md` ("Notes kept on the phone before
  this version are brought into the collection once") and an importer beside `legacyTrash.vibe`
  (`src/notes/legacyRecords.vibe`: read `notes-records:v1:device` through `AlphaConnection.secureRead`,
  `create-note` each record under `creationId: legacy-note:<id>`, rebind voice audio, clear the slot only
  when every record is settled). Until then: make `releaseUnused` a no-op while that slot is non-empty, and
  add the decision to `docs/vibestack-open-items.md` under "Legacy slots not carried over".

### 2. CHANGED: a voice note's audio is transcribed automatically while recording (consent / privacy / cost)

- **Behaviour.** A Notes recording is audio only. Nothing is sent to a speech provider or local model until
  the owner taps Generate transcript on the saved note.
- **Legacy evidence.** `L:apps/app/src/prototype/voice-adapter.ts:1269-1282`: "A voice note records audio
  only. Transcription is a separate explicit action; opening or saving this recorder never starts a speech
  provider or local model", session built with transcriber `async () => null` and
  `automaticTranscription:false`. `L:apps/app/src/prototype/note-recorder.ts:382-384` (pump refuses without
  it, and refuses a remote route without `remoteApproved`). Commits 4ac92128d, 4ee3b9727, 0b868526d (7 Nov).
  Tests: `L:test/notes-recorder.test.mjs` "audio-first recording never starts automatic transcription even
  with a local transcriber", "a Cloud route without an account asks for sign-in only after the owner chooses
  transcription", "a remote recording needs a choice after Stop…"; `L:test/browser/canonical-notes.spec.ts`
  "Stop saves canonical audio locally and Generate transcript later uses its retained recording only on request".
- **Port evidence.** `P:apps/app/spec/notes/recorder.md:76-81` ("Segments are transcribed in order while the
  recording goes on"). `P:apps/app/src/notes/recorder.vibe:133-157` (`pump` calls `transcribeKept` for each
  finished segment) invoked from `absorb` at `:187` on every native status. `transcribeKept` runs on the
  route in use (`P:apps/app/src/voice/transcription.vibe:22-49`: `transcribeRecording` with the Cloud
  credential, or `transcribeOwnRecording` with the owner's provider key).
- **User impact.** Every 30-second segment of a private voice note leaves the phone to Cloud or the owner's
  provider, and is billed, without a choice. The spec rule was written from the recorder class's optional
  mode, not from what the product configured.
- **Smallest fix.** Rewrite the rule in `spec/notes/recorder.md` (drop `segmentTranscribed` from the live
  path, keep it for recovered journal text only); delete the `pump` call in `recorder.vibe:187`; keep
  `NotesAudio.transcribe` as the only upload path.

### 3. CHANGED: stored origin links ("From note") are unreadable after the update and then overwritten

- **Behaviour.** A saved event or reminder keeps its link to the note it was made from; a malformed index
  is refused, never partly trusted; an existing link is never replaced.
- **Legacy evidence.** Index shape `{version:1, links:{ "<kind>:<id>": {…link, savedAt} }}`:
  `EL:plugins/plugin-notes/src/client/note-origin.ts:31-34,198-227`; add never replaces and evicts the oldest
  past 200: `:235-257`; series key `:188-190`. Slot and read/CAS:
  `L:apps/app/src/prototype/note-origin-adapter.ts:5-21`. Test `L:test/note-origin.test.mjs` (8 tests).
- **Port evidence.** `P:apps/app/src/notes/notes.schema.vibe:86-94`: `links` is an **array** of
  `{kind, recordId, link, linkedAt}`. `P:apps/app/src/notes/origins.vibe:57-62`: a slot that does not decode
  reads as `links: []` with its raw text kept; `:74-78`: the next `remember` compare-exchanges that raw text
  for a new array-shaped index. The slot is adopted byte-for-byte (`P:apps/app/src/notes/slots.vibe:21-31`,
  `P:android/…/ElizaSecureStorePlugin.java:40,59-74`). Record ids also changed: legacy keyed an agent event
  by its event key (`L:apps/app/src/prototype/agent-calendar-adapter.ts:302`), the port by
  `agent-event:<sha256(key)>` (`P:apps/app/src/calendar/screen.vibe:33-37`). `remember` also replaces an
  existing link (`origins.vibe:93`), has no eviction, and at 2,001 links the whole index stops decoding.
- **User impact.** Every "From note" line on events and reminders made before the update vanishes; the
  first event saved from a note afterwards destroys the old links for good.
- **Smallest fix.** `spec/notes/origins.md`: add "An earlier index is read in the shape it was stored, and an
  index that cannot be read is never written over". `origins.vibe` `index()`: decode the legacy record shape
  and convert (`event:<key>` → `agent-event:<sha256>`), return a "blocked" result for anything else and
  make `edit` refuse it; keep-first on `remember`; bound at 200 with oldest-first eviction.

### 4. UNIMPLEMENTED: the collection is never re-read after the agent changes notes, on entering Notes or on resume

- **Behaviour.** Notes follows each note change a chat reply reports, re-reads when the owner enters Notes
  and when the app returns to the foreground on Notes.
- **Legacy evidence.** `L:apps/app/src/runtime/connection-ui.tsx:3426` (dispatches
  `alpha:canonical-notes-invalidated` from the reply's effect receipts, `L:apps/app/src/runtime/app-record-completion.ts`);
  listener `L:apps/app/src/prototype/canonical-notes-controller.ts:25-31` and `canonical-notes-ui.ts:88`;
  enter and resume refresh `L:apps/app/src/prototype/agent-adapter.ts:1515` and `:969`. Tests
  `L:test/browser/notes-chat-changes.spec.ts`, `canonical-notes.spec.ts` "an agent append refreshes the open
  note and its row, and a stale owner edit is kept for review".
- **Port evidence.** The rule exists (`P:apps/app/spec/notes/collection.md:42-58`, `invalidate`), but
  `NotesCollection.invalidate` has one caller (`P:apps/app/src/notes/trash.vibe:173`) and `refresh` only
  Trash and Try again (`trash.vibe:117,143,176`, `editor.vibe:328,355`). `followForeground`
  (`P:apps/app/src/notes/layer.vibe:71-88`) refreshes nothing. A reply that changed notes only adds a
  "Notes changed" chat row (`P:apps/app/src/assistant/composer.vibe:487-489`); `AgentChanges.settle`
  refreshes only Workflows (`P:apps/app/src/workflows/changes.vibe:70-73`).
- **User impact.** The agent says it saved or edited a note; the list does not show it until the owner
  signs in again or opens Recently deleted. Edits then save against a stale revision and land in review.
- **Smallest fix.** `src/notes/layer.vibe` `followForeground`: `collection.refresh()` when Notes becomes the
  visible view. Shell composition: after `changes.settle`, call
  `NotesCollection.invalidate(summary.notesRevision)` when `notesRevision !== undefined`.

### 5. UNIMPLEMENTED: "Review reminder" on a note does nothing, and reminder back-links are never stored or shown

- **Behaviour.** A note becomes a reminder draft the owner reviews; the saved reminder links back to the note.
- **Legacy evidence.** `L:apps/app/src/prototype/canonical-notes-ui.ts:281-297` (reminder branch opens the
  Calendar form on `alpha-reminders`); `L:apps/app/src/prototype/reminder-adapter.ts:330`
  (`rememberNoteOrigin('reminder',…)`). Test `L:test/browser/journey-b-voice-note-actions.spec.ts`.
- **Port evidence.** Rule `P:apps/app/spec/notes/origins.md:8-13` names reminders. Menu item
  `P:apps/app/src/web/notes/NoteEditor.tsx:74`; `P:apps/app/src/web/notes/NotesScreen.tsx:127-133` toasts
  "Check time"; `P:apps/app/src/notes/origins.vibe:81-88` publishes a `calendar-draft`;
  `P:apps/app/src/calendar/handoffs.vibe:88` returns false for any kind but `event`;
  `P:apps/app/src/shell/handoffs.vibe:64` ignores it. No caller of `remember("reminder", …)`,
  `view("reminder", …)` or `open("reminder", …)` exists (`rg` over `P:apps/app/src`).
- **User impact.** The owner taps Review reminder, sees "Check time", and nothing opens.
- **Smallest fix.** Clock consumes `calendar-draft` of kind `reminder` (its create form in `src/clock`) and
  calls `NotesOrigins.remember("reminder", id, link, true)` after the save reads back; or remove the menu
  item and the word "reminder" from the rule until then.

### 6. MISSING: a note cannot be pinned or unpinned

- **Legacy evidence.** `L:apps/app/src/prototype/template.html:2704` (Note actions → `notes.ed.pin`), voice
  view `notes.vo.pin`; tests `canonical-notes.spec.ts` "a checklist, pin and Back leave Alpha cards in the
  same canonical record", `notes-photos-list-focus.spec.ts` "a saved Notes pin change retains focus…".
- **Port evidence.** `P:apps/app/src/web/notes/NoteEditor.tsx:67-79` has no pin item; the list only shows
  the mark (`P:apps/app/src/web/notes/NotesList.tsx:34`). No rule in `spec/notes/*.md` states how a pin changes.
- **Impact / fix.** Existing pins stay but cannot be changed. Add a rule to `spec/notes/editor.md` and a
  Pin/Unpin item in `NoteEditor.tsx` that calls `onEdit({ format: { …, data: { …, pinned } } })`.

### 7. UNIMPLEMENTED: text cannot be turned into a checklist or back, and no checklist can be created

- **Legacy evidence.** `L:apps/app/src/prototype/template.html:2670` (`notes.ed.toggleList`, label "Turn into
  checklist" / "Turn into text"); `L:test/notes-view.test.mjs` "a checklist turned into text and back keeps
  each item and its checked state"; `L:test/browser/note-read-aloud.spec.ts` (expects the "Turn into
  checklist" button).
- **Port evidence.** Rule `P:apps/app/spec/notes/list.md:156-170`; helpers
  `P:apps/app/src/notes/list.vibe:247,255` are called only from tests; `NoteEditor.tsx` has no control;
  `P:apps/app/src/web/notes/NotesScreen.tsx:198` creates `"text"` only.
- **Fix.** A toolbar button in `NoteEditor.tsx` that swaps `format` through `checklistItems`/`checklistText`.

### 8. CHANGED: an owner change or sign-out drops an unsaved edit without telling the owner

- **Legacy evidence.** `L:apps/app/src/prototype/canonical-notes-ui.ts:154` (`hooks.dropped`); test
  `L:test/canonical-notes-webview-abort.test.mjs` "a connection change with an unsaved edit tells the owner
  the edit was dropped"; commit 5ebcbf2e8.
- **Port evidence.** `P:apps/app/src/notes/editor.vibe:205-212`: `publish(undefined)` sends `retireOwner`
  and clears the draft; `keepFailedDraft` (`:126-137`) runs only after a failed save.
  `P:apps/app/spec/notes/editor.md:36-37` resets to `initial`.
- **Fix.** In `publish(undefined)`, when `dirty(state)`: keep the draft in the draft slot and raise a notice;
  state it in `spec/notes/editor.md`.

### 9. UNIMPLEMENTED: a kept draft of a never-saved new note is never offered back

- **Port evidence.** `P:apps/app/spec/notes/editor.md:226-229` promises "closing Alpha loses nothing".
  `editor.vibe:131-134` keeps a new note under `noteId: ""`; `drafts.vibe:31-34` merges by `noteId`, so two
  new notes overwrite each other; `offer` is called only from `openNote(id)` (`editor.vibe:232-240`).
  Nothing reads an `added` change back.
- **Legacy.** Canonical Notes kept failed drafts in memory only, so this is a broken new promise, not a
  regression; legacy Previous notes did reapply added notes (`EL:plugins/plugin-notes/src/client/notes-draft.ts`).
- **Fix.** Key kept additions by `creationId`; on bind, show them through the existing `keptReviews` bar.

### 10. CHANGED: one unusual row makes the whole earlier device Trash import fail silently

- **Legacy evidence.** Stored notes are validated only for id, title type and kind
  (`EL:plugins/plugin-notes/src/client/notes-store.ts:32-47`); no length or colour limits.
- **Port evidence.** `P:apps/app/src/notes/notes.schema.vibe:125-147` requires title ≤ 240, body ≤ 20,001,
  item text strings, colour in four literals, `index ≥ 0`. `legacyTrash.vibe:45-46`: a document that does not
  decode returns 0; nothing is imported and nothing is shown. Beyond the KNOWN limits bullet.
- **Fix.** Decode entry by entry; import what reads, hold the rest, and say "Earlier deleted notes need review".

### 11. MISSING: a denied microphone no longer opens the access panel

- **Legacy evidence.** `L:apps/app/src/prototype/voice-adapter.ts:1283-1286` (`STARTUP_PERMISSIONS_REOPEN`
  with `permission:'microphone'`); test `L:test/browser/notes-permission-recovery.spec.ts`; commit 4f9c07602.
- **Port evidence.** `P:apps/app/src/notes/recorder.vibe:63` maps to `RefusedPermission`; the recorder shows
  "Mic off" (`P:apps/app/src/web/notes/messages.ts`) and a retry; no surface is opened.
- **Fix.** Rule in `spec/notes/recorder.md`; `NotesScreen.tsx` opens the startup-permissions surface on `MicOff`.

### 12. MISSING: voice-note view actions

- **Legacy evidence.** `L:apps/app/src/prototype/template.html:2736-2746` and the voice view below it:
  Cancel transcription, "Ask Alpha about this transcript", Copy text, tick an action item (`a.toggle`), play
  from a transcript line (`l.seek`). Test `L:test/saved-note-transcript.test.mjs` "cancel keeps the audio and
  never begins another window or save".
- **Port evidence.** `P:apps/app/src/web/notes/NoteEditor.tsx:103-117`: play/pause, Generate transcript
  (spinner, no cancel), read-only summary and actions. `P:apps/app/src/notes/audio.vibe:41-69` has no
  cancellation, so a long recording keeps uploading windows after the owner leaves the note.
- **Fix.** Cancel in `NotesAudio` (interrupt between windows) plus the button; action ticks via `onEdit`.

### 13. CHANGED: Copy draft omits checklist items

- **Legacy evidence.** `canonical-notes-ui.ts:138-155` copies `noteShareText(note)`; test
  `L:test/canonical-notes-draft-copy.test.mjs` "Copy draft includes edited checklist state and authored text".
- **Port evidence.** `P:apps/app/src/web/notes/NotesScreen.tsx:212,217` copy `title` + `body` only; a
  checklist draft's items live in `format`.
- **Fix.** Copy through `noteShareText` as `NotesShare` does.

### 14. CHANGED: Recently deleted no longer shows when a note was deleted

- **Legacy evidence.** `canonical-notes-ui.ts:334,346-347` ("Deleted <date and time>" on each row and in the
  review dialog); test "canonical Trash dates the deletion…".
- **Port evidence.** `P:apps/app/src/web/notes/NotesTrash.tsx:44-49`: title and kind; days left only with the
  three-day choice.

### 15. CHANGED (files): the Recent index and its grants are not carried over

- **Legacy evidence.** `L:apps/app/src/prototype/files-index.ts:13-16` (`alpha.files.recent.v1`,
  `alpha.files.open.v1`, limit 24).
- **Port evidence.** `P:apps/app/src/files/layer.vibe:41-44` stores Recent under
  `ownerKey("device","files/recent")`; nothing reads the old keys. Up to 24 native document grants held for
  old rows are never released (the native table holds 32).
- **Fix.** Read the old keys once into the Recent machine (or release their `selectionId`s) in `preview.vibe`.

### 16. MISSING (low): a note cannot be read aloud

- **Legacy evidence.** `L:apps/app/src/prototype/local-speech-playback.ts:60` (`speakNote`),
  `voice-adapter.ts:1484-1500`; `L:test/browser/note-read-aloud.spec.ts`. The legacy editor had no button
  either ("reading a note is asked of Alpha"), so only the entry point is lost.
- **Port evidence.** No note reading under `P:apps/app/src/notes` or `src/voice` (`rg -i "speakNote|read.*note"`).

### 17. UNMODELED: `recordingClock` and its legacy proof

- Legacy proved the clock arithmetic (`L:specs/lemma/apps/app/src/prototype/note-recorder.dfy`,
  `recordingClockParts_ensures`). The port hand-writes it in `P:apps/app/src/notes/recorder.vibe:70-77`
  with no rule and no `.proof.dfy`. No `.proof.dfy` exists anywhere under `P:apps/app/spec`.

### 18. UNMODELED: the Files Move/Copy destination picker

- `P:apps/app/src/web/files/FilesScreen.tsx` `beginDest`/`openDest`/`confirmDest` (open where the items are,
  fall back to the root, new folder from the picker; legacy `L:test/files-browser-view.test.mjs` FILE-16
  cases) is React-local state with no rule in `spec/files/*.md`.

### UNVERIFIED

- **Generate transcript's service choice.** Legacy 0b868526d "Require an explicit service choice for Notes
  transcription"; the port uploads on the current route at one tap (`audio.vibe:41-52`) and refuses on the
  Device route. I did not read the legacy choice flow closely enough to class it.
- **Chat attachment limits.** Native `storageReadAttachment` (20 MiB cap, MIME allow-list, three identity
  checks; `L:android/…/AlphaFilesPlugin.java:149-177`) is removed. The port reads through `storageSelect` +
  `readSelected` with identity before and after (`P:apps/app/src/files/picker.vibe:101-110`). Same custody;
  size and type limits now depend on the caller's `accepts` and on `DailyApps.readSelected`.
- **Interrupted permanent voice deletions.** Rows in `notes-audio-deletions:v1:device` are no longer
  finished by the renderer; only the native start-up backstop does
  (`P:android/…/AlphaNoteAudioPlugin.java:57-60,155-185`), and it needs `notes-records` readable.
- **Files email draft.** `spec/files/emailDraft.md` and `src/files/share.vibe` `email` were not read
  line by line against `L:test/browser/file-email.spec.ts` (6 tests).

### KNOWN (already in `docs/vibestack-open-items.md`)

- Legacy unsaved-edit slot `notes-draft:v1:device` is not adopted ("Legacy slots not carried over").
- Legacy Trash import: new IDs, fresh `deletedAt`, recordings stay in the device audio trash (last Owner bullet).
- `NotesListFilter.negotiate` and `filesCapabilities` have no caller until the shell fills
  `AdvertisedCapabilities` ("Areas consuming assistant changes → Notes"); `negotiate` is uncalled
  (`P:apps/app/src/notes/listFilter.vibe`), so `notes_list_filter` is refused today.
- `create_note` still treats "Workflows in front" as the run (`operations.vibe` `saveNote`).
- `read_selected_notes`/`create_note` can answer DEVICE_STEP_UNSUPPORTED (Upstream → agent); no shared-note
  read-reply lease (Upstream → agent/client).
- Held values have no review UI; tests under `test/notes` do not cover them ("Inbox, Notes and Telephony").
- Tesseract OCR assets not set up (Tooling), so local OCR to a note cannot run.
- Nothing was generated, compiled or run; `gen/notes__*` names such as `noteSaveResult` are unchecked.

### Vibestack usage in this slice

- Every `###` rule in `spec/notes` (73) and `spec/files` (89) has a Quint block with at least one
  `always`/`law`/`step`/`sometimes` property. No rule lacks a model.
- Conformance: one driver, `P:apps/app/test/drivers/notes__folders.ts`. The other 16 Notes models and all 13
  Files models have none; `test/notes/*.test.vibe` and `test/files/*.test.vibe` are journey tests over fakes.
- Shell logic that decides what the model should: the transcript pump (`recorder.vibe:133-157`), the
  origin index merge (`origins.vibe:90-96`), the legacy Trash loop (`legacyTrash.vibe:49-67`), and
  `priorNeedsReview` matching upstream's English sentence (`collection.vibe:8-10` against
  `EV:packages/notes/src/store.vibe:107`).
- Dead model surface: `invalidate` (gap 4), the reminder half of origins (gap 5), `checklistItems`/
  `checklistText` (gap 7), `NotesListFilter.negotiate` (KNOWN).
- No `.meta.tsx`: `web/notes/NotesScreen.tsx`, `web/notes/NotesRecordingIndicator.tsx`, `web/files/FilesScreen.tsx`.
- The port's Notes test harness fixes the speech route to Cloud (`P:apps/app/test/notes/harness.vibe`), so
  its recorder test exercises gap 2 as intended behaviour.

## Confirmed OK

Spec rule titles are abbreviated; all are `###` rules in the named file under `P:apps/app/spec`.

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Collection bound to one owner; retire clears it | `prototype/canonical-notes-controller.ts:7-22` | notes/collection.md "A collection is bound to one owner…" | `src/notes/collection.vibe:79-94`, `layer.vibe:53-64` |
| A read publishes only for its ticket, never an older revision | `ui/notes/notes-controller.ts` | collection.md "A read publishes only for its own ticket…" | `collection.vibe:53-64` |
| One mutation at a time; an uncertain one stays under review | `canonical-notes-ui.ts:75-83` | collection.md "One mutation runs…", "A mutation is confirmed only by its own reply…" | `collection.vibe:100-116` |
| Status line: Opening, Unsaved, Couldn't open, Unconfirmed | `canonical-notes-ui.ts:131-134` | collection.md "The status line says what is wrong in one word" | `web/notes/messages.ts`, `NotesScreen.tsx:101` |
| Agent's unreadable earlier document shows review, not an empty list | `test/notes-state-trash-compat.test.mjs` | collection.md "Earlier notes are part of the collection…" | `collection.vibe:8-10,59`, `NotesScreen.tsx:192` |
| Typing during a save queues one follow-up save | `ui/notes/notes-editor.ts`; `notes-pending-save.spec.ts` | editor.md "A save captures the draft…" | `editor.vibe:159-192` |
| Back saves an edit, drops an untouched new note | `canonical-notes-ui.ts:160-170` | editor.md "Leaving saves an edited draft first…" | `editor.vibe:259-272` |
| Delete waits for the save; a never-saved note closes with no request | `canonical-notes-ui.ts:200-210` | editor.md "A delete of an edited note waits…" | `editor.vibe:297-318` |
| Delete/restore confirmed only when the reply moves that note | `test/quint-canonical-notes-mutation.test.mjs` | editor.md "A delete or restore is confirmed only…" | `editor.vibe:139-158` |
| Try again: confirm, rebase only onto an untouched record | `canonical-notes-ui.ts:302-333` | editor.md "Try again confirms words already saved…" | `editor.vibe:324-343` |
| Failed save keeps the draft (now encrypted on the phone) | `canonical-notes.spec.ts` "canonical failed save retains…" | editor.md "A failed save keeps its changes…" | `editor.vibe:126-137`, `drafts.vibe` |
| Default title numbering, Trash included | `runtime/note-default-title.ts` | list.md "A default title takes the next number…" | `list.vibe` `nextDefaultTitle`, `editor.vibe:284` |
| Pinned first, then last edit; kinds only with their data | `runtime/notes-view.ts`; `canonical-notes-ui.ts:27-33` | list.md first two rules | `list.vibe:139-153` |
| Only an opaque recording handle becomes a row handle | `canonical-notes-ui.ts:36-41` | list.md "A row carries only an opaque recording handle…" | `list.vibe` `voiceAudio` |
| Checklist rows keep their place and an accessible name | `canonical-notes-checklist-labels.spec.ts` | list.md "Each checklist row keeps its own place…" | `NoteEditor.tsx:49-100` |
| Recently deleted: restore needs the exact deletion and revision; Undo the exact deletion | `canonical-notes-ui.ts:212-222,339-344` | trash.md "A restore needs the exact deletion…" | `trash.vibe:84-88,135-150` |
| Erase only with the three-day choice, reviewed, no shared recording; unknown outcome never reported | new upstream behaviour (legacy canonical Trash was restore-only, `canonical-notes-ui.ts:345`) | trash.md "Erase needs the three-day choice…", "A saved erase leaves…" | `trash.vibe:151-178`, `NotesTrash.tsx` |
| Recording erased only for the exact tombstone with device proof | `test/browser/notes-permanent-delete-backstop.spec.ts` (device Trash) | cleanup.md both rules | `cleanup.vibe:37-78` |
| Earlier device Trash rows come into canonical Trash once; slot clears when all settled | `runtime/notes-trash.ts:14`, 30-day policy `notes-trash-policy.ts:6` | trash.md "An earlier device Trash row…" | `legacyTrash.vibe:40-70` (see gap 10, KNOWN limits) |
| Folder list: slot name and document shape compatible; create/rename/delete | `runtime/notes-folders-model.ts:7-60` | folders.md (3 rules) | `folders.vibe`, `slots.vibe:14-31`, `notes.schema.vibe:75-83` |
| Slot adoption copies only into an empty slot and clears the old one after | n/a (new) | platform/storage.md "A legacy slot is cleared only once…" | `platform/legacy-slots.vibe`, `android/…/ElizaSecureStorePlugin.java:59-74` |
| Recorder starts only for the owner after playback stopped; refusals named | `prototype/note-recorder.ts`; `test/notes-recorder-media-admission.test.mjs` | recorder.md "A recording starts only for the current owner…" | `recorder.vibe:204-240`, `:58-67` |
| Done claims the save once; note created under `voice-<id>`; audio retained before segments go | `canonical-notes-ui.ts:227-262`; `note-recorder.ts:474-510` | recorder.md "Done claims the save once…" | `recorder.vibe:247-299` |
| Leaving Notes or losing the owner keeps the recording; return adopts it | `test/notes-recorder.test.mjs` "account change stops capture…" | recorder.md "Another owner or leaving Notes detaches…" | `recorder.vibe:325-344,388-402` |
| Discard asks once for ≥ 1 s | `template.html:2887-2898` | recorder.md "Discard asks once…" | `web/notes/NoteRecorder.tsx:39-45` |
| Native recorder and audio custody | `android/…/AlphaNoteRecorder.java`, `AlphaNoteRecordingService.java`, `AlphaNoteAudioPlugin.java` | recorder.md "The native recorder admits…", audioCustody.md | identical files in the port (one method, `migrationStatus`, removed) |
| Playback only for the open note's own live recording | `canonical-notes-ui.ts:354-357` | audio.md "Playback starts only…" | `recorder.vibe:301-321` |
| Transcript on request in 25 s windows, each checked, saved once | `test/saved-note-transcript.test.mjs` | audio.md "A transcript is read in 25-second windows…" | `audio.vibe:27-69` |
| Notification tap opens Notes once; Home forgets it | `voice-adapter.ts` (`consumeNoteRecordingOpen`) | recordingOpen.md (2 rules) | `recordingOpen.vibe:27-81` |
| Agent `notes_filter`, `notes_move`, `notes_folder_create`, `notes_restore`, `notes_record` | `prototype/notes-organize-executor.ts`; `test/notes-organize.test.mjs` | organize.md (first 4 rules) | `organize.vibe:46-105`, `operations.vibe` |
| Workflow reads only selected notes still as reviewed | `ui/workflows/phone-trigger-note.ts` | organize.md "A workflow read shares the selected notes…" | `operations.vibe:83-106` |
| Share, copy, email, save as text; voice export says audio not included | `prototype/notes-share-adapter.ts` | share.md (3 rules) | `share.vibe:60-98`, `shell/handoffs.vibe` |
| Document receipt shown only in its own visible visit | `test/browser/notes-document-receipt.spec.ts` | share.md "One document operation runs at a time…" | `share.vibe:46-48,117-122` |
| Web source dialog: one action over the reviewed note | `prototype/note-web-source-adapter.ts` | webSource.md | `sources.vibe:65-98` |
| Linked attachment opens by reference, or only the exact picked file | `prototype/note-source-adapter.ts`; `test/browser/note-source.spec.ts` | attachment.md first rule | `sources.vibe:104-136` |
| Reviewed summary or scan becomes one note under its creation identity | `canonical-notes-ui.ts:266-273`; `summary-source-note.spec.ts` | collection.md "Reviewed text becomes one note…" | `editor.vibe:358-363`, `notes/handoffs.vibe` |
| Event made from a note links back and opens it (new links) | `note-origin-adapter.ts:38-41` | origins.md "A link resolves only against the open collection…" | `origins.vibe:101-124`, `calendar/screen.vibe:227-237` |
| Files: access decided by the newest read; Allow, legacy API 29, Retry | `test/browser/files-read-status.spec.ts`, `test/files-legacy-storage.test.mjs` | files/browser.md "Only the newest access read decides access…" | `web/files/StorageAccess.tsx`, manifest lines 13/41/43 identical |
| Files: categories, volumes, Trash count; empty only after a complete read | `ui/files/storage-presentation.ts`; `dev-files.spec.ts` "does not report an empty folder after a failed read" | files/storage.md "Only a complete read with no rows is empty…" | `web/files/BrowseView.tsx`, `ListingView.tsx`, `files/browser.vibe` |
| Files: batches in chunks, receipts per row, unknown chunk claims nothing; Undo | `test/browser/files-bulk.spec.ts` | files/mutations.md (all) | `files/changes.vibe:93-110,142-160,252-259` |
| Files Trash: select, restore, Restore all, delete only after confirming, 30 days | `test/files-browser-view.test.mjs` (FILE-16), `files-browser.test.mjs` | files/trash.md, storage.md "An item's days left…" | `TrashView.tsx:41-55`, `EraseDialog.tsx`, `changes.vibe:171-204` |
| Files share: 1–100 files, no folders, all present, before the chooser | b3bac0a4b; `test/files-native-share-admission.test.mjs` | files/share.md "A selection reaches Android's share sheet only when…" | `changes.vibe:127-141` |
| Files share panel: one delivery per choice, retired on change | `runtime/share-panel.ts`; `test/quint-share-panel-admission.test.mjs` | files/share.md (other rules) | `FilesScreen.tsx` `choose`, `files/share.vibe` |
| Agent filter direct, complete/incomplete/zero-match truthful | `test/browser/files-agent-filter.spec.ts` | files/filter.md | `files/agent.vibe:107-128`, `FilterResults.tsx` |
| Agent open/share/move/trash/new folder: reviewed, bound to identities as read; positions resolved | 23880dc55; `test/files-reviewed-proposal.test.mjs` | files/proposal.md | `agent.vibe:83-105,162-185,227-262`; native `storageReviewedIdentities` unchanged |
| Preview: open in its visit; text, image, audio, video, PDF pages; sandboxed viewer; one action menu | #1377; `files-preview-media.spec.ts`; `dev-files.spec.ts` "opening imported HTML cannot execute…" | files/preview.md, files/pdf.md | `web/files/PreviewSheet.tsx`, `files/preview.vibe` |
| Picker for other areas: chosen only after identity and listing agree; re-read on attach | `prototype/chat-attachment-files.ts` | files/picker.md | `files/picker.vibe:66-125` |
| Recent bounded at 24, grants released, only a picked document restored | `prototype/files-index.ts` | files/recent.md | `files/preview.vibe:87-92,186-208,263-270`, `layer.vibe:43` |
| Browser build keeps the same library database | `browser/files.ts:10` (`alpha.browser.files.v1`) | files/storage.md | `files/library.vibe:9` (schema upgrade to v2 not read) |

## Not covered

Exact list, for reassignment.

- **Notes, port files not read line by line:** `src/notes/list.vibe` (only `rowOf`/order/checklist helpers
  located), `src/notes/listFilter.vibe`, `src/web/notes/{NotesList,FoldersSheet,NotesReviewBar,WebSourceDialog,NotesRecordingBadge,NotesRecordingIndicator}.tsx`,
  `test/notes/resident-fake.ts`; spec files `listFilter.md`, `recordingJournal.md`, `audioCustody.md`,
  `attachment.md` second rule were skimmed for structure only.
- **Notes, legacy behaviours not traced:** named-note opening from chat (`list.md` "Only a named, quoted or
  plainly titled note opens locally"); `notes-query-review.spec.ts` and `notes-query-explanation.test.mjs`
  (local note choice dialog and its "latest note" wording; no counterpart located in the port, upstream
  `EV:packages/notes/src/lookup.vibe` not read); layout tests (`canonical-notes-design`, `notes-responsive`,
  `notes-status-layout`, `notes-photos-list-focus`, 300% text); `web-summary-note.spec.ts`,
  `document-summary-note.production.spec.ts`, `journey-j05-web-research-note.spec.ts`,
  `summary-source-note.spec.ts` beyond the final note save (review dialogs belong to browser/assistant).
- **Notes, device Trash capacity and recovery** (`notes-trash-full`, `notes-trash-recovery`,
  `notes-trash-resume`, `notes-deletion-lease`, `notes-capacity-fixture`, `notes-logical-revision`,
  `notes-replay-identity`, `notes-store-lifecycle`): these test the device collection that gap 1 drops, or
  the agent store now upstream; `EV:packages/notes/src/{collection,store,service,agent}.vibe` and
  `EV:spec/notes/*.md` were not audited against them.
- **Notes, browser build:** pending-recording IndexedDB journal (`browser-note-pending-audio.test.mjs`,
  `BrowserNoteRecordingJournal.qnt`), browser notes document and recovery download
  (`notes-document-storage.spec.ts`), browser recording segments. The port's recorder calls only the native
  `AlphaVoiceCloud` plugin; whether a browser fake exists was not checked.
- **Notes Quint models not compared invariant by invariant:** all 20 in `lists/notes.quint.txt`; I compared
  behaviour, not each legacy invariant to a port property. Native traces
  (`NoteRecordingTraces.java`, `NotePermissionTraces.java`, `NoteBridgePorts.java`) were not compared; the
  native sources themselves are byte-identical.
- **Files, port files not read line by line:** `src/files/{browser,preview,share,storage,downloads,download,usage,back,fixture,library-glue,paths,operations}.vibe/.ts`,
  `src/web/files/{BrowseView,ListingView,FileRow,DestinationDialog,NameDialog,DetailsDialog,SelectionBar,SharePanelSheet,TrashItemSheet,FilterResults,FilePickerSheet,format}.tsx/.ts`,
  all of `test/files/*.vibe`. Their OK rows above rest on `FilesScreen.tsx`, `agent.vibe`, `changes.vibe`,
  `picker.vibe`, `PreviewSheet.tsx`, `layer.vibe` and the spec outlines.
- **Files, legacy behaviours not traced:** result wording maps (`files-result-text.test.mjs`,
  `selected-document-messages.test.mjs` against `web/files/format.ts`); sort directions and grid
  (`files-sort-directions.spec.ts`); file details from native (`files-native-details.test.mjs`);
  picker lifecycle cases (`files-picker-lifecycle.test.mjs`, 10 tests); browser-build import, archive and
  atomic placement (`dev-file-picker.spec.ts`, `dev-workflow-files.spec.ts`,
  `files-browser-atomic-placement.test.mjs`, `quint-browser-files-trash-refinement.test.mjs`) against
  `EV:packages/files/src/storage/**`; workflow file reads (`EV:packages/files/src/storage/library-workflow.vibe`);
  document excerpt review (`document-excerpt-sensitive.spec.ts`; the port routes it through
  `src/assistant/files-bridge.vibe`, assistant slice); local OCR and scan (`local-ocr.spec.ts`,
  `EV:packages/files/src/documents/**`); PDF worker isolation (`PdfWorker.qnt`, `ServicePdfTraces.java`
  against `spec/files/pdf.md`).
- **Listed under `files` but belonging elsewhere, not audited:** Maps share (`dev-maps-share.spec.ts`,
  `maps-share-layout.spec.ts`, `MapsShareChoice.qnt`), `SharedRecordingAdmission.qnt` and
  `quint-shared-recording.test.mjs` (voice), `NativeGoogleAccessFile.qnt` (account), `BrowserDownloads.qnt`
  and `DomainDocumentCreation.qnt` (browser), `browser-profile-unsupported`, `device-view-profile`,
  `view-profile-capability-header`, `cloud-voice-profile`, `native-embedding-profile`,
  `shared-deletion-window`, `shared-ui-overrides`, `share-panel-watch`.
- **Android:** `AlphaNoteDocumentsPlugin`, `AlphaShareSheet`, `AlphaMailPdfActivity`, `IsolatedPdfService`,
  `NotesDeletionLease`, `SavedNoteRecordingWindow`, `NoteSourceReferences`, `SerialStorageTasks` are
  byte-identical and were not re-read. `AlphaConnectionPlugin` (205 changed lines) and
  `RendererCredentialSlots` were read only for slot admission. `DailyAppsPlugin`,
  `AlphaMailAttachmentsPlugin` and `SelectedDocumentAccess` were not diffed.
- **`scripts/legacy-retirement.json`:** the notes and files entries were not checked against these findings.

## Skeptic verdicts

Second pass, read-only, against the same trees plus the author's working tree (`/home/shaw/.cache/vibemig/alpha`, same commit
3d7ca972; its uncommitted Notes/Files changes are Quint identifier renames only, so nothing here is `fixed_uncommitted`).
`#1422` (057fdc5a2 on develop) touched none of the legacy paths below except simplifications in `files-index.ts`,
`voice-adapter.ts`, `local-speech-playback.ts` and `AlphaFilesPlugin.java`; no gap is a deliberate retirement.

| # | Gap | Verdict | Severity | Evidence |
| --- | --- | --- | --- | --- |
| 1 | "Previous notes" device collection (`notes-records:v1:device`) has no route and no import | confirmed | blocker | Legacy route real: `L:prototype/legacy-notes-access.ts`, `agent-adapter.ts:1595-1599`, `canonical-notes-ui.ts:386-396`. Port: no reader anywhere under `P:apps/app/src` or `spec`; `spec/notes/collection.md:91-97` says the phone never reads an earlier store; upstream `EV:packages/notes/src/prior.vibe` imports only the agent's own `notes-state` file. `spec/notes/origins.md:39-41` still speaks of "notes kept on this phone ... switching to them first", which no code can do. `sources.vibe:137-142` + `layer.vibe:50-51` reconcile native source grants against the canonical snapshot only (legacy: only in legacy mode, `notes-trash-adapter.ts:57,66`). `scripts/legacy-retirement.json` marks `legacy-notes-access.spec.ts` "mapped" to `spec/notes/index.md`, which has no such rule. Not in open items. |
| 2 | Voice-note segments are transcribed automatically while recording | confirmed | blocker | Legacy: `voice-adapter.ts:1269-1282` (`automaticTranscription:false`, transcriber `async()=>null`), `note-recorder.ts:382-384`. Port: `recorder.vibe:133-157` `pump` called from `absorb` (`:187`) on every recording/stopped status with no gate; `speech.vibe:21` → `voice/transcription.vibe:22-49` sends each segment to Cloud or the owner's provider. Rule `spec/notes/recorder.md:76-81` asks for it; `test/notes/harness.vibe:40-47` fixes the route to Cloud. Consent gate bypassed. |
| 3 | Stored origin links unreadable after update, then overwritten | confirmed | high | Legacy shape is a keyed record with flattened link + `savedAt` (`EL:plugins/plugin-notes/src/client/note-origin.ts:31-34,198-257`); port `OriginIndex.links` is an array (`notes.schema.vibe:86-94`), `origins.vibe:57-62` reads an undecodable slot as `[]` keeping `raw`, `:74-78` then compare-exchanges it away on the next `remember`. Ids differ too: legacy `calendarEventKey` / creationId / reminder id; port `agent-event:<sha256>` (`calendar/screen.vibe:33-37`). `remember` replaces (`:93`), no 200 bound. |
| 4 | Collection never re-read after agent note changes, on entering Notes or on resume | confirmed | high | `NotesCollection.invalidate` has one caller (`trash.vibe:173`); `refresh` only from trash/editor retry; `layer.vibe:71-88` `followForeground` refreshes nothing; `composer.vibe:486-489` only adds a "Notes changed" row; `workflows/changes.vibe:69-73` refreshes Workflows only; no `NotesCollection` use under `src/shell`. Legacy: `agent-adapter.ts:969,1515`, `canonical-notes-controller.ts:25-31`. Rule exists (`spec/notes/collection.md:42-58`). |
| 5 | "Review reminder" does nothing; reminder back-links never stored or shown | confirmed | medium | `NotesScreen.tsx:127-133` toasts "Check time"; `calendar/handoffs.vibe:88` returns false for non-event; `shell/handoffs.vibe:64` ignores `calendar-draft`; no `remember/view/open("reminder")` caller (only `clock/peers.vibe:100` forget). Legacy: `canonical-notes-ui.ts:281-290`, `reminder-adapter.ts:330`. |
| 6 | A note cannot be pinned or unpinned | confirmed | medium | Legacy `template.html:2704,2793`. Port `NoteEditor.tsx:67-79` has no pin item; `NotesList.tsx:34` only shows the mark; no rule in `spec/notes`. |
| 7 | No checklist conversion and no way to create a checklist | confirmed | medium | Legacy `template.html:2670`. Port `list.vibe:247,255` called only from `test/notes/stories.test.vibe`; `NotesScreen.tsx:198` creates `"text"` only; `editor.vibe:286` list branch has no caller. |
| 8 | Owner change/sign-out drops an unsaved edit silently | confirmed | medium | Legacy `canonical-notes-ui.ts:154` + `agent-adapter.ts:713` (persistent "was lost" notice). Port `editor.vibe:205-212` retires and clears with no notice or kept draft. Legacy also lost the words; only the notice is missing. |
| 9 | Kept draft of a never-saved new note is never offered back | confirmed | low | `editor.vibe:131-134` keeps under `noteId:""`, `drafts.vibe:31-34` merges by `noteId`, `offer` only from `openNote(id)`. Broken new promise (`spec/notes/editor.md:226-229`), not a regression: legacy canonical drafts were memory-only. |
| 10 | One out-of-bounds row fails the whole device-Trash import silently | confirmed | medium | `legacyTrash.vibe:45-46` returns 0 when the whole document fails `LegacyTrashDocument` (`notes.schema.vibe:125-150`: title ≤ 240, body ≤ 20001, colour literals, folderId pattern). Legacy validated only id/title type/kind/index/deletedAt (`EL:.../notes-trash-policy.ts:139-173`). Open-items bullet covers new IDs/deletedAt/recordings only. |
| 11 | Denied microphone no longer opens the access panel | confirmed | medium | Legacy `voice-adapter.ts:1283-1286`. Port maps to `RefusedPermission` (`recorder.vibe:63`), shows "Mic off" and a retry that fails again; `ShellPermissions.reopen` (`shell/permissions.vibe:318`) is called only from Settings. |
| 12 | Voice-note view: no Cancel transcription, Ask Alpha, action ticks, seek | confirmed | medium | Legacy `template.html:2741-2780`, `voice-adapter.ts:1379-1407` (abort on leave/hidden/connection change). Port `NoteEditor.tsx:103-117`; `audio.vibe:41-69` loops every window with no cancel and no foreground/open-note check, so uploads continue after the owner leaves the note. |
| 13 | Copy draft omits checklist items | confirmed | medium | `NotesScreen.tsx:212,217` copy `title`+`body`; legacy `canonical-notes-ui.ts:147` copies `noteShareText`. This is the rescue path after a failed save. |
| 14 | Recently deleted no longer shows the deletion date | confirmed | low | Legacy `canonical-notes-ui.ts:334`. Port `NotesTrash.tsx:44-49` (row already carries `deletedAt`). |
| 15 | Files Recent index not carried over | confirmed | low | Legacy keys `alpha.files.recent.v1`/`alpha.files.open.v1` have no reader in the port (`files/layer.vibe:43`). Harm is smaller than stated: the native table evicts oldest-first past 32 (`EV:.../SelectedDocuments.java:164`), so orphaned grants recycle; only the Recent list and stale localStorage keys are affected. |
| 16 | A note cannot be read aloud | refuted | low | Legacy had no owner entry point either: `template.html` binds no `notes.ed.readAloud`/`vo.readAloud` (removed long before #1422, 3151d6976), `note-read-aloud.spec.ts:57-59` asserts no button, and `speakNote` is called only from tests. Nothing reachable was lost. |
| 17 | `recordingClock` unmodelled; legacy proof dropped | confirmed | low | `recorder.vibe:70-77` hand-written, no rule in `spec/notes/recorder.md`, no `*.proof.dfy` under `P:apps/app/spec`; `legacy-retirement.json:13348` marks `note-recorder.dfy` "mapped" to that spec; the legacy `.dfy` still sits in `P:specs/lemma` proving a module that no longer exists. |
| 18 | Files Move/Copy destination picker unmodelled | confirmed | low | `FilesScreen.tsx:163-195` (`beginDest`/`openDest`/`confirmDest`, root fallback, return-to after New folder) is React-local; `spec/files/mutations.md` has no destination rule. Behaviour present, convention gap. |
| U1 | Generate transcript's service choice | refuted | low | Legacy Generate transcript was also one tap on the current Cloud/own route (`voice-adapter.ts:1380-1397`, `runtime/cloud-voice.ts:113-114`); 0b868526d's choice concerned the recorder, which is gap 2. Port `audio.vibe:41-52` matches. Residual: a sign-in refusal reads "Recording unavailable". |
| U2 | Chat attachment limits after `storageReadAttachment` removal | confirmed | high | Not just "depends on caller": the port reads a storage pick through `AlphaMailAttachments.readSelected` (`files/storage.vibe:124`, `picker.vibe:101-110`), whose `DocumentBytes.validate` allows only PDF/PNG/JPEG/WebP/.txt up to 5 MiB (`EV:.../DocumentBytes.java:21,38-78`). Legacy chat read 20 MiB and also GIF, CSV, Markdown, JSON (`L:AlphaFilesPlugin.java:150-177`, still on develop after #1422). `assistant/files-bridge.vibe:12-17` still offers those types, so they are selectable and then fail with ReadFailed. |
| U3 | Interrupted permanent voice deletions finished only by the native backstop | confirmed | low | True but narrow: legacy renderer recovery ran only once Previous notes was selected (`notes-trash-adapter.ts:57-62`); the native backstop is byte-identical. Consequence of gap 1; an importer that clears `notes-records` must settle `notes-audio-deletions` first (`AlphaNoteAudioPlugin.finishPermanentDeletions` returns 0 without that slot). |
| U4 | Files email draft vs `file-email.spec.ts` | refuted | low | All six cases have a rule and code: `spec/files/emailDraft.md`, `spec/inbox/attachments.md:75-80`, `files/share.vibe:66-93` (two reads, account token re-check), `inbox/shareTarget.vibe:14-33` ("Open Inbox ... first", new draft, duplicate), `inbox/composer.vibe:354-365`. |
| K1 | `notes-draft:v1:device` not adopted | known_open_item | low | "Legacy slots not carried over", second bullet. Its change set is over the gap 1 collection. |
| K2 | Legacy Trash import limits (new IDs, fresh deletedAt, recordings stay in device audio trash) | known_open_item | medium | Last Owner bullet. Gap 10 is beyond it. |
| K3 | `NotesListFilter.negotiate` / `filesCapabilities` uncalled | known_open_item | medium | "Areas consuming assistant changes → Notes" and Shell "Fill the assistant's ports". The doc does not spell out that agent list filters are refused meanwhile, but it follows from the bullet. |
| K4 | `create_note` treats "Workflows in front" as a run | known_open_item | medium | "Areas consuming assistant changes → Notes". |
| K5 | `read_selected_notes`/`create_note` DEVICE_STEP_UNSUPPORTED; no read-reply lease | known_open_item | medium | Upstream → agent/client bullets and Tooling pin bullet. At `eliza-vs` the helper now exists (`EV:packages/agent/src/device-actions/workflow-offer.vibe`, `read-completion.vibe`); `P:scripts/resident/bridges.ts:8,162` already uses it, so the re-pin closes the helper half. |
| K6 | Held values have no review UI or tests | known_open_item | medium | "Inbox, Notes and Telephony (carry-over)". |
| K7 | Tesseract OCR assets not set up | known_open_item | medium | Tooling bullet. |
| K8 | Nothing generated; `noteSaveResult` unchecked | known_open_item | medium | Header line and "Generated names → notes". |
| V1 | Only one conformance driver for Notes, none for Files | refuted | low | A driver is required only "when the shell keeps the machine's state itself" (`EV:vibestack/README.md:226`); `folders.vibe` does (`apply`), the other Notes/Files services drive the generated `Machine` or call generated pure functions. |
| V2 | No `.meta.tsx` for `NotesScreen`, `NotesRecordingIndicator`, `FilesScreen` | confirmed | low | Verified by listing `src/web/notes` and `src/web/files`. The open-items "No meta file" bullet names only Maps and telephony screens. |
| V3 | `priorNeedsReview` matches upstream's English sentence | confirmed | low | `collection.vibe:8-10` regex against `EV:packages/notes/src/store.vibe:107` reason text; works today, breaks on a wording change. |
