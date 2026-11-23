# Chunk app-15 — prototype: mvp-features … phone-info-page (18 files)

Per-file reports: `docs/simplification-audit/files/apps/app/src/prototype/<name>.ts.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/mvp-features.ts | SIMPLIFY + MOVE to `product/view-admission.ts` | 41 | 25 |
| apps/app/src/prototype/native-adapter.ts | SPLIT (return-to-app, egress wording, slim scrubber) + delete dead branches/tiles | 409 | 170 |
| apps/app/src/prototype/note-origin-adapter.ts | SIMPLIFY (drop v1 Older-notes links) | 125 | 70 |
| apps/app/src/prototype/note-recorder.ts | SIMPLIFY (dead live/segment transcription) + MOVE to runtime | 573 | 380 |
| apps/app/src/prototype/note-source-adapter.ts | DELETE with legacy notes (else SIMPLIFY on openReview, ~65) | 115 | 0 |
| apps/app/src/prototype/note-web-source-adapter.ts | DELETE with legacy notes (else MERGE, ~15) | 28 | 0 |
| apps/app/src/prototype/notes-document-adapter.ts | SIMPLIFY (drop test-mocks import) → MERGE into notes owner | 34 | 20 |
| apps/app/src/prototype/notes-folders-adapter.ts | SIMPLIFY → MERGE into notes owner | 68 | 45 |
| apps/app/src/prototype/notes-organize-executor.ts | SIMPLIFY + MOVE executor to runtime (host is legacy-bound) | 120 | 105 |
| apps/app/src/prototype/notes-query-executor.ts | SIMPLIFY (delete 2 dead executors); DELETE with legacy notes | 82 | 25 (0 with P10) |
| apps/app/src/prototype/notes-query-review.ts | SIMPLIFY (delete 2 dead dialogs); DELETE with legacy notes | 53 | 22 (0 with P10) |
| apps/app/src/prototype/notes-recorder-control.ts | MERGE into note-recorder.ts / explicit dependency | 10 | 0 |
| apps/app/src/prototype/notes-share-adapter.ts | MERGE into notes view owner | 22 | 15 |
| apps/app/src/prototype/notes-trash-adapter.ts | DELETE with legacy notes (else SIMPLIFY ~200) | 275 | 0 |
| apps/app/src/prototype/notifications-adapter.ts | SPLIT: product taps stay, simulated-shade rows → dev (or delete) | 212 | 70 |
| apps/app/src/prototype/own-notice-question.ts | KEEP (format, named options type) | 18 | 25 |
| apps/app/src/prototype/phone-adapter.ts | SIMPLIFY (+ wav/base64 helpers out) | 240 | 195 |
| apps/app/src/prototype/phone-info-page.ts | KEEP (types tidy; optional move to runtime) | 89 | 85 |
| **Total** | | **2,514** | **~1,250** (with legacy-notes deletion); ~1,750 without it |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Bag` | type | native-adapter.ts:14, note-origin-adapter.ts:4, note-source-adapter.ts:8, note-web-source-adapter.ts:2, notes-document-adapter.ts:4, notes-folders-adapter.ts:2, notes-share-adapter.ts:4, notes-trash-adapter.ts:14, phone-adapter.ts:10 | ~60 renderer files | `prototype/shell-types.ts` |
| `Shell = any` | type | notes-folders-adapter.ts:3, notes-trash-adapter.ts:15 (+ `shell:any` notes-organize-executor.ts:98) | agent-adapter.ts:88 and others | `ShellHost` |
| `Callback` | type | native-adapter.ts:15 | agent-adapter callbacks | shell-types |
| `text(value)` string coercer | helper | native-adapter.ts:84 | calendar-approval-fields.ts:6, ~20 inline | `lib/strings.ts` |
| `TileKey`/`TileFacts`/`tileSettingsPages`/`tileFactsFromSnapshot` | type/const aliases | native-adapter.ts:88-95 | upstream `@elizaos/capacitor-system/settings` names | delete (import upstream) |
| `returnGate`/`watchReturnToApp` | helper | native-adapter.ts:112-127 | `whenVisible` notes-document-adapter.ts:13; notes-trash `onResume` | `runtime/return-to-app.ts` |
| `activityState` labels | const | native-adapter.ts:322 | none found | egress/settings module |
| durable slot/doc wrapper (`browser()/native()/change()`) | helper | note-origin-adapter.ts:9-19 | runtime/notes-folders.ts, runtime/notes-trash.ts, 6+ others (C4) | shared durable document |
| `CREATION_ID` UUID-v4 regex | const | note-origin-adapter.ts:28 | browser/calendar.ts:240 | `lib/ids.ts` |
| SHA-256 → hex | helper (inline) | note-recorder.ts:179-182 | ~28 renderer copies | `lib/hash.ts` |
| `aborted` / `isAbortError` | helper | note-recorder.ts:81, notes-share-adapter.ts:11 (inline) | many | `lib/abort.ts` |
| `Source` / `sourceOf` | type/const alias | note-source-adapter.ts:10,33 | upstream `DocumentSourceLink`/`documentSourceOf` | delete; selection-adapter.ts & summary-note-review.ts import upstream |
| `AlphaMailAttachments` plugin type | interface | note-source-adapter.ts:11-18 | runtime/inbox-attachment mail code | typed plugin module |
| chunked bytes→base64 | helper | note-source-adapter.ts:90, phone-adapter.ts:42 | runtime/native-recovery-backup.ts:12 | `lib/base64.ts` |
| base64→bytes | helper | phone-adapter.ts:41 | browser/mail-attachments.ts:45 | `lib/base64.ts` |
| `button/heading/paragraph` DOM factories | helper | notes-query-review.ts:4-6, note-source-adapter.ts:60, note-web-source-adapter.ts:18 | 14 dialog files | `prototype/dom.ts` |
| theme-token copy into `<dialog>` | inline | note-source-adapter.ts:53, note-web-source-adapter.ts:14 | source-review-dialog.ts:7 + 10 more | `openReview()` |
| `whenVisible` | helper | notes-document-adapter.ts:13 | returnGate | `lib/visibility.ts` |
| `Note` minimal record | type | notes-organize-executor.ts:7 | `NoteRecord` runtime/notes-store | `Pick<NoteRecord,…>` |
| `NotesRestoreOutcome` / `RestoreOutcome` | type | notes-organize-executor.ts:8, notes-trash-adapter.ts:126 | each other | one export |
| `NotesOrganizeReceipt` / `ReviewResult` | type | notes-organize-executor.ts:28, notes-query-executor.ts:37 | each other | shared receipt type |
| `showFolders` patch `{folders, foldersLoaded:true}` | helper | notes-organize-executor.ts:106 | notes-folders-adapter.ts:19,25,32 | notes owner |
| `NotesRecordStart/Stop`, `NotesRecorderControl` | type | notes-recorder-control.ts:5-7 | test/fixtures/cloud-voice-view.d.mts:58 | note-recorder.ts |
| `kindLabel` | const | notes-trash-adapter.ts:16 | kind labels in canonical-notes-ui/model | notes owner |
| `Notice` | type | notifications-adapter.ts:16 | context-selection.ts:119 | context-selection.ts |
| `opaque` id regex | const | notifications-adapter.ts:10 | native-adapter.ts:24 (similar) | `lib/ids.ts` |
| `AlphaNotifications` plugin type | interface | notifications-adapter.ts:17 | none | typed plugin module |
| canonical tap view map | const | notifications-adapter.ts:53 | device-view-profile / model deep-link aliases | module const |
| `Voicemail` | type | phone-adapter.ts:11 | contract voicemail entry (native-telephony.ts) | import contract type |
| `DeleteResult` | type | phone-adapter.ts:28 | runtime/telephony-executor.ts:47 | one export |
| `wavWindows` | helper | phone-adapter.ts:44 | none | `runtime/wav.ts` |
| SVG path icon literals | const | phone-adapter.ts:38-40 | model.js `IC` path data | lucide names |
| voicemail state union | type (inline) | phone-info-page.ts:37,51,56; phone-adapter.ts:67 | each other | `VoicemailState` |
| `PhoneInfoClient` | type | phone-info-page.ts:48 | telephony profile type | `Pick<>` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `executeNotesSearch`, `executeNamedNotes`, `matchNotesContent`, `matchNotesName`, `ApplyExactNotes`, `fold`, `instant`, `ReviewResult` (notes-query-executor.ts:25-82) | `git grep` whole repo: no reference outside the file; `notes_search`/`notes_named` not dispatched in apps/app/src | High |
| `reviewNoteTitles`, `reviewNamedNote` (notes-query-review.ts:28-53) + `test/browser/notes-named-review.spec.ts` and the matching cases in `notes-review.spec.ts` | only reachers are the dead executors above and in-page Playwright evaluation | High |
| `installed` WeakSet, `restore[]`, returned disposer, `_Component` param (native-adapter.ts:20,133,137-139,398,406-408) | single call `main.tsx:125`, return ignored; test ignores it | High |
| `tileAccessibleName`, `tileStateText` re-exports (native-adapter.ts:96) | no importer (only a stub in test/native-adapter-activity.test.mjs:15) | High |
| `residentModelLabel`, `EgressPrivacy`, `PrototypeNativeOptions` exports (native-adapter.ts) | no importer outside the file → unexport | High |
| `phoneRows`, `CALL_TYPE`, `nativeRows`, `nativeStatusDot`, `nativeContacts` (phone-adapter.ts:12-17,215-219) | not bound in template.html; phoneRows kept only by test + services manifest | High |
| `views.phone.reply/suggestions/status` overrides (phone-adapter.ts:198-200) | reply replaced globally at agent-adapter.ts:1939; others are undo layers | Medium |
| `NOTES_TRASH_MAINTENANCE_INTERVAL_MS` export, `loadNoteOrigins` export, `PhoneInfoRow/Section/Client/State` exports, `NoteRecorderPhase` export | no outside importer → unexport | High |
| `alphaCanonicalTap`/`alphaCanonicalWake` instance fields (notifications-adapter.ts:73) | read only by scripts/test-canonical-notification-navigation.ts and Quint harness | High (test-shaped) |
| Live transcription stream in NoteRecorderSession (note-recorder.ts: `live` option, `syncLive`, `closeLive`, `liveFinals…`, `displayTranscript`) | only product constructor `voice-adapter.ts:1180-1188` passes no `live`; `displayTranscript` has no product caller | High (owner confirms not planned) |
| Segment transcription pump (note-recorder.ts: `pump`, transcriber arg, `automaticTranscription`, `remoteTranscription`, `needsTranscriptionConsent`, non-audio `finish` path) + `runtime/note-recorder-driver.ts noteSegmentTranscriber` + driver `setText` → `setNoteSegmentText` | product constructor passes `async()=>null` and `automaticTranscription:false`, only calls `finishAudio` (audioOnly); `noteSegmentTranscriber` has no product caller (grep) | High that it is unreachable; owner confirms (A4) |
| Simulated-shade notices `installNotificationsAdapter` (notifications-adapter.ts:90-212) | installed only when `systemShade==='simulated'` (dev) — move to dev or delete | High (dev-only); delete = owner |
| Tile presentation block (native-adapter.ts:86-108) + agent-adapter tile code | tiles render only in simulated shade (research P8) | Medium-high |
| `replacement()` branches for phone/messages/inbox/browser/maps/contacts/wallet + `smsPayload/mailPayload/browser()` (native-adapter.ts:157-181, 207-275) | those views' renders are fully replaced in product or not admitted; only browser dev profile reaches them | Medium (verify with dev probe) |
| Test-mocks-only text import (notes-document-adapter.ts:22-28) | guarded by `testMocksEnabled`, ships in prod | High |
| Legacy "Older notes" stack in this chunk: notes-trash-adapter.ts (275), note-source-adapter.ts (115), note-web-source-adapter.ts (28), notes-query-executor.ts + notes-query-review.ts (remaining), note-origin-adapter v1 path (~40), notes-folders-adapter legacy release (~5), notes-organize host legacy binding | each gated on `notesSourceMode==='legacy'`/`notesStore`, or its data handle is stripped from canonical records (`canonical-notes-ui.ts:18-19,302,320,342`); agent-adapter.ts:1047 refuses query unless "Previous notes" | High that it is legacy-only; deletion = owner decision P10 |
| `PLAN.md` reference (notes-folders-adapter.ts:6), issue/decision narration and commented-out set members (mvp-features.ts:3-17) | file does not exist / tombstones | High |

