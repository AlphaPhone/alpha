# Chunk app-06 summary: apps/app/src/browser (development-workflows … video-edit)

Per-file reports are in docs/simplification-audit/files/apps/app/src/browser/<file>.md (71 files).

## Files
| File | Verdict | Lines now | Est. lines after |
|---|---|---|---|
| apps/app/src/browser/development-workflows.ts | MOVE | 82 | 70 |
| apps/app/src/browser/device-adapter.ts | SIMPLIFY | 11 | 10 |
| apps/app/src/browser/device-controls.css | MOVE | 14 | 12 |
| apps/app/src/browser/device-controls.tsx | SIMPLIFY | 51 | 35 |
| apps/app/src/browser/device-preferences.ts | SIMPLIFY | 41 | 34 |
| apps/app/src/browser/device.ts | SIMPLIFY | 102 | 70 |
| apps/app/src/browser/dialog-layout.ts | SIMPLIFY | 11 | 25 |
| apps/app/src/browser/digest-authorization-document.ts | MOVE | 30 | 18 |
| apps/app/src/browser/digest-delegation-ui.tsx | MOVE | 56 | 50 |
| apps/app/src/browser/digest-delegation.ts | MOVE | 25 | 24 |
| apps/app/src/browser/digest-live-sources.ts | MOVE | 22 | 21 |
| apps/app/src/browser/digest-storage.ts | SIMPLIFY | 58 | 30 |
| apps/app/src/browser/display.ts | KEEP | 15 | 15 |
| apps/app/src/browser/documents.ts | KEEP | 4 | 4 |
| apps/app/src/browser/domain-document.ts | SIMPLIFY | 96 | 40 |
| apps/app/src/browser/domain-recovery.ts | SIMPLIFY | 61 | 8 |
| apps/app/src/browser/edit-receipt.ts | KEEP | 26 | 26 |
| apps/app/src/browser/file-archive.ts | DELETE | 1 | 0 |
| apps/app/src/browser/file-picker.ts | KEEP | 15 | 14 |
| apps/app/src/browser/files.ts | SIMPLIFY | 108 | 100 |
| apps/app/src/browser/focus-state.ts | SIMPLIFY | 22 | 18 |
| apps/app/src/browser/hosted-results.ts | SIMPLIFY | 55 | 48 |
| apps/app/src/browser/incoming-simulation.ts | MOVE | 34 | 25 |
| apps/app/src/browser/journal-retention.ts | SIMPLIFY | 72 | 70 |
| apps/app/src/browser/json-domain-document.ts | MERGE | 17 | 0 |
| apps/app/src/browser/local-transcription.ts | SIMPLIFY | 15 | 12 |
| apps/app/src/browser/location-simulation.ts | MOVE | 55 | 40 |
| apps/app/src/browser/location.ts | SIMPLIFY | 73 | 52 |
| apps/app/src/browser/mail-attachments.css | MERGE | 9 | 0 |
| apps/app/src/browser/mail-attachments.ts | SIMPLIFY | 53 | 48 |
| apps/app/src/browser/note-audio-store.ts | SIMPLIFY | 13 | 6 |
| apps/app/src/browser/note-recording-journal.ts | SIMPLIFY | 66 | 60 |
| apps/app/src/browser/notice-action.ts | MERGE | 9 | 0 |
| apps/app/src/browser/notification-recovery.ts | MERGE | 3 | 0 |
| apps/app/src/browser/notification-store.ts | SIMPLIFY | 49 | 26 |
| apps/app/src/browser/notifications.ts | SPLIT | 239 | 150 |
| apps/app/src/browser/password-provider.ts | SIMPLIFY | 41 | 28 |
| apps/app/src/browser/photo-filter.ts | KEEP | 22 | 22 |
| apps/app/src/browser/preference-documents.ts | SIMPLIFY | 27 | 26 |
| apps/app/src/browser/preference-recovery.ts | MERGE | 11 | 0 |
| apps/app/src/browser/reading-review.ts | SIMPLIFY | 53 | 45 |
| apps/app/src/browser/register-hosted-results.ts | DELETE | 6 | 0 |
| apps/app/src/browser/register.ts | SIMPLIFY | 41 | 40 |
| apps/app/src/browser/reminder-action-document.ts | MERGE | 3 | 0 |
| apps/app/src/browser/reminder-creation-document.ts | MERGE | 3 | 0 |
| apps/app/src/browser/reminder-deletions.ts | SIMPLIFY | 43 | 20 |
| apps/app/src/browser/reminder-recovery.ts | MERGE | 9 | 0 |
| apps/app/src/browser/reminder-store.ts | SIMPLIFY | 28 | 8 |
| apps/app/src/browser/retained-data-notice.ts | SIMPLIFY | 15 | 6 |
| apps/app/src/browser/review.css | MERGE | 9 | 0 |
| apps/app/src/browser/review.ts | SIMPLIFY | 45 | 35 |
| apps/app/src/browser/revision.ts | KEEP | 2 | 6 |
| apps/app/src/browser/scan-correction.ts | DELETE | 1 | 0 |
| apps/app/src/browser/scan-draft.ts | KEEP | 3 | 2 |
| apps/app/src/browser/scan-edges.ts | DELETE | 1 | 0 |
| apps/app/src/browser/screen-locked.ts | MERGE | 4 | 0 |
| apps/app/src/browser/selected-document-viewer.css | MERGE | 8 | 0 |
| apps/app/src/browser/selected-document-viewer.ts | SIMPLIFY | 16 | 8 |
| apps/app/src/browser/sensor-policy.ts | KEEP | 22 | 22 |
| apps/app/src/browser/simulated-apps.ts | SIMPLIFY | 58 | 40 |
| apps/app/src/browser/simulated-inbox.ts | SIMPLIFY | 28 | 24 |
| apps/app/src/browser/simulated-messages.ts | MOVE | 44 | 40 |
| apps/app/src/browser/simulated-voicemail.ts | MOVE | 31 | 28 |
| apps/app/src/browser/simulated-workflows.ts | MOVE | 101 | 90 |
| apps/app/src/browser/simulator-recovery.ts | SIMPLIFY | 43 | 35 |
| apps/app/src/browser/simulator-writer.ts | MOVE | 38 | 32 |
| apps/app/src/browser/speech-errors.ts | KEEP | 17 | 17 |
| apps/app/src/browser/storage-usage.ts | KEEP | 7 | 7 |
| apps/app/src/browser/video-capture.ts | KEEP | 89 | 87 |
| apps/app/src/browser/video-codecs.ts | MERGE | 8 | 0 |
| apps/app/src/browser/video-edit.ts | SIMPLIFY | 108 | 95 |

