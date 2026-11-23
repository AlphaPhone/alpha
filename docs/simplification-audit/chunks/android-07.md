# Chunk android-07 — androidTest `HostedResultNotice` … `NotesSecureFixture` (36 files)

All paths below are under `android/app/src/androidTest/java/ai/alphacompute/alphaphone/` unless written in full.
Per-file reports: `docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<File>.java.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| HostedResultNoticeInstrumentedTest.java | SIMPLIFY (D5-dependent) | 100 | 80 |
| HostedResultsLifecycleInstrumentedTest.java | DELETE | 23 | 0 |
| ImageCapabilitiesInstrumentedTest.java | KEEP (minor) | 51 | 45 |
| InboxDraftInstrumentedTest.java | SIMPLIFY | 123 | 100 |
| InboxFixtureActivity.java | KEEP | 8 | 8 |
| InboxFixtureConnection.java | KEEP (minor) | 46 | 46 |
| InboxFixtureScope.java | MERGE into InboxFixtureConnection.java | 6 | 0 |
| InboxFixtureSignIn.java | KEEP (+ `signIn` helper) | 32 | 36 |
| InboxOperationJournalInstrumentedTest.java | MERGE into LargeInboxAttachment (-> InboxSecureSlotsInstrumentedTest) | 33 | 0 |
| IsolatedPdfInstrumentedTest.java | KEEP | 45 | 45 |
| JourneyJ05InstrumentedTest.java | KEEP (owner question) | 56 | 45 |
| KeptCaptureLegacyPathInstrumentedTest.java | DELETE (A1/D1) | 101 | 0 |
| LargeInboxAttachmentInstrumentedTest.java | SIMPLIFY (merge target) | 43 | 50 |
| LauncherAppsInstrumentedTest.java | SIMPLIFY | 93 | 45 |
| LauncherHomeInstrumentedTest.java | SIMPLIFY | 273 | 230 |
| LiveAgentInstrumentedTest.java | DELETE (never run) | 128 | 0 |
| LiveVoiceVadInstrumentedTest.java | KEEP | 47 | 47 |
| LocalAgentProviderInstrumentedTest.java | DELETE (+ test-only delegates in main) | 81 | 0 |
| LocalServerSocketReleaseInstrumentedTest.java | DELETE (never run, tests Android) | 29 | 0 |
| LocalSpeechBridgeInstrumentedTest.java | SIMPLIFY | 73 | 55 |
| LocalSpeechInstrumentedTest.java | KEEP (minor) | 81 | 65 |
| LocalVoiceRecordingLimitInstrumentedTest.java | KEEP (minor) | 41 | 36 |
| MailAttachmentInstrumentedTest.java | KEEP | 29 | 29 |
| MapsBackgroundNavigationInstrumentedTest.java | SIMPLIFY | 146 | 115 |
| MapsInstrumentedTest.java | SIMPLIFY | 144 | 105 |
| MapsRegionalInstrumentedTest.java | SIMPLIFY | 154 | 85 |
| NativeVoiceLatencyInstrumentedTest.java | KEEP (owner question on home) | 320 | 310 |
| NoMockProductInstrumentedTest.java | SIMPLIFY | 65 | 35 |
| NoteAudioInstrumentedTest.java | SIMPLIFY | 179 | 135 |
| NoteAudioMetadataEncryptedInstrumentedTest.java | DELETE (A1/D1) | 33 | 0 |
| NoteOriginInstrumentedTest.java | SIMPLIFY | 81 | 55 |
| NoteRecorderInstrumentedTest.java | KEEP | 115 | 110 |
| NoteRecordingSaveInstrumentedTest.java | SIMPLIFY | 50 | 25 |
| NotesCapacityFixture.java | KEEP (delete its host test) | 52 | 52 |
| NotesDocumentInstrumentedTest.java | SIMPLIFY (A3, owner) | 185 | 30 |
| NotesSecureFixture.java | SIMPLIFY | 36 | 28 |
| **Total** | | **3,102** | **~2,050** (plus ~120 lines of new shared helpers) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `call(String)` promise-to-global bridge call | helper | NotesSecureFixture.java:9; HostedResultNoticeInstrumentedTest.java:17; NoteOriginInstrumentedTest.java:31; InboxOperationJournalInstrumentedTest.java:16; LargeInboxAttachmentInstrumentedTest.java:16; LocalSpeechBridgeInstrumentedTest.java:24; NoteAudioInstrumentedTest.java:20; InboxDraftInstrumentedTest.java:52 | ~12 androidTest copies (`Promise.resolve().then(()=>` in 12 files) | `WebViewTestDriver.call` |
| `until(String)` / `waitFor` / `ready` | helper | ImageCapabilities:14; NoMockProduct:15; NotesDocument:15; NoteAudio:25; Maps:28; MapsRegional:15; MapsBackgroundNavigation:25; LauncherHome:51; LocalSpeechBridge:23; InboxDraft:49; LiveAgent:24 | ~13+ copies | `WebViewTestDriver.until(expr, timeout)` |
| `js(String)` with Activity lookup | helper | InboxDraftInstrumentedTest.java:39-48 | `WebViewTestDriver.evaluate(Class,String)` (exists) | delete, use driver |
| SHA-256 hex (`%02x` loop) | helper | InboxDraft:104; InboxOperationJournal:17; LargeInboxAttachment:17; NoteAudioMetadataEncrypted:13; NoteOrigin:51; KeptCaptureLegacyPath:36 (Base64) | 30 androidTest files | `TestDigests.sha256Hex` (androidTest) |
| plugin instance lookup via `ActivityLifecycleMonitorRegistry` + `getBridge().getPlugin(...)` | helper | HostedResultNotice:30; LocalSpeechBridge:29; NoteAudio:27; NoteRecordingSave:24 | 33 androidTest files | `WebViewTestDriver.plugin(Class,String)` |
| React value setter JS (`getOwnPropertyDescriptor(...).set.call`) | helper | InboxDraft:58; NoteAudio:92,102; Maps:30; MapsRegional:19; MapsBackgroundNavigation:35; LauncherHome:120; NotesDocument:30 | 50 androidTest files | `Ui.setValue(selector,text)` |
| `wav()` synthetic 16 kHz WAV | helper | NoteAudio:26; NoteRecordingSave:23 | 7 files | `TestAudio.wav()` |
| note-audio file cleanup loop (`.audio/.json/.json.bak/.pending`) | helper | NoteAudio:40,56,110,128,158,177; NoteRecordingSave:48 | — | `NoteAudioFiles.delete(ctx,id)` |
| `ElizaLocation.watches` reflective count | helper | Maps:73; MapsRegional:66; MapsBackgroundNavigation:49 | 4 files | `MapsTestDriver.watches()` |
| GPS phase file handshake | helper | MapsRegional:59; MapsBackgroundNavigation:38 | 2 files | `MapsTestDriver.phase()` |
| Casino route prelude | helper | MapsRegional:44-47,83-86,136-138; MapsBackgroundNavigation:81-84 | — | `MapsTestDriver.routeToCasino()` |
| `pressHome()` key injection | helper | LauncherHome:67 | `WebViewTestDriver.pressBack` (+11 files inject keys) | `WebViewTestDriver.pressKey(code)` |
| resumed-activity `dumpsys` parser | helper | LauncherHome:41,55; NotesDocument:42-55 | `WebViewTestDriver.cancelDocumentPicker` (12 files) | shared `resumedPackage()` |
| accessibility BFS click | helper | MapsRegional:104; NotesDocument:77 | — | `AccessibilityClick` |
| outgoing `ActivityMonitor` counter | helper | ImageCapabilities:24-26; NotesDocument:104-105 | — | `WebViewTestDriver.countLaunches()` |
| primary/suppressed cleanup block | helper | InboxOperationJournal:30; LargeInboxAttachment:38; NoteOrigin:75; JourneyJ05:47 | more in androidTest | `Cleanup.run(primary, action)` |
| value-returning main-thread call | helper | NoteRecorder:31 (`main(Callable)`) | `AtomicReference`+`BoundedActivityScenario.main` in NoteAudio, NoteRecordingSave, HostedResultNotice | `BoundedActivityScenario.call` |
| `SELECTION = "alpha.connection.selection.v1"` | const | NoMockProduct:14; InboxDraft:38; literals NoteAudio:72-108 | 12 renderer files | androidTest `Keys` |
| `"cloud:production"` | const | InboxFixtureSignIn:24; InboxDraft:75,78,86 | 32x main Java | main-source slot constants (android P6) |
| `"local-agent-provider:v1"` | const | LocalAgentProvider:20 | `LocalAgentProviderAdmission.PROVIDER_SLOT` + 13 main literals | delete with file |
| `"note-origins:v1:device"` | const | NoteOrigin:29 | `AlphaCredentialStore.NOTE_ORIGINS` | use main constant |
| sign-in drive sequence | helper | InboxFixtureSignIn:14-15 used at InboxDraft:95-97 | VoicePermissionDeniedInstrumentedTest:56-74 | `InboxFixtureSignIn.signIn()` |
| `InboxFixtureScope.phase/runId` | const (mutable static) | InboxFixtureScope:4 | — | `InboxFixtureConnection` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `KeptCaptureLegacyPathInstrumentedTest.java` + registry entry `scripts/android-instrumentation.ts:253` + `test/owned-captures-legacy-path.test.mjs` + `.legacyCaptures("Pictures/")` in `AlphaMediaConfig.java:15-16` | Legacy `Pictures/` reservation from an earlier install; package renamed 2026-11-10 with empty data (D1). The host test refers to a nonexistent `patches/eliza/owned-captures-legacy-path.patch`. | High |
| `NoteAudioMetadataEncryptedInstrumentedTest.java` + registry `:245` (+ `AlphaNoteAudioPlugin.migrateLegacyMetadata/migrationStatus/migrationWorker`, `apps/app/src/browser/voice.ts:346`) | Tests plaintext legacy metadata migration (D1). | High |
| `NoteAudioInstrumentedTest.optInRetiredDeletionCannotArriveAfterReloadAndRestore` (L160-178) + `audio-fence` phase in `scripts/ci/pending-recovery-ui.py:24` | "Prior app versions wrote deletedAt without an operation owner" — legacy tombstone (D1). | High (test); Medium (the store branch may be upstream) |
| `LiveAgentInstrumentedTest.java` + `NOT_RUN_BY_A_RUNNER.LiveAgent` + comment `PrototypeFlowInstrumentedTest.java:18` | Never run; no script passes `liveAgent` (grep: only the runner list). | High |
| `LocalServerSocketReleaseInstrumentedTest.java` + `NOT_RUN_BY_A_RUNNER.LocalServerSocketRelease` | Never run; measures Android, not Alpha. | High |
| `HostedResultsLifecycleInstrumentedTest.java` + registry `:269` | Stub `PluginCall`, null bridge, asserts a literal message (T3). | Medium |
| `LocalAgentProviderInstrumentedTest.java` + registry `:270` + `AlphaLocalAgentPlugin` delegates `providerCheckFailure` (:300), 4-arg `saveVerifiedProvider` (:323), `applyProviderEnvironment` (:482), `providerIdentity` (:496-499) | Delegates have no production caller (grep of `android/app/src/main`: declaration only); tests are pure-function checks of upstream `NativeProviderSlot`/`LocalAgentProviderAdmission`. Host tests that slice these names (`test/` 4/3/5 files) go in the same change. | High (delegates); Medium (device coverage of key storage) |
| `MapsInstrumentedTest.explicitRecenterUsesInjectedNativeLocationAndStopsWatch` (L61-80) | Requires `mapsLatitude`/`mapsLongitude`; no script/workflow passes them (grep: 0). | High |
| `MapsRegionalInstrumentedTest.nativeRegionalTransportCapabilitiesAndTile`, `realRegionalTilesSearchRoutesAndOutsideCoverage`, `capture()` (L22-58) | Not selected by `scripts/maps/test-native-navigation.ts` or `test-native-recovery.ts` (both pass `#method`); class not in `CLASS_REGISTRY`, so `--all` never passes `mapsRegional=1`. | Medium (could be run by hand) |
| `LauncherAppsInstrumentedTest.packageOnlyRefusalsUseUpstreamCodes`, `aComponentOrProfileThatIsNotTextIsMalformedNotAbsent` (L69-92) | Pure checks of upstream `SystemLauncherApps` constants/`malformedText` (T5). | High |
| `NoteRecordingSaveInstrumentedTest.transcriptPrefixIsBoundedAndKeepsSurrogatePairs` (L26-30) | Pure static check (T3); bound already proven end to end in the same class. | High |
| `NotesDocumentInstrumentedTest` test-mocks import/export flow + restart phase (L114-183) + `scripts/test-native-restart.ts:56` case + `SelectedDocumentAccess.selections()` | Notes import is refused on product builds; PRD AP-12 "no backup/import/export"; D3. | Medium (owner) |
| `test/notes-capacity-fixture.test.mjs` + `test/fixtures/NotesCapacityFixtureTest.java` | Host JVM test of an androidTest fixture (T5). | High |
| Evidence writes `local-speech-evidence/*.json` in `LocalSpeechInstrumentedTest` and `LocalVoiceRecordingLimitInstrumentedTest` | No consumer (grep `local-speech-evidence`, `recording-limit.json`, `holder-result.json` over scripts/test/.github: 0). | Medium (WAVs may be listened to) |
| `InboxOperationJournalInstrumentedTest.java` (merge) | Same CAS/recreation/cleanup scenario as `LargeInboxAttachmentInstrumentedTest` on the same slot family (T4). | High |
| `NoMockProductInstrumentedTest.legacyMockSelectionRequiresSignIn` (L47-64) | Tests the renderer retiring a stored `{kind:'mock'}` (legacy reader `connection-ui.tsx:1602`); delete only together with that reader. | Medium |

## Cross-file actions
1. **Kept-capture legacy path (D1):** delete `KeptCaptureLegacyPathInstrumentedTest.java`; remove `KeptCaptureLegacyPath` from `CLASS_REGISTRY` (`scripts/android-instrumentation.ts:253`); delete `test/owned-captures-legacy-path.test.mjs`; drop `.legacyCaptures("Pictures/")` and the Javadoc sentence in `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMediaConfig.java`.
2. **Note-audio legacy metadata (D1):** delete `NoteAudioMetadataEncryptedInstrumentedTest.java`, its registry entry (`:245`), `AlphaNoteAudioPlugin.migrateLegacyMetadata`/`migrationStatus`/`migrationWorker` (`AlphaNoteAudioPlugin.java:20-23,49-55,231`), the browser `migrationStatus` (`apps/app/src/browser/voice.ts:346`) and any renderer caller of `AlphaNoteAudio.migrationStatus`; delete `NoteAudioInstrumentedTest.optInRetiredDeletionCannotArriveAfterReloadAndRestore` and the `audio-fence` tuple in `scripts/ci/pending-recovery-ui.py:24` (plus the ownerless-tombstone branch in the note-audio store, upstream or `AlphaNoteAudioPlugin`).
3. **Provider delegates:** delete `LocalAgentProviderInstrumentedTest.java`, registry `LocalAgentProvider` (`:270`), the four test-only statics in `AlphaLocalAgentPlugin.java` (300, 323, 482, 496-499) and the host tests that slice them (`test/legacy-cloud-recovery.test.mjs`, `test/product-character-host.test.mjs` and the other `test/` files naming `saveVerifiedProvider`/`providerIdentity`/`applyProviderEnvironment`), and any `specs/quint/native/manifest.json` symbol pins on them.
4. **Never-run classes:** delete `LiveAgentInstrumentedTest.java`, `LocalServerSocketReleaseInstrumentedTest.java`; remove both keys from `NOT_RUN_BY_A_RUNNER` (`scripts/android-instrumentation.ts:326,333`); edit `PrototypeFlowInstrumentedTest.java:18` comment. `test/android-instrumentation-runner.test.mjs` enforces list/source consistency, so all must land together.
5. **HostedResultsLifecycle:** delete the file and `CLASS_REGISTRY.HostedResultsLifecycle` (`:269`).
6. **Inbox secure-slot merge:** `InboxOperationJournalInstrumentedTest` + `LargeInboxAttachmentInstrumentedTest` -> `InboxSecureSlotsInstrumentedTest`; replace registry entries `InboxOperationJournal` (`:209`) and `LargeInboxAttachment` (`:244`) with one entry and one gate arg.
7. **Inbox fixture:** move `InboxFixtureScope` fields to `InboxFixtureConnection`; add `InboxFixtureSignIn.signIn()`; update `InboxDraftInstrumentedTest`, `InboxFixtureConnection`, `VoicePermissionDeniedInstrumentedTest`.
8. **Shared androidTest helpers** (`WebViewTestDriver.call/until/plugin/pressKey/resumedPackage/countLaunches`, `TestDigests`, `TestAudio`, `NoteAudioFiles`, `Ui`, `Keys`, `Cleanup`, `MapsTestDriver`, `BoundedActivityScenario.call`): touches every file in this chunk plus the copies in other chunks (`VoicePermissionDenied`, `Reminder*`, `Browser*`, `Photos*` …). Coordinate with the other androidTest chunks so the helpers are introduced once.
9. **`NotesSecureFixture.evaluate` rename** (`evaluateWithNotes`): 18 callers in androidTest.
10. **Notes import/export (owner, D3):** delete the test-mocks flow in `NotesDocumentInstrumentedTest`, the `notes-document` case in `scripts/test-native-restart.ts:56` and its fixture in `test/fixtures/isolated-native-campaign.mjs`, the gated branch in `AlphaNoteDocumentsPlugin.importText`, the "Import text note" control in `apps/app/src/prototype/template.html:2460` and `canImportText` plumbing (`canonical-notes-ui.ts:299`, `agent-adapter.ts:2091`), `SelectedDocumentAccess.selections()`. Keep `exportText` (Share -> Save locally) and `exportPdf` (scan).
11. **Legacy mock selection:** if `connection-ui.tsx:1602` (retire stored `{kind:'mock'}` on product builds) is deleted, delete `NoMockProductInstrumentedTest.legacyMockSelectionRequiresSignIn` together.
12. **Maps:** delete the never-run methods in `MapsInstrumentedTest`/`MapsRegionalInstrumentedTest`; update the `Maps` registry note (`:240`) that names the deleted method.
13. **NotesCapacityFixture host test:** delete `test/notes-capacity-fixture.test.mjs` and `test/fixtures/NotesCapacityFixtureTest.java`.
14. **NoteOrigin slot constant:** switching to `AlphaCredentialStore.NOTE_ORIGINS` breaks the regex in `test/android-instrumentation-runner.test.mjs:641`; update or delete that T1 assertion in the same change.

## Text/path pins
- `scripts/android-instrumentation.ts` — `CLASS_REGISTRY` entries for HostedResultNotice(198), ImageCapabilities(176), LauncherHome(183), LauncherApps(188), NotesDocument(189), InboxOperationJournal(209), MailAttachment(210), IsolatedPdf(229), JourneyJ05(238), NoteOrigin(239), Maps(240), LargeInboxAttachment(244), NoteAudioMetadataEncrypted(245), NoteRecorder(247), NoteRecordingSave(248), KeptCaptureLegacyPath(253), LocalSpeech(258), LocalSpeechBridge(259), LiveVoiceVad(262), HostedResultsLifecycle(269), LocalAgentProvider(270), LocalVoiceRecordingLimit(296, campaign), NativeVoiceLatency(299, campaign); `NOT_RUN_BY_A_RUNNER` LocalServerSocketRelease(326), LiveAgent(333); `DEFAULT_CLASSES` NoMockProduct(354).
- `test/android-instrumentation-runner.test.mjs` — registry/source consistency for every class; HostedResultNotice (170-173,217), LocalVoiceRecordingLimit (72,217), LauncherHome (78-81,215,319-388), NoteRecorder/NoteRecordingSave (177-181), JourneyJ05 + Maps gate names (628-643, regex over JourneyJ05 source for public hosts), NoteOrigin (640-641 regex `"note-origins:v1:device"`), NoMockProduct (20-29,66-67).
- `test/ci-emulator-evidence.test.mjs:241-258` — fused speech registry args (LocalSpeech, LocalSpeechBridge, LiveVoiceVad); source regex `"1".equals(...getString("localSpeech"))` in `LocalSpeechInstrumentedTest.java` (245); default-class source check reads `NoMockProductInstrumentedTest.java`.
- `scripts/ci/speech-candidate.ts:32` — `CANONICAL_TEST` = `LocalSpeechInstrumentedTest.java` path. `scripts/ci/emulator-suite.ts:35` — `FUSED_SPEECH_CLASSES`.
- `test/native-voice-latency.test.mjs:148-149` — reads `NativeVoiceLatencyInstrumentedTest.java` and regex-matches line 134 verbatim.
- `test/notes-capacity-fixture.test.mjs:12-13` — javac-compiles `NotesCapacityFixture.java` by path.
- `test/owned-captures-legacy-path.test.mjs:4` — names KeptCaptureLegacyPath (comment).
- `specs/quint/refinement/services/index.mjs:149` — `requires: ['IsolatedPdfInstrumentedTest on a disposable admitted installation']`.
- `scripts/test-native-restart.ts:46,56` — `InboxDraftInstrumentedTest`, `NotesDocumentInstrumentedTest` (+ `test/fixtures/isolated-native-campaign.mjs`).
- `scripts/test-native-permissions.ts:91-107` — `LocalVoiceRecordingLimitInstrumentedTest`, `HostedResultNoticeInstrumentedTest` (gates `localVoiceRecording`, `hostedNotice`, `hostedNoticeDenied`).
- `scripts/maps/test-native-navigation.ts:32`, `scripts/maps/test-native-recovery.ts:40-42` — `MapsRegionalInstrumentedTest#<method>` and `MapsBackgroundNavigationInstrumentedTest#screenOffGuidanceContinuesAndNotificationStopEndsOnce` by method name; phase files `maps-navigation-phase.txt`/`maps-navigation-ack.txt`.
- `scripts/ci/pending-recovery-ui.py:24` — `NoteAudioInstrumentedTest#optInRetiredDeletionCannotArriveAfterReloadAndRestore`.
- `scripts/native-voice-latency-emulator.ts`, `scripts/native-voice-latency.ts` — NativeVoiceLatency status keys.
- `scripts/owner/emulator-campaign-check.ts:40` + `test/owner-emulator-campaign-check.test.mjs:15,45` — LauncherApps, LauncherHome source existence and command.
- Renderer copy pinned by these tests (renames must update them): sign-in screen strings in `InboxFixtureSignIn.DRIVE_*`; Maps status strings in `MapsInstrumentedTest.NOT_CONNECTED`; `'Saved locally on this device'`, `'Document selection cancelled. Nothing imported or exported.'`, `'Saved.'`; storage keys `alpha.connection.selection.v1`, `alpha.maps.saved-places.v1`, slot `notes-records:v1:device` envelope `currentRaw`.

## New patterns
- **NEW-a: stale expectations in rarely-run instrumentation.** `NotesDocumentInstrumentedTest.productRefusal` expects `exportText` to return `unsupported` on flag-off builds, but `AlphaNoteDocumentsPlugin.exportText` is not test-mocks gated (returns `unavailable` or opens a picker). Classes reachable only through `--all` or campaigns drift from the product without anyone noticing; each kept class needs one recorded green run on the current build (verify on emulator before trusting).
- **NEW-b: misleading names of tests after behaviour changed** — `expiredOwnedDeletionCannotRestoreBeforeMigration` (no migration involved), `NotesSecureFixture.evaluate` used as the generic evaluator. Fits D11 for tests.
- **NEW-c: permanently skipped methods inside otherwise-run classes** — gate arguments that no runner passes (`mapsLatitude`, `mapsRegional` for two methods, `liveAgent`). The runner's reachability check works per class, not per method, so dead methods hide in live classes. Extend T9 to "per-method reachability".

## Owner questions
1. D5: are hosted result notices (scope from a hosted agent's origin/owner/agent) a product path or only remote/cloud-agent support? Decides whether `HostedResultNoticeInstrumentedTest.run()` and the two notice campaigns stay.
2. `JourneyJ05InstrumentedTest` skips on every emulator the runner targets (WebView 133 lacks isolated worlds; signed-out flag-off sign-in). Keep as a device-only journey (and name the device runner) or delete?
3. Notes text import is test-mocks only and the PRD excludes import/export: delete the import flow end to end (test, restart phase, plugin branch, template control)? Is "Share -> Save locally" export of a note a product feature (then it needs a flag-off test)?
4. Are the regional (Monaco) Maps tile/route methods still wanted as evidence? If yes, add their `#method` to `scripts/maps/test-native-navigation.ts`; otherwise delete them.
5. `NativeVoiceLatencyInstrumentedTest` uses only upstream voice classes: keep it in Alpha's androidTest or move the harness upstream?
6. Should the reflective drain-ordering check in `LocalSpeechBridgeInstrumentedTest` (private fields of upstream `LocalSpeechBridgePlugin`) move upstream?
7. Do the WAV files written by `LocalSpeechInstrumentedTest` get listened to by a person? If not, drop all evidence writes there and in `LocalVoiceRecordingLimitInstrumentedTest`.
8. Is device-level coverage of provider-key storage needed after `LocalAgentProviderInstrumentedTest` is deleted (browser spec covers the Settings UI)?
9. `NoteRecordingSave` runs in a disposable secondary user; may it merge into `NoteAudio` (which does not)?