## Cross-file actions
1. **Legacy Older notes removal (P10)** — `notes-trash-adapter.ts`, `note-source-adapter.ts`, `note-web-source-adapter.ts`, `notes-query-executor.ts`, `notes-query-review.ts` (delete); `note-origin-adapter.ts` (v1 path), `notes-folders-adapter.ts` (release), `notes-organize-executor.ts` (host `ready/restore`), `main.tsx:149,152,153`, `agent-adapter.ts:1046-1052` and legacy store paths, `canonical-notes-ui.ts` (LOCAL_HANDLES, `notesTrash:undefined` overrides become unnecessary), `model.js:2984`, `template.html:2479-2480` and Trash markup, `selection-adapter.ts:4`, `summary-note-review.ts:3` (switch `type Source` to upstream), `runtime/note-origin.ts` v1 types, Quint `specs/quint/application/manifest.json` entries + `note-source-dialog.mjs`, `note-web-source-dialog.mjs`, legacy notes-view harness, tests listed in each report, `test/support/feature-parity.mjs`.
2. **Notes recorder dead transcription** — `note-recorder.ts`, `notes-recorder-control.ts` (types merge), `runtime/note-recorder-driver.ts` (`noteSegmentTranscriber`, `setText`), `browser/voice.ts setNoteSegmentText`, `browser/note-recording-journal.ts setText`, Android `AlphaNoteRecorder` `setNoteSegmentText` plugin method (android audit), `voice-adapter.ts:1180-1188` constructor args, `test/notes-recorder.test.mjs`, `scripts/test-cloud-voice-flow.ts`, `test/fixtures/cloud-voice-view.*`.
3. **Return-to-app watcher move** — `native-adapter.ts` → `runtime/return-to-app.ts`; importers `agent-adapter.ts:82`, `contacts-adapter.ts:2`, `phone-adapter.ts:6`, `sms-adapter.ts:7`, `telephony-attention.ts:12`; Quint stubs `contacts-session-replay.mjs:15`, `mms-compose-replay.mjs:20`; `test/comms-settings.test.mjs:26-33`.
4. **Upstream settings helpers direct import** — `agent-adapter.ts:82`, `settings-adapter.ts:18` import `broaderPageNotice/handoffGate/switchValue` from `@elizaos/capacitor-system/settings`; delete `native-adapter.ts:96`; rewrite `test/shade-tile-facts.test.mjs`.
5. **Settings "honesty pass" ownership** — move `honestSettings` and label-keyed row facts from `native-adapter.ts:305-385,400-407` into `settings-adapter.ts` (keyed by row id); remove the `defineProperty` trap; `test/settings-truth.test.mjs:128-132`, `test/native-adapter-activity.test.mjs`, Playwright privacy specs.
6. **Simulated shade to dev** — `notifications-adapter.ts:90-212` + `native-adapter.ts` tiles + `agent-adapter.ts:684,707,1539-1590` + `main.tsx:142,196-204` + `test/fixtures/shade-*.mjs`, `test/shade-tile-facts.test.mjs`, Quint application manifest entries.
7. **Notes view owner** — merge `notes-share-adapter.ts`, `notes-document-adapter.ts` (`saveImportedNote` api patch), `notes-folders-adapter.ts`, (and if kept) source/web-source/trash adapters into one `views/notes/` pipeline; preserve render order: document → share → trash → folders → canonical → source → web-source (`main.tsx:147-153`).
8. **mvp-features move + private sets** — `mvp-features.ts` → `product/view-admission.ts`; `model.js:17,5310,5431,5679`, `runtime/device-view-profile.ts:1,30`, `main.tsx:27`, 6 other importers, tests (`accessibility-coverage`, `aosp-image-capability`, `aosp-sms`, `dev-surface-gates`, `wallet-disabled`, `quint-view-admission`), Quint manifests + README:85, feature-parity, Java comment.
9. **Shared micro-helpers** — `lib/base64.ts` (phone-adapter, note-source-adapter, runtime/native-recovery-backup, browser/mail-attachments), `lib/hash.ts` (note-recorder + ~28), `lib/abort.ts`, `lib/ids.ts` (note-origin-adapter, browser/calendar), `prototype/dom.ts`.
10. **Phone session object** — `phone-adapter.ts` singletons → returned session; `agent-adapter.ts:28,687,937`, `runtime/voicemail-transcription.ts:8`, `runtime/telephony-executor.ts:47` (DeleteResult), Quint phone-session replay + manifests.

