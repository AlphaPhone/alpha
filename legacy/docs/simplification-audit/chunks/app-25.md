# Chunk app-25 — runtime n–v: native bridges, Notes bindings, owner/phone/reminder/remote, read cache, share, telephony, UI installers

Per-file reports: `docs/simplification-audit/files/apps/app/src/runtime/<file>.md` (54 files, 2,977 lines).
"Unused" claims come from `git grep -w` over `apps android scripts` (excluding the defining file) and `test specs`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| native-calendar-sync.ts | DELETE (superseded client linked-sync stack; owner for Android bridge) | 68 | 0 |
| native-connection.ts | SPLIT + delete test-only/legacy | 326 | ~120 (+~130 in browser/secret-store.ts, browser/connection.ts) |
| native-live-voice.ts | SIMPLIFY (maybe MERGE with native-voice-turn) | 41 | ~15 |
| native-network.ts | SIMPLIFY | 23 | ~10 |
| native-reading-voice.ts | SIMPLIFY | 31 | ~18 |
| native-recovery-backup.ts | DELETE (owner; PRD no backup) | 16 | 0 |
| native-view-events.ts | KEEP (minor) | 25 | ~25 |
| native-voice-turn.ts | SIMPLIFY | 30 | ~12 |
| note-audio-deletions.ts | SIMPLIFY (→ notes bindings + durable slot) | 42 | ~15 |
| note-audio-lock.ts | MERGE into notes bindings | 3 | 0 |
| note-dates.ts | DELETE (shim) | 1 | 0 |
| note-default-title.ts | KEEP | 13 | 13 |
| note-origin.ts | SIMPLIFY | 39 | ~10 |
| note-recorder-driver.ts | SIMPLIFY | 95 | ~80 |
| notes-contract.ts | DELETE (shim) | 1 | 0 |
| notes-folders-model.ts | SIMPLIFY | 81 | ~60 |
| notes-folders.ts | SIMPLIFY | 20 | ~8 |
| notes-organize-contract.ts | DELETE (use upstream twin) | 68 | 0 |
| notes-secure-store.ts | SIMPLIFY (legacy per owner) | 30 | ~15 |
| notes-store.ts | MERGE into notes bindings | 13 | ~6 |
| notes-trash-policy.ts | SIMPLIFY | 73 | ~30 |
| notes-trash.ts | SIMPLIFY | 57 | ~25 |
| notes-view.ts | SIMPLIFY | 68 | ~55 |
| owner-reminder-notification-port.ts | SIMPLIFY (format, helpers) | 90 | ~95 (formatted) |
| owner-reminder-notification-protocol.ts | SIMPLIFY | 53 | ~45 |
| owner-route-policy.ts | KEEP (minor) | 50 | ~45 |
| paired-voice.ts | DELETE (owner; test-mocks only) | 46 | 0 |
| permanent-voice-deletion.ts | MERGE into notes bindings | 15 | 0 (+2 lines) |
| phone-context.ts | SIMPLIFY | 167 | ~110 (owner) / ~140 |
| phone-dial-contract.ts | MERGE into telephony-contracts.ts | 5 | 0 |
| phone-workflow-authoring.ts | SIMPLIFY | 30 | ~22 |
| photo-library.ts | DELETE (wrappers test-only) | 12 | 0 |
| power-launch-state.ts | KEEP (minor) | 13 | ~12 |
| prepared-view-navigation.ts | KEEP (minor) | 9 | 9 |
| reminder-creations.ts | SIMPLIFY | 43 | ~35 |
| reminder-deletions.ts | SIMPLIFY (rename, reminders/) | 17 | ~8 |
| reminder-journal-store.ts | MOVE → runtime/durable-slot.ts | 20 | ~25 (shared) |
| remote-protocol.ts | SPLIT (helpers stay; class → dev or delete) | 338 | ~45 in production |
| resident-recovery.ts | KEEP (minor) | 74 | ~65 |
| reviewed-mail-context.ts | DELETE (shim) | 7 | 0 |
| service-read-cache-store.ts | SIMPLIFY | 42 | ~25 |
| service-read-cache.ts | KEEP (minor) | 39 | ~36 |
| share-panel.ts | SIMPLIFY + MOVE to ui/ | 56 | ~40 |
| sms-agent-contract.ts | MERGE into telephony-contracts.ts | 5 | 0 |
| sms-subscription-revision.ts | KEEP | 9 | ~10 |
| source-renewal-question.ts | SIMPLIFY | 39 | ~35 |
| status-ui.tsx | KEEP (MOVE to ui/) | 10 | 10 |
| subscription-entitlement.ts | SIMPLIFY | 143 | ~120 |
| telephony-actions-contract.ts | DELETE (shim) | 10 | 0 |
| telephony-executor.ts | KEEP (minor) | 165 | ~160 |
| text-scale.ts | KEEP (minor, MOVE) | 46 | ~40 |
| text-share.ts | SIMPLIFY | 29 | ~25 |
| toast-layer.ts | KEEP (minor, MOVE) | 138 | ~120 |
| view-focus.ts | KEEP (minor, MOVE) | 93 | ~85 |