Totals: 2,598 physical lines now, about 1,924 after (about 670 lines removed). Most lines are dense one-liners, so a formatter pass (D8) would multiply both numbers. The byte reduction is larger than the line reduction: the simulator, legacy and dialog-lifecycle code sits on the longest lines.

## Local types and helpers
| Name | Kind | File:line | Twins | Proposed home |
|---|---|---|---|---|
| `Bag`/`Api = Record<string,any>` | type | focus-state.ts:2, incoming-simulation.ts:5, simulated-apps.ts:11, simulated-inbox.ts:5, simulated-messages.ts:5, simulated-voicemail.ts:3, simulated-workflows.ts:18, simulator-recovery.ts:3 | 15 browser/ files, 41 in src | one exported `Bag` (types.md) |
| `Snapshot`, `Documents` | type | domain-document.ts:2-8, note-recording-journal.ts:1-2 | upstream BrowserDocumentSnapshot/BrowserDocumentStore | import upstream |
| `Notice`, `DeviceEvent`, `Selection` | type | notifications.ts:17-19, notification-store.ts:5-7 | each other | export from notification-store.ts |
| `journalBinding {scope,proposalId,operationHash}` | type | reminder-deletions.ts:6 | calendar-deletions.ts:6, daily.ts:38, deletions.ts:22 | `JournalBinding` in journal-retention.ts |
| `Deletion` | type | journal-retention.ts:49 | ReminderDeletion, calendar deletion entry | journal-retention.ts (export) |
| `Binding` | type | digest-delegation-ui.tsx:6, note-recording-journal.ts:3 | many runtime files (different shapes) | rename locally |
| foreground predicate (noticeActionBlocked/locked/blocked/foreground) | helper | notice-action.ts:2, notifications.ts:21, hosted-results.ts:17, location.ts:11, password-provider.ts:23, review.ts:10,35 | each other | new browser/foreground.ts `foregroundBlocked()` |
| `browserScreenLocked` | helper | screen-locked.ts:2 | workflow-speech.ts:8, workflow-trigger-runtime.ts:13, voice.ts:275, runtime/text-share.ts:6 | browser/foreground.ts |
| retire-event lists + listener wiring | const/helper | notice-action.ts:6, domain-recovery.ts:56, digest-delegation-ui.tsx:41, incoming-simulation.ts:33, location-simulation.ts:54, password-provider.ts:17,27, file-picker.ts:5, review.ts:26-41, selected-document-viewer.ts:12-14, retained-data-notice.ts:11-13, simulated-messages.ts:12, simulated-voicemail.ts:28 | ~50 alpha-back sites in browser/ | dialog kit `onRetire()` + `RETIRE_EVENTS` |
| theme-token copy + dark detection | helper | dialog-layout.ts:6 (lower-case), review.ts:16, mail-attachments.ts:45, selected-document-viewer.ts:7 (upper-case), device-controls.tsx:21, incoming-simulation.ts:10, location-simulation.ts:25, simulator-recovery.ts:33, reading-review.ts:12-14, notifications.ts:196 | calendar-editor/meeting/response, workflow-*, prototype/note-source-adapter | dialog kit `applyShellTheme()` (or mount in .os) |
| blob download block | helper | domain-recovery.ts:31-33, location-simulation.ts:38-39, simulator-recovery.ts:38 | prototype/browser-camera.ts | dialog kit `downloadText(raw,name)` |
| labeled field builder | helper | incoming-simulation.ts:12, location-simulation.ts:27 | each other | dialog kit `labeledField()` |
| observable document facade | helper | preference-documents.ts:6-17 (best instance), reminder-store.ts:6-28, notification-store.ts:13-39, hosted-results.ts:12-26, digest-authorization-document.ts:6-28 | calendar-store.ts, workflow-notices.ts, development-account-document.ts | `observedDocument(key,{event,guard?})` in preference-documents.ts |
| SHA-256 hex | helper | hosted-results.ts:15 | ~25 in src | revision.ts or lib/crypto.ts `sha256Hex` |
| random hex id | helper | revision.ts:2 | runtime/connection-ui.tsx:1488,1555 | revision.ts |
| canonical JSON | helper | hosted-results.ts:16 | runtime/owner-reminder-notification-protocol.ts:28 | lib/json.ts `canonicalJson` |
| bytes→base64 (chunked fromCharCode) | helper | incoming-simulation.ts:23, note-recording-journal.ts:23-24 | prototype/note-source-adapter, phone-adapter, scan-pdf, runtime/local-agent x2, native-recovery-backup | lib/bytes.ts `bytesToBase64` |
| base64→bytes | helper | mail-attachments.ts:35,45, note-recording-journal.ts:46 | prototype copies | lib/bytes.ts `base64ToBytes` |
| blob→data URL | helper | video-edit.ts:85,101 | prototype/browser-camera.ts | lib/bytes.ts `blobToDataUrl` |
| UUID regexes | const | development-workflows.ts:58,64,77 (v4); digest-delegation.ts:11, digest-authorization-document.ts:13, files.ts:29-30 | runtime/device-view-profile.ts | lib/ids.ts `isUuid`/`isUuidV4` |
| email regex | const | simulated-inbox.ts:7,21,24,24 | calendar-sync-fields.ts:10 | lib `isEmailAddress` |
| plain-object guard | helper | simulator-recovery.ts:9 | workflow-history.ts:5, prototype/calendar-approval-fields.ts:5, runtime/agent-calendar.ts:25, runtime/automations-protocol.ts:22 | lib/object.ts `isPlainObject` |
| isAbortError (inline) | helper | file-picker.ts:7, simulated-workflows.ts:83 | ~10 runtime files | lib/abort.ts |
| connection-selection parse | helper | development-workflows.ts:20, digest-storage.ts:12,19 | 16 sites in src; constant in runtime/connection-ui.tsx:204 | `readConnectionSelection()` from the connection owner |
| focusChanged / settings-changed event pair | helper | focus-state.ts:5, device.ts:52,56,87, device-preferences.ts:17 | each other | device-preferences.ts `deviceSettingsChanged()` |
| AlphaDevice/AlphaNotifications/ElizaSystem/AlphaFiles plugin types | type | device-adapter.ts:6, device-controls.tsx:46-47, notifications.ts:230,237,238, storage-usage.ts:2, simulated-inbox.ts:6, simulated-messages.ts:6, simulated-workflows.ts:24 | prototype/settings-adapter.ts:114,123, agent-adapter.ts:83, camera-adapter.ts:103 | one typed module per plugin (C2) |
| `RestoreOption` | type | domain-recovery.ts:6 | calendar-recovery.ts only user | calendar-recovery.ts |