## Text/path pins
- `test/support/feature-parity.mjs:389-406` lists all 18 paths (exact inventory: every move/merge/delete edits it).
- mvp-features: `test/accessibility-coverage.test.mjs:14-16`, `test/aosp-image-capability.test.mjs:39-41`, `test/aosp-sms.test.mjs:253`, `test/wallet-disabled.test.mjs:25,42`, `test/dev-surface-gates.test.mjs:74-82`, `test/quint-view-admission.test.mjs:12,19`, `specs/quint/refinement/services/contacts-session-replay.mjs:12`, `specs/quint/application/manifest.json:7007-7042`, `specs/quint/services/manifest.json:3256-3268`, `specs/quint/application/README.md:85`, `AccessibilityViewsInstrumentedTest.java:38` (comment).
- native-adapter: region markers `// tile-facts:begin/end` (`test/shade-tile-facts.test.mjs:4-11`), `// return-gate:begin/end` and `watchReturnToApp` regex (`test/comms-settings.test.mjs:15,31-33`), slice `type EgressConnection =` … `/** Only a verified resident session` (`test/settings-truth.test.mjs:128-132`), `if (module === 'wallet') {` (`test/wallet-disabled.test.mjs:48`), bundle stubs `test/native-adapter-activity.test.mjs:5-28`, Quint stubs `'native-adapter$'`.
- note-origin-adapter: `test/note-origin.test.mjs:137`, `test/browser/note-calendar-handoff.spec.ts:20` (`readNoteOrigins`).
- note-recorder: `LemmaScript-files.txt:11`, `specs/lemma/apps/app/src/prototype/note-recorder.dfy(.gen)`, `specs/lemma/README.md:184` (the `//@` contract on `recordingClockParts`), `specs/quint/application/manifest.json:3429`, `specs/quint/legacy/manifest.json:1095`, `test/fixtures/cloud-voice-view.mjs:59` (text rewrite of `export class`), `test/fixtures/notes-recorder-media.mjs:24`.
- note-source-adapter: `test/note-source-references.test.mjs:39`, `specs/quint/refinement/application/note-source-dialog.mjs:9`, application manifest (10 names), `test/fixtures/notes-trash-read.mjs:45`.
- note-web-source-adapter: `test/browser-reviewed-link-provenance.test.mjs:9`, `specs/quint/refinement/application/note-web-source-dialog.mjs:8`, application manifest (6 names).
- notes-document-adapter: `specs/quint/refinement/application/notes-document-transfer.mjs:7`, application manifest (7 names incl. `testMocksEnabled`, `whenVisible`).
- notes-folders-adapter: application manifest:285, `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`.
- notes-trash-adapter: `test/note-source-references.test.mjs:37-38` (regex of the release line), `test/fixtures/notes-trash-read.mjs`, application manifest:3630,7148-7198 (12 names), legacy notes-view harness.
- notes-query-review: in-page injection by `test/browser/notes-query-review.spec.ts:12`, `notes-named-review.spec.ts:14`, `notes-review.spec.ts`.
- notes-recorder-control: application manifest:3430, `notes-recorder-media-admission.mjs`, `test/fixtures/notes-recorder-media.mjs:75`, `test/fixtures/cloud-voice-view.*`.
- notifications-adapter: `scripts/test-canonical-notification-navigation.ts:6` (text eval), `specs/quint/refinement/application/canonical-notification-tap-admission.mjs:147-151`, application manifest:1230,1314,2673,3799, `test/fixtures/shade-row-custody.mjs:106-107`, `test/fixtures/shade-notice-question.mjs`.
- own-notice-question: `scripts/test-own-notice-question.ts:10` (text eval), `specs/quint/refinement/application/own-notice-question.mjs:27` (text concat), application manifest (7 local names), `specs/quint/refinement/services/inbox-coordinator-ports.mjs`.
- phone-adapter: `specs/quint/refinement/services/phone-session-replay.mjs:21`, application manifest:8414-8440 and services manifest:3317 (local names `reading, dialing, session, epoch, needsAccess, call, refresh, available, clear, sync`, `phoneRows`), native manifest.
- phone-info-page: `test/phone-info-page.test.mjs` only.