Total ≈ 2,977 → ≈ 1,850 in place (≈ 1,130 lines removed; ≈ 1,550 if the owner approves remote/paired/legacy deletions — remote-protocol class ~240 moves out of production either way).

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| SHA-256 → hex | helper | native-calendar-sync.ts:34, native-recovery-backup.ts:11, note-origin.ts:32, owner-reminder-notification-protocol.ts:29, service-read-cache-store.ts:18, sms-agent-contract.ts:4 | ~25 renderer copies | `apps/app/src/lib/hash.ts` `sha256Hex` |
| plain-object guard (`object`/`record`) | helper | native-calendar-sync.ts:14, owner-reminder-notification-protocol.ts:24, remote-protocol.ts:65, phone-workflow-authoring.ts:17-18 | ~35 copies (cloud-protocol.ts:124 …) | `lib/records.ts` `asRecord`/`isRecord` |
| UUID regex | const | native-calendar-sync.ts:20 (loose), owner-reminder-notification-protocol.ts:5+8, power-launch-state.ts:9, remote-protocol.ts:316, resident-recovery.ts:33 | connection-ui `validateUuid` | `lib/ids.ts` `isUuid` |
| abort/timeout race | helper | native-connection.ts:276-287,297-301, native-network.ts:5-22 | voice-timing.ts:126, workflow-presentation.ts:47, local-speech-playback.ts:19 | `lib/abort.ts` `raceAbort`/`withTimeout` |
| abortable sleep | helper | native-calendar-sync.ts:62 | — | `lib/abort.ts` `sleep` |
| promise serial queue | helper | native-connection.ts:168, 236-239; service-read-cache.ts:38 | — | `lib/serial-queue.ts` |
| canonical JSON | helper | owner-reminder-notification-protocol.ts:28 | upstream `workflowBytes` | `lib/json.ts` |
| Android-slot/browser-document switch | helper | reminder-journal-store.ts:9, notes-folders.ts:7-19, notes-trash.ts:16-42, note-audio-deletions.ts:16-28, service-read-cache-store.ts:17-22 | workflow-intents.ts:19-26 | `runtime/durable-slot.ts` |
| `android()` predicate | helper | note-audio-deletions.ts:16, notes-trash.ts:16, notes-folders.ts:9, reminder-journal-store.ts:10; `isNativePlatform` in service-read-cache-store.ts:19 | workflow-intents.ts:19 | `native.ts` `isAndroid` |
| saved-notes raw readback | helper | notes-trash.ts:49-55, note-audio-deletions.ts:29-33 | — | `notes-secure-store.ts` `readSavedNotesRaw` |
| `BrowserDocument` shape | type | reminder-journal-store.ts:4, notes-folders.ts:7 | — | `browser/json-domain-document` type |
| PluginHeaders casts | helper | native-connection.ts:14,18,25,217 | native.ts:21, main.tsx:369 | `platform-plugins.ts` `pluginHeader`/`pluginHasMethod` |
| `AlphaVoiceCloud` typing / `available` | type/helper | native-live-voice.ts:15-16, native-voice-turn.ts:12-13, native-reading-voice.ts:7, note-recorder-driver.ts:16-27, paired-voice.ts:7-17 | 16 registrations | `native/plugins.ts` |
| `AlphaDevice`, `AlphaCalendar`, `AlphaMailAttachments` typings | type | text-share.ts:3, native-calendar-sync.ts:7, native-recovery-backup.ts:3-4 | 18 AlphaDevice registrations | `native/plugins.ts` |
| paired voice `Binding` | type | paired-voice.ts:6 | connection-ui.tsx:2531, native-reading-voice.ts:17 | delete with paired voice |
| liveness fence (JSON binding compare + hidden + open) | helper | native-reading-voice.ts:18-25, paired-voice.ts:22-35, native-calendar-sync.ts:26-27 | local-speech-playback.ts:30, text-share.ts:5, source-renewal-question.ts:10 | `runtime/owned-operation.ts` |
| `notesFolderName` | helper | notes-folders-model.ts:17 | upstream plugin-assistant notes-organize-contract.ts:69 (identical) | upstream |
| `noteFolderOf` | helper | notes-folders-model.ts:66 | prototype/model.js:2989 `notesFolderOf` | here |
| `Note`/`FolderNote` | type | notes-view.ts:8, notes-folders-model.ts:64 | `NoteRecord` | `NoteRecord` |
| `NotesKind`/`NOTES_KINDS`/kinds literal | type/const | notes-view.ts:9-10, notes-trash-policy.ts:14 | upstream notes-organize-contract.ts:15 | upstream |
| kind→label map | const | notes-view.ts:31, notes-organize-contract.ts:59 | upstream `KIND_LABELS` | upstream |
| outcome→device status mapper | helper | phone-dial-contract.ts:5, sms-agent-contract.ts:5, telephony-executor.ts:52-55 | — | `runtime/telephony-contracts.ts` |
| `OpenThread` shape | type | telephony-executor.ts:45 | prototype/sms-adapter.ts:12, connection-ui.tsx draftSmsReply | export from telephony-executor.ts |
| `CALENDAR_AVAILABILITY_CAPABILITY` | const | phone-context.ts:132 | upstream packages/contracts/src/device-reviews.ts:13 | upstream |
| `OWN_NOTIFICATION_SOURCE` `'own'` | const | phone-context.ts:18 | source-renewal-question.ts:11, browser/notifications.ts | phone-context.ts (import it) |
| SIM revision grammar | const | sms-subscription-revision.ts:8 | phone-context.ts:66 regex | sms-subscription-revision.ts |
| reminder shown-status set | const | reminder-creations.ts:34 | workflow-reminder-read.ts:6 `OPEN` | `reminders/` |
| `Bag` | type | reminder-creations.ts:7 | ~60 files | `prototype/shell-types.ts` |
| resident recovery copy | const | resident-recovery.ts:8-23 (two functions, same strings) | — | one `REASON_COPY` table |
| dialog lifecycle | helper | share-panel.ts:26-55 | prototype/source-review-dialog.ts, summary-note-review.ts, ~20 | shared dialog scaffold |
| `'Alpha'` app name | const | photo-library.ts:9, reminder-creations.ts:42, subscription-entitlement.ts:32 | product registration | `product/alpha-product-registration.ts` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `native-connection.ts:60-67` `memorySecretBackend`, `:125-138` `durableSecretsWithFallback` | never called in product (grep -c in file = 2 definitions; only `test/connection-step-contracts.test.mjs:88-103`) | High |
| `subscription-entitlement.ts:43-45` `allowanceText` | 0 references anywhere | High |
| `subscription-entitlement.ts:69` `void copy;` | no-op | High |
| `notes-organize-contract.ts` (whole) | upstream projected twin identical except `notesOrganizeContextAllowed(ctx, op)` signature; only caller `agent-adapter.ts:1057` | High |
| `note-recorder-driver.ts:84` (`browserDevProfile&&'agent'`), `:89-93` | `selectVoiceRoute` body never returns `'agent'` | High |
| `notes-store.ts:10-12` `STORAGE_FULL_CODE` | 0 src, 0 tests | High |
| `phone-workflow-authoring.ts:28-29` `zoneOffsetMinutes`, `:25` `parsePhoneCatalog` | 0/0 and test-only | High |
| `notes-trash-policy.ts` 11 forwards (keep 4 callers via `notesTrashPolicy`), `notesTrashOverflows`, `NotesTrashPlan` | product uses 5 names; rest scripts/tests only | High |
| `reminder-deletions.ts:5` `PendingReminderDeletion` | 0/0 | High |
| Pure shims `note-dates.ts`, `notes-contract.ts`, `reviewed-mail-context.ts`, `telephony-actions-contract.ts` | no behaviour | High (mechanical) |
| `photo-library.ts` wrappers `scopePresentation`/`reviewText`/`describeLibraryOperation` | 0 callers in apps; only test/photo-library.test.mjs | Medium (owner: copy intent) |
| Unused exports (unexport): native-connection `browserConnectionSlot`, `ConnectionPort`, `BrowserSecretBackend`; note-audio-deletions `audioDeletionDocument`; notes-trash `browserNotesTrashKey`; notes-folders-model `NOTES_FOLDER_LIMIT`, `NOTES_FOLDER_NAME_MAX`, `emptyNotesFolders`; notes-view `noteInstant`; owner-reminder-port `ReminderVisibility`, `ReminderUi`, `AgentReminderStatus`; protocol `OWNER_REMINDER_BYTES`, `ReminderOwner`, `reminderDigest`; owner-route-policy `OwnerRouteGroup`; remote-protocol `RemoteIdentity`, `RemoteAuthStatus`, `droppedResponse`; resident-recovery `RecoveryReview`, `RecoveryArchive`, `ResidentBootStatus`, `residentBootLost`; service-read-cache-store `sharedMailKeys`; subscription-entitlement `ResidentAdmissionOutcome`; telephony-executor `ContactMatch`, `TelephonyExecution`; text-scale `LARGE_TEXT_CLASS`; text-share `nativeTextSharing`; note-origin `recordNoteOriginOf`, `RecordNoteOrigin`; notes-secure-store `NotesOpenStage`, `mergeNotesDrafts`, `notesDraftChanges`; permanent-voice-deletion `PermanentDeletionEvidence/Step`, `DeletionLease`; phone-dial/sms re-exports listed in their reports | grep -w, 0 external users | High |
| `native-calendar-sync.ts` + client linked-sync stack | `openCalendarSyncSettings`/`startCalendarSyncHost` have no importer; live path is agent-calendar `changeSync` | Medium-high (owner for Android `AlphaCalendar`) |
| `native-recovery-backup.ts` + device backup branch of `browser/domain-recovery.ts` | throws unless test-mocks; PRD excludes backup | Medium (owner) |
| `paired-voice.ts` + `getPairedVoiceBinding` + voice-adapter paired state + native-reading-voice L28-30 | binding null unless test-mocks; PRD no hosted pairing | Medium (owner) |
| `remote-protocol.ts` `RemoteProtocol` class (L94-296), `native-connection.ts` `remoteCredentialStore`/`nativeRemoteRequest` | constructed only in test-mocks `connectRemote` | Medium (harness dependency) |
| `phone-context.ts:106-129` `phoneContextMessage` + `connection-ui.tsx:1679,3389,3423` uses | test-mocks unnegotiated peers + old-history recognition | Medium |
| Legacy notes chain: `notes-store.ts:3,5`, `notes-secure-store.ts:12-16`, `phone-context.ts` legacy-app-* and note-source kinds | PRD: new package starts empty | Owner |
| `service-read-cache-store.ts` `retireSharedMail`/`sharedMailKeys` | one-off cleanup of older layout on every start | Medium (owner) |
| `native-connection.ts:243-245` credentialId migrate-on-read, `:256-266` `removeStoredCloudCredential` (+ connection-ui.tsx:2635) | only older builds wrote such data | Medium (owner) |
| `note-origin.ts:35-39` whole-record revision fallback | links "made before content revisions" | Medium (owner) |
| `subscription-entitlement.ts:35-40` credits branch | PRD calls credits non-policy | Owner |