## Delete candidates
| Item | Evidence | Confidence |
|---|---|---|
| file-archive.ts, scan-correction.ts, scan-edges.ts (one-line re-exports) | 1 importer each (prototype/browser-camera.ts, prototype/scan-correction-review.ts) | High |
| register-hosted-results.ts | exists only for registration order; register.ts:3 already imports native-connection first, contradicting its comment | Medium (needs registerPlugin late-web fix) |
| device-adapter.ts:10 product string 'Device settings unavailable. Open a device setting to recover them.' | adapter installed only under `if(devSurfacesEnabled)` (main.tsx:156) | High |
| notifications.ts:219 `result.collected?'Posted':'Posted'` | both branches identical | High |
| device.ts:100 `buildInfo()` alias | `git grep '\.buildInfo'` in apps: 0 callers | Medium |
| Unused exports (drop `export`): DevicePreferences, browserDeviceFacts, DevelopmentGrant, activeFocusBlocks, BrowserHostedResults, BROWSER_ASR_UNAVAILABLE, LocationSimulation, AudioRow, NOTES_AUDIO_BACKSTOP_MS, alphaAudioDatabase, PendingNoteSegment, notificationStorageKey, reminderCreationStorageKey, reminderStorageKey, BrowserSensor, SpeechErrorCode | `git grep -w`: 0 references outside the defining file in apps/android/test/specs/scripts | High |
| note-audio-store.ts:12 `audioMetadata=notesAudioMetadata` alias | voice.ts can import upstream name | High |
| Legacy envelope (domain-document.ts), {raw} archive (json-domain-document.ts), "Download old copy" (domain-recovery.ts:17,36,60), legacy readers (notification-store.ts:10-11, digest-storage.ts:23-35, preference-documents.ts:7, reminder-store.ts:6, hosted-results.ts:12, digest-authorization-document.ts:22,26), device-preferences.ts:22 legacyChanged, migrateAudio, journal-retention.ts "predate this policy" branch, video-edit.ts:67-74 MIME sniffing, "older copy remains available" copy | no writer of any legacy key (git grep localStorage.setItem); package renamed 2026-11-10 with empty private data | Needs owner sign-off (A1) |
| domain-recovery.ts:10-60 test-mocks backup/reset/restore dialog | production returns at line 9 | Owner decision (A3) |
| Inner dev gates: simulated-apps.ts:17-18,20; simulated-inbox.ts:10; simulated-messages.ts:10; simulated-voicemail.ts:6; simulated-workflows.ts:23; incoming-simulation.ts:8; simulator-recovery.ts:12,28,31; simulator-writer.ts:10,18; location-simulation.ts:10,16,19; device-controls.tsx:16,51; development-workflows.ts:18; digest-storage.ts:11; digest-authorization-document.ts:21 | reachable only through the already-gated simulator entry | High once one dev boundary exists |
| Wallet simulation: simulated-apps.ts:21,33-39; simulated-workflows.ts:59 | Wallet deferred (AP-13) | Owner (A3) |
| Whole dev simulator in this chunk (development-workflows, device-adapter, device-controls.*, digest-*, focus-state, incoming-simulation, location-simulation, password-provider, simulated-*, simulator-*) | dev-only; reachable with ?mode=dev | Owner decision (research §7 Q3) |
| files.ts:31 "PLAN section 4" comment | PLAN.md does not exist | High |