## New patterns
- **NEW-1 JSON-stringify identity as staleness check** (`note-web-source-adapter.ts:12,19`, `notes-share-adapter.ts:12-13`, `notes-organize-executor.ts:75`, `notifications-adapter.ts:134,141,208`, `note-origin-adapter.ts:40`): equality of whole serialized records instead of a revision/id. Research P13 mentions it only for session tuples; it is broader. Treatment: compare an explicit revision field via one helper.
- **NEW-2 Canonical mode neutralising legacy adapters by overriding their api members** (`canonical-notes-ui.ts:320,342` setting `notesTrash:undefined, moveNoteToTrash:()=>false`, stripping `LOCAL_HANDLES`): a whole adapter stays installed and patched in, then disabled downstream. Variant of A6 specific to the legacy/canonical split; resolved by P10.
- **NEW-3 Dormant constructor options** (`NoteRecorderSession` `live`, transcriber, `automaticTranscription`, `remoteTranscription`): features kept alive by option flags that the only production caller never sets. A4 variant (no `const false` switch, the switch is the absent argument). Detect by checking the product constructor's arguments.
- **NEW-4 Render-output fields nothing binds** (`phone-adapter.ts nativeRows/nativeStatusDot/nativeContacts`): adapter output keys with no template/model consumer. Detect by grepping each output key in `template.html`/`model.js`.