## Cross-file actions
1. **Durable slot adapter**: generalise `reminder-journal-store.ts` into `runtime/durable-slot.ts`; adopt in `reminder-creations.ts`, `reminder-deletions.ts`, `notes-folders.ts`, `notes-trash.ts`, `note-audio-deletions.ts`, `service-read-cache-store.ts` (+ `workflow-intents.ts`, outside chunk). Keep every slot/key string; update `test/native-secure-slots.test.mjs` (text reader), Quint `reminder-adapter-fixture.mjs:29`.
2. **Notes bindings module** (`runtime/notes/bindings.ts`): fold `note-audio-lock.ts`, `notes-store.ts`, `notes-secure-store.ts` constants, `permanent-voice-deletion.ts`, `readSavedNotesRaw` (from `notes-trash.ts` + `note-audio-deletions.ts`). Importers: `browser-notes-document.ts`, `agent-adapter.ts`, `voice-adapter.ts`, `notes-trash-adapter.ts`, `notes-query-*.ts`, `legacy-notes-access.ts`; pins: Quint `notes-coordinator.mjs:16-18`, `contracts.mjs:9-10`, `portable.mjs:132`, application manifest, `scripts/test-notes-*`.
3. **Notes organise → upstream**: delete `notes-organize-contract.ts`; `agent-adapter.ts:37,1057` (`notesOrganizeContextAllowed(expectedContext, organize)`), `notes-organize-executor.ts:2`, `notes-folders-model.ts` (`notesFolderName` from upstream), `notes-view.ts` (`NOTES_KINDS`, labels), `notes-trash-policy.ts:14`, `test/notes-organize.test.mjs`.
4. **Telephony contracts**: replace `phone-dial-contract.ts`, `sms-agent-contract.ts`, `telephony-actions-contract.ts` with `runtime/telephony-contracts.ts` (dialDeviceStatus/smsDeviceStatus/smsAgentHash or one `deviceStatus`), shared by `telephony-executor.ts:52`; importers `agent-adapter.ts:20-22`, `phone-context.ts:6-8`, `scripts/test-connection-history.ts:29`; one upstream path `@elizaos/contracts/telephony-actions` (also `telephony-executor.ts:15`).
5. **Retire paired/remote agent**: `paired-voice.ts`, `native-reading-voice.ts:28-30`, `note-recorder-driver.ts:84-93`, `voice-adapter.ts:30,183,317,1431`, `connection-ui.tsx:1138-1140,2531-`, `remote-protocol.ts` (class → dev), `native-connection.ts:267-271,289-293`, `phone-context.ts:106-129` + `connection-ui.tsx:1679,3389,3423`, `voice-selection.ts` `'agent'` return; harness: `scripts/fixtures/workflow-host.ts`, `scripts/test-connection-history.ts`, `scripts/test-remote-protocol.ts`, `scripts/test-local-agent-stream.ts`, `test/live-voice.test.mjs`, `test/voice-selection.test.mjs`. Conversation helpers move first: `remote-protocol.ts:297-338` → `runtime/agent-conversation.ts`, update `local-agent.ts:14`, `local-agent-stream.ts:3`, `connection-ui.tsx:54`.
6. **Calendar linked-sync stack deletion**: `native-calendar-sync.ts`, `calendar-sync-host.ts`, `calendar-sync-settings.ts` (keep type), `calendar-linked-*`, manifests (`specs/quint/native/manifest.json:1350`, services manifest), `test/native-calendar-sync-port.test.mjs`, Android `AlphaCalendar` sync methods.
7. **native-connection split**: new `browser/secret-store.ts`, `browser/connection.ts`; `browser/register.ts:3` import order; T2 tests `connection-step-contracts`, `managed-service-routes`, `native-connection-headers` must be rewritten/deleted together.
8. **Shared lib helpers** (`lib/hash.ts`, `lib/ids.ts`, `lib/records.ts`, `lib/abort.ts`, `lib/serial-queue.ts`, `lib/json.ts`): every file in the helper table above.
9. **`native/plugins.ts`**: AlphaVoiceCloud/AlphaDevice/AlphaCalendar/AlphaConnection typings from native-live-voice, native-voice-turn, native-reading-voice, note-recorder-driver, text-share, native-connection (+ ~20 files outside chunk).
10. **Constants shared**: `OWN_NOTIFICATION_SOURCE` → `source-renewal-question.ts:11`; SIM revision pattern → `phone-context.ts:66`; `noteFolderOf` → `prototype/model.js:2989`; `CALENDAR_AVAILABILITY_CAPABILITY` from upstream → `phone-context.ts:132`, `scripts/test-calendar-availability-flow.ts`.
11. **Label-text behaviour → data attributes**: `text-share.ts:6` (lock screen labels), `view-focus.ts:28` (`aria-label="Voice conversation"`), `share-panel.ts:42` (icon by label) — needs the shell to expose `data-alpha-locked` / `data-alpha-voice-conversation`.
12. **UI installers out of runtime/**: `share-panel.ts`, `status-ui.tsx`, `text-scale.ts`, `toast-layer.ts`, `view-focus.ts` → `ui/`; update `main.tsx:84-90`, all path pins below.

## Text/path pins
- `test/support/feature-parity.mjs`: lists every file of this chunk by path.
- Quint manifests (`sources` paths): `specs/quint/application/manifest.json` (most notes/owner/share/toast/view-focus/text-scale files), `specs/quint/native/manifest.json` (native-calendar-sync, native-live-voice, note-audio-deletions, photo-library, reminder-*, resident-recovery, sms-*, telephony-executor), `specs/quint/services/manifest.json` (native-calendar-sync, phone-workflow-authoring, reviewed-mail-context, service-read-cache*, subscription-entitlement), `specs/quint/legacy/manifest.json` (note-recorder-driver, photo-library).
- Quint refinement harnesses reading/loading source text: `native-view-subscription.mjs:6`, `notes-coordinator.mjs:16-18`, `contracts.mjs:9-10`, `browser-owner-reminder-action.mjs:6`, `browser-owner-reminder-read.mjs:6`, `portable.mjs:132`, `observation-turn-dispatch.mjs:12`, `workflow.mjs:6,9`, `workflow-local-source.mjs:39`, `workflow-execution-audit-admission.mjs:15`, `calendar-adapter-fixture.mjs:10,41`, `reminder-adapter-fixture.mjs:28-29`, `resident-liveness.mjs:6,12`, `service-read-cache-replay.mjs:18`, `saved-service-read.mjs:13`, `cache.mjs:2,8`, `share-panel-admission.mjs:7`, `hosted-digest-refresh.mjs:69`, `authorization.mjs:3,15`, `maps-connection.mjs:34`, `plan-admission-ports.mjs:14`, `telephony.mjs:202,279`, `modal-toast-forwarding.mjs:11,156` (reads variable `installed`), `screen-focus-ownership.mjs:12,168` (reads `installed`), legacy `check-notes-view-refinement.mjs:37,42,75-76`.
- `LemmaScript-files.txt:20`: `resident-recovery.ts` (`//@ verify` block L44-48).
- Host tests reading source text (T1/T2): `native-calendar-sync-port`, `connection-browser-return`, `connection-step-contracts` (slices `memorySecretBackend`…`SECRET_DATABASE`), `managed-service-routes` (slices `createBrowserConnection(`), `native-connection-headers`, `native-google-port-capability`, `native-secure-slots`, `diagnostics-export`, `live-voice`, `voice-assistant`, `browser-reading-capability`, `native-reading-voice-profile`, `note-recorder-permission-recovery`, `notes-pending-editor`, `notes-deletion-lease`, `feature-parity.test.mjs`, `photo-library`, `prepared-navigation-route`, `reminder-lifecycle-pure`, `scanned-calendar-handoff`, `share-panel-adapter`, `share-panel-watch`, `chooser-direct-entry`, `cloud-sign-in-state`, `subscription-entitlement`, `accessibility-coverage` (asserts `installViewFocus()`, `installToastLayer()`, `installTextScale()` text in main.tsx).
- Scripts reading text: `scripts/test-calendar-availability-flow.ts` (phone-context), `scripts/test-calendar-crud-review.ts` (reminder-creations).
- Browser specs importing `/src/runtime/<file>.ts` by path: notes trash/audio specs, reminder specs, `browser-credential-cas`, `browser-secret-retirement`, `view-focus`, `dev-workflow-dates`, `share-panel`, `live-voice`, `reading-review`, `assistant-draft-storage`, `mvp`, `home-inbox`, `gmail-mvp-scope`.
- Android: `NOTES_TRASH_SLOT` (`AlphaNoteAudioPlugin.java`, `NotesTrashBackstopInstrumentedTest.java`), `NOTES_TRASH_MAX_BYTES` (`AlphaCredentialStore.java`), `NOTES_TRASH_RETENTION_MS` (`AlphaNoteAudioPlugin.java`), `RendererCredentialSlots.java:14` comment on native-calendar-sync.
- `tsconfig.json`, `vite.config.ts`: alias entries for `subscription-entitlement`.
- Not pins (basename false positives): `scripts/prepare-client-features.ts` lines name the upstream twins (`plugin-assistant/.../notes-organize-contract.ts`, `phone-dial-contract.ts`, `telephony-actions-contract.ts`, `packages/voice/src/native-live-voice.ts`).

## New patterns
- NEW-1 **Behaviour keyed on aria-label text** (fits D10's "label-string-driven behaviour" but worth a sub-ID): `text-share.ts:6` detects the lock screen via `[aria-label="Unlock with fingerprint"], [aria-label="Wake"]`; `view-focus.ts:28` `[aria-label="Voice conversation"]`. Renaming accessible copy silently changes security/focus behaviour. Treatment: shell exposes state as data attributes.
- NEW-2 **Local override + `export *` shadowing**: `subscription-entitlement.ts:28` and `photo-library.ts:7` re-export everything upstream and then redefine some names with the same identifiers, so the module's API silently mixes upstream and local semantics. Treatment: explicit re-export lists.
- NEW-3 **Same upstream contract via two upstream paths** (C7 variant): telephony actions imported from `packages/contracts/src/telephony-actions.ts` and from `plugin-assistant/.../telephony-actions-contract.ts`; recordingRevision via note-origin and summary-source.
- NEW-4 **Module variable named `document`** shadowing the DOM global (`note-audio-deletions.ts:17`, `notes-trash.ts:17`) — trap for later edits.

## Owner questions
1. Is AP-09 Calendar sync served by the agent (`agent-calendar.ts changeSync`)? If yes, delete `native-calendar-sync.ts` and the whole client linked-sync stack, plus Android `AlphaCalendar` sync methods.
2. Remote pairing and paired voice are test-mocks-only: delete `RemoteProtocol`/`paired-voice.ts` (replacing the workflow-host/connection-history harness with the local agent), or keep them as a stubbed-out dev module?
3. Legacy local data: did any shipped `ai.alphacompute.alphaphone` build write `alphaphone:prototype:notes:v1`, `alphaphone:daily:v1`, Cloud credentials without `credentialId`, shared mail snapshots (`gmail:mailbox`/`gmail:home`), or whole-record voice-note links? If not, delete the legacy notes chain, `legacy-app-*`/`note-source` context kinds, `retireSharedMail`, credentialId migrate-on-read, `removeStoredCloudCredential`, and the `recordingRevision` fallback.
4. `phoneContextMessage` envelope: can history recognition of older stored messages (`connection-ui.tsx:1679`) go?
5. App-data backup (`native-recovery-backup.ts`): delete or keep as a dev tool?
6. `notes.organize.v1` is never negotiated: keep the dispatcher dormant on the upstream contract, or delete the organise executor path?
7. Photo-library Alpha-named copy (`scopePresentation`, `reviewText`, `describeLibraryOperation`) has no UI caller: planned UI or delete?
8. `subscription-entitlement.ts` credits branch (`view.kind==='credits'`): still reachable?
9. `ServiceReadCache.clear()` gives up silently after three CAS conflicts: acceptable on sign-out, or must it fail loudly?
