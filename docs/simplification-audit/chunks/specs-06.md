# Chunk specs-06: Quint application models (NoteSourceDialog … QuietVoiceRetry)

30 files, all present, all listed in `specs/quint/application/manifest.json` (187 rows today). Every model was read in full,
with its manifest row, refinement harness and host wrapper.

| File | Kind | Verdict |
|---|---|---|
| `specs/quint/application/NoteSourceDialog.qnt` | Quint model (live in application manifest; ITF trace-replay harness) | DELETE |
| `specs/quint/application/NoteWebSourceDialog.qnt` | Quint model (live; ITF trace-replay harness) | DELETE |
| `specs/quint/application/NotesDocumentTransfer.qnt` | Quint model (live; ITF trace-replay harness) | KEEP (trim import half) |
| `specs/quint/application/NotesLifecycle.qnt` | Quint model (live; two harnesses: contracts.mjs `notesLifecycle` + notes-coordinator.mjs) | KEEP (delete legacy half; PORT remaining harness) |
| `specs/quint/application/NotesRecorderMediaAdmission.qnt` | Quint model (live; Playwright-driven refinement harness) | KEEP |
| `specs/quint/application/NotesTrashReadPublication.qnt` | Quint model (live; vm-transplant harness) | DELETE |
| `specs/quint/application/NotesTrashSession.qnt` | Quint model (live in manifest; no harness, symbol pins only) | DELETE |
| `specs/quint/application/NotificationCollection.qnt` | Quint model (live; transplant harness) | KEEP + PORT harness |
| `specs/quint/application/OSDefaults.qnt` | Quint model (live; Java/Kotlin compile-and-run harness) | KEEP |
| `specs/quint/application/OSProvisioning.qnt` | Quint model (live; Java compile harness) | KEEP |
| `specs/quint/application/OSSourceStaging.qnt` | Quint model (live; runs the real Python staging script) | KEEP |
| `specs/quint/application/ObservationTurnDispatch.qnt` | Quint model (live; slicing + bundle harness) | KEEP (trim legacy formats) + PORT harness |
| `specs/quint/application/OwnNoticeQuestion.qnt` | Quint model (live; transplant harness) | KEEP + PORT harness |
| `specs/quint/application/PasswordProviderDialog.qnt` | Quint model (live; bundle-and-replay harness) of a DEVELOPMENT surface | KEEP (with dev code; D6/D20) |
| `specs/quint/application/PendingActionRecovery.qnt` | Quint model (live; slicing harness) | KEEP + PORT harness |
| `specs/quint/application/PermanentVoiceDeletion.qnt` | Quint model + Contract module (live; decision-table harness) | KEEP (absorb AuditLease) + PORT import |
| `specs/quint/application/PermanentVoiceDeletionAuditLease.qnt` | Quint model (live in manifest; no harness) | MERGE into PermanentVoiceDeletion.qnt |
| `specs/quint/application/PermissionChoices.qnt` | Quint model (live; bundle harness with text-needle observation hooks) | KEEP (absorb PermissionWalkthrough; trim historical versions) + PORT hooks |
| `specs/quint/application/PermissionWalkthrough.qnt` | Quint model (live; two harnesses) | MERGE into PermissionChoices.qnt |
| `specs/quint/application/PhoneCall.qnt` | Quint model (live in manifest; no harness, symbol pins into model.js) | DELETE |
| `specs/quint/application/PhoneRecents.qnt` | Quint model (live; import-based trace replay in test/) | KEEP |
| `specs/quint/application/PhotoLibraryAgentReview.qnt` | Quint model (live in manifest; no harness) | KEEP + add import replay |
| `specs/quint/application/PhotosOwnedAlbumDialog.qnt` | Quint model (live; bundle harness with source rewriting) | KEEP + PORT harness |
| `specs/quint/application/PhotosTrash.qnt` | Quint model (live; shares PhotosWindow harness) | KEEP + PORT harness |
| `specs/quint/application/PhotosWindow.qnt` | Quint model (live; bundle harness with source rewriting) | KEEP + PORT harness |
| `specs/quint/application/PreferencesAndPresentation.qnt` | Quint model (live; import-based harness) | KEEP |
| `specs/quint/application/PreferencesAndPresentationAuditState.qnt` | Quint model (live in manifest; no harness) | DELETE |
| `specs/quint/application/PreviousNotesAvailability.qnt` | Quint model (live; vm-slicing harness) | DELETE |
| `specs/quint/application/PreviousNotesSourceOpening.qnt` | Quint model (live; vm-slicing fixture) | DELETE |
| `specs/quint/application/QuietVoiceRetry.qnt` | Quint model (live; slicing harness) | KEEP + PORT harness |

Totals: DELETE 8 (NoteSourceDialog, NoteWebSourceDialog, NotesTrashReadPublication, NotesTrashSession, PhoneCall,
PreferencesAndPresentationAuditState, PreviousNotesAvailability, PreviousNotesSourceOpening); MERGE 2
(PermanentVoiceDeletionAuditLease → PermanentVoiceDeletion, PermissionWalkthrough → PermissionChoices); KEEP 20, of
which 10 need a harness PORT and 4 need a trim of deleted-feature branches.

## Urgent: Quint is broken right now

