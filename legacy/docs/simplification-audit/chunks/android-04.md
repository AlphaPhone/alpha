# Chunk android-04 — androidTest: Accessibility*, ActionJournal … BrowserPageQuestion (23 files)

Per-file reports: `docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<File>.java.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| AccessibilityBounds.java | MERGE into TalkBackOrder.java | 14 | 0 (+7 in TalkBackOrder) |
| AccessibilityHomeRoleInstrumentedTest.java | SIMPLIFY | 77 | 60 |
| AccessibilityInstrumentedTest.java | SIMPLIFY | 188 | 150 |
| AccessibilityLifecycleInstrumentedTest.java | SIMPLIFY | 218 | 180 |
| AccessibilityViewsInstrumentedTest.java | SIMPLIFY (statics → AccessibilityFixture) | 156 | 120 |
| ActionJournalInstrumentedTest.java | SIMPLIFY | 109 | 95 |
| ActivityInstanceSelectionInstrumentedTest.java | DELETE | 28 | 0 |
| AllViewAgentContextInstrumentedTest.java | DELETE | 153 | 0 |
| AndroidShade.java | SIMPLIFY | 174 | 150 |
| AppInfoInstrumentedTest.java | SIMPLIFY | 61 | 50 |
| AppNavigation.java | KEEP (+requiredSignIn/open/SETTLED) | 67 | 75 |
| AssistantInstrumentedTest.java | DELETE (owner: P-78) | 169 | 0 |
| AssistantResidentReuseInstrumentedTest.java | DELETE (owner: P-78) | 101 | 0 |
| BoundedActivityScenario.java | SIMPLIFY | 144 | 100 |
| BrowserContinuityInstrumentedTest.java | SIMPLIFY | 221 | 185 |
| BrowserCookiePolicyInstrumentedTest.java | SIMPLIFY | 115 | 100 |
| BrowserDialogLifecycleInstrumentedTest.java | SIMPLIFY | 50 | 40 |
| BrowserDownloadInstrumentedTest.java | SIMPLIFY | 137 | 105 |
| BrowserExternalHandoffInstrumentedTest.java | SIMPLIFY | 117 | 95 |
| BrowserFlowInstrumentedTest.java | SPLIT (driver → BrowserTestDriver) | 456 | 300 |
| BrowserInstalledResolverInstrumentedTest.java | KEEP | 29 | 27 |
| BrowserIsolatedReadingInstrumentedTest.java | KEEP (owner: remote: slot) | 38 | 38 |
| BrowserPageQuestionInstrumentedTest.java | SIMPLIFY (absorb JourneyJ05) | 451 | 400 |
| **Total** | | **3,273** | **2,270** (+~280 in four new shared helper files) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `js(code)` | helper | AccessibilityHomeRole:29, AccessibilityInstrumentedTest:48, AccessibilityLifecycle:47, AccessibilityViews:67, BrowserPageQuestion:71 | ~180 `js/eval/host/until/ready/waitFor` copies in androidTest | `WebViewTestDriver.evaluate` directly |
| `until(code,tenths)` / `ready` / `waitFor` | helper | AccessibilityHomeRole:30, AccessibilityLifecycle:48, AccessibilityViews:89, AccessibilityInstrumentedTest:49, BrowserFlow:24, BrowserContinuity:22, BrowserDialogLifecycle:17, BrowserDownload:25, BrowserPageQuestion:72, AllViewAgentContext:63 | same | new `WebViewTestDriver.until(js, tenths)` |
| `call(expr)` promise→JSON | helper | ActionJournal:25, AppInfo:27, Assistant:21, BrowserPageQuestion:76-81 | many | new `WebViewTestDriver.call` |
| `shell(cmd)` | helper | AccessibilityInstrumentedTest:45, AccessibilityViews:43, AppInfo:32, AndroidShade:65 (inline) | SettingsFlow:22, SettingsRoles:32, SettingsSystemFacts:22, PasswordVaultFixture:32, CameraFlow:129, CameraScan:88, PasswordBrowserFill:62 | `AccessibilityFixture.shell` (or `WebViewTestDriver.shell`) |
| `fontScale/restoreFontScale/setSystemFontScale` | helper | AccessibilityViews:47-66; inline font_scale in AccessibilityInstrumentedTest:99-115,131-183 | — | `AccessibilityFixture.fontScale` (waiting version) |
| `VIEWS` | const | AccessibilityViews:39 | AllViewAgentContext:120; TS twin `test/browser/accessibility-lifecycle.spec.ts` | `AccessibilityFixture.VIEWS` |
| `SCALE` / text-scale expression | const | AccessibilityHomeRole:34, AccessibilityLifecycle:86, AccessibilityViews:125, AccessibilityInstrumentedTest:108,142 | — | `AccessibilityFixture.TEXT_SCALE` |
| `FOCUS_PROBLEM` | const | AccessibilityViews:94 | AccessibilityLifecycle:123 (subset inline) | `AccessibilityFixture` |
| `pressHome`, `oneMainActivity`, `foreground/awaitForeground` | helper | AccessibilityLifecycle:53-85 | AppInfo:36 `foregroundPackage` | `AccessibilityFixture` |
| `assumeViews` | helper | AccessibilityHomeRole:41, AccessibilityLifecycle:96, AccessibilityViews:99 | AppNavigation.assumeNoRequiredSignIn (identical effect) | delete |
| `requiredSignIn` / `"cloud:production"` | helper/const | AccessibilityInstrumentedTest:73, AccessibilityLifecycle:215, AppNavigation:60 | literal in 16 androidTest files | `AppNavigation.requiredSignIn()`, `CLOUD_SLOT` |
| `TEST_NAVIGATION_SETTLED` | const | AccessibilityHomeRole:37 | literal in BrowserFlow:110, BrowserDialogLifecycle:19, BrowserPageQuestion:167,419, BrowserContinuity:147, AllViewAgentContext:113 | `AppNavigation.SETTLED` |
| `open(view)` / `app(label)` | helper | AccessibilityInstrumentedTest:50, AccessibilityLifecycle:52, BrowserContinuity:25, BrowserDialogLifecycle:19 | inline in ~80 files | `AppNavigation.open` |
| `hash` (SHA-256 hex) | helper | ActionJournal:21 | ResidentTestFixture:18, PhotosTestFixture:31 + 8 private copies | `ResidentTestFixture.hash` / `TestHashes` |
| credential slot file path + cleanup | inline | ActionJournal:43-44,69-71,106 | 14 files use `connection-credentials` | `CredentialSlotFiles` |
| `host/click/address/button` | helper | BrowserFlow:23-32, BrowserContinuity:21-32, BrowserDownload:24-33, BrowserDialogLifecycle:16-19, BrowserPageQuestion:166-176,334-337 | — | `BrowserTestDriver` |
| `child(js)` / `collect` / `diagnostics` | helper | BrowserFlow:33-73 | BrowserCookiePolicy:42 `evaluate(WebView)`, Assistant:105 `evalAssist` | `BrowserTestDriver` |
| reflection field/method access to upstream `BrowserTabHostPlugin` | helper | BrowserFlow:102,335-354; BrowserContinuity:75-101; BrowserCookiePolicy:18-36; BrowserDialogLifecycle:20-26; BrowserExternalHandoff:28-30,59-104; BrowserPageQuestion:92-126 | BrowserSensitiveReading:41, BrowserSignins:76,211, BrowserWebFeatures:294 | `BrowserHostProbe` (one class) or upstream test accessor |
| in-memory route WebViewClient wrapper | type/helper | BrowserPageQuestion `Pages` 117-142 (best), BrowserFlow:380-396, BrowserExternalHandoff:62-71, BrowserCookiePolicy:50-58 | — | `BrowserTestDriver.serveFromMemory` |
| loopback HTTP server | inline | BrowserFlow:145-154,173-181,195-203; BrowserDownload:93-105 | 12 androidTest files with `ServerSocket(0` | `LoopbackHttpFixture` |
| AccessibilityNodeInfo BFS | helper | AndroidShade:95-106,133-142; BrowserDownload:35-70 (3×) | TalkBackOrder | `AccessibilityNodes.find` |
| mock-mode enter/exit sequence | inline | BrowserContinuity:147-152, BrowserDialogLifecycle:42-46 | — | `AppNavigation.enterMockMode/exitMockMode` |
| native-call recorder (Capacitor.nativePromise patch) | JS const | BrowserPageQuestion:148-161, AndroidShade:75-77 | — | `NativeCallRecorder` |
| DESTROYED poll loop | inline | Assistant:62,92,160,166; AssistantResidentReuse:64 | — | deleted with the classes (else `scenario.awaitDestroyed()`) |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `AllViewAgentContextInstrumentedTest.java` (153) + `NOT_RUN_BY_A_RUNNER.AllViewAgentContext` (`scripts/android-instrumentation.ts:328`) | Runner itself says no runner can run it; fixture `agent-context-pairing.json` has no writer anywhere (grep); drives dev-only "Local development agent" pairing. | High |
| `ActivityInstanceSelectionInstrumentedTest.java` (28) + registry entry `:266` | Tests the test harness (BoundedActivityScenario observer) by reflection (T5). | High |
| `AssistantInstrumentedTest.java` (169), `AssistantResidentReuseInstrumentedTest.java` (101) + registry `:187,:267` + owner-campaign lists (`scripts/owner/emulator-campaign-check.ts:42,57`) | `AlphaAssistActivity` is `android:enabled="false" android:exported="false"` (`AndroidManifest.xml:124`), nothing enables it; one method asserts `exported==true`, the rest launch it explicitly — cannot pass on current builds (manifest reading; not run). | High that they cannot pass; deletion is an owner call (P-78) |
| `AlphaLocalAgentPlugin` hooks `attachForTest`, `lifecycleEpochForTest`, `adoptStreamForTest` | Only callers are the two Assistant tests (grep). `enrollForTest`/`launchedGenerationForTest` stay (Quint traces use them). | High (after Assistant deletion) |
| BoundedActivityScenario diagnostics (lines 27-62, 68, 116, 133, 135-138) + `ReminderOneOffInstrumentedTest.java:48` `diagnosticCheckpoint` calls | Gate arg `lifecycleDiagnostics` is passed by no script/workflow/test (grep: only this file). | High |
| `AccessibilityBounds.java` + `test/accessibility-visible-bounds.test.mjs` + `test/fixtures/AccessibilityBoundsTest.java` | Separate class exists for a host javac unit test; one real caller (TalkBackOrder:90). | High |
| `JourneyJ05InstrumentedTest.java` (~55) + registry `:238` + runner-test lines 628-643 | Runs exactly `BrowserPageQuestion.askAboutPageUpToSend` + `sourceNoteSurvivesRecreationAndReopens`, which BrowserPageQuestion already runs as two @Tests in the CI reading lane; J05 is not in any CI list. | Medium-high |
| `installedGenericHttpsBrowsers` result receipt (BrowserInstalledResolver:27) | No reader. | High |
| `AndroidShade.useAutomationFlags` + `automationFlags` | Replace with Configurator flags (already set by the only caller). | High |
| BrowserExternalHandoff `publicResolvedFiltersExcludeAppLinksAndConstrainedHandlers` | Pure unit test of upstream `BrowserExternalHandoff.genericHttps`; move upstream. | Medium |
| `test/aosp-image-capability.test.mjs:156` assertion on AppInfo source text | T1: only checks the file contains `com.android.settings`. | High |

## Cross-file actions
1. **AccessibilityFixture.java (new)**: move `VIEWS`, `shell`, `fontScale` (waiting), `restoreFontScale`, `FOCUS_PROBLEM`, `TEXT_SCALE`, `pressHome`, `oneMainActivity`, `awaitForeground`, `withFontScale` from AccessibilityViews/AccessibilityLifecycle; update AccessibilityHomeRole, AccessibilityLifecycle, AccessibilityViews, AccessibilityInstrumentedTest, AppInfoInstrumentedTest; move `ChatContinuityInstrumentedTest.alphaIsHome` there too (also ChatContinuity). Re-point `test/accessibility-coverage.test.mjs:173,178` regexes (or delete them).
2. **WebViewTestDriver.until / call / unquote (new)**: replace local copies in all 23 files' siblings (≈180 sites across androidTest; this chunk: 12 files).
3. **AppNavigation.requiredSignIn / open / SETTLED / enterMockMode / exitMockMode**: update AccessibilityInstrumentedTest, AccessibilityLifecycle, AccessibilityHomeRole, BrowserContinuity, BrowserDialogLifecycle, BrowserFlow, BrowserPageQuestion, AllViewAgentContext (deleted).
4. **BrowserTestDriver.java + BrowserHostProbe.java + LoopbackHttpFixture.java (new)**: extracted from BrowserFlow; update BrowserContinuity, BrowserDownload, BrowserPageQuestion, BrowserCookiePolicy, BrowserDialogLifecycle, BrowserExternalHandoff, and outside this chunk BrowserReadingFixture, BrowserReadingLive, BrowserSensitiveReading, BrowserShare, BrowserSignins, BrowserWebFeatures, PasswordBrowserFill, ConnectionChooser, DeviceAction (12 `new BrowserFlowInstrumentedTest()` sites).
5. **Assistant deletion (owner P-78)**: delete AssistantInstrumentedTest, AssistantResidentReuseInstrumentedTest; remove registry entries (`scripts/android-instrumentation.ts:187,267`), owner campaign lists (`scripts/owner/emulator-campaign-check.ts:42,57`, check `test/owner-emulator-campaign-check.test.mjs`); remove `attachForTest`, `lifecycleEpochForTest`, `adoptStreamForTest` from `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java`; coordinate with the AlphaAssistActivity / AlphaPowerVoiceActivity / AlphaQuickSettingsTile deletion (research P14) and `scripts/apk.ts:87,149-169`, `scripts/stage-aosp.ts:202`.
6. **BoundedActivityScenario diagnostics removal**: BoundedActivityScenario.java + ReminderOneOffInstrumentedTest.java:48; delete ActivityInstanceSelection first (it reflects on private fields).
7. **AccessibilityBounds merge**: TalkBackOrder.java + delete `test/accessibility-visible-bounds.test.mjs`, `test/fixtures/AccessibilityBoundsTest.java`.
8. **JourneyJ05 removal**: JourneyJ05InstrumentedTest.java, `scripts/android-instrumentation.ts:238`, `test/android-instrumentation-runner.test.mjs:628-643`; then make BrowserPageQuestion helpers private.
9. **AndroidShade flags**: AndroidShade.java + AccessibilityInstrumentedTest.java:130,185.
10. **Shared hash / credential-slot file helper**: ActionJournal + 13 other androidTest files using `connection-credentials` and private SHA-256 copies.

## Text/path pins
- `scripts/android-instrumentation.ts` CLASS_REGISTRY entries: Accessibility (:170), AccessibilityViews (:172), AccessibilityLifecycle (:173), AccessibilityHomeRole (:174), AssistantResidentReuse (:187), BrowserInstalledResolver (:146), BrowserExternalHandoff (:151), BrowserCookiePolicy (:153), BrowserFlow (:155, also DEFAULT_CLASSES :353-354), BrowserContinuity (:157), BrowserDownload (:158), BrowserIsolatedReading (:206), BrowserPageQuestion (:220), BrowserDialogLifecycle (:223), AppInfo (:246), ActionJournal (:265), ActivityInstanceSelection (:266), Assistant (:267); NOT_RUN AllViewAgentContext (:328).
- `test/android-instrumentation-runner.test.mjs`: every @Test class must be registered or NOT_RUN (:137-160); gate text `"1".equals(InstrumentationRegistry.getArguments().getString("<gate>")` for BrowserIsolatedReading/BrowserPageQuestion; `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` text for requiresTestMocksBuild classes (AccessibilityViews/Lifecycle/HomeRole, BrowserContinuity, BrowserDialogLifecycle, BrowserIsolatedReading); `BuildConfig.IS_LAUNCHER` and no role-change commands in AccessibilityHomeRole; :128 regex on `scripts/test-native-restart.ts` bookmark block (BrowserContinuity `bookmarkProcessRestartPhase`/`bookmarkPhase`); :177 AppInfo secondary user; :505-511 BrowserDownload skipped; :628-643 JourneyJ05/BrowserPageQuestion no public host.
- `test/ci-emulator-evidence.test.mjs:250-262`: default classes (BrowserFlow) need one ungated @Test; BrowserDownload has exactly one @Test gated by the test-mocks assumeTrue; :224,232,279 reading classes.
- `test/accessibility-coverage.test.mjs:173` (VIEWS literal in AccessibilityViews), :177-178 (`AccessibilityViewsInstrumentedTest.VIEWS` in Lifecycle/HomeRole), :163 (TalkBackOrder).
- `test/accessibility-visible-bounds.test.mjs:8,13` (javac AccessibilityBounds.java by path).
- `test/browser-reading-capability.test.mjs:58-61` (BrowserIsolatedReading probe text).
- `test/aosp-image-capability.test.mjs:156` (AppInfo contains `com.android.settings`).
- `test/instrumentation-outcome-status.test.mjs:4,19` (status key `browserFlowSearch`).
- `scripts/test-native-restart.ts:29,95` (BrowserContinuity, AccessibilityLifecycle phase runners); `scripts/ci/emulator-suite.ts:12-13,37-38` (READING_CLASSES / READING_TEST_MOCKS_CLASSES); `scripts/owner/emulator-campaign-check.ts:42-60` (class groups) and `test/owner-emulator-campaign-check.test.mjs:21`; `test/fixtures/isolated-native-campaign.mjs:18`.
- No `specs/quint/**/manifest.json`, `test/support/feature-parity.mjs` or `LemmaScript-files.txt` entry names these files.

## New patterns
- **NEW-R: Reflection into upstream private internals from product tests.** Nine Browser* classes read/write private fields and invoke private methods of upstream `ai.eliza.plugins.browsersurface.BrowserTabHostPlugin` and its tab/reading/download classes by string name (`presentedId`, `tabs`, `namespace`, `retiredProfiles`, `build`, `canAutofill`, `downloads.listing`, `reading.dialog`, `externalBrowserResolver`). An upstream rename breaks them only at emulator runtime. Treatment: one `BrowserHostProbe` class owning all reflection, then an upstream package-visible test accessor via a reviewed upstream PR; move pure upstream-rule tests upstream.
- **NEW-H: Test classes used as helper libraries.** `new BrowserFlowInstrumentedTest()` in 12 classes, `AccessibilityViewsInstrumentedTest.*`/`AccessibilityLifecycleInstrumentedTest.*`/`ChatContinuityInstrumentedTest.alphaIsHome` statics, `BrowserPageQuestionInstrumentedTest` as JourneyJ05's driver. JUnit lifecycle (`@Before`) does not run in that use. Treatment: extract non-test fixture classes (D3 for tests).
- **NEW-D: Tests of permanently disabled components.** Registered, campaign-listed instrumentation classes that launch a manifest component declared `enabled="false"` with no enabler (Assistant*). They can only fail. Treatment: delete with the dormant feature or list as NOT_RUN with the reason.

## Owner questions
1. P-78: AlphaAssistActivity is disabled with no enabler. Delete `AssistantInstrumentedTest` and `AssistantResidentReuseInstrumentedTest` (and their `*ForTest` hooks) now, or park them as NOT_RUN until wake/assistant entry returns? If deleted, is the resident attach-refusal rule (`provider-changed`, `runtime-changed`, `runtime-not-running`, `provider-unadmitted`) covered by a MainActivity resident test?
2. P15: `BrowserIsolatedReadingInstrumentedTest` (via BrowserReadingFixture) writes a speech token for a `remote:<origin>` paired slot. If paired agents/speech are retired, what speech path should browser read-aloud tests use?
3. May JourneyJ05InstrumentedTest be deleted in favour of the two BrowserPageQuestion methods that run the same steps in CI?
4. Should Browser host internals get an upstream test accessor (upstream PR + new pin) so the nine reflection-based Browser* tests stop naming private fields?
