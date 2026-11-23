# Chunk android-08 — androidTest Notes*, Notification*, Paired*, Password*, PdfViewer, Photo*/Photos*

27 files, all under `android/app/src/androidTest/java/ai/alphacompute/alphaphone/`. Reports in
`docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<Name>.java.md`.
Line estimates keep today's density (no formatter run counted). Totals: 2,954 → ~1,670 lines (≈1,280 removable, of
which ~1,000 depend on owner decisions: paired agents (P15), legacy Notes migration (A1), upstream-owned photo engine tests).

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| NotesSecureStorageInstrumentedTest.java | SIMPLIFY (delete dormant migration test now; restart migration test with A1) | 132 | 45 |
| NotesStorageDurabilityInstrumentedTest.java | SIMPLIFY (lowered-Trash-cap test goes with `retainedLimit`, A1) | 172 | 125 |
| NotesTrashBackstopInstrumentedTest.java | KEEP (merge two pairs of fixture writers) | 295 | 280 |
| NotificationAccessTestDriver.java | KEEP (generic helpers out) | 57 | 35 |
| NotificationChannelsInstrumentedTest.java | SIMPLIFY | 68 | 50 |
| NotificationsInstrumentedTest.java | SIMPLIFY | 137 | 110 |
| PairedAsrInstrumentedTest.java | DELETE with P15 (else merge with PairedVoice) | 59 | 0 |
| PairedAsrLiveInstrumentedTest.java | DELETE with P15 (else merge with PairedVoiceLive) | 67 | 0 |
| PairedMapsInstrumentedTest.java | DELETE (never run) | 97 | 0 |
| PairedReminderInstrumentedTest.java | DELETE (never run) | 84 | 0 |
| PairedVoiceInstrumentedTest.java | DELETE with P15 (else merge) | 70 | 0 |
| PairedVoiceLiveInstrumentedTest.java | DELETE with P15 (else merge) | 66 | 0 |
| PasswordBrowserFillInstrumentedTest.java | KEEP (helpers out; stop instantiating BrowserFlowInstrumentedTest) | 291 | 240 |
| PasswordFillFixtureActivity.java | KEEP | 51 | 45 |
| PasswordVaultFillInstrumentedTest.java | KEEP (text-pinned) | 134 | 130 |
| PasswordVaultFixture.java | KEEP (unused import; text-pinned) | 101 | 95 |
| PasswordVaultSettingsInstrumentedTest.java | KEEP (reference helper set; text-pinned) | 147 | 120 |
| PdfViewerInstrumentedTest.java | KEEP (drop recycle ceremony) | 54 | 35 |
| PhotoEditInstrumentedTest.java | SIMPLIFY (dormant granted-library test) | 80 | 50 |
| PhotoFilterInstrumentedTest.java | KEEP / owner: move upstream | 43 | 35 |
| PhotoLibraryInstrumentedTest.java | KEEP | 139 | 115 |
| PhotoReplaceInstrumentedTest.java | MOVE to upstream media plugin tests (owner) | 319 | 0 |
| PhotosBatchInstrumentedTest.java | SIMPLIFY (5 unused imports) | 68 | 55 |
| PhotosCatalogOrderInstrumentedTest.java | KEEP / owner: move upstream (text-pinned) | 70 | 60 |
| PhotosFixtureRecoveryInstrumentedTest.java | DELETE (operator tool, never run) | 33 | 0 |
| PhotosForeignLibraryInstrumentedTest.java | owner: wire a campaign or DELETE (never receives its args) | 69 | 0 (60 if wired) |
| PhotosLibraryInstrumentedTest.java | KEEP / owner: move upstream | 51 | 45 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `js` / `eval` / `host` | helper | NotesSecureStorage:15, NotesStorageDurability:71, PhotoEdit:17, PhotosBatch:24, PhotoLibrary:26, PhotosForeignLibrary:18, PasswordVaultSettings:31, PasswordBrowserFill:44 | 62 androidTest files (research P20) | call `WebViewTestDriver.evaluate` |
| `until(expr)` polling | helper | NotesSecureStorage:16, NotesStorageDurability:72, Notifications:25, NotificationChannels:15, PairedAsrLive:21, PairedVoiceLive:21, PairedMaps:21, PairedReminder:21, PasswordVaultSettings:32-36, PasswordBrowserFill:45, PhotoEdit:18, PhotosBatch:25, PhotoLibrary:27 | ~60 files | `WebViewTestDriver.until` |
| `click(label)` / `press` / `control` | helper | NotesSecureStorage:17, NotesStorageDurability:74, NotificationChannels:16, PairedAsrLive:22, PairedVoiceLive:22, PairedMaps:22, PairedReminder:22, PasswordVaultSettings:38-41, PasswordBrowserFill:46-49, PhotoEdit:19, PhotosBatch:26 | many | `WebViewTestDriver.click` (PasswordVaultSettings' `control` is the most complete) |
| `input` / `type` / `setValue` (native setter + input event) | helper | NotesSecureStorage:25, NotesStorageDurability:75, PairedMaps:40-44, PasswordVaultSettings:45-48, PasswordBrowserFill:50-56, PairedAsrLive:51, PairedVoiceLive:50 | more | `WebViewTestDriver.setValue` |
| bridge await (`call`/`nativeCall`/`bridge`) | helper | NotificationAccessTestDriver:18-23, Notifications:96-100, PairedAsr:21-24, PairedVoice:21-24, PhotoEdit:20, PhotoLibrary:28-32, PhotosBatch:31-34, PhotosForeignLibrary:19-28 | `NotesSecureFixture.call` | `WebViewTestDriver.call` (named `call` in the WebViewTestDriver report) |
| SHA-256 hex | helper | NotesSecureStorage:26, PairedMaps:27, PairedReminder:27, PasswordFillFixtureActivity:23-29, PhotoFilter:32 (inline) | `PhotosTestFixture.hash`, ~25 more androidTest files | `TestDigests.sha256Hex` (androidTest) |
| `canonical(Object)` JSON canonicaliser | helper | PairedMaps:18, PairedReminder:19 | each other | delete with both files |
| `activity()/voice()/store()/field()` resumed-plugin + reflection | helper | PairedAsrLive:23-26, PairedVoiceLive:23-26, PairedMaps:23-26, PairedReminder:23-26 | each other | delete (P15) or `ResumedPlugins` |
| recording injection by reflection into upstream `LocalSpeechBridgePlugin.capture` | helper (inline) | PairedAsr:48, PairedAsrLive:47, PairedVoiceLive:47 | each other | delete (P15) or upstream test hook |
| Loopback HTTP `Fixture` | class | PairedAsr:25-37, PairedVoice:26-38 | each other | delete (P15) or `LoopbackHttpFixture` |
| "Local development agent" connect routine | helper (inline) | PairedAsrLive:40-41, PairedVoiceLive:40-41, PairedMaps:66-67, PairedReminder:48-49 | AllViewAgentContext, CombinedAgent(+Restart), DeviceAction, RemoteAgent, BrowserReadingLive | delete with never-run/paired classes |
| WAV header builder | helper | PairedVoice:25, PairedVoiceLive:33 | each other | `TestAudio.wav` or delete |
| Synthetic notice (receiver + PendingIntent + SDK-33 register) | helper (inline) | Notifications:43-46, 77-82; NotificationChannels:48-50 | each other | `SyntheticNotice` |
| Settings Switch BFS + clickable ancestor | helper | NotificationAccessTestDriver:36-54, NotificationChannels:19-39 | each other | `SettingsSwitch.set` |
| Accessibility tree search | helper | PasswordBrowserFill:69-84, PdfViewer:16-26 | NotificationAccessTestDriver:42-43, NotificationChannels:22-23 | `A11yTree.find` |
| `shell(cmd)` | helper | PasswordVaultFixture:32-36, PasswordBrowserFill:62-68 | AccessibilityViews, Accessibility, AppInfo | `DeviceShell.run` |
| `Match`, `DocumentPoint` | interface | PasswordBrowserFill:75, 92 | JDK `Predicate` / `Callable` | JDK types |
| Owned MediaStore image insert | helper | PhotoEdit:26-27,62-63; PhotoFilter:31-32; PhotoReplace:44-54; PhotoLibrary:33-51; PhotosCatalogOrder:33-40; PhotosLibrary:25-31 | `PhotosTestFixture.fixture` | `PhotosTestFixture.insert` |
| MediaStore revision string `date_added:_size:generation_modified:is_trashed` | helper | PhotoFilter:18, PhotoReplace:216-224 | each other | `PhotosTestFixture.revision` |
| bounded stream read `bytes()` | helper | PhotoEdit:21, PhotoFilter:17, PhotoReplace:246-256 | `PhotosTestFixture.bytes` | `PhotosTestFixture.bytes` |
| `"alpha-photo-edit-results"` | const (literal) | PhotoEdit:39,52,78; PhotoFilter:41; PhotoReplace:63,106,182 | `AlphaMediaConfig.java:8` comment | constant from production |
| `"alpha-owned-media-versions"` | const (literal) | PhotosBatch:65, PhotosFixtureRecovery:31 | PhotosTrash:65,82 | constant from production |
| `"note-audio-metadata:v1:"` | const (literal ×11) | NotesTrashBackstop:26… | `AlphaNoteAudioPlugin` | `AlphaNoteAudioPlugin.metadataSlot(id)` |
| `FILL_OFFER` / `OFFER` | const | PasswordVaultFill:42, PasswordBrowserFill:38 | each other | shared `PasswordUi` constants |
| Autofill service component string | const | PasswordVaultFill:40, PasswordBrowserFill:196 | each other | shared constant |
| secure CAS JSON (`secureCompareExchange`) | helper | NotesSecureStorage:59,67-69,102,125-127; NotesStorageDurability:78-81 | `NotesSecureFixture.replaceRecords` | `NotesSecureFixture.compareExchange` |
| `notes()` / `savedNotes()`; `recording()` / `liveRecording()` | helper | NotesTrashBackstop:48-53/159-164; 37-42/167-170 | each other (same file) | merge |
| test class used as helper (`new BrowserFlowInstrumentedTest()`) | pattern | PasswordBrowserFill:39 | 10 more androidTest classes | `BrowserChildDriver` utility |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `PairedMapsInstrumentedTest.java` (97) + `NOT_RUN_BY_A_RUNNER.PairedMaps` | Listed as unrunnable at `scripts/android-instrumentation.ts:334`; its input `paired-maps-fixture.json` is written by nothing (grep: only this file); paired agents contradict `docs/prd.md:11,17` | high |
| `PairedReminderInstrumentedTest.java` (84) + `NOT_RUN_BY_A_RUNNER.PairedReminder` | `scripts/android-instrumentation.ts:335`; `paired-reminder-fixture.json` written by nothing | high |
| `PhotosFixtureRecoveryInstrumentedTest.java` (33) + `NOT_RUN_BY_A_RUNNER.PhotosFixtureRecovery` | Operator tool, "never part of a campaign" (`:336`); no script passes `alphaPhotoRecovery*` | high |
| `NotesSecureStorageInstrumentedTest.freshInstallLegacyMigrationRetainsExactArchiveAndAudio` (l.47-75) | Gate `notesSecureMigration` passed by nothing (grep: 0 hits outside the file); duplicate of the restart campaign | high |
| `PhotoEditInstrumentedTest.grantedLibrarySaveOpensTheCopyAndConfirms` (l.54-79) | Gate `photoLibraryGrantTest` passed by nothing (grep: only this file) | high (or register it) |
| Unused imports: `PhotosBatchInstrumentedTest` l.3,6,10,11,18; `PasswordVaultFixture` l.11 | single occurrence each | high |
| Unused helpers `voice()`, `field()` in PairedMaps:25-26 / PairedReminder:25-26; unused `requestId` PairedAsr:31 | 1 occurrence (declaration) | high |
| `PairedAsr`, `PairedVoice`, `PairedAsrLive`, `PairedVoiceLive` (262 lines) + `scripts/android-paired-speech-live.ts` + registry/campaign entries | Paired-agent speech; PRD forbids pairing; Live classes run only by a manual script not in CI | medium (owner P15) |
| `NotesSecureStorageInstrumentedTest.secureMigrationProcessRestartPhase` (l.77-131) + `notes-secure-migration` campaign | Legacy localStorage Notes layout (`LEGACY_NOTES_KEY` in `apps/app/src/runtime/notes-store.ts:3`); A1 | medium (owner A1) |
| `NotesStorageDurabilityInstrumentedTest.loweredTrashCapKeepsOlderOversizeTrashReadableAndShrinkable` (l.39-69) | Only exists for `AlphaCredentialStore.retainedLimit` (legacy 32 MiB data); A1 | medium (owner A1) |
| `PhotosForeignLibraryInstrumentedTest.java` (69) | Registry passes `args: {}`; required `photosForeign*` args passed by nothing → always skipped | medium (owner) |
| `PhotoReplaceInstrumentedTest.java` (319) | Pure upstream `OwnedPhotoEdits` engine coverage via an injected `ReplaceOutput`; belongs upstream | medium (owner, needs upstream PR) |

## Cross-file actions
1. **Paired-agent removal (P15)** — delete `PairedAsr`, `PairedVoice`, `PairedAsrLive`, `PairedVoiceLive` (+ `PairedMaps`, `PairedReminder` regardless); remove `PairedAsr`/`PairedVoice` from `CLASS_REGISTRY` (`scripts/android-instrumentation.ts:226-227`), `PairedMaps`/`PairedReminder` from `NOT_RUN_BY_A_RUNNER` (`:334-335`), `scripts/android-paired-speech-live.ts` and its `CAMPAIGN_RUNNERS` entry (`:313`); production: `AlphaVoiceCloudPlugin` paired methods, `PairedAgentCredential.java`, `PairedSpeechContract.java`, `apps/app/src/runtime/paired-voice.ts`; asset `paired-whisper-fixture.m4a` stays only if `CombinedAgent*` remain (they are never-run too). Keep `test/android-instrumentation-runner.test.mjs` reachability test green.
2. **Never-run deletions** — each deleted class must lose its `NOT_RUN_BY_A_RUNNER` entry in the same commit (the runner test asserts listed names exist).
3. **Legacy Notes migration (A1)** — `NotesSecureStorageInstrumentedTest` l.33, 47-131; `scripts/test-native-restart.ts:72-80`; `test/android-instrumentation-runner.test.mjs:611` row; `test/native-restart-runner.test.mjs:10,45`; `test/fixtures/isolated-native-campaign.mjs:12,18`; renderer `apps/app/src/runtime/notes-store.ts` `LEGACY_NOTES_KEY` reader and archive v1/v2 logic.
4. **`retainedLimit` (A1)** — `NotesStorageDurabilityInstrumentedTest` l.39-69; `AlphaCredentialStore.java:43,59-70`; `specs/quint/refinement/native/CredentialCoordinatorTraces.java:197`; `specs/quint/refinement/services/ServiceCredentialTraces.java:27`.
5. **Shared WebView helpers** — add `until`, `click`, `setValue`, `call` to `WebViewTestDriver.java` (matches that file's report), then replace the private copies listed above across this chunk and ~55 other androidTest files. Keep the exact gate expressions `"1".equals(InstrumentationRegistry.getArguments().getString("<gate>"))` in each gated class (runner test).
6. **Photos fixture consolidation** — `PhotosTestFixture.java` gains `insert`, `revision`, `includeTrashed`; used by PhotoEdit, PhotoFilter, PhotoReplace, PhotoLibrary, PhotosBatch, PhotosCatalogOrder, PhotosLibrary, PhotosTrash, PhotosMultiShare.
7. **Production-owned names** — expose `alpha-photo-edit-results` / `alpha-owned-media-versions` from `AlphaMediaConfig`/`AlphaPhotosPlugin`, and `note-audio-metadata:v1:` from `AlphaNoteAudioPlugin`; update PhotoEdit, PhotoFilter, PhotoReplace, PhotosBatch, PhotosTrash, NotesTrashBackstop.
8. **Upstream moves** — PhotoReplace, PhotoFilter, PhotosCatalogOrder, PhotosLibrary test upstream engines (`OwnedPhotoEdits`, `PermittedMediaCatalog`): upstream PR in `vendor/eliza` media plugin tests, pin advance, then delete here and drop `CLASS_REGISTRY` entries (`:254-256, 272-274`) and the PhotosCatalogOrder text assertion (`test/android-instrumentation-runner.test.mjs:177-184`).
9. **Browser child helper** — extract `child`/`diagnostics` from `BrowserFlowInstrumentedTest` into a utility; update PasswordBrowserFill and the 10 other classes that instantiate it.

## Text/path pins
- `scripts/android-instrumentation.ts` `CLASS_REGISTRY` entries: NotesTrashBackstop:185, NotesStorageDurability:190 (`notesStorage`), PasswordBrowserFill:208, Notifications:214, PairedAsr:226, PairedVoice:227, PasswordVaultSettings:235 (`passwordVault`), PasswordVaultFill:236 (`passwordVaultFill`), NotesSecureStorage:250 (`notesSecureStorage`), PdfViewer:251 (`isolatedPdfNative`), PhotosBatch:252 (`photosBatch`), PhotoLibrary:254 (`photoLibrary`), PhotosForeignLibrary:255, PhotosLibrary:256 (`photosLibrary`), PhotoEdit:271, PhotosCatalogOrder:272, PhotoReplace:273, PhotoFilter:274, NotificationChannels:293 (campaign); `NOT_RUN_BY_A_RUNNER` PairedMaps:334, PairedReminder:335, PhotosFixtureRecovery:336; `CAMPAIGN_RUNNERS` includes `scripts/android-paired-speech-live.ts` (:313).
- `test/android-instrumentation-runner.test.mjs`: `:143-160` every registered class must contain its gate text and (requiresTestMocksBuild) `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS`; `:177-184` reads `PhotosCatalogOrderInstrumentedTest.java` by path and regex-matches l.44; `:186-216` reachability (every @Test class registered/campaigned/listed; listed names must exist); `:551,569-587` PasswordVaultSettings/Fill/Fixture text regexes (exactly 3 `confirmDeviceCredential();` lines, `type("Add website", website)`, 2× `.example.invalid", (typedSecret|null))`, fixture `set = true;…catch (Throwable failed) { close(); throw failed; }`, `systemui:id/lockPassword`, `isFocused()…field.setText(PIN)`); `:611` NotesSecureStorage restart phases; `:647-655` forbidden labels in every registered class.
- `test/gesture-zones-single-instance.test.mjs:34-39` scans every androidTest `.java` for `['pointerdown',50]`.
- Campaign scripts: `scripts/test-native-restart.ts:72-80` (NotesSecureStorage), `scripts/test-native-permissions.ts:61` (NotificationChannels), `scripts/android-paired-speech-live.ts:23,28` (PairedAsrLive/PairedVoiceLive), `scripts/owner/emulator-campaign-check.ts:45,47,57` (PasswordBrowserFill, PhotoEdit, PhotoFilter, PhotosBatch); `test/native-restart-runner.test.mjs:10,45`; `test/fixtures/isolated-native-campaign.mjs:12,18`.
- `android/app/src/androidTest/AndroidManifest.xml:18-20` declares `PasswordFillFixtureActivity`.
- Comment-only mentions: `test/browser/notes-trash-full.spec.ts:4`, `test/browser/notes-permanent-delete-backstop.spec.ts:9`, `test/fixtures/secure-store-memory/MemoryTest.java:64`, `test/photo-library.test.mjs:3`, `test/support/login-surfaces.mjs:40`.
- No `specs/quint/**/manifest.json`, `test/support/feature-parity.mjs` or `LemmaScript-files.txt` reference to these files (grep: 0).

## New patterns
- **NEW — gate nobody passes.** Test methods gated on an instrumentation argument that no runner, campaign or script supplies (`notesSecureMigration`, `photoLibraryGrantTest`, `photosForeign*`) are permanently skipped yet look registered. The registry/runner test only checks that registered `args` are read, not that every `getArguments().getString(...)` gate is supplied by something. Treatment: delete or wire; extend the runner check to fail on unsupplied gates. (Closest: T9 "env knobs nothing sets".)
- **NEW — test class used as a helper library.** `new BrowserFlowInstrumentedTest()` in 11 classes to reuse instance helpers; couples tests to another test's lifecycle. Treatment: plain utility class.
- **NEW (minor) — deprecated no-op ceremony.** `AccessibilityNodeInfo.obtain/recycle` (no-ops since API 33) in PdfViewer. Treatment: delete.
- **Upstream-engine tests in the product repo** (PhotoReplace, PhotoFilter, PhotosCatalogOrder, PhotosLibrary) — covered by research android P20 / T5 but worth a catalogue line: "Alpha supplies only a config; the subject is upstream".

## Owner questions
1. Paired agents (P15): delete `PairedAsr`, `PairedVoice`, `PairedAsrLive`, `PairedVoiceLive`, the live campaign script and the native/renderer paired speech stack, or keep them as a test-mocks developer surface?
2. Legacy Notes localStorage migration and `AlphaCredentialStore.retainedLimit` (A1): may the migration restart test and the lowered-Trash-cap test go with their production readers?
3. `PhotosForeignLibraryInstrumentedTest`: build the host campaign that supplies `photosForeign*` arguments (only check of partial/denied foreign scope), or delete it with `MediaFixtureActivity`'s foreign-media mode?
4. Move `PhotoReplace`, `PhotoFilter`, `PhotosCatalogOrder`, `PhotosLibrary` (upstream `OwnedPhotoEdits` / `PermittedMediaCatalog` engine tests) to upstream `vendor/eliza` and delete them here?
5. `PasswordBrowserFillInstrumentedTest` loads `https://example.com` / `https://example.org` (live network) in a class with no network note; serve from a loopback fixture or document the network requirement?
6. Keep `PhotoEditInstrumentedTest.grantedLibrarySaveOpensTheCopyAndConfirms` by registering a granted-library run, or delete it?