`scripts/quint-lib.ts:233` reads every manifest `sources` entry at load. Seven rows in this chunk name files already
deleted in the worktree (`note-source-adapter.ts`, `note-web-source-adapter.ts`, `notes-trash-adapter.ts`,
`legacy-notes-access.ts`): NoteSourceDialog, NoteWebSourceDialog, NotesLifecycle, NotesTrashReadPublication,
NotesTrashSession, PreviousNotesAvailability, PreviousNotesSourceOpening. Every Quint command fails until these rows
are removed (and NotesLifecycle's source list trimmed). `notes-coordinator.mjs` also already fails: its
`'  const notesDataset='` anchor is gone from agent-adapter.ts.

## Behaviours that lose all coverage if the DELETEs happen

- None of product value. Six deleted models cover only the legacy "Previous notes" engine (D1/C1), which is deleted.
- PhoneCall: the development call fixture keeps e2e coverage in `test/browser/dev-incoming-call.spec.ts`.
- PreferencesAndPresentationAuditState: its one-shade rule is not covered by another Quint model; it is a build-flag
  fact best asserted by the production bundle audit or a home-shell journey (`journeys/home-shell.spec.ts`).
- PermissionWalkthrough: `failedAttemptWriteRestartTest` (attempts persisted across restart) has no counterpart in
  PermissionChoices; carry it if `startup-permission-progress.ts` still persists attempts.
- NotesDocumentTransfer import half: the test-mocks text import is deleted with C9/B215; export stays modeled.

## Harness techniques found (T10)

| Technique | Models | Action |
|---|---|---|
| Import real module via esbuild with stubbed imports (good) | NoteSourceDialog, NoteWebSourceDialog, NotesDocumentTransfer (loadProductModule), PhoneRecents (test/quint-phone-recents.test.mjs), PasswordProviderDialog, PreferencesAndPresentation, PermanentVoiceDeletion, NotesLifecycle canonical block | Template for all ports |
| Bundle real module but rewrite text at markers to expose internals | PhotosWindow, PhotosTrash, PhotosOwnedAlbumDialog (compilePhotosWindow), PermissionChoices (two needles, one in upstream code) | Export a controller/snapshot or observe via DOM |
| Slice source between anchors + eval | PendingActionRecovery, QuietVoiceRetry, ObservationTurnDispatch, PreviousNotes* , notes-coordinator | Extract the function into its own module and import it |
| Strip imports by regex + vm with hand globals | NotificationCollection (sourceContext), OwnNoticeQuestion | Bundle with stubbed import specifiers |
| No harness (symbol pins only) | NotesTrashSession, PhoneCall, PhotoLibraryAgentReview, PermanentVoiceDeletionAuditLease, PreferencesAndPresentationAuditState | Delete twins; bind PhotoLibraryAgentReview via `createDeviceLibrary(port)` |

## Shared helpers worth keeping

- `specs/quint/refinement/application/notes-files-media-itf.mjs` (`modelTraces`, `loadProductModule`, `replayTraces`):
  the cleanest ITF replay + import mechanism in the tree; generalise it as the one refinement support module
  (`shell-model-traces.mjs`, `assistant-model-traces.mjs`, `browser-model-traces.mjs` look like siblings — merge).
- `support.mjs` `sourceModule`/`bundledSource` (import-based) stays; `sourceContext` (regex-strip + vm) goes once
  NotificationCollection and others are ported.
- `photos-window.mjs` `compilePhotosWindow`: keep as the single Photos fixture, ported once.

## Cross-file actions

1. Remove the 7 broken manifest rows/sources now (same commit as the C1 source deletions), with harnesses
   note-source-dialog.mjs, note-web-source-dialog.mjs, notes-trash-read-publication.mjs, previous-notes-availability.mjs,
   previous-notes-source-opening.mjs, notes-coordinator.mjs (+ notes-coordinator-notes.md), fixtures
   test/fixtures/notes-trash-read.mjs and previous-notes-source-opening.mjs, wrappers test/quint-note-source-dialog,
   quint-note-web-source-dialog, notes-trash-read, quint-previous-notes-availability, previous-notes-source-opening,
   quint-notes-coordinator-refinement tests, and the `index.mjs` imports/adapters.
2. Drop every `symbols` pin in these rows (closure-local names, string literals, `function pnStart`): they block the
   model.js/agent-adapter/voice-adapter/camera-adapter splits and the formatter.
3. Product extractions the ports need (stage F, same PR): `recoverPendingActions` out of agent-adapter.ts;
   `quietVoiceRetry` out of voice-adapter.ts; the connection send path out of connection-ui.tsx; a Photos library
   controller out of camera-adapter.ts.
4. Merge PermissionWalkthrough → PermissionChoices and AuditLease → PermanentVoiceDeletion; delete
   startup-permissions-coordinator.mjs and the PermanentVoiceDeletion/PreferencesAndPresentation duplicates in
   test/quint-conformance.test.mjs.
5. Trim deleted-feature branches: NotesLifecycle legacy half, NotesDocumentTransfer import, PermissionChoices
   historical completion versions (B248), ObservationTurnDispatch legacy envelope formats (if B313 accepted).
6. Application floor in test/quint-checker.test.mjs (116) stays satisfied (187 - 10 = 177).
7. OSDefaults/OSProvisioning/OSSourceStaging need JDK/kotlinc/Python: run them in an OS lane filtered on
   `android/aosp/branding/**` and `scripts/*alpha-os*`.

## Owner questions

- PasswordProviderDialog and PhoneCall model development-only surfaces. Keep formal models of dev surfaces (D20), or
  rely on their Playwright specs only? This review deletes PhoneCall (unbound) and keeps PasswordProviderDialog.
- PermanentVoiceDeletion: if stage A removes the voice-adapter deletion/restore path that reads legacy Notes Trash, is
  permanent voice-note deletion still a product feature? If not, the model and its upstream re-export go too.
- ObservationTurnDispatch: may the legacy context envelope for unnegotiated peers (`phoneContextMessage`, B313 /
  Q-UI-32) be deleted, so the model covers plain-v1 only?
- NotesLifecycle canonical half vs the CanonicalNotes* models: is one canonical Notes model enough?