## Owner questions
1. Legacy "Older notes"/"Previous notes" (research P10): may we delete the Trash, source-document, web-source, notes-query and v1 note-origin paths in this chunk (≈560 lines) together with agent-adapter's legacy store?
2. Note recorder: is live transcription or automatic/explicit per-segment transcription during recording planned? If not, delete the live stream and segment pump (≈190 lines) plus `noteSegmentTranscriber` and the native `setNoteSegmentText` path.
3. Should agent `notes_record`, `notes_folder_create`, `notes_move` and `notes_restore` work with Agent Notes? Today `notesOrganizeShellHost.ready()` requires the legacy `notesStore`, so they answer "Notes unavailable" in the default source.
4. Simulated shade (notices, tiles): retire it, or move it to `dev/`? (research §7.5)
5. `voice-adapter.ts:1252-1253` forces `folder:null` and closes the move menu on every Notes render. Is the Notes folder UI (create/rename/delete/move from model.js) still a product feature, or only the agent folder operations?
6. Text-note import in `notes-document-adapter.ts` exists only in test-mocks builds: delete it, or is it a planned product feature?
7. `notes-document-adapter.ts:21` shows "Import failed" for an export failure too: may the copy change to "Export failed"?
8. Wallet (AP-13): delete the remaining `wallet` entries in `mvp-features.ts` and `native-adapter.ts` (keep "pay"/"open wallet" refusal)?
