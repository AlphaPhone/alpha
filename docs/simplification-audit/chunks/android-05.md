# Chunk android-05 — Browser*/Calendar*/Camera* instrumentation (25 files, 3,022 lines)

Reports: `docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<File>.java.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| BrowserReadingFixture.java | SIMPLIFY | 120 | 85 (≈55 if paired speech removed) |
| BrowserReadingInstrumentedTest.java | SIMPLIFY | 93 | 80 (≈50 with P15) |
| BrowserReadingLiveInstrumentedTest.java | DELETE if pairing out (owner), else SIMPLIFY | 60 | 0 / 45 |
| BrowserReadingNavigationInstrumentedTest.java | SIMPLIFY | 159 | 135 |
| BrowserSensitiveReadingInstrumentedTest.java | SIMPLIFY | 108 | 85 |
| BrowserShareInstrumentedTest.java | SIMPLIFY | 48 | 40 |
| BrowserSigninsInstrumentedTest.java | SIMPLIFY | 285 | 220 |
| BrowserStorageFormatInstrumentedTest.java | KEEP | 75 | 75 |
| BrowserUnsupportedReadingInstrumentedTest.java | DELETE | 33 | 0 |
| BrowserWebFeaturesInstrumentedTest.java | SIMPLIFY | 319 | 250 |
| CalendarAgentCrudInstrumentedTest.java | SIMPLIFY | 123 | 95 |
| CalendarAvailabilityInstrumentedTest.java | SIMPLIFY | 167 | 140 |
| CalendarCreationRecoveryInstrumentedTest.java | SIMPLIFY | 72 | 60 |
| CalendarCrudInstrumentedTest.java | SIMPLIFY | 90 | 75 |
| CalendarDeletionRestartInstrumentedTest.java | KEEP (minor) | 81 | 70 |
| CalendarDeletionReviewInstrumentedTest.java | SIMPLIFY | 82 | 65 |
| CalendarExternalEditorInstrumentedTest.java | SIMPLIFY | 212 | 185 |
| CalendarFlowInstrumentedTest.java | SIMPLIFY | 241 | 175 |
| CalendarRangeInstrumentedTest.java | SIMPLIFY | 52 | 40 |
| CalendarSyncProviderInstrumentedTest.java | DELETE if linked-sync stack removed (owner), else KEEP | 75 | 0 / 65 |
| CalendarTruncationInstrumentedTest.java | SIMPLIFY | 53 | 45 |
| CalendarUiTestDriver.java | KEEP (becomes the Calendar UI driver) | 38 | 70 |
| CalendarUpgradeInstrumentedTest.java | DELETE | 103 | 0 |
| CameraFlowInstrumentedTest.java | SIMPLIFY | 169 | 140 |
| CameraLatencyInstrumentedTest.java | KEEP (minor) | 164 | 155 |
| **Total** | | **3,022** | **≈2,285** (−≈740 before ≈150 lines of new shared drivers) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `child(js)` / `diagnostics()` (via `new BrowserFlowInstrumentedTest()`) | helper on a test class | BrowserReadingFixture:25, BrowserShare:14, BrowserSignins:31, BrowserWebFeatures:40, BrowserReadingLive:18 | 11 androidTest files instantiate the test class | `BrowserTestDriver` (move out of `BrowserFlowInstrumentedTest`) |
| `address(url)` | helper | BrowserSignins:37, BrowserWebFeatures:55, BrowserShare:19, BrowserReadingFixture:57-59, BrowserReadingLive:42 | + BrowserFlow, BrowserDownload, BrowserContinuity, PasswordBrowserFill (7 defs) | `BrowserTestDriver.address` |
| `host/ready/button/click/app` | helpers | BrowserSignins:32-36, BrowserWebFeatures:50-54, BrowserShare:15-18 | BrowserSignins ≡ BrowserWebFeatures line for line | `BrowserTestDriver` |
| `collect` + `tap(selector)` | helpers | BrowserSignins:49-59, BrowserWebFeatures:111-120 | BrowserFlow, PasswordBrowserFill, BrowserPageQuestion, CalendarExternalEditor (`tap` name) | `BrowserTestDriver.tapChild` (+ shared `TouchInjector` with CalendarUiTestDriver:27-35) |
| `resumedActivity()` | helper | BrowserReadingFixture:29, BrowserReadingLive:20 | BrowserPageQuestion; BrowserReadingNavigation:56,126 inline | `BrowserTestDriver.resumedMain` |
| reading dialog reflection (`BrowserTabHostPlugin.reading` → `BrowserReviewedReading.dialog`) | helper | BrowserReadingFixture:39, BrowserReadingLive:26, BrowserSensitiveReading:76, BrowserReadingNavigation:93 | BrowserPageQuestion | `BrowserTestDriver.readingDialog` |
| `BrowserTabHostPlugin.tabs` reflection | helper | BrowserSigninsInstrumentedTest:76,211, BrowserSensitiveReading:41 | BrowserCookiePolicy, BrowserContinuity, BrowserPageQuestion | `BrowserTestDriver.tabs()` |
| `field(owner,name)` | helper | BrowserWebFeatures:95, BrowserReadingNavigation:20, CalendarUpgrade:39 | 3 | `TestReflection.field` |
| `waitFor/until/ready` polls | helper | every file in chunk | ~13+ private copies repo-wide | `WebViewTestDriver.until(cond, ms)`; Calendar ones → `CalendarUiTestDriver.until` |
| value-setter JS snippet `Object.getOwnPropertyDescriptor(HTML*Element.prototype,'value').set.call` | JS snippet | BrowserReadingFixture:57, CalendarCrud:40,50, CalendarFlow:50,60,154, CameraFlow:49,102, BrowserShare:19 … | 27 androidTest files | `WebViewTestDriver.setValue(selector,value)` |
| accessibility BFS / click / wait | helpers | BrowserWebFeatures:65-90, CalendarAgentCrud:22,42-49, CalendarCrud:71-72, CalendarDeletionReview:24-45, CalendarExternalEditor:32-33,63-64,120-125, CameraFlow:117-128 | BrowserDownload `nativeNode`; other chunks call the same target `AccessibilityTestDriver` | one `NativeUiDriver` (= `AccessibilityTestDriver`; pick one name) |
| foreground-focus wait | helper | CalendarAgentCrud:27-36, CalendarDeletionReview:21, CalendarUiTestDriver:24-26 | 3 | `CalendarUiTestDriver.awaitFocus` |
| promise→`window.__x` invoke/result | helper | CalendarAgentCrud:37,58,83,85,113; CalendarDeletionReview:22-23; BrowserReading.settle:37; BrowserReadingFixture.invoke:34 | 4 files | `WebViewTestDriver.invoke(plugin,method,args)` |
| owned local calendar (sync-adapter URI insert + exact cleanup) | fixture | CalendarAvailability:60-71, CalendarCreationRecovery:36-38, CalendarCrud:79-80, CalendarDeletionRestart:32,44-46, CalendarDeletionReview:52-54, CalendarExternalEditor:179-180,204, CalendarFlow:75-102, CalendarRange:42-43, CalendarSyncProvider:29-52, CalendarTruncation:27-28, CalendarUpgrade:78-79 | 15 files use `CALLER_IS_SYNCADAPTER` (incl. Maps, HomeCalendarCard, ScopedCalendarDeletion, WorkflowPhoneNative) | `CalendarProviderFixture` (androidTest) |
| `present/exists(id)` | helper | CalendarAgentCrud:51, CalendarDeletionReview:46, CalendarDeletionRestart:27 | 3 | `CalendarProviderFixture.present` |
| `ids(title)` | helper | CalendarCrud:25, CalendarFlow:36 | 2 | `CalendarProviderFixture.ids` |
| calendar permission grant/require loop | helper | CalendarAgentCrud:54,76, CalendarCrud:32,76, CalendarFlow:42,84, … | 12 files | `CalendarProviderFixture.grantCalendar/requireCalendar` |
| "open Calendar" sequence | helper | CalendarFlow ×8, CalendarCrud ×3, CalendarAgentCrud:57, CalendarRange:47, CalendarTruncation:45, CalendarExternalEditor:185, CalendarDeletionReview:61 | 6 files | `CalendarUiTestDriver.open()` |
| `chooseDate/date` | helper | CalendarFlow:103-110, CalendarRange:24-35 | 2 | `CalendarUiTestDriver.chooseDate` |
| identity literals `"Alpha Phone"`, `"alpha-phone-local"`, `"alpha-calendar-creations-v1"`, `"alphaphone://calendar-creation/"`, `2000` | const | CalendarCrud:79-80, CalendarFlow:83, CalendarCreationRecovery:33,48, CalendarUpgrade:28-30, CalendarTruncation:33,42 | `AlphaCalendarPlugin.CONFIGURATION` (main :32-33) | read from `CONFIGURATION` |
| `previewView/preview` | helper | CameraFlow:59-62, CameraLatency:56-60 | 2 | `CameraTestViews.previewView` |
| `ownedImages` (MediaStore by owner package) | helper | CameraFlow:66-71, CameraLatency:101-105 | 2 (+ Photos tests) | `PhotosTestFixture` |
| dumpsys top-resumed | helper | BrowserShare:20-21, CameraFlow:129-130 | 2 | `DeviceShell.topResumed` |
| SHA-256→hex loop | helper | BrowserReadingLive:34, CalendarExternalEditor:173 | ~10 Java copies (research C3) | one `sha256Hex` util |
| `attemptCleanup` | helper | BrowserReadingFixture:99-102 | hand-rolled in BrowserShare:38-44, BrowserReadingLive:53-56, Calendar finally blocks | `BrowserTestDriver`/`TestCleanup` |
| `'alpha.connection.selection.v1'` | const | BrowserReadingLive:34,37,55 | 12 renderer files | `AppNavigation` constant |
| `"alpha-browser-downloads"`/`"owned"` | const | BrowserWebFeatures:109,168 | BrowserDownload; main only in a comment (`AlphaBrowserStores.java:31`) | `AlphaBrowserStores.DOWNLOAD_PREFERENCES` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `CalendarUpgradeInstrumentedTest.java` (103) + calendar branch of `scripts/test-installed-upgrade.ts` | `seed()` needs `ai.alphacompute.alphaphone.CalendarEventGuard` (line 48,74) — no such file in `android/app/src/main`; `absent(NEW+"CalendarCreationStore")` fails because the upstream class ships; only a pre-extraction baseline APK could seed. A1: renamed package has no installed data. Manual runner only. | High |
| `BrowserUnsupportedReadingInstrumentedTest.java` (33) + registry entry (`scripts/android-instrumentation.ts:243`) + `test/ci-emulator-evidence.test.mjs:234` | Same claim as `BrowserReadingNavigation.providerWithoutIsolatedWorld…` which runs in CI (`READING_CLASSES`); this one is in no CI lane. | High |
| `CalendarFlowInstrumentedTest.calendarFormPersistsOneRealEventAcrossRecreation` (lines 40-73) | Verbatim copy of `CalendarCrudInstrumentedTest:33-60`; both run in `scripts/test-calendar-regression.ts`. | High |
| Trailing `cancelThenApproveOnce` in `BrowserSensitiveReading:103-104` and `BrowserIsolatedReading:32` | Same call is the whole of `BrowserReadingInstrumentedTest.explicitImmutable…`, all three in `ci-reading-test-mocks`. | High |
| `CalendarExternalEditor` receipt `external-calendar-result.json` (208-210) + runner reader (`scripts/test-calendar-regression.ts:110-114`) | Fields are constants written only after all assertions passed (B5). | High |
| `CalendarDeletionRestart:79` `addResults(calendarRestart*)` | `git grep calendarRestartRun`: only this line. | Medium-high |
| `BrowserSignins.externalLinkIntentsAreImplicitBrowsableAndNeverTargetAlpha` (79-105) | Pure static test of upstream `BrowserExternalHandoff`; upstream has `test/native-host/BrowserPageHandoffsTest.java`. Move upstream. | Medium |
| `CalendarAvailability.timeZoneMatchesByRulesNotSpelling` (160-166) with `CalendarZones.java` inlined | Unit test of a 1-method class (runner count `4` must become `3`). | Medium |
| `CameraFlow.cameraDeniedForeverRecoversThroughAndroidSettings` (131-150) | No runner selects it (grep: 1 hit). Prefer wiring a case; else delete. | Medium |
| `CalendarAgentCrud.insertHandoffIsInterceptedWithPrefilledFields` (105-122) | No runner selects it. Prefer wiring a case (renderer still calls `insertHandoff`); else delete. | Medium |
| `BrowserReadingLiveInstrumentedTest.java` + `scripts/android-browser-reading-live.ts` | Pairs a "Local development agent" (`remote:` slot); PRD line 17 "No hosted-agent pairing"; no package.json/workflow caller. | Medium (owner, P15) |
| `CalendarSyncProviderInstrumentedTest.java` with `CalendarSync*` main files | Renderer side of the linked-sync stack is unreachable (research app-runtime-a-m P11). | Medium (owner, AP-09) |
| main `CalendarCreationStore.java` (12) | Facade "for installed-state acceptance tests"; callers: AlphaCalendarPlugin:97, CalendarCreationRecovery, CalendarUpgrade. | High after the coordinated edit below |

## Cross-file actions
1. **New androidTest drivers** (one change): `BrowserTestDriver` (child/diagnostics moved out of `BrowserFlowInstrumentedTest`, address, click, tapChild, resumedMain, readingDialog, tabs, attemptCleanup), `NativeUiDriver` (agree one name with other chunks' `AccessibilityTestDriver`), `CalendarProviderFixture`, `TestReflection`, `DeviceShell`, `CameraTestViews`; extend `WebViewTestDriver` (`until`, `setValue`, `invoke`) and `CalendarUiTestDriver` (`click`, `open`, `chooseDate`, `awaitFocus`). Files: all 25 here + BrowserFlow, BrowserDownload, BrowserContinuity, BrowserCookiePolicy, BrowserPageQuestion, BrowserIsolatedReading, PasswordBrowserFill, HomeCalendarCard, ScopedCalendarDeletion, Maps, WorkflowPhoneNative, PhotosTestFixture. Delete `test/browser-tab-host-identity.test.mjs:74-75` (regex on BrowserWebFeatures `field` text) in the same change.
2. **Calendar form duplicate**: delete `CalendarFlow.calendarFormPersists…`; `scripts/test-calendar-regression.ts:63` `calendarFlow,5` → `4`; update `test/calendar-regression-runner.test.mjs` and `test/fixtures/isolated-native-campaign.mjs` expectations.
3. **CalendarCreationStore facade**: CalendarCreationRecovery uses the upstream store instance → `AlphaCalendarPlugin.java:97` uses it too → delete `CalendarUpgradeInstrumentedTest` + `scripts/test-installed-upgrade.ts` calendar kind (and the `--bridge` call at :118 if calendar-only) → delete `android/app/src/main/.../CalendarCreationStore.java`, `specs/quint/application/manifest.json:5853,5925-5933`, `test/support/feature-parity.mjs:93`; `scripts/owner/emulator-campaign-check.ts:68` text.
4. **Reading test-mocks lane**: delete BrowserUnsupportedReading + registry + `test/ci-emulator-evidence.test.mjs:234`; drop duplicated `cancelThenApproveOnce` tails in BrowserSensitiveReading and BrowserIsolatedReading.
5. **Paired speech (P15, owner)**: BrowserReadingFixture (Server, wav, writeSpeechToken, binding), BrowserReading (paired method), BrowserSensitiveReading, BrowserIsolatedReading, BrowserUnsupportedReading, BrowserReadingLive + `scripts/android-browser-reading-live.ts` + `CAMPAIGN_RUNNERS` entry, main `AlphaVoiceCloudPlugin.synthesizeBrowserReading`, `PairedSpeechContract`, `apps/app/src/runtime/paired-voice.ts`, `test/native-voice-listener-rules.test.mjs:29-32`.
6. **External editor receipt**: remove receipt write in CalendarExternalEditor and `collectVariant` in `scripts/test-calendar-regression.ts:110-114` (+ its runner test if any field is asserted).
7. **CalendarZones inline**: move `sameZone` into `AlphaCalendarPlugin`, delete `CalendarZones.java`, delete the availability unit method, runner count `calendarAvailability,4` → `3`, update `test/calendar-availability-reader.test.mjs:17` (reads `CalendarZones.java`).
8. **Unrun methods**: add `camera-denied-forever` case to `scripts/test-native-permissions.ts` + `test/native-permission-runner.test.mjs`; add insertHandoff case to `scripts/test-calendar-regression.ts` + `test/calendar-regression-runner.test.mjs` (or delete the methods).
9. **Linked-sync stack (owner)**: CalendarSyncProvider test + registry entry + `CalendarSyncBridge/Snapshot/Mutation` + `AlphaCalendarPlugin` sync methods + renderer stack (app-runtime-a-m P11).

## Text/path pins
- `scripts/android-instrumentation.ts` registry: BrowserReading:204, BrowserSensitiveReading:205, BrowserReadingNavigation:207, CameraLatency:217, BrowserWebFeatures:224, BrowserShare:242, BrowserUnsupportedReading:243, CalendarDeletionReview:278, CalendarSyncProvider:279, CalendarFlow:282, BrowserSignins:154 + `DEFAULT_CLASSES`; `CAMPAIGN_RUNNERS` lists the runner scripts; reachability enforced by `test/android-instrumentation-runner.test.mjs`.
- `scripts/ci/emulator-suite.ts:37-38` `READING_CLASSES`/`READING_TEST_MOCKS_CLASSES`; `test/ci-emulator-evidence.test.mjs:224,232,234,279`.
- `scripts/test-calendar-regression.ts:63-70` (class, gate, **method counts** 1/5/2/4, method names; Etar APK SHA and signer; receipt fields 110-114); `test/calendar-regression-runner.test.mjs:29-54`; `test/fixtures/isolated-native-campaign.mjs:18,114`.
- `scripts/test-native-permissions.ts:28-43` + `test/native-permission-runner.test.mjs:9,57` (CameraFlow method names, gates).
- `scripts/test-installed-upgrade.ts:68-70,118` (CalendarUpgrade, CalendarAgentCrud bridge).
- `scripts/test-native-restart.ts` (BrowserSignins `signinPhase`), `scripts/test-browser-storage-format.ts:14`, `scripts/test-native-calendar-deletion-restart.ts:14`, `scripts/test-calendar-crud-review.ts`, `scripts/ci/pending-recovery-ui.py` (CalendarCreationRecovery), `scripts/android-browser-reading-live.ts:284-285`.
- `test/browser-tab-host-identity.test.mjs:60-75` — scans every androidTest source by regex and pins BrowserWebFeatures' `field` helper text (T1).
- `test/instrumentation-outcome-status.test.mjs:5,16` — BrowserReadingNavigation status `browserReadingProvider`.
- Comment-only mentions: `test/browser-web-features.test.mjs:7`, `test/calendar-range-reader.test.mjs:10`, `test/browser/calendar-proposal-review.production.spec.ts:18`, `test/browser-reading-capability.test.mjs:126`, `test/browser/reading-capability.spec.ts:3`.
- No `specs/quint/**/manifest.json`, `test/support/feature-parity.mjs` or `LemmaScript-files.txt` entry names any file in this chunk (they pin main `CalendarCreationStore.java`, affected by action 3).

## New patterns
- **NEW — test class used as a helper library**: `new BrowserFlowInstrumentedTest()` in 11 files just to call its package-private `child()`; the helper also has a side effect (clicks "Not now" on the startup panel), which makes `assertEquals("null",browser.child("true"))` (BrowserSignins:120) an opaque assertion. Move helpers into a non-test driver.
- **NEW — orphan test methods behind class-level reachability**: the runner reachability check works per class, so methods no runner selects (CameraFlow `cameraDeniedForever…`, CalendarAgentCrud `insertHandoff…`) go unnoticed. Check reachability per `@Test` method.
- **NEW — runner-pinned method counts**: `scripts/test-calendar-regression.ts` encodes each class's expected test count (`calendarFlow,5`, `calendarAvailability,4`), so deleting a duplicate method needs a runner edit.
- Minor: shared gate argument for different classes (`calendarRange` gates both Range and Truncation).

## Owner questions
1. Paired/hosted agents (P15): is "Local development agent" pairing and paired speech (`remote:` slots, `synthesizeBrowserReading`) a product feature or developer-only? If not product, delete BrowserReadingLive + runner and the paired-speech parts of the reading tests.
2. Client-side Calendar linked sync (AP-09 "local-first sync"): is the native `CalendarSyncBridge/Snapshot/Mutation` path still wanted, given the agent-side `LinkedCalendarControl` is live? Decides CalendarSyncProvider.
3. Should Alpha keep emulator tests that only exercise upstream code (`SelectedCalendarReader`, `CalendarCreationStore` recovery, `BrowserExternalHandoff`, `BrowserPageReading.sensitiveUrl`, reflective `BrowserReviewedReading.reviewQuestion`), or move them upstream?
4. Wire or delete the two unrun methods (`CameraFlow.cameraDeniedForeverRecoversThroughAndroidSettings`, `CalendarAgentCrud.insertHandoffIsInterceptedWithPrefilledFields`)?
5. Confirm no installed-upgrade evidence is needed after the 2026-11-10 package rename (CalendarUpgrade deletion; the same question applies to the reminder kind of `scripts/test-installed-upgrade.ts`).
