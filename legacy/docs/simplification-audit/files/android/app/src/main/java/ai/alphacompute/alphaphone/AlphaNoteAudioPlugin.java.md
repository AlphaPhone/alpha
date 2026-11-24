# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNoteAudioPlugin.java
- Lines: 284 | Role: Capacitor `AlphaNoteAudio` bridge for saved voice-note recordings (describe/play/stop/state/remove/restore/purge/deletionStatus) over upstream `RecordingStore`, **plus** a startup metadata migration, the native Notes Trash backstop (two sweeps, a WorkManager worker, a byte-exact JSON span parser), and the save path for unlimited Notes recordings. | Verdict: SPLIT + SIMPLIFY
- Importers: `MainActivity.java:350`, `AlphaApplication.java:26` (`scheduleTrashBackstop`), `AlphaVoiceCloudPlugin.java:81,142` (`retain`, `saveNoteRecording`, `recordings(context)`). Renderer: `apps/app/src/prototype/voice-adapter.ts:80-88` (play/stop/state/describe/remove/deletionStatus/restore/purge — **not** `migrationStatus`), web shim `apps/app/src/browser/register.ts:22`. Text/path pins: `test/notes-recorder.test.mjs:325,519` (reads source), `test/notes-deletion-lease.test.mjs:16` (reads source), `test/saved-note-speech-policy.test.mjs:18-32` and `test/reset-startup.test.mjs:48` (stub classes of the same name), `test/plugin-worker-guard.test.mjs:29` (`migrationWorker`), `test/support/feature-parity.mjs`, `specs/quint/refinement/native/{note-bridge-platform.mjs,shared-recording-platform.mjs}`; androidTest `NoteAudioInstrumentedTest`, `NoteRecordingSaveInstrumentedTest` (`transcriptPrefix`), `NotesTrashBackstopInstrumentedTest` (`sweepExpiredTrash`, `finishPermanentDeletions`, `trashEntrySpans`, `pendingMemberSpans`, slot constants).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-23, 47-56, 231, 283 | A1 | `migrateLegacyMetadata()` → `recordings().migrateLegacy(()->destroyed)`, `migrationState`, `migrationFailures`, and `@PluginMethod migrationStatus` (no native caller in the renderer: `voice-adapter.ts` does not declare it; only the browser shim `apps/app/src/browser/voice.ts:346` has a same-named web method). Comment: "must not synchronously decrypt an entire old collection". The package renamed 2026-11-10 has no pre-shared-store metadata. | Owner P5 decision, then delete the migration call, both fields, `migrationStatus`, and simplify `load()` to submit `sweepTrashOnStart` only. Rename `migrationWorker` → `worker` and update `test/plugin-worker-guard.test.mjs:29`. ~10 lines. | Medium: an early new-package pilot install with old-format metadata would keep it unreadable. |
| 2 | 63-229 | D1 | ~165 lines of Notes Trash backstop (constants, `scheduleTrashBackstop`, `NotesTrashBackstopWorker`, `sweepExpiredTrash`, `finishPermanentDeletions`, `trashEntrySpans`, `pendingMemberSpans`, `topLevelSpans`) unrelated to the bridge. | Move to `NotesTrashBackstop.java` (static API unchanged). **Keep the worker's binary name** (`AlphaNoteAudioPlugin$NotesTrashBackstopWorker`) or re-enqueue with `ExistingPeriodicWorkPolicy.UPDATE`: WorkManager persists the class name of enqueued work and `KEEP` would leave the old name. | Medium (WorkManager class-name persistence); androidTest `NotesTrashBackstopInstrumentedTest` imports change. |
| 3 | 107-109, 158-161 | C3 | Same block twice: read `NOTES_SLOT`, unwrap `currentRaw`, build `liveNotes`/`liveAudio` sets. | `private static Live live(JSONObject envelope)` returning both sets. | none |
| 4 | 125-127, 182-184 | C3 | Manual comma joins: `for(...){if(i>0)next.append(',');next.append(kept.get(i));}`. | `TRASH_PREFIX+String.join(",",kept)+TRASH_SUFFIX` and `"{"+String.join(",",kept)+"}"` (byte-identical output). | none |
| 5 | 57-61, 80-86 | C3 | The "two independent passes" are written twice (startup and worker). | One `static boolean runBackstop(Context)` returning whether to retry; both callers use it. | none |
| 6 | 39-44 | C4, P7 | Anonymous `RecordingStore.Slots` adapter over `AlphaCredentialStore` (one of ~12 copies). | `AlphaCredentialStore.asSlots()` once it exists (research P7). | low |
| 7 | 71 | C3 | `OPERATION` UUID regex is byte-identical to `AlphaNoteRecorder.ID` (`AlphaNoteRecorder.java:55`). | Shared `Ids.UUID_LOWER`. | none |
| 8 | 257-280 | B1, P11 | Each method `catch(Exception error){call.reject("<fixed copy>")}`. | Keep copy; shared reject helper that logs the class. | none |
| 9 | 19-20, 29-46 | D8 | `android.content.Context`, `android.os.Handler`, `java.util.concurrent.*`, `androidx.work.*` spelled fully qualified 15+ times. | Imports. | none |
| 10 | 283 | — | `handleOnDestroy` lacks `super.handleOnDestroy()`. | Add. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `recordings(...)` + anonymous `Slots` | helper | 29-46 | P7 slot adapters (`AlphaReminders`, `AlphaTelephony`, `HostedDelivery`, …) | `AlphaCredentialStore.asSlots()` |
| `CLIPS`, `NOTE_RECORDINGS` | const | 36-37 | none | here |
| `NOTES_TRASH_SLOT`, `NOTES_SLOT`, `PENDING_AUDIO_SLOT` | const | 67 | renderer notes slot names (same strings in `apps/app/src/prototype/notes-*`); slot-cap ladder in `AlphaCredentialStore` | `NotesTrashBackstop` (and the P6 `Slots` registry) |
| `OPERATION` | const | 71 | `AlphaNoteRecorder.ID` | `Ids` util |
| `topLevelSpans` / `trashEntrySpans` / `pendingMemberSpans` | helper | 192-229 | none (byte-exact JSON span scanner) | `NotesTrashBackstop` |
| `transcriptPrefix` | helper | 252-256 | none | here |
| `NotesTrashBackstopWorker` | class | 78-87 | `GmailDeliveryWorker`, `HostedDeliveryWorker` scheduling shape | `NotesTrashBackstop` (keep binary name, see finding 2) |

## Proposed end state
`AlphaNoteAudioPlugin` ~95 lines: recording store factory, playback, deletion receipts, `retain`/`retainNoteRecording`/`saveNoteRecording`. `NotesTrashBackstop.java` ~150 lines: constants, worker, two sweeps sharing a `live()` helper and one `runBackstop`, span parser. Migration removed. Combined ~245 lines (−40).

## Verification
`NotesTrashBackstopInstrumentedTest`, `NoteAudioInstrumentedTest`, `NoteRecordingSaveInstrumentedTest`, `test/notes-recorder.test.mjs`, `test/notes-deletion-lease.test.mjs` (source reads; update path), `test/saved-note-speech-policy.test.mjs`/`reset-startup.test.mjs` stubs, Quint `note-bridge-platform.mjs`/`shared-recording-platform.mjs`, Notes Playwright journeys, Android build, and an installed-update check that the periodic backstop still runs after the move.