## Cross-file actions
1. **Remove the legacy envelope (A1).** Files: domain-document.ts, json-domain-document.ts (delete), domain-recovery.ts, device-preferences.ts, notification-store.ts, preference-documents.ts, reminder-store.ts, hosted-results.ts, digest-storage.ts, digest-authorization-document.ts, reminder-action-document.ts, reminder-creation-document.ts. Out of chunk: calendar-store.ts, development-*-document.ts, workflow-drafts.ts, workflow-notices.ts, and the 14 JSON-document users in runtime/ and prototype/. Also: Quint domain-document-creation.mjs, browser-deletion-poll.mjs, storage.mjs; test/quint-domain-document-creation.test.mjs; every *-migration.spec.ts.
2. **One observedDocument().** preference-documents.ts (source), reminder-store.ts (absorbs reminder-action/creation documents), notification-store.ts, hosted-results.ts, digest-authorization-document.ts. Out of chunk: calendar-store.ts, workflow-notices.ts, development-account-document.ts. Event names stay unchanged.
3. **Dialog kit (dialog-layout.ts → dialog-kit.ts).** Users: domain-recovery, retained-data-notice, review(.css), selected-document-viewer(.css), mail-attachments(.css), reading-review, notifications, device (openSettings), password-provider, incoming-simulation, location-simulation, simulator-recovery, device-controls. Out of chunk: calendar-response/meeting/editor, workflow-history/receipts/urgency/result-input, clock, passwords/dev-vault. Merge the three viewer/review CSS files into dialogs.css.
4. **foreground.ts.** Merge screen-locked.ts and notice-action.ts. Replace the twins in notifications.ts, hosted-results.ts, location.ts, password-provider.ts, review.ts, workflow-speech.ts, workflow-trigger-runtime.ts, voice.ts and runtime/text-share.ts. Update the 13 screen-locked importers, the 5 notice-action importers and the Quint paths (browser-hosted-result-notice.mjs, hosted-digest-refresh.mjs, application manifest).
5. **Recovery table.** Delete notification-recovery.ts, preference-recovery.ts and reminder-recovery.ts. Update device-controls.tsx, device.ts, prototype/{settings-adapter,browser-adapter,camera-adapter,calendar-adapter}.ts and the template.html:1039 bindings, and switch all 17 openDomainRecovery callers to the options-object signature.
6. **Dev boundary (P1).** Move device-adapter, device-controls(.css), development-workflows, digest-*, focus-state, incoming-simulation, location-simulation, password-provider, simulated-* and simulator-* to apps/app/src/dev/. Delete the export folds and inner gates. Edit vite.config.ts:27-35,74-85 (stubs and owner allowlist), main.tsx:33,37-38,99,121,156,174, location.ts (simulation injection), device.ts and notifications.ts (focus provider), and scripts/audit-production-bundle.ts if it lists paths.
7. **Generic deletion journal.** Fold reminder-deletions.ts and calendar-deletions.ts into a generic journal in journal-retention.ts. Export JournalBinding for daily.ts and deletions.ts.
8. **Registration order.** Give platform-plugins.ts a late `web` attach. Fold register-hosted-results.ts into register.ts and drop the ordering comments.
9. **Shared lib helpers** (lib/bytes.ts, lib/ids.ts, lib/crypto.ts or revision.ts, lib/object.ts, lib/abort.ts). These touch hosted-results, incoming-simulation, note-recording-journal, mail-attachments, video-edit, development-workflows, digest-*, files, simulator-recovery, file-picker, simulated-workflows and simulated-inbox.
10. **Inventory and manifests.** Every merge, move or delete must edit test/support/feature-parity.mjs (exact inventory) and any specs/quint/*/manifest.json path entries.

## Text/path pins
- test/support/feature-parity.mjs: all 71 paths (exact inventory).
- LemmaScript-files.txt: edit-receipt.ts, journal-retention.ts, notifications.ts, video-capture.ts, video-edit.ts (`//@ verify` blocks).
- specs/quint/application/manifest.json lists device-controls.tsx, device-preferences, device, display, documents, domain-document, domain-recovery, files, hosted-results, incoming-simulation, journal-retention, json-domain-document, location-simulation, note-audio-store, note-recording-journal, notice-action, notification-store, notifications, password-provider (with prose), preference-documents, preference-recovery, reminder-deletions, reminder-store, review, revision, screen-locked, selected-document-viewer and simulated-messages. specs/quint/services/manifest.json lists file-picker, reading-review and scan-draft. specs/quint/native/manifest.json lists files, video-capture and video-edit.
- Quint refinement harnesses: browser-deletion-poll, domain-document-creation, browser-hosted-result-notice, hosted-digest-refresh, google-access-publication, password-provider-dialog, selected-document-viewer, browser-reviews, browser-note-recording-journal (direct import), storage, boundaries, cloud-connection-notices and account-sheet (page import of /src/browser/...), workflow-request-recovery-admission, bookmarks-hydration, browser-album-storage, services/web-reading-review, services/system-picker-visibility, services/scan, scan-source-conformance, native/video-recorder.
- Source-text or slicing tests (T1/T2):
  - test/agent-action-preferences.test.mjs
  - test/calendar-connect-policy.test.mjs
  - test/calendar-empty-bootstrap-repro.test.mjs
  - test/browser-notification-clear.test.mjs (slices notifications.ts)
  - test/gesture-zones-single-instance.test.mjs
  - test/locale-time-usage.test.mjs (incoming-simulation, simulated-workflows)
  - test/login-surfaces.test.mjs (password-provider)
  - test/workflow-reminder-midnight.test.mjs (development-workflows)
  - test/video-capture-limit.test.mjs (strips types from video-capture and video-edit)
  - test/browser-note-pending-audio.test.mjs
  - test/browser-voice-cancellation.test.mjs
  - test/scan-review-pdf-errors.test.mjs
- Scripts: scripts/audit-production-bundle.ts (password-provider strings) and scripts/storage-specs.ts (device, location, password-provider, storage-usage). scripts/prepare-client-features.ts also matches "files.ts", but that is the upstream plugin-files file, not this one.
- vite.config.ts:28-29: stub keys ./browser/device-controls and ./browser/simulated-apps; importer allowlist at :79-80.
- About 60 Playwright specs import /src/browser/{documents,preference-documents,reminder-store,note-audio-store,notification-store,hosted-results,location-simulation}.ts through page.evaluate (T6). Any move must update them.

## New patterns
- **NEW-a: ternary with identical branches** (notifications.ts:219). Fold into B4.
- **NEW-b: read-back after a synchronous localStorage write** (location-simulation.ts:16, simulator-writer.ts:27,33). Fold into B3.
- **NEW-c: product copy that names the dev tool** (sensor-policy.ts:13 says "device controls" while location.ts says "quick settings"). Fold into D11.
- **NEW-d: import-order-dependent plugin registration** defended by comments that contradict the real order (register.ts:17, register-hosted-results.ts:4-6; research P12). No catalogue ID fits; suggest adding it under D3.

## Owner questions
1. A1: may the legacy envelope, the {raw} archive, the legacy key readers, migrateAudio, the journal "no time" branch and the video MIME sniffing all go, with a one-time key bump or clear of the alpha.browser.* stores?
2. Production recovery: production shows only "Data kept" (domain-recovery.ts:9). Should the test-mocks backup/reset/calendar-restore dialog be deleted, or moved to dev/?
3. Development simulator: keep it under apps/app/src/dev/, or delete it?
4. Wallet simulation (simulated-apps.ts:21,33-39, simulated-workflows.ts:59): delete it with the deferred Wallet feature?
5. The key alpha.browser.reminder-deletions.v1 holds reminder actions. Rename it during an A1 reset, or keep it byte-for-byte?
6. Microphone-off copy: sensor-policy.ts says "device controls" while location.ts says "quick settings". Which wording should both use?
7. test/support/feature-parity.mjs: keep the per-file inventory, or reduce it to directories?
